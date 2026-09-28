# Digital Logbook API Documentation

## 1. Overview

The Digital Logbook uses a REST API to provide communication between the React frontend and the Node.js/Express backend.

The frontend does not communicate directly with the PostgreSQL database. Requests from the user interface are sent to the backend, where they are validated and processed before the appropriate database operations are performed.

The application also integrates Google Sign-In as a third-party authentication service.

This document describes the API functionality and external API integration implemented in the Digital Logbook project.

---

## 2. API Architecture

The application follows a layered architecture:

React Frontend
↓
HTTP / REST API
↓
Express Routes
↓
Controllers
↓
Services / Business Logic
↓
Repositories
↓
PostgreSQL Database

Each layer has a separate responsibility.

### Frontend

The React frontend provides the user interface and sends HTTP requests to the backend API.

### Routes

Express routes define the available backend endpoints and direct incoming requests to the appropriate controller.

### Controllers

Controllers receive HTTP requests, obtain authenticated user information, validate request data where required, call the appropriate service, and return HTTP responses.

### Services

The service layer contains application business logic.

For example, when creating an entry, the service performs operations such as:

- checking that the project belongs to the authenticated user;
- validating project fields;
- creating new custom fields where required;
- creating the entry;
- storing custom field values;
- storing checklist items;
- processing project references;
- processing entry references;
- processing linked entries; and
- retrieving the completed entry.

### Repositories

The repository layer performs database operations using PostgreSQL.

This separates SQL/database operations from the controllers and user interface.

---

## 3. REST API Functionality

The Digital Logbook backend provides API functionality for the main features of the application.

These include:

- user authentication;
- projects;
- project details;
- logbook entries;
- creating entries;
- updating entries;
- deleting entries;
- custom entry fields;
- checklists;
- project references;
- entry references;
- entry links;
- outstanding entries;
- incomplete entries; and
- marking entries as complete.

The API therefore acts as the communication layer between the frontend application and the persistent PostgreSQL data.

---

## 4. Entry API

Entries are one of the core resources in the Digital Logbook.

### Creating an Entry

When a user creates an entry, the frontend submits the entry information to the backend.

The backend validates the submitted data before calling the entry service.

A successful creation returns an HTTP `201 Created` response containing the newly created entry data.

Entry creation supports the functionality required by the current Digital Logbook implementation, including:

- entry name;
- duration;
- due date;
- tags;
- custom field values;
- newly created custom fields;
- checklist items;
- project references;
- entry references; and
- linked entries.

The backend also checks that referenced resources belong to the correct authenticated user or project before storing them.

### Updating an Entry

Existing entries can be updated through the backend API.

The update process validates the submitted information and updates the relevant database records.

This functionality supports the Edit Entry feature available in the application.

### Deleting an Entry

Entries can also be deleted through the backend API.

Before deletion, the backend checks that the project and entry exist and that the authenticated user owns the relevant resource.

The deletion functionality is used by the Delete Entry feature implemented during Sprint 2.

---

## 5. Checklist API Functionality

The backend provides functionality for working with checklist items associated with entries.

This includes:

- creating checklist items;
- updating checklist items;
- changing checklist completion state; and
- deleting checklist items.

Ownership and entry validation are performed before checklist changes are applied.

---

## 6. Project and Entry References

The Digital Logbook supports relationships between logbook information.

The backend provides functionality for:

- project references;
- entry-to-project references;
- entry-to-entry references; and
- links between entries.

The backend verifies referenced resources before storing these relationships.

These features support the Intermediate functionality implemented during Sprint 2.

---

## 7. Outstanding and Incomplete Entries

The backend API provides functionality for retrieving outstanding and incomplete entries.

This allows the frontend to present entries that still require attention and supports the application's progress-tracking functionality.

Entries can also be marked as complete through the backend.

---

## 8. Request Validation

Submitted data is validated before relevant service operations are performed.

For example, the Create Entry controller validates incoming entry data before passing it to the service.

If the submitted information does not satisfy the expected structure, the backend returns an error response instead of attempting to store invalid data.

Validation is also performed within the service layer for application-specific rules, such as ownership and reference checks.

---

## 9. Authentication and Authorization

Protected backend operations require an authenticated user.

The backend obtains the authenticated user's ID from the authenticated request and uses it when performing operations on projects and entries.

This allows the backend to verify ownership before accessing or modifying user resources.

Examples include:

- checking that a project belongs to the user;
- checking that an entry belongs to the user;
- validating referenced projects; and
- validating referenced entries.

