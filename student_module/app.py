import os
import re
from flask import Flask, render_template, request, redirect, url_for, flash, session, jsonify
from flask_mail import Mail
from flask_bcrypt import Bcrypt
from dotenv import load_dotenv
from models import db, Student, Faculty, Timetable, LoginCredential, Parent, Guardian, Academic, OtherInfo, WorkExperience, Note, Course, Semester, Subject, SubjectAllocation, InternalMark, UniversityMark, Attendance, MentoringSession, MentorLeave, LeaveRequest, Activity, DailyAttendance, StudentAttendance, Alert, WeeklyStudyPlan, StudyPlanSubject, StudySessionLog, StudentWellnessPreference, WorkoutSessionLog, MentorIntervention, InterventionOutcome, Batch, AlumniStudent, AlumniMentorHistory, Notification
from analytics.engine import run_full_analysis
from utils import send_otp_email, generate_otp, get_department_from_admission, normalize_dept_name
from datetime import datetime
from functools import wraps
from sqlalchemy import inspect, text, func

from flask_cors import CORS
from sqlalchemy import event

def get_current_semester(start_year, duration_years):
    """
    Calculate the current semester based on start year and course duration.
    Assumes 2 semesters per year (Spring/Fall or odd/even).
    """
    current_year = datetime.now().year
    current_month = datetime.now().month
    
    # Calculate years since start
    years_since_start = current_year - start_year
    
    # Determine semester within the current academic year
    # Typically semester 1 runs Jan-June, semester 2 runs July-Dec
    if current_month <= 6:
        # First half of year (Jan-Jun) is semester 1 of the current academic year
        semester_in_year = 1
    else:
        # Second half of year (Jul-Dec) is semester 2 of the current academic year
        semester_in_year = 2
    
    # Calculate total semester number
    if years_since_start < 0:
        # Future start date, return 1 as default
        return 1
    elif years_since_start == 0:
        # First year, return the semester in the first year
        return semester_in_year
    else:
        # Calculate based on complete years plus current semester
        completed_semesters = years_since_start * 2
        current_semester = completed_semesters + semester_in_year
        
        # Ensure it doesn't exceed the total semesters for the course
        total_semesters = duration_years * 2
        return min(current_semester, total_semesters)

load_dotenv()

app = Flask(__name__)
CORS(app, resources={r"/*": {"origins": "*"}})
app.secret_key = os.getenv('SECRET_KEY', 'default_secret_key')

# Database Configuration
app.config['SQLALCHEMY_DATABASE_URI'] = os.getenv('DATABASE_URL', 'mysql+pymysql://root:password@localhost/mentorai')
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False

# Mail Configuration
app.config['MAIL_SERVER'] = 'smtp.gmail.com'
app.config['MAIL_PORT'] = 587
app.config['MAIL_USE_TLS'] = True
app.config['MAIL_USERNAME'] = os.getenv('MAIL_USERNAME')
app.config['MAIL_PASSWORD'] = os.getenv('MAIL_PASSWORD')

from datetime import timedelta

mail = Mail(app)
bcrypt = Bcrypt(app)
db.init_app(app)

# Session config
app.config['PERMANENT_SESSION_LIFETIME'] = timedelta(minutes=30)
app.config['SESSION_COOKIE_SAMESITE']    = 'Lax'
app.config['MAX_CONTENT_LENGTH']         = 10 * 1024 * 1024  # 10MB upload limit

with app.app_context():
    if 'sqlite' in str(db.engine.url):
        with db.engine.connect() as conn:
            conn.execute(text("PRAGMA foreign_keys=ON"))
    db.create_all()
    # Migrations: Add missing schema manually to avoid operational errors
    inspector = inspect(db.engine)
    
    # Students table migration
    try:
        if 'students' in inspector.get_table_names():
            columns = [c['name'] for c in inspector.get_columns('students')]
            
            if 'password_hash' not in columns:
                print("Migrating: Adding password_hash to students table...")
                with db.engine.connect() as conn:
                    conn.execute(text("ALTER TABLE students ADD COLUMN password_hash VARCHAR(255)"))
                    conn.commit()
            
            if 'mentor_id' not in columns:
                print("Migrating: Adding mentor_id to students table...")
                with db.engine.connect() as conn:
                    if 'sqlite' in str(db.engine.url):
                        conn.execute(text("ALTER TABLE students ADD COLUMN mentor_id INTEGER REFERENCES faculty(id)"))
                    else:
                        conn.execute(text("ALTER TABLE students ADD COLUMN mentor_id INT"))
                        conn.execute(text("ALTER TABLE students ADD CONSTRAINT fk_student_mentor FOREIGN KEY (mentor_id) REFERENCES faculty(id)"))
                    conn.commit()
            
            if 'status' not in columns:
                print("Migrating: Adding status to students table...")
                with db.engine.connect() as conn:
                    conn.execute(text("ALTER TABLE students ADD COLUMN status VARCHAR(20) DEFAULT 'Live'"))
                    conn.commit()
    except Exception as e:
        print(f"Migration check failed for students: {e}")
                    
    # Faculty table migration
    try:
        if 'faculty' in inspector.get_table_names():
            f_cols = [c['name'] for c in inspector.get_columns('faculty')]
            with db.engine.connect() as conn:
                f_added = False
                if 'is_mentor_eligible' not in f_cols:
                    print("Migrating: Adding is_mentor_eligible to faculty table...")
                    if 'sqlite' in str(db.engine.url):
                        conn.execute(text("ALTER TABLE faculty ADD COLUMN is_mentor_eligible BOOLEAN DEFAULT 1"))
                    else:
                        conn.execute(text("ALTER TABLE faculty ADD COLUMN is_mentor_eligible BOOLEAN DEFAULT TRUE"))
                    f_added = True
                
                if 'email' not in f_cols:
                    print("Migrating: Adding email to faculty table...")
                    conn.execute(text("ALTER TABLE faculty ADD COLUMN email VARCHAR(100)"))
                    f_added = True
                    
                if 'is_hod' not in f_cols:
                    print("Migrating: Adding is_hod to faculty table...")
                    if 'sqlite' in str(db.engine.url):
                        conn.execute(text("ALTER TABLE faculty ADD COLUMN is_hod BOOLEAN DEFAULT 0"))
                    else:
                        conn.execute(text("ALTER TABLE faculty ADD COLUMN is_hod BOOLEAN DEFAULT FALSE"))
                    f_added = True
                
                if 'is_subject_handler' not in f_cols:
                    print("Migrating: Adding is_subject_handler to faculty table...")
                    if 'sqlite' in str(db.engine.url):
                        conn.execute(text("ALTER TABLE faculty ADD COLUMN is_subject_handler BOOLEAN DEFAULT 0"))
                    else:
                        conn.execute(text("ALTER TABLE faculty ADD COLUMN is_subject_handler BOOLEAN DEFAULT FALSE"))
                    f_added = True
                
                if f_added:
                    conn.commit()
    except Exception as e:
        print(f"Migration check failed for faculty: {e}")
                    
    # Mentor interventions migration
    try:
        if 'mentor_interventions' in inspector.get_table_names():
            mi_cols = [c['name'] for c in inspector.get_columns('mentor_interventions')]
            with db.engine.connect() as conn:
                mi_added = False
                if 'escalated' not in mi_cols:
                    if 'sqlite' in str(db.engine.url):
                        conn.execute(text("ALTER TABLE mentor_interventions ADD COLUMN escalated BOOLEAN DEFAULT 0"))
                    else:
                        conn.execute(text("ALTER TABLE mentor_interventions ADD COLUMN escalated BOOLEAN DEFAULT FALSE"))
                    conn.execute(text("ALTER TABLE mentor_interventions ADD COLUMN escalated_at DATETIME"))
                    mi_added = True
                    
                if mi_added:
                    conn.commit()
    except Exception as e:
        print(f"Migration check failed for mentor_interventions: {e}")
                    
    # Timetables table migration
    try:
        if 'timetables' in inspector.get_table_names():
            t_cols = [c['name'] for c in inspector.get_columns('timetables')]
            with db.engine.connect() as conn:
                added = False
                if 'file_path' not in t_cols:
                    print("Migrating: Adding file_path to timetables table...")
                    conn.execute(text("ALTER TABLE timetables ADD COLUMN file_path VARCHAR(255)"))
                    conn.execute(text("ALTER TABLE timetables ADD COLUMN course_id INTEGER"))
                    conn.execute(text("ALTER TABLE timetables ADD COLUMN batch_id INTEGER"))
                    conn.execute(text("ALTER TABLE timetables ADD COLUMN semester INTEGER"))
                    conn.execute(text("ALTER TABLE timetables ADD COLUMN academic_year VARCHAR(20)"))
                    conn.execute(text("ALTER TABLE timetables ADD COLUMN uploaded_at DATETIME"))
                    conn.execute(text("ALTER TABLE timetables ADD COLUMN uploaded_by INTEGER"))
                    added = True
                if added:
                    conn.commit()
    except Exception as e:
        print(f"Migration check failed for timetables: {e}")

    # Attendance table migration
    try:
        if 'attendance' in inspector.get_table_names():
            att_cols = [c['name'] for c in inspector.get_columns('attendance')]
            if 'subject_code' not in att_cols:
                with db.engine.connect() as conn:
                    print("Migrating: Adding subject_code to attendance table...")
                    conn.execute(text("ALTER TABLE attendance ADD COLUMN subject_code VARCHAR(50)"))
                    conn.commit()
    except Exception as e:
        print(f"Migration check failed for attendance: {e}")

    # Mentoring sessions migration
    try:
        if 'mentoring_sessions' in inspector.get_table_names():
            ms_cols = [c['name'] for c in inspector.get_columns('mentoring_sessions')]
            with db.engine.connect() as conn:
                ms_added = False
                if 'slot_type' not in ms_cols:
                    print("Migrating: Adding slot_type to mentoring_sessions...")
                    conn.execute(text("ALTER TABLE mentoring_sessions ADD COLUMN slot_type VARCHAR(20) DEFAULT 'system'"))
                    ms_added = True
                if 'calendar_event_id' not in ms_cols:
                    print("Migrating: Adding calendar_event_id to mentoring_sessions...")
                    conn.execute(text("ALTER TABLE mentoring_sessions ADD COLUMN calendar_event_id VARCHAR(255)"))
                    ms_added = True
                if 'calendar_link' not in ms_cols:
                    print("Migrating: Adding calendar_link to mentoring_sessions...")
                    conn.execute(text("ALTER TABLE mentoring_sessions ADD COLUMN calendar_link VARCHAR(512)"))
                    ms_added = True
                if 'updated_at' not in ms_cols:
                    print("Migrating: Adding updated_at to mentoring_sessions...")
                    conn.execute(text("ALTER TABLE mentoring_sessions ADD COLUMN updated_at DATETIME"))
                    ms_added = True
                if 'created_at' not in ms_cols:
                    print("Migrating: Adding created_at to mentoring_sessions...")
                    conn.execute(text("ALTER TABLE mentoring_sessions ADD COLUMN created_at DATETIME"))
                    ms_added = True
                if ms_added:
                    conn.commit()
    except Exception as e:
        print(f"Migration check failed for mentoring_sessions: {e}")

    # Auto-promote any expired batches on startup
    try:
        from services.batch_service import promote_expired_batches_to_alumni
        result = promote_expired_batches_to_alumni()
        if result.get("expired_batches_found", 0) > 0:
            print(f"[STARTUP] Auto-promoted expired batches: {result}")
    except Exception as e:
        print(f"[STARTUP ERROR] Batch promotion failed: {e}")

    # Seed Admin User
    if not Faculty.query.filter_by(username='admin').first():
        pw_hash = bcrypt.generate_password_hash('admin123').decode('utf-8')
        admin = Faculty(
            username='admin',
            password_hash=pw_hash,
            name='Administrator',
            designation='Admin',
            department='All',
            status='Live'
        )
        db.session.add(admin)
        db.session.commit()
        print("Admin user created: admin/admin123")

# ============= VALIDATION FUNCTIONS =============

def validate_name(name):
    """Validate name: only alphabets and spaces"""
    pattern = r'^[A-Za-z\s]+$'
    return bool(re.match(pattern, name))

def validate_email(email):
    """Validate email: basic pattern check"""
    pattern = r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$'
    return bool(re.match(pattern, email))

def validate_mobile(mobile):
    """Validate mobile: exactly 10 digits"""
    pattern = r'^\d{10}$'
    return bool(re.match(pattern, mobile))

def validate_password(password):
    """Validate password: minimum 6 characters"""
    return len(password) >= 6

# ============= SESSION DECORATOR =============

def login_required(f):
    """Decorator to protect routes that require login"""
    @wraps(f)
    def decorated_function(*args, **kwargs):
        if 'user_id' not in session:
            flash('Please login to access this page.', 'error')
            return redirect(url_for('login'))
        return f(*args, **kwargs)
    return decorated_function

# ============= ROUTES =============

@app.route('/')
def index():
    return render_template('home.html')

@app.route('/register', methods=['GET', 'POST'])
def register():
    if request.method == 'POST':
        try:
            # Basic Info Only
            admission_number = request.form['admission_number'].strip().upper()
            full_name = request.form['full_name'].strip()
            email = request.form['email'].strip().lower()
            password = request.form['password']
            confirm_password = request.form.get('confirm_password', '')
            branch = request.form.get('branch', '').strip()
            
            # Validation
            if not admission_number or not full_name or not email or not password:
                flash('All required fields must be filled!', 'error')
                return redirect(url_for('register'))
            
            # Validate name
            if not validate_name(full_name):
                flash('Full Name must contain only alphabets and spaces!', 'error')
                return redirect(url_for('register'))
            
            # Validate password
            if not validate_password(password):
                flash('Password must be at least 6 characters long!', 'error')
                return redirect(url_for('register'))
            
            # Check password match
            if password != confirm_password:
                flash('Password and Confirm Password do not match!', 'error')
                return redirect(url_for('register'))
            
            # Validate email
            if not validate_email(email):
                flash('Only Gmail addresses (@gmail.com) are allowed!', 'error')
                return redirect(url_for('register'))
            
            # Check if student exists in bulk records
            student = Student.query.get(admission_number)
            if not student:
                flash('Registration Failed. Your admission number was not found in the system. Please contact the administrator.', 'error')
                return redirect(url_for('register'))
                
            # Check if already registered
            if LoginCredential.query.filter_by(admission_number=admission_number).first():
                flash('This student is already registered. Please log in instead if you have a password.', 'error')
                return redirect(url_for('register'))
                
            # Validate details (case-insensitive and trimmed)
            db_name = student.full_name.strip().lower()
            db_email = student.email.strip().lower() if student.email else ""
            
            if db_name != full_name.lower() or db_email != email.lower():
                flash('Registration Failed. The provided name or email does not match our records. Please enter the exact details submitted during admission.', 'error')
                return redirect(url_for('register'))

            # All checks passed, create Credentials with bcrypt
            hashed_pw = bcrypt.generate_password_hash(password).decode('utf-8')
            new_cred = LoginCredential(admission_number=admission_number, password_hash=hashed_pw)
            
            # Save to database
            db.session.add(new_cred)
            db.session.commit()
            
            flash('Registration Successful. Your details have been verified with the institution records. Your account has been created successfully. You can now log in.', 'success')
            return redirect(url_for('login'))
            
        except Exception as e:
            db.session.rollback()
            flash(f'Error: {str(e)}', 'error')
            
    return render_template('register.html')

@app.route('/login', methods=['GET', 'POST'])
def login():
    # Prevent caching of login page
    if request.method == 'POST':
        admission_number = request.form['admission_number'].strip().upper()
        password = request.form['password']
        
        cred = LoginCredential.query.get(admission_number)
        
        if cred and bcrypt.check_password_hash(cred.password_hash, password):
            session.clear()  # Clear any existing session
            session['user_id'] = admission_number
            session.permanent = False  # Session expires when browser closes
            
            # Fetch student profile
            student = Student.query.get(admission_number)
            flash(f'Welcome back, {student.full_name}!', 'success')
            
            # Check if profile is complete
            if not student.profile_completed:
                flash('Please complete your profile to continue.', 'info')
                return redirect(url_for('complete_profile'))
            
            return redirect(url_for('dashboard'))
        else:
            flash('Invalid Admission Number or Password!', 'error')
            
    response = render_template('login.html')
    # Prevent browser caching
    response = app.make_response(response)
    response.headers['Cache-Control'] = 'no-cache, no-store, must-revalidate'
    response.headers['Pragma'] = 'no-cache'
    response.headers['Expires'] = '0'
    return response

@app.route('/logout')
def logout():
    session.clear()  # Destroy all session data
    flash('You have been logged out successfully.', 'info')
    response = redirect(url_for('login'))
    # Prevent browser caching
    response.headers['Cache-Control'] = 'no-cache, no-store, must-revalidate'
    response.headers['Pragma'] = 'no-cache'
    response.headers['Expires'] = '0'
    return response

@app.route('/forgot_password', methods=['GET', 'POST'])
def forgot_password():
    if request.method == 'POST':
        email = request.form['email'].strip().lower()
        student = Student.query.filter_by(email=email).first()
        
        if student:
            otp = generate_otp()
            session['reset_otp'] = otp
            session['reset_email'] = email
            if send_otp_email(mail, email, otp):
                flash('OTP sent to your email.', 'info')
                return redirect(url_for('verify_otp'))
            else:
                flash('Failed to send email. Check configuration.', 'error')
        else:
            flash('Email not found!', 'error')
            
    return render_template('forgot_password.html')

@app.route('/verify_otp', methods=['GET', 'POST'])
def verify_otp():
    if 'reset_email' not in session:
        return redirect(url_for('forgot_password'))
        
    if request.method == 'POST':
        entered_otp = request.form['otp']
        if entered_otp == session.get('reset_otp'):
            return redirect(url_for('reset_password'))
        else:
            flash('Invalid OTP!', 'error')
            
    return render_template('verify_otp.html')

@app.route('/reset_password', methods=['GET', 'POST'])
def reset_password():
    if 'reset_email' not in session:
        return redirect(url_for('forgot_password'))
        
    if request.method == 'POST':
        new_password = request.form['new_password']
        confirm_password = request.form.get('confirm_password', '')
        
        if not validate_password(new_password):
            flash('Password must be at least 6 characters long!', 'error')
            return redirect(url_for('reset_password'))
        
        if new_password != confirm_password:
            flash('Passwords do not match!', 'error')
            return redirect(url_for('reset_password'))
        
        email = session['reset_email']
        student = Student.query.filter_by(email=email).first()
        
        if student:
            cred = LoginCredential.query.get(student.admission_number)
            cred.password_hash = bcrypt.generate_password_hash(new_password).decode('utf-8')
            db.session.commit()
            
            session.pop('reset_otp', None)
            session.pop('reset_email', None)
            
            flash('Password reset successful! Login now.', 'success')
            return redirect(url_for('login'))
            
    return render_template('reset_password.html')

@app.route('/dashboard')
@login_required
def dashboard():
    student = Student.query.get(session['user_id'])
    
    # Calculate profile completion percentage
    mandatory_fields = [
        student.full_name,
        student.admission_number,
        student.email,
        student.mobile_number,
        student.permanent_address,
        getattr(student.parents, 'father_name', None) if student.parents else None,
        getattr(student.parents, 'mother_name', None) if student.parents else None,
        getattr(student.academics, 'school_10th', None) if student.academics else None,
        getattr(student.academics, 'school_12th', None) if student.academics else None
    ]
    
    total_mandatory = len(mandatory_fields)
    filled_mandatory = sum(1 for field in mandatory_fields if field)
    completion_pct = int((filled_mandatory / total_mandatory) * 100) if total_mandatory > 0 else 0
    
    response = render_template('dashboard.html', student=student, completion_pct=completion_pct)
    # Prevent browser caching
    response = app.make_response(response)
    response.headers['Cache-Control'] = 'no-cache, no-store, must-revalidate'
    response.headers['Pragma'] = 'no-cache'
    response.headers['Expires'] = '0'
    return response

@app.route('/complete_profile', methods=['GET', 'POST'])
@login_required
def complete_profile():
    student = Student.query.get(session['user_id'])
    
    if request.method == 'POST':
        try:
            # Personal Details
            student.roll_number = request.form.get('roll_number', '').strip()
            student.branch = request.form.get('branch', '').strip()
            
            # Normalize batch for MCA/IMCA
            raw_batch = request.form.get('batch', '').strip()
            if student.branch == 'Department of Computer Applications' or student.branch == 'MCA' or student.branch == 'IMCA':
                 # Normalize branch name just in case
                 student.branch = 'Department of Computer Applications'
                 
                 course_code = None
                 import re
                 match = re.search(r'(MCA|IMCA)', student.admission_number)
                 if match:
                    course_code = match.group(1)
                 
                 if course_code and raw_batch and not raw_batch.upper().startswith(course_code):
                      raw_batch = f"{course_code} {raw_batch}"
            
            student.batch = raw_batch
            
            dob_str = request.form.get('dob', '').strip()
            if dob_str:
                student.dob = datetime.strptime(dob_str, '%Y-%m-%d').date()
                
            student.age = int(request.form.get('age')) if request.form.get('age') else None
            student.blood_group = request.form.get('blood_group', '').strip()
            student.religion = request.form.get('religion', '').strip()
            student.caste_category = request.form.get('caste_category', '').strip()
            
            # Handle photo update
            if 'photo' in request.files:
                photo = request.files['photo']
                if photo and photo.filename:
                    import uuid
                    filename = f"{student.admission_number}_{uuid.uuid4().hex[:8]}{os.path.splitext(photo.filename)[1]}"
                    photo_dir = os.path.join(app.root_path, 'static', 'photos')
                    os.makedirs(photo_dir, exist_ok=True)
                    photo.save(os.path.join(photo_dir, filename))
                    student.photo_path = f"photos/{filename}"
            
            # Update Parents
            parent = Parent.query.filter_by(student_admission_number=student.admission_number).first()
            if not parent:
                parent = Parent(student_admission_number=student.admission_number)
            
            parent.father_name = request.form.get('father_name', '').strip()
            parent.father_profession = request.form.get('father_profession', '').strip()
            parent.father_age = int(request.form.get('father_age')) if request.form.get('father_age') else None
            parent.father_mobile = request.form.get('father_mobile', '').strip()
            parent.mother_name = request.form.get('mother_name', '').strip()
            parent.mother_profession = request.form.get('mother_profession', '').strip()
            parent.mother_age = int(request.form.get('mother_age')) if request.form.get('mother_age') else None
            parent.mother_mobile = request.form.get('mother_mobile', '').strip()
            
            # Update Academics
            acad = Academic.query.filter_by(student_admission_number=student.admission_number).first()
            if not acad:
                acad = Academic(student_admission_number=student.admission_number)
                
            acad.school_10th = request.form.get('school_10th', '').strip()
            acad.board_10th = request.form.get('board_10th', '').strip()
            acad.percentage_10th = float(request.form.get('percentage_10th')) if request.form.get('percentage_10th') else None
            
            acad.school_12th = request.form.get('school_12th', '').strip()
            acad.board_12th = request.form.get('board_12th', '').strip()
            acad.percentage_12th = float(request.form.get('percentage_12th')) if request.form.get('percentage_12th') else None
            
            acad.college_ug = request.form.get('college_ug', '').strip()
            acad.university_ug = request.form.get('university_ug', '').strip()
            acad.percentage_ug = float(request.form.get('percentage_ug')) if request.form.get('percentage_ug') else None
            
            acad.sgpa = float(request.form.get('sgpa')) if request.form.get('sgpa') else None
            acad.cgpa = float(request.form.get('cgpa')) if request.form.get('cgpa') else None
            
            # Update Other Info
            other = OtherInfo.query.filter_by(student_admission_number=student.admission_number).first()
            if not other:
                other = OtherInfo(student_admission_number=student.admission_number)
                
            other.siblings_details = request.form.get('siblings_details', '').strip()
            other.accommodation_type = request.form.get('accommodation_type', '').strip()
            other.transport_mode = request.form.get('transport_mode', '').strip()
            
            # Mark profile as completed
            student.profile_completed = True
            
            db.session.add(parent)
            db.session.add(acad)
            db.session.add(other)
            db.session.commit()
            
            flash('Profile updated successfully!', 'success')
            return redirect(url_for('dashboard'))
            
        except Exception as e:
            db.session.rollback()
            flash(f'An error occurred: {str(e)}', 'error')
            
    return render_template('complete_profile.html', student=student)


