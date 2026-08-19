# Decisions

## 2026-08-18 — Patient safety constraints are independent of configurable workflow

Workflow order may be changed/versioned for usability testing, but patient/encounter identity, explicit allergy state, source verification for scanned documents, EVV chronology, local-storage health, non-preselected automation suggestions, and final-review readiness are cross-cutting safety constraints. Reordering screens must not make these invariants disappear.

## 2026-08-18 — Clinical Assist requires both context and source review

Chart-affecting speech/OCR runs inside a specific patient/visit. Document content cannot be applied until the clinician verifies that the source belongs to the current patient; a detected MRN/DOB mismatch blocks apply regardless of that checkbox. Patient-response speech-to-text acknowledgement is persisted with the draft/schema.

## 2026-08-18 — Native capabilities stay behind replaceable adapters

The React workflow does not directly call Android APIs. `web/src/native/` owns GPS, receipt-camera, speech, and scan/OCR adapters. Custom native code is reproducibly injected by `scripts/configure_android.py` after `cap add android`. This lets us swap libraries, change policy, or revert a workflow without rewriting clinical pages.

## 2026-08-18 — On-device speech only by default

For PHI-sensitive dictation, the Android bridge uses `createOnDeviceSpeechRecognizer()` only when the OS reports it is available. Generic recognizer/network fallback is intentionally disabled. Manual typing remains the fallback. Patient-response capture does not retain raw audio in the current design.

## 2026-08-18 — ML Kit scanner + bundled OCR

Use Google Play services ML Kit Document Scanner for the document capture/crop/cleanup UI and bundle Latin Text Recognition v2 in the APK for OCR availability once installed. Extracted text is always treated as candidate input requiring clinician review.

## 2026-08-18 — EVV capture is append-only

The tablet keeps individual check-in/check-out captures locally, including accuracy. Server schema stores every EVV event append-only and updates the visit's convenience check-in/check-out fields from the latest captured event. EVV chronology checks are serialized per visit for concurrent device sync. Recapture therefore does not erase the historical event.

## 2026-08-18 — Workflow and operational expenses remain independent of signed notes

Visit step order is configuration-driven and versionable. Mileage/expenses are operational records, not clinical-note contents. This allows agencies to change workflows/reimbursement rules without changing clinical-note schemas or signed records.

## 2026-08-18 — Fresh React/Capacitor implementation

The earlier Ember/Express documentation was conceptual planning, not a verified existing build. The implementation starts fresh with React + TypeScript + Vite + Capacitor and a Node/Express/Postgres backend direction.

## 2026-08-18 — Hardening gates are executable, not checklist-only

The project now has three verification levels: source/pure logic, dependency-aware app build/tests, and live Postgres integrity tests. Bootstrap scripts run the dependency-aware gate automatically. We do not mark native/database behavior verified when the required runtime is unavailable.

## 2026-08-18 — Runtime DB role cannot write EVV convenience columns

`visits.check_in_*` and `check_out_*` are projections of append-only EVV facts, not normal editable fields. The runtime role may insert `evv_events`; a constrained security-definer trigger updates the convenience columns. This avoids silent history rewrites by a future buggy endpoint.

### 2026-08-18 — Clinical context is separate from finalized visit notes

Medication lists, POC/orders, goals, wounds, and longitudinal context are mutable patient/episode records. Visit notes record today's findings and whether source context was reviewed; they do not duplicate these modules as authoritative copy-forward data. This reduces stale-copy errors and preserves immutable historical notes.

### 2026-08-18 — OASIS uses versioned assessment instances

The current CMS instrument is OASIS-E2. The schema stores assessment type, instrument version, time point, responses, and validation errors rather than creating one relational column per OASIS item. The full E2 item mapping/edit engine must come from official CMS instruments/specifications and remains a distinct validation project.
