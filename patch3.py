import re

with open("student_module/app.py", "r", encoding="utf-8") as f:
    content = f.read()

old_func_5 = """@app.route('/api/analytics/mentor/<int:mentor_id>', methods=['GET'])
def api_get_mentor_analytics(mentor_id):
    try:
        mentees = Student.query.filter_by(mentor_id=mentor_id, status='Live').all()
        data = []
        for m in mentees:
            # Check DB or compute
            sa = StudentAnalytics.query.filter_by(student_id=m.admission_number).first()"""
            
new_func_5 = """@app.route('/api/analytics/mentor/<int:mentor_id>', methods=['GET'])
def api_get_mentor_analytics(mentor_id):
    try:
        from academic_utils import calculate_academic_status
        from models import db
        mentees = Student.query.filter_by(mentor_id=mentor_id).all()
        data = []
        changed = False
        for m in mentees:
            acad = calculate_academic_status(m.batch, m.branch)
            new_status = 'Passed Out' if acad['student_status'] == 'alumni' else 'Live'
            if m.status != new_status and m.status != 'Hold':
                m.status = new_status
                changed = True
                
            # Check DB or compute
            sa = StudentAnalytics.query.filter_by(student_id=m.admission_number).first()"""

content = content.replace(old_func_5, new_func_5)

old_func_6 = """            data.append({
                "student_id": m.admission_number,
                "name": m.full_name,
                "batch": m.batch or "",
                "risk_score": metrics.get("risk_score", 0.0) or 0.0,"""

new_func_6 = """            data.append({
                "student_id": m.admission_number,
                "name": m.full_name,
                "batch": m.batch or "",
                "status": m.status,
                "academic_info": acad,
                "risk_score": metrics.get("risk_score", 0.0) or 0.0,"""
                
content = content.replace(old_func_6, new_func_6)

old_func_7 = """        return jsonify({'success': True, 'data': data})
    except Exception as e:"""
    
new_func_7 = """        if changed:
            try:
                db.session.commit()
            except:
                db.session.rollback()
        return jsonify({'success': True, 'data': data})
    except Exception as e:"""

content = content.replace(old_func_7, new_func_7)

with open("student_module/app.py", "w", encoding="utf-8") as f:
    f.write(content)
    
print("Patch 3 applied")
