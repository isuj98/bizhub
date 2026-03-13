import { Business } from './types';

export const mockBusinesses: Business[] = [
  {
    id: '1',
    name: 'Quantum Systems',
    status: 'active',
    businessType: 'SaaS',
    tasks: [
      { id: 't1', title: 'Finalize Q3 Report', status: 'working-by-human', priority: 'high', dueDate: '2026-03-05' },
      { id: 't2', title: 'Client Onboarding', status: 'pending', priority: 'medium', dueDate: '2026-03-10' },
      { id: 't3', title: 'Security Audit', status: 'done', priority: 'high', dueDate: '2026-02-28' },
    ],
  },
  {
    id: '2',
    name: 'Nexus Logistics',
    status: 'at-risk',
    businessType: 'Logistics',
    tasks: [
      { id: 't4', title: 'Route Optimization', status: 'pending', priority: 'high', dueDate: '2026-02-20' },
      { id: 't5', title: 'Warehouse Expansion', status: 'working-by-human', priority: 'medium', dueDate: '2026-04-15' },
      { id: 't6', title: 'Vendor Contract Renewal', status: 'on-hold', priority: 'high', dueDate: '2026-02-25' },
    ],
  },
  {
    id: '3',
    name: 'Solaris Energy',
    status: 'pending',
    businessType: 'Energy',
    tasks: [
      { id: 't7', title: 'Grid Integration Study', status: 'pending', priority: 'low', dueDate: '2026-05-01' },
      { id: 't8', title: 'Panel Efficiency Test', status: 'done', priority: 'medium', dueDate: '2026-02-15' },
    ],
  },
  {
    id: '4',
    name: 'Aether BioTech',
    status: 'completed',
    businessType: 'Healthcare / Biotech',
    tasks: [
      { id: 't9', title: 'FDA Submission', status: 'done', priority: 'high', dueDate: '2026-01-10' },
      { id: 't10', title: 'Clinical Trial Phase II', status: 'done', priority: 'high', dueDate: '2025-12-20' },
    ],
  },
  {
    id: '5',
    name: 'Vortex Media',
    status: 'active',
    businessType: 'Media / Marketing',
    tasks: [
      { id: 't11', title: 'Campaign Launch', status: 'working-by-ai', priority: 'high', dueDate: '2026-03-15' },
      { id: 't12', title: 'Asset Creation', status: 'done', priority: 'medium', dueDate: '2026-02-28' },
    ],
  },
];
