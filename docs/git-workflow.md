# Git Workflow & Development Standards

**Owner:** Bethuel

This document defines the Git workflow and development standards used by the Digital Logbook team.

The purpose of these rules is to keep the repository stable, make changes easy to review, reduce merge conflicts, and ensure that every change can be traced back to the person and issue responsible for it.

---

## 1. Git Workflow

The team follows a **feature branch and pull request workflow**.

The general process is:

```text
main
  ↓
feature/fix/docs branch
  ↓
commits
  ↓
push
  ↓
Pull Request
  ↓
code review
  ↓
merge into main
  ↓
everyone updates local main
```

### Main branch rule

The `main` branch represents the latest stable version of the project.

Team members must **not develop or commit directly on `main`**.

All development work must happen on a separate branch and reach `main` through a Pull Request.

Before starting new work, update the local copy of `main`:

```bash
git checkout main
git pull origin main
```

Then create a branch for the new work.

---

## 2. Branch Naming

Branches must clearly describe their purpose.

Use the following structure:

```text
type/short-description
```

Recommended branch types:

| Type        | Purpose                                           |
| ----------- | ------------------------------------------------- |
| `feature/`  | New functionality                                 |
| `fix/`      | Bug fixes                                         |
| `docs/`     | Documentation changes                             |
| `test/`     | Tests and test-related changes                    |
| `refactor/` | Code restructuring without changing functionality |
| `chore/`    | Configuration, dependencies, CI/CD or maintenance |

Examples:

```text
feature/project-creation
feature/user-profile
fix/login-database-sync
fix/project-loading
docs/git-workflow
test/project-api
refactor/project-service
```

Branch descriptions should:

* use lowercase letters;
* use hyphens between words;
* be short but descriptive;
* describe one main piece of work.

Avoid names such as:

```text
bethuel-work
new-branch
testing123
final
final-final
```

Branches describe the **work**, not the person doing it.

---

## 3. Creating a Branch

Always branch from an updated `main`.

```bash
git checkout main
git pull origin main
git checkout -b feature/example-feature
```

Work should then be committed only to that branch.

---

## 4. Commit Standards

Commits should be small enough that another team member can understand what changed.

A commit message should briefly describe the change.

Recommended format:

```text
type: short description
```

Examples:

```text
feat: add project creation endpoint
fix: store authenticated user id correctly
docs: add local setup instructions
test: add project API tests
refactor: separate project service logic
chore: update dependencies
```

Recommended commit types:

| Type       | Meaning                     |
| ---------- | --------------------------- |
| `feat`     | New feature                 |
| `fix`      | Bug fix                     |
| `docs`     | Documentation               |
| `test`     | Testing                     |
| `refactor` | Internal code restructuring |
| `chore`    | Maintenance/configuration   |
| `style`    | Formatting-only changes     |

Avoid vague commit messages such as:

```text
update
changes
stuff
fixed things
final
working now
```

A commit should answer:

> What changed?

Each team member should make commits for the work they are responsible for so that contribution history remains visible in Git.

---

## 5. Pushing Changes

Before pushing, check the changed files:

```bash
git status
```

Stage the required files:

```bash
git add .
```

Commit them:

```bash
git commit -m "feat: add project creation endpoint"
```

Push the branch:

```bash
git push origin feature/project-creation
```

Do not push unfinished experimental work into `main`.

---

## 6. Pull Request Process

All changes entering `main` must go through a Pull Request.

The Pull Request should use the repository's Pull Request template.

The author should include:

* a clear description of the change;
* the related issue where applicable;
* a list of important changes;
* how the change was tested;
* whether the acceptance criteria were met;
* any documentation changes;
* anything the reviewer should pay special attention to.

A Pull Request should contain one logically related piece of work where possible.

### Example

A Pull Request for profile functionality might contain:

```text
Add profile API integration

- Load profile information for the authenticated user
- Allow users to update their name and bio
- Connect frontend profile page to backend API
- Add error handling for failed profile requests
```

Avoid combining unrelated features into one very large Pull Request.

---

## 7. Code Review

A Pull Request must be reviewed before it is merged.

The reviewer should check:

* whether the feature satisfies its requirements;
* whether existing functionality still works;
* whether the code is understandable;
* whether functions and files have clear responsibilities;
* whether unnecessary code was added;
* whether formatting standards are followed;
* whether secrets or `.env` files were accidentally committed;
* whether API behaviour is correct;
* whether errors are handled correctly;
* whether tests have been added or updated where necessary;
* whether documentation needs to be updated.

Review comments should focus on the code and not the person who wrote it.

If changes are requested, the Pull Request author should make the changes on the same branch and push again.

The Pull Request will update automatically.

---

## 8. Merge Process

A branch may be merged only when:

* the implementation is complete;
* relevant tests pass;
* formatting/checks pass;
* requested review changes have been addressed;
* there are no unresolved merge conflicts;
* the Pull Request is ready for integration.

Changes should be merged through the repository's Pull Request interface rather than by directly pushing to `main`.

The merge strategy configured for the repository should be used consistently. Team members should not change repository merge settings for individual Pull Requests without discussing the change with the team.

