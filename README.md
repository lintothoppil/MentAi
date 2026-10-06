<div align="center">

# MentAi

### AI-Powered Student Management & Mentoring System

A modern academic platform that brings **student performance, mentoring, AI insights, study planning, and institutional workflows** into one focused interface.

<br/>

![React](https://img.shields.io/badge/React_18+-61DAFB?style=for-the-badge&logo=react&logoColor=black)
![TypeScript](https://img.shields.io/badge/TypeScript-3178C6?style=for-the-badge&logo=typescript&logoColor=white)
![Vite](https://img.shields.io/badge/Vite-646CFF?style=for-the-badge&logo=vite&logoColor=white)
![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-06B6D4?style=for-the-badge&logo=tailwindcss&logoColor=white)
![Flask](https://img.shields.io/badge/Flask-000000?style=for-the-badge&logo=flask&logoColor=white)
![MySQL](https://img.shields.io/badge/MySQL-4479A1?style=for-the-badge&logo=mysql&logoColor=white)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-4169E1?style=for-the-badge&logo=postgresql&logoColor=white)

</div>

---

## ✨ What MentAi Feels Like

MentAi is designed as a **dashboard-first academic experience** rather than a collection of disconnected forms.

> **See → Understand → Act → Track**

| Stage | UI focus |
|---|---|
| 👀 **See** | Academic performance, attendance, marks, schedules |
| 🧠 **Understand** | AI insights, risk status, trends |
| ⚡ **Act** | Alerts, mentoring, intervention, study planning |
| 📈 **Track** | Progress, mentoring history, analytics |

The project report describes a React + TypeScript frontend powered by Vite and Tailwind CSS with a glassmorphism-oriented design language, supported by a Flask backend and relational database. 

---

## 🖥️ UI Preview

The project report includes screens for the homepage, registration, login, student dashboard, academics, AI assistance, mentoring sessions, mentor dashboard, and faculty dashboard.

### 🏠 Landing + Registration

![MentAi Homepage and Registration](mentai-ui-assets/01-home-register.png)

The landing screen introduces MentAi, followed by a structured registration experience.

### 🔐 Login + Student Dashboard

![MentAi Login and Student Dashboard](mentai-ui-assets/02-login-student-dashboard.png)

The student dashboard focuses on quick-glance academic information, profile context, performance indicators, and overall status.

### 📊 Student Academics

![MentAi Student Academics](mentai-ui-assets/03-student-academics.png)

The academics screen emphasizes visual performance summaries, subject progression, and education history.

### 🤖 AI Assist + Mentoring

![MentAi AI Assist and Mentoring](mentai-ui-assets/04-ai-assist-mentoring.png)

The AI Assist interface surfaces personalized academic guidance while the mentoring screen supports scheduling and mentor interaction.

### 👨‍🏫 Mentor + Faculty Dashboards

![MentAi Mentor and Faculty Dashboards](mentai-ui-assets/05-mentor-faculty-dashboards.png)

Role-specific dashboards provide focused views for monitoring students, academic activity, and mentoring operations.

---

## 🎨 UI / UX Direction

| Area | Direction |
|---|---|
| Visual style | Modern academic SaaS dashboard |
| Design language | Glassmorphism-inspired |
| Layout | Sidebar + dashboard content |
| Components | Cards, KPI metrics, charts, alerts, schedules |
| Navigation | Role-specific |
| Feedback | Status chips, notifications, alerts |
| Data display | Visual summaries + structured records |
| Experience | Clear, responsive, role-oriented |

The report describes specialized dashboards and purpose-built interfaces for students, mentors/faculty, subject handlers, administrators, and HOD/coordinators.

---

## 🧩 Role-Based UI

### 🎓 Student

```text
Dashboard
 ├─ Overview
 ├─ Academics
 ├─ Attendance
 ├─ AI Insights
 ├─ Study Plan
 ├─ Mentoring
 ├─ Notifications
 └─ Profile
```

**Primary interaction:** understand academic status and take action early.

### 👨‍🏫 Mentor / Faculty

```text
Dashboard
 ├─ Assigned Students
 ├─ Performance
 ├─ Risk Alerts
 ├─ Mentoring Sessions
 ├─ Interventions
 ├─ Communication
 └─ Reports
```

**Primary interaction:** identify students needing support and record interventions.

### 🛠️ Administrator

```text
Dashboard
 ├─ Students
 ├─ Mentors
 ├─ Courses / Batches
 ├─ Attendance / Marks
 ├─ Analytics
 ├─ Notifications
 ├─ Configuration
 └─ Audit Logs
```

**Primary interaction:** control institutional data and workflows.

---

## 🤖 AI-Centered Experience

MentAi turns academic records into actionable UI states.

```text
Attendance
     +
Internal Marks
     +
Performance Trends
        │
        ▼
   ┌────────────┐
   │  AI Engine │
   └─────┬──────┘
         │
   ┌─────┼──────────────┐
   ▼     ▼              ▼
Stable  Improving    Declining
         │
         ▼
 Personalized Study Plan
         │
         ▼
    Mentor Alert
         │
         ▼
 Mentoring Intervention
```

The report describes AI-generated risk probability scores, classification into **Stable / Improving / Declining**, mentor alerts, and smart weekly study schedules tailored to academic weaknesses.

> The report does not specify one exact ML algorithm or model architecture, so this README does not invent one.

---

## 🔄 Product Flow

```text
┌──────────────┐
│    Student   │
└──────┬───────┘
       ▼
Academic Data
       ▼
┌──────────────┐
│   Database   │
└──────┬───────┘
       ▼
┌──────────────┐
│   AI Engine  │
└──────┬───────┘
       ├──────────► Risk Status
       ├──────────► Study Plan
       └──────────► Mentor Alert
                          ▼
                   Mentoring Session
                          ▼
                   Progress Tracking
```

---

## 🏗️ System at a Glance

```text
┌─────────────────────────────────────┐
│               FRONTEND              │
│  React + TypeScript + Vite          │
│  Tailwind CSS                       │
│  Dashboards • Forms • Charts        │
└──────────────────┬──────────────────┘
                   │
                   │ API
                   ▼
┌─────────────────────────────────────┐
│               FLASK                 │
│ Auth • RBAC • Academic Workflows    │
│ Mentoring • Notifications            │
└──────────────────┬──────────────────┘
                   │
          ┌────────┴─────────┐
          ▼                  ▼
┌────────────────┐   ┌────────────────┐
│ MySQL /        │   │    AI Engine   │
│ PostgreSQL     │   │ Risk / Study   │
│ Academic Data  │   │ Insights       │
└────────────────┘   └────────────────┘
```

---

## 🧱 Core UI Modules

| Module | UI responsibility |
|---|---|
| 🔐 Authentication | Login, registration, secure access |
| 🎓 Student Management | Profiles and academic records |
| 📚 Academics | Attendance, marks, results, progression |
| 🤖 AI Insights | Risk status and personalized guidance |
| 🗓️ Mentoring | Session booking and intervention tracking |
| 🔔 Notifications | Alerts, reminders, important updates |
| 📊 Analytics | Performance and institutional summaries |
| ⚙️ Administration | Users, courses, batches, system operations |

---

## 🧠 Academic Dashboard Philosophy

MentAi avoids making users search through raw academic records for every decision.

Instead, the interface surfaces:

```text
       ┌─────────────────┐
       │ QUICK SUMMARY   │
       ├─────────────────┤
       │ Attendance      │
       │ Marks           │
       │ Risk Status     │
       │ Progression     │
       └────────┬────────┘
                ▼
       ┌─────────────────┐
       │ AI INSIGHTS     │
       ├─────────────────┤
       │ Strengths       │
       │ Weak areas      │
       │ Study guidance  │
       └────────┬────────┘
                ▼
       ┌─────────────────┐
       │ NEXT ACTION     │
       ├─────────────────┤
       │ Study Plan      │
       │ Mentor Session  │
       │ Intervention    │
       └─────────────────┘
```

---

## 🔐 Security UX

The documented security model includes:

- JWT-based authentication
- Role-Based Access Control
- Password hashing
- OTP-based password reset
- SSL/TLS communication
- Input validation
- API protection
- Token expiration
- Session management
- Audit logging
- Backup and recovery

Because this README is source-derived, production security claims should be checked against the actual implementation before deployment.

---

## 📱 Screen Inventory

| Screen | Purpose | Role |
|---|---|---|
| Homepage | Product entry point | Everyone |
| Register | Account creation | Student |
| Login | Secure authentication | Everyone |
| Student Dashboard | Academic overview | Student |
| Student Academics | Performance visualization | Student |
| AI Assist | Personalized guidance | Student |
| Mentoring Session | Session scheduling | Student / Mentor |
| Mentor Dashboard | Assigned-student monitoring | Mentor |
| Faculty Dashboard | Faculty academic overview | Faculty |

---

## ⚙️ Technology Stack

| Layer | Technology |
|---|---|
| Frontend | React 18+, TypeScript |
| Build | Vite |
| Styling | Tailwind CSS |
| Backend | Python + Flask |
| ORM | SQLAlchemy |
| Database | MySQL / PostgreSQL |
| Authentication | JWT |
| Password reset | OTP + Google SMTP |
| Testing | Postman + documented test methods |
| Version control | Git |

---

## 🗂️ Recommended Repository Shape

```text
mentai/
│
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   ├── pages/
│   │   ├── layouts/
│   │   ├── hooks/
│   │   ├── services/
│   │   └── ...
│   ├── public/
│   └── package.json
│
├── backend/
│   ├── app/
│   ├── models/
│   ├── routes/
│   ├── services/
│   ├── ai/
│   ├── migrations/
│   └── requirements.txt
│
├── docs/
├── mentai-ui-assets/
└── README.md
```

> This is a recommended repository organization for the documented architecture, not a claim about the exact source tree.

---

## 🚀 Setup

The supplied report defines the technology stack but does not specify the exact source-repository commands, dependency versions, API routes, or environment variable names.

### Frontend

```bash
cd frontend
npm install
npm run dev
```

### Backend

```bash
cd backend

python -m venv venv

# Windows
venv\Scripts\activate

# Linux / macOS
source venv/bin/activate

pip install -r requirements.txt
python app.py
```

Use the actual repository's entry points and environment variables as the authoritative source.

---

## ✅ Testing Coverage

The report documents:

- Unit Testing
- Integration Testing
- Validation Testing
- System Testing
- Output Testing
- User Acceptance Testing

Documented successful scenarios include authentication, marks upload, AI risk scoring, profile retrieval, mentor student-list access, AI alerts, mentoring session scheduling, input validation, and high-load testing.

---

## 🔮 Future UI Opportunities

The documented future scope can naturally become new product surfaces:

| Future capability | Possible UI |
|---|---|
| Predictive analytics | Trend & risk analytics dashboard |
| Personalized learning paths | Adaptive study planner |
| AI mentor support | Intervention recommendation panel |
| Mobile application | Student / mentor mobile dashboard |
| Offline support | Sync status + offline queue |
| ERP / LMS integration | Integration center |
| Smart attendance | Real-time attendance console |
| AI chat assistant | Academic copilot |

---

## 🎓 Academic Project

| | |
|---|---|
| **Project** | MentAi |
| **Project Type** | MCA Main Project |
| **Author** | Linto Mathew Joy |
| **Programme** | Master of Computer Applications |
| **Institution** | St. Joseph's College of Engineering and Technology, Palai |
| **University** | A P J Abdul Kalam Technological University |
| **Academic Period** | 2024–2026 |

---

## 📌 Accuracy Note

This README is intentionally focused on the **UI, user journeys, documented workflows, architecture, and project modules** contained in the supplied MentAi report. Details not specified in the report—such as the exact ML algorithm, exact API routes, exact dependency versions, and exact repository structure—are not presented as confirmed implementation facts.

---

<div align="center">

### MentAi

**Understand performance. Identify risk. Mentor earlier.**

</div>
