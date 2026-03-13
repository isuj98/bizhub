import React, { useState } from 'react';
import { Loader2, Sparkles, ListTodo, AlertCircle, GripVertical, ShieldAlert } from 'lucide-react';
import { api, type AnalyzeResponse } from '../services/api';

const ANALYSIS_TIMEOUT_MS = 60_000;

interface AnalysisDisplayProps {
  /** Selected node id (business or zap) */
  nodeId: string | null;
  /** Whether the selected node is a business or zap */
  sourceType?: 'business' | 'zap' | null;
  /** Pass when sourceType is business (for API payload) */
  businessId?: string | null;
  /** Pass when sourceType is zap (for API payload) */
  zapId?: string | null;
  businessType?: string;
  aiModel?: 'gemini' | 'openai';
}

export const AnalysisDisplay: React.FC<AnalysisDisplayProps> = ({
  nodeId,
  sourceType,
  businessId,
  zapId,
  businessType,
  aiModel = 'gemini',
}) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<AnalyzeResponse | null>(null);

  const runAnalysis = async () => {
    const id = sourceType === 'business' ? businessId : sourceType === 'zap' ? zapId : null;
    if (!id || !sourceType) {
      setError('Select a Business or Zap node to run analysis.');
      return;
    }
    setError(null);
    setResult(null);
    setLoading(true);

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), ANALYSIS_TIMEOUT_MS);

    try {
      const payload =
        sourceType === 'business'
          ? { businessId: id, ...(businessType && { businessType }), ...(aiModel && { model: aiModel }) }
          : { zapId: id, ...(aiModel && { model: aiModel }) };
      const data = await api.runAnalysis(payload, controller.signal);
      setResult(data);
    } catch (err) {
      if (err instanceof Error) {
        if (err.name === 'AbortError') {
          setError('Analysis took too long. Please try again.');
        } else {
          setError(err.message);
        }
      } else {
        setError('Analysis failed. Please try again.');
      }
    } finally {
      clearTimeout(timeoutId);
      setLoading(false);
    }
  };

  if (!nodeId || !sourceType) {
    return (
      <div className="p-6 rounded-xl bg-slate-900/50 border border-slate-800 text-center">
        <p className="text-sm text-slate-500">Select a Business or Zap to run analysis.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 min-w-0">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4 min-w-0">
        <h3 className="text-sm font-semibold text-slate-400 uppercase tracking-wider">Analysis</h3>
        <button
          type="button"
          onClick={runAnalysis}
          disabled={loading}
          className="flex items-center gap-2 px-4 py-2 rounded-lg bg-indigo-600 text-white text-sm font-medium hover:bg-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 focus:ring-offset-slate-900 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {loading ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              Analyzing…
            </>
          ) : (
            'Run Analysis'
          )}
        </button>
      </div>

      {error && (
        <div className="flex items-start gap-3 p-4 rounded-xl bg-rose-500/10 border border-rose-500/30" role="alert">
          <AlertCircle className="w-5 h-5 text-rose-400 flex-shrink-0 mt-0.5" />
          <p className="text-sm text-rose-300">{error}</p>
        </div>
      )}

      {result && (
        <div className="space-y-6">
          {/* Confidence & warnings */}
          {result.extractionMetadata && (
            <div className="p-4 rounded-xl bg-slate-900/50 border border-slate-800 min-w-0 overflow-hidden">
              <div className="flex items-center gap-2 mb-2">
                <ShieldAlert className="w-4 h-4 text-amber-400" />
                <h4 className="text-sm font-semibold text-slate-300 uppercase tracking-wider">Analysis confidence</h4>
              </div>
              <p className="text-sm text-slate-400 mb-2">
                Confidence: <span className="font-medium text-slate-200">{Math.round(result.extractionMetadata.confidence * 100)}%</span>
                {result.extractionMetadata.confidence < 0.5 && (
                  <span className="text-amber-400 ml-2">— Based mainly on business name/type; add or fix website URL for better results.</span>
                )}
              </p>
              {result.extractionMetadata.warnings.length > 0 && (
                <ul className="list-disc list-inside text-xs text-amber-200/90 space-y-1">
                  {result.extractionMetadata.warnings.map((w, i) => (
                    <li key={i}>{w}</li>
                  ))}
                </ul>
              )}
            </div>
          )}

          {/* Tasks */}
          <div className="p-4 sm:p-6 rounded-xl bg-slate-900/50 border border-slate-800 min-w-0 overflow-hidden">
            <div className="flex items-center gap-2 mb-2">
              <ListTodo className="w-4 h-4 text-indigo-400" />
              <h4 className="text-sm font-semibold text-slate-300 uppercase tracking-wider">Analysis tasks</h4>
            </div>
            <p className="text-xs text-slate-500 mb-4">Drag a task to Active Tasks above to add it.</p>
            {result.tasks.length === 0 ? (
              <p className="text-sm text-slate-500 italic">No tasks from analysis.</p>
            ) : (
              <ul className="space-y-3">
                {result.tasks.map((task) => (
                  <li
                    key={task.id}
                    draggable
                    onDragStart={(e) => {
                      e.dataTransfer.setData('application/json', JSON.stringify({
                        title: task.title,
                        priority: task.priority,
                        dueDate: task.dueDate,
                      }));
                      e.dataTransfer.effectAllowed = 'copy';
                    }}
                    className="flex flex-wrap items-center gap-2 sm:gap-3 p-3 rounded-lg bg-slate-800/50 border border-slate-700 cursor-grab active:cursor-grabbing hover:border-indigo-500/50 hover:bg-slate-800 transition-colors min-w-0"
                  >
                    <GripVertical className="w-4 h-4 text-slate-500 flex-shrink-0" />
                    <span className="text-sm font-medium text-slate-200 flex-grow min-w-0 truncate">{task.title}</span>
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-700 text-slate-400 uppercase flex-shrink-0">
                      {task.priority}
                    </span>
                    <span className="text-[10px] text-slate-500 flex-shrink-0">
                      Due {new Date(task.dueDate).toLocaleDateString()}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {/* Recommendations */}
          <div className="p-4 sm:p-6 rounded-xl bg-gradient-to-br from-indigo-500/10 to-purple-500/10 border border-indigo-500/20 min-w-0 overflow-hidden">
            <div className="flex items-center gap-2 mb-4">
              <Sparkles className="w-4 h-4 text-indigo-400" />
              <h4 className="text-sm font-semibold text-indigo-200 uppercase tracking-wider">Recommendations</h4>
            </div>
            {result.recommendations.length === 0 ? (
              <p className="text-sm text-slate-500 italic">No recommendations.</p>
            ) : (
              <ul className="space-y-2">
                {result.recommendations.map((rec, i) => (
                  <li key={i} className="text-sm text-slate-300 flex items-start gap-2">
                    <span className="text-indigo-400">•</span>
                    <span>{rec}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
