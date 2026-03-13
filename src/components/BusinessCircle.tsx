import React from 'react';
import { motion } from 'motion/react';
import { Briefcase, Zap, AlertCircle, Clock, CheckCircle2 } from 'lucide-react';
import type { HubNode, HubNodeSourceType } from '../types';

export interface HubRadialProps {
  /** Normalized nodes (businesses + zaps) to show around the Hub */
  nodes: HubNode[];
  selectedId: string | null;
  selectedSourceType: HubNodeSourceType | null;
  onSelect: (id: string, sourceType: HubNodeSourceType) => void;
  /** Optional: loading state */
  loading?: boolean;
  /** Optional: error message */
  error?: string | null;
}

const getNodeStatusColor = (status?: string) => {
  if (!status) return 'text-slate-500 border-slate-500/30 bg-slate-500/5';
  switch (status) {
    case 'active': return 'text-emerald-500 border-emerald-500/30 bg-emerald-500/5';
    case 'at-risk': return 'text-rose-500 border-rose-500/30 bg-rose-500/5';
    case 'pending': return 'text-amber-500 border-amber-500/30 bg-amber-500/5';
    case 'completed': return 'text-blue-500 border-blue-500/30 bg-blue-500/5';
    default: return 'text-slate-500 border-slate-500/30 bg-slate-500/5';
  }
};

const getNodeStatusIcon = (status?: string) => {
  switch (status) {
    case 'active': return <Clock className="w-4 h-4" />;
    case 'at-risk': return <AlertCircle className="w-4 h-4" />;
    case 'pending': return <Clock className="w-4 h-4" />;
    case 'completed': return <CheckCircle2 className="w-4 h-4" />;
    default: return <Clock className="w-4 h-4" />;
  }
};

export const HubRadial: React.FC<HubRadialProps> = ({
  nodes,
  selectedId,
  selectedSourceType,
  onSelect,
  loading = false,
  error = null,
}) => {
  const radius = 160;
  const centerX = 200;
  const centerY = 200;
  const itemSize = 40;

  if (error) {
    return (
      <div className="relative w-[400px] h-[400px] flex items-center justify-center">
        <div className="text-center p-4 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-sm max-w-[320px]">
          {error}
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="relative w-[400px] h-[400px] flex items-center justify-center">
        <div className="w-24 h-24 rounded-full bg-slate-900 border border-slate-700 flex items-center justify-center animate-pulse">
          <span className="text-[10px] uppercase tracking-widest text-slate-500">Loading…</span>
        </div>
      </div>
    );
  }

  return (
    <div className="relative w-[400px] h-[400px] flex items-center justify-center">
      {/* Central Hub Node */}
      <div className="absolute z-10 w-24 h-24 rounded-full bg-slate-900 border border-slate-700 flex items-center justify-center shadow-2xl shadow-indigo-500/20">
        <div className="text-center">
          <Briefcase className="w-8 h-8 text-indigo-400 mx-auto mb-1" />
          <span className="text-[10px] uppercase tracking-widest text-slate-400 font-bold">Hub</span>
        </div>
      </div>

      {/* Radial nodes (Business + Zap) */}
      {nodes.map((node, index) => {
        const angle = (index / Math.max(nodes.length, 1)) * 2 * Math.PI - Math.PI / 2;
        const x = centerX + radius * Math.cos(angle) - itemSize;
        const y = centerY + radius * Math.sin(angle) - itemSize;
        const isSelected = selectedId === node.id && selectedSourceType === node.sourceType;
        const isBusiness = node.sourceType === 'business';
        const isZap = node.sourceType === 'zap';

        return (
          <motion.button
            key={`${node.sourceType}-${node.id}`}
            onClick={() => onSelect(node.id, node.sourceType)}
            initial={false}
            animate={{
              scale: isSelected ? 1.1 : 1,
              x,
              y,
            }}
            whileHover={{ scale: 1.15 }}
            className={`absolute w-20 h-20 rounded-2xl border flex flex-col items-center justify-center p-2 transition-colors cursor-pointer ${
              isSelected
                ? 'bg-slate-800 border-indigo-500 shadow-lg shadow-indigo-500/20'
                : isZap
                  ? 'bg-slate-900/50 border-amber-500/40 hover:border-amber-500/60'
                  : 'bg-slate-900/50 border-slate-800 hover:border-slate-600'
            }`}
            title={node.description ? `${node.title}: ${node.description}` : node.title}
          >
            <div className={`mb-1 flex items-center justify-center ${getNodeStatusColor(node.status).split(' ')[0]}`}>
              {isZap ? <Zap className="w-4 h-4 text-amber-400" /> : getNodeStatusIcon(node.status)}
            </div>
            <span className="text-[9px] font-medium text-slate-200 text-center leading-tight line-clamp-2">
              {node.title}
            </span>
            <span className="text-[8px] text-slate-500 uppercase mt-0.5">
              {isBusiness ? 'Business' : 'Zap'}
            </span>
          </motion.button>
        );
      })}

      {/* Connecting lines */}
      <svg className="absolute inset-0 w-full h-full pointer-events-none opacity-20">
        {nodes.map((_, index) => {
          const angle = (index / Math.max(nodes.length, 1)) * 2 * Math.PI - Math.PI / 2;
          const x2 = centerX + (radius - itemSize) * Math.cos(angle);
          const y2 = centerY + (radius - itemSize) * Math.sin(angle);
          return (
            <line
              key={index}
              x1={centerX}
              y1={centerY}
              x2={x2}
              y2={y2}
              stroke="currentColor"
              className="text-slate-500"
              strokeWidth="1"
              strokeDasharray="4 4"
            />
          );
        })}
      </svg>
    </div>
  );
};

/** Legacy alias: accepts businesses and maps to HubNode for backward compatibility */
import type { Business } from '../types';

interface BusinessCircleProps {
  businesses: Business[];
  selectedId: string;
  onSelect: (id: string) => void;
}

function businessToHubNode(b: Business): HubNode {
  return {
    id: b.id,
    sourceType: 'business',
    title: b.name,
    description: b.businessType ? `Type: ${b.businessType}` : undefined,
    status: b.status,
    rawData: b,
    normalizedData: { name: b.name, status: b.status, taskCount: b.tasks?.length ?? 0 },
    analysisReady: true,
  };
}

export const BusinessCircle: React.FC<BusinessCircleProps> = ({ businesses, selectedId, onSelect }) => {
  const nodes = businesses.map(businessToHubNode);
  return (
    <HubRadial
      nodes={nodes}
      selectedId={selectedId || null}
      selectedSourceType="business"
      onSelect={(id) => onSelect(id)}
    />
  );
};
