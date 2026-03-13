import { Router } from 'express';
import { getBusinessById, getZapById } from '../store.js';

/** Build analysis-ready payload (tasks + recommendations) from a business. */
function businessToAnalysisPayload(business) {
  const tasks = (business.tasks || []).map((t) => ({
    id: t.id,
    title: t.title,
    status: t.status || 'pending',
    priority: t.priority || 'medium',
    dueDate: t.dueDate || new Date().toISOString().slice(0, 10),
  }));
  return {
    tasks,
    recommendations: [
      business.business_type ? `Business type "${business.business_type}" is factored into recommendations.` : 'Configure Gemini/OpenAI in server for full analysis.',
    ],
    extractionMetadata: { confidence: 0.8, warnings: [] },
  };
}

/** Build analysis-ready payload from a Zap (normalize trigger/action into tasks + recommendations). */
function zapToAnalysisPayload(zap) {
  const tasks = [];
  const triggerKey = zap.triggerConfig && typeof zap.triggerConfig === 'object' && zap.triggerConfig.key;
  const actionKey = zap.actionConfig && typeof zap.actionConfig === 'object' && zap.actionConfig.key;
  if (triggerKey) {
    tasks.push({
      id: `zap-trigger-${zap.id}`,
      title: `Trigger: ${triggerKey}`,
      status: 'pending',
      priority: 'medium',
      dueDate: new Date().toISOString().slice(0, 10),
    });
  }
  if (actionKey) {
    tasks.push({
      id: `zap-action-${zap.id}`,
      title: `Action: ${actionKey}`,
      status: 'pending',
      priority: 'medium',
      dueDate: new Date().toISOString().slice(0, 10),
    });
  }
  if (tasks.length === 0) {
    tasks.push({
      id: `zap-${zap.id}`,
      title: `Zap: ${zap.name}`,
      status: 'pending',
      priority: 'medium',
      dueDate: new Date().toISOString().slice(0, 10),
    });
  }
  return {
    tasks,
    recommendations: [
      `Zap "${zap.name}" is connected. Run AI analysis for task suggestions.`,
      'Configure Gemini/OpenAI in server for full analysis of Zap data.',
    ],
    extractionMetadata: { confidence: 0.7, warnings: [] },
  };
}

export const analyzeRouter = Router();

analyzeRouter.post('/', (req, res) => {
  try {
    const body = req.body || {};
    const businessId = body.businessId?.trim();
    const zapId = body.zapId?.trim();

    if (businessId) {
      const business = getBusinessById(businessId);
      if (!business) {
        res.status(404).json({ error: 'Business not found' });
        return;
      }
      return res.json(businessToAnalysisPayload(business));
    }

    if (zapId) {
      const zap = getZapById(zapId);
      if (!zap) {
        res.status(404).json({ error: 'Zap not found' });
        return;
      }
      return res.json(zapToAnalysisPayload(zap));
    }

    res.status(400).json({ error: 'Either businessId or zapId is required' });
  } catch (err) {
    res.status(500).json({ error: 'Analysis failed' });
  }
});