After a Pull Request has been merged, all team members should update their local `main` before continuing development:

```bash
git checkout main
git pull origin main
```

A new feature branch should then be created from this updated version.

This prevents development from continuing on an outdated version of the project.

---

## 9. Handling Merge Conflicts

Merge conflicts should not be solved by blindly choosing one version.

First update the branch with the latest `main`:

```bash
git checkout main
git pull origin main

git checkout feature/my-feature
git merge main
```

Git will identify conflicting files.

The developer should:

1. inspect both versions;
2. understand why the conflict occurred;
3. keep the correct behaviour from both changes where necessary;
4. test the resulting code;
5. commit the conflict resolution;
6. push the branch again.

Example:

```bash
git add .
git commit -m "fix: resolve merge conflict with main"
git push
```

If the conflict affects another member's feature, discuss the resolution with that person rather than guessing.

---

# Development Standards

## 10. Project Structure

Code should remain separated according to responsibility.

The repository currently separates the major parts of the application rather than placing the entire system into one monolithic application.

Existing top-level areas such as the frontend, backend and server components should remain separate where applicable.

Files should be placed inside the appropriate existing structure instead of creating duplicate implementations.

For example:

```text
client/
    src/
        api/
        components/
        pages/

backend/
    src/
        controllers/
        services/
        routes/
        validation/
        middleware/
        lib/
```

Where additional server infrastructure exists, it should follow the same principle of separating responsibilities.

Do not create a new folder simply because an existing folder is difficult to find.

Before adding a new module, check whether an appropriate location already exists.

---

## 11. Separation of Responsibilities

Large files should be divided when they begin handling unrelated responsibilities.

For backend code, responsibilities should generally be separated into areas such as:

```text
route
    ↓
controller
    ↓
service
    ↓
database
```

For frontend code, responsibilities should generally be separated into:

```text
page
    ↓
component
    ↓
API/service layer
    ↓
backend API
```

Database logic should not be copied directly into frontend components.

Frontend components should communicate with the backend through the project's API.

---

## 12. Naming Conventions

### JavaScript variables and functions

Use `camelCase`.

```javascript
const projectName = "Digital Logbook";

function loadProjectDetails() {}
```

### React components

Use `PascalCase`.

```javascript
ProjectDetails
ProjectCard
ProfilePage
```

### Constants

Use descriptive names. Global constants may use `UPPER_SNAKE_CASE`.

```javascript
const MAX_PROJECTS = 20;
```

### Boolean values

Prefer names that make the true/false meaning obvious.

```javascript
isLoading
isAuthenticated
hasPermission
canEdit
```

Avoid unclear names such as:

```javascript
flag
thing
data2
temp1
```

Existing naming conventions should be preserved when modifying an established part of the project.

---

## 13. Formatting and Code Quality

Formatting must be run before submitting a Pull Request.

The frontend currently provides a formatting command through its package configuration.

Run:

```bash
npm run format
```

in packages where the script is available.

The current frontend formatter is `oxfmt`.

Do not introduce another formatter into the same package without discussing it with the team first, because multiple formatters can produce conflicting output.

Code-quality tools configured in the repository should also be run before creating or merging a Pull Request.

> **Open question:** A single project-wide ESLint policy has not yet been confirmed. When linting configuration is finalised, the exact lint command and rules should be documented here.

A Pull Request should not intentionally introduce new formatting or linting warnings.

---

## 14. Environment Variables

Configuration that changes between development and deployment environments should use environment variables.

Example:

```env
PORT=5000
FRONTEND_URL=http://localhost:8443
```

Environment-specific values must not be hard-coded throughout the application.

The actual `.env` file is local configuration and must not be committed.

Instead, repositories should provide an example file where necessary:

```text
.env.example
```

An example file contains variable names but not real secrets.

Example:

```env
DATABASE_URL=
AUTH_CLIENT_ID=
AUTH_CLIENT_SECRET=
FRONTEND_URL=
```

---

## 15. Secrets and API Keys

The following must never be committed to Git:

* passwords;
* database passwords;
* private database connection strings;
* authentication secrets;
* private API keys;
* access tokens;
* refresh tokens;
* private certificates;
* production credentials;
* real `.env` files.

Secrets belong in environment variables or the deployment platform's secret-management system.

Before committing, use:

```bash
git status
```

and inspect the files being added.

If a secret is accidentally committed, deleting it in a later commit is **not enough**, because Git history may still contain it.

The exposed credential must be revoked or rotated.

---

## 16. API Standards

The Digital Logbook uses a hand-written HTTP API.

New endpoints should use REST-style resource names where practical.

Examples:

```text
GET    /api/projects
GET    /api/projects/:id
POST   /api/projects
PATCH  /api/projects/:id
DELETE /api/projects/:id
```

URLs should describe resources rather than implementation actions.

Prefer:

```text
POST /api/projects
```

instead of:

```text
POST /api/createProjectNow
```

---

## 17. HTTP Status Codes

API endpoints should return appropriate HTTP status codes.

