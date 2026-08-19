# v0.5 Clinician Workflow & Cognitive-Load Review

This review is a development/usability exercise, not clinical validation or a claim that the application is ready for patient care. Testing used synthetic data.

The requested two-pass exercise was operationalized as:

1. **Low-cognitive-load / unfamiliar / interrupted user:** assumes limited health-IT familiarity, high distraction, weak working memory, and a tendency to follow whatever is most visually obvious. The design goal is to make unsafe actions difficult and recovery obvious.
2. **Experienced / high-fluency clinician:** assumes strong clinical and software literacy. The design goal is to remove needless clicks, expose trustworthy state, preserve context, and avoid software that slows down real care.

This framing is more useful than treating intelligence as a fixed property: fatigue, interruptions, stress, language, poor training, and unfamiliar software can make any clinician behave like the first persona.

## Low-cognitive-load pass — issues found and fixed

### 1. Clinical Assist could appear to chart data outside a patient context — FIXED
The standalone Assist route could produce valid-looking extracted values with no current patient/visit. It is now a demo-routing tool only and sends the user into a specific visit before chart-affecting actions are available.

### 2. Workflow Lab was visible in normal clinician navigation — FIXED
Configuration/testing tools are now hidden unless `VITE_DEMO_TOOLS=true`. Routine clinicians see Today, Patients, and optional Field Work.

### 3. Workflow configuration did not actually control the visit screen — FIXED
The lab previously reordered a workflow rail while `ChartPage` remained hard-coded. The visit now renders from the versioned workflow step list. Known unsafe arrangements are highlighted in Workflow Lab, while clinical blockers still prevent impossible finalization states.

### 4. Wrong-patient scanned content could look trustworthy — FIXED
If OCR detects an MRN or DOB that conflicts with the current patient, all apply actions are blocked. If the document contains no usable identifier, the clinician still must explicitly verify that the source belongs to the current patient before apply. No extracted values are preselected. Confidence is labeled as text-match confidence, not clinical correctness.

### 5. Patient identity was too easy to lose while scrolling — FIXED
The visit has a sticky patient-safety banner on tablet layouts showing name, DOB, MRN, scheduled visit context, and explicit allergy state. The final-review checklist requires patient-identity confirmation.

### 6. Empty allergy list could be mistaken for “no allergies” — FIXED
Allergies now have three explicit states: `known`, `nkda`, or `not-reviewed`. An empty unreviewed list is shown as **ALLERGIES NOT REVIEWED**, not as NKDA.

### 7. “Online” implied that the application/server was healthy — FIXED
The app now says **Network online/offline**, which is the only fact the browser actually knows. Server/API health will be a separate production indicator when sync exists.

### 8. Dashboard completion status was misleading — FIXED
Local EVV facts now distinguish Scheduled, In progress, and Checked out. “Checked out” explicitly does not mean the note is signed.

### 9. Queue count included every EVV event forever — FIXED
EVV records now carry `pending/synced` state; the visible local queue counts only unsynced work.

### 10. Empty note could appear to “pass validation” — FIXED
Final review now has explicit readiness items for storage health, patient identity, meaningful narrative, valid entered vitals, EVV steps when required, and patient-response transcription acknowledgement when applicable.

### 11. Check-out/check-in sequence could be reversed — FIXED
UI blocks check-out-before-check-in and prevents a later check-in after check-out. Readiness also validates chronology. PostgreSQL independently rejects impossible EVV timestamp sequences while still allowing an older legitimate offline event to sync later. Per-visit transaction locks serialize concurrent device sync so two near-simultaneous events cannot both validate against stale chronology.

### 12. App/storage failure could still look sign-ready — FIXED
A device-storage failure is a final-review blocker. The user is told not to finalize until the draft can be stored safely.

### 13. Patient-response acknowledgement disappeared with the microphone UI — FIXED
When patient-response speech transcription starts, the acknowledgement is now written to the visit draft and persistent schema. A transcript without that durable acknowledgement is a final-review blocker.

### 14. “Today’s visit” wording could be wrong for a late/early chart — FIXED
Identity confirmation now says “this scheduled visit,” and the patient banner shows the scheduled date/time. This reduces the risk of selecting the right patient but wrong encounter.

### 15. Patient roster would become difficult to use at realistic size — FIXED FOR CURRENT DEMO
Patients can be searched by name, MRN, or diagnosis. Server-side paging/filtering will be required once the roster is API-backed and large.

## Experienced/high-fluency clinician pass — issues found and fixed

### 1. Artificial workflow rigidity — IMPROVED
Workflow steps are versioned/configurable rather than embedded in routes. Experienced teams can iterate on ordering without changing historical notes or database shape.

### 2. Automation bias from OCR/speech suggestions — FIXED
No generated/extracted suggestion is selected by default. The clinician must choose values. Wrong-patient source warnings stop the entire apply flow rather than only the conflicting demographic field.

### 3. Autofill could create an internally impossible BP — FIXED
Pair-level validation rejects a systolic/diastolic combination where systolic is not greater than diastolic even if both numbers fall inside broad individual bounds.

