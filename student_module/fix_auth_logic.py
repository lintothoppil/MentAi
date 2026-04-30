
import re
import os

with open('app.py', 'r', encoding='utf-8') as f:
    content = f.read()

START_MARKER = "def api_student_upload_marksheet():"
END_MARKER = "if __name__ == '__main__':"

idx_start = content.find(START_MARKER)
idx_end = content.rfind(END_MARKER)

NEW_FUNC = r'''def api_student_upload_marksheet():
    """
    Student uploads a university marksheet PDF.
    Rule: Requires confirmation if existing marks exist for the semester.
    Constraint: Locked if already verified by mentor.
    """
    try:
        student_id_session = request.form.get('student_id', '').strip().upper()
        target_semester = request.form.get('semester', type=int)
        force_replace = request.form.get('force_replace') == 'true'
        
        if not student_id_session or not target_semester:
            return jsonify({'success': False, 'message': 'Missing data'}), 400
            
        student = Student.query.filter(Student.admission_number.ilike(student_id_session)).first()
        if not student: return jsonify({'success': False, 'message': 'Student not found'}), 404

        # CHECK 1: Is the semester already verified/locked?
        locked_record = StudentMark.query.filter_by(student_id=student_id_session, semester=target_semester, is_locked=True).first()
        if locked_record:
            return jsonify({'success': False, 'message': 'This semester marks are already verified by your mentor and locked. Changes are not allowed.'}), 403

        # CHECK 2: Does a marksheet already exist? (Ask for confirmation)
        final_fname = f"marksheet_{student_id_session}_S{target_semester}.pdf"
        save_dir = os.path.join('static', 'marksheets')
        final_path = os.path.join(save_dir, final_fname)
        
        if os.path.exists(final_path) and not force_replace:
            return jsonify({
                'success': False, 
                'needs_confirmation': True, 
                'message': f'A marksheet for Semester {target_semester} already exists. Uploading a new one will delete the existing marks. Do you want to proceed?'
            }), 200

        if 'file' not in request.files:
            return jsonify({'success': False, 'message': 'No file provided'}), 400

        f = request.files['file']
        temp_fname = f"temp_{uuid.uuid4().hex}.pdf"
        os.makedirs(save_dir, exist_ok=True)
        temp_path = os.path.join(save_dir, temp_fname)
        f.save(temp_path)

        # Extraction logic ... (Same as before but simplified for this patch)
        text = ""
        with pdfplumber.open(temp_path) as pdf:
            for page in pdf.pages: text += (page.extract_text(x_tolerance=4, y_tolerance=4) or "") + "\n"
        
        full_text_upper = text.upper()
        KTU_KEYWORDS = ['APJ', 'ABDUL', 'KALAM', 'TECHNOLOGICAL', 'UNIVERSITY', 'GRADE CARD', 'MARKSHEET']
        if not any(kw in full_text_upper for kw in KTU_KEYWORDS):
            if os.path.exists(temp_path): os.remove(temp_path)
            return jsonify({'success': False, 'message': 'Invalid KTU Document.'}), 400

        # Identity validation ...
        pdf_name_match = re.search(r'NAME\s*[:\-]?\s*([A-Z\s\.]{3,50})', full_text_upper)
        pdf_reg_match = re.search(r'(?:REGISTER|REG|ADMISSION)\s*(?:NO|NUMBER)?\s*[:\-]?\s*([A-Z0-9-]{5,20})', full_text_upper)
        pdf_name = pdf_name_match.group(1).strip() if pdf_name_match else "UNKNOWN"
        pdf_reg = pdf_reg_match.group(1).strip() if pdf_reg_match else "UNKNOWN"

        name_tokens = student.full_name.upper().split()
        name_match = any(token in pdf_name for token in name_tokens if len(token) > 2)
        if not name_match:
            if os.path.exists(temp_path): os.remove(temp_path)
            return jsonify({'success': False, 'message': f'Identity Mismatch: Found {pdf_name}'}), 400

        # Extraction Logic (Robust Token based)
        extracted_data = []
        GRADE_TOKENS = ['S', 'A+', 'A', 'B+', 'B', 'C+', 'C', 'D', 'P', 'F', 'PASS', 'FAIL']
        lines = [ln.strip() for ln in text.split('\n') if ln.strip()]
        for line in lines:
            parts = re.split(r'\s+', line)
            if len(parts) < 3: continue
            found_idx = -1
            for g in GRADE_TOKENS:
                for i, p in enumerate(parts):
                    if p.upper() == g and i > 0 and len(parts[i-1]) >= 5:
                        found_idx = i; break
                if found_idx != -1: break
            if found_idx != -1:
                extracted_data.append({'subj': " ".join(parts[:found_idx-1]).title(), 'mark': None, 'grade': parts[found_idx].upper()})

        if not extracted_data:
            if os.path.exists(temp_path): os.remove(temp_path)
            return jsonify({'success': False, 'message': 'Failed to parse subjects.'}), 400

        # Success - Replace
        if os.path.exists(final_path): os.remove(final_path)
        shutil.move(temp_path, final_path)

        final_extracted = []
        for item in extracted_data:
            subj_key = item['subj']
            record = StudentMark.query.filter(StudentMark.student_id.ilike(student_id_session), StudentMark.subject_code.ilike(f'%{subj_key[:8]}%')).first()
            if not record:
                record = StudentMark(student_id=student_id_session, subject_code=subj_key, semester=target_semester)
                db.session.add(record)
            
            if item['mark']: record.university_mark = item['mark']
            if item['grade']: record.university_grade = item['grade']
            record.is_verified = False  # Reset on new upload
            record.semester = target_semester
            final_extracted.append({'subj': subj_key, 'mark': item['mark'], 'grade': item['grade']})

        db.session.commit()
        return jsonify({
            'success': True,
            'message': 'Marksheet uploaded and pending mentor verification.',
            'extracted': final_extracted
        })
    except Exception as ex:
        db.session.rollback()
        return jsonify({'success': False, 'message': str(ex)}), 500


@app.route('/api/mentor/marks/verify/<string:adm>/<int:sem>', methods=['POST'])
def api_mentor_verify_marks(adm, sem):
    """Mentor verifies and locks student marks for a semester."""
    try:
        data = request.json
        action = data.get('action', 'verify') # 'verify' or 'unlock'
        
        marks = StudentMark.query.filter_by(student_id=adm.upper(), semester=sem).all()
        if not marks: return jsonify({'success': False, 'message': 'No marks found to verify'}), 404
        
        for m in marks:
            if action == 'verify':
                m.is_verified = True
                m.is_locked = True
            else:
                m.is_verified = False
                m.is_locked = False
        
        db.session.commit()
        return jsonify({'success': True, 'message': f'Marks {action}ed successfully.'})
    except Exception as ex:
        db.session.rollback()
        return jsonify({'success': False, 'message': str(ex)}), 500


@app.route('/api/student/marksheet/download/<string:adm>/<int:sem>', methods=['GET'])
def api_student_download_marksheet(adm, sem):
    """Serves the marksheet ONLY if verified by mentor."""
    try:
        adm = adm.upper()
        marks = StudentMark.query.filter_by(student_id=adm, semester=sem).all()
        
        if not marks: return jsonify({'success': False, 'message': 'No academic records found for this semester'}), 404
        
        is_verified = all(m.is_verified for m in marks)
        if not is_verified:
            return jsonify({
                'success': False, 
                'message': 'Marksheet download blocked. Your mentor must verify and authorize your marks before you can download the result sheet.'
            }), 403
            
        fname = f"marksheet_{adm}_S{sem}.pdf"
        fpath = os.path.normpath(os.path.join(os.getcwd(), 'static', 'marksheets', fname))
        
        if not os.path.exists(fpath):
            return jsonify({'success': False, 'message': 'Record exists but PDF file not found on server.'}), 404
            
        from flask import send_file
        return send_file(fpath, as_attachment=True, download_name=f"Semester_{sem}_Result.pdf")
    except Exception as ex:
        return jsonify({'success': False, 'message': str(ex)}), 500

'''

new_content = content[:idx_start] + NEW_FUNC + "\n\n" + content[idx_end:]
with open('app.py', 'w', encoding='utf-8') as f:
    f.write(new_content)

print("SUCCESS: Authorization Workflow & Confirmation Dialog backend implemented.")
