# services/batch_service.py

# =====================================================================
# Migrations additions:
# No database migrations are required for these features if we compute
# `is_mentor_eligible` dynamically as requested (Option B). 
# However, if you explicitly want to add the boolean column, you would run:
# ALTER TABLE faculty ADD COLUMN is_mentor_eligible BOOLEAN DEFAULT TRUE;
# =====================================================================

from datetime import datetime
from werkzeug.security import generate_password_hash
from sqlalchemy import or_
from models import (
    db, Student, Faculty, Course, Batch, LoginCredential,
    AlumniStudent, AlumniMentorHistory
)

import re

def extract_year_range(batch_str: str):
    """
    Extracts (start_year, end_year) from ANY batch string format.
    
    Examples:
      "MCA 2024-2026"        → (2024, 2026)
      "2024-2026 (Inferred)" → (2024, 2026)
      "2022-2026"            → (2022, 2026)
      "B.Tech 2021-2025"     → (2021, 2025)
      "MCA 2025-2027"        → (2025, 2027)
    """
    if not batch_str:
        return None
    match = re.search(r'(\d{4})\s*-\s*(\d{4})', str(batch_str))
    if match:
        return int(match.group(1)), int(match.group(2))
    return None


def promote_expired_batches_to_alumni() -> dict:
    """
    Scans ALL active batches. If end_year < current_year,
    automatically promotes all students to alumni and marks batch completed.
    Run this on app startup and before any batch validation.
    """
    from datetime import datetime
    now = datetime.now()
    current_year = now.year
    
    promoted_summary = {}
    
    expired_batches = Batch.query.filter(
        Batch.status == "active",
        Batch.end_year < current_year
    ).all()
    
    for batch in expired_batches:
        students = Student.query.filter(
            Student.batch_id == batch.id,
            Student.status.in_(["Live", "Dropout"])
        ).all()
        
        promoted = []
        for s in students:
            # Create AlumniStudent if not exists
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
            
            # Create mentor history
            if s.mentor_id:
                history = AlumniMentorHistory(
                    admission_number=s.admission_number,
                    mentor_id=s.mentor_id,
                    start_date=s.created_at,
                    end_date=datetime.utcnow()
                )
                db.session.add(history)
            
            s.status = "Passed Out"
            promoted.append(s.admission_number)
        
        batch.status = "completed"
        promoted_summary[f"{batch.course.name} {batch.start_year}-{batch.end_year}"] = {
            "promoted": promoted,
            "count": len(promoted)
        }
    
    try:
        db.session.commit()
    except Exception as e:
        db.session.rollback()
        return {"error": str(e)}
    
    return {
        "success": True,
        "expired_batches_found": len(expired_batches),
        "summary": promoted_summary
    }

def normalize_dept(d: str) -> str:
    """Helper to heavily normalize department strings to fix mismatches"""
    if not d:
        return ""
    normalized = d.strip().lower().replace("-", " ").replace("_", " ")
    normalized = " ".join(normalized.split())

    dept_aliases = {
        "mca": "department of computer applications",
        "imca": "department of computer applications",
        "computer applications": "department of computer applications",
        "department of computer applications": "department of computer applications",
        "mba": "department of business administration",
        "business administration": "department of business administration",
        "department of business administration": "department of business administration",
        "bsh": "basic sciences & humanities",
        "basic science and humanities": "basic sciences & humanities",
        "basic sciences and humanities": "basic sciences & humanities",
        "basic sciences & humanities": "basic sciences & humanities",
    }

    return dept_aliases.get(normalized, normalized)


def _faculty_sort_key(faculty: Faculty):
    return ((faculty.name or "").strip().lower(), faculty.id)


def _student_sort_key(student: Student):
    return ((student.admission_number or "").strip().upper(), (student.full_name or "").strip().lower())


