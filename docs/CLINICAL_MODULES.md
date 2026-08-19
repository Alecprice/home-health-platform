# Clinical Modules — v0.6

This build moves beyond the original vitals/narrative prototype and establishes separate clinical-context modules. The data is still synthetic/demo data; this is not a clinically complete production EHR.

## Implemented demo modules

- Medication profile with reconciliation timestamp, status, indication, and high-risk marker.
- Active plan of care with skilled need, frequency, precautions, homebound reason, and certifying provider.
- Active orders with discipline filtering and follow-up flags.
- Goals with discipline, target date, progress, and status.
- Recent-note summaries/trends with explicit warning not to copy unassessed findings forward.
- Wound registry + append-only wound-measurement schema.
- Reusable discipline-specific structured assessment engine for RN/PT/OT/SLP/Aide/MSW.
- Separate skilled-intervention, education, response-to-care, and next-visit/follow-up documentation.
- QA submission/return/approval prototype with database reviewer-role guardrails.
- Signature-attestation persistence model with content hash and append-only evidence.
- Version-aware `assessment_instances` table and an OASIS-E2 integration boundary.

## OASIS-E2

As of this build, OASIS-E2 is the current CMS instrument (effective 2026-04-01). The platform records an E2 integration boundary and generic versioned assessment storage, but it does **not** claim that the full OASIS-E2 instrument, CMS edit rules, iQIES export/submission format, or one-clinician convention are implemented.

The full OASIS module should be built from the official CMS instrument + data specifications and tested against CMS edits. Do not invent item wording or treat the generic assessment engine as an OASIS substitute.

## Remaining clinical pilot blockers

- Real authentication, authorization, MFA, and authenticated signing ceremony.
- Server sync, conflict resolution, retry/idempotency tests, and server-authoritative state.
- Durable encrypted source-document/receipt storage with retention/deletion policy.
- Complete medication reconciliation workflow including discrepancy resolution/provider notification.
- Full plan-of-care/order lifecycle and closed-loop physician/provider communication.
- Full official OASIS-E2 item set, time-point logic, data-spec validation, and export/submission workflow.
- Production wound-photo storage/consent/provenance and wound trend graphs.
- Discipline-specific validated forms agreed upon by actual agency clinicians.
- QA/supervisor role screens backed by server auth instead of local demo state.
- Production note signing/amendment UI wired to immutable server records/signature attestations.
