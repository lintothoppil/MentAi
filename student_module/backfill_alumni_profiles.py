from __future__ import annotations

from datetime import date, datetime, timedelta
import random

from app import app, db
from models import (
    Academic,
    AlumniMentorHistory,
    AlumniStudent,
    Attendance,
    Batch,
    Course,
    Faculty,
    Guardian,
    MentorPrivateNote,
    MentoringSession,
    OtherInfo,
    Parent,
    Student,
    StudentMark,
    UniversityResult,
    WorkExperience,
)
from seed_ktu_department_data import STUDENT_NAME_POOL


TARGET_BATCHES = {
    "Computer Science and Engineering (CSE)": (2020, 2024),
    "Electrical and Electronics Engineering (EEE)": (2021, 2025),
    "Mechanical Engineering (ME)": (2021, 2025),
    "Civil Engineering (CE)": (2021, 2025),
    "Electronics and Communication Engineering (ECE)": (2021, 2025),
    "Department of Computer Applications": (2023, 2025),
    "Department of Business Administration": (2023, 2025),
}

COURSE_DURATION = {
    "Department of Computer Applications": 2,
    "Department of Business Administration": 2,
}

DEPARTMENT_PREFIX = {
    "Computer Science and Engineering (CSE)": "CSE",
    "Electrical and Electronics Engineering (EEE)": "EEE",
    "Mechanical Engineering (ME)": "ME",
    "Civil Engineering (CE)": "CE",
    "Electronics and Communication Engineering (ECE)": "ECE",
    "Department of Computer Applications": "MCA",
    "Department of Business Administration": "MBA",
}

KERALA_TOWNS = [
    "Kochi", "Thrissur", "Kottayam", "Kozhikode", "Kannur", "Alappuzha",
    "Palakkad", "Kollam", "Pathanamthitta", "Ernakulam",
]
STREETS = [
    "Rose Villa", "Green Gardens", "Lake View", "Hill Crest", "Cedar Court",
    "Palm Residency", "Silver Springs", "Mango Meadows", "River Dale", "Sunrise Enclave",
]
FATHER_NAMES = [
    "Joseph", "Thomas", "George", "Mathew", "Krishnan", "Rajan", "Ravi", "Paul", "Babu", "Nair",
]
MOTHER_NAMES = [
    "Mini", "Latha", "Anitha", "Sreedevi", "Rani", "Bindu", "Priya", "Deepa", "Rekha", "Suma",
]
GUARDIAN_NAMES = [
    "Sajan Thomas", "Liji George", "Anoop Nair", "Reena Paul", "Roshni Mathew", "Jaya Krishnan",
]
PROFESSIONS = [
    "Teacher", "Engineer", "Accountant", "Business Owner", "Nurse", "Bank Officer", "Farmer", "Manager",
]
HOSTELS = [
    "St. Mary's Hostel", "Carmel Residency", "Scholars Nest", "Campus View Hostel",
]
TRANSPORT = ["Bus", "Two Wheeler", "Car", "College Van"]
NOTE_TYPES = ["progress", "wellbeing", "career", "attendance"]
COMPANIES = [
    "Infosys", "TCS", "Wipro", "UST", "QBurst", "Cognizant", "Byju's", "EY"
]
JOB_TITLES = [
    "Software Engineer Intern", "Business Analyst Intern", "Graduate Trainee", "Project Coordinator"
]


def ensure_course_and_batch(department: str, start_year: int, end_year: int) -> Batch:
    duration = COURSE_DURATION.get(department, 4)
    course = Course.query.filter_by(name=department).first()
    if not course:
        course = Course(name=department, duration_years=duration)
        db.session.add(course)
        db.session.flush()
    batch = Batch.query.filter_by(course_id=course.id, start_year=start_year, end_year=end_year).first()
    if not batch:
        batch = Batch(course_id=course.id, start_year=start_year, end_year=end_year, status="completed")
        db.session.add(batch)
        db.session.flush()
    batch.status = "completed"
    return batch


