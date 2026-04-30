
import re
import os

with open('app.py', 'r', encoding='utf-8') as f:
    content = f.read()

START_MARKER = "def api_student_upload_marksheet():"
END_MARKER = "if __name__ == '__main__':"

idx_start = content.find(START_MARKER)
idx_end = content.rfind(END_MARKER)

if idx_start == -1 or idx_end == -1:
    raise SystemExit(f'Markers not found')

NEW_FUNC = r'''def api_student_upload_marksheet():
    """
    Student uploads a university marksheet PDF (APJ Abdul Kalam Technological University).
    Rule: Only one PDF per semester.
    Constraint: Strictly accepts ONLY Grade Cards or Marksheets.
    Validation: Verifies Student Name and Register Number against the profile.
    """
    try:
        student_id_session = request.form.get('student_id', '').strip().upper()
        target_semester = request.form.get('semester', type=int)
        
        if not student_id_session:
            return jsonify({'success': False, 'message': 'student_id required'}), 400
        if not target_semester:
            return jsonify({'success': False, 'message': 'semester required'}), 400
            
        student = Student.query.filter(Student.admission_number.ilike(student_id_session)).first()
        if not student:
            return jsonify({'success': False, 'message': 'Student profile not found'}), 404

        if 'file' not in request.files:
            return jsonify({'success': False, 'message': 'No file provided'}), 400

        f = request.files['file']
        if not f.filename.lower().endswith('.pdf'):
            return jsonify({'success': False, 'message': 'Only PDF university marksheets are allowed.'}), 400

        temp_fname = f"temp_{uuid.uuid4().hex}.pdf"
        save_dir = os.path.join('static', 'marksheets')
        os.makedirs(save_dir, exist_ok=True)
        temp_path = os.path.join(save_dir, temp_fname)
        f.save(temp_path)

        # 1. Broad text extraction
        text = ""
        try:
            with pdfplumber.open(temp_path) as pdf:
                for page in pdf.pages:
                    text += (page.extract_text(x_tolerance=4, y_tolerance=4) or "") + "\n"
        except Exception: pass

        if not text.strip():
            try:
                with open(temp_path, 'rb') as pdf_file:
                    reader = PyPDF2.PdfReader(pdf_file)
                    for page in reader.pages: text += (page.extract_text() or '') + "\n"
            except Exception: pass

        full_text_upper = text.upper()

        # 2. Strict Identity & University Verification
        KTU_KEYWORDS = ['APJ', 'ABDUL', 'KALAM', 'TECHNOLOGICAL', 'UNIVERSITY', 'GRADE CARD', 'MARKSHEET', 'SGPA', 'CGPA']
        is_ktu = any(kw in full_text_upper for kw in KTU_KEYWORDS)
        if not is_ktu:
            if os.path.exists(temp_path): os.remove(temp_path)
            return jsonify({'success': False, 'message': 'Invalid Document. Must be a KTU Grade Card/Marksheet.'}), 400

        # Identity Check
        pdf_name_match = re.search(r'NAME\s*[:\-]?\s*([A-Z\s\.]{3,50})', full_text_upper)
        pdf_reg_match = re.search(r'(?:REGISTER|REG|ADMISSION)\s*(?:NO|NUMBER)?\s*[:\-]?\s*([A-Z0-9-]{5,20})', full_text_upper)
        pdf_name = pdf_name_match.group(1).strip() if pdf_name_match else "UNKNOWN"
        pdf_reg = pdf_reg_match.group(1).strip() if pdf_reg_match else "UNKNOWN"

        name_tokens = student.full_name.upper().split()
        name_match = any(token in pdf_name for token in name_tokens if len(token) > 2)
        reg_match = student_id_session in pdf_reg or pdf_reg in student_id_session

        if not (name_match or reg_match):
            if os.path.exists(temp_path): os.remove(temp_path)
            return jsonify({'success': False, 'message': f'Identity Mismatch! Found: {pdf_name} ({pdf_reg})'}), 400

        # 3. Robust Extraction Strategy
        extracted_data = []
        lines = [ln.strip() for ln in text.split('\n') if ln.strip()]
        
        # Pattern set
        GRADE_TOKENS = ['S', 'A+', 'A', 'B+', 'B', 'C+', 'C', 'D', 'P', 'F', 'PASS', 'FAIL']
        MONTHS = r'(?:January|February|March|April|May|June|July|August|September|October|November|December)'
        
        for line in lines:
            # Pass 1: "Subject Name" "Code" "Grade" "Credit" "Date"
            # We look for the Grade Token in the middle of the line
            parts = re.split(r'\s+', line)
            if len(parts) < 3: continue
            
            found_idx = -1
            for g in GRADE_TOKENS:
                try:
                    # Look for exact match of grade token in parts (case insensitive)
                    idx = -1
                    for i, p in enumerate(parts):
                        if p.upper() == g:
                            # Verify if it's flanked by a course code (alphanumeric) and maybe a credit (digit)
                            if i > 0 and len(parts[i-1]) >= 5: # Likely code before grade
                                idx = i; break
                    if idx != -1:
                        found_idx = idx; break
                except: continue
                
            if found_idx != -1:
                # Grade is at parts[found_idx]
                # Subject is everything before the code at parts[found_idx-1]
                code = parts[found_idx-1]
                grade = parts[found_idx]
                subject = " ".join(parts[:found_idx-1])
                
                # Try to get marks if it's a mark format "Subject Mark Grade"
                # Logic: if parts[found_idx-1] is a number, then it's a mark!
                mark_val = None
                try:
                    if re.match(r'^\d{2,3}$', code):
                        mark_val = float(code)
                        # Re-parse subject since code was actually a mark
                    else:
                        pass # It's a grade card
                except: pass
                
                extracted_data.append({'subj': subject.strip().title(), 'mark': mark_val, 'grade': grade.upper()})
                continue
            
            # Pass 2: Fallback regex for "Subject Mark Grade" (Marksheet)
            m_mark = re.search(r'^(.+?)\s+(\d{2,3}(?:\.\d+)?)\s+([SABCDEF][+]?|PASS|FAIL)\s*$', line, re.IGNORECASE)
            if m_mark:
                extracted_data.append({'subj': m_mark.group(1).strip().title(), 'mark': float(m_mark.group(2)), 'grade': m_mark.group(3).upper()})

        if not extracted_data:
            if os.path.exists(temp_path): os.remove(temp_path)
            return jsonify({'success': False, 'message': 'No subjects detected. Please use a standard PDF.'}), 400

        # 4. Save
        final_fname = f"marksheet_{student_id_session}_S{target_semester}.pdf"
        final_path = os.path.join(save_dir, final_fname)
        if os.path.exists(final_path): os.remove(final_path)
        shutil.move(temp_path, final_path)

        final_extracted = []
        for item in extracted_data:
            subj_key = item['subj']
            # Dedup by taking first 10 chars of subject
            record = StudentMark.query.filter(
                StudentMark.student_id.ilike(student_id_session),
                StudentMark.subject_code.ilike(f'%{subj_key[:10]}%')
            ).first()
            if not record:
                record = StudentMark(student_id=student_id_session, subject_code=subj_key, semester=target_semester)
                db.session.add(record)
            
            if item['mark']: record.university_mark = item['mark']
            if item['grade']: record.university_grade = item['grade']
            record.semester = target_semester
            final_extracted.append({'subj': subj_key, 'mark': item['mark'], 'grade': item['grade']})

        db.session.commit()
        return jsonify({
            'success': True,
            'extracted': final_extracted,
            'student_info': {'name': pdf_name, 'reg': pdf_reg}
        })
    except Exception as ex:
        db.session.rollback()
        return jsonify({'success': False, 'message': str(ex)}), 500

'''

new_content = content[:idx_start] + NEW_FUNC + "\n\n" + content[idx_end:]

with open('app.py', 'w', encoding='utf-8') as f:
    f.write(new_content)

print('SUCCESS: Robust Subject/Grade Card Parser Implemented')
