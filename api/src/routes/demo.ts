import { Router } from 'express';
import { env } from '../config/env.js';
import { withTenantClient } from '../config/db.js';

export const demoRouter = Router();

demoRouter.get('/capabilities', (_req, res) => {
  res.json({
    offlineCharting: 'device-local-drafts',
    voiceAssist: 'android-on-device-when-supported',
    documentOcr: 'android-ml-kit-scan-and-ocr',
    evvCapture: 'android-device-location',
    clinicianReviewRequired: true,
    realPhiAllowed: false
  });
});

demoRouter.get('/database-status', async (_req, res) => {
  if (!env.DEMO_MODE || !env.DEMO_AGENCY_ID || !env.DEMO_USER_ID) {
    return res.status(404).json({ error: 'demo_database_status_disabled' });
  }
  try {
    const result = await withTenantClient(env.DEMO_AGENCY_ID, async client => {
      const patients = await client.query<{ count: string }>('SELECT count(*)::text AS count FROM patients');
      const visits = await client.query<{ count: string }>('SELECT count(*)::text AS count FROM visits');
      const medications = await client.query<{ count: string }>('SELECT count(*)::text AS count FROM medications');
      return {
        patients: Number(patients.rows[0]?.count ?? 0),
        visits: Number(visits.rows[0]?.count ?? 0),
        medications: Number(medications.rows[0]?.count ?? 0)
      };
    }, env.DEMO_USER_ID);
    return res.json({
      ok: true,
      syntheticOnly: true,
      tenantIsolation: 'database-row-level-security',
      ...result
    });
  } catch (error) {
    console.error('Synthetic demo database status failed:', error instanceof Error ? error.name : 'unknown');
    return res.status(503).json({ ok: false, database: false });
  }
});
