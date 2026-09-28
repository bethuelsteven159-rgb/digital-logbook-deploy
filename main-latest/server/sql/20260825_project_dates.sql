-- Safe additive migration for the existing projects table.
-- Existing project rows remain valid because both new columns are nullable.

ALTER TABLE projects
  ADD COLUMN IF NOT EXISTS start_date DATE,
  ADD COLUMN IF NOT EXISTS end_date DATE;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'projects_date_range_check'
      AND conrelid = 'projects'::regclass
  ) THEN
    ALTER TABLE projects
      ADD CONSTRAINT projects_date_range_check
      CHECK (
        start_date IS NULL
        OR end_date IS NULL
        OR end_date >= start_date
      );
  END IF;
END
$$;
