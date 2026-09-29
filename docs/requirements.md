# Requirements, User Stories & Stakeholder Interaction

**Project:** Digital Logbook
**Module:** COMS3011A Software Design Project
**Document Owner:** Simphiwe
**Document Status:** Living Document
**Last Updated:** 2026-09-15

---

## 1. Purpose of This Document

This document defines and maintains the requirements for the Digital Logbook system. It translates the project brief, stakeholder discussions, development decisions, user needs, and technical constraints into a structured set of functional requirements, non-functional requirements, user stories, acceptance criteria, feature priorities, and stakeholder decisions.

This is a **living document**. Requirements may be refined as the team receives stakeholder feedback, discovers technical constraints, evaluates implemented features, and reviews the system during each sprint.

When a significant requirement changes, the following should be recorded where applicable:

1. The original requirement or assumption.
2. The reason for the change.
3. The stakeholder feedback or technical evidence that caused the change.
4. The resulting decision.
5. The affected feature, user story, or implementation.
6. The date and sprint in which the decision was made.

The requirements document provides a traceable connection between the original project brief, stakeholder interaction, implementation decisions, testing, and the final product.

---

## 2. Project Context

### 2.1 Problem Statement

University students need a reliable way to record the work they complete across their projects. The original Digital Logbook brief describes a student who currently relies on a physical logbook but may forget to bring it with them.

The proposed system replaces this physical logbook with a digital platform that allows the student to customise the structure of their logbook, quickly capture entries, track time spent on projects, view useful statistics, and maintain a persistent record of their work.

The system is therefore not simply a task manager. Its central purpose is to provide a durable and searchable record of the user's work and progress.

The project brief identifies the following core needs:

- Organise work according to projects.
- Allow users to customise the structure of their logbook entries.
- Make capturing an entry quick and convenient.
- Record time spent on work.
- Accumulate time against projects.
- Provide useful statistics.
- Maintain a timeline/history of work.
- Allow users to search and filter their records.
- Support increasingly advanced analysis and customisation as the system develops.

The project brief specifically identifies customisable entries, quick capture, project creation and archiving, time tracking, statistics, timelines, searching, and project-specific filtering as core/basic functionality.

---

## 3. Product Vision

The Digital Logbook aims to provide students with a central digital record of their university project work.

The product should allow a student to:

> **Organise projects, quickly record what they have done, understand how they are progressing, and preserve a searchable history of their work.**

The system should prioritise:

- Fast capture of work.
- Flexible logbook structures.
- Clear project organisation.
- Reliable persistence of data.
- Useful progress and time statistics.
- Searchable historical records.
- Secure user access.
- Maintainable architecture.
- A clear separation between frontend, backend, API, and database responsibilities.

---

## 4. Stakeholders

### 4.1 Primary Stakeholder – Student/User

The primary user is a university student who needs to record and organise their academic/project work.

The student should be able to:

- Create and manage projects.
- Record project activity.
- Customise entry structures.
- Track time spent.
- Review previous work.
- Search and filter entries.
- View progress and statistics.
- Access their records through the application.

### 4.2 Project Client / Mentor

The assigned project client acts as a stakeholder and mentor who helps the team clarify requirements and determine whether features are complete.

The client provides feedback and clarification during development.

#### Client/Mentor Requirements and Suggestions

The following records the requirements, recommendations, and guidance provided during stakeholder meetings. The team's resulting decisions are recorded separately in the Stakeholder Interaction Register.

**Meeting 1 — 04/08/2026**

- Choose a development methodology and follow it consistently throughout the project.
- Avoid a monolithic architecture.
- Use Gitea for repository management.
- Every feature must be merged through a Pull Request after review.
- Features should be developed on separate branches and merged only after approval.
- Prepare for group presentations.
- Treat the client as a mentor providing guidance and feedback.
- Sprint planning is required: plan tasks, assign responsibilities, and set sprint goals before each sprint.
- Discuss requirements with the client regularly.
- Meetings can take place on Mondays, Tuesdays, and Saturdays.
- UX Pilot was suggested for creating UI prototypes.
- Lovable was suggested for frontend web design.
- Browser Local Storage was suggested for temporary data storage.

**Meeting 2 — 12/08/2026**

- Documentation should cover architecture, including frontend/backend responsibilities and deployment.
- The shared repository link should be documented.
- The selected project management tool should be documented.
- A README should be maintained for project tracking, including the technology stack and product backlog.
- **Typst** was identified as the documentation/typesetting tool.
- The deployment platform should be decided and documented.
- The Gitea repository link should be shared with the client/mentor.
- The selected project management tool should be shared with the client/mentor.
- Documentation is an important part of the project and contributes significantly to the assessment.
- The product backlog should be updated at the end of every sprint.
- The confirmed methodology is Agile/Scrum.
- Planning is performed through the product backlog.
- Daily standups are conducted through voice notes/calls.
- Sprint retrospectives are conducted as part of the development process.
- Bethuel is the Scrum Master.
- The bug tracker should be maintained on the same platform as the selected project management tool.
- The database should be documented, including ERD diagrams, tables, and relationships.
- The Git workflow should be documented.
- CI/CD should be used.
- Testing becomes a focus from Sprint 2.
- Secure authentication should be provided, including Google authentication.
- The dashboard should display statistics such as active/in-progress entries, total entries, and archived projects.
- Users should be able to create timed log entries and record how long they worked.
- A timed log entry should be markable as completed and display the recorded duration.

**Sprint 2 Stakeholder Review / Follow-up — September 2026**

The Sprint 2 review combined the original client/mentor guidance, the Digital Logbook specification, external user feedback, and the team's implementation review. In line with the client's advice, the record below does not only state who the stakeholders are; it records **what was discussed, what guidance or feedback was received, what the team decided, and what was implemented as a result**.

Key outcomes recorded for Sprint 2 were:

