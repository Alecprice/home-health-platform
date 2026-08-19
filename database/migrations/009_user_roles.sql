-- New role values must be committed before subsequent migrations use them.
ALTER TYPE user_role ADD VALUE IF NOT EXISTS 'qa_reviewer';
ALTER TYPE user_role ADD VALUE IF NOT EXISTS 'clinical_manager';
