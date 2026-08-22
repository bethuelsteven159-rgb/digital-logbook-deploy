# Frontend Architecture, UI/UX, Responsiveness & Accessibility

Owner: Morare

## Frontend Structure

The client is a React (Vite) single-page application. Pages live under `src/pages/`, organized one folder per screen. Shared/reusable UI elements live under `src/components/`. Global user state is provided via React Context (`src/context/UserContext.jsx`), wrapping the whole app. API calls are centralized in `src/api/api.js`, kept separate from page components.

## Main Pages / Screens

| Page            | Route           | Purpose                                                                                           |
| --------------- | --------------- | ------------------------------------------------------------------------------------------------- |
| Login           | `/login`        | Google Sign-In entry point                                                                        |
| Dashboard       | `/dashboard`    | Main landing page after login; overview of the user's projects, hours logged, and recent activity |
| Projects        | `/projects`     | List of the user's projects                                                                       |
| Project Details | `/projects/:id` | View/manage a single project's entries and details                                                |
| Profile         | `/profile`      | User profile information                                                                          |
| Stats           | `/stats`        | Statistics/summary view of logged work                                                            |
| Settings        | `/settings`     | Application/user settings                                                                         |

## Navigation

Routing is handled with `react-router-dom`, using a `BrowserRouter` with a base path of `/digital_logbook`. Visiting the root path (`/`) redirects to `/login`. After signing in, users navigate using a left sidebar with links to Dashboard, Projects, Stats, and Settings, with Profile positioned at the bottom of the sidebar. `Projects` supports a nested dynamic route (`/projects/:id`) for individual project details. All routes share global user/session state via a `UserProvider` context.

## User Flows

User opens app (/)
↓
Redirected to /login
↓
Signs in with Google
↓
Redirected to /dashboard
↓
Dashboard shows an overview: Hours Logged, Active Projects,
Total Entries, This Week, plus Recent Activity and a
"Create First Project" prompt for new users
↓
Uses left sidebar to navigate to Projects → selects a project → /projects/:id
↓
Views/edits entries within that project

Profile is accessed from the bottom of the left sidebar.

## Wireframes / Designs

Designed in Figma prior to implementation.

## Responsive Design Approach

The Login page uses a responsive breakpoint at `768px`: below this width, the two-column layout collapses into a single column, the branding panel becomes full-width, and secondary content (feature list, footer) is hidden to keep the mobile view focused on the sign-in action.

## Accessibility Approach

Accessibility has been partially addressed on the Login page:

- Semantic HTML is used for structure (`<h1>`, `<h2>`, native `<button>` elements).
- No `aria-label` or `aria-hidden` attributes are present on decorative SVG icons.
- The visible Google Sign-In button has `tabIndex={-1}`, so keyboard-only navigation relies on a visually hidden real button layered underneath — not yet verified as keyboard-accessible.
- The Terms of Service and Privacy Policy links are non-functional placeholders.