# ============= API ROUTES (for Node.js frontend) =============

@app.route('/api/register', methods=['POST'])
def api_register():
    """API endpoint for registration"""
    data = request.get_json()
    
    try:
        admission_number = data.get('admission_number', '').strip().upper()
        full_name = data.get('full_name', '').strip()
        email = data.get('email', '').strip().lower()
        password = data.get('password', '')
        
        # Check if student exists in bulk records
        student = Student.query.get(admission_number)
        if not student:
            return jsonify({
                'success': False, 
                'message': 'Registration Failed. Your admission number was not found in the system. Please contact the administrator.'
            }), 404
            
        # Check if already registered
        if LoginCredential.query.filter_by(admission_number=admission_number).first():
            return jsonify({
                'success': False, 
                'message': 'This student is already registered. Please log in instead if you have a password.'
            }), 400
            
        # Validate details (case-insensitive and trimmed)
        db_name = student.full_name.strip().lower()
        db_email = student.email.strip().lower() if student.email else ""
        
        if db_name != full_name.lower() or db_email != email.lower():
            return jsonify({
                'success': False, 
                'message': 'Registration Failed. The provided name or email does not match our records. Please enter the exact details submitted during admission.'
            }), 400
            
        # All checks passed, create credentials
        hashed_pw = bcrypt.generate_password_hash(password).decode('utf-8')
        new_cred = LoginCredential(admission_number=admission_number, password_hash=hashed_pw)
        
        # Optionally, mark as registered if needed implicitly
        # student.status = 'Registered' or profile_completed logic etc.
        
        db.session.add(new_cred)
        db.session.commit()
        
        return jsonify({
            'success': True,
            'message': 'Registration Successful. Your details have been verified with the institution records. Your account has been created successfully. You can now log in.',
            'data': {
                'admission_number': admission_number,
                'name': student.full_name,
                'department': student.branch
            }
        }), 201
        
    except Exception as e:
        db.session.rollback()
        app.logger.exception("Workout session log failed for %s", data.get('student_id') if 'data' in locals() else 'unknown')
        return jsonify({'success': False, 'message': 'Unable to log workout session right now'}), 500

@app.route('/api/login', methods=['POST'])
def api_login():
    """Unified API endpoint for Student and Faculty login"""
    data = request.get_json() or {}

    # Accept 'admission_number' (from old student login) OR generic 'username/identifier'
    raw_username = data.get('username', '').strip()
    raw_adm = data.get('admission_number', '').strip().upper()
    identifier_upper = raw_adm or raw_username.upper()
    password = data.get('password', '')

    if not (raw_adm or raw_username) or not password:
        return jsonify({'success': False, 'message': 'Username and password required'}), 400

    # 1. Try Student Login (admission number = upper-cased)
    cred = LoginCredential.query.get(identifier_upper)
    if cred and cred.password_hash and bcrypt.check_password_hash(cred.password_hash, password):
        student = Student.query.get(identifier_upper)
        return jsonify({
            'success': True,
            'message': 'Login successful',
            'data': {
                'role': 'student',
                'admission_number': student.admission_number,
                'name': student.full_name,
                'email': student.email,
                'department': student.branch,
                'batch': student.batch,
                'photo_path': student.photo_path,
                'profile_completed': student.profile_completed
            }
        }), 200

    # 2. Try Faculty/Admin Login
    # Try original-case username first (e.g. 'admin'), then uppercased
    user = Faculty.query.filter_by(username=raw_username).first()
    if not user and raw_adm:
        user = Faculty.query.filter_by(username=raw_adm).first()

    if user and user.password_hash and bcrypt.check_password_hash(user.password_hash, password):
        if user.status != 'Live':
            return jsonify({'success': False, 'message': 'Account is inactive'}), 403
        session['user_id'] = user.id
        session['user_role'] = user.designation
        session['user_dept'] = user.department
        return jsonify({
            'success': True,
            'message': 'Login successful',
            'data': {
                'role': user.designation.lower(),  # admin, hod, mentor, subject-handler etc.
                'id': user.id,
                'username': user.username,
                'name': user.name,
                'department': user.department
            }
        }), 200

    return jsonify({'success': False, 'message': 'Invalid credentials'}), 401

@app.route('/api/profile/<admission_number>', methods=['GET'])
def api_get_profile(admission_number):
    try:
        student = Student.query.get(admission_number)
        if not student:
            return jsonify({'success': False, 'message': 'Student not found'}), 404
        
        # Serialize Basic Info
        data = {
            'admission_number': student.admission_number,
            'full_name': student.full_name,
            'email': student.email,
            'department': student.branch,
            'photo_path': student.photo_path,
            'roll_number': student.roll_number,
            'dob': student.dob.isoformat() if student.dob else None,
            'mobile_number': student.mobile_number,
            'blood_group': student.blood_group,
            'religion': student.religion,
            'caste': student.caste_category, # Model has caste_category
            #'category': student.category, # Model has caste_category used above? Or separate? 
            # Model: caste_category. API used 'caste' and 'category'. I'll map caste_category to caste.
            #'community': student.community, # Not in model
            #'is_catholic': student.is_catholic, # Not in model, derived?
            'parish_name': student.parish, # Model: parish
            'diocese_name': student.diocese, # Model: diocese
            'permanent_address': student.permanent_address,
            'temporary_address': student.contact_address, # Model: contact_address
            'profile_completed': student.profile_completed,
            
            'parents': {},
            'guardian': {},
            'accommodation': {},
            'academics': {},
            'work_experience': [],
            'other_info': {}
        }

        wp = StudentWellnessPreference.query.filter_by(student_id=admission_number).first()
        data['wellness_preferences'] = {
            'wake_time': wp.wake_time if wp and wp.wake_time else "06:00",
            'sleep_time': wp.sleep_time if wp and wp.sleep_time else "22:30",
            'workout_duration_minutes': wp.workout_duration_minutes if wp and wp.workout_duration_minutes else 30,
            'fitness_goal': wp.fitness_goal if wp and wp.fitness_goal else "general_fitness",
            'intensity_level': wp.intensity_level if wp and wp.intensity_level else "moderate",
            'home_equipment': wp.home_equipment if wp and wp.home_equipment else "none",
            'health_constraints': wp.health_constraints if wp and wp.health_constraints else "",
            'preferred_workout_time': wp.preferred_workout_time if wp and wp.preferred_workout_time else "evening",
            'weekly_workout_target': wp.weekly_workout_target if wp and wp.weekly_workout_target else 4
        }
        
        # Serialize Nested Relationships
        if student.parents:
            p = student.parents
            data['parents'] = {
                'father_name': p.father_name,
                'father_occupation': p.father_profession, # Map profession -> occupation
                'father_mobile': p.father_mobile,
                'mother_name': p.mother_name,
                'mother_occupation': p.mother_profession, # Map profession -> occupation
                'mother_mobile': p.mother_mobile,
            }
            
        if student.guardian:
            g = student.guardian
            data['guardian'] = {
                'name': g.name,
                'mobile': g.mobile_number,
                'address': g.address
            }
            
        # Accommodation is in OtherInfo in schema
        if student.other_info:
            o = student.other_info
            
            # Accommodation Data
            data['accommodation'] = {
                'type': o.accommodation_type,
                #'room_number': o.room_number, # Not in model
                'stay_from': o.stay_from.isoformat() if o.stay_from else None,
                'stay_to': o.stay_to.isoformat() if o.stay_to else None,
                'hostel_name': o.hostel_name,
                'transport_mode': o.transport_mode,
                'vehicle_number': o.vehicle_number,
                'staying_with': o.staying_with
            }
            
            # Other Info Data
            data['other_info'] = {
                'siblings_details': o.siblings_details,
                #'achievements': o.achievements, # Not in OtherInfo model
                #'hobbies': o.hobbies # Not in OtherInfo model
            }
            
        if student.academics:
            a = student.academics
            data['academics'] = {
                'school_10th': a.school_10th,
                'board_10th': a.board_10th,
                'percentage_10th': a.percentage_10th,
                #'medium_10th': a.medium_of_instruction, # Use shared field?
                'school_12th': a.school_12th,
                'board_12th': a.board_12th,
                'percentage_12th': a.percentage_12th,
                #'medium_12th': a.medium_of_instruction, # Use shared field?
                'college_ug': a.college_ug,
                'university_ug': a.university_ug,
                'percentage_ug': a.percentage_ug,
                'entrance_rank': a.entrance_rank,
                'nature_of_admission': a.nature_of_admission
            }
        
        # Work Experience
        if student.work_experience:
            data['work_experience'] = [{
                'organization': w.organization,
                'job_title': w.job_title,
                'duration': w.duration
            } for w in student.work_experience]
        
        return jsonify({'success': True, 'data': data}), 200
        
    except Exception as e:
        print(f"Error fetching profile: {e}")
        return jsonify({'success': False, 'message': 'Internal Server Error'}), 500

@app.route('/api/complete_profile', methods=['POST'])
def api_complete_profile():
    try:
        data = {}
        # Handle multipart/form-data (for file upload) or JSON
        if request.content_type and 'multipart/form-data' in request.content_type:
            import json
            if 'data' in request.form:
                data = json.loads(request.form['data'])
        else:
            data = request.get_json() or {}

        admission_number = data.get('admission_number')
        
        if not admission_number:
            return jsonify({'success': False, 'message': 'Admission number required'}), 400
            
        student = Student.query.get(admission_number)
        if not student:
            return jsonify({'success': False, 'message': 'Student not found'}), 404

        # Handle Photo Upload
        if 'photo' in request.files:
            photo = request.files['photo']
            if photo and photo.filename:
                import uuid
                filename = f"{student.admission_number}_{uuid.uuid4().hex[:8]}{os.path.splitext(photo.filename)[1]}"
                photo_dir = os.path.join(app.root_path, 'static', 'photos')
                os.makedirs(photo_dir, exist_ok=True)
                photo.save(os.path.join(photo_dir, filename))
                student.photo_path = f"photos/{filename}"

        # Personal Details
        if data.get('full_name'):
            student.full_name = data.get('full_name')
        if data.get('email'):
            student.email = data.get('email')
        
        student.roll_number = data.get('roll_number')
        if data.get('dob'):
             student.dob = datetime.strptime(data.get('dob'), '%Y-%m-%d').date()
        student.age = data.get('age')
        student.blood_group = data.get('blood_group')
        student.religion = data.get('religion')
        student.diocese = data.get('diocese')
        student.parish = data.get('parish')
        student.caste_category = data.get('caste_category')
        student.permanent_address = data.get('permanent_address')
        student.contact_address = data.get('contact_address')
        student.mobile_number = data.get('mobile_number')
        
        # Parent Details
        parent = Parent.query.filter_by(student_admission_number=admission_number).first()
        if not parent:
            parent = Parent(student_admission_number=admission_number)
            
        parent_data = data.get('parents', {})
        parent.father_name = parent_data.get('father_name')
        parent.father_profession = parent_data.get('father_profession')
        parent.father_place_of_work = parent_data.get('father_place_of_work')
        parent.father_mobile = parent_data.get('father_mobile')
        parent.mother_name = parent_data.get('mother_name')
        parent.mother_profession = parent_data.get('mother_profession')
        parent.mother_place_of_work = parent_data.get('mother_place_of_work')
        parent.mother_mobile = parent_data.get('mother_mobile')
        
        db.session.add(parent)
        
        # Guardian Details
        guardian_data = data.get('guardian')
        if guardian_data:
            guardian = Guardian.query.filter_by(student_admission_number=admission_number).first()
            if not guardian:
                guardian = Guardian(student_admission_number=admission_number)
            guardian.name = guardian_data.get('name')
            guardian.address = guardian_data.get('address')
            guardian.mobile_number = guardian_data.get('mobile_number')
            db.session.add(guardian)

        # Academic Details
        acad = Academic.query.filter_by(student_admission_number=admission_number).first()
        if not acad:
            acad = Academic(student_admission_number=admission_number)
            
        acad_data = data.get('academics', {})
        acad.school_10th = acad_data.get('school_10th')
        acad.board_10th = acad_data.get('board_10th')
        acad.percentage_10th = acad_data.get('percentage_10th')
        acad.school_12th = acad_data.get('school_12th')
        acad.board_12th = acad_data.get('board_12th')
        acad.percentage_12th = acad_data.get('percentage_12th')
        acad.entrance_rank = acad_data.get('entrance_rank')
        acad.nature_of_admission = acad_data.get('nature_of_admission')
        acad.medium_of_instruction = acad_data.get('medium_of_instruction')
        
        if acad_data.get('college_ug'):
             acad.college_ug = acad_data.get('college_ug')
             acad.university_ug = acad_data.get('university_ug')
             acad.percentage_ug = acad_data.get('percentage_ug')
        
        db.session.add(acad)
        
        # Work Experience
        WorkExperience.query.filter_by(student_admission_number=admission_number).delete()
        for work in data.get('work_experience', []):
            new_work = WorkExperience(
                student_admission_number=admission_number,
                organization=work.get('organization'),
                job_title=work.get('job_title'),
                duration=work.get('duration')
            )
            db.session.add(new_work)

        # Other Info
        other = OtherInfo.query.filter_by(student_admission_number=admission_number).first()
        if not other:
            other = OtherInfo(student_admission_number=admission_number)
            
        other_data = data.get('other_info', {})
        other.accommodation_type = other_data.get('accommodation_type')
        other.staying_with = other_data.get('staying_with')
        other.hostel_name = other_data.get('hostel_name')
        if other_data.get('stay_from'):
             other.stay_from = datetime.strptime(other_data.get('stay_from'), '%Y-%m-%d').date()
        if other_data.get('stay_to'):
             other.stay_to = datetime.strptime(other_data.get('stay_to'), '%Y-%m-%d').date()
             
        other.transport_mode = other_data.get('transport_mode')
        other.vehicle_number = other_data.get('vehicle_number')
        
        db.session.add(other)

        # Wellness preferences
        wp_data = data.get('wellness_preferences', {})
        wp = StudentWellnessPreference.query.filter_by(student_id=admission_number).first()
        if not wp:
            wp = StudentWellnessPreference(student_id=admission_number)
        try:
            workout_duration = int(wp_data.get('workout_duration_minutes') or 30)
        except (TypeError, ValueError):
            workout_duration = 30
        try:
            workout_target = int(wp_data.get('weekly_workout_target') or 4)
        except (TypeError, ValueError):
            workout_target = 4
        wp.wake_time = wp_data.get('wake_time') or "06:00"
        wp.sleep_time = wp_data.get('sleep_time') or "22:30"
        wp.workout_duration_minutes = max(15, min(90, workout_duration))
        wp.fitness_goal = wp_data.get('fitness_goal') or "general_fitness"
        wp.intensity_level = wp_data.get('intensity_level') or "moderate"
        wp.home_equipment = wp_data.get('home_equipment') or "none"
        wp.health_constraints = wp_data.get('health_constraints') or ""
        wp.preferred_workout_time = wp_data.get('preferred_workout_time') or "evening"
        wp.weekly_workout_target = max(1, min(7, workout_target))
        db.session.add(wp)

        student.profile_completed = True
        db.session.commit()
        
        return jsonify({'success': True, 'message': 'Profile updated successfully'}), 200

    except Exception as e:
        db.session.rollback()
        return jsonify({'success': False, 'message': str(e)}), 500

# ============= ADMIN & FACULTY ROUTES =============

@app.route('/api/admin/login', methods=['POST'])
def api_admin_login():
    data = request.get_json() or {}
    username = data.get('username', '').strip()
    password = data.get('password', '')
    
    if not username or not password:
        return jsonify({'success': False, 'message': 'Username and password required'}), 400

    user = Faculty.query.filter_by(username=username).first()
    
    if user and bcrypt.check_password_hash(user.password_hash, password):
        if user.status != 'Live':
             return jsonify({'success': False, 'message': 'Account is inactive'}), 403
             
        return jsonify({
            'success': True,
            'message': 'Login successful',
            'data': {
                'id': user.id,
                'username': user.username,
                'name': user.name,
                'role': user.designation, # Admin, HOD, Mentor, Subject Handler
                'department': user.department
            }
        }), 200
    
    return jsonify({'success': False, 'message': 'Invalid credentials'}), 401

@app.route('/api/admin/teachers', methods=['GET'])
def api_get_teachers():
    try:
        # Fetch all faculty, ordered by Department then Designation
        teachers = Faculty.query.filter(Faculty.username != 'admin').all()
        
        data = []
        for t in teachers:
            data.append({
                'id': t.id,
                'name': t.name,
                'username': t.username,
                'designation': t.designation,
                'department': t.department,
                'status': t.status
            })
            
        return jsonify({'success': True, 'data': data}), 200

    except Exception:
        app.logger.exception("Workout compliance fetch failed for %s", student_id)
        return jsonify({'success': False, 'message': 'Unable to fetch workout compliance right now'}), 500

@app.route('/api/admin/faculty/<int:faculty_id>/status', methods=['PUT'])
def api_update_faculty_status(faculty_id):
    try:
        data = request.get_json()
        new_status = data.get('status')
        if not new_status:
             return jsonify({'success': False, 'message': 'Status is required'}), 400
             
        faculty = Faculty.query.get(faculty_id)
        if not faculty:
            return jsonify({'success': False, 'message': 'Faculty not found'}), 404
            
        faculty.status = new_status
        db.session.commit()
        
        return jsonify({'success': True, 'message': f'Status updated to {new_status}'}), 200
    except Exception as e:
        db.session.rollback()
        return jsonify({'success': False, 'message': str(e)}), 500

@app.route('/api/admin/faculty/<int:faculty_id>', methods=['DELETE'])
def api_delete_faculty(faculty_id):
    try:
        faculty = Faculty.query.get(faculty_id)
        if not faculty:
            return jsonify({'success': False, 'message': 'Faculty not found'}), 404
            
        db.session.delete(faculty)
        db.session.commit()
        
        return jsonify({'success': True, 'message': 'Faculty deleted successfully'}), 200
    except Exception as e:
        db.session.rollback()
        return jsonify({'success': False, 'message': str(e)}), 500

# ============= STUDENT ACCESS ROUTES =============

@app.route('/api/admin/students', methods=['GET'])
def api_get_students_list():
    try:
        # Only return students with 'Live' status (not 'Passed Out' or other statuses)
        students = Student.query.filter(Student.status != 'Passed Out').all()
        data = []
        for s in students:
            data.append({
                'admission_number': s.admission_number,
                'name': s.full_name,
                'department': s.branch,
                'batch': s.batch,
                'status': s.status,
                'mentor_id': s.mentor_id
            })
        return jsonify({'success': True, 'data': data}), 200
    except Exception:
        app.logger.exception("Combined plan generation failed for %s", admission_number)
        return jsonify({'success': False, 'message': 'Unable to generate combined plan right now'}), 500

@app.route('/api/admin/student/<string:admission_number>/status', methods=['PUT'])
def api_update_student_status(admission_number):
    try:
        data = request.get_json()
        new_status = data.get('status')
        if not new_status:
            return jsonify({'success': False, 'message': 'Status is required'}), 400
            
        student = Student.query.get(admission_number)
        if not student:
            return jsonify({'success': False, 'message': 'Student not found'}), 404
            
        student.status = new_status
        db.session.commit()
        return jsonify({'success': True, 'message': f'Status updated to {new_status}'}), 200
    except Exception as e:
        db.session.rollback()
        return jsonify({'success': False, 'message': str(e)}), 500

# ============= TIMETABLE ROUTES =============

@app.route('/api/admin/timetable/upload', methods=['POST'])
def api_upload_timetable():
    try:
        department = request.form.get('department')
        batch = request.form.get('batch')
        
        if 'file' not in request.files:
             return jsonify({'success': False, 'message': 'File is required'}), 400
             
        file = request.files['file']
        
        if not department or not batch or file.filename == '':
            return jsonify({'success': False, 'message': 'Department, Batch and File are required'}), 400
            
        # Delete existing timetable for this dept/batch to replace it
        if department and batch:
            Timetable.query.filter_by(department=department, batch=batch).delete()
            db.session.commit() # Commit deletion first
        
        import pandas as pd
        if file.filename.endswith('.csv'):
            df = pd.read_csv(file)
        else:
            df = pd.read_excel(file)
            
        # Expect columns: Day, Period, Subject
        # Optional: Handler/Faculty, Time
        df.columns = [c.lower().strip() for c in df.columns]
        
        count = 0
        for _, row in df.iterrows():
            day = row.get('day')
            period = row.get('period')
            subject = row.get('subject')
            
            if pd.isna(day) or pd.isna(period) or pd.isna(subject): continue
            
            handler_name = row.get('handler') or row.get('handler_name') or row.get('faculty')
            if pd.isna(handler_name): handler_name = None
            
            time_slot = row.get('time') or row.get('time_slot')
            if pd.isna(time_slot): time_slot = None

            # Try to link handler to Faculty (simple name match)
            handler_id = None
            if handler_name:
                faculty = Faculty.query.filter(Faculty.name.ilike(f"%{handler_name}%")).first()
                if faculty:
                    handler_id = faculty.id
            
            entry = Timetable(
                department=department,
                batch=batch,
                day=str(day),
                period=int(period) if str(period).isdigit() else 0,
                time_slot=str(time_slot) if time_slot else None,
                subject=str(subject),
                handler_name=str(handler_name) if handler_name else None,
                handler_id=handler_id
            )
            db.session.add(entry)
            
            # --- START PHASE 1 SUBJECT ALLOCATION LOGIC ---
            course = Course.query.filter_by(name=department).first()
            if not course:
                course = Course(name=department)
                db.session.add(course)
                db.session.flush()

            semester = Semester.query.filter_by(name=batch).first()
            if not semester:
                semester = Semester(name=batch)
                db.session.add(semester)
                db.session.flush()

            subject_obj = Subject.query.filter_by(name=str(subject), semester_id=semester.id).first()
            if not subject_obj:
                subject_obj = Subject(name=str(subject), course_id=course.id, semester_id=semester.id)
                db.session.add(subject_obj)
                db.session.flush()

            if handler_id:
                allocation = SubjectAllocation.query.filter_by(subject_id=subject_obj.id, faculty_id=handler_id).first()
                if not allocation:
                    allocation = SubjectAllocation(subject_id=subject_obj.id, faculty_id=handler_id)
                    db.session.add(allocation)
            # --- END PHASE 1 LOGIC ---
            
            count += 1
            
        db.session.commit()
        return jsonify({'success': True, 'message': f'Uploaded {count} timetable entries for {department} - {batch}'}), 200
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'success': False, 'message': str(e)}), 500

# ============= MARKS & EXAM ROUTES (PHASE 1) =============

def faculty_teaches_subject(faculty_id, subject_id):
    return SubjectAllocation.query.filter_by(faculty_id=faculty_id, subject_id=subject_id).first() is not None

