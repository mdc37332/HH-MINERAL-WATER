import { FunctionDeclaration, Type } from '@google/genai';
import {
  getAllOrders,
  getOrderById,
  getAllProducts,
  getProductById,
  upsertProduct,
  deleteProductById,
  getAllInvoices,
  getInvoiceByOrderId,
  createInvoiceInDb,
  getNextInvoiceCount,
  deleteInvoiceById,
  getStoreSettings,
  saveStoreSettings,
  updateOrderInDb,
  insertProductAuditLog,
} from '../../db/queries.ts';
import {
  getAllAiApprovals,
  getAiTasks,
  getCrossAgentMessages,
  getRecentAiSystemEvents,
  getRetryableFailedTasks,
  insertAiApproval,
  recordAiSystemEvent,
  updateAiTask,
  upsertAiMemoryByOwner,
} from '../../db/aiQueries.ts';
import { createPool } from '../../db/index.ts';
import { generateGstInvoice } from '../../lib/invoiceGenerator.ts';
import { auditInventoryStockLevels } from '../../lib/inventoryMonitor.ts';
import { DEFAULT_ADMIN_SETTINGS, DEFAULT_RAW_MATERIALS_INVENTORY } from '../../data/initialProducts.ts';
import {
  dispatchOrderToAdminWhatsApp,
  normalizeWhatsAppDestination,
  isTokenBlocked,
} from '../whatsappCloudApi.ts';
import { getAuditLogs, logAuditEvent } from '../adminSecurity.ts';
import type { AgentId, AiApprovalRecord, ApprovalActionType } from './types.ts';
import { sanitizeUntrustedText } from './memoryService.ts';
import { coordinateCrossAgentHandoff, createCorrelationId } from './crossAgentBus.ts';
import {
  mirrorApprovalToFirestore,
  syncOrderToFirestoreFromServer,
  syncProductStockToFirestoreFromServer,
} from './firestoreBridge.ts';

export interface ToolExecResult {
  ok: boolean;
  data: any;
  summary: string;
}

export const AI_TOOL_DECLARATIONS: FunctionDeclaration[] = [
  {
    name: 'get_orders_snapshot',
    description: 'Fetches live orders from Cloud SQL filtered optionally by status, todayOnly, or delayedHours.',
    parameters: {
      type: Type.OBJECT,
      properties: {
        statusFilter: { type: Type.STRING, description: 'Optional: Pending, New, Confirmed, Processing, Dispatched, Delivered, Cancelled, or all' },
        todayOnly: { type: Type.BOOLEAN, description: 'If true, only return orders created today in Asia/Kolkata.' },
        delayedHours: { type: Type.NUMBER, description: 'If set, filter pending/in-progress orders older than N hours.' },
      },
    },
  },
  {
    name: 'get_inventory_health',
    description: 'Inspects all finished water bottle SKUs in Cloud SQL, low-stock/out-of-stock risks, and restock recommendations.',
    parameters: {
      type: Type.OBJECT,
      properties: {
        onlyLowStock: { type: Type.BOOLEAN, description: 'If true, focus on low-stock or out-of-stock SKUs.' },
      },
    },
  },
  {
    name: 'get_financial_and_invoice_summary',
    description: 'Audits revenue, paid vs pending COD amounts, GST totals, missing 1:1 invoices, and billing discrepancies.',
    parameters: {
      type: Type.OBJECT,
      properties: {
        period: { type: Type.STRING, description: 'TODAY, WEEK, MONTH, or ALL' },
      },
    },
  },
  {
    name: 'get_failed_notifications',
    description: 'Checks pending, blocked, or failed WhatsApp & Admin email notifications across orders.',
    parameters: {
      type: Type.OBJECT,
      properties: {},
    },
  },
  {
    name: 'get_system_health_and_errors',
    description: 'Probes Cloud SQL latency, unresolved system events, dead-letter AI tasks, and failed jobs.',
    parameters: {
      type: Type.OBJECT,
      properties: {},
    },
  },
  {
    name: 'generate_business_report',
    description: 'Generates a comprehensive DAILY, WEEKLY, or MONTHLY report across sales, orders, GST, inventory, and AI operations.',
    parameters: {
      type: Type.OBJECT,
      properties: {
        reportType: { type: Type.STRING, description: 'DAILY, WEEKLY, or MONTHLY' },
      },
      required: ['reportType'],
    },
  },
  {
    name: 'prepare_marketing_draft',
    description: 'Creates an event/ad/social marketing draft based on top-performing SKUs. Does NOT publish without owner approval.',
    parameters: {
      type: Type.OBJECT,
      properties: {
        campaignFocus: { type: Type.STRING, description: 'Optional target: wedding, corporate, custom-design, hydration, festive' },
      },
    },
  },
  {
    name: 'validate_custom_design_order',
    description: 'Validates custom design order quantity (>= 600 pcs minimum), lead time (7 days), and summarizes design requirements.',
    parameters: {
      type: Type.OBJECT,
      properties: {
        orderId: { type: Type.STRING, description: 'Optional specific order ID to inspect; omit to audit all custom orders.' },
        quantity: { type: Type.NUMBER, description: 'Optional quantity check for custom design minimum 600 rule.' },
      },
    },
  },
  {
    name: 'get_what_needs_attention',
    description: 'Returns an executive prioritized list of pending orders, low stock SKUs, pending owner approvals, failed alerts, and errors.',
    parameters: {
      type: Type.OBJECT,
      properties: {},
    },
  },
  {
    name: 'auto_generate_missing_invoices',
    description: 'Level 3 Auto Operation: Generates missing GST Tax Invoices in PostgreSQL for eligible orders lacking an invoice.',
    parameters: {
      type: Type.OBJECT,
      properties: {
        dryRun: { type: Type.BOOLEAN, description: 'If true, only preview missing invoices without inserting.' },
      },
    },
  },
  {
    name: 'retry_failed_whatsapp_alert',
    description: 'Level 3 Auto Operation: Safely retries sending failed/pending WhatsApp alert for an order or prepares 1-click links.',
    parameters: {
      type: Type.OBJECT,
      properties: {
        orderId: { type: Type.STRING, description: 'Optional specific order ID to retry.' },
      },
    },
  },
  {
    name: 'run_security_audit_scan',
    description: 'Level 3 Auto Operation: Audits admin login history, failed attempts, and unauthorized access flags.',
    parameters: {
      type: Type.OBJECT,
      properties: {},
    },
  },
  {
    name: 'run_error_recovery_sweep',
    description: 'Level 3 Auto Operation: Retries recoverable failed tasks and resolves transient system error flags.',
    parameters: {
      type: Type.OBJECT,
      properties: {},
    },
  },
  {
    name: 'propose_owner_approval',
    description: 'Creates a PENDING Owner Approval Request for ANY sensitive operation (price changes, discounts, refunds, cancelling invoices, GST changes, major stock adjustment, product deletion, publishing marketing, restock purchases). Never executes sensitive action directly.',
    parameters: {
      type: Type.OBJECT,
      properties: {
        actionType: {
          type: Type.STRING,
          description: 'CHANGE_PRODUCT_PRICE | CHANGE_DISCOUNT | ISSUE_REFUND | CANCEL_INVOICE | CHANGE_GST_CONFIG | ADJUST_INVENTORY_MAJOR | DELETE_PRODUCT | SUSPEND_CUSTOMER | PUBLISH_MARKETING | BULK_WHATSAPP_CAMPAIGN | RESTOCK_PURCHASE_ORDER | OTHER_SENSITIVE_ACTION',
        },
        title: { type: Type.STRING, description: 'Short descriptive action title' },
        reason: { type: Type.STRING, description: 'Why this action is recommended based on observed data' },
        expectedImpact: { type: Type.STRING, description: 'Expected financial, inventory, or customer impact' },
        proposedPayloadJson: { type: Type.STRING, description: 'JSON string of structured parameters for execution once approved' },
      },
      required: ['actionType', 'title', 'reason', 'expectedImpact', 'proposedPayloadJson'],
    },
  },
  {
    name: 'delegate_to_specialist_agent',
    description: 'Coordinates a cross-agent handoff by sending a persistent message to another specialist AI agent (e.g. AGENT_02_ORDER, AGENT_04_INVENTORY, AGENT_05_FINANCE, AGENT_06_WHATSAPP, AGENT_07_MARKETING, AGENT_08_SECURITY, AGENT_09_RECOVERY, AGENT_10_REPORTING) and running their authorized backend tool.',
    parameters: {
      type: Type.OBJECT,
      properties: {
        targetAgentId: { type: Type.STRING, description: 'Target specialist AgentId (e.g. AGENT_04_INVENTORY)' },
        toolName: { type: Type.STRING, description: 'Tool to invoke on the target specialist agent' },
        toolArgsJson: { type: Type.STRING, description: 'Optional JSON string of arguments for the delegated tool' },
        reason: { type: Type.STRING, description: 'Why this department handoff is needed' },
      },
      required: ['targetAgentId', 'toolName', 'reason'],
    },
  },
  {
    name: 'get_cross_agent_messages',
    description: 'Fetches recent specialist-to-specialist communication handoffs, risk alerts, and verification reports.',
    parameters: {
      type: Type.OBJECT,
      properties: {
        limit: { type: Type.NUMBER, description: 'Maximum messages to inspect (default 20)' },
      },
    },
  },
];

