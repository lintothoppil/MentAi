import random
import string
from flask_mail import Message
from flask import current_app

def generate_otp(length=6):
    """Generates a random numeric OTP of given length."""
    return ''.join(random.choices(string.digits, k=length))

def send_otp_email(mail, recipient_email, otp):
    """Sends OTP to the specified email address using Flask-Mail."""
    try:
        msg = Message(
            subject="Your MentAi OTP Code",
            sender=current_app.config.get('MAIL_USERNAME'),
            recipients=[recipient_email]
        )
        msg.body = f"Hello,\n\nYour OTP for resetting the password is: {otp}\n\nThis OTP is valid for 10 minutes.\n\nRegards,\nMentAi Team"
        mail.send(msg)
        return True
    except Exception as e:
        print(f"Error sending email: {e}")
        return False

def get_department_from_admission(admission_number):
    """
    Auto-detect department from admission number prefix.
    
    Mapping:
    - MCA / IMCA → Department of Computer Applications
    - CS → B.Tech Computer Science
    - CY → B.Tech Cyber Security
    - ME → Mechanical Engineering
    - AD → B.Tech AI & Data Science
    """
    import re

    # Updated regex to handle year first format: 2024MCA001 or A24CS001
    # Supports:
    # 1. Year start: 2024MCA001 -> Group 1=2024, Group 2=MCA, Group 3=001
    # 2. Legacy A-start: A24CS001 -> (Handled by separate logic or unified)
    
    # Try Year First pattern (e.g., 2024MCA001)
    pattern_year = r'^(\d{4})([A-Z]+)(\d{3})$'
    match_year = re.match(pattern_year, admission_number.upper())
    
    if match_year:
        dept_code = match_year.group(2)
    else:
        # Try Legacy pattern (e.g., A24CS001)
        pattern_legacy = r'^A(\d{2})([A-Z]+)(\d{3})$'
        match_legacy = re.match(pattern_legacy, admission_number.upper())
        if match_legacy:
            dept_code = match_legacy.group(2)
        else:
            return 'General'

    mapping = {
        'MCA': 'Department of Computer Applications',
        'IMCA': 'Department of Computer Applications',
        'MBA': 'Department of Business Administration',
        'CS': 'Computer Science and Engineering (CSE)',
        'CSE': 'Computer Science and Engineering (CSE)',
        'CY': 'Computer Science and Engineering (CSE)',
        'AD': 'Computer Science and Engineering (CSE)',
        'EC': 'Electronics and Communication Engineering (ECE)',
        'ECE': 'Electronics and Communication Engineering (ECE)',
        'ME': 'Mechanical Engineering (ME)',
        'MECH': 'Mechanical Engineering (ME)',
        'CE': 'Civil Engineering (CE)',
        'CIVIL': 'Civil Engineering (CE)',
        'EE': 'Electrical and Electronics Engineering (EEE)',
        'EEE': 'Electrical and Electronics Engineering (EEE)',
        'ECM': 'Electronics and Computer Engineering (ECM)'
    }
    
    return mapping.get(dept_code, 'General')

def get_course_duration(department):
    """Get the standard duration for a department/course"""
    dept_upper = department.upper()
    
    # MCA and MBA are 2-year programs
    if 'MCA' in dept_upper or 'MBA' in dept_upper or 'BUSINESS' in dept_upper:
        return 2
    
    # IMCA is 5-year program
    if 'IMCA' in dept_upper:
        return 5
    
    # All engineering programs are 4 years
    if any(dept in dept_upper for dept in ['COMPUTER SCIENCE', 'MECHANICAL', 'CIVIL', 'ELECTRICAL', 'ELECTRONICS']):
        return 4
    
    # Default to 4 years
    return 4

def normalize_dept_name(dept_input):
    """Normalize department name from various inputs."""
    if not dept_input: return None
    dept_input = str(dept_input).strip().upper()
    
    mapping = {
        'CA': 'Department of Computer Applications',
        'MCA': 'Department of Computer Applications',
        'IMCA': 'Department of Computer Applications',
        'COMPUTER APPLICATIONS': 'Department of Computer Applications',
        
        'CSE': 'Computer Science and Engineering (CSE)',
        'CS': 'Computer Science and Engineering (CSE)',
        'COMPUTER SCIENCE': 'Computer Science and Engineering (CSE)',
        'COMPUTER SCIENCE & ENGINEERING': 'Computer Science and Engineering (CSE)',
        
        'ME': 'Mechanical Engineering (ME)',
        'MECHANICAL': 'Mechanical Engineering (ME)',
        'MECHANICAL ENGINEERING': 'Mechanical Engineering (ME)',
        
        'CE': 'Civil Engineering (CE)',
        'CIVIL': 'Civil Engineering (CE)',
        'CIVIL ENGINEERING': 'Civil Engineering (CE)',
        
        'EE': 'Electrical and Electronics Engineering (EEE)',
        'EEE': 'Electrical and Electronics Engineering (EEE)',
        'ELECTRICAL': 'Electrical and Electronics Engineering (EEE)',
        'ELECTRICAL ENGINEERING': 'Electrical and Electronics Engineering (EEE)',
        'ELECTRICAL & ELECTRONICS ENGINEERING': 'Electrical and Electronics Engineering (EEE)',
        
        'EC': 'Electronics and Communication Engineering (ECE)',
        'ECE': 'Electronics and Communication Engineering (ECE)',
        'ELECTRONICS': 'Electronics and Communication Engineering (ECE)',
        'ELECTRONICS & COMMUNICATION': 'Electronics and Communication Engineering (ECE)',
        'ELECTRONICS AND COMMUNICATION': 'Electronics and Communication Engineering (ECE)',
        'ELECTRONICS & COMMUNICATION ENGINEERING': 'Electronics and Communication Engineering (ECE)',
        
        'MBA': 'Department of Business Administration',
        'BBA': 'Department of Business Administration',
        'BUSINESS ADMINISTRATION': 'Department of Business Administration',
        'DEPARTMENT OF BUSINESS ADMINISTRATION': 'Department of Business Administration',
        'MANAGEMENT STUDIES': 'Department of Business Administration',
        
        'BSH': 'Basic Sciences & Humanities',
        'BASIC SCIENCES & HUMANITIES': 'Basic Sciences & Humanities',
        
        'ECM': 'Electronics and Computer Engineering (ECM)'
    }
    
    # Direct match or mapped
    if dept_input in mapping: return mapping[dept_input]
    
    # Check values (already full name)
    for k, v in mapping.items():
        if v.upper() == dept_input: return v
        
    return dept_input # Return as is if no map found (or handle as error)