def student_in_subject(student_id, subject_id):
    subject = Subject.query.get(subject_id)
    student = Student.query.get(student_id)
    if not subject or not student: return False
    course = Course.query.get(subject.course_id)
    semester = Semester.query.get(subject.semester_id)
    # Using branch -> course.name and batch -> semester.name matching logic 
    return student.branch == course.name and student.batch == semester.name

@app.route("/api/marks/upload-internal", methods=["POST"])
def api_upload_internal():
    try:
        data = request.json
        student_id = data.get("student_id")
        subject_id = data.get("subject_id")
        exam_type = data.get("exam_type")
        marks = data.get("marks")
        faculty_id = data.get("faculty_id")

        if not all([student_id, subject_id, exam_type, marks is not None, faculty_id]):
            return jsonify({'success': False, 'message': 'Missing data'}), 400

        if not faculty_teaches_subject(faculty_id, subject_id):
            return jsonify({'success': False, 'message': 'Forbidden: You do not teach this subject'}), 403

        if not student_in_subject(student_id, subject_id):
            return jsonify({'success': False, 'message': 'Forbidden: Student does not belong to this subject course/semester'}), 403

        if not (0 <= float(marks) <= 100):
            return jsonify({'success': False, 'message': 'Marks must be between 0 and 100'}), 400

        mark_record = InternalMark.query.filter_by(
            student_id=student_id, subject_id=subject_id, exam_type=exam_type
        ).first()

        if mark_record:
            mark_record.marks = float(marks)
            mark_record.uploaded_by = faculty_id
        else:
            mark_record = InternalMark(
                student_id=student_id, subject_id=subject_id,
                exam_type=exam_type, marks=float(marks), uploaded_by=faculty_id
            )
            db.session.add(mark_record)

        db.session.commit()
        return jsonify({'success': True, 'message': 'Internal marks uploaded successfully'})
    except Exception as e:
        db.session.rollback()
        return jsonify({'success': False, 'message': str(e)}), 500

@app.route("/api/marks/upload-university", methods=["POST"])
def api_upload_university():
    try:
        student_id = request.form.get("student_id")
        semester_id = request.form.get("semester_id")
        
        if 'file' not in request.files:
            return jsonify({'success': False, 'message': 'PDF file is required'}), 400
        
        file = request.files['file']
        if not file.filename.endswith('.pdf'):
            return jsonify({'success': False, 'message': 'Only PDF files allowed'}), 400
            
        if not student_id or not semester_id:
            return jsonify({'success': False, 'message': 'student_id and semester_id required'}), 400
        
        import os
        os.makedirs("uploads", exist_ok=True)
        pdf_path = f"uploads/univ_marks_{student_id}_{semester_id}.pdf"
        file.save(pdf_path)

        record = UniversityMark.query.filter_by(student_id=student_id, semester_id=semester_id).first()
        if record:
            record.pdf_path = pdf_path
            record.verified = False
        else:
            record = UniversityMark(student_id=student_id, semester_id=semester_id, pdf_path=pdf_path)
            db.session.add(record)

        db.session.commit()
        return jsonify({'success': True, 'message': 'University marks uploaded successfully'})
    except Exception as e:
        db.session.rollback()
        return jsonify({'success': False, 'message': str(e)}), 500

@app.route('/api/timetable/view', methods=['GET'])
def api_view_timetable():
    try:
        department = request.args.get('department')
        batch = request.args.get('batch')
        faculty_id = request.args.get('faculty_id')
        
        query = Timetable.query
        if department and batch:
            base_batch = batch.replace('MCA ', '').replace('IMCA ', '').replace('MBA ', '').strip()
            query = query.filter(
                Timetable.department.ilike(f"%{department}%"),
                Timetable.batch.ilike(f"%{base_batch}%")
            )
        elif faculty_id:
            query = query.filter_by(handler_id=faculty_id)
        else:
             return jsonify({'success': False, 'message': 'Missing filters'}), 400
            
        entries = query.order_by(Timetable.day, Timetable.period).all()
        
        data = []
        for t in entries:
            data.append({
                'day': t.day,
                'period': t.period,
                'time_slot': t.time_slot,
                'subject': t.subject,
                'handler': t.handler_name,
                'department': t.department,
                'batch': t.batch
            })
            
        return jsonify({'success': True, 'data': data}), 200
    except Exception as e:
        return jsonify({'success': False, 'message': str(e)}), 500

ALLOWED_DEPARTMENTS = [
    'Department of Computer Applications', # Canonical for MCA/IMCA
    'Computer Science and Engineering (CSE)',
    'Mechanical Engineering (ME)',
    'Civil Engineering (CE)',
    'Electrical and Electronics Engineering (EEE)',
    'Electronics and Communication Engineering (ECE)',
    'Electronics and Computer Engineering (ECM)',
    'Department of Business Administration',
    'Basic Sciences & Humanities',
    # Legacy / Alternate codes kept for matching potential raw inputs before normalization (though util handles most)
    'CSE', 'MCA', 'IMCA', 'MBA', 'Civil', 'Mechanical', 'Electrical', 'Electronics',
    'CS', 'AI', 'AD', 'CY', 'CSE-AI', 'CSE-DS', 'CSE-CY', 'CSE-AD'
]

@app.route('/api/admin/upload_teachers', methods=['POST'])
def api_upload_teachers():
    try:
        if 'file' not in request.files:
            return jsonify({'success': False, 'message': 'No file uploaded'}), 400
            
        file = request.files['file']
        if file.filename == '':
            return jsonify({'success': False, 'message': 'No file selected'}), 400
            
        if not (file.filename.endswith('.csv') or file.filename.endswith('.xlsx')):
             return jsonify({'success': False, 'message': 'Invalid file format. Upload CSV or Excel.'}), 400

        import pandas as pd
        if file.filename.endswith('.csv'):
            df = pd.read_csv(file)
        else:
            df = pd.read_excel(file)
            
        # Standardize columns: username, password, name, designation, department
        required_cols = ['username', 'password', 'name', 'designation', 'department']
        # Check if columns exist (case insensitive)
        df.columns = [c.lower().strip() for c in df.columns]
        
        missing = [col for col in required_cols if col not in df.columns]
        if missing:
             return jsonify({'success': False, 'message': f'Missing columns: {", ".join(missing)}'}), 400
             
        success_count = 0
        errors = []
        
        for index, row in df.iterrows():
            dept = row['department']
            # Validation: Department
            # Map department codes to full names (canonical)
            # Use unified normalization from utils for best results
            normalized_dept = normalize_dept_name(dept)
            
            if not normalized_dept:
                errors.append(f"Row {index+1}: Invalid Department '{dept}'")
                continue
            
            # Additional validation against allowed list if needed
            found = False
            for d in ALLOWED_DEPARTMENTS:
                 if d.lower() == normalized_dept.lower():
                     found = True
                     break
            if not found:
                 # If normalize_dept_name returned something not in ALLOWED, warn or allow?
                 # Assuming normalize fn helps map to allowed.
                 pass

                
            username = str(row['username']).strip()
            if Faculty.query.filter_by(username=username).first():
                errors.append(f"Row {index+1}: Username '{username}' already exists")
                continue
                
            pw_hash = bcrypt.generate_password_hash(str(row['password'])).decode('utf-8')
            
            new_faculty = Faculty(
                username=username,
                password_hash=pw_hash,
                name=row['name'],
                designation=row['designation'],
                department=normalized_dept,
                status='Live'
            )
            db.session.add(new_faculty)
            success_count += 1
            
        db.session.commit()
        
        msg = f"Successfully created {success_count} users."
        if errors:
            msg += f" {len(errors)} errors: " + "; ".join(errors[:5])
            if len(errors) > 5: msg += "..."
            
        return jsonify({'success': True, 'message': msg, 'errors': errors}), 200

    except Exception as e:
        db.session.rollback()
        return jsonify({'success': False, 'message': str(e)}), 500

@app.route('/api/admin/upload_students', methods=['POST'])
def api_upload_students():
    try:
        if 'file' not in request.files:
            return jsonify({'success': False, 'message': 'No file uploaded'}), 400
            
        file = request.files['file']
        if file.filename == '':
            return jsonify({'success': False, 'message': 'No file selected'}), 400

        import pandas as pd
        if file.filename.endswith('.csv'):
            df = pd.read_csv(file)
        else:
            df = pd.read_excel(file)
            
        # Expected: admission_number, name, roll_number, department, batch, email
        df.columns = [c.lower().strip() for c in df.columns]
        
        if 'batch' not in df.columns:
            return jsonify({'success': False, 'message': 'Batch column is required'}), 400
        
        processed_students = []
        success_count = 0
        errors = []
        
        for idx, row in df.iterrows():
            try:
                with db.session.begin_nested():
                    adm_no = str(row['admission_number']).strip().upper()
                    
                    # Validate required fields
                    if not all([row.get('name'), row.get('email')]):
                        errors.append(f"Row {idx+1}: Missing required fields")
                        continue
                    
                    # Check email uniqueness proactively
                    student_email = str(row.get('email')).strip()
                    existing_email = Student.query.filter_by(email=student_email).first()
                    if existing_email and existing_email.admission_number != adm_no:
                        # Auto-fix email for sample data collisions to allow graceful upload
                        parts = student_email.split('@')
                        if len(parts) == 2:
                            student_email = f"{parts[0]}_{adm_no.lower()}@{parts[1]}"
                        else:
                            student_email = f"{student_email}_{adm_no.lower()}@mentai.edu"
                        
                        # Verify the auto-fixed email isn't somehow also taken
                        if Student.query.filter_by(email=student_email).first():
                             student_email = f"student_{adm_no.lower()}@mentai.edu"
                    
                    # Find or create department (course)
                    dept_input = str(row.get('department', '')).strip()
                    
                    # Map department codes to full names using utils
                    found_dept = normalize_dept_name(dept_input) if dept_input else None
                    
                    if not found_dept:
                        errors.append(f"Row {idx+1}: Department not found or invalid '{dept_input}' for {row.get('name')}")
                        continue
                    
                    # Find course by name
                    course = Course.query.filter_by(name=found_dept).first()
                    if not course:
                        # Create course with default duration
                        course = Course(name=found_dept, duration_years=4)
                        db.session.add(course)
                        db.session.flush()  # Get ID without committing
                    
                    # Parse batch to get start_year
                    batch_str = str(row['batch']).strip()
                    
                    # Extract years from batch string (e.g., "2024-2026")
                    import re
                    year_match = re.search(r'(\d{4})-(\d{4})', batch_str)
                    if not year_match:
                        errors.append(f"Row {idx+1}: Invalid batch format for {row.get('name')}. Expected format: YYYY-YYYY")
                        continue
                    
                    start_year = int(year_match.group(1))
                    expected_end_year = int(year_match.group(2))
                    
                    # Find or create batch
                    batch = Batch.query.filter_by(
                        course_id=course.id,
                        start_year=start_year
                    ).first()
                    
                    if not batch:
                        # Create batch with the provided end year from the uploaded data
                        batch = Batch(
                            course_id=course.id,
                            start_year=start_year,
                            end_year=expected_end_year,
                            status='active'
                        )
                        db.session.add(batch)
                        db.session.flush()  # Get ID without committing
                    
                    # Find or create student
                    student = Student.query.get(adm_no)
                    # Auto-generate roll number from last 2 digits of admission number if not provided
                    roll_num = row.get('roll_number')
                    if not roll_num:
                        roll_num = adm_no[-2:]  # Last 2 digits of admission number
                    
                    if not student:
                        student = Student(
                            admission_number=adm_no,
                            full_name=row.get('name'),
                            roll_number=roll_num,
                            email=student_email,
                            branch=found_dept,
                            batch_id=batch.id,
                            batch=f"{start_year}-{expected_end_year}",  # Set batch string for mentor allocation
                            status='Live'  # Ensure status is set to Live for new students
                        )
                    else:
                        student.full_name = row.get('name', student.full_name)
                        if row.get('roll_number'):
                            student.roll_number = row.get('roll_number')
                        student.email = student_email
                        student.branch = found_dept or student.branch
                        student.batch_id = batch.id
                        student.batch = f"{start_year}-{expected_end_year}"  # Update batch string
                        if student.status == 'Passed Out':
                            student.status = 'Live'
                    
                    db.session.add(student)
                    db.session.flush() # Will trigger IntegrityError here instead of at commit if there's a problem, rolling back just this row
                    
                    processed_students.append(student)
                    success_count += 1
                    
            except Exception as e:
                # The nested transaction is automatically rolled back if an exception occurs
                errors.append(f"Row {idx+1}: {str(e)}")
        
        db.session.commit()
        
        # MENTORSHIP ALLOCATION LOGIC
        from collections import defaultdict
        students_by_dept = defaultdict(list)
        for s in processed_students:
            if s.branch:
                students_by_dept[s.branch].append(s)
                
        allocation_report = []
        
        for dept, students in students_by_dept.items():
            # Allow any Live faculty members to act as Mentors for allocation purposes,
            # previously it was strictly restricted to designation='Mentor'
            mentors = Faculty.query.filter(
                Faculty.department == dept, 
                Faculty.status == 'Live',
                ~Faculty.department.ilike('%Basic Sciences%'),
                ~Faculty.department.ilike('%Humanities%')
            ).all()
            
            if not mentors:
                # Add fallback for slightly mismatched names like "Computer Science"
                mentors = Faculty.query.filter(
                    Faculty.department.ilike(f"%{dept}%"), 
                    Faculty.status == 'Live',
                    ~Faculty.department.ilike('%Basic Sciences%'),
                    ~Faculty.department.ilike('%Humanities%')
                ).all()
                
            if not mentors:
                allocation_report.append(f"Department {dept}: No live mentors found. {len(students)} students processed.")
                continue
                
            all_students = Student.query.filter_by(branch=dept).all()
            all_students.sort(key=lambda x: x.admission_number)
            
            num_mentors = len(mentors)
            for i, student in enumerate(all_students):
                mentor = mentors[i % num_mentors]
                student.mentor_id = mentor.id
                
            allocation_report.append(f"Department {dept}: Automatically distributed {len(all_students)} students among {num_mentors} mentors.")
            
        db.session.commit()
        
        msg = f"Successfully processed {success_count} students."
        if errors:
            msg += f" {len(errors)} errors: " + "; ".join(errors[:5])
            if len(errors) > 5: msg += "..."
            
        return jsonify({'success': True, 'message': msg, 'report': allocation_report, 'errors': errors}), 200

    except Exception as e:
        db.session.rollback()
        return jsonify({'success': False, 'message': str(e)}), 500

@app.route('/api/admin/batch/archive', methods=['POST'])
def api_archive_batch():
    """
    Manually archive a batch â†’ moves all its Live students to alumni_students,
    marks their status as 'Passed Out', and sets batch.status = 'completed'.
    Body: { "department": "...", "batch": "MCA 2023-2025" }
    """
    try:
        data = request.get_json() or {}
        department = data.get('department', '').strip()
        batch_label = data.get('batch', '').strip()

        if not batch_label:
            return jsonify({'success': False, 'message': 'batch label required'}), 400

        from services.batch_service import extract_year_range
        years = extract_year_range(batch_label)
        if not years:
            return jsonify({'success': False, 'message': f'Cannot parse years from: {batch_label}'}), 400

        start_year, end_year = years
        matched_batches = Batch.query.filter_by(start_year=start_year, end_year=end_year).all()

        # Narrow by department if given
        if department and matched_batches:
            dept_filtered = [
                b for b in matched_batches
                if Student.query.filter(
                    Student.batch_id == b.id,
                    Student.branch.ilike(department)
                ).first() is not None
            ]
            if dept_filtered:
                matched_batches = dept_filtered

        if not matched_batches:
            return jsonify({'success': False, 'message': f'No batch found for {batch_label}'}), 404

        total_promoted = 0
        archived_batches = []

        for batch in matched_batches:
            if batch.status == 'completed':
                archived_batches.append(f'{batch.start_year}-{batch.end_year} (already completed)')
                continue

            students = Student.query.filter(
                Student.batch_id == batch.id,
                Student.status.in_(['Live', 'Dropout', 'Pending'])
            ).all()

            for s in students:
                existing = AlumniStudent.query.filter_by(admission_number=s.admission_number).first()
                if not existing:
                    alumni = AlumniStudent(
                        admission_number=s.admission_number,
                        name=s.full_name,
                        email=s.email,
                        department=s.branch,
                        course_id=batch.course_id,
                        batch_id=batch.id,
                        mentor_id=s.mentor_id,
                        passout_year=batch.end_year
                    )
                    db.session.add(alumni)

                if s.mentor_id:
                    history = AlumniMentorHistory(
                        admission_number=s.admission_number,
                        mentor_id=s.mentor_id,
                        start_date=s.created_at or datetime.utcnow(),
                        end_date=datetime.utcnow()
                    )
                    db.session.add(history)

                s.status = 'Passed Out'
                s.mentor_id = None
                s.passout_year = batch.end_year
                total_promoted += 1

            batch.status = 'completed'
            archived_batches.append(f'{batch.start_year}-{batch.end_year}')

        db.session.commit()
        return jsonify({
            'success': True,
            'message': f'Batch {batch_label} archived. {total_promoted} students moved to alumni.',
            'archived_batches': archived_batches,
            'students_promoted': total_promoted
        }), 200

    except Exception as e:
        db.session.rollback()
        return jsonify({'success': False, 'message': str(e)}), 500


@app.route('/api/admin/batch/unarchive', methods=['POST'])
def api_unarchive_batch():
    """
    Reverses archiving: reactivates batch and restores students to Live.
    Body: { "batch": "MCA 2023-2025" }
    """
    try:
        data = request.get_json() or {}
        batch_label = data.get('batch', '').strip()

        if not batch_label:
            return jsonify({'success': False, 'message': 'batch label required'}), 400

        from services.batch_service import extract_year_range
        years = extract_year_range(batch_label)
        if not years:
            return jsonify({'success': False, 'message': f'Cannot parse years from: {batch_label}'}), 400

        start_year, end_year = years
        matched_batches = Batch.query.filter_by(start_year=start_year, end_year=end_year).all()

        if not matched_batches:
            return jsonify({'success': False, 'message': f'No batch found for {batch_label}'}), 404

        total_restored = 0
        for batch in matched_batches:
            batch.status = 'active'
            alumni_records = AlumniStudent.query.filter_by(batch_id=batch.id).all()
            for a in alumni_records:
                s = Student.query.get(a.admission_number)
                if s and s.status == 'Passed Out':
                    s.status = 'Live'
                    s.passout_year = None
                    total_restored += 1
                db.session.delete(a)

        db.session.commit()
        return jsonify({
            'success': True,
            'message': f'Batch {batch_label} restored to active. {total_restored} students re-activated.',
            'students_restored': total_restored
        }), 200

    except Exception as e:
        db.session.rollback()
        return jsonify({'success': False, 'message': str(e)}), 500


@app.route('/api/admin/semester/promote-all', methods=['POST'])
def api_promote_all_to_next_semester():
    """
    Promotes all expired batches (end_year <= current_year) to alumni.
    MCA 2023-2025 (end=2025 < 2026): promoted.
    BTech 2022-2026 (end=2026 <= 2026): promoted.
    Auto-creates new 2026 batches for any course that just graduated.
    Optional body: { "department": "..." } to restrict to one department.
    """
    try:
        data = request.get_json() or {}
        filter_dept = data.get('department', '').strip()
        current_year = datetime.now().year

        expired_batches = Batch.query.filter(
            Batch.status == 'active',
            Batch.end_year <= current_year
        ).all()

        promoted_summary = []
        new_batches_created = []
        total_promoted = 0

        for batch in expired_batches:
            course = Course.query.get(batch.course_id)
            if not course:
                continue

            if filter_dept:
                dept_match = Student.query.filter(
                    Student.batch_id == batch.id,
                    Student.branch.ilike(filter_dept)
                ).first()
                if not dept_match:
                    continue

            students = Student.query.filter(
                Student.batch_id == batch.id,
                Student.status.in_(['Live', 'Dropout', 'Pending'])
            ).all()

            batch_promoted = 0
            for s in students:
                existing = AlumniStudent.query.filter_by(admission_number=s.admission_number).first()
                if not existing:
                    alumni = AlumniStudent(
                        admission_number=s.admission_number,
                        name=s.full_name,
                        email=s.email,
                        department=s.branch,
                        course_id=batch.course_id,
                        batch_id=batch.id,
                        mentor_id=s.mentor_id,
                        passout_year=batch.end_year
                    )
                    db.session.add(alumni)

                if s.mentor_id:
                    history = AlumniMentorHistory(
                        admission_number=s.admission_number,
                        mentor_id=s.mentor_id,
                        start_date=s.created_at or datetime.utcnow(),
                        end_date=datetime.utcnow()
                    )
                    db.session.add(history)

                s.status = 'Passed Out'
                s.mentor_id = None
                s.passout_year = batch.end_year
                batch_promoted += 1
                total_promoted += 1

            batch.status = 'completed'
            promoted_summary.append({
                'course': course.name,
                'batch': f'{batch.start_year}-{batch.end_year}',
                'students_promoted': batch_promoted
            })

            # Auto-create new intake batch for this course if not already present
            new_start = current_year
            if not Batch.query.filter_by(course_id=batch.course_id, start_year=new_start).first():
                duration = course.duration_years or 4
                new_batch = Batch(
                    course_id=batch.course_id,
                    start_year=new_start,
                    end_year=new_start + duration,
                    status='active'
                )
                db.session.add(new_batch)
                new_batches_created.append(f'{course.name} {new_start}-{new_start + duration}')

        db.session.commit()

        if not promoted_summary:
            return jsonify({
                'success': True,
                'message': 'No expired batches found that need promotion.',
                'promoted_summary': [],
                'total_promoted': 0,
                'new_batches': []
            }), 200

        return jsonify({
            'success': True,
            'message': f'Promoted {total_promoted} students from {len(promoted_summary)} batch(es) to alumni.',
            'promoted_summary': promoted_summary,
            'total_promoted': total_promoted,
            'new_batches': new_batches_created
        }), 200

    except Exception as e:
        db.session.rollback()
        return jsonify({'success': False, 'message': str(e)}), 500


