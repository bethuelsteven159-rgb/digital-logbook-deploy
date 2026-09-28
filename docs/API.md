# Digital Logbook API Reference

**Base URL:** `http://localhost:5000` (configurable via `PORT` env var)
**Framework:** Express.js (Node.js)
**Database:** PostgreSQL (via `pg` library)
**Auth mechanism:** Google OAuth + server-issued JWT (Bearer token)

---

## Global Middleware

| Middleware | Applied to | Purpose |
|---|---|---|
| `cors()` | All routes | Enables cross-origin requests |
| `express.json({ limit: '10mb' })` | All routes (except profile PATCH which gets its own 750kb limit) | Parses JSON request bodies |
| `requireAuth` (JWT middleware) | `/api/projects`, `/api/users`, `/api/stats`, `/api/logbook`, `/api/dashboard` | Verifies JWT from `Authorization: Bearer <token>` header, sets `req.user` |

**Auth Middleware** (`server/middleware/authMiddleware.js`):
- Extracts Bearer token from the `Authorization` header
- Verifies using `JWT_SECRET` env variable
- Normalizes user identity: if token uses `sub` (Google convention), copies it to `req.user.id`
- Returns `401` if token is missing or invalid

**Error handling:**
- 404 handler: `{ success: false, message: "Route not found" }`
- Global error handler: `{ success: false, message: <error.message or "Internal server error"> }` with status from `error.statusCode` or 500

---

## Response Envelope

All API responses follow a consistent pattern:

- **Success**: `{ success: true, data: <payload> }`
- **Validation error**: `{ success: false, message: "...", errors: <zod flattened errors> }`
- **Auth error**: `{ error: { code: "...", message: "..." } }` (used by auth endpoints)

---

## Endpoint Summary

| # | Method | Endpoint | Auth |
|---|--------|----------|------|
| 1 | GET | `/api/health` | No |
| 2 | POST | `/api/auth/google` | No |
| 3 | GET | `/api/auth/me` | Yes |
| 4 | GET | `/api/external/quote` | No |
| 5 | GET | `/api/projects` | Yes |
| 6 | POST | `/api/projects` | Yes |
| 7 | PATCH | `/api/projects/:projectId` | Yes |
| 8 | PATCH | `/api/projects/:projectId/archive` | Yes |
| 9 | GET | `/api/projects/:projectId` | Yes |
| 10 | POST | `/api/projects/:projectId/entries` | Yes |
| 11 | PATCH | `/api/projects/:projectId/entries/:entryId` | Yes |
| 12 | DELETE | `/api/projects/:projectId/entries/:entryId` | Yes |
| 13 | GET | `/api/projects/:projectId/entries/outstanding` | Yes |
| 14 | GET | `/api/projects/:projectId/entries/incomplete` | Yes |
| 15 | PATCH | `/api/projects/:projectId/entries/:entryId/complete` | Yes |
| 16 | POST | `/api/projects/:projectId/entries/:entryId/complete` | Yes |
| 17 | PATCH | `/api/projects/:projectId/entries/:entryId/checklist/:itemId` | Yes |
| 18 | DELETE | `/api/projects/:projectId/entries/:entryId/checklist/:itemId` | Yes |
| 19 | PATCH | `/api/projects/:projectId/references` | Yes |
| 20 | PATCH | `/api/projects/:projectId/entries/:entryId/project-references` | Yes |
| 21 | PATCH | `/api/projects/:projectId/entries/:entryId/references` | Yes |
| 22 | POST | `/api/projects/:projectId/filters` | Yes |
| 23 | GET | `/api/projects/:projectId/filters` | Yes |
| 24 | PATCH | `/api/projects/filters/:filterId` | Yes |
| 25 | GET | `/api/projects/:projectId/filters/:filterId/apply` | Yes |
| 26 | DELETE | `/api/projects/filters/:filterId` | Yes |
| 27 | POST | `/api/projects/:projectId/automation-rules` | Yes |
| 28 | GET | `/api/projects/:projectId/automation-rules` | Yes |
| 29 | PATCH | `/api/projects/automation-rules/:ruleId` | Yes |
| 30 | DELETE | `/api/projects/automation-rules/:ruleId` | Yes |
| 31 | GET | `/api/users/me/profile` | Yes |
| 32 | PATCH | `/api/users/me/profile` | Yes |
| 33 | GET | `/api/stats/dashboard` | Yes |
| 34 | GET | `/api/stats/projects/:projectId` | Yes |
| 35 | GET | `/api/logbook/export` | Yes |
| 36 | POST | `/api/logbook/import` | Yes |
| 37 | GET | `/api/dashboard` | Yes |

