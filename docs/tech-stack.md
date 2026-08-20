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
_(pending)_

## Database — Offline (on-device)

_(pending)_

## Database — Online (cloud, shared)

_(pending)_

## API

_(pending)_

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

## Authentication

- Pending confirmation — the team has not yet decided between Google Authentication and Supabase's built-in authentication.

## External APIs

- Pending confirmation — no external APIs have been confirmed yet, apart from authentication-related services.

## Code Quality

- ESLint and Prettier configurations are included to enforce consistent JavaScript code quality and formatting.
- ESLint uses recommended rules with project-specific adjustments:
  - Unused variables generate warnings.
  - Console statements are allowed.
- Prettier enforces consistent formatting, including single quotes, semicolons, 2-space indentation, and a 100-character line width.

## Development Tools

- **Git/Gitea** — used for version control and team collaboration.
- **npm** — used for dependency management and running frontend scripts.
- **VS Code** — used as the development environment.
