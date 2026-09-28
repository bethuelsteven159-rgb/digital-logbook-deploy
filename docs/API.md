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
| 27 | GET | `/api/users/me/profile` | Yes |
| 28 | PATCH | `/api/users/me/profile` | Yes |
| 29 | GET | `/api/stats/dashboard` | Yes |
| 30 | GET | `/api/stats/projects/:projectId` | Yes |
| 31 | GET | `/api/logbook/export` | Yes |
| 32 | POST | `/api/logbook/import` | Yes |
| 33 | GET | `/api/dashboard` | Yes |
| 34 | POST | `/api/projects/:projectId/recurring-entries` | Yes |
| 35 | GET | `/api/projects/:projectId/recurring-entries` | Yes |
| 36 | PATCH | `/api/projects/recurring-entries/:definitionId` | Yes |
| 37 | DELETE | `/api/projects/recurring-entries/:definitionId` | Yes |
| 38 | POST | `/api/projects/:projectId/recurring-entries/generate-due` | Yes |

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

## 7. User Profile

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

## 8. Statistics

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

### `GET /api/stats/projects/:projectId/custom`

List the authenticated user's saved custom statistics for a project, each with its current recalculated value.

**Path Params:** `projectId` (UUID)

**Response 200:**
```json
{
  "statistics": [
    {
      "id": "uuid",
      "projectId": "uuid",
      "name": "string",
      "expression": "sum(Score) / count(Score)",
      "value": 0,
      "error": "string|null",
      "createdAt": "timestamp",
      "updatedAt": "timestamp"
    }
  ]
}
```

`value` is `null` and `error` is set when a saved statistic can no longer be calculated (for example its field was archived).

**Errors:** `404` (project not found).

### `POST /api/stats/projects/:projectId/custom`

Create a user-defined custom statistic from project fields.

**Request Body:**
```json
{
  "name": "Average score (string, required, max 100 chars)",
  "expression": "avg(Score) * 2 (string, required, max 500 chars)"
}
```

Expressions support numbers, `+ - * / % ^`, brackets, and the aggregates `sum()`, `avg()`, `min()`, `max()` and `count()`. Fields are referenced by name — `sum(Score)` or `sum("Call Duration")` when the name contains spaces. Non-numeric fields can only be used with `count()`.

**Response 201:**
```json
{
  "id": "uuid",
  "projectId": "uuid",
  "name": "Average score",
  "expression": "avg(Score) * 2",
  "value": 0,
  "error": null,
  "createdAt": "timestamp",
  "updatedAt": "timestamp"
}
```

**Errors:** `400` (missing name/expression, invalid syntax, unknown or ambiguous field, non-numeric field without `count()`), `404` (project not found).

### `PUT /api/stats/projects/:projectId/custom/:statId`

Update a saved custom statistic's name and/or expression and return its recalculated value.

**Path Params:** `projectId` (UUID), `statId` (UUID)

**Request Body:** same shape as `POST`.

**Response 200:** the updated statistic object with a freshly recalculated `value`.

**Errors:** `400` (validation), `404` (project or statistic not found).

### `DELETE /api/stats/projects/:projectId/custom/:statId`

Delete a saved custom statistic.

**Path Params:** `projectId` (UUID), `statId` (UUID)

**Response 200:**
```json
{ "id": "uuid" }
```

**Errors:** `404` (statistic not found).

---

## 9. Logbook Export/Import

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

## 10. Dashboard

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

## 11. Recurring Entries

**Route file:** `server/routes/recurringEntries.js`
**Controller:** `server/controllers/recurringEntryController.js`
**Auth:** Required (all endpoints)

Recurring entry definitions store a repeating template. Generated occurrences are normal rows in `entries`, linked back through `entries.recurringDefinitionId` (`recurring_definition_id`) and their occurrence date (`recurrence_date`).

**V1 semantics**

* `daily` — every `intervalCount` days, starting from `startsOn`.
* `weekly` — every `intervalCount` weeks (7-day steps), starting from `startsOn`.
* `monthly` — every `intervalCount` months, anchored to the start day (for example, starting on the 31st yields 31 Jan → 28/29 Feb → 31 Mar).
* Generation is catch-up based: `POST .../generate-due` creates entries for missing occurrence dates after `lastGeneratedOn` up to today, limited to **100 occurrences per request across all of the project's definitions combined**. Occurrences are generated oldest due date first (ties broken by definition id); anything beyond the cap is left for the next `generate-due` request, and each definition's `lastGeneratedOn` only advances through the occurrences actually processed in that request.
* Generation is idempotent. A partial unique index on `(recurring_definition_id, recurrence_date)` rejects duplicates even under concurrent requests, and the `lastGeneratedOn` watermark only moves forward, so an occurrence that was deleted is never recreated.
* GET endpoints stay read-only; generation only happens through the dedicated POST endpoint, which the client calls while loading/refreshing the project details page.
* V1 limitation: generated entries do **not** trigger automation rules.

