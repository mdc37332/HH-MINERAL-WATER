import { db, createPool } from './index.ts';
import {
  aiAgents,
  aiTasks,
  aiApprovals,
  aiMemory,
  aiSchedules,
  aiSystemEvents,
  aiAgentMessages,
  storeSettings,
} from './schema.ts';
import { desc, eq, asc, and, sql, inArray } from 'drizzle-orm';
import type {
  AgentId,
  AgentStatus,
  AiAgentMessageRecord,
  AiAgentRecord,
  AiApprovalRecord,
  AiMemoryRecord,
  AiScheduleRecord,
  AiSystemEventRecord,
  AiTaskRecord,
  MasterAiConfig,
  MasterAiStatus,
} from '../server/ai/types.ts';

const MASTER_AI_CONFIG_KEY = 'ai_master_control';

export const DEFAULT_MASTER_AI_CONFIG: MasterAiConfig = {
  status: 'RUNNING',
  maxTaskExecutionMs: 25000,
  maxRetries: 3,
  maxDelegationDepth: 4,
  dailyTokenBudget: 500000,
  updatedAt: new Date().toISOString(),
  updatedBy: 'mdhussain170707@gmail.com',
};

export async function getMasterAiConfig(): Promise<MasterAiConfig> {
  try {
    const rows = await db
      .select()
      .from(storeSettings)
      .where(eq(storeSettings.key, MASTER_AI_CONFIG_KEY));
    if (rows.length > 0 && rows[0].value && typeof rows[0].value === 'object') {
      return {
        ...DEFAULT_MASTER_AI_CONFIG,
        ...(rows[0].value as Partial<MasterAiConfig>),
      };
    }
    await saveMasterAiConfig(DEFAULT_MASTER_AI_CONFIG);
    return DEFAULT_MASTER_AI_CONFIG;
  } catch (err) {
    console.warn('getMasterAiConfig fallback:', err);
    return DEFAULT_MASTER_AI_CONFIG;
  }
}

export async function saveMasterAiConfig(
  config: MasterAiConfig
): Promise<MasterAiConfig> {
  const normalized: MasterAiConfig = {
    ...DEFAULT_MASTER_AI_CONFIG,
    ...config,
    updatedAt: new Date().toISOString(),
  };
  await db
    .insert(storeSettings)
    .values({
      key: MASTER_AI_CONFIG_KEY,
      value: normalized,
    })
    .onConflictDoUpdate({
      target: storeSettings.key,
      set: {
        value: normalized,
        updatedAt: new Date(),
      },
    });
  return normalized;
}

export async function setMasterAiStatus(
  status: MasterAiStatus,
  updatedBy: string,
  reason?: string
): Promise<MasterAiConfig> {
  const current = await getMasterAiConfig();
  const next: MasterAiConfig = {
    ...current,
    status,
    emergencyStopReason: status === 'STOPPED' ? reason || 'Stopped by Owner Admin' : undefined,
    updatedBy,
    updatedAt: new Date().toISOString(),
  };
  return saveMasterAiConfig(next);
}

// ============================================================================
// AI AGENTS QUERIES
// ============================================================================

export async function getAllAiAgents(): Promise<AiAgentRecord[]> {
  const rows = await db.select().from(aiAgents).orderBy(asc(aiAgents.code));
  return rows.map(r => ({
    id: r.id as AgentId,
    code: r.code,
    name: r.name,
    role: r.role,
    status: r.status as AgentStatus,
    autonomyLevel: r.autonomyLevel,
    permissions: r.permissions as any,
    tasksCompleted: r.tasksCompleted,
    tasksFailed: r.tasksFailed,
    lastRunAt: r.lastRunAt ? r.lastRunAt.toISOString() : null,
    lastSummary: r.lastSummary,
    updatedAt: r.updatedAt ? r.updatedAt.toISOString() : null,
  }));
}

