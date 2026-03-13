import React from 'react';
import { Zap } from 'lucide-react';
import type { Zap as ZapType } from '../types';

interface ZapDetailPanelProps {
  zap: ZapType;
  /** Optional AI model for display only; actual analysis uses AnalysisDisplay */
  aiModel?: 'gemini' | 'openai';
}

export const ZapDetailPanel: React.FC<ZapDetailPanelProps> = ({ zap }) => {
  const triggerKey = zap.triggerConfig && typeof zap.triggerConfig === 'object' && (zap.triggerConfig as { key?: string }).key;
  const actionKey = zap.actionConfig && typeof zap.actionConfig === 'object' && (zap.actionConfig as { key?: string }).key;

  return (
    <div className="space-y-6 min-w-0">
      <div className="p-4 rounded-xl bg-slate-900/50 border border-slate-800 min-w-0">
        <div className="flex items-center gap-2 mb-3">
          <Zap className="w-5 h-5 text-amber-400" />
          <h3 className="text-sm font-semibold text-slate-300 uppercase tracking-wider">Zap details</h3>
        </div>
        <dl className="space-y-2 text-sm">
          <div>
            <dt className="text-slate-500 uppercase text-[10px] font-medium tracking-wider">Name</dt>
            <dd className="text-slate-200 font-medium">{zap.name}</dd>
          </div>
          {zap.status && (
            <div>
              <dt className="text-slate-500 uppercase text-[10px] font-medium tracking-wider">Status</dt>
              <dd className="text-slate-200">{zap.status}</dd>
            </div>
          )}
          {triggerKey && (
            <div>
              <dt className="text-slate-500 uppercase text-[10px] font-medium tracking-wider">Trigger</dt>
              <dd className="text-slate-200 font-mono text-xs">{triggerKey}</dd>
            </div>
          )}
          {actionKey && (
            <div>
              <dt className="text-slate-500 uppercase text-[10px] font-medium tracking-wider">Action</dt>
              <dd className="text-slate-200 font-mono text-xs">{actionKey}</dd>
            </div>
          )}
          {zap.createdAt && (
            <div>
              <dt className="text-slate-500 uppercase text-[10px] font-medium tracking-wider">Created</dt>
              <dd className="text-slate-400 text-xs">{new Date(zap.createdAt).toLocaleString()}</dd>
            </div>
          )}
        </dl>
      </div>
    </div>
  );
};
