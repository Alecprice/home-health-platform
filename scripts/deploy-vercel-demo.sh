#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

if ! command -v npx >/dev/null 2>&1; then
  echo "npx is required (Node 22 recommended)." >&2
  exit 1
fi

cat <<'MSG'
This deploys SYNTHETIC-DEMO infrastructure only.
Never paste real patient PHI into this environment.

Before running, configure the API project's Vercel environment variables:
  DATABASE_URL
  DB_POOL_MAX=3
  CORS_ORIGINS
  DEMO_MODE=true
  DEMO_AGENCY_ID
  DEMO_USER_ID

Then configure the web project:
  VITE_API_BASE_URL=https://<api-project>.vercel.app/api
  VITE_DEMO_MODE=true
  VITE_DEMO_TOOLS=true
MSG

read -r -p "Deploy API project now? [y/N] " reply
if [[ "$reply" =~ ^[Yy]$ ]]; then
  npx --yes vercel@latest --cwd api
fi

read -r -p "Deploy web project now? [y/N] " reply
if [[ "$reply" =~ ^[Yy]$ ]]; then
  npx --yes vercel@latest --cwd web
fi
