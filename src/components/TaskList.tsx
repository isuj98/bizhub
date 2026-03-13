import React, { useState } from 'react';
import { Task, type TaskStatus } from '../types';
import { CheckCircle2, Circle, Clock, AlertTriangle, GripVertical, Sparkles, Loader2, X } from 'lucide-react';
import { api } from '../services/api';
import { runAITask, type AITaskResult } from '../utils/aiLogic';

interface TaskListProps {
  businessId: string | null;
  tasks: Task[];
  onTasksRefresh?: () => void;
  aiModel?: 'gemini' | 'openai';
}

/** Color coding for task status - consistent across UI */
const getStatusStyle = (status: TaskStatus) => {
  switch (status) {
    case 'working-by-human':
      return 'text-blue-400 bg-blue-500/15 border-blue-500/40';
    case 'working-by-ai':
      return 'text-purple-400 bg-purple-500/15 border-purple-500/40';
    case 'pending':
      return 'text-orange-400 bg-orange-500/15 border-orange-500/40';
    case 'on-hold':
      return 'text-slate-400 bg-slate-500/15 border-slate-500/40';
    case 'done':
      return 'text-emerald-400 bg-emerald-500/15 border-emerald-500/40';
    default:
      return 'text-slate-400 bg-slate-500/15 border-slate-500/40';
  }
};

const getStatusLabel = (status: TaskStatus): string => {
  switch (status) {
    case 'working-by-human': return 'Working by Human';
    case 'working-by-ai': return 'Working by AI';
    case 'pending': return 'Pending';
    case 'on-hold': return 'On Hold';
    case 'done': return 'Done';
    default: return status;
  }
};

const getStatusIcon = (status: TaskStatus) => {
  switch (status) {
    case 'working-by-human':
      return <Clock className="w-5 h-5 text-blue-400 animate-pulse" />;
    case 'working-by-ai':
      return <Sparkles className="w-5 h-5 text-purple-400 animate-pulse" />;
    case 'pending':
      return <Circle className="w-5 h-5 text-orange-400" />;
    case 'on-hold':
      return <Clock className="w-5 h-5 text-slate-500" />;
    case 'done':
      return <CheckCircle2 className="w-5 h-5 text-emerald-500" />;
    default:
      return <Circle className="w-5 h-5 text-slate-600" />;
  }
};

const getPriorityColor = (priority: Task['priority']) => {
  switch (priority) {
    case 'high': return 'text-rose-400 bg-rose-400/10';
    case 'medium': return 'text-amber-400 bg-amber-400/10';
    case 'low': return 'text-emerald-400 bg-emerald-400/10';
  }
};

