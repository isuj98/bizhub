const BASE_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:5001';

const AUTH_TOKEN_KEY = 'businesshub-token';

export function getAuthToken(): string | null {
  return localStorage.getItem(AUTH_TOKEN_KEY);
}

export function setAuthToken(token: string | null): void {
  if (token) localStorage.setItem(AUTH_TOKEN_KEY, token);
  else localStorage.removeItem(AUTH_TOKEN_KEY);
}

export interface CreateBusinessPayload {
  business_name: string;
  business_type?: string;
  website_url?: string;
  api_endpoint?: string;
}

export interface BusinessResponse {
  id: string;
  name: string;
  status: string;
  business_type?: string;
  tasks: Array<{
    id: string;
    title: string;
    status: string;
    priority: string;
    dueDate: string;
  }>;
  website_url?: string;
  api_endpoint?: string;
}

export interface AnalyzePayload {
  businessId?: string;
  zapId?: string;
  hubId?: string;
  businessType?: string;
  model?: 'gemini' | 'openai';
}

/** Normalized Hub node (business or zap) for radial display */
export interface HubNodeResponse {
  id: string;
  sourceType: 'business' | 'zap';
  title: string;
  description?: string;
  status?: string;
  rawData?: unknown;
  normalizedData?: unknown;
  analysisReady: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface AnalyzeResponse {
  tasks: Array<{
    id: string;
    title: string;
    status: string;
    priority: string;
    dueDate: string;
  }>;
  recommendations: string[];
  extractionMetadata?: {
    confidence: number;
    warnings: string[];
  };
}

export interface ZapResponse {
  id: string;
  name: string;
  zapierConnectionId?: string;
  zapierZapId?: string;
  triggerConfig?: Record<string, unknown>;
  actionConfig?: Record<string, unknown>;
  hubId?: string;
  status?: string;
  createdAt?: string;
}

export interface HubResponse {
  id: string;
  title: string;
  normalizedData?: unknown;
  rawData?: unknown;
  analyzeReady?: boolean;
}

function authHeaders(): Record<string, string> {
  const token = getAuthToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
}

async function request<T>(
  path: string,
  options: RequestInit = {}
): Promise<T> {
  const url = `${BASE_URL}${path}`;
  const res = await fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...authHeaders(),
      ...options.headers,
    },
  });
  if (!res.ok) {
    const errBody = await res.json().catch(() => ({}));
    throw new Error((errBody as { error?: string }).error || res.statusText || `Request failed: ${res.status}`);
  }
  return res.json() as Promise<T>;
}

export const api = {
  async getBusinesses(): Promise<BusinessResponse[]> {
    return request<BusinessResponse[]>('/api/businesses');
  },

  async getBusiness(id: string): Promise<BusinessResponse> {
    return request<BusinessResponse>(`/api/businesses/${encodeURIComponent(id)}`);
  },

  async createBusiness(payload: CreateBusinessPayload): Promise<BusinessResponse> {
    return request<BusinessResponse>('/api/businesses', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  async updateTaskStatus(
    businessId: string,
    taskId: string,
    status: string
  ): Promise<{ id: string; title: string; status: string; priority: string; dueDate: string }> {
    return request(
      `/api/businesses/${encodeURIComponent(businessId)}/tasks/${encodeURIComponent(taskId)}`,
      {
        method: 'PATCH',
        body: JSON.stringify({ status }),
      }
    );
  },

  async addTaskToBusiness(
    businessId: string,
    task: { title: string; priority: string; dueDate: string }
  ): Promise<{ id: string; title: string; status: string; priority: string; dueDate: string }> {
    return request(`/api/businesses/${encodeURIComponent(businessId)}/tasks`, {
      method: 'POST',
      body: JSON.stringify(task),
    });
  },

  async runAnalysis(payload: AnalyzePayload, signal?: AbortSignal): Promise<AnalyzeResponse> {
    return request<AnalyzeResponse>('/api/analyze', {
      method: 'POST',
      body: JSON.stringify(payload),
      signal,
    });
  },

  async getHubNodes(): Promise<HubNodeResponse[]> {
    return request<HubNodeResponse[]>('/api/hub/nodes');
  },

  async runAITask(
    businessId: string,
    taskId: string,
    taskTitle: string,
    model?: 'gemini' | 'openai'
  ): Promise<{
    summary: string;
    stepsCompleted?: string[];
    suggestedContent?: string[];
    outcome: string;
    completedAt: string;
  }> {
    return request(`/api/businesses/${encodeURIComponent(businessId)}/tasks/${encodeURIComponent(taskId)}/run-ai`, {
      method: 'POST',
      body: JSON.stringify({ taskTitle, ...(model && { model }) }),
    });
  },

  async signup(email: string, password: string): Promise<{ token: string; user: { id: string; email: string } }> {
    return request<{ token: string; user: { id: string; email: string } }>('/auth/signup', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
  },

  async login(email: string, password: string): Promise<{ token: string; user: { id: string; email: string } }> {
    return request<{ token: string; user: { id: string; email: string } }>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
  },

  async getZapierStatus(): Promise<{ connected: boolean; connectionId?: string }> {
    return request<{ connected: boolean; connectionId?: string }>('/zapier/status');
  },

  async getZapierConnectUrl(): Promise<string> {
    const data = await request<{ url: string }>('/zapier/connect-url');
    if (!data?.url) throw new Error('No connect URL returned');
    return data.url;
  },

  async completeZapierCallback(code: string): Promise<{ connected: boolean }> {
    return request<{ connected: boolean }>('/zapier/callback', {
      method: 'POST',
      body: JSON.stringify({ code }),
    });
  },

  async disconnectZapier(): Promise<{ connected: boolean }> {
    return request<{ connected: boolean }>('/zapier/disconnect', { method: 'POST' });
  },

  async getZaps(): Promise<ZapResponse[]> {
    return request<ZapResponse[]>('/api/zaps');
  },

  async getZap(id: string): Promise<ZapResponse> {
    return request<ZapResponse>(`/api/zaps/${encodeURIComponent(id)}`);
  },

  async createZap(payload: {
    name: string;
    triggerConfig?: Record<string, unknown>;
    actionConfig?: Record<string, unknown>;
    zapierConnectionId?: string;
  }): Promise<ZapResponse> {
    return request<ZapResponse>('/api/zaps', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  async getHub(id: string): Promise<HubResponse & { normalizedData?: unknown; rawData?: unknown }> {
    return request(`/api/hubs/${encodeURIComponent(id)}`);
  },

  async getHubAnalyzeData(id: string): Promise<{ id: string; title: string; normalizedData: unknown; rawData: unknown; analyzeReady: boolean }> {
    return request(`/api/hubs/${encodeURIComponent(id)}/analyze-data`);
  },
};
