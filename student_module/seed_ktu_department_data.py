from datetime import date, datetime, timedelta
from pathlib import Path
import random

from app import app, db, calculate_analytics, get_current_semester
from normalize_identity_data import normalize_all_identity_data
from models import (
    Academic,
    Attendance,
    Batch,
    Course,
    DailyAttendance,
    Faculty,
    InternalMark,
    Semester,
    Student,
    StudentAnalytics,
    StudentAttendance,
    StudentMark,
    Subject,
    SubjectAcademicEntry,
    SubjectAllocation,
    SubjectHandlerAttendance,
    SubjectHandlerMark,
    Timetable,
    UniversityMark,
    UniversityResult,
)


BTECH_DEPARTMENTS = [
    "Computer Science and Engineering (CSE)",
    "Electrical and Electronics Engineering (EEE)",
    "Mechanical Engineering (ME)",
    "Civil Engineering (CE)",
    "Electronics and Communication Engineering (ECE)",
]

DEPARTMENT_CODES = {
    "Computer Science and Engineering (CSE)": "CSE",
    "Electrical and Electronics Engineering (EEE)": "EEE",
    "Mechanical Engineering (ME)": "ME",
    "Civil Engineering (CE)": "CE",
    "Electronics and Communication Engineering (ECE)": "ECE",
    "Department of Computer Applications": "MCA",
    "Department of Business Administration": "MBA",
}

FACULTY_NAME_POOL = {
    "Computer Science and Engineering (CSE)": ["Dr. Sam Joseph", "Dr. Nivedita Menon", "Dr. Arun Mathew"],
    "Electrical and Electronics Engineering (EEE)": ["Dr. Rahul Nair", "Dr. Lekha Varghese", "Dr. Sandeep Pillai"],
    "Mechanical Engineering (ME)": ["Dr. Ajith Kumar", "Dr. Meera Thomas", "Dr. Nikhil George"],
    "Civil Engineering (CE)": ["Dr. Anoop Das", "Dr. Sneha Paul", "Dr. Riya Mathew"],
    "Electronics and Communication Engineering (ECE)": ["Dr. Vishnu Raj", "Dr. Keerthana Babu", "Dr. Akhil Joseph"],
    "Department of Computer Applications": ["Dr. Sam Varghese", "Dr. Anjana Roy", "Dr. Vivek Mathew"],
    "Department of Business Administration": ["Dr. Roshni Menon", "Dr. Alan George", "Dr. Neethu Paul"],
}

STUDENT_NAME_POOL = {
    "Computer Science and Engineering (CSE)": [
        "Sam Mathew", "Arun George", "Neha Nair", "Vishnu Raj", "Anna Joseph", "Riya Thomas",
        "Joel Paul", "Akhil Babu", "Nithya Menon", "Alan Philip", "Sreya Roy", "Anand Krishnan",
    ],
    "Electrical and Electronics Engineering (EEE)": [
        "Rahul Joseph", "Sneha Nair", "Abel Thomas", "Meera Paul", "Nikhil Raj", "Anjali Varma",
        "Jerin Mathew", "Sanjana Das", "Anoop Krishnan", "Maria George", "Sreelakshmi Nair", "Adarsh Babu",
    ],
    "Mechanical Engineering (ME)": [
        "Abin Mathew", "Megha Roy", "Sanal Joseph", "Renu Paul", "Kiran Thomas", "Anu Krishnan",
        "Jobin George", "Steffi Nair", "Harish Raj", "Nikhitha Babu", "Manu Pillai", "Keerthi Das",
    ],
    "Civil Engineering (CE)": [
        "Akhil Thomas", "Nimisha Paul", "Vimal Roy", "Asha Nair", "Jithin Joseph", "Sandra Maria",
        "Rohit Krishnan", "Anitta George", "Nivin Babu", "Merin Mathew", "Aravind Das", "Sona Raj",
    ],
    "Electronics and Communication Engineering (ECE)": [
        "Kevin Paul", "Anjana Babu", "Sreedev Raj", "Diya Thomas", "Nithin George", "Gayathri Menon",
        "Arunima Roy", "Jewel Joseph", "Nandhu Krishnan", "Aleena Mathew", "Bibin Paul", "Helen Das",
    ],
    "Department of Computer Applications": [
        "Sam Jacob", "Aparna Nair", "Arjun Thomas", "Miya George", "Rahul Menon", "Sandra Joseph",
        "Vivek Paul", "Anna Maria", "Joel Mathew", "Megha Krishnan", "Alan Roy", "Nitya Babu",
        "Sneha Jacob", "Akhil Varghese", "Meera Nair", "Vishnu Thomas",
    ],
    "Department of Business Administration": [
        "Abel George", "Riya Joseph", "Naveen Raj", "Maya Thomas", "Anand Babu", "Neha Maria",
        "Sanjay Menon", "Keerthi Paul",
    ],
}

GENERATED_STUDENT_NAMES = set()