export const TaskList: React.FC<TaskListProps> = ({ businessId, tasks, onTasksRefresh, aiModel = 'gemini' }) => {
  const [dropActive, setDropActive] = useState(false);
  const [adding, setAdding] = useState(false);
  /** Local overrides while AI is running: status + progress message */
  const [aiRunState, setAiRunState] = useState<Record<string, { status: TaskStatus; progress?: string }>>({});
  /** Result to show in popup after AI completes a task */
  const [aiResultModal, setAiResultModal] = useState<AITaskResult | null>(null);

  const getDisplayStatus = (task: Task): TaskStatus =>
    aiRunState[task.id]?.status ?? task.status;
  const getProgressMessage = (taskId: string): string | undefined =>
    aiRunState[taskId]?.progress;

  const handleStartAI = async (task: Task) => {
    if (!businessId || task.status === 'done') return;
    setAiRunState((prev) => ({ ...prev, [task.id]: { status: 'working-by-ai', progress: 'Starting…' } }));

    await runAITask({
      businessId,
      taskId: task.id,
      taskTitle: task.title,
      model: aiModel,
      onStatusChange: (status) =>
        setAiRunState((prev) => ({ ...prev, [task.id]: { ...prev[task.id], status } })),
      onProgress: (message) =>
        setAiRunState((prev) => ({ ...prev, [task.id]: { ...prev[task.id], progress: message } })),
      updateTaskStatusApi: api.updateTaskStatus,
      runAITaskApi: api.runAITask,
      onComplete: (result) => {
        setAiRunState((prev) => {
          const next = { ...prev };
          delete next[task.id];
          return next;
        });
        setAiResultModal(result);
        onTasksRefresh?.();
      },
    });
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    if (e.dataTransfer.types.includes('application/json')) e.dataTransfer.dropEffect = 'copy';
    setDropActive(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    if (!e.currentTarget.contains(e.relatedTarget as Node)) setDropActive(false);
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    setDropActive(false);
    if (!businessId || !onTasksRefresh) return;
    const raw = e.dataTransfer.getData('application/json');
    if (!raw) return;
    try {
      const task = JSON.parse(raw) as { title: string; priority?: string; dueDate?: string };
      if (!task?.title) return;
      setAdding(true);
      await api.addTaskToBusiness(businessId, {
        title: task.title,
        priority: task.priority ?? 'medium',
        dueDate: task.dueDate ?? new Date().toISOString().slice(0, 10),
      });
      onTasksRefresh();
    } catch {
      // ignore invalid drop
    } finally {
      setAdding(false);
    }
  };

  return (
    <div className="space-y-3 min-w-0">
      {/* AI task result modal */}
      {aiResultModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
          role="dialog"
          aria-modal="true"
          aria-labelledby="ai-result-title"
          onClick={() => setAiResultModal(null)}
        >
          <div
            className="w-full max-w-lg rounded-2xl bg-slate-900 border border-slate-700 shadow-xl shadow-black/40 overflow-hidden max-h-[90vh] flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-700 bg-gradient-to-r from-purple-500/10 to-indigo-500/10">
              <div className="flex items-center gap-2">
                <div className="w-10 h-10 rounded-xl bg-emerald-500/20 flex items-center justify-center">
                  <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                </div>
                <div>
                  <h2 id="ai-result-title" className="text-base font-semibold text-white">
                    AI task completed
                  </h2>
                  <p className="text-xs text-slate-400 truncate max-w-[240px]">{aiResultModal.taskTitle}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setAiResultModal(null)}
                className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-700 transition-colors"
                aria-label="Close"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6 space-y-4 max-h-[60vh] overflow-y-auto">
              {aiResultModal.isPlaceholder && (
                <div className="p-3 rounded-lg bg-amber-500/10 border border-amber-500/30 text-amber-200 text-xs">
                  <strong>Placeholder result.</strong> For real AI results, start <code className="bg-slate-800 px-1 rounded">bizhub-server</code> and set <code className="bg-slate-800 px-1 rounded">GEMINI_API_KEY</code> or <code className="bg-slate-800 px-1 rounded">OPENAI_API_KEY</code> in <code className="bg-slate-800 px-1 rounded">bizhub-server/.env</code>.
                </div>
              )}
              <p className="text-sm text-slate-300">{aiResultModal.summary}</p>
              {aiResultModal.suggestedContent && aiResultModal.suggestedContent.length > 0 && (
                <div>
                  <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
                    Content produced for this task
                  </h3>
                  <p className="text-[11px] text-slate-500 mb-1.5">Use or paste this content; we cannot access your site to apply it.</p>
                  <ul className="space-y-2">
                    {aiResultModal.suggestedContent.map((item, i) => (
                      <li key={i} className="text-sm text-slate-200 bg-slate-800/60 border border-slate-700 rounded-lg px-3 py-2 whitespace-pre-wrap break-words">
                        {item}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              {aiResultModal.stepsCompleted && aiResultModal.stepsCompleted.length > 0 && !aiResultModal.suggestedContent?.length && (
                <div>
                  <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Steps completed</h3>
                  <ul className="space-y-1.5">
                    {aiResultModal.stepsCompleted.map((step, i) => (
                      <li key={i} className="text-sm text-slate-300 flex items-start gap-2">
                        <span className="text-emerald-400 mt-0.5">✓</span>
                        <span>{step}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              <div>
                <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">Outcome</h3>
                <p className="text-sm text-slate-300">{aiResultModal.outcome}</p>
              </div>
              <p className="text-[10px] text-slate-500 font-mono">
                Completed at {new Date(aiResultModal.completedAt).toLocaleString()}
              </p>
            </div>
            <div className="px-6 py-4 border-t border-slate-700 bg-slate-800/50">
              <button
                type="button"
                onClick={() => setAiResultModal(null)}
                className="w-full py-2.5 rounded-lg bg-indigo-600 text-white text-sm font-medium hover:bg-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 focus:ring-offset-slate-900 transition-colors"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold text-slate-400 uppercase tracking-wider">Active Tasks</h3>
        <span className="text-xs text-slate-500">{tasks.length} Total</span>
      </div>

      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={`rounded-xl border-2 border-dashed transition-colors ${
          dropActive
            ? 'border-indigo-500 bg-indigo-500/10'
            : 'border-slate-800 hover:border-slate-700'
        } ${adding ? 'opacity-70 pointer-events-none' : ''}`}
      >
        {tasks.length === 0 && !dropActive ? (
          <div className="py-8 text-center">
            <p className="text-sm text-slate-500 italic">No tasks assigned to this business.</p>
            {businessId && onTasksRefresh && (
              <p className="text-xs text-slate-600 mt-2">Drag tasks from Analysis here to add them.</p>
            )}
          </div>
        ) : (
          <div className="p-1 space-y-2">
            {tasks.map((task) => {
              const displayStatus = getDisplayStatus(task);
              const progressMsg = getProgressMessage(task.id);
              const isAiRunning = displayStatus === 'working-by-ai' && progressMsg !== undefined;
              return (
                <div
                  key={task.id}
                  className="group flex flex-wrap items-start sm:items-center gap-3 sm:gap-4 p-3 sm:p-4 rounded-xl bg-slate-900/50 border border-slate-800 hover:border-slate-700 transition-all min-w-0"
                >
                  <div className="flex-shrink-0 text-slate-600 order-first">
                    <GripVertical className="w-4 h-4" />
                  </div>
                  <div className="flex-shrink-0 order-first">
                    {getStatusIcon(displayStatus)}
                  </div>

                  <div className="flex-grow min-w-0 flex-1">
                    <h4 className={`text-sm font-medium truncate ${displayStatus === 'done' ? 'text-slate-500 line-through' : 'text-slate-200'}`}>
                      {task.title}
                    </h4>
                    <div className="flex items-center gap-3 mt-1 flex-wrap">
                      <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase tracking-tighter border ${getStatusStyle(displayStatus)}`}>
                        {getStatusLabel(displayStatus)}
                      </span>
                      <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase tracking-tighter ${getPriorityColor(task.priority)}`}>
                        {task.priority}
                      </span>
                      <span className="text-[10px] text-slate-500 flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        Due {new Date(task.dueDate).toLocaleDateString()}
                      </span>
                    </div>
                    {isAiRunning && (
                      <div className="flex items-center gap-2 mt-2 text-xs text-purple-300">
                        <Loader2 className="w-3.5 h-3.5 animate-spin flex-shrink-0" />
                        <span>{progressMsg}</span>
                      </div>
                    )}
                  </div>

                  {new Date(task.dueDate) < new Date('2026-03-02') && displayStatus !== 'done' && (
                    <div className="flex-shrink-0">
                      <AlertTriangle className="w-4 h-4 text-rose-500" />
                    </div>
                  )}

                  {displayStatus !== 'done' && businessId && (
                    <div className="flex-shrink-0 w-full sm:w-auto order-last sm:order-none">
                      <button
                        type="button"
                        onClick={() => handleStartAI(task)}
                        disabled={isAiRunning}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-purple-600/80 text-white text-xs font-medium hover:bg-purple-500 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2 focus:ring-offset-slate-900 disabled:opacity-60 disabled:cursor-not-allowed transition-colors"
                        title="Let AI run or complete this task"
                      >
                        {isAiRunning ? (
                          <>
                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                            AI working…
                          </>
                        ) : (
                          <>
                            <Sparkles className="w-3.5 h-3.5" />
                            Let AI run
                          </>
                        )}
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