---

## 1. Health Check

### `GET /api/health`

**Auth:** None (public)

Confirms the API is running.

**Response 200:**
```json
{ "success": true, "message": "Digital Logbook API is running" }
```

---

## 2. Authentication

**Route file:** `server/routes/authRoutes.js`
**Controller:** `server/controllers/authController.js`

### `POST /api/auth/google`

**Auth:** None (public)

Verifies a Google ID token, creates the user on first sign-in, and returns a server-issued session JWT.

**Request Body:**
```json
{ "idToken": "<google-id-token>" }
```

**Response 200:**
```json
{
  "user": {
    "id": "uuid",
    "name": "string",
    "email": "string",
    "avatarUrl": "string|null",
    "createdAt": "timestamp"
  },
  "token": "<jwt-session-token>"
}
```

**Errors:**
- `400` `{ "error": { "code": "MISSING_TOKEN", "message": "idToken is required" } }`
- `401` `{ "error": { "code": "INVALID_TOKEN", "message": "Google token could not be verified" } }`
- `500` `{ "error": { "code": "SERVER_ERROR", "message": "Something went wrong" } }`

### `GET /api/auth/me`

**Auth:** Required (JWT Bearer)

Returns the currently authenticated user.

**Response 200:**
```json
{
  "user": {
    "id": "uuid",
    "name": "string",
    "email": "string",
    "avatarUrl": "string|null",
    "createdAt": "timestamp"
  }
}
```

**Error 401:** `{ "error": { "code": "UNAUTHORIZED", "message": "User not found" } }`

---

## 3. External API (Public)

**Route file:** `server/routes/external.js`

### `GET /api/external/quote`

**Auth:** None (public)

Proxies a random motivational quote from `dummyjson.com`.

**Response 200:**
```json
{ "quote": "string", "author": "string" }
```

**Error 500:** `{ "error": "Failed to fetch external quote", "details": "string" }`

---

## 4. Projects (CRUD)

**Route file:** `server/routes/projects.js`
**Auth:** Required (all endpoints)

### `GET /api/projects`

List all projects owned by the authenticated user.

**Query Params:**
- `status` (optional, default `"active"`) -- one of: `"active"`, `"archived"`, `"all"`

**Response 200:**
```json
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "name": "string",
      "description": "string|null",
      "startDate": "YYYY-MM-DD|null",
      "endDate": "YYYY-MM-DD|null",
      "archivedAt": "timestamp|null",
      "createdAt": "timestamp",
      "updatedAt": "timestamp",
      "totalEntries": 0,
      "loggedMinutes": 0,
      "lastActivity": "timestamp|null"
    }
  ]
}
```

**Error 400:** Invalid project status value.

### `POST /api/projects`

Create a new project.

**Request Body:**
```json
{
  "name": "string (required, max 120 chars)",
  "description": "string (optional)",
  "startDate": "YYYY-MM-DD (optional)",
  "endDate": "YYYY-MM-DD (optional)"
}
```

**Response 201:** `{ "success": true, "data": { <project object> } }`

**Errors:** `400` for missing/long name, invalid dates, or end date before start date.

### `PATCH /api/projects/:projectId`

Update a project's name, description, dates, and/or custom fields.

**Path Params:** `projectId` (UUID)

