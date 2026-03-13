import React, { useState } from 'react';
import { Loader2 } from 'lucide-react';
import { api } from '../services/api';

interface BusinessFormProps {
  onSuccess?: () => void;
}

export const BusinessForm: React.FC<BusinessFormProps> = ({ onSuccess }) => {
  const [businessName, setBusinessName] = useState('');
  const [businessType, setBusinessType] = useState('');
  const [websiteUrl, setWebsiteUrl] = useState('');
  const [apiEndpoint, setApiEndpoint] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      await api.createBusiness({
        business_name: businessName.trim(),
        business_type: businessType.trim() || undefined,
        website_url: websiteUrl.trim() || undefined,
        api_endpoint: apiEndpoint.trim() || undefined,
      });
      setBusinessName('');
      setBusinessType('');
      setWebsiteUrl('');
      setApiEndpoint('');
      onSuccess?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create business');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4 p-6 rounded-xl bg-slate-900/50 border border-slate-800">
      <h3 className="text-sm font-semibold text-slate-300 uppercase tracking-wider">Add Business</h3>
      <div>
        <label htmlFor="business_name" className="block text-xs font-medium text-slate-500 mb-1.5">
          Business name
        </label>
        <input
          id="business_name"
          type="text"
          value={businessName}
          onChange={(e) => setBusinessName(e.target.value)}
          placeholder="e.g. Acme Corp"
          required
          disabled={loading}
          className="w-full px-4 py-2.5 rounded-lg bg-slate-800 border border-slate-700 text-slate-200 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent disabled:opacity-50"
        />
      </div>
      <div>
        <label htmlFor="business_type" className="block text-xs font-medium text-slate-500 mb-1.5">
          Type of business
        </label>
        <input
          id="business_type"
          type="text"
          value={businessType}
          onChange={(e) => setBusinessType(e.target.value)}
          placeholder="e.g. SaaS, Consulting, Retail, Logistics"
          disabled={loading}
          className="w-full px-4 py-2.5 rounded-lg bg-slate-800 border border-slate-700 text-slate-200 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent disabled:opacity-50"
        />
        <p className="text-[10px] text-slate-600 mt-1">Used for analysis, insights, and recommendations.</p>
      </div>
      <div>
        <label htmlFor="website_url" className="block text-xs font-medium text-slate-500 mb-1.5">
          Website URL
        </label>
        <input
          id="website_url"
          type="url"
          value={websiteUrl}
          onChange={(e) => setWebsiteUrl(e.target.value)}
          placeholder="https://example.com"
          disabled={loading}
          className="w-full px-4 py-2.5 rounded-lg bg-slate-800 border border-slate-700 text-slate-200 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent disabled:opacity-50"
        />
      </div>
      <div>
        <label htmlFor="api_endpoint" className="block text-xs font-medium text-slate-500 mb-1.5">
          API / Server URL <span className="text-slate-600">(optional)</span>
        </label>
        <input
          id="api_endpoint"
          type="url"
          value={apiEndpoint}
          onChange={(e) => setApiEndpoint(e.target.value)}
          placeholder="https://api.example.com — if different from website"
          disabled={loading}
          className="w-full px-4 py-2.5 rounded-lg bg-slate-800 border border-slate-700 text-slate-200 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent disabled:opacity-50"
        />
      </div>
      {error && (
        <p className="text-sm text-rose-400" role="alert">
          {error}
        </p>
      )}
      <button
        type="submit"
        disabled={loading}
        className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-indigo-600 text-white font-medium hover:bg-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 focus:ring-offset-slate-900 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
      >
        {loading ? (
          <>
            <Loader2 className="w-4 h-4 animate-spin" />
            Saving…
          </>
        ) : (
          'Add Business'
        )}
      </button>
    </form>
  );
};
