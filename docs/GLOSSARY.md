# Glossary

Home health has its own vocabulary. This is a quick reference for terms used in the code, schema, or these docs.

- **Home health agency** — a licensed organization that sends clinicians (nurses, therapists, aides) into patients' homes to deliver care. Calvert Health Care, in this project's case.
- **Episode of care** — a certification period during which a patient is under a home health plan of care. For Medicare, typically a 60-day period, renewable via recertification. Maps to the `episodes` table.
- **Plan of Care (POC)** — the physician-approved set of orders/goals for a patient's home health services during an episode.
- **SOC — Start of Care** — the first visit/assessment that begins an episode.
- **ROC — Resumption of Care** — reassessment after a patient was temporarily discharged (e.g. hospitalization) and resumes home health services.
- **Recert — Recertification** — the assessment at the end of one episode that determines whether/how home health continues into a new episode.
- **Discharge** — the visit/assessment ending home health services for a patient.
- **OASIS — Outcome and Assessment Information Set** — a CMS-mandated standardized assessment tool used at SOC/ROC/recert/discharge (and more) for Medicare/Medicaid home health patients. Item set is revised periodically by CMS. Drives quality reporting and reimbursement.
- **EVV — Electronic Visit Verification** — federally mandated (21st Century Cures Act) electronic capture of visit details (who, what, when, where — typically via GPS/timestamp) for Medicaid-funded home health/personal care visits, used to prevent billing fraud.
- **Discipline** — the type of clinician performing a visit: RN (registered nurse), PT (physical therapist), OT (occupational therapist), SLP (speech-language pathologist), Aide (home health aide), MSW (medical social worker).
- **MRN — Medical Record Number** — the agency-internal unique identifier for a patient (unique per agency in this system, not globally).
- **NPI — National Provider Identifier** — a unique 10-digit identifier for healthcare providers/organizations in the US, used e.g. for the referring physician on a patient's chart.
- **ICD-10** — the coding system used for diagnoses (`patients.primary_diagnosis_icd10`).
- **Payer source** — who's paying for the care (Medicare, Medicaid, private insurance, private pay, etc.).
- **PHI — Protected Health Information** — any individually identifiable health information, the thing HIPAA regulates the handling of. See `COMPLIANCE.md`.
- **BAA — Business Associate Agreement** — the contract HIPAA requires between a covered entity (the agency) and any vendor (e.g. a cloud host) that touches PHI on its behalf.