**Request Body (all optional):**
```json
{
  "name": "string",
  "description": "string|null",
  "startDate": "YYYY-MM-DD|null",
  "endDate": "YYYY-MM-DD|null",
  "fields": [
    {
      "id": "uuid (optional -- omit for new fields)",
      "name": "string",
      "fieldType": "short_text|long_text|number|date|computed",
      "formula": "string (for computed fields)"
    }
  ]
}
```

The `fields` array triggers `syncProjectFields` which creates new fields, updates names/positions, and archives fields not in the list. Uses a database transaction.

**Response 200:** `{ "success": true, "data": { <project object> } }`

**Errors:** `404` if project not found or not owned; `400`/`409` for validation failures.

### `PATCH /api/projects/:projectId/archive`

Archive or unarchive a project.

**Path Params:** `projectId` (UUID)

**Request Body:**
```json
{ "archived": true }
```
Use `false` to unarchive.

**Response 200:** `{ "success": true, "data": { <project object> } }`

**Error 404:** Project not found or not owned.

---

## 5. Project Details (Entries, Checklists, References)

**Route file:** `server/routes/projectDetails.js`
**Controller:** `server/controllers/projectDetailsController.js`
**Auth:** Required (all endpoints)

### `GET /api/projects/:projectId`

Fetch full project details including fields, entries, checklists, references, linked entries, and computed field values.

**Path Params:** `projectId` (UUID)

**Response 200:**
```json
{
  "success": true,
  "data": {
    "project": {
      "id": "uuid",
      "name": "string",
      "description": "string|null",
      "startDate": "YYYY-MM-DD|null",
      "endDate": "YYYY-MM-DD|null",
      "archivedAt": "timestamp|null",
      "createdAt": "timestamp"
    },
    "stats": {
      "totalEntries": 0,
      "loggedMinutes": 0,
      "lastActivity": "timestamp|null"
    },
    "fields": [
      { "id": "uuid", "name": "string", "fieldType": "enum", "position": 0, "required": false, "formula": "string|null" }
    ],
    "entries": [
      {
        "id": "uuid",
        "name": "string",
        "durationMinutes": 0,
        "occurredAt": "timestamp",
        "dueAt": "timestamp|null",
        "completedAt": "timestamp|null",
        "createdAt": "timestamp",
        "tags": ["string"],
        "values": [{ "fieldId": "uuid", "name": "string", "type": "enum", "archived": false, "value": "any" }],
        "checklist": [{ "id": "uuid", "text": "string", "completed": false, "position": 0 }],
        "references": [{ "id": "uuid", "projectId": "uuid", "projectName": "string" }],
        "entryReferences": [{ "id": "uuid", "entryId": "uuid", "entryName": "string", "projectId": "uuid", "projectName": "string" }],
        "linkedEntries": [{ "id": "uuid", "name": "string" }]
      }
    ],
    "references": [{ "id": "uuid", "projectId": "uuid", "projectName": "string" }]
  }
}
```

### `POST /api/projects/:projectId/entries`

Create a new log entry within a project.

**Path Params:** `projectId` (UUID)

**Request Body (Zod-validated):**
```json
{
  "name": "string (required, 1-150 chars)",
  "durationMinutes": "integer (0-10080, default 0)",
  "tags": ["string (max 30 chars, max 10)"],
  "dueAt": "ISO datetime (optional)",
  "values": [
    { "fieldId": "uuid", "value": "string|number|boolean|null" }
  ],
  "linkedEntryIds": ["uuid"],
  "newFields": [
    {
      "clientId": "string",
      "name": "string",
      "type": "short_text|long_text|number|date|computed",
      "value": "optional",
      "formula": "optional"
    }
  ],
  "checklist": [{ "text": "string (1-300 chars)" }],
  "referenceProjectIds": ["uuid"],
  "referenceEntryIds": ["uuid"]
}
```

**Response 201:** `{ "success": true, "data": { <serialized entry> } }`

**Errors:** `400` (validation), `404` (project not found), `409` (duplicate field name).

### `PATCH /api/projects/:projectId/entries/:entryId`

Update an existing entry (name, duration, due date, custom field values, checklist, new fields).

**Path Params:** `projectId` (UUID), `entryId` (UUID)

