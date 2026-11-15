import {
  getAiAgentById,
  getAiTaskByIdempotencyKey,
  getDailyTokenUsageSummary,
  getMasterAiConfig,
  insertAiTask,
  recordAgentTaskMetric,
  recordAiSystemEvent,
  updateAiTask,
} from '../../db/aiQueries.ts';
import { ensureAgentsSeeded, getAgentMetadata } from './agentRegistry.ts';
import { formatMemoryContextForPrompt } from './memoryService.ts';
import { mirrorTaskToFirestore } from './firestoreBridge.ts';
import type {
  AgentId,
  AiTaskRecord,
  AuthorizationLevel,
  OperatingCycleTrace,
} from './types.ts';

export interface CycleRunnerInput {
  agentId: AgentId;
  eventSource: string;
  taskDescription: string;
  idempotencyKey?: string;
  authorizationLevel?: AuthorizationLevel;
  observeSummary: string;
  understandSummary: string;
  analyzeSummary: string;
  planSteps: string[];
  permissionCheckSummary: string;
  bypassMasterCheck?: boolean;
  execute: (taskId: string) => Promise<{
    result: any;
    summary: string;
    verificationStatus: 'VERIFIED' | 'UNVERIFIED' | 'FAILED';
    awaitingApproval?: boolean;
    toolCalls?: Array<{ tool: string; status: string; summary: string; timestamp: string }>;
    tokensUsed?: number;
  }>;
}

/**
 * Runs the mandatory 9-stage Autonomous Operating Cycle with full PostgreSQL persistence:
 * 1. OBSERVE -> 2. UNDERSTAND -> 3. ANALYZE -> 4. PLAN -> 5. CHECK PERMISSIONS
 * -> 6. EXECUTE -> 7. VERIFY -> 8. RECORD -> 9. REPORT
 */
