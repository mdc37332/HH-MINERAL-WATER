import React, { useEffect, useState } from 'react';
import {
  Play,
  Pause,
  Square,
  RefreshCw,
  Send,
  ShieldCheck,
  CheckCircle2,
  XCircle,
  Clock,
  Cpu,
  Terminal,
  Database,
  Activity,
  Lock,
  Plus,
  Trash2,
  ChevronDown,
  ChevronUp,
  RotateCcw,
  AlertTriangle,
  Loader2,
  Sparkles,
  MessageSquareShare,
  Zap,
  Cloud,
  ArrowRight,
} from 'lucide-react';
import {
  AiCommandCenterState,
  acknowledgeCrossAgentMessageApi,
  controlAiAgentApi,
  controlMasterAiApi,
  decideAiApprovalApi,
  deleteAiMemoryApi,
  dispatchAiBusinessEventApi,
  fetchAiCommandCenterStateApi,
  retryAiTaskApi,
  runAiScheduleNowApi,
  saveAiMemoryApi,
  sendOwnerCommandToOrchestratorApi,
  toggleAiScheduleApi,
  triggerRecoverySweepApi,
} from '../../lib/aiApi';
import { syncAiOrchestratorSnapshotToFirestore } from '../../lib/firebase';
import { useStore } from '../../context/StoreContext';

const QUICK_OWNER_COMMANDS = [
  'Show me what needs my attention',
  'Find all pending orders',
  'Check which orders are delayed',
  'Check my complete stock',
  'Which products are low in stock',
  "Prepare today's sales report",
  'Check failed WhatsApp messages',
  'Check all generated invoices',
  'Create ad copy for wedding custom bottles',
  'Check if any errors happened today',
];

