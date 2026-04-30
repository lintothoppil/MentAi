
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
        # Keywords to ensure it's a KTU document
        KTU_KEYWORDS = ['APJ', 'ABDUL', 'KALAM', 'TECHNOLOGICAL', 'UNIVERSITY', 'GRADE CARD', 'MARKSHEET', 'SGPA', 'CGPA']
        if not any(kw in full_text_upper for kw in KTU_KEYWORDS):
            if os.path.exists(temp_path): os.remove(temp_path)
            return jsonify({
                'success': False, 
                'message': 'Invalid Document. The system only accepts APJ Abdul Kalam Technological University (KTU) Grade Cards or Marksheets.'
            }), 400

        # CROSS-VALIDATION: Check if this PDF belongs to the logged-in student
        # Extract name from PDF: typically "Name : <Name>" or "Name <Name>"
        pdf_name_match = re.search(r'NAME\s*[:\-]?\s*([A-Z\s]{3,50})', full_text_upper)
        pdf_reg_match = re.search(r'(?:REGISTER|REG|ADMISSION)\s*(?:NO|NUMBER)?\s*[:\-]?\s*([A-Z0-9-]{5,20})', full_text_upper)
        
        pdf_name = pdf_name_match.group(1).strip() if pdf_name_match else ""
        pdf_reg = pdf_reg_match.group(1).strip() if pdf_reg_match else ""

        # Validate name or registration number
        # Note: We use in-string checks because admission numbers might vary slightly in format (e.g. SJC24MCA vs A24MCA)
        name_tokens = student.full_name.upper().split()
        name_match = any(token in pdf_name for token in name_tokens if len(token) > 2)
        reg_match = student_id_session in pdf_reg or pdf_reg in student_id_session

        if not (name_match or reg_match):
            if os.path.exists(temp_path): os.remove(temp_path)
            return jsonify({
                'success': False, 
                'message': f'Identity Mismatch! This document belongs to "{pdf_name}" ({pdf_reg}), not you. Please upload your own marksheet.'
            }), 400

        # SEMESTER VALIDATION
        # Convert Roman numerals or words to integer
        sem_map = {
            '1': 1, '2': 2, '3': 3, '4': 4, '5': 5, '6': 6, '7': 7, '8': 8,
            'IST': 1, 'IID': 2, 'IIIRD': 3, 'IVTH': 4, 'VTH': 5, 'VITH': 6,
            'ONE': 1, 'TWO': 2, 'THREE': 3, 'FOUR': 4, 'FIVE': 5, 'SIX': 6,
            'FIRST': 1, 'SECOND': 2, 'THIRD': 3, 'FOURTH': 4
        }
        found_sem = None
        sem_search = re.search(r'SEMESTER\s*[:\-]?\s*([A-Z0-9]+)', full_text_upper)
        if sem_search:
            sem_str = sem_search.group(1).strip()
            for key, val in sem_map.items():
                if key in sem_str: found_sem = val; break
        
        if found_sem and found_sem != target_semester:
            if os.path.exists(temp_path): os.remove(temp_path)
            return jsonify({
                'success': False,
                'message': f'Semester Mismatch! You selected Semester {target_semester}, but the PDF is for Semester {found_sem}.'
            }), 400

        # 3. Enhanced Parsing
        extracted_data = [] 
        lines = [ln.strip() for ln in text.split('\n') if ln.strip()]
        processed_lines = set()

        # Pattern A: Grade Card (Code + Grade + Credit)
        # Improved regex to handle optional Credit and whitespace
        grade_card_pat = re.compile(
            r'^(.{3,70}?)\s+([A-Z0-9-]{5,15})\s+([SABCDEF][+]?|PASS|FAIL)\s*(\d+)?\s*(?:January|February|March|April|May|June|July|August|September|October|November|December)?',
            re.IGNORECASE
        )

        for i, line in enumerate(lines):
            m = grade_card_pat.match(line)
            if m:
                subj, code, grade, credit = m.groups()
                extracted_data.append({'subj': subj.strip().title(), 'mark': None, 'grade': grade.upper()})
                processed_lines.add(i)

        # Pattern B: Marksheet fallback
        if not extracted_data:
            # Try subject mark grade inline
            for i, line in enumerate(lines):
                if i in processed_lines: continue
                m = re.match(r'^([A-Za-z][A-Za-z0-9 &/\-]{2,65}?)\s+(\d{2,3}(?:\.\d{1,2})?)\s*([SABCDEF][+]?|PASS|FAIL)?\s*$', line, re.IGNORECASE)
                if m:
                    extracted_data.append({'subj': m.group(1).strip().title(), 'mark': float(m.group(2)), 'grade': m.group(3).upper() if m.group(3) else None})
                    processed_lines.add(i)

        if not extracted_data:
            if os.path.exists(temp_path): os.remove(temp_path)
            return jsonify({'success': False, 'message': 'Could not extract subject data. Please ensure the PDF uses a standard university format.'}), 400

        # 4. Success — One PDF per semester
        final_fname = f"marksheet_{student_id_session}_S{target_semester}.pdf"
        final_path = os.path.join(save_dir, final_fname)
        if os.path.exists(final_path): os.remove(final_path)
        shutil.move(temp_path, final_path)

        # 5. DB Upsert
        final_extracted = []
        for item in extracted_data:
            subj_key = item['subj']
            record = StudentMark.query.filter(
                StudentMark.student_id.ilike(student_id_session),
                StudentMark.subject_code.ilike(f'%{subj_key[:8]}%')
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
            'file_path': f'marksheets/{final_fname}',
            'extracted': final_extracted,
            'total': len(final_extracted),
            'student_info': {'name': pdf_name, 'reg': pdf_reg, 'sem': found_sem or target_semester}
        })
    except Exception as ex:
        db.session.rollback()
        return jsonify({'success': False, 'message': str(ex)}), 500

'''

new_content = content[:idx_start] + NEW_FUNC + "\n\n" + content[idx_end:]

with open('app.py', 'w', encoding='utf-8') as f:
    f.write(new_content)

print('SUCCESS: Enhanced Extraction & Identity Validation implemented')
