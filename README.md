# Home Health Platform — Android-first clinician-usability hardened starter v0.6

Fresh React + TypeScript + Vite + Capacitor implementation for an Android-tablet home-health charting product. Earlier Ember documents were planning artifacts, not an existing application.

## Current synthetic-demo capabilities

- tablet-first patients, visits, charting and configurable Workflow Lab
- Dexie offline drafts, mileage/expense ledger, EVV capture history and Android recovery inbox
- GPS EVV check-in/out through Capacitor Geolocation
- clinician dictation and patient-response transcription through Android on-device `SpeechRecognizer`; generic network fallback is disabled
- patient-response acknowledgement gate
- ML Kit Document Scanner + bundled Latin OCR with sequential page processing and bounded OCR text
- reviewed deterministic suggestions for vitals, DOB, MRN and ICD-10-like values
- receipt photo capture through Capacitor Camera
- PostgreSQL schema/migrations with tenant RLS, tenant-qualified FKs, immutable finalized notes, separate amendments, append-only audit/EVV records, field work and versioned workflows
- repeatable source/pure-logic/database hardening checks

Read `docs/HARDENING.md` for technical hardening and `docs/USABILITY_REVIEW.md` for the low-cognitive-load and experienced-clinician workflow review.

## Free local start

```bash
unzip home-health-platform-v0.6-clinical-context.zip
cd home-health-platform
./scripts/bootstrap.sh
npm run dev:web
```

Open `http://localhost:5173`. Keep `VITE_DEMO_MODE=true` and use synthetic data only.

## Verification

```bash
npm run verify          # source + typecheck + Vitest + production builds
npm run verify:full     # above + live Postgres RLS/integrity tests (Docker required)
npm run android:test    # Gradle debug APK compile after Android SDK setup
```

The first successful `npm install` will generate `package-lock.json`. Keep that lockfile in source control once generated.

## Android

Install Android Studio, then:

```bash
./scripts/bootstrap-android.sh
```

The script installs dependencies, runs verification/build, generates the Capacitor Android shell if needed, applies the idempotent native patch, syncs Capacitor, and opens Android Studio.

## Hard boundary

This is still a **synthetic-data development build**. Do not enter real PHI. Authentication/MFA, encrypted offline/document storage, production APIs/sync, complete audit coverage, BAA-covered hosting, backups, device policy, incident response, formal risk analysis and compliance/legal review remain pre-PHI work.

## v0.6 clinical-context layer

The demo now includes medication context, plan-of-care/orders/goals, recent-note trends, wound context, discipline-specific structured assessment forms, QA/correction states, and a version-aware OASIS-E2 integration boundary. See `docs/CLINICAL_MODULES.md`.

These modules are intentionally separate from finalized visit notes so source-of-truth clinical context can change over time without rewriting a legal note.

## Free hosted demo lane (v0.7)

The project can run as two Vercel projects (`web/` and `api/`) backed by a synthetic-only Neon Postgres database. See `docs/FREE_DEMO_DEPLOYMENT.md`. This does **not** authorize real PHI. Native Android GPS/speech/scanning still require the Android test lane.