export async function getAiAgentById(id: string): Promise<AiAgentRecord | null> {
  const rows = await db.select().from(aiAgents).where(eq(aiAgents.id, id));
  if (rows.length === 0) return null;
  const r = rows[0];
  return {
    id: r.id as AgentId,
    code: r.code,
    name: r.name,
    role: r.role,
    status: r.status as AgentStatus,
    autonomyLevel: r.autonomyLevel,
    permissions: r.permissions as any,
    tasksCompleted: r.tasksCompleted,
    tasksFailed: r.tasksFailed,
    lastRunAt: r.lastRunAt ? r.lastRunAt.toISOString() : null,
    lastSummary: r.lastSummary,
    updatedAt: r.updatedAt ? r.updatedAt.toISOString() : null,
  };
}

export async function upsertAiAgent(agent: AiAgentRecord): Promise<void> {
  await db
    .insert(aiAgents)
    .values({
      id: agent.id,
      code: agent.code,
      name: agent.name,
      role: agent.role,
      status: agent.status,
      autonomyLevel: agent.autonomyLevel,
      permissions: agent.permissions,
      tasksCompleted: agent.tasksCompleted,
      tasksFailed: agent.tasksFailed,
      lastRunAt: agent.lastRunAt ? new Date(agent.lastRunAt) : null,
      lastSummary: agent.lastSummary || null,
      updatedAt: new Date(),
    })
    .onConflictDoNothing({ target: aiAgents.id });
}

export async function updateAiAgentStatus(
  id: AgentId,
  status: AgentStatus
): Promise<AiAgentRecord | null> {
  const rows = await db
    .update(aiAgents)
    .set({ status, updatedAt: new Date() })
    .where(eq(aiAgents.id, id))
    .returning();
  if (rows.length === 0) return null;
  return getAiAgentById(id);
}

export async function recordAgentTaskMetric(
  id: AgentId,
  succeeded: boolean,
  summary: string
): Promise<void> {
  await db
    .update(aiAgents)
    .set({
      tasksCompleted: succeeded
        ? sql`${aiAgents.tasksCompleted} + 1`
        : aiAgents.tasksCompleted,
      tasksFailed: succeeded
        ? aiAgents.tasksFailed
        : sql`${aiAgents.tasksFailed} + 1`,
      lastRunAt: new Date(),
      lastSummary: summary.slice(0, 500),
      updatedAt: new Date(),
    })
    .where(eq(aiAgents.id, id));
}

// ============================================================================
// AI TASKS QUEUE QUERIES (WITH IDEMPOTENCY & RETRY SUPPORT)
// ============================================================================

function mapTaskRow(r: typeof aiTasks.$inferSelect): AiTaskRecord {
  return {
    id: r.id,
    agentId: r.agentId as AgentId,
    agentName: r.agentName,
    eventSource: r.eventSource,
    idempotencyKey: r.idempotencyKey,
    taskDescription: r.taskDescription,
    executionPlan: (r.executionPlan as any) || { steps: [] },
    authorizationLevel: r.authorizationLevel as any,
    status: r.status as any,
    retryCount: r.retryCount,
    maxRetries: r.maxRetries,
    nextRetryAt: r.nextRetryAt ? r.nextRetryAt.toISOString() : null,
    startedAt: r.startedAt.toISOString(),
    completedAt: r.completedAt ? r.completedAt.toISOString() : null,
    executionResult: r.executionResult,
    errorInfo: r.errorInfo,
    verificationStatus: r.verificationStatus as any,
    toolCalls: (r.toolCalls as any) || [],
    tokensUsed: r.tokensUsed,
    createdAt: r.createdAt.toISOString(),
  };
}

export async function getAiTasks(limitCount = 100): Promise<AiTaskRecord[]> {
  const rows = await db
    .select()
    .from(aiTasks)
    .orderBy(desc(aiTasks.createdAt))
    .limit(limitCount);
  return rows.map(mapTaskRow);
}

export async function getAiTaskById(id: string): Promise<AiTaskRecord | null> {
  const rows = await db.select().from(aiTasks).where(eq(aiTasks.id, id));
  return rows[0] ? mapTaskRow(rows[0]) : null;
}

