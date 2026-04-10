# Final Fix - Mentoring Session Reschedule with Date/Time Preferences

## ✅ Issues Fixed

1. **Database Column Mismatch** - SQLAlchemy model was using new column names but database has old names
2. **Student Cancel Button** - Now supports reschedule requests with date/time preferences
3. **Mentor Respond Action** - Added "reschedule" action to accept student requests with new times

---

## 🔧 Changes Made

### 1. Model Fix (`student_module/models.py`)

Updated `MentoringSession` model to map Python attributes to actual database columns:

```python
# Maps to DB column 'time'
time_slot = db.Column(db.String(20), nullable=False, name='time')

# Maps to DB column 'type'  
session_type = db.Column(db.String(20), default='Online', name='type')

# Maps to DB column 'remarks'
notes = db.Column(db.Text, name='remarks')
```

**Why:** The SQLite database has old column names (`time`, `type`, `remarks`) but the model defined new names. This caused the error:
```
sqlite3.OperationalError) no such column: mentoring_sessions.time_slot
```

---

### 2. Backend Enhancement (`student_module/app.py`)

#### A. Enhanced Cancel Endpoint (Line ~3654)
Now supports reschedule requests with preferred date/time:

```python
@app.route('/api/session/<int:session_id>/cancel', methods=['POST'])
def api_cancel_session(session_id):
    # For approved sessions: create reschedule request
    if session.status == 'Approved':
        reason = data.get('reason')  # Required
        preferred_date = data.get('preferred_date')  # Optional
        preferred_time = data.get('preferred_time')  # Optional
        
        # Build note: [Reschedule Requested by Student: Exam conflict]
        # Preferred Date: 2026-04-10 Preferred Time: 14:00
        session.notes += reschedule_note
        session.status = 'Pending'  # Back to pending for mentor review
```

**Workflow:**
- Pending sessions → Direct cancel
- Approved sessions → Reschedule request with reason + preferred time

---

#### B. Enhanced Respond Endpoint (Line ~3707)
Added `reschedule` action for mentors:

```python
@app.route('/api/session/<int:session_id>/respond', methods=['POST'])
def api_respond_session(session_id):
    action = data.get('action')  # 'approve' | 'reject' | 'cancel' | 'reschedule'
    
    elif action == 'reschedule':
        # Mentor accepts student's request and sets new time
        if new_date:
            session.date = new_date
        if new_time:
            session.time_slot = new_time
        if message:
            session.notes += f'\n[Mentor Response: {message}]'
        session.status = 'Approved'
```

**Actions:**
- `approve` - Accepts session as-is
- `reject` - Declines session
- `cancel` - Cancels approved session
- `reschedule` - **NEW**: Accepts with new date/time

---

### 3. Frontend Update (`src/pages/StudentMentoringPage.tsx`)

Enhanced cancel button to collect date/time preferences:

```typescript
if (session.status === "Approved") {
    const reason = prompt("Please provide a reason for rescheduling:");
    const preferredDate = prompt("Preferred new date (YYYY-MM-DD), or press Cancel to skip:");
    const preferredTime = prompt("Preferred new time (HH:MM), or press Cancel to skip:");
    
    // Send to backend with all details
    body: JSON.stringify({ 
        admission_number: admNo, 
        reason,
        preferred_date: preferredDate || undefined,
        preferred_time: preferredTime || undefined
    })
}
```

**User Experience:**
1. Student clicks "Cancel" on approved session
2. Prompted for reason (required)
3. Prompted for preferred date (optional, can skip)
4. Prompted for preferred time (optional, can skip)
5. Request sent to mentor with all details

---

## 🎯 How It Works

### Student Workflow

```
Click "Cancel" on Approved Session
         ↓
Enter Reason (e.g., "Have an exam")
         ↓
Enter Preferred Date (optional)
         ↓
Enter Preferred Time (optional)
         ↓
Request Sent → Status: Pending
```

### Mentor Workflow

```
See Pending Session with Reschedule Request
         ↓
View Student's Reason & Preferences
         ↓
Options:
├─ Approve (keep original time)
├─ Reject (decline request)
└─ Reschedule (accept with new time) ← NEW
      ↓
   Set new date/time
   Add message (optional)
   Submit → Status: Approved
```

---

## 📊 Data Flow

### Reschedule Request Format

Stored in `notes` field:
```
[Reschedule Requested by Student: I have an exam on April 7th]
Preferred Date: 2026-04-10
Preferred Time: 14:00
```

### Mentor Response Format

Appended to notes:
```
[Mentor Response: Sure, we can meet at 2 PM on April 10th]
```

---

## ✨ Features

| Feature | Status | Description |
|---------|--------|-------------|
| Database compatibility | ✅ FIXED | Model maps to actual DB columns |
| Student cancel pending | ✅ Works | Direct cancellation |
| Student reschedule approved | ✅ NEW | With reason + date/time preferences |
| Mentor respond actions | ✅ ENHANCED | approve, reject, cancel, **reschedule** |
| Communication trail | ✅ PRESERVED | All messages in notes field |

---

## 🧪 Testing

### Quick Test Steps

1. **Student logs in** → Goes to My Sessions
2. **Clicks "Cancel"** on approved session
3. **Enters reason**: "Exam conflict"
4. **Enters preferred date**: 2026-04-10
5. **Enters preferred time**: 14:00
6. **Submit** → Session status changes to "Pending"

7. **Mentor logs in** → Sees session in Pending tab
8. **Clicks "Respond"** → Sees student's reason and preferences
9. **Selects "Reschedule" action**
10. **Confirms new date/time** → Adds message
11. **Submit** → Session approved with new schedule

---

## 📁 Files Modified

1. ✅ `student_module/models.py` - Column name mapping
2. ✅ `student_module/app.py` - Enhanced cancel and respond endpoints
3. ✅ `src/pages/StudentMentoringPage.tsx` - Collect date/time preferences

---

## 🎉 Success Criteria

- ✅ No more database column errors
- ✅ Student can request reschedule with specific date/time preferences
- ✅ Mentor can accept reschedule request and set new time
- ✅ All communication preserved in session notes
- ✅ Works with existing SQLite database (no migration needed)

---

**Status:** ✅ PRODUCTION READY  
**Date:** April 3, 2026  
**Compatibility:** SQLite database with legacy column names
