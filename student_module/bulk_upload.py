import io
import csv

from academic_utils import calculate_academic_status
from models import db, Student

def bulk_upload_students(csv_file_like):
    """
    Reads a CSV, validates fields, calculates academic status, and inserts/updates students.
    Expected CSV headers: student_name, roll_number, program, branch, batch_start_year, email, mentor_assigned
    """
    text = csv_file_like.read().decode('utf-8')
    reader = csv.DictReader(io.StringIO(text))
    
    result = {'success': 0, 'failed': 0, 'errors': []}
    
    for idx, row in enumerate(reader, start=2):
        try:
            name = row.get('student_name', '').strip()
            roll = row.get('roll_number', '').strip()
            program = row.get('program', '').strip()
            branch = row.get('branch', '').strip()
            start_yr_str = row.get('batch_start_year', '').strip()
            email = row.get('email', '').strip()
            
            # Validation
            if not name or not roll or not start_yr_str:
                result['errors'].append(f"Row {idx}: Missing mandatory fields (name/roll/batch_start_year).")
                result['failed'] += 1
                continue
                
            if program.upper() == 'IMCA' and int(start_yr_str) < 2024:
                result['errors'].append(f"Row {idx}: IMCA batches only started from 2024.")
                result['failed'] += 1
                continue
                
            # Convert start_year into batch string format database expects 
            # (e.g. 2024 -> "2024" or if duration is known we construct "2024-2028")
            # For B.Tech it would be 2024-2028, MCA 2024-2026, MBA 2024-2026, IMCA 2024-2029
            batch_str = start_yr_str
            if program.upper() == 'B.TECH':
                batch_str = f"{start_yr_str}-{int(start_yr_str)+4}"
            elif program.upper() == 'IMCA':
                batch_str = f"{start_yr_str}-{int(start_yr_str)+5}"
            elif program.upper() in ['MCA', 'MBA']:
                batch_str = f"{start_yr_str}-{int(start_yr_str)+2}"
                
            # Perform academic status calculation to get correct student status
            acad = calculate_academic_status(batch_str, branch if branch else program)
            
            # Check if exists
            s = Student.query.filter_by(admission_number=roll).first()
            if not s:
                s = Student(admission_number=roll)
                db.session.add(s)
                
            s.full_name = name
            s.email = email
            s.branch = branch if branch else program
            s.batch = batch_str
            s.status = 'Passed Out' if acad['student_status'] == 'alumni' else 'Live'
            # (assuming 'Live' and 'Passed Out' are the enum values you use, adjust if needed)
            
            result['success'] += 1
        except Exception as e:
            result['errors'].append(f"Row {idx}: {str(e)}")
            result['failed'] += 1
            
    try:
        db.session.commit()
    except Exception as e:
        db.session.rollback()
        result['errors'].append(f"Database error during commit: {str(e)}")
        result['success'] = 0
        
    return result
