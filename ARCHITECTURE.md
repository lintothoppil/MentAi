# Architecture

## System overview

MentAi is organized as a browser client and several server-side modules:

```text
Browser
  |
  v
Vite + React + TypeScript (`src/`)
  |
  +--> SIS Flask service (`sis/`)
  |
  +--> Student Flask service (`student_module/`)
  |
  `--> Express/EJS student service (`frontend/`)
```

The services share the domain model of an academic institution but remain separate deployable processes. The deployment environment is responsible for routing requests, configuring CORS, and supplying secrets.

## Web application

The root application uses:

- React 18 for the user interface
- React Router for authenticated and role-specific routes
- TanStack Query for server-state fetching and caching
- React Hook Form and Zod for form handling and validation
- Tailwind CSS and Radix UI primitives for presentation
- Vite for development and production builds

`src/App.tsx` is the route composition point. Pages are grouped by the workflow they serve:

- `Admin*Page` components manage institution-wide data.
- `Student*Page` components expose student self-service workflows.
- `Mentor*Page` components support mentoring and reporting.
- `Faculty*Page` and subject-handler pages support academic operations.

## Flask services

Both Flask areas use Python modules for route handling, domain services, models, analytics, and utilities.

The SIS service is centered on:

- `sis/app.py` for application creation and extension setup
- `sis/models/` for persistent domain entities
- `sis/services/` for business workflows
- `sis/routes/` for role-based HTTP endpoints

The student module combines:

- Flask routes and templates for student-facing operations
- SQLAlchemy models and authentication helpers
- Analytics and AI-related services
- Scheduled and batch workflows for academic data
- Tests under `student_module/tests/`

## Domain boundaries

The primary domain areas are:

1. **Identity and access** — student, faculty, mentor, administrator, and subject-handler authentication and authorization.
2. **Academic records** — courses, batches, subjects, marks, attendance, and semester performance.
3. **Mentoring** — assignments, sessions, reports, interventions, requests, and notes.
4. **Scheduling** — timetables, study schedules, leave, and notifications.
5. **Analytics and AI** — performance analysis, insights, study planning, and report generation.
6. **Lifecycle management** — batch completion, alumni promotion, certificates, and historical mentor relationships.

## Data and integration guidance

The database is the source of truth for academic and mentoring records. Business rules such as authorization, batch transitions, and mark validation must be enforced server-side rather than only in the React client.

External integrations, including AI providers and email delivery, must be accessed through configuration-backed service code. Production deployments should provide timeouts, structured logging, rate limits, and failure handling for every external request.

## Change guidelines

When changing an API:

1. Update the server route and its validation.
2. Update the corresponding client query, mutation, or type.
3. Add regression coverage for authorization and the changed response shape.
4. Verify migrations and existing records remain compatible.

