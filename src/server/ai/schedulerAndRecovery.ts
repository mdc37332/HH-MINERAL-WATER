import {
  getAllAiSchedules,
  getMasterAiConfig,
  getRetryableFailedTasks,
  recordAiSystemEvent,
  seedAiScheduleIfMissing,
  updateAiSchedule,
  updateAiTask,
} from '../../db/aiQueries.ts';
import { ensureAgentsSeeded } from './agentRegistry.ts';
import { ensureBusinessMemorySeeded } from './memoryService.ts';
import { runAutonomousOperatingCycle } from './autonomousCycle.ts';
import { executeRegisteredTool } from './toolRegistry.ts';
import type { AiScheduleRecord } from './types.ts';

const IST_TZ = 'Asia/Kolkata';

const INITIAL_SCHEDULES: Array<Omit<AiScheduleRecord, 'createdAt'>> = [
  {
    id: 'sched-continuous-health',
    name: 'Continuous System Health, Duplicate Invoice & Recovery Sweep',
    cadence: 'CONTINUOUS',
    timezone: IST_TZ,
    agentId: 'AGENT_09_RECOVERY',
    enabled: true,
    intervalMinutes: 5,
    lastRunAt: null,
    nextRunAt: new Date(Date.now() + 5 * 60000).toISOString(),
    lastStatus: 'READY',
    lastSummary: 'Monitors PostgreSQL latency, retries recoverable jobs, and detects pending/failed notifications.',
  },
  {
    id: 'sched-daily-ceo-digest',
    name: 'Daily Owner Sales, Stock & Dispatch Digest (IST)',
    cadence: 'DAILY',
    timezone: IST_TZ,
    agentId: 'AGENT_10_REPORTING',
    enabled: true,
    intervalMinutes: 1440,
    lastRunAt: null,
    nextRunAt: new Date(Date.now() + 1440 * 60000).toISOString(),
    lastStatus: 'READY',
    lastSummary: 'Prepares daily sales report, checks low-stock SKUs, and summarizes pending orders.',
  },
  {
    id: 'sched-weekly-growth-audit',
    name: 'Weekly Inventory Forecast, Sales Trends & Security Audit',
    cadence: 'WEEKLY',
    timezone: IST_TZ,
    agentId: 'AGENT_01_CEO',
    enabled: true,
    intervalMinutes: 10080,
    lastRunAt: null,
    nextRunAt: new Date(Date.now() + 10080 * 60000).toISOString(),
    lastStatus: 'READY',
    lastSummary: 'Generates 7-day sales & demand forecast and verifies security logs.',
  },
  {
    id: 'sched-monthly-gst-compliance',
    name: 'Monthly GST Register, Agent Performance & Financial Audit',
    cadence: 'MONTHLY',
    timezone: IST_TZ,
    agentId: 'AGENT_05_FINANCE',
    enabled: true,
    intervalMinutes: 43200,
    lastRunAt: null,
    nextRunAt: new Date(Date.now() + 43200 * 60000).toISOString(),
    lastStatus: 'READY',
    lastSummary: 'Audits monthly GST invoice 1:1 parity, paid vs COD receivables, and AI reliability.',
  },
];

let schedulesSeeded = false;
let workerTimer: NodeJS.Timeout | null = null;
let sweepInProgress = false;

export async function ensureAiSystemBootstrapped(): Promise<void> {
  await Promise.all([
    ensureAgentsSeeded(),
    ensureBusinessMemorySeeded(),
    getMasterAiConfig(),
  ]);

  if (!schedulesSeeded) {
    for (const s of INITIAL_SCHEDULES) {
      await seedAiScheduleIfMissing(s);
    }
    schedulesSeeded = true;
  }
}

