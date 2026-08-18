# Client Authentication Implementation Guide

This document explains how the Google Sign-In / authentication work should be added to the Digital Logbook frontend.

The current frontend already contains a `Login` page/folder. The authentication developer should **inspect and reuse the existing Login structure** rather than assuming that an `Authentication.jsx` file already exists.

---

## 1. Authentication Method

The Digital Logbook will use **Google Sign-In / Google authentication**.

The authentication implementation will be added to the existing frontend without unnecessarily restructuring unrelated pages or components.

The final authentication flow, API request/response shapes, and function names must be confirmed with the backend team before implementation.

---

## 2. Where the Authentication Work Goes

The current frontend structure contains:

```text
client/
└── src/
    ├── components/
    └── pages/
        └── Login/
            └── existing login files
```

Start by working inside:

```text
client/src/pages/Login/
```

Do not create an `Authentication/` folder simply because this README uses the word "authentication".

If additional authentication pages are required later, they may be created under:

```text
client/src/pages/
```

using the existing project naming conventions.

Reusable authentication UI components should go under:

```text
client/src/components/
```

---

## 3. JSX Files vs `.js` Files

The frontend separates UI/presentation from page-specific application logic.

### `.jsx` files

The JSX file is primarily responsible for:

- Page layout
- Form/UI elements
- Rendering
- Buttons and inputs
- Displaying loading/error states
- Passing user actions to the page logic

For example, if the existing Login page is:

```text
client/src/pages/Login/
└── Login.jsx
```

the authentication implementation may introduce:

```text
client/src/pages/Login/
├── Login.jsx
└── Login.js
```

The exact filename should follow the existing naming convention in the Login folder.

### `.js` files

The page `.js` file is responsible for page-specific/application logic.

This can include:

- Handling the Google Sign-In action
- Handling form submission logic where applicable
- Calling the agreed frontend API functions
- Processing API responses
- Managing loading/error behavior
- Handling authentication-related page state
- Redirecting the user after successful authentication where appropriate

The `.js` file should not contain the page's JSX markup.

---

## 4. API Communication

Backend communication should be kept separate from the page logic.

The project API layer should contain the agreed frontend API functions.

For example, if the team agrees to use:

```text
client/src/api/api.js
```

then authentication-related API functions belong there.

The page logic should call the API function rather than implementing the backend request directly.

The intended flow is:

```text
Login.jsx
    ↓
Login.js
    ↓
agreed authentication function
    ↓
api.js
    ↓
Backend API
```

The exact location of `api.js` should follow the team's agreed project structure if it has already been established elsewhere.

---

## 5. Authentication API Functions

The current API recommendations include these authentication/user functions:

### `getCurrentUser()`

Gets the currently authenticated Google user.

Example:

```js
const user = await getCurrentUser();
```

### `getUserProfile()`

Gets the user's profile information.

Example:

```js
const profile = await getUserProfile();
```

### `updateUserProfile(data)`

Updates editable profile information.

Example:

```js
await updateUserProfile(data);
```

These names are **proposed API function names**. They must be confirmed with the backend team before implementation.

---

## 6. Important: Do Not Invent API Functions

After the API function names have been confirmed by the frontend/backend teams, use those agreed names.

Do not independently create different names such as:

```js
loginUser()
authenticateGoogle()
fetchGoogleUser()
```

if the agreed contract uses:

```js
getCurrentUser()
getUserProfile()
updateUserProfile(data)
```

If a new function is required, discuss and agree on it with the backend team before implementation.

---

## 7. Expected File Changes

The authentication developer should expect to **create or update files inside the existing frontend structure**.

A possible final structure is:

```text
client/
└── src/
    ├── api/
    │   └── api.js
    │
    ├── components/
    │   └── authentication-related components if needed
    │
    └── pages/
        └── Login/
            ├── Login.jsx
            └── Login.js
```

This is an example structure, not a requirement to create every file shown.

**Do not create empty folders/files just to match the diagram.**

Use the existing project structure and only add files that are actually required.

---

## 8. What Should Happen in the Login Page

The Login page should provide the Google Sign-In user interface.

A typical flow is:

```text
User opens Login page
        ↓
User selects "Sign in with Google"
        ↓
Google authentication flow
        ↓
Authentication succeeds
        ↓
Current user/session is established
        ↓
Frontend obtains the authenticated user
        ↓
User is taken into the application
```

The exact Google authentication implementation and session/token handling must follow the backend team's agreed authentication design.

---

## 9. Separation of Responsibilities

Keep the responsibilities separated.

### `Login.jsx`

Responsible primarily for:

- UI
- JSX
- Layout
- Login button
- Rendering authentication status
- Rendering errors/loading states

### `Login.js`

Responsible for:

- Login page logic
- Google Sign-In handling
- Calling the agreed API functions
- Processing authentication results
- Loading/error handling
- Page-specific navigation/state

### `api.js`

Responsible for:

- Backend/API communication
- API requests
- Exposing the agreed frontend API functions

### `components/`

Responsible for:

- Reusable UI components
- Components shared by multiple pages

---

## 10. Do Not Change Unrelated Features

When implementing authentication:

- Do not rewrite the Projects pages unless authentication integration requires it.
- Do not rewrite Project Details.
- Do not change the entry editing workflow.
- Do not change the Create Project modal.
- Do not introduce TypeScript.
- Do not move existing folders unnecessarily.

Only change the files required for the authentication implementation and its integration.

---

## 11. Before Starting

Before implementing the API calls, confirm with the backend team:

1. The final API function names.
2. Function parameters.
3. Request format.
4. Response format.
5. Authentication/session behavior.
6. Error responses.
7. How Google authentication is connected to the backend.
8. How the frontend determines whether a user is authenticated.
9. What should happen after successful login.
10. What should happen when authentication fails.

Do not assume these details if they have not been agreed upon.

---

## 12. Summary

The intended architecture is:

```text
Google Sign-In
      ↓
Login.jsx
      ↓
Login.js
      ↓
agreed frontend API function
      ↓
api.js
      ↓
Backend
```

The key rule is:

> **JSX handles presentation, page `.js` files handle page-specific logic, and `api.js` handles communication with the backend/API.**

The existing `Login` folder should be reused as the starting point for authentication work.

The authentication developer should create the necessary `.js` files inside the relevant page folder rather than putting application logic directly into the JSX.
