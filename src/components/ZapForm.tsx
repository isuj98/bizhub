import React, { useState } from 'react';
import { Loader2 } from 'lucide-react';
import { api } from '../services/api';

interface ZapFormProps {
  onSuccess?: () => void;
}

export const ZapForm: React.FC<ZapFormProps> = ({ onSuccess }) => {
  const [name, setName] = useState('');
  const [triggerKey, setTriggerKey] = useState('');
  const [actionKey, setActionKey] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!name.trim()) {
      setError('Zap name is required');
      return;
    }
    setLoading(true);
    try {
      await api.createZap({
        name: name.trim(),
        triggerConfig: triggerKey ? { key: triggerKey } : {},
        actionConfig: actionKey ? { key: actionKey } : {},
      });
      setName('');
      setTriggerKey('');
      setActionKey('');
      onSuccess?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create zap');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4 p-6 rounded-xl bg-slate-900/50 border border-slate-800">
      <h3 className="text-sm font-semibold text-slate-300 uppercase tracking-wider">Create Zap</h3>
      <div>
        <label htmlFor="zap_name" className="block text-xs font-medium text-slate-500 mb-1.5">Zap name</label>
        <input
          id="zap_name"
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="e.g. New lead to CRM"
          required
          disabled={loading}
          className="w-full px-4 py-2.5 rounded-lg bg-slate-800 border border-slate-700 text-slate-200 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
        />
      </div>
      <div>
        <label htmlFor="zap_trigger" className="block text-xs font-medium text-slate-500 mb-1.5">Trigger (optional)</label>
        <input
          id="zap_trigger"
          type="text"
          value={triggerKey}
          onChange={(e) => setTriggerKey(e.target.value)}
          placeholder="e.g. new_lead, form_submit"
          disabled={loading}
          className="w-full px-4 py-2.5 rounded-lg bg-slate-800 border border-slate-700 text-slate-200 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
        />
      </div>
      <div>
        <label htmlFor="zap_action" className="block text-xs font-medium text-slate-500 mb-1.5">Action (optional)</label>
        <input
          id="zap_action"
          type="text"
          value={actionKey}
          onChange={(e) => setActionKey(e.target.value)}
          placeholder="e.g. create_contact, send_email"
          disabled={loading}
          className="w-full px-4 py-2.5 rounded-lg bg-slate-800 border border-slate-700 text-slate-200 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
        />
      </div>
      {error && <p className="text-sm text-rose-400" role="alert">{error}</p>}
      <button
        type="submit"
        disabled={loading}
        className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-indigo-600 text-white font-medium hover:bg-indigo-500 disabled:opacity-50 transition-colors"
      >
        {loading ? <><Loader2 className="w-4 h-4 animate-spin" /> Creating…</> : 'Create Zap'}
      </button>
    </form>
  );
};