**Request Body (Zod-validated):**
```json
{
  "name": "string (1-150)",
  "durationMinutes": "integer (0-10080)",
  "dueAt": "ISO datetime|null",
  "fieldIds": ["uuid"],
  "values": [{ "fieldId": "uuid", "value": "string|number|boolean|null" }],
  "newFields": [
    { "clientId": "string", "name": "string", "type": "enum", "value?": "any", "formula?": "string" }
  ],
  "checklistItems": [{ "id": "uuid", "text": "string", "completed": "boolean" }],
  "newChecklistItems": [{ "text": "string" }]
}
```

**Response 200:**
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "name": "string",
    "durationMinutes": 0,
    "occurredAt": "timestamp",
    "updatedAt": "timestamp"
  }
}
```

**Errors:** `404`, `409` (archived project, field conflicts, completed-item restrictions).

### `DELETE /api/projects/:projectId/entries/:entryId`

Delete a log entry.

**Path Params:** `projectId` (UUID), `entryId` (UUID)

**Response 200:** `{ "success": true, "data": { "id": "uuid", "deleted": true } }`

### `GET /api/projects/:projectId/entries/outstanding`

Get entries that have not been completed (no `completed_at`).

**Path Params:** `projectId` (UUID)

**Response 200:** `{ "success": true, "data": [<serialized entries with computed fields>] }`

### `GET /api/projects/:projectId/entries/incomplete`

Get incomplete entries for a project.

**Path Params:** `projectId` (UUID)

**Response 200:** `{ "success": true, "data": [<serialized entries>] }`

### `PATCH /api/projects/:projectId/entries/:entryId/complete`

Mark an entry as complete (sets `completed_at`).

**Path Params:** `projectId` (UUID), `entryId` (UUID)

**Response 200:** `{ "success": true, "data": { <serialized entry with computed fields> } }`

### `POST /api/projects/:projectId/entries/:entryId/complete`

Complete a project entry (alternative HTTP verb for the same operation).

**Path Params:** `projectId` (UUID), `entryId` (UUID)

**Response 200:** `{ "success": true, "data": { <serialized entry> } }`

### `PATCH /api/projects/:projectId/entries/:entryId/checklist/:itemId`

Update a single checklist item's text and/or completion status.

**Path Params:** `projectId` (UUID), `entryId` (UUID), `itemId` (UUID)

**Request Body (Zod-validated):**
```json
{ "text": "string (1-300, optional)", "completed": "boolean (optional)" }
```

At least one field must be provided.

**Response 200:** `{ "success": true, "data": { "id": "uuid", "text": "string", "completed": false, "position": 0 } }`

### `DELETE /api/projects/:projectId/entries/:entryId/checklist/:itemId`

Delete a single checklist item.

**Path Params:** `projectId` (UUID), `entryId` (UUID), `itemId` (UUID)

**Response 200:** `{ "success": true, "data": { "id": "uuid" } }`

### `PATCH /api/projects/:projectId/references`

Set the project-to-project references (full replace).

**Path Params:** `projectId` (UUID)

**Request Body:**
```json
{ "projectIds": ["uuid (max 100)"] }
```

**Response 200:** `{ "success": true, "data": [<reference objects>] }`

### `PATCH /api/projects/:projectId/entries/:entryId/project-references`

Set the entry-to-project references (full replace).

**Path Params:** `projectId` (UUID), `entryId` (UUID)

**Request Body:**
```json
{ "projectIds": ["uuid (max 100)"] }
```

**Response 200:** `{ "success": true, "data": [<reference objects>] }`

### `PATCH /api/projects/:projectId/entries/:entryId/references`

Set the entry-to-entry references (full replace).

**Path Params:** `projectId` (UUID), `entryId` (UUID)

**Request Body:**
```json
{ "entryIds": ["uuid (max 100)"] }
```

**Response 200:** `{ "success": true, "data": { <serialized entry> } }`

---

## 6. Saved Filters

**Route file:** `server/routes/savedFilters.js`
**Controller:** `server/controllers/savedFilterController.js`
**Auth:** Required (all endpoints)

### `POST /api/projects/:projectId/filters`

Create a saved filter for a project.

**Path Params:** `projectId` (UUID)

**Request Body (Zod-validated):**
```json
{
  "name": "string (1-100 chars)",
  "criteria": [
    {
      "fieldId": "uuid (optional)",
      "fieldName": "string (optional)",
      "operator": "equals|not_equals|contains|greater_than|less_than",
      "value": "string|number|boolean|null"
    }
  ]
}
```

At least one criterion required.

**Response 201:**
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "ownerId": "uuid",
    "projectId": "uuid",
    "name": "string",
    "criteria": [],
    "createdAt": "timestamp",
    "updatedAt": "timestamp"
  }
}
```

