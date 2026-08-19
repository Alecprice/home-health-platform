-- Local-development bootstrap only. Production credentials/roles must be provisioned separately.
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'homehealth_app') THEN
    CREATE ROLE homehealth_app LOGIN PASSWORD 'homehealth_app'
      NOSUPERUSER NOCREATEDB NOCREATEROLE NOINHERIT NOBYPASSRLS;
  END IF;
END $$;