def build_name_candidates(department: str, count: int) -> list[str]:
    pool = STUDENT_NAME_POOL[department]
    first_names = list(dict.fromkeys(name.split()[0] for name in pool))
    last_names = list(dict.fromkeys(" ".join(name.split()[1:]) or name.split()[0] for name in pool))
    rng = random.Random(f"alumni-names|{department}")
    candidates = [f"{first} {last}" for first in first_names for last in last_names]
    rng.shuffle(candidates)
    return candidates[:count]


def get_department_faculty(department: str) -> list[Faculty]:
    faculty = Faculty.query.filter_by(department=department).order_by(Faculty.id.asc()).all()
    if faculty:
        return faculty
    return Faculty.query.order_by(Faculty.id.asc()).all()


def get_or_create_student(batch: Batch, department: str, admission_number: str, name: str, mentor_id: int | None, index: int) -> Student:
    label = f"{DEPARTMENT_PREFIX[department]} {batch.start_year}-{batch.end_year}" if department == "Department of Computer Applications" else f"{batch.start_year}-{batch.end_year}"
    student = db.session.get(Student, admission_number)
    if not student:
        student = Student(
            admission_number=admission_number,
            roll_number=admission_number,
            email=f"{admission_number.lower()}@mentai.edu",
            full_name=name,
            branch=department,
            batch=label,
            batch_id=batch.id,
            status="Passed Out",
            passout_year=batch.end_year,
            mentor_id=None,
            profile_completed=True,
        )
        db.session.add(student)
        db.session.flush()

    month = (index % 12) + 1
    day = min(28, 5 + index)
    birth_year = batch.start_year - (18 + (index % 4))
    student.full_name = name
    student.roll_number = admission_number
    student.email = f"{admission_number.lower()}@mentai.edu"
    student.branch = department
    student.batch = label
    student.batch_id = batch.id
    student.status = "Passed Out"
    student.passout_year = batch.end_year
    student.profile_completed = True
    student.mobile_number = f"9{batch.start_year % 100:02d}{batch.end_year % 100:02d}{index + 1:05d}"[-10:]
    student.dob = date(birth_year, month, day)
    student.age = max(21, 2026 - birth_year)
    student.blood_group = ["A+", "B+", "O+", "AB+", "A-", "O+"][index % 6]
    student.religion = ["Christian", "Hindu", "Muslim"][index % 3]
    student.diocese = "Ernakulam-Angamaly" if student.religion == "Christian" else None
    student.parish = "St. George Parish" if student.religion == "Christian" else None
    student.caste_category = ["General", "OBC", "SC/ST"][index % 3]
    student.permanent_address = f"{STREETS[index % len(STREETS)]}, {KERALA_TOWNS[index % len(KERALA_TOWNS)]}, Kerala"
    student.contact_address = student.permanent_address
    student.mentor_remarks = [
        "Consistent performer with strong classroom participation.",
        "Needed guidance in time management but showed steady improvement.",
        "Actively engaged in mentoring sessions and placement preparation.",
        "Displayed leadership in group work and project reviews.",
    ][index % 4]
    student.created_at = datetime(batch.start_year, 7, 1) + timedelta(days=index)
    return student


def ensure_academic_profile(student: Student, batch: Batch, index: int) -> None:
    academic = Academic.query.filter_by(student_admission_number=student.admission_number).first()
    if not academic:
        academic = Academic(student_admission_number=student.admission_number)
        db.session.add(academic)

    cgpa = round(6.8 + ((index % 8) * 0.32), 2)
    sgpa = round(min(9.4, cgpa + 0.18), 2)
    academic.school_10th = f"St. Joseph's HSS, {KERALA_TOWNS[index % len(KERALA_TOWNS)]}"
    academic.board_10th = "State Board"
    academic.percentage_10th = round(78 + ((index * 3) % 17), 2)
    academic.school_12th = f"Govt. Model HSS, {KERALA_TOWNS[(index + 2) % len(KERALA_TOWNS)]}"
    academic.board_12th = "Higher Secondary"
    academic.percentage_12th = round(74 + ((index * 4) % 20), 2)
    academic.college_ug = f"{KERALA_TOWNS[(index + 1) % len(KERALA_TOWNS)]} College"
    academic.university_ug = "APJ Abdul Kalam Technological University"
    academic.percentage_ug = round(70 + ((index * 2) % 18), 2)
    academic.sgpa = sgpa
    academic.cgpa = cgpa
    academic.medium_of_instruction = "English"
    academic.entrance_rank = f"LBS-{250 + index}"
    academic.nature_of_admission = ["Merit", "Management", "Merit"][index % 3]