export async function getAiTaskByIdempotencyKey(
  key: string
): Promise<AiTaskRecord | null> {
  if (!key) return null;
  const rows = await db
    .select()
    .from(aiTasks)
    .where(eq(aiTasks.idempotencyKey, key));
  return rows[0] ? mapTaskRow(rows[0]) : null;
}

export async function insertAiTask(task: AiTaskRecord): Promise<AiTaskRecord> {
  if (task.idempotencyKey) {
    const existing = await getAiTaskByIdempotencyKey(task.idempotencyKey);
    if (existing) {
      return existing;
    }
  }
  const rows = await db
    .insert(aiTasks)
    .values({
      id: task.id,
      agentId: task.agentId,
      agentName: task.agentName,
      eventSource: task.eventSource,
      idempotencyKey: task.idempotencyKey || null,
      taskDescription: task.taskDescription,
      executionPlan: task.executionPlan,
      authorizationLevel: task.authorizationLevel,
      status: task.status,
      retryCount: task.retryCount,
      maxRetries: task.maxRetries,
      nextRetryAt: task.nextRetryAt ? new Date(task.nextRetryAt) : null,
      startedAt: new Date(task.startedAt),
      completedAt: task.completedAt ? new Date(task.completedAt) : null,
      executionResult: task.executionResult ?? null,
      errorInfo: task.errorInfo ?? null,
      verificationStatus: task.verificationStatus,
      toolCalls: task.toolCalls ?? [],
      tokensUsed: task.tokensUsed || 0,
    })
    .returning();
  return mapTaskRow(rows[0]);
}

export async function updateAiTask(
  id: string,
  patch: Partial<Omit<AiTaskRecord, 'id' | 'createdAt'>>
): Promise<AiTaskRecord | null> {
  const setPayload: any = {};
  if (patch.status !== undefined) setPayload.status = patch.status;
  if (patch.executionPlan !== undefined) setPayload.executionPlan = patch.executionPlan;
  if (patch.retryCount !== undefined) setPayload.retryCount = patch.retryCount;
  if (patch.nextRetryAt !== undefined) {
    setPayload.nextRetryAt = patch.nextRetryAt ? new Date(patch.nextRetryAt) : null;
  }
  if (patch.completedAt !== undefined) {
    setPayload.completedAt = patch.completedAt ? new Date(patch.completedAt) : null;
  }
  if (patch.executionResult !== undefined) setPayload.executionResult = patch.executionResult;
  if (patch.errorInfo !== undefined) setPayload.errorInfo = patch.errorInfo;
  if (patch.verificationStatus !== undefined) {
    setPayload.verificationStatus = patch.verificationStatus;
  }
  if (patch.toolCalls !== undefined) setPayload.toolCalls = patch.toolCalls;
  if (patch.tokensUsed !== undefined) setPayload.tokensUsed = patch.tokensUsed;

  const rows = await db
    .update(aiTasks)
    .set(setPayload)
    .where(eq(aiTasks.id, id))
    .returning();
  return rows[0] ? mapTaskRow(rows[0]) : null;
}

export async function getRetryableFailedTasks(): Promise<AiTaskRecord[]> {
  const rows = await db
    .select()
    .from(aiTasks)
    .where(and(eq(aiTasks.status, 'FAILED')))
    .orderBy(asc(aiTasks.createdAt))
    .limit(20);
  const now = Date.now();
  return rows
    .map(mapTaskRow)
    .filter(
      t =>
        t.retryCount < t.maxRetries &&
        (!t.nextRetryAt || new Date(t.nextRetryAt).getTime() <= now)
    );
}

// ============================================================================
// OWNER APPROVAL WORKFLOW QUERIES
// ============================================================================

