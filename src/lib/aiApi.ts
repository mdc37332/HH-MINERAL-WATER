import { safeStorage } from './storage';
import { auth } from './firebase';

export interface AiCommandCenterState {
  masterConfig: {
    status: 'RUNNING' | 'PAUSED' | 'STOPPED';
    maxTaskExecutionMs: number;
    maxRetries: number;
    maxDelegationDepth: number;
    dailyTokenBudget: number;
    emergencyStopReason?: string;
    updatedAt: string;
    updatedBy: string;
  };
  agents: Array<{
    id: string;
    code: string;
    name: string;
    role: string;
    status: 'ACTIVE' | 'PAUSED' | 'STOPPED' | 'ERROR';
    autonomyLevel: string;
    permissions: {
      autoAllowedTools: string[];
      approvalRequiredActions: string[];
      description: string;
    };
    tasksCompleted: number;
    tasksFailed: number;
    lastRunAt?: string | null;
    lastSummary?: string | null;
  }>;
  tasks: Array<{
    id: string;
    agentId: string;
    agentName: string;
    eventSource: string;
    taskDescription: string;
    executionPlan: {
      steps: string[];
      cycle?: Record<string, any>;
    };
    authorizationLevel: 'AUTO_LEVEL_3' | 'OWNER_APPROVAL_REQUIRED';
    status: 'PENDING' | 'RUNNING' | 'COMPLETED' | 'AWAITING_APPROVAL' | 'FAILED' | 'DEAD_LETTER';
    retryCount: number;
    maxRetries: number;
    startedAt: string;
    completedAt?: string | null;
    executionResult?: any;
    errorInfo?: string | null;
    verificationStatus: string;
    toolCalls?: Array<{ tool: string; status: string; summary: string; timestamp: string }>;
    tokensUsed: number;
    createdAt: string;
  }>;
  approvals: Array<{
    id: string;
    taskId?: string | null;
    agentId: string;
    agentName: string;
    actionType: string;
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
  }>;
  memory: Array<{
    id: string;
    memoryKey: string;
    category: string;
    sourceType: 'VERIFIED_FACT' | 'OWNER_RULE' | 'AI_PREDICTION';
    title: string;
    content: any;
    editableByOwner: boolean;
    confidence: number;
    updatedBy: string;
    updatedAt: string;
  }>;
  schedules: Array<{
    id: string;
    name: string;
    cadence: 'CONTINUOUS' | 'DAILY' | 'WEEKLY' | 'MONTHLY';
    timezone: string;
    agentId: string;
    enabled: boolean;
    intervalMinutes: number;
    lastRunAt?: string | null;
    nextRunAt?: string | null;
    lastStatus: string;
    lastSummary?: string | null;
  }>;
  events: Array<{
    id: string;
    eventType: string;
    severity: 'INFO' | 'WARNING' | 'CRITICAL';
    source: string;
    summary: string;
    details?: any;
    resolved: boolean;
    tokensUsed: number;
    createdAt: string;
  }>;
  crossAgentMessages?: Array<{
    id: string;
    correlationId: string;
    taskId?: string | null;
    fromAgentId: string;
    fromAgentName: string;
    toAgentId: string;
    toAgentName: string;
    intent:
      | 'HANDOFF'
      | 'DATA_REQUEST'
      | 'VERIFICATION_REPORT'
      | 'RISK_ALERT'
      | 'APPROVAL_ESCALATION'
      | 'RECOVERY_NOTICE';
    subject: string;
    payload: Record<string, any>;
    status: 'PENDING' | 'DELIVERED' | 'ACKNOWLEDGED' | 'RESOLVED';
    priority: 'LOW' | 'NORMAL' | 'HIGH' | 'CRITICAL';
    firestoreSynced: boolean;
    createdAt: string;
  }>;
  usage: {
    tokensToday: number;
    callsToday: number;
    dailyBudget: number;
    estimatedUsdToday: number;
  };
  integrations: {
    gemini: {
      provider: string;
      model: string;
      configured: boolean;
      status: 'CONNECTED' | 'CONFIG_REQUIRED';
      message: string;
    };
    postgresql: { status: string; database: string };
    firestore?: {
      projectId: string;
      databaseId: string;
      mode: 'ADMIN_SDK_CONNECTED' | 'CLIENT_REALTIME_SYNC';
      status: 'CONNECTED' | 'SYNC_READY';
      detail: string;
      lastSyncAt?: string | null;
    };
    whatsappCloudApi: { status: string; detail: string };
    smtpEmail: { status: string; detail: string };
  };
}

function getAdminHeaders(adminToken?: string | null): Record<string, string> {
  const token =
    adminToken ||
    (typeof window !== 'undefined'
      ? safeStorage.getItem('hh_admin_session_token_v2') ||
        (typeof sessionStorage !== 'undefined' ? sessionStorage.getItem('hh_admin_session_token') : null)
      : null);

  return {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

async function parseJsonOrThrow(res: Response) {
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data?.error || `Request failed (${res.status})`);
  }
  return data;
}

export async function fetchAiCommandCenterStateApi(adminToken?: string | null): Promise<AiCommandCenterState> {
  const res = await fetch('/api/ai/command-center/state', {
    headers: getAdminHeaders(adminToken),
  });
  return parseJsonOrThrow(res);
}