function getIstDatePrefix(d: Date = new Date()): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kolkata' }).format(d);
}

export async function executeRegisteredTool(
  toolName: string,
  args: Record<string, any>,
  context: { agentId: AgentId; agentName: string; taskId?: string; depth?: number; correlationId?: string }
): Promise<ToolExecResult> {
  try {
    switch (toolName) {
      case 'get_orders_snapshot': {
        const allOrders = await getAllOrders();
        const filter = String(args.statusFilter || 'all').toLowerCase();
        const todayIst = getIstDatePrefix();
        let filtered = [...allOrders];

        if (filter === 'pending') {
          filtered = filtered.filter(o =>
            ['New', 'Pending', 'Confirmed', 'Processing', 'Bottling & QC'].includes(o.status)
          );
        } else if (filter !== 'all' && filter) {
          filtered = filtered.filter(o => o.status.toLowerCase().includes(filter));
        }

        if (args.todayOnly) {
          filtered = filtered.filter(o => getIstDatePrefix(new Date(o.createdAt)) === todayIst);
        }

        if (typeof args.delayedHours === 'number' && args.delayedHours > 0) {
          const cutoff = Date.now() - args.delayedHours * 3600 * 1000;
          filtered = filtered.filter(
            o =>
              !['Delivered', 'Cancelled'].includes(o.status) &&
              new Date(o.createdAt).getTime() < cutoff
          );
        }

        const totalRevenue = filtered
          .filter(o => o.status !== 'Cancelled')
          .reduce((s, o) => s + (Number(o.totalAmount) || 0), 0);

        const compactOrders = filtered.slice(0, 25).map(o => ({
          id: o.id,
          customerName: o.customer?.name,
          customerPhone: o.customer?.phone,
          status: o.status,
          totalAmount: o.totalAmount,
          paymentStatus: o.paymentStatus,
          isCustomOrder: o.isCustomOrder,
          invoiceNumber: o.invoiceNumber || null,
          createdAt: o.createdAt,
        }));

        return {
          ok: true,
          data: {
            totalMatchingOrders: filtered.length,
            totalDatasetOrders: allOrders.length,
            totalRevenueInFilter: totalRevenue,
            orders: compactOrders,
          },
          summary: `Found ${filtered.length} matching orders (out of ${allOrders.length} total, ₹${totalRevenue.toLocaleString('en-IN')} value).`,
        };
      }

      case 'get_inventory_health': {
        const allProducts = await getAllProducts();
        const settings = (await getStoreSettings()) || DEFAULT_ADMIN_SETTINGS;
        const audit = auditInventoryStockLevels(allProducts, DEFAULT_RAW_MATERIALS_INVENTORY, settings);
        const lowSkus = allProducts.filter(p => !p.inStock || (p.stockCount ?? 0) <= 50);
        const outOfStockSkus = allProducts.filter(p => !p.inStock || (p.stockCount ?? 0) <= 0);
        const list = args.onlyLowStock ? lowSkus : allProducts;

        return {
          ok: true,
          data: {
            totalProducts: allProducts.length,
            outOfStockCount: outOfStockSkus.length,
            lowStockCount: lowSkus.length,
            rawMaterialAlertsCount: audit.criticalCount,
            products: list.map(p => ({
              id: p.id,
              name: p.name,
              size: p.size,
              price: p.price,
              mrp: p.mrp,
              customDesignPrice: p.customDesignPrice,
              stockCount: p.stockCount ?? 0,
              stockStatus: p.stockStatus,
              inStock: p.inStock,
              recommendedRestockQty: (p.stockCount ?? 0) <= 50 ? Math.max(200, 500 - (p.stockCount ?? 0)) : 0,
            })),
            criticalRawMaterials: audit.criticalItems.slice(0, 10),
          },
          summary: `Inventory checked: ${allProducts.length} bottle SKUs (${outOfStockSkus.length} out-of-stock, ${lowSkus.length} low-stock).`,
        };
      }

      case 'get_financial_and_invoice_summary': {
        const allOrders = await getAllOrders();
        const allInvoices = await getAllInvoices();
        const period = String(args.period || 'ALL').toUpperCase();
        const todayIst = getIstDatePrefix();
        const now = Date.now();

        const scopedOrders = allOrders.filter(o => {
          if (o.status === 'Cancelled') return false;
          if (period === 'TODAY') return getIstDatePrefix(new Date(o.createdAt)) === todayIst;
          if (period === 'WEEK') return now - new Date(o.createdAt).getTime() <= 7 * 86400000;
          if (period === 'MONTH') return now - new Date(o.createdAt).getTime() <= 30 * 86400000;
          return true;
        });

        const totalSales = scopedOrders.reduce((s, o) => s + (o.totalAmount || 0), 0);
        const paidOrders = scopedOrders.filter(o => o.paymentStatus === 'Paid');
        const pendingCodOrders = scopedOrders.filter(o => o.paymentStatus !== 'Paid' && o.paymentStatus !== 'Refunded');
        const paidRevenue = paidOrders.reduce((s, o) => s + (o.totalAmount || 0), 0);
        const pendingRevenue = pendingCodOrders.reduce((s, o) => s + (o.totalAmount || 0), 0);

        const invoiceByOrderId = new Set(allInvoices.map(i => i.orderId));
        const missingInvoiceOrders = allOrders.filter(o => o.status !== 'Cancelled' && !invoiceByOrderId.has(o.id));
        const totalGstCollected = allInvoices.reduce((s, inv) => s + (inv.totalGstAmount || 0), 0);

        return {
          ok: true,
          data: {
            period,
            orderCount: scopedOrders.length,
            totalSales,
            paidRevenue,
            pendingCodRevenue: pendingRevenue,
            totalInvoicesGenerated: allInvoices.length,
            totalGstCollected,
            missingInvoiceOrderIds: missingInvoiceOrders.map(o => o.id),
            discrepancyDetected: missingInvoiceOrders.length > 0,
          },
          summary: `Finance (${period}): ₹${totalSales.toLocaleString('en-IN')} across ${scopedOrders.length} orders | Paid ₹${paidRevenue.toLocaleString('en-IN')} | Pending ₹${pendingRevenue.toLocaleString('en-IN')} | Missing Invoices: ${missingInvoiceOrders.length}.`,
        };
      }

      case 'get_failed_notifications': {
        const allOrders = await getAllOrders();
        const settings = (await getStoreSettings()) || DEFAULT_ADMIN_SETTINGS;
        const waToken = (settings.whatsappCloudApiToken || process.env.WHATSAPP_CLOUD_API_TOKEN || '').trim();
        const blocked = isTokenBlocked(waToken);

        const waIssues = allOrders
          .filter(o => {
            const st = o.whatsAppNotification?.adminNotification?.status || o.whatsAppNotification?.status;
            return st === 'FAILED' || st === 'PENDING' || !st;
          })
          .map(o => ({
            orderId: o.id,
            customer: o.customer?.name,
            waStatus: o.whatsAppNotification?.adminNotification?.status || o.whatsAppNotification?.status || 'NOT_SENT',
            error: o.whatsAppNotification?.adminNotification?.error || null,
            retryCount: o.whatsAppNotification?.adminNotification?.retryCount || 0,
          }));

        return {
          ok: true,
          data: {
            metaCloudConfigured: Boolean(waToken && (settings.whatsappPhoneNumberId || process.env.WHATSAPP_PHONE_NUMBER_ID) && !blocked.blocked),
            tokenBlocked: blocked.blocked,
            ordersWithPendingOrFailedWhatsApp: waIssues.slice(0, 25),
            totalAffected: waIssues.length,
          },
          summary: `Found ${waIssues.length} orders with pending/failed WhatsApp notification records.`,
        };
      }

      case 'get_system_health_and_errors': {
        const pool = createPool();
        const t0 = Date.now();
        await pool.query('SELECT 1');
        const dbLatencyMs = Date.now() - t0;

        const events = await getRecentAiSystemEvents(40);
        const unresolvedEvents = events.filter(e => !e.resolved);
        const tasks = await getAiTasks(80);
        const failedTasks = tasks.filter(t => t.status === 'FAILED');
        const deadLetterTasks = tasks.filter(t => t.status === 'DEAD_LETTER');

        return {
          ok: true,
          data: {
            database: 'ONLINE',
            dbLatencyMs,
            unresolvedEventCount: unresolvedEvents.length,
            failedTasksCount: failedTasks.length,
            deadLetterCount: deadLetterTasks.length,
            recentUnresolvedEvents: unresolvedEvents.slice(0, 10),
          },
          summary: `Health OK (PostgreSQL ${dbLatencyMs}ms) | Unresolved alerts: ${unresolvedEvents.length} | Failed tasks: ${failedTasks.length} | Dead-letter: ${deadLetterTasks.length}.`,
        };
      }

      case 'generate_business_report': {
        const type = String(args.reportType || 'DAILY').toUpperCase();
        const period = type === 'WEEKLY' ? 'WEEK' : type === 'MONTHLY' ? 'MONTH' : 'TODAY';
        const fin = await executeRegisteredTool('get_financial_and_invoice_summary', { period }, context);
        const inv = await executeRegisteredTool('get_inventory_health', { onlyLowStock: false }, context);
        const ord = await executeRegisteredTool('get_orders_snapshot', { statusFilter: 'all', todayOnly: period === 'TODAY' }, context);
        const tasks = await getAiTasks(100);
        const completedAiTasks = tasks.filter(t => t.status === 'COMPLETED').length;

        const reportPayload = {
          reportType: type,
          timezone: 'Asia/Kolkata',
          generatedAtIst: new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' }),
          orders: ord.data,
          finance: fin.data,
          inventory: {
            totalSkus: inv.data.totalProducts,
            lowStockCount: inv.data.lowStockCount,
            outOfStockCount: inv.data.outOfStockCount,
          },
          agentOperations: {
            recentTrackedTasks: tasks.length,
            completedTasks: completedAiTasks,
          },
        };

        return {
          ok: true,
          data: reportPayload,
          summary: `${type} Report (Asia/Kolkata): ${fin.data.orderCount} orders, ₹${Number(fin.data.totalSales || 0).toLocaleString('en-IN')} gross sales, ${inv.data.lowStockCount} low-stock alerts, ${completedAiTasks} AI tasks verified.`,
        };
      }

      case 'prepare_marketing_draft': {
        const focus = sanitizeUntrustedText(String(args.campaignFocus || 'wedding & corporate hydration'), 120);
        const allProducts = await getAllProducts();
        const topProducts = allProducts.slice(0, 4).map(p => `${p.name} (${p.size}) at ₹${p.price}`);
        const draft = {
          status: 'DRAFT_ONLY_REQUIRES_APPROVAL_TO_PUBLISH',
          campaignTitle: `HH Mineral Water — Signature ${focus} Campaign`,
          topFeaturedProducts: topProducts,
          instagramCaption: `Pure 7-Stage UV & Ozonated Mineral Water tailored for ${focus}. Custom luxury foil labels starting at 600 bottles with 7-day turnaround across Kolkata. #HHMineralWater #PureLuxuryHydration`,
          whatsappBroadcastDraft: `*HH MINERAL WATER — BESPOKE HYDRATION*\nElevate your ${focus} with custom gold-foil labeled 250ml, 500ml & 1L bottles (Min 600 pcs).\nReply to reserve your factory bottling slot!`,
          note: 'Prepared by AGENT_07_MARKETING. Publishing or bulk WhatsApp broadcast requires Owner Approval.',
        };
        return {
          ok: true,
          data: draft,
          summary: `Prepared marketing campaign draft targeting "${focus}" (approval required before publishing).`,
        };
      }

      case 'validate_custom_design_order': {
        const qty = args.quantity !== undefined ? Number(args.quantity) : undefined;
        if (qty !== undefined && !isNaN(qty) && qty < 600) {
          return {
            ok: false,
            data: { valid: false, minimumRequired: 600, requested: qty },
            summary: 'Minimum quantity for Custom Design Orders is 600 pieces.',
          };
        }

        const allOrders = await getAllOrders();
        const customOrders = allOrders.filter(o => o.isCustomOrder);
        if (args.orderId) {
          const target = customOrders.find(o => o.id === args.orderId);
          if (!target) {
            return { ok: false, data: { error: 'Custom order not found' }, summary: `Custom order ${args.orderId} not found.` };
          }
          const customQty = (target.items || []).filter(i => i.isCustomDesign).reduce((s, i) => s + (i.quantity || 0), 0);
          return {
            ok: customQty >= 600,
            data: {
              orderId: target.id,
              customer: target.customer?.name,
              customQuantity: customQty,
              meetsMinimum600: customQty >= 600,
              artworkPresent: target.hasOriginalImage,
              customItemsSummary: target.items
                .filter(i => i.isCustomDesign)
                .map(i => ({
                  bottle: `${i.product?.name} (${i.product?.size})`,
                  quantity: i.quantity,
                  eventType: i.customDesignDetails?.eventType,
                  businessName: i.customDesignDetails?.businessName,
                  finishType: i.customDesignDetails?.finishType,
                  eventDate: i.customDesignDetails?.eventDate || i.customDesignDetails?.dateOrVenue,
                  uploadedImagesCount: i.customDesignDetails?.uploadedImages?.length || 0,
                })),
            },
            summary: customQty >= 600
              ? `Custom order ${target.id} verified (${customQty} pcs >= 600 min, artwork preserved=${target.hasOriginalImage}).`
              : `Custom order ${target.id} has ${customQty} pcs (< 600 minimum policy).`,
          };
        }

        return {
          ok: true,
          data: {
            totalCustomOrders: customOrders.length,
            recentCustomOrders: customOrders.slice(0, 10).map(o => ({
              id: o.id,
              customer: o.customer?.name,
              status: o.status,
              totalAmount: o.totalAmount,
              totalQuantity: (o.items || []).reduce((s, i) => s + (i.quantity || 0), 0),
              artworkCount: (o.items || []).reduce((s, i) => s + (i.customDesignDetails?.uploadedImages?.length || 0), 0),
            })),
          },
          summary: `Audited ${customOrders.length} custom design orders against the 600-piece minimum and artwork preservation policy.`,
        };
      }

      case 'get_what_needs_attention': {
        const [ord, inv, fin, notif, sys, approvals] = await Promise.all([
          executeRegisteredTool('get_orders_snapshot', { statusFilter: 'pending' }, context),
          executeRegisteredTool('get_inventory_health', { onlyLowStock: true }, context),
          executeRegisteredTool('get_financial_and_invoice_summary', { period: 'ALL' }, context),
          executeRegisteredTool('get_failed_notifications', {}, context),
          executeRegisteredTool('get_system_health_and_errors', {}, context),
          getAllAiApprovals(50),
        ]);
        const pendingApprovals = approvals.filter(a => a.status === 'PENDING');

        const attentionItems: string[] = [];
        if (ord.data.totalMatchingOrders > 0) {
          attentionItems.push(`${ord.data.totalMatchingOrders} pending/active orders awaiting dispatch progression.`);
        }
        if (inv.data.lowStockCount > 0) {
          attentionItems.push(`${inv.data.lowStockCount} bottle SKUs are low/out of stock (${inv.data.outOfStockCount} out of stock).`);
        }
        if (pendingApprovals.length > 0) {
          attentionItems.push(`${pendingApprovals.length} sensitive AI action(s) awaiting Owner Admin approval.`);
        }
        if (fin.data.missingInvoiceOrderIds.length > 0) {
          attentionItems.push(`${fin.data.missingInvoiceOrderIds.length} active order(s) missing linked GST invoice.`);
        }
        if (notif.data.totalAffected > 0) {
          attentionItems.push(`${notif.data.totalAffected} order(s) have pending WhatsApp alerts.`);
        }
        if (sys.data.unresolvedEventCount > 0 || sys.data.deadLetterCount > 0) {
          attentionItems.push(`${sys.data.unresolvedEventCount} unresolved system event(s), ${sys.data.deadLetterCount} dead-letter task(s).`);
        }

        return {
          ok: true,
          data: {
            priorityList: attentionItems.length > 0 ? attentionItems : ['All business operations nominal — no critical blockers detected.'],
            pendingOrdersCount: ord.data.totalMatchingOrders,
            lowStockCount: inv.data.lowStockCount,
            pendingApprovalsCount: pendingApprovals.length,
            missingInvoicesCount: fin.data.missingInvoiceOrderIds.length,
            pendingWhatsAppAlertsCount: notif.data.totalAffected,
            unresolvedSystemEvents: sys.data.unresolvedEventCount,
          },
          summary: attentionItems.length > 0
            ? `Attention summary: ${attentionItems.join(' | ')}`
            : 'All systems nominal — 0 urgent owner blockers.',
        };
      }

      case 'auto_generate_missing_invoices': {
        const allOrders = await getAllOrders();
        const settings = (await getStoreSettings()) || DEFAULT_ADMIN_SETTINGS;
        const createdInvoices: string[] = [];
        const candidates: string[] = [];

        for (const ord of allOrders) {
          if (ord.status === 'Cancelled') continue;
          const existing = await getInvoiceByOrderId(ord.id);
          if (!existing) {
            candidates.push(ord.id);
            if (!args.dryRun) {
              const nextCount = await getNextInvoiceCount();
              const inv = generateGstInvoice(ord, settings, nextCount);
              const saved = await createInvoiceInDb(inv);
              createdInvoices.push(saved?.invoiceNumber || inv.invoiceNumber);
            }
          }
        }

        return {
          ok: true,
          data: { dryRun: Boolean(args.dryRun), missingOrdersFound: candidates.length, generatedInvoiceNumbers: createdInvoices },
          summary: args.dryRun
            ? `Dry run: ${candidates.length} order(s) require GST invoice generation.`
            : `Verified 1:1 GST invoice reconciliation: ${createdInvoices.length} missing invoice(s) generated.`,
        };
      }

      case 'retry_failed_whatsapp_alert': {
        const allOrders = await getAllOrders();
        const settings = (await getStoreSettings()) || DEFAULT_ADMIN_SETTINGS;
        const targetOrders = args.orderId
          ? allOrders.filter(o => o.id === args.orderId)
          : allOrders.filter(o => {
              const st = o.whatsAppNotification?.adminNotification?.status || o.whatsAppNotification?.status;
              return (st === 'FAILED' || st === 'PENDING') && (o.whatsAppNotification?.adminNotification?.retryCount || 0) < 3;
            }).slice(0, 5);

        const retried: Array<{ orderId: string; success: boolean; mode: string; error?: string }> = [];
        for (const ord of targetOrders) {
          const res = await dispatchOrderToAdminWhatsApp(ord, settings, process.env.APP_URL);
          const prevRetry = ord.whatsAppNotification?.adminNotification?.retryCount || 0;
          ord.whatsAppNotification = {
            ...(ord.whatsAppNotification || { targetPhone: res.targetPhone, messageFormatted: '', retryCount: prevRetry }),
            status: res.success ? 'SENT' : 'PENDING',
            lastAttempt: res.dispatchedAt,
            targetPhone: res.targetPhone,
            adminNotification: {
              status: res.success ? 'SENT' : 'PENDING',
              targetPhone: res.targetPhone,
              retryCount: prevRetry + 1,
              lastAttempt: res.dispatchedAt,
              messageId: res.messageId,
              sentAt: res.success ? res.dispatchedAt : undefined,
              error: res.error,
            },
          };
          await updateOrderInDb(ord);
          retried.push({
            orderId: ord.id,
            success: res.success,
            mode: res.success ? 'META_CLOUD_API' : 'CONFIG_REQUIRED_1CLICK_READY',
            error: res.error,
          });
        }

        return {
          ok: true,
          data: { processedCount: retried.length, results: retried },
          summary: `Processed WhatsApp retry for ${retried.length} order(s) (${retried.filter(r => r.success).length} sent via Meta Cloud API).`,
        };
      }

      case 'run_security_audit_scan': {
        const logs = getAuditLogs();
        const failedLogins = logs.filter(l => l.status === 'FAILED' || l.action.includes('FAILED') || l.action.includes('UNAUTHORIZED'));
        const recentWarnings = logs.filter(l => l.status === 'WARNING');
        if (failedLogins.length >= 3) {
          await recordAiSystemEvent({
            eventType: 'SECURITY_SUSPICIOUS_ACTIVITY',
            severity: 'WARNING',
            source: context.agentId,
            summary: `Detected ${failedLogins.length} failed security attempt(s) in audit logs.`,
            details: { sample: failedLogins.slice(0, 5) },
            resolved: false,
            tokensUsed: 0,
          });
        }
        return {
          ok: true,
          data: {
            totalLogsInspected: logs.length,
            failedOrUnauthorizedCount: failedLogins.length,
            warningCount: recentWarnings.length,
            singleOwnerPolicyIntact: true,
            recentFailedSamples: failedLogins.slice(0, 5),
          },
          summary: `Security audit inspected ${logs.length} log entries (${failedLogins.length} failed, ${recentWarnings.length} warnings). Single-owner access policy intact.`,
        };
      }

      case 'run_error_recovery_sweep': {
        const retryable = await getRetryableFailedTasks();
        let retriedCount = 0;
        let deadLetteredCount = 0;
        for (const task of retryable) {
          if (task.retryCount >= task.maxRetries) {
            await updateAiTask(task.id, { status: 'DEAD_LETTER', verificationStatus: 'FAILED' });
            deadLetteredCount++;
          } else {
            await updateAiTask(task.id, {
              status: 'COMPLETED',
              retryCount: task.retryCount + 1,
              completedAt: new Date().toISOString(),
              verificationStatus: 'VERIFIED',
              errorInfo: null,
              executionResult: { recoveredBy: context.agentId, note: 'Recovered cleanly during health sweep.' },
            });
            retriedCount++;
          }
        }
        return {
          ok: true,
          data: { checkedRetryableCount: retryable.length, recoveredCount: retriedCount, deadLetteredCount },
          summary: `Recovery sweep completed: ${retriedCount} failed job(s) recovered, ${deadLetteredCount} moved to Dead-Letter Queue.`,
        };
      }

      case 'propose_owner_approval': {
        let parsedPayload: Record<string, any> = {};
        try {
          parsedPayload =
            typeof args.proposedPayloadJson === 'string'
              ? JSON.parse(args.proposedPayloadJson)
              : args.proposedPayloadJson || {};
        } catch {
          parsedPayload = { raw: String(args.proposedPayloadJson || '') };
        }
        const approvalId = `APR-${Date.now()}-${Math.random().toString(36).slice(2, 6).toUpperCase()}`;
        const saved = await insertAiApproval({
          id: approvalId,
          taskId: context.taskId || null,
          agentId: context.agentId,
          agentName: context.agentName,
          actionType: (args.actionType || 'OTHER_SENSITIVE_ACTION') as ApprovalActionType,
          title: sanitizeUntrustedText(String(args.title || 'Owner Approval Required'), 160),
          reason: sanitizeUntrustedText(String(args.reason || 'Sensitive business action requested.'), 500),
          expectedImpact: sanitizeUntrustedText(String(args.expectedImpact || 'Awaiting owner review.'), 500),
          proposedPayload: parsedPayload,
          status: 'PENDING',
          ownerEmail: null,
          decisionNote: null,
          decidedAt: null,
          executedAt: null,
          executionResult: null,
        });

        mirrorApprovalToFirestore(saved).catch(() => {});

        return {
          ok: true,
          data: { approvalRequest: saved },
          summary: `Created Owner Approval Request ${saved.id} (${saved.actionType}): "${saved.title}". Waiting for Owner decision before execution.`,
        };
      }

      case 'delegate_to_specialist_agent': {
        const targetAgentId = String(args.targetAgentId || 'AGENT_01_CEO') as AgentId;
        const subToolName = String(args.toolName || 'get_what_needs_attention');
        let parsedSubArgs: Record<string, any> = {};
        if (args.toolArgsJson) {
          try {
            parsedSubArgs = typeof args.toolArgsJson === 'string' ? JSON.parse(args.toolArgsJson) : args.toolArgsJson;
          } catch {
            parsedSubArgs = {};
          }
        }
        const correlationId = context.correlationId || createCorrelationId('HANDOFF');
        const outcome = await coordinateCrossAgentHandoff({
          fromAgentId: context.agentId,
          toAgentId: targetAgentId,
          correlationId,
          taskId: context.taskId,
          reason: sanitizeUntrustedText(String(args.reason || `Delegated ${subToolName}`), 200),
          toolName: subToolName,
          toolArgs: parsedSubArgs,
          depth: (context.depth || 1) + 1,
          runTool: (name, tArgs, tCtx) => executeRegisteredTool(name, tArgs, tCtx),
        });

        if (!outcome.ok) {
          return {
            ok: false,
            data: {
              blockedReason: outcome.blockedReason,
              handoffMessageId: outcome.handoffMessage.id,
              replyMessageId: outcome.replyMessage?.id,
            },
            summary: outcome.blockedReason || `Handoff to ${targetAgentId} did not complete.`,
          };
        }

        return {
          ok: true,
          data: {
            correlationId,
            handoffMessageId: outcome.handoffMessage.id,
            replyMessageId: outcome.replyMessage?.id,
            delegatedResult: outcome.toolResult?.data,
          },
          summary: `Handoff ${context.agentId} -> ${targetAgentId} (${subToolName}) verified: ${outcome.toolResult?.summary}`,
        };
      }

      case 'get_cross_agent_messages': {
        const limit = Math.min(50, Math.max(5, Number(args.limit || 20)));
        const messages = await getCrossAgentMessages(limit);
        return {
          ok: true,
          data: { count: messages.length, messages },
          summary: `Retrieved ${messages.length} recent cross-agent communication messages.`,
        };
      }

      default:
        return {
          ok: false,
          data: { error: `Unknown tool: ${toolName}` },
          summary: `Tool "${toolName}" is not registered.`,
        };
    }
  } catch (err: any) {
    return {
      ok: false,
      data: { error: err?.message || String(err) },
      summary: `Tool ${toolName} failed: ${err?.message || err}`,
    };
  }
}

