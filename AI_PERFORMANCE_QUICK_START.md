# AI Performance Analysis & Remedial Class System - Quick Start Guide

## 🚀 Getting Started

### Step 1: Run Database Migration

```bash
cd student_module
python migrate_ai_performance.py
```

This will create three new tables:
- `remedial_classes`
- `ai_performance_reports`
- `remedial_notifications`

### Step 2: Start the Backend Server

```bash
cd student_module
python app.py
```

Ensure your `.env` file has the Groq API key:
```
GROQ_API_KEY=your_api_key_here
```

### Step 3: Start the Frontend

```bash
npm run dev
```

### Step 4: Access the Features

- **Subject Handler**: Navigate to `http://localhost:5173/dashboard/subject-handler/ai-analysis`
- **Mentor**: Navigate to `http://localhost:5173/dashboard/mentor/ai-reports`

---

## 📖 User Guides

### For Subject Handlers

#### How to Analyze Student Performance

1. **Login** as a Subject Handler
2. **Navigate** to "AI Performance Analysis" from the dashboard menu
3. **Select a Student** from the dropdown
4. **Select a Subject** (optional - leave empty for overall analysis)
5. **Click** "Run AI Analysis"
6. **Wait** for the AI to generate insights (5-10 seconds)
7. **Review** the analysis results:
   - Performance Trend (Improving/Stable/Declining)
   - Risk Assessment (Low/Medium/High)
   - AI Insights (detailed analysis)
   - Strengths and Weaknesses
   - Recommendations

#### How to Schedule a Remedial Class

1. **After running analysis**, if AI recommends remedial:
   - You'll see "Remedial Needed: Yes"
   - List of subjects needing remedial will be shown
   
2. **Click** "Schedule Remedial Class" button

3. **Fill in the form**:
   - **Title**: e.g., "Mathematics Fundamentals Review"
   - **Date**: Select date from calendar
   - **Time Slot**: e.g., "15:00-16:00"
   - **Duration**: in minutes (default: 60)
   - **Mode**: Online (GMeet) or Offline
   - **Meeting Link**: Paste GMeet link (for online classes)
   - **Description**: Additional details (optional)

4. **Click** "Schedule Class"

5. **Notifications are automatically sent** to:
   - The student (with GMeet link if online)
   - The student's mentor

#### Example Workflow

```
1. Student A24MCA001 is struggling in Physics (45% marks)
2. Run AI Analysis → AI shows "High Risk" and recommends remedial
3. Click "Schedule Remedial Class"
4. Fill form:
   - Title: "Physics Mechanics Review"
   - Date: 2026-05-01
   - Time: 15:00-16:00
   - Mode: Online
   - Meeting Link: https://meet.google.com/abc-defg-hij
5. Submit
6. Student receives notification with GMeet link
7. Mentor receives notification about the scheduled class
8. Student joins GMeet at scheduled time
9. After class, mark attendance and add feedback
```

---

### For Mentors

#### How to View AI Reports

1. **Login** as a Mentor
2. **Navigate** to "AI Reports" from the dashboard menu
3. **View Summary Cards**:
   - Total Mentees
   - High Risk Students (need immediate attention)
   - Students with Pending Remedial Classes
   - Average Attendance

4. **Review Charts**:
   - **Bar Chart**: Performance scores of mentees
   - **Pie Chart**: Risk distribution (High/Medium/Low)

5. **Check High-Risk Students Section**:
   - Red alert box showing students with risk score ≥ 60
   - Click "Analyze" for detailed AI insights
   - Click "Schedule Meeting" to book a mentoring session

6. **Monitor Remedial Classes**:
   - Amber section showing students with pending remedial
   - Track which students are getting extra help

7. **View All Mentees Table**:
   - Complete list with attendance, risk score, trend
   - Color-coded risk badges
   - Click "Analyze" for any student

#### How to Analyze Individual Student

1. **Find the student** in any section (High Risk, Remedial, or Table)
2. **Click** "Analyze" button
3. **View Detailed Analysis**:
   - AI Insights paragraph
   - Strengths (green box)
   - Weaknesses (red box)
   - Recommendations (blue box)
   - Mentor Action Items (purple box)

4. **Take Action** based on AI recommendations:
   - Schedule one-on-one meeting
   - Contact subject handler
   - Inform parents (if needed)
   - Create intervention plan

#### Example Workflow