@app.route('/api/admin/semester/promote-batch', methods=['POST'])
def api_promote_batch():
    """
    Promotes a specific batch to the next semester.
    If it is the FINAL semester (MCA/MBA sem 4, BTech sem 8, IMCA sem 10),
    moves all students to alumni and marks batch completed.
    Otherwise returns next-semester info (no DB change needed — semester is calendar-computed).

    Body: { "batch_label": "MCA 2024-2026", "department": "...", "duration_years": 2 }
    """
    try:
        data = request.get_json() or {}
        batch_label   = data.get('batch_label', '').strip()
        department    = data.get('department', '').strip()
        duration_years = int(data.get('duration_years', 4))

        if not batch_label:
            return jsonify({'success': False, 'message': 'batch_label required'}), 400

        from services.batch_service import extract_year_range
        years = extract_year_range(batch_label)
        if not years:
            return jsonify({'success': False, 'message': f'Cannot parse years from: {batch_label}'}), 400

        start_year, end_year = years
        now = datetime.now()
        current_year  = now.year
        current_month = now.month

        years_elapsed = current_year - start_year
        sem_in_year   = 1 if current_month <= 6 else 2
        max_sem       = duration_years * 2
        current_sem   = min(years_elapsed * 2 + sem_in_year, max_sem)

        if current_sem >= max_sem:
            # ── Final semester → promote to alumni ──────────────────────────
            matched_batches = Batch.query.filter_by(
                start_year=start_year, end_year=end_year
            ).all()

            # Narrow by department students if dept provided
            if department and matched_batches:
                dept_filtered = [
                    b for b in matched_batches
                    if Student.query.filter(
                        Student.batch_id == b.id,
                        Student.branch.ilike(department)
                    ).first() is not None
                ]
                if dept_filtered:
                    matched_batches = dept_filtered

            if not matched_batches:
                return jsonify({'success': False, 'message': f'No active batch found for {batch_label}'}), 404

            total_promoted = 0
            for batch in matched_batches:
                if batch.status == 'completed':
                    continue

                students = Student.query.filter(
                    Student.batch_id == batch.id,
                    Student.status.in_(['Live', 'Dropout', 'Pending'])
                ).all()

                for s in students:
                    existing = AlumniStudent.query.filter_by(
                        admission_number=s.admission_number
                    ).first()
                    if not existing:
                        alumni = AlumniStudent(
                            admission_number=s.admission_number,
                            name=s.full_name,
                            email=s.email,
                            department=s.branch,
                            course_id=batch.course_id,
                            batch_id=batch.id,
                            mentor_id=s.mentor_id,
                            passout_year=batch.end_year
                        )
                        db.session.add(alumni)

                    if s.mentor_id:
                        history = AlumniMentorHistory(
                            admission_number=s.admission_number,
                            mentor_id=s.mentor_id,
                            start_date=s.created_at or datetime.utcnow(),
                            end_date=datetime.utcnow()
                        )
                        db.session.add(history)

                    s.status = 'Passed Out'
                    s.mentor_id = None
                    s.passout_year = batch.end_year
                    total_promoted += 1

                batch.status = 'completed'

                # Auto-create new intake batch for this course if not present
                if not Batch.query.filter_by(
                    course_id=batch.course_id, start_year=current_year
                ).first():
                    course = Course.query.get(batch.course_id)
                    dur = course.duration_years if course else duration_years
                    new_batch = Batch(
                        course_id=batch.course_id,
                        start_year=current_year,
                        end_year=current_year + dur,
                        status='active'
                    )
                    db.session.add(new_batch)

            db.session.commit()

            return jsonify({
                'success': True,
                'to_alumni': True,
                'current_sem': current_sem,
                'max_sem': max_sem,
                'students_promoted': total_promoted,
                'message': (
                    f'Batch {batch_label} (Sem {current_sem}/{max_sem}) promoted to Alumni. '
                    f'{total_promoted} students graduated.'
                )
            }), 200

        else:
            # ── Not final semester — no DB change, semester is calendar-computed ───
            next_sem = current_sem + 1
            return jsonify({
                'success': True,
                'to_alumni': False,
                'current_sem': current_sem,
                'next_sem': next_sem,
                'max_sem': max_sem,
                'message': (
                    f'Batch {batch_label} advanced from Semester {current_sem} → Semester {next_sem}. '
                    f'Students remain active.'
                )
            }), 200

    except Exception as e:
        db.session.rollback()
        return jsonify({'success': False, 'message': str(e)}), 500


# ============= ATTENDANCE & MENTORSHIP ROUTES =============


@app.route('/api/admin/attendance/daily_upload', methods=['POST'])
def api_upload_daily_attendance():
    try:
        if 'file' not in request.files:
            return jsonify({'success': False, 'message': 'No file uploaded'}), 400
            
        file = request.files['file']
        date_str = request.form.get('date')
        
        if not date_str:
             return jsonify({'success': False, 'message': 'Date is required'}), 400
             
        attendance_date = datetime.strptime(date_str, '%Y-%m-%d').date()
        
        # Read file
        import pandas as pd
        if file.filename.endswith('.csv'):
            df = pd.read_csv(file)
        elif file.filename.endswith(('.xls', '.xlsx')):
            df = pd.read_excel(file)
        else:
            return jsonify({'success': False, 'message': 'Invalid file format'}), 400
            
        # Expected cols: admission_number, h1, h2, h3, h4, h5, h6, h7 (or 1, 2...7)
        df.columns = [str(c).lower().strip() for c in df.columns]
        
        count = 0
        errors = []
        
        # Mapping P/A/1/0 to 1/0
        def parse_status(val):
            s = str(val).upper().strip()
            if s in ['P', 'PRESENT', '1', 'TRUE']: return 1
            return 0
            
        for index, row in df.iterrows():
            adm_no = str(row.get('admission_number') or row.get('admission no') or '').strip().upper()
            if not adm_no or adm_no == 'NAN': continue
            
            # Check if student exists
            student = Student.query.get(adm_no)
            if not student:
                errors.append(f"Row {index+1}: Student {adm_no} not found")
                continue
                
            # Create or Update Attendance Record
            record = DailyAttendance.query.filter_by(student_admission_number=adm_no, date=attendance_date).first()
            if not record:
                record = DailyAttendance(student_admission_number=adm_no, date=attendance_date)
            
            # Parse hours (look for h1, hour1, 1, etc)
            record.hour_1 = parse_status(row.get('h1') or row.get('1') or 0)
            record.hour_2 = parse_status(row.get('h2') or row.get('2') or 0)
            record.hour_3 = parse_status(row.get('h3') or row.get('3') or 0)
            record.hour_4 = parse_status(row.get('h4') or row.get('4') or 0)
            record.hour_5 = parse_status(row.get('h5') or row.get('5') or 0)
            record.hour_6 = parse_status(row.get('h6') or row.get('6') or 0)
            record.hour_7 = parse_status(row.get('h7') or row.get('7') or 0)
            
            db.session.add(record)
            
            # ALSO populating StudentAttendance for our new analytics table
            status_val = 'P' if record.hour_1 == 1 else 'A'
            sa = StudentAttendance.query.filter_by(student_admission_number=adm_no, date=attendance_date).first()
            if not sa:
                sa = StudentAttendance(student_admission_number=adm_no, date=attendance_date)
            sa.status = status_val
            db.session.add(sa)
            
            count += 1
            
        db.session.commit()
        
        # Trigger analytics (Safe: After upload, compute trends)
        run_full_analysis()
        
        return jsonify({
            'success': True, 
            'message': f'Processed {count} records and triggered analytics engine.',
            'errors': errors[:10] # Return first 10 errors
        }), 200
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'success': False, 'message': str(e)}), 500

@app.route('/api/admin/upload_attendance', methods=['POST'])
def api_upload_attendance():
    try:
        data = request.json
        if not data:
            return jsonify({'success': False, 'message': 'No data provided'}), 400
            
        count = 0
        for row in data:
            student_id = row.get('student_id')
            date_str = row.get('date')
            status = row.get('status')
            
            if not student_id or not date_str or not status: continue
            
            # Upsert
            attendance_date = datetime.strptime(date_str, '%Y-%m-%d').date()
            record = StudentAttendance.query.filter_by(student_admission_number=student_id, date=attendance_date).first()
            if not record:
                record = StudentAttendance(student_admission_number=student_id, date=attendance_date)
                
            record.status = status
            db.session.add(record)
            count += 1
            
        db.session.commit()
        
        # Trigger analytics (Safe: After upload, compute trends)
        run_full_analysis()
        
        return jsonify({'success': True, 'message': 'Upload successful & analytics triggered'}), 200
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'success': False, 'message': str(e)}), 500

@app.route('/api/alerts/<role>/<id>', methods=['GET'])
def api_get_alerts(role, id):
    try:
        from sqlalchemy import desc
        if role == 'student':
            alerts = Alert.query.filter_by(student_admission_number=id).order_by(desc(Alert.created_at)).limit(10).all()
        elif role == 'mentor':
            alerts = Alert.query.filter_by(mentor_id=id).order_by(desc(Alert.created_at)).limit(20).all()
        else:
            return jsonify({'success': False, 'message': 'Invalid role'}), 400
            
        return jsonify({
            'success': True,
            'data': [{
                'id': a.id,
                'student_id': a.student_admission_number,
                'type': a.type,
                'message': a.message,
                'is_read': a.is_read,
                'created_at': a.created_at.strftime('%Y-%m-%d %H:%M')
            } for a in alerts]
        }), 200
    except Exception as e:
        return jsonify({'success': False, 'message': str(e)}), 500

# ============= PHASE 2 TREND ANALYTICS ROUTES =============
from analytics.trends import compute_student_analytics
from models import StudentAnalytics

def calculate_analytics(student_id):
    # Fetch chronological daily attendance
    from sqlalchemy import asc
    attendances = DailyAttendance.query.filter_by(student_admission_number=student_id).order_by(asc(DailyAttendance.date)).all()
    
    # Flatten to list of 1s and 0s
    att_records = []
    for a in attendances:
        status = 1 if a.hour_1 == 1 else 0
        att_records.append(status)
        
    # Fetch internal marks
    internal_marks_objs = InternalMark.query.filter_by(student_id=student_id).all()
    marks_dict = {}
    for m in internal_marks_objs:
        if m.subject_id not in marks_dict:
            marks_dict[m.subject_id] = {}
        marks_dict[m.subject_id][m.exam_type] = m.marks
        
    metrics = compute_student_analytics(student_id, att_records, marks_dict)
    
    # Store or update in DB (Option B implementation)
    sa = StudentAnalytics.query.filter_by(student_id=student_id).first()
    if not sa:
        sa = StudentAnalytics(student_id=student_id)
        db.session.add(sa)
    
    sa.attendance_percentage = metrics['attendance_percentage']
    sa.attendance_slope = metrics['attendance_slope']
    sa.avg_internal_marks = metrics['avg_internal_marks']
    sa.marks_slope = metrics['marks_slope']
    sa.failure_count = metrics['failure_count']
    sa.marks_variance = metrics['marks_variance']
    sa.risk_score = metrics['risk_score']
    sa.status = metrics['status']
    sa.last_updated = datetime.utcnow()
    
    try:
        from analytics.train_model import predict_student_risk
        sa.ml_risk_probability = predict_student_risk(sa)
    except Exception as e:
        sa.ml_risk_probability = 0.0

    # ----- PHASE 5: COMPLIANCE-AWARE RISK RECALIBRATION -----
    try:
        from models import WeeklyStudyPlan
        recent_plan = WeeklyStudyPlan.query.filter_by(student_id=student_id).order_by(WeeklyStudyPlan.week_start.desc()).first()
        compliance_fraction = None
        
        if recent_plan:
            allocated = sum(sub.allocated_hours for sub in recent_plan.subjects)
            if allocated > 0:
                completed = sum(sum(log.hours_completed for log in sub.sessions) for sub in recent_plan.subjects)
                compliance_fraction = min(1.0, completed / allocated)
        
        if compliance_fraction is not None:
            if compliance_fraction >= 0.8:
                risk_modifier = -0.05
            elif compliance_fraction >= 0.4:
                risk_modifier = 0.0
            else:
                risk_modifier = 0.10
        else:
            risk_modifier = 0.0
            
        sa.compliance_modifier = risk_modifier
        
        r_det = sa.risk_score / 100.0
        r_ml = sa.ml_risk_probability / 100.0
        
        r_det_adj = max(0.0, min(1.0, r_det + risk_modifier))
        r_ml_adj = max(0.0, min(1.0, r_ml + risk_modifier))
        
        sa.adjusted_risk = (0.5 * r_det_adj + 0.5 * r_ml_adj) * 100.0

        # ----- PHASE 7: CAUSAL OUTCOME TRACKING -----
        try:
            from datetime import date, timedelta
            today = date.today()
            current_week_start = today - timedelta(days=today.weekday())
            prev_week_start = current_week_start - timedelta(days=7)

            # Check for intervention from exactly one week ago
            past_interv = MentorIntervention.query.filter_by(
                student_id=student_id,
                week_start=prev_week_start
            ).first()

            if past_interv:
                # Idempotency check: unique intervention_id
                existing_outcome = InterventionOutcome.query.filter_by(intervention_id=past_interv.id).first()
                if not existing_outcome:
                    delta = sa.adjusted_risk - past_interv.risk_snapshot
                    
                    if delta <= -10:
                        label = "Improved"
                    elif delta < 10:
                        label = "Static"
                    else:
                        label = "Regressed"
                        
                    sub_comp = (compliance_fraction * 100.0) if compliance_fraction is not None else 0.0
                    shift = sub_comp - past_interv.compliance_snapshot
                    
                    outcome = InterventionOutcome(
                        intervention_id=past_interv.id,
                        evaluated_week_start=current_week_start,
                        initial_risk=past_interv.risk_snapshot,
                        subsequent_risk=sa.adjusted_risk,
                        delta=delta,
                        initial_compliance=past_interv.compliance_snapshot,
                        subsequent_compliance=sub_comp,
                        compliance_shift=shift,
                        outcome_label=label
                    )
                    db.session.add(outcome)
                    # We don't commit yet; the main function commits at the end
        except Exception as eval_e:
            print(f"Phase 7 Outcome Evaluation Error: {eval_e}")

    except Exception as e:
        import traceback
        traceback.print_exc()
        sa.compliance_modifier = 0.0
        sa.adjusted_risk = (0.5 * (sa.risk_score / 100.0) + 0.5 * (sa.ml_risk_probability / 100.0)) * 100.0

    db.session.commit()
    
    metrics['ml_risk_probability'] = sa.ml_risk_probability
    metrics['compliance_modifier'] = sa.compliance_modifier
    metrics['adjusted_risk'] = sa.adjusted_risk
    return metrics

@app.route('/api/analytics/student/<string:student_id>', methods=['GET'])
def api_get_student_analytics(student_id):
    try:
        # Check if student exists
        student = Student.query.get(student_id)
        if not student:
            return jsonify({'success': False, 'message': 'Student not found'}), 404
            
        metrics = calculate_analytics(student_id) # On-request (Dynamic generation/update) for test purposes
        return jsonify({'success': True, 'data': metrics}), 200
        
    except Exception as e:
        return jsonify({'success': False, 'message': str(e)}), 500

@app.route('/api/analytics/mentor/<int:mentor_id>', methods=['GET'])
def api_get_mentor_analytics(mentor_id):
    try:
        mentees = Student.query.filter_by(mentor_id=mentor_id, status='Live').all()
        data = []
        for m in mentees:
            # Check DB or compute
            sa = StudentAnalytics.query.filter_by(student_id=m.admission_number).first()
            if not sa:
                metrics = calculate_analytics(m.admission_number)
            else:
                metrics = {
                    "attendance_percentage": sa.attendance_percentage,
                    "attendance_slope": sa.attendance_slope,
                    "avg_internal_marks": sa.avg_internal_marks,
                    "marks_slope": sa.marks_slope,
                    "failure_count": sa.failure_count,
                    "marks_variance": sa.marks_variance,
                    "risk_score": sa.risk_score,
                    "status": sa.status,
                    "ml_risk_probability": sa.ml_risk_probability,
                    "compliance_modifier": sa.compliance_modifier,
                    "adjusted_risk": sa.adjusted_risk
                }
            data.append({
                "student_id": m.admission_number,
                "name": m.full_name,
                "batch": m.batch or "",
                "risk_score": metrics.get("risk_score", 0.0) or 0.0,
                "attendance_trend": metrics.get("attendance_slope", 0.0) or 0.0,
                "marks_trend": metrics.get("marks_slope", 0.0) or 0.0,
                "status": metrics.get("status", "Stable") or "Stable",
                "ml_risk_probability": metrics.get("ml_risk_probability", 0.0) or 0.0,
                "adjusted_risk": metrics.get("adjusted_risk", 0.0) or 0.0,
                "attendance_percentage": metrics.get("attendance_percentage", 0.0) or 0.0,
                "avg_internal_marks": metrics.get("avg_internal_marks", 0.0) or 0.0
            })
            
        return jsonify({'success': True, 'data': data}), 200
        
    except Exception as e:
        return jsonify({'success': False, 'message': str(e)}), 500

@app.route('/api/admin/mentorship/view', methods=['GET'])
def api_get_mentors_view():
    try:
        dept = request.args.get('department')
        batch = request.args.get('batch')  # Could be "MCA 2024-2026" or "2024-2026"
        
        if not dept:
            return jsonify({'success': False, 'message': 'Department required'}), 400
            
        dept = normalize_dept_name(dept)
        
        # Build a flexible faculty/student department filter.
        # Faculty and Student records may be stored as short codes ("MCA", "IMCA") OR full names.
        from services.batch_service import is_mentor_eligible
        
        ca_dept = 'Department of Computer Applications'
        if dept == ca_dept:
            # Match MCA, IMCA, Computer Applications, or explicit full name
            faculty_filter = db.or_(
                Faculty.department.ilike('MCA'),
                Faculty.department.ilike('IMCA'),
                Faculty.department.ilike('%Computer Applications%'),
            )
            student_dept_filter = db.or_(
                Student.branch.ilike('MCA'),
                Student.branch.ilike('IMCA'),
                Student.branch.ilike('%Computer Applications%'),
            )
        else:
            faculty_filter = Faculty.department.ilike(dept)
            student_dept_filter = Student.branch.ilike(f'%{dept}%')
        
        all_faculty = Faculty.query.filter(
            faculty_filter,
            Faculty.status == 'Live'
        ).all()
        
        mentors = [f for f in all_faculty if is_mentor_eligible(f)]
        
        data = []
        for m in mentors:
            # Total Load (all batches)
            total_load = Student.query.filter_by(mentor_id=m.id, status='Live').count()
            
            # Batch Specific Query - Use year range matching
            batch_query = Student.query.filter(
                Student.mentor_id == m.id,
                Student.status == 'Live'
            )
            
            if batch:
                # Extract years from batch label (handles both "MCA 2024-2026" and "2024-2026")
                from services.batch_service import extract_year_range
                target_years = extract_year_range(batch)
                
                if target_years:
                    # Match by year range instead of exact batch string
                    batch_query = batch_query.filter(
                        db.or_(
                            Student.batch.ilike(f"%{target_years[0]}-{target_years[1]}%"),
                            db.and_(
                                Student.batch.ilike(f"%{target_years[0]}%"),
                                Student.batch.ilike(f"%{target_years[1]}%")
                            )
                        )
                    )
            
            mentees = batch_query.all()
            
            data.append({
                'id': m.id,
                'name': m.name,
                'designation': m.designation,
                'total_load': total_load,
                'batch_mentee_count': len(mentees),
                'mentees': [{'admission_number': s.admission_number, 'name': s.full_name, 'batch': s.batch} for s in mentees]
            })
            
        # Find unassigned students using the same flexible filter
        unassigned_query = Student.query.filter(
            student_dept_filter,
            Student.status == 'Live',
            Student.mentor_id == None
        )
        
        if batch:
            from services.batch_service import extract_year_range
            target_years = extract_year_range(batch)
            if target_years:
                unassigned_query = unassigned_query.filter(
                    db.or_(
                        Student.batch.ilike(f"%{target_years[0]}-{target_years[1]}%"),
                        db.and_(
                            Student.batch.ilike(f"%{target_years[0]}%"),
                            Student.batch.ilike(f"%{target_years[1]}%")
                        )
                    )
                )
             
        unassigned_count = unassigned_query.count()
        
        return jsonify({
            'success': True, 
            'data': data,
            'unassigned_count': unassigned_count
        }), 200
    except Exception as e:
        db.session.rollback()
        return jsonify({'success': False, 'message': str(e)}), 500

@app.route('/api/mentor/mentees', methods=['GET'])
def api_get_my_mentees():
    try:
        username = request.args.get('username')
        if not username:
            return jsonify({'success': False, 'message': 'Mentor username required'}), 400
            
        # Find mentor
        mentor = Faculty.query.filter_by(username=username).first()
        if not mentor:
            return jsonify({'success': False, 'message': 'Mentor not found'}), 404
            
        # Get mentees
        mentees = Student.query.filter_by(mentor_id=mentor.id).all()
        
        mentee_data = []
        for s in mentees:
            # Here we can calculate arbitrary risk/status
            # For now, assigning placeholder defaults as requested
            mentee_data.append({
                'id': s.admission_number,
                'name': s.full_name,
                'batch': f"{s.branch} {s.batch if s.batch else ''}".strip(),
                'status': 'Good',
                'risk': 'low',
                'lastMeeting': 'Recent'
            })
            
        return jsonify({
            'success': True,
            'data': mentee_data
        }), 200

    except Exception as e:
        return jsonify({'success': False, 'message': str(e)}), 500

@app.route('/api/admin/stats', methods=['GET'])
def api_get_admin_stats():
    try:
        # All active/enrolled students (not passed out)
        total_students = Student.query.filter(Student.status != 'Passed Out').count()
        # All active mentors assigned to actual departments (exclude Basic Sciences & Humanities and include only Professors and designated mentors - NOT HODs)
        active_mentors = Faculty.query.filter(
            Faculty.status == 'Live',
            ~Faculty.department.ilike('%Basic Sciences%'),
            ~Faculty.department.ilike('%Humanities%'),
            ~Faculty.designation.ilike('%HOD%'),  # Exclude HODs from mentorship
            (Faculty.designation.ilike('%Professor%')) | 
            (Faculty.designation.ilike('%Mentor%'))
        ).count()
        
        # Count unique departments from both students and faculty, handling Computer Applications unification
        try:
            student_depts_raw = db.session.query(Student.branch).distinct().all()
            faculty_depts_raw = db.session.query(Faculty.department).distinct().all()
                    
            # Combine and normalize departments, handling Computer Applications unification
            all_depts = set()
            
            # Process student departments
            for dept in student_depts_raw:
                if dept[0]:  # Check if not None
                    dept_name = dept[0]
                    # Map MCA/IMCA/Computer Applications to a unified Computer Applications department
                    if dept_name in ['MCA', 'IMCA', 'Computer Applications'] or 'Computer Applications' in dept_name:
                        all_depts.add('Computer Applications')
                    else:
                        all_depts.add(dept_name)
            
            # Process faculty departments
            for dept in faculty_depts_raw:
                if dept[0]:  # Check if not None
                    dept_name = dept[0]
                    # Map MCA/IMCA/Computer Applications to a unified Computer Applications department
                    if dept_name in ['MCA', 'IMCA', 'Computer Applications'] or 'Computer Applications' in dept_name:
                        all_depts.add('Computer Applications')
                    else:
                        all_depts.add(dept_name)
                    
            departments = len(all_depts)
        except Exception as e:
            # Fallback in case of database error
            departments = 0
        
        # Count total courses
        total_courses = Course.query.count()
        
        return jsonify({
            'success': True,
            'data': {
                'total_students': total_students,
                'active_mentors': active_mentors,
                'departments': departments,
                'total_courses': total_courses
            }
        }), 200
    except Exception as e:
        return jsonify({'success': False, 'message': str(e)}), 500


@app.route('/api/admin/departments', methods=['GET'])
def api_get_departments():
    try:
        # Get unique departments from students
        student_departments = db.session.query(Student.branch).distinct().all()
        student_depts = [dept[0] for dept in student_departments if dept[0]]
        
        # Get unique departments from faculty
        faculty_departments = db.session.query(Faculty.department).distinct().all()
        faculty_depts = [dept[0] for dept in faculty_departments if dept[0]]
        
        # Get all courses (departments) from the Course table
        all_courses = Course.query.all()
        course_depts = [(course.name, course.code) for course in all_courses if course.name]
        
        # Combine and deduplicate - keep original department names to preserve consistency
        all_departments = list(set(student_depts + faculty_depts + [name for name, _ in course_depts]))
        
        # Sort alphabetically
        all_departments.sort()
        
        # Create detailed response with faculty counts and codes
        departments_data = []
        for dept in all_departments:
            # Count faculty members for this department
            faculty_count = Faculty.query.filter_by(department=dept).count()
            
            # Count students for this department (with 'Live' status)
            students_count = Student.query.filter(
                Student.branch == dept,
                Student.status != 'Passed Out'
            ).count()
            
            # Get the department code from Course table
            try:
                course = Course.query.filter_by(name=dept).first()
                dept_code = course.code if course and course.code else dept[:3].upper()
            except:
                # Handle case where 'code' column doesn't exist in the database yet
                dept_code = dept[:3].upper()
            
            departments_data.append({
                'name': dept,
                'code': dept_code,
                'faculty_count': faculty_count,
                'students_count': students_count
            })
        
        return jsonify({
            'success': True,
            'data': departments_data
        }), 200
    except Exception as e:
        return jsonify({'success': False, 'message': str(e)}), 500


