# Pull Request

## Description

Adds shared projects: a project owner can invite other users by email, invitees accept or decline from their Projects page, and accepted collaborators work with the shared project exactly like a normal one (entries, fields, search, filters, automation rules, recurring entries, edit, archive, stats and dashboard). Includes full server and client test coverage for the new flows.

## Related Issue

Closes #

## Changes Made

- **Database**: Added `project_collaborators` and `project_invitations` tables with an idempotent migration (`server/sql/20261009_shared_projects.sql`) and npm script `migrate:shared-projects`; updated `server/db/schema.sql`.
- **Access model**: Every project ownership check now accepts the owner OR an active collaborator (`owner_id = $2 OR EXISTS (... project_collaborators ...)`) across `projects.js`, `stats.js`, `dashboard.js`, `notifications.js`, `postgresProjectDetailsRepository.js` and `postgresRecurringEntryRepository.js`.
- **Sharing API**: New collaborators/invitations endpoints — list collaborators, invite by email, revoke invitation, remove collaborator/leave, list my invitations, accept and decline. Race-safe acceptance grants access before resolving the invitation, so a lost race returns 409 without losing access.
- **Project details**: Response now includes `ownerId` and `viewerRole` (`owner` | `collaborator`); project list includes `ownerId` and `isShared`.
- **Client UI**: `SharingModal` (invite, owner/collaborators/pending lists, remove/leave/revoke), a Share button on the project details page, invitations banner with Accept/Decline on the Projects page, and a Shared badge on project cards; new `projectSharingApi.js`.
- **Sign out**: Added a Sign out button to the sidebar (visible on every page) that clears the JWT session, the signed-in user and the cached notification feed — needed to switch accounts when testing shared projects.
- **Docs**: `docs/API.md` documents all 7 new endpoints, response fields, error codes and the two new tables.

## Testing

- [x] Tested locally
- [x] Existing functionality still works
- [x] Added/updated tests where necessary

- Server: 303 vitest + 436 node:test — all passing (`npm --prefix server run test:coverage`)
- Client: 303 vitest + 33 node:test — all passing (`npm --prefix client run test:coverage`)
- New sharing test coverage: `projectCollaboratorController.js` 98.8%, `projectCollaboratorService.js` 96.6%, `postgresProjectCollaboratorRepository.js` 94.4%, `projectCollaboratorRepository.js` 100%, `projectCollaborator.validation.js` 100%, route files 100%; client `SharingModal.jsx` 100% statements, `projectSharingApi.js` 100% statements
- Client overall statement coverage rose from 67.2% to 70.3% with the new tests; CI uploads all four lcov reports to Codecov

## Requirements / Acceptance Criteria

- [x] All relevant acceptance criteria have been met
- [x] The implementation matches the related issue/user story

## Code Quality

- [x] Code follows the project's coding and naming conventions
- [x] No unnecessary code or files were added
- [x] ESLint/formatting checks pass

## Documentation

- [x] Documentation has been updated if necessary
- [x] Any important design/implementation decisions have been documented

## Review Checklist

- [x] I have reviewed my own changes
- [x] I understand the code I have submitted
- [x] The changes are ready for review

---

**Test coverage**: 1,075 automated tests passing (server 303 vitest + 436 node, client 303 vitest + 33 node), including 24 server sharing-flow tests and 26 new client tests; new sharing modules at 94–100% server coverage and 100% client statements.