```
1. Login and navigate to AI Reports
2. See summary: 25 mentees, 4 high risk, 6 with remedial
3. Check High Risk section → Student A24MCA005 (Risk: 72)
4. Click "Analyze" on A24MCA005
5. AI shows:
   - Trend: Declining
   - Weaknesses: Poor attendance (65%), Low marks in 3 subjects
   - Recommendations: Schedule meeting, contact handlers
   - Action Items: Review weekly, create improvement plan
6. Take action:
   - Book mentoring session
   - Email subject handlers
   - Create weekly check-in schedule
7. Monitor progress in next report
```

---

## 🎯 Key Features Explained

### AI Performance Analysis

**What it does:**
- Analyzes student's marks across all subjects
- Evaluates attendance patterns
- Calculates risk score
- Identifies trends (improving/stable/declining)
- Generates actionable recommendations
- Determines if remedial is needed

**AI vs Rule-Based:**
- **Groq AI**: Uses LLaMA 3.3 70B model for deep analysis
- **Rule-Based**: Fallback when Groq unavailable (basic analysis)

### Remedial Class Scheduling

**What it does:**
- Allows subject handlers to schedule extra classes
- Supports online (GMeet) and offline modes
- Automatically notifies student and mentor
- Tracks attendance and feedback
- Updates status (scheduled/completed/cancelled)

**Notification Flow:**
```
Handler schedules class
    ↓
System creates notification for student
    ↓
System creates notification for mentor
    ↓
Both receive alerts with class details
```

### Mentor AI Reports

**What it does:**
- Aggregates data for all mentees
- Identifies high-risk students
- Tracks remedial class participation
- Provides individual analysis on demand
- Generates visual charts and summaries

**Risk Categories:**
- **High Risk** (≥60): Immediate attention needed
- **Medium Risk** (30-59): Monitor closely
- **Low Risk** (<30): Doing well

---

## 🔧 Troubleshooting

### Issue: AI Analysis Fails

**Possible causes:**
1. Groq API key not set
2. Invalid API key
3. Network connectivity issue

**Solution:**
```bash
# Check .env file
cat student_module/.env

# Ensure GROQ_API_KEY is set
GROQ_API_KEY=gsk_your_key_here

# Restart Flask server
```

### Issue: Tables Not Created

**Solution:**
```bash
# Run migration script
cd student_module
python migrate_ai_performance.py

# Check output for errors
```

### Issue: Notifications Not Showing

**Possible causes:**
1. Database not migrated
2. API endpoint not registered

**Solution:**
```bash
# Verify tables exist
python -c "from app import app, db; from models import RemedialNotification; app.app_context().push(); print(RemedialNotification.query.count())"

# Check Flask console for errors
```

### Issue: Student Not in Dropdown

**Possible causes:**
1. Subject handler has no subjects allocated
2. No students in those subjects

**Solution:**
```bash
# Check subject allocations
# Navigate to: /api/handler/my-subjects/{handler_id}
# Verify subjects and students are returned
```

---

## 📊 Understanding the Data

### Risk Score Calculation

The risk score (0-100) is calculated based on:
- **Attendance** (30% weight): Lower attendance = higher risk
- **Marks** (40% weight): Lower marks = higher risk
- **Trend** (20% weight): Declining trend = higher risk
- **Remedial History** (10% weight): Previous remedials = adjusted risk

### Performance Trend

- **Improving**: Marks/attendance increasing over time
- **Stable**: Consistent performance
- **Declining**: Marks/attendance decreasing

### Remedial Recommendation

AI recommends remedial when:
- Subject marks < 50%
- Attendance < 75%
- Multiple subjects showing poor performance
- Declining trend detected

---

## 💡 Best Practices

### For Subject Handlers

1. **Run analysis regularly**: Weekly or bi-weekly for all students
2. **Act on recommendations**: Schedule remedial promptly when suggested
3. **Provide detailed feedback**: After remedial, note what was covered
4. **Coordinate with mentors**: Keep mentors informed about progress
5. **Use GMeet for online classes**: Easier tracking and attendance

### For Mentors

1. **Check reports weekly**: Monitor all mentees' progress
2. **Prioritize high-risk students**: Address them first
3. **Follow up on remedial**: Ensure students attend scheduled classes
4. **Document interventions**: Keep notes on actions taken
5. **Communicate with handlers**: Coordinate remedial efforts

---

## 📞 Need Help?

- Check the full implementation guide: `AI_PERFORMANCE_ANALYSIS_IMPLEMENTATION.md`
- Review API documentation in the implementation guide
- Check Flask console for backend errors
- Check browser console for frontend errors
- Verify database tables are created

---

**Last Updated**: April 24, 2026  
**Version**: 1.0.0