### `GET /api/projects/:projectId/filters`

List all saved filters for a project.

**Path Params:** `projectId` (UUID)

**Response 200:** `{ "success": true, "data": [<filter objects>] }`

### `PATCH /api/projects/filters/:filterId`

Update a saved filter's name and criteria.

**Path Params:** `filterId` (UUID)

**Request Body:** Same schema as create.

**Response 200:** `{ "success": true, "data": { <filter object> } }`

### `GET /api/projects/:projectId/filters/:filterId/apply`

Apply a saved filter against all entries in a project and return matching entries.

**Path Params:** `projectId` (UUID), `filterId` (UUID)

**Response 200:** `{ "success": true, "data": [<serialized entries that match>] }`

### `DELETE /api/projects/filters/:filterId`

Delete a saved filter.

**Path Params:** `filterId` (UUID)

**Response 200:** `{ "success": true, "data": { "id": "uuid" } }`

---

## 7. Automation Rules

**Route file:** `server/routes/automationRules.js`
**Controller:** `server/controllers/automationRuleController.js`
**Auth:** Required (all endpoints)

Automation rules run when a **new entry is created** (never on edit). A rule evaluates one condition against the created entry's field values; when it matches, its `add_tag` action adds a tag to the entry inside the same transaction. Condition fields must be active (non-archived, non-computed) project fields.

### `POST /api/projects/:projectId/automation-rules`

Create an automation rule for a project.

**Path Params:** `projectId` (UUID)

**Request Body (Zod-validated):**
```json
{
  "name": "string (1-100 chars)",
  "conditionFieldId": "uuid (active project field)",
  "conditionOperator": "equals|not_equals|contains|greater_than|less_than",
  "conditionValue": "string|number|boolean (optional)",
  "actionType": "add_tag",
  "actionValue": "string (1-30 chars, lowercased)",
  "enabled": "boolean (default true)"
}
```

Condition matching uses saved-filter semantics: missing entry values or condition values never match; `equals`/`not_equals` compare as strings; `contains` is case-insensitive; `greater_than`/`less_than` compare as numbers.

**Response 201:** `{ "success": true, "data": { <automation rule object> } }`

### `GET /api/projects/:projectId/automation-rules`

List all automation rules for a project.

**Path Params:** `projectId` (UUID)

**Response 200:** `{ "success": true, "data": [<automation rule objects>] }`

### `PATCH /api/projects/automation-rules/:ruleId`

Update a rule's definition and/or `enabled` flag (at least one field required). Replaces the whole definition when definition fields are supplied.

**Path Params:** `ruleId` (UUID)

**Request Body (Zod-validated):** Any subset of the create schema.

**Response 200:** `{ "success": true, "data": { <automation rule object> } }`

### `DELETE /api/projects/automation-rules/:ruleId`

Delete an automation rule.

**Path Params:** `ruleId` (UUID)

**Response 200:** `{ "success": true, "data": { "id": "uuid" } }`

---

## 8. User Profile

**Route file:** `server/routes/users.js`
**Controller:** `server/controllers/profileController.js`
**Auth:** Required (all endpoints)

### `GET /api/users/me/profile`

Retrieve the authenticated user's profile.

