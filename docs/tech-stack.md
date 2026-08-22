# Tech Stack

Owner: Sino

This document lists the technologies used in the Digital Logbook and explains why each was chosen. Items marked **pending** are still awaiting group confirmation.

## Design

- **Tool:** Figma

Figma was selected as the wireframing and UI/UX design tool for the project. It was chosen because it is a dedicated design platform that allows the team to create, review, and iterate on interfaces before implementation begins.

Unlike AI UI generators such as UX Pilot and Lovable AI, which can quickly generate interfaces from prompts but provide less control over the design process, Figma keeps the design and development phases separate. This allows the frontend/UI-UX team to review and refine the design before converting it into code.

The final designs serve as a blueprint for frontend development. Figma is used for creating wireframes, mockups, and interface layouts, while the actual implementation is done separately using the chosen frontend technologies.

Note: Figma's default code export generated TypeScript React (`.tsx`) files. Since the project uses a JavaScript-based stack, exported code may require conversion to JavaScript React (`.jsx`) before integration. This is considered a minor adjustment rather than a limitation.

## Frontend

- **React** — used to build the user interface, including the dashboard, entry forms, and project views.
- Chosen because it supports a component-based structure, allowing reusable UI components and efficient development.

- **Vite** — used as the frontend build tool and development server for running and bundling the React application.
- Chosen because it provides a faster development environment and is actively maintained compared to Create React App.

## Backend

The backend is built using **Node.js** with the **Express.js** framework. Node.js was chosen because it allows the project to use JavaScript across both frontend and backend development, reducing the need for multiple programming languages. Express.js provides a lightweight and flexible framework for building REST APIs and organizing backend functionality.

- **Node.js** — used as the runtime environment for executing server-side JavaScript.
- **Express.js** — used to create REST API endpoints, handle HTTP requests and responses, and structure backend routes.
- **CORS** — used to enable communication between the frontend application and backend services running on different origins.
- **dotenv** — used to manage environment variables such as database connection details, authentication secrets, and application configuration.
- **Zod** — used in the application server for schema and input validation, ensuring incoming request data matches expected formats before it reaches business logic.

The backend is separated into two server-side components:

- **Authentication backend (`backend/`)** — responsible for user authentication, Google sign-in verification, JWT session creation, and protecting authentication routes.
- **Application server (`server/`)** — responsible for the main Digital Logbook functionality, including project management, project details, entries, user profiles, validation, and database operations.

The application server follows a layered architecture consisting of routes, controllers, services, repositories, and database access layers. This separation improves maintainability by keeping API handling, business logic, and database operations separated.

## Database — Offline (on-device)

No offline database implementation has been confirmed. Pending team decision.

## Database — Online (cloud, shared)

- **PostgreSQL** — used as the primary relational database for storing users, projects, project fields, entries, and profile information.

PostgreSQL was chosen because it provides structured data storage, strong relationships between entities, and reliable support for applications that require consistent data management.

- **pg (node-postgres)** — used as the PostgreSQL client library for connecting the Node.js backend to the database.

The database schema uses relational database principles, including:

- UUID primary keys for uniquely identifying records.
- Foreign key relationships to maintain connections between related data.
- Constraints to enforce valid data.
- Indexes to improve query performance.

Database entities include users, projects, project fields, entries, and entry field values.


## API

- **REST API** — used for communication between the frontend and backend.

The API is implemented using Express.js and provides endpoints for:

- User authentication
- User profiles
- Project management
- Project details
- Logbook entries

The API uses JSON as the primary data exchange format between the client and server. The REST structure allows the frontend and backend to communicate independently, making the system easier to maintain and extend.

## Authentication

- **Google Authentication (OAuth 2.0)** — used for user sign-in and identity verification through Google ID tokens.
- **JSON Web Tokens (JWT)** — used for maintaining authenticated sessions after successful login.

Google Authentication was chosen to provide a secure and convenient login process without requiring users to create and manage separate passwords.

The authentication flow verifies Google credentials, creates a backend session token, and protects restricted API routes using JWT middleware.

The backend verifies incoming JWT tokens before allowing access to protected resources, ensuring that only authenticated users can access user-specific data.

## Testing

- Unit testing is planned/implemented where necessary.
- Final test verification is pending.

## CI/CD

- **Gitea Actions** — configured to run automated tests on pull requests.

## Deployment

- **Frontend:** Pending deployment — options include Netlify or Vercel for static hosting.
- **Backend:** Pending deployment — options include Render or Railway for server hosting.
- Frontend and backend are deployed separately, allowing each component to use a platform suited to its requirements.

## Repository Structure

- **One repository (monorepo)** containing separate folders for the frontend and backend, with separate branches for feature development.
- A monorepo was chosen instead of separate repositories to reduce coordination overhead and simplify collaboration within the 6-person student team.


## External APIs

- **Google Authentication API** — used for verifying Google user identities during authentication.

No other external APIs have been confirmed.

## Code Quality

- ESLint and Prettier configurations are included to enforce consistent JavaScript code quality and formatting.
- ESLint uses recommended rules with project-specific adjustments:
  - Unused variables generate warnings.
  - Console statements are allowed.
- Prettier enforces consistent formatting, including single quotes, semicolons, 2-space indentation, and a 100-character line width.

## Development Tools

- **Git/Gitea** — used for version control and team collaboration.
- **Node Package Manager (npm)** — used to install dependencies and run scripts for the frontend, backend, and server components.
- **VS Code** — used as the development environment.
