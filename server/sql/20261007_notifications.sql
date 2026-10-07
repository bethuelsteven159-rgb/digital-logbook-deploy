-- =========================================================
-- NOTIFICATIONS (replaces the reminders feature)
-- =========================================================
-- Notifications are derived live from data that already
-- exists (entries.due_at, checklists, recurring series,
-- project activity). This table stores only the per-user
-- read/dismissed state, keyed by a stable notification key
-- (for example "entry_overdue:<entryId>" or
-- "weekly_summary:<ISO week>").
-- Idempotent: safe to run more than once.
-- =========================================================

CREATE TABLE IF NOT EXISTS notification_state (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    user_id UUID NOT NULL
        REFERENCES users(id)
        ON DELETE CASCADE,

    notification_key VARCHAR(200) NOT NULL,

    read_at TIMESTAMPTZ,
    dismissed_at TIMESTAMPTZ,

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT uq_notification_state_user_key
        UNIQUE (user_id, notification_key)
);

CREATE INDEX IF NOT EXISTS idx_notification_state_user
    ON notification_state(user_id);