def get_department_student_filter(department: str):
    """Build a student filter that supports department aliases like MCA/IMCA."""
    norm_target = normalize_dept(department)

    if norm_target == "department of computer applications":
        return or_(
            Student.branch.ilike("MCA"),
            Student.branch.ilike("IMCA"),
            Student.branch.ilike("%Computer Applications%"),
        )

    if norm_target == "department of business administration":
        return or_(
            Student.branch.ilike("MBA"),
            Student.branch.ilike("%Business Administration%"),
            Student.branch.ilike("%Management%"),
        )

    return Student.branch.ilike(department.strip())


def get_department_faculty_filter(department: str):
    """Build a faculty filter that supports department aliases like MCA/IMCA."""
    norm_target = normalize_dept(department)

    if norm_target == "department of computer applications":
        return or_(
            Faculty.department.ilike("MCA"),
            Faculty.department.ilike("IMCA"),
            Faculty.department.ilike("%Computer Applications%"),
        )

    if norm_target == "department of business administration":
        return or_(
            Faculty.department.ilike("MBA"),
            Faculty.department.ilike("%Business Administration%"),
            Faculty.department.ilike("%Management%"),
        )

    return Faculty.department.ilike(department.strip())

def is_mentor_eligible(faculty: Faculty) -> bool:
    """
    Requirement 2 Helper: Compute whether a faculty member is eligible to be a mentor.
    Ignores HODs, Admins, and Basic Science/Humanities faculty.
    """
    ineligible_depts = {"basic sciences & humanities"}
    ineligible_designations = {"hod", "admin"}

    dept = normalize_dept(faculty.department)
    desig = (faculty.designation or "").strip().lower()
    status = (faculty.status or "").strip().lower()

    return (
        status == "live"
        and dept not in ineligible_depts
        and desig not in ineligible_designations
        and not bool(getattr(faculty, "is_hod", False))
    )

def get_eligible_mentors(department: str) -> list:
    """Helper to fetch eligible mentors matching the normalized department string."""
    norm_target = normalize_dept(department)
    faculty_list = Faculty.query.filter(
        get_department_faculty_filter(department),
        Faculty.status.ilike("live")
    ).all()

    eligible = [
        f for f in faculty_list
        if normalize_dept(f.department) == norm_target and is_mentor_eligible(f)
    ]
    return sorted(eligible, key=_faculty_sort_key)

def fetch_batch_students(department: str, batch_id: int, batch_label: str) -> list:
    # Not used directly in the updated full/incremental anymore, but kept for compatibility
    pass


def get_canonical_batch_label(batch_id: int | None, fallback_label: str | None = None) -> str | None:
    """Return a normalized YYYY-YYYY batch label for allocator calls."""
    if batch_id is not None:
        batch = Batch.query.get(batch_id)
        if batch:
            return f"{batch.start_year}-{batch.end_year}"

    years = extract_year_range(fallback_label or "")
    if years:
        return f"{years[0]}-{years[1]}"

    cleaned = (fallback_label or "").strip()
    return cleaned or None

def redistribute_mentors_full(department: str, batch_id: int,
                               batch_label: str) -> dict:
    try:
        # Get batch record to find course
        batch = Batch.query.get(batch_id)
        if not batch:
            return {"error": f"Batch id={batch_id} not found"}
        
        course = Course.query.get(batch.course_id)
        target_years = extract_year_range(batch_label)
        if not target_years:
            return {"error": f"Cannot parse years from: {batch_label}"}
        
        # Get students filtered by batch_id OR year range match
        # AND course match via batch relationship
        all_dept = Student.query.filter(
            Student.status.ilike('live'),
            get_department_student_filter(department)
        ).all()
        
        matched = {}
        for s in all_dept:
            # Primary: match by batch_id
            if s.batch_id == batch_id:
                matched[s.admission_number] = s
                continue
            # Fallback: match by year range
            if s.batch:
                years = extract_year_range(s.batch)
                if years and years == target_years:
                    # Verify course matches via batch string prefix
                    course_prefix = course.name.upper()
                    if course_prefix in (s.batch or '').upper():
                        matched[s.admission_number] = s
        
        students = sorted(matched.values(), key=_student_sort_key)
        
        if not students:
            return {
                "error": "No students found",
                "debug": {
                    "department": department,
                    "batch_id": batch_id,
                    "course": course.name,
                    "target_years": target_years,
                    "total_in_dept": len(all_dept),
                    "batch_strings": list(set(
                        s.batch for s in all_dept
                    ))
                }
            }
        
        # Get eligible mentors
        eligible = get_eligible_mentors(department)
        
        if not eligible:
            return {
                "error": "No eligible mentors",
                "debug": {
                    "faculty_found": [
                        f"{f.name} ({f.designation})" 
                        for f in Faculty.query.filter(
                            get_department_faculty_filter(department)
                        ).all()
                    ]
                }
            }
        
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
            chunk = students[idx: idx + quota]
            for s in chunk:
                s.mentor_id = mentor.id
            distribution[mentor.name] = [
                s.admission_number for s in chunk
            ]
            idx += quota
        
        db.session.commit()
        
        return {
            "success": True,
            "course": course.name,
            "department": department,
            "batch_label": batch_label,
            "total_students": n,
            "total_mentors": m,
            "distribution": distribution
        }
        
    except Exception as e:
        db.session.rollback()
        return {"error": str(e)}


