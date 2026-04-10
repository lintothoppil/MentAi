# Study Plan Generation Module

Personalised adaptive study plan generation for the MentAI academic mentoring platform.

---

## Overview

The Study Plan Generation Module automatically creates week-by-week study schedules tailored to each student's:

- **Enrolled subjects** with credit hours and difficulty scores
- **Academic performance history** (per-subject average scores)
- **Available study time** per week
- **Self-reported stress / workload level**
- **Upcoming exam deadlines**

The algorithm allocates proportionally more time to weaker or harder subjects and can **adapt** remaining weeks when a student falls behind.

---

## Architecture

```
student_module/
├── models/
│   └── study_plan_models.py      # SQLAlchemy models
├── services/
│   └── study_plan_service.py     # Adaptive algorithm
├── routes/
│   └── study_plan_routes.py      # Flask Blueprint (REST API)
├── migrations/
│   └── create_study_plan_tables.py   # DB migration script
├── tests/
│   └── test_study_plan_service.py    # Unit tests
├── app.py                        # Flask application factory
└── STUDY_PLAN_README.md          # ← You are here

src/
├── components/StudyPlan/
│   ├── GenerateStudyPlanForm.tsx
│   ├── StudyPlanCalendar.tsx
│   ├── StudyPlanProgressTracker.tsx
│   ├── TaskCard.tsx
│   ├── AdaptiveRecommendations.tsx
│   └── index.ts
├── pages/
│   ├── StudentStudyPlanPage.tsx
│   └── StudyPlanHistoryPage.tsx
├── hooks/
│   └── useStudyPlan.ts
└── lib/
    ├── studyPlanTypes.ts
    └── utils.ts
```

---

## Database Tables

| Table | Description |
|---|---|
| `study_plan_templates` | Predefined plan templates |
| `study_plans` | Main plan entity per student |
| `weekly_plans` | Weekly breakdown with hour allocation |
| `daily_tasks` | Individual tasks with status & progress |

Run migration:

```bash
# Using Flask-Migrate
flask db upgrade

# Or directly
python student_module/migrations/create_study_plan_tables.py
```

---

## API Endpoints

| Method | Endpoint | Description |
|---|---|---|
| `POST` | `/api/study-plans/generate` | Generate a new plan |
| `GET` | `/api/study-plans/<plan_id>` | Get plan details |
| `GET` | `/api/study-plans/student/<student_id>` | List student's plans |
| `GET` | `/api/study-plans/<plan_id>/weeks` | Get weekly breakdowns |
| `GET` | `/api/study-plans/weeks/<week_id>/tasks` | Get tasks for a week |
| `PUT` | `/api/study-plans/tasks/<task_id>/progress` | Update task progress |
| `POST` | `/api/study-plans/<plan_id>/adapt` | Adaptive recalculation |
| `GET` | `/api/study-plans/<plan_id>/stats` | Plan statistics |
| `GET` | `/api/study-plans/templates` | List available templates |

### Generate Plan – Request Body

```json
{
  "student_id": 7,
  "title": "Semester 3 Study Plan",
  "start_date": "2024-01-15",
  "end_date": "2024-05-15",
  "weekly_hours": 20,
  "subjects": [
    { "name": "Mathematics", "credit_hours": 4 },
    { "name": "Physics", "credit_hours": 3, "difficulty": 0.8 }
  ],
  "stress_level": 6.0,
  "academic_history": [
    { "subject": "Mathematics", "score": 45, "semester": "S2" }
  ]
}
```

### Update Task Progress – Request Body

```json
{
  "progress": 75.0,
  "actual_minutes": 45,
  "notes": "Covered chapters 3 and 4"
}
```

---

## Running the Backend

```bash
# Install dependencies
pip install -r requirements.txt

# Configure environment
export DATABASE_URL="mysql+pymysql://user:pass@localhost/mentai"
export SECRET_KEY="your-secret"

# Run migrations
flask --app student_module.app db upgrade

# Start server
python student_module/app.py
```

---

## Running the Frontend

```bash
npm install
npm run dev
```

The app is served at `http://localhost:5173` and proxies `/api/*` to the Flask backend at `http://localhost:5000`.

---

## Running Tests

```bash
python -m pytest student_module/tests/test_study_plan_service.py -v
```

---

## Algorithm Details

### Subject Weighting

Each subject receives a `weight` based on:

```
weight = difficulty × performance_factor
performance_factor = clamp(1.0 − (avg_score − 50) / 100)
```

- A student with a low past score on a subject gets a higher `performance_factor` → more hours allocated.
- A high-difficulty subject also gets a proportionally larger share.

### Stress Modifier

At `stress_level = 10`, total allocated hours are reduced by 20% to prevent burnout.

### Adaptive Recalculation

Triggered by `POST /api/study-plans/<plan_id>/adapt`:
1. Compute current completion per subject.
2. Subjects with low completion get a `backlog_factor` boost.
3. Regenerate pending tasks for all remaining weeks with updated allocation.

---

## Environment Variables

| Variable | Default | Description |
|---|---|---|
| `DATABASE_URL` | `mysql+pymysql://root:password@localhost/mentai` | SQLAlchemy connection string |
| `SECRET_KEY` | `change-me` | Flask session secret |

---

## Dependencies Added

**Backend (`requirements.txt`)**

- `Flask >= 3.0.0`
- `Flask-SQLAlchemy >= 3.1.0`
- `Flask-Migrate >= 4.0.0`
- `SQLAlchemy >= 2.0.0` *(replaces deprecated `.query.get()` with `session.get()`)*
- `PyMySQL >= 1.1.0`
- `pytest >= 8.0.0`

**Frontend (`package.json`)**

- `@tanstack/react-query >= 5.x`
- `recharts >= 2.x`
- `react-router-dom >= 6.x`
- Radix UI primitives (dialog, label, progress, select, tabs)
- `lucide-react`, `clsx`, `tailwind-merge`

---

## Code Quality Notes

- All `datetime` usage is **timezone-aware** (`datetime.now(timezone.utc)`) — no `utcnow()` calls.
- All `Session.get(Model, pk)` pattern used instead of deprecated `Query.get()`.
- Role-based access control stubs are in `routes/study_plan_routes.py` (replace `require_auth` with your actual Flask-Login check).
