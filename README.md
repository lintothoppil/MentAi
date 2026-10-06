# MentAi — AI-Powered Student Management & Mentoring System

MentAi is an AI-powered, full-stack student management and mentoring platform designed to help educational institutions manage academic data, mentoring workflows, and student performance insights from a centralized system.

The system brings together students, mentors/faculty, subject handlers, administrators, and HOD/coordinators through role-specific dashboards. It combines academic records such as attendance and marks with AI-based analysis to identify students who may require timely academic intervention.

## Project Overview

Traditional student management and mentoring processes can be fragmented across separate systems or manual records. MentAi is designed to centralize these workflows and support proactive academic management.

The platform supports:

- Academic data management
- Student and mentor management
- Attendance and marks tracking
- AI-based student risk analysis
- Student performance classification
- Personalized weekly study plans
- Mentoring session scheduling
- Mentoring intervention tracking
- Alerts and notifications
- Role-based dashboards and access control
- Academic reports and analytics

## Key AI Features

The AI Engine analyzes student academic information, including attendance, marks, and performance trends.

It is designed to:

1. Generate risk probability scores for students.
2. Classify students into performance states such as:
   - **Stable**
   - **Improving**
   - **Declining**
3. Identify students who may be academically at risk.
4. Generate alerts for mentors.
5. Produce personalized study plans based on academic weaknesses.
6. Update predictions as new academic data becomes available.

> **Note:** The project report describes the AI functionality at the system level but does not specify a single named machine-learning algorithm or model architecture.

## User Roles

### Student

Students can:

- Register and log in securely
- View attendance, marks, results, and academic performance
- Access AI-generated study plans and insights
- Book and manage mentoring sessions
- Receive alerts and notifications
- View mentoring history and feedback
- Update basic profile information
- Use a dedicated student dashboard

### Mentor / Faculty

Mentors can:

- Access assigned students
- Monitor student academic performance
- Review AI-generated risk status
- Receive alerts for at-risk students
- Schedule and manage mentoring sessions
- Record mentoring interventions and notes
- Evaluate student progress
- Communicate with students
- Review mentoring history and reports

### Administrator

Administrators can:

- Manage students, mentors, courses, and batches
- Maintain attendance, marks, and academic records
- Monitor system performance and academic analytics
- Oversee mentoring activities
- Manage notifications and system configurations
- Handle user issues
- Maintain audit logs and data integrity

### Subject Handler

The system includes academic data workflows for subject handlers, including subject-related academic record management.

### HOD / Coordinator

The system supports higher-level academic monitoring and reporting for departmental coordination.

## Technology Stack

| Layer | Technology |
|---|---|
| Frontend | React 18+ |
| Frontend Language | TypeScript |
| Build Tool | Vite |
| UI Styling | Tailwind CSS |
| UI Design | Glassmorphism-oriented interface |
| Backend | Python |
| Backend Framework | Flask |
| ORM / Database Access | SQLAlchemy |
| Database | MySQL or PostgreSQL |
| Authentication | JWT |
| Password Reset | OTP via Google SMTP |
| Version Control | Git |
| API Testing | Postman |

The project report specifies MySQL or PostgreSQL as supported relational database options.

## High-Level Architecture

```text
┌───────────────────────────────┐
│        Web Client             │
│   React + TypeScript + Vite   │
│          Tailwind CSS         │
└───────────────┬───────────────┘
                │
                │ HTTPS / API
                ▼
┌───────────────────────────────┐
│        Flask Backend          │
│ Authentication & RBAC         │
│ Academic Data Management      │
│ Mentoring Workflows           │
│ Notifications                 │
└───────────────┬───────────────┘
                │
       ┌────────┴─────────┐
       │                  │
       ▼                  ▼
┌───────────────┐  ┌──────────────────┐
│ Relational DB │  │     AI Engine    │
│ MySQL / PG    │  │ Risk Analysis    │
│ Academic Data │  │ Study Planning   │
└───────────────┘  └──────────────────┘
```

