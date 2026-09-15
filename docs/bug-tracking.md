# Bug Tracking

**Project:** Digital Logbook
**Module:** COMS3011A Software Design Project
**Document Status:** Living Document
**Last Updated:** 2026-09-15
**Purpose:** To record the significant bugs and integration/deployment issues encountered during development, their impact, evidence, resolution, and current status.

---

## 1. Scope

This document records **major bugs and integration issues only**. Minor cosmetic issues, harmless browser warnings, and short-lived development mistakes are not included unless they materially affected the application's ability to build, authenticate, communicate with the backend, persist data, or deploy successfully.

The bug tracker is maintained as evidence of:

- problems discovered during development and testing;
- the impact of those problems;
- how the team diagnosed and resolved them;
- preventive actions taken to reduce recurrence;
- the connection between implementation, testing, deployment, and stakeholder expectations.

---

## 2. Major Issue Summary

| ID | Sprint | Issue | Impact | Resolution | Status |
|---|---|---|---|---|---|
| BUG-001 | Sprint 1 | Duplicate `backend/` and `server/` structures | Created uncertainty about the authoritative backend and complicated authentication integration | Authentication work was consolidated into the existing `server/` structure and the duplicate backend structure was removed | Resolved |
| BUG-002 | Sprint 1 | Google OAuth origin/configuration mismatch | Google Sign-In could not complete successfully | Correct development/production origins and Google OAuth configuration were applied | Resolved |
| BUG-003 | Sprint 1 | Authentication/database environment configuration failure | Backend authentication returned server errors and users could not sign in | Correct database connection details and required authentication environment variables were configured | Resolved |
| BUG-004 | Sprint 2 | Netlify blank page caused by incorrect Vite/Router base-path configuration | Production frontend loaded a blank/incorrect page | Vite base and React Router configuration were aligned with the Netlify root deployment and redirects were added | Resolved |
| BUG-005 | Sprint 2 | Production frontend attempted to call `localhost:5000` | Authentication/API requests failed in the deployed site with `ERR_CONNECTION_REFUSED` | Production `VITE_API_URL` was configured to use the Render backend and the frontend was rebuilt/redeployed | Resolved |
| BUG-006 | Sprint 2 | Missing `CalendarView` module during frontend integration | Vite could not compile `ProjectDetails.jsx`, blocking the frontend | Missing view files/integration changes were restored and the client build was re-run successfully | Resolved |
| BUG-007 | Sprint 2 | `db.connect is not a function` during entry/custom-field creation | Users could not save the intended entry/custom-field operation in the deployed application | Backend/database integration was corrected and the production frontend/backend were redeployed with compatible versions | Resolved |
| BUG-008 | Sprint 2 | Render backend deployment failed / direct Gitea deployment limitation | Latest backend changes could not reliably reach production | Gitea remained the authoritative repository; approved `main` was mirrored to GitHub and Render deployed from the GitHub mirror | Resolved |
| BUG-009 | Sprint 2 | Frontend deployed before matching backend Delete Entry route | Delete Entry returned `404 Route not found` even though the frontend action was visible | Delete feature PR was merged into Gitea `main`, mirrored to GitHub, Render redeployed, and the Netlify frontend was rebuilt; production deletion was then verified | Resolved |

---

## 3. Detailed Issue Records

### BUG-001 — Duplicate Backend Structures

**Sprint:** Sprint 1
**Severity:** Major integration issue

**Description:**
The repository contained both a `backend/` directory and an existing `server/` directory. This created uncertainty about which backend structure was authoritative and where authentication code should be integrated.

**Impact:**
Authentication files risked being split between two competing backend structures, which would make integration and maintenance difficult for the rest of the team.

**Resolution:**
After team discussion, authentication functionality was consolidated into the existing `server/` structure and the duplicate backend structure was removed.

**Preventive Action:**
Before introducing a new top-level structure, developers should confirm the current architecture and agreed folder ownership.

**Status:** Resolved

---

### BUG-002 — Google OAuth Origin / Configuration Mismatch

**Sprint:** Sprint 1
**Severity:** Major authentication issue

**Description:**
Google Sign-In initially failed because the frontend origin was not accepted by the configured Google OAuth client.

**Observed Error:**

`The given origin is not allowed for the given client ID.`

**Impact:**
Users could not complete Google authentication.

**Resolution:**
The required development/production frontend origins were configured for the correct Google OAuth client. The frontend and backend Google authentication configuration were aligned.

**Preventive Action:**
Maintain documented development and production origins for external authentication services and verify them whenever deployment URLs change.

**Status:** Resolved

---

### BUG-003 — Authentication / Database Environment Configuration Failure

**Sprint:** Sprint 1
**Severity:** Major backend issue

**Description:**
The authentication backend failed while connecting to PostgreSQL because the local database/authentication environment configuration was incomplete or incorrect.

**Observed Error:**

`SASL: SCRAM-SERVER-FIRST-MESSAGE: client password must be a string`

**Impact:**
The authentication endpoint returned HTTP 500 and users could not sign in.

**Resolution:**
The correct PostgreSQL connection information was configured through environment variables. The required application authentication secret was also configured locally.

