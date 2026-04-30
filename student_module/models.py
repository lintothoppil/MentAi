from flask_sqlalchemy import SQLAlchemy
from datetime import datetime

db = SQLAlchemy()

class Student(db.Model):
    __tablename__ = 'students'
    
    admission_number = db.Column(db.String(20), primary_key=True)
    roll_number = db.Column(db.String(20))
    full_name = db.Column(db.String(100), nullable=False)
    branch = db.Column(db.String(50))
    batch = db.Column(db.String(20))  # Kept for backward compatibility
    batch_id = db.Column(db.Integer, db.ForeignKey('batches.id'))
    dob = db.Column(db.Date)
    age = db.Column(db.Integer)
    blood_group = db.Column(db.String(10))
    religion = db.Column(db.String(50))
    # If Catholic
    diocese = db.Column(db.String(100))
    parish = db.Column(db.String(100))
    caste_category = db.Column(db.String(20))
    permanent_address = db.Column(db.Text)
    contact_address = db.Column(db.Text)
    mobile_number = db.Column(db.String(15))
    email = db.Column(db.String(100), unique=True, nullable=False)
    photo_path = db.Column(db.String(255))
    mentor_remarks = db.Column(db.Text)
    profile_completed = db.Column(db.Boolean, default=False)
    status = db.Column(db.String(20), default='Live') # Live, Dropout, Passed Out, Alumni
    passout_year = db.Column(db.Integer)
    password_hash = db.Column(db.String(255), nullable=True) # Added for FIX 1
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    # Relationships
    parents = db.relationship('Parent', backref='student', uselist=False, cascade="all, delete-orphan")
    academics = db.relationship('Academic', backref='student', uselist=False, cascade="all, delete-orphan")
    other_info = db.relationship('OtherInfo', backref='student', uselist=False, cascade="all, delete-orphan")
    login_credential = db.relationship('LoginCredential', backref='student', uselist=False, cascade="all, delete-orphan")
    guardian = db.relationship('Guardian', backref='student', uselist=False, cascade="all, delete-orphan")
    work_experience = db.relationship('WorkExperience', backref='student', cascade="all, delete-orphan")
    
    # Mentor Relationship
    mentor_id = db.Column(db.Integer, db.ForeignKey('faculty.id'))
    mentor = db.relationship('Faculty', backref='mentees')

class Faculty(db.Model):
    __tablename__ = 'faculty'
    
    id = db.Column(db.Integer, primary_key=True)
    username = db.Column(db.String(50), unique=True, nullable=False) # Staff ID or Username
    password_hash = db.Column(db.String(255), nullable=False)
    name = db.Column(db.String(100), nullable=False)
    email = db.Column(db.String(100), unique=True, nullable=True) # Added for bulk upload
    designation = db.Column(db.String(50), nullable=False) # Admin, HOD, Mentor, Subject Handler
    department = db.Column(db.String(50), nullable=False)
    status = db.Column(db.String(20), default='Live') # Live, Inactive
    is_mentor_eligible = db.Column(db.Boolean, default=True) # Added for FIX 2
    is_hod = db.Column(db.Boolean, default=False)
    is_subject_handler = db.Column(db.Boolean, default=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

class Timetable(db.Model):
    __tablename__ = 'timetables'
    
    id = db.Column(db.Integer, primary_key=True)
    department = db.Column(db.String(50), nullable=False)
    batch = db.Column(db.String(20)) # e.g. 2024-2026
    day = db.Column(db.String(15)) # Monday, Tuesday...
    period = db.Column(db.Integer) # 1, 2, 3...
    time_slot = db.Column(db.String(50)) # e.g. 9:00-10:00
    subject = db.Column(db.String(100))
    handler_name = db.Column(db.String(100)) # Stored as text for display
    handler_id = db.Column(db.Integer, db.ForeignKey('faculty.id')) # Optional link if matched
    
    # FIX 5: Timetable File Upload Fields
    course_id = db.Column(db.Integer, db.ForeignKey('courses.id'), nullable=True)
    batch_id = db.Column(db.Integer, db.ForeignKey('batches.id'), nullable=True)
    semester = db.Column(db.Integer)
    academic_year = db.Column(db.String(20))
    file_path = db.Column(db.String(255))
    uploaded_at = db.Column(db.DateTime, default=datetime.utcnow)
    uploaded_by = db.Column(db.Integer, db.ForeignKey('faculty.id'))
    
    handler = db.relationship('Faculty', foreign_keys=[handler_id], backref='assigned_periods')
    uploader = db.relationship('Faculty', foreign_keys=[uploaded_by])

class Parent(db.Model):
    __tablename__ = 'parents'
    
    id = db.Column(db.Integer, primary_key=True)
    student_admission_number = db.Column(db.String(20), db.ForeignKey('students.admission_number'), nullable=False)
    
    father_name = db.Column(db.String(100))
    father_profession = db.Column(db.String(100))
    father_age = db.Column(db.Integer)
    father_mobile = db.Column(db.String(15))
    
    mother_name = db.Column(db.String(100))
    mother_profession = db.Column(db.String(100))
    mother_age = db.Column(db.Integer)
    mother_mobile = db.Column(db.String(15))
    
    father_place_of_work = db.Column(db.String(100))
    mother_place_of_work = db.Column(db.String(100))

class Guardian(db.Model):
    __tablename__ = 'guardians'
    
    id = db.Column(db.Integer, primary_key=True)
    student_admission_number = db.Column(db.String(20), db.ForeignKey('students.admission_number'), nullable=False)
    
    name = db.Column(db.String(100))
    address = db.Column(db.Text)
    mobile_number = db.Column(db.String(15))

class Academic(db.Model):
    __tablename__ = 'academics'
    
    id = db.Column(db.Integer, primary_key=True)
    student_admission_number = db.Column(db.String(20), db.ForeignKey('students.admission_number'), nullable=False)
    
    school_10th = db.Column(db.String(100))
    board_10th = db.Column(db.String(50))
    percentage_10th = db.Column(db.Float)
    
    school_12th = db.Column(db.String(100))
    board_12th = db.Column(db.String(50))
    percentage_12th = db.Column(db.Float)
    
    college_ug = db.Column(db.String(100))
    university_ug = db.Column(db.String(100))
    percentage_ug = db.Column(db.Float)
    
    sgpa = db.Column(db.Float)
    cgpa = db.Column(db.Float)

    # Added fields
    medium_of_instruction = db.Column(db.String(50))
    entrance_rank = db.Column(db.String(50)) # KEAM/LBS
    nature_of_admission = db.Column(db.String(50)) # Merit, Management, NRI, Lateral

class WorkExperience(db.Model):
    __tablename__ = 'work_experiences'
    
    id = db.Column(db.Integer, primary_key=True)
    student_admission_number = db.Column(db.String(20), db.ForeignKey('students.admission_number'), nullable=False)
    
    organization = db.Column(db.String(100))
    job_title = db.Column(db.String(100))
    duration = db.Column(db.String(50))

class OtherInfo(db.Model):
    __tablename__ = 'other_info'
    
    id = db.Column(db.Integer, primary_key=True)
    student_admission_number = db.Column(db.String(20), db.ForeignKey('students.admission_number'), nullable=False)
    
    siblings_details = db.Column(db.Text) # Storing as text, could be improved with another table
    # Accommodation
    accommodation_type = db.Column(db.String(50)) # Hosteler / Day Scholar
    
    # If Day Scholar
    staying_with = db.Column(db.String(100))
    
    # If Hosteler (College or Private)
    hostel_name = db.Column(db.String(100))
    stay_from = db.Column(db.Date)
    stay_to = db.Column(db.Date)
    
    # Transport
    transport_mode = db.Column(db.String(50))
    vehicle_number = db.Column(db.String(20)) # If own vehicle

class LoginCredential(db.Model):
    __tablename__ = 'login_credentials'
    
    admission_number = db.Column(db.String(20), db.ForeignKey('students.admission_number'), primary_key=True)
    password_hash = db.Column(db.String(255), nullable=False)

class Course(db.Model):
    __tablename__ = "courses"
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(120), unique=True, nullable=False)
    code = db.Column(db.String(10), unique=True)  # Department code
    duration_years = db.Column(db.Integer, default=4)

