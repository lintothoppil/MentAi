import os
from werkzeug.utils import secure_filename
from models import db, Timetable, Student, Notification
from datetime import datetime

ALLOWED_EXTENSIONS = {'pdf', 'xlsx', 'jpg', 'png'}

def allowed_file(filename):
    return '.' in filename and \
           filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS

def upload_timetable(file, department, course_id, batch_id, semester, academic_year, uploader_id, current_app_root):
    if not file or not allowed_file(file.filename):
        return {"error": "Invalid or missing file"}
        
    # Check if exists
    existing = Timetable.query.filter_by(
        department=department,
        course_id=course_id,
        batch_id=batch_id,
        semester=semester,
        academic_year=academic_year
    ).first()
    
    # Save path logic
    filename = secure_filename(file.filename)
    rel_path = f"uploads/timetables/{department}/{course_id}/{batch_id}/{semester}"
    abs_path = os.path.join(current_app_root, "static", rel_path)
    os.makedirs(abs_path, exist_ok=True)
    
    file_path = os.path.join(abs_path, filename)
    file.save(file_path)
    
    db_path = f"{rel_path}/{filename}"
    
    if existing:
        # replace
        # We might want to delete the old file, but 'keep old as backup' was mentioned
        existing.file_path = db_path
        existing.uploaded_at = datetime.utcnow()
        existing.uploaded_by = uploader_id
    else:
        new_tt = Timetable(
            department=department,
            course_id=course_id,
            batch_id=batch_id,
            semester=semester,
            academic_year=academic_year,
            file_path=db_path,
            uploaded_at=datetime.utcnow(),
            uploaded_by=uploader_id
        )
        db.session.add(new_tt)
        
    # Notify students
    students = Student.query.filter_by(batch_id=batch_id, status='Live').all()
    notifications = []
    for student in students:
        n = Notification(
            student_id=student.admission_number,
            title="Timetable Updated",
            message=f"Your timetable for Semester {semester} ({academic_year}) has been uploaded. Check your dashboard to view it.",
            type="timetable",
            is_read=False,
            created_at=datetime.utcnow()
        )
        notifications.append(n)
        
    if notifications:
        db.session.bulk_save_objects(notifications)
        
    db.session.commit()
    return {"success": True, "message": "Timetable uploaded and notifications sent."}

def delete_timetable(timetable_id, current_app_root):
    tt = Timetable.query.get(timetable_id)
    if not tt:
        return {"error": "Not found"}
        
    # Remove file
    if tt.file_path:
        abs_path = os.path.join(current_app_root, "static", tt.file_path)
        if os.path.exists(abs_path):
            os.remove(abs_path)
            
    db.session.delete(tt)
    db.session.commit()
    
    return {"success": True, "message": "Timetable deleted."}
