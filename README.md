<p align="center">
  <img src="https://img.shields.io/badge/MentAi-Academic%20Mentoring%20System-6366F1?style=for-the-badge&logoColor=white"/>
</p>

<h1 align="center">🎓 MentAi</h1>

<p align="center">
  <b>AI-Powered Student Management & Mentoring System</b><br/>
  <i>Digitally encapsulating a student's entire academic lifecycle.</i>
</p>

<p align="center">
  <img src="https://img.shields.io/badge/React_18-61DAFB?style=for-the-badge&logo=react&logoColor=black"/>
  <img src="https://img.shields.io/badge/TypeScript-3178C6?style=for-the-badge&logo=typescript&logoColor=white"/>
  <img src="https://img.shields.io/badge/Flask-000000?style=for-the-badge&logo=flask&logoColor=white"/>
  <img src="https://img.shields.io/badge/Python-3776AB?style=for-the-badge&logo=python&logoColor=white"/>
  <img src="https://img.shields.io/badge/MySQL-4479A1?style=for-the-badge&logo=mysql&logoColor=white"/>
  <img src="https://img.shields.io/badge/Tailwind_CSS-06B6D4?style=for-the-badge&logo=tailwindcss&logoColor=white"/>
  <img src="https://img.shields.io/badge/JWT-000000?style=for-the-badge&logo=jsonwebtokens&logoColor=white"/>
</p>

<p align="center">
  <img src="https://img.shields.io/badge/MCA%20Final%20Project-SJCET%20Palai-6366F1?style=for-the-badge"/>
  <img src="https://img.shields.io/badge/APJ%20Abdul%20Kalam%20Technological%20University-FF6B35?style=for-the-badge"/>
</p>

---

## 📖 About MentAi

**MentAi** is a comprehensive, full-stack AI-powered student management and mentoring platform developed as an MCA Final Project at **St. Joseph's College of Engineering and Technology, Palai**.

It bridges the critical gap between **students**, **faculty mentors**, **subject handlers**, and **administrators** by incorporating advanced AI-powered insights to track and improve student performance. The system proactively identifies at-risk students and enables timely academic interventions.

> 📌 Submitted by: **Linto Mathew Joy** (SJC24MCA-2041) — MCA 2024–26, SJCET Palai (Autonomous)
> 
> 🎓 Project Guide: **Ms. Liz George**, Asst. Professor, Dept. of Computer Applications

---

## ✨ Key Features

### 👨‍🎓 Student Portal
- Secure login with JWT authentication
- View attendance, internal marks & CGPA
- Access **AI-generated personalized study plans**
- Book & manage mentoring sessions
- Real-time notifications & academic alerts
- Communicate with mentors & subject handlers

### 👨‍🏫 Mentor Portal
- View assigned mentees with performance snapshots
- **AI risk dashboard** — identify at-risk students automatically
- Schedule, approve & manage mentoring sessions
- Record structured interventions & notes
- Receive automated alerts for declining students

### 🔧 Admin Portal
- Manage students, faculty, courses & batches
- Bulk upload teachers & students via CSV/Excel
- Upload attendance & university marks
- Allocate mentors to students
- Monitor institution-wide analytics & reports

### 🤖 AI Engine
- Computes **risk probability scores** per student
- Classifies students as `Stable` · `Improving` · `Declining`
- Generates **smart weekly study schedules** tailored to weaknesses
- Sends automated mentor alerts when risk is detected
- Continuously updates predictions as new data arrives

### 🔐 Security
- **JWT-based authentication** with OTP password reset via Google SMTP
- **Role-Based Access Control (RBAC)** — 5 distinct roles
- SSL/TLS encrypted data transmission
- bcrypt password hashing
- Input validation & API protection

---

## 🛠️ Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 18 + TypeScript + Vite |
| Styling | Tailwind CSS (glassmorphism design) |
| Backend | Python · Flask · SQLAlchemy |
| Database | MySQL / PostgreSQL |
| Authentication | JWT · OTP via Google SMTP |
| AI / ML | Scikit-learn · Risk scoring model |
| Animation | Framer Motion |
| Dev Tools | VS Code · Postman · Git |

---

## 👥 User Roles

| Role | Responsibilities |
|---|---|
| 🎓 **Student** | View academics, study plans, book sessions, chat with mentor |
| 👨‍🏫 **Mentor / Faculty** | Monitor mentees, manage sessions, record interventions |
| 📚 **Subject Handler** | Upload & manage internal marks, subject timetables |
| 🛠️ **Administrator** | Manage all data, allocate mentors, oversee system |
| 🏛️ **HOD / Coordinator** | Department-level reports & batch analytics |

---

## 🚀 Getting Started

### Prerequisites

- Python `3.8+`
- Node.js `16+` and npm
- MySQL or PostgreSQL
- Git

