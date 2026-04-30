import datetime
import re

def calculate_academic_status(batch_str, branch_str, current_date=None):
    """
    Dynamically calculates the current semester, program, and student status
    based on batch start year, branch/program, and current date.
    
    Returns:
    {
        'program': str,
        'current_semester': int,
        'student_status': 'live' | 'alumni',
        'start_year': int,
        'expected_graduation_year': int,
        'is_imca': bool
    }
    """
    batch_str = str(batch_str or '').strip()
    branch_str = str(branch_str or '').strip().lower()
    
    # Defaults
    program = 'Unknown'
    start_year = None
    end_year = None
    duration = 4
    
    # Extract start and end year using regex (e.g. "MCA 2024-2026", "2020-2024", "2024 - 2026")
    match = re.search(r'(\d{4})\s*-\s*(\d{4})', batch_str)
    if match:
        start_year = int(match.group(1))
        end_year = int(match.group(2))
        duration = end_year - start_year
    elif re.search(r'(\d{4})', batch_str):
        # Fallback to extracting just the start year if possible
        start_year = int(re.search(r'(\d{4})', batch_str).group(1))
        # If we have only start year, we'll let duration-based logic determine end_year later.
    
    if start_year is None:
        # Fallback if unparseable
        return {
            'program': 'Unknown',
            'current_semester': 1,
            'student_status': 'live',
            'start_year': None,
            'expected_graduation_year': None,
            'is_imca': False
        }
        
    # Determine program based on duration and branch/batch string hints
    is_imca = False
    if duration == 5:
        program = 'IMCA'
        is_imca = True
    elif duration == 2:
        if 'business' in branch_str or 'mba' in batch_str.lower():
            program = 'MBA'
        elif 'computer application' in branch_str or 'mca' in batch_str.lower():
            program = 'MCA'
        else:
            program = 'PG (2 Year)'
    elif duration == 4:
        program = 'B.Tech'
    else:
        # fallback guesses based on string
        if 'imca' in batch_str.lower() or 'imca' in branch_str:
            program = 'IMCA'
            duration = 5
            is_imca = True
        elif 'mba' in batch_str.lower() or 'business' in branch_str:
            program = 'MBA'
            duration = 2
        elif 'mca' in batch_str.lower() or 'computer application' in branch_str:
            program = 'MCA'
            duration = 2
        else:
            program = 'B.Tech'
            duration = 4
            
    if end_year is None:
        end_year = start_year + duration

    # Enforce IMCA logic (Started 2024) - Just as a check
    # Note: IMCA students before 2024 shouldn't exist as per prompt, but if they do, we'll assign it anyway or we can flag it.
    
    # Calculate Semester
    if current_date is None:
        current_date = datetime.datetime.now()
        
    yr = current_date.year
    mo = current_date.month
    
    # Academic year starts ~August. 
    # If we are before August, we are in the even semester of the previous academic year.
    acad_years_completed = yr - start_year - (1 if mo < 8 else 0)
    is_even_sem = mo < 8
    
    calculated_sem = acad_years_completed * 2 + (2 if is_even_sem else 1)
    max_sem = duration * 2
    
    # Clamp semester between 1 and max_sem
    current_sem = max(1, min(max_sem, calculated_sem))
    
    # Calculate Academic Status (Alumni Allocation)
    # The prompt explicitly asked: If expected_graduation_year < current_year => 'alumni'
    if end_year < yr:
        student_status = 'alumni'
    else:
        student_status = 'live'
        
    return {
        'program': program,
        'current_semester': current_sem,
        'student_status': student_status,
        'start_year': start_year,
        'expected_graduation_year': end_year,
        'is_imca': is_imca
    }