## Core Workflow

```text
Academic Data Entry
        │
        ▼
Attendance / Marks / Academic Records
        │
        ▼
     Database
        │
        ▼
      AI Engine
        │
        ├── Risk Score
        ├── Performance Classification
        └── Personalized Study Plan
        │
        ▼
   Mentor Alerts
        │
        ▼
Mentoring Intervention
        │
        ▼
 Student Progress Tracking
```

## Major Modules

### 1. Authentication & Access Control

- Secure user authentication
- JWT-based session management
- Role-Based Access Control (RBAC)
- Password hashing
- OTP-based password reset

### 2. Student Management

- Student registration and profiles
- Academic records
- Parent and guardian information
- Course and batch association
- Student status management

### 3. Academic Management

- Attendance tracking
- Daily attendance
- Internal marks
- University marks
- Course, batch, semester, and subject management
- Subject allocation
- Timetable information

### 4. Mentoring Management

- Mentor assignment
- Mentoring session scheduling
- Mentor availability/leave workflows
- Mentoring notes and interventions
- Student-mentor communication
- Mentoring history

### 5. AI Insights

- Academic trend analysis
- Risk scoring
- At-risk student identification
- Performance classification
- Personalized study plans
- Mentor alerts

### 6. Notifications & Alerts

- Academic performance notifications
- Mentoring session notifications
- Risk alerts
- System notifications

### 7. Analytics & Reporting

- Student analytics
- Academic performance reports
- Risk analysis summaries
- Mentoring records
- Institutional-level analytics

## Database Design

The report describes a relational database with normalized tables. The major tables include:

- `Student`
- `Faculty`
- `Parent`
- `Guardian`
- `Academic`
- `Course`
- `Batch`
- `Semester`
- `Subject`
- `SubjectAllocation`
- `Timetable`
- `InternalMark`
- `UniversityMark`
- `Attendance`
- `DailyAttendance`
- `MentoringSession`
- `MentorLeave`
- `Note`
- `LeaveRequest`
- `Activity`
- `Alert`
- `StudentAnalytics`
- `WeeklyStudyPlan`
- `Notification`

The database design documentation describes normalization through 3NF and also discusses BCNF.

## Security

MentAi is designed with a multi-layered security approach for sensitive student and academic data.

The report specifies:

- SSL/TLS for encrypted communication
- JWT-based authentication
- Role-Based Access Control (RBAC)
- Password hashing using bcrypt
- Token expiration
- Input validation
- API protection
- Secure coding practices
- Session timeout / automatic logout after inactivity
- Database access controls and constraints
- Secure backup and recovery
- Monitoring and audit logging
- Strong password policies

Security controls should be reviewed and validated against the actual implementation before production deployment.

## Testing

The project report covers multiple testing approaches:

- Unit Testing
- Integration Testing
- Validation Testing
- System Testing
- Output Testing
- User Acceptance Testing

Example test scenarios documented in the report include:

| Test Scenario | Expected Result | Status |
|---|---|---|
| Valid student login | JWT token generated | Pass |
| Invalid login | Error displayed | Pass |
| Internal marks upload | Marks stored successfully | Pass |
| AI risk score generation | Risk score generated | Pass |
| Student profile retrieval | Profile displayed | Pass |
| Mentor views assigned students | Student list displayed | Pass |
| AI alert to mentor | Alert received | Pass |
| Mentoring session scheduling | Session scheduled | Pass |
| Invalid email validation | Validation error | Pass |
| Strong password validation | Registration accepted | Pass |

## Suggested Repository Structure

The exact repository structure is not specified in the project report. A conventional structure for the described architecture could look like this:

```text
mentai/
├── frontend/
│   ├── src/
│   ├── public/
│   ├── package.json
│   └── ...
│
├── backend/
│   ├── app/
│   ├── models/
│   ├── routes/
│   ├── services/
│   ├── ai/
│   ├── migrations/
│   ├── requirements.txt
│   └── ...
│
├── docs/
├── README.md
└── .gitignore
```

