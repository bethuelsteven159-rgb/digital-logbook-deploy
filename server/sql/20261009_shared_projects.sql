-- =========================================================
-- SHARED PROJECTS (collaborators + invitations)
-- =========================================================
-- Projects stay owned by a single user, but the owner and
-- existing collaborators can invite other users by email.
-- A pending invitation is matched to a signed-in user by
-- their account email; accepting it inserts a row into
-- project_collaborators, which grants full edit access to
-- the project (entries, fields, recurring entries, etc.).
-- Idempotent: safe to run more than once.
-- =========================================================

CREATE TABLE IF NOT EXISTS project_collaborators (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    project_id UUID NOT NULL
        REFERENCES projects(id)
        ON DELETE CASCADE,

    user_id UUID NOT NULL
        REFERENCES users(id)
        ON DELETE CASCADE,

    -- 'editor' can do everything the owner can on project
    -- content, except manage other collaborators.
    role VARCHAR(20) NOT NULL DEFAULT 'editor'
        CHECK (role IN ('editor')),

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT uq_project_collaborator
        UNIQUE (project_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_project_collaborators_project
    ON project_collaborators(project_id);

CREATE INDEX IF NOT EXISTS idx_project_collaborators_user
    ON project_collaborators(user_id);

-- =========================================================
-- PROJECT INVITATIONS
-- =========================================================

CREATE TABLE IF NOT EXISTS project_invitations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    project_id UUID NOT NULL
        REFERENCES projects(id)
        ON DELETE CASCADE,

    inviter_id UUID NOT NULL
        REFERENCES users(id)
        ON DELETE CASCADE,

    invitee_email VARCHAR(320) NOT NULL,

    status VARCHAR(20) NOT NULL DEFAULT 'pending'
        CHECK (status IN ('pending', 'accepted', 'declined', 'revoked')),

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    responded_at TIMESTAMPTZ,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_project_invitations_project
    ON project_invitations(project_id);

CREATE INDEX IF NOT EXISTS idx_project_invitations_invitee
    ON project_invitations(invitee_email, status);
