
import os
import re

with open('app.py', 'r', encoding='utf-8') as f:
    content = f.read()

START_MARKER = "def api_student_upload_marksheet():"
END_MARKER = "if __name__ == '__main__':"

idx_start = content.find(START_MARKER)
idx_end = content.rfind(END_MARKER)

if idx_start == -1 or idx_end == -1:
    raise SystemExit(f'Markers not found: start={idx_start}, end={idx_end}')

NEW_FUNC = r'''def api_student_upload_marksheet():
    """
    Student uploads a university marksheet PDF (APJ Abdul Kalam Technological University).
    Rule: Only one PDF per semester.
    Constraint: Strictly accepts ONLY Grade Cards or Marksheets.
    """
    try:
        student_id = request.form.get('student_id', '').strip().upper()
        semester = request.form.get('semester', type=int)
        if not student_id:
            return jsonify({'success': False, 'message': 'student_id required'}), 400
        if not semester:
            return jsonify({'success': False, 'message': 'semester required'}), 400
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

        # 2. Strict University Verification
        KTU_KEYWORDS = ['APJ', 'ABDUL', 'KALAM', 'TECHNOLOGICAL', 'UNIVERSITY', 'GRADE CARD', 'MARKSHEET', 'SGPA', 'CGPA']
        if not any(kw in text.upper() for kw in KTU_KEYWORDS):
            if os.path.exists(temp_path): os.remove(temp_path)
            return jsonify({
                'success': False, 
                'message': 'Invalid Document. The system only accepts APJ Abdul Kalam Technological University (KTU) Grade Cards or Marksheets. Please upload an original PDF.'
            }), 400

        # 3. Enhanced Parsing Strategies
        GRADE_TOKENS = {'A','A+','B','B+','C','C+','D','F','O','S','P','PASS','FAIL','AB','WH','RA','E','E+','SA'}
        
        extracted_data = [] # List of {'subj': str, 'mark': float|None, 'grade': str|None}
        lines = [ln.strip() for ln in text.split('\n')]
        processed_lines = set()

        # Strategy A: Grade Card Format (Subject Code + Grade + Credit)
        # Example: "Data Science & Machine Learning 24SJMCA201 C 4 November 2025"
        # Group 1: Subject, Group 2: Code, Group 3: Grade, Group 4: Credit
        grade_card_pat = re.compile(
            r'^(.{3,60}?)\s+([A-Z0-9-]{5,15})\s+([SABCDEF][+]?|PASS|FAIL)\s+(\d+)\s+(?:January|February|March|April|May|June|July|August|September|October|November|December)',
            re.IGNORECASE
        )

        # Strategy B: Inline Mark Format (Subject + Mark + Grade)
        # Example: "Database Management Systems 81 A+"
        mark_pat = re.compile(
            r'^([A-Za-z][A-Za-z0-9 &/\-]{2,60}?)\s+(\d{2,3}(?:\.\d{1,2})?)\s+([SABCDEF][+]?)\s*$',
            re.IGNORECASE
        )

        for i, line in enumerate(lines):
            # Try Grade Card Pattern
            m_gc = grade_card_pat.match(line)
            if m_gc:
                subj, code, grade, credit = m_gc.groups()
                extracted_data.append({'subj': subj.strip().title(), 'mark': None, 'grade': grade.upper()})
                processed_lines.add(i)
                continue
            
            # Try Mark Pattern
            m_mk = mark_pat.match(line)
            if m_mk:
                subj, mark, grade = m_mk.groups()
                extracted_data.append({'subj': subj.strip().title(), 'mark': float(mark), 'grade': grade.upper()})
                processed_lines.add(i)
                continue

        # Strategy C: Line-Pair Fallback (Subject \n Mark)
        if not extracted_data:
            i = 0
            while i < len(lines):
                if i in processed_lines: 
                    i += 1; continue
                j = i + 1
                while j < len(lines) and not lines[j]: j += 1
                if j < len(lines):
                    m_mark_only = re.match(r'^(\d{2,3}(?:\.\d{1,2})?)\s*([SABCDEF][+]?|PASS|FAIL)?\s*$', lines[j], re.IGNORECASE)
                    if m_mark_only:
                        mark_val = float(m_mark_only.group(1))
                        grade_val = m_mark_only.group(2).upper() if m_mark_only.group(2) else None
                        subj = lines[i].strip()
                        if len(subj) >= 3 and subj.upper() not in GRADE_TOKENS and not re.match(r'^\d+$', subj):
                            extracted_data.append({'subj': subj.title(), 'mark': mark_val, 'grade': grade_val})
                            processed_lines.add(i); processed_lines.add(j)
                            i = j + 1; continue
                i += 1

        if not extracted_data:
            if os.path.exists(temp_path): os.remove(temp_path)
            return jsonify({
                'success': False, 
                'message': 'Could not parse Grade Card. Please ensure it is a high-quality original university PDF.'
            }), 400

        # 4. Save File & DB
        final_fname = f"marksheet_{student_id}_S{semester}.pdf"
        final_path = os.path.join(save_dir, final_fname)
        if os.path.exists(final_path): os.remove(final_path)
        shutil.move(temp_path, final_path)

        final_extracted = []
        for item in extracted_data:
            subj_key = item['subj']
            record = StudentMark.query.filter(
                StudentMark.student_id.ilike(student_id),
                StudentMark.subject_code.ilike(f'%{subj_key[:8]}%')
            ).first()
            if not record:
                record = StudentMark(student_id=student_id, subject_code=subj_key, semester=semester)
                db.session.add(record)
            
            if item['mark']: record.university_mark = item['mark']
            if item['grade']: record.university_grade = item['grade']
            record.semester = semester
            final_extracted.append({'subj': subj_key, 'mark': item['mark'], 'grade': item['grade']})

        db.session.commit()
        return jsonify({
            'success': True,
            'file_path': f'marksheets/{final_fname}',
            'extracted': final_extracted,
            'total': len(final_extracted),
            'raw_preview': text[:400] + "..."
        })
    except Exception as ex:
        db.session.rollback()
        return jsonify({'success': False, 'message': str(ex)}), 500

'''

new_content = content[:idx_start] + NEW_FUNC + "\n\n" + content[idx_end:]

with open('app.py', 'w', encoding='utf-8') as f:
    f.write(new_content)

print('SUCCESS: APJ Abdul Kalam University custom parser implemented')
