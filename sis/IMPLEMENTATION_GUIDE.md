# Student Information System (SIS) - Complete Implementation Guide

## Project Structure

```
sis/
├── app.py                    # Main Flask application factory ✅ DONE
├── config.py                 # Configuration settings ✅ DONE
├── extensions.py             # Flask extensions init ✅ DONE
├── models/
│   ├── course.py            # Course model ✅ DONE
│   ├── batch.py             # Batch model ✅ DONE
│   ├── student.py           # Student model ✅ DONE
│   ├── faculty.py           # Faculty model ✅ DONE
│   ├── alumni.py            # Alumni models ✅ DONE
│   ├── login_credential.py  # Login credentials ✅ DONE
│   └── timetable.py         # Subject & Timetable ✅ DONE
├── services/
│   ├── batch_service.py     # Batch lifecycle mgmt ✅ DONE
│   ├── mentor_service.py    # Mentor allocation ✅ DONE
│   ├── alumni_service.py    # Alumni management (TODO)
│   └── timetable_service.py # Timetable mgmt (TODO)
└── routes/
    ├── admin_routes.py      # Admin endpoints (TODO)
    ├── teacher_routes.py    # Teacher endpoints (TODO)
    └── student_routes.py    # Student endpoints (TODO)
```

---

## Module 1: Database Models ✅ COMPLETE

All 8 models created successfully with proper relationships.

**Key Features:**
- Course duration rules (IMCA=5yr, MCA=2yr, B.Tech=4yr)
- Auto-computed batch expiry detection
- Faculty mentor eligibility computation
- Proper foreign keys and cascading deletes

---

## Module 2: Student Bulk Registration

### Endpoint: `POST /admin/students/bulk-upload`

```python
@admin_bp.route('/students/bulk-upload', methods=['POST'])
@login_required
def bulk_upload_students():
    """
    Bulk upload students from CSV
    Expected columns: admission_number, name, roll_number, department, batch, email
    """
    try:
        if 'file' not in request.files:
            return jsonify({'error': 'No file uploaded'}), 400
        
        file = request.files['file']
        if file.filename == '':
            return jsonify({'error': 'No file selected'}), 400
        
        import pandas as pd
        import io
        
        # Read CSV
        df = pd.read_csv(file) if file.filename.endswith('.csv') else pd.read_excel(file)
        df.columns = [c.lower().strip() for c in df.columns]
        
        required = ['admission_number', 'name', 'email', 'department', 'batch']
        if not all(col in df.columns for col in required):
            return jsonify({'error': f'Missing required columns. Required: {required}'}), 400
        
        inserted = []
        skipped = []
        errors = []
        
        for idx, row in df.iterrows():
            try:
                adm_no = str(row['admission_number']).strip().upper()
                
                # Check duplicate
                if Student.query.filter_by(admission_number=adm_no).first():
                    skipped.append(adm_no)
                    continue
                
                # Find/create course
                dept_name = normalize_dept_name(str(row.get('department', '')).strip())
                course = Course.query.filter_by(name=dept_name).first()
                if not course:
                    course = Course(name=dept_name, duration_years=Course.get_course_duration(dept_name))
                    db.session.add(course)
                    db.session.flush()
                
                # Parse batch
                batch_str = str(row['batch']).strip()
                year_match = re.search(r'(\d{4})-(\d{4})', batch_str)
                if not year_match:
                    errors.append(f"Row {idx+1}: Invalid batch format")
                    continue
                
                start_year = int(year_match.group(1))
                end_year = int(year_match.group(2))
                
                batch = Batch.query.filter_by(
                    course_id=course.id,
                    start_year=start_year
                ).first()
                
                if not batch:
                    batch = Batch(
                        course_id=course.id,
                        start_year=start_year,
                        end_year=end_year,
                        status='active'
                    )
                    db.session.add(batch)
                    db.session.flush()
                
                # Create student
                student = Student(
                    admission_number=adm_no,
                    full_name=str(row.get('name')).strip(),
                    roll_number=str(row.get('roll_number', '')).strip() or adm_no[-2:],
                    email=str(row.get('email')).strip().lower(),
                    branch=dept_name,
                    batch_id=batch.id,
                    batch=f"{start_year}-{end_year}",
                    status='Live'
                )
                db.session.add(student)
                
                # Create login credential
                from extensions import bcrypt
                pwd_hash = bcrypt.generate_password_hash(adm_no).decode('utf-8')
                cred = LoginCredential(
                    student_id=adm_no,
                    username=adm_no,
                    password_hash=pwd_hash
                )
                db.session.add(cred)
                
                inserted.append(adm_no)
                
            except Exception as e:
                errors.append(f"Row {idx+1}: {str(e)}")
        
        db.session.commit()
        
        # Trigger mentor redistribution for affected batches
        # (Implementation detail omitted for brevity)
        
        return jsonify({
            'success': True,
            'inserted': len(inserted),
            'skipped': len(skipped),
            'errors': errors[:10]  # Limit error messages
        }), 201
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500
```