ACTIVE_BATCHES = {
    "Computer Science and Engineering (CSE)": [(2022, 2026), (2023, 2027), (2024, 2028), (2025, 2029)],
    "Electrical and Electronics Engineering (EEE)": [(2022, 2026), (2023, 2027), (2024, 2028), (2025, 2029)],
    "Mechanical Engineering (ME)": [(2022, 2026), (2023, 2027), (2024, 2028), (2025, 2029)],
    "Civil Engineering (CE)": [(2022, 2026), (2023, 2027), (2024, 2028), (2025, 2029)],
    "Electronics and Communication Engineering (ECE)": [(2022, 2026), (2023, 2027), (2024, 2028), (2025, 2029)],
    "Department of Computer Applications": [(2024, 2026), (2025, 2027), (2024, 2029), (2025, 2030)],
    "Department of Business Administration": [(2024, 2026), (2025, 2027)],
}

KTU_SUBJECTS = {
    "Computer Science and Engineering (CSE)": {
        3: [("CST201", "Data Structures"), ("CST203", "Logic System Design"), ("CST205", "Object Oriented Programming"), ("EST200", "Design Engineering"), ("MAT203", "Discrete Mathematics")],
        5: [("CST301", "System Software"), ("CST303", "Microprocessors"), ("CST305", "Database Management Systems"), ("CST307", "Computer Networks"), ("CST309", "Principles of Software Engineering")],
        7: [("CST401", "Compiler Design"), ("CST403", "Distributed Computing"), ("CST405", "Cryptography"), ("CST407", "Data Mining"), ("CST409", "Project Phase I")],
        8: [("CST402", "Comprehensive Viva"), ("CST404", "Machine Learning"), ("CST406", "Mobile Computing"), ("CST408", "Project Phase II"), ("CST410", "Seminar")],
    },
    "Electrical and Electronics Engineering (EEE)": {
        3: [("EET201", "Circuit Analysis"), ("EET203", "Analog Electronics"), ("EET205", "Electrical Machines I"), ("EST200", "Design Engineering"), ("MAT203", "Transforms and PDE")],
        5: [("EET301", "Power Systems I"), ("EET303", "Microprocessors"), ("EET305", "Linear Control Systems"), ("EET307", "Signals and Systems"), ("EET309", "Electrical Measurements")],
        7: [("EET401", "Power System Operation"), ("EET403", "Industrial Drives"), ("EET405", "Renewable Energy Systems"), ("EET407", "Embedded Systems"), ("EET409", "Project Phase I")],
        8: [("EET402", "High Voltage Engineering"), ("EET404", "Electric Vehicle Technology"), ("EET406", "Project Phase II"), ("EET408", "Comprehensive Viva"), ("EET410", "Seminar")],
    },
    "Mechanical Engineering (ME)": {
        3: [("MET201", "Mechanics of Solids"), ("MET203", "Thermodynamics"), ("MET205", "Manufacturing Technology"), ("EST200", "Design Engineering"), ("MAT203", "Complex Variables")],
        5: [("MET301", "Fluid Machinery"), ("MET303", "Heat Transfer"), ("MET305", "Metrology"), ("MET307", "Dynamics of Machinery"), ("MET309", "Manufacturing Process Lab")],
        7: [("MET401", "Finite Element Methods"), ("MET403", "Industrial Engineering"), ("MET405", "Automobile Engineering"), ("MET407", "Project Phase I"), ("MET409", "Seminar")],
        8: [("MET402", "Project Phase II"), ("MET404", "Operations Management"), ("MET406", "Composite Materials"), ("MET408", "Comprehensive Viva"), ("MET410", "Industrial Safety")],
    },
    "Civil Engineering (CE)": {
        3: [("CET201", "Strength of Materials"), ("CET203", "Fluid Mechanics"), ("CET205", "Surveying"), ("EST200", "Design Engineering"), ("MAT203", "Complex Variables")],
        5: [("CET301", "Structural Analysis I"), ("CET303", "Geotechnical Engineering"), ("CET305", "Transportation Engineering I"), ("CET307", "Hydrology"), ("CET309", "Concrete Technology")],
        7: [("CET401", "Design of Concrete Structures"), ("CET403", "Environmental Engineering"), ("CET405", "Quantity Surveying"), ("CET407", "Project Phase I"), ("CET409", "Seminar")],
        8: [("CET402", "Project Phase II"), ("CET404", "Construction Management"), ("CET406", "Advanced Foundation Engineering"), ("CET408", "Comprehensive Viva"), ("CET410", "Open Elective")],
    },
    "Electronics and Communication Engineering (ECE)": {
        3: [("ECT201", "Signals and Systems"), ("ECT203", "Electronic Devices"), ("ECT205", "Network Theory"), ("EST200", "Design Engineering"), ("MAT203", "Transforms and PDE")],
        5: [("ECT301", "Analog Communication"), ("ECT303", "Microcontrollers"), ("ECT305", "Digital Signal Processing"), ("ECT307", "Control Systems"), ("ECT309", "Linear Integrated Circuits")],
        7: [("ECT401", "Microwave Engineering"), ("ECT403", "Wireless Communication"), ("ECT405", "VLSI Design"), ("ECT407", "Project Phase I"), ("ECT409", "Seminar")],
        8: [("ECT402", "Project Phase II"), ("ECT404", "Embedded Systems"), ("ECT406", "Optical Communication"), ("ECT408", "Comprehensive Viva"), ("ECT410", "Open Elective")],
    },
    "Department of Computer Applications": {
        3: [("MCA301", "Data Structures and Algorithms"), ("MCA303", "Database Management Systems"), ("MCA305", "Operating Systems"), ("MCA307", "Computer Networks"), ("MCA309", "Web Programming Lab")],
        4: [("MCA302", "Design and Analysis of Algorithms"), ("MCA304", "Advanced DBMS"), ("MCA306", "Cloud Computing"), ("MCA308", "Machine Learning"), ("MCA310", "Mini Project")],
        5: [("IMCA501", "Python for Data Science"), ("IMCA503", "Software Engineering"), ("IMCA505", "Computer Organization"), ("IMCA507", "Open Source Lab"), ("IMCA509", "Probability and Statistics")],
    },
    "Department of Business Administration": {
        3: [("MBA301", "Marketing Management"), ("MBA303", "Financial Management"), ("MBA305", "Operations Research"), ("MBA307", "Business Analytics"), ("MBA309", "Organizational Behaviour")],
        4: [("MBA302", "Human Resource Management"), ("MBA304", "Strategic Management"), ("MBA306", "Project Management"), ("MBA308", "Entrepreneurship"), ("MBA310", "Business Ethics")],
    },
}

