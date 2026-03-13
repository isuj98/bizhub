import { Business } from '../types';

/** Progress steps shown while AI is "working" on a task */
const AI_PROGRESS_STEPS = [
  'Analyzing task…',
  'Planning approach…',
  'Gathering context…',
  'Executing steps…',
  'Verifying results…',
  'Finalizing…',
];

const AI_STEP_DELAY_MS = 800;

export type TaskStatus = import('../types').TaskStatus;

export interface AITaskResult {
  taskTitle: string;
  taskId: string;
  completedAt: string; // ISO
  summary: string;
  /** Legacy: "steps completed" (avoid; use suggestedContent for actual output). */
  stepsCompleted?: string[];
  /** Actual content produced for the task (drafts, copy, checklist items) for the user to use. */
  suggestedContent?: string[];
  outcome: string;
  /** True when server AI was not used (server down or error); result is placeholder text */
  isPlaceholder?: boolean;
}

/** Placeholder when bizhub-server is unavailable or returns an error */
function buildPlaceholderResult(taskTitle: string, taskId: string): AITaskResult {
  return {
    taskTitle,
    taskId,
    completedAt: new Date().toISOString(),
    summary: `Could not complete "${taskTitle}"—server may be unavailable or returned no content.`,
    stepsCompleted: [],
    outcome: 'Start bizhub-server and set GEMINI_API_KEY or OPENAI_API_KEY in bizhub-server/.env for real AI output. This task was not marked done.',
    isPlaceholder: true,
  };
}

/**
 * Runs AI on the task via bizhub-server (real Gemini). Updates status, shows progress,
 * then calls onComplete with the server result or a placeholder if the server fails.
 */
export async function runAITask(options: {
  businessId: string;
  taskId: string;
  taskTitle: string;
  /** AI model: "gemini" or "openai". Defaults to "gemini" if not set. */
  model?: 'gemini' | 'openai';
  onStatusChange: (status: TaskStatus) => void;
  onProgress: (message: string) => void;
  updateTaskStatusApi: (businessId: string, taskId: string, status: string) => Promise<unknown>;
  runAITaskApi: (businessId: string, taskId: string, taskTitle: string, model?: 'gemini' | 'openai') => Promise<{
    summary: string;
    stepsCompleted?: string[];
    suggestedContent?: string[];
    outcome: string;
    completedAt: string;
  }>;
  onComplete: (result: AITaskResult) => void;
}): Promise<void> {
  const {
    businessId,
    taskId,
    taskTitle,
    model,
    onStatusChange,
    onProgress,
    updateTaskStatusApi,
    runAITaskApi,
    onComplete,
  } = options;

  try {
    onStatusChange('working-by-ai');
    await updateTaskStatusApi(businessId, taskId, 'working-by-ai');
  } catch {
    // Continue with local state if API fails
  }

  for (let i = 0; i < AI_PROGRESS_STEPS.length; i++) {
    onProgress(AI_PROGRESS_STEPS[i]);
    await new Promise((r) => setTimeout(r, AI_STEP_DELAY_MS));
  }

  onProgress('Generating AI result…');
  let result: AITaskResult;
  let serverSuccess = false;
  try {
    const payload = await runAITaskApi(businessId, taskId, taskTitle, model);
    const content = payload.suggestedContent?.length
      ? payload.suggestedContent
      : payload.stepsCompleted?.length
        ? payload.stepsCompleted
        : [];
    if (!payload.summary || content.length === 0) {
      result = buildPlaceholderResult(taskTitle, taskId);
      result.outcome = 'AI did not return usable content; task not marked done.';
    } else {
      serverSuccess = true;
      result = {
        taskTitle,
        taskId,
        completedAt: payload.completedAt,
        summary: payload.summary,
        stepsCompleted: payload.stepsCompleted,
        suggestedContent: payload.suggestedContent,
        outcome: payload.outcome,
        isPlaceholder: false,
      };
    }
  } catch {
    result = buildPlaceholderResult(taskTitle, taskId);
  }

  if (serverSuccess) {
    try {
      await updateTaskStatusApi(businessId, taskId, 'done');
    } catch {
      // Still mark complete locally
    }
    onStatusChange('done');
  } else {
    onStatusChange('pending');
    try {
      await updateTaskStatusApi(businessId, taskId, 'pending');
    } catch {
      // ignore
    }
  }
  onComplete(result);
}

export const generateSuggestions = (business: Business): string[] => {
  const suggestions: string[] = [];
  const now = new Date('2026-03-02'); // Using the provided current time

  const overdueTasks = business.tasks.filter(t =>
    t.status !== 'done' && new Date(t.dueDate) < now
  );

  const highPriorityIncomplete = business.tasks.filter(t =>
    t.priority === 'high' && t.status !== 'done'
  );

  const completedCount = business.tasks.filter(t => t.status === 'done').length;
  const completionRate = business.tasks.length > 0 ? (completedCount / business.tasks.length) * 100 : 0;

  if (business.businessType) {
    suggestions.push(`Business type "${business.businessType}" is factored into recommendations and analysis.`);
    const bt = business.businessType.toLowerCase();
    if (bt.includes('saas') || bt.includes('software')) {
      suggestions.push('Consider tracking subscription metrics and churn for SaaS businesses.');
    }
    if (bt.includes('retail') || bt.includes('ecommerce')) {
      suggestions.push('Inventory turnover and seasonal demand are key for retail analysis.');
    }
    if (bt.includes('consulting') || bt.includes('service')) {
      suggestions.push('Utilization rate and project margins help optimize service businesses.');
    }
  }

  if (overdueTasks.length > 0) {
    suggestions.push(`You have ${overdueTasks.length} overdue tasks that need immediate attention.`);
  }

  if (highPriorityIncomplete.length > 0) {
    suggestions.push(`${highPriorityIncomplete.length} high-priority tasks are still pending.`);
  }

  if (completionRate < 50 && business.tasks.length > 0) {
    suggestions.push(`Completion rate is at ${completionRate.toFixed(0)}% — consider reassigning tasks to boost velocity.`);
  }

  if (business.status === 'at-risk') {
    suggestions.push(`This business is marked at-risk due to delayed deliverables or critical pending tasks.`);
  }

  if (suggestions.length === 0) {
    suggestions.push("All systems go. Business performance is within optimal parameters.");
  }

  return suggestions;
};
