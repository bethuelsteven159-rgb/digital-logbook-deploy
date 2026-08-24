# System Architecture, Backend & API

Owner: Inga

![Digital Logbook architecture diagram](./images/architecture-diagram.png)

The client (React, running on port 8443) sends two kinds of requests to the server (Express, running on port 5000): authentication requests, which go through the auth routes to verify a Google sign-in token and issue a session JWT, and app requests, which go through the app routes to manage projects, entries, and profiles.

Authentication is handled by `authController.js` and `authRoutes.js`. When a user signs in with Google, the client sends the Google ID token to `POST /api/auth/google`, which verifies it directly against Google's OAuth servers, creates the user in the database if this is their first sign-in, and returns a JWT for the client to use on every subsequent request. A separate `GET /api/auth/me` route uses that JWT to identify the currently logged-in user on future requests, verified through auth middleware before the request reaches any protected route.

The rest of the server, covering projects, project details, entries, and user profiles, follows a layered structure: requests move from routes, to controllers, to services, to repositories, and finally to the database access layer. This keeps request handling, business logic, and database queries separated, so a change to how data is stored doesn't require touching the routing layer, and vice versa. The server connects to PostgreSQL through the `pg` library, and incoming data is validated with Zod before it reaches the deeper business logic.

For local development, the server supports two dev-only shortcuts, controlled through environment variables: `USE_FAKE_DB`, which swaps the real PostgreSQL connection for an in-memory fake so a developer can run the app without setting up a real database, and `DEV_BYPASS_AUTH`, which skips real Google sign-in entirely and logs the developer in as a fixed fake user. Both are meant for local testing only and are disabled once a developer wants to test against the real database and real Google authentication.

Once a user has signed in and holds a valid JWT, that same token authorizes every later request the client makes to the app routes, so the server doesn't need to re-verify the Google token on every single request, only once at login.