export async function controlMasterAiApi(
  action: 'START' | 'PAUSE' | 'RESUME' | 'STOP',
  reason?: string,
  adminToken?: string | null
) {
  const res = await fetch('/api/ai/master/control', {
    method: 'POST',
    headers: getAdminHeaders(adminToken),
    body: JSON.stringify({ action, reason }),
  });
  return parseJsonOrThrow(res);
}

export async function controlAiAgentApi(
  agentId: string,
  action: 'START' | 'PAUSE' | 'STOP' | 'RUN_NOW',
  adminToken?: string | null
) {
  const res = await fetch(`/api/ai/agents/${encodeURIComponent(agentId)}/control`, {
    method: 'POST',
    headers: getAdminHeaders(adminToken),
    body: JSON.stringify({ action }),
  });
  return parseJsonOrThrow(res);
}

export async function sendOwnerCommandToOrchestratorApi(
  command: string,
  adminToken?: string | null
) {
  const res = await fetch('/api/ai/orchestrator/command', {
    method: 'POST',
    headers: getAdminHeaders(adminToken),
    body: JSON.stringify({ command }),
  });
  return parseJsonOrThrow(res);
}

export async function retryAiTaskApi(taskId: string, adminToken?: string | null) {
  const res = await fetch(`/api/ai/tasks/${encodeURIComponent(taskId)}/retry`, {
    method: 'POST',
    headers: getAdminHeaders(adminToken),
  });
  return parseJsonOrThrow(res);
}

export async function decideAiApprovalApi(
  approvalId: string,
  decision: 'APPROVED' | 'REJECTED',
  decisionNote?: string,
  adminToken?: string | null
) {
  const res = await fetch(`/api/ai/approvals/${encodeURIComponent(approvalId)}/decide`, {
    method: 'POST',
    headers: getAdminHeaders(adminToken),
    body: JSON.stringify({ decision, decisionNote }),
  });
  return parseJsonOrThrow(res);
}

export async function saveAiMemoryApi(
  payload: {
    id?: string;
    memoryKey: string;
    category: string;
    sourceType: string;
    title: string;
    content: any;
    confidence?: number;
  },
  adminToken?: string | null
) {
  const res = await fetch('/api/ai/memory', {
    method: 'POST',
    headers: getAdminHeaders(adminToken),
    body: JSON.stringify(payload),
  });
  return parseJsonOrThrow(res);
}

export async function deleteAiMemoryApi(id: string, adminToken?: string | null) {
  const res = await fetch(`/api/ai/memory/${encodeURIComponent(id)}`, {
    method: 'DELETE',
    headers: getAdminHeaders(adminToken),
  });
  return parseJsonOrThrow(res);
}

export async function toggleAiScheduleApi(id: string, enabled: boolean, adminToken?: string | null) {
  const res = await fetch(`/api/ai/schedules/${encodeURIComponent(id)}/toggle`, {
    method: 'POST',
    headers: getAdminHeaders(adminToken),
    body: JSON.stringify({ enabled }),
  });
  return parseJsonOrThrow(res);
}

export async function runAiScheduleNowApi(id: string, adminToken?: string | null) {
  const res = await fetch(`/api/ai/schedules/${encodeURIComponent(id)}/run`, {
    method: 'POST',
    headers: getAdminHeaders(adminToken),
  });
  return parseJsonOrThrow(res);
}

export async function triggerRecoverySweepApi(adminToken?: string | null) {
  const res = await fetch('/api/ai/recovery/sweep', {
    method: 'POST',
    headers: getAdminHeaders(adminToken),
  });
  return parseJsonOrThrow(res);
}

export async function dispatchAiBusinessEventApi(
  eventType:
    | 'ORDER_PLACED'
    | 'ORDER_STATUS_CHANGED'
    | 'CUSTOM_DESIGN_SUBMITTED'
    | 'LOW_STOCK_DETECTED'
    | 'SECURITY_ALERT'
    | 'API_FAILURE'
    | 'DAILY_EXECUTIVE_BRIEFING',
  payload?: Record<string, any>,
  adminToken?: string | null
) {
  const res = await fetch('/api/ai/events/dispatch', {
    method: 'POST',
    headers: getAdminHeaders(adminToken),
    body: JSON.stringify({ eventType, payload: payload || {} }),
  });
  return parseJsonOrThrow(res);
}

export async function acknowledgeCrossAgentMessageApi(
  id: string,
  status: 'ACKNOWLEDGED' | 'RESOLVED' = 'ACKNOWLEDGED',
  adminToken?: string | null
) {
  const res = await fetch(`/api/ai/cross-agent/messages/${encodeURIComponent(id)}/acknowledge`, {
    method: 'POST',
    headers: getAdminHeaders(adminToken),
    body: JSON.stringify({ status }),
  });
  return parseJsonOrThrow(res);
}

export async function sendCustomerSupportAiQueryApi(params: {
  message: string;
  orderId?: string;
  phone?: string;
}): Promise<{ success: boolean; reply: string; matchedOrdersCount: number; usedGemini: boolean }> {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (auth.currentUser) {
    try {
      const idToken = await auth.currentUser.getIdToken();
      headers.Authorization = `Bearer ${idToken}`;
    } catch {}
  }
  const res = await fetch('/api/ai/customer-support', {
    method: 'POST',
    headers,
    body: JSON.stringify(params),
  });
  return parseJsonOrThrow(res);
}
