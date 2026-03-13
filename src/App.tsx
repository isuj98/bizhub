import { useState, useMemo, useCallback, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import { HubRadial } from './components/BusinessCircle';
import { TaskList } from './components/TaskList';
import { AISuggestions } from './components/AISuggestions';
import { BusinessForm } from './components/BusinessForm';
import { AnalysisDisplay } from './components/AnalysisDisplay';
import { AddZapFlow } from './components/AddZapFlow';
import { ZapDetailPanel } from './components/ZapDetailPanel';
import { mockBusinesses } from './mockData';
import { generateSuggestions } from './utils/aiLogic';
import { api, type HubNodeResponse } from './services/api';
import type { Business, HubNode, HubNodeSourceType, TaskStatus, Zap as ZapType } from './types';
import { useAuth } from './contexts/AuthContext';
import { LayoutDashboard, Settings, Bell, Search, User, Cpu, Briefcase, Zap, LogOut } from 'lucide-react';

export type AIModel = 'gemini' | 'openai';
const AI_MODEL_STORAGE_KEY = 'businesshub-ai-model';

function normalizeTaskStatus(s: string): TaskStatus {
  switch (s) {
    case 'working-by-human':
    case 'working-by-ai':
    case 'pending':
    case 'on-hold':
    case 'done':
      return s;
    case 'todo':
      return 'pending';
    case 'in-progress':
      return 'working-by-human';
    default:
      return 'pending';
  }
}

export type CreateType = 'business' | 'zap';

function hubNodeResponseToHubNode(r: HubNodeResponse): HubNode {
  return {
    id: r.id,
    sourceType: r.sourceType,
    title: r.title,
    description: r.description,
    status: r.status,
    rawData: r.rawData,
    normalizedData: r.normalizedData,
    analysisReady: r.analysisReady ?? true,
    createdAt: r.createdAt,
    updatedAt: r.updatedAt,
  };
}

function rawToBusiness(raw: unknown): Business {
  const b = raw as { id: string; name: string; status?: string; business_type?: string; tasks?: Array<{ id: string; title: string; status?: string; priority?: string; dueDate?: string }>; website_url?: string; api_endpoint?: string };
  return {
    id: b.id,
    name: b.name,
    status: (b.status as Business['status']) || 'pending',
    ...(b.business_type && { businessType: b.business_type }),
    tasks: (b.tasks || []).map((t) => ({
      id: t.id,
      title: t.title,
      status: normalizeTaskStatus(t.status || 'pending'),
      priority: (t.priority as Business['tasks'][0]['priority']) || 'medium',
      dueDate: t.dueDate || new Date().toISOString().slice(0, 10),
    })),
    ...(b.website_url && { website_url: b.website_url }),
    ...(b.api_endpoint && { api_endpoint: b.api_endpoint }),
  };
}

export default function App() {
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const [hubNodes, setHubNodes] = useState<HubNode[]>([]);
  const [hubNodesLoading, setHubNodesLoading] = useState(true);
  const [hubNodesError, setHubNodesError] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [selectedSourceType, setSelectedSourceType] = useState<HubNodeSourceType | null>(null);
  const selectionRef = useRef({ selectedId, selectedSourceType });
  selectionRef.current = { selectedId, selectedSourceType };
  const [createType, setCreateType] = useState<CreateType>('business');
  const [aiModel, setAiModel] = useState<AIModel>(() => {
    try {
      const stored = localStorage.getItem(AI_MODEL_STORAGE_KEY);
      if (stored === 'gemini' || stored === 'openai') return stored;
    } catch {
      // ignore
    }
    return 'gemini';
  });

  useEffect(() => {
    try {
      localStorage.setItem(AI_MODEL_STORAGE_KEY, aiModel);
    } catch {
      // ignore
    }
  }, [aiModel]);

  const refreshHubNodes = useCallback(async () => {
    setHubNodesLoading(true);
    setHubNodesError(null);
    try {
      const nodes = await api.getHubNodes();
      const mapped = nodes.map(hubNodeResponseToHubNode);
      setHubNodes(mapped);
      const { selectedId: sid, selectedSourceType: sst } = selectionRef.current;
      if (mapped.length > 0 && (!sid || !mapped.some((n) => n.id === sid && n.sourceType === sst))) {
        const first = mapped[0];
        setSelectedId(first.id);
        setSelectedSourceType(first.sourceType);
      }
    } catch {
      try {
        const [businessList, zapList] = await Promise.all([api.getBusinesses(), api.getZaps().catch(() => [])]);
        const businessNodes: HubNode[] = businessList.map((b) => ({
          id: b.id,
          sourceType: 'business' as const,
          title: b.name,
          description: b.business_type ? `Type: ${b.business_type}` : undefined,
          status: b.status,
          rawData: b,
          normalizedData: { name: b.name, status: b.status, taskCount: b.tasks?.length ?? 0 },
          analysisReady: true,
        }));
        const zapNodes: HubNode[] = (zapList || []).map((z) => ({
          id: z.id,
          sourceType: 'zap' as const,
          title: z.name,
          description: [z.triggerConfig && (z.triggerConfig as { key?: string }).key, z.actionConfig && (z.actionConfig as { key?: string }).key].filter(Boolean).join(' → ') || undefined,
          status: z.status || 'active',
          rawData: z,
          normalizedData: { name: z.name, triggerConfig: z.triggerConfig, actionConfig: z.actionConfig },
          analysisReady: true,
          createdAt: z.createdAt,
          updatedAt: z.updatedAt,
        }));
        setHubNodes([...businessNodes, ...zapNodes]);
        if (businessNodes.length > 0 || zapNodes.length > 0) {
          const first = businessNodes[0] || zapNodes[0];
        setSelectedId(first.id);
        setSelectedSourceType(first.sourceType);
        }
      } catch (e) {
        setHubNodesError(e instanceof Error ? e.message : 'Failed to load hub data');
        setHubNodes(mockBusinesses.map((b) => ({ id: b.id, sourceType: 'business' as const, title: b.name, status: b.status, rawData: b, normalizedData: {}, analysisReady: true })));
        setSelectedId(mockBusinesses[0]?.id ?? null);
        setSelectedSourceType('business');
      }
    } finally {
      setHubNodesLoading(false);
    }
  }, []);

  useEffect(() => {
    refreshHubNodes();
  }, []);

  const businesses = useMemo(() => hubNodes.filter((n) => n.sourceType === 'business').map((n) => rawToBusiness(n.rawData)), [hubNodes]);
  const zaps = useMemo(() => hubNodes.filter((n) => n.sourceType === 'zap').map((n) => n.rawData as ZapType), [hubNodes]);

  const selectedBusiness = useMemo(() => {
    if (selectedSourceType !== 'business' || !selectedId) return businesses[0] ?? null;
    return businesses.find((b) => b.id === selectedId) ?? businesses[0] ?? null;
  }, [businesses, selectedId, selectedSourceType]);

  const selectedZap = useMemo(() => {
    if (selectedSourceType !== 'zap' || !selectedId) return null;
    return zaps.find((z) => z.id === selectedId) ?? null;
  }, [zaps, selectedId, selectedSourceType]);

  const suggestions = useMemo(() => (selectedBusiness ? generateSuggestions(selectedBusiness) : []), [selectedBusiness]);

  const handleSelectNode = useCallback((id: string, sourceType: HubNodeSourceType) => {
    setSelectedId(id);
    setSelectedSourceType(sourceType);
  }, []);

  return (
    <div className="min-h-screen bg-[#0a0a0c] text-slate-200 font-sans selection:bg-indigo-500/30">
      {/* Fake Electron Titlebar */}
      <div className="h-8 bg-[#0a0a0c] border-b border-slate-800 flex items-center px-3 sm:px-4 justify-between select-none min-w-0">
        <div className="flex gap-2 flex-shrink-0">
          <div className="w-3 h-3 rounded-full bg-rose-500/50" />
          <div className="w-3 h-3 rounded-full bg-amber-500/50" />
          <div className="w-3 h-3 rounded-full bg-emerald-500/50" />
        </div>
        <span className="text-[10px] font-bold text-slate-500 tracking-widest uppercase truncate mx-2">BusinessHub — v1.0.4</span>
        <div className="flex items-center gap-2 flex-shrink-0">
          {user && <span className="text-[10px] text-slate-500 truncate max-w-[120px]">{user.email}</span>}
          <button type="button" onClick={() => { logout(); navigate('/login'); }} className="p-2 text-slate-500 hover:text-rose-400 transition-colors" title="Sign out"><LogOut className="w-4 h-4" /></button>
        </div>
      </div>

      <div className="flex flex-col lg:flex-row h-[calc(100vh-32px)] min-h-0">
        {/* Sidebar Navigation */}
        <aside className="hidden sm:flex w-16 flex-shrink-0 border-r border-slate-800 flex-col items-center py-6 gap-8">
          <div className="w-10 h-10 rounded-xl bg-indigo-600 flex items-center justify-center shadow-lg shadow-indigo-600/20">
            <LayoutDashboard className="w-6 h-6 text-white" />
          </div>
          <nav className="flex flex-col gap-6">
            <button className="p-2 text-slate-500 hover:text-indigo-400 transition-colors">
              <Search className="w-5 h-5" />
            </button>
            <button className="p-2 text-slate-500 hover:text-indigo-400 transition-colors">
              <Bell className="w-5 h-5" />
            </button>
            <button className="p-2 text-slate-500 hover:text-indigo-400 transition-colors">
              <User className="w-5 h-5" />
            </button>
          </nav>
          <div className="mt-auto">
            <button className="p-2 text-slate-500 hover:text-indigo-400 transition-colors">
              <Settings className="w-5 h-5" />
            </button>
          </div>
        </aside>

        {/* Main Content Area */}
        <main className="flex-grow flex flex-col lg:flex-row min-w-0 overflow-hidden">
          {/* Left Side: Business Selector */}
          <section className="w-full lg:w-1/2 flex flex-col items-center justify-center border-r border-slate-800 relative bg-[radial-gradient(circle_at_center,_rgba(99,102,241,0.03)_0%,_transparent_70%)] min-h-0 overflow-y-auto">
            <div className="absolute top-6 left-4 sm:top-12 sm:left-12">
              <h1 className="text-2xl sm:text-3xl font-bold tracking-tighter text-white">
                Business<span className="text-indigo-500">Hub</span>
              </h1>
              <p className="text-[10px] sm:text-xs text-slate-500 mt-1 uppercase tracking-widest font-medium">Strategic Operations Center</p>
            </div>
            
            <HubRadial
              nodes={hubNodes}
              selectedId={selectedId}
              selectedSourceType={selectedSourceType}
              onSelect={handleSelectNode}
              loading={hubNodesLoading}
              error={hubNodesError}
            />

            <div className="mt-6 sm:mt-8 w-full max-w-sm px-4 sm:px-0 space-y-4">
              <div className="flex rounded-lg bg-slate-900/50 border border-slate-800 p-1">
                <button
                  type="button"
                  onClick={() => setCreateType('business')}
                  className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-md text-sm font-medium transition-colors ${createType === 'business' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-slate-200'}`}
                >
                  <Briefcase className="w-4 h-4" /> Add Business
                </button>
                <button
                  type="button"
                  onClick={() => setCreateType('zap')}
                  className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-md text-sm font-medium transition-colors ${createType === 'zap' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-slate-200'}`}
                >
                  <Zap className="w-4 h-4" /> Add Zap
                </button>
              </div>
              {createType === 'business' ? (
                <BusinessForm onSuccess={refreshHubNodes} />
              ) : (
                <AddZapFlow onZapCreated={refreshHubNodes} />
              )}
            </div>

            <div className="absolute bottom-6 sm:bottom-12 text-center left-0 right-0">
              <p className="text-[10px] text-slate-600 uppercase tracking-[0.2em] font-bold">Select Node to Inspect</p>
            </div>
          </section>

          {/* Right Side: Details Panel */}
          <section className="w-full lg:w-1/2 min-w-0 overflow-y-auto bg-[#0d0d0f] p-4 sm:p-6 md:p-8 lg:p-12">
            {!selectedId && hubNodes.length === 0 && !hubNodesLoading ? (
              <div className="flex flex-col items-center justify-center min-h-[200px] text-center p-6 rounded-xl bg-slate-900/50 border border-slate-800">
                <p className="text-sm text-slate-500">Add a Business or Zap to get started.</p>
                <p className="text-xs text-slate-600 mt-2">Select from the radial Hub or use the forms below.</p>
              </div>
            ) : selectedId && selectedSourceType ? (
              <AnimatePresence mode="wait">
                <motion.div
                  key={`${selectedSourceType}-${selectedId}`}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  transition={{ duration: 0.3, ease: "easeOut" }}
                  className="min-w-0"
                >
                  <header className="mb-6 sm:mb-8 md:mb-10">
                    <div className="flex flex-wrap items-center gap-2 sm:gap-3 mb-2">
                      <span className={`text-[10px] font-bold uppercase tracking-widest px-2 py-0.5 rounded border ${
                        selectedSourceType === 'zap'
                          ? 'border-amber-500/50 text-amber-400 bg-amber-500/5'
                          : selectedBusiness?.status === 'at-risk'
                            ? 'border-rose-500/50 text-rose-400 bg-rose-500/5'
                            : selectedBusiness?.status === 'active'
                              ? 'border-emerald-500/50 text-emerald-400 bg-emerald-500/5'
                              : 'border-slate-500/50 text-slate-400 bg-slate-500/5'
                      }`}>
                        {selectedSourceType === 'zap' ? 'Zap' : (selectedBusiness?.status ?? '—')}
                      </span>
                      <span className="text-[10px] text-slate-600 font-mono">ID: {selectedId}</span>
                      <div className="flex items-center gap-1.5 ml-auto">
                        <Cpu className="w-3.5 h-3.5 text-slate-500" />
                        <select
                          value={aiModel}
                          onChange={(e) => setAiModel(e.target.value as AIModel)}
                          className="text-[10px] font-medium uppercase tracking-wider bg-slate-800 border border-slate-600 text-slate-300 rounded px-2 py-1 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                          aria-label="AI model"
                        >
                          <option value="gemini">Gemini</option>
                          <option value="openai">OpenAI</option>
                        </select>
                      </div>
                    </div>
                    <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold text-white tracking-tight break-words">
                      {selectedSourceType === 'zap' ? selectedZap?.name ?? selectedId : selectedBusiness?.name ?? selectedId}
                    </h2>
                  </header>

                  <div className="grid gap-6 sm:gap-8 min-w-0">
                    {selectedSourceType === 'business' && selectedBusiness && (
                      <>
                        <TaskList
                          businessId={selectedId}
                          tasks={selectedBusiness.tasks}
                          onTasksRefresh={refreshHubNodes}
                          aiModel={aiModel}
                        />
                        <AISuggestions suggestions={suggestions} />
                      </>
                    )}
                    {selectedSourceType === 'zap' && selectedZap && (
                      <ZapDetailPanel zap={selectedZap} aiModel={aiModel} />
                    )}
                    <AnalysisDisplay
                      nodeId={selectedId}
                      sourceType={selectedSourceType}
                      businessId={selectedSourceType === 'business' ? selectedId : undefined}
                      zapId={selectedSourceType === 'zap' ? selectedId : undefined}
                      businessType={selectedBusiness?.businessType}
                      aiModel={aiModel}
                    />
                  </div>
                </motion.div>
              </AnimatePresence>
            ) : (
              <div className="flex flex-col items-center justify-center min-h-[200px] text-center p-6 rounded-xl bg-slate-900/50 border border-slate-800">
                <p className="text-sm text-slate-500">Select a node from the Hub to view details and run analysis.</p>
              </div>
            )}
          </section>
        </main>
      </div>
    </div>
  );
}
