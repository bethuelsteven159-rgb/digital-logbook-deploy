# Tech Stack

Owner: Sino

This document lists the technologies used in the Digital Logbook and explains why each was chosen. Items marked **pending** are still awaiting group confirmation.

## Design

**Tool:** Figma

Figma was selected as the wireframing and UI/UX design tool for the project. It was chosen because it is a dedicated design platform that allows the team to create, review, and iterate on interfaces before implementation begins.

Unlike AI UI generators such as UX Pilot and Lovable AI, which can quickly generate interfaces from prompts but provide less control over the design process, Figma keeps the design and development phases separate. This allows the frontend/UI-UX team to review and refine the design before converting it into code.

The final designs serve as a blueprint for frontend development. Figma is used for creating wireframes, mockups, and interface layouts, while the actual implementation is done separately using the chosen frontend technologies.

Note: Figma's default code export generated TypeScript React (`.tsx`) files. Since the project uses a JavaScript-based stack, exported code may require conversion to JavaScript React (`.jsx`) before integration. This is considered a minor adjustment rather than a limitation.

## Frontend

React is used to build the user interface, including the dashboard, entry forms, and project views. It was chosen because it supports a component-based structure, allowing reusable UI components and efficient development.

Vite is used as the frontend build tool and development server for running and bundling the React application. It was chosen because it provides a faster development environment and is actively maintained compared to Create React App.

The client will be deployed using Netlify, chosen for its free tier, straightforward hosting for Vite-built static sites, and simple continuous deployment directly from the Git repository.

## Backend

The backend is built as a single Express.js application using **Node.js**. Node.js was chosen because it allows the project to use JavaScript across both frontend and backend development, reducing the need for multiple programming languages. Express.js provides a lightweight and flexible framework for building REST APIs and organizing backend functionality.

**Node.js** is used as the runtime environment for executing server-side JavaScript. **Express.js** is used to create REST API endpoints, handle HTTP requests and responses, and structure backend routes. **CORS** is used to enable communication between the frontend application and the backend running on a different origin. **dotenv** is used to manage environment variables such as database connection details, authentication secrets, and application configuration. **Zod** is used for schema and input validation, ensuring incoming request data matches expected formats before it reaches business logic.

The backend handles all server-side responsibilities in one application: user authentication, Google sign-in verification, JWT session creation, project management, project details, entries, user profiles, validation, and database operations.

The backend follows a layered architecture consisting of routes, controllers, services, repositories, and database access layers. This separation improves maintainability by keeping API handling, business logic, and database operations separated.

A **REST API**, implemented using Express.js, is used for communication between the frontend and backend, providing endpoints for user authentication, user profiles, project management, project details, and logbook entries. The API uses JSON as the primary data exchange format between the client and server. The REST structure allows the frontend and backend to communicate independently, making the system easier to maintain and extend.

**Google Authentication (OAuth 2.0)** is used for user sign-in and identity verification through Google ID tokens, and the Google Authentication API verifies Google user identities during sign-in. **JSON Web Tokens (JWT)** are used for maintaining authenticated sessions after successful login. Google Authentication was chosen to provide a secure and convenient login process without requiring users to create and manage separate passwords.

The authentication flow verifies Google credentials, creates a backend session token, and protects restricted API routes using JWT middleware. The backend verifies incoming JWT tokens before allowing access to protected resources, ensuring that only authenticated users can access user-specific data.

The server will be deployed using Render, chosen for its free tier for small Node.js services, native support for environment variables, and simple deployment directly from the Git repository.

### Authentication

**Google Authentication (OAuth 2.0)** is used for user sign-in and identity verification through Google ID tokens. The Google Authentication API verifies Google user identities during sign-in. **JSON Web Tokens (JWT)** are used for maintaining authenticated sessions after successful login.

Google Authentication was chosen to provide a secure and convenient login process without requiring users to create and manage separate passwords.

The authentication flow verifies Google credentials, creates a backend session token, and protects restricted API routes using JWT middleware. The backend verifies incoming JWT tokens before allowing access to protected resources, ensuring that only authenticated users can access user-specific data.

The server will be deployed using Render, chosen for its free tier for small Node.js services, native support for environment variables, and simple deployment directly from the Git repository.

## Database

**PostgreSQL** is used as the primary relational database for storing users, projects, project fields, entries, and profile information.

PostgreSQL was chosen because it provides structured data storage, strong relationships between entities, and reliable support for applications that require consistent data management.

**pg (node-postgres)** is used as the PostgreSQL client library for connecting the backend to the database.

The database schema uses relational database principles, including UUID primary keys for uniquely identifying records, foreign key relationships to maintain connections between related data, constraints to enforce valid data, and indexes to improve query performance.

Database entities include users, projects, project fields, entries, and entry field values.

## Testing

**Vitest** is used for unit and integration testing, chosen for its native compatibility with the Vite-based frontend tooling already in use. Test coverage is still being built out, and final verification is pending.

## CI/CD

**Gitea Actions** is configured to run automated tests on pull requests.

## Repository Structure

**One repository (monorepo)** contains separate folders for the frontend and backend, with separate branches for feature development. A monorepo was chosen instead of separate repositories to reduce coordination overhead and simplify collaboration within the 6-person student team.

## Code Quality

ESLint and Prettier configurations are included to enforce consistent JavaScript code quality and formatting. ESLint uses recommended rules with project-specific adjustments: unused variables generate warnings, and console statements are allowed. Prettier enforces consistent formatting, including single quotes, semicolons, 2-space indentation, and a 100-character line width.

## Development Tools

**Git/Gitea** is used for version control and team collaboration.
**Node Package Manager (npm)** is used to install dependencies and run scripts for the frontend and backend. **VS Code** is used as the development environment.