def redistribute_mentors_incremental(department: str, batch_id: int,
                                      batch_label: str) -> dict:
    """
    Only assigns unallocated students. Never reshuffles existing assignments.
    Uses same fuzzy matching as full redistribution.
    """
    try:
        target_years = extract_year_range(batch_label)
        if not target_years:
            return {"error": f"Cannot parse year range from: {batch_label}"}
        target_start, target_end = target_years

        # Get all students in this department (exact case-insensitive match)
        all_dept_students = Student.query.filter(
            Student.status.ilike("live"),
            get_department_student_filter(department)
        ).all()
        
        # Match students by batch_id OR by year range
        all_batch_students_dict = {}
        for s in all_dept_students:
            if s.batch_id == batch_id:
                all_batch_students_dict[s.admission_number] = s
                continue
            if s.batch:
                years = extract_year_range(s.batch)
                if years and years == target_years:
                    all_batch_students_dict[s.admission_number] = s
        
        # Convert to list and sort
        all_batch_students = sorted(all_batch_students_dict.values(), key=_student_sort_key)

        # Separate assigned and unassigned
        assigned_students = [s for s in all_batch_students 
                              if s.mentor_id is not None]
        unassigned_students = sorted([s for s in all_batch_students if s.mentor_id is None], key=_student_sort_key)
        
        if not unassigned_students:
            return {
                "success": True,
                "message": "All students already assigned",
                "total_students": len(all_batch_students)
            }
        
        eligible_mentors = get_eligible_mentors(department)
        
        if not eligible_mentors:
            return {"error": "No eligible mentors found for department"}
        
        # Calculate target loads
        n_total = len(all_batch_students)
        m = len(eligible_mentors)
        base = n_total // m
        remainder = n_total % m
        
        targets = {}
        for i, mentor in enumerate(eligible_mentors):
            targets[mentor.id] = base + 1 if i < remainder else base
        
        # Calculate current loads
        current_loads = {mentor.id: 0 for mentor in eligible_mentors}
        for s in assigned_students:
            if s.mentor_id in current_loads:
                current_loads[s.mentor_id] += 1
        
        # Calculate available slots per mentor
        slots = {
            mid: max(0, targets[mid] - current_loads[mid])
            for mid in targets
        }
        
        # Assign unassigned students to mentors with open slots
        new_assignments = {}
        unassigned_idx = 0
        
        for mentor in eligible_mentors:
            available = slots[mentor.id]
            if available <= 0 or unassigned_idx >= len(unassigned_students):
                continue
            batch_assign = unassigned_students[
                unassigned_idx: unassigned_idx + available
            ]
            for s in batch_assign:
                s.mentor_id = mentor.id
                if s.batch_id is None:
                    s.batch_id = batch_id  # heal missing batch_id
            new_assignments[mentor.name] = [
                s.admission_number for s in batch_assign
            ]
            unassigned_idx += available
        
        db.session.commit()
        
        return {
            "success": True,
            "newly_assigned": len(unassigned_students) - max(
                0, len(unassigned_students) - unassigned_idx
            ),
            "still_unassigned": max(
                0, len(unassigned_students) - unassigned_idx
            ),
            "new_assignments": new_assignments
        }
        
    except Exception as e:
        db.session.rollback()
        return {"error": str(e)}


