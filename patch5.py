import re

with open("student_module/app.py", "r", encoding="utf-8") as f:
    text = f.read()
    
# Replace the Alumni endpoints to use Student table instead

# 1. api_get_alumni_departments
old_1 = """@app.route('/api/admin/alumni/departments', methods=['GET'])
def api_get_alumni_departments():
    \"\"\"Get all departments with alumni counts\"\"\"
    try:
        # Get distinct departments with alumni
        departments = db.session.query(
            AlumniStudent.department,
            db.func.count(AlumniStudent.id).label('alumni_count')
        ).group_by(AlumniStudent.department).all()
        
        result = []
        for dept, count in departments:
            if dept:  # Skip null departments
                result.append({
                    'department': dept,
                    'alumni_count': count
                })
        
        return jsonify({
            'success': True,
            'data': result
        }), 200
    except Exception as e:
        return jsonify({'success': False, 'message': str(e)}), 500"""

new_1 = """@app.route('/api/admin/alumni/departments', methods=['GET'])
def api_get_alumni_departments():
    \"\"\"Get all departments with alumni counts\"\"\"
    try:
        departments = db.session.query(
            Student.branch,
            db.func.count(Student.admission_number).label('alumni_count')
        ).filter(Student.status == 'Passed Out').group_by(Student.branch).all()
        
        result = []
        for dept, count in departments:
            if dept:
                result.append({
                    'department': dept,
                    'alumni_count': count
                })
        return jsonify({'success': True, 'data': result}), 200
    except Exception as e:
        return jsonify({'success': False, 'message': str(e)}), 500"""

text = text.replace(old_1, new_1)

# 2. api_get_alumni_batches
old_2 = """@app.route('/api/admin/alumni/batches', methods=['GET'])
def api_get_alumni_batches():
    \"\"\"Get all batches with alumni counts\"\"\"
    try:
        # Join AlumniStudent with Batch to get batch information
        batch_data = db.session.query(
            Batch,
            Course,
            db.func.count(AlumniStudent.id).label('alumni_count')
        ).join(
            AlumniStudent, 
            Batch.id == AlumniStudent.batch_id
        ).join(
            Course,
            Batch.course_id == Course.id
        ).group_by(
            Batch.id, 
            Course.id
        ).all()
        
        result = []
        for batch, course, count in batch_data:
            result.append({
                'batch_id': batch.id,
                'course_name': course.name,
                'start_year': batch.start_year,
                'end_year': batch.end_year,
                'alumni_count': count
            })
        
        return jsonify({
            'success': True,
            'data': result
        }), 200
    except Exception as e:
        return jsonify({'success': False, 'message': str(e)}), 500"""

# For Batches, Student model uses arbitrary strings like '2020-2024'. 
# We'll calculate a mock batch_id using hash of the batch string or just use the branch + batch string.
# Since frontend uses batch_id to filter, we can send back a safe hash or simple index. Actually, batch_id is just mapped to string in Select.
new_2 = """@app.route('/api/admin/alumni/batches', methods=['GET'])
def api_get_alumni_batches():
    \"\"\"Get all batches with alumni counts\"\"\"
    try:
        batch_data = db.session.query(
            Student.batch,
            Student.branch,
            db.func.count(Student.admission_number).label('alumni_count')
        ).filter(Student.status == 'Passed Out').group_by(Student.batch, Student.branch).all()
        
        result = []
        for batch_str, branch, count in batch_data:
            if not batch_str: continue
            years = batch_str.split('-')
            s_year = int(years[0]) if len(years) > 1 and years[0].isdigit() else 0
            e_year = int(years[1]) if len(years) > 1 and years[1].isdigit() else 0
            
            result.append({
                'batch_id': s_year,  # We'll use start year as ID because AdminAlumni uses it to filter batch_year
                'course_name': branch,
                'start_year': s_year,
                'end_year': e_year,
                'alumni_count': count
            })
            
        return jsonify({'success': True, 'data': result}), 200
    except Exception as e:
        return jsonify({'success': False, 'message': str(e)}), 500"""

text = text.replace(old_2, new_2)

