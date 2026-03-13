import { Router } from 'express';
import { getHubNodes } from '../store.js';

export const hubRouter = Router();

hubRouter.get('/nodes', (_req, res) => {
  try {
    const nodes = getHubNodes();
    res.json(nodes);
  } catch (err) {
    res.status(500).json({ error: 'Failed to load hub nodes' });
  }
});