@app.route('/api/admin/departments', methods=['POST'])
def api_add_department():
    try:
        data = request.get_json()
        dept_name = data.get('name', '').strip()
        dept_code = data.get('code', '').strip().upper()
        
        if not dept_name:
            return jsonify({'success': False, 'message': 'Department name is required'}), 400
        
        # If no code provided, derive from department name
        if not dept_code:
            # Map department names to codes
            dept_to_code = {
                'Computer Applications': 'CA',
                'Computer Science & Engineering': 'CSE',
                'Civil Engineering': 'CE',
                'Mechanical Engineering': 'ME',
                'Electrical & Electronics Engineering': 'EEE',
                'Electronics & Communication Engineering': 'ECE',
                'Management Studies': 'MBA',
                'Basic Sciences & Humanities': 'BSH',
                'MCA': 'MCA',
                'IMCA': 'IMCA'
            }
            dept_code = dept_to_code.get(dept_name, dept_name[:3].upper())
        
        # Check if department already exists
        existing_course = Course.query.filter_by(name=dept_name).first()
        if existing_course:
            return jsonify({'success': False, 'message': 'Department/Course already exists'}), 400
        
        # Create a new course record for the department
        new_course = Course(name=dept_name, code=dept_code)
        db.session.add(new_course)
        db.session.commit()
        
        return jsonify({
            'success': True,
            'message': f'Department/Course "{dept_name}" added successfully with code "{dept_code}"',
            'data': {'name': dept_name, 'code': dept_code}
        }), 201
    except Exception as e:
        db.session.rollback()
        return jsonify({'success': False, 'message': str(e)}), 500


@app.route('/api/admin/departments/<string:dept_name>', methods=['DELETE'])
def api_remove_department(dept_name):
    try:
        # Find and delete the course record
        course = Course.query.filter_by(name=dept_name).first()
        if not course:
            return jsonify({'success': False, 'message': 'Department/Course not found'}), 404
        
        # Check if there are students or faculty in this department
        students_in_dept = Student.query.filter_by(branch=dept_name).count()
        faculty_in_dept = Faculty.query.filter_by(department=dept_name).count()
        
        if students_in_dept > 0 or faculty_in_dept > 0:
            return jsonify({
                'success': False, 
                'message': f'Cannot delete department with {students_in_dept} students and {faculty_in_dept} faculty members'
            }), 400
        
        db.session.delete(course)
        db.session.commit()
        
        return jsonify({
            'success': True,
            'message': f'Department/Course "{dept_name}" removed successfully'
        }), 200
    except Exception as e:
        db.session.rollback()
        return jsonify({'success': False, 'message': str(e)}), 500

# ============= PHASE 4C PLANNER ROUTES =============
from analytics.planner import generate_and_lock_weekly_plan
from models import WeeklyStudyPlan, StudyPlanSubject, StudySessionLog, MentorIntervention
from datetime import date, timedelta

@app.route('/api/planner/<string:student_id>', methods=['GET'])
def api_get_student_planner(student_id):
    try:
        plan = generate_and_lock_weekly_plan(student_id)
        if not plan:
            return jsonify({'success': False, 'message': 'Could not generate plan'}), 400

        # Serialize
        subjects = []
        for sub in plan.subjects:
            subjects.append({
                "id": sub.id,
                "subject_id": sub.subject_id,
                "subject_name": sub.subject.name if sub.subject else "Unknown",
                "allocated_hours": sub.allocated_hours,
                "priority": sub.priority,
                "completed_hours": sum(log.hours_completed for log in sub.sessions)
            })

        return jsonify({
            'success': True,
            'data': {
                'id': plan.id,
                'week_start': plan.week_start.isoformat(),
                'week_end': plan.week_end.isoformat(),
                'total_hours': plan.total_hours,
                'booster_applied': plan.booster_applied,
                'deterministic_risk': plan.deterministic_risk,
                'ml_probability': plan.ml_probability,
                'subjects': subjects
            }
        }), 200

    except Exception as e:
        import traceback
        traceback.print_exc()
        return jsonify({'success': False, 'message': str(e)}), 500

@app.route('/api/planner/log-session', methods=['POST'])
def api_log_session():
    try:
        data = request.json
        plan_subject_id = data.get('plan_subject_id')
        hours_completed = data.get('hours_completed', 0)

        if not plan_subject_id:
            return jsonify({'success': False, 'message': 'plan_subject_id required'}), 400

        try:
            hours = float(hours_completed)
        except ValueError:
            return jsonify({'success': False, 'message': 'Invalid hours format'}), 400

        # Server-side validation
        if hours <= 0:
            return jsonify({'success': False, 'message': 'Hours must be greater than 0'}), 400
        if hours > 24:
            return jsonify({'success': False, 'message': 'Cannot log more than 24 hours in a single session'}), 400

        log = StudySessionLog(
            plan_subject_id=plan_subject_id,
            date=date.today(),
            hours_completed=hours
        )
        db.session.add(log)
        db.session.commit()

        return jsonify({'success': True, 'message': 'Session logged successfully'}), 200

    except Exception as e:
        return jsonify({'success': False, 'message': str(e)}), 500

@app.route('/api/planner/log-workout-session', methods=['POST'])
def api_log_workout_session():
    try:
        data = request.json or {}
        student_id = data.get('student_id')
        duration_minutes = data.get('duration_minutes', 0)
        workout_type = data.get('workout_type', 'home_workout')
        intensity = data.get('intensity', 'moderate')
        completed = bool(data.get('completed', True))
        notes = data.get('notes', '')

        if not student_id:
            return jsonify({'success': False, 'message': 'student_id required'}), 400

        student = Student.query.get(student_id)
        if not student:
            return jsonify({'success': False, 'message': 'Student not found'}), 404

        try:
            minutes = int(duration_minutes)
        except (TypeError, ValueError):
            return jsonify({'success': False, 'message': 'Invalid duration_minutes'}), 400

        if minutes <= 0 or minutes > 180:
            return jsonify({'success': False, 'message': 'duration_minutes must be between 1 and 180'}), 400

        log = WorkoutSessionLog(
            student_id=student_id,
            date=datetime.utcnow().date(),
            duration_minutes=minutes,
            workout_type=workout_type,
            intensity=intensity,
            completed=completed,
            notes=notes[:255] if notes else None
        )
        db.session.add(log)
        db.session.commit()
        return jsonify({'success': True, 'message': 'Workout session logged successfully'}), 200
    except Exception as e:
        db.session.rollback()
        return jsonify({'success': False, 'message': str(e)}), 500

@app.route('/api/planner/workout-compliance/<string:student_id>', methods=['GET'])
def api_workout_compliance(student_id):
    try:
        student = Student.query.get(student_id)
        if not student:
            return jsonify({'success': False, 'message': 'Student not found'}), 404

        today = datetime.utcnow().date()
        week_start = today - timedelta(days=today.weekday())
        week_end = week_start + timedelta(days=6)

        wp = StudentWellnessPreference.query.filter_by(student_id=student_id).first()
        weekly_workout_target = wp.weekly_workout_target if wp and wp.weekly_workout_target else 4

        logs = WorkoutSessionLog.query.filter(
            WorkoutSessionLog.student_id == student_id,
            WorkoutSessionLog.date >= week_start,
            WorkoutSessionLog.date <= week_end,
            WorkoutSessionLog.completed.is_(True)
        ).all()

        workout_sessions_done = len(logs)
        workout_minutes_done = sum((l.duration_minutes or 0) for l in logs)
        workout_compliance = round((workout_sessions_done / weekly_workout_target) * 100, 1) if weekly_workout_target else 0.0

        study_plan = WeeklyStudyPlan.query.filter_by(student_id=student_id, week_start=week_start).first()
        study_compliance = 0.0
        if study_plan:
            allocated = sum((s.allocated_hours or 0) for s in study_plan.subjects)
            completed_hours = sum(sum((log.hours_completed or 0) for log in s.sessions) for s in study_plan.subjects)
            study_compliance = round((completed_hours / allocated) * 100, 1) if allocated else 0.0

        balanced_routine_score = round((study_compliance * 0.65) + (min(100.0, workout_compliance) * 0.35), 1)

        return jsonify({
            'success': True,
            'data': {
                'week_start': week_start.isoformat(),
                'week_end': week_end.isoformat(),
                'study_compliance': study_compliance,
                'workout_compliance': min(100.0, workout_compliance),
                'balanced_routine_score': balanced_routine_score,
                'workout_sessions_done': workout_sessions_done,
                'workout_target': weekly_workout_target,
                'workout_minutes_done': workout_minutes_done
            }
        }), 200
    except Exception as e:
        return jsonify({'success': False, 'message': str(e)}), 500

@app.route('/api/planner/mentor/<int:mentor_id>', methods=['GET'])
def api_get_mentor_planner(mentor_id):
    try:
        mentees = Student.query.filter_by(mentor_id=mentor_id, status='Live').all()
        data = []
        for m in mentees:
            plan = generate_and_lock_weekly_plan(m.admission_number)
            if not plan:
                continue

            completed = 0.0
            allocated = sum(sub.allocated_hours for sub in plan.subjects)
            for sub in plan.subjects:
                completed += sum(log.hours_completed for log in sub.sessions)

            compliance_raw = (completed / allocated) * 100 if allocated > 0 else 0
            compliance = min(100.0, compliance_raw)

            data.append({
                "student_id": m.admission_number,
                "name": m.full_name,
                "risk_score": plan.deterministic_risk,
                "ml_probability": plan.ml_probability,
                "compliance": round(compliance, 1),
                "plan_generated": True,
                "total_allocated": allocated,
                "total_completed": completed
            })

        return jsonify({'success': True, 'data': data}), 200

    except Exception as e:
        import traceback
        traceback.print_exc()
        return jsonify({'success': False, 'message': str(e)}), 500

# ============= PHASE 6 INTERVENTION ROUTES =============

@app.route('/api/intervention/create', methods=['POST'])
def api_create_intervention():
    try:
        data = request.json
        student_id = data.get('student_id')
        mentor_id = data.get('mentor_id')
        intervention_type = data.get('intervention_type')
        notes = data.get('notes', '')

        if not all([student_id, mentor_id, intervention_type]):
            return jsonify({'success': False, 'message': 'Missing required fields'}), 400

        # Validate Mentor
        student = Student.query.filter_by(admission_number=student_id).first()
        if not student or student.mentor_id != int(mentor_id):
            return jsonify({'success': False, 'message': 'Unauthorized mentor for this student'}), 403

        # Validate Duplicate in Week
        today = date.today()
        week_start = today - timedelta(days=today.weekday())
        
        existing = MentorIntervention.query.filter_by(
            student_id=student_id,
            week_start=week_start
        ).first()

        if existing:
            return jsonify({'success': False, 'message': 'Intervention already logged for this week'}), 400

        # Fetch Snapshots
        sa = StudentAnalytics.query.filter_by(student_id=student_id).first()
        risk_snap = sa.adjusted_risk if sa and sa.adjusted_risk else 0.0

        comp_snap = 0.0
        recent_plan = WeeklyStudyPlan.query.filter_by(student_id=student_id, week_start=week_start).first()
        if recent_plan:
            allocated = sum(sub.allocated_hours for sub in recent_plan.subjects)
            if allocated > 0:
                completed = sum(sum(log.hours_completed for log in sub.sessions) for sub in recent_plan.subjects)
                comp_snap = min(100.0, (completed / allocated) * 100)

        new_intervention = MentorIntervention(
            student_id=student_id,
            mentor_id=mentor_id,
            week_start=week_start,
            risk_snapshot=risk_snap,
            compliance_snapshot=comp_snap,
            intervention_type=intervention_type,
            notes=notes,
            locked=True
        )
        db.session.add(new_intervention)
        db.session.commit()

        return jsonify({'success': True, 'message': 'Intervention logged successfully'}), 200

    except Exception as e:
        import traceback
        traceback.print_exc()
        return jsonify({'success': False, 'message': str(e)}), 500

@app.route('/api/intervention/mentor/<int:mentor_id>', methods=['GET'])
def api_get_mentor_interventions(mentor_id):
    try:
        today = date.today()
        week_start = today - timedelta(days=today.weekday())
        
        interventions = MentorIntervention.query.filter_by(
            mentor_id=mentor_id,
            week_start=week_start
        ).all()
        
        logged_map = {}
        for interv in interventions:
            logged_map[interv.student_id] = True
            
        return jsonify({'success': True, 'data': logged_map}), 200
    except Exception as e:
        import traceback
        traceback.print_exc()
        return jsonify({'success': False, 'message': str(e)}), 500


# ============= ACADEMIC LIFECYCLE MANAGEMENT API ROUTES =============

@app.route('/api/admin/courses', methods=['GET'])
def api_get_courses():
    """Get all courses"""
    try:
        courses = Course.query.all()
        result = []
        for course in courses:
            result.append({
                'id': course.id,
                'name': course.name,
                'duration_years': getattr(course, 'duration_years', 4)  # Default to 4 if not set
            })
        
        return jsonify({'success': True, 'data': result}), 200
    except Exception as e:
        return jsonify({'success': False, 'message': str(e)}), 500


@app.route('/api/admin/course/create', methods=['POST'])
def api_create_course():
    """Create a new course"""
    try:
        data = request.get_json()
        name = data.get('name')
        duration_years = data.get('duration_years', 4)
        
        if not name:
            return jsonify({'success': False, 'message': 'Course name is required'}), 400
        
        # Check if course already exists
        existing_course = Course.query.filter_by(name=name).first()
        if existing_course:
            return jsonify({'success': False, 'message': 'Course already exists'}), 400
        
        new_course = Course(name=name, duration_years=duration_years)
        db.session.add(new_course)
        db.session.commit()
        
        return jsonify({
            'success': True, 
            'message': f'Course {name} created successfully',
            'data': {
                'id': new_course.id,
                'name': new_course.name,
                'duration_years': new_course.duration_years
            }
        }), 200
    except Exception as e:
        db.session.rollback()
        return jsonify({'success': False, 'message': str(e)}), 500


@app.route('/api/admin/batches', methods=['GET'])
def api_get_batches():
    """Get all batches with course information"""
    try:
        batches = db.session.query(Batch, Course).join(Course).all()
        result = []
        current_year = datetime.now().year
        
        for batch, course in batches:
            result.append({
                'id': batch.id,
                'course_name': course.name,
                'course_id': course.id,
                'start_year': batch.start_year,
                'end_year': batch.end_year,
                'status': batch.status,
                'is_completed': current_year >= batch.end_year and batch.status == 'active'
            })
        
        return jsonify({'success': True, 'data': result}), 200
    except Exception as e:
        return jsonify({'success': False, 'message': str(e)}), 500


@app.route('/api/admin/batch/create', methods=['POST'])
def api_create_batch():
    """Create a new batch with auto-calculated end_year"""
    try:
        data = request.get_json()
        course_id = data.get('course_id')
        start_year = data.get('start_year')
        
        if not course_id or not start_year:
            return jsonify({'success': False, 'message': 'Course ID and Start Year are required'}), 400
        
        # Get course duration
        course = Course.query.get(course_id)
        if not course:
            return jsonify({'success': False, 'message': 'Course not found'}), 404
        
        # Calculate end_year
        end_year = start_year + course.duration_years
        
        # Check for completed batches across all departments
        current_year = datetime.now().year
        completed_batches = db.session.query(Batch, Course).join(Course).filter(
            (Batch.end_year <= current_year) & (Batch.status == 'active')
        ).all()
        
        if completed_batches:
            # Prepare list of completed batches for alert
            completed_batch_list = []
            for batch, course in completed_batches:
                batch_info = f"{course.name} {batch.start_year}-{batch.end_year}"
                completed_batch_list.append(batch_info)
            
            return jsonify({
                'success': True,
                'requires_confirmation': True,
                'completed_batches': completed_batch_list,
                'new_batch_data': {
                    'course_id': course_id,
                    'start_year': start_year,
                    'end_year': end_year
                }
            }), 200
        
        # Create the new batch
        new_batch = Batch(
            course_id=course_id,
            start_year=start_year,
            end_year=end_year,
            status='active'
        )
        
        db.session.add(new_batch)
        db.session.commit()
        
        return jsonify({
            'success': True,
            'message': f'Batch {course.name} {start_year}-{end_year} created successfully',
            'data': {
                'id': new_batch.id,
                'course_name': course.name,
                'start_year': start_year,
                'end_year': end_year
            }
        }), 200
    except Exception as e:
        db.session.rollback()
        return jsonify({'success': False, 'message': str(e)}), 500


@app.route('/api/admin/batch/confirm_completion', methods=['POST'])
def api_confirm_batch_completion():
    """Confirm completion of batches and move students to alumni"""
    try:
        data = request.get_json()
        confirmed = data.get('confirmed', False)
        
        if not confirmed:
            return jsonify({'success': False, 'message': 'Confirmation required'}), 400
        
        # Find all completed batches (end_year <= current_year and status is active)
        current_year = datetime.now().year
        completed_batches = Batch.query.filter(
            (Batch.end_year <= current_year) & (Batch.status == 'active')
        ).all()
        
        if not completed_batches:
            return jsonify({'success': False, 'message': 'No completed batches found'}), 404
        
        # Process each completed batch
        moved_student_count = 0
        for batch in completed_batches:
            # Update batch status to completed
            batch.status = 'completed'
            
            # Get students in this batch
            students = Student.query.filter_by(batch_id=batch.id).all()
            
            for student in students:
                # Create alumni record
                alumni_record = AlumniStudent(
                    admission_number=student.admission_number,
                    name=student.full_name,
                    email=student.email,
                    department=student.branch,
                    course_id=student.batch_info.course_id if student.batch_info else None,
                    batch_id=student.batch_id,
                    mentor_id=student.mentor_id,
                    passout_year=batch.end_year
                )
                db.session.add(alumni_record)
                
                # Create mentor history record
                if student.mentor_id:
                    mentor_history = AlumniMentorHistory(
                        admission_number=student.admission_number,
                        mentor_id=student.mentor_id,
                        start_date=datetime.now(),
                        end_date=datetime.now()
                    )
                    db.session.add(mentor_history)
                
                # Update student record
                student.status = 'alumni'
                student.mentor_id = None
                student.passout_year = batch.end_year
            
            moved_student_count += len(students)
        
        db.session.commit()
        
        return jsonify({
            'success': True,
            'message': f'Moved {moved_student_count} students to alumni from {len(completed_batches)} batches'
        }), 200
    except Exception as e:
        db.session.rollback()
        return jsonify({'success': False, 'message': str(e)}), 500


# Update the mentor allocation logic to work with the new batch system
@app.route('/api/admin/mentorship/allocate', methods=['POST'])
def api_allocate_mentors():
    try:
        data = request.get_json()
        department = data.get('department')
        batch_label = data.get('batch')  # This could be "MCA 2024-2026", "2024-2026", or None
        
        if not department:
            return jsonify({'success': False, 'message': 'Department required'}), 400
        
        from models import Batch
        from services.batch_service import extract_year_range, redistribute_mentors

        # ── Case 1: No batch specified → redistribute ALL students in dept ──
        if not batch_label:
            # Get all active batches in any department (we'll filter by student branch)
            all_batches = Batch.query.filter_by(status='active').all()
            total_students_moved = 0
            total_mentors_used = 0
            errors = []
            for b in all_batches:
                batch_lbl = f"{b.start_year}-{b.end_year}"
                res = redistribute_mentors(
                    department=department,
                    batch_id=b.id,
                    batch_label=batch_lbl,
                    mode="full"
                )
                if res.get('error'):
                    errors.append(res['error'])
                else:
                    total_students_moved += res.get('total_students', 0)
                    total_mentors_used = max(total_mentors_used, res.get('total_mentors', 0))
            
            if total_students_moved == 0 and errors:
                return jsonify({'success': False, 'message': '; '.join(errors)}), 500
            
            return jsonify({
                'success': True,
                'message': f"Successfully allocated {total_students_moved} students across {total_mentors_used} mentors in {department}"
            }), 200

        # ── Case 2: Specific batch provided ─────────────────────────────────
        target_years = extract_year_range(batch_label)
        
        if not target_years:
            return jsonify({
                'success': False,
                'message': f'Invalid batch format: {batch_label}'
            }), 400
        
        # Find batch_id that matches the years and has students in this department
        batch_id = None
        all_batches = Batch.query.all()
        for b in all_batches:
            if (b.start_year == target_years[0] and 
                b.end_year == target_years[1]):
                # Prefer the batch that actually has students in this department
                sample_student = Student.query.filter(
                    Student.branch.ilike(department.strip()),
                    Student.batch_id == b.id
                ).first()
                if sample_student:
                    batch_id = b.id
                    break
        
        if not batch_id:
            # Fallback: take any batch with matching years
            for b in all_batches:
                if (b.start_year == target_years[0] and 
                    b.end_year == target_years[1]):
                    batch_id = b.id
                    break
        
        if not batch_id:
            return jsonify({
                'success': False,
                'message': f'No matching batch found for {batch_label}'
            }), 404
        
        clean_batch_label = f"{target_years[0]}-{target_years[1]}"
        
        result = redistribute_mentors(
            department=department,
            batch_id=batch_id,
            batch_label=clean_batch_label,
            mode="full"
        )
        
        if result.get("error"):
            return jsonify({
                'success': False,
                'message': result.get("error")
            }), 500
        
        return jsonify({
            'success': True,
            'message': f"Successfully allocated {result.get('total_students', 0)} students to {result.get('total_mentors', 0)} mentors",
            'distribution': result.get('distribution', {})
        }), 200
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'success': False, 'message': str(e)}), 500



# ============= ALUMNI TRACKING API ROUTES =============

@app.route('/api/admin/alumni/departments', methods=['GET'])
def api_get_alumni_departments():
    """Get all departments with alumni counts"""
    try:
        # Get distinct departments with alumni
        departments = db.session.query(
            AlumniStudent.department,
            db.func.count(AlumniStudent.id).label('alumni_count')
        ).group_by(AlumniStudent.department).all()
        
        result = []
        for dept, count in departments:
            if dept:  # Skip null departments
                result.append({
                    'department': dept,
                    'alumni_count': count
                })
        
        return jsonify({
            'success': True,
            'data': result
        }), 200
    except Exception as e:
        return jsonify({'success': False, 'message': str(e)}), 500


@app.route('/api/admin/alumni/batches', methods=['GET'])
def api_get_alumni_batches():
    """Get all batches with alumni counts"""
    try:
        # Join AlumniStudent with Batch to get batch information
        batch_data = db.session.query(
            Batch,
            Course,
            db.func.count(AlumniStudent.id).label('alumni_count')
        ).join(
            AlumniStudent, 
            Batch.id == AlumniStudent.batch_id
        ).join(
            Course,
            Batch.course_id == Course.id
        ).group_by(
            Batch.id, 
            Course.id
        ).all()
        
        result = []
        for batch, course, count in batch_data:
            result.append({
                'batch_id': batch.id,
                'course_name': course.name,
                'start_year': batch.start_year,
                'end_year': batch.end_year,
                'alumni_count': count
            })
        
        return jsonify({
            'success': True,
            'data': result
        }), 200
    except Exception as e:
        return jsonify({'success': False, 'message': str(e)}), 500