- The development team moved the application from the Basic feature set into the **Intermediate** phase by implementing selected intermediate user stories from the agreed backlog.
- Intermediate work incorporated tags, checklists, entry-to-entry links, project references, computed fields, due dates, Calendar view, and Board view.
- Testing became a stronger Sprint 2 focus, in line with the client/mentor guidance from the 12/08/2026 meeting.
- External user feedback showed that some users needed clearer guidance when creating entries and when first using the application.
- The team responded by improving Create Entry guidance, adding first-time onboarding, and connecting onboarding to the in-app Help Assistant.
- External users also requested the ability to update and remove entries. Existing Edit Entry functionality was retained and verified, and Delete Entry functionality was added with a confirmation step.
- The sidebar was reviewed after user feedback. The team decided not to make unnecessary changes because the current navigation was considered clear and understandable.
- Production deployment became a technical stakeholder concern. The team reported that the backend could not be deployed directly from the official Gitea repository using the chosen deployment service.
- The deployment owner indicated that lecturer guidance would be requested regarding the Gitea limitation.
- To keep the official development workflow unchanged while enabling deployment, the team retained **Gitea as the authoritative development/review repository** and used a **GitHub mirror for the Render deployment connection**.
- The frontend continued to be deployed through Netlify, while the backend was deployed through Render.

### 4.3 Development Team

The development team is responsible for:

- Translating requirements into implementable features.
- Designing the system architecture.
- Implementing frontend and backend functionality.
- Developing and documenting the API.
- Designing and maintaining the database.
- Testing the system.
- Maintaining version control.
- Recording decisions and changes.
- Responding to stakeholder feedback.

### 4.4 Lecturer / Module Requirements

The lecturer and module requirements form an additional constraint on the project.

The project is assessed not only on the final software but also on development methodology, stakeholder interaction, testing, documentation, API implementation, database documentation, bug tracking, and the evolution of requirements.

#### Pending Lecturer Clarification — Backend Deployment on Render

During Sprint 2, the team encountered a deployment limitation when attempting to connect the Render backend deployment directly to the official Gitea repository. The issue was discussed within the development team and identified as something that should be clarified with the lecturer rather than silently changing the agreed repository workflow.

**Pending question for the lecturer:**

- What deployment approach should the team follow when Render cannot deploy directly from the official Gitea repository?
- Is it acceptable to retain Gitea as the authoritative development/review repository while using a GitHub mirror only as the deployment bridge to Render?

**Team action while awaiting clarification:**

- The team kept all feature development, Pull Requests, reviews, and merges in Gitea.
- Only approved/merged `main` was synchronised to the GitHub deployment repository.
- Render was connected to the GitHub mirror so that the backend could be deployed without replacing the agreed Gitea workflow.

**Status:** Pending lecturer clarification. The current mirror-based deployment approach is recorded as an interim technical decision.

---

## 5. Requirement Sources

Requirements are derived from the following sources:

1. COMS3011A Project Brief.
2. Digital Logbook feature specification.
3. Stakeholder/client discussions.
4. Team discussions and development decisions.
5. User stories and acceptance criteria.
6. Technical and architectural constraints discovered during development.
7. Testing and user feedback.
8. Sprint reviews and retrospectives.

The project brief should remain the primary reference when determining the intended scope of the Digital Logbook.

---

# 6. Functional Requirements

Functional requirements describe **what the Digital Logbook system must allow users or system components to do**.

Functional requirements are grouped by feature area below. Each individual requirement is assigned a unique `FR-XXX` identifier so that it can be traced to related user stories, implementation tasks, tests, and stakeholder feedback.

---

## 6.1 Authentication and User Management

### FR-001 – User Authentication

The system shall provide secure authentication for users. The authentication implementation shall support Google-based authentication and shall establish an application session after successful Google authentication.

**Expected Behaviour:**

1. The user selects the Google sign-in option.
2. Google provides an identity token.
3. The backend verifies the Google identity token.
4. The backend identifies or creates the corresponding user.
5. The backend generates an application session token.
6. The frontend uses the application session token for authenticated requests.
7. Protected endpoints reject requests without valid authentication.

**Current Implementation Status:**
Implemented and tested during development.

### FR-002 – User Account Creation

The system shall create a user record when a valid Google-authenticated user signs in for the first time.

The user record should contain relevant information such as:

- User ID.
- Google ID.
- Name.
- Email.
- Avatar/profile image where available.
- Creation timestamp.
- Update timestamp.

### FR-003 – User Session

The system shall maintain an authenticated application session using a server-generated JWT.

The Google identity token and the application's session token shall have distinct responsibilities:

- Google verifies the user's external identity.
- The application's JWT authorises subsequent requests to protected backend endpoints.

### FR-004 – Current User Retrieval

The system shall provide an authenticated endpoint for retrieving the currently authenticated user's information.

Unauthenticated or invalid requests shall receive an appropriate HTTP authentication error.

### FR-005 – User Profile

The system shall provide functionality for users to view and manage relevant profile information.

The profile functionality should be integrated with the authenticated user identity.

---

## 6.2 Project Management

### FR-006 – Create Project

A user shall be able to create a project.

A project should contain sufficient information to identify and describe the project.

**Acceptance Criteria:**

- The user can submit project information.
- Required fields are validated.
- A valid project is persisted in the database.
- The created project is associated with the correct user.
- The project becomes available in the user's project list.

### FR-007 – View Projects

A user shall be able to view projects associated with their account.

Projects should be presented in a way that allows the user to select a project and work with its entries.

### FR-008 – Edit Project

A user shall be able to modify relevant project information.

### FR-009 – Archive Project

A user shall be able to archive a completed project.

Archiving should prevent completed projects from unnecessarily cluttering the active project view while preserving their historical information.

---

## 6.3 Log Entry Management

### FR-010 – Create Log Entry

A user shall be able to create a log entry associated with a project.

The entry should capture information about work performed by the user.

### FR-011 – Custom Entry Structure

The system shall allow the owner of a project to define the fields that an entry contains and the type of value held by each field.

The project brief identifies this as a core feature of the Digital Logbook.

Initial/simple field types may include:

- Text.
- Number.
- Date/time.

More advanced field types can be introduced in later development stages.

### FR-012 – Quick Entry Capture

The system should minimise the effort required to record an activity.

The user should be able to capture recently completed work quickly without navigating through unnecessary steps.

