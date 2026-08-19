import app from './app.js';
import { env } from './config/env.js';
import { pool } from './config/db.js';

// Vercel imports the Express app as a serverless handler. Local development and
// traditional Node hosting still use the same source through this listener.
if (!process.env.VERCEL) {
  const server = app.listen(env.PORT, env.HOST, () => {
    console.log(`Home Health API listening on http://${env.HOST}:${env.PORT}`);
  });

  let shuttingDown = false;
  async function shutdown(signal: string) {
    if (shuttingDown) return;
    shuttingDown = true;
    console.log(`${signal} received; shutting down.`);
    server.close(async () => {
      try { await pool.end(); }
      finally { process.exit(0); }
    });
    setTimeout(() => process.exit(1), 10_000).unref();
  }
  process.once('SIGTERM', () => void shutdown('SIGTERM'));
  process.once('SIGINT', () => void shutdown('SIGINT'));
}

export default app;
