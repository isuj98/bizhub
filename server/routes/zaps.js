import { Router } from 'express';
import { getAllZaps, getZapById, createZap } from '../store.js';

export const zapsRouter = Router();

zapsRouter.get('/', (_req, res) => {
  try {
    const list = getAllZaps();
    res.json(list);
  } catch (err) {
    res.status(500).json({ error: 'Failed to list zaps' });
  }
});

zapsRouter.get('/:id', (req, res) => {
  try {
    const id = req.params.id?.trim();
    if (!id) {
      res.status(400).json({ error: 'Zap ID is required' });
      return;
    }
    const zap = getZapById(id);
    if (!zap) {
      res.status(404).json({ error: 'Zap not found' });
      return;
    }
    res.json(zap);
  } catch (err) {
    res.status(500).json({ error: 'Failed to get zap' });
  }
});

zapsRouter.post('/', (req, res) => {
  try {
    const body = req.body || {};
    const name = body.name?.trim();
    if (!name) {
      res.status(400).json({ error: 'name is required' });
      return;
    }
    const zap = createZap({
      name,
      triggerConfig: body.triggerConfig || {},
      actionConfig: body.actionConfig || {},
      zapierConnectionId: body.zapierConnectionId,
      zapierZapId: body.zapierZapId,
    });
    res.status(201).json(zap);
  } catch (err) {
    res.status(500).json({ error: 'Failed to create zap' });
  }
});
