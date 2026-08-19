# Compliance boundary during development

This source tree is being built with synthetic data so development can remain free/local. It is **not** a claim that the product is HIPAA-compliant or ready for real PHI.

## Development rules

- synthetic patients, visits, notes, documents, speech, receipts, and locations only
- local Postgres/API and directly installed Android APKs are fine for development
- do not enter real names, MRNs, clinical narratives, real referral documents, or other PHI

## Native data considerations

- **Speech:** Android native capture uses the explicit on-device `SpeechRecognizer` when available. Generic network speech fallback is disabled by design. The current patient-response feature produces a transcript and does not intentionally retain raw audio.
- **Documents/OCR:** scanned images/PDFs and OCR text can contain PHI. The demo returns OCR text to the local React app; production needs encrypted document storage, retention policy, provenance, access control, and audit coverage.
- **EVV/location:** GPS coordinates connected to a patient visit are sensitive operational/healthcare data. Local demo storage is not the production storage design.
- **Receipts:** receipts can inadvertently contain patient-identifying information and must be treated accordingly when production storage is introduced.

## Clinical Assist rule

Automation produces candidate values only. No voice/OCR/extraction result silently finalizes a clinical field or signs a note. The clinician reviews and applies suggestions.

## Pre-real-PHI gate

Before any real patient data: BAA-covered production infrastructure as applicable, TLS, encryption at rest, hardened authentication/session handling, MFA policy, device controls, encrypted offline storage, backups/restore testing, complete audit coverage, incident response, retention/disposal, formal risk analysis, and appropriate legal/compliance review.

## v0.4 hardening note

The local app database role is now deliberately non-superuser with `NOBYPASSRLS`, and finalized-note/EVV/workflow-history integrity is enforced in PostgreSQL. These are engineering safeguards, not a compliance certification. Device-local Dexie data and app-private receipt files are still not app-level encrypted, so the synthetic-only rule remains mandatory.

## v0.6 clinical-context/signing notes

The schema now contains medication/POC/order/goal/wound/assessment/QA/signature-evidence foundations. These controls improve data integrity but do not by themselves make the product HIPAA compliant or clinically deployable.

Normal runtime SQL is no longer allowed to insert a note already marked signed or directly update note signing fields. `finalize_clinical_note()` performs finalization and SHA-256 content attestation atomically and signature evidence is append-only. Production still requires authenticated identity/MFA/session controls so `p_signer_id` is derived from the authenticated server context rather than trusted from a client request.

QA role checks are also enforced in the database for `qa_reviews`, but production API authorization must independently enforce the same minimum-necessary role policy and audit every review/sign/finalization action.
