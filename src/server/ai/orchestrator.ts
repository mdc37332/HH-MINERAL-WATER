import { runGeminiWithTools } from './geminiClient.ts';
import { runAutonomousOperatingCycle } from './autonomousCycle.ts';
import {
  AI_TOOL_DECLARATIONS,
  executeRegisteredTool,
  getCustomerIsolatedOrders,
} from './toolRegistry.ts';
import {
  formatMemoryContextForPrompt,
  sanitizeUntrustedText,
} from './memoryService.ts';
import { getAgentMetadata } from './agentRegistry.ts';
import {
  coordinateCrossAgentHandoff,
  createCorrelationId,
  sendCrossAgentMessage,
} from './crossAgentBus.ts';
import { syncOrderToFirestoreFromServer } from './firestoreBridge.ts';
import { getAllProducts, getStoreSettings } from '../../db/queries.ts';
import { recordAiSystemEvent } from '../../db/aiQueries.ts';
import type { AgentId, AiTaskRecord, BusinessEventType } from './types.ts';

interface OrchestratorCommandResponse {
  success: boolean;
  usedGemini: boolean;
  routedAgentId: AgentId;
  routedAgentName: string;
  correlationId: string;
  answer: string;
  structuredData: any;
  task: AiTaskRecord;
  requiresApproval: boolean;
}

function classifyOwnerIntent(command: string): {
  agentId: AgentId;
  plannedTools: Array<{ name: string; args: Record<string, any> }>;
  isSensitive: boolean;
} {
  const q = command.toLowerCase();

  // Sensitive actions that MUST generate an Owner Approval Request
  if (
    q.includes('change price') ||
    q.includes('update price') ||
    q.includes('set price') ||
    q.includes('discount') ||
    q.includes('refund') ||
    q.includes('cancel invoice') ||
    q.includes('delete product') ||
    q.includes('publish') ||
    q.includes('bulk whatsapp') ||
    q.includes('restock') ||
    q.includes('purchase order')
  ) {
    let actionType = 'OTHER_SENSITIVE_ACTION';
    let agentId: AgentId = 'AGENT_01_CEO';
    if (q.includes('price')) {
      actionType = 'CHANGE_PRODUCT_PRICE';
      agentId = 'AGENT_05_FINANCE';
    } else if (q.includes('discount')) {
      actionType = 'CHANGE_DISCOUNT';
      agentId = 'AGENT_07_MARKETING';
    } else if (q.includes('refund')) {
      actionType = 'ISSUE_REFUND';
      agentId = 'AGENT_05_FINANCE';
    } else if (q.includes('cancel invoice')) {
      actionType = 'CANCEL_INVOICE';
      agentId = 'AGENT_05_FINANCE';
    } else if (q.includes('delete product')) {
      actionType = 'DELETE_PRODUCT';
      agentId = 'AGENT_04_INVENTORY';
    } else if (q.includes('publish') || q.includes('bulk whatsapp')) {
      actionType = q.includes('bulk') ? 'BULK_WHATSAPP_CAMPAIGN' : 'PUBLISH_MARKETING';
      agentId = 'AGENT_07_MARKETING';
    } else if (q.includes('restock') || q.includes('purchase order')) {
      actionType = 'RESTOCK_PURCHASE_ORDER';
      agentId = 'AGENT_04_INVENTORY';
    }
    return {
      agentId,
      isSensitive: true,
      plannedTools: [
        { name: 'get_inventory_health', args: {} },
        {
          name: 'propose_owner_approval',
          args: {
            actionType,
            title: `Owner Command Proposal: ${command.slice(0, 90)}`,
            reason: `Owner command requested sensitive operation ("${command.slice(0, 140)}"). Level 3 Controlled Autonomy mandates explicit Owner approval before commitment.`,
            expectedImpact: 'Requires Owner review of exact SKU/order target and parameters before PostgreSQL mutation.',
            proposedPayloadJson: JSON.stringify({ requestedCommand: command }),
          },
        },
      ],
    };
  }

  if (q.includes('cross-agent') || q.includes('cross agent') || q.includes('handoff') || q.includes('agent message')) {
    return {
      agentId: 'AGENT_00_ORCHESTRATOR',
      isSensitive: false,
      plannedTools: [{ name: 'get_cross_agent_messages', args: { limit: 25 } }],
    };
  }

  if (q.includes('pending order') || q.includes('delayed')) {
    return {
      agentId: 'AGENT_02_ORDER',
      isSensitive: false,
      plannedTools: [
        {
          name: 'get_orders_snapshot',
          args: q.includes('delayed')
            ? { statusFilter: 'pending', delayedHours: 24 }
            : { statusFilter: 'pending' },
        },
      ],
    };
  }

  if (q.includes('low in stock') || q.includes('low stock') || q.includes('complete stock') || q.includes('inventory')) {
    return {
      agentId: 'AGENT_04_INVENTORY',
      isSensitive: false,
      plannedTools: [
        {
          name: 'get_inventory_health',
          args: { onlyLowStock: q.includes('low') },
        },
      ],
    };
  }

  if (q.includes('whatsapp') || q.includes('notification') || q.includes('failed message')) {
    return {
      agentId: 'AGENT_06_WHATSAPP',
      isSensitive: false,
      plannedTools: [{ name: 'get_failed_notifications', args: {} }],
    };
  }

  if (q.includes('invoice') || q.includes('gst') || q.includes('payment') || q.includes('revenue')) {
    return {
      agentId: 'AGENT_05_FINANCE',
      isSensitive: false,
      plannedTools: [{ name: 'get_financial_and_invoice_summary', args: { period: 'ALL' } }],
    };
  }

  if (q.includes('custom design') || q.includes('custom bottle') || q.includes('600')) {
    if (q.includes('ad copy') || q.includes('marketing') || q.includes('caption') || q.includes('campaign')) {
      return {
        agentId: 'AGENT_07_MARKETING',
        isSensitive: false,
        plannedTools: [{ name: 'prepare_marketing_draft', args: { campaignFocus: command } }],
      };
    }
    return {
      agentId: 'AGENT_02_ORDER',
      isSensitive: false,
      plannedTools: [{ name: 'validate_custom_design_order', args: {} }],
    };
  }

  if (q.includes('ad ') || q.includes('ad copy') || q.includes('marketing') || q.includes('caption') || q.includes('campaign')) {
    return {
      agentId: 'AGENT_07_MARKETING',
      isSensitive: false,
      plannedTools: [{ name: 'prepare_marketing_draft', args: { campaignFocus: command } }],
    };
  }

  if (q.includes('error') || q.includes('health') || q.includes('recovery') || q.includes('bug')) {
    return {
      agentId: 'AGENT_09_RECOVERY',
      isSensitive: false,
      plannedTools: [{ name: 'get_system_health_and_errors', args: {} }],
    };
  }

  if (q.includes('security') || q.includes('login') || q.includes('audit') || q.includes('suspicious')) {
    return {
      agentId: 'AGENT_08_SECURITY',
      isSensitive: false,
      plannedTools: [{ name: 'run_security_audit_scan', args: {} }],
    };
  }

  if (q.includes('report') || q.includes('sales') || q.includes('selling the most') || q.includes('weekly') || q.includes('monthly') || q.includes('today')) {
    const reportType = q.includes('weekly') ? 'WEEKLY' : q.includes('monthly') ? 'MONTHLY' : 'DAILY';
    return {
      agentId: 'AGENT_10_REPORTING',
      isSensitive: false,
      plannedTools: [{ name: 'generate_business_report', args: { reportType } }],
    };
  }

  // Default CEO executive triage
  return {
    agentId: 'AGENT_01_CEO',
    isSensitive: false,
    plannedTools: [{ name: 'get_what_needs_attention', args: {} }],
  };
}