---

### 1. Clone the Repository

```bash
git clone https://github.com/lintothoppil/mentai.git
cd mentai
```

---

### 2. Environment Variables

Create a `.env` file in the root directory:

```env
# Flask
SECRET_KEY=your_flask_secret_key
FLASK_ENV=development

# Database
DATABASE_URL=mysql://username:password@localhost/mentai_db

# Google SMTP (for OTP)
MAIL_USERNAME=your_email@gmail.com
MAIL_PASSWORD=your_app_password

# JWT
JWT_SECRET_KEY=your_jwt_secret
```

---

### 3. Backend Setup (Flask)

```bash
python3 -m venv venv
source venv/bin/activate        # macOS / Linux
# OR
venv\Scripts\activate           # Windows

pip install -r requirements.txt
```

Initialize the database:

```bash
flask db init
flask db migrate
flask db upgrade
```

Run the server:

```bash
python app.py
```

---

### 4. Frontend Setup (React + Vite)

```bash
cd frontend
npm install
npm run dev
```

---

### 5. Access the App

| Interface | URL |
|---|---|
| Student / Mentor / Admin | `http://localhost:5173` |
| Flask API | `http://localhost:5000` |

---

## 📁 Project Structure

```
mentai/
├── app.py                    # Flask entry point
├── requirements.txt          # Python dependencies
├── .env                      # Environment variables (not committed)
├── models/                   # SQLAlchemy DB models
│   ├── student.py
│   ├── faculty.py
│   ├── mentoring_session.py
│   └── ...
├── routes/                   # Flask route blueprints
│   ├── student.py
│   ├── mentor.py
│   ├── admin.py
│   └── ai_engine.py
├── ai/                       # AI risk scoring module
│   └── risk_model.py
├── frontend/                 # React + Vite frontend
│   ├── src/
│   │   ├── pages/
│   │   ├── components/
│   │   └── main.tsx
│   └── vite.config.ts
└── static/                   # Flask static files
```

---

## 🗄️ Database Schema (Key Tables)

| Table | Description |
|---|---|
| `student` | Student profiles, batch, mentor assignment |
| `faculty` | Mentor & faculty records |
| `academic` | CGPA & academic history |
| `attendance` | Overall & daily attendance |
| `internal_mark` | Internal assessment marks |
| `university_mark` | University exam marks |
| `mentoring_session` | Session bookings & status |
| `student_analytics` | AI-generated risk scores & trends |
| `weekly_study_plan` | AI-generated study schedules |
| `alert` | Automated risk alerts for mentors |
| `notification` | System-wide notifications |

> All tables are normalized up to **BCNF** (Boyce-Codd Normal Form).

---

## 🧪 Testing

The system was tested using the following strategies:

| Type | Coverage |
|---|---|
| ✅ Unit Testing | Individual module validation |
| ✅ Integration Testing | Cross-module data flow (JWT → API → DB → AI) |
| ✅ Validation Testing | Form inputs, role access, error handling |
| ✅ System Testing | 500 concurrent users — no crash |
| ✅ Output Testing | Reports, dashboards, AI alerts |
| ✅ UAT | Real student, mentor & admin interactions |

---

## 🏭 Production Deployment

> ⚠️ Do **not** use the Flask development server in production.

**Linux — Gunicorn:**
```bash
gunicorn -w 4 -b 0.0.0.0:5000 app:app
```

Pair with **Nginx** as a reverse proxy and enable **SSL/TLS** via Let's Encrypt.

---

## 🔮 Future Enhancements

- 📱 Mobile app (Android & iOS) for students & mentors
- 🤖 Advanced AI — dropout prediction & learning path recommendations
- 🧬 Biometric / facial recognition attendance
- 💬 AI Chat Assistant for academic guidance
- 🔗 ERP & LMS integration
- 📊 Advanced visualization dashboards for HOD

---

## 📄 Project Info

| Detail | Info |
|---|---|
| Institution | St. Joseph's College of Engineering and Technology, Palai (Autonomous) |
| Programme | Master of Computer Applications (MCA) |
| University | APJ Abdul Kalam Technological University |
| Batch | 2024 – 2026 |
| Submitted by | Linto Mathew Joy (SJC24MCA-2041) |

---

## 👨‍💻 Author

**Linto Mathew Joy**
- 📧 [lintojoythoppil@gmail.com](mailto:lintojoythoppil@gmail.com)
- 🐙 [github.com/lintothoppil](https://github.com/lintothoppil)
- 💼 [linkedin.com/in/linto-mathew-joy](https://linkedin.com/in/linto-mathew-joy)

---

<p align="center">
  Made with 💙 at SJCET Palai · <i>Empowering students through intelligent mentoring.</i>
</p>