### 4. Speech callbacks could write into stale screens — FIXED
Speech sessions are serialized and generation-guarded. Late native callbacks after navigation/mode changes are ignored and listeners are cleaned up.

### 5. Draft writes could race — FIXED
IndexedDB saves are serialized and route-scoped. Delayed Visit A saves cannot update Visit B’s save bookkeeping. App hide/page-leave initiates a flush.

### 6. Process death during camera/scanner flows — IMPROVED
Android restored results are captured before React boot and placed into a recovery inbox. Durable encrypted source-document storage remains a pilot blocker.

### 7. EVV audit semantics were weak — FIXED AT DATA LAYER
EVV events are append-only. Runtime SQL cannot directly rewrite convenience check-in/out fields. Newer captured events remain authoritative if an older offline event arrives later.

### 8. Signed note amendment semantics had loopholes — FIXED AT DATA LAYER
Finalized notes cannot be modified in place. Amendment rows must point to a finalized note for the same agency, patient, and visit.

### 9. Mileage/expense defaults could create plausible but wrong records — FIXED
Vehicle type and expense category require an explicit choice. Manual miles and odometer-derived miles cannot both be supplied. Mileage and fuel are recorded as facts without assuming an agency reimbursement policy.

### 10. Demo schema and UI were drifting apart — FIXED FOR CURRENT FIELDS
Phone/address/allergy semantics, patient identity confirmation, patient response, and transcription acknowledgement now exist in the persistent schema rather than being UI-only concepts.

## Issues an experienced home-health clinician would still have

These are not hidden bugs; they are major product modules that should block a real clinical pilot until intentionally designed and validated.

1. **Medication profile and drug-regimen review** — medication list, reconciliation, changes, adverse effects/interactions and review workflow are absent.
2. **Plan of Care / orders / goals** — clinicians need ordered disciplines/frequency, diagnoses, interventions, goals, restrictions/precautions and what changed since the prior visit.
3. **Prior-note and trend context** — current charting is too isolated. Clinicians need recent notes, vitals/trends, wounds, incidents, hospitalizations and unresolved concerns without hunting.
4. **Discipline-specific charting** — RN/PT/OT/SLP/Aide/MSW should not all receive the same generic assessment.
5. **OASIS-E2** — full time-point-aware OASIS forms, edits and current CMS data specifications are not implemented.
6. **Wound documentation** — measurements, locations, treatment/order matching and longitudinal comparison are absent.
7. **Medication/order/test-result follow-up loops** — there is no closed-loop task/result workflow yet.
8. **Real scheduling/assignment** — demo visits are static. Reassignment, missed/cancelled visits, frequencies and calendar conflicts need real rules.
9. **Active-visit conflict detection** — a clinician could eventually have overlapping active visits across devices unless the server enforces/flags it.
10. **Authenticated signing** — the current button only validates readiness. Real identity-bound signing, server timestamping, amendments and reason-for-change are still required.
11. **Real sync/conflict resolution** — offline saves exist, but multi-device/server conflict policy and reliable queue acknowledgement are not implemented.
12. **Durable source documents** — scanner/OCR works, but encrypted document retention, provenance, duplicate detection, lifecycle and deletion/retention policy are not implemented.
13. **Secure offline PHI storage** — IndexedDB/app-private files are not yet production-grade encrypted storage for a PHI pilot.
14. **Alerts vs. noise** — agency-configurable clinical outlier/recheck thresholds need human-factors design; hard-coded medical alerts were intentionally not invented in this pass.
15. **Supervisory/QA workflow** — no QA hold, returned-for-correction, co-signature, late-note, incomplete-note or chart-review queues yet.
16. **Orders/referrals/communication** — no physician/order tracking or secure care-team communication yet.
17. **Device accessibility validation** — large text, screen reader, switch/keyboard navigation, color contrast and outdoor-glare testing need real device testing.
18. **Server reachability indicator** — network state is honest now, but actual API/sync health can only be implemented when a real API-backed workflow exists.

## Design rules established by this review

- Show the patient and encounter context wherever clinical data can be entered or imported.
- Require explicit review; never silently accept speech/OCR/AI content.
- Never use “complete,” “saved,” “online,” or “signed” for a weaker state.
- Make the safe path the easiest path; do not depend on training to prevent predictable mistakes.
- Keep workflow configuration separate and versioned from the legal clinical record.
- Preserve source/provenance and append-only event history for actions that may later be audited.
- Treat offline/device failure as a visible workflow state, not an implementation detail.
- Prefer configurable agency policy over hard-coded reimbursement or clinical-alert policy.
- Expert shortcuts may reduce clicks, but must not bypass patient identity, source verification, finalized-record integrity or required final review.

## External safety references used for this review

- ONC, 2025 SAFER Guides (current site updated 2026): patient identification, system management, contingency planning, clinician communication and high-priority EHR safety practices.
- ONC, Implementing Health IT: reliable patient identification and prevention of duplicate/mixed records.
- CMS, OASIS User Manuals: OASIS-E2 final guidance is effective April 1, 2026.
- CMS/QTSO, Home Health Agency OASIS references and July 2026 Q&A updates.

These references informed the safety review; they do not make this product certified, compliant, clinically validated, or CMS-approved.