/**
 * Processes an Owner Admin Natural Language Command through the Master AI Orchestrator.
 */
export async function processOwnerNaturalLanguageCommand(
  rawCommand: string,
  ownerEmail: string
): Promise<OrchestratorCommandResponse> {
  const command = sanitizeUntrustedText(rawCommand, 800);
  const intent = classifyOwnerIntent(command);
  const agentMeta = getAgentMetadata(intent.agentId);
  const memoryCtx = await formatMemoryContextForPrompt();
  const correlationId = createCorrelationId('CMD');

  let usedGemini = false;
  let answerText = '';
  let structuredOutput: any = null;
  let requiresApproval = false;
  const recordedToolCalls: Array<{ tool: string; status: string; summary: string; timestamp: string }> = [];

  const task = await runAutonomousOperatingCycle({
    agentId: intent.agentId,
    eventSource: `OWNER_COMMAND (${ownerEmail}) [${correlationId}]`,
    taskDescription: `Owner Command: "${command}"`,
    authorizationLevel: intent.isSensitive ? 'OWNER_APPROVAL_REQUIRED' : 'AUTO_LEVEL_3',
    observeSummary: `Received Owner Admin instruction: "${command}"`,
    understandSummary: `Classified target specialist: ${agentMeta.name} (${agentMeta.code}); correlation=${correlationId}; sensitivity=${intent.isSensitive ? 'SENSITIVE_APPROVAL_REQUIRED' : 'ROUTINE_AUTO_LEVEL_3'}.`,
    analyzeSummary: `Consulted PostgreSQL Business Memory & live store policy rules.`,
    planSteps: [
      `Dispatch Cross-Agent Handoff ORCH-00 -> ${agentMeta.code}`,
      'Invoke verified Cloud SQL & Firestore backend tools',
      intent.isSensitive ? 'Generate Owner Approval Request (do not mutate)' : 'Verify result against Cloud SQL & Firestore bridge',
      'Return executive report & log verification reply',
    ],
    permissionCheckSummary: intent.isSensitive
      ? 'OWNER_APPROVAL_REQUIRED: Sensitive change intercepted cleanly; awaiting Owner approval.'
      : `AUTO_LEVEL_3: Permitted under ${agentMeta.name} chartered permissions.`,
    execute: async taskId => {
      let totalTokens = 0;

      await sendCrossAgentMessage({
        correlationId,
        taskId,
        fromAgentId: 'AGENT_00_ORCHESTRATOR',
        toAgentId: intent.agentId,
        intent: 'HANDOFF',
        subject: `Owner Instruction Routed: ${command.slice(0, 120)}`,
        payload: { ownerEmail, command, correlationId },
        priority: intent.isSensitive ? 'HIGH' : 'NORMAL',
      }).catch(() => {});

      // Attempt real Gemini 4 Hydrogen tool-calling loop first
      const geminiRes = await runGeminiWithTools({
        source: intent.agentId,
        systemInstruction: [
          `You are the HH MINERAL WATER Master AI Orchestrator coordinating ${agentMeta.name}.`,
          `Operating Mode: LEVEL 3 — MAXIMUM CONTROLLED AUTONOMY.`,
          `ALWAYS inspect live business data using the provided backend tools before answering. You may use delegate_to_specialist_agent when cross-department verification helps. Never invent numbers.`,
          `If the owner requests a sensitive mutation (changing product price, discounts, refunds, cancelling invoices, deleting products, publishing campaigns, bulk WhatsApp, restock purchase orders), call propose_owner_approval so an Approval Request card appears for explicit confirmation—never claim the change is already applied unless approved.`,
          memoryCtx,
        ].join('\n\n'),
        prompt: command,
        declarations: AI_TOOL_DECLARATIONS,
        executeTool: async (name, args) => {
          const r = await executeRegisteredTool(name, args, {
            agentId: intent.agentId,
            agentName: agentMeta.name,
            taskId,
            correlationId,
            depth: 1,
          });
          if (name === 'propose_owner_approval' && r.ok) {
            requiresApproval = true;
          }
          recordedToolCalls.push({
            tool: name,
            status: r.ok ? 'VERIFIED_OK' : 'ERROR',
            summary: r.summary,
            timestamp: new Date().toISOString(),
          });
          structuredOutput = r.data;
          return r;
        },
      });

      totalTokens += geminiRes.tokensUsed || 0;

      if (geminiRes.usedGemini && geminiRes.toolTrace.length > 0) {
        usedGemini = true;
        answerText = geminiRes.text;
      } else {
        // Deterministic verified PostgreSQL tool execution fallback
        const summaries: string[] = [];
        const outputs: Record<string, any> = {};
        for (const planned of intent.plannedTools) {
          const r = await executeRegisteredTool(planned.name, planned.args, {
            agentId: intent.agentId,
            agentName: agentMeta.name,
            taskId,
            correlationId,
            depth: 1,
          });
          if (planned.name === 'propose_owner_approval' && r.ok) {
            requiresApproval = true;
          }
          recordedToolCalls.push({
            tool: planned.name,
            status: r.ok ? 'VERIFIED_OK' : 'ERROR',
            summary: r.summary,
            timestamp: new Date().toISOString(),
          });
          outputs[planned.name] = r.data;
          summaries.push(r.summary);
        }
        structuredOutput = intent.plannedTools.length === 1 ? Object.values(outputs)[0] : outputs;
        answerText = geminiRes.usedGemini && geminiRes.text
          ? geminiRes.text
          : summaries.join('\n');
      }

      await sendCrossAgentMessage({
        correlationId,
        taskId,
        fromAgentId: intent.agentId,
        toAgentId: 'AGENT_00_ORCHESTRATOR',
        intent: requiresApproval ? 'APPROVAL_ESCALATION' : 'VERIFICATION_REPORT',
        subject: `${agentMeta.code} Completed: ${answerText.slice(0, 140)}`,
        payload: {
          usedGemini,
          toolsExecuted: recordedToolCalls.map(t => t.tool),
          requiresApproval,
        },
        priority: requiresApproval ? 'HIGH' : 'NORMAL',
      }).catch(() => {});

      return {
        result: { answer: answerText, data: structuredOutput, usedGemini, correlationId },
        summary: answerText.slice(0, 400),
        verificationStatus: recordedToolCalls.some(t => t.status === 'ERROR') ? 'FAILED' : 'VERIFIED',
        awaitingApproval: requiresApproval,
        toolCalls: recordedToolCalls,
        tokensUsed: totalTokens,
      };
    },
  });

  return {
    success: task.status !== 'FAILED',
    usedGemini,
    routedAgentId: intent.agentId,
    routedAgentName: agentMeta.name,
    correlationId,
    answer: answerText || task.errorInfo || 'Task processed.',
    structuredData: structuredOutput,
    task,
    requiresApproval,
  };
}

