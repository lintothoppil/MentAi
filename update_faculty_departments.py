#!/usr/bin/env python3
"""
Script to update faculty department names from MCA/IMCA to Department of Computer Applications
"""

import os
import sys
sys.path.append(os.path.join(os.path.dirname(__file__), 'student_module'))

from models import db, Faculty
from app import app


def update_faculty_departments():
    """Update MCA/IMCA faculty to Department of Computer Applications"""
    with app.app_context():
        # Get all faculty members with MCA or IMCA departments
        mca_faculty = Faculty.query.filter(
            (Faculty.department == 'MCA') | 
            (Faculty.department == 'IMCA')
        ).all()
        
        print(f"Found {len(mca_faculty)} MCA/IMCA faculty members to update")
        
        if mca_faculty:
            for faculty in mca_faculty:
                print(f"Updating {faculty.name} from {faculty.department} to Department of Computer Applications")
                faculty.department = 'Department of Computer Applications'
            
            db.session.commit()
            print("Faculty department updates committed successfully!")
        else:
            print("No MCA/IMCA faculty members found to update")
        
        # Also check for any faculty with "Computer Applications" as partial match
        comp_app_faculty = Faculty.query.filter(
            Faculty.department.like('%Computer Applications%')
        ).all()
        
        print(f"\nFound {len(comp_app_faculty)} faculty members with 'Computer Applications' in department name:")
        for faculty in comp_app_faculty:
            print(f"- {faculty.name}: {faculty.department}")


if __name__ == "__main__":
    update_faculty_departments()