Authentication is therefore enforced on the backend rather than relying only on the frontend interface.

---

## 10. Google Sign-In Integration

### Purpose

The Digital Logbook integrates Google Sign-In as its third-party authentication service.

This allows users to authenticate using a Google account instead of the Digital Logbook implementing its own username/password authentication interface.

### Authentication Flow

The implemented authentication flow can be represented as:

User
↓
Digital Logbook Frontend
↓
Google Sign-In
↓
Google authentication result
↓
Digital Logbook authentication/backend processing
↓
Authenticated Digital Logbook session/access

Google is responsible for authenticating the Google account, while the Digital Logbook remains responsible for application-specific access and user operations.

### Development and Production Configuration

During development, Google Sign-In was initially configured for the local development environment.

For deployment, the Google authentication configuration was updated so that authentication could also work from the deployed frontend.

The deployed application was tested to confirm that users could access the application using Google Sign-In outside the local development environment.

This integration is currently used as the application's external third-party authentication integration.

---

## 11. HTTP Responses and Error Handling

The backend uses HTTP status codes to communicate the outcome of requests.

Examples used by the application include:

| Status | Meaning |
|---|---|
| `200 OK` | A request or update completed successfully |
| `201 Created` | A new resource was successfully created |
| `400 Bad Request` | Submitted data or a requested operation is invalid |
| `401 Unauthorized` | Authentication is required |
| `404 Not Found` | The requested resource could not be found |
| `409 Conflict` | The operation conflicts with existing data or application rules |
| `500 Internal Server Error` | An unexpected backend error occurred |

Errors are passed through the backend error-handling process so that the frontend can display an appropriate failure message.

---

## 12. API Testing

API functionality has been tested through automated backend tests and manual integration testing during development.

Testing includes successful operations as well as validation and failure cases.

The team also tested functionality after deployment to verify communication between the deployed frontend and backend.

Production testing has included functionality such as:

- Google authentication;
- retrieving project information;
- creating and working with entries;
- editing entries;
- deleting entries; and
- verifying that persisted changes remain after refreshing the application.

---

## 13. Deployment

The Digital Logbook frontend and backend are deployed separately.

The React frontend communicates with the deployed backend API rather than accessing the PostgreSQL database directly.

The backend provides the API and database-access functionality required by the frontend.

During Sprint 2, deployment-related API issues were identified and corrected, including frontend API configuration that initially caused deployed requests to target a local development address.

The production configuration was corrected so that the deployed frontend communicates with the deployed backend.

---

## 14. API Security Considerations

The implemented API includes several controls to protect user data and prevent invalid operations.

These include:

- authentication before protected operations;
- backend ownership checks;
- request validation;
- project ownership validation;
- entry ownership validation;
- reference validation; and
- separation of frontend, service, and database responsibilities.

Sensitive database operations are performed on the backend and are not exposed directly to the browser.

---

## 15. Sprint 2 API Improvements

During Sprint 2, the API was extended and used to support the application's move toward the Intermediate Digital Logbook requirements.

Backend functionality supports features such as:

- richer entry information;
- tags;
- custom fields;
- checklists;
- project references;
- entry references;
- entry links;
- outstanding/incomplete entry tracking;
- entry editing; and
- entry deletion.

API and deployment defects discovered during development were handled through the team's bug-tracking and Git workflow.

---

## 16. API Traceability

The API implementation can be traced through the project as follows:

Project Requirements
↓
Sprint/User Stories
↓
Frontend Feature
↓
REST API Request
↓
Controller and Validation
↓
Service / Business Logic
↓
Repository
↓
PostgreSQL Database
↓
Testing and Review

This provides separation between the user interface, application logic, and persistent storage while allowing implemented requirements to be traced to backend functionality.

---

## 17. External Integration Summary

The external third-party integration currently documented for the Digital Logbook is:

| Integration | Purpose | Status |
|---|---|---|
| Google Sign-In | Authenticate users using their Google accounts | Implemented |

The Calendar and Board views are application features and are not documented as external APIs because they operate on Digital Logbook data rather than an external calendar or board service.

---

## 18. Conclusion

The Digital Logbook uses a REST API as the main communication mechanism between its React frontend and Node.js/Express backend.

The API supports the application's core and Intermediate functionality while keeping business logic and PostgreSQL database operations on the backend.

Google Sign-In provides the application's implemented third-party authentication integration.

Together, these components provide the API and authentication infrastructure currently used by the deployed Digital Logbook application.