def rebalance_department_batches(department: str, batch_ids: list[int]) -> dict:
    """
    Fully reassign every provided batch across the currently eligible live mentors.
    Used when a mentor goes on leave, becomes inactive, returns, or is deleted.
    """
    processed = []
    errors = []
    total_students = 0
    mentor_counts = []

    for batch_id in sorted({int(bid) for bid in batch_ids if bid is not None}):
        batch = Batch.query.get(batch_id)
        if not batch:
            continue

        batch_label = f"{batch.start_year}-{batch.end_year}"
        result = redistribute_mentors_full(department, batch_id, batch_label)

        if result.get("error"):
            errors.append(f"Batch {batch_label}: {result['error']}")
            continue

        processed.append(batch_label)
        total_students += result.get("total_students", 0)
        mentor_counts.append(result.get("total_mentors", 0))

    return {
        "success": len(errors) == 0,
        "processed_batches": processed,
        "total_students": total_students,
        "max_mentors_used": max(mentor_counts) if mentor_counts else 0,
        "errors": errors,
    }


def auto_allocate_batches(affected_batches: list[tuple[str, int, str | None]], mode: str = "incremental") -> dict:
    """
    Allocate mentors for the given department/batch combinations.
    Uses incremental mode by default so existing correct assignments stay intact.
    """
    processed = []
    errors = []
    total_assigned = 0

    unique_batches = []
    seen = set()
    for department, batch_id, batch_label in affected_batches:
        if not department or batch_id is None:
            continue
        key = (department.strip(), int(batch_id))
        if key in seen:
            continue
        seen.add(key)
        unique_batches.append((department.strip(), int(batch_id), batch_label))

    for department, batch_id, batch_label in unique_batches:
        canonical_label = get_canonical_batch_label(batch_id, batch_label)
        if not canonical_label:
            errors.append(f"{department} batch {batch_id}: missing batch label")
            continue

        result = redistribute_mentors(
            department=department,
            batch_id=batch_id,
            batch_label=canonical_label,
            mode=mode
        )

        if result.get("error"):
            errors.append(f"{department} {canonical_label}: {result['error']}")
            continue

        processed.append({
            "department": department,
            "batch": canonical_label,
            "result": result
        })
        total_assigned += result.get("newly_assigned", result.get("total_students", 0))

    return {
        "success": len(errors) == 0,
        "processed": processed,
        "total_assigned": total_assigned,
        "errors": errors,
    }


def auto_allocate_unassigned_students() -> dict:
    """
    Heal any currently live students without mentors by redistributing only the
    affected batches. This is safe to run on startup and after bulk imports.
    """
    unassigned_students = Student.query.filter(
        Student.status.ilike("live"),
        Student.mentor_id.is_(None),
        Student.batch_id.isnot(None)
    ).all()

    affected_batches = []
    for student in unassigned_students:
        if not student.branch or student.batch_id is None:
            continue
        affected_batches.append((student.branch, student.batch_id, student.batch))

    result = auto_allocate_batches(affected_batches, mode="incremental")
    result["unassigned_students_found"] = len(unassigned_students)
    return result


