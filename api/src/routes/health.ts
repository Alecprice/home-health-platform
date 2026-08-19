import { Router } from 'express';
import { env } from '../config/env.js';
export const healthRouter = Router();
healthRouter.get('/', (_req, res) => res.json({
  ok: true,
  service: 'home-health-api',
  mode: env.DEMO_MODE ? 'synthetic-demo' : 'development'
}));
