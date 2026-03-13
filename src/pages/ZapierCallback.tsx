import React, { useEffect, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { Loader2, CheckCircle, XCircle } from 'lucide-react';

export default function ZapierCallback() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [message, setMessage] = useState('');

  useEffect(() => {
    const success = searchParams.get('success');
    const error = searchParams.get('error');

    if (success === '1') {
      setStatus('success');
      setMessage('Zapier connected successfully.');
      setTimeout(() => navigate('/', { replace: true }), 2000);
      return;
    }

    if (error) {
      setStatus('error');
      const errorMessages: Record<string, string> = {
        missing_code: 'Authorization was cancelled or no code was returned.',
        invalid_state: 'Invalid or expired authorization request. Please try "Connect Zapier" again.',
      };
      setMessage(errorMessages[error] ?? decodeURIComponent(error));
      return;
    }

    if (!success) {
      setStatus('loading');
      navigate('/', { replace: true });
    }
  }, [searchParams, navigate]);

  return (
    <div className="min-h-screen bg-[#0a0a0c] flex items-center justify-center p-4">
      <div className="w-full max-w-sm rounded-xl bg-slate-900/80 border border-slate-800 p-8 text-center">
        {status === 'loading' && (
          <>
            <Loader2 className="w-12 h-12 text-indigo-400 animate-spin mx-auto mb-4" />
            <p className="text-slate-300">Completing Zapier connection…</p>
          </>
        )}
        {status === 'success' && (
          <>
            <CheckCircle className="w-12 h-12 text-emerald-400 mx-auto mb-4" />
            <p className="text-slate-300">{message}</p>
            <p className="text-slate-500 text-sm mt-2">Redirecting to dashboard…</p>
          </>
        )}
        {status === 'error' && (
          <>
            <XCircle className="w-12 h-12 text-rose-400 mx-auto mb-4" />
            <p className="text-slate-300">{message}</p>
            <button
              type="button"
              onClick={() => navigate('/', { replace: true })}
              className="mt-6 px-4 py-2 rounded-lg bg-slate-700 text-slate-200 hover:bg-slate-600 transition-colors"
            >
              Back to Dashboard
            </button>
          </>
        )}
      </div>
    </div>
  );
}