def auto_heal_invalid_mentor_assignments() -> dict:
    """
    Reassign live students whose current mentor is missing or no longer eligible.
    We rebalance the whole affected batch so the final distribution stays consistent.
    """
    invalid_students = []
    for student in Student.query.filter(Student.status.ilike("live")).all():
        mentor = Faculty.query.get(student.mentor_id) if student.mentor_id else None
        if mentor is None or not is_mentor_eligible(mentor):
            invalid_students.append(student)

    affected_batches = {}
    for student in invalid_students:
        if not student.branch or student.batch_id is None:
            continue
        key = (student.branch.strip(), int(student.batch_id))
        affected_batches[key] = student.batch

    processed = []
    errors = []
    total_students = 0

    for (department, batch_id), batch_label in sorted(affected_batches.items()):
        canonical_label = get_canonical_batch_label(batch_id, batch_label)
        if not canonical_label:
            errors.append(f"{department} batch {batch_id}: missing batch label")
            continue

        result = redistribute_mentors(
            department=department,
            batch_id=batch_id,
            batch_label=canonical_label,
            mode="full"
        )

        if result.get("error"):
            errors.append(f"{department} {canonical_label}: {result['error']}")
            continue

        processed.append({
            "department": department,
            "batch": canonical_label,
            "result": result
        })
        total_students += result.get("total_students", 0)

    return {
        "success": len(errors) == 0,
        "invalid_students_found": len(invalid_students),
        "processed": processed,
        "total_students_rebalanced": total_students,
        "errors": errors,
    }

def redistribute_mentors(department: str, batch_id: int, batch_label: str, mode: str = "incremental") -> dict:
    """
    Entry point. 
    mode = "full" -> calls redistribute_mentors_full
    mode = "incremental" -> calls redistribute_mentors_incremental (default)
    """
    if mode == "full":
        return redistribute_mentors_full(department, batch_id, batch_label)
    else:
        return redistribute_mentors_incremental(department, batch_id, batch_label)


def bulk_register_students(csv_rows: list) -> dict:
    """
    Requirement 1: Student Bulk Registration.
    Processes CSV records, inserts students, and auto-redistributes mentors.
    """
    total_inserted = 0
    skipped = 0
    errors = 0
    
    # Track which (department, batch_id) pairs need mentor redistribution
    affected_batches = set()
    
    try:
        students_to_insert = []
        credentials_to_insert = []
        
        for row in csv_rows:
            admn_no = row.get("admission_number", "").strip()
            if not admn_no:
                continue
                
            if Student.query.filter_by(admission_number=admn_no).first():
                skipped += 1
                continue
                
            department = row.get("department", "").strip()
            batch_str = row.get("batch", "").strip()
            
            course = Course.query.filter(Course.name.ilike(department)).first()
            if not course:
                course = Course(name=department, code=department[:10].upper(), duration_years=4)
                db.session.add(course)
                db.session.commit() 
                
            start_year, end_year = 0, 0
            if "-" in batch_str:
                parts = batch_str.split("-")
                if len(parts) == 2 and parts[0].isdigit() and parts[1].isdigit():
                    start_year = int(parts[0])
                    end_year = int(parts[1])
            
            batch = Batch.query.filter_by(
                course_id=course.id, 
                start_year=start_year, 
                end_year=end_year
            ).first()
            
            if not batch:
                batch = Batch(
                    course_id=course.id,
                    start_year=start_year,
                    end_year=end_year,
                    status="active"
                )
                db.session.add(batch)
                db.session.commit() 
                
            student = Student(
                admission_number=admn_no,
                full_name=row.get("name", "").strip(),
                roll_number=row.get("roll_number", "").strip(),
                email=row.get("email", "").strip(),
                batch_id=batch.id,
                batch=batch_str,
                branch=department,
                status="Live"
            )
            
            hashed_pw = generate_password_hash(admn_no)
            cred = LoginCredential(
                admission_number=admn_no,
                password_hash=hashed_pw
            )
            
            students_to_insert.append(student)
            credentials_to_insert.append(cred)
            affected_batches.add((department, batch.id, batch_str))
            total_inserted += 1
            
        if students_to_insert:
            db.session.bulk_save_objects(students_to_insert)
            db.session.bulk_save_objects(credentials_to_insert)
            db.session.flush() # Force flush to DB memory before commit
            db.session.commit()
            
        # Trigger mentor redistribution safely (incrementally) 
        for dept, batch_id, batch_label in affected_batches:
            try:
                redistribute_mentors(dept, batch_id, batch_label, mode="incremental")
            except Exception as e:
                print(f"Error redistributing mentors for batch {batch_id}: {e}")
                
    except Exception as e:
        db.session.rollback()
        print(f"Error during bulk student insert: {e}")
        errors += 1
        
    return {
        "total_inserted": total_inserted,
        "skipped": skipped,
        "errors": errors
    }