### FR-013 – Time Tracking

A log entry shall be capable of recording the amount of time associated with the work.

Time spent should accumulate against the relevant project.

### FR-014 – Entry History

The system shall preserve a record of previous entries.

The user should be able to browse their historical work through a timeline or equivalent chronological view.

### FR-015 – Search Entries

The user shall be able to search their recorded entries.

### FR-016 – Filter Entries

The user shall be able to narrow their entries based on relevant project or entry information.

---

## 6.4 Statistics and Progress

### FR-017 – Project Time Statistics

The system shall provide statistics showing time spent on projects.

### FR-018 – Entry Activity Statistics

The system shall provide information about entry activity over periods such as a week or academic term.

### FR-019 – Activity Streaks

The system should provide information about continuous periods in which the user has maintained their logbook.

### FR-020 – Custom Field Statistics

As the system develops, user-defined fields should be usable in statistics and analysis.

The long-term requirement is that statistics should not depend exclusively on fields known by the developers in advance.

---

## 6.5 Intermediate Functional Requirements

The following functional requirements represent functionality beyond the minimum/basic Digital Logbook.

### FR-021 – Richer Custom Fields

Entries should eventually support richer fields such as:

- Tags.
- Checklists.
- Links between entries.
- References between projects.
- Computed values.

### FR-022 – Editable Entry Formats

Users should be able to modify their project's entry format.

Existing entries should remain usable when the format changes.

### FR-023 – Multiple Entry Views

Entries should eventually be available through multiple representations, such as:

- Saved filters.
- Calendar views.
- Boards.
- Grouping by relevant fields.

### FR-024 – Outstanding Work

The system should support work that has not yet been completed.

This may include:

- Due dates.
- Completion state.
- Clear indication of unfinished work.

### FR-025 – Offline Capture and Synchronisation

The application should eventually allow users to capture entries while offline and synchronise them when a connection becomes available.

The backend/database remains the authoritative source of persistent application data.

### FR-026 – Export and Import

Users should eventually be able to export their records and restore/import them in a readable format.

---

## 6.6 Sprint 2 Feedback-Driven Requirements

The following requirements were added or clarified during Sprint 2 after external user feedback and implementation review.

### FR-033 – First-Time User Guidance

The system shall provide lightweight guidance to help a first-time user understand the main Digital Logbook workflow.

**Acceptance Criteria:**

- The guide explains the main workflow from creating a project to reviewing recorded work.
- The user can move forward and backward through the guide.
- The user can dismiss or complete the guide.
- Completion is remembered so the guide does not automatically reopen every time.
- The guide can be reopened later from the Help Assistant.

### FR-034 – Edit Log Entry

A user shall be able to update an existing log entry so that incorrect or incomplete information can be corrected.

**Acceptance Criteria:**

- The user can open an existing entry and choose Edit Entry.
- Existing values are loaded into the edit interface.
- Valid updates are persisted through the backend.
- The refreshed entry displays the updated information.

### FR-035 – Delete Log Entry

A user shall be able to delete an existing log entry when the record is no longer required.

**Acceptance Criteria:**

- Delete Entry is available from the entry details interface.
- A confirmation warning is displayed before deletion.
- Cancelling leaves the entry unchanged.
- Confirming deletion removes the entry through the backend API.
- The project view and statistics refresh after deletion.
- The deleted entry remains absent after a page refresh.

### FR-036 – In-App Help Assistant

The system shall provide lightweight in-app help for common Digital Logbook actions.

**Acceptance Criteria:**

- Users can access help for common tasks.
- The assistant can explain how projects, entries, custom fields, Calendar view, Board view, and linked entries work.
- The assistant can reopen the first-time onboarding guide.

---

## 6.7 Advanced Functional Requirements

Advanced functionality should be considered after the core system is stable.

### FR-027 – Custom Calculations

Users should be able to define expressions over their own entries and save the resulting calculations alongside built-in statistics.

### FR-028 – Custom Dashboards

Users should be able to create dashboards containing the statistics and information that are most relevant to them.

### FR-029 – Historical Versioning

The system should preserve previous versions of records so that changes can be reviewed and, where appropriate, reverted.

### FR-030 – Structured Search

Search should eventually understand custom fields and allow multiple filters to be combined.

### FR-031 – Automation and Reminders

The system should eventually support rules that can:

- Automatically perform actions when entries are created.
- Create recurring entries.
- Generate relevant reminders.

### FR-032 – Long-Term Performance

The system should remain responsive as the user's logbook grows over time.

Older records may be archived while remaining accessible.

---

# 7. Non-Functional Requirements

Non-functional requirements describe **how the system should operate and the qualities or constraints that should apply to the system**.

Each non-functional requirement is assigned a unique `NFR-XXX` identifier.

## 7.1 Security

### NFR-001 – Security

Authentication and authorisation must protect user information.

Protected API endpoints shall reject requests without valid authentication.

Sensitive credentials and secrets must not be committed to the repository.

Environment variables shall be used for sensitive configuration.

## 7.2 Data Persistence

### NFR-002 – Data Persistence

Important application data must be persisted in the project's database rather than relying solely on browser storage.

## 7.3 System Architecture

### NFR-003 – API Separation

The frontend and backend shall remain separate application components communicating through an API.

The backend shall be responsible for server-side business logic, authentication, data access, and persistence.

## 7.4 Maintainability

### NFR-004 – Maintainability

The system should use a modular structure that separates responsibilities such as:

- Routes.
- Controllers.
- Middleware.
- Services.
- Repositories/data access.
- Validation.
- Database configuration.

## 7.5 Error Handling

### NFR-005 – Error Handling

The backend should return meaningful HTTP status codes and understandable error responses.

The frontend should handle API errors and provide understandable feedback to the user.

## 7.6 Performance

### NFR-006 – Performance

Common operations should respond within a reasonable time under normal project usage.

The system should remain usable as the number of projects and entries increases.

## 7.7 Responsiveness

### NFR-007 – Responsiveness

The interface should remain usable on supported screen sizes and devices.

## 7.8 Accessibility

### NFR-008 – Accessibility