**Preventive Action:**

- Keep a complete `.env.example` without real secrets.
- Validate required environment variables at server startup.
- Never commit database passwords, JWT secrets, or OAuth credentials.

**Status:** Resolved

---

### BUG-004 — Netlify Blank Page / Router Base-Path Mismatch

**Sprint:** Sprint 2
**Severity:** Major frontend deployment issue

**Description:**
The deployed Netlify frontend initially rendered incorrectly because the application was configured with a `/digital_logbook/` base/basename while the deployed application was being opened from `/`.

The browser reported:

`<Router basename="/digital_logbook"> is not able to match the URL "/" because it does not start with the basename`

**Impact:**
The production application appeared blank/unusable even though the frontend had built successfully.

**Evidence:**

![BUG-004 evidence - Netlify router basename mismatch](images/bug-evidence/bug-004-netlify-router-basename.png)

**Resolution:**

- Vite's production base was corrected for the Netlify deployment.
- The unnecessary `BrowserRouter` basename was removed.
- Netlify SPA redirects were configured.
- The frontend was rebuilt and redeployed.

**Preventive Action:**
Production routing configuration must be tested using the real deployment URL before a frontend deployment is considered complete.

**Status:** Resolved

---

### BUG-005 — Production Frontend Calling Localhost Backend

**Sprint:** Sprint 2
**Severity:** Major production integration issue

**Description:**
A deployed Netlify build attempted to send authentication/API requests to:

`localhost:5000`

The production browser therefore tried to connect to the user's own machine instead of the deployed backend.

**Observed Error:**

`net::ERR_CONNECTION_REFUSED`

**Impact:**
Google authentication and API requests failed in production even though the frontend itself loaded.

**Evidence:**

![BUG-005 evidence - deployed frontend calling localhost backend](images/bug-evidence/bug-005-production-localhost-api.png)

**Resolution:**

- Production `VITE_API_URL` was configured to point to the Render backend.
- The client was rebuilt after changing the environment configuration.
- The latest `dist` build was redeployed to Netlify.

**Preventive Action:**

- Keep local and production API URLs separate.
- Verify the generated production build uses the deployed backend URL.
- Never commit local-only `.env` values.

**Status:** Resolved

---

### BUG-006 — Missing `CalendarView` Module During Integration

**Sprint:** Sprint 2
**Severity:** Major frontend build/integration issue

**Description:**
Vite failed to resolve the `CalendarView` import used by `ProjectDetails.jsx`.

**Observed Error:**

`Failed to resolve import "./CalendarView" from "src/pages/Projects/ProjectDetails.jsx". Does the file exist?`

**Impact:**
The frontend development/build process could not continue because `ProjectDetails.jsx` depended on a module that was not available in the working tree.

**Evidence:**

![BUG-006 evidence - CalendarView module import failure](images/bug-evidence/bug-006-calendar-view-import.png)

**Resolution:**
The missing/incomplete integration files were restored to the branch and the relevant Project Details views were integrated together. The client build was then run successfully.

**Preventive Action:**

- Verify all newly imported files are included in the same feature branch/PR.
- Run `npm run build --prefix client` before requesting merge.
- Avoid replacing large source directories with incomplete copies.

**Status:** Resolved

---

### BUG-007 — `db.connect is not a function`

**Sprint:** Sprint 2
**Severity:** Major backend/data integration issue

**Description:**
While creating an entry/custom field in the deployed application, the backend returned:

`db.connect is not a function`

**Impact:**
The user could reach the entry form, but the save/create operation could not complete successfully.

**Evidence:**

![BUG-007 evidence - db.connect is not a function](images/bug-evidence/bug-007-db-connect.png)

**Resolution:**
The team aligned the backend/database access implementation and ensured that the deployed backend and frontend were using compatible versions of the code. The production services were redeployed and the affected flow was re-tested.

**Preventive Action:**

- Keep one agreed database access abstraction.
- Avoid mixing incompatible database helper APIs.
- Run backend/service tests and end-to-end creation tests before deployment.
- Confirm Render is running the same approved `main` commit expected by the frontend.

**Status:** Resolved

---

### BUG-008 — Render Deployment Failure / Gitea Deployment Limitation

**Sprint:** Sprint 2
**Severity:** Major deployment issue

**Description:**
The backend/deployment owner encountered a Render deployment failure, and the team also identified a limitation in connecting the chosen deployment workflow directly to the official Gitea repository.

This became a stakeholder/process concern because the team had already agreed that Gitea should remain the official repository and that reviewed changes should be merged there first.

**Impact:**

- Latest backend changes were not guaranteed to be live.
- Frontend and backend versions could become unsynchronised.
- Production testing could give misleading results when Render was still running an older commit.

**Evidence:**

![BUG-008 evidence - Render deployment failure notification](images/bug-evidence/bug-008-render-deploy-failed.jpeg)

**Resolution:**

The team preserved the agreed development workflow:

`Feature branch → Gitea PR → Review/Approval → Gitea main`

For deployment, the approved Gitea `main` branch is mirrored to a GitHub repository:

`Gitea main → GitHub mirror main → Render`

