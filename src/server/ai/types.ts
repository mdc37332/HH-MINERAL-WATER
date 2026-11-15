export type AgentId =
  | 'AGENT_00_ORCHESTRATOR'
  | 'AGENT_01_CEO'
  | 'AGENT_02_ORDER'
  | 'AGENT_03_SUPPORT'
  | 'AGENT_04_INVENTORY'
  | 'AGENT_05_FINANCE'
  | 'AGENT_06_WHATSAPP'
  | 'AGENT_07_MARKETING'
  | 'AGENT_08_SECURITY'
  | 'AGENT_09_RECOVERY'
  | 'AGENT_10_REPORTING';

export type MasterAiStatus = 'RUNNING' | 'PAUSED' | 'STOPPED';
export type AgentStatus = 'ACTIVE' | 'PAUSED' | 'STOPPED' | 'ERROR';
export type AuthorizationLevel = 'AUTO_LEVEL_3' | 'OWNER_APPROVAL_REQUIRED';
export type TaskStatus =
  | 'PENDING'
  | 'RUNNING'
  | 'COMPLETED'
  | 'AWAITING_APPROVAL'
  | 'FAILED'
  | 'DEAD_LETTER';
export type VerificationStatus = 'PENDING' | 'VERIFIED' | 'UNVERIFIED' | 'FAILED';

export type ApprovalActionType =
  | 'CHANGE_PRODUCT_PRICE'
  | 'CHANGE_DISCOUNT'
  | 'ISSUE_REFUND'
  | 'CANCEL_INVOICE'
  | 'CHANGE_GST_CONFIG'
  | 'ADJUST_INVENTORY_MAJOR'
  | 'DELETE_PRODUCT'
  | 'SUSPEND_CUSTOMER'
  | 'PUBLISH_MARKETING'
  | 'BULK_WHATSAPP_CAMPAIGN'
  | 'RESTOCK_PURCHASE_ORDER'
  | 'OTHER_SENSITIVE_ACTION';

export interface OperatingCycleTrace {
  observe: string;
  understand: string;
  analyze: string;
  plan: string[];
  checkPermissions: string;
  execute: string;
  verify: string;
  record: string;
  report: string;
}

export interface AgentPermissionsConfig {
  autoAllowedTools: string[];
  approvalRequiredActions: ApprovalActionType[];
  description: string;
}

export interface AiAgentRecord {
  id: AgentId;
  code: string;
  name: string;
  role: string;
  status: AgentStatus;
  autonomyLevel: string;
  permissions: AgentPermissionsConfig;
  tasksCompleted: number;
  tasksFailed: number;
  lastRunAt?: string | null;
  lastSummary?: string | null;
  updatedAt?: string | null;
}

export interface AiTaskRecord {
  id: string;
  agentId: AgentId;
  agentName: string;
  eventSource: string;
  idempotencyKey?: string | null;
  taskDescription: string;
  executionPlan: {
    steps: string[];
    cycle?: Partial<OperatingCycleTrace>;
    delegationDepth?: number;
  };
  authorizationLevel: AuthorizationLevel;
  status: TaskStatus;
  retryCount: number;
  maxRetries: number;
  nextRetryAt?: string | null;
  startedAt: string;
  completedAt?: string | null;
  executionResult?: any;
  errorInfo?: string | null;
  verificationStatus: VerificationStatus;
  toolCalls?: Array<{ tool: string; status: string; summary: string; timestamp: string }>;
  tokensUsed: number;
  createdAt: string;
}

export interface AiApprovalRecord {
  id: string;
  taskId?: string | null;
  agentId: AgentId;
  agentName: string;
  actionType: ApprovalActionType;
  title: string;
  reason: string;
  expectedImpact: string;
  proposedPayload: Record<string, any>;
  status: 'PENDING' | 'APPROVED' | 'REJECTED' | 'EXECUTED';
  ownerEmail?: string | null;
  decisionNote?: string | null;
  decidedAt?: string | null;
  executedAt?: string | null;
  executionResult?: any;
  createdAt: string;
}

export interface AiMemoryRecord {
  id: string;
  memoryKey: string;
  category:
    | 'BUSINESS_RULE'
    | 'PRODUCT_INFO'
    | 'PRICING_CONFIG'
    | 'INVENTORY_THRESHOLD'
    | 'ORDER_WORKFLOW'
    | 'OWNER_PREFERENCE'
    | 'APPROVED_DECISION'
    | 'EXECUTION_FACT'
    | 'ERROR_RECOVERY'
    | 'AI_PREDICTION';
  sourceType: 'VERIFIED_FACT' | 'OWNER_RULE' | 'AI_PREDICTION';
  title: string;
  content: any;
  editableByOwner: boolean;
  confidence: number;
  updatedBy: string;
  updatedAt: string;
  createdAt: string;
}

export interface AiScheduleRecord {
  id: string;
  name: string;
  cadence: 'CONTINUOUS' | 'DAILY' | 'WEEKLY' | 'MONTHLY';
  timezone: string;
  agentId: AgentId;
  enabled: boolean;
  intervalMinutes: number;
  lastRunAt?: string | null;
  nextRunAt?: string | null;
  lastStatus: string;
  lastSummary?: string | null;
  createdAt: string;
}

export interface AiSystemEventRecord {
  id: string;
  eventType: string;
  severity: 'INFO' | 'WARNING' | 'CRITICAL';
  source: string;
  summary: string;
  details?: any;
  resolved: boolean;
  tokensUsed: number;
  createdAt: string;
}

export interface MasterAiConfig {
  status: MasterAiStatus;
  maxTaskExecutionMs: number;
  maxRetries: number;
  maxDelegationDepth: number;
  dailyTokenBudget: number;
  emergencyStopReason?: string;
  updatedAt: string;
  updatedBy: string;
}

export type CrossAgentMessageIntent =
  | 'HANDOFF'
  | 'DATA_REQUEST'
  | 'VERIFICATION_REPORT'
  | 'RISK_ALERT'
  | 'APPROVAL_ESCALATION'
  | 'RECOVERY_NOTICE';

export type BusinessEventType =
  | 'ORDER_PLACED'
  | 'ORDER_STATUS_CHANGED'
  | 'CUSTOM_DESIGN_SUBMITTED'
  | 'LOW_STOCK_DETECTED'
  | 'SECURITY_ALERT'
  | 'API_FAILURE'
  | 'DAILY_EXECUTIVE_BRIEFING';

export interface AiAgentMessageRecord {
  id: string;
  correlationId: string;
  taskId?: string | null;
  fromAgentId: AgentId;
  fromAgentName: string;
  toAgentId: AgentId;
  toAgentName: string;
  intent: CrossAgentMessageIntent;
  subject: string;
  payload: Record<string, any>;
  status: 'PENDING' | 'DELIVERED' | 'ACKNOWLEDGED' | 'RESOLVED';
  priority: 'LOW' | 'NORMAL' | 'HIGH' | 'CRITICAL';
  firestoreSynced: boolean;
  createdAt: string;
}

export interface FirestoreBridgeStatus {
  projectId: string;
  databaseId: string;
  mode: 'ADMIN_SDK_CONNECTED' | 'CLIENT_REALTIME_SYNC';
  status: 'CONNECTED' | 'SYNC_READY';
  detail: string;
  lastSyncAt?: string | null;
}

