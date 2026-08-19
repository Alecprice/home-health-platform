#!/usr/bin/env bash
set -euo pipefail
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"
if ! command -v docker >/dev/null 2>&1; then
  echo "Docker is required for the Postgres integration test." >&2
  exit 2
fi
docker compose up -d postgres
for _ in $(seq 1 30); do
  if docker compose exec -T postgres pg_isready -U homehealth_admin -d homehealth >/dev/null 2>&1; then break; fi
  sleep 1
done
npm run db:migrate
docker compose exec -T postgres psql -v ON_ERROR_STOP=1 -U homehealth_admin -d homehealth < database/tests/rls_and_integrity.sql