class Semester(db.Model):
    __tablename__ = "semesters"
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(50), nullable=False)

class Subject(db.Model):
    __tablename__ = "subjects"

    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(120), nullable=False)

    course_id = db.Column(db.Integer, db.ForeignKey("courses.id"), nullable=False)
    semester_id = db.Column(db.Integer, db.ForeignKey("semesters.id"), nullable=False)

    course = db.relationship("Course", backref="subjects")
    semester = db.relationship("Semester", backref="subjects")

    __table_args__ = (
        db.UniqueConstraint("name", "semester_id", name="unique_subject_per_semester"),
    )

class SubjectAllocation(db.Model):
    __tablename__ = "subject_allocations"

    id = db.Column(db.Integer, primary_key=True)

    subject_id = db.Column(db.Integer, db.ForeignKey("subjects.id"), nullable=False)
    faculty_id = db.Column(db.Integer, db.ForeignKey("faculty.id"), nullable=False)

    subject = db.relationship("Subject", backref="allocations")
    faculty = db.relationship("Faculty", backref="allocations")

    __table_args__ = (
        db.UniqueConstraint("subject_id", "faculty_id", name="unique_subject_faculty"),
    )

class InternalMark(db.Model):
    __tablename__ = "internal_marks"

    id = db.Column(db.Integer, primary_key=True)

    student_id = db.Column(db.String(20), db.ForeignKey("students.admission_number"), nullable=False)
    subject_id = db.Column(db.Integer, db.ForeignKey("subjects.id"), nullable=False)

    exam_type = db.Column(db.String(50), nullable=False)  # Internal1, Internal2
    marks = db.Column(db.Float, nullable=False)

    uploaded_by = db.Column(db.Integer, db.ForeignKey("faculty.id"), nullable=False)
    uploaded_at = db.Column(db.DateTime, default=datetime.utcnow)

    student = db.relationship("Student", foreign_keys=[student_id])
    subject = db.relationship("Subject")

    __table_args__ = (
        db.UniqueConstraint(
            "student_id",
            "subject_id",
            "exam_type",
            name="unique_internal_exam"
        ),
    )

class UniversityMark(db.Model):
    __tablename__ = "university_marks"

    id = db.Column(db.Integer, primary_key=True)

    student_id = db.Column(db.String(20), db.ForeignKey("students.admission_number"), nullable=False)
    semester_id = db.Column(db.Integer, db.ForeignKey("semesters.id"), nullable=False)

    pdf_path = db.Column(db.String(255), nullable=False)
    uploaded_at = db.Column(db.DateTime, default=datetime.utcnow)

    student = db.relationship("Student")
    semester = db.relationship("Semester")

    __table_args__ = (
        db.UniqueConstraint("student_id", "semester_id", name="unique_university_sem"),
    )