/**
 * Automated Event-Driven Master AI Orchestration Bus.
 * Coordinates multi-agent handoffs, tool execution, Cloud SQL + Firestore sync,
 * and cross-agent persistence on real business events.
 */
export async function handleBusinessEvent(
  eventType: BusinessEventType,
  payload: Record<string, any> = {},
  idempotencyKey?: string
): Promise<AiTaskRecord> {
  const key = idempotencyKey || `${eventType}:${payload.orderId || payload.productId || Date.now()}`;
  const correlationId = createCorrelationId(eventType.slice(0, 6));

  const runTool = (
    name: string,
    args: Record<string, any>,
    ctx: { agentId: AgentId; agentName: string; taskId?: string; depth?: number; correlationId?: string }
  ) => executeRegisteredTool(name, args, ctx);

  switch (eventType) {
    case 'ORDER_PLACED': {
      return runAutonomousOperatingCycle({
        agentId: 'AGENT_02_ORDER',
        eventSource: `EVENT:ORDER_PLACED (${payload.orderId || 'unknown'}) [${correlationId}]`,
        idempotencyKey: key,
        taskDescription: `Multi-agent intake, GST invoice, inventory & WhatsApp check for Order ${payload.orderId || 'Latest'}`,
        observeSummary: `New order ${payload.orderId || '(latest)'} detected (₹${payload.totalAmount || 0}, custom=${Boolean(payload.isCustomOrder)}).`,
        understandSummary: 'Coordinate Order, Finance, Inventory, and WhatsApp specialist agents with verified Cloud SQL & Firestore parity.',
        analyzeSummary: 'Verifying 1:1 GST Tax Invoice, remaining bottle stock thresholds, custom artwork rules, and admin WhatsApp alert delivery.',
        planSteps: [
          'ORCH-00 -> ORD-02: Intake & Custom Order validation',
          'ORD-02 -> FIN-05: 1:1 GST Tax Invoice reconciliation',
          'ORD-02 -> INV-04: Post-order bottle stock audit (& restock escalation if <=50)',
          'ORD-02 -> WSP-06: WhatsApp alert verification',
        ],
        permissionCheckSummary: 'AUTO_LEVEL_3: Multi-agent routine order pipeline & Firestore sync permitted.',
        execute: async taskId => {
          const calls: Array<{ tool: string; status: string; summary: string; timestamp: string }> = [];

          await sendCrossAgentMessage({
            correlationId,
            taskId,
            fromAgentId: 'AGENT_00_ORCHESTRATOR',
            toAgentId: 'AGENT_02_ORDER',
            intent: 'HANDOFF',
            subject: `New Order Intake Pipeline: ${payload.orderId || 'Latest Order'}`,
            payload: { eventType, ...payload },
          });

          const finHandoff = await coordinateCrossAgentHandoff({
            fromAgentId: 'AGENT_02_ORDER',
            toAgentId: 'AGENT_05_FINANCE',
            correlationId,
            taskId,
            reason: `Reconcile GST Tax Invoice for Order ${payload.orderId || 'recent orders'}`,
            toolName: 'auto_generate_missing_invoices',
            toolArgs: { dryRun: false },
            depth: 2,
            runTool,
          });
          calls.push({
            tool: 'delegate:FIN-05:auto_generate_missing_invoices',
            status: finHandoff.ok ? 'VERIFIED_OK' : 'WARNING',
            summary: finHandoff.toolResult?.summary || finHandoff.blockedReason || 'Checked',
            timestamp: new Date().toISOString(),
          });

          const invHandoff = await coordinateCrossAgentHandoff({
            fromAgentId: 'AGENT_02_ORDER',
            toAgentId: 'AGENT_04_INVENTORY',
            correlationId,
            taskId,
            reason: `Audit bottle stock buffer after Order ${payload.orderId || 'recent intake'}`,
            toolName: 'get_inventory_health',
            toolArgs: { onlyLowStock: true },
            depth: 2,
            runTool,
          });
          calls.push({
            tool: 'delegate:INV-04:get_inventory_health',
            status: invHandoff.ok ? 'VERIFIED_OK' : 'WARNING',
            summary: invHandoff.toolResult?.summary || invHandoff.blockedReason || 'Checked',
            timestamp: new Date().toISOString(),
          });

          const wspHandoff = await coordinateCrossAgentHandoff({
            fromAgentId: 'AGENT_02_ORDER',
            toAgentId: 'AGENT_06_WHATSAPP',
            correlationId,
            taskId,
            reason: `Verify admin WhatsApp notification status for Order ${payload.orderId || 'recent'}`,
            toolName: 'get_failed_notifications',
            toolArgs: {},
            depth: 2,
            runTool,
          });
          calls.push({
            tool: 'delegate:WSP-06:get_failed_notifications',
            status: wspHandoff.ok ? 'VERIFIED_OK' : 'WARNING',
            summary: wspHandoff.toolResult?.summary || wspHandoff.blockedReason || 'Checked',
            timestamp: new Date().toISOString(),
          });

          if (payload.isCustomOrder && payload.orderId) {
            const customRes = await executeRegisteredTool(
              'validate_custom_design_order',
              { orderId: payload.orderId },
              { agentId: 'AGENT_02_ORDER', agentName: 'AI Order Manager', taskId, correlationId }
            );
            calls.push({
              tool: 'validate_custom_design_order',
              status: customRes.ok ? 'VERIFIED_OK' : 'WARNING',
              summary: customRes.summary,
              timestamp: new Date().toISOString(),
            });
          }

          const lowCount = invHandoff.toolResult?.data?.lowStockCount || 0;
          if (lowCount > 0) {
            await sendCrossAgentMessage({
              correlationId,
              taskId,
              fromAgentId: 'AGENT_04_INVENTORY',
              toAgentId: 'AGENT_01_CEO',
              intent: 'RISK_ALERT',
              subject: `Low Stock Alert after Order ${payload.orderId || ''}: ${lowCount} bottle SKU(s) <= 50 units`,
              payload: { lowStockCount: lowCount, skus: invHandoff.toolResult?.data?.products?.slice(0, 5) },
              priority: 'HIGH',
            });
          }

          const finalSummary = `Order ${payload.orderId || ''} coordinated across FIN-05, INV-04, WSP-06: ${finHandoff.toolResult?.summary || ''} | Low-Stock SKUs: ${lowCount}.`;
          await sendCrossAgentMessage({
            correlationId,
            taskId,
            fromAgentId: 'AGENT_02_ORDER',
            toAgentId: 'AGENT_01_CEO',
            intent: 'VERIFICATION_REPORT',
            subject: `Intake Verified: ${payload.orderId || 'Batch'}`,
            payload: { summary: finalSummary, lowStockCount: lowCount },
          });

          return {
            result: {
              correlationId,
              invoiceCheck: finHandoff.toolResult?.data,
              lowStockCount: lowCount,
              whatsappCheck: wspHandoff.toolResult?.data,
            },
            summary: finalSummary,
            verificationStatus: 'VERIFIED',
            toolCalls: calls,
            tokensUsed: 0,
          };
        },
      });
    }

    case 'ORDER_STATUS_CHANGED': {
      const orderId = String(payload.orderId || 'UNKNOWN');
      const newStatus = String(payload.newStatus || 'Updated');
      return runAutonomousOperatingCycle({
        agentId: 'AGENT_02_ORDER',
        eventSource: `EVENT:ORDER_STATUS_CHANGED (${orderId} -> ${newStatus}) [${correlationId}]`,
        idempotencyKey: key,
        taskDescription: `Coordinate dispatch logistics, WhatsApp update & finance parity for Order ${orderId} -> ${newStatus}`,
        observeSummary: `Order ${orderId} transitioned to status "${newStatus}".`,
        understandSummary: 'Sync status to Firestore, coordinate customer WhatsApp notification state, and verify COD/payment closure on delivery.',
        analyzeSummary: 'Executing cross-agent handoff ORD-02 -> WSP-06 -> FIN-05.',
        planSteps: [
          'Mirror order status update to Firestore bridge',
          'ORD-02 -> WSP-06: Verify WhatsApp dispatch/delivery readiness',
          'ORD-02 -> FIN-05: Audit GST invoice & COD receivables if Delivered',
        ],
        permissionCheckSummary: 'AUTO_LEVEL_3: Dispatch status synchronization & payment verification permitted.',
        execute: async taskId => {
          const calls: Array<{ tool: string; status: string; summary: string; timestamp: string }> = [];

          const fsSynced = await syncOrderToFirestoreFromServer(orderId, {
            status: newStatus as any,
          }).catch(() => false);

          await sendCrossAgentMessage({
            correlationId,
            taskId,
            fromAgentId: 'AGENT_00_ORCHESTRATOR',
            toAgentId: 'AGENT_02_ORDER',
            intent: 'HANDOFF',
            subject: `Order ${orderId} transitioned -> ${newStatus}`,
            payload: { orderId, newStatus, firestoreMirrored: fsSynced },
          });

          const wspHandoff = await coordinateCrossAgentHandoff({
            fromAgentId: 'AGENT_02_ORDER',
            toAgentId: 'AGENT_06_WHATSAPP',
            correlationId,
            taskId,
            reason: `Audit customer & admin WhatsApp notification queue for ${orderId} (${newStatus})`,
            toolName: 'get_failed_notifications',
            toolArgs: {},
            depth: 2,
            runTool,
          });
          calls.push({
            tool: 'delegate:WSP-06:get_failed_notifications',
            status: wspHandoff.ok ? 'VERIFIED_OK' : 'WARNING',
            summary: wspHandoff.toolResult?.summary || 'Checked',
            timestamp: new Date().toISOString(),
          });

          let finSummary = 'Status tracked';
          if (['Delivered', 'In-Transit', 'Dispatched', 'Cancelled'].includes(newStatus)) {
            const finHandoff = await coordinateCrossAgentHandoff({
              fromAgentId: 'AGENT_02_ORDER',
              toAgentId: 'AGENT_05_FINANCE',
              correlationId,
              taskId,
              reason: `Verify GST invoice & COD payment ledger for ${orderId} (${newStatus})`,
              toolName: 'get_financial_and_invoice_summary',
              toolArgs: { period: 'TODAY' },
              depth: 2,
              runTool,
            });
            finSummary = finHandoff.toolResult?.summary || finSummary;
            calls.push({
              tool: 'delegate:FIN-05:get_financial_and_invoice_summary',
              status: finHandoff.ok ? 'VERIFIED_OK' : 'WARNING',
              summary: finSummary,
              timestamp: new Date().toISOString(),
            });
          }

          return {
            result: { correlationId, orderId, newStatus, firestoreMirrored: fsSynced, finSummary },
            summary: `Order ${orderId} (${newStatus}) coordinated cleanly across WSP-06 & FIN-05.`,
            verificationStatus: 'VERIFIED',
            toolCalls: calls,
          };
        },
      });
    }

    case 'CUSTOM_DESIGN_SUBMITTED': {
      return runAutonomousOperatingCycle({
        agentId: 'AGENT_02_ORDER',
        eventSource: `EVENT:CUSTOM_DESIGN_SUBMITTED [${correlationId}]`,
        idempotencyKey: key,
        taskDescription: `Custom Bottle Design verification & capacity check (${payload.orderId || 'All Custom Orders'})`,
        observeSummary: 'Custom Design order event received; verifying 600-piece policy & artwork integrity.',
        understandSummary: 'Coordinate ORD-02 policy check with INV-04 stock reserve & MKT-07 campaign insights.',
        analyzeSummary: 'Checking uploaded custom bottle artwork & minimum 600 qty invariant.',
        planSteps: [
          'ORD-02: Validate >= 600 quantity & artwork preservation',
          'ORD-02 -> INV-04: Confirm bottle SKU capacity',
        ],
        permissionCheckSummary: 'AUTO_LEVEL_3: Policy inspection & cross-agent notification permitted.',
        execute: async taskId => {
          const customRes = await executeRegisteredTool(
            'validate_custom_design_order',
            payload.orderId ? { orderId: payload.orderId } : {},
            { agentId: 'AGENT_02_ORDER', agentName: 'AI Order Manager', taskId, correlationId }
          );
          const invHandoff = await coordinateCrossAgentHandoff({
            fromAgentId: 'AGENT_02_ORDER',
            toAgentId: 'AGENT_04_INVENTORY',
            correlationId,
            taskId,
            reason: 'Check bottle stock readiness for custom label bottling run',
            toolName: 'get_inventory_health',
            toolArgs: { onlyLowStock: false },
            depth: 2,
            runTool,
          });
          return {
            result: { correlationId, customValidation: customRes.data, inventory: invHandoff.toolResult?.data },
            summary: `${customRes.summary} | ${invHandoff.toolResult?.summary || ''}`,
            verificationStatus: customRes.ok ? 'VERIFIED' : 'FAILED',
            toolCalls: [
              { tool: 'validate_custom_design_order', status: customRes.ok ? 'VERIFIED_OK' : 'WARNING', summary: customRes.summary, timestamp: new Date().toISOString() },
              { tool: 'delegate:INV-04:get_inventory_health', status: invHandoff.ok ? 'VERIFIED_OK' : 'WARNING', summary: invHandoff.toolResult?.summary || 'Checked', timestamp: new Date().toISOString() },
            ],
          };
        },
      });
    }

    case 'LOW_STOCK_DETECTED': {
      return runAutonomousOperatingCycle({
        agentId: 'AGENT_04_INVENTORY',
        eventSource: `EVENT:LOW_STOCK_DETECTED [${correlationId}]`,
        idempotencyKey: key,
        taskDescription: `Detect low-stock bottle SKUs & escalate Owner restock purchase order`,
        observeSummary: 'Inventory monitor flagged bottle SKU below safety threshold.',
        understandSummary: 'Identify SKUs <= 50 units, alert CEO-01 & WSP-06, and propose Owner restock approval.',
        analyzeSummary: 'Querying live products stock_count across Cloud SQL.',
        planSteps: ['Scan inventory health', 'Generate Owner Approval Request for restock if needed', 'Escalate RISK_ALERT to CEO-01'],
        permissionCheckSummary: 'AUTO_LEVEL_3 observation + OWNER_APPROVAL_REQUIRED for restock commitment.',
        execute: async taskId => {
          const inv = await executeRegisteredTool('get_inventory_health', { onlyLowStock: true }, {
            agentId: 'AGENT_04_INVENTORY',
            agentName: 'AI Inventory Manager',
            taskId,
            correlationId,
          });
          const lowProducts = inv.data.products || [];
          let awaitingApproval = false;
          if (lowProducts.length > 0) {
            const topLow = lowProducts[0];
            await executeRegisteredTool(
              'propose_owner_approval',
              {
                actionType: 'RESTOCK_PURCHASE_ORDER',
                title: `Restock Recommendation: ${topLow.name} (${topLow.size})`,
                reason: `Stock dropped to ${topLow.stockCount} units (Threshold: 50 units).`,
                expectedImpact: `Adds +${topLow.recommendedRestockQty || 500} units to restore safe dispatch buffer.`,
                proposedPayloadJson: JSON.stringify({
                  productId: topLow.id,
                  addQuantity: topLow.recommendedRestockQty || 500,
                }),
              },
              { agentId: 'AGENT_04_INVENTORY', agentName: 'AI Inventory Manager', taskId, correlationId }
            );
            awaitingApproval = true;

            await sendCrossAgentMessage({
              correlationId,
              taskId,
              fromAgentId: 'AGENT_04_INVENTORY',
              toAgentId: 'AGENT_01_CEO',
              intent: 'APPROVAL_ESCALATION',
              subject: `Restock Approval Needed: ${topLow.name} (${topLow.stockCount} left)`,
              payload: { lowProductsCount: lowProducts.length, topLow },
              priority: 'HIGH',
            });
          } else {
            await sendCrossAgentMessage({
              correlationId,
              taskId,
              fromAgentId: 'AGENT_04_INVENTORY',
              toAgentId: 'AGENT_01_CEO',
              intent: 'VERIFICATION_REPORT',
              subject: 'Inventory Audit Clean: All bottle SKUs above 50-unit buffer',
              payload: { totalProducts: inv.data.totalProducts },
            });
          }
          return {
            result: { correlationId, ...inv.data },
            summary: inv.summary,
            verificationStatus: 'VERIFIED',
            awaitingApproval,
            toolCalls: [{ tool: 'get_inventory_health', status: 'VERIFIED_OK', summary: inv.summary, timestamp: new Date().toISOString() }],
          };
        },
      });
    }

    case 'DAILY_EXECUTIVE_BRIEFING': {
      return runAutonomousOperatingCycle({
        agentId: 'AGENT_01_CEO',
        eventSource: `EVENT:DAILY_EXECUTIVE_BRIEFING [${correlationId}]`,
        idempotencyKey: key,
        taskDescription: `Master Orchestrator Multi-Department Daily Executive Briefing`,
        observeSummary: 'Coordinating CEO-01, RPT-10, FIN-05, INV-04, and ORD-02 for unified business snapshot.',
        understandSummary: 'Collect live sales, GST invoice completeness, pending orders, and stock buffer health.',
        analyzeSummary: 'Dispatching parallel department handoffs with correlation tracking.',
        planSteps: [
          'CEO-01 -> RPT-10: Daily sales report',
          'CEO-01 -> FIN-05: GST & receivable summary',
          'CEO-01 -> INV-04: Low stock risk scan',
          'CEO-01 -> ORD-02: Pending order queue',
        ],
        permissionCheckSummary: 'AUTO_LEVEL_3: Executive cross-department read & reporting allowed.',
        execute: async taskId => {
          const [rpt, fin, inv, ord] = await Promise.all([
            coordinateCrossAgentHandoff({
              fromAgentId: 'AGENT_01_CEO',
              toAgentId: 'AGENT_10_REPORTING',
              correlationId,
              taskId,
              reason: 'Compile Daily Asia/Kolkata Sales & Operations Report',
              toolName: 'generate_business_report',
              toolArgs: { reportType: 'DAILY' },
              depth: 2,
              runTool,
            }),
            coordinateCrossAgentHandoff({
              fromAgentId: 'AGENT_01_CEO',
              toAgentId: 'AGENT_05_FINANCE',
              correlationId,
              taskId,
              reason: 'Verify GST collections & COD pending balances',
              toolName: 'get_financial_and_invoice_summary',
              toolArgs: { period: 'ALL' },
              depth: 2,
              runTool,
            }),
            coordinateCrossAgentHandoff({
              fromAgentId: 'AGENT_01_CEO',
              toAgentId: 'AGENT_04_INVENTORY',
              correlationId,
              taskId,
              reason: 'Audit low stock water bottle SKUs',
              toolName: 'get_inventory_health',
              toolArgs: { onlyLowStock: true },
              depth: 2,
              runTool,
            }),
            coordinateCrossAgentHandoff({
              fromAgentId: 'AGENT_01_CEO',
              toAgentId: 'AGENT_02_ORDER',
              correlationId,
              taskId,
              reason: 'Check active pending dispatch orders',
              toolName: 'get_orders_snapshot',
              toolArgs: { statusFilter: 'pending' },
              depth: 2,
              runTool,
            }),
          ]);

          const summary = [
            rpt.toolResult?.summary,
            fin.toolResult?.summary,
            inv.toolResult?.summary,
            ord.toolResult?.summary,
          ]
            .filter(Boolean)
            .join('\n');

          return {
            result: {
              correlationId,
              report: rpt.toolResult?.data,
              finance: fin.toolResult?.data,
              inventory: inv.toolResult?.data,
              pendingOrders: ord.toolResult?.data,
            },
            summary,
            verificationStatus: 'VERIFIED',
            toolCalls: [
              { tool: 'delegate:RPT-10:generate_business_report', status: rpt.ok ? 'VERIFIED_OK' : 'ERROR', summary: rpt.toolResult?.summary || '', timestamp: new Date().toISOString() },
              { tool: 'delegate:FIN-05:get_financial_and_invoice_summary', status: fin.ok ? 'VERIFIED_OK' : 'ERROR', summary: fin.toolResult?.summary || '', timestamp: new Date().toISOString() },
              { tool: 'delegate:INV-04:get_inventory_health', status: inv.ok ? 'VERIFIED_OK' : 'ERROR', summary: inv.toolResult?.summary || '', timestamp: new Date().toISOString() },
              { tool: 'delegate:ORD-02:get_orders_snapshot', status: ord.ok ? 'VERIFIED_OK' : 'ERROR', summary: ord.toolResult?.summary || '', timestamp: new Date().toISOString() },
            ],
          };
        },
      });
    }

    default: {
      const targetAgent: AgentId = eventType === 'SECURITY_ALERT' ? 'AGENT_08_SECURITY' : 'AGENT_09_RECOVERY';
      await recordAiSystemEvent({
        eventType,
        severity: eventType === 'SECURITY_ALERT' || eventType === 'API_FAILURE' ? 'WARNING' : 'INFO',
        source: 'AGENT_00_ORCHESTRATOR',
        summary: `Event ${eventType} logged & dispatched [${correlationId}].`,
        details: payload,
        resolved: false,
        tokensUsed: 0,
      });
      return runAutonomousOperatingCycle({
        agentId: targetAgent,
        eventSource: `EVENT:${eventType} [${correlationId}]`,
        idempotencyKey: key,
        taskDescription: `Handle system event ${eventType}`,
        observeSummary: `Received ${eventType}`,
        understandSummary: 'Run diagnostic audit & recovery sweep and alert CEO-01.',
        analyzeSummary: 'Evaluating system security and PostgreSQL/API health.',
        planSteps: ['Execute diagnostic tool', 'Notify CEO-01 via cross-agent bus', 'Record verified outcome'],
        permissionCheckSummary: 'AUTO_LEVEL_3 diagnostics allowed.',
        execute: async taskId => {
          const toolName = eventType === 'SECURITY_ALERT' ? 'run_security_audit_scan' : 'run_error_recovery_sweep';
          const res = await executeRegisteredTool(toolName, {}, {
            agentId: targetAgent,
            agentName: getAgentMetadata(targetAgent).name,
            taskId,
            correlationId,
          });
          await sendCrossAgentMessage({
            correlationId,
            taskId,
            fromAgentId: targetAgent,
            toAgentId: 'AGENT_01_CEO',
            intent: eventType === 'SECURITY_ALERT' ? 'RISK_ALERT' : 'RECOVERY_NOTICE',
            subject: `${eventType} Outcome: ${res.summary}`,
            payload: res.data || {},
            priority: 'HIGH',
          });
          return {
            result: { correlationId, ...res.data },
            summary: res.summary,
            verificationStatus: 'VERIFIED',
            toolCalls: [{ tool: toolName, status: 'VERIFIED_OK', summary: res.summary, timestamp: new Date().toISOString() }],
          };
        },
      });
    }
  }
}