The interface should follow appropriate accessibility practices so that users can interact with important functionality using common accessibility mechanisms.

## 7.9 Code Quality

### NFR-009 – Code Quality

The project should follow agreed coding conventions and maintain readable, modular code.

Linting and formatting standards should be applied consistently where configured by the team.

## 7.10 Version Control

### NFR-010 – Version Control

Development work shall be managed using the team's Git/Gitea workflow.

Feature work should be isolated on appropriate branches and merged through the agreed review process.

Every feature should be merged through a Pull Request after review, as established during the client meeting on 04/08/2026.

## 7.11 Documentation

### NFR-011 – Documentation

Important development decisions, API behaviour, database structure, requirements, testing procedures, stakeholder feedback, and known issues shall be documented.

Documentation must evolve alongside the implementation.

## 7.12 Testability

### NFR-012 – Testability

Features should be implemented in a way that allows meaningful testing of both frontend behaviour and backend/API behaviour.

---

# 8. Feature Organisation and Prioritisation

The Digital Logbook features are organised according to the Basic, Intermediate, and Advanced levels identified in the project specification.

These levels describe the progression of functionality and help the team prioritise development.

## 8.1 Basic Features

The basic version should provide the core purpose of the Digital Logbook:

- User authentication.
- User/profile identification.
- Create projects.
- View projects.
- Edit projects.
- Archive projects.
- Create log entries.
- Customise entry fields.
- Quick entry capture.
- Record time spent.
- Accumulate time against projects.
- View historical entries.
- Search entries.
- Filter entries.
- View basic statistics.

These features establish the minimum useful Digital Logbook.

## 8.2 Intermediate Features

Intermediate functionality extends the basic logbook:

- Tags.
- Checklists.
- Entry-to-entry links.
- Project references.
- Computed fields.
- Changing entry formats while preserving historical entries.
- Custom-field statistics.
- Saved filters.
- Calendar view.
- Board view.
- Outstanding work and due dates.
- Offline entry capture.
- Synchronisation.
- Export/import.

## 8.3 Advanced Features

Advanced functionality includes:

- User-defined calculations.
- Custom dashboards.
- Historical versioning.
- Reverting previous changes.
- Structured/custom-field search.
- Automated entry rules.
- Recurring entries.
- Intelligent reminders.
- Long-term performance optimisation and archival.

The feature tiers should be treated as prioritisation guidance rather than a requirement to implement every advanced feature if doing so would compromise the quality or stability of the core product.

---

# 9. User Stories

## 9.1 Current Product Backlog User Stories

The following user stories represent the **current user stories recorded in the team's Product Backlog**.

They describe user needs that have been identified and prioritised for development. The Product Backlog remains the primary working source for sprint planning, while this document provides the requirements context, acceptance criteria, and traceability for those stories.

User stories may be refined as stakeholder feedback, sprint planning, development progress, and testing provide new information.

Each user story is assigned a unique `US-XXX` identifier.

---

## 9.2 Authentication

### US-001 – Sign In

**As a** university student,
**I want to** sign in using my Google account,
**so that I can** securely access my Digital Logbook.

**Acceptance Criteria:**

- A Google sign-in option is available.
- A valid Google identity can be verified.
- A corresponding application user can be identified or created.
- A valid application session is established.
- Invalid authentication attempts are rejected.
- The user is able to access authenticated functionality after successful login.

**Related Requirement:** FR-001 – User Authentication

### US-002 – Create Account

**As a** new user,
**I want to** create my Digital Logbook account using my Google account,
**so that I can** begin recording my project work.

**Acceptance Criteria:**

- A first-time Google-authenticated user results in a user record being created.
- Relevant identity information is persisted.
- The user receives an authenticated application session.

**Related Requirement:** FR-002 – User Account Creation

### US-003 – Access My Profile

**As a** logged-in user,
**I want to** access my profile information,
**so that I can** see and manage my account information.

**Related Requirement:** FR-005 – User Profile

---

## 9.3 Project Management

### US-004 – Create a Project

**As a** user,
**I want to** create a project with a name and description,
**so that I can** organise my logbook entries by project.

**Related Requirement:** FR-006 – Create Project

### US-005 – View My Projects

**As a** user,
**I want to** view my projects,
**so that I can** quickly choose the project I want to work with.

**Related Requirement:** FR-007 – View Projects

### US-006 – Archive a Project

**As a** user,
**I want to** archive a completed project,
**so that** completed projects do not clutter my active project list.

**Related Requirement:** FR-009 – Archive Project

---

## 9.4 Log Entries

### US-007 – Create a Log Entry

**As a** user,
**I want to** record what I have done on a project,
**so that I can** maintain a history of my work.

**Related Requirement:** FR-010 – Create Log Entry

### US-008 – Customise Entry Fields

**As a** user,
**I want to** choose which fields an entry contains,
**so that** each project can have a logbook format suited to its work.

**Related Requirement:** FR-011 – Custom Entry Structure

### US-009 – Record Time

**As a** user,
**I want to** record the time spent on an activity,
**so that I can** understand how much time I have invested in each project.

**Related Requirement:** FR-013 – Time Tracking

### US-010 – Search My Entries

**As a** user,
**I want to** search my previous entries,
**so that I can** quickly find information from my history.

**Related Requirement:** FR-015 – Search Entries

### US-011 – Filter My Entries

**As a** user,
**I want to** filter my entries by project or relevant information,
**so that I can** focus on a particular area of my work.

**Related Requirement:** FR-016 – Filter Entries

---

## 9.5 Statistics and Progress

### US-012 – View Project Statistics

**As a** user,
**I want to** see how much time I have spent on each project,
**so that I can** understand how my time is distributed.

**Related Requirement:** FR-017 – Project Time Statistics

### US-013 – Review Activity

**As a** user,
**I want to** see my activity over time,
**so that I can** identify patterns in my work.

**Related Requirement:** FR-018 – Entry Activity Statistics

---

## 9.6 Sprint 2 Intermediate and Feedback User Stories

Sprint 2 moved the Digital Logbook into the Intermediate phase by integrating selected user stories from the agreed Intermediate backlog.

