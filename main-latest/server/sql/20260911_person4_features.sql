-- Person 4: checklists, entry-to-project references, and supporting indexes.
-- Safe additive migration: existing data is preserved.

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