# 3. api_search_alumni
old_3 = """@app.route('/api/admin/alumni/search', methods=['GET'])
def api_search_alumni():
    \"\"\"Search alumni by various criteria\"\"\"
    try:
        # Get query parameters
        search_term = request.args.get('search', '').strip()
        department = request.args.get('department', '').strip()
        batch_year = request.args.get('batch_year', '').strip()
        page = int(request.args.get('page', 1))
        per_page = int(request.args.get('per_page', 20))
        
        # Start building the query - explicitly specify the joins
        query = db.session.query(AlumniStudent, Batch, Course).select_from(AlumniStudent).join(Batch, AlumniStudent.batch_id == Batch.id).join(Course, Batch.course_id == Course.id)
        
        # Apply filters
        if search_term:
            search_filter = (
                AlumniStudent.name.ilike(f'%{search_term}%') |
                AlumniStudent.admission_number.ilike(f'%{search_term}%') |
                AlumniStudent.email.ilike(f'%{search_term}%')
            )
            query = query.filter(search_filter)
        
        if department:
            query = query.filter(AlumniStudent.department.ilike(f'%{department}%'))
        
        if batch_year:
            try:
                batch_year_int = int(batch_year)
                query = query.filter(Batch.end_year == batch_year_int)
            except ValueError:
                pass  # Invalid year, ignore filter
        
        # Paginate results
        total = query.count()
        alumni_data = query.offset((page - 1) * per_page).limit(per_page).all()
        
        # Format results
        result = []
        for alum, batch, course in alumni_data:
            result.append({
                'id': alum.id,
                'admission_number': alum.admission_number,
                'name': alum.name,
                'email': alum.email,
                'department': alum.department,
                'course_name': course.name if course else 'N/A',
                'batch_start_year': batch.start_year if batch else None,
                'batch_end_year': batch.end_year if batch else None,
                'passout_year': alum.passout_year,
                'created_at': alum.created_at.strftime('%Y-%m-%d') if alum.created_at else None
            })
        
        return jsonify({
            'success': True,
            'data': result,
            'pagination': {
                'current_page': page,
                'per_page': per_page,
                'total': total,
                'pages': (total + per_page - 1) // per_page
            }
        }), 200
    except Exception as e:
        return jsonify({'success': False, 'message': str(e)}), 500"""

new_3 = """@app.route('/api/admin/alumni/search', methods=['GET'])
def api_search_alumni():
    \"\"\"Search alumni by various criteria using Student table\"\"\"
    try:
        search_term = request.args.get('search', '').strip()
        department = request.args.get('department', '').strip()
        batch_year = request.args.get('batch_year', '').strip()
        page = int(request.args.get('page', 1))
        per_page = int(request.args.get('per_page', 20))
        
        query = Student.query.filter(Student.status == 'Passed Out')
        
        if search_term:
            search_filter = (
                Student.full_name.ilike(f'%{search_term}%') |
                Student.admission_number.ilike(f'%{search_term}%') |
                Student.email.ilike(f'%{search_term}%')
            )
            query = query.filter(search_filter)
            
        if department:
            query = query.filter(Student.branch.ilike(f'%{department}%'))
            
        if batch_year:
            # batch_year requested is the batch_id from the UI which maps to start_year in our hack
            query = query.filter(Student.batch.ilike(f'%{batch_year}%'))
            
        total = query.count()
        alumni_data = query.offset((page - 1) * per_page).limit(per_page).all()
        
        result = []
        for s in alumni_data:
            s_year, e_year = 0, 0
            if s.batch:
                y = s.batch.split('-')
                if len(y) > 1:
                    s_year = int(y[0]) if y[0].isdigit() else 0
                    e_year = int(y[1]) if y[1].isdigit() else 0
            
            result.append({
                'id': s.admission_number,
                'admission_number': s.admission_number,
                'name': s.full_name,
                'email': s.email or 'N/A',
                'department': s.branch,
                'course_name': s.branch,
                'batch_start_year': s_year,
                'batch_end_year': e_year,
                'passout_year': e_year,
                'created_at': 'N/A'
            })
            
        return jsonify({
            'success': True,
            'data': result,
            'pagination': {
                'current_page': page,
                'per_page': per_page,
                'total': total,
                'pages': (total + per_page - 1) // per_page
            }
        }), 200
    except Exception as e:
        return jsonify({'success': False, 'message': str(e)}), 500"""

text = text.replace(old_3, new_3)