export async function runAutonomousOperatingCycle(
  input: CycleRunnerInput
): Promise<AiTaskRecord> {
  await ensureAgentsSeeded();
  const masterConfig = await getMasterAiConfig();

  if (!input.bypassMasterCheck && masterConfig.status !== 'RUNNING') {
    const blockedTask: AiTaskRecord = {
      id: `TASK-${Date.now()}-${Math.random().toString(36).slice(2, 6).toUpperCase()}`,
      agentId: input.agentId,
      agentName: getAgentMetadata(input.agentId).name,
      eventSource: input.eventSource,
      idempotencyKey: input.idempotencyKey || null,
      taskDescription: input.taskDescription,
      executionPlan: {
        steps: ['Master AI control check'],
        cycle: {
          observe: input.observeSummary,
          understand: input.understandSummary,
          analyze: input.analyzeSummary,
          plan: input.planSteps,
          checkPermissions: `Blocked: Master AI status is ${masterConfig.status}`,
          execute: 'Skipped',
          verify: 'UNVERIFIED',
          record: 'Logged blocked attempt',
          report: `Execution halted because Master AI is ${masterConfig.status}.`,
        },
      },
      authorizationLevel: input.authorizationLevel || 'AUTO_LEVEL_3',
      status: 'FAILED',
      retryCount: 0,
      maxRetries: 0,
      startedAt: new Date().toISOString(),
      completedAt: new Date().toISOString(),
      executionResult: { halted: true, masterStatus: masterConfig.status },
      errorInfo: `Master AI is currently ${masterConfig.status}. Use START AI or RESUME AI to resume execution.`,
      verificationStatus: 'FAILED',
      toolCalls: [],
      tokensUsed: 0,
      createdAt: new Date().toISOString(),
    };
    return insertAiTask(blockedTask);
  }

  const agentRecord = await getAiAgentById(input.agentId);
  if (!input.bypassMasterCheck && agentRecord && agentRecord.status !== 'ACTIVE') {
    const pausedTask: AiTaskRecord = {
      id: `TASK-${Date.now()}-${Math.random().toString(36).slice(2, 6).toUpperCase()}`,
      agentId: input.agentId,
      agentName: agentRecord.name,
      eventSource: input.eventSource,
      idempotencyKey: input.idempotencyKey || null,
      taskDescription: input.taskDescription,
      executionPlan: {
        steps: ['Agent status check'],
        cycle: {
          observe: input.observeSummary,
          understand: input.understandSummary,
          analyze: input.analyzeSummary,
          plan: input.planSteps,
          checkPermissions: `Blocked: Agent ${agentRecord.name} is ${agentRecord.status}`,
          execute: 'Skipped',
          verify: 'UNVERIFIED',
          record: 'Logged paused attempt',
          report: `Agent ${agentRecord.name} is ${agentRecord.status}.`,
        },
      },
      authorizationLevel: input.authorizationLevel || 'AUTO_LEVEL_3',
      status: 'FAILED',
      retryCount: 0,
      maxRetries: 0,
      startedAt: new Date().toISOString(),
      completedAt: new Date().toISOString(),
      executionResult: { halted: true, agentStatus: agentRecord.status },
      errorInfo: `Agent ${agentRecord.name} is ${agentRecord.status}. Activate agent before execution.`,
      verificationStatus: 'FAILED',
      toolCalls: [],
      tokensUsed: 0,
      createdAt: new Date().toISOString(),
    };
    return insertAiTask(pausedTask);
  }

  // Idempotency guard to prevent duplicate task runs for the same business event
  if (input.idempotencyKey) {
    const existing = await getAiTaskByIdempotencyKey(input.idempotencyKey);
    if (existing) {
      return existing;
    }
  }

  // Daily token budget check
  const usage = await getDailyTokenUsageSummary();
  if (usage.tokensToday >= (masterConfig.dailyTokenBudget || 500000)) {
    await recordAiSystemEvent({
      eventType: 'TOKEN_BUDGET_WARNING',
      severity: 'WARNING',
      source: input.agentId,
      summary: `Daily AI token budget reached (${usage.tokensToday} / ${masterConfig.dailyTokenBudget}).`,
      resolved: false,
      tokensUsed: 0,
    });
  }

  const agentMeta = getAgentMetadata(input.agentId);
  const taskId = `TASK-${Date.now()}-${Math.random().toString(36).slice(2, 6).toUpperCase()}`;
  const startedAt = new Date().toISOString();

  await formatMemoryContextForPrompt().catch(() => '');

  const cycleBase: OperatingCycleTrace = {
    observe: input.observeSummary,
    understand: input.understandSummary,
    analyze: input.analyzeSummary,
    plan: input.planSteps,
    checkPermissions: input.permissionCheckSummary,
    execute: 'Running...',
    verify: 'Pending verification...',
    record: `Persisting task ${taskId} to Cloud SQL ai_tasks`,
    report: 'Pending completion',
  };

  await insertAiTask({
    id: taskId,
    agentId: input.agentId,
    agentName: agentMeta.name,
    eventSource: input.eventSource,
    idempotencyKey: input.idempotencyKey || null,
    taskDescription: input.taskDescription,
    executionPlan: {
      steps: input.planSteps,
      cycle: cycleBase,
      delegationDepth: 1,
    },
    authorizationLevel: input.authorizationLevel || 'AUTO_LEVEL_3',
    status: 'RUNNING',
    retryCount: 0,
    maxRetries: masterConfig.maxRetries ?? 3,
    nextRetryAt: null,
    startedAt,
    completedAt: null,
    executionResult: null,
    errorInfo: null,
    verificationStatus: 'PENDING',
    toolCalls: [],
    tokensUsed: 0,
    createdAt: startedAt,
  });

  try {
    const timeoutMs = masterConfig.maxTaskExecutionMs || 25000;
    const execPromise = input.execute(taskId);
    const timeoutPromise = new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error(`Task execution timed out after ${timeoutMs}ms`)), timeoutMs)
    );

    const outcome = await Promise.race([execPromise, timeoutPromise]);
    const finalStatus = outcome.awaitingApproval ? 'AWAITING_APPROVAL' : 'COMPLETED';
    const completedAt = new Date().toISOString();

    const completedCycle: OperatingCycleTrace = {
      ...cycleBase,
      execute: outcome.summary,
      verify: outcome.verificationStatus === 'VERIFIED'
        ? 'Verified directly against Cloud SQL database state.'
        : `Verification status: ${outcome.verificationStatus}`,
      record: `Task ${taskId} recorded cleanly in PostgreSQL.`,
      report: outcome.summary,
    };

    const updated = await updateAiTask(taskId, {
      status: finalStatus,
      completedAt,
      executionPlan: {
        steps: input.planSteps,
        cycle: completedCycle,
        delegationDepth: 1,
      },
      executionResult: outcome.result,
      verificationStatus: outcome.verificationStatus,
      toolCalls: outcome.toolCalls || [],
      tokensUsed: outcome.tokensUsed || 0,
    });

    await recordAgentTaskMetric(input.agentId, true, outcome.summary);
    if (updated) {
      mirrorTaskToFirestore(updated).catch(() => {});
    }
    return updated!;
  } catch (err: any) {
    const errMsg = String(err?.message || err);
    const nextRetry = new Date(Date.now() + 60 * 1000).toISOString();
    const failedCycle: OperatingCycleTrace = {
      ...cycleBase,
      execute: `Failed: ${errMsg}`,
      verify: 'Verification failed due to execution error.',
      record: `Task ${taskId} marked FAILED for exponential backoff retry.`,
      report: `Alerted System Recovery Manager: ${errMsg}`,
    };

    const failedTask = await updateAiTask(taskId, {
      status: 'FAILED',
      completedAt: new Date().toISOString(),
      errorInfo: errMsg,
      nextRetryAt: nextRetry,
      executionPlan: {
        steps: input.planSteps,
        cycle: failedCycle,
        delegationDepth: 1,
      },
      verificationStatus: 'FAILED',
    });

    await recordAgentTaskMetric(input.agentId, false, `Failed: ${errMsg}`);
    await recordAiSystemEvent({
      eventType: 'AI_TASK_FAILED',
      severity: 'WARNING',
      source: input.agentId,
      summary: `Task ${taskId} failed: ${errMsg}`,
      details: { taskId, eventSource: input.eventSource },
      resolved: false,
      tokensUsed: 0,
    });

    if (failedTask) {
      mirrorTaskToFirestore(failedTask).catch(() => {});
    }

    return failedTask!;
  }
}
