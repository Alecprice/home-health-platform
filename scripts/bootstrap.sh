#!/usr/bin/env bash
set -euo pipefail
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"
[ -f .env ] || cp .env.example .env
npm install
npm run verify
printf '\nDependencies installed.\n'
printf 'Browser demo: npm run dev:web\n'
printf 'Optional local API/database: docker compose up -d postgres && npm run db:migrate && npm run dev:api\n'
printf 'Tests: npm test (logic) and npm run db:test (requires Docker)\n'