@app.route('/api/admin/alumni/search', methods=['GET'])
def api_search_alumni():
    """Search alumni by various criteria"""
    try:
        # Get query parameters
        search_term = request.args.get('search', '').strip()
        department = request.args.get('department', '').strip()
        batch_year = request.args.get('batch_year', '').strip()
        page = int(request.args.get('page', 1))
        per_page = int(request.args.get('per_page', 20))
        
        # Start building the query - explicitly specify the joins
        query = db.session.query(AlumniStudent, Batch, Course).select_from(AlumniStudent).join(Batch, AlumniStudent.batch_id == Batch.id).join(Course, Batch.course_id == Course.id)
        
        # Apply filters
        if search_term:
            search_filter = (
                AlumniStudent.name.ilike(f'%{search_term}%') |
                AlumniStudent.admission_number.ilike(f'%{search_term}%') |
                AlumniStudent.email.ilike(f'%{search_term}%')
            )
            query = query.filter(search_filter)
        
        if department:
            query = query.filter(AlumniStudent.department.ilike(f'%{department}%'))
        
        if batch_year:
            try:
                batch_year_int = int(batch_year)
                query = query.filter(Batch.end_year == batch_year_int)
            except ValueError:
                pass  # Invalid year, ignore filter
        
        # Paginate results
        total = query.count()
        alumni_data = query.offset((page - 1) * per_page).limit(per_page).all()
        
        # Format results
        result = []
        for alum, batch, course in alumni_data:
            result.append({
                'id': alum.id,
                'admission_number': alum.admission_number,
                'name': alum.name,
                'email': alum.email,
                'department': alum.department,
                'course_name': course.name if course else 'N/A',
                'batch_start_year': batch.start_year if batch else None,
                'batch_end_year': batch.end_year if batch else None,
                'passout_year': alum.passout_year,
                'created_at': alum.created_at.strftime('%Y-%m-%d') if alum.created_at else None
            })
        
        return jsonify({
            'success': True,
            'data': result,
            'pagination': {
                'current_page': page,
                'per_page': per_page,
                'total': total,
                'pages': (total + per_page - 1) // per_page
            }
        }), 200
    except Exception as e:
        return jsonify({'success': False, 'message': str(e)}), 500


@app.route('/api/admin/alumni/department/<department>/batches', methods=['GET'])
def api_get_alumni_by_department_batches(department):
    """Get batches for a specific department with alumni counts"""
    try:
        # Get batches for a specific department with alumni counts
        batch_data = db.session.query(
            Batch,
            db.func.count(AlumniStudent.id).label('alumni_count')
        ).join(
            AlumniStudent, 
            Batch.id == AlumniStudent.batch_id
        ).filter(
            AlumniStudent.department.ilike(f'%{department}%')
        ).group_by(
            Batch.id
        ).all()
        
        result = []
        for batch, count in batch_data:
            result.append({
                'batch_id': batch.id,
                'start_year': batch.start_year,
                'end_year': batch.end_year,
                'alumni_count': count,
                'status': batch.status
            })
        
        return jsonify({
            'success': True,
            'data': result
        }), 200
    except Exception as e:
        return jsonify({'success': False, 'message': str(e)}), 500


@app.route('/api/admin/alumni/department/<department>/batch/<int:batch_id>', methods=['GET'])
def api_get_alumni_by_department_batch(department, batch_id):
    """Get alumni for a specific department and batch"""
    try:
        # Get alumni for specific department and batch
        alumni = AlumniStudent.query.join(Batch).filter(
            AlumniStudent.department.ilike(f'%{department}%'),
            AlumniStudent.batch_id == batch_id
        ).all()
        
        result = []
        for alum in alumni:
            result.append({
                'id': alum.id,
                'admission_number': alum.admission_number,
                'name': alum.name,
                'email': alum.email,
                'passout_year': alum.passout_year,
                'created_at': alum.created_at.strftime('%Y-%m-%d') if alum.created_at else None
            })
        
        return jsonify({
            'success': True,
            'data': result
        }), 200
    except Exception as e:
        return jsonify({'success': False, 'message': str(e)}), 500


from routes.admin_routes import admin_bp
from routes.auth_routes import auth_bp
from routes.student_routes import student_bp
from routes.mentor_routes import mentor_bp
from routes.subject_handler_routes import subject_handler_bp
from routes.hod_routes import hod_bp
from sqlalchemy import text


app.register_blueprint(admin_bp)
app.register_blueprint(auth_bp)
app.register_blueprint(student_bp)
app.register_blueprint(mentor_bp)
app.register_blueprint(subject_handler_bp)
app.register_blueprint(hod_bp)

# ═══════════════════════════════════════════════════════
# MENTORING SESSION ROUTES  (Student + Mentor)
# ═══════════════════════════════════════════════════════

# Slot definitions

SYSTEM_SLOTS = ["09:00", "10:00", "11:00", "12:00", "13:00", "14:00", "15:00", "16:00"]   # 9 AM – 5 PM
MENTOR_SLOTS = ["17:00", "18:00"]                                                            # 5 PM – 7 PM
ALL_SLOTS    = SYSTEM_SLOTS + MENTOR_SLOTS


def _is_mentor_busy_from_timetable(mentor_id, weekday_name, slot_hour):
    """Check if mentor has a class in the timetable at the given weekday and hour."""
    faculty = Faculty.query.get(mentor_id)
    if not faculty:
        return False
    # Map slot hour string → period number (rough mapping: period 1=9h, 2=10h, …)
    try:
        hour = int(slot_hour.split(":")[0])
        period = hour - 8   # period 1 starts at 9 h
    except Exception:
        return False

    entry = Timetable.query.filter_by(
        handler_id=mentor_id,
        day=weekday_name,
        period=period
    ).first()
    return entry is not None


def _slot_available(mentor_id, date_obj, slot):
    """Returns True when the slot is available for booking."""
    weekday = date_obj.strftime("%A")   # e.g. "Monday"

    # 1. Mentor leave check
    leaves = MentorLeave.query.filter_by(mentor_id=mentor_id, leave_date=date_obj).all()
    for leave in leaves:
        if leave.from_time is None:          # whole-day leave
            return False
        try:
            lf = int(leave.from_time.split(":")[0])
            lt = int(leave.to_time.split(":")[0])
            sh = int(slot.split(":")[0])
            if lf <= sh < lt:
                return False
        except Exception:
            pass

    # 2. For system slots (9-17): check timetable clash
    if slot in SYSTEM_SLOTS:
        if _is_mentor_busy_from_timetable(mentor_id, weekday, slot):
            return False

    # 3. Already booked (Pending or Approved)
    existing = MentoringSession.query.filter_by(
        mentor_id=mentor_id, date=date_obj, time_slot=slot
    ).filter(MentoringSession.status.in_(["Pending", "Approved"])).first()
    if existing:
        return False

    return True


# ─── Student: get my mentor info ───────────────────────
@app.route('/api/student/my-mentor/<admission_number>', methods=['GET'])
def api_student_my_mentor(admission_number):
    try:
        student = Student.query.get(admission_number)
        if not student:
            return jsonify({'success': False, 'message': 'Student not found'}), 404
        if not student.mentor_id:
            return jsonify({'success': True, 'data': None, 'message': 'No mentor assigned'}), 200
        mentor = Faculty.query.get(student.mentor_id)
        if not mentor:
            return jsonify({'success': True, 'data': None}), 200
        return jsonify({'success': True, 'data': {
            'id': mentor.id,
            'name': mentor.name,
            'email': mentor.email,
            'designation': mentor.designation,
            'department': mentor.department,
        }}), 200
    except Exception as e:
        return jsonify({'success': False, 'message': str(e)}), 500


# ─── Student: get available slots for a date ───────────
@app.route('/api/session/available-slots', methods=['GET'])
def api_available_slots():
    """
    Query params: mentor_id, date (YYYY-MM-DD)
    Returns list of { slot, slot_type, available }
    Slot is available if mentor is not on leave, no timetable clash (for system slots),
    and no existing Pending/Approved booking.
    Date must be tomorrow → today + 28 days.
    """
    try:
        mentor_id = request.args.get('mentor_id', type=int)
        date_str  = request.args.get('date', '')
        if not mentor_id or not date_str:
            return jsonify({'success': False, 'message': 'mentor_id and date are required'}), 400

        from datetime import date as date_type, timedelta
        try:
            date_obj = date_type.fromisoformat(date_str)
        except ValueError:
            return jsonify({'success': False, 'message': 'Invalid date format'}), 400

        today = date_type.today()
        min_date = today + timedelta(days=1)
        max_date = today + timedelta(days=28)
        if not (min_date <= date_obj <= max_date):
            return jsonify({'success': False, 'message': 'Date must be between tomorrow and 28 days from today'}), 400

        result = []
        for slot in ALL_SLOTS:
            slot_type = 'mentor' if slot in MENTOR_SLOTS else 'system'
            avail = _slot_available(mentor_id, date_obj, slot)
            result.append({'slot': slot, 'slot_type': slot_type, 'available': avail})

        return jsonify({'success': True, 'data': result}), 200
    except Exception as e:
        return jsonify({'success': False, 'message': str(e)}), 500


# ─── Student: book a session ───────────────────────────
@app.route('/api/session/book', methods=['POST'])
def api_book_session():
    """
    Body: { admission_number, mentor_id, date, time_slot, session_type, notes }
    System slots (9-17) are auto-approved; Mentor slots (17-19) stay Pending until mentor approves.
    """
    try:
        data = request.get_json()
        admission_number = data.get('admission_number')
        mentor_id   = data.get('mentor_id')
        date_str    = data.get('date')
        time_slot   = data.get('time_slot')
        session_type = data.get('session_type', 'Online')
        notes       = data.get('notes', '')

        if not all([admission_number, mentor_id, date_str, time_slot]):
            return jsonify({'success': False, 'message': 'Missing required fields'}), 400

        from datetime import date as date_type, timedelta
        date_obj = date_type.fromisoformat(date_str)
        today    = date_type.today()
        if not (today + timedelta(days=1) <= date_obj <= today + timedelta(days=28)):
            return jsonify({'success': False, 'message': 'Invalid booking date'}), 400

        if time_slot not in ALL_SLOTS:
            return jsonify({'success': False, 'message': 'Invalid time slot'}), 400

        if not _slot_available(int(mentor_id), date_obj, time_slot):
            return jsonify({'success': False, 'message': 'Slot is not available'}), 409

        slot_type = 'mentor' if time_slot in MENTOR_SLOTS else 'system'
        # System slots: auto-approve; Mentor slots stay Pending
        status = 'Approved' if slot_type == 'system' else 'Pending'

        new_session = MentoringSession(
            student_admission_number=admission_number,
            mentor_id=int(mentor_id),
            date=date_obj,
            time_slot=time_slot,
            slot_type=slot_type,
            session_type=session_type,
            status=status,
            notes=notes,
        )
        db.session.add(new_session)
        db.session.commit()

        return jsonify({'success': True, 'message': f'Session booked. Status: {status}', 'data': {
            'id': new_session.id, 'status': new_session.status, 'date': date_str, 'time_slot': time_slot
        }}), 201
    except Exception as e:
        db.session.rollback()
        return jsonify({'success': False, 'message': str(e)}), 500




# ─── Student: list my sessions ─────────────────────────
@app.route('/api/session/student/<admission_number>', methods=['GET'])
def api_student_sessions(admission_number):
    """List all mentoring sessions for a student — uses raw SQL to match actual DB columns."""
    try:
        from sqlalchemy import text
        with db.engine.connect() as conn:
            rows = conn.execute(text(
                "SELECT ms.id, ms.date, ms.time, ms.type, ms.status, "
                "ms.meeting_link, ms.remarks, ms.mentor_id, "
                "f.name as mentor_name "
                "FROM mentoring_sessions ms "
                "LEFT JOIN faculty f ON f.id = ms.mentor_id "
                "WHERE ms.student_admission_number = :adm "
                "ORDER BY ms.date DESC, ms.time DESC"
            ), {'adm': admission_number}).fetchall()

        result = []
        for r in rows:
            result.append({
                'id': r[0],
                'date': r[1].isoformat() if hasattr(r[1], 'isoformat') else str(r[1]),
                'time_slot': r[2] or '',
                'slot_type': 'mentor',
                'session_type': r[3] or 'Offline',
                'status': r[4] or 'Pending',
                'meeting_link': r[5] or '',
                'notes': r[6] or '',
                'mentor_name': r[8] or 'Your Mentor',
                'calendar_link': '',
            })
        return jsonify({'success': True, 'data': result}), 200
    except Exception as e:
        return jsonify({'success': False, 'message': str(e)}), 500


# ─── Student: cancel or request reschedule ─────────────────────────
@app.route('/api/session/<int:session_id>/cancel', methods=['POST'])
def api_cancel_session(session_id):
    """Student cancels pending session OR requests reschedule for approved session with new date/time preference."""
    try:
        data = request.get_json() or {}
        admission_number = data.get('admission_number')
        reason = data.get('reason', '')  # Required for approved sessions
        preferred_date = data.get('preferred_date')  # Optional: suggested new date
        preferred_time = data.get('preferred_time')  # Optional: suggested new time

        if not admission_number:
            return jsonify({'success': False, 'message': 'admission_number is required'}), 400

        # Use 'ms_obj' to avoid shadowing Flask's session import
        ms_obj = MentoringSession.query.get(session_id)
        if not ms_obj:
            return jsonify({'success': False, 'message': 'Session not found'}), 404
        if ms_obj.student_admission_number != admission_number:
            return jsonify({'success': False, 'message': 'Unauthorized'}), 403
        if ms_obj.status == 'Cancelled':
            return jsonify({'success': False, 'message': 'Already cancelled'}), 400

        # For approved sessions: create reschedule request
        if ms_obj.status == 'Approved':
            if not reason:
                return jsonify({'success': False, 'message': 'Reason is required for reschedule requests'}), 400

            # Build reschedule request note
            reschedule_note = f'[Reschedule Requested by Student: {reason}]'
            if preferred_date:
                reschedule_note += f' Preferred Date: {preferred_date}'
                try:
                    from datetime import date as date_type
                    ms_obj.date = date_type.fromisoformat(preferred_date)
                except Exception:
                    pass
            if preferred_time:
                reschedule_note += f' Preferred Time: {preferred_time}'
                ms_obj.time_slot = preferred_time

            # Append to existing notes (keep old notes, add reschedule info)
            ms_obj.notes = (ms_obj.notes or '').strip() + '\n' + reschedule_note
            ms_obj.status = 'Pending'  # Back to pending for mentor review
            message = 'Reschedule request sent to your mentor. They will review and respond.'
        else:
            # For pending sessions: just cancel directly
            ms_obj.status = 'Cancelled'
            message = 'Session cancelled successfully'

        db.session.commit()
        return jsonify({'success': True, 'message': message}), 200
    except Exception as e:
        db.session.rollback()
        return jsonify({'success': False, 'message': str(e)}), 500


# ─── Mentor: list pending/upcoming sessions ─────────────
@app.route('/api/session/mentor/<int:mentor_id>', methods=['GET'])
def api_mentor_sessions(mentor_id):
    try:
        from datetime import date as date_type
        status_filter = request.args.get('status')  # optional filter
        
        # Fetch sessions assigned to mentor OR where student's assigned mentor is this mentor
        q = MentoringSession.query.outerjoin(Student, MentoringSession.student_admission_number == Student.admission_number).filter(
            db.or_(
                MentoringSession.mentor_id == mentor_id,
                Student.mentor_id == mentor_id
            )
        )
        
        if status_filter:
            q = q.filter(MentoringSession.status == status_filter)
        sessions = q.order_by(MentoringSession.date.asc(), MentoringSession.time_slot.asc()).all()

        result = []
        for s in sessions:
            student_name = s.student.full_name if s.student else s.student_admission_number
            result.append({
                'id': s.id,
                'date': s.date.isoformat(),
                'time_slot': s.time_slot,
                'slot_type': s.slot_type,
                'session_type': s.session_type,
                'status': s.status,
                'student_name': student_name,
                'student_id': s.student_admission_number,
                'notes': s.notes,
                'meeting_link': s.meeting_link,
            })
        return jsonify({'success': True, 'data': result}), 200
    except Exception as e:
        return jsonify({'success': False, 'message': str(e)}), 500


# ─── Mentor: approve / reject / reschedule a session ─────────────────
@app.route('/api/session/<int:session_id>/respond', methods=['POST'])
def api_respond_session(session_id):
    """Mentor approves/rejects/cancels a session. Also handles reschedule requests from students."""
    try:
        data = request.get_json() or {}
        action       = data.get('action')           # 'approve' | 'reject' | 'cancel' | 'reschedule'
        mentor_id    = data.get('mentor_id')
        meeting_link = data.get('meeting_link', '')
        new_date     = data.get('date')             # For reschedule action
        new_time     = data.get('time_slot')        # For reschedule action
        resp_message = data.get('message', '')      # Optional message from mentor

        if not action or not mentor_id:
            return jsonify({'success': False, 'message': 'action and mentor_id are required'}), 400

        # Use 'ms_obj' to avoid shadowing Flask's session import
        ms_obj = MentoringSession.query.get(session_id)
        if not ms_obj:
            return jsonify({'success': False, 'message': 'Session not found'}), 404

        authorized = False
        if ms_obj.mentor_id and int(ms_obj.mentor_id) == int(mentor_id):
            authorized = True
        elif ms_obj.student and ms_obj.student.mentor_id and int(ms_obj.student.mentor_id) == int(mentor_id):
            authorized = True

        if not authorized:
            return jsonify({'success': False, 'message': 'Unauthorized'}), 403

        # Auto-sync mentor_id if missing
        if not ms_obj.mentor_id:
            ms_obj.mentor_id = int(mentor_id)

        if action == 'approve':
            ms_obj.status = 'Approved'
            if meeting_link:
                ms_obj.meeting_link = meeting_link
        elif action == 'reject':
            ms_obj.status = 'Rejected'
        elif action == 'cancel':
            ms_obj.status = 'Cancelled'
        elif action == 'reschedule':
            # Mentor accepts student's reschedule request with new time
            if new_date:
                try:
                    from datetime import date as date_type
                    ms_obj.date = date_type.fromisoformat(new_date)
                except ValueError:
                    return jsonify({'success': False, 'message': 'Invalid date format'}), 400
            if new_time:
                ms_obj.time_slot = new_time
            if resp_message:
                ms_obj.notes = (ms_obj.notes or '').strip() + f'\n[Mentor Response: {resp_message}]'
            ms_obj.status = 'Approved'
        else:
            return jsonify({'success': False, 'message': 'Invalid action. Use: approve, reject, cancel, or reschedule'}), 400

        db.session.commit()

        action_label = {'approve': 'approved', 'reject': 'rejected', 'cancel': 'cancelled', 'reschedule': 'rescheduled and approved'}.get(action, action)
        return jsonify({'success': True, 'message': f'Session {action_label} successfully'}), 200
    except Exception as e:
        db.session.rollback()
        return jsonify({'success': False, 'message': str(e)}), 500




# ─── Mentor: mark leave / unavailability ─────────────────
@app.route('/api/mentor/leave', methods=['POST'])
def api_mentor_mark_leave():
    try:
        data = request.get_json()
        mentor_id  = data.get('mentor_id')
        date_str   = data.get('date')
        from_time  = data.get('from_time')    # None → whole day
        to_time    = data.get('to_time')
        reason     = data.get('reason', '')

        if not mentor_id or not date_str:
            return jsonify({'success': False, 'message': 'mentor_id and date are required'}), 400

        from datetime import date as date_type
        date_obj = date_type.fromisoformat(date_str)

        leave = MentorLeave(
            mentor_id=int(mentor_id),
            leave_date=date_obj,
            from_time=from_time,
            to_time=to_time,
            reason=reason,
        )
        db.session.add(leave)

        # Auto-cancel all Pending/Approved sessions on that date that fall within the leave window
        sessions = MentoringSession.query.filter_by(
            mentor_id=int(mentor_id), date=date_obj
        ).filter(MentoringSession.status.in_(["Pending", "Approved"])).all()

        cancelled = 0
        for s in sessions:
            if from_time is None:
                s.status = 'Cancelled'
                cancelled += 1
            else:
                try:
                    lf = int(from_time.split(":")[0])
                    lt = int(to_time.split(":")[0])
                    sh = int(s.time_slot.split(":")[0])
                    if lf <= sh < lt:
                        s.status = 'Cancelled'
                        cancelled += 1
                except Exception:
                    pass

        db.session.commit()
        return jsonify({
            'success': True,
            'message': f'Leave marked. {cancelled} session(s) auto-cancelled.'
        }), 201
    except Exception as e:
        db.session.rollback()
        return jsonify({'success': False, 'message': str(e)}), 500


# ─── Mentor: list / delete leaves ────────────────────────
@app.route('/api/mentor/<int:mentor_id>/leaves', methods=['GET'])
def api_mentor_leaves(mentor_id):
    try:
        from datetime import date as date_type
        leaves = MentorLeave.query.filter_by(mentor_id=mentor_id).order_by(MentorLeave.leave_date.asc()).all()
        result = [{
            'id': l.id,
            'date': l.leave_date.isoformat(),
            'from_time': l.from_time,
            'to_time': l.to_time,
            'reason': l.reason,
        } for l in leaves]
        return jsonify({'success': True, 'data': result}), 200
    except Exception as e:
        return jsonify({'success': False, 'message': str(e)}), 500


@app.route('/api/mentor/leave/<int:leave_id>', methods=['DELETE'])
def api_delete_mentor_leave(leave_id):
    try:
        leave = MentorLeave.query.get(leave_id)
        if not leave:
            return jsonify({'success': False, 'message': 'Leave not found'}), 404
        db.session.delete(leave)
        db.session.commit()
        return jsonify({'success': True, 'message': 'Leave removed'}), 200
    except Exception as e:
        db.session.rollback()
        return jsonify({'success': False, 'message': str(e)}), 500




# ════════════════════════════════════════════════════════════════
# AI INSIGHTS ROUTES
# Priority: Gemini 2.0 Flash (free) → Gemini Flash Lite → Smart fallback
# ════════════════════════════════════════════════════════════════

_GEMINI_MODELS = ['models/gemini-2.5-flash', 'models/gemini-2.0-flash', 'models/gemini-2.0-flash-001', 'models/gemini-2.5-flash-lite']

def _is_valid_key(key: str, bad_fragments=()) -> bool:
    """Returns True if key looks like a real API key."""
    if not key or len(key) < 20:
        return False
    low = key.lower()
    generics = ('placeholder', 'your-', 'your_', 'example', 'change-me', 'api-key-here')
    if any(b in low for b in generics + bad_fragments):
        return False
    return True


def _get_gemini_client():
    """Return a working (client, model_name) tuple or (None, None)."""
    key = os.getenv('GEMINI_API_KEY', '')
    if not _is_valid_key(key):
        return None, None
    try:
        from google import genai as _genai
        client = _genai.Client(api_key=key)
        return client, 'gemini-2.0-flash'
    except Exception:
        return None, None