The backend is then deployed by Render from the GitHub mirror.

The deployment owner also indicated that lecturer guidance would be requested regarding the direct Gitea deployment limitation.

**Preventive Action:**

- Keep Gitea as the authoritative repository.
- Mirror only approved/merged `main` to the deployment repository.
- Compare commit hashes before assuming production is current.
- Verify Render deployment status after every backend production update.

**Status:** Resolved for Sprint 2 deployment; lecturer clarification may still be recorded if later received.

---

### BUG-009 — Delete Entry Returned `404 Route not found` in Production

**Sprint:** Sprint 2
**Severity:** Major frontend/backend version mismatch

**Description:**
Delete Entry was visible and correctly triggered a request from the frontend, but the production backend returned:

`404 Route not found`

Investigation showed that the frontend had the new Delete Entry functionality while the Render backend was still running a version of `main` that did not yet contain the new DELETE route.

**Impact:**
The user could confirm deletion, but the entry remained unchanged. This meant the feature did not yet satisfy its acceptance criteria.

**Resolution:**

1. The Delete Entry feature branch was reviewed and merged into Gitea `main`.
2. The merged `main` was pulled locally.
3. The team verified that `deleteEntry` existed on `main`.
4. The same `main` commit was pushed to the GitHub deployment mirror.
5. Render redeployed the backend.
6. The frontend was rebuilt and redeployed to Netlify.
7. Delete Entry was tested in production and confirmed to work.

**Verification Result:**

- Delete button visible.
- Confirmation warning displayed.
- Cancelling leaves the entry unchanged.
- Confirming removes the entry.
- Refreshing the page confirms that the deletion persisted.

**Preventive Action:**
For API changes, deploy backend and frontend versions from the same approved mainline state and verify deployment commit hashes before production testing.

**Status:** Resolved and production-tested

---

## 4. Evidence Index

The following screenshots are retained as supporting evidence for the major Sprint 2 bugs.

| Evidence File | Related Bug | What It Demonstrates |
|---|---|---|
| `images/bug-evidence/bug-004-netlify-router-basename.png` | BUG-004 | Router basename mismatch on Netlify |
| `images/bug-evidence/bug-005-production-localhost-api.png` | BUG-005 | Production frontend attempting to call `localhost:5000` |
| `images/bug-evidence/bug-006-calendar-view-import.png` | BUG-006 | Vite failing to resolve `CalendarView` |
| `images/bug-evidence/bug-007-db-connect.png` | BUG-007 | `db.connect is not a function` during entry creation |
| `images/bug-evidence/bug-008-render-deploy-failed.jpeg` | BUG-008 | Render deployment failure notification |

The browser favicon `404` shown in one screenshot is not tracked as a major bug because it did not block core application functionality.

---

## 5. Production Verification After Fixes

After the Sprint 2 deployment and integration issues were resolved, the following production flow was verified:

- Netlify frontend loads successfully.
- Google Sign-In works with the deployed frontend/backend configuration.
- The frontend communicates with the Render backend instead of `localhost`.
- Projects and entries load from the production backend.
- Intermediate entry features are visible after integration.
- Edit Entry remains available.
- Delete Entry displays a confirmation step.
- Confirmed deletion removes the entry and remains deleted after refresh.

**Overall production status after fixes:** Core tested flows operating successfully.

---

## 6. Lessons and Preventive Actions

The major Sprint 1 and Sprint 2 issues produced the following team lessons:

1. **Keep one authoritative architecture.**
   Avoid duplicate backend structures or competing database abstractions.

2. **Keep Gitea as the official review source.**
   Deployment tooling should not bypass the agreed branch/PR/review process.

3. **Synchronise production frontend and backend versions.**
   A new UI feature may fail if the corresponding backend route has not been deployed.

4. **Use environment-specific configuration.**
   Production builds must never depend on `localhost` APIs.

5. **Build before merge/deployment.**
   Missing imports such as `CalendarView` should be caught by the client build before release.

6. **Test full flows, not only individual components.**
   Important operations should be verified from UI → API → backend → database → refreshed UI state.

7. **Treat deployment as part of testing.**
   A locally working feature is not considered production-ready until the deployed services are running the intended commits.

8. **Record evidence.**
   Screenshots, console errors, tests, PRs, and deployment checks should be retained for significant issues.

---

## 7. Bug Tracking Process Going Forward

New significant bugs should be recorded with:

- unique bug ID;
- sprint/date where known;
- severity;
- description;
- user/system impact;
- evidence where available;
- diagnosis/root cause;
- resolution;
- preventive action;
- current status;
- relevant PR/commit/issue reference where available.

Resolved bugs should remain in this document to preserve development history and traceability.

---

## 8. Revision History

| Version | Date | Author | Changes |
|---|---|---|---|
| 0.1 | Sprint 1 | Team | Initial major authentication/integration bugs recorded. |
| 0.2 | 15/09/2026 | Simphiwe / Team | Document refocused on major issues; Sprint 2 Netlify, API configuration, module integration, database, Render/Gitea deployment, and Delete Entry deployment issues added with evidence and resolutions. |
