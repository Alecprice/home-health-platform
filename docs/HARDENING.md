# v0.5 hardening & clinician-usability report

This pass treats the current source as a synthetic-data development product and stress-tests its invariants before more features are added. It does **not** certify the product for PHI or production use.

## High-severity findings fixed

1. **RLS could be bypassed in local development.** The application connection previously used the Postgres bootstrap superuser. Local Docker now creates a separate `homehealth_app` role with `NOSUPERUSER` and `NOBYPASSRLS`; migrations use the admin connection separately.
2. **Finalized-note immutability had an amendment escape path.** A signed note could previously be modified while changing status to `amended`. Finalized rows (`signed`, `locked`, `amended`) are now immutable on UPDATE and DELETE; amendments are separate linked rows.
3. **Amendments could link a clinically unrelated note.** Amendment targets must now be finalized and match tenant, patient, and visit.
4. **EVV convenience fields could be directly rewritten.** The runtime DB role no longer has direct INSERT/UPDATE rights to `visits.check_in_*` / `check_out_*`; append-only `evv_events` plus a constrained security-definer trigger are the only runtime path.
5. **Cross-tenant foreign-key relationships relied too heavily on RLS.** Tenant-qualified composite foreign keys now enforce parent/child agency consistency independently of query filtering.
6. **A chart route could briefly reuse the previous visit's draft during React route transitions.** Rendering and autosave now require draft/visit/patient identity to match the current route.

## Reliability findings fixed

- serialized IndexedDB draft saves so late writes cannot overwrite newer snapshots
- debounced autosave plus hide/page-leave flushes and route-scoped save completion bookkeeping
- stored draft identity/sanity checks with bounded narrative and patient-response text
- strict vital range checks, finite-number checks, and BP relationship validation
- reviewed autofill cannot apply an individually-valid but inverted BP pair
- workflow state repair for corrupt/unknown/duplicate steps and bounded rollback history
- workflow transitions use functional React updates and no longer perform side effects inside state updater functions
- workflow definitions are immutable by version in Postgres; activation/retirement may change, historical steps may not
- odometer pair/order checks, finite/positive mileage/expense checks, and upper bounds aligned with storage constraints
- EVV recaptures are append-only and older offline events cannot overwrite a newer visit convenience value
- Android speech start/stop is serialized; late callbacks are generation-guarded; recognizers are explicitly cancelled after timeout/unmount
- Android scanner OCR runs sequentially page-by-page to reduce memory spikes on low-end tablets
- OCR text is capped at 100,000 characters and reports truncation
- Android camera/scanner process-death recovery is registered before React renders
- receipt filenames use UUID entropy to avoid collision
- browser speech is disabled unless `VITE_DEMO_MODE=true`
- current ICD-10 U-codes are recognized; impossible DOBs are not proposed as high-confidence autofill
- migration runner uses SHA-256 checksums and fails on edited already-applied migrations
- shared root `.env` is deliberately loaded by both API and Vite
- API request/body limits, timeouts, generic error responses, graceful shutdown guard, and reduced error-detail logging

## Repeatable checks added

`npm run verify:source` performs shell/Python/JSON checks, migration/security static invariants, Android patcher idempotency, unsafe-source scans, TypeScript syntax checks, and pure dependency-free logic stress tests.

`npm run verify` additionally runs dependency-aware TypeScript checks, Vitest, and production builds once packages are installed.

`npm run verify:full` additionally starts local Postgres and runs RLS/integrity smoke tests when Docker is available.

The DB smoke suite includes two-tenant visibility, cross-tenant FK rejection, immutable finalized notes, amendment integrity, EVV event ordering/sequence rejection, denial of direct EVV-column edits, append-only EVV privileges, allergy-state constraints, and workflow-version immutability/deletion denial.

## v0.5 clinician/usability additions

The second pass tested the product as (a) an unfamiliar/interrupted user who follows the most obvious UI path and (b) an experienced clinician looking for speed, trustworthy state, context and auditability. Fixes include actual workflow-driven screen order, hidden demo/admin tools, patient/encounter safety context, explicit allergy semantics, wrong-patient OCR blocking, non-preselected automation suggestions, truthful network/EVV labels, completion-readiness gates, persistent patient-response transcription acknowledgement, EVV sequence validation, patient search and UI/persistent-schema alignment.

See `USABILITY_REVIEW.md` for detailed findings and unresolved clinical pilot blockers.

## Verification completed in the assembly environment

- shell syntax: PASS
- Python configurator syntax: PASS
- JSON parse: PASS
- migration numbering/static security assertions: PASS
- Android patcher applied twice without duplicate permissions/dependencies/plugin registration: PASS
- unsafe-pattern scan: PASS
- TypeScript parser-level scan across app/API source: PASS
- pure business-logic stress suite: PASS (10 groups in v0.5; includes 1,000 mileage combinations and 1,000 UUID generations)
- Java parser screen: no Java syntax diagnostics; expected missing Android/Capacitor classes prevent compilation outside an Android SDK project
- ZIP/archive integrity: run before release artifact is handed off

## Verification still required on a normal development machine

The current sandbox cannot complete `npm install` (the v0.5 retry timed out again), has no Docker/Postgres runtime, and has no Android SDK/Gradle dependency set. Therefore the following are **not claimed as passed here**:

- dependency-aware TypeScript typecheck
- Vitest execution
- Vite/Express production builds
- live PostgreSQL migrations/integration smoke tests
- Gradle compile
- physical Android tablet GPS/microphone/scanner/camera tests
- rotation, process death, airplane mode, low-storage and permission-denial tests on real hardware

Run `./scripts/bootstrap.sh`, then `npm run verify:full` with Docker. Run `./scripts/bootstrap-android.sh` for the native gate; after SDK setup, `npm run android:test` performs the repeatable Gradle debug compile. The first successful `npm install` should generate a `package-lock.json`; retain it in source control for reproducible dependency resolution.

## Known product gaps (not bugs hidden by this pass)

- synthetic/demo users only; production auth/MFA/session controls do not exist yet
- no production sync API for patients/notes/EVV/expenses yet
- no real server-side note signing endpoint yet
- IndexedDB and app-private receipt files are not yet app-level encrypted
- scanner PDF URI is temporary; durable encrypted document storage/provenance is not implemented
- direct PDF/image file-import OCR is not implemented (scanner/gallery path works; file chooser is explicitly informational)
- receipt-file chooser does not persist file contents yet
- reimbursement rules/rates are intentionally not implemented
- no production audit coverage for endpoints that do not exist yet
- no BAA/production hosting/device-management/compliance readiness claim