def ensure_family_profile(student: Student, index: int) -> None:
    parent = Parent.query.filter_by(student_admission_number=student.admission_number).first()
    if not parent:
        parent = Parent(student_admission_number=student.admission_number)
        db.session.add(parent)
    parent.father_name = f"{FATHER_NAMES[index % len(FATHER_NAMES)]} {student.full_name.split()[-1]}"
    parent.father_profession = PROFESSIONS[index % len(PROFESSIONS)]
    parent.father_age = 48 + (index % 8)
    parent.father_mobile = f"8{index + 100000000:09d}"[:10]
    parent.mother_name = f"{MOTHER_NAMES[index % len(MOTHER_NAMES)]} {student.full_name.split()[-1]}"
    parent.mother_profession = PROFESSIONS[(index + 3) % len(PROFESSIONS)]
    parent.mother_age = 43 + (index % 7)
    parent.mother_mobile = f"7{index + 200000000:09d}"[:10]
    parent.father_place_of_work = KERALA_TOWNS[(index + 3) % len(KERALA_TOWNS)]
    parent.mother_place_of_work = KERALA_TOWNS[(index + 5) % len(KERALA_TOWNS)]

    guardian = Guardian.query.filter_by(student_admission_number=student.admission_number).first()
    if not guardian:
        guardian = Guardian(student_admission_number=student.admission_number)
        db.session.add(guardian)
    guardian.name = GUARDIAN_NAMES[index % len(GUARDIAN_NAMES)]
    guardian.mobile_number = f"9{index + 300000000:09d}"[:10]
    guardian.address = f"{STREETS[(index + 4) % len(STREETS)]}, {KERALA_TOWNS[(index + 4) % len(KERALA_TOWNS)]}, Kerala"

    other = OtherInfo.query.filter_by(student_admission_number=student.admission_number).first()
    if not other:
        other = OtherInfo(student_admission_number=student.admission_number)
        db.session.add(other)
    accommodation = "Hosteler" if index % 2 == 0 else "Day Scholar"
    other.siblings_details = "One younger sibling studying in school."
    other.accommodation_type = accommodation
    other.staying_with = "Parents" if accommodation == "Day Scholar" else None
    other.hostel_name = HOSTELS[index % len(HOSTELS)] if accommodation == "Hosteler" else None
    other.stay_from = date(batch_year_for_student(student) - 2, 6, 1) if accommodation == "Hosteler" else None
    other.stay_to = date(student.passout_year or 2025, 4, 15) if accommodation == "Hosteler" else None
    other.transport_mode = TRANSPORT[index % len(TRANSPORT)] if accommodation == "Day Scholar" else None
    other.vehicle_number = (
        f"KL-{(index % 14) + 1:02d}-{4500 + index}"
        if accommodation == "Day Scholar" and other.transport_mode != "Bus"
        else None
    )


def batch_year_for_student(student: Student) -> int:
    return int(student.admission_number[1:3]) + 2000


def ensure_work_experience(student: Student, index: int) -> None:
    existing = WorkExperience.query.filter_by(student_admission_number=student.admission_number).all()
    if existing:
        target = existing[0]
    else:
        target = WorkExperience(student_admission_number=student.admission_number)
        db.session.add(target)
    if index % 2 == 0:
        target.organization = COMPANIES[index % len(COMPANIES)]
        target.job_title = JOB_TITLES[index % len(JOB_TITLES)]
        target.duration = f"{3 + (index % 4)} months"
    else:
        target.organization = None
        target.job_title = None
        target.duration = None