| Code  | Meaning                                  |
| ----- | ---------------------------------------- |
| `200` | Successful request                       |
| `201` | Resource successfully created            |
| `204` | Successful request with no response body |
| `400` | Invalid request                          |
| `401` | Authentication required                  |
| `403` | Authenticated but not authorised         |
| `404` | Resource not found                       |
| `409` | Request conflicts with existing state    |
| `500` | Unexpected server error                  |

Do not return `200 OK` for every situation if the request actually failed.

---

## 18. API Response Convention

New API responses should use predictable JSON structures.

Successful example:

```json
{
  "success": true,
  "data": {
    "id": "123",
    "name": "Digital Logbook"
  }
}
```

Error example:

```json
{
  "success": false,
  "error": {
    "code": "PROJECT_NOT_FOUND",
    "message": "The requested project could not be found."
  }
}
```

Existing endpoints should not be changed only for formatting purposes if doing so would break the frontend.

API response migrations should be handled deliberately and updated on both the frontend and backend.

---

## 19. Error Handling

Errors should be handled deliberately rather than silently ignored.

Backend code should:

* validate incoming data;
* use appropriate HTTP status codes;
* return useful but safe error messages;
* avoid exposing stack traces to users;
* avoid leaking database or authentication information;
* log unexpected server errors where appropriate.

Frontend code should:

* handle loading states;
* handle failed API calls;
* display useful feedback to users;
* avoid leaving the interface permanently loading after an error.

Avoid code such as:

```javascript
catch (error) {}
```

unless ignoring the error is intentional and documented.

---

## 20. Authentication and Authorisation

Authentication should use the authentication system selected by the project rather than implementing custom password handling.

The frontend must not be trusted to decide whether a user has permission to access protected information.

Where authorisation is required, the backend must verify the authenticated user before performing the action.

For example, users should not be able to access another user's project simply by manually changing an ID in a URL.

Development authentication bypasses may only be used for local development and must not be enabled in production.

---

## 21. Testing Standards

Features should be tested before being submitted for review.

Tests should cover meaningful behaviour rather than existing only to increase the number of tests.

When possible:

* frontend tests should test user-visible behaviour and important component logic;
* API tests should test endpoint behaviour;
* service tests should test important business rules;
* bug fixes should include a regression test where practical.

Test files should follow the code area they belong to.

Examples:

```text
client/src/components/ProjectCard.test.jsx
client/src/pages/Profile/Profile.test.jsx

backend/tests/projects.test.js
backend/tests/profile.test.js
```

If an existing part of the repository already follows a different testing structure, continue using that structure rather than creating a second convention.

---

## 22. Before Opening a Pull Request

Before submitting work, the developer should check:

* [ ] The branch was created from an updated `main`.
* [ ] The feature works locally.
* [ ] Existing functionality still works.
* [ ] Relevant tests pass.
* [ ] Formatting has been run.
* [ ] No unnecessary files were added.
* [ ] No `.env` file or secret was committed.
* [ ] Debugging code has been removed.
* [ ] Error handling has been considered.
* [ ] Documentation was updated where necessary.
* [ ] The Pull Request template has been completed.

---

## 23. CI/CD

Continuous Integration should automatically help verify changes before they are integrated.

Where configured, Pull Requests should run checks such as:

```text
Install dependencies
        ↓
Formatting / lint checks
        ↓
Automated tests
        ↓
Build
        ↓
Merge allowed
```

A failing CI check should be investigated rather than ignored.

Deployment should be performed from the agreed stable branch or deployment pipeline rather than from an individual developer's local machine where possible.

---

## 24. Documentation Changes

Documentation is part of the project and should evolve with the implementation.

When a Pull Request changes:

* installation steps;
* API behaviour;
* environment variables;
* system architecture;
* development workflow;
* testing procedures;

the relevant documentation should be updated in the same Pull Request where practical.

Documentation should describe the system that actually exists rather than the system the team originally planned to build.

---

## 25. Definition of Done

A piece of development work is considered complete when:

1. its acceptance criteria have been addressed;
2. the implementation works;
3. relevant tests have been performed;
4. formatting and project checks pass;
5. documentation has been updated where required;
6. the work has been pushed to a branch;
7. a Pull Request has been created;
8. review feedback has been resolved;
9. the Pull Request has been merged into `main`.

Writing code locally is not by itself considered completion.

---

## 26. Summary

The team's development workflow is:

```text
Update main
    ↓
Create branch
    ↓
Implement one piece of work
    ↓
Test
    ↓
Format
    ↓
Commit
    ↓
Push
    ↓
Open Pull Request
    ↓
Code review
    ↓
Resolve feedback
    ↓
Merge
    ↓
Update local main
```

The most important rule is simple:

> **No development is done directly on `main`. Changes enter `main` through reviewed Pull Requests.**

This gives the Digital Logbook a traceable development history and reduces the risk of one person's changes unexpectedly breaking another person's work.

---

## AI Usage Declaration

AI tooling was used to assist with editing this documentation.

* **Tool:** ChatGPT Web
* **Model:** GPT-5.6 Sol
* **Purpose:** Editing Git workflow and development standards documentation

All generated content was reviewed and remains the responsibility of the project team.