function mapApprovalRow(r: typeof aiApprovals.$inferSelect): AiApprovalRecord {
  return {
    id: r.id,
    taskId: r.taskId,
    agentId: r.agentId as AgentId,
    agentName: r.agentName,
    actionType: r.actionType as any,
    title: r.title,
    reason: r.reason,
    expectedImpact: r.expectedImpact,
    proposedPayload: (r.proposedPayload as any) || {},
    status: r.status as any,
    ownerEmail: r.ownerEmail,
    decisionNote: r.decisionNote,
    decidedAt: r.decidedAt ? r.decidedAt.toISOString() : null,
    executedAt: r.executedAt ? r.executedAt.toISOString() : null,
    executionResult: r.executionResult,
    createdAt: r.createdAt.toISOString(),
  };
}

export async function getAllAiApprovals(limitCount = 100): Promise<AiApprovalRecord[]> {
  const rows = await db
    .select()
    .from(aiApprovals)
    .orderBy(desc(aiApprovals.createdAt))
    .limit(limitCount);
  return rows.map(mapApprovalRow);
}

export async function getAiApprovalById(id: string): Promise<AiApprovalRecord | null> {
  const rows = await db.select().from(aiApprovals).where(eq(aiApprovals.id, id));
  return rows[0] ? mapApprovalRow(rows[0]) : null;
}

export async function insertAiApproval(
  approval: Omit<AiApprovalRecord, 'createdAt'>
): Promise<AiApprovalRecord> {
  const rows = await db
    .insert(aiApprovals)
    .values({
      id: approval.id,
      taskId: approval.taskId || null,
      agentId: approval.agentId,
      agentName: approval.agentName,
      actionType: approval.actionType,
      title: approval.title,
      reason: approval.reason,
      expectedImpact: approval.expectedImpact,
      proposedPayload: approval.proposedPayload,
      status: approval.status,
      ownerEmail: approval.ownerEmail || null,
      decisionNote: approval.decisionNote || null,
      decidedAt: approval.decidedAt ? new Date(approval.decidedAt) : null,
      executedAt: approval.executedAt ? new Date(approval.executedAt) : null,
      executionResult: approval.executionResult || null,
    })
    .returning();
  return mapApprovalRow(rows[0]);
}

export async function updateAiApproval(
  id: string,
  patch: Partial<AiApprovalRecord>
): Promise<AiApprovalRecord | null> {
  const setPayload: any = {};
  if (patch.status !== undefined) setPayload.status = patch.status;
  if (patch.ownerEmail !== undefined) setPayload.ownerEmail = patch.ownerEmail;
  if (patch.decisionNote !== undefined) setPayload.decisionNote = patch.decisionNote;
  if (patch.decidedAt !== undefined) {
    setPayload.decidedAt = patch.decidedAt ? new Date(patch.decidedAt) : null;
  }
  if (patch.executedAt !== undefined) {
    setPayload.executedAt = patch.executedAt ? new Date(patch.executedAt) : null;
  }
  if (patch.executionResult !== undefined) setPayload.executionResult = patch.executionResult;

  const rows = await db
    .update(aiApprovals)
    .set(setPayload)
    .where(eq(aiApprovals.id, id))
    .returning();
  return rows[0] ? mapApprovalRow(rows[0]) : null;
}

// ============================================================================
// PERSISTENT BUSINESS MEMORY QUERIES
// ============================================================================

function mapMemoryRow(r: typeof aiMemory.$inferSelect): AiMemoryRecord {
  return {
    id: r.id,
    memoryKey: r.memoryKey,
    category: r.category as any,
    sourceType: r.sourceType as any,
    title: r.title,
    content: r.content,
    editableByOwner: r.editableByOwner,
    confidence: r.confidence,
    updatedBy: r.updatedBy,
    updatedAt: r.updatedAt.toISOString(),
    createdAt: r.createdAt.toISOString(),
  };
}

export async function getAllAiMemory(): Promise<AiMemoryRecord[]> {
  const rows = await db
    .select()
    .from(aiMemory)
    .orderBy(asc(aiMemory.category), desc(aiMemory.updatedAt));
  return rows.map(mapMemoryRow);
}

