CREATE TABLE IF NOT EXISTS entry_links (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    source_entry_id UUID NOT NULL REFERENCES entries(id) ON DELETE CASCADE,
    target_entry_id UUID NOT NULL REFERENCES entries(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT chk_entry_link_not_self CHECK (source_entry_id <> target_entry_id)
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_entry_links_pair
    ON entry_links (
        LEAST(source_entry_id, target_entry_id),
        GREATEST(source_entry_id, target_entry_id)
    );

CREATE INDEX IF NOT EXISTS idx_entry_links_source ON entry_links(source_entry_id);
CREATE INDEX IF NOT EXISTS idx_entry_links_target ON entry_links(target_entry_id);
