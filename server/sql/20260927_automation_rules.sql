-- Automation rules (US-A05)
-- Applied idempotently by server/scripts/applyAutomationRulesMigration.js

CREATE TABLE IF NOT EXISTS automation_rules (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    owner_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    condition_field_id UUID NOT NULL REFERENCES project_fields(id) ON DELETE CASCADE,
    condition_operator VARCHAR(20) NOT NULL CHECK (
        condition_operator IN ('equals', 'not_equals', 'contains', 'greater_than', 'less_than')
    ),
    condition_value TEXT,
    action_type VARCHAR(20) NOT NULL CHECK (action_type IN ('add_tag')),
    action_value VARCHAR(30) NOT NULL,
    enabled BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_automation_rules_project
    ON automation_rules (project_id);
