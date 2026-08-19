import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { z } from 'zod';

// Both source (api/src/config) and compiled output (api/dist/config) are three
// levels below the project root. Load the shared root .env deliberately so
// workspace cwd differences cannot make configuration silently disappear.
const here = path.dirname(fileURLToPath(import.meta.url));
const rootEnvPath = path.resolve(here, '../../../.env');
if (fs.existsSync(rootEnvPath)) {
  try { process.loadEnvFile(rootEnvPath); } catch (error) {
    throw new Error(`Unable to load ${rootEnvPath}: ${error instanceof Error ? error.message : String(error)}`);
  }
}

const schema = z.object({
  PORT: z.coerce.number().int().min(1).max(65535).default(3001),
  HOST: z.string().min(1).default('127.0.0.1'),
  DATABASE_URL: z.string().url().default('postgres://homehealth_app:homehealth_app@127.0.0.1:5432/homehealth'),
  MIGRATION_DATABASE_URL: z.string().url().default('postgres://homehealth_admin:homehealth_admin@127.0.0.1:5432/homehealth'),
  CORS_ORIGINS: z.string().default('http://localhost:5173,http://localhost,capacitor://localhost'),
  DEMO_MODE: z.enum(['true','false']).default('false'),
  DEMO_AGENCY_ID: z.string().uuid().optional(),
  DEMO_USER_ID: z.string().uuid().optional(),
  DB_POOL_MAX: z.coerce.number().int().min(1).max(10).default(3)
});

const parsed = schema.parse(process.env);
export const env = {
  ...parsed,
  CORS_ORIGINS: parsed.CORS_ORIGINS.split(',').map(value => value.trim()).filter(Boolean),
  DEMO_MODE: parsed.DEMO_MODE === 'true'
};