class UniversityResult(db.Model):
    __tablename__ = "university_results"

    id = db.Column(db.Integer, primary_key=True)
    student_id = db.Column(db.String(20), db.ForeignKey("students.admission_number"), nullable=False)
    semester = db.Column(db.Integer, nullable=False)
    subject = db.Column(db.String(150), nullable=False)
    marks_obtained = db.Column(db.Float, nullable=False)
    total_marks = db.Column(db.Float, nullable=False, default=100)
    result_date = db.Column(db.Date)
    status = db.Column(db.String(30), default="pending_verification")
    verified_by_mentor_id = db.Column(db.Integer, db.ForeignKey("faculty.id"))
    verified_at = db.Column(db.DateTime)
    mentor_comment = db.Column(db.Text)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    student = db.relationship("Student", foreign_keys=[student_id], backref="university_results")
    verified_by_mentor = db.relationship("Faculty", foreign_keys=[verified_by_mentor_id])

class Attendance(db.Model):
    __tablename__ = 'attendance'
    id = db.Column(db.Integer, primary_key=True)
    student_admission_number = db.Column(db.String(20), db.ForeignKey('students.admission_number'), nullable=False)
    subject_name = db.Column(db.String(100), nullable=False)
    subject_code = db.Column(db.String(50))  # Added
    semester = db.Column(db.Integer, nullable=False)
    total_classes = db.Column(db.Integer, default=0)
    attended_classes = db.Column(db.Integer, default=0)
    percentage = db.Column(db.Float, default=0.0)

class MentoringSession(db.Model):
    __tablename__ = 'mentoring_sessions'
    id = db.Column(db.Integer, primary_key=True)
    student_admission_number = db.Column(db.String(20), db.ForeignKey('students.admission_number'), nullable=False)
    mentor_id = db.Column(db.Integer, db.ForeignKey('faculty.id'), nullable=True)
    date = db.Column(db.Date, nullable=False)
    time_slot = db.Column(db.String(20), nullable=False, name='time')             # e.g. "09:00", "17:00" - DB column is 'time'
    slot_type = db.Column(db.String(20), default='system')           # 'system' (9-17) or 'mentor' (17-19)
    session_type = db.Column(db.String(20), default='Online', name='type')        # Online / Offline - DB column is 'type'
    status = db.Column(db.String(20), default='Pending')             # Pending / Approved / Rejected / Cancelled
    meeting_link = db.Column(db.String(255))
    notes = db.Column(db.Text, name='remarks')  # DB column is 'remarks'
    # Google Calendar
    calendar_event_id = db.Column(db.String(255))
    calendar_link = db.Column(db.String(512))
    attendance_marked_at = db.Column(db.DateTime)
    absence_reason = db.Column(db.Text)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    student = db.relationship('Student', foreign_keys=[student_admission_number], backref='sessions')
    mentor  = db.relationship('Faculty', foreign_keys=[mentor_id], backref='mentor_sessions')


class MentorLeave(db.Model):
    """Mentor marks dates/time ranges when they are unavailable."""
    __tablename__ = 'mentor_leaves'
    id = db.Column(db.Integer, primary_key=True)
    mentor_id = db.Column(db.Integer, db.ForeignKey('faculty.id'), nullable=False)
    leave_date = db.Column(db.Date, nullable=False)
    # Optional: restrict leave to certain hours; None = whole-day leave
    from_time = db.Column(db.String(10))   # "09:00"
    to_time   = db.Column(db.String(10))   # "19:00"
    reason    = db.Column(db.String(255))
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    mentor = db.relationship('Faculty', foreign_keys=[mentor_id], backref='leaves')

    __table_args__ = (
        db.Index('ix_mentor_leave_date', 'mentor_id', 'leave_date'),
    )


class Note(db.Model):
    __tablename__ = 'notes'
    id = db.Column(db.Integer, primary_key=True)
    subject_name = db.Column(db.String(100), nullable=False)
    title = db.Column(db.String(150), nullable=False)
    file_path = db.Column(db.String(255), nullable=False)
    file_type = db.Column(db.String(10)) # PDF, PPT, etc.
    uploaded_by = db.Column(db.String(100)) # Subject Handler Name
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

class LeaveRequest(db.Model):
    __tablename__ = 'leave_requests'
    id = db.Column(db.Integer, primary_key=True)
    student_admission_number = db.Column(db.String(20), db.ForeignKey('students.admission_number'), nullable=False)
    type = db.Column(db.String(50)) # Duty Leave, Medical Leave, Half Day, etc.
    from_date = db.Column(db.Date, nullable=False)
    to_date = db.Column(db.Date)
    reason = db.Column(db.Text, nullable=False)
    document_path = db.Column(db.String(255))
    status = db.Column(db.String(20), default='Pending') # Approved by Coordinator -> Approved by HOD
    coordinator_status = db.Column(db.String(20), default='Pending')
    hod_status = db.Column(db.String(20), default='Pending')

class Activity(db.Model):
    __tablename__ = 'activities'
    id = db.Column(db.Integer, primary_key=True)
    student_admission_number = db.Column(db.String(20), db.ForeignKey('students.admission_number'), nullable=False)
    title = db.Column(db.String(150), nullable=False)
    type = db.Column(db.String(50)) # Art, Sports, ECA, etc.
    certificate_path = db.Column(db.String(255))
    date = db.Column(db.Date)
    
