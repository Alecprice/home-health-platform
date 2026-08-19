# Roadmap

## Implemented in the current source tree

- React + TypeScript + Vite tablet UI with synthetic demo data
- configurable/versionable Workflow Lab with local history/rollback
- searchable patient roster/detail, today's visits, patient-safety banner, explicit identity confirmation, basic vitals/narrative charting
- Dexie local drafts
- mileage, gas/fuel, parking, toll, meals, lodging, supplies, other field-expense tracking
- receipt camera hook + file fallback
- EVV precise GPS check-in/out adapter + local capture history
- Android on-device speech bridge for clinician dictation and patient responses
- patient-response acknowledgement persisted with the visit draft/schema; raw audio is not retained
- ML Kit Android document scanner + bundled OCR native bridge
- reviewed deterministic Clinical Assist suggestions; no silent/default-selected autofill; wrong-patient MRN/DOB source mismatch blocks apply
- Postgres migrations with tenant RLS, tenant-qualified FKs, finalized-note immutability, append-only audit/EVV records and versioned workflow integrity

## Hardened source gate completed

See `HARDENING.md`. Source/static/pure-logic checks pass in the assembly environment; dependency-aware, live-Postgres and Android runtime gates remain below.

## Next verification gate

1. Complete `npm install` on the Mac and run web typecheck/build.
2. Generate Android shell and run `scripts/configure_android.py` via `bootstrap-android.sh`.
3. Compile Gradle and run on a real Android 12+ tablet.
4. Test GPS, microphone/on-device speech, document scanner/OCR, camera, rotation, app restart, and airplane-mode behavior.
5. Fix any OEM/device-specific native issues before expanding product scope.

## Clinical pilot blockers identified in v0.5

See `USABILITY_REVIEW.md`. Before a real clinical pilot, the product still needs medication/drug-regimen review, plan of care/orders/goals, prior-note/trend context, discipline-specific assessments, current OASIS-E2 support where applicable, wound/other specialty modules as required, authenticated signing/amendments, production sync/conflict handling, durable source-document storage/provenance, secure offline PHI storage, and supervisory/QA workflows.

## Next product passes after device verification

- authentication/login and real API-backed demo users
- visit API + sync queue for drafts/EVV/mileage/expenses
- full patient create/edit forms so reviewed OCR suggestions can populate demographics as well as note fields
- scheduling and clinician assignment
- richer discipline-specific assessments and reusable form engine
- document storage/provenance/review inbox and duplicate detection
- encrypted device-storage strategy for PHI pilot
- note validation/sign/amendment workflow
- agency admin configuration, including workflow and reimbursement policy
- reporting/export

## Pre-real-PHI gate

No real PHI until production hosting/BAA decisions, HTTPS, hardened authentication/session handling, MFA policy, encrypted storage/backups, device policy, audit coverage, incident response, risk assessment, and appropriate legal/compliance review are complete.

## v0.6 clinical-context progress

Implemented as demo/foundation: medication profile, plan of care, clinical orders, care goals, recent-note context, wound registry/measurements, discipline-specific assessment engine, QA return/approval states, signature-attestation schema, and versioned assessment instances for future OASIS-E2.

Still required before a real clinical pilot: official complete OASIS-E2 implementation/spec validation, production authentication/signing, live API persistence for these modules, real sync/conflict resolution, secure document storage, closed-loop order communication, and agency-reviewed discipline forms.
