# Live demo verification checklist

Use only synthetic data.

## Neon / Postgres

- Schema migrations 001-010 apply in order.
- Runtime role is not a superuser and does not bypass RLS.
- Querying a tenant table without `app.current_agency_id` returns no tenant rows.
- With Agency A selected, Agency B rows are not visible.
- An Agency A session cannot insert/update an Agency B row.
- EVV chronology trigger rejects check-out before check-in and late check-in after check-out.
- Finalized-note mutation and audit/EVV update/delete attempts are rejected.

## API

- `GET /api/health` => 200.
- `GET /api/ready` => 200 when Neon is reachable.
- `GET /api/demo/capabilities` => synthetic/demo capabilities.
- `GET /api/demo/database-status` => 200 only when demo mode and demo tenant/user IDs are configured.
- Unknown routes => JSON 404.
- Invalid JSON => 400 without stack/PHI leakage.
- Oversized payload => 413.
- CORS rejects an origin not in the allowlist.

## Web

- Dashboard loads on `/`.
- Deep links such as `/patients/p-001` survive direct refresh on Vercel.
- Hosted database-status card shows connected when API/Neon are reachable.
- If API is unavailable, local synthetic demo remains usable and clearly says local demo mode.
- Workflow Lab remains visible only when demo tools are enabled.

## Android lane

A green Vercel demo does not prove native behavior. Separately verify APK build, runtime permissions, GPS, speech, ML Kit scanning/OCR, process death/recovery, offline storage, and rotation on Android.
