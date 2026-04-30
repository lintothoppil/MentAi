
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
    Handles PDF Marksheet upload with strict confirmation and robust parsing.
    Prevents data duplication and ensures mentor review.
    """
    try:
        student_id_session = request.form.get('student_id', '').strip().upper()
        target_semester = request.form.get('semester', type=int)
        force_replace = request.form.get('force_replace') == 'true'
        
        if not student_id_session or not target_semester:
            return jsonify({'success': False, 'message': 'student_id and semester required'}), 400
            
        student = Student.query.filter(Student.admission_number.ilike(student_id_session)).first()
        if not student: return jsonify({'success': False, 'message': 'Student profile not found'}), 404

        # 1. Validation & Confirmation Check
        existing_marks = StudentMark.query.filter_by(student_id=student_id_session, semester=target_semester).first()
        if existing_marks and not force_replace:
            return jsonify({
                'success': False, 
                'needs_confirmation': True, 
                'message': f'A marksheet for Semester {target_semester} already exists. Uploading this will DELETE all previous mark records for this semester. Continue?'
            }), 200

        if 'file' not in request.files:
            return jsonify({'success': False, 'message': 'No file provided'}), 400

        f = request.files['file']
        temp_fname = f"temp_{uuid.uuid4().hex}.pdf"
        save_dir = os.path.join('static', 'marksheets')
        os.makedirs(save_dir, exist_ok=True)
        temp_path = os.path.join(save_dir, temp_fname)
        f.save(temp_path)

        # 2. Text Extraction
        text = ""
        try:
            with pdfplumber.open(temp_path) as pdf:
                for page in pdf.pages:
                    text += (page.extract_text(x_tolerance=3, y_tolerance=3) or "") + "\n"
        except: pass

        if not text.strip():
            try:
                with open(temp_path, 'rb') as pdf_file:
                    reader = PyPDF2.PdfReader(pdf_file)
                    for page in reader.pages: text += (page.extract_text() or '') + "\n"
            except: pass

        full_text_upper = text.upper()
        if not any(kw in full_text_upper for kw in ['APJ', 'ABDUL', 'KALAM', 'TECHNOLOGICAL', 'UNIVERSITY', 'GRADE CARD', 'MARKSHEET']):
            if os.path.exists(temp_path): os.remove(temp_path)
            return jsonify({'success': False, 'message': 'Not a valid KTU Marksheet/Grade Card.'}), 400

        # Identity validation
        pdf_name_match = re.search(r'NAME\s*[:\-]?\s*([A-Z\s\.]{3,50})', full_text_upper)
        pdf_name = pdf_name_match.group(1).strip() if pdf_name_match else "UNKNOWN"
        name_tokens = student.full_name.upper().split()
        if not any(token in pdf_name for token in name_tokens if len(token) > 2):
            if os.path.exists(temp_path): os.remove(temp_path)
            return jsonify({'success': False, 'message': f'Identity Mismatch! This PDF belongs to {pdf_name}.'}), 400

        # 3. Robust Global Extraction (To prevent line-based truncation)
        extracted_data = []
        # Pattern: [Subject Name (up to 60 chars)] [Code/Marks (alphanum or 2-3 digits)] [Grade (S,A+,etc)]
        # We use a non-greedy subject match followed by a lookahead for a grade
        grade_pat = r'(?:\s+)([SABCDEF][+]?|PASS|FAIL)(?:\s+|$)'
        # Find all lines that LOOK like subject rows
        candidate_rows = re.findall(r'^.*?([A-Z0-9].+?)\s+([A-Z0-9-]{5,15}|\d{2,3})\s+([SABCDEF][+]?|PASS|FAIL)(?:\s+|$)', text, re.MULTILINE | re.IGNORECASE)
        
        for subj, code, grade in candidate_rows:
            # Prevent capturing metadata as subjects
            if len(subj) < 3 or any(kw in subj.upper() for kw in ['SEMESTER', 'MONTH', 'YEAR', 'REGISTER', 'UNIVERSITY']):
                continue
            
            # Simple mark vs code detection
            mark_val = None
            if re.match(r'^\d{2,3}$', code): mark_val = float(code)
            
            extracted_data.append({
                'subj': subj.strip().title(),
                'mark': mark_val,
                'grade': grade.upper()
            })

        if not extracted_data:
            # Fallback to a broader search if start-of-line matching failed
            all_matches = re.findall(r'([A-Z][A-Z\s&]{3,60}?)\s+([A-Z0-9-]{5,15}|\d{2,3})\s+([SABCDEF][+]?|PASS|FAIL)', text, re.IGNORECASE)
            for subj, code, grade in all_matches:
                if any(kw in subj.upper() for kw in ['SEMESTER', 'UNIVERSITY', 'REGISTER']): continue
                mark_val = float(code) if re.match(r'^\d{2,3}$', code) else None
                extracted_data.append({'subj': subj.strip().title(), 'mark': mark_val, 'grade': grade.upper()})

        if not extracted_data:
            if os.path.exists(temp_path): os.remove(temp_path)
            return jsonify({'success': False, 'message': 'Failed to parse subjects. Ensure the PDF is in a standard KTU format.'}), 400

        # 4. Mandatory Clean Update (If user confirmed)
        if force_replace:
            # Delete ALL previous records for this semester to prevent mixing data
            StudentMark.query.filter_by(student_id=student_id_session, semester=target_semester).delete()
        
        final_fname = f"marksheet_{student_id_session}_S{target_semester}.pdf"
        final_path = os.path.join(save_dir, final_fname)
        if os.path.exists(final_path): os.remove(final_path)
        shutil.move(temp_path, final_path)

        final_extracted = []
        for item in extracted_data:
            # Upsert into DB
            m = StudentMark(
                student_id=student_id_session,
                subject_code=item['subj'],
                university_mark=item['mark'],
                university_grade=item['grade'],
                semester=target_semester,
                is_verified=False
            )
            db.session.add(m)
            final_extracted.append({
                'subj': item['subj'],
                'mark': item['mark'],
                'grade': item['grade']
            })

        db.session.commit()
        return jsonify({
            'success': True,
            'message': 'Marksheet updated. Previous records cleared and new records pending review.',
            'extracted': final_extracted,
            'student_info': {'name': pdf_name, 'sem': target_semester}
        })
    except Exception as ex:
        db.session.rollback()
        return jsonify({'success': False, 'message': str(ex)}), 500

'''

new_content = content[:idx_start] + NEW_FUNC + "\n\n" + content[idx_end:]
with open('app.py', 'w', encoding='utf-8') as f:
    f.write(new_content)

print("SUCCESS: Fixed Truncation & Mandatory Clean-Update Logic.")