def _gemini_complete(client, model: str, system_prompt: str, user_prompt: str,
                     history=None, max_tokens: int = 800) -> str:
    """Call Gemini new SDK. Retries with lighter model on rate-limit."""
    from google import genai as _genai
    from google.genai import types as _gtypes

    # Build content list
    contents = []
    for h in (history or [])[-10:]:
        role = 'user' if h.get('role') == 'user' else 'model'
        contents.append(_gtypes.Content(role=role, parts=[_gtypes.Part(text=h.get('content', ''))]))
    contents.append(_gtypes.Content(role='user', parts=[_gtypes.Part(text=user_prompt)]))

    config = _gtypes.GenerateContentConfig(
        system_instruction=system_prompt,
        max_output_tokens=max_tokens,
        temperature=0.75,
    )

    models_to_try = [model] + [m for m in _GEMINI_MODELS if m != model]
    last_err = None
    for m in models_to_try:
        try:
            resp = client.models.generate_content(model=m, contents=contents, config=config)
            return resp.text
        except Exception as e:
            err_str = str(e)
            # Rate-limit → try next model
            if '429' in err_str or 'quota' in err_str.lower() or 'rate' in err_str.lower():
                last_err = e
                continue
            raise  # Other errors bubble up
    raise last_err or RuntimeError("All Gemini models failed")


def _get_ai_provider():
    """Returns ('gemini', (client, model)) | (None, None)."""
    client, model = _get_gemini_client()
    if client:
        return 'gemini', (client, model)
    return None, None


def _ai_complete(provider, client_tuple, system_prompt: str, user_prompt: str,
                 history=None, max_tokens: int = 800) -> str:
    """Unified completion — currently wraps Gemini."""
    if provider == 'gemini':
        client, model = client_tuple
        return _gemini_complete(client, model, system_prompt, user_prompt, history, max_tokens)
    raise ValueError("No AI provider available")


# Backward-compat stub (used by older fallback paths)
def _get_openai_client():
    return None



def _normalize_batch_label(batch: str) -> str:
    if not batch:
        return ""
    return (
        batch.replace("MCA ", "")
             .replace("IMCA ", "")
             .replace("MBA ", "")
             .strip()
    )


def _escape_like(value: str) -> str:
    return value.replace("\\", "\\\\").replace("%", "\\%").replace("_", "\\_")


def _build_student_context(admission_number: str) -> dict:
    """Gather all student metrics and return a structured context dict."""
    student = Student.query.get(admission_number)
    if not student:
        return {}

    ctx: dict = {
        "name": student.full_name,
        "admission_number": admission_number,
        "department": student.branch or "N/A",
        "batch": student.batch or "N/A",
    }

    # Analytics
    sa = StudentAnalytics.query.filter_by(student_id=admission_number).first()
    if sa:
        ctx["attendance_pct"]     = round(sa.attendance_percentage, 1)
        ctx["attendance_trend"]   = "improving" if sa.attendance_slope > 0.02 else ("declining" if sa.attendance_slope < -0.05 else "stable")
        ctx["avg_marks"]          = round(sa.avg_internal_marks, 1)
        ctx["marks_trend"]        = "improving" if sa.marks_slope > 5 else ("declining" if sa.marks_slope < -5 else "stable")
        ctx["failure_count"]      = sa.failure_count
        ctx["risk_score"]         = round(sa.risk_score, 1)
        ctx["risk_level"]         = "critical" if sa.risk_score > 70 else ("at-risk" if sa.risk_score > 40 else "stable")
        ctx["academic_status"]    = sa.status

    # Subject-level marks
    marks = InternalMark.query.filter_by(student_id=admission_number).all()
    subject_marks: dict = {}
    for m in marks:
        subj = m.subject.name if m.subject else "Unknown"
        if subj not in subject_marks:
            subject_marks[subj] = []
        subject_marks[subj].append(m.marks)
    ctx["subject_marks"] = {s: round(sum(v)/len(v), 1) for s, v in subject_marks.items() if v}

    # Attendance per subject
    atts = Attendance.query.filter_by(student_admission_number=admission_number).all()
    ctx["subject_attendance"] = {a.subject_name: round(a.percentage, 1) for a in atts if a.percentage}

    # Study plan compliance
    plan = WeeklyStudyPlan.query.filter_by(student_id=admission_number).order_by(WeeklyStudyPlan.id.desc()).first()
    if plan:
        total = sum((s.allocated_hours or 0) for s in plan.subjects) if plan.subjects else 0
        done = 0.0
        if plan.subjects:
            for s in plan.subjects:
                done += sum((log.hours_completed or 0) for log in s.sessions)
        ctx["study_plan_compliance"] = round((done / total * 100) if total else 0, 1)
        ctx["study_plan_subjects"] = [
            (s.subject.name if s.subject and s.subject.name else "Unknown Subject")
            for s in plan.subjects
        ]

    # Wellness preferences + workout consistency
    wp = StudentWellnessPreference.query.filter_by(student_id=admission_number).first()
    ctx["wellness_preferences"] = {
        "wake_time": wp.wake_time if wp and wp.wake_time else "06:00",
        "sleep_time": wp.sleep_time if wp and wp.sleep_time else "22:30",
        "workout_duration_minutes": wp.workout_duration_minutes if wp and wp.workout_duration_minutes else 30,
        "fitness_goal": wp.fitness_goal if wp and wp.fitness_goal else "general_fitness",
        "intensity_level": wp.intensity_level if wp and wp.intensity_level else "moderate",
        "home_equipment": wp.home_equipment if wp and wp.home_equipment else "none",
        "health_constraints": wp.health_constraints if wp and wp.health_constraints else "",
        "preferred_workout_time": wp.preferred_workout_time if wp and wp.preferred_workout_time else "evening",
        "weekly_workout_target": wp.weekly_workout_target if wp and wp.weekly_workout_target else 4,
    }

    today = datetime.utcnow().date()
    week_start = today - timedelta(days=today.weekday())
    week_end = week_start + timedelta(days=6)
    logs = WorkoutSessionLog.query.filter(
        WorkoutSessionLog.student_id == admission_number,
        WorkoutSessionLog.date >= week_start,
        WorkoutSessionLog.date <= week_end,
        WorkoutSessionLog.completed.is_(True)
    ).all()
    workout_sessions = len(logs)
    workout_minutes = sum((l.duration_minutes or 0) for l in logs)
    target = ctx["wellness_preferences"]["weekly_workout_target"]
    ctx["workout_consistency"] = round((workout_sessions / target * 100) if target else 0, 1)
    ctx["workout_sessions_this_week"] = workout_sessions
    ctx["workout_minutes_this_week"] = workout_minutes

    # Timetable context
    timetable_entries = []
    timetable_by_day = {}
    if student.branch and student.batch:
        dept = _escape_like(student.branch)
        base_batch = _escape_like(_normalize_batch_label(student.batch))
        q = Timetable.query.filter(Timetable.department.ilike(f"%{dept}%", escape="\\"))
        if base_batch:
            q = q.filter(Timetable.batch.ilike(f"%{base_batch}%", escape="\\"))
        timetable_entries = q.order_by(Timetable.day, Timetable.period).all()

    for t in timetable_entries:
        day = t.day or "Unknown"
        slot = t.time_slot or (f"Period {t.period}" if t.period else "Class")
        timetable_by_day.setdefault(day, []).append(slot)

    ctx["timetable_by_day"] = timetable_by_day
    if timetable_by_day:
        ordered_days = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"]
        summary_parts = []
        for d in ordered_days:
            if d in timetable_by_day:
                summary_parts.append(f"{d}: {', '.join(timetable_by_day[d])}")
        for d, slots in timetable_by_day.items():
            if d not in ordered_days:
                summary_parts.append(f"{d}: {', '.join(slots)}")
        ctx["timetable_summary"] = "; ".join(summary_parts)
    else:
        ctx["timetable_summary"] = "No timetable data"

    return ctx


def _context_to_system_prompt(ctx: dict) -> str:
    marks_str = ", ".join(f"{s}: {v}/100" for s, v in ctx.get("subject_marks", {}).items()) or "no data"
    attend_str = ", ".join(f"{s}: {v}%" for s, v in ctx.get("subject_attendance", {}).items()) or "no data"
    compliance = ctx.get("study_plan_compliance", "N/A")
    subjects_str = ", ".join(ctx.get("study_plan_subjects", [])) or "none"
    timetable_summary = ctx.get("timetable_summary", "No timetable data")
    wp = ctx.get("wellness_preferences", {})
    wellness_str = (
        f"Wake: {wp.get('wake_time', '06:00')}, Sleep: {wp.get('sleep_time', '22:30')}, "
        f"Goal: {wp.get('fitness_goal', 'general_fitness')}, "
        f"Intensity: {wp.get('intensity_level', 'moderate')}, "
        f"Preferred Workout: {wp.get('preferred_workout_time', 'evening')}, "
        f"Duration: {wp.get('workout_duration_minutes', 30)} mins, "
        f"Equipment: {wp.get('home_equipment', 'none')}"
    )

    return f"""You are MentorAI — a highly empathetic, intelligent academic advisor embedded in a student academic management system.

STUDENT PROFILE (use this to give personalised, data-driven advice):
- Name: {ctx.get('name', 'Student')}
- Department: {ctx.get('department', 'N/A')}
- Batch: {ctx.get('batch', 'N/A')}
- Overall Attendance: {ctx.get('attendance_pct', 'N/A')}% (trend: {ctx.get('attendance_trend', 'N/A')})
- Average Internal Marks: {ctx.get('avg_marks', 'N/A')}/100 (trend: {ctx.get('marks_trend', 'N/A')})
- Subject Marks: {marks_str}
- Subject Attendance: {attend_str}
- Risk Score: {ctx.get('risk_score', 'N/A')}/100 ({ctx.get('risk_level', 'N/A')})
- Academic Status: {ctx.get('academic_status', 'N/A')}
- Study Plan Compliance: {compliance}%
- Current Study Plan Subjects: {subjects_str}
- Timetable Summary: {timetable_summary}
- Wellness Preferences: {wellness_str}
- Workout Consistency This Week: {ctx.get('workout_consistency', 'N/A')}%

INSTRUCTIONS:
- Always refer to the student by name when appropriate.
- Ground every recommendation in the actual data above.
- Be concise, actionable, and motivating.
- If asked for a study plan, produce a structured weekly plan in Markdown.
- If asked for workout guidance, provide only general wellness guidance and include a brief note that this is not medical advice.
- If asked a general academic question, answer it clearly.
- Never hallucinate data — if something is N/A, say so honestly.
- Format responses in clean Markdown with headers, bullets, and bold text.
"""


# ─── Auto-generate insights snapshot ─────────────────────────────
@app.route('/api/ai/insights/<string:admission_number>', methods=['GET'])
def api_ai_insights(admission_number):
    """Auto-generate 4 personalised insight cards for the student."""
    provider, ai_client = _get_ai_provider()
    ctx = _build_student_context(admission_number)

    if not ctx:
        return jsonify({'success': False, 'message': 'Student not found'}), 404

    if not provider:
        insights = _fallback_insights(ctx)
        return jsonify({'success': True, 'data': insights, 'source': 'rule-based'}), 200

    try:
        import json as _json
        marks_str      = ", ".join(f"{s}: {v}" for s, v in ctx.get('subject_marks', {}).items()) or "none"
        worst_subjects = sorted(ctx.get('subject_marks', {}).items(), key=lambda x: x[1])[:2]
        best_subjects  = sorted(ctx.get('subject_marks', {}).items(), key=lambda x: x[1], reverse=True)[:2]

        sys_prompt  = "You are a JSON-generating academic advisor. Return only valid JSON arrays, no markdown fences."
        user_prompt = (
            f"Generate exactly 4 insight cards as a valid JSON array.\n"
            f"Each: title(max 6 words), body(2-3 sentences), type(warning|success|info|tip), icon(emoji).\n"
            f"Attendance: {ctx.get('attendance_pct')}% ({ctx.get('attendance_trend')})\n"
            f"Avg Marks: {ctx.get('avg_marks')}/100 ({ctx.get('marks_trend')})\n"
            f"Marks: {marks_str}\nRisk: {ctx.get('risk_level')}\n"
            f"Compliance: {ctx.get('study_plan_compliance','N/A')}%\n"
            f"Weakest: {[s for s,_ in worst_subjects]}\nStrongest: {[s for s,_ in best_subjects]}\n"
            f"Return ONLY the JSON array."
        )
        raw = _ai_complete(provider, ai_client, sys_prompt, user_prompt, max_tokens=700)
        raw = raw.strip()
        if raw.startswith('```'):
            raw = raw.split('```')[1]
            if raw.startswith('json'): raw = raw[4:]
        insights = _json.loads(raw)
        return jsonify({'success': True, 'data': insights, 'source': provider}), 200
    except Exception as e:
        insights = _fallback_insights(ctx)
        return jsonify({'success': True, 'data': insights, 'source': 'rule-based', 'note': str(e)}), 200


def _fallback_insights(ctx: dict) -> list:
    """Rule-based insights when OpenAI is not available."""
    cards = []
    att   = ctx.get('attendance_pct', 75)
    marks = ctx.get('avg_marks', 60)
    risk  = ctx.get('risk_score', 30)
    marks_dict   = ctx.get('subject_marks', {})
    attend_dict  = ctx.get('subject_attendance', {})
    compliance   = ctx.get('study_plan_compliance', 100)

    # Attendance card
    if att < 75:
        cards.append({"title": "Critical Attendance Alert", "body": f"Your overall attendance is {att}% — below the 75% minimum requirement. You risk being debarred from exams. Attend every possible class this week.", "type": "warning", "icon": "⚠️"})
    elif att < 85:
        cards.append({"title": "Attendance Needs Attention", "body": f"Attendance at {att}% is acceptable but leaves little room for absence. Aim for 90%+ to stay safe for semester-end.", "type": "info", "icon": "📊"})
    else:
        cards.append({"title": "Excellent Attendance!", "body": f"Great job! Your {att}% attendance shows strong commitment. Keep this momentum going.", "type": "success", "icon": "✅"})

    # Marks card
    worst = sorted(marks_dict.items(), key=lambda x: x[1])[:1]
    if worst:
        s, v = worst[0]
        cards.append({"title": f"Focus on {s}", "body": f"Your score in {s} ({v}/100) needs improvement. Dedicate extra study time to this subject before the next internal exam.", "type": "tip", "icon": "📚"})
    elif marks < 60:
        cards.append({"title": "Marks Below Average", "body": f"Average of {marks}/100 is below the passing threshold. Seek help from your subject handler and visit office hours.", "type": "warning", "icon": "⚠️"})
    else:
        cards.append({"title": "Solid Academic Performance", "body": f"Your average marks of {marks}/100 reflect good understanding. Push harder in weaker subjects to maximize your CGPA.", "type": "success", "icon": "✅"})

    # Risk card
    if risk > 60:
        cards.append({"title": "High Risk — Act Now", "body": f"Your risk score of {risk}/100 is concerning. Book a mentoring session immediately and follow the weekly study plan consistently.", "type": "warning", "icon": "⚠️"})
    elif risk > 35:
        cards.append({"title": "Monitor Your Progress", "body": f"Risk score of {risk}/100 puts you in the 'at-risk' zone. Regular mentor check-ins and consistent study sessions will help you improve.", "type": "info", "icon": "📊"})
    else:
        cards.append({"title": "Low Risk — Stay Sharp", "body": f"Your risk score of {risk}/100 is excellent. Maintain your discipline and help peers who may be struggling.", "type": "success", "icon": "🎯"})

    # Study plan card
    if compliance < 50:
        cards.append({"title": "Study Plan Compliance Low", "body": f"You've completed only {compliance}% of your weekly study goals. Set aside 1–2 hours each evening to catch up and log your sessions.", "type": "tip", "icon": "💡"})
    else:
        best = sorted(marks_dict.items(), key=lambda x: x[1], reverse=True)[:1]
        if best:
            s, v = best[0]
            cards.append({"title": f"Strength in {s}", "body": f"Your {v}/100 in {s} is your strongest subject. Leverage this confidence to tackle harder subjects with the same energy.", "type": "success", "icon": "💡"})
        else:
            cards.append({"title": "Keep Following Your Plan", "body": "Your study plan compliance is good. Consistent effort each week compounds into excellent semester results.", "type": "success", "icon": "🎯"})

    return cards[:4]


# ─── Chat / Q&A endpoint  ────────────────────────────────────────
@app.route('/api/ai/chat', methods=['POST'])
def api_ai_chat():
    """
    Body: { admission_number, message, history: [{role, content}] }
    Returns: { reply }
    """
    data             = request.get_json()
    admission_number = data.get('admission_number', '')
    user_message     = data.get('message', '').strip()
    history          = data.get('history', [])

    if not user_message:
        return jsonify({'success': False, 'message': 'Empty message'}), 400

    ctx              = _build_student_context(admission_number) if admission_number else {}
    provider, ai_client = _get_ai_provider()

    if not provider:
        reply = _fallback_chat(user_message, ctx)
        return jsonify({'success': True, 'reply': reply, 'source': 'rule-based'}), 200

    try:
        system_prompt = _context_to_system_prompt(ctx) if ctx else "You are MentorAI, a helpful academic advisor."
        reply = _ai_complete(provider, ai_client, system_prompt, user_message, history=history, max_tokens=800)
        return jsonify({'success': True, 'reply': reply, 'source': provider}), 200
    except Exception as e:
        reply = _fallback_chat(user_message, ctx)
        return jsonify({'success': True, 'reply': reply, 'source': 'rule-based', 'note': str(e)}), 200


def _fallback_chat(message: str, ctx: dict) -> str:
    """Simple keyword-based chat fallback when OpenAI is unavailable."""
    msg = message.lower()
    name = ctx.get('name', 'there').split()[0] if ctx.get('name') else 'there'

    if any(w in msg for w in ['study plan', 'plan', 'schedule', 'weekly']):
        subjects = ctx.get('study_plan_subjects', [])
        marks_dict = ctx.get('subject_marks', {})
        if marks_dict:
            sorted_subs = sorted(marks_dict.items(), key=lambda x: x[1])
            plan = "\n".join(f"- **{s}**: 2–3 hours (score: {v}/100)" for s, v in sorted_subs)
            return f"Hi {name}! Here's a suggested weekly focus plan based on your performance:\n\n{plan}\n\nPrioritize your lowest-scoring subjects each morning when focus is highest."
        return f"Hi {name}! Based on your current semester, I recommend studying each subject for at least 2 hours daily, focusing on weaker areas first."

    if any(w in msg for w in ['attendance', 'absent', 'class']):
        att = ctx.get('attendance_pct', 'N/A')
        return f"Your current attendance is **{att}%**. The minimum requirement is typically **75%**. {'You are above the threshold — keep it up!' if isinstance(att, float) and att >= 75 else 'You are below the minimum. Please attend all remaining classes urgently.'}"

    if any(w in msg for w in ['marks', 'score', 'exam', 'cgpa', 'gpa']):
        avg = ctx.get('avg_marks', 'N/A')
        marks_dict = ctx.get('subject_marks', {})
        if marks_dict:
            worst = min(marks_dict.items(), key=lambda x: x[1])
            best  = max(marks_dict.items(), key=lambda x: x[1])
            return f"Your average internal mark is **{avg}/100**.\n\n- 🏆 Best: **{best[0]}** ({best[1]}/100)\n- 📉 Needs work: **{worst[0]}** ({worst[1]}/100)\n\nFocus revision sessions on {worst[0]} before your next internal."
        return f"Your average internal marks are **{avg}/100**. Keep pushing to improve weaker subjects."

    if any(w in msg for w in ['risk', 'danger', 'failing', 'fail']):
        risk = ctx.get('risk_score', 'N/A')
        level = ctx.get('risk_level', 'N/A')
        return f"Your current risk score is **{risk}/100** ({level}). {'⚠️ This is high — I strongly recommend booking a mentor session and following your study plan daily.' if isinstance(risk, float) and risk > 60 else '✅ You are in a safe zone. Maintain your current effort.'}"

    if any(w in msg for w in ['mentor', 'meeting', 'session', 'book']):
        return f"You can book a mentoring session from the **Mentoring** tab in your dashboard. Sessions from 9 AM–5 PM are auto-approved if your mentor is free. Evening slots (5–7 PM) need mentor confirmation."

    if any(w in msg for w in ['workout', 'fitness', 'exercise', 'home workout']):
        wp = ctx.get('wellness_preferences', {})
        return (
            f"Based on your preferences, try a **{wp.get('intensity_level', 'moderate')}** "
            f"{wp.get('workout_duration_minutes', 30)}-minute home workout in the "
            f"**{wp.get('preferred_workout_time', 'evening')}** focused on "
            f"**{wp.get('fitness_goal', 'general fitness')}**. "
            f"Keep one recovery day after intense sessions. "
            f"Note: this is general wellness guidance, not medical advice."
        )

    if any(w in msg for w in ['tip', 'advice', 'suggest', 'help', 'improve']):
        att = ctx.get('attendance_pct', 75)
        avg = ctx.get('avg_marks', 60)
        tips = []
        if isinstance(att, float) and att < 80:
            tips.append("📌 Improve attendance — attend every class for the next 2 weeks to raise your percentage.")
        if isinstance(avg, float) and avg < 65:
            tips.append("📚 Spend 1 extra hour daily on your weakest subject.")
        tips.append("🎯 Log your study hours in the dashboard to track weekly plan compliance.")
        tips.append("💬 Book a mentor session at least once a month to discuss progress.")
        return f"Here are some personalised tips for you, {name}:\n\n" + "\n".join(tips)

    # Generic
    return f"Hi {name}! I'm MentorAI, your academic assistant. Ask me about your attendance, marks, study plans, risk score, or how to improve in specific subjects. I'm here to help! 🎓"


# ─── Generate personalised weekly study plan ─────────────────────
@app.route('/api/ai/study-plan/<string:admission_number>', methods=['GET'])
def api_ai_study_plan(admission_number):
    """Generate a detailed weekly study plan using OpenAI."""
    def _json_no_cache(payload, status=200):
        response = jsonify(payload)
        response.headers["Cache-Control"] = "no-store, no-cache, must-revalidate, max-age=0"
        response.headers["Pragma"] = "no-cache"
        response.headers["Expires"] = "0"
        return response, status

    ctx    = _build_student_context(admission_number)
    client = _get_openai_client()

    if not ctx:
        return _json_no_cache({'success': False, 'message': 'Student not found'}, 404)

    if not client:
        plan = _fallback_study_plan(ctx)
        return _json_no_cache({'success': True, 'plan': plan, 'source': 'rule-based'}, 200)

    try:
        marks_dict  = ctx.get('subject_marks', {})
        attend_dict = ctx.get('subject_attendance', {})
        timetable_summary = ctx.get('timetable_summary', 'No timetable data')
        wp = ctx.get('wellness_preferences', {})
        marks_str   = "; ".join(f"{s}: {v}/100" for s, v in marks_dict.items()) or "no marks data"
        attend_str  = "; ".join(f"{s}: {v}%" for s, v in attend_dict.items()) or "no attendance data"
        workout_pref = (
            f"goal={wp.get('fitness_goal', 'general_fitness')}, "
            f"intensity={wp.get('intensity_level', 'moderate')}, "
            f"preferred_time={wp.get('preferred_workout_time', 'evening')}, "
            f"duration={wp.get('workout_duration_minutes', 30)} mins, "
            f"equipment={wp.get('home_equipment', 'none')}, "
            f"constraints={wp.get('health_constraints', '') or 'none'}"
        )

        prompt = f"""Create a detailed 7-day weekly study plan in Markdown for a student with the following academic and wellness profile. 
Be specific with daily time blocks and subject allocations. Prioritize subjects with low marks.

Name: {ctx.get('name')}
Department: {ctx.get('department')}
Subject Marks: {marks_str}
Subject Attendance: {attend_str}
Current Timetable: {timetable_summary}
Risk Level: {ctx.get('risk_level', 'stable')}
Academic Status: {ctx.get('academic_status', 'Stable')}
Workout Preferences: {workout_pref}

Format:
## 📅 Weekly Study Plan for {ctx.get('name')}
### Day-by-Day Schedule (Monday–Sunday)
For each day list 2-3 study blocks with subject, duration, and specific topic goal, plus one short home workout slot where practical.
Align study blocks around timetable commitments and avoid class hours.
### 🎯 Key Focus Areas This Week
### 🏃 Home Workout Guidance
### 💡 Study Tips
Keep it motivating and actionable. Add one sentence that this is general wellness guidance, not medical advice."""

        resp = client.chat.completions.create(
            model="gpt-4o-mini",
            messages=[
                {"role": "system", "content": f"You are MentorAI — an expert academic advisor. {_context_to_system_prompt(ctx)}"},
                {"role": "user", "content": prompt}
            ],
            max_tokens=1200,
            temperature=0.7,
        )
        plan = resp.choices[0].message.content
        return _json_no_cache({'success': True, 'plan': plan, 'source': 'openai'}, 200)
    except Exception:
        app.logger.exception("AI study-plan generation failed for %s", admission_number)
        plan = _fallback_study_plan(ctx)
        return _json_no_cache({'success': True, 'plan': plan, 'source': 'rule-based', 'note': 'AI provider unavailable; generated fallback plan.'}, 200)


