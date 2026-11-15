import type { AgentId, AiAgentRecord } from './types.ts';
import { getAllAiAgents, upsertAiAgent } from '../../db/aiQueries.ts';

export const SPECIALIST_AGENTS_SEED: AiAgentRecord[] = [
  {
    id: 'AGENT_00_ORCHESTRATOR',
    code: 'ORCH-00',
    name: 'Master AI Orchestrator',
    role: 'Central intelligence & delegation engine coordinating all 10 specialist agents under Level 3 Controlled Autonomy.',
    status: 'ACTIVE',
    autonomyLevel: 'LEVEL_3_MAX_CONTROLLED',
    permissions: {
      description: 'Interprets events & owner commands, selects specialist agents, checks authorization boundaries, executes & verifies tools.',
      autoAllowedTools: [
        'get_orders_snapshot',
        'get_inventory_health',
        'get_financial_and_invoice_summary',
        'get_failed_notifications',
        'get_system_health_and_errors',
        'generate_business_report',
        'prepare_marketing_draft',
        'validate_custom_design_order',
        'get_what_needs_attention',
        'auto_generate_missing_invoices',
        'retry_failed_whatsapp_alert',
        'run_security_audit_scan',
        'run_error_recovery_sweep',
        'delegate_to_specialist_agent',
        'get_cross_agent_messages',
        'propose_owner_approval',
      ],
      approvalRequiredActions: [
        'CHANGE_PRODUCT_PRICE',
        'CHANGE_DISCOUNT',
        'ISSUE_REFUND',
        'CANCEL_INVOICE',
        'CHANGE_GST_CONFIG',
        'ADJUST_INVENTORY_MAJOR',
        'DELETE_PRODUCT',
        'SUSPEND_CUSTOMER',
        'PUBLISH_MARKETING',
        'BULK_WHATSAPP_CAMPAIGN',
        'RESTOCK_PURCHASE_ORDER',
      ],
    },
    tasksCompleted: 0,
    tasksFailed: 0,
  },
  {
    id: 'AGENT_01_CEO',
    code: 'CEO-01',
    name: 'AI CEO / Business Manager',
    role: 'Monitors overall business performance, prioritizes owner attention items, and coordinates specialist departments.',
    status: 'ACTIVE',
    autonomyLevel: 'LEVEL_3_MAX_CONTROLLED',
    permissions: {
      description: 'Executive monitoring, cross-department triage, owner attention summaries, and strategic recommendations.',
      autoAllowedTools: [
        'get_what_needs_attention',
        'get_orders_snapshot',
        'get_inventory_health',
        'get_financial_and_invoice_summary',
        'generate_business_report',
        'delegate_to_specialist_agent',
        'get_cross_agent_messages',
      ],
      approvalRequiredActions: ['CHANGE_PRODUCT_PRICE', 'PUBLISH_MARKETING', 'RESTOCK_PURCHASE_ORDER'],
    },
    tasksCompleted: 0,
    tasksFailed: 0,
  },
  {
    id: 'AGENT_02_ORDER',
    code: 'ORD-02',
    name: 'AI Order Manager',
    role: 'Monitors incoming & delayed orders, validates items/quantities (incl. 600-pc custom rule), checks duplicates, and syncs invoices.',
    status: 'ACTIVE',
    autonomyLevel: 'LEVEL_3_MAX_CONTROLLED',
    permissions: {
      description: 'Real-time order intake checks, duplicate protection verification, delayed dispatch detection, and 1:1 GST invoice reconciliation.',
      autoAllowedTools: ['get_orders_snapshot', 'validate_custom_design_order', 'auto_generate_missing_invoices'],
      approvalRequiredActions: ['ISSUE_REFUND', 'CANCEL_INVOICE'],
    },
    tasksCompleted: 0,
    tasksFailed: 0,
  },
  {
    id: 'AGENT_03_SUPPORT',
    code: 'SUP-03',
    name: 'AI Customer Support Manager',
    role: 'Answers product, bottle size, custom order (>=600 pcs), and authenticated customer-isolated order tracking queries.',
    status: 'ACTIVE',
    autonomyLevel: 'LEVEL_3_MAX_CONTROLLED',
    permissions: {
      description: 'Strict tenant isolation: reads public product catalog and ONLY the authenticated or verified matching customer order.',
      autoAllowedTools: ['get_customer_own_order_status'],
      approvalRequiredActions: ['ISSUE_REFUND', 'SUSPEND_CUSTOMER'],
    },
    tasksCompleted: 0,
    tasksFailed: 0,
  },
  {
    id: 'AGENT_04_INVENTORY',
    code: 'INV-04',
    name: 'AI Inventory Manager',
    role: 'Tracks bottle SKUs & raw materials, detects low/out-of-stock risks, prevents overselling, and forecasts restock needs.',
    status: 'ACTIVE',
    autonomyLevel: 'LEVEL_3_MAX_CONTROLLED',
    permissions: {
      description: 'Monitors PostgreSQL stock levels & thresholds; proposes restock purchase orders for Owner approval without auto-purchasing.',
      autoAllowedTools: ['get_inventory_health', 'propose_owner_approval'],
      approvalRequiredActions: ['ADJUST_INVENTORY_MAJOR', 'RESTOCK_PURCHASE_ORDER', 'DELETE_PRODUCT'],
    },
    tasksCompleted: 0,
    tasksFailed: 0,
  },
  {
    id: 'AGENT_05_FINANCE',
    code: 'FIN-05',
    name: 'AI Finance Manager',
    role: 'Monitors verified vs COD pending payments, GST calculations, invoice completeness, and detects billing discrepancies.',
    status: 'ACTIVE',
    autonomyLevel: 'LEVEL_3_MAX_CONTROLLED',
    permissions: {
      description: 'Audits revenue, GST totals, missing invoices, and financial variances; never issues refunds or changes tax settings autonomously.',
      autoAllowedTools: ['get_financial_and_invoice_summary', 'auto_generate_missing_invoices', 'propose_owner_approval'],
      approvalRequiredActions: ['ISSUE_REFUND', 'CANCEL_INVOICE', 'CHANGE_GST_CONFIG', 'CHANGE_DISCOUNT', 'CHANGE_PRODUCT_PRICE'],
    },
    tasksCompleted: 0,
    tasksFailed: 0,
  },
  {
    id: 'AGENT_06_WHATSAPP',
    code: 'WSP-06',
    name: 'AI WhatsApp Manager',
    role: 'Monitors WhatsApp & email order alerts, dispatches authorized notifications, and safely retries failed alerts.',
    status: 'ACTIVE',
    autonomyLevel: 'LEVEL_3_MAX_CONTROLLED',
    permissions: {
      description: 'Audits pending/failed Meta Cloud API alerts and retries cleanly with cap protection. Requires approval for bulk blasts.',
      autoAllowedTools: ['get_failed_notifications', 'retry_failed_whatsapp_alert', 'propose_owner_approval'],
      approvalRequiredActions: ['BULK_WHATSAPP_CAMPAIGN'],
    },
    tasksCompleted: 0,
    tasksFailed: 0,
  },
  {
    id: 'AGENT_07_MARKETING',
    code: 'MKT-07',
    name: 'AI Marketing Manager',
    role: 'Analyzes top SKUs and prepares ad copy, WhatsApp promos, and event campaign drafts (Approval required before publishing).',
    status: 'ACTIVE',
    autonomyLevel: 'LEVEL_3_MAX_CONTROLLED',
    permissions: {
      description: 'Generates data-backed campaign drafts and social captions; strictly creates Owner Approval Requests before publishing or discounting.',
      autoAllowedTools: ['prepare_marketing_draft', 'get_orders_snapshot', 'propose_owner_approval'],
      approvalRequiredActions: ['PUBLISH_MARKETING', 'CHANGE_DISCOUNT', 'BULK_WHATSAPP_CAMPAIGN'],
    },
    tasksCompleted: 0,
    tasksFailed: 0,
  },
  {
    id: 'AGENT_08_SECURITY',
    code: 'SEC-08',
    name: 'AI Security Manager',
    role: 'Monitors admin sessions, failed logins, API anomalies, and verifies single-owner access integrity.',
    status: 'ACTIVE',
    autonomyLevel: 'LEVEL_3_MAX_CONTROLLED',
    permissions: {
      description: 'Continuously inspects security audit events and flags suspicious requests; never mutates auth rules or owner email autonomously.',
      autoAllowedTools: ['run_security_audit_scan', 'get_system_health_and_errors'],
      approvalRequiredActions: ['SUSPEND_CUSTOMER'],
    },
    tasksCompleted: 0,
    tasksFailed: 0,
  },
  {
    id: 'AGENT_09_RECOVERY',
    code: 'REC-09',
    name: 'AI System Recovery Manager',
    role: 'Monitors PostgreSQL & API health, retries recoverable failed jobs with backoff, and handles dead-letter escalation.',
    status: 'ACTIVE',
    autonomyLevel: 'LEVEL_3_MAX_CONTROLLED',
    permissions: {
      description: 'Runs periodic health probes, retries failed tasks safely without duplicating orders, and alerts Owner on unresolved critical failures.',
      autoAllowedTools: ['get_system_health_and_errors', 'run_error_recovery_sweep', 'auto_generate_missing_invoices'],
      approvalRequiredActions: ['OTHER_SENSITIVE_ACTION'],
    },
    tasksCompleted: 0,
    tasksFailed: 0,
  },
  {
    id: 'AGENT_10_REPORTING',
    code: 'RPT-10',
    name: 'AI Reporting Manager',
    role: 'Produces Daily, Weekly, and Monthly sales, GST, inventory, and agent performance reports in Asia/Kolkata timezone.',
    status: 'ACTIVE',
    autonomyLevel: 'LEVEL_3_MAX_CONTROLLED',
    permissions: {
      description: 'Aggregates live Cloud SQL order, revenue, invoice, and stock analytics for scheduled and on-demand executive reports.',
      autoAllowedTools: ['generate_business_report', 'get_orders_snapshot', 'get_financial_and_invoice_summary', 'get_inventory_health'],
      approvalRequiredActions: [],
    },
    tasksCompleted: 0,
    tasksFailed: 0,
  },
];

let agentsBootstrapped = false;

export async function ensureAgentsSeeded(): Promise<AiAgentRecord[]> {
  if (!agentsBootstrapped) {
    for (const agent of SPECIALIST_AGENTS_SEED) {
      await upsertAiAgent(agent);
    }
    agentsBootstrapped = true;
  }
  return getAllAiAgents();
}

export function getAgentMetadata(agentId: AgentId): AiAgentRecord {
  return (
    SPECIALIST_AGENTS_SEED.find(a => a.id === agentId) ||
    SPECIALIST_AGENTS_SEED[0]
  );
}

export function isToolAutoAllowedForAgent(agentId: AgentId, toolName: string): boolean {
  if (agentId === 'AGENT_00_ORCHESTRATOR') {
    return SPECIALIST_AGENTS_SEED[0].permissions.autoAllowedTools.includes(toolName);
  }
  const meta = SPECIALIST_AGENTS_SEED.find(a => a.id === agentId);
  return Boolean(meta?.permissions.autoAllowedTools.includes(toolName));
}