export const AiCommandCenterTab: React.FC = () => {
  const { adminToken, showToast } = useStore();
  const [state, setState] = useState<AiCommandCenterState | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [subView, setSubView] = useState<
    'overview' | 'comms' | 'approvals' | 'agents' | 'tasks' | 'memory' | 'schedules'
  >('overview');
  const [commIntentFilter, setCommIntentFilter] = useState<string>('ALL');
  const [lastEventResult, setLastEventResult] = useState<any>(null);

  // Natural Language Command State
  const [commandInput, setCommandInput] = useState('');
  const [isExecutingCmd, setIsExecutingCmd] = useState(false);
  const [lastCommandResult, setLastCommandResult] = useState<any>(null);

  // Task Filters & Expanded 9-Stage Cycle Inspector
  const [taskStatusFilter, setTaskStatusFilter] = useState<string>('ALL');
  const [expandedTaskId, setExpandedTaskId] = useState<string | null>(null);

  // Business Memory Composer State
  const [memKey, setMemKey] = useState('');
  const [memTitle, setMemTitle] = useState('');
  const [memCategory, setMemCategory] = useState('BUSINESS_RULE');
  const [memSourceType, setMemSourceType] = useState<'OWNER_RULE' | 'VERIFIED_FACT'>('OWNER_RULE');
  const [memContentText, setMemContentText] = useState('');
  const [isSavingMemory, setIsSavingMemory] = useState(false);

  // Busy flags
  const [busyActionId, setBusyActionId] = useState<string | null>(null);

  const loadState = async () => {
    try {
      const data = await fetchAiCommandCenterStateApi(adminToken);
      setState(data);
    } catch (err: any) {
      showToast('AI Command Center', err?.message || 'Unable to load AI state', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadState();
    const timer = setInterval(loadState, 30000);
    return () => clearInterval(timer);
  }, [adminToken]);

  const handleMasterControl = async (action: 'START' | 'PAUSE' | 'RESUME' | 'STOP') => {
    setBusyActionId(`master-${action}`);
    try {
      await controlMasterAiApi(action, undefined, adminToken);
      showToast('Master AI Updated', `Master AI status set to ${action === 'START' || action === 'RESUME' ? 'RUNNING' : action}.`, 'success');
      await loadState();
    } catch (err: any) {
      showToast('Master Control Error', err?.message || 'Failed to update Master AI', 'error');
    } finally {
      setBusyActionId(null);
    }
  };

  const handleAgentControl = async (agentId: string, action: 'START' | 'PAUSE' | 'STOP' | 'RUN_NOW') => {
    setBusyActionId(`${agentId}-${action}`);
    try {
      const res = await controlAiAgentApi(agentId, action, adminToken);
      if (action === 'RUN_NOW' && res?.outcome) {
        setLastCommandResult(res.outcome);
        setSubView('overview');
        showToast('Agent Executed', `${res.outcome.routedAgentName} verified task execution.`, 'success');
      } else {
        showToast('Agent Control', `Agent ${agentId} set to ${action}.`, 'info');
      }
      await loadState();
    } catch (err: any) {
      showToast('Agent Control Error', err?.message || 'Action failed', 'error');
    } finally {
      setBusyActionId(null);
    }
  };

  const handleRunCommand = async (cmdText?: string) => {
    const query = (cmdText ?? commandInput).trim();
    if (!query || isExecutingCmd) return;
    setIsExecutingCmd(true);
    try {
      const result = await sendOwnerCommandToOrchestratorApi(query, adminToken);
      setLastCommandResult(result);
      if (!cmdText) setCommandInput('');
      showToast(
        result.requiresApproval ? 'Owner Approval Requested' : 'Orchestrator Verified',
        `${result.routedAgentName} completed execution.`,
        result.requiresApproval ? 'warning' : 'success'
      );
      await loadState();
    } catch (err: any) {
      showToast('Command Failed', err?.message || 'Orchestrator failed to execute command', 'error');
    } finally {
      setIsExecutingCmd(false);
    }
  };

  const handleApprovalDecision = async (approvalId: string, decision: 'APPROVED' | 'REJECTED') => {
    setBusyActionId(`apr-${approvalId}`);
    try {
      const res = await decideAiApprovalApi(approvalId, decision, undefined, adminToken);
      showToast(
        decision === 'APPROVED' ? 'Approved & Executed' : 'Request Rejected',
        res?.executionOutcome?.summary || `Approval ${approvalId} marked ${decision}.`,
        decision === 'APPROVED' ? 'success' : 'info'
      );
      await loadState();
    } catch (err: any) {
      showToast('Approval Error', err?.message || 'Decision failed', 'error');
    } finally {
      setBusyActionId(null);
    }
  };

  const handleRetryTask = async (taskId: string) => {
    setBusyActionId(`retry-${taskId}`);
    try {
      await retryAiTaskApi(taskId, adminToken);
      showToast('Task Retried', `Task ${taskId} re-executed and verified.`, 'success');
      await loadState();
    } catch (err: any) {
      showToast('Retry Error', err?.message || 'Task retry failed', 'error');
    } finally {
      setBusyActionId(null);
    }
  };

  const handleRecoverySweep = async () => {
    setBusyActionId('recovery-sweep');
    try {
      const res = await triggerRecoverySweepApi(adminToken);
      showToast(
        'System Recovery Sweep Complete',
        res?.recoveryToolResult?.summary || 'Health & retry queue verified cleanly.',
        'success'
      );
      await loadState();
    } catch (err: any) {
      showToast('Recovery Error', err?.message || 'Recovery sweep failed', 'error');
    } finally {
      setBusyActionId(null);
    }
  };

  const handleSaveMemory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!memKey.trim() || !memTitle.trim()) return;
    setIsSavingMemory(true);
    try {
      let parsedContent: any = memContentText.trim();
      try {
        if (parsedContent.startsWith('{') || parsedContent.startsWith('[')) {
          parsedContent = JSON.parse(parsedContent);
        } else {
          parsedContent = { rule: parsedContent };
        }
      } catch {
        parsedContent = { rule: parsedContent };
      }
      await saveAiMemoryApi(
        {
          memoryKey: memKey.trim(),
          title: memTitle.trim(),
          category: memCategory,
          sourceType: memSourceType,
          content: parsedContent,
          confidence: 100,
        },
        adminToken
      );
      setMemKey('');
      setMemTitle('');
      setMemContentText('');
      showToast('Memory Saved', 'Persistent business rule stored in PostgreSQL.', 'success');
      await loadState();
    } catch (err: any) {
      showToast('Memory Save Failed', err?.message || 'Unable to save memory rule', 'error');
    } finally {
      setIsSavingMemory(false);
    }
  };

  const handleDeleteMemory = async (id: string) => {
    setBusyActionId(`del-mem-${id}`);
    try {
      await deleteAiMemoryApi(id, adminToken);
      showToast('Memory Deleted', 'Business memory record removed.', 'info');
      await loadState();
    } catch (err: any) {
      showToast('Delete Failed', err?.message || 'Could not remove entry', 'error');
    } finally {
      setBusyActionId(null);
    }
  };

  const handleDispatchEvent = async (
    eventType:
      | 'ORDER_PLACED'
      | 'ORDER_STATUS_CHANGED'
      | 'LOW_STOCK_DETECTED'
      | 'DAILY_EXECUTIVE_BRIEFING'
      | 'SECURITY_ALERT'
      | 'API_FAILURE'
  ) => {
    setBusyActionId(`evt-${eventType}`);
    try {
      const samplePayloads: Record<string, Record<string, any>> = {
        ORDER_PLACED: { source: 'COMMAND_CENTER_SIM', note: 'Manual order intake & stock verification check' },
        ORDER_STATUS_CHANGED: { status: 'In-Transit', note: 'Dispatch transit handoff check' },
        LOW_STOCK_DETECTED: { threshold: 15, note: 'Warehouse bottle replenishment check' },
        DAILY_EXECUTIVE_BRIEFING: { period: 'TODAY', includeFinance: true },
        SECURITY_ALERT: { reason: 'Manual owner security sweep', source: 'Admin Console' },
        API_FAILURE: { service: 'WhatsApp/Database Health', source: 'Admin Console' },
      };
      const res = await dispatchAiBusinessEventApi(eventType, samplePayloads[eventType] || {}, adminToken);
      setLastEventResult(res);
      showToast(
        `Event Dispatched: ${eventType}`,
        `Orchestrator ${res.task?.status || 'PROCESSED'} · ${res.crossAgentMessages?.length || 0} bus messages tracked.`,
        res.success ? 'success' : 'warning'
      );
      await loadState();
    } catch (err: any) {
      showToast('Event Dispatch Failed', err?.message || 'Unable to dispatch business event', 'error');
    } finally {
      setBusyActionId(null);
    }
  };

  const handleAckCrossAgentMessage = async (id: string, status: 'ACKNOWLEDGED' | 'RESOLVED') => {
    setBusyActionId(`msg-${id}-${status}`);
    try {
      await acknowledgeCrossAgentMessageApi(id, status, adminToken);
      showToast('Message Updated', `Cross-agent message marked ${status}.`, 'info');
      await loadState();
    } catch (err: any) {
      showToast('Message Update Error', err?.message || 'Failed to update message status', 'error');
    } finally {
      setBusyActionId(null);
    }
  };

  const handleSyncFirestore = async () => {
    if (!state) return;
    setBusyActionId('sync-firestore');
    try {
      const res = await syncAiOrchestratorSnapshotToFirestore({
        tasks: state.tasks,
        crossAgentMessages: state.crossAgentMessages,
        approvals: state.approvals,
      });
      if (res.skippedReason) {
        showToast('Firestore Bridge Notice', res.skippedReason, 'warning');
      } else {
        showToast('Firestore Synced', `${res.syncedCount} AI records mirrored to Firestore.`, 'success');
      }
      await loadState();
    } catch (err: any) {
      showToast('Firestore Sync Error', err?.message || 'Unable to sync AI records to Firestore', 'error');
    } finally {
      setBusyActionId(null);
    }
  };

  if (isLoading || !state) {
    return (
      <div className="bg-[#0e0e0e] border border-[#262626] rounded-2xl p-10 text-center text-neutral-300 space-y-3">
        <Loader2 className="w-7 h-7 animate-spin text-[#C5A059] mx-auto" />
        <p className="text-sm font-semibold">Initializing HH MINERAL WATER — AI COMMAND CENTER...</p>
      </div>
    );
  }

  const pendingApprovals = state.approvals.filter(a => a.status === 'PENDING');
  const activeAgentsCount = state.agents.filter(a => a.status === 'ACTIVE').length;
  const completedTasksCount = state.tasks.filter(t => t.status === 'COMPLETED').length;
  const failedOrDeadCount = state.tasks.filter(t => t.status === 'FAILED' || t.status === 'DEAD_LETTER').length;
  const filteredTasks =
    taskStatusFilter === 'ALL'
      ? state.tasks
      : state.tasks.filter(t => t.status === taskStatusFilter);

  return (
    <div className="space-y-6 text-white">
      {/* Header & Master AI Governance Strip */}
      <div className="bg-[#0e0e0e] border border-[#2a2a2a] rounded-2xl p-5 sm:p-6 space-y-5">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="space-y-1">
            <p className="text-[11px] font-bold uppercase tracking-widest text-[#C5A059]">
              Level 3 · Maximum Controlled Autonomy
            </p>
            <h2 className="font-heading text-xl sm:text-2xl font-black text-white tracking-tight">
              HH MINERAL WATER — AI COMMAND CENTER
            </h2>
            <p className="text-xs text-neutral-400">
              Master Status:{' '}
              <span
                className={
                  state.masterConfig.status === 'RUNNING'
                    ? 'text-emerald-400 font-bold'
                    : state.masterConfig.status === 'PAUSED'
                    ? 'text-amber-400 font-bold'
                    : 'text-rose-400 font-bold'
                }
              >
                {state.masterConfig.status}
              </span>{' '}
              · {activeAgentsCount}/{state.agents.length} Agents Active · Gemini Engine:{' '}
              <span className="text-neutral-200 font-semibold">{state.integrations.gemini.status}</span>
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => handleMasterControl('START')}
              disabled={busyActionId !== null || state.masterConfig.status === 'RUNNING'}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 text-white text-xs font-bold cursor-pointer"
            >
              <Play className="w-3.5 h-3.5" />
              <span>START AI</span>
            </button>

            <button
              type="button"
              onClick={() => handleMasterControl('PAUSE')}
              disabled={busyActionId !== null || state.masterConfig.status === 'PAUSED'}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-amber-600 hover:bg-amber-500 disabled:opacity-40 text-black text-xs font-bold cursor-pointer"
            >
              <Pause className="w-3.5 h-3.5" />
              <span>PAUSE AI</span>
            </button>

            <button
              type="button"
              onClick={() => handleMasterControl('RESUME')}
              disabled={busyActionId !== null || state.masterConfig.status === 'RUNNING'}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-[#C5A059] hover:brightness-110 disabled:opacity-40 text-black text-xs font-bold cursor-pointer"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>RESUME AI</span>
            </button>

            <button
              type="button"
              onClick={() => handleMasterControl('STOP')}
              disabled={busyActionId !== null || state.masterConfig.status === 'STOPPED'}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-rose-700 hover:bg-rose-600 disabled:opacity-40 text-white text-xs font-bold cursor-pointer"
            >
              <Square className="w-3.5 h-3.5" />
              <span>STOP AI</span>
            </button>

            <button
              type="button"
              onClick={handleRecoverySweep}
              disabled={busyActionId !== null}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-[#181818] hover:bg-[#242424] text-neutral-200 border border-[#333333] text-xs font-bold cursor-pointer"
            >
              <Activity className="w-3.5 h-3.5 text-[#C5A059]" />
              <span>RUN HEALTH SWEEP</span>
            </button>
          </div>
        </div>

        {/* Clean Key Operational Metrics Bar (Tabular Numerals) */}
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-3 pt-2 border-t border-[#222222] text-xs">
          <div className="bg-[#141414] border border-[#242424] rounded-xl p-3">
            <span className="text-[10px] uppercase tracking-wider text-neutral-400 block">Pending Approvals</span>
            <span className="text-lg font-black text-[#DFC283] tabular-nums">{pendingApprovals.length}</span>
          </div>
          <div className="bg-[#141414] border border-[#242424] rounded-xl p-3">
            <span className="text-[10px] uppercase tracking-wider text-neutral-400 block">Completed Tasks</span>
            <span className="text-lg font-black text-emerald-400 tabular-nums">{completedTasksCount}</span>
          </div>
          <div className="bg-[#141414] border border-[#242424] rounded-xl p-3">
            <span className="text-[10px] uppercase tracking-wider text-neutral-400 block">Failed / Dead-Letter</span>
            <span className="text-lg font-black text-rose-400 tabular-nums">{failedOrDeadCount}</span>
          </div>
          <div className="bg-[#141414] border border-[#242424] rounded-xl p-3">
            <span className="text-[10px] uppercase tracking-wider text-neutral-400 block">Memory Facts & Rules</span>
            <span className="text-lg font-black text-white tabular-nums">{state.memory.length}</span>
          </div>
          <div className="bg-[#141414] border border-[#242424] rounded-xl p-3 col-span-2 lg:col-span-1">
            <span className="text-[10px] uppercase tracking-wider text-neutral-400 block">Tokens Used Today</span>
            <span className="text-lg font-black text-neutral-200 tabular-nums">
              {state.usage.tokensToday.toLocaleString('en-IN')}
            </span>
          </div>
        </div>
      </div>

      {/* Sub-Navigation Switcher */}
      <div className="flex flex-wrap gap-2 border-b border-[#242424] pb-2 text-xs font-bold">
        {[
          { id: 'overview', label: 'Owner Command Console' },
          { id: 'comms', label: `Cross-Agent Bus (${state.crossAgentMessages?.length || 0})` },
          { id: 'approvals', label: `Owner Approvals (${pendingApprovals.length})` },
          { id: 'agents', label: `AI Workforce (${state.agents.length})` },
          { id: 'tasks', label: `Tasks & Logs (${state.tasks.length})` },
          { id: 'memory', label: `Business Memory (${state.memory.length})` },
          { id: 'schedules', label: 'Schedules, Health & APIs' },
        ].map(tab => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setSubView(tab.id as any)}
            className={`px-3.5 py-2 rounded-xl border transition-colors cursor-pointer ${
              subView === tab.id
                ? 'bg-[#C5A059] text-black border-[#DFC283] font-black'
                : 'bg-[#121212] text-neutral-300 border-[#282828] hover:border-[#C5A059]/40'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* SUBVIEW 1: OWNER NATURAL LANGUAGE COMMAND CONSOLE */}
      {subView === 'overview' && (
        <div className="space-y-5">
          <div className="bg-[#111111] border border-[#262626] rounded-2xl p-5 space-y-4">
            <div className="flex items-center justify-between gap-2">
              <div>
                <h3 className="text-sm font-black text-white flex items-center gap-2">
                  <Terminal className="w-4 h-4 text-[#C5A059]" />
                  <span>Natural Language Owner Command Center</span>
                </h3>
                <p className="text-xs text-neutral-400 mt-0.5">
                  Instruct the Master AI Orchestrator to inspect real Cloud SQL data, run audits, prepare reports, or propose sensitive changes.
                </p>
              </div>
              <span className="text-[11px] font-mono text-neutral-400">
                Engine: {state.integrations.gemini.status === 'CONNECTED' ? state.integrations.gemini.model : 'Deterministic Tool Engine'}
              </span>
            </div>

            <form
              onSubmit={e => {
                e.preventDefault();
                handleRunCommand();
              }}
              className="flex flex-col sm:flex-row gap-2.5"
            >
              <input
                type="text"
                id="input-owner-ai-command"
                value={commandInput}
                onChange={e => setCommandInput(e.target.value)}
                placeholder="e.g. Find all pending orders · Check my complete stock · Prepare today's sales report · Propose changing 1L price to ₹22"
                className="flex-1 px-4 py-3 rounded-xl bg-[#080808] border border-[#333333] text-sm text-white placeholder:text-neutral-500 focus:outline-none focus:border-[#C5A059]"
              />
              <button
                type="submit"
                id="btn-execute-ai-command"
                disabled={isExecutingCmd || !commandInput.trim()}
                className="px-5 py-3 rounded-xl bg-[#C5A059] hover:brightness-110 disabled:opacity-40 text-black font-black text-xs flex items-center justify-center gap-2 cursor-pointer"
              >
                {isExecutingCmd ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                <span>EXECUTE COMMAND</span>
              </button>
            </form>

            {/* Quick Executive Instructions */}
            <div className="flex flex-wrap gap-1.5">
              {QUICK_OWNER_COMMANDS.map(cmd => (
                <button
                  key={cmd}
                  type="button"
                  disabled={isExecutingCmd}
                  onClick={() => handleRunCommand(cmd)}
                  className="text-[11px] font-semibold px-2.5 py-1.5 rounded-lg bg-[#181818] hover:bg-[#222222] text-neutral-300 hover:text-[#DFC283] border border-[#2c2c2c] cursor-pointer"
                >
                  {cmd}
                </button>
              ))}
            </div>
          </div>

          {/* Last Verified Execution Result */}
          {lastCommandResult && (
            <div className="bg-[#0e0e0e] border border-[#C5A059]/40 rounded-2xl p-5 space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-[#242424]">
                <div className="space-y-0.5">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-[#C5A059]">
                    Verified Orchestrator Output · Routed To {lastCommandResult.routedAgentName}
                  </span>
                  <h4 className="text-sm font-black text-white">{lastCommandResult.task?.taskDescription}</h4>
                </div>
                <span className="text-xs font-mono text-emerald-400">
                  {lastCommandResult.task?.verificationStatus} · {lastCommandResult.task?.status}
                </span>
              </div>

              <div className="bg-[#151515] border border-[#262626] rounded-xl p-4 text-xs sm:text-sm text-neutral-100 whitespace-pre-wrap leading-relaxed">
                {lastCommandResult.answer}
              </div>

              {lastCommandResult.task?.toolCalls?.length > 0 && (
                <div className="space-y-1.5">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-neutral-400 block">
                    Backend Tools Executed & Verified
                  </span>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                    {lastCommandResult.task.toolCalls.map((tc: any, idx: number) => (
                      <div key={idx} className="bg-[#141414] border border-[#262626] rounded-lg p-2.5 text-xs">
                        <p className="font-mono font-bold text-[#DFC283]">
                          {tc.tool} · <span className="text-emerald-400">{tc.status}</span>
                        </p>
                        <p className="text-neutral-300 mt-1">{tc.summary}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {lastCommandResult.structuredData && (
                <details className="bg-[#0a0a0a] border border-[#222222] rounded-xl p-3 text-xs">
                  <summary className="cursor-pointer font-bold text-neutral-400 hover:text-white">
                    Inspect Raw Verified PostgreSQL Output JSON
                  </summary>
                  <pre className="mt-2 text-[11px] font-mono text-neutral-300 overflow-x-auto max-h-72">
                    {JSON.stringify(lastCommandResult.structuredData, null, 2)}
                  </pre>
                </details>
              )}
            </div>
          )}

          {/* Pending Approvals Preview right on Overview if any */}
          {pendingApprovals.length > 0 && (
            <div className="bg-[#14120c] border border-[#C5A059]/40 rounded-2xl p-5 space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-black text-[#DFC283] flex items-center gap-2">
                  <Lock className="w-4 h-4" />
                  <span>{pendingApprovals.length} Sensitive Action(s) Awaiting Your Approval</span>
                </h3>
                <button
                  type="button"
                  onClick={() => setSubView('approvals')}
                  className="text-xs font-bold text-[#DFC283] underline cursor-pointer"
                >
                  Open Approval Queue
                </button>
              </div>
              {pendingApprovals.slice(0, 2).map(apr => (
                <div
                  key={apr.id}
                  className="bg-[#111111] border border-[#2a2a2a] rounded-xl p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs"
                >
                  <div>
                    <p className="font-bold text-white">
                      {apr.title} · <span className="font-mono text-[#C5A059]">{apr.actionType}</span>
                    </p>
                    <p className="text-neutral-400 mt-0.5">{apr.reason}</p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      type="button"
                      disabled={busyActionId !== null}
                      onClick={() => handleApprovalDecision(apr.id, 'APPROVED')}
                      className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold cursor-pointer"
                    >
                      APPROVE
                    </button>
                    <button
                      type="button"
                      disabled={busyActionId !== null}
                      onClick={() => handleApprovalDecision(apr.id, 'REJECTED')}
                      className="px-3 py-1.5 rounded-lg bg-rose-700 hover:bg-rose-600 text-white font-bold cursor-pointer"
                    >
                      REJECT
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* SUBVIEW 1B: CROSS-AGENT COMMUNICATION BUS & EVENT DISPATCHER */}
      {subView === 'comms' && (
        <div className="space-y-5 text-xs">
          {/* Event-Driven Business Bus Dispatcher */}
          <div className="bg-[#111111] border border-[#262626] rounded-2xl p-5 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <h3 className="text-sm font-black text-white flex items-center gap-2">
                  <Zap className="w-4 h-4 text-[#C5A059]" />
                  <span>Event-Driven Business Bus Dispatcher</span>
                </h3>
                <p className="text-neutral-400 mt-0.5">
                  Trigger real business events into the Master AI Orchestrator to coordinate multi-agent handoffs, tool calls, and Firestore synchronization.
                </p>
              </div>
              {state.integrations.firestore && (
                <button
                  type="button"
                  disabled={busyActionId !== null}
                  onClick={handleSyncFirestore}
                  className="px-3.5 py-2 rounded-xl bg-[#181818] hover:bg-[#222222] border border-[#C5A059]/40 text-[#DFC283] font-bold flex items-center gap-1.5 cursor-pointer shrink-0"
                >
                  <Cloud className="w-3.5 h-3.5" />
                  <span>Sync AI State to Firestore</span>
                </button>
              )}
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2">
              {(
                [
                  { id: 'ORDER_PLACED', label: 'Order Placed' },
                  { id: 'ORDER_STATUS_CHANGED', label: 'Order Status' },
                  { id: 'LOW_STOCK_DETECTED', label: 'Low Stock Check' },
                  { id: 'DAILY_EXECUTIVE_BRIEFING', label: 'Daily Briefing' },
                  { id: 'SECURITY_ALERT', label: 'Security Sweep' },
                  { id: 'API_FAILURE', label: 'Recovery Sweep' },
                ] as const
              ).map(evt => (
                <button
                  key={evt.id}
                  type="button"
                  disabled={busyActionId !== null}
                  onClick={() => handleDispatchEvent(evt.id)}
                  className="px-3 py-2.5 rounded-xl bg-[#181818] hover:bg-[#242424] border border-[#303030] hover:border-[#C5A059] text-neutral-200 font-bold flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  {busyActionId === `evt-${evt.id}` ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin text-[#C5A059]" />
                  ) : (
                    <Zap className="w-3.5 h-3.5 text-[#C5A059]" />
                  )}
                  <span>{evt.label}</span>
                </button>
              ))}
            </div>

            {lastEventResult?.task && (
              <div className="bg-[#151515] border border-[#C5A059]/30 rounded-xl p-3.5 space-y-1.5">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="font-mono text-[11px] text-[#DFC283] font-bold">
                    DISPATCHED: {lastEventResult.eventType} · {lastEventResult.task.id}
                  </span>
                  <span className="font-mono text-emerald-400 font-bold">
                    {lastEventResult.task.status} · {lastEventResult.task.verificationStatus}
                  </span>
                </div>
                <p className="text-neutral-200">{lastEventResult.task.taskDescription}</p>
              </div>
            )}
          </div>

          {/* Persistent Cross-Agent Communication Feed */}
          <div className="bg-[#111111] border border-[#262626] rounded-2xl p-5 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <h3 className="text-sm font-black text-white flex items-center gap-2">
                <MessageSquareShare className="w-4 h-4 text-[#C5A059]" />
                <span>Specialist Cross-Agent Handoffs & Verification Messages</span>
              </h3>
              <div className="flex flex-wrap gap-1.5">
                {['ALL', 'HANDOFF', 'VERIFICATION_REPORT', 'RISK_ALERT', 'APPROVAL_ESCALATION', 'RECOVERY_NOTICE'].map(intent => (
                  <button
                    key={intent}
                    type="button"
                    onClick={() => setCommIntentFilter(intent)}
                    className={`px-2.5 py-1 rounded-lg border font-bold cursor-pointer ${
                      commIntentFilter === intent
                        ? 'bg-[#C5A059] text-black border-[#DFC283]'
                        : 'bg-[#161616] text-neutral-300 border-[#282828]'
                    }`}
                  >
                    {intent}
                  </button>
                ))}
              </div>
            </div>

            {(!state.crossAgentMessages || state.crossAgentMessages.length === 0) ? (
              <div className="bg-[#151515] border border-[#242424] rounded-xl p-8 text-center text-neutral-400">
                No cross-agent messages logged yet. Execute an Owner Command or trigger a Business Event above to inspect live specialist handoffs.
              </div>
            ) : (
              <div className="space-y-2.5 max-h-[540px] overflow-y-auto pr-1">
                {state.crossAgentMessages
                  .filter(m => commIntentFilter === 'ALL' || m.intent === commIntentFilter)
                  .map(msg => (
                    <div
                      key={msg.id}
                      className="bg-[#161616] border border-[#262626] rounded-xl p-4 space-y-2.5"
                    >
                      <div className="flex flex-col md:flex-row md:items-center justify-between gap-2">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="font-mono font-bold text-[#DFC283]">{msg.fromAgentName}</span>
                          <ArrowRight className="w-3.5 h-3.5 text-neutral-500" />
                          <span className="font-mono font-bold text-white">{msg.toAgentName}</span>
                          <span className="px-2 py-0.5 rounded bg-[#222222] text-[#C5A059] font-mono text-[10px] font-bold">
                            {msg.intent}
                          </span>
                          <span
                            className={`px-2 py-0.5 rounded font-mono text-[10px] font-bold ${
                              msg.priority === 'CRITICAL'
                                ? 'bg-rose-950 text-rose-300'
                                : msg.priority === 'HIGH'
                                ? 'bg-amber-950 text-amber-300'
                                : 'bg-[#202020] text-neutral-300'
                            }`}
                          >
                            {msg.priority}
                          </span>
                        </div>
                        <div className="flex flex-wrap items-center gap-2">
                          <span
                            className={`text-[10px] font-mono font-bold ${
                              msg.firestoreSynced ? 'text-emerald-400' : 'text-neutral-400'
                            }`}
                          >
                            {msg.firestoreSynced ? 'FIRESTORE SYNCED' : 'CLOUD SQL LOGGED'}
                          </span>
                          <span
                            className={`font-bold ${
                              msg.status === 'RESOLVED'
                                ? 'text-emerald-400'
                                : msg.status === 'ACKNOWLEDGED'
                                ? 'text-sky-400'
                                : 'text-amber-300'
                            }`}
                          >
                            {msg.status}
                          </span>
                        </div>
                      </div>

                      <div>
                        <p className="font-bold text-white text-sm">{msg.subject}</p>
                        <p className="font-mono text-[10px] text-neutral-400 mt-0.5">
                          Correlation: {msg.correlationId} {msg.taskId ? `· Task: ${msg.taskId}` : ''} ·{' '}
                          {new Date(msg.createdAt).toLocaleString('en-IN')}
                        </p>
                      </div>

                      {msg.payload && Object.keys(msg.payload).length > 0 && (
                        <pre className="bg-[#0a0a0a] border border-[#222222] rounded-lg p-2.5 font-mono text-[11px] text-neutral-300 overflow-x-auto max-h-40">
                          {JSON.stringify(msg.payload, null, 2)}
                        </pre>
                      )}

                      {msg.status !== 'RESOLVED' && (
                        <div className="flex items-center gap-2 pt-1">
                          {msg.status !== 'ACKNOWLEDGED' && (
                            <button
                              type="button"
                              disabled={busyActionId !== null}
                              onClick={() => handleAckCrossAgentMessage(msg.id, 'ACKNOWLEDGED')}
                              className="px-3 py-1 rounded-lg bg-[#232323] hover:bg-[#303030] text-neutral-200 font-bold cursor-pointer"
                            >
                              ACKNOWLEDGE
                            </button>
                          )}
                          <button
                            type="button"
                            disabled={busyActionId !== null}
                            onClick={() => handleAckCrossAgentMessage(msg.id, 'RESOLVED')}
                            className="px-3 py-1 rounded-lg bg-emerald-700 hover:bg-emerald-600 text-white font-bold cursor-pointer"
                          >
                            MARK RESOLVED
                          </button>
                        </div>
                      )}
                    </div>
                  ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* SUBVIEW 2: OWNER APPROVAL QUEUE */}
      {subView === 'approvals' && (
        <div className="space-y-4">
          {state.approvals.length === 0 ? (
            <div className="bg-[#111111] border border-[#262626] rounded-2xl p-8 text-center text-xs text-neutral-400">
              No sensitive approval requests yet. Routine Level 3 operations execute automatically without cluttering this queue.
            </div>
          ) : (
            state.approvals.map(apr => (
              <div
                key={apr.id}
                className="bg-[#111111] border border-[#282828] rounded-2xl p-5 space-y-3 text-xs"
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div>
                    <span className="text-[10px] font-mono text-[#C5A059] uppercase">
                      {apr.id} · {apr.agentName} · {apr.actionType}
                    </span>
                    <h4 className="text-sm font-black text-white mt-0.5">{apr.title}</h4>
                  </div>
                  <span
                    className={`font-bold ${
                      apr.status === 'PENDING'
                        ? 'text-amber-400'
                        : apr.status === 'EXECUTED' || apr.status === 'APPROVED'
                        ? 'text-emerald-400'
                        : 'text-rose-400'
                    }`}
                  >
                    {apr.status}
                  </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 bg-[#161616] border border-[#242424] rounded-xl p-3">
                  <div>
                    <span className="text-[10px] uppercase text-neutral-400 font-bold block">Reason</span>
                    <p className="text-neutral-200 mt-0.5">{apr.reason}</p>
                  </div>
                  <div>
                    <span className="text-[10px] uppercase text-neutral-400 font-bold block">Expected Impact</span>
                    <p className="text-neutral-200 mt-0.5">{apr.expectedImpact}</p>
                  </div>
                </div>

                <pre className="bg-[#0a0a0a] border border-[#222222] rounded-xl p-3 text-[11px] font-mono text-neutral-300 overflow-x-auto">
                  {JSON.stringify(apr.proposedPayload, null, 2)}
                </pre>

                {apr.executionResult && (
                  <div className="bg-emerald-950/30 border border-emerald-700/40 rounded-xl p-3 text-emerald-200">
                    Execution Proof: {apr.executionResult.summary || JSON.stringify(apr.executionResult)}
                  </div>
                )}

                {apr.status === 'PENDING' && (
                  <div className="flex items-center gap-2 pt-1">
                    <button
                      type="button"
                      disabled={busyActionId !== null}
                      onClick={() => handleApprovalDecision(apr.id, 'APPROVED')}
                      className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-black flex items-center gap-1.5 cursor-pointer"
                    >
                      <CheckCircle2 className="w-4 h-4" />
                      <span>APPROVE & EXECUTE</span>
                    </button>
                    <button
                      type="button"
                      disabled={busyActionId !== null}
                      onClick={() => handleApprovalDecision(apr.id, 'REJECTED')}
                      className="px-4 py-2 rounded-xl bg-rose-700 hover:bg-rose-600 text-white font-black flex items-center gap-1.5 cursor-pointer"
                    >
                      <XCircle className="w-4 h-4" />
                      <span>REJECT</span>
                    </button>
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      )}

      {/* SUBVIEW 3: SPECIALIST AI WORKFORCE (11 AGENTS) */}
      {subView === 'agents' && (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {state.agents.map(agent => (
            <div
              key={agent.id}
              className="bg-[#111111] border border-[#262626] rounded-2xl p-4 flex flex-col justify-between space-y-3 text-xs"
            >
              <div className="space-y-1.5">
                <div className="flex items-center justify-between gap-2">
                  <span className="font-mono font-bold text-[#C5A059]">{agent.code}</span>
                  <span
                    className={`font-bold ${
                      agent.status === 'ACTIVE'
                        ? 'text-emerald-400'
                        : agent.status === 'PAUSED'
                        ? 'text-amber-400'
                        : 'text-rose-400'
                    }`}
                  >
                    {agent.status}
                  </span>
                </div>
                <h4 className="text-sm font-black text-white">{agent.name}</h4>
                <p className="text-neutral-400 leading-relaxed">{agent.role}</p>
              </div>

              <div className="bg-[#161616] border border-[#232323] rounded-xl p-2.5 space-y-1">
                <div className="flex items-center justify-between tabular-nums">
                  <span className="text-neutral-400">Tasks Completed / Failed</span>
                  <span className="font-bold text-white">
                    {agent.tasksCompleted} / <span className="text-rose-400">{agent.tasksFailed}</span>
                  </span>
                </div>
                {agent.lastSummary && (
                  <p className="text-[11px] text-neutral-300 line-clamp-2 pt-1 border-t border-[#222222]">
                    Last: {agent.lastSummary}
                  </p>
                )}
              </div>

              <div className="flex flex-wrap gap-1.5 pt-1">
                <button
                  type="button"
                  disabled={busyActionId !== null || agent.status === 'ACTIVE'}
                  onClick={() => handleAgentControl(agent.id, 'START')}
                  className="px-2.5 py-1.5 rounded-lg bg-emerald-700 hover:bg-emerald-600 disabled:opacity-40 text-white font-bold cursor-pointer"
                >
                  START AGENT
                </button>
                <button
                  type="button"
                  disabled={busyActionId !== null || agent.status === 'PAUSED'}
                  onClick={() => handleAgentControl(agent.id, 'PAUSE')}
                  className="px-2.5 py-1.5 rounded-lg bg-amber-600 hover:bg-amber-500 disabled:opacity-40 text-black font-bold cursor-pointer"
                >
                  PAUSE AGENT
                </button>
                <button
                  type="button"
                  disabled={busyActionId !== null}
                  onClick={() => handleAgentControl(agent.id, 'RUN_NOW')}
                  className="px-2.5 py-1.5 rounded-lg bg-[#1d1d1d] hover:bg-[#2a2a2a] text-[#DFC283] border border-[#353535] font-bold cursor-pointer"
                >
                  RUN NOW
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* SUBVIEW 4: TASK QUEUE & EXECUTION LOGS (WITH 9-STAGE CYCLE INSPECTOR) */}
      {subView === 'tasks' && (
        <div className="space-y-4">
          <div className="flex flex-wrap gap-1.5 text-xs">
            {['ALL', 'COMPLETED', 'AWAITING_APPROVAL', 'RUNNING', 'FAILED', 'DEAD_LETTER'].map(st => (
              <button
                key={st}
                type="button"
                onClick={() => setTaskStatusFilter(st)}
                className={`px-3 py-1.5 rounded-lg border font-bold cursor-pointer ${
                  taskStatusFilter === st
                    ? 'bg-[#C5A059] text-black border-[#DFC283]'
                    : 'bg-[#141414] text-neutral-300 border-[#282828]'
                }`}
              >
                {st}
              </button>
            ))}
          </div>

          <div className="space-y-2.5">
            {filteredTasks.map(task => {
              const expanded = expandedTaskId === task.id;
              return (
                <div
                  key={task.id}
                  className="bg-[#111111] border border-[#262626] rounded-xl p-4 text-xs space-y-2"
                >
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-2">
                    <div className="space-y-0.5">
                      <p className="font-mono text-[11px] text-neutral-400">
                        {task.id} · {task.agentName} · {task.eventSource} · {task.authorizationLevel}
                      </p>
                      <h4 className="text-sm font-bold text-white">{task.taskDescription}</h4>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <span
                        className={`font-bold ${
                          task.status === 'COMPLETED'
                            ? 'text-emerald-400'
                            : task.status === 'AWAITING_APPROVAL'
                            ? 'text-amber-400'
                            : 'text-rose-400'
                        }`}
                      >
                        {task.status} · {task.verificationStatus}
                      </span>
                      {(task.status === 'FAILED' || task.status === 'DEAD_LETTER') && (
                        <button
                          type="button"
                          disabled={busyActionId !== null}
                          onClick={() => handleRetryTask(task.id)}
                          className="px-2.5 py-1 rounded-lg bg-[#C5A059] text-black font-bold flex items-center gap-1 cursor-pointer"
                        >
                          <RotateCcw className="w-3 h-3" />
                          <span>RETRY TASK</span>
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => setExpandedTaskId(expanded ? null : task.id)}
                        className="p-1.5 rounded-lg bg-[#1c1c1c] text-neutral-300 hover:text-white cursor-pointer"
                      >
                        {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>

                  {task.errorInfo && (
                    <div className="bg-rose-950/40 border border-rose-700/40 rounded-lg p-2.5 text-rose-200">
                      Error: {task.errorInfo}
                    </div>
                  )}

                  {expanded && (
                    <div className="pt-2 border-t border-[#222222] space-y-3">
                      {task.executionPlan?.cycle && (
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                          {Object.entries(task.executionPlan.cycle).map(([stage, desc]) => (
                            <div key={stage} className="bg-[#161616] border border-[#242424] rounded-lg p-2.5">
                              <span className="text-[10px] font-mono uppercase text-[#C5A059] font-bold block">
                                {stage}
                              </span>
                              <p className="text-neutral-200 mt-0.5">
                                {Array.isArray(desc) ? desc.join(' → ') : String(desc)}
                              </p>
                            </div>
                          ))}
                        </div>
                      )}
                      {task.executionResult && (
                        <pre className="bg-[#080808] border border-[#222222] rounded-lg p-3 font-mono text-[11px] text-neutral-300 overflow-x-auto max-h-60">
                          {JSON.stringify(task.executionResult, null, 2)}
                        </pre>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* SUBVIEW 5: PERSISTENT BUSINESS MEMORY EDITOR */}
      {subView === 'memory' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
          <form
            onSubmit={handleSaveMemory}
            className="lg:col-span-4 bg-[#111111] border border-[#262626] rounded-2xl p-5 space-y-3 text-xs h-fit"
          >
            <h3 className="text-sm font-black text-white flex items-center gap-2">
              <Database className="w-4 h-4 text-[#C5A059]" />
              <span>Add / Update Business Rule</span>
            </h3>
            <p className="text-neutral-400">
              Verified Facts & Owner Rules override AI predictions cleanly.
            </p>
            <div>
              <label className="text-neutral-300 font-bold block mb-1">Memory Key</label>
              <input
                type="text"
                value={memKey}
                onChange={e => setMemKey(e.target.value)}
                placeholder="e.g. rule_weekend_dispatch_cutoff"
                className="w-full px-3 py-2 rounded-lg bg-[#080808] border border-[#333333] text-white"
              />
            </div>
            <div>
              <label className="text-neutral-300 font-bold block mb-1">Title</label>
              <input
                type="text"
                value={memTitle}
                onChange={e => setMemTitle(e.target.value)}
                placeholder="e.g. Weekend Fleet Cutoff Time"
                className="w-full px-3 py-2 rounded-lg bg-[#080808] border border-[#333333] text-white"
              />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-neutral-300 font-bold block mb-1">Category</label>
                <select
                  value={memCategory}
                  onChange={e => setMemCategory(e.target.value)}
                  className="w-full px-2.5 py-2 rounded-lg bg-[#080808] border border-[#333333] text-white"
                >
                  <option value="BUSINESS_RULE">BUSINESS_RULE</option>
                  <option value="PRICING_CONFIG">PRICING_CONFIG</option>
                  <option value="INVENTORY_THRESHOLD">INVENTORY_THRESHOLD</option>
                  <option value="ORDER_WORKFLOW">ORDER_WORKFLOW</option>
                  <option value="OWNER_PREFERENCE">OWNER_PREFERENCE</option>
                </select>
              </div>
              <div>
                <label className="text-neutral-300 font-bold block mb-1">Authority</label>
                <select
                  value={memSourceType}
                  onChange={e => setMemSourceType(e.target.value as any)}
                  className="w-full px-2.5 py-2 rounded-lg bg-[#080808] border border-[#333333] text-white"
                >
                  <option value="OWNER_RULE">OWNER_RULE</option>
                  <option value="VERIFIED_FACT">VERIFIED_FACT</option>
                </select>
              </div>
            </div>
            <div>
              <label className="text-neutral-300 font-bold block mb-1">Rule / Fact Content (Text or JSON)</label>
              <textarea
                rows={4}
                value={memContentText}
                onChange={e => setMemContentText(e.target.value)}
                placeholder="Describe rule or structured JSON policy..."
                className="w-full px-3 py-2 rounded-lg bg-[#080808] border border-[#333333] text-white font-mono"
              />
            </div>
            <button
              type="submit"
              disabled={isSavingMemory || !memKey.trim() || !memTitle.trim()}
              className="w-full py-2.5 rounded-xl bg-[#C5A059] hover:brightness-110 disabled:opacity-40 text-black font-black flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>{isSavingMemory ? 'Saving...' : 'Save Memory Rule'}</span>
            </button>
          </form>

          <div className="lg:col-span-8 space-y-3">
            {state.memory.map(mem => (
              <div
                key={mem.id}
                className="bg-[#111111] border border-[#262626] rounded-xl p-4 text-xs space-y-2"
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <span className="font-mono text-[10px] text-[#C5A059]">
                      {mem.sourceType} · {mem.category} · {mem.memoryKey} · Confidence {mem.confidence}%
                    </span>
                    <h4 className="text-sm font-bold text-white mt-0.5">{mem.title}</h4>
                  </div>
                  {mem.editableByOwner && (
                    <button
                      type="button"
                      onClick={() => handleDeleteMemory(mem.id)}
                      className="p-1.5 rounded-lg text-neutral-400 hover:text-rose-400 hover:bg-rose-950/30 cursor-pointer"
                      title="Delete memory record"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
                <pre className="bg-[#080808] border border-[#222222] rounded-lg p-2.5 font-mono text-[11px] text-neutral-300 overflow-x-auto">
                  {JSON.stringify(mem.content, null, 2)}
                </pre>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* SUBVIEW 6: SCHEDULES (Asia/Kolkata), HEALTH EVENTS & LIVE INTEGRATIONS */}
      {subView === 'schedules' && (
        <div className="space-y-5 text-xs">
          {/* Integrations Status Panel */}
          <div className="bg-[#111111] border border-[#262626] rounded-2xl p-5 space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h3 className="text-sm font-black text-white flex items-center gap-2">
                <Cpu className="w-4 h-4 text-[#C5A059]" />
                <span>Real Backend Integrations & API Quota Telemetry</span>
              </h3>
              <button
                type="button"
                disabled={busyActionId !== null}
                onClick={handleSyncFirestore}
                className="px-3 py-1.5 rounded-xl bg-[#181818] hover:bg-[#232323] border border-[#C5A059]/40 text-[#DFC283] font-bold flex items-center gap-1.5 cursor-pointer"
              >
                <Cloud className="w-3.5 h-3.5" />
                <span>Sync AI State to Firestore</span>
              </button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {[
                {
                  name: `Gemini AI (${state.integrations.gemini.model})`,
                  status: state.integrations.gemini.status,
                  detail: state.integrations.gemini.message,
                },
                {
                  name: 'Cloud SQL PostgreSQL',
                  status: state.integrations.postgresql.status,
                  detail: state.integrations.postgresql.database,
                },
                {
                  name: 'Firebase Firestore Bridge',
                  status: state.integrations.firestore?.status || 'SYNC_READY',
                  detail:
                    state.integrations.firestore
                      ? `${state.integrations.firestore.mode} · DB: ${state.integrations.firestore.databaseId}`
                      : 'Client real-time mirror active',
                },
                {
                  name: 'Meta WhatsApp Cloud API',
                  status: state.integrations.whatsappCloudApi.status,
                  detail: state.integrations.whatsappCloudApi.detail,
                },
                {
                  name: 'SMTP Admin Email Alerts',
                  status: state.integrations.smtpEmail.status,
                  detail: state.integrations.smtpEmail.detail,
                },
              ].map(item => (
                <div key={item.name} className="bg-[#161616] border border-[#242424] rounded-xl p-3.5 space-y-1">
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-bold text-white">{item.name}</span>
                    <span
                      className={
                        item.status === 'CONNECTED' || item.status === 'SYNC_READY'
                          ? 'text-emerald-400 font-bold'
                          : 'text-amber-400 font-bold'
                      }
                    >
                      {item.status}
                    </span>
                  </div>
                  <p className="text-[11px] text-neutral-400 leading-relaxed">{item.detail}</p>
                </div>
              ))}
            </div>
          </div>

          {/* 24/7 Schedules Table */}
          <div className="bg-[#111111] border border-[#262626] rounded-2xl p-5 space-y-3">
            <h3 className="text-sm font-black text-white flex items-center gap-2">
              <Clock className="w-4 h-4 text-[#C5A059]" />
              <span>24/7 Autonomous Schedules (Asia/Kolkata)</span>
            </h3>
            <div className="space-y-2.5">
              {state.schedules.map(s => (
                <div
                  key={s.id}
                  className="bg-[#161616] border border-[#242424] rounded-xl p-3.5 flex flex-col md:flex-row md:items-center justify-between gap-3"
                >
                  <div>
                    <p className="font-mono text-[10px] text-[#C5A059]">
                      {s.cadence} · {s.timezone} · Every {s.intervalMinutes} min · Status: {s.lastStatus}
                    </p>
                    <h4 className="font-bold text-white text-sm">{s.name}</h4>
                    {s.lastSummary && <p className="text-neutral-400 mt-0.5">{s.lastSummary}</p>}
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      type="button"
                      onClick={async () => {
                        await toggleAiScheduleApi(s.id, !s.enabled, adminToken);
                        await loadState();
                      }}
                      className={`px-3 py-1.5 rounded-lg font-bold cursor-pointer ${
                        s.enabled ? 'bg-emerald-700 text-white' : 'bg-[#262626] text-neutral-300'
                      }`}
                    >
                      {s.enabled ? 'ENABLED' : 'PAUSED'}
                    </button>
                    <button
                      type="button"
                      disabled={busyActionId !== null}
                      onClick={async () => {
                        setBusyActionId(`run-sch-${s.id}`);
                        try {
                          await runAiScheduleNowApi(s.id, adminToken);
                          showToast('Schedule Executed', `${s.name} verified cleanly.`, 'success');
                          await loadState();
                        } finally {
                          setBusyActionId(null);
                        }
                      }}
                      className="px-3 py-1.5 rounded-lg bg-[#C5A059] text-black font-black cursor-pointer"
                    >
                      RUN NOW
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* System Health & Error Telemetry Events */}
          <div className="bg-[#111111] border border-[#262626] rounded-2xl p-5 space-y-3">
            <h3 className="text-sm font-black text-white flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-[#C5A059]" />
              <span>System Events & Error Recovery Feed</span>
            </h3>
            <div className="space-y-2 max-h-80 overflow-y-auto">
              {state.events.length === 0 ? (
                <p className="text-neutral-400">No system error or telemetry events recorded yet.</p>
              ) : (
                state.events.map(evt => (
                  <div
                    key={evt.id}
                    className="bg-[#161616] border border-[#242424] rounded-lg p-3 flex items-start justify-between gap-3"
                  >
                    <div>
                      <p className="font-mono text-[10px] text-neutral-400">
                        {evt.eventType} · {evt.source} · {new Date(evt.createdAt).toLocaleString('en-IN')}
                      </p>
                      <p className="text-neutral-200 mt-0.5">{evt.summary}</p>
                    </div>
                    <span
                      className={`font-bold shrink-0 ${
                        evt.severity === 'CRITICAL'
                          ? 'text-rose-400'
                          : evt.severity === 'WARNING'
                          ? 'text-amber-400'
                          : 'text-emerald-400'
                      }`}
                    >
                      {evt.severity}
                    </span>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