class DailyAttendance(db.Model):
    __tablename__ = 'daily_attendance'
    id = db.Column(db.Integer, primary_key=True)
    student_admission_number = db.Column(db.String(20), db.ForeignKey('students.admission_number'), nullable=False)
    date = db.Column(db.Date, nullable=False)
    
    # Store availability for 7 hours (True/False or 'P'/'A' - storing as boolean/int for simplicity. 1=Present, 0=Absent)
    hour_1 = db.Column(db.Integer, default=0)
    hour_2 = db.Column(db.Integer, default=0)
    hour_3 = db.Column(db.Integer, default=0)
    hour_4 = db.Column(db.Integer, default=0)
    hour_5 = db.Column(db.Integer, default=0)
    hour_6 = db.Column(db.Integer, default=0)
    hour_7 = db.Column(db.Integer, default=0)
    
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    
    __table_args__ = (db.UniqueConstraint('student_admission_number', 'date', name='_student_date_uc'),)

class Alert(db.Model):
    __tablename__ = 'alerts'
    id = db.Column(db.Integer, primary_key=True)
    student_admission_number = db.Column(db.String(20), db.ForeignKey('students.admission_number'), nullable=False)
    mentor_id = db.Column(db.Integer, db.ForeignKey('faculty.id'), nullable=True)
    type = db.Column(db.String(50)) # LOW_ATTENDANCE, CONSECUTIVE_ABSENCE, ML_RISK, etc.
    message = db.Column(db.Text)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    is_read = db.Column(db.Boolean, default=False)

class StudentAnalytics(db.Model):
    __tablename__ = "student_analytics"

    id = db.Column(db.Integer, primary_key=True)
    student_id = db.Column(db.String(20), db.ForeignKey('students.admission_number'), unique=True, nullable=False)

    attendance_percentage = db.Column(db.Float, default=0.0)
    attendance_slope = db.Column(db.Float, default=0.0)

    avg_internal_marks = db.Column(db.Float, default=0.0)
    marks_slope = db.Column(db.Float, default=0.0)
    failure_count = db.Column(db.Integer, default=0)
    marks_variance = db.Column(db.Float, default=0.0)

    risk_score = db.Column(db.Float, default=0.0)
    status = db.Column(db.String(20), default="Stable")  # Improving / Stable / Declining
    ml_risk_probability = db.Column(db.Float, default=0.0)

    compliance_modifier = db.Column(db.Float, default=0.0)
    adjusted_risk = db.Column(db.Float, default=0.0)

    last_updated = db.Column(db.DateTime, default=datetime.utcnow)
    
    student = db.relationship("Student")

class StudentAttendance(db.Model):
    __tablename__ = 'student_attendance'
    id = db.Column(db.Integer, primary_key=True)
    student_admission_number = db.Column(db.String(20), db.ForeignKey('students.admission_number'), nullable=False)
    date = db.Column(db.Date, nullable=False)
    status = db.Column(db.String(5), nullable=False) # P, A, OD
    uploaded_by = db.Column(db.Integer, db.ForeignKey('faculty.id'), nullable=True) # Admin ID who uploaded
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    
    __table_args__ = (db.UniqueConstraint('student_admission_number', 'date', name='_student_attendance_date_uc'),)

class WeeklyStudyPlan(db.Model):
    __tablename__ = "weekly_study_plans"

    id = db.Column(db.Integer, primary_key=True)

    student_id = db.Column(
        db.String(20),
        db.ForeignKey("students.admission_number"),
        nullable=False
    )

    week_start = db.Column(db.Date, nullable=False)
    week_end = db.Column(db.Date, nullable=False)

    total_hours = db.Column(db.Float, nullable=False)
    booster_applied = db.Column(db.String(50))  # None / Deterministic / ML

    deterministic_risk = db.Column(db.Float)
    ml_probability = db.Column(db.Float)

    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    locked = db.Column(db.Boolean, default=True)

    __table_args__ = (
        db.UniqueConstraint("student_id", "week_start", name="unique_week_plan"),
    )

    student = db.relationship("Student", backref="weekly_plans")

class StudyPlanSubject(db.Model):
    __tablename__ = "study_plan_subjects"

    id = db.Column(db.Integer, primary_key=True)

    plan_id = db.Column(
        db.Integer,
        db.ForeignKey("weekly_study_plans.id"),
        nullable=False
    )

    subject_id = db.Column(
        db.Integer,
        db.ForeignKey("subjects.id"),
        nullable=False
    )

    allocated_hours = db.Column(db.Float, nullable=False)
    weakness_score = db.Column(db.Float, nullable=False)
    priority = db.Column(db.String(20))

    plan = db.relationship("WeeklyStudyPlan", backref="subjects")
    subject = db.relationship("Subject")

class StudySessionLog(db.Model):
    __tablename__ = "study_session_logs"

    id = db.Column(db.Integer, primary_key=True)

    plan_subject_id = db.Column(
        db.Integer,
        db.ForeignKey("study_plan_subjects.id"),
        nullable=False
    )

    date = db.Column(db.Date, nullable=False)
    hours_completed = db.Column(db.Float, default=0)

    plan_subject = db.relationship("StudyPlanSubject", backref="sessions")

