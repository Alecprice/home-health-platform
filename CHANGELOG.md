## 0.7.1 — Vercel build verification

- Fixed the web TypeScript build gate exposed by the first real Vercel compile.
- App and Vite/Capacitor TypeScript configs are now typechecked separately with `--noEmit`.
- Verified a production Vite build on Vercel with TypeScript checks passing.
- Live synthetic demo/API deployment remains for development testing only; no real PHI.

# v0.7.0 — Free hosted demo lane

- Added Vercel-ready split deployment for `web/` (Vite) and `api/` (Express).
- Refactored Express so Vercel can import the app without starting a long-running listener.
- Added synthetic-only `/api/demo/database-status` using the normal tenant-scoped RLS database path.
- Added dashboard infrastructure status with local-demo fallback.
- Added Vercel SPA deep-link rewrite configuration.
- Added serverless-conscious database pool sizing.
- Added free-demo deployment and Firebase Test Lab guidance.
- Added GitHub verification workflow and Vercel deployment helper.
- Live Neon development database was migrated through 010 and seeded with synthetic multi-tenant test data; RLS isolation/adversarial checks passed.

# v0.6.0 — Clinical Context & Discipline Workflow

- Added medication, POC, orders, goals, prior-note/trend, and wound demo modules.
- Added required clinical-context review step before charting.
- Added reusable RN/PT/OT/SLP/Aide/MSW structured assessment engine.
- Added distinct interventions, education, response-to-care, and next-visit/follow-up note sections.
- Added QA review queue prototype and persisted QA states.
- Added Postgres clinical-context tables with RLS, append-only wound measurements/QA/signature evidence, reviewer-role enforcement, and author-bound signature attestations.
- Added versioned assessment-instance/OASIS-E2-ready schema; full official OASIS item/spec implementation remains a pilot gate.
- Restored missing native Android Clinical Assist Java sources found absent from the v0.5 archive.

# Changelog

## v0.5.0 — Clinician workflow, cognitive-load and patient-safety pass

- made configured workflow versions drive the actual visit screen instead of only the visual workflow rail
- hid Workflow Lab/standalone Assist testing from routine clinician navigation unless demo tools are explicitly enabled
- added sticky patient/encounter/allergy safety context and explicit two-identifier confirmation
- added explicit allergy states (`known`, `nkda`, `not-reviewed`) so an empty list never silently means NKDA
- added wrong-patient OCR MRN/DOB blocking and removed default-selected automation suggestions
- replaced ambiguous online/completed states with truthful network and EVV progress language
- added final-review readiness for storage, identity, narrative, vitals, EVV chronology and patient-response transcription acknowledgement
- persisted patient-response speech-to-text acknowledgement in local draft and Postgres schema
- added EVV sequence guard at UI/readiness/database layers, including per-visit transaction serialization for concurrent device sync, while preserving valid out-of-order offline sync
- added patient search and per-visit links rather than choosing an arbitrary patient visit
- improved field-work explicit selection/validation and prevented conflicting manual/odometer mileage entry
- aligned persistent patient/note schema with UI fields and bounded operational text lengths
- expanded source/pure-logic safety gates and DB smoke-test scenarios
- added `docs/USABILITY_REVIEW.md` with low-cognitive-load and experienced-clinician findings plus explicit pilot blockers

## v0.4.0 — Full hardening and edge-case pass

- split migration-admin and non-superuser runtime DB roles so FORCE RLS is meaningful
- tenant-qualified foreign keys and stricter relational integrity
- immutable finalized notes plus separate, same-visit amendment records
- locked down EVV convenience columns; append-only EVV is the runtime write path
- version-definition immutability for workflow profiles
- migration checksums/drift detection and stronger DB smoke tests
- route/draft identity guard and serialized/autosaved local drafts
- StrictMode-safe workflow persistence and rapid-interaction race fixes
- speech start/stop serialization, timeout cancellation and stale callback guards
- Android process-death recovery initialized before React render
- sequential bounded OCR and explicit truncation reporting
- stronger field-work numeric limits, DOB/ICD extraction hardening and safer browser-speech gate
- API timeouts/body limits/error-detail reduction and environment-loading fixes
- repeatable `verify:source`, `verify`, and `verify:full` gates
- added `docs/HARDENING.md` with verified vs unverified test matrix

## v0.3.0 — Native field workflow pass

- real EVV GPS adapter with local append-only capture history
- official Capacitor Geolocation + Camera dependencies
- Android-only local Clinical Assist plugin
- on-device speech recognition with no generic network fallback
- separate clinician dictation and patient-response capture modes
- patient-response acknowledgement UI
- ML Kit document scanner integration
- bundled ML Kit Latin OCR for scanned pages
- Clinical Assist reviewed suggestion application to compatible vital fields
- receipt camera capture hook
- append-only Postgres EVV event migration
- reproducible Android patch/configure script
- updated mobile/compliance/architecture/roadmap docs