def ensure_attendance_and_marks(student: Student, department: str, index: int) -> None:
    attendance_rows = Attendance.query.filter_by(student_admission_number=student.admission_number).all()
    if len(attendance_rows) < 5:
        Attendance.query.filter_by(student_admission_number=student.admission_number).delete()
        for subject_index in range(5):
            total = 42 + subject_index
            attended = total - (subject_index + (index % 4))
            db.session.add(Attendance(
                student_admission_number=student.admission_number,
                subject_name=f"{DEPARTMENT_PREFIX[department]} Core Subject {subject_index + 1}",
                subject_code=f"{DEPARTMENT_PREFIX[department]}{301 + subject_index}",
                semester=4 if department in ("Department of Computer Applications", "Department of Business Administration") else 8,
                total_classes=total,
                attended_classes=attended,
                percentage=round((attended / total) * 100, 2),
            ))

    mark_rows = StudentMark.query.filter_by(student_id=student.admission_number).all()
    if len(mark_rows) < 5:
        StudentMark.query.filter_by(student_id=student.admission_number).delete()
        for subject_index in range(5):
            base = 32 + subject_index * 3 + (index % 6)
            db.session.add(StudentMark(
                student_id=student.admission_number,
                subject_code=f"{DEPARTMENT_PREFIX[department]}{401 + subject_index}",
                exam_type="Final",
                internal1=base,
                internal2=base + 4,
                internal3=base + 7,
                university_mark=58 + subject_index * 4 + (index % 8),
                semester=4 if department in ("Department of Computer Applications", "Department of Business Administration") else 8,
                is_verified=True,
            ))

    result_rows = UniversityResult.query.filter_by(student_id=student.admission_number).all()
    if len(result_rows) < 5:
        UniversityResult.query.filter_by(student_id=student.admission_number).delete()
        for subject_index in range(5):
            db.session.add(UniversityResult(
                student_id=student.admission_number,
                semester=4 if department in ("Department of Computer Applications", "Department of Business Administration") else 8,
                subject=f"{DEPARTMENT_PREFIX[department]} Advanced Subject {subject_index + 1}",
                marks_obtained=60 + subject_index * 5 + (index % 6),
                total_marks=100,
                result_date=date(student.passout_year or 2025, 4, min(26, 10 + subject_index)),
                status="verified",
                verified_by_mentor_id=AlumniStudent.query.filter_by(admission_number=student.admission_number).first().mentor_id,
                verified_at=datetime(student.passout_year or 2025, 5, min(25, 12 + subject_index), 10, 0, 0),
                mentor_comment="Overall performance was reviewed and found satisfactory.",
            ))