export async function seedAiMemoryIfMissing(
  entry: Omit<AiMemoryRecord, 'createdAt' | 'updatedAt'>
): Promise<void> {
  await db
    .insert(aiMemory)
    .values({
      id: entry.id,
      memoryKey: entry.memoryKey,
      category: entry.category,
      sourceType: entry.sourceType,
      title: entry.title,
      content: entry.content,
      editableByOwner: entry.editableByOwner,
      confidence: entry.confidence,
      updatedBy: entry.updatedBy,
    })
    .onConflictDoNothing({ target: aiMemory.memoryKey });
}

export async function upsertAiMemoryByOwner(
  entry: Omit<AiMemoryRecord, 'createdAt' | 'updatedAt'>
): Promise<AiMemoryRecord> {
  const rows = await db
    .insert(aiMemory)
    .values({
      id: entry.id,
      memoryKey: entry.memoryKey,
      category: entry.category,
      sourceType: entry.sourceType,
      title: entry.title,
      content: entry.content,
      editableByOwner: entry.editableByOwner,
      confidence: entry.confidence,
      updatedBy: entry.updatedBy,
      updatedAt: new Date(),
    })
    .onConflictDoUpdate({
      target: aiMemory.memoryKey,
      set: {
        category: entry.category,
        sourceType: entry.sourceType,
        title: entry.title,
        content: entry.content,
        confidence: entry.confidence,
        updatedBy: entry.updatedBy,
        updatedAt: new Date(),
      },
    })
    .returning();
  return mapMemoryRow(rows[0]);
}

export async function deleteAiMemoryById(id: string): Promise<boolean> {
  const rows = await db.delete(aiMemory).where(eq(aiMemory.id, id)).returning();
  return rows.length > 0;
}

// ============================================================================
// SCHEDULES & SYSTEM HEALTH / USAGE EVENTS
// ============================================================================

function mapScheduleRow(r: typeof aiSchedules.$inferSelect): AiScheduleRecord {
  return {
    id: r.id,
    name: r.name,
    cadence: r.cadence as any,
    timezone: r.timezone,
    agentId: r.agentId as AgentId,
    enabled: r.enabled,
    intervalMinutes: r.intervalMinutes,
    lastRunAt: r.lastRunAt ? r.lastRunAt.toISOString() : null,
    nextRunAt: r.nextRunAt ? r.nextRunAt.toISOString() : null,
    lastStatus: r.lastStatus,
    lastSummary: r.lastSummary,
    createdAt: r.createdAt.toISOString(),
  };
}

export async function getAllAiSchedules(): Promise<AiScheduleRecord[]> {
  const rows = await db.select().from(aiSchedules).orderBy(asc(aiSchedules.intervalMinutes));
  return rows.map(mapScheduleRow);
}

export async function seedAiScheduleIfMissing(
  schedule: Omit<AiScheduleRecord, 'createdAt'>
): Promise<void> {
  await db
    .insert(aiSchedules)
    .values({
      id: schedule.id,
      name: schedule.name,
      cadence: schedule.cadence,
      timezone: schedule.timezone,
      agentId: schedule.agentId,
      enabled: schedule.enabled,
      intervalMinutes: schedule.intervalMinutes,
      lastRunAt: schedule.lastRunAt ? new Date(schedule.lastRunAt) : null,
      nextRunAt: schedule.nextRunAt ? new Date(schedule.nextRunAt) : new Date(Date.now() + schedule.intervalMinutes * 60000),
      lastStatus: schedule.lastStatus,
      lastSummary: schedule.lastSummary || null,
    })
    .onConflictDoNothing({ target: aiSchedules.id });
}

