-- =========================================================
-- US-A06 RECURRING ENTRIES (V1)
-- =========================================================
-- recurring_entry_definitions stores the recurrence rules.
-- Generated occurrences are normal rows in entries, linked
-- back through entries.recurring_definition_id plus the
-- occurrence date in entries.recurrence_date.
-- Idempotent: safe to run more than once.
-- =========================================================

CREATE TABLE IF NOT EXISTS recurring_entry_definitions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    project_id UUID NOT NULL
        REFERENCES projects(id)
        ON DELETE CASCADE,

    created_by_id UUID NOT NULL
        REFERENCES users(id)
        ON DELETE RESTRICT,

    name VARCHAR(150) NOT NULL,

    duration_minutes INTEGER NOT NULL DEFAULT 0
        CHECK (duration_minutes >= 0 AND duration_minutes <= 10080),

    tags TEXT[] NOT NULL DEFAULT '{}',

    -- V1 template copy: checklist items as
    -- [{"text": "...", "position": 0}, ...]
    checklist JSONB NOT NULL DEFAULT '[]'::jsonb,

    frequency VARCHAR(10) NOT NULL
        CHECK (frequency IN ('daily', 'weekly', 'monthly')),

    interval_count INTEGER NOT NULL DEFAULT 1
        CHECK (interval_count >= 1 AND interval_count <= 365),

    starts_on DATE NOT NULL,
    ends_on DATE,

    enabled BOOLEAN NOT NULL DEFAULT TRUE,

    -- Watermark: the last occurrence date processed by the
    -- generator. Never moves backwards, so deleted
    -- occurrences are not recreated.
    last_generated_on DATE,

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT chk_recurring_definition_date_range
        CHECK (ends_on IS NULL OR ends_on >= starts_on)
);

CREATE INDEX IF NOT EXISTS idx_recurring_definitions_project_id
    ON recurring_entry_definitions(project_id);

CREATE INDEX IF NOT EXISTS idx_recurring_definitions_project_enabled
    ON recurring_entry_definitions(project_id, enabled);

-- =========================================================
-- GENERATED OCCURRENCE LINK ON ENTRIES
-- =========================================================

ALTER TABLE entries
    ADD COLUMN IF NOT EXISTS recurring_definition_id UUID
        REFERENCES recurring_entry_definitions(id)
        ON DELETE SET NULL,
    ADD COLUMN IF NOT EXISTS recurrence_date DATE;

-- DB-backed duplicate prevention: one generated entry per
-- definition and occurrence date, even under concurrent
-- generate-due requests.
CREATE UNIQUE INDEX IF NOT EXISTS uq_entries_recurring_occurrence
    ON entries (recurring_definition_id, recurrence_date)
    WHERE recurring_definition_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_entries_recurring_definition_id
    ON entries(recurring_definition_id);
