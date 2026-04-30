
with open('app.py', 'r', encoding='utf-8') as f:
    content = f.read()

# Find the start and end markers
START_MARKER = "def api_student_upload_marksheet():"
END_MARKER = "if __name__ == '__main__':"

idx_start = content.find(START_MARKER)
idx_end = content.rfind(END_MARKER)

if idx_start == -1 or idx_end == -1:
    raise SystemExit(f'Markers not found: start={idx_start}, end={idx_end}')

# Corrected function with restrictions
NEW_FUNC = r'''def api_student_upload_marksheet():
    """
    Student uploads a university end-sem marksheet PDF.
    Rule: Only one PDF per semester. New upload deletes the previous one.
    Constraint: Only valid marksheet PDFs allowed. Others rejected with warning.
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
        
        # 1. Validation: Must be PDF
        if not f.filename.lower().endswith('.pdf'):
            return jsonify({
                'success': False, 
                'message': 'Invalid file type. Only PDF university marksheets are allowed.'
            }), 400

        import uuid
        # Save to a temporary location for analysis
        temp_fname = f"temp_{uuid.uuid4().hex}.pdf"
        save_dir = os.path.join('static', 'marksheets')
        os.makedirs(save_dir, exist_ok=True)
        temp_path = os.path.join(save_dir, temp_fname)
        f.save(temp_path)

        # 2. Extract and Parse text to verify if it's a marksheet
        text = ""
        try:
            import pdfplumber
            with pdfplumber.open(temp_path) as pdf:
                for page in pdf.pages:
                    text += (page.extract_text(x_tolerance=4, y_tolerance=4) or "") + "\n"
        except Exception:
            pass

        if not text.strip():
            try:
                import PyPDF2
                with open(temp_path, 'rb') as pdf_file:
                    reader = PyPDF2.PdfReader(pdf_file)
                    for page in reader.pages:
                        text += (page.extract_text() or '') + "\n"
            except Exception:
                pass

        # Parse pairs to see if it's a marksheet
        GRADE_TOKENS = {'A','A+','B','B+','C','C+','D','F','O','S','P','PASS','FAIL','AB','WH','RA','E','E+','SA'}
        raw_pairs = []
        lines = [ln.strip() for ln in text.split('\n')]
        processed = set()
        
        INLINE_PAT = re.compile(r'^([A-Za-z][A-Za-z0-9 &/\-]{2,60}?)\s+(\d{2,3}(?:\.\d{1,2})?)\s*(?:[A-F][+]?|O|S)?\s*$', re.IGNORECASE)
        MARK_ONLY_PAT = re.compile(r'^(\d{2,3}(?:\.\d{1,2})?)\s*(?:[A-F][+]?|O|S)?\s*$', re.IGNORECASE)

        i = 0
        while i < len(lines):
            line = lines[i]
            if not line or i in processed:
                i += 1; continue
            j = i + 1
            while j < len(lines) and not lines[j]: j += 1
            if j < len(lines):
                m_only = MARK_ONLY_PAT.match(lines[j])
                if m_only:
                    mark_val = float(m_only.group(1))
                    subj = line.strip()
                    if (len(subj) >= 3 and subj.upper() not in GRADE_TOKENS and not re.match(r'^\d+$', subj) and 0 < mark_val <= 100):
                        raw_pairs.append((subj, mark_val))
                        processed.add(i); processed.add(j)
                        i = j + 1; continue
            m_inline = INLINE_PAT.match(line)
            if m_inline:
                subj = m_inline.group(1).strip()
                try:
                    mark_val = float(m_inline.group(2))
                    if (len(subj) >= 3 and subj.upper() not in GRADE_TOKENS and not re.match(r'^\d+$', subj) and 0 < mark_val <= 100):
                        raw_pairs.append((subj, mark_val))
                        processed.add(i)
                except ValueError: pass
            i += 1

        # 3. Warning if not a marksheet
        if not raw_pairs:
            import os
            if os.path.exists(temp_path): os.remove(temp_path)
            return jsonify({
                'success': False, 
                'message': 'Warning: This document does not appear to be a valid university marksheet. No subjects or marks were detected. Please upload an original end-semester PDF.'
            }), 400

        # 4. Success — One PDF per semester rule (Delete old if exists)
        final_fname = f"marksheet_{student_id}_S{semester}.pdf"
        final_path = os.path.join(save_dir, final_fname)
        
        if os.path.exists(final_path):
            try:
                os.remove(final_path)
            except Exception as e:
                print(f"Error deleting old marksheet: {e}")

        # Move temp to final
        import shutil
        shutil.move(temp_path, final_path)

        # 5. Database Upsert
        extracted = []
        seen = set()
        for subj_raw, mark_val in raw_pairs:
            subj_key = subj_raw.strip().title()
            if subj_key.lower() in seen: continue
            seen.add(subj_key.lower())

            record = StudentMark.query.filter(
                StudentMark.student_id.ilike(student_id),
                StudentMark.subject_code.ilike(f'%{subj_key[:8]}%')
            ).first()
            if not record:
                record = StudentMark(student_id=student_id, subject_code=subj_key, semester=semester)
                db.session.add(record)
            record.university_mark = mark_val
            if semester: record.semester = semester
            extracted.append({'subject_code': subj_key, 'university_mark': mark_val})

        db.session.commit()
        return jsonify({
            'success': True,
            'file_path': f'marksheets/{final_fname}',
            'extracted': extracted,
            'total_extracted': len(extracted),
            'raw_text_preview': text[:400] + "..."
        })
    except Exception as ex:
        db.session.rollback()
        return jsonify({'success': False, 'message': str(ex)}), 500

'''

new_content = content[:idx_start] + NEW_FUNC + "\n\n" + content[idx_end:]

with open('app.py', 'w', encoding='utf-8') as f:
    f.write(new_content)

print('SUCCESS')
