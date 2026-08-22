# Bug Tracking

**Project:** Digital Logbook
**Sprint:** Sprint 1
**Document Status:** Living Document
**Purpose:** To record significant development bugs, integration issues, configuration problems, their impact, resolution, and current status throughout the project lifecycle.

---

## 1. Sprint 1 Overview

During Sprint 1, several issues were encountered while implementing and integrating the Google authentication functionality with the existing Digital Logbook backend and frontend.

The main issues involved backend structure, Google OAuth configuration, frontend-backend communication, frontend dependencies, database configuration, and Git merge conflicts.

These issues were documented and resolved during development. The purpose of recording them is to maintain traceability, support future troubleshooting, and provide the development team and stakeholders with visibility into issues encountered during implementation.

---

## 2. Sprint 1 Issue Summary

| ID      | Issue                                                  | Impact                                                                                     | Resolution                                                                                                                       | Status   |
| ------- | ------------------------------------------------------ | ------------------------------------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------- | -------- |
| BUG-001 | Duplicate `backend/` and `server/` backend structures  | Created confusion about the correct backend structure and location of authentication files | Authentication implementation was moved into the existing `server/` structure and the duplicate `backend/` directory was removed | Resolved |
| BUG-002 | Google OAuth origin not allowed                        | Google Sign-In could not complete successfully                                             | The correct frontend origin was configured for the Google OAuth Client ID                                                        | Resolved |
| BUG-003 | Frontend communicating with incorrect backend port     | Authentication requests failed with `ERR_CONNECTION_REFUSED`                               | Frontend authentication requests were updated from port `3000` to port `5000`                                                    | Resolved |
| BUG-004 | Missing `lucide-react` dependency                      | Vite failed to compile the frontend                                                        | The required frontend dependency was installed/configured                                                                        | Resolved |
| BUG-005 | PostgreSQL database authentication configuration error | Authentication endpoint returned HTTP 500 and users could not sign in                      | The correct database connection details were configured in the local environment                                                 | Resolved |
| BUG-006 | Git merge conflict in `userStore.js`                   | Stashed authentication changes could not be applied cleanly                                | The conflict was resolved and the resulting changes were committed and pushed                                                    | Resolved |

---

## 3. Detailed Issue Records

### BUG-001 — Duplicate Backend Structures

**Description:**
The repository contained both a `backend/` directory and an existing `server/` directory. This created uncertainty regarding which backend structure should be used for the authentication implementation.

**Impact:**
Authentication files were initially located in the duplicate backend structure. This could have caused confusion for other team members and made future integration more difficult.

**Resolution:**
After discussion with the Scrum Master, the authentication implementation was moved into the existing `server/` structure. The duplicate `backend/` directory was removed from the development branch.

**Status:** Resolved

---

### BUG-002 — Google OAuth Origin Configuration

**Description:**
The Google Sign-In integration initially returned a 403 error with the message:

`The given origin is not allowed for the given client ID.`

**Impact:**
The Google Sign-In functionality could not successfully authenticate the user.

**Resolution:**
The frontend development origin was correctly configured for the Google OAuth Client ID. After the configuration was corrected, the Google Sign-In button became functional.

**Status:** Resolved

---

### BUG-003 — Incorrect Frontend Backend Port

**Description:**
The frontend authentication implementation initially attempted to communicate with the backend through `http://localhost:3000`, while the integrated backend was running on port `5000`.

**Impact:**
Requests to the authentication endpoints failed with:

`ERR_CONNECTION_REFUSED`

The affected endpoints included the authentication and current-user requests.

**Resolution:**
The frontend authentication configuration was updated to use the integrated backend running at:

`http://localhost:5000`

**Status:** Resolved

---

### BUG-004 — Missing `lucide-react` Dependency

**Description:**
The Vite development server reported that it could not resolve the `lucide-react` package imported by `NewEntryModal.jsx`.

**Impact:**
The frontend failed to compile correctly, preventing the application from rendering normally in the browser.

**Resolution:**
The required `lucide-react` dependency was installed/configured in the frontend project.

**Status:** Resolved

---

### BUG-005 — PostgreSQL Database Configuration

**Description:**
The authentication backend initially returned the following PostgreSQL error:

`SASL: SCRAM-SERVER-FIRST-MESSAGE: client password must be a string`

**Impact:**
The `/api/auth/google` endpoint returned HTTP 500, preventing successful Google authentication.

**Resolution:**
The correct PostgreSQL database connection URL provided for the project was configured in the local `.env` file. A local `JWT_SECRET` was also configured for signing the application's authentication session tokens.

**Status:** Resolved

---

### BUG-006 — Git Merge Conflict in `userStore.js`

**Description:**
While restoring previously stashed authentication changes using `git stash pop`, Git reported a content conflict in:

`server/data/userStore.js`

The conflict occurred because the working branch and the stashed changes contained different versions of the user storage implementation.

**Impact:**
The stashed changes could not be applied cleanly until the conflict was resolved.

**Resolution:**
The conflict was resolved by retaining the database-backed `userStore.js` implementation required by the integrated authentication backend. The resolved files were staged, committed, and pushed to the `feature/auth-backend` branch.

**Status:** Resolved

---

## 4. Authentication Integration Verification

After resolving the above issues, the authentication implementation was tested locally.

The following functionality was successfully verified:

* Google Sign-In button was displayed and became clickable after the OAuth configuration was corrected.
* The frontend successfully communicated with the backend on port `5000`.
* The Google ID token was received by the authentication backend.
* The backend verified the Google authentication token.
* The backend communicated with the PostgreSQL database.
* A user could successfully authenticate using a Google account configured for the project.
* The backend generated an application session JWT after successful authentication.

**Overall Authentication Status:** Successfully tested locally.

---

## 5. Lessons and Preventive Actions

The issues encountered during Sprint 1 highlighted several practices that should be maintained during future sprints:

1. **Maintain a single agreed backend structure**
   Team members should confirm the existing project structure before creating new directories or parallel implementations.

2. **Keep environment configuration consistent**
   Frontend and backend developers should agree on development ports and environment variables before integration testing.

3. **Document external service configuration**
   Services such as Google OAuth should have their required origins, credentials, and test-user configuration documented for the development team.

4. **Do not commit sensitive environment variables**
   Database credentials, JWT secrets, Google credentials, and other secrets must remain in local `.env` files and must not be committed to the repository.

5. **Test integration before merging**
   Authentication should be tested from the frontend through the backend and database before considering the feature ready for integration.

6. **Resolve Git conflicts carefully**
   When using `git stash`, merges, or rebases, conflicting files should be reviewed before staging and committing the resolution.

---

## 6. Future Issue Tracking

This document is a **living document** and should be updated throughout future sprints when significant bugs or integration issues are identified.

New issues should receive a unique ID and include, where applicable:

* Issue description
* Impact
* Steps or circumstances that caused the issue
* Resolution
* Current status
* Relevant commit, issue, or pull request reference

Resolved issues should remain in the document to preserve the project's development history and provide traceability for future maintenance.
