# MentAi

MentAi is an academic mentoring and student information platform for managing student records, faculty workflows, mentorship, academic performance, timetables, attendance, certificates, alumni, and AI-assisted insights.

The repository contains a React web application, Flask services for the student information system and student workflows, and a small Express service used by the student module.

## Capabilities

- Role-based experiences for administrators, students, faculty, mentors, and subject handlers
- Student profiles, academic records, attendance, timetables, certificates, notifications, and requests
- Mentor–mentee assignment, sessions, reports, interventions, and private notes
- Administration of students, teachers, courses, batches, alumni, timetables, and attendance
- Faculty notes and subject-handler workflows
- AI-assisted academic analysis, performance reporting, and study planning
- Batch promotion and alumni lifecycle workflows

## Repository layout

| Path | Purpose |
| --- | --- |
| `src/` | Primary React + TypeScript application |
| `src/pages/` | Role-specific application pages and route targets |
| `sis/` | Flask-based information-system service, models, routes, and services |
| `student_module/` | Flask student service, analytics, templates, static assets, and tests |
| `frontend/` | Express/EJS student-facing service |
| `trained_models/` | Local model assets used by supported analytics workflows |
| `database_schema.sql` | Database schema reference |

## Prerequisites

- Node.js 18 or newer
- npm (or Bun, if preferred for the root JavaScript workspace)
- Python 3.10 or newer
- A supported SQL database configured through environment variables
- Credentials for any enabled AI or mail integrations

## Local setup

### Web application

```bash
npm install
npm run dev
```

The Vite development server runs on `http://localhost:5173`.

Useful commands:

```bash
npm run build       # Production build
npm run lint        # ESLint
npm test            # Vitest test suite
npm run preview     # Preview the production build
```

### Flask services

Create and activate a virtual environment for the service you are running, then install its dependencies:

```bash
python -m venv .venv
# Windows
.venv\Scripts\activate
# macOS/Linux
source .venv/bin/activate

pip install -r student_module/requirements.txt
```

Configure the required database, mail, session, and AI settings in a local environment file. Do not commit credentials or production configuration. Start the service from its directory so imports and relative paths resolve correctly:

```bash
cd student_module
python app.py
```

The SIS service can be started similarly:

```bash
cd sis
python app.py
```

Check the service health endpoint at `/health` where it is enabled. The exact database schema and deployment settings should be reviewed before running migration or data-maintenance scripts.

### Express student service

```bash
cd frontend
npm install
npm start
```

Use `npm run dev` in that directory when developing with `nodemon`.

## Configuration

Keep local configuration in environment files that are excluded by `.gitignore`. Common settings include:

- Database connection URL and credentials
- Flask secret/session configuration
- CORS and allowed frontend origins
- SMTP credentials and sender configuration
- AI provider API keys
- Service URLs used by the web application

Never place real credentials, student data, database dumps, or generated diagnostic output in commits.

## Development principles

- Preserve role boundaries and validate authorization on the server.
- Treat student and faculty data as sensitive information.
- Prefer small, typed changes that follow existing service and UI patterns.
- Add or update tests for behavior changes.
- Keep API contracts and frontend consumers synchronized.

See [`ARCHITECTURE.md`](ARCHITECTURE.md), [`CONTRIBUTING.md`](CONTRIBUTING.md), and [`SECURITY.md`](SECURITY.md) for project guidance.

## License

The repository currently contains application code without a committed license file. Add an explicit license before distributing the project outside its owning organization.