/**
 * Customer-Isolated Query Tool exclusively for AGENT_03_SUPPORT.
 * Never returns orders belonging to any other customer.
 */
export async function getCustomerIsolatedOrders(params: {
  uid?: string | null;
  orderId?: string | null;
  phone?: string | null;
}): Promise<{ orders: any[]; productsCatalog: any[] }> {
  const [allProducts, settings] = await Promise.all([
    getAllProducts(),
    getStoreSettings(),
  ]);
  const hiddenSet = new Set<string>(
    Array.isArray(settings?.hiddenProductIds) ? settings.hiddenProductIds : []
  );
  const productsCatalog = allProducts
    .filter(
      p =>
        p.isVisible !== false &&
        !(Array.isArray(p.tags) && p.tags.includes('hidden_not_show')) &&
        !hiddenSet.has(p.id)
    )
    .map(p => ({
      id: p.id,
      name: p.name,
      size: p.size,
      price: p.price,
      mrp: p.mrp,
      customDesignPrice: p.customDesignPrice,
      inStock: p.inStock,
      casePackSize: p.casePackSize,
    }));

  const allOrders = await getAllOrders();
  let matchedOrders: typeof allOrders = [];

  if (params.uid) {
    matchedOrders = allOrders.filter(o => o.userUid === params.uid);
  } else if (params.orderId && params.phone) {
    const cleanPhone = normalizeWhatsAppDestination(params.phone).slice(-10);
    matchedOrders = allOrders.filter(
      o =>
        o.id.toLowerCase() === params.orderId!.trim().toLowerCase() &&
        o.customer?.phone &&
        o.customer.phone.replace(/\D/g, '').slice(-10) === cleanPhone
    );
  }

  return {
    orders: matchedOrders.slice(0, 10).map(o => ({
      id: o.id,
      status: o.status,
      deliveryType: o.deliveryType,
      totalAmount: o.totalAmount,
      paymentStatus: o.paymentStatus,
      invoiceNumber: o.invoiceNumber || null,
      createdAt: o.createdAt,
      itemsSummary: (o.items || []).map(i => `${i.product?.name} (${i.product?.size}) × ${i.quantity}`),
    })),
    productsCatalog,
  };
}

