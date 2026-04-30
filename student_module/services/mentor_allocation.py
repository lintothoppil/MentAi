from models import db, Student, Faculty, Batch, Course
import math

def get_courses_by_department(department: str):
    courses = Course.query.filter(Course.code.ilike(f"%{department}%") | Course.name.ilike(f"%{department}%")).all()
    # If no strict department matches exist, return courses dynamically assigned to this dept (needs logic based on existing data)
    # The prompt: /api/admin/courses?department=X
    # Course code or name usually relates. Just return all for now or exact match if your model binds them.
    # MentyiA Course table doesn't have a direct 'department' column, just 'name' and 'code'.
    # We will derive from courses that have been used by students in that department or just use the branch.
    # For now:
    return [{"id": c.id, "name": c.name} for c in courses]

def get_batches_by_course(course_id: int):
    batches = Batch.query.filter_by(course_id=course_id, status='active').all()
    return [{"id": b.id, "label": f"{b.start_year}-{b.end_year}", "start_year": b.start_year} for b in batches]

def preview_allocation(department: str, course_id: int, batch_id: int):
    """
    Step 2 - Step 4
    Creates a preview of the round-robin distribution.
    Does NOT save to database.
    """
    # Step 2: Fetch students filtered by batch_id specifically
    students = Student.query.filter_by(batch_id=batch_id, status='Live').all()
    
    if not students:
        return {"error": "No students found for this batch"}

    # Step 3: Fetch eligible mentors
    mentors = Faculty.query.filter_by(
        department=department,
        status='Live',
        is_mentor_eligible=True
    ).all()
    
    if not mentors:
        return {"error": "No eligible mentors found for this department"}

    # Sort to be deterministic
    students = sorted(students, key=lambda s: s.admission_number)
    mentors = sorted(mentors, key=lambda m: m.name)

    # Step 4: Distribute evenly (round-robin)
    n_students = len(students)
    n_mentors = len(mentors)
    
    base = n_students // n_mentors
    remainder = n_students % n_mentors
    
    distribution_preview = []
    
    idx = 0
    for i, mentor in enumerate(mentors):
        quota = base + 1 if i < remainder else base
        chunk = students[idx : idx + quota]
        
        student_list = [{"admission_number": s.admission_number, "name": s.full_name} for s in chunk]
        
        distribution_preview.append({
            "mentor_id": mentor.id,
            "mentor_name": mentor.name,
            "department": mentor.department,
            "count": len(chunk),
            "students": student_list
        })
        
        idx += quota

    return {
        "success": True,
        "total_students": n_students,
        "total_mentors": n_mentors,
        "distribution": distribution_preview
    }

def confirm_allocation(payload: dict):
    """
    Step 6 - Save mentor_id to each student
    payload Format:
    {
       "distribution": [
           { "mentor_id": 1, "students": [{"admission_number": "A23...", ...}] }
       ]
    }
    """
    try:
        distribution = payload.get("distribution", [])
        for mentor_group in distribution:
            mentor_id = mentor_group["mentor_id"]
            for s_data in mentor_group.get("students", []):
                admn_no = s_data["admission_number"]
                student = Student.query.get(admn_no)
                if student:
                    student.mentor_id = mentor_id
        db.session.commit()
        return {"success": True, "message": "Allocation confirmed and saved successfully."}
    except Exception as e:
        db.session.rollback()
        return {"error": str(e)}