| User Story | User Need | Sprint 2 Status |
|---|---|---|
| US-I01 – Tags | As a user, I want to tag entries so that I can classify and find related work. | Implemented |
| US-I02 – Checklists | As a user, I want checklist items inside entries so that I can track smaller pieces of work. | Implemented |
| US-I03 – Entry Links | As a user, I want to link related entries so that I can navigate between connected work. | Implemented |
| US-I04 – Project References | As a user, I want entries/projects to reference related projects so that connected work is easier to follow. | Implemented |
| US-I05 – Computed Fields | As a user, I want computed field values so that derived information can be calculated from entry data. | Implemented |
| US-I09 – Calendar View | As a user, I want to view entries on a calendar so that I can understand when work happened or is due. | Implemented |
| US-I10 – Board View | As a user, I want a board representation of entries so that I can review work in another useful visual format. | Implemented |
| US-I11 – Due Dates / Outstanding Work | As a user, I want due-date information so that unfinished or time-sensitive work is visible. | Implemented |
| US-F01 – First-Time Guidance | As a new user, I want guidance through the main workflow so that I can start using the application without confusion. | Implemented from user feedback |
| US-F02 – Edit Entry | As a user, I want to edit an existing entry so that I can correct or update recorded work. | Implemented and verified |
| US-F03 – Delete Entry | As a user, I want to delete an entry with confirmation so that I can remove a record intentionally. | Implemented and production-tested |

The remaining Intermediate stories, including offline synchronisation and import/export, remain part of the backlog unless separately implemented and verified.

---

# 10. Acceptance Criteria Principles

A feature should not be considered complete merely because code exists.

A feature should satisfy the following conditions where applicable:

1. The intended user action is available through the UI.
2. Input is validated.
3. The frontend communicates with the correct backend endpoint.
4. The backend performs the required operation.
5. Data is correctly persisted or retrieved.
6. Authentication and authorisation rules are respected.
7. Errors are handled appropriately.
8. The resulting state is visible to the user.
9. The feature can be tested.
10. Relevant documentation has been updated.
11. Stakeholder expectations have been considered.
12. The implementation does not introduce unacceptable regressions.

---

# 11. Requirements Traceability

Requirements should be traceable through the development lifecycle.

A requirement should ideally be traceable through:

**Requirement → User Story → Task → Implementation → Test → Stakeholder Review → Acceptance**

The following table provides the initial traceability between requirements and current Product Backlog user stories:

| Requirement | User Story | Implementation | Test | Stakeholder Review |
|---|---|---|---|---|
| FR-001 – User Authentication | US-001 | Google authentication flow | Authentication/API test | Client guidance + production verification |
| FR-006 – Create Project | US-004 | Project creation UI/API | Project creation test | Stakeholder review |
| FR-010 – Create Log Entry | US-007 | Entry creation flow | Entry API/UI test | External user feedback used to improve guidance |
| FR-017 – Project Time Statistics | US-012 | Statistics component/API | Statistics test | Stakeholder review |
| FR-021 – Richer Custom Fields | US-I01 / US-I02 / US-I03 / US-I04 / US-I05 | Tags, checklists, links, references, computed fields | UI/API/service tests where applicable | Sprint 2 team review |
| FR-023 – Multiple Entry Views | US-I09 / US-I10 | Calendar view and Board view | Entry-view tests + production verification | Sprint 2 team review |
| FR-024 – Outstanding Work | US-I11 | Due-date support | Validation/API tests where applicable | Sprint 2 team review |
| FR-033 – First-Time User Guidance | US-F01 | Dashboard onboarding + Help Assistant | Local/production UI verification | External user feedback |
| FR-034 – Edit Log Entry | US-F02 | Edit Entry modal/API flow | Local/production verification | External user feedback |
| FR-035 – Delete Log Entry | US-F03 | Delete action + confirmation + DELETE API flow | Backend tests + production verification | External user feedback |

This table should continue to be expanded as implementation, testing, and stakeholder review progress.

---

# 12. Stakeholder Interaction and Decisions

Stakeholder interaction is a formal part of requirements development.

Significant client/mentor discussions should be recorded using the following structure:

**Question / Requirement Clarification → Stakeholder Answer → Team Decision → Resulting Change**

This structure makes it clear which requirements originated from stakeholder feedback and how that feedback influenced the team's decisions.

## 12.1 Stakeholder Interaction Register

