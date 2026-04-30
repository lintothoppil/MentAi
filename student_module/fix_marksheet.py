
with open('app.py', 'r', encoding='utf-8') as f:
    content = f.read()

START = '# \u2500\u2500\u2500 STUDENT: UPLOAD & PARSE UNIVERSITY MARKSHEET PDF'
END_MARKER = "if __name__ == '__main__':"

idx_start = content.find(START)
idx_end = content.rfind(END_MARKER)

if idx_start == -1 or idx_end == -1:
    raise SystemExit(f'Markers not found: start={idx_start}, end={idx_end}')

NEW_CODE = r'''# \u2500\u2500\u2500 STUDENT: UPLOAD & PARSE UNIVERSITY MARKSHEET PDF \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500

@app.route('/api/student/marksheet/upload', methods=['POST'])
def api_student_upload_marksheet():
    """
    Student uploads a university end-sem marksheet PDF.
    Extraction chain: pdfplumber > PyPDF2 > pdfminer.
    Three parsing strategies so any PDF layout is handled:
      A  Inline:     "Data Science  78  A"  (subject + mark + optional grade on same line)
      B  Line-pair:  subject on one line, standalone mark on next line
      C  Code-mark:  "CS6301  75"           (pure subject-code patterns)
    """
    try:
        student_id = request.form.get('student_id', '').strip().upper()
        semester = request.form.get('semester', type=int)
        if not student_id:
            return jsonify({'success': False, 'message': 'student_id required'}), 400
        if 'file' not in request.files:
            return jsonify({'success': False, 'message': 'No file provided'}), 400

        f = request.files['file']
        import uuid
        fname = f"marksheet_{student_id}_{uuid.uuid4().hex}.pdf"
        save_dir = os.path.join('static', 'marksheets')
        os.makedirs(save_dir, exist_ok=True)
        save_path = os.path.join(save_dir, fname)
        f.save(save_path)

        # \u2500 Extraction chain \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500
        text = ""
        try:
            import pdfplumber
            with pdfplumber.open(save_path) as pdf:
                for page in pdf.pages:
                    text += (page.extract_text(x_tolerance=4, y_tolerance=4) or "") + "\n"
        except Exception:
            pass

        if not text.strip():
            try:
                import PyPDF2
                with open(save_path, 'rb') as pdf_file:
                    reader = PyPDF2.PdfReader(pdf_file)
                    for page in reader.pages:
                        text += (page.extract_text() or '') + "\n"
            except Exception:
                pass

        if not text.strip():
            try:
                from pdfminer.high_level import extract_text as pm_extract
                text = pm_extract(save_path)
            except Exception:
                pass

        # \u2500 Parse \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500
        GRADE_TOKENS = {'A','A+','B','B+','C','C+','D','F','O','S','P','PASS','FAIL','AB','WH','RA','E','E+','SA'}

        raw_pairs = []   # list of (subject_str, mark_float)
        lines = [ln.strip() for ln in text.split('\n')]
        processed = set()

        # Inline pattern: "Subject Name 78 A"  or  "Subject Name  78  A+"
        INLINE_PAT = re.compile(
            r'^([A-Za-z][A-Za-z0-9 &/\-]{2,60}?)\s+(\d{2,3}(?:\.\d{1,2})?)\s*(?:[A-F][+]?|O|S)?\s*$',
            re.IGNORECASE
        )
        # Standalone-mark pattern (for line-pair format)
        MARK_ONLY_PAT = re.compile(
            r'^(\d{2,3}(?:\.\d{1,2})?)\s*(?:[A-F][+]?|O|S)?\s*$',
            re.IGNORECASE
        )

        i = 0
        while i < len(lines):
            line = lines[i]
            if not line or i in processed:
                i += 1
                continue

            # Strategy B: check if NEXT non-empty line is a standalone mark
            j = i + 1
            while j < len(lines) and not lines[j]:
                j += 1
            if j < len(lines):
                m_only = MARK_ONLY_PAT.match(lines[j])
                if m_only:
                    mark_val = float(m_only.group(1))
                    subj = line.strip()
                    if (len(subj) >= 3
                            and subj.upper() not in GRADE_TOKENS
                            and not re.match(r'^\d+$', subj)
                            and 0 < mark_val <= 100):
                        raw_pairs.append((subj, mark_val))
                        processed.add(i)
                        processed.add(j)
                        i = j + 1
                        continue

            # Strategy A: inline match
            m_inline = INLINE_PAT.match(line)
            if m_inline:
                subj = m_inline.group(1).strip()
                try:
                    mark_val = float(m_inline.group(2))
                except ValueError:
                    i += 1
                    continue
                if (len(subj) >= 3
                        and subj.upper() not in GRADE_TOKENS
                        and not re.match(r'^\d+$', subj)
                        and 0 < mark_val <= 100):
                    raw_pairs.append((subj, mark_val))
                    processed.add(i)
            i += 1

        # Strategy C: subject-code fallback
        if not raw_pairs:
            for subj_code, mark_str in re.findall(r'\b([A-Z]{2,5}\s?\d{3,4}[A-Z]?)\s+(\d{2,3}(?:\.\d{1,2})?)', text, re.IGNORECASE):
                try:
                    mark_val = float(mark_str)
                    if 0 < mark_val <= 100:
                        raw_pairs.append((subj_code.strip().upper(), mark_val))
                except ValueError:
                    pass

        # \u2500 Upsert into DB \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500
        extracted = []
        seen = set()

        for subj_raw, mark_val in raw_pairs:
            subj_key = subj_raw.strip().title()
            if subj_key.lower() in seen:
                continue
            seen.add(subj_key.lower())

            record = StudentMark.query.filter(
                StudentMark.student_id.ilike(student_id),
                StudentMark.subject_code.ilike(f'%{subj_key[:8]}%')
            ).first()
            if not record:
                record = StudentMark(
                    student_id=student_id,
                    subject_code=subj_key,
                    semester=semester,
                )
                db.session.add(record)
            record.university_mark = mark_val
            if semester:
                record.semester = semester
            extracted.append({'subject_code': subj_key, 'university_mark': mark_val})

        db.session.commit()
        return jsonify({
            'success': True,
            'file_path': f'marksheets/{fname}',
            'extracted': extracted,
            'total_extracted': len(extracted),
            'raw_text_preview': text[:800] if text else 'Could not extract text',
        })
    except Exception as ex:
        db.session.rollback()
        return jsonify({'success': False, 'message': str(ex)}), 500

'''

new_content = content[:idx_start] + NEW_CODE + content[idx_end:]

with open('app.py', 'w', encoding='utf-8') as f:
    f.write(new_content)

print(f'SUCCESS: replaced {idx_end - idx_start} chars with {len(NEW_CODE)} chars')
print(f'New file: {len(new_content)} chars')