**Response 200:**
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "googleId": "string",
    "name": "string",
    "email": "string",
    "avatarUrl": "string|null",
    "bio": "string|null",
    "createdAt": "timestamp",
    "updatedAt": "timestamp"
  }
}
```

**Error 404:** Profile not found.

### `PATCH /api/users/me/profile`

Update the authenticated user's profile.

This route has a dedicated `express.json({ limit: '750kb' })` middleware to handle avatar image uploads.

**Request Body:**
```json
{
  "name": "string (required, max 100 chars)",
  "bio": "string (optional, max 500 chars)",
  "avatarUrl": "data:image/(png|jpeg|webp);base64,... (max 512 KiB decoded, or null)"
}
```

The `avatarUrl` is validated by `validateAvatarUrl()` in `server/validation/profileAvatar.js` -- it checks MIME type, base64 validity, decoded byte size, and magic-byte signatures.

**Response 200:** `{ "success": true, "data": { <profile object> } }`

**Errors:** `400` (validation), `404` (not found).

---

## 9. Statistics

**Route file:** `server/routes/stats.js`
**Auth:** Required (all endpoints)

### `GET /api/stats/dashboard`

Aggregate dashboard statistics across all the user's entries.

**Response 200:**
```json
{
  "total_hours": 0,
  "active_projects": 0,
  "total_entries": 0
}
```

### `GET /api/stats/projects/:projectId`

Custom-field statistics for a project.

**Path Params:** `projectId` (UUID)

**Query Params:**
- `operation` (optional, default `"total"`) -- one of: `"total"`, `"group"`, `"compare"`, `"plot"`
- `fieldId` (required, UUID) -- the custom field to analyze
- `compareFieldId` (required when `operation=compare`, UUID) -- the second field for comparison

**Response for `operation=total` (numeric field):**
```json
{
  "operation": "total",
  "field": { "id": "uuid", "name": "string", "type": "number" },
  "count": 0,
  "sum": 0,
  "average": 0,
  "minimum": 0,
  "maximum": 0
}
```

**Response for `operation=total` (non-numeric field):**
```json
{
  "operation": "total",
  "field": { "id": "uuid", "name": "string", "type": "string" },
  "count": 0
}
```

**Response for `operation=group`:**
```json
{
  "operation": "group",
  "field": {},
  "groups": [{ "value": "any", "count": 0 }]
}
```

**Response for `operation=compare`:**
```json
{
  "operation": "compare",
  "fields": [{}, {}],
  "entriesCompared": 0,
  "first": { "total": 0, "average": 0 },
  "second": { "total": 0, "average": 0 }
}
```

**Response for `operation=plot`:**
```json
{
  "operation": "plot",
  "chartType": "bar",
  "field": {},
  "data": [{ "label": "string", "value": 0 }]
}
```

**Errors:** `400` (missing fieldId, invalid operation, non-numeric compare), `404` (project/field not found).

---

## 10. Logbook Export/Import

**Route file:** `server/routes/logbookTransfer.js`
**Controller:** `server/controllers/logbookTransferController.js`
**Auth:** Required (all endpoints)

### `GET /api/logbook/export`

Export the entire user's logbook (all projects, fields, entries, values, checklists, references) as a structured JSON document.

**Response 200:**
```json
{
  "success": true,
  "data": {
    "version": 1,
    "exportedAt": "ISO timestamp",
    "projects": [
      {
        "id": "uuid",
        "name": "string",
        "description": "string|null",
        "startDate": "YYYY-MM-DD|null",
        "endDate": "YYYY-MM-DD|null",
        "archivedAt": "timestamp|null",
        "createdAt": "timestamp",
        "updatedAt": "timestamp",
        "fields": [
          {
            "id": "uuid",
            "name": "string",
            "fieldType": "enum",
            "position": 0,
            "required": false,
            "archivedAt": "timestamp|null",
            "createdAt": "timestamp",
            "updatedAt": "timestamp"
          }
        ],
        "entries": [
          {
            "id": "uuid",
            "name": "string",
            "durationMinutes": 0,
            "occurredAt": "timestamp",
            "createdAt": "timestamp",
            "updatedAt": "timestamp",
            "values": [
              {
                "id": "uuid",
                "fieldId": "uuid",
                "valueText": "string|null",
                "valueNumber": "number|null",
                "valueDate": "YYYY-MM-DD|null",
                "createdAt": "timestamp"
              }
            ],
            "checklist": [
              {
                "id": "uuid",
                "text": "string",
                "completed": false,
                "position": 0,
                "createdAt": "timestamp",
                "updatedAt": "timestamp"
              }
            ],
            "referenceProjectIds": ["uuid"]
          }
        ]
      }
    ]
  }
}
```

### `POST /api/logbook/import`

Import a previously exported logbook. Creates or updates projects, fields, entries, values, checklists, and references using the exported UUIDs as stable identifiers (upsert logic).

**Request Body:** The `data` object from the export endpoint (must have `version: 1` and a `projects` array).

**Response 201:**
```json
{
  "success": true,
  "data": {
    "projectsImported": 0,
    "projectsUpdated": 0,
    "fieldsImported": 0,
    "fieldsUpdated": 0,
    "entriesImported": 0,
    "entriesUpdated": 0,
    "valuesImported": 0,
    "valuesUpdated": 0,
    "checklistImported": 0,
    "checklistUpdated": 0,
    "referencesImported": 0
  }
}
```

**Errors:** `400` for invalid version, missing arrays, duplicate IDs, invalid field types, etc.

---

## 11. Dashboard

**Route file:** `server/routes/dashboard.js`
**Auth:** Required

### `GET /api/dashboard`

Read-only dashboard summary for the authenticated user.

**Response 200:**
```json
{
  "success": true,
  "data": {
    "stats": {
      "loggedMinutes": 0,
      "activeProjects": 0,
      "totalEntries": 0,
      "thisWeekMinutes": 0
    },
    "overview": {
      "projectsCreated": 0,
      "projectsArchived": 0,
      "entriesLogged": 0,
      "averageSessionMinutes": 0
    },
    "recentActivity": [
      {
        "entryId": "uuid",
        "projectId": "uuid",
        "entryName": "string",
        "projectName": "string",
        "durationMinutes": 0,
        "occurredAt": "timestamp"
      }
    ]
  }
}
```

The `recentActivity` array contains up to 5 most recent entries across all projects.

---

## Validation Reference

All request validation uses **Zod** (with one imperative exception for avatar uploads).

| Validation File | Schemas |
|---|---|
| `server/validation/entry.validation.js` | `createEntrySchema`, `updateEntrySchema`, `updateChecklistSchema`, `updateProjectReferencesSchema`, `updateEntryReferencesSchema`, `updateEntryProjectReferencesSchema` |
| `server/validation/savedFilter.validation.js` | `createSavedFilterSchema` |
| `server/validation/automationRule.validation.js` | `createAutomationRuleSchema`, `updateAutomationRuleSchema` |
| `server/validation/profileAvatar.js` | `validateAvatarUrl` (imperative -- checks MIME, base64, magic bytes, max 512 KiB decoded) |
| `server/services/projectFieldsService.js` | `fieldsSchema` (project field sync during project edit) |

---

## Database Tables

The API operates on 12 PostgreSQL tables (11 defined in `server/db/schema.sql`, plus `automation_rules` added by `server/sql/20260927_automation_rules.sql`):

| Table | Purpose |
|---|---|
| `users` | User accounts (Google OAuth identity) |
| `projects` | User-owned projects |
| `project_fields` | Custom fields per project (short_text, long_text, number, date, computed) |
| `entries` | Log entries within projects |
| `entry_field_values` | Custom field values per entry |
| `entry_checklist_items` | Checklist items per entry |
| `entry_project_references` | Entry-to-project references |
| `entry_entry_references` | Entry-to-entry references |
| `entry_links` | Bidirectional entry links |
| `project_project_references` | Project-to-project references |
| `saved_filters` | User-defined saved filters (JSONB criteria) |
| `automation_rules` | Entry-creation automation rules (condition + add_tag action) |