> This structure is a recommended organization for the technologies described in the report, not a claim about the current source repository.

## Installation & Setup

The project report defines the technology stack but does not provide the exact repository-specific installation commands, dependency versions, environment-variable names, or deployment commands. Those values should be taken from the actual project source.

### Prerequisites

At minimum, the described system requires:

- Node.js and npm
- Python
- MySQL or PostgreSQL
- Git
- A modern web browser
- Google SMTP configuration for OTP email functionality, when enabled

### Configuration

Create environment configuration for values such as:

```env
DATABASE_URL=<your-database-connection>
JWT_SECRET=<your-secret>
SMTP_HOST=<smtp-host>
SMTP_PORT=<smtp-port>
SMTP_USERNAME=<smtp-username>
SMTP_PASSWORD=<smtp-password>
```

> The exact variable names above are illustrative. Use the names defined by the actual implementation.

### Run the Frontend

```bash
cd frontend
npm install
npm run dev
```

### Run the Backend

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

> Verify the real entry-point, package scripts, and dependency files in the repository before using these commands in production.

## Deployment

The report describes deployment as a phased process involving:

1. Server and database preparation
2. Frontend deployment
3. Backend deployment
4. Database configuration
5. Module-by-module validation
6. User onboarding and training
7. Data migration where required
8. Continuous monitoring
9. Performance, security, and reliability checks
10. Future scalability and feature updates

The report does not specify a particular cloud provider or a fixed production deployment topology.

## Maintenance

The project documentation identifies several maintenance areas:

### Corrective Maintenance
Fix bugs and operational issues affecting authentication, academic data, mentoring, AI predictions, or notifications.

### Adaptive Maintenance
Update the system as institutional requirements and technologies evolve.

### Security Maintenance
Regularly update security controls, review vulnerabilities, strengthen authentication, and maintain encryption and secure session handling.

### Database Maintenance
Perform backups, validation, indexing, integrity checks, and recovery procedures.

### User Support
Provide documentation, guidance, and support while using user feedback to improve the system.

## Future Enhancements

The report proposes the following future directions:

- Advanced predictive analytics
- Personalized learning paths
- AI-driven mentoring intervention suggestions
- Mobile applications
- Offline support with synchronization
- Advanced dashboards and visualizations
- ERP and LMS integration
- Smart attendance using biometric or facial recognition
- AI chat assistant for academic guidance

## Project Objectives

MentAi is intended to:

- Centralize academic and mentoring operations
- Improve transparency in student management
- Enable proactive identification of academically at-risk students
- Reduce manual work for faculty and administrators
- Improve mentoring coordination
- Provide personalized academic guidance
- Support data-driven decision-making
- Provide a scalable foundation for future academic integrations

## Academic Project Information

**Project:** MentAi  
**Project Type:** MCA Main Project  
**Author:** Linto Mathew Joy  
**Programme:** Master of Computer Applications  
**Institution:** St. Joseph's College of Engineering and Technology, Palai (Autonomous)  
**University:** A P J Abdul Kalam Technological University  
**Academic Period:** 2024–2026

## Documentation

The accompanying project report contains detailed sections covering:

- Introduction
- System Analysis
- Software Requirement Specification
- Feasibility Analysis
- Data Flow Diagrams
- System Design
- Database/Table Design
- Process Design
- System Testing & Implementation
- Security Technologies & Policies
- Maintenance
- Conclusion
- Future Enhancements
- Bibliography
- Screenshots and Code Appendix

## Important Implementation Note

This README is based on the supplied MentAi project report. It intentionally distinguishes documented project details from recommended repository conventions. Exact source-code structure, package versions, API endpoints, database credentials, environment variable names, model implementation details, and production deployment commands should be taken from the actual source repository rather than assumed from the report.

## License

No license is specified in the supplied project report.

If this repository is intended for public distribution, add an explicit license file such as `LICENSE` and update this section accordingly.