| ID | Date | Question / Requirement Clarification | Stakeholder Answer | Team Decision | Resulting Change | Status |
|---|---|---|---|---|---|---|
| SI-001 | 04/08/2026 | What development methodology and repository workflow should we follow? | Choose a methodology and follow it throughout; avoid monolithic architecture; use Gitea for repository management; merge features through Pull Requests after review; use separate branches. | Adopted. Scrum methodology and the agreed branch/PR workflow were adopted. | NFR-003 and NFR-010 updated; architecture and Git workflow documented. | Resolved |
| SI-002 | 04/08/2026 | How should client interaction and meeting cadence work? | Client acts as mentor; requirements should be discussed regularly; meetings can take place on Monday, Tuesday, and Saturday. | Accepted as guidance for stakeholder interaction. | Team meeting process aligned accordingly. | Resolved |
| SI-003 | 04/08/2026 | What tools should be used for UI prototyping and frontend design? | UX Pilot was suggested for prototypes and Lovable was suggested for frontend design. Local Storage was suggested for temporary data. | Suggestions recorded for consideration. Local Storage is treated as temporary/offline storage rather than the authoritative data store. | Decision D-002 recorded. | Partially resolved |
| SI-004 | 12/08/2026 | What authentication approach should be used? | Google authentication was recommended together with standard user account/profile functionality. | Adopted. | FR-001 through FR-005 defined and authentication implemented. | Resolved |
| SI-005 | 12/08/2026 | What should the dashboard show? | Total projects, active/archived projects, total entries, recent entries, and active entries. | Adopted. | Dashboard statistics incorporated into the Basic feature scope. | Resolved |
| SI-006 | 12/08/2026 | How should time tracking on entries work? | Entries should be timed, marked as completed, and display the recorded duration. | Adopted. | FR-013 confirmed and completion functionality incorporated into the requirements. | Resolved |
| SI-007 | 12/08/2026 | What tooling should the team use for documentation, project management, and methodology? | Typst for documentation; Notion or Taiga for project management; Gitea for repository management; Scrum for methodology; Bethuel as Scrum Master. | Scrum, Gitea, and Typst adopted. Final project-management-tool selection is maintained as a team confirmation item. | Documentation and project-management requirements recorded. | Partially resolved |
| SI-008 | 12/08/2026 | What database documentation is required? | Document database structure, tables, relationships, and ERD information. | Adopted. | NFR-011 documentation scope includes database structure. | Resolved |
| SI-009 | Sprint 2 | How should the system progress beyond the Basic feature set? | The project specification and backlog define an Intermediate level containing richer entry fields and additional views. | The team moved selected agreed Intermediate user stories into Sprint 2 implementation. | Tags, checklists, links, references, computed fields, due dates, Calendar view, and Board view were integrated. | Resolved |
| SI-010 | Sprint 2 user testing | What areas of the interface caused confusion for external users? | Feedback included uncertainty around creating entries and getting started with the application. | Improve guidance without adding unnecessary complexity. | Create Entry guidance, first-time onboarding, and Help Assistant integration were implemented. | Resolved |
| SI-011 | Sprint 2 user testing | What entry-management improvements did users request? | External feedback included requests to update and delete entries. | Retain/verify Edit Entry and add Delete Entry with confirmation. | Edit Entry was verified and Delete Entry was implemented and production-tested. | Resolved |
| SI-012 | Sprint 2 review | Should the sidebar be changed after navigation feedback? | The team reviewed the current sidebar and found the navigation sufficiently clear. | Avoid unnecessary UI changes. | No sidebar redesign was introduced. | Resolved |
| SI-013 | Sprint 2 deployment | How should the backend be deployed when Render cannot connect directly to the official Gitea repository? | **Pending:** the team will ask the lecturer for guidance on the appropriate Render deployment approach. | Interim decision: keep Gitea as the authoritative repository and use a GitHub mirror only as the deployment bridge to Render. | Approved/merged Gitea `main` is mirrored to GitHub `main`, which triggers Render deployment while preserving the official Gitea workflow. | Pending lecturer clarification |

> **Documentation Note:** Stakeholder answers should be based on actual meeting records and should not be invented retrospectively. Where a lecturer/client answer has not yet been received, the register records the issue and the team's interim decision rather than attributing an unconfirmed answer.

---

## 12.2 Team Process Log

Team-internal proposals and decisions are recorded separately from client/mentor decisions.

### 14/08/2026 — Provisional Role Allocation

The provisional responsibilities were recorded as follows:

- Tumi: Project Methodology, Sprint Planning & Work Tracker.
- Bethuel: Git Methodology & Development Standards.
- Inga: System Architecture, Backend & API.
- Morare: Frontend Architecture, UI/UX, Responsiveness & Accessibility.
- Simphiwe: Requirements, User Stories & Stakeholder Interaction.
- Sino: Tech Stack, Documentation Website & Developer Onboarding.

The role allocation was provisional and could be adjusted if required.

A meeting-preparation process was also established in which each member should arrive with:

1. What has already been agreed.
2. What remains undecided.
3. One supported recommendation.

Each member should raise unresolved items from their area at the end of meetings so that they can contribute to the next meeting agenda.

### 17/08/2026 — In-Person UI/UX and Log-Entry Discussion

The team discussed UI/UX and the log-entry workflow in person.

The specific outcome of this discussion should be recorded once the team's meeting notes have been reviewed.

### 19/08/2026 — Work Tracker and Bug Tracker Proposal

A proposal was made to use the Gitea Project board as the work tracker, with the following columns:

**To Do → In Progress → Done**

Bugs were proposed to be tracked through Gitea Issues using the title format:

**Bug: [description]**

Bugs would be labelled as `bug`, assigned to the relevant developer, and closed once fixed and tested.

The final project-management and bug-tracking workflow should be confirmed by the team and documented consistently across the project.

### 08/09/2026 — First Sprint 2 Meeting and Sprint Retrospective

The team held its first Sprint 2 meeting and a Sprint 1 retrospective. The purpose was to review the previous sprint, identify setbacks, and agree on how the team could improve its process and product during Sprint 2.

**What was discussed:**

- Development and integration difficulties experienced during Sprint 1.
- Areas where coordination, testing, documentation, and integration could be improved.
- The need to move the application beyond the Basic level and begin implementing Intermediate functionality.

**Team decision and action:**

- Team members were asked to prepare and contribute ideas/user stories that would help move the web application into the Intermediate phase.
- Sprint 2 would place stronger emphasis on testing, integration, and completing selected Intermediate functionality without destabilising the Basic product.

### 09/09/2026 — Intermediate User Stories Finalised and Assigned

The team finalised the Sprint 2 Intermediate user stories and divided the work among team members.

**What was discussed:**

- Which Intermediate stories were feasible within Sprint 2.
- How the work could be distributed fairly while reducing overlap and merge conflicts.

**Team decision and action:**

- The selected Intermediate stories were assigned across team members for implementation.
- The resulting Sprint 2 work covered areas including tags, checklists, entry links/references, computed fields, due dates, Calendar view, Board view, and related testing/integration work.

### 11/09/2026 — External User Testing Distributed

The team moved from internal implementation to external user feedback collection.

**What was discussed:**

- The need for evidence from users outside the development team.
- The importance of allowing external users to access the deployed frontend and provide structured feedback.

**Team decision and action:**

- The Google Form feedback link was shared for distribution to external users.
- The deployed frontend link was also shared so that users could interact with the application before completing the form.
- Feedback responses were collected for evaluation and prioritisation.

### 14/09/2026 — User Feedback Finalised and High-Priority Changes Implemented

The team reviewed the completed external-user feedback responses and identified the items with the highest practical priority.

**What users reported:**