TIME_SLOTS = [
    "09:00-09:50",
    "09:50-10:40",
    "10:55-11:45",
    "11:45-12:35",
    "13:30-14:20",
    "14:20-15:10",
    "15:20-16:10",
]
WEEKDAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"]


def required_faculty_count(department):
    batch_count = len(ACTIVE_BATCHES.get(department, []))
    total_weekly_slots = batch_count * len(TIME_SLOTS) * len(WEEKDAYS)
    target_max_load = 18
    estimated = (total_weekly_slots + target_max_load - 1) // target_max_load
    minimum = 5 if batch_count <= 2 else 8
    return max(3, minimum, estimated)


def generated_faculty_names(department, existing_count, target_count):
    code = DEPARTMENT_CODES[department]
    return [f"Dr. {code} Faculty {index}" for index in range(existing_count + 1, target_count + 1)]


def target_student_count(department):
    if department == "Department of Computer Applications":
        return 10
    if department == "Department of Business Administration":
        return 8
    return 8


def reset_generated_student_names():
    GENERATED_STUDENT_NAMES.clear()


def course_duration_for_department(department, start_year, end_year):
    if department == "Department of Business Administration":
        return 2
    if department == "Department of Computer Applications" and (end_year - start_year) >= 5:
        return 5
    if department == "Department of Computer Applications":
        return 2
    return 4


def batch_label_for_department(department, start_year, end_year):
    if department == "Department of Computer Applications":
        prefix = "IMCA" if (end_year - start_year) >= 5 else "MCA"
        return f"{prefix} {start_year}-{end_year}"
    return f"{start_year}-{end_year}"


def student_prefix_for_department(department, start_year, end_year):
    if department == "Department of Computer Applications":
        return "IMCA" if (end_year - start_year) >= 5 else "MCA"
    return DEPARTMENT_CODES[department]


def get_or_create_course(name, duration):
    course = Course.query.filter_by(name=name).first()
    if not course:
        course = Course(name=name, duration_years=duration)
        db.session.add(course)
        db.session.flush()
    course.duration_years = duration
    return course


def ensure_canonical_batches():
    for department, batches in ACTIVE_BATCHES.items():
        duration = 2 if department in ("Department of Computer Applications", "Department of Business Administration") else 4
        course = get_or_create_course(department, duration)

        for start_year, end_year in batches:
            existing = Batch.query.filter_by(course_id=course.id, start_year=start_year, end_year=end_year).first()
            if not existing:
                existing = Batch(course_id=course.id, start_year=start_year, end_year=end_year, status="active")
                db.session.add(existing)
            existing.status = "active"

        # Fix legacy BTech rows that were stored with 2-year end dates.
        if department in BTECH_DEPARTMENTS:
            legacy = Batch.query.filter_by(course_id=course.id).all()
            for batch in legacy:
                if batch.start_year >= 2022 and batch.end_year != batch.start_year + 4:
                    batch.end_year = batch.start_year + 4
                    batch.status = "active" if batch.end_year >= 2026 else "completed"

    db.session.flush()


def _faculty_candidates_for_department(department):
    aliases = [department]
    if department == "Computer Science and Engineering (CSE)":
        aliases.extend(["CSE", "CS"])
    if department == "Department of Computer Applications":
        aliases.extend(["MCA", "IMCA", "Computer Applications"])
    if department == "Department of Business Administration":
        aliases.extend(["MBA"])
    return Faculty.query.filter(Faculty.department.in_(aliases)).order_by(Faculty.id.asc()).all()