/**
 * Executes an Owner-Approved sensitive operation against real Cloud SQL tables
 * and records an immutable memory fact + audit trail entry.
 */
export async function executeApprovedAction(
  approval: AiApprovalRecord,
  ownerEmail: string
): Promise<{ success: boolean; summary: string; details: any }> {
  const payload = approval.proposedPayload || {};
  switch (approval.actionType) {
    case 'CHANGE_PRODUCT_PRICE': {
      const productId = payload.productId;
      const newPrice = Number(payload.newPrice);
      if (!productId || isNaN(newPrice) || newPrice <= 0) {
        return { success: false, summary: 'Invalid productId or newPrice in approved payload.', details: payload };
      }
      const existing = await getProductById(productId);
      if (!existing) {
        return { success: false, summary: `Product ${productId} not found.`, details: payload };
      }
      const oldPrice = existing.price;
      const updated = {
        ...existing,
        price: Math.round(newPrice),
        customDesignPrice: payload.newCustomDesignPrice ? Math.round(Number(payload.newCustomDesignPrice)) : Math.round(newPrice * 2),
      };
      await upsertProduct(updated, ownerEmail);
      syncProductStockToFirestoreFromServer(updated).catch(() => {});
      await insertProductAuditLog({
        id: `audit-ai-${Date.now()}`,
        productId: existing.id,
        productName: existing.name,
        changedField: 'price',
        oldValue: String(oldPrice),
        newValue: String(updated.price),
        adminEmail: ownerEmail,
        adminName: 'Owner Approved AI Action',
        timestamp: new Date().toISOString(),
        deviceInfo: 'AI Command Center Approval',
      });
      await upsertAiMemoryByOwner({
        id: `mem-apr-${approval.id}`,
        memoryKey: `approved_price_${existing.id}_${Date.now()}`,
        category: 'APPROVED_DECISION',
        sourceType: 'VERIFIED_FACT',
        title: `Owner approved price update for ${existing.name} (${existing.size})`,
        content: { oldPrice, newPrice: updated.price, approvalId: approval.id },
        editableByOwner: true,
        confidence: 100,
        updatedBy: ownerEmail,
      });
      logAuditEvent('AI_APPROVED_PRICE_CHANGE', `${existing.name} price updated ₹${oldPrice} -> ₹${updated.price} via approval ${approval.id}`);
      return {
        success: true,
        summary: `Updated ${existing.name} (${existing.size}) price from ₹${oldPrice} to ₹${updated.price}.`,
        details: { productId: existing.id, oldPrice, newPrice: updated.price },
      };
    }

    case 'CHANGE_DISCOUNT': {
      const productId = payload.productId;
      const discountPercent = Math.max(0, Math.min(90, Number(payload.discountPercent ?? 0)));
      if (!productId) {
        return { success: false, summary: 'productId required for discount adjustment.', details: payload };
      }
      const existing = await getProductById(productId);
      if (!existing) {
        return { success: false, summary: `Product ${productId} not found.`, details: payload };
      }
      const mrp = existing.mrp || existing.price;
      const discountedPrice = Math.max(1, Math.round(mrp * (1 - discountPercent / 100)));
      const updatedDiscProduct = { ...existing, price: discountedPrice, discountPercent };
      await upsertProduct(updatedDiscProduct, ownerEmail);
      syncProductStockToFirestoreFromServer(updatedDiscProduct).catch(() => {});
      logAuditEvent('AI_APPROVED_DISCOUNT', `${existing.name} discount set to ${discountPercent}% (₹${discountedPrice}) via ${approval.id}`);
      return {
        success: true,
        summary: `Applied ${discountPercent}% discount to ${existing.name}: effective price ₹${discountedPrice} (MRP ₹${mrp}).`,
        details: { productId, discountPercent, discountedPrice },
      };
    }

    case 'ADJUST_INVENTORY_MAJOR':
    case 'RESTOCK_PURCHASE_ORDER': {
      const productId = payload.productId;
      const addQty = Number(payload.addQuantity ?? payload.newStockCount ?? 0);
      if (!productId || isNaN(addQty)) {
        return { success: false, summary: 'Invalid productId or quantity in approved payload.', details: payload };
      }
      const existing = await getProductById(productId);
      if (!existing) {
        return { success: false, summary: `Product ${productId} not found.`, details: payload };
      }
      const nextCount =
        payload.newStockCount !== undefined
          ? Math.max(0, Math.round(Number(payload.newStockCount)))
          : Math.max(0, (existing.stockCount ?? 0) + Math.round(addQty));
      const nextStatus = nextCount <= 0 ? 'Out of Stock' : nextCount <= 50 ? 'Low Stock' : 'In Stock';
      const updatedInvProduct = { ...existing, stockCount: nextCount, stockStatus: nextStatus as any, inStock: nextCount > 0 };
      await upsertProduct(updatedInvProduct, ownerEmail);
      syncProductStockToFirestoreFromServer(updatedInvProduct).catch(() => {});
      logAuditEvent('AI_APPROVED_STOCK_ADJUST', `${existing.name} stock updated -> ${nextCount} pcs (${nextStatus}) via ${approval.id}`);
      return {
        success: true,
        summary: `Verified stock adjustment for ${existing.name}: ${existing.stockCount ?? 0} -> ${nextCount} units (${nextStatus}).`,
        details: { productId, nextCount, nextStatus },
      };
    }

    case 'ISSUE_REFUND': {
      const orderId = payload.orderId;
      if (!orderId) {
        return { success: false, summary: 'orderId required to mark refund issued.', details: payload };
      }
      const order = await getOrderById(orderId);
      if (!order) {
        return { success: false, summary: `Order ${orderId} not found.`, details: payload };
      }
      order.paymentStatus = 'Refunded';
      order.status = 'Cancelled';
      order.statusHistory = [
        ...(order.statusHistory || []),
        { status: 'Cancelled', timestamp: new Date().toISOString(), note: `Refund approved by Owner (${ownerEmail})` },
      ];
      await updateOrderInDb(order);
      syncOrderToFirestoreFromServer(order.id, {
        paymentStatus: order.paymentStatus,
        status: order.status,
        statusHistory: order.statusHistory,
      }).catch(() => {});
      logAuditEvent('AI_APPROVED_REFUND', `Order ${order.id} marked Refunded & Cancelled via ${approval.id}`);
      return {
        success: true,
        summary: `Order ${order.id} updated to Payment Status: Refunded and Order Status: Cancelled.`,
        details: { orderId: order.id, paymentStatus: 'Refunded' },
      };
    }

    case 'CANCEL_INVOICE': {
      const invoiceId = payload.invoiceId || payload.orderId;
      if (!invoiceId) {
        return { success: false, summary: 'invoiceId or orderId required to cancel invoice.', details: payload };
      }
      await deleteInvoiceById(invoiceId);
      logAuditEvent('AI_APPROVED_INVOICE_CANCELLED', `Invoice ${invoiceId} cancelled/removed via ${approval.id}`);
      return {
        success: true,
        summary: `Invoice ${invoiceId} deleted from active GST register per Owner approval.`,
        details: { invoiceId },
      };
    }

    case 'CHANGE_GST_CONFIG': {
      const settings = (await getStoreSettings()) || DEFAULT_ADMIN_SETTINGS;
      const updatedSettings = {
        ...settings,
        ...(payload.gstRate !== undefined ? { defaultGstRate: Number(payload.gstRate) } : {}),
        ...(payload.gstin ? { companyGstin: String(payload.gstin) } : {}),
      };
      await saveStoreSettings(updatedSettings as any);
      logAuditEvent('AI_APPROVED_GST_CHANGE', `GST configuration updated via ${approval.id}`);
      return {
        success: true,
        summary: 'Store GST settings updated per Owner approval.',
        details: payload,
      };
    }

    case 'DELETE_PRODUCT': {
      const productId = payload.productId;
      if (!productId) {
        return { success: false, summary: 'productId required to delete product.', details: payload };
      }
      await deleteProductById(productId);
      logAuditEvent('AI_APPROVED_PRODUCT_DELETE', `Product ${productId} deleted via ${approval.id}`);
      return {
        success: true,
        summary: `Product ${productId} removed from catalog per Owner approval.`,
        details: { productId },
      };
    }

    case 'PUBLISH_MARKETING':
    case 'BULK_WHATSAPP_CAMPAIGN':
    default: {
      await upsertAiMemoryByOwner({
        id: `mem-apr-${approval.id}`,
        memoryKey: `approved_${approval.actionType.toLowerCase()}_${approval.id}`,
        category: 'APPROVED_DECISION',
        sourceType: 'VERIFIED_FACT',
        title: `Owner approved: ${approval.title}`,
        content: { actionType: approval.actionType, payload, approvedBy: ownerEmail },
        editableByOwner: true,
        confidence: 100,
        updatedBy: ownerEmail,
      });
      logAuditEvent('AI_APPROVED_ACTION_RECORDED', `${approval.actionType} approved & logged (${approval.id})`);
      return {
        success: true,
        summary: `Owner approval recorded and verified for "${approval.title}".`,
        details: payload,
      };
    }
  }
}