def _fallback_study_plan(ctx: dict) -> str:
    marks_dict = ctx.get('subject_marks', {})
    name = ctx.get('name', 'Student')
    wp = ctx.get('wellness_preferences', {})
    try:
        workout_duration = int(wp.get('workout_duration_minutes', 30))
    except (TypeError, ValueError):
        workout_duration = 30
    preferred_slot = wp.get('preferred_workout_time', 'evening')
    workout_label = "🏃 Home Workout"
    if preferred_slot == "morning":
        workout_time = "6:00–6:30 AM"
    elif preferred_slot == "afternoon":
        workout_time = "4:30–5:00 PM"
    else:
        workout_time = "7:30–8:00 PM"

    sorted_subs = sorted(marks_dict.items(), key=lambda x: x[1]) if marks_dict else []

    day_targets = {}
    days  = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"]
    subs  = [s for s, _ in sorted_subs] or ctx.get('study_plan_subjects', ['General Study'])

    for i, day in enumerate(days):
        primary = subs[i % len(subs)]
        secondary = subs[(i + 1) % len(subs)] if len(subs) > 1 else primary
        day_targets[day] = (primary, secondary)

    timetable_by_day = ctx.get("timetable_by_day", {})
    plan_lines = [f"## 📅 Weekly Study Plan for {name}\n"]
    for day, (p, s) in day_targets.items():
        class_slots = timetable_by_day.get(day, [])
        class_note = f"- 🏫 **Class Hours**: {', '.join(class_slots)}\n" if class_slots else ""
        if day == "Sunday":
            plan_lines.append(
                f"### {day}\n"
                f"{class_note}"
                f"- 🔄 **Revision**: Review all subjects covered this week\n"
                f"- 📝 **Self-test**: 30-minute quiz on weakest topic\n"
                f"- {workout_label}: Light mobility + stretching ({max(20, workout_duration - 10)} mins)\n"
            )
        elif class_slots:
            plan_lines.append(
                f"### {day}\n"
                f"{class_note}"
                f"- 🌅 **6:00–7:30 AM** — **{p}** (1.5 hrs) — Pre-class concept revision\n"
                f"- 🌇 **6:30–8:00 PM** — **{s}** (1.5 hrs) — Problem practice & recap\n"
                f"- {workout_label}: {workout_time} ({workout_duration} mins)\n"
            )
        else:
            plan_lines.append(
                f"### {day}\n"
                f"- 🌅 **9:00–11:00 AM** — **{p}** (2 hrs) — Focus on theory & past questions\n"
                f"- 🌇 **5:00–6:00 PM** — **{s}** (1 hr) — Practice problems\n"
                f"- {workout_label}: {workout_time} ({workout_duration} mins)\n"
            )

    plan_lines.append("### 🎯 Key Focus Areas\n" + "\n".join(f"- **{s}** ({v}/100) — needs most attention" for s, v in sorted_subs[:3]))
    plan_lines.append(
        f"\n### 🏃 Home Workout Guidance\n"
        f"- Goal: **{wp.get('fitness_goal', 'general_fitness')}**\n"
        f"- Intensity: **{wp.get('intensity_level', 'moderate')}**\n"
        f"- Equipment: **{wp.get('home_equipment', 'none')}**\n"
        f"- Constraints: **{wp.get('health_constraints', 'none') or 'none'}**\n"
    )
    plan_lines.append("\n### 💡 Study Tips\n- Study high-priority subjects in the morning when focus is sharpest.\n- Use the 25-minute Pomodoro technique with 5-minute breaks.\n- Log every session in the Weekly Planner tab.")
    plan_lines.append("\n> Note: Home workout suggestions are general wellness guidance and not medical advice.")
    return "\n".join(plan_lines)


RECOVERY_DURATION_REDUCTION = 10


def _build_combined_study_workout_schedule(ctx: dict, mode: str = "balanced") -> dict:
    days = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"]
    today = datetime.utcnow().date()
    week_start = today - timedelta(days=today.weekday())
    week_end = week_start + timedelta(days=6)

    wp = ctx.get("wellness_preferences", {})
    wake_time = wp.get("wake_time", "06:00")
    sleep_time = wp.get("sleep_time", "22:30")
    try:
        workout_duration = int(wp.get("workout_duration_minutes", 30))
    except (TypeError, ValueError):
        workout_duration = 30
    try:
        weekly_workout_target = int(wp.get("weekly_workout_target", 4))
    except (TypeError, ValueError):
        weekly_workout_target = 4
    preferred_workout_time = wp.get("preferred_workout_time", "evening")
    fitness_goal = wp.get("fitness_goal", "general_fitness")
    intensity = wp.get("intensity_level", "moderate")
    constraints = wp.get("health_constraints", "") or "none"

    if mode == "exam_week":
        study_hours_per_day = 3.5
        workout_duration = max(15, min(25, workout_duration))
    elif mode == "light_workout":
        study_hours_per_day = 3.0
        workout_duration = max(15, workout_duration - RECOVERY_DURATION_REDUCTION)
    elif mode == "revision_priority":
        study_hours_per_day = 3.8
    else:
        study_hours_per_day = 2.8

    subject_marks = ctx.get("subject_marks", {})
    weak_first_subjects = [s for s, _ in sorted(subject_marks.items(), key=lambda x: x[1])]
    if not weak_first_subjects:
        weak_first_subjects = ctx.get("study_plan_subjects", []) or ["General Study"]

    timetable_by_day = ctx.get("timetable_by_day", {})
    workout_days = {"Monday", "Tuesday", "Thursday", "Friday", "Saturday"}
    if weekly_workout_target <= 3:
        workout_days = {"Monday", "Wednesday", "Friday"}
    elif weekly_workout_target >= 6:
        workout_days = {"Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"}

    out_days = []
    sub_idx = 0
    previous_high_load = False
    for offset, day in enumerate(days):
        d = week_start + timedelta(days=offset)
        class_slots = timetable_by_day.get(day, [])
        primary = weak_first_subjects[sub_idx % len(weak_first_subjects)]
        secondary = weak_first_subjects[(sub_idx + 1) % len(weak_first_subjects)]
        sub_idx += 1

        morning_study_duration = round(study_hours_per_day * 0.6, 1)
        evening_study_duration = round(study_hours_per_day * 0.4, 1)

        study_blocks = [
            {
                "time": "06:15-07:45",
                "subject": primary,
                "duration_hours": morning_study_duration,
                "focus": "Concept revision + weak-topic practice"
            },
            {
                "time": "19:00-20:00",
                "subject": secondary,
                "duration_hours": evening_study_duration,
                "focus": "Problem solving + recap"
            }
        ]

        workout_blocks = []
        is_recovery_day = previous_high_load or day == "Sunday"
        if day in workout_days:
            if preferred_workout_time == "morning":
                workout_time = "05:40-06:10"
            elif preferred_workout_time == "afternoon":
                workout_time = "16:30-17:00"
            else:
                workout_time = "20:15-20:45"

            block_intensity = "light" if is_recovery_day else intensity
            block_duration = max(15, workout_duration - RECOVERY_DURATION_REDUCTION) if is_recovery_day else workout_duration
            workout_blocks.append({
                "time": workout_time,
                "type": "home_workout",
                "goal": fitness_goal,
                "intensity": block_intensity,
                "duration_minutes": block_duration
            })
            previous_high_load = block_intensity in ("high", "moderate")
        else:
            previous_high_load = False

        out_days.append({
            "day": day,
            "date": d.isoformat(),
            "class_hours": class_slots,
            "study_blocks": study_blocks,
            "workout_blocks": workout_blocks,
            "break_guidance": "Use 25-minute Pomodoro blocks with 5-minute breaks.",
            "sleep_guidance": f"Aim to sleep by {sleep_time} and wake around {wake_time}.",
            "recovery_day": is_recovery_day
        })

    total_study_target = round(sum(sum(b["duration_hours"] for b in d["study_blocks"]) for d in out_days), 1)
    total_workout_target = sum(len(d["workout_blocks"]) for d in out_days)

    return {
        "week_start": week_start.isoformat(),
        "week_end": week_end.isoformat(),
        "mode": mode,
        "wellness_note": "Home workout suggestions are general wellness guidance, not medical advice.",
        "constraints_note": constraints,
        "weekly_targets": {
            "study_hours_target": total_study_target,
            "workout_sessions_target": total_workout_target
        },
        "days": out_days
    }


@app.route('/api/ai/combined-plan/<string:admission_number>', methods=['GET'])
def api_ai_combined_plan(admission_number):
    try:
        mode = (request.args.get('mode') or 'balanced').strip().lower()
        if mode not in {'balanced', 'exam_week', 'light_workout', 'revision_priority'}:
            mode = 'balanced'

        ctx = _build_student_context(admission_number)
        if not ctx:
            return jsonify({'success': False, 'message': 'Student not found'}), 404

        schedule = _build_combined_study_workout_schedule(ctx, mode=mode)
        return jsonify({'success': True, 'source': 'rule-based', 'data': schedule}), 200
    except Exception as e:
        return jsonify({'success': False, 'message': str(e)}), 500



# ─────────────────────────────────────────────────────────────────────────────
# MENTOR STUDENT DETAIL + SESSION BOOKING APIs
# ─────────────────────────────────────────────────────────────────────────────

@app.route('/api/student/detail/<string:adm>', methods=['GET'])
def api_student_detail(adm):
    """Full student profile for mentor view. Returns all data if profile completed, else basics."""
    try:
        student = Student.query.get(adm.upper())
        if not student:
            return jsonify({'success': False, 'message': 'Student not found'}), 404

        # Build photo URL if photo_path exists
        photo_url = None
        if student.photo_path:
            photo_url = f"http://localhost:5000/uploads/{student.photo_path}"

        # Basic data always returned
        result = {
            'admission_number': student.admission_number,
            'name': student.full_name,
            'email': student.email,
            'mobile': student.mobile_number,
            'branch': student.branch,
            'batch': student.batch,
            'blood_group': student.blood_group,
            'dob': student.dob.isoformat() if student.dob else None,
            'status': student.status,
            'photo_url': photo_url,
            'profile_completed': student.profile_completed,
        }

        # Extended data if profile is complete
        if student.profile_completed:
            result['personal'] = {
                'religion': student.religion,
                'diocese': student.diocese,
                'parish': student.parish,
                'caste_category': student.caste_category,
                'permanent_address': student.permanent_address,
                'contact_address': student.contact_address,
            }

            if student.parents:
                p = student.parents
                result['parents'] = {
                    'father_name': p.father_name,
                    'father_profession': p.father_profession,
                    'father_mobile': p.father_mobile,
                    'mother_name': p.mother_name,
                    'mother_profession': p.mother_profession,
                    'mother_mobile': p.mother_mobile,
                }

            if student.guardian:
                g = student.guardian
                result['guardian'] = {
                    'name': g.name,
                    'address': g.address,
                    'mobile': g.mobile_number,
                }

            if student.academics:
                a = student.academics
                result['academics'] = {
                    'school_10th': a.school_10th,
                    'percentage_10th': a.percentage_10th,
                    'school_12th': a.school_12th,
                    'percentage_12th': a.percentage_12th,
                    'college_ug': a.college_ug,
                    'percentage_ug': a.percentage_ug,
                    'sgpa': a.sgpa,
                    'cgpa': a.cgpa,
                    'entrance_rank': a.entrance_rank,
                    'nature_of_admission': a.nature_of_admission,
                }

            if student.other_info:
                o = student.other_info
                result['other'] = {
                    'accommodation_type': o.accommodation_type,
                    'staying_with': o.staying_with,
                    'hostel_name': o.hostel_name,
                    'transport_mode': o.transport_mode,
                }

        # Add analytics if available
        analytics = StudentAnalytics.query.filter_by(student_id=adm.upper()).first()
        if analytics:
            result['analytics'] = {
                'attendance_percentage': analytics.attendance_percentage or 0,
                'avg_internal_marks': analytics.avg_internal_marks or 0,
                'risk_score': analytics.risk_score or 0,
                'adjusted_risk': analytics.adjusted_risk or 0,
                'status': analytics.status,
                'failure_count': analytics.failure_count or 0,
            }

        # Recent sessions — using raw SQL to match actual DB columns
        from sqlalchemy import text
        with db.engine.connect() as conn:
            rows = conn.execute(text(
                "SELECT id, date, time, type, status, meeting_link, remarks "
                "FROM mentoring_sessions WHERE student_admission_number=:adm "
                "ORDER BY date DESC LIMIT 5"
            ), {'adm': adm.upper()}).fetchall()

        result['recent_sessions'] = [{
            'id': r[0],
            'date': r[1].isoformat() if hasattr(r[1], 'isoformat') else str(r[1]),
            'time_slot': r[2],
            'session_type': r[3],
            'status': r[4],
            'meeting_link': r[5],
            'notes': r[6],
        } for r in rows]

        return jsonify({'success': True, 'data': result}), 200

    except Exception as e:
        return jsonify({'success': False, 'message': str(e)}), 500


@app.route('/api/mentor/session/book', methods=['POST'])
def api_mentor_book_session():
    """Mentor books a session for a specific mentee. Supports online (GMeet) and offline modes."""
    try:
        data = request.get_json() or {}

        mentor_id = data.get('mentor_id')
        student_id = data.get('student_id', '').strip().upper()
        session_date = data.get('date')          # "YYYY-MM-DD"
        time_slot = data.get('time_slot', '10:00')  # "HH:MM"
        session_type = data.get('session_type', 'Offline')  # Online / Offline
        meeting_link = data.get('meeting_link', '').strip()
        notes = data.get('notes', '').strip()

        if not all([mentor_id, student_id, session_date]):
            return jsonify({'success': False, 'message': 'mentor_id, student_id and date are required'}), 400

        # Verify mentee belongs to this mentor
        student = Student.query.get(student_id)
        if not student:
            return jsonify({'success': False, 'message': 'Student not found'}), 404
        if str(student.mentor_id) != str(mentor_id):
            return jsonify({'success': False, 'message': 'This student is not assigned to you'}), 403

        # Validate GMeet link for online sessions
        if session_type == 'Online' and meeting_link:
            if not (meeting_link.startswith('http://') or meeting_link.startswith('https://')):
                meeting_link = 'https://' + meeting_link

        from datetime import date as date_obj
        parsed_date = date_obj.fromisoformat(session_date)

        # Check for duplicate on same date + mentor
        from sqlalchemy import text
        with db.engine.connect() as conn:
            existing = conn.execute(text(
                "SELECT id FROM mentoring_sessions WHERE student_admission_number=:sid "
                "AND mentor_id=:mid AND date=:dt LIMIT 1"
            ), {'sid': student_id, 'mid': int(mentor_id), 'dt': session_date}).fetchone()

        if existing:
            return jsonify({
                'success': False,
                'message': f'A session already exists for {student.full_name} on {session_date}'
            }), 409

        # Insert using raw SQL to match actual columns: time, type, remarks
        with db.engine.begin() as conn:
            conn.execute(text(
                "INSERT INTO mentoring_sessions "
                "(student_admission_number, mentor_id, date, time, type, status, meeting_link, remarks) "
                "VALUES (:sid, :mid, :dt, :tm, :tp, 'Approved', :ml, :rem)"
            ), {
                'sid': student_id,
                'mid': int(mentor_id),
                'dt': parsed_date,
                'tm': time_slot,
                'tp': session_type,
                'ml': meeting_link if session_type == 'Online' else None,
                'rem': notes or None,
            })

        # Notify student
        try:
            notification = Notification(
                student_id=student_id,
                title='Mentoring Session Scheduled',
                message=f'Your mentor has scheduled a {session_type} session on {session_date} at {time_slot}.'
                        + (f' Join here: {meeting_link}' if meeting_link else ''),
                type='session',
            )
            db.session.add(notification)
            db.session.commit()
        except Exception:
            pass  # Notification failure should not block session creation

        return jsonify({
            'success': True,
            'message': f'{session_type} session booked successfully for {student.full_name}',
        }), 201

    except Exception as e:
        db.session.rollback()
        return jsonify({'success': False, 'message': str(e)}), 500


@app.route('/api/mentor/session/update/<int:session_id>', methods=['PUT'])
def api_mentor_update_session(session_id):
    """Mentor updates an existing session (reschedule, change mode, update meet link, add notes)."""
    try:
        data = request.get_json() or {}
        mentor_id = data.get('mentor_id')

        from sqlalchemy import text
        with db.engine.connect() as conn:
            row = conn.execute(text(
                "SELECT id, mentor_id FROM mentoring_sessions WHERE id=:sid LIMIT 1"
            ), {'sid': session_id}).fetchone()

        if not row:
            return jsonify({'success': False, 'message': 'Session not found'}), 404
        if str(row[1]) != str(mentor_id):
            return jsonify({'success': False, 'message': 'Unauthorized'}), 403

        # Build dynamic SET clause
        updates = {}
        if 'date' in data:
            updates['date'] = data['date']
        if 'time_slot' in data:
            updates['time'] = data['time_slot']        # actual col = time
        if 'session_type' in data:
            updates['type'] = data['session_type']     # actual col = type
        if 'meeting_link' in data:
            link = data['meeting_link'].strip()
            if link and not (link.startswith('http://') or link.startswith('https://')):
                link = 'https://' + link
            updates['meeting_link'] = link or None
        if 'notes' in data:
            updates['remarks'] = data['notes']         # actual col = remarks
        if 'status' in data:
            updates['status'] = data['status']

        if updates:
            set_clause = ', '.join(f"{k}=:{k}" for k in updates)
            updates['sid'] = session_id
            with db.engine.begin() as conn:
                conn.execute(text(
                    f"UPDATE mentoring_sessions SET {set_clause} WHERE id=:sid"
                ), updates)

        return jsonify({'success': True, 'message': 'Session updated successfully'}), 200

    except Exception as e:
        return jsonify({'success': False, 'message': str(e)}), 500


@app.route('/api/mentor/sessions/<int:mentor_id>', methods=['GET'])
def api_mentor_sessions_list(mentor_id):
    """List all sessions booked by a mentor, with student info and photo."""
    try:
        from sqlalchemy import text
        with db.engine.connect() as conn:
            rows = conn.execute(text(
                "SELECT ms.id, ms.student_admission_number, ms.date, ms.time, ms.type, "
                "ms.status, ms.meeting_link, ms.remarks, "
                "s.full_name, s.photo_path "
                "FROM mentoring_sessions ms "
                "LEFT JOIN students s ON s.admission_number = ms.student_admission_number "
                "WHERE ms.mentor_id=:mid "
                "ORDER BY ms.date DESC LIMIT 50"
            ), {'mid': mentor_id}).fetchall()

        result = []
        for r in rows:
            photo_url = None
            if r[9]:  # photo_path
                photo_url = f"http://localhost:5000/uploads/{r[9]}"
            result.append({
                'id': r[0],
                'student_id': r[1],
                'student_name': r[8] or 'Unknown',
                'student_photo': photo_url,
                'date': r[2].isoformat() if hasattr(r[2], 'isoformat') else str(r[2]),
                'time_slot': r[3],
                'session_type': r[4],
                'status': r[5],
                'meeting_link': r[6],
                'notes': r[7],
            })

        return jsonify({'success': True, 'data': result}), 200

    except Exception as e:
        return jsonify({'success': False, 'message': str(e)}), 500



# ─────────────────────────────────────────────────────────────────────────────
# STUDENT NOTIFICATION APIs
# ─────────────────────────────────────────────────────────────────────────────

@app.route('/api/student/notifications/<string:admission_number>', methods=['GET'])
def api_student_notifications(admission_number):
    """Get all notifications for a student, newest first."""
    try:
        notifs = Notification.query.filter_by(
            student_id=admission_number
        ).order_by(Notification.created_at.desc()).limit(50).all()

        data = [{
            'id': n.id,
            'title': n.title,
            'message': n.message,
            'type': n.type,
            'is_read': n.is_read,
            'created_at': n.created_at.isoformat() if n.created_at else None,
        } for n in notifs]

        unread_count = sum(1 for n in notifs if not n.is_read)
        return jsonify({'success': True, 'data': data, 'unread_count': unread_count}), 200
    except Exception as e:
        return jsonify({'success': False, 'message': str(e)}), 500


@app.route('/api/student/notifications/<int:notif_id>/read', methods=['PATCH'])
def api_mark_notification_read(notif_id):
    """Mark a single notification as read."""
    try:
        notif = Notification.query.get(notif_id)
        if not notif:
            return jsonify({'success': False, 'message': 'Not found'}), 404
        notif.is_read = True
        db.session.commit()
        return jsonify({'success': True}), 200
    except Exception as e:
        db.session.rollback()
        return jsonify({'success': False, 'message': str(e)}), 500


@app.route('/api/student/notifications/<string:admission_number>/read-all', methods=['PATCH'])
def api_mark_all_notifications_read(admission_number):
    """Mark all notifications as read for a student."""
    try:
        Notification.query.filter_by(
            student_id=admission_number, is_read=False
        ).update({'is_read': True})
        db.session.commit()
        return jsonify({'success': True}), 200
    except Exception as e:
        db.session.rollback()
        return jsonify({'success': False, 'message': str(e)}), 500


if __name__ == '__main__':


    with app.app_context():
        # Create tables if they don't exist
        db.create_all()
        
        try:
            import re
            from datetime import date as date_type
            legacy_sessions = MentoringSession.query.filter(MentoringSession.notes.like('%[Reschedule Requested by Student%')).all()
            dirty = False
            for s in legacy_sessions:
                if s.notes:
                    match_date = re.search(r'Preferred Date:\s*([0-9]{4}-[0-9]{2}-[0-9]{2})', s.notes)
                    match_time = re.search(r'Preferred Time:\s*([0-9]{2}:[0-9]{2})', s.notes)
                    if match_date:
                        try:
                            s.date = date_type.fromisoformat(match_date.group(1))
                            dirty = True
                        except Exception: 
                            pass
                    if match_time:
                        s.time_slot = match_time.group(1)
                        dirty = True
            if dirty:
                db.session.commit()
                print("Legacy reschedule dates synchronized successfully.")
        except Exception as e:
            print("Migration error:", e)

    app.run(debug=True, port=5000)
