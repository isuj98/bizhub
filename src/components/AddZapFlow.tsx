import React, { useState, useEffect } from 'react';
import { Zap, Loader2, Link2 } from 'lucide-react';
import { api, getAuthToken } from '../services/api';
import { ZapForm } from './ZapForm';

interface AddZapFlowProps {
  onZapCreated?: () => void;
}

export const AddZapFlow: React.FC<AddZapFlowProps> = ({ onZapCreated }) => {
  const [status, setStatus] = useState<'loading' | 'connected' | 'disconnected'>('loading');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api
      .getZapierStatus()
      .then((res) => setStatus(res.connected ? 'connected' : 'disconnected'))
      .catch(() => setStatus('disconnected'));
  }, []);

  const [connecting, setConnecting] = useState(false);

  const handleConnect = async () => {
    setError(null);
    const token = getAuthToken();
    if (!token) {
      setError('Please log in first.');
      return;
    }
    try {
      setConnecting(true);
      const url = await api.getZapierConnectUrl();
      window.location.href = url;
    } catch (e) {
      setConnecting(false);
      setError(e instanceof Error ? e.message : 'Could not start Zapier connection.');
    }
  };

  if (status === 'loading') {
    return (
      <div className="p-6 rounded-xl bg-slate-900/50 border border-slate-800 flex items-center justify-center gap-2 text-slate-400">
        <Loader2 className="w-5 h-5 animate-spin" />
        Checking Zapier connection…
      </div>
    );
  }

  if (status === 'disconnected') {
    return (
      <div className="space-y-4 p-6 rounded-xl bg-slate-900/50 border border-slate-800">
        <div className="flex items-center gap-2">
          <Zap className="w-5 h-5 text-indigo-400" />
          <h3 className="text-sm font-semibold text-slate-300 uppercase tracking-wider">Add Zap</h3>
        </div>
        <p className="text-sm text-slate-400">
          Connect your Zapier account to create Zaps. After connecting, you can create Zaps that become Hubs for analysis.
        </p>
        {error && <p className="text-sm text-rose-400" role="alert">{error}</p>}
        <button
          type="button"
          onClick={handleConnect}
          disabled={connecting}
          className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-amber-600 text-white font-medium hover:bg-amber-500 focus:outline-none focus:ring-2 focus:ring-amber-500 transition-colors disabled:opacity-70 disabled:cursor-not-allowed"
        >
          {connecting ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Link2 className="w-4 h-4" />
          )}
          {connecting ? 'Redirecting to Zapier…' : 'Connect Zapier'}
        </button>
      </div>
    );
  }

  const [disconnecting, setDisconnecting] = useState(false);
  const handleDisconnect = async () => {
    try {
      setDisconnecting(true);
      await api.disconnectZapier();
      setStatus('disconnected');
    } catch {
      setError('Failed to disconnect Zapier.');
    } finally {
      setDisconnecting(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 text-emerald-400 text-sm">
          <Link2 className="w-4 h-4" />
          Zapier connected
        </div>
        <button
          type="button"
          onClick={handleDisconnect}
          disabled={disconnecting}
          className="text-xs text-slate-500 hover:text-rose-400 transition-colors disabled:opacity-70"
        >
          {disconnecting ? 'Disconnecting…' : 'Disconnect'}
        </button>
      </div>
      <ZapForm onSuccess={onZapCreated} />
    </div>
  );
};