export async function updateAiSchedule(
  id: string,
  patch: Partial<AiScheduleRecord>
): Promise<AiScheduleRecord | null> {
  const setPayload: any = {};
  if (patch.enabled !== undefined) setPayload.enabled = patch.enabled;
  if (patch.lastRunAt !== undefined) {
    setPayload.lastRunAt = patch.lastRunAt ? new Date(patch.lastRunAt) : null;
  }
  if (patch.nextRunAt !== undefined) {
    setPayload.nextRunAt = patch.nextRunAt ? new Date(patch.nextRunAt) : null;
  }
  if (patch.lastStatus !== undefined) setPayload.lastStatus = patch.lastStatus;
  if (patch.lastSummary !== undefined) setPayload.lastSummary = patch.lastSummary;

  const rows = await db
    .update(aiSchedules)
    .set(setPayload)
    .where(eq(aiSchedules.id, id))
    .returning();
  return rows[0] ? mapScheduleRow(rows[0]) : null;
}

export async function recordAiSystemEvent(
  event: Omit<AiSystemEventRecord, 'id' | 'createdAt'> & { id?: string }
): Promise<AiSystemEventRecord> {
  const id = event.id || `EVT-${Date.now()}-${Math.random().toString(36).slice(2, 7).toUpperCase()}`;
  const rows = await db
    .insert(aiSystemEvents)
    .values({
      id,
      eventType: event.eventType,
      severity: event.severity,
      source: event.source,
      summary: event.summary,
      details: event.details ?? null,
      resolved: event.resolved,
      tokensUsed: event.tokensUsed || 0,
    })
    .returning();
  const r = rows[0];
  return {
    id: r.id,
    eventType: r.eventType,
    severity: r.severity as any,
    source: r.source,
    summary: r.summary,
    details: r.details,
    resolved: r.resolved,
    tokensUsed: r.tokensUsed,
    createdAt: r.createdAt.toISOString(),
  };
}

export async function getRecentAiSystemEvents(
  limitCount = 80
): Promise<AiSystemEventRecord[]> {
  const rows = await db
    .select()
    .from(aiSystemEvents)
    .orderBy(desc(aiSystemEvents.createdAt))
    .limit(limitCount);
  return rows.map(r => ({
    id: r.id,
    eventType: r.eventType,
    severity: r.severity as any,
    source: r.source,
    summary: r.summary,
    details: r.details,
    resolved: r.resolved,
    tokensUsed: r.tokensUsed,
    createdAt: r.createdAt.toISOString(),
  }));
}

export async function getDailyTokenUsageSummary(): Promise<{
  tokensToday: number;
  callsToday: number;
}> {
  try {
    const pool = createPool();
    const res = await pool.query(`
      SELECT COALESCE(SUM(tokens_used), 0)::int AS tokens_today,
             COUNT(*)::int AS calls_today
      FROM ai_system_events
      WHERE created_at >= CURRENT_DATE AND tokens_used > 0;
    `);
    return {
      tokensToday: res.rows[0]?.tokens_today || 0,
      callsToday: res.rows[0]?.calls_today || 0,
    };
  } catch {
    return { tokensToday: 0, callsToday: 0 };
  }
}

/**
 * Atomic inventory reservation/deduction inside a PostgreSQL transaction.
 * Prevents overselling by enforcing stock_count >= qty when finite stock is tracked.
 */
export async function reserveOrderStockAtomically(
  items: Array<{ productId: string; quantity: number; name?: string }>
): Promise<{ ok: boolean; insufficientItem?: string; adjustedCount: number }> {
  if (!Array.isArray(items) || items.length === 0) {
    return { ok: true, adjustedCount: 0 };
  }
  const pool = createPool();
  const client = await pool.connect();
  let adjustedCount = 0;

  try {
    await client.query('BEGIN');
    for (const item of items) {
      const qty = Math.max(0, Math.round(Number(item.quantity) || 0));
      if (!item.productId || qty <= 0) continue;

      const prodRes = await client.query(
        'SELECT id, name, stock_count, in_stock FROM products WHERE id = $1 FOR UPDATE',
        [item.productId]
      );
      if (prodRes.rows.length === 0) continue;

      const prod = prodRes.rows[0];
      const currentStock = Number(prod.stock_count ?? 0);
      if (prod.in_stock === false || currentStock < qty) {
        await client.query('ROLLBACK');
        return {
          ok: false,
          insufficientItem: `${prod.name || item.name || item.productId} (Available: ${currentStock}, Requested: ${qty})`,
          adjustedCount: 0,
        };
      }

      const nextStock = currentStock - qty;
      const nextStatus = nextStock <= 0 ? 'Out of Stock' : nextStock <= 50 ? 'Low Stock' : 'In Stock';
      await client.query(
        'UPDATE products SET stock_count = $1, stock_status = $2, in_stock = $3, updated_at = NOW() WHERE id = $4',
        [nextStock, nextStatus, nextStock > 0, item.productId]
      );
      adjustedCount += 1;
    }
    await client.query('COMMIT');
    return { ok: true, adjustedCount };
  } catch (err) {
    await client.query('ROLLBACK').catch(() => {});
    throw err;
  } finally {
    client.release();
  }
}

