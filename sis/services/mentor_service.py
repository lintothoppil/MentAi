"""
Mentor Service - Mentor allocation and distribution logic
"""
from extensions import db
from models.student import Student
from models.faculty import Faculty
import re


def extract_year_range(batch_str: str):
    """Extract (start_year, end_year) from batch string"""
    if not batch_str:
        return None
    match = re.search(r'(\d{4})\s*-\s*(\d{4})', str(batch_str))
    return (int(match.group(1)), int(match.group(2))) if match else None


def redistribute_mentors_full(department: str, batch_id: int, batch_label: str) -> dict:
    """
    Redistribute mentors for a batch (full reset mode)
    
    Args:
        department: Department name
        batch_id: Batch ID
        batch_label: Batch label string
        
    Returns:
        Distribution result dict
    """
    try:
        target_years = extract_year_range(batch_label)
        if not target_years:
            return {"error": f"Cannot parse year range from: {batch_label}"}
        
        # Get batch and course
        batch = Batch.query.get(batch_id)
        if not batch:
            return {"error": f"Batch id={batch_id} not found"}
        
        course_name = batch.course.name if batch.course else "Unknown"
        
        # Get students
        all_dept = Student.query.filter(
            Student.status.ilike("live"),
            Student.branch.ilike(department.strip())
        ).all()
        
        matched = {}
        for s in all_dept:
            if s.batch_id == batch_id:
                matched[s.admission_number] = s
                continue
            
            if s.batch:
                years = extract_year_range(s.batch)
                if years and years == target_years:
                    student_batch = Batch.query.get(s.batch_id) if s.batch_id else None
                    if student_batch and student_batch.course_id == batch.course_id:
                        matched[s.admission_number] = s
                    elif not student_batch:
                        course_prefix = course_name.upper().split()[0]
                        if course_prefix in (s.batch or '').upper():
                            matched[s.admission_number] = s
        
        students = sorted(matched.values(), key=lambda s: s.admission_number)
        
        if not students:
            return {"error": "No students found"}
        
        # Fix batch strings
        for s in students:
            if s.batch_id is None:
                s.batch_id = batch_id
            s.batch = f"{target_years[0]}-{target_years[1]}"
        
        # Get eligible mentors
        def is_eligible(f):
            ineligible_desig = ['hod', 'admin']
            ineligible_depts = ['basic science and humanities']
            return (
                f.designation.lower() not in ineligible_desig and
                f.department.strip().lower() not in ineligible_depts and
                f.status.lower() == 'live'
            )
        
        all_faculty = Faculty.query.filter(
            Faculty.department.ilike(department.strip()),
            Faculty.status.ilike('live')
        ).all()
        
        eligible = [f for f in all_faculty if is_eligible(f)]
        
        if not eligible:
            return {"error": "No eligible mentors found"}
        
        # Reset assignments
        for s in students:
            s.mentor_id = None
        db.session.flush()
        
        # Distribute evenly
        n = len(students)
        m = len(eligible)
        base = n // m
        remainder = n % m
        
        distribution = {}
        idx = 0
        for i, mentor in enumerate(eligible):
            quota = base + 1 if i < remainder else base
            chunk = students[idx:idx + quota]
            for s in chunk:
                s.mentor_id = mentor.id
            distribution[mentor.name] = [s.admission_number for s in chunk]
            idx += quota
        
        db.session.commit()
        
        return {
            "success": True,
            "course": course_name,
            "department": department,
            "total_students": n,
            "total_mentors": m,
            "distribution": distribution
        }
        
    except Exception as e:
        db.session.rollback()
        return {"error": str(e)}
