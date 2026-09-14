CREATE EXTENSION IF NOT EXISTS "pgcrypto";

CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    google_id VARCHAR(255) NOT NULL UNIQUE,
    name VARCHAR(120) NOT NULL,
    email VARCHAR(320) NOT NULL UNIQUE,
    avatar_url TEXT,
    bio TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS projects (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    owner_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name VARCHAR(120) NOT NULL,
    description TEXT,
    archived_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS project_fields (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    field_type VARCHAR(20) NOT NULL CHECK (field_type IN ('short_text', 'long_text', 'number', 'date', 'computed')),
    formula TEXT,
    position INTEGER NOT NULL DEFAULT 0 CHECK (position >= 0),
    required BOOLEAN NOT NULL DEFAULT FALSE,
    archived_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS entries (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    created_by_id UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    name VARCHAR(150) NOT NULL,
    duration_minutes INTEGER NOT NULL DEFAULT 0 CHECK (duration_minutes >= 0 AND duration_minutes <= 10080),
    occurred_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    due_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS entry_field_values (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    entry_id UUID NOT NULL REFERENCES entries(id) ON DELETE CASCADE,
    field_id UUID NOT NULL REFERENCES project_fields(id) ON DELETE RESTRICT,
    value_text TEXT,
    value_number NUMERIC(18, 4),
    value_date DATE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_entry_field_value UNIQUE (entry_id, field_id)
);

CREATE INDEX IF NOT EXISTS idx_projects_owner ON projects (owner_id);
CREATE INDEX IF NOT EXISTS idx_fields_project ON project_fields (project_id);
CREATE INDEX IF NOT EXISTS idx_entries_project ON entries (project_id);
CREATE INDEX IF NOT EXISTS idx_values_entry ON entry_field_values (entry_id);
CREATE INDEX IF NOT EXISTS idx_values_field ON entry_field_values (field_id);


-- =========================================================
-- ENTRY CHECKLISTS
-- =========================================================

CREATE TABLE IF NOT EXISTS entry_checklist_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    entry_id UUID NOT NULL REFERENCES entries(id) ON DELETE CASCADE,
    text VARCHAR(300) NOT NULL,
    completed BOOLEAN NOT NULL DEFAULT FALSE,
    position INTEGER NOT NULL DEFAULT 0 CHECK (position >= 0),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_entry_checklist_items_entry
    ON entry_checklist_items(entry_id, position);

-- =========================================================
-- ENTRY -> PROJECT REFERENCES
-- =========================================================

CREATE TABLE IF NOT EXISTS entry_project_references (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    entry_id UUID NOT NULL REFERENCES entries(id) ON DELETE CASCADE,
    referenced_project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_entry_project_reference
        UNIQUE (entry_id, referenced_project_id)
);

CREATE INDEX IF NOT EXISTS idx_entry_project_references_entry
    ON entry_project_references(entry_id);

CREATE INDEX IF NOT EXISTS idx_entry_project_references_project
    ON entry_project_references(referenced_project_id);


CREATE TABLE IF NOT EXISTS saved_filters (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    owner_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    criteria JSONB NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_saved_filters_owner ON saved_filters (owner_id);
CREATE INDEX IF NOT EXISTS idx_saved_filters_project ON saved_filters (project_id);