---

## Module 3: Faculty Registration

### Endpoint: `POST /admin/faculty/add`

```python
@admin_bp.route('/faculty/add', methods=['POST'])
@login_required
def add_faculty():
    """Register new faculty member"""
    data = request.get_json()
    
    required = ['username', 'password', 'name', 'designation', 'department']
    if not all(k in data for k in required):
        return jsonify({'error': 'Missing required fields'}), 400
    
    try:
        from extensions import bcrypt
        
        # Check if username exists
        if Faculty.query.filter_by(username=data['username']).first():
            return jsonify({'error': 'Username already exists'}), 400
        
        # Compute mentor eligibility
        is_eligible = Faculty.compute_mentor_eligible(
            data['designation'],
            data['department']
        )
        
        # Create faculty
        faculty = Faculty(
            username=data['username'],
            password_hash=bcrypt.generate_password_hash(data['password']).decode('utf-8'),
            name=data['name'],
            designation=data['designation'],
            department=data['department'],
            is_mentor_eligible=is_eligible,
            status='Live'
        )
        
        db.session.add(faculty)
        db.session.commit()
        
        return jsonify({
            'success': True,
            'faculty_id': faculty.id,
            'is_mentor_eligible': is_eligible
        }), 201
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500
```

---

## Module 4: Mentor Distribution ✅ PARTIAL

Implemented in `services/mentor_service.py`

### Endpoint: `POST /admin/mentors/redistribute`

```python
@admin_bp.route('/mentors/redistribute', methods=['POST'])
@login_required
def redistribute_mentors():
    """Redistribute mentors for a batch"""
    data = request.get_json()
    
    department = data.get('department')
    batch_id = data.get('batch_id')
    batch_label = data.get('batch')
    
    if not all([department, batch_id, batch_label]):
        return jsonify({'error': 'Missing required fields'}), 400
    
    result = redistribute_mentors_full(department, batch_id, batch_label)
    
    if 'error' in result:
        return jsonify(result), 400 if 'No students' in result.get('error', '') else 500
    
    return jsonify(result), 200
```

---

## Module 5: Batch Lifecycle & Auto-Alumni ✅ COMPLETE

Implemented in `services/batch_service.py`

### Key Functions:
1. `promote_expired_batches_to_alumni()` - Auto-promotes on app startup
2. `validate_new_batch()` - Validates before creation
3. `add_new_batch()` - Creates with auto-promotion if at capacity

### Endpoint: `POST /admin/batches/add`

```python
@admin_bp.route('/batches/add', methods=['POST'])
@login_required
def create_batch():
    """Add new batch with automatic alumni promotion if needed"""
    data = request.get_json()
    
    required = ['course_id', 'start_year']
    if not all(k in data for k in required):
        return jsonify({'error': 'Missing required fields'}), 400
    
    result = add_new_batch(
        course_id=data['course_id'],
        start_year=data['start_year'],
        department=data.get('department', '')
    )
    
    if 'error' in result:
        return jsonify(result), 400 if 'not allowed' in result.get('error', '') else 500
    
    return jsonify(result), 201
```

---

## Module 6: Timetable Management

### Models Created ✅
- `Subject` - Course subjects
- `TimetableSlot` - Individual time slots

### Service Function (TODO):
```python
# services/timetable_service.py
def create_timetable_slots(batch_id, semester, academic_year, slots):
    """
    Create timetable slots
    
    Args:
        batch_id: Batch ID
        semester: Semester number
        academic_year: Academic year
        slots: List of {day, period, subject_id, faculty_id}
    """
    for slot_data in slots:
        slot = TimetableSlot(
            batch_id=batch_id,
            subject_id=slot_data['subject_id'],
            faculty_id=slot_data['faculty_id'],
            day=slot_data['day'],
            period_number=slot_data['period'],
            semester=semester,
            academic_year=academic_year
        )
        db.session.add(slot)
    
    db.session.commit()
```

---

## Modules 7-9: Dashboard Routes (TODO)

Create these route files with basic structure:

### `routes/admin_routes.py`
```python
from flask import Blueprint, render_template, request, jsonify
from flask_login import login_required

admin_bp = Blueprint('admin', __name__, url_prefix='/admin')

@admin_bp.route('/')
@login_required
def dashboard():
    return render_template('admin/dashboard.html')

# Add all endpoints from modules above
```

### `routes/teacher_routes.py`
```python
from flask import Blueprint, render_template, jsonify
from flask_login import login_required, current_user

teacher_bp = Blueprint('teacher', __name__, url_prefix='/teacher')

@teacher_bp.route('/dashboard')
@login_required
def dashboard():
    """Teacher dashboard showing their timetable"""
    # Query timetable slots where faculty_id == current_user.id
    return render_template('teacher/dashboard.html')

@teacher_bp.route('/timetable')
@login_required
def get_timetable():
    """Get teacher's personal timetable"""
    # Return JSON of teacher's slots
    pass

@teacher_bp.route('/students/<int:batch_id>')
@login_required
def get_students(batch_id):
    """Get students in batch taught by this teacher"""
    # Filter by batches where teacher has subjects
    pass
```