def ensure_faculty():
    faculty_by_dept = {}
    for department, names in FACULTY_NAME_POOL.items():
        target_count = required_faculty_count(department)
        target_names = names + generated_faculty_names(department, len(names), target_count)
        records = _faculty_candidates_for_department(department)
        while len(records) < len(target_names):
            idx = len(records) + 1
            username = f"{DEPARTMENT_CODES[department].lower()}_fac_{idx}"
            record = Faculty(
                username=username,
                password_hash="demo-hash",
                name=target_names[len(records)],
                email=f"{username}@mentai.local",
                designation="Assistant Professor",
                department=department,
                status="Live",
                is_mentor_eligible=True,
            )
            db.session.add(record)
            db.session.flush()
            records.append(record)

        designations = ["Professor", "Associate Professor", "Assistant Professor"]
        for idx, record in enumerate(records[: len(target_names)]):
            record.name = target_names[idx]
            record.department = department
            record.email = f"{record.username}@mentai.local"
            record.status = "Live"
            record.is_hod = idx == 0
            record.is_subject_handler = idx == 1
            record.is_mentor_eligible = True
            record.designation = "HOD" if idx == 0 else designations[min(idx, len(designations) - 1)]

        faculty_by_dept[department] = records[: len(target_names)]
    db.session.flush()
    return faculty_by_dept


def generate_target_names(department, start_year, end_year, count):
    pool = STUDENT_NAME_POOL[department]
    first_names = list(dict.fromkeys(name.split()[0] for name in pool))
    last_names = list(dict.fromkeys(" ".join(name.split()[1:]) or name.split()[0] for name in pool))
    candidates = []

    for first_name in first_names:
        for last_name in last_names:
            candidates.append(f"{first_name} {last_name}")

    batch_rng = random.Random(f"{department}|{start_year}|{end_year}")
    batch_rng.shuffle(candidates)

    names = []
    for candidate in candidates:
        if candidate in GENERATED_STUDENT_NAMES:
            continue
        GENERATED_STUDENT_NAMES.add(candidate)
        names.append(candidate)
        if len(names) >= count:
            return names

    suffix = 1
    while len(names) < count:
        fallback = f"{department.split()[-1]} Student {start_year % 100:02d}{suffix:02d}"
        if fallback not in GENERATED_STUDENT_NAMES:
            GENERATED_STUDENT_NAMES.add(fallback)
            names.append(fallback)
        suffix += 1
    return names


def _ensure_minimum_students(batch, department, min_count):
    from sqlalchemy import or_

    prefix = student_prefix_for_department(department, batch.start_year, batch.end_year)
    label = batch_label_for_department(department, batch.start_year, batch.end_year)
    existing = Student.query.filter(
        or_(
            Student.batch_id == batch.id,
            db.and_(Student.branch == department, Student.batch == label),
        )
    ).order_by(Student.admission_number.asc()).all()
    target_names = generate_target_names(department, batch.start_year, batch.end_year, max(min_count, len(existing)))
    mentor_pool = ensure_faculty.cache[department]
    batch_code = f"{prefix}{batch.start_year}-{batch.end_year}"

    for idx, student in enumerate(existing):
        student.full_name = target_names[idx]
        student.branch = department
        student.batch = label
        student.batch_id = batch.id
        student.status = "Live"
        student.passout_year = None
        student.email = f"{student.admission_number.lower()}@mentai.local"
        student.mobile_number = f"9{batch.start_year % 100:02d}{batch.end_year % 100:02d}{idx + 1:05d}"[-10:]
        student.mentor_id = mentor_pool[idx % len(mentor_pool)].id
        student.roll_number = student.admission_number

    next_seq = len(existing) + 1
    while len(existing) < min_count:
        admission_number = f"A{str(batch.start_year)[2:]}{prefix}{next_seq:03d}"
        if Student.query.get(admission_number):
            next_seq += 1
            continue
        mentor = mentor_pool[(next_seq - 1) % len(mentor_pool)]
        student = Student(
            admission_number=admission_number,
            roll_number=admission_number,
            full_name=target_names[len(existing)],
            branch=department,
            batch=label,
            batch_id=batch.id,
            email=f"{admission_number.lower()}@mentai.local",
            mobile_number=f"9{batch.start_year % 100:02d}{batch.end_year % 100:02d}{next_seq:05d}"[-10:],
            status="Live",
            mentor_id=mentor.id,
            profile_completed=True,
        )
        student.roll_number = student.admission_number
        db.session.add(student)
        existing.append(student)
        next_seq += 1

    return existing


def ensure_students():
    students_by_batch = {}
    for department, batches in ACTIVE_BATCHES.items():
        course = Course.query.filter_by(name=department).first()
        for start_year, end_year in batches:
            batch = Batch.query.filter_by(course_id=course.id, start_year=start_year, end_year=end_year).first()
            if not batch:
                continue
            students_by_batch[(department, start_year, end_year)] = _ensure_minimum_students(
                batch,
                department,
                target_student_count(department),
            )

    db.session.flush()
    return students_by_batch


def current_and_previous_semester(department, start_year, end_year):
    duration = course_duration_for_department(department, start_year, end_year)
    current_sem = get_current_semester(start_year, duration)
    previous_sem = max(1, current_sem - 1)
    return current_sem, previous_sem


def get_or_create_semester(number):
    sem = Semester.query.filter_by(name=f"Semester {number}").first()
    if not sem:
        sem = Semester(name=f"Semester {number}")
        db.session.add(sem)
        db.session.flush()
    return sem


def subject_list_for(department, semester):
    subject_map = KTU_SUBJECTS.get(department, {})
    return subject_map.get(semester) or subject_map.get(max(subject_map.keys()))