- Some users needed clearer guidance when creating an entry.
- Some users needed clearer first-time guidance when starting to use the application.
- Users requested stronger entry-management functionality, including updating and deleting entries.
- Navigation/sidebar comments were reviewed, but the existing sidebar was considered sufficiently clear and did not justify unnecessary redesign.

**Team decision and action:**

- High-priority feedback was implemented first.
- Create Entry guidance was improved.
- A lightweight first-time onboarding guide was added.
- The Help Assistant was connected to the onboarding guide so that users could reopen it later.
- Existing Edit Entry functionality was retained and verified.
- Delete Entry functionality was added with a confirmation step and later production-tested.
- The team deliberately avoided unnecessary sidebar changes.
- Evidence was maintained to link feedback → evaluation → decision → implementation → testing/PR.

### Sprint 2 — Deployment Workflow Decision

The backend deployment owner reported a limitation when attempting to deploy directly from Gitea using Render.

The team kept the official repository workflow unchanged:

**Feature branch → Gitea Pull Request → Review/Approval → Gitea `main`**

For production deployment, the approved Gitea `main` branch is mirrored to a GitHub deployment repository:

**Gitea `main` → GitHub mirror `main` → Render**

The frontend is deployed through Netlify.

This preserves Gitea as the authoritative development/review source while providing a deployment path compatible with Render.

---

# 13. Development Decisions Affecting Requirements

Requirements are not isolated from technical decisions.

Some development decisions have directly affected how requirements are implemented.

## 13.1 Decision D-001 – Separate Frontend and Backend

The system is structured as separate frontend and backend components communicating through an HTTP/API boundary.

**Reason:**
This supports the project's non-monolithic architecture and creates a clear separation of presentation, application logic, and data responsibilities.

## 13.2 Decision D-002 – Backend as the Authoritative Data Layer

The application's persistent data should be handled by the backend and database rather than treating browser storage as the primary database.

Browser storage may later support offline functionality, caching, or queued synchronisation, but it should not replace the authoritative backend/database.

## 13.3 Decision D-003 – Application JWT After Google Authentication

Google authentication establishes the user's external identity.

The backend then creates an application session using its own JWT.

**Reason:**
This allows subsequent protected API requests to use the application's authentication mechanism rather than passing the Google identity token as the application's long-term session mechanism.

## 13.4 Decision D-004 – Existing Server Backend Structure

During development, a duplicate `backend/` structure was identified alongside the existing `server/` structure.

The authentication implementation was consolidated into the existing server/backend structure.

**Result:**
Authentication-related files were moved into the existing backend structure and the duplicate backend directory was removed.

This decision reduces ambiguity about which backend is authoritative.

## 13.5 Decision D-005 – Environment-Based Configuration

Database connection information and authentication secrets are supplied through environment variables rather than being hard-coded or committed to version control.

Real credentials must never be included in documentation or committed to the repository.

## 13.6 Decision D-006 – Gitea Remains Authoritative; GitHub Used as Deployment Mirror

The team's official development repository remains Gitea.

Because the backend deployment service could not be connected directly to the official Gitea repository in the team's deployment setup, a GitHub repository is used as a deployment mirror.

**Workflow:**

1. Development occurs on feature branches against Gitea.
2. Pull Requests are reviewed and merged into Gitea `main`.
3. The approved Gitea `main` is pulled locally.
4. The same `main` commit is pushed to the GitHub deployment mirror.
5. Render deploys the backend from the mirrored GitHub `main`.

**Reason:**
This avoids bypassing the team's agreed Gitea review process while still allowing the backend to be deployed through Render.

## 13.7 Decision D-007 – Frontend and Backend Production Deployment

The production frontend is deployed through Netlify and the production backend is deployed through Render.

The frontend uses environment-based API configuration so that production builds communicate with the Render backend rather than a local development server.

---

# 14. Current Implementation Status

The requirements document distinguishes between the following implementation states:

| Status | Meaning |
|---|---|
| **Specified** | Required by the project or feature specification. |
| **Planned** | Accepted for future implementation. |
| **In Progress** | Currently being developed. |
| **Implemented** | Development has been completed. |
| **Tested** | Implementation has been tested successfully. |
| **Accepted** | Stakeholder/client has confirmed that the feature meets expectations. |
| **Deferred** | Intentionally postponed. |
| **Rejected** | Intentionally removed from scope. |

## 14.1 Current Authentication Progress

The authentication backend has been implemented and locally tested.

The completed authentication flow includes:

1. Google sign-in from the frontend.
2. Google ID-token verification on the backend.
3. User lookup by Google ID.
4. User creation for first-time users.
5. Application JWT generation.
6. Protected current-user endpoint.
7. PostgreSQL persistence.
8. Frontend communication with the backend on the configured backend port.

Authentication should still be considered subject to formal project testing and stakeholder acceptance where required.

## 14.2 Sprint 2 Intermediate Progress

By the end of Sprint 2, the application had progressed beyond the Basic feature set and included selected Intermediate functionality.

| Area | Status | Notes |
|---|---|---|
| Tags | Implemented | Entry tags supported and persisted. |
| Checklists | Implemented | Checklist items supported on entries. |
| Entry links/references | Implemented | Entry-to-entry linking and project references supported. |
| Computed fields | Implemented | Computed-field support integrated. |
| Due dates | Implemented | Entry due-date support integrated. |
| Calendar view | Implemented/Tested | Entries can be reviewed through Calendar view. |
| Board view | Implemented/Tested | Entries can be reviewed through Board view. |
| Create Entry guidance | Implemented | Improved after external user feedback. |
| First-time onboarding | Implemented/Tested | Dashboard onboarding with persistence and Help Assistant reopening. |
| Edit Entry | Implemented/Verified | Existing edit flow retained and verified. |
| Delete Entry | Implemented/Production-tested | Confirmation + frontend/API/backend delete flow verified in deployed application. |
| Offline synchronisation | Backlog / not claimed complete | Remains subject to implementation/verification. |
| Export/import | Backlog / not claimed complete | Remains subject to implementation/verification. |

## 14.3 Production Deployment Status

The application is deployed using separate production services:

- **Frontend:** Netlify.
- **Backend:** Render.
- **Authoritative development repository:** Gitea.
- **Backend deployment mirror:** GitHub.