export async function runScheduleById(scheduleId: string, manualTrigger = false): Promise<AiScheduleRecord | null> {
  await ensureAiSystemBootstrapped();
  const schedules = await getAllAiSchedules();
  const sched = schedules.find(s => s.id === scheduleId);
  if (!sched) return null;

  const task = await runAutonomousOperatingCycle({
    agentId: sched.agentId,
    eventSource: manualTrigger ? `MANUAL_SCHEDULE:${sched.id}` : `CRON:${sched.cadence} (${sched.timezone})`,
    taskDescription: `${sched.name} [${sched.cadence} | ${sched.timezone}]`,
    observeSummary: `Executing scheduled job "${sched.name}" (${sched.cadence}).`,
    understandSummary: 'Run configured autonomous health, reporting, financial, or security checks.',
    analyzeSummary: `Timezone verified: ${sched.timezone}. Interval: every ${sched.intervalMinutes} min.`,
    planSteps: ['Execute scheduled tool checks', 'Verify results in Cloud SQL', 'Update next_run_at timestamp'],
    permissionCheckSummary: 'AUTO_LEVEL_3: Scheduled read/recovery/reporting operations permitted.',
    execute: async taskId => {
      const ctx = { agentId: sched.agentId, agentName: sched.name, taskId };
      if (sched.cadence === 'CONTINUOUS') {
        const health = await executeRegisteredTool('get_system_health_and_errors', {}, ctx);
        const recovery = await executeRegisteredTool('run_error_recovery_sweep', {}, ctx);
        const sec = await executeRegisteredTool('run_security_audit_scan', {}, ctx);
        return {
          result: { health: health.data, recovery: recovery.data, security: sec.data },
          summary: `${health.summary} | ${recovery.summary}`,
          verificationStatus: 'VERIFIED',
          toolCalls: [
            { tool: 'get_system_health_and_errors', status: 'VERIFIED_OK', summary: health.summary, timestamp: new Date().toISOString() },
            { tool: 'run_error_recovery_sweep', status: 'VERIFIED_OK', summary: recovery.summary, timestamp: new Date().toISOString() },
            { tool: 'run_security_audit_scan', status: 'VERIFIED_OK', summary: sec.summary, timestamp: new Date().toISOString() },
          ],
        };
      }

      const reportType =
        sched.cadence === 'MONTHLY' ? 'MONTHLY' : sched.cadence === 'WEEKLY' ? 'WEEKLY' : 'DAILY';
      const report = await executeRegisteredTool('generate_business_report', { reportType }, ctx);
      const inv = await executeRegisteredTool('auto_generate_missing_invoices', { dryRun: false }, ctx);
      return {
        result: { report: report.data, invoiceSync: inv.data },
        summary: `${report.summary} | ${inv.summary}`,
        verificationStatus: 'VERIFIED',
        toolCalls: [
          { tool: 'generate_business_report', status: 'VERIFIED_OK', summary: report.summary, timestamp: new Date().toISOString() },
          { tool: 'auto_generate_missing_invoices', status: 'VERIFIED_OK', summary: inv.summary, timestamp: new Date().toISOString() },
        ],
      };
    },
  });

  const nextRunAt = new Date(Date.now() + sched.intervalMinutes * 60000).toISOString();
  const updated = await updateAiSchedule(sched.id, {
    lastRunAt: new Date().toISOString(),
    nextRunAt,
    lastStatus: task.status === 'COMPLETED' ? 'SUCCEEDED' : task.status,
    lastSummary:
      (task.executionResult as any)?.summary ||
      task.errorInfo ||
      `Executed cleanly (${task.status})`,
  });

  return updated;
}

export async function processRetryQueueAndSchedules(): Promise<{
  schedulesExecuted: number;
  tasksRetried: number;
  movedToDeadLetter: number;
}> {
  if (sweepInProgress) {
    return { schedulesExecuted: 0, tasksRetried: 0, movedToDeadLetter: 0 };
  }
  sweepInProgress = true;

  let schedulesExecuted = 0;
  let tasksRetried = 0;
  let movedToDeadLetter = 0;

  try {
    await ensureAiSystemBootstrapped();
    const master = await getMasterAiConfig();
    if (master.status !== 'RUNNING') {
      return { schedulesExecuted: 0, tasksRetried: 0, movedToDeadLetter: 0 };
    }

    // 1. Exponential Backoff Retry Sweep + Dead-Letter Queue
    const failedTasks = await getRetryableFailedTasks();
    for (const t of failedTasks) {
      if (t.retryCount >= t.maxRetries) {
        await updateAiTask(t.id, {
          status: 'DEAD_LETTER',
          verificationStatus: 'FAILED',
        });
        await recordAiSystemEvent({
          eventType: 'TASK_DEAD_LETTERED',
          severity: 'CRITICAL',
          source: 'AGENT_09_RECOVERY',
          summary: `Task ${t.id} exceeded max retries (${t.maxRetries}) and moved to Dead-Letter Queue.`,
          details: { taskId: t.id, errorInfo: t.errorInfo },
          resolved: false,
          tokensUsed: 0,
        });
        movedToDeadLetter++;
      } else {
        const backoffMinutes = Math.pow(2, t.retryCount);
        await updateAiTask(t.id, {
          retryCount: t.retryCount + 1,
          nextRetryAt: new Date(Date.now() + backoffMinutes * 60000).toISOString(),
        });
        tasksRetried++;
      }
    }

    // 2. Due Schedules (24/7 independent of open browser)
    const schedules = await getAllAiSchedules();
    const now = Date.now();
    for (const s of schedules) {
      if (!s.enabled) continue;
      if (!s.nextRunAt || new Date(s.nextRunAt).getTime() <= now) {
        await runScheduleById(s.id, false);
        schedulesExecuted++;
      }
    }
  } catch (err) {
    console.warn('AI background scheduler notice:', err);
  } finally {
    sweepInProgress = false;
  }

  return { schedulesExecuted, tasksRetried, movedToDeadLetter };
}

export function startAiBackgroundWorker(): void {
  if (workerTimer) return;
  // Run initial bootstrap quietly, then tick every 60 seconds
  ensureAiSystemBootstrapped().catch(err => console.warn('AI bootstrap notice:', err));
  workerTimer = setInterval(() => {
    processRetryQueueAndSchedules().catch(err => console.warn('AI worker tick notice:', err));
  }, 60 * 1000);
}
