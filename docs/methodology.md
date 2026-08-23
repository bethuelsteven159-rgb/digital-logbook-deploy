# Project Methodology, Sprint Planning & Work Tracker

Owner: Tumi

> # Project Methodology, Sprint Planning & Work Tracker

## 1. Agile/Scrum Methodology

Our project will follow an **Agile/Scrum methodology** because the project is being developed incrementally and requires regular feedback and adaptation. Instead of attempting to complete the entire system at once, the project will be divided into smaller features and tasks that can be implemented, tested, reviewed, and improved over multiple sprints.

Scrum is suitable for our group because it allows team members to work on different features concurrently while maintaining regular communication about progress and problems. It also allows requirements and priorities to be adjusted as the project develops.

Our Scrum process will consist of:

* **Product Backlog** – a prioritised list of features, requirements, bugs, and improvements.
* **Sprint Backlog** – the subset of backlog items selected for the current sprint.
* **Sprints** – short development cycles during which the selected tasks are implemented and tested.
* **Regular check-ins** – short meetings where members discuss progress, upcoming work, and blockers.
* **Sprint Review** – demonstration of completed functionality and discussion of feedback.
* **Sprint Retrospective** – reflection on what went well, what did not, and what can be improved in the next sprint.

This approach allows us to continuously deliver working functionality rather than waiting until the end of the project.

## 2. How Scrum Will Be Applied

At the beginning of each sprint, the team will review the Product Backlog and select the highest-priority items that can realistically be completed during the sprint.

Each selected item will be broken down into smaller tasks and assigned to team members. Team members will update the work tracker as they progress.

The general workflow will be:

**Backlog → To Do → In Progress → Review/Testing → Done**

Tasks will only be moved to **Done** once they satisfy the team's Definition of Done.

If requirements change during development, the team will discuss the change and update the backlog rather than making uncontrolled changes to the current sprint.

## 3. Sprint Backlog Process

The Sprint Backlog will contain the tasks selected for the current sprint.

During sprint planning, the team will:

1. Review the Product Backlog.
2. Prioritise the most important requirements.
3. Estimate the effort required for each task.
4. Select tasks that can realistically be completed within the sprint.
5. Break larger requirements into smaller development tasks.
6. Assign tasks to team members.
7. Confirm that the sprint has a realistic workload.

Tasks that are not completed during a sprint will be reviewed during the next planning session. They may be carried forward, reprioritised, or broken into smaller tasks.

## 4. Work Tracker

The work tracker will be used to provide a shared view of the project's progress.

Each task should contain enough information for another team member to understand what needs to be done. Where appropriate, tasks should include:

* Task description
* User story or requirement
* Assigned member
* Priority
* Status
* Sprint
* Relevant issue or pull request
* Testing requirements

Tasks will move through the tracker as development progresses:

| Status             | Meaning                                                                  |
| ------------------ | ------------------------------------------------------------------------ |
| **To Do**          | Task has been selected but development has not started.                  |
| **In Progress**    | A team member is actively working on the task.                           |
| **Review/Testing** | Implementation is complete and is being reviewed or tested.              |
| **Done**           | The task satisfies the Definition of Done.                               |
| **Blocked**        | Progress cannot continue because of an unresolved dependency or problem. |

The tracker will help the team identify unfinished work and prevent tasks from being forgotten.

## 5. Meetings and Check-ins

The team will use regular check-ins to maintain communication and identify problems early.

During check-ins, each member should briefly communicate:

* What they completed since the previous check-in.
* What they are currently working on.
* What they plan to work on next.
* Whether they have encountered any blockers.

Sprint planning will take place at the beginning of each sprint. At the end of the sprint, the team will review the completed work and reflect on the development process.

Meetings will be kept focused on project progress so that they do not unnecessarily reduce development time.

## 6. Blocker Handling

A blocker is an issue that prevents a team member from continuing with their assigned work.

Examples include:

* Waiting for another feature or API to be completed.
* Technical problems that cannot be resolved independently.
* Missing requirements or unclear acceptance criteria.
* Problems with the development environment.
* Integration or merge conflicts.

When a blocker occurs, the member should **raise it as soon as possible** rather than waiting until the end of the sprint.

The team will then determine whether another member can assist, whether the task needs to be temporarily changed, or whether the task should be reprioritised.

Blocked tasks will be clearly marked in the work tracker so that the rest of the team is aware of the issue.

## 7. Definition of Done

A task will be considered **Done** when:

* The required functionality has been implemented.
* The implementation satisfies the relevant acceptance criteria.
* The code follows the project's coding conventions.
* The feature has been tested appropriately.
* Existing functionality has not been unnecessarily broken.
* Any relevant bugs have been resolved.
* The code has been reviewed where required.
* Changes have been committed and pushed to the appropriate branch.
* Required documentation has been updated.
* The feature is integrated into the project successfully.

A task should not be marked as Done simply because the code has been written. It must be sufficiently tested and integrated to be considered complete.

## 8. Sprint Planning

Sprint planning will determine the goals and workload for each sprint.

The team will first review the current state of the project and the remaining Product Backlog. Higher-priority features and requirements will be considered first.

The team will then consider:

* The importance of the requirement.
* Dependencies between tasks.
* The estimated effort.
* Team member availability.
* Previous sprint progress.

The selected tasks will form the Sprint Backlog, and the team will agree on a clear **Sprint Goal**.

The Sprint Goal provides a shared objective for the sprint and helps the team decide which work should take priority if unexpected issues arise.

## 9. Development Roadmap

The project will be developed incrementally. The roadmap will broadly follow these stages:

### Stage 1 – Project Setup

* Establish the development environment.
* Set up the repository and branching strategy.
* Establish the frontend and backend structure.
* Define the initial database and application architecture.

### Stage 2 – Core Functionality

* Implement the main user functionality.
* Implement project creation and management.
* Implement logbook functionality.
* Establish the main application workflow.

### Stage 3 – Authentication and User Management

* Implement user authentication.
* Integrate Google authentication.
* Implement user profiles and account-related functionality.
* Secure authenticated backend routes.

### Stage 4 – Feature Development

* Implement additional project and logbook features.
* Develop statistics and supporting functionality.
* Improve the user interface and overall user experience.

### Stage 5 – Testing and Integration

* Test individual features.
* Perform integration testing.
* Fix bugs and regressions.
* Review code quality.
* Ensure acceptance criteria are satisfied.

### Stage 6 – Finalisation

* Complete remaining backlog items.
* Perform final system testing.
* Improve documentation.
* Resolve remaining defects.
* Prepare the system for final demonstration and submission.

The roadmap is intentionally flexible because Agile development allows priorities to change based on feedback, technical issues, and the progress of the team.

## 10. Why This Approach Suits Our Project

Scrum is appropriate for our project because development is collaborative and features can be developed independently and integrated progressively. Working in sprints allows us to identify problems early, receive feedback regularly, and adapt the project as requirements become clearer.

The combination of **sprint planning, a shared work tracker, regular check-ins, code reviews, and a clear Definition of Done** provides the team with a consistent process while still allowing flexibility throughout development.
