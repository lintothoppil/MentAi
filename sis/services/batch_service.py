"""
Batch Service - Core batch management and lifecycle logic
"""
from extensions import db
from models.batch import Batch
from models.course import Course
from models.student import Student
from models.alumni import AlumniStudent, AlumniMentorHistory
from datetime import datetime


def get_course_max_batches(course_name: str) -> int:
    """
    Returns max number of concurrent active batches for a course
    
    Rules:
      - IMCA → 5 years → max 5 active batches
      - MCA/MBA → 2 years → max 2 active batches
      - B.Tech/B.E./Engineering → 4 years → max 4 active batches
    """
    name = course_name.strip().lower()
    
    if 'imca' in name or 'integrated mca' in name:
        return 5
    
    two_year = ['mca', 'mba']
    if any(k in name for k in two_year):
        return 2
    
    four_year = ['b.tech', 'btech', 'b.e', 'be', 'engineering', 'm.tech', 'mtech']
    if any(k in name for k in four_year):
        return 4
    
    return 2  # Default


def promote_expired_batches_to_alumni() -> dict:
    """
    Scans ALL active batches. If end_year < current_year OR
    (end_year == current_year AND month >= 6), promotes students to alumni.
    
    Returns:
        dict with success status and summary
    """
    now = datetime.now()
    current_year = now.year
    current_month = now.month
    
    promoted_summary = {}
    
    # Find expired batches
    expired_batches = Batch.query.filter(
        Batch.status == "active",
        db.or_(
            Batch.end_year < current_year,
            db.and_(
                Batch.end_year == current_year,
                current_month >= 6
            )
        )
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
        batch_label = f"{batch.course.name} {batch.start_year}-{batch.end_year}" if batch.course else f"{batch.start_year}-{batch.end_year}"
        promoted_summary[batch_label] = {
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


def validate_new_batch(course_id: int, start_year: int) -> dict:
    """
    Validates whether a new batch can be added
    
    Returns:
        dict with allowed status and optional warning
    """
    current_year = datetime.now().year
    
    # Step 1: Auto-promote expired batches first
    promote_expired_batches_to_alumni()
    
    # Step 2: start_year must equal current year
    if start_year != current_year:
        return {
            "allowed": False,
            "reason": f"Cannot add a batch starting in {start_year}. New batches must start in the current year ({current_year})."
        }
    
    # Step 3: No duplicate batch for same start year
    existing = Batch.query.filter_by(
        course_id=course_id,
        start_year=start_year
    ).first()
    
    if existing:
        return {
            "allowed": False,
            "reason": f"A batch starting in {start_year} already exists for this course."
        }
    
    # Step 4: Check sequential gap
    latest = Batch.query.filter_by(
        course_id=course_id,
        status="active"
    ).order_by(Batch.start_year.desc()).first()
    
    if latest and (start_year - latest.start_year) != 1:
        return {
            "allowed": False,
            "reason": f"Batches must be added year by year. Latest active batch starts in {latest.start_year}. Next must start in {latest.start_year + 1}."
        }
    
    # Step 5: Check capacity
    course = Course.query.get(course_id)
    max_batches = get_course_max_batches(course.name) if course else 4
    active_count = Batch.query.filter_by(
        course_id=course_id,
        status="active"
    ).count()
    
    will_promote = active_count >= max_batches
    
    return {
        "allowed": True,
        "will_promote_oldest": will_promote,
        "warning": "Adding this batch will automatically promote the oldest batch students to alumni." if will_promote else None
    }


def add_new_batch(course_id: int, start_year: int, department: str = "") -> dict:
    """
    Adds a new batch. If at max capacity, promotes oldest to alumni first.
    
    Args:
        course_id: Course ID
        start_year: Start year for new batch
        department: Department name for mentor redistribution
        
    Returns:
        dict with success status and details
    """
    try:
        course = Course.query.get(course_id)
        if not course:
            return {"error": "Course not found"}
        
        # Validate
        validation = validate_new_batch(course_id, start_year)
        if not validation["allowed"]:
            return validation
        
        # Get active batches
        active_batches = Batch.query.filter_by(
            course_id=course_id,
            status="active"
        ).order_by(Batch.start_year.asc()).all()
        
        max_batches = get_course_max_batches(course.name)
        promoted_students = []
        oldest_batch_completed = None
        
        # If at capacity, promote oldest
        if len(active_batches) >= max_batches:
            oldest_batch = active_batches[0]
            
            students = Student.query.filter(
                Student.batch_id == oldest_batch.id,
                Student.status.in_(["Live", "Dropout"])
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
                        course_id=course_id,
                        batch_id=oldest_batch.id,
                        mentor_id=s.mentor_id,
                        passout_year=oldest_batch.end_year
                    )
                    db.session.add(alumni)
                
                if s.mentor_id:
                    history = AlumniMentorHistory(
                        admission_number=s.admission_number,
                        mentor_id=s.mentor_id,
                        start_date=s.created_at,
                        end_date=datetime.utcnow()
                    )
                    db.session.add(history)
                
                s.status = "Passed Out"
                promoted_students.append(s.admission_number)
            
            oldest_batch.status = "completed"
            oldest_batch_completed = oldest_batch.id
            db.session.flush()
        
        # Create new batch
        duration = course.duration_years
        new_batch = Batch(
            course_id=course_id,
            start_year=start_year,
            end_year=start_year + duration,
            status="active"
        )
        db.session.add(new_batch)
        db.session.commit()
        
        return {
            "success": True,
            "new_batch": f"{start_year}-{start_year + duration}",
            "promoted_to_alumni": promoted_students,
            "oldest_batch_completed": oldest_batch_completed
        }
        
    except Exception as e:
        db.session.rollback()
        return {"error": str(e)}