### `routes/student_routes.py`
```python
from flask import Blueprint, render_template, jsonify
from flask_login import login_required, current_user

student_bp = Blueprint('student', __name__, url_prefix='/student')

@student_bp.route('/dashboard')
@login_required
def dashboard():
    """Student dashboard showing their timetable"""
    return render_template('student/dashboard.html')

@student_bp.route('/timetable')
@login_required
def get_timetable():
    """Get student's personal timetable with teacher names"""
    # Query based on current_user.batch_id
    pass

@student_bp.route('/profile')
@login_required
def get_profile():
    """Get student profile with mentor info"""
    return jsonify(current_user.to_dict())
```

---

## Remaining Service Functions (TODO)

### `services/alumni_service.py`
```python
def get_grouped_alumni():
    """Get alumni grouped by dept → course → batch"""
    alumni = AlumniStudent.query.order_by(
        AlumniStudent.department,
        AlumniStudent.passout_year
    ).all()
    
    result = {}
    for a in alumni:
        dept = a.department or "Unknown"
        course_name = a.course.name if a.course else "Unknown"
        batch_label = f"{course_name} {a.batch.start_year}-{a.batch.end_year}" if a.batch else f"Passout {a.passout_year}"
        
        mentor_name = a.mentor.name if a.mentor else None
        
        result.setdefault(dept, {})
        result[dept].setdefault(course_name, {})
        result[dept][course_name].setdefault(batch_label, [])
        
        result[dept][course_name][batch_label].append({
            'admission_number': a.admission_number,
            'name': a.name,
            'email': a.email,
            'passout_year': a.passout_year,
            'mentor': mentor_name
        })
    
    return result
```

### `services/timetable_service.py`
```python
def get_student_timetable(student):
    """Get timetable for a student"""
    batch_id = student.batch_id
    current_sem = compute_current_semester(student)
    
    slots = TimetableSlot.query.filter_by(
        batch_id=batch_id,
        semester=current_sem
    ).order_by(
        CASE WHEN day='Mon' THEN 1 WHEN day='Tue' THEN 2 ...,
        period_number
    ).all()
    
    return [slot.to_dict() for slot in slots]

def compute_current_semester(student):
    """Compute current semester from batch start year"""
    from datetime import datetime
    now = datetime.now()
    
    years_elapsed = now.year - student.batch.start_year
    month_factor = 1 if now.month < 7 else 2
    
    sem = (years_elapsed * 2) + month_factor
    
    # Cap at max semester for course
    max_sem = student.batch.course.duration_years * 2
    return min(sem, max_sem)
```

---

## Setup Instructions

1. **Install Dependencies:**
```bash
pip install flask flask-sqlalchemy flask-login flask-bcrypt flask-migrate pandas openpyxl
```

2. **Initialize Database:**
```bash
flask db init
flask db migrate -m "Initial migration"
flask db upgrade
```

3. **Run Application:**
```bash
python app.py
```

4. **Access:**
- Admin Panel: http://localhost:5000/admin
- Teacher Portal: http://localhost:5000/teacher
- Student Portal: http://localhost:5000/student
- Health Check: http://localhost:5000/health

---

## API Endpoints Summary

| Module | Endpoint | Method | Status |
|--------|----------|--------|--------|
| 2 | `/admin/students/bulk-upload` | POST | Code Provided |
| 3 | `/admin/faculty/add` | POST | Code Provided |
| 4 | `/admin/mentors/redistribute` | POST | ✅ Done |
| 5 | `/admin/batches/add` | POST | ✅ Done |
| 6 | `/admin/timetable/upload` | POST | TODO |
| 7 | `/teacher/timetable` | GET | Template |
| 7 | `/teacher/students/<batch_id>` | GET | Template |
| 8 | `/student/timetable` | GET | Template |
| 8 | `/student/profile` | GET | Template |
| 9 | `/admin/alumni` | GET | Code in Service |

---

## Next Steps to Complete

1. ✅ **Models**: All 8 models complete
2. ✅ **Core Services**: batch_service.py, mentor_service.py complete
3. ⏳ **Route Files**: Create admin_routes.py, teacher_routes.py, student_routes.py
4. ⏳ **Remaining Services**: alumni_service.py, timetable_service.py
5. ⏳ **Templates**: Create HTML templates for each role
6. ⏳ **Authentication**: Implement login/logout for all roles
7. ⏳ **Testing**: Write unit tests for all services

---

**Status:** Core architecture and business logic complete. Route handlers and UI integration ready for implementation.

**Date:** March 3, 2026  
**Version:** 1.0.0
