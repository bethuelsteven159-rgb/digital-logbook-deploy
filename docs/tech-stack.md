# Tech Stack

Owner: Sino

This document explains the technologies used in the Digital Logbook, the role each technology plays in the system, and the reasons behind the choices made during development. For the individual packages used in the root, `client/` and `server/`, see [third-party-code.md](./third-party-code.md).

## Design

**Tool:** Figma

Figma is used as the main wireframing and UI/UX design tool for the project. It allows the team to design, review, and refine the user interface before development begins.

Figma was chosen because it provides a dedicated environment for designing application interfaces and encourages a clear separation between the design and development stages. This allows the frontend and UI/UX team to discuss changes, test different layouts, and agree on the final design before implementation.

Unlike AI-based UI generation tools such as UX Pilot and Lovable AI, which can quickly generate interface designs from prompts, Figma provides more control over the design process. The team can manually adjust layouts, components, and user flows instead of relying on generated designs that may require significant modification.

The final Figma designs act as a reference point for frontend development. Wireframes, mockups, and interface layouts are created in Figma, while the implementation of these designs is completed separately using the selected frontend technologies.

Note: Figma's default code export generates TypeScript React (`.tsx`) files. Since the project uses a JavaScript-based stack, exported components may require conversion to JavaScript React (`.jsx`) before being integrated into the application. This is considered a small adjustment rather than a limitation of using Figma.

## Frontend

React is used to build the application's user interface, including the dashboard, entry forms, and project views. It was chosen because its component-based structure allows the team to create reusable interface elements and maintain a more organised frontend codebase.

Instead of building each page as a separate piece of code, React allows common elements such as navigation bars, forms, and reusable UI components to be created once and reused throughout the application. This makes the application easier to maintain as additional features are introduced.

Vite is used as the frontend build tool and development server for the React application. It was selected because it provides a faster development experience, quicker startup times, and modern support for React projects compared to older tools such as Create React App.

The following technologies support the frontend:

- **React Router** handles navigation between pages without full page reloads.
- **Tailwind CSS** provides utility classes for styling, keeping spacing, colour, and typography consistent when several people build different pages.
- **lucide-react** provides a consistent icon set.
- **three.js**, with **@react-three/fiber** and **@react-three/drei**, renders the 3D scene on the Constellation page.

The frontend is deployed using Netlify. Netlify was chosen because it provides a simple deployment process for Vite-based static applications, supports continuous deployment directly from the Git repository, and provides a free tier suitable for the project requirements.

## Backend

The backend is implemented as a single Express.js application running on **Node.js**. This approach allows the team to use JavaScript throughout both the frontend and backend, reducing the need to maintain multiple programming languages.

Node.js provides the runtime environment required to execute server-side JavaScript, while Express.js provides the framework used to build REST API endpoints, handle HTTP requests and responses, and organise backend routes.

The backend is responsible for handling server-side operations such as user authentication, Google sign-in verification, JWT session management, project management, project details, user profiles, logbook entries, validation, database communication, and calls to external services.

The following technologies support the backend:

- **Node.js** is used as the server-side JavaScript runtime.
- **Express.js** is used to create API routes and structure backend functionality.
- **CORS** enables communication between the frontend and backend when they are running on different origins.
- **dotenv** manages environment variables such as database credentials, authentication configuration, external API keys, and application settings.
- **Zod** validates incoming request data to ensure that information received by the backend matches the expected format before processing.
- **mathjs** safely evaluates user-typed formulas for computed fields.

The backend follows a layered architecture consisting of routes, controllers, services, repositories, and database access layers. This separation keeps different responsibilities organised, making the system easier to maintain, debug, and extend as new features are added.

A **REST API** is used as the communication layer between the frontend and backend. The API provides endpoints for authentication, user profiles, project management, project details, logbook entries, and the external API-backed features. JSON is used as the primary data format exchanged between the client and server. See [API.md](./API.md) for the endpoint reference.

Using a REST-based structure allows the frontend and backend to remain independent. This makes it easier to modify one part of the system without requiring major changes to the other.

The backend is deployed using Render. Render was selected because it provides a free tier suitable for small Node.js services, supports environment variable configuration, and allows simple deployment directly from a Git repository. Because Render could not connect directly to the team's Gitea repository, the approved `main` branch is mirrored to GitHub and Render deploys from the GitHub mirror.

## Authentication

**Google Authentication (OAuth 2.0)** is used for user sign-in and identity verification. Instead of requiring users to create and remember separate passwords, users can authenticate using their existing Google accounts.

During login, Google provides an ID token that is verified by the backend using the Google Authentication API. Once the user's identity has been confirmed, the backend creates an authenticated session using **JSON Web Tokens (JWT)**.

JWT is used to maintain authenticated sessions after successful login. Protected API routes use JWT middleware to verify incoming requests before allowing access to user-specific resources.

The authentication process follows this flow:

