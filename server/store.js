/**
 * In-memory store for businesses, zaps, and Zapier connection.
 * For production, replace with a database.
 */
const businesses = new Map();
const zaps = new Map();
/** Single global Zapier connection (keyed by 'default'; use userId when auth is present) */
const zapierConnections = new Map();
let nextId = 1;
let nextZapId = 1;

export function getAllBusinesses() {
  return Array.from(businesses.values());
}

export function getBusinessById(id) {
  return businesses.get(id);
}

export function createBusiness(
  name,
  websiteUrl,
  apiEndpoint,
  businessType
) {
  const id = String(nextId++);
  const business = {
    id,
    name,
    status: 'pending',
    tasks: [],
    ...(websiteUrl && { website_url: websiteUrl }),
    ...(apiEndpoint && { api_endpoint: apiEndpoint }),
    ...(businessType && { business_type: businessType }),
  };
  businesses.set(id, business);
  return business;
}

export function addTaskToBusiness(
  businessId,
  task
) {
  const business = businesses.get(businessId);
  if (!business) return null;
  const id = `t-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
  const tasks = business.tasks ?? [];
  const newTask = {
    id,
    title: task.title,
    status: 'todo',
    priority: task.priority || 'medium',
    dueDate: task.dueDate,
  };
  tasks.push(newTask);
  business.tasks = tasks;
  return newTask;
}

export function updateTaskStatus(
  businessId,
  taskId,
  status
) {
  const business = businesses.get(businessId);
  if (!business) return null;
  const tasks = business.tasks ?? [];
  const task = tasks.find((t) => t.id === taskId);
  if (!task) return null;
  task.status = status;
  return task;
}

export function getAllBusinessesForApi() {
  return Array.from(businesses.values());
}

// ---------- Zaps ----------
export function getAllZaps() {
  return Array.from(zaps.values());
}

export function getZapById(id) {
  return zaps.get(id);
}

export function createZap({ name, triggerConfig = {}, actionConfig = {}, zapierConnectionId, zapierZapId }) {
  const id = `zap-${nextZapId++}`;
  const now = new Date().toISOString();
  const zap = {
    id,
    name: name || 'Unnamed Zap',
    status: 'active',
    triggerConfig,
    actionConfig,
    ...(zapierConnectionId && { zapierConnectionId }),
    ...(zapierZapId && { zapierZapId }),
    createdAt: now,
    updatedAt: now,
  };
  zaps.set(id, zap);
  return zap;
}

// ---------- Zapier connection ----------
const ZAPIER_DEFAULT_KEY = 'default';

export function getZapierConnection(userKey = ZAPIER_DEFAULT_KEY) {
  return zapierConnections.get(userKey) || null;
}

export function setZapierConnection(userKey, data) {
  zapierConnections.set(userKey || ZAPIER_DEFAULT_KEY, data);
  return data;
}

export function clearZapierConnection(userKey = ZAPIER_DEFAULT_KEY) {
  zapierConnections.delete(userKey || ZAPIER_DEFAULT_KEY);
}

// ---------- Hub: normalized nodes (businesses + zaps) ----------
function businessToHubNode(b) {
  return {
    id: b.id,
    sourceType: 'business',
    title: b.name,
    description: b.business_type ? `Type: ${b.business_type}` : undefined,
    status: b.status,
    rawData: b,
    normalizedData: {
      name: b.name,
      status: b.status,
      businessType: b.business_type,
      taskCount: (b.tasks || []).length,
    },
    analysisReady: true,
    createdAt: undefined,
    updatedAt: undefined,
  };
}

function zapToHubNode(z) {
  const triggerKey = z.triggerConfig && typeof z.triggerConfig === 'object' && z.triggerConfig.key;
  const actionKey = z.actionConfig && typeof z.actionConfig === 'object' && z.actionConfig.key;
  const summary = [triggerKey, actionKey].filter(Boolean).join(' → ') || 'Zap workflow';
  return {
    id: z.id,
    sourceType: 'zap',
    title: z.name,
    description: summary,
    status: z.status || 'active',
    rawData: z,
    normalizedData: {
      name: z.name,
      status: z.status,
      triggerConfig: z.triggerConfig,
      actionConfig: z.actionConfig,
    },
    analysisReady: true,
    createdAt: z.createdAt,
    updatedAt: z.updatedAt,
  };
}

export function getHubNodes() {
  const businessNodes = getAllBusinessesForApi().map(businessToHubNode);
  const zapNodes = getAllZaps().map(zapToHubNode);
  return [...businessNodes, ...zapNodes];
}