// ============================================================================
// CROSS-AGENT COMMUNICATION QUERIES
// ============================================================================

function mapAgentMessageRow(r: typeof aiAgentMessages.$inferSelect): AiAgentMessageRecord {
  return {
    id: r.id,
    correlationId: r.correlationId,
    taskId: r.taskId,
    fromAgentId: r.fromAgentId as AgentId,
    fromAgentName: r.fromAgentName,
    toAgentId: r.toAgentId as AgentId,
    toAgentName: r.toAgentName,
    intent: r.intent as any,
    subject: r.subject,
    payload: (r.payload as Record<string, any>) || {},
    status: r.status as any,
    priority: r.priority as any,
    firestoreSynced: r.firestoreSynced,
    createdAt: r.createdAt.toISOString(),
  };
}

export async function insertCrossAgentMessage(
  msg: Omit<AiAgentMessageRecord, 'createdAt'>
): Promise<AiAgentMessageRecord> {
  const rows = await db
    .insert(aiAgentMessages)
    .values({
      id: msg.id,
      correlationId: msg.correlationId,
      taskId: msg.taskId || null,
      fromAgentId: msg.fromAgentId,
      fromAgentName: msg.fromAgentName,
      toAgentId: msg.toAgentId,
      toAgentName: msg.toAgentName,
      intent: msg.intent,
      subject: msg.subject,
      payload: msg.payload || {},
      status: msg.status || 'DELIVERED',
      priority: msg.priority || 'NORMAL',
      firestoreSynced: Boolean(msg.firestoreSynced),
    })
    .returning();
  return mapAgentMessageRow(rows[0]);
}

export async function getCrossAgentMessages(
  limitCount = 100
): Promise<AiAgentMessageRecord[]> {
  const rows = await db
    .select()
    .from(aiAgentMessages)
    .orderBy(desc(aiAgentMessages.createdAt))
    .limit(limitCount);
  return rows.map(mapAgentMessageRow);
}

export async function getCrossAgentMessagesByCorrelation(
  correlationId: string
): Promise<AiAgentMessageRecord[]> {
  const rows = await db
    .select()
    .from(aiAgentMessages)
    .where(eq(aiAgentMessages.correlationId, correlationId))
    .orderBy(asc(aiAgentMessages.createdAt));
  return rows.map(mapAgentMessageRow);
}

export async function acknowledgeCrossAgentMessage(
  id: string,
  status: 'ACKNOWLEDGED' | 'RESOLVED' = 'ACKNOWLEDGED'
): Promise<AiAgentMessageRecord | null> {
  const rows = await db
    .update(aiAgentMessages)
    .set({ status })
    .where(eq(aiAgentMessages.id, id))
    .returning();
  return rows[0] ? mapAgentMessageRow(rows[0]) : null;
}

export async function markCrossAgentMessagesFirestoreSynced(
  ids: string[]
): Promise<void> {
  if (!ids.length) return;
  await db
    .update(aiAgentMessages)
    .set({ firestoreSynced: true })
    .where(inArray(aiAgentMessages.id, ids));
}

