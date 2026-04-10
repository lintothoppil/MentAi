from app import app, db
from models import Student, Faculty, AlumniStudent, Timetable, Course, Batch, Subject
from utils import normalize_dept_name

def merge_course(old_c, new_c):
    print(f"Merging course '{old_c.name}' into '{new_c.name}'...")
    # Update batches
    batches = Batch.query.filter_by(course_id=old_c.id).all()
    for b in batches:
        b.course_id = new_c.id
        print(f"  > Reassigned Batch {b.id} to new Course ID {new_c.id}")
        
    # Update subjects
    subjects = Subject.query.filter_by(course_id=old_c.id).all()
    for s in subjects:
        # Check if subject with same name and semester exists in new_c
        existing = Subject.query.filter_by(name=s.name, semester_id=s.semester_id, course_id=new_c.id).first()
        if existing:
            # complex: what about internal marks associated with this subject?
            # It's safer to just point to the new course if it doesn't exist, else leave it or rename
            print(f"  > Warning: subject '{s.name}' clash when merging. Renaming subject to avoid constraint error.")
            s.name = s.name + " (Merged from " + old_c.name + ")"
        s.course_id = new_c.id
        print(f"  > Reassigned Subject '{s.name}' to new Course ID {new_c.id}")
        
    # Update alumni course_id
    alums = AlumniStudent.query.filter_by(course_id=old_c.id).all()
    for a in alums:
        a.course_id = new_c.id
        print(f"  > Reassigned Alumni {a.admission_number} to new Course ID {new_c.id}")
        
    # Delete old course
    try:
        db.session.delete(old_c)
        db.session.flush()
        print(f"Deleted old course '{old_c.name}'")
    except Exception as e:
         print(f"  > Could not delete old course: {e}")

def fix_all():
    with app.app_context():
        print("Starting normalization of department records across the database...")
        
        # 1. Update Students
        students = Student.query.all()
        student_updates = 0
        for s in students:
            if s.branch:
                normalized = normalize_dept_name(s.branch)
                if s.branch != normalized:
                    print(f"Student {s.admission_number}: changing from '{s.branch}' to '{normalized}'")
                    s.branch = normalized
                    student_updates += 1
        
        # 2. Update Faculty
        faculty = Faculty.query.all()
        faculty_updates = 0
        for f in faculty:
            if f.department:
                normalized = normalize_dept_name(f.department)
                if f.department != normalized:
                    print(f"Faculty {f.id} ({f.name}): changing from '{f.department}' to '{normalized}'")
                    f.department = normalized
                    faculty_updates += 1
                    
        # 3. Update Alumni Students
        alumni = AlumniStudent.query.all()
        alumni_updates = 0
        for a in alumni:
            if a.department:
                normalized = normalize_dept_name(a.department)
                if a.department != normalized:
                    print(f"Alumni {a.admission_number}: changing from '{a.department}' to '{normalized}'")
                    a.department = normalized
                    alumni_updates += 1
                    
        # 4. Update Timetables
        timetables = Timetable.query.all()
        timetable_updates = 0
        for t in timetables:
            if t.department:
                normalized = normalize_dept_name(t.department)
                if t.department != normalized:
                    print(f"Timetable {t.id}: changing from '{t.department}' to '{normalized}'")
                    t.department = normalized
                    timetable_updates += 1

        # 5. Fix Courses
        courses = Course.query.all()
        course_updates = 0
        for c in courses:
            if c.name:
                normalized = normalize_dept_name(c.name)
                if c.name != normalized and normalized:
                    existing = Course.query.filter_by(name=normalized).first()
                    if existing and existing.id != c.id:
                        # MERGE
                        merge_course(c, existing)
                        course_updates += 1
                    else:
                        print(f"Course {c.id}: changing from '{c.name}' to '{normalized}'")
                        c.name = normalized
                        course_updates += 1
                        db.session.flush()

        # Fix Student Generic Batches (Basic Fallback)
        for s in students:
            if not s.batch:
                 normalized = normalize_dept_name(s.branch) or ""
                 year = 2024 # default guess if unparseable
                 import re
                 match = re.search(r'A?(\d{2})', s.admission_number)
                 if match:
                     year = 2000 + int(match.group(1))
                     
                 # Determine course duration 
                 # MCA/MBA=2, IMCA=5, B.Tech=4
                 duration = 4
                 prefix = ""
                 if "Applications" in normalized:
                     if "IMCA" in s.admission_number.upper():
                         duration = 5
                         prefix = "IMCA "
                     else:
                         duration = 2
                         prefix = "MCA "
                 elif "Business" in normalized:
                     duration = 2
                     
                 s.batch = f"{prefix}{year}-{year+duration}"
                 print(f"Student {s.admission_number}: assigned generic batch '{s.batch}'")

        try:
             db.session.commit()
             print("-" * 50)
             print("Normalization Complete!")
             print(f"Students updated: {student_updates}")
             print(f"Faculty updated: {faculty_updates}")
             print(f"Alumni updated: {alumni_updates}")
             print(f"Timetables updated: {timetable_updates}")
             print(f"Courses merged/updated: {course_updates}")
        except Exception as e:
             db.session.rollback()
             print(f"Fatal error committing changes: {e}")

if __name__ == '__main__':
    fix_all()