def register_faculty(data: dict) -> Faculty:
    try:
        faculty = Faculty(
            username=data["username"],
            password_hash=generate_password_hash(data["password"]),
            name=data["name"],
            designation=data["designation"],
            department=data["department"],
            status="Live"
        )
        db.session.add(faculty)
        db.session.commit()
        return faculty
    except Exception as e:
        db.session.rollback()
        raise e


def get_course_max_batches(course_name: str) -> int:
    """
    Returns max number of concurrent active batches allowed for a course.
    
    Rules:
      - IMCA → 5 years → max 5 active batches
      - MCA/MBA/Computer Applications/Business Administration → 2 years → max 2 active batches
      - B.Tech/B.E/Engineering → 4 years → max 4 active batches
    """
    name = course_name.strip().lower()
    
    # IMCA special case: 5 years
    if name == "imca":
        return 5
    
    # Two-year courses (including department names)
    two_year_keywords = ["mca", "mba", "computer applications", "business administration"]
    if any(k in name for k in two_year_keywords):
        return 2
    
    # Four-year courses (B.Tech, B.E, Engineering, M.Tech)
    four_year_keywords = ["b.tech", "btech", "b.e", "be", 
                          "engineering", "m.tech", "mtech"]
    if any(k in name for k in four_year_keywords):
        return 4
    
    # Default fallback
    return 4


def validate_new_batch(course_id: int, start_year: int) -> dict:
    from datetime import datetime
    current_year = datetime.now().year
    
    # Step 1: Auto-promote any expired batches first
    promote_expired_batches_to_alumni()
    
    # Step 2: start_year must equal current year
    if start_year != current_year:
        return {
            "allowed": False,
            "reason": (
                f"Cannot add a batch starting in {start_year}. "
                f"New batches must start in the current year ({current_year}). "
                f"If you are trying to add a past batch, please contact admin."
            )
        }
    
    # Step 3: No duplicate batch for same start year
    existing = Batch.query.filter_by(
        course_id=course_id,
        start_year=start_year
    ).first()
    if existing:
        return {
            "allowed": False,
            "reason": (
                f"A batch starting in {start_year} already exists "
                f"for this course. Duplicate batches are not allowed."
            )
        }
    
    # Step 4: Must be sequential (exactly 1 year after latest active batch)
    latest = Batch.query.filter_by(
        course_id=course_id,
        status="active"
    ).order_by(Batch.start_year.desc()).first()
    
    if latest and (start_year - latest.start_year) != 1:
        return {
            "allowed": False,
            "reason": (
                f"Batches must be added year by year. "
                f"Latest active batch starts in {latest.start_year}. "
                f"The next batch must start in {latest.start_year + 1}, "
                f"not {start_year}."
            )
        }
    
    # Step 5: Check active batch count against max
    course = Course.query.get(course_id)
    max_batches = get_course_max_batches(course.name)
    active_count = Batch.query.filter_by(
        course_id=course_id,
        status="active"
    ).count()
    
    # This is allowed - add_new_batch will handle promotion
    # Just warn if promotion will happen
    will_promote = active_count >= max_batches
    
    return {
        "allowed": True,
        "will_promote_oldest": will_promote,
        "warning": (
            f"Adding this batch will automatically promote the oldest "
            f"batch students to alumni section."
        ) if will_promote else None
    }


