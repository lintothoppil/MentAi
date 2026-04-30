import re

with open("app.py", "r", encoding="utf-8") as f:
    content = f.read()

# Let's completely replace api_get_students_list inside app.py

old_func_1 = """def api_get_students_list():
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
    except Exception as e:
        return jsonify({'success': False, 'message': str(e)}), 500"""
        
new_func_1 = """def api_get_students_list():
    try:
        from academic_utils import calculate_academic_status
        from models import db
        
        students = Student.query.all()
        data = []
        changed = False
        
        for s in students:
            acad = calculate_academic_status(s.batch, s.branch)
            new_status = 'Passed Out' if acad['student_status'] == 'alumni' else 'Live'
            
            # Auto-update status if mismatch
            if s.status != new_status and s.status != 'Hold':
                s.status = new_status
                changed = True
                
            data.append({
                'admission_number': s.admission_number,
                'name': s.full_name,
                'department': s.branch,
                'batch': s.batch,
                'status': s.status,
                'mentor_id': s.mentor_id,
                'academic_info': acad
            })
            
        if changed:
            try:
                db.session.commit()
            except:
                db.session.rollback()
                
        return jsonify({'success': True, 'data': data}), 200
    except Exception as e:
        return jsonify({'success': False, 'message': str(e)}), 500"""

content = content.replace(old_func_1, new_func_1)

old_func_2 = """        # Get mentees
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
            })"""
            
new_func_2 = """        # Get mentees
        mentees = Student.query.filter_by(mentor_id=mentor.id).all()
        
        from academic_utils import calculate_academic_status
        
        mentee_data = []
        for s in mentees:
            acad = calculate_academic_status(s.batch, s.branch)
            mentee_data.append({
                'id': s.admission_number,
                'name': s.full_name,
                'batch': f"{s.branch} {s.batch if s.batch else ''}".strip(),
                'status': s.status,
                'risk': 'low',
                'lastMeeting': 'Recent',
                'academic_info': acad
            })"""

content = content.replace(old_func_2, new_func_2)

old_func_3 = """            'photo_url': photo_url,
            'profile_completed': student.profile_completed,
        }"""
        
new_func_3 = """            'photo_url': photo_url,
            'profile_completed': student.profile_completed,
            'academic_info': calculate_academic_status(student.batch, student.branch),
        }"""

content = content.replace(old_func_3, new_func_3)

# Let's also patch api_student_detail to Auto update student status
old_func_4 = """def api_student_detail(adm):
    \"\"\"Full student profile for mentor view. Returns all data if profile completed, else basics.\"\"\"
    try:
        student = Student.query.get(adm.upper())"""
        
new_func_4 = """def api_student_detail(adm):
    \"\"\"Full student profile for mentor view. Returns all data if profile completed, else basics.\"\"\"
    try:
        from academic_utils import calculate_academic_status
        from models import db
        student = Student.query.get(adm.upper())
        if student:
            acad = calculate_academic_status(student.batch, student.branch)
            new_status = 'Passed Out' if acad['student_status'] == 'alumni' else 'Live'
            if student.status != new_status and student.status != 'Hold':
                student.status = new_status
                try:
                    db.session.commit()
                except:
                    db.session.rollback()
"""
content = content.replace(old_func_4, new_func_4)


with open("app.py", "w", encoding="utf-8") as f:
    f.write(content)

print("Patch 2 applied.")