class MentorIntervention(db.Model):
    __tablename__ = "mentor_interventions"

    id = db.Column(db.Integer, primary_key=True)

    student_id = db.Column(
        db.String(20),
        db.ForeignKey("students.admission_number"),
        nullable=False
    )

    mentor_id = db.Column(
        db.Integer,
        db.ForeignKey("faculty.id"),
        nullable=False
    )

    week_start = db.Column(db.Date, nullable=False)

    risk_snapshot = db.Column(db.Float)   # adjusted risk at time of intervention
    compliance_snapshot = db.Column(db.Float)

    intervention_type = db.Column(db.String(50))  
    notes = db.Column(db.Text)

    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    escalated = db.Column(db.Boolean, default=False)
    escalated_at = db.Column(db.DateTime)

    locked = db.Column(db.Boolean, default=True)

class InterventionOutcome(db.Model):
    __tablename__ = 'intervention_outcomes'

    id = db.Column(db.Integer, primary_key=True)

    intervention_id = db.Column(
        db.Integer,
        db.ForeignKey("mentor_interventions.id"),
        unique=True,
        nullable=False
    )

    evaluated_week_start = db.Column(db.Date, nullable=False)

    initial_risk = db.Column(db.Float, nullable=False)
    subsequent_risk = db.Column(db.Float, nullable=False)

    delta = db.Column(db.Float, nullable=False)

    initial_compliance = db.Column(db.Float)
    subsequent_compliance = db.Column(db.Float)
    compliance_shift = db.Column(db.Float)

    outcome_label = db.Column(db.String(20))  # Improved / Static / Regressed

    created_at = db.Column(db.DateTime, default=datetime.utcnow)


class Batch(db.Model):
    __tablename__ = 'batches'
    
    id = db.Column(db.Integer, primary_key=True)
    course_id = db.Column(db.Integer, db.ForeignKey('courses.id'), nullable=False)
    start_year = db.Column(db.Integer, nullable=False)
    end_year = db.Column(db.Integer, nullable=False)
    status = db.Column(db.String(20), default='active')  # active, completed
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    
    # Relationships
    course = db.relationship('Course', backref='batches')
    students = db.relationship('Student', backref='batch_info')


class AlumniStudent(db.Model):
    __tablename__ = 'alumni_students'
    
    id = db.Column(db.Integer, primary_key=True)
    admission_number = db.Column(db.String(20), unique=True, nullable=False)
    name = db.Column(db.String(100), nullable=False)
    email = db.Column(db.String(100))
    department = db.Column(db.String(50))
    course_id = db.Column(db.Integer, db.ForeignKey('courses.id'))
    batch_id = db.Column(db.Integer, db.ForeignKey('batches.id'))
    mentor_id = db.Column(db.Integer, db.ForeignKey('faculty.id'))
    passout_year = db.Column(db.Integer)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)


class AlumniMentorHistory(db.Model):
    __tablename__ = 'alumni_mentor_history'
    
    id = db.Column(db.Integer, primary_key=True)
    admission_number = db.Column(db.String(20), nullable=False)
    mentor_id = db.Column(db.Integer, db.ForeignKey('faculty.id'))
    start_date = db.Column(db.DateTime)
    end_date = db.Column(db.DateTime)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