# 4. api_get_alumni_by_department_batches
old_4 = """@app.route('/api/admin/alumni/department/<department>/batches', methods=['GET'])
def api_get_alumni_by_department_batches(department):
    \"\"\"Get batches for a specific department with alumni counts\"\"\"
    try:
        # Join AlumniStudent with Batch to get batch information, filtered by department
        batch_data = db.session.query(
            Batch,
            db.func.count(AlumniStudent.id).label('alumni_count')
        ).join(
            AlumniStudent, 
            Batch.id == AlumniStudent.batch_id
        ).filter(
            AlumniStudent.department == department
        ).group_by(
            Batch.id
        ).all()
        
        result = []
        for batch, count in batch_data:
            result.append({
                'batch_id': batch.id,
                'start_year': batch.start_year,
                'end_year': batch.end_year,
                'alumni_count': count,
                'status': batch.status
            })
        
        return jsonify({
            'success': True,
            'data': result
        }), 200
    except Exception as e:
        return jsonify({'success': False, 'message': str(e)}), 500"""

new_4 = """@app.route('/api/admin/alumni/department/<department>/batches', methods=['GET'])
def api_get_alumni_by_department_batches(department):
    \"\"\"Get batches for a specific department with alumni counts using Student\"\"\"
    try:
        batch_data = db.session.query(
            Student.batch,
            db.func.count(Student.admission_number).label('alumni_count')
        ).filter(
            Student.status == 'Passed Out',
            Student.branch == department
        ).group_by(Student.batch).all()
        
        result = []
        for batch_str, count in batch_data:
            if not batch_str: continue
            y = batch_str.split('-')
            s_year = int(y[0]) if len(y) > 0 and y[0].isdigit() else 0
            e_year = int(y[1]) if len(y) > 1 and y[1].isdigit() else 0
            result.append({
                'batch_id': s_year,
                'start_year': s_year,
                'end_year': e_year,
                'alumni_count': count,
                'status': 'Completed'
            })
        
        return jsonify({'success': True, 'data': result}), 200
    except Exception as e:
        return jsonify({'success': False, 'message': str(e)}), 500"""

text = text.replace(old_4, new_4)

old_5 = """@app.route('/api/admin/alumni/department/<department>/batch/<int:batch_id>', methods=['GET'])
def api_get_alumni_by_department_and_batch(department, batch_id):
    \"\"\"Get alumni for a specific department and batch\"\"\"
    try:
        # Join to get course info as well
        alumni_data = db.session.query(AlumniStudent, Batch, Course).join(
            Batch, AlumniStudent.batch_id == Batch.id
        ).outerjoin(
            Course, Batch.course_id == Course.id
        ).filter(
            AlumniStudent.department == department,
            AlumniStudent.batch_id == batch_id
        ).all()
        
        result = []
        for alum, batch, course in alumni_data:
            result.append({
                'id': alum.id,
                'admission_number': alum.admission_number,
                'name': alum.name,
                'email': alum.email,
                'department': alum.department,
                'course_name': course.name if course else 'N/A',
                'batch_start_year': batch.start_year if batch else None,
                'batch_end_year': batch.end_year if batch else None,
                'passout_year': alum.passout_year,
                'created_at': alum.created_at.strftime('%Y-%m-%d') if alum.created_at else None
            })
        
        return jsonify({
            'success': True,
            'data': result
        }), 200
    except Exception as e:
        return jsonify({'success': False, 'message': str(e)}), 500"""

new_5 = """@app.route('/api/admin/alumni/department/<department>/batch/<int:batch_id>', methods=['GET'])
def api_get_alumni_by_department_and_batch(department, batch_id):
    \"\"\"Get alumni for a specific department and batch using Student\"\"\"
    try:
        alumni_data = Student.query.filter(
            Student.status == 'Passed Out',
            Student.branch == department,
            Student.batch.ilike(f'{batch_id}-%')
        ).all()
        
        result = []
        for s in alumni_data:
            s_year, e_year = 0, 0
            if s.batch:
                y = s.batch.split('-')
                if len(y) > 1:
                    s_year = int(y[0]) if y[0].isdigit() else 0
                    e_year = int(y[1]) if y[1].isdigit() else 0
            
            result.append({
                'id': s.admission_number,
                'admission_number': s.admission_number,
                'name': s.full_name,
                'email': s.email or 'N/A',
                'department': s.branch,
                'course_name': s.branch,
                'batch_start_year': s_year,
                'batch_end_year': e_year,
                'passout_year': e_year,
                'created_at': 'N/A'
            })
            
        return jsonify({'success': True, 'data': result}), 200
    except Exception as e:
        return jsonify({'success': False, 'message': str(e)}), 500"""
        
text = text.replace(old_5, new_5)

with open("student_module/app.py", "w", encoding="utf-8") as f:
    f.write(text)

print("Patch 5 applied - Alumni API synced to Student model logic")