def get_or_create_subject(department, course_id, semester_number, code, title):
    semester = get_or_create_semester(semester_number)
    subject_name = f"{code} - {title} ({DEPARTMENT_CODES[department]})"
    subject = Subject.query.filter_by(semester_id=semester.id, name=subject_name).first()
    if not subject:
        subject = Subject(name=subject_name, course_id=course_id, semester_id=semester.id)
        db.session.add(subject)
        db.session.flush()
    return subject


def seed_subjects_and_allocations(faculty_by_dept):
    subject_map = {}
    for department, batches in ACTIVE_BATCHES.items():
        course = Course.query.filter_by(name=department).first()
        faculty_pool = faculty_by_dept[department]
        pool_size = len(faculty_pool)
        batch_stride = max(1, pool_size // max(1, len(batches)))

        for batch_index, (start_year, end_year) in enumerate(batches):
            current_sem, previous_sem = current_and_previous_semester(department, start_year, end_year)
            for sem_number in (current_sem, previous_sem):
                sem_subjects = []
                for idx, (code, title) in enumerate(subject_list_for(department, sem_number)):
                    subject = get_or_create_subject(department, course.id, sem_number, code, title)
                    faculty = faculty_pool[(idx + (batch_index * batch_stride)) % pool_size]
                    allocation = SubjectAllocation.query.filter_by(subject_id=subject.id, faculty_id=faculty.id).first()
                    if not allocation:
                        allocation = SubjectAllocation(subject_id=subject.id, faculty_id=faculty.id)
                        db.session.add(allocation)
                    sem_subjects.append((subject, faculty, code, title))
                subject_map[(department, start_year, end_year, sem_number)] = sem_subjects
    db.session.flush()
    return subject_map


def clear_existing_academic_data():
    for model in [
        StudentAnalytics,
        SubjectAcademicEntry,
        SubjectHandlerAttendance,
        SubjectHandlerMark,
        StudentMark,
        UniversityResult,
        UniversityMark,
        InternalMark,
        Attendance,
        DailyAttendance,
        StudentAttendance,
        Timetable,
        SubjectAllocation,
        Subject,
        Semester,
    ]:
        model.query.delete()
    db.session.commit()


PROFILE_LIBRARY = [
    {
        "label": "critical",
        "attendance_band": "poor",
        "attendance_trend": "declining",
        "attendance_pct": 58.0,
        "daily_present_ratio": 0.58,
        "current_failed_subjects": 4,
        "previous_failed_subjects": 3,
        "current_patterns": [(8.0, 11.0, 14.0), (10.0, 13.0, 16.0), (13.0, 16.0, 19.0), (17.0, 20.0, 24.0), (28.0, 31.0, 34.0)],
        "previous_scores": [18.0, 22.0, 26.0, 31.0, 36.0],
        "assignment_submitted": False,
    },
    {
        "label": "high-medium",
        "attendance_band": "poor",
        "attendance_trend": "declining",
        "attendance_pct": 66.0,
        "daily_present_ratio": 0.66,
        "current_failed_subjects": 3,
        "previous_failed_subjects": 2,
        "current_patterns": [(24.0, 27.0, 30.0), (29.0, 32.0, 35.0), (33.0, 36.0, 39.0), (38.0, 40.0, 43.0), (42.0, 45.0, 48.0)],
        "previous_scores": [33.0, 36.0, 39.0, 44.0, 48.0],
        "assignment_submitted": False,
    },
    {
        "label": "medium-backlog",
        "attendance_band": "poor",
        "attendance_trend": "stable",
        "attendance_pct": 73.0,
        "daily_present_ratio": 0.73,
        "current_failed_subjects": 2,
        "previous_failed_subjects": 1,
        "current_patterns": [(31.0, 35.0, 38.0), (36.0, 39.0, 42.0), (42.0, 44.0, 47.0), (46.0, 48.0, 50.0), (49.0, 52.0, 55.0)],
        "previous_scores": [38.0, 44.0, 48.0, 52.0, 56.0],
        "assignment_submitted": False,
    },
    {
        "label": "recovering",
        "attendance_band": "moderate",
        "attendance_trend": "improving",
        "attendance_pct": 78.0,
        "daily_present_ratio": 0.78,
        "current_failed_subjects": 1,
        "previous_failed_subjects": 1,
        "current_patterns": [(35.0, 39.0, 43.0), (41.0, 45.0, 49.0), (46.0, 49.0, 52.0), (50.0, 53.0, 56.0), (54.0, 57.0, 60.0)],
        "previous_scores": [39.0, 46.0, 51.0, 56.0, 60.0],
        "assignment_submitted": True,
    },
    {
        "label": "stable-average",
        "attendance_band": "moderate",
        "attendance_trend": "stable",
        "attendance_pct": 82.0,
        "daily_present_ratio": 0.82,
        "current_failed_subjects": 0,
        "previous_failed_subjects": 0,
        "current_patterns": [(45.0, 49.0, 54.0), (50.0, 54.0, 58.0), (55.0, 58.0, 61.0), (58.0, 61.0, 64.0), (60.0, 64.0, 67.0)],
        "previous_scores": [52.0, 56.0, 60.0, 64.0, 68.0],
        "assignment_submitted": True,
    },
    {
        "label": "stable-good",
        "attendance_band": "above_average",
        "attendance_trend": "stable",
        "attendance_pct": 87.0,
        "daily_present_ratio": 0.87,
        "current_failed_subjects": 0,
        "previous_failed_subjects": 0,
        "current_patterns": [(52.0, 57.0, 61.0), (58.0, 62.0, 66.0), (61.0, 65.0, 69.0), (64.0, 68.0, 72.0), (67.0, 71.0, 75.0)],
        "previous_scores": [58.0, 62.0, 67.0, 71.0, 75.0],
        "assignment_submitted": True,
    },
    {
        "label": "strong",
        "attendance_band": "above_average",
        "attendance_trend": "improving",
        "attendance_pct": 91.0,
        "daily_present_ratio": 0.91,
        "current_failed_subjects": 0,
        "previous_failed_subjects": 0,
        "current_patterns": [(60.0, 64.0, 69.0), (64.0, 68.0, 72.0), (68.0, 72.0, 76.0), (72.0, 76.0, 80.0), (76.0, 80.0, 84.0)],
        "previous_scores": [66.0, 70.0, 74.0, 79.0, 83.0],
        "assignment_submitted": True,
    },
    {
        "label": "topper",
        "attendance_band": "above_average",
        "attendance_trend": "stable",
        "attendance_pct": 95.0,
        "daily_present_ratio": 0.95,
        "current_failed_subjects": 0,
        "previous_failed_subjects": 0,
        "current_patterns": [(72.0, 77.0, 82.0), (76.0, 81.0, 85.0), (81.0, 85.0, 89.0), (84.0, 88.0, 92.0), (87.0, 91.0, 95.0)],
        "previous_scores": [78.0, 83.0, 87.0, 91.0, 95.0],
        "assignment_submitted": True,
    },
]

ATTENDANCE_BANDS = {
    "poor": (58.0, 74.0),
    "moderate": (75.0, 84.0),
    "above_average": (85.0, 96.0),
}


def build_student_profile(index_in_batch):
    return PROFILE_LIBRARY[index_in_batch % len(PROFILE_LIBRARY)]


def _clamp(value, minimum, maximum):
    return max(minimum, min(maximum, value))


def build_subject_attendance_plan(profile, student_id, subject_count):
    band_min, band_max = ATTENDANCE_BANDS[profile["attendance_band"]]
    rng = random.Random(f"subject-attendance|{student_id}|{profile['label']}")
    plan = []

    for subject_index in range(subject_count):
        total_classes = rng.randint(38, 46)
        pct_offset = rng.uniform(-5.0, 5.0) + ((subject_index % 3) - 1) * 1.4
        target_pct = _clamp(profile["attendance_pct"] + pct_offset, band_min, band_max)
        attended_classes = max(0, min(total_classes, round(total_classes * target_pct / 100)))
        percentage = round((attended_classes / total_classes) * 100, 1) if total_classes else 0.0
        plan.append({
            "total_classes": total_classes,
            "attended_classes": attended_classes,
            "percentage": percentage,
        })

    return plan


def build_presence_slots(slot_count, target_present, trend, rng):
    if slot_count <= 0:
        return []

    target_present = max(0, min(slot_count, target_present))
    scored_slots = []
    denominator = max(1, slot_count - 1)

    for index in range(slot_count):
        progress = index / denominator
        score = rng.random()
        if trend == "improving":
            score += progress * 0.35
        elif trend == "declining":
            score += (1 - progress) * 0.35
        else:
            score += 0.15 - abs(progress - 0.5) * 0.1
        scored_slots.append((score, index))

    scored_slots.sort(reverse=True)
    present_indexes = {index for _score, index in scored_slots[:target_present]}
    return [1 if index in present_indexes else 0 for index in range(slot_count)]


def subject_internal_scores(profile, subject_index):
    fail_cutoff = min(profile["current_failed_subjects"], len(profile["current_patterns"]))
    if subject_index < fail_cutoff:
        return tuple(round(min(50.0, max(0.0, score)), 2) for score in profile["current_patterns"][subject_index])
    safe_index = fail_cutoff + ((subject_index - fail_cutoff) % max(1, len(profile["current_patterns"]) - fail_cutoff))
    return tuple(round(min(50.0, max(0.0, score)), 2) for score in profile["current_patterns"][safe_index])


def subject_university_score(profile, subject_index):
    if subject_index < profile["previous_failed_subjects"]:
        return profile["previous_scores"][subject_index]
    safe_scores = profile["previous_scores"][profile["previous_failed_subjects"]:] or profile["previous_scores"]
    return safe_scores[(subject_index - profile["previous_failed_subjects"]) % len(safe_scores)]


def university_mark_to_grade_point(mark):
    value = float(mark or 0)
    if value >= 90:
        return 10.0
    if value >= 80:
        return 9.0
    if value >= 70:
        return 8.0
    if value >= 60:
        return 7.0
    if value >= 50:
        return 6.0
    if value >= 45:
        return 5.0
    if value >= 40:
        return 4.0
    return 0.0


def _ensure_marksheet_placeholder(student_id, semester):
    marksheet_dir = Path(app.root_path) / "static" / "marksheets"
    marksheet_dir.mkdir(parents=True, exist_ok=True)
    file_name = f"{student_id.lower()}_sem{semester}.pdf"
    file_path = marksheet_dir / file_name
    if not file_path.exists():
        file_path.write_bytes(b"%PDF-1.1\n% demo marksheet placeholder\n")
    return f"marksheets/{file_name}"


def seed_academic_records(students_by_batch, subject_map):
    today = date.today()

    for department, batches in ACTIVE_BATCHES.items():
        for batch_index, (start_year, end_year) in enumerate(batches):
            batch = Batch.query.join(Course).filter(
                Course.name == department,
                Batch.start_year == start_year,
                Batch.end_year == end_year,
            ).first()
            if not batch:
                continue

            label = batch_label_for_department(department, start_year, end_year)
            current_sem, previous_sem = current_and_previous_semester(department, start_year, end_year)
            current_subjects = subject_map[(department, start_year, end_year, current_sem)]
            previous_subjects = subject_map[(department, start_year, end_year, previous_sem)]
            batch_students = Student.query.filter_by(batch_id=batch.id).order_by(Student.admission_number.asc()).all()

            for student_index, student in enumerate(batch_students):
                student.branch = department
                student.batch = label
                student.batch_id = batch.id
                student.status = "Live"
                student.passout_year = None
                student.profile_completed = True
                academic_record = student.academics
                if not academic_record:
                    academic_record = Academic(student_admission_number=student.admission_number)
                    db.session.add(academic_record)

                profile = build_student_profile(student_index)
                subject_attendance_plan = build_subject_attendance_plan(
                    profile,
                    student.admission_number,
                    len(current_subjects),
                )
                avg_attendance_pct = (
                    sum(item["percentage"] for item in subject_attendance_plan) / len(subject_attendance_plan)
                    if subject_attendance_plan else profile["attendance_pct"]
                )
                current_sem_university_scores = []

                for subject_index, (subject, faculty, code, _title) in enumerate(current_subjects):
                    i1, i2, i3 = subject_internal_scores(profile, subject_index)
                    attendance_plan = subject_attendance_plan[subject_index]
                    attendance = Attendance(
                        student_admission_number=student.admission_number,
                        subject_name=subject.name,
                        subject_code=code,
                        semester=current_sem,
                        total_classes=attendance_plan["total_classes"],
                        attended_classes=attendance_plan["attended_classes"],
                        percentage=attendance_plan["percentage"],
                    )
                    db.session.add(attendance)

                    db.session.add(InternalMark(student_id=student.admission_number, subject_id=subject.id, exam_type="Internal1", marks=i1, uploaded_by=faculty.id))
                    db.session.add(InternalMark(student_id=student.admission_number, subject_id=subject.id, exam_type="Internal2", marks=i2, uploaded_by=faculty.id))
                    db.session.add(InternalMark(student_id=student.admission_number, subject_id=subject.id, exam_type="Internal3", marks=i3, uploaded_by=faculty.id))

                    db.session.add(SubjectHandlerMark(student_id=student.admission_number, subject_code=code, exam_type="Internal1", marks_obtained=i1, max_marks=50, subject_handler_id=faculty.id))
                    db.session.add(SubjectHandlerMark(student_id=student.admission_number, subject_code=code, exam_type="Internal2", marks_obtained=i2, max_marks=50, subject_handler_id=faculty.id))
                    db.session.add(SubjectHandlerMark(student_id=student.admission_number, subject_code=code, exam_type="Internal3", marks_obtained=i3, max_marks=50, subject_handler_id=faculty.id))

                    db.session.add(SubjectAcademicEntry(
                        student_id=student.admission_number,
                        subject_code=code,
                        internal_assessment_score=round((i1 + i2 + i3) / 3, 2),
                        assignment_submitted=profile["assignment_submitted"],
                        practical_lab_score=round(min(50, ((i1 + i2 + i3) / 3) + 4), 2),
                        subject_handler_id=faculty.id,
                    ))

                    subject_dates = []
                    for offset in range(1, 16):
                        day = today - timedelta(days=offset * 2)
                        if day.weekday() >= 5:
                            continue
                        subject_dates.append(day)
                    subject_rng = random.Random(f"handler-attendance|{student.admission_number}|{code}")
                    subject_target = round(len(subject_dates) * attendance_plan["percentage"] / 100)
                    subject_slots = build_presence_slots(
                        len(subject_dates),
                        subject_target,
                        profile["attendance_trend"],
                        subject_rng,
                    )
                    for day, is_present in zip(subject_dates, subject_slots):
                        db.session.add(SubjectHandlerAttendance(
                            student_id=student.admission_number,
                            subject_code=code,
                            date=day,
                            status="Present" if is_present == 1 else "Absent",
                            subject_handler_id=faculty.id,
                        ))

                for subject_index, (subject, faculty, code, _title) in enumerate(previous_subjects):
                    uni = subject_university_score(profile, subject_index)
                    current_sem_university_scores.append(uni)
                    i1, i2, i3 = subject_internal_scores(profile, subject_index)
                    db.session.add(StudentMark(
                        student_id=student.admission_number,
                        subject_code=code,
                        exam_type="KTU-Internal",
                        internal1=i1,
                        internal2=i2,
                        internal3=i3,
                        university_mark=uni,
                        semester=previous_sem,
                        is_verified=True,
                    ))
                    db.session.add(UniversityResult(
                        student_id=student.admission_number,
                        semester=previous_sem,
                        subject=subject.name,
                        marks_obtained=uni,
                        total_marks=100,
                        result_date=today - timedelta(days=45),
                        status="verified",
                        verified_by_mentor_id=faculty.id,
                        verified_at=datetime.utcnow(),
                        mentor_comment="Failed subject - supplementary support required." if uni < 40 else "Performance reviewed and verified.",
                    ))

                prev_semester = get_or_create_semester(previous_sem)
                db.session.add(UniversityMark(
                    student_id=student.admission_number,
                    semester_id=prev_semester.id,
                    pdf_path=_ensure_marksheet_placeholder(student.admission_number, previous_sem),
                ))

                if current_sem_university_scores:
                    grade_points = [university_mark_to_grade_point(score) for score in current_sem_university_scores]
                    semester_sgpa = round(sum(grade_points) / len(grade_points), 2)
                    if academic_record.sgpa is None:
                        academic_record.sgpa = semester_sgpa
                    if academic_record.cgpa is None:
                        academic_record.cgpa = semester_sgpa

                start_day = today - timedelta(days=20)
                daily_dates = []
                for day_offset in range(20):
                    current_day = start_day + timedelta(days=day_offset)
                    if current_day.weekday() < 5:
                        daily_dates.append(current_day)

                daily_rng = random.Random(f"daily-attendance|{student.admission_number}|{profile['label']}")
                total_slots = len(daily_dates) * 7
                target_present_slots = round(total_slots * avg_attendance_pct / 100)
                hourly_presence = build_presence_slots(
                    total_slots,
                    target_present_slots,
                    profile["attendance_trend"],
                    daily_rng,
                )

                for day_index, current_day in enumerate(daily_dates):
                    day_slots = hourly_presence[day_index * 7:(day_index + 1) * 7]
                    db.session.add(DailyAttendance(
                        student_admission_number=student.admission_number,
                        date=current_day,
                        hour_1=day_slots[0],
                        hour_2=day_slots[1],
                        hour_3=day_slots[2],
                        hour_4=day_slots[3],
                        hour_5=day_slots[4],
                        hour_6=day_slots[5],
                        hour_7=day_slots[6],
                    ))
                    db.session.add(StudentAttendance(
                        student_admission_number=student.admission_number,
                        date=current_day,
                        status="P" if sum(day_slots) >= 4 else "A",
                    ))

    db.session.commit()


def seed_timetables(subject_map):
    academic_year = f"{datetime.now().year}-{datetime.now().year + 1}"
    for department, batches in ACTIVE_BATCHES.items():
        for start_year, end_year in batches:
            current_sem, _previous_sem = current_and_previous_semester(department, start_year, end_year)
            subjects = subject_map[(department, start_year, end_year, current_sem)]
            batch_label = batch_label_for_department(department, start_year, end_year)

            for day_index, day in enumerate(WEEKDAYS):
                for period, slot in enumerate(TIME_SLOTS, start=1):
                    subject, faculty, code, title = subjects[(day_index + period - 1) % len(subjects)]
                    db.session.add(Timetable(
                        department=department,
                        batch=batch_label,
                        day=day,
                        period=period,
                        time_slot=slot,
                        subject=f"{code} - {title}",
                        handler_name=faculty.name,
                        handler_id=faculty.id,
                        course_id=subject.course_id,
                        batch_id=Batch.query.join(Course).filter(Course.name == department, Batch.start_year == start_year, Batch.end_year == end_year).first().id,
                        semester=current_sem,
                        academic_year=academic_year,
                    ))
    db.session.commit()

    conflicts = db.session.execute(
        db.text(
            """
            SELECT handler_id, day, period, COUNT(*) AS cnt
            FROM timetables
            WHERE handler_id IS NOT NULL
            GROUP BY handler_id, day, period
            HAVING COUNT(*) > 1
            """
        )
    ).fetchall()
    if conflicts:
        raise RuntimeError(f"Timetable seeding created {len(conflicts)} faculty slot conflicts")


def refresh_analytics():
    for student in Student.query.filter_by(status="Live").all():
        calculate_analytics(student.admission_number)
    db.session.commit()


def seed_ktu_department_data():
    with app.app_context():
        random.seed(42)
        reset_generated_student_names()
        ensure_canonical_batches()
        faculty_by_dept = ensure_faculty()
        ensure_faculty.cache = faculty_by_dept
        ensure_students()
        clear_existing_academic_data()
        subject_map = seed_subjects_and_allocations(faculty_by_dept)
        students_by_batch = ensure_students()
        seed_academic_records(students_by_batch, subject_map)
        seed_timetables(subject_map)
        normalize_all_identity_data()
        refresh_analytics()
        print("KTU-style demo data repaired successfully.")


if __name__ == "__main__":
    seed_ktu_department_data()
