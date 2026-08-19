import express, { type NextFunction, type Request, type Response } from 'express';
import cors from 'cors';
import { env } from './config/env.js';
import { pool } from './config/db.js';
import { healthRouter } from './routes/health.js';
import { demoRouter } from './routes/demo.js';

export const app = express();

app.disable('x-powered-by');
app.set('trust proxy', 1);
app.use(cors({
  origin(origin, callback) {
    if (!origin || env.CORS_ORIGINS.includes(origin)) return callback(null, true);
    return callback(new Error('CORS origin denied'));
  }
}));
app.use(express.json({ limit: '2mb', strict: true }));
app.use((_req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('Referrer-Policy', 'no-referrer');
  res.setHeader('Cache-Control', 'no-store');
  res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
  next();
});

app.use('/api/health', healthRouter);
app.use('/api/demo', demoRouter);
app.get('/api/ready', async (_req, res) => {
  try {
    await pool.query('SELECT 1');
    res.json({ ok: true, database: true });
  } catch {
    res.status(503).json({ ok: false, database: false });
  }
});
app.use((_req, res) => res.status(404).json({ error: 'not_found' }));
app.use((error: unknown, _req: Request, res: Response, _next: NextFunction) => {
  const httpError = error as { status?: number; type?: string; message?: string };
  if (httpError.status === 413 || httpError.type === 'entity.too.large') return res.status(413).json({ error: 'payload_too_large' });
  if (error instanceof SyntaxError || httpError.type === 'entity.parse.failed') return res.status(400).json({ error: 'invalid_json' });
  if (error instanceof Error && error.message === 'CORS origin denied') return res.status(403).json({ error: 'cors_denied' });
  console.error('Unhandled request error type:', error instanceof Error ? error.name : 'unknown');
  return res.status(500).json({ error: 'internal_error' });
});

export default app;