class Notification(db.Model):
    __tablename__ = 'notifications'
    
    id = db.Column(db.Integer, primary_key=True)
    student_id = db.Column(db.String(20), db.ForeignKey('students.admission_number'), nullable=False)
    title = db.Column(db.String(100), nullable=False)
    message = db.Column(db.Text, nullable=False)
    type = db.Column(db.String(50)) # timetable, alert, etc.
    is_read = db.Column(db.Boolean, default=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    
    student = db.relationship('Student', backref='notifications')

class Appointment(db.Model):
    __tablename__ = 'appointments'
    
    id = db.Column(db.Integer, primary_key=True)
    student_id = db.Column(db.String(20), db.ForeignKey('students.admission_number'), nullable=False)
    mentor_id = db.Column(db.Integer, db.ForeignKey('faculty.id'), nullable=False)
    preferred_date = db.Column(db.Date, nullable=False)
    preferred_time = db.Column(db.Time, nullable=False)
    mode = db.Column(db.String(20)) # online/offline
    status = db.Column(db.String(20), default='pending') # pending, approved, rejected, rescheduled
    meeting_link = db.Column(db.String(255))
    notes = db.Column(db.Text)
    reschedule_date = db.Column(db.Date)
    reschedule_time = db.Column(db.Time)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

class StudentMark(db.Model):
    __tablename__ = 'student_marks'
    
    id = db.Column(db.Integer, primary_key=True)
    student_id = db.Column(db.String(20), db.ForeignKey('students.admission_number'), nullable=False)
    subject_code = db.Column(db.String(50))
    exam_type = db.Column(db.String(50))
    internal1 = db.Column(db.Float)
    internal2 = db.Column(db.Float)
    internal3 = db.Column(db.Float)
    university_mark = db.Column(db.Float)
    semester = db.Column(db.Integer)
    is_verified = db.Column(db.Boolean, default=False)

class SubjectHandlerMark(db.Model):
    __tablename__ = 'subject_handler_marks'

    id = db.Column(db.Integer, primary_key=True)
    student_id = db.Column(db.String(20), db.ForeignKey('students.admission_number'), nullable=False)
    subject_code = db.Column(db.String(50), nullable=False)
    exam_type = db.Column(db.String(30), nullable=False)  # Quiz / Assignment / MidSem
    marks_obtained = db.Column(db.Float, nullable=False)
    max_marks = db.Column(db.Float, nullable=False)
    subject_handler_id = db.Column(db.Integer, db.ForeignKey('faculty.id'), nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    student = db.relationship('Student', foreign_keys=[student_id])
    handler = db.relationship('Faculty', foreign_keys=[subject_handler_id])

    __table_args__ = (
        db.UniqueConstraint('student_id', 'subject_code', 'exam_type', name='uq_handler_mark_student_subject_exam'),
    )

class SubjectHandlerAttendance(db.Model):
    __tablename__ = 'subject_handler_attendance'

    id = db.Column(db.Integer, primary_key=True)
    student_id = db.Column(db.String(20), db.ForeignKey('students.admission_number'), nullable=False)
    subject_code = db.Column(db.String(50), nullable=False)
    date = db.Column(db.Date, nullable=False)
    status = db.Column(db.String(10), nullable=False)  # Present / Absent / Late
    subject_handler_id = db.Column(db.Integer, db.ForeignKey('faculty.id'), nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    student = db.relationship('Student', foreign_keys=[student_id])
    handler = db.relationship('Faculty', foreign_keys=[subject_handler_id])

    __table_args__ = (
        db.UniqueConstraint('student_id', 'subject_code', 'date', name='uq_handler_attendance_student_subject_date'),
    )

class SubjectAcademicEntry(db.Model):
    __tablename__ = 'subject_academic_entries'

    id = db.Column(db.Integer, primary_key=True)
    student_id = db.Column(db.String(20), db.ForeignKey('students.admission_number'), nullable=False)
    subject_code = db.Column(db.String(50), nullable=False)
    internal_assessment_score = db.Column(db.Float)
    assignment_submitted = db.Column(db.Boolean, default=False)
    practical_lab_score = db.Column(db.Float)
    subject_handler_id = db.Column(db.Integer, db.ForeignKey('faculty.id'), nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    student = db.relationship('Student', foreign_keys=[student_id])
    handler = db.relationship('Faculty', foreign_keys=[subject_handler_id])

    __table_args__ = (
        db.UniqueConstraint('student_id', 'subject_code', name='uq_handler_academic_student_subject'),
    )

class SubjectDataAuditLog(db.Model):
    __tablename__ = 'subject_data_audit_logs'

    id = db.Column(db.Integer, primary_key=True)
    subject_handler_id = db.Column(db.Integer, db.ForeignKey('faculty.id'), nullable=False)
    subject_code = db.Column(db.String(50), nullable=False)
    action = db.Column(db.String(60), nullable=False)
    entity = db.Column(db.String(60), nullable=False)
    student_id = db.Column(db.String(20))
    details = db.Column(db.Text)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    handler = db.relationship('Faculty', foreign_keys=[subject_handler_id])

class SubjectAnalysisLog(db.Model):
    __tablename__ = 'subject_analysis_logs'

    id = db.Column(db.Integer, primary_key=True)
    subject_code = db.Column(db.String(50), nullable=False)
    endpoint = db.Column(db.String(100), nullable=False)  # ai_ingest / risk_predict
    payload = db.Column(db.Text, nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

class Issue(db.Model):
    __tablename__ = 'issues'
    
    id = db.Column(db.Integer, primary_key=True)
    student_id = db.Column(db.String(20), db.ForeignKey('students.admission_number'), nullable=False)
    mentor_id = db.Column(db.Integer, db.ForeignKey('faculty.id'))
    category = db.Column(db.String(50))
    subject = db.Column(db.String(150))
    description = db.Column(db.Text)
    status = db.Column(db.String(20), default='open') # open, closed, escalated
    resolution_notes = db.Column(db.Text)
    raised_at = db.Column(db.DateTime, default=datetime.utcnow)
    resolved_at = db.Column(db.DateTime)
    rating = db.Column(db.Integer)

class Certificate(db.Model):
    __tablename__ = 'certificates'
    
    id = db.Column(db.Integer, primary_key=True)
    student_id = db.Column(db.String(20), db.ForeignKey('students.admission_number'), nullable=False)
    title = db.Column(db.String(150))
    issuing_org = db.Column(db.String(150))
    issue_date = db.Column(db.Date)
    expiry_date = db.Column(db.Date)
    activity_name = db.Column(db.String(150))
    category = db.Column(db.String(50))
    date_of_event = db.Column(db.Date)
    file_path = db.Column(db.String(255))
    share_with_mentor = db.Column(db.Boolean, default=False)
    uploaded_at = db.Column(db.DateTime, default=datetime.utcnow)

class MentorMessage(db.Model):
    __tablename__ = 'mentor_messages'
    
    id = db.Column(db.Integer, primary_key=True)
    mentor_id = db.Column(db.Integer, db.ForeignKey('faculty.id'), nullable=False)
    student_id = db.Column(db.String(20), db.ForeignKey('students.admission_number'), nullable=False)
    message = db.Column(db.Text, nullable=False)
    sender_role = db.Column(db.String(20)) # mentor or student
    sent_at = db.Column(db.DateTime, default=datetime.utcnow)
    is_read = db.Column(db.Boolean, default=False)

class SubjectHandlerMessage(db.Model):
    __tablename__ = 'subject_handler_messages'

    id = db.Column(db.Integer, primary_key=True)
    student_id = db.Column(db.String(20), db.ForeignKey('students.admission_number'), nullable=False)
    handler_id = db.Column(db.Integer, db.ForeignKey('faculty.id'), nullable=False)
    subject = db.Column(db.String(150))
    category = db.Column(db.String(50), default='Academic')
    message = db.Column(db.Text, nullable=False)
    attachment_path = db.Column(db.String(255))
    sender_role = db.Column(db.String(20), nullable=False, default='student')  # student / handler
    status = db.Column(db.String(20), default='open')  # open / replied / closed
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    is_read = db.Column(db.Boolean, default=False)

    student = db.relationship('Student', foreign_keys=[student_id])
    handler = db.relationship('Faculty', foreign_keys=[handler_id])

class PlaygroundNote(db.Model):
    __tablename__ = 'playground_notes'

    id = db.Column(db.Integer, primary_key=True)
    subject_code = db.Column(db.String(50), nullable=False)
    title = db.Column(db.String(150), nullable=False)
    description = db.Column(db.Text)
    file_path = db.Column(db.String(255), nullable=False)
    scope = db.Column(db.String(20), default='class')  # class / student
    target_student_id = db.Column(db.String(20), db.ForeignKey('students.admission_number'))
    department = db.Column(db.String(50))
    batch = db.Column(db.String(20))
    uploaded_by_id = db.Column(db.Integer, db.ForeignKey('faculty.id'), nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    target_student = db.relationship('Student', foreign_keys=[target_student_id])
    uploader = db.relationship('Faculty', foreign_keys=[uploaded_by_id])

class MentorPrivateNote(db.Model):
    __tablename__ = 'mentor_private_notes'

    id = db.Column(db.Integer, primary_key=True)
    student_admission_number = db.Column(db.String(20), db.ForeignKey('students.admission_number'), nullable=False)
    mentor_id = db.Column(db.Integer, db.ForeignKey('faculty.id'), nullable=False)
    session_id = db.Column(db.Integer, db.ForeignKey('mentoring_sessions.id'), nullable=True)
    note_type = db.Column(db.String(20), default='private')  # private / session / abnormality
    content = db.Column(db.Text, nullable=False)
    visibility = db.Column(db.String(20), default='mentor_only')  # mentor_only / alumni_admin
    transferred_to_admin = db.Column(db.Boolean, default=False)
    transferred_at = db.Column(db.DateTime)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    student = db.relationship('Student', foreign_keys=[student_admission_number], backref='mentor_private_notes')
    mentor = db.relationship('Faculty', foreign_keys=[mentor_id], backref='private_notes')
    session = db.relationship('MentoringSession', foreign_keys=[session_id], backref='private_notes')


class UserScheduleSettings(db.Model):
    __tablename__ = 'user_schedule_settings'
    
    id = db.Column(db.Integer, primary_key=True)
    student_id = db.Column(db.String(20), db.ForeignKey('students.admission_number'), unique=True, nullable=False)
    
    # Personal Routine
    wake_time = db.Column(db.String(5), default='05:45')  # HH:MM format
    sleep_time = db.Column(db.String(5), default='23:00')
    leave_home_time = db.Column(db.String(5), default='08:15')
    arrive_home_time = db.Column(db.String(5), default='16:45')
    city = db.Column(db.String(100), default='Kochi')
    country = db.Column(db.String(50), default='India')
    religion = db.Column(db.String(20), default='None')  # Muslim/Hindu/Christian/None
    
    # Gym
    gym_enabled = db.Column(db.Boolean, default=False)
    gym_time_pref = db.Column(db.String(20), default='Evening')  # Morning/Evening
    gym_duration = db.Column(db.Integer, default=45)  # minutes: 30/45/60
    
    # Play/Recreation
    play_duration = db.Column(db.Integer, default=30)  # minutes
    
    # ECA (Extra-Curricular Activities)
    eca_details = db.Column(db.JSON, default=[])  
    # Format: [{"name": "Music", "days": ["Mon", "Wed"], "duration": 60}]
    
    # Study Preferences
    study_block_length = db.Column(db.Integer, default=45)  # 25/45/60 minutes
    break_duration = db.Column(db.Integer, default=10)  # 5/10/15 minutes
    priority_subjects = db.Column(db.JSON, default=[])  # ["Mathematics", "Physics"]
    
    # Optimization
    auto_optimize = db.Column(db.Boolean, default=True)
    
    # College hours (default 9 AM - 4 PM)
    college_start_time = db.Column(db.String(5), default='09:00')
    college_end_time = db.Column(db.String(5), default='16:00')
    
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    student = db.relationship('Student', backref='schedule_settings')


class DailySchedule(db.Model):
    __tablename__ = 'daily_schedule'
    
    id = db.Column(db.Integer, primary_key=True)
    student_id = db.Column(db.String(20), db.ForeignKey('students.admission_number'), nullable=False)
    date = db.Column(db.Date, nullable=False)
    day_type = db.Column(db.String(10), nullable=False)  # 'weekday' or 'weekend'
    slots = db.Column(db.JSON, nullable=False)  # Array of slot objects
    generated_at = db.Column(db.DateTime, default=datetime.utcnow)
    is_optimized = db.Column(db.Boolean, default=True)
    
    __table_args__ = (
        db.UniqueConstraint('student_id', 'date', name='unique_student_date_schedule'),
    )
    
    student = db.relationship('Student', backref='daily_schedules')


class CustomTimetable(db.Model):
    __tablename__ = 'custom_timetables'
    
    id = db.Column(db.Integer, primary_key=True)
    student_id = db.Column(db.String(20), db.ForeignKey('students.admission_number'), nullable=False)
    day_of_week = db.Column(db.String(10), nullable=False)  # Monday, Tuesday, etc.
    period_number = db.Column(db.Integer, nullable=False)
    subject_name = db.Column(db.String(100), nullable=False)
    start_time = db.Column(db.String(5))  # Optional: "09:00"
    end_time = db.Column(db.String(5))    # Optional: "10:00"
    
    __table_args__ = (
        db.UniqueConstraint('student_id', 'day_of_week', 'period_number', name='unique_custom_period'),
    )
    
    student = db.relationship('Student', backref='custom_timetables')


class RoutinePrefs(db.Model):
    __tablename__ = 'routine_prefs'
    
    id = db.Column(db.Integer, primary_key=True)
    student_id = db.Column(db.String(20), db.ForeignKey('students.admission_number'), unique=True, nullable=False)
    
    wakeup_time = db.Column(db.String(10), default='06:00')
    prayer_time = db.Column(db.String(10), default='06:30')
    breakfast_time = db.Column(db.String(10), default='07:30')
    college_start = db.Column(db.String(10), default='08:45')
    college_end = db.Column(db.String(10), default='16:00')
    refresh_time = db.Column(db.String(10), default='16:30')
    play_time = db.Column(db.String(10), default='17:00')
    food_time = db.Column(db.String(10), default='20:00')
    bed_time = db.Column(db.String(10), default='22:30')
    
    student = db.relationship('Student', backref='routine_prefs')


class RemedialClass(db.Model):
    """Remedial classes scheduled by subject handlers for struggling students."""
    __tablename__ = 'remedial_classes'
    
    id = db.Column(db.Integer, primary_key=True)
    student_id = db.Column(db.String(20), db.ForeignKey('students.admission_number'), nullable=False)
    subject_code = db.Column(db.String(50), nullable=False)
    handler_id = db.Column(db.Integer, db.ForeignKey('faculty.id'), nullable=False)
    mentor_id = db.Column(db.Integer, db.ForeignKey('faculty.id'), nullable=True)
    
    # Class details
    title = db.Column(db.String(150), nullable=False)
    description = db.Column(db.Text)
    scheduled_date = db.Column(db.Date, nullable=False)
    time_slot = db.Column(db.String(20), nullable=False)  # e.g., "15:00-16:00"
    duration_minutes = db.Column(db.Integer, default=60)
    mode = db.Column(db.String(20), default='online')  # online/offline
    meeting_link = db.Column(db.String(500))  # GMeet link or location
    
    # Status tracking
    status = db.Column(db.String(20), default='scheduled')  # scheduled/completed/cancelled
    reason = db.Column(db.Text)  # AI-generated reason for remedial
    
    # Tracking
    attended = db.Column(db.Boolean, default=False)
    feedback = db.Column(db.Text)
    
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    student = db.relationship('Student', foreign_keys=[student_id])
    handler = db.relationship('Faculty', foreign_keys=[handler_id])
    mentor = db.relationship('Faculty', foreign_keys=[mentor_id])


class AIPerformanceReport(db.Model):
    """AI-generated performance analysis reports."""
    __tablename__ = 'ai_performance_reports'
    
    id = db.Column(db.Integer, primary_key=True)
    student_id = db.Column(db.String(20), db.ForeignKey('students.admission_number'), nullable=False)
    subject_code = db.Column(db.String(50), nullable=True)  # NULL for overall report
    handler_id = db.Column(db.Integer, db.ForeignKey('faculty.id'), nullable=True)
    mentor_id = db.Column(db.Integer, db.ForeignKey('faculty.id'), nullable=True)
    
    # Report type
    report_type = db.Column(db.String(30), nullable=False)  # individual/subject/mentees_summary
    
    # AI-generated content
    analysis_data = db.Column(db.JSON, nullable=False)  # Structured analysis data
    ai_insights = db.Column(db.Text, nullable=False)  # Human-readable insights
    recommendations = db.Column(db.Text)  # Actionable recommendations
    risk_assessment = db.Column(db.String(20))  # low/medium/high
    performance_trend = db.Column(db.String(20))  # improving/stable/declining
    
    # Metadata
    generated_by = db.Column(db.String(30), default='groq_ai')  # groq_ai/rule_based
    generated_at = db.Column(db.DateTime, default=datetime.utcnow)
    expires_at = db.Column(db.DateTime)  # Reports expire after 7 days
    
    student = db.relationship('Student', foreign_keys=[student_id])
    handler = db.relationship('Faculty', foreign_keys=[handler_id])
    mentor = db.relationship('Faculty', foreign_keys=[mentor_id])


class RemedialNotification(db.Model):
    """Notifications for remedial class scheduling and updates."""
    __tablename__ = 'remedial_notifications'
    
    id = db.Column(db.Integer, primary_key=True)
    remedial_class_id = db.Column(db.Integer, db.ForeignKey('remedial_classes.id'), nullable=False)
    student_id = db.Column(db.String(20), db.ForeignKey('students.admission_number'), nullable=False)
    handler_id = db.Column(db.Integer, db.ForeignKey('faculty.id'), nullable=False)
    mentor_id = db.Column(db.Integer, db.ForeignKey('faculty.id'), nullable=True)
    
    notification_type = db.Column(db.String(30), nullable=False)  # scheduled/reminder/completed/cancelled
    message = db.Column(db.Text, nullable=False)
    is_read = db.Column(db.Boolean, default=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    
    remedial_class = db.relationship('RemedialClass', foreign_keys=[remedial_class_id])
    student = db.relationship('Student', foreign_keys=[student_id])
    handler = db.relationship('Faculty', foreign_keys=[handler_id])
    mentor = db.relationship('Faculty', foreign_keys=[mentor_id])

