export type BusinessStatus = 'active' | 'pending' | 'at-risk' | 'completed';
/** Task status for Active Tasks: who is working on it or state */
export type TaskStatus =
  | 'working-by-human'
  | 'working-by-ai'
  | 'pending'
  | 'on-hold'
  | 'done';
export type Priority = 'low' | 'medium' | 'high';

export interface Task {
  id: string;
  title: string;
  status: TaskStatus;
  priority: Priority;
  dueDate: string; // ISO string for easier handling in mock data
}

export interface Business {
  id: string;
  name: string;
  status: BusinessStatus;
  /** Type of business the user offers (e.g. SaaS, Consulting, Retail) */
  businessType?: string;
  tasks: Task[];
  website_url?: string;
  api_endpoint?: string;
}

/** Source type for Hub radial nodes */
export type HubNodeSourceType = 'business' | 'zap';

/** Normalized node shown in the Hub radial (Business or Zap) */
export interface HubNode {
  id: string;
  sourceType: HubNodeSourceType;
  title: string;
  description?: string;
  status?: string;
  rawData?: unknown;
  normalizedData?: unknown;
  analysisReady: boolean;
  createdAt?: string;
  updatedAt?: string;
}

/** Zap entity (stored in backend, mapped to HubNode) */
export interface Zap {
  id: string;
  name: string;
  zapierConnectionId?: string;
  zapierZapId?: string;
  triggerConfig?: Record<string, unknown>;
  actionConfig?: Record<string, unknown>;
  hubId?: string;
  status?: string;
  createdAt?: string;
  updatedAt?: string;
}
