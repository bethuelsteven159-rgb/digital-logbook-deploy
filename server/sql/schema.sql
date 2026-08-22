-- server/sql/schema.sql
-- Digital Logbook shared PostgreSQL schema
-- Designed to support:
--   1. Google-authenticated users
--   2. Projects owned by users
--   3. Project-defined custom fields
--   4. Entries belonging to projects
--   5. Typed values for each entry/custom-field pair
--
-- This schema deliberately uses UUID primary keys so that it matches the
-- Project Details / Entries API contract and the existing UUID validation.

CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- =========================================================
-- USERS
-- =========================================================

CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    -- Google's stable account identifier ("sub" from Google ID token).
    google_id VARCHAR(255) NOT NULL UNIQUE,

    name VARCHAR(120) NOT NULL,
    email VARCHAR(320) NOT NULL UNIQUE,
    avatar_url TEXT,

    -- Profile feature support.
    bio TEXT,

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- =========================================================
-- PROJECTS
-- =========================================================

CREATE TABLE IF NOT EXISTS projects (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    owner_id UUID NOT NULL
        REFERENCES users(id)
        ON DELETE CASCADE,

    name VARCHAR(120) NOT NULL,
    description TEXT,

    archived_at TIMESTAMPTZ,

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_projects_owner_id
    ON projects(owner_id);

CREATE INDEX IF NOT EXISTS idx_projects_owner_created_at
    ON projects(owner_id, created_at DESC);

-- =========================================================
-- PROJECT FIELDS
-- =========================================================
-- A project owns its field definitions.
-- Entries do not redefine the schema.

CREATE TABLE IF NOT EXISTS project_fields (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    project_id UUID NOT NULL
        REFERENCES projects(id)
        ON DELETE CASCADE,

    name VARCHAR(100) NOT NULL,

    field_type VARCHAR(20) NOT NULL
        CHECK (
            field_type IN (
                'short_text',
                'long_text',
                'number',
                'date'
            )
        ),

    position INTEGER NOT NULL DEFAULT 0
        CHECK (position >= 0),

    required BOOLEAN NOT NULL DEFAULT FALSE,

    archived_at TIMESTAMPTZ,

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_project_fields_project_id
    ON project_fields(project_id);

CREATE INDEX IF NOT EXISTS idx_project_fields_project_position
    ON project_fields(project_id, position);

-- Prevent two currently-active fields on the same project from having
-- the same name, case-insensitively.
CREATE UNIQUE INDEX IF NOT EXISTS uq_project_fields_active_name
    ON project_fields(project_id, LOWER(name))
    WHERE archived_at IS NULL;

-- =========================================================
-- ENTRIES
-- =========================================================

CREATE TABLE IF NOT EXISTS entries (
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

    occurred_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_entries_project_id
    ON entries(project_id);

CREATE INDEX IF NOT EXISTS idx_entries_project_occurred_at
    ON entries(project_id, occurred_at DESC);

CREATE INDEX IF NOT EXISTS idx_entries_created_by_id
    ON entries(created_by_id);

-- =========================================================
-- ENTRY FIELD VALUES
-- =========================================================
-- Each row is the value supplied by one entry for one field.
-- The actual value is kept in the column matching the field's type.

CREATE TABLE IF NOT EXISTS entry_field_values (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    entry_id UUID NOT NULL
        REFERENCES entries(id)
        ON DELETE CASCADE,

    field_id UUID NOT NULL
        REFERENCES project_fields(id)
        ON DELETE RESTRICT,

    value_text TEXT,
    value_number NUMERIC(18, 4),
    value_date DATE,

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT uq_entry_field_value
        UNIQUE (entry_id, field_id),

    CONSTRAINT chk_single_typed_value
        CHECK (
            num_nonnulls(
                value_text,
                value_number,
                value_date
            ) <= 1
        )
);

CREATE INDEX IF NOT EXISTS idx_entry_field_values_entry_id
    ON entry_field_values(entry_id);

CREATE INDEX IF NOT EXISTS idx_entry_field_values_field_id
    ON entry_field_values(field_id);
