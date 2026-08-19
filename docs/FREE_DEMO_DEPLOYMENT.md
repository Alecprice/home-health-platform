# Free synthetic-data demo deployment

This environment is for product development and demonstrations only. Do not enter real patient PHI.

## Architecture

- `web/`: Vite/React project deployed to Vercel.
- `api/`: Express project deployed separately to Vercel.
- Neon Postgres: synthetic-only shared development database.
- Android: Capacitor build remains a separate test lane through Android Studio / Firebase Test Lab.

Keeping web and API as separate Vercel projects avoids restructuring the Android-oriented monorepo around a hosting provider.

## API Vercel project

Use `api/` as the Vercel project root. Framework: Express. Configure these environment variables in Preview and Development initially:

- `DATABASE_URL`: pooled Neon connection using a dedicated non-owner runtime role.
- `DB_POOL_MAX=3`
- `CORS_ORIGINS`: exact deployed web origin plus local development origins as needed.
- `DEMO_MODE=true`
- `DEMO_AGENCY_ID`: UUID of the synthetic demo agency.
- `DEMO_USER_ID`: UUID of the synthetic demo clinician.

Do not expose `MIGRATION_DATABASE_URL` to the running application unless a deliberate migration job needs it.

Health checks:

- `/api/health` — process health.
- `/api/ready` — database reachability.
- `/api/demo/database-status` — synthetic tenant-scoped counts using RLS.

## Web Vercel project

Use `web/` as the project root. Framework: Vite. Configure:

- `VITE_API_BASE_URL=https://<api-project>.vercel.app/api`
- `VITE_DEMO_MODE=true`
- `VITE_DEMO_TOOLS=true`

`web/vercel.json` includes the SPA fallback needed for React Router deep links.

## What the hosted demo proves

It can prove the React UI builds/serves, the Express API executes in a serverless environment, Neon is reachable, and tenant-scoped database queries work. It does not prove native Android microphone/scanner/GPS behavior.

## Native test lane

1. Run `./scripts/bootstrap-android.sh`.
2. Test with Android Studio's Pixel Tablet emulator.
3. Run `npm run android:test` after Gradle/SDK setup.
4. Optionally upload the APK to Firebase Test Lab for device-matrix regression testing.

## Security boundary

The free demo must remain synthetic-only. Production PHI requires a separate reviewed production environment, appropriate BAAs/agreements, hardened auth/session handling, encrypted durable document storage, operational controls, backups, monitoring, incident response, and formal risk analysis.