Production integration issues encountered during Sprint 2 are recorded in the Bug Tracking document.

---

# 15. Requirement Change Management

Requirements may change throughout the project.

A requirement may be revised when:

- The stakeholder clarifies an expectation.
- User testing reveals a problem.
- A technical limitation requires a design change.
- The team changes project scope.
- A feature is deferred to a later sprint.
- A better solution is identified.

Requirement changes should not silently overwrite the previous decision.

Each significant change should record:

- Requirement ID.
- Previous requirement.
- New requirement.
- Reason for change.
- Evidence/source.
- Stakeholder involved.
- Date.
- Sprint.
- Affected user stories.
- Affected implementation.
- Approval/decision.

---

# 16. Relationship With Other Project Documentation

This document should remain connected to the project's other documentation.

### Requirements

Defines **what the system must do and why**.

### Product Backlog

Defines **what work needs to be completed**.

### Sprint Backlog

Defines **what the team is currently implementing**.

### Bug Tracker

Records **problems discovered during development/testing and their resolutions**.

### API Documentation

Defines **how frontend/external systems communicate with the backend**.

### Database Documentation

Defines **how persistent data is structured and why the database design was selected**.

### Testing Documentation

Defines **how requirements and features are verified**.

### Stakeholder Records

Provide **evidence of how client/stakeholder feedback influenced the requirements**.

### Retrospectives

Record **what the team learned and what should change in future development**.

---

# 17. Documentation Quality Principles

Because documentation is a major component of the project, this document should follow these principles:

- Requirements must be specific enough to test.
- Requirements must be traceable to a source.
- Stakeholder decisions must be recorded rather than assumed.
- Implementation status must be kept current.
- Requirement changes must be documented.
- Technical decisions should include their rationale.
- Documentation must not contain secrets or credentials.
- Completed features should have evidence of testing.
- Bugs should be linked to affected requirements where appropriate.
- The document should be updated continuously rather than only before submission.
- Headings and requirement identifiers should be used consistently.
- Related requirements should remain grouped under their appropriate requirement category.

---

# 18. Items Requiring Confirmation

The following items should be confirmed through stakeholder or team discussion before being treated as final requirements:

- Exact initial custom field types.
- Exact project metadata requirements.
- Exact profile information required.
- Exact statistics expected in the first release.
- Exact archive behaviour.
- Exact definition of a completed feature.
- Priority of intermediate and advanced features.
- Expected offline behaviour and synchronisation strategy.
- Export/import format.
- Final acceptance criteria for major features.
- Stakeholder approval of implemented functionality.
- Final project-management and backlog tool selection.
- Final role of Lovable in the development process.
- Specific outcome of the 17/08/2026 UI/UX and log-entry discussion.
- Lecturer/client clarification, if required, on the long-term deployment approach when the official Gitea repository cannot be connected directly to Render.

These items should be resolved through the stakeholder interaction process and then reflected in the appropriate requirements, user stories, or project documentation.

---

# 19. Definition of Requirement Completion

A requirement should be considered fully completed only when:

- The requirement is clearly defined.
- The corresponding user story/task has been identified.
- The feature has been implemented.
- Relevant validation and error handling are present.
- The feature has been tested.
- Any discovered bugs have been recorded and resolved or accepted.
- Documentation has been updated.
- Stakeholder feedback has been considered.
- The resulting implementation satisfies the agreed acceptance criteria.

---

# 20. Revision History

| Version | Date | Author | Changes |
|---|---|---|---|
| 0.1 | 22/08/2026 | Simphiwe | Initial requirements document created. |
| 0.2 | 20/08/2026 | Team | Functional and non-functional requirements added. |
| 0.3 | 20/08/2026 | Team | User stories and acceptance criteria added. |
| 0.4 | 24/08/2026 | Team | Requirements structure, stakeholder interaction records, feature organisation, traceability, and documentation structure revised. |
| 0.5 | 22/08/2026 | Team | Authentication and repository architecture decisions documented. |
| 0.6 | 24/08/2026 | Simphiwe | Stakeholder Interaction Register populated with dated entries from the 04/08 and 12/08 meetings; Section 4.2 updated with the full list of client suggestions by meeting; Team Process Log added; project-management and repository tooling documentation updated. |
| 0.7 | 08/09/2026 | Team | First Sprint 2 meeting and Sprint 1 retrospective recorded; setbacks and process improvements discussed; team members asked to prepare contributions for moving the application into the Intermediate phase. |
| 0.8 | 09/09/2026 | Team | Sprint 2 Intermediate user stories finalised and divided among team members for implementation. |
| 0.9 | 11/09/2026 | Team | Google Form feedback link and deployed frontend link shared for distribution to external users; external user-testing evidence collection started. |
| 1.0 | 14/09/2026 | Team | External user-feedback responses finalised and evaluated; high-priority feedback selected and implemented, including Create Entry guidance, first-time onboarding, and entry-management improvements. |
| 1.1 | 15/09/2026 | Simphiwe / Team | Stakeholder interaction records expanded to include discussion → decision → action; pending lecturer clarification for Render/Gitea backend deployment documented; Intermediate implementation, user feedback integration, Edit/Delete Entry, onboarding/help guidance, and deployment workflow updated. |

---

# 21. References

1. COMS3011A Project Brief – Digital Logbook.
2. Digital Logbook Project 7 Feature Specification.
3. Stakeholder/client meeting records (04/08/2026, 12/08/2026).
4. Team sprint planning, retrospective, user-story allocation, and user-testing records (14/08/2026, 17/08/2026, 19/08/2026, 08/09/2026, 09/09/2026, 11/09/2026, 14/09/2026).
5. Product backlog and sprint backlog.
6. API documentation.
7. Database documentation.
8. Testing documentation.
9. Bug tracker.

---

## Document Maintenance

This document is owned by the documentation/requirements role and should be updated whenever a significant requirement, stakeholder decision, scope decision, acceptance criterion, or feature priority changes.

The document should be reviewed during sprint planning, sprint review, and retrospective activities where relevant.
