-- US-A08: archiving. Safe to run more than once.
BEGIN;

ALTER TABLE entries
  ADD COLUMN IF NOT EXISTS archived_at timestamptz NULL;

-- Recent-entries lists ("newest 50 in this project"). The original schema
-- had no (project_id, occurred_at) index, so these sorted the whole project
-- on every request. Partial: archived rows stay out of the hot index.
CREATE INDEX IF NOT EXISTS idx_entries_active_project_occurred
  ON entries (project_id, occurred_at DESC)
  WHERE archived_at IS NULL;

-- Totals / aggregates over active work (dashboard, stats). Covering, so
-- SUM(duration_minutes) is answered from the index alone.
CREATE INDEX IF NOT EXISTS idx_entries_active_totals
  ON entries (project_id) INCLUDE (duration_minutes)
  WHERE archived_at IS NULL;

-- Browsing the archive, newest-archived first.
CREATE INDEX IF NOT EXISTS idx_entries_archived_project
  ON entries (project_id, archived_at DESC)
  WHERE archived_at IS NOT NULL;

COMMIT;