### `POST /api/projects/:projectId/recurring-entries`

Create a recurring entry definition.

**Body:**
```json
{
  "name": "Morning journal",
  "durationMinutes": 20,
  "tags": ["journal"],
  "checklist": [{ "text": "Write three lines" }],
  "frequency": "daily",
  "intervalCount": 1,
  "startsOn": "2026-09-01",
  "endsOn": null,
  "enabled": true
}
```

`name`, `frequency` (`daily` | `weekly` | `monthly`) and `startsOn` are required. The remaining fields default to `durationMinutes: 0`, `tags: []`, `checklist: []`, `intervalCount: 1`, `endsOn: null`, `enabled: true`.

**Response 201:**
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "projectId": "uuid",
    "name": "Morning journal",
    "durationMinutes": 20,
    "tags": ["journal"],
    "checklist": [{ "text": "Write three lines" }],
    "frequency": "daily",
    "intervalCount": 1,
    "startsOn": "2026-09-01",
    "endsOn": null,
    "enabled": true,
    "lastGeneratedOn": null,
    "createdAt": "timestamp",
    "updatedAt": "timestamp"
  }
}
```

**Errors:** `400` invalid body, `404` project not found, `409` archived project.

### `GET /api/projects/:projectId/recurring-entries`

List recurring entry definitions for an owned project, most recently created first.

**Response 200:**
```json
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "projectId": "uuid",
      "name": "Morning journal",
      "durationMinutes": 20,
      "tags": ["journal"],
      "checklist": [{ "text": "Write three lines" }],
      "frequency": "daily",
      "intervalCount": 1,
      "startsOn": "2026-09-01",
      "endsOn": null,
      "enabled": true,
      "lastGeneratedOn": "2026-09-27",
      "createdAt": "timestamp",
      "updatedAt": "timestamp"
    }
  ]
}
```

**Errors:** `404` project not found.

### `PATCH /api/projects/recurring-entries/:definitionId`

Update any subset of a definition's fields, including `enabled` to pause or resume it. At least one field must be provided.

**Response 200:** the updated definition (same shape as the create response).

**Errors:** `400` invalid body or `endsOn` earlier than `startsOn`, `404` recurring entry not found, `409` archived project.

### `DELETE /api/projects/recurring-entries/:definitionId`

Delete a definition. Occurrence entries that were already generated remain; their link is cleared (`ON DELETE SET NULL`).

**Response 200:**
```json
{
  "success": true,
  "data": { "id": "uuid" }
}
```

**Errors:** `404` recurring entry not found, `409` archived project.

### `POST /api/projects/:projectId/recurring-entries/generate-due`

Generate missing occurrences up to today for the project's enabled definitions. A single request generates at most 100 occurrences in total across all definitions, oldest due date first (ties broken by definition id); any remaining backlog is left for the next request, where generation continues from the persisted watermarks. Safe to call repeatedly; repeated or concurrent calls never create duplicate entries.

**Response 200:**
```json
{
  "success": true,
  "data": {
    "generatedCount": 2,
    "generatedEntries": [
      { "id": "uuid", "definitionId": "uuid", "recurrenceDate": "2026-09-26" },
      { "id": "uuid", "definitionId": "uuid", "recurrenceDate": "2026-09-27" }
    ]
  }
}
```

`generatedCount` is `0` with an empty `generatedEntries` array when nothing is due, or when the project is archived (archived projects are a no-op instead of an error).

**Errors:** `404` project not found.

---

## Validation Reference

All request validation uses **Zod** (with one imperative exception for avatar uploads).

| Validation File | Schemas |
|---|---|
| `server/validation/entry.validation.js` | `createEntrySchema`, `updateEntrySchema`, `updateChecklistSchema`, `updateProjectReferencesSchema`, `updateEntryReferencesSchema`, `updateEntryProjectReferencesSchema` |
| `server/validation/recurringEntry.validation.js` | `createRecurringEntrySchema`, `updateRecurringEntrySchema` |
| `server/validation/savedFilter.validation.js` | `createSavedFilterSchema` |
| `server/validation/profileAvatar.js` | `validateAvatarUrl` (imperative -- checks MIME, base64, magic bytes, max 512 KiB decoded) |
| `server/services/projectFieldsService.js` | `fieldsSchema` (project field sync during project edit) |

---

## Database Tables

The API operates on 12 PostgreSQL tables (11 defined in `server/db/schema.sql`, plus `recurring_entry_definitions` from `server/sql/20260928_recurring_entries.sql`):

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
| `recurring_entry_definitions` | Recurrence rules for automatically generated log entries |