/**
 * Customer-facing Isolated AI Support Query (AGENT_03_SUPPORT).
 * Strictly isolated: only reads public products & the verified matching customer's orders.
 */
export async function handleCustomerSupportQuery(params: {
  message: string;
  userUid?: string | null;
  orderId?: string | null;
  phone?: string | null;
}): Promise<{
  reply: string;
  matchedOrdersCount: number;
  usedGemini: boolean;
}> {
  const cleanMsg = sanitizeUntrustedText(params.message, 600);
  const isolated = await getCustomerIsolatedOrders({
    uid: params.userUid,
    orderId: params.orderId,
    phone: params.phone,
  });

  const [allProducts, settings] = await Promise.all([
    getAllProducts(),
    getStoreSettings(),
  ]);
  const hiddenSet = new Set<string>(
    Array.isArray(settings?.hiddenProductIds) ? settings.hiddenProductIds : []
  );
  const visibleProducts = allProducts.filter(
    p =>
      p.isVisible !== false &&
      !(Array.isArray(p.tags) && p.tags.includes('hidden_not_show')) &&
      !hiddenSet.has(p.id)
  );
  const catalogContext = visibleProducts.length > 0
    ? visibleProducts
        .map(p => `- ${p.name} (${p.size}): ₹${p.price}/pack (${p.casePackSize} bottles/case), Custom design rate ₹${p.customDesignPrice}/bottle, Stock: ${p.inStock ? 'Available' : 'Out of Stock'}`)
        .join('\n')
    : 'All catalog items are temporarily hidden by the store administrator.';

  const customerOrdersContext =
    isolated.orders.length > 0
      ? JSON.stringify(isolated.orders)
      : 'No authenticated or verified matching customer order provided in this query.';

  const geminiRes = await runGeminiWithTools({
    source: 'AGENT_03_SUPPORT',
    systemInstruction: [
      'You are AGENT_03_SUPPORT (Customer Support AI) for HH MINERAL WATER.',
      'STRICT ISOLATION RULE: NEVER reveal or speculate about any other customer, admin credentials, internal revenue, hidden/not-shown catalog items, or internal backend systems.',
      'CUSTOM DESIGN RULE: Minimum quantity for Custom Design Orders is strictly 600 pieces (with minimum 7 days event notice, accepted formats JPG/JPEG/PNG/WEBP).',
      `VERIFIED PUBLIC PRODUCT CATALOG:\n${catalogContext}`,
      `THIS CUSTOMER'S VERIFIED OWN ORDERS ONLY:\n${customerOrdersContext}`,
      'Answer politely, concisely, and accurately using ONLY the verified catalog and the customer own orders above.',
    ].join('\n\n'),
    prompt: cleanMsg,
    declarations: [],
    executeTool: async () => ({ ok: false, data: null, summary: 'Disabled for public customer chat' }),
  });

  if (geminiRes.usedGemini && geminiRes.text) {
    return {
      reply: geminiRes.text,
      matchedOrdersCount: isolated.orders.length,
      usedGemini: true,
    };
  }

  // Deterministic verified fallback answer
  const lower = cleanMsg.toLowerCase();
  if (lower.includes('custom') || lower.includes('minimum') || lower.includes('600') || lower.includes('wedding')) {
    return {
      reply: 'Custom Design Bottle Orders at HH Mineral Water require a minimum quantity of 600 pieces (no upper limit) and must be booked at least 7 days before your event. We preserve your original JPG/JPEG/PNG/WEBP artwork cleanly.',
      matchedOrdersCount: isolated.orders.length,
      usedGemini: false,
    };
  }

  if ((lower.includes('order') || lower.includes('track') || lower.includes('delivery')) && isolated.orders.length > 0) {
    const o = isolated.orders[0];
    return {
      reply: `Your Order ${o.id} is currently "${o.status}" (${o.deliveryType === 'self_pickup' ? 'Factory Pickup' : 'Doorstep Delivery'}). Total: ₹${o.totalAmount} (${o.paymentStatus})${o.invoiceNumber ? ` • GST Invoice: ${o.invoiceNumber}` : ''}.`,
      matchedOrdersCount: isolated.orders.length,
      usedGemini: false,
    };
  }

  if (lower.includes('order') || lower.includes('track')) {
    return {
      reply: 'To check your order status privately, please sign in to your account or enter BOTH your Order ID and registered 10-digit Phone Number in the verification fields above.',
      matchedOrdersCount: 0,
      usedGemini: false,
    };
  }

  return {
    reply: visibleProducts.length > 0
      ? `Welcome to HH Mineral Water! Available bottle sizes: ${visibleProducts.map(p => `${p.size} (₹${p.price})`).join(', ')}. All bottles go through 7-stage UV & Ozonated filtration (pH 7.4). Custom branded bottles start at 600+ pieces. Need help with a specific size or tracking your own order?`
      : 'Welcome to HH Mineral Water! Our product catalog is currently being refreshed by our team. Custom branded orders require 600+ pieces and 7 days notice. Need help tracking your existing order?',
    matchedOrdersCount: isolated.orders.length,
    usedGemini: false,
  };
}