def ensure_mentoring(student: Student, mentor: Faculty | None, index: int) -> None:
    alumni = AlumniStudent.query.filter_by(admission_number=student.admission_number).first()
    if mentor and alumni:
        alumni.mentor_id = mentor.id
        history = AlumniMentorHistory.query.filter_by(
            admission_number=student.admission_number,
            mentor_id=mentor.id,
        ).first()
        if not history:
            db.session.add(AlumniMentorHistory(
                admission_number=student.admission_number,
                mentor_id=mentor.id,
                start_date=student.created_at or datetime.utcnow(),
                end_date=datetime((student.passout_year or 2025), 4, 15, 15, 0, 0),
            ))

    sessions = MentoringSession.query.filter_by(student_admission_number=student.admission_number).all()
    if len(sessions) < 2 and mentor:
        MentoringSession.query.filter_by(student_admission_number=student.admission_number).delete()
        for session_index in range(2):
            session_date = date((student.passout_year or 2025), 2 + session_index, 8 + ((index + session_index) % 10))
            session = MentoringSession(
                student_admission_number=student.admission_number,
                mentor_id=mentor.id,
                date=session_date,
                time_slot="10:00" if session_index == 0 else "14:00",
                slot_type="system",
                session_type="Offline" if session_index == 0 else "Online",
                status="Approved",
                meeting_link="https://meet.google.com/demo-alumni-review" if session_index == 1 else None,
                notes=[
                    "Discussed final semester performance, project completion, and higher study plans.",
                    "Reviewed placement readiness, resume updates, and communication skills progress.",
                ][session_index],
                created_at=datetime.combine(session_date, datetime.min.time()),
            )
            db.session.add(session)

    notes = MentorPrivateNote.query.filter_by(student_admission_number=student.admission_number).all()
    if len(notes) < 1 and mentor:
        db.session.add(MentorPrivateNote(
            student_admission_number=student.admission_number,
            mentor_id=mentor.id,
            session_id=None,
            note_type=NOTE_TYPES[index % len(NOTE_TYPES)],
            content=[
                "Student responded well to mentoring support and maintained a professional attitude during the final semester.",
                "Needed structured follow-up during the placement period but completed all academic requirements responsibly.",
                "Showed good improvement in confidence, attendance discipline, and peer collaboration before graduation.",
            ][index % 3],
            visibility="alumni_admin",
            transferred_to_admin=True,
            transferred_at=datetime.now(),
            created_at=datetime((student.passout_year or 2025), 3, 20, 11, 0, 0),
            updated_at=datetime.now(),
        ))


def ensure_alumni_student(batch: Batch, department: str, student: Student, mentor: Faculty | None) -> AlumniStudent:
    alumni = AlumniStudent.query.filter_by(admission_number=student.admission_number).first()
    if not alumni:
        alumni = AlumniStudent(
            admission_number=student.admission_number,
            name=student.full_name,
            email=student.email,
            department=department,
            course_id=batch.course_id,
            batch_id=batch.id,
            mentor_id=mentor.id if mentor else None,
            passout_year=batch.end_year,
        )
        db.session.add(alumni)
    alumni.name = student.full_name
    alumni.email = student.email
    alumni.department = department
    alumni.course_id = batch.course_id
    alumni.batch_id = batch.id
    alumni.mentor_id = mentor.id if mentor else alumni.mentor_id
    alumni.passout_year = batch.end_year
    admission_seed = sum(ord(char) for char in student.admission_number)
    alumni.created_at = datetime(batch.end_year, 5, min(28, 10 + (admission_seed % 15)), 10, 0, 0)
    return alumni


def backfill_alumni_profiles() -> None:
    with app.app_context():
        created_or_updated = 0
        for department, (start_year, end_year) in TARGET_BATCHES.items():
            batch = ensure_course_and_batch(department, start_year, end_year)
            mentors = get_department_faculty(department)
            if not mentors:
                continue

            existing_alumni = AlumniStudent.query.filter_by(batch_id=batch.id).order_by(AlumniStudent.admission_number.asc()).all()
            target_names = build_name_candidates(department, 10)

            for index in range(10):
                prefix = DEPARTMENT_PREFIX[department]
                admission_number = (
                    f"A{str(start_year)[2:]}{prefix}{index + 1:03d}"
                    if department != "Department of Computer Applications"
                    else f"A{str(start_year)[2:]}MCA{index + 1:03d}"
                )
                if index < len(existing_alumni):
                    admission_number = existing_alumni[index].admission_number

                mentor = mentors[index % len(mentors)]
                student = get_or_create_student(batch, department, admission_number, target_names[index], mentor.id, index)
                ensure_academic_profile(student, batch, index)
                ensure_family_profile(student, index)
                ensure_work_experience(student, index)
                alumni = ensure_alumni_student(batch, department, student, mentor)
                ensure_attendance_and_marks(student, department, index)
                ensure_mentoring(student, mentor, index)
                created_or_updated += 1

            batch.status = "completed"

        db.session.commit()
        print(f"Alumni profiles backfilled successfully. Processed {created_or_updated} records.")


if __name__ == "__main__":
    backfill_alumni_profiles()