def add_new_batch(course_id: int, start_year: int, end_year: int, department: str = "") -> dict:
    """
    Adds a new batch. If max concurrent batches exceeded,
    promotes oldest batch students to alumni first.
    """
    try:
        # Step 1: Get course
        course = Course.query.get(course_id)
        if not course:
            return {"error": "Course not found"}
        
        # Step 2: Validate year
        validation = validate_new_batch(course_id, start_year)
        if not validation["allowed"]:
            return {
                "error": "Batch not allowed",
                "reason": validation["reason"]
            }
        
        # Step 3: Check active batch count
        active_batches = Batch.query.filter_by(
            course_id=course_id,
            status="active"
        ).order_by(Batch.start_year.asc()).all()
        
        max_batches = get_course_max_batches(course.name)
        promoted_students = []
        oldest_batch_completed = None
        
        # Step 4: If at capacity, promote oldest batch to alumni
        if len(active_batches) >= max_batches:
            oldest_batch = active_batches[0]
            
            # Get all Live/Dropout students in oldest batch
            students = Student.query.filter(
                Student.batch_id == oldest_batch.id,
                Student.status.in_(["Live", "Dropout"])
            ).all()
            
            for s in students:
                # Create AlumniStudent record
                existing_alumni = AlumniStudent.query.filter_by(
                    admission_number=s.admission_number
                ).first()
                
                if not existing_alumni:
                    alumni = AlumniStudent(
                        admission_number=s.admission_number,
                        name=s.full_name,
                        email=s.email,
                        department=s.branch,
                        course_id=course_id,
                        batch_id=oldest_batch.id,
                        mentor_id=s.mentor_id,
                        passout_year=oldest_batch.end_year
                    )
                    db.session.add(alumni)
                
                # Create mentor history if mentor assigned
                if s.mentor_id:
                    history = AlumniMentorHistory(
                        admission_number=s.admission_number,
                        mentor_id=s.mentor_id,
                        start_date=s.created_at,
                        end_date=datetime.utcnow()
                    )
                    db.session.add(history)
                
                # Mark student as Passed Out (preserve record)
                s.status = "Passed Out"
                promoted_students.append(s.admission_number)
            
            # Mark batch as completed
            oldest_batch.status = "completed"
            db.session.flush()
            oldest_batch_completed = oldest_batch.id
        
        # Step 5: Create new batch
        # For duration: IMCA=5, MCA/MBA=2, Engineering=4
        duration_map = {5: 5, 2: 2, 4: 4}
        duration = duration_map.get(max_batches, 4)
        
        new_batch = Batch(
            course_id=course_id,
            start_year=start_year,
            end_year=start_year + duration,
            status="active"
        )
        db.session.add(new_batch)
        db.session.commit()
        
        # Step 6: Auto redistribute mentors for new batch
        # (no students yet, will trigger when students are added)
        dist_map = {}
        if department:
            batch_label = f"{start_year}-{start_year + duration}"
            dist_map = redistribute_mentors(department, new_batch.id, batch_label, mode="incremental")
        
        return {
            "success": True,
            "new_batch": f"{start_year}-{start_year + duration}",
            "promoted_to_alumni": promoted_students,
            "oldest_batch_completed": oldest_batch_completed,
            "mentor_distribution": dist_map
        }
        
    except Exception as e:
        db.session.rollback()
        return {"error": str(e)}


def get_grouped_alumni() -> dict:
    """
    Returns alumni grouped by department → course → batch label
    Example:
    {
      "Department of Computer Applications": {
        "MCA": {
          "MCA 2023-2025": [...students...]
        },
        "IMCA": {
          "IMCA 2024-2029": [...students...]  
        }
      }
    }
    """
    alumni = AlumniStudent.query.order_by(
        AlumniStudent.department,
        AlumniStudent.passout_year
    ).all()
    
    result = {}
    for a in alumni:
        dept = a.department or "Unknown"
        
        # Get course name from batch
        batch = Batch.query.get(a.batch_id) if a.batch_id else None
        course = Course.query.get(a.course_id) if a.course_id else None
        course_name = course.name if course else "Unknown Course"
        
        batch_label = (
            f"{course_name} {batch.start_year}-{batch.end_year}"
            if batch else f"Passout {a.passout_year}"
        )
        
        # Get mentor name
        mentor = Faculty.query.get(a.mentor_id) if a.mentor_id else None
        
        result.setdefault(dept, {})
        result[dept].setdefault(course_name, {})
        result[dept][course_name].setdefault(batch_label, [])
        result[dept][course_name][batch_label].append({
            "admission_number": a.admission_number,
            "name": a.name,
            "email": a.email,
            "passout_year": a.passout_year,
            "mentor": mentor.name if mentor else None
        })
    
    return result
