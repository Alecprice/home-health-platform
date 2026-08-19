# Project map

## Current implementation

- `web/` — React/TypeScript/Vite tablet client
- `web/src/features/` — dashboard, patients, charting, EVV, Clinical Assist, field work, Workflow Lab
- `web/src/native/` — replaceable device adapters for GPS, camera receipts, speech, scanner/OCR
- `web/src/offline/` — Dexie local persistence
- `native/android/app/` — Java templates for the local Capacitor Clinical Assist plugin and ML Kit scanner activity
- `scripts/configure_android.py` — reproducibly applies native integration to generated Capacitor Android project
- `api/` — Node/Express TypeScript API scaffold
- `database/migrations/` — Postgres domain, RLS/integrity, field work, workflow profiles, EVV events
- `docs/` — architecture/decisions/mobile/compliance/roadmap plus `HARDENING.md` verification report and `USABILITY_REVIEW.md` clinician/cognitive-load review

## Current demo path

Today's visits → patient/encounter confirmation → configurable visit workflow → EVV GPS → assessment/charting → Clinical Assist (dictation/patient response/document OCR with source verification) → reviewed suggestions → EVV check-out → completion review → local save → optional mileage/expenses.

## Important status

Source integration is implemented, but native Gradle compilation and physical-tablet behavior are the next required verification gate because the build environment used to assemble this ZIP could not complete npm dependency installation.

## v0.6 additions

The product now has a concrete clinical-context layer in the fresh React/Capacitor implementation: medication profile, active POC/orders/goals, prior-note trends, wound context, discipline-specific assessments, QA/correction state, signature-attestation database model, and an OASIS-E2-ready assessment boundary. These are demo/foundation modules; the original docs should not be interpreted as evidence that a production EHR exists.