1. The user signs in using Google Authentication.
2. Google provides an identity token.
3. The backend verifies the token and confirms the user's identity.
4. The backend creates a JWT session token.
5. Protected routes verify the JWT before allowing access.

This approach provides a secure authentication process while reducing the complexity of managing passwords and user credentials.

## Database

**PostgreSQL** is used as the primary relational database for storing application data, including users, projects, project fields, entries, and profile information. The database is hosted on **Neon**, a managed PostgreSQL service, so all team members and the deployed backend work against the same shared database.

PostgreSQL was selected because it provides reliable structured data storage and strong support for relationships between different entities. This makes it suitable for an application where users, projects, and logbook entries are connected through multiple relationships.

**pg (node-postgres)** is used as the PostgreSQL client library that allows the backend application to communicate with the database. Queries are written as raw SQL through `pg` rather than through an ORM, which keeps them transparent and easy to debug.

The database follows relational database principles, including:

- UUID primary keys for uniquely identifying records.
- Foreign keys to maintain relationships between connected entities.
- Constraints to ensure valid data is stored.
- Indexes to improve query performance.

The main database entities include users, projects, project fields, entries, and entry field values, along with supporting tables for checklists, references, saved filters, automation rules, recurring entries, and project sharing. These entities are connected through relationships that allow users to create projects, define project-specific fields, and store structured logbook entries. See [DATABASE.md](./DATABASE.md) for the full schema documentation.

## External Services

The application uses the following external services, all called from the backend so that API keys never reach the browser:

- **Google Gemini API** generates project-progress insights and text-to-speech narration on the Project Details page.
- **YouTube Data API** searches for learning videos on the Learning Videos page.
- **Brevo** sends transactional emails for shared-project change notifications.
- **Google Sign-In** authenticates users (see Authentication above).

None of the Gemini or YouTube integrations require an additional npm package. See [External API Integration](./external-api/README.md) for the full documentation.

## Testing

**Vitest** is used for unit and integration testing on both the frontend and the backend. It was chosen because it integrates well with the Vite-based frontend tooling already used in the project, and using one test runner for both applications means the team only has to learn one tool. Frontend component tests use **Testing Library** and **jsdom** to simulate how a real user interacts with the interface, and parts of the test suite also use Node's built-in test runner.

Code coverage is measured with `@vitest/coverage-v8` and `c8` using each application's `test:coverage` script, and coverage reports are uploaded to **Codecov**. The external API integrations are tested with mocked providers, so the tests do not depend on live Gemini or YouTube access.

See [testing-documentation.md](./testing-documentation.md) for the testing approach and results, [codecov-setup.md](./codecov-setup.md) for coverage reporting, and [External API Testing & Failure Handling](./external-api/testing.md) for the external API tests.

## CI/CD

The repository contains an automated test workflow, `tests.yml`, defined for both **Gitea Actions** (`.gitea/workflows/`) and **GitHub Actions** (`.github/workflows/`, for the GitHub mirror). Both versions run on every push to `main` and on every pull request, and perform the same steps:

1. Check out the repository.
2. Set up Node.js 24.
3. Install the client and server dependencies with `npm ci`.
4. Run the server tests with coverage.
5. Run the client tests with coverage.
6. Upload the coverage reports to Codecov. A failure at this step does not fail the workflow.

Developers should still run the tests locally (`npm test` in `server/` and `client/`) before opening a pull request, and reviewers are expected to confirm that the workflow passes before approving a merge.

Deployment is separate from testing: the frontend is deployed through Netlify, and the backend is deployed through Render from the GitHub mirror of the approved `main` branch.

## Repository Structure

The project uses a **single repository (monorepo)** containing separate folders for the frontend and backend applications.

A monorepo structure was chosen because it simplifies collaboration within the 6-person team by keeping related code in one place. It reduces the overhead of managing multiple repositories while still allowing frontend and backend development to remain separated.

The repository uses separate branches for feature development, allowing team members to work independently before merging completed changes. Gitea is the authoritative repository for development and review, and approved changes are mirrored to GitHub for deployment. See [git-workflow.md](./git-workflow.md) for the branching and pull request process.

## Code Quality

ESLint and Prettier are used to maintain consistent code quality and formatting across the project.

ESLint applies recommended JavaScript rules with project-specific adjustments. For example, unused variables generate warnings rather than blocking development, and console statements are allowed where needed.

Prettier automatically formats code using the project's chosen style rules, including:

- Single quotes
- Semicolons
- Two-space indentation
- A maximum line width of 100 characters
- Trailing commas wherever valid
- LF line endings

These tools help ensure that code remains consistent and easier for team members to read and maintain.

## Development Tools

**Git/Gitea** is used for version control and team collaboration. It allows team members to manage branches, review changes, and merge completed features.

**Node Package Manager (npm)** is used to install project dependencies and run development scripts for both the frontend and backend applications. At the repository root, `concurrently` lets `npm run dev` start the client and server together.

**VS Code** is used as the main development environment because it provides support for JavaScript development, Git integration, extensions, debugging tools, and project management features.
