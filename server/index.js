import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import { businessesRouter } from './routes/businesses.js';
import { analyzeRouter } from './routes/analyze.js';
import { hubRouter } from './routes/hub.js';
import { zapsRouter } from './routes/zaps.js';
import { zapierRouter } from './routes/zapier.js';

const app = express();
const PORT = process.env.PORT ?? 5001;

app.use(cors());
app.use(express.json());

app.use('/api/businesses', businessesRouter);
app.use('/api/analyze', analyzeRouter);
app.use('/api/hub', hubRouter);
app.use('/api/zaps', zapsRouter);
app.use('/zapier', zapierRouter);

app.get('/health', (_req, res) => {
  res.json({ ok: true });
});

app.listen(PORT, () => {
  console.log(`BusinessHub API running at http://localhost:${PORT}`);
});
