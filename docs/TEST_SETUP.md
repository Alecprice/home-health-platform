# Synthetic Test Setup

This project is currently configured for development and synthetic testing only. Do not enter real patient information or PHI into the GitHub/Vercel/Neon test environment.

## Existing test services

- Web project: `home-health-platform-demo`
- API project: `home-health-platform-api`
- Neon project: `home-health-platform-demo`
- GitHub repository: `Alecprice/home-health-platform`
- Production branch for test deploys: `main`

## Connect GitHub to Vercel

Use the existing repository for both Vercel projects.

### Web project

1. Open Vercel project `home-health-platform-demo`.
2. In **Settings → Git**, connect `Alecprice/home-health-platform`.
3. Use `main` as the production branch.
4. In project settings, set **Root Directory** to `web`.
5. Keep the framework preset as **Vite**.

### API project

1. Open Vercel project `home-health-platform-api`.
2. In **Settings → Git**, connect `Alecprice/home-health-platform`.
3. Use `main` as the production branch.
4. In project settings, set **Root Directory** to `api`.
5. Keep the framework preset as **Express**.

## Vercel test environment variables

### API project

Set these for **Production** and **Preview**:

```text
DATABASE_URL=<Neon pooled connection string for home-health-platform-demo>
CORS_ORIGINS=https://home-health-platform-demo.vercel.app
DEMO_MODE=true
DEMO_AGENCY_ID=11111111-1111-4111-8111-111111111111
DEMO_USER_ID=11111111-aaaa-4aaa-8aaa-111111111111
DB_POOL_MAX=3
```

`MIGRATION_DATABASE_URL` is not required for the normal Vercel API runtime. Migrations should be run deliberately from a trusted development/admin environment rather than automatically during every deployment.

### Web project

Set these for **Production** and **Preview**:

```text
VITE_API_BASE_URL=https://home-health-platform-api.vercel.app/api
VITE_DEMO_MODE=true
VITE_DEMO_TOOLS=true
```

## Important correction

The API source reads `DEMO_MODE`. It does **not** use `APP_ENV=synthetic-demo` for enabling the synthetic database-status route.

## Expected verification

After the Git connection and environment variables are saved, redeploy both projects or push a harmless commit to `main`.

Verify:

1. `https://home-health-platform-api.vercel.app/api/health` returns a healthy API response.
2. `https://home-health-platform-api.vercel.app/api/ready` reports database connectivity.
3. `https://home-health-platform-api.vercel.app/api/demo/database-status` reports the seeded synthetic database counts.
4. `https://home-health-platform-demo.vercel.app/` loads the web app.
5. Refresh a nested React route to confirm the Vite SPA rewrite works.
6. GitHub Actions `Verify` passes for the source commit.

## Local-only alternative

If Vercel Git integration is not needed for a test session, the repo can also be run locally with the root `.env` based on `.env.example`, the API on port 3001, and the Vite web app on port 5173.
