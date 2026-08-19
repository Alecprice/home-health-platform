# Architecture

## Shape

Android tablet → React/TypeScript/Vite UI → offline Dexie layer → Express API → PostgreSQL.

Capacitor is a thin Android shell. Most product behavior stays in React. Native capabilities are isolated behind `web/src/native/` so the clinical workflow can be rearranged or native providers replaced without coupling UI screens to Android SDK details.

## Native Clinical Assist

`ClinicalAssistPlugin.java` exposes only three concerns to React: capability check, on-device speech start/stop/events, and document scan. `DocumentScanActivity.java` owns Google's ML Kit scanner UI and runs bundled Text Recognition v2 on scanned JPEG pages before returning OCR text and optional PDF URI.

## EVV

React calls the official Capacitor Geolocation plugin. Every capture is written locally first. PostgreSQL `evv_events` is append-only so a recapture becomes another event rather than erasing historical evidence. An insert trigger mirrors the current event into `visits.check_in_*` or `check_out_*` for convenient querying.

## Clinical Assist safety boundary

Speech/OCR output never directly signs or silently writes the legal chart. Deterministic extraction produces candidate `SuggestedField` objects with source/confidence. The clinician selects values to apply; current charting applies compatible vital values and leaves unmatched demographic suggestions pending until their real edit forms exist.

## Field work

Mileage and expenses are separate operational data. Receipt capture currently stores device-local references only in the demo; production receipt/document storage requires encrypted storage and provenance controls.

## v0.5 integrity and clinician-safety boundary

Postgres migrations now distinguish the migration administrator from the runtime application role. Runtime is `NOSUPERUSER`/`NOBYPASSRLS`, tenant relationships use composite `(agency_id, id)` foreign keys, finalized notes are immutable, workflow definitions are immutable by version, and EVV convenience columns can only be changed by the append-only EVV event trigger.

Client-side drafts are route-identity checked before rendering, serialized through a local save queue, and sanitized when reloaded from IndexedDB. Native Android results enter React only through bounded adapters and clinician-reviewed Clinical Assist paths. The visit screen is driven by versioned workflow steps rather than hard-coded order, but final-review safety gates remain independent of display order. Patient/encounter identity, explicit allergy state, wrong-patient OCR blocking, EVV chronology and persisted patient-response transcription acknowledgement are treated as cross-cutting safety constraints.

## v0.6 clinical-context boundary

Clinical context is intentionally modeled outside the visit note: medications, plans of care, orders, goals, wounds, and measurements can evolve over an episode, while finalized clinical notes remain immutable historical records. A visit draft stores evidence that relevant context was reviewed plus today's structured assessment/interventions/education/response/follow-up. `assessment_instances` is version-aware so OASIS-E2 and future instrument revisions can coexist without flattening every item into permanent columns.
