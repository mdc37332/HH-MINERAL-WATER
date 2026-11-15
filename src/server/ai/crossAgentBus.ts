import {
  getAiAgentById,
  getMasterAiConfig,
  insertCrossAgentMessage,
  markCrossAgentMessagesFirestoreSynced,
  recordAgentTaskMetric,
  recordAiSystemEvent,
} from '../../db/aiQueries.ts';
import { getAgentMetadata, isToolAutoAllowedForAgent } from './agentRegistry.ts';
import { mirrorCrossAgentMessageToFirestore } from './firestoreBridge.ts';
import { sanitizeUntrustedText } from './memoryService.ts';
import type {
  AgentId,
  AiAgentMessageRecord,
  CrossAgentMessageIntent,
} from './types.ts';

export interface SendCrossAgentMessageInput {
  correlationId: string;
  taskId?: string | null;
  fromAgentId: AgentId;
  toAgentId: AgentId;
  intent: CrossAgentMessageIntent;
  subject: string;
  payload?: Record<string, any>;
  priority?: 'LOW' | 'NORMAL' | 'HIGH' | 'CRITICAL';
}

export function createCorrelationId(prefix = 'CORR'): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 6).toUpperCase()}`;
}

/**
 * Persists a structured Cross-Agent Message into Cloud SQL ai_agent_messages
 * and mirrors to Firestore when Admin Firestore credentials are available.
 */
export async function sendCrossAgentMessage(
  input: SendCrossAgentMessageInput
): Promise<AiAgentMessageRecord> {
  const fromMeta = getAgentMetadata(input.fromAgentId);
  const toMeta = getAgentMetadata(input.toAgentId);
  const msgId = `MSG-${Date.now()}-${Math.random().toString(36).slice(2, 6).toUpperCase()}`;

  const saved = await insertCrossAgentMessage({
    id: msgId,
    correlationId: input.correlationId,
    taskId: input.taskId || null,
    fromAgentId: input.fromAgentId,
    fromAgentName: fromMeta.name,
    toAgentId: input.toAgentId,
    toAgentName: toMeta.name,
    intent: input.intent,
    subject: sanitizeUntrustedText(input.subject, 240),
    payload: input.payload || {},
    status: 'DELIVERED',
    priority: input.priority || 'NORMAL',
    firestoreSynced: false,
  });

  const synced = await mirrorCrossAgentMessageToFirestore(saved).catch(() => false);
  if (synced) {
    await markCrossAgentMessagesFirestoreSynced([saved.id]).catch(() => {});
    saved.firestoreSynced = true;
  }

  return saved;
}

export interface ToolRunnerFn {
  (
    toolName: string,
    args: Record<string, any>,
    ctx: { agentId: AgentId; agentName: string; taskId?: string; depth?: number; correlationId?: string }
  ): Promise<{ ok: boolean; data: any; summary: string }>;
}

/**
 * Coordinates a Cross-Agent Handoff & Tool Execution with:
 * - Master AI RUNNING check & Target Agent ACTIVE check
 * - Delegation depth guard (maxDelegationDepth from MasterAiConfig)
 * - Specialist chartered permission check (`isToolAutoAllowedForAgent`)
 * - Bidirectional HANDOFF -> VERIFICATION_REPORT persistence in Cloud SQL + Firestore
 */
export async function coordinateCrossAgentHandoff(params: {
  fromAgentId: AgentId;
  toAgentId: AgentId;
  correlationId: string;
  taskId?: string | null;
  reason: string;
  toolName: string;
  toolArgs?: Record<string, any>;
  depth?: number;
  priority?: 'LOW' | 'NORMAL' | 'HIGH' | 'CRITICAL';
  runTool: ToolRunnerFn;
}): Promise<{
  ok: boolean;
  blockedReason?: string;
  handoffMessage: AiAgentMessageRecord;
  replyMessage?: AiAgentMessageRecord;
  toolResult?: { ok: boolean; data: any; summary: string };
}> {
  const depth = params.depth ?? 1;
  const master = await getMasterAiConfig();
  const maxDepth = master.maxDelegationDepth || 4;
  const fromMeta = getAgentMetadata(params.fromAgentId);
  const toMeta = getAgentMetadata(params.toAgentId);

  const handoffMessage = await sendCrossAgentMessage({
    correlationId: params.correlationId,
    taskId: params.taskId,
    fromAgentId: params.fromAgentId,
    toAgentId: params.toAgentId,
    intent: 'HANDOFF',
    subject: `${fromMeta.code} → ${toMeta.code}: ${params.reason}`,
    payload: {
      toolRequested: params.toolName,
      toolArgs: params.toolArgs || {},
      delegationDepth: depth,
    },
    priority: params.priority || 'NORMAL',
  });

  if (depth > maxDepth) {
    const blockedReason = `Delegation depth ${depth} exceeded maxDelegationDepth (${maxDepth}).`;
    const replyMessage = await sendCrossAgentMessage({
      correlationId: params.correlationId,
      taskId: params.taskId,
      fromAgentId: params.toAgentId,
      toAgentId: params.fromAgentId,
      intent: 'RISK_ALERT',
      subject: `Delegation blocked (depth guard): ${params.toolName}`,
      payload: { blockedReason },
      priority: 'HIGH',
    });
    return { ok: false, blockedReason, handoffMessage, replyMessage };
  }

  const targetAgentRow = await getAiAgentById(params.toAgentId).catch(() => null);
  if (targetAgentRow && targetAgentRow.status !== 'ACTIVE') {
    const blockedReason = `${toMeta.name} (${toMeta.code}) is currently ${targetAgentRow.status}.`;
    const replyMessage = await sendCrossAgentMessage({
      correlationId: params.correlationId,
      taskId: params.taskId,
      fromAgentId: params.toAgentId,
      toAgentId: params.fromAgentId,
      intent: 'RECOVERY_NOTICE',
      subject: `${toMeta.code} unavailable (${targetAgentRow.status})`,
      payload: { blockedReason },
      priority: 'HIGH',
    });
    return { ok: false, blockedReason, handoffMessage, replyMessage };
  }

  if (!isToolAutoAllowedForAgent(params.toAgentId, params.toolName)) {
    const blockedReason = `Tool "${params.toolName}" is outside ${toMeta.name}'s authorized Level 3 charter.`;
    await recordAiSystemEvent({
      eventType: 'AGENT_PERMISSION_DENIED',
      severity: 'WARNING',
      source: params.fromAgentId,
      summary: blockedReason,
      details: { targetAgent: params.toAgentId, toolName: params.toolName },
      resolved: false,
      tokensUsed: 0,
    }).catch(() => {});
    const replyMessage = await sendCrossAgentMessage({
      correlationId: params.correlationId,
      taskId: params.taskId,
      fromAgentId: params.toAgentId,
      toAgentId: params.fromAgentId,
      intent: 'RISK_ALERT',
      subject: `Permission Denied: ${params.toolName}`,
      payload: { blockedReason },
      priority: 'HIGH',
    });
    return { ok: false, blockedReason, handoffMessage, replyMessage };
  }

  const toolResult = await params.runTool(params.toolName, params.toolArgs || {}, {
    agentId: params.toAgentId,
    agentName: toMeta.name,
    taskId: params.taskId || undefined,
    depth,
    correlationId: params.correlationId,
  });

  await recordAgentTaskMetric(params.toAgentId, toolResult.ok, toolResult.summary).catch(() => {});

  const replyMessage = await sendCrossAgentMessage({
    correlationId: params.correlationId,
    taskId: params.taskId,
    fromAgentId: params.toAgentId,
    toAgentId: params.fromAgentId,
    intent: toolResult.ok ? 'VERIFICATION_REPORT' : 'RISK_ALERT',
    subject: `${toMeta.code} → ${fromMeta.code}: ${toolResult.summary}`,
    payload: {
      toolExecuted: params.toolName,
      ok: toolResult.ok,
      summary: toolResult.summary,
      dataSnapshot: toolResult.data,
    },
    priority: toolResult.ok ? (params.priority || 'NORMAL') : 'HIGH',
  });

  return {
    ok: toolResult.ok,
    handoffMessage,
    replyMessage,
    toolResult,
  };
}
