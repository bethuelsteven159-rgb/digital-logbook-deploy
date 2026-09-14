-- Person 4: project-to-project and entry-to-entry references.
-- Existing entry-to-project references remain unchanged.

CREATE TABLE IF NOT EXISTS project_project_references (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    referenced_project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT uq_project_project_reference
        UNIQUE (project_id, referenced_project_id),

    CONSTRAINT chk_project_project_reference_not_self
        CHECK (project_id <> referenced_project_id)
);

CREATE INDEX IF NOT EXISTS idx_project_project_references_project
    ON project_project_references(project_id);

CREATE INDEX IF NOT EXISTS idx_project_project_references_referenced
    ON project_project_references(referenced_project_id);


CREATE TABLE IF NOT EXISTS entry_entry_references (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    entry_id UUID NOT NULL REFERENCES entries(id) ON DELETE CASCADE,
    referenced_entry_id UUID NOT NULL REFERENCES entries(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT uq_entry_entry_reference
        UNIQUE (entry_id, referenced_entry_id),

    CONSTRAINT chk_entry_entry_reference_not_self
        CHECK (entry_id <> referenced_entry_id)
);

CREATE INDEX IF NOT EXISTS idx_entry_entry_references_entry
    ON entry_entry_references(entry_id);

CREATE INDEX IF NOT EXISTS idx_entry_entry_references_referenced
    ON entry_entry_references(referenced_entry_id);