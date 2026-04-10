#!/usr/bin/env python3
"""
Test script to verify the alumni functionality works properly
"""
import os
from models import db, Student, Faculty, Course, Batch, AlumniStudent, AlumniMentorHistory
from app import app
from datetime import datetime
from flask_bcrypt import Bcrypt

def test_alumni_functionality():
    """Test the alumni functionality"""
    bcrypt = Bcrypt(app)
    
    with app.app_context():
        print("Testing alumni functionality...")
        
        # Create a test course
        course = Course(name="Computer Science", duration_years=4)
        db.session.add(course)
        db.session.commit()
        print(f"Created course: {course.name}")
        
        # Create a test batch (ending this year to trigger alumni transfer)
        current_year = datetime.now().year
        start_year = current_year - 4  # Started 4 years ago
        end_year = current_year        # Ending this year
        batch = Batch(
            course_id=course.id,
            start_year=start_year,
            end_year=end_year,
            status='active'
        )
        db.session.add(batch)
        db.session.commit()
        print(f"Created batch: {start_year}-{end_year}")
        
        # Create a test faculty/mentor
        mentor = Faculty(
            username='mentor1',
            password_hash=bcrypt.generate_password_hash('password').decode('utf-8'),
            name='Test Mentor',
            designation='Professor',
            department='Computer Science',
            status='Live'
        )
        db.session.add(mentor)
        db.session.commit()
        print(f"Created mentor: {mentor.name}")
        
        # Create a test student
        student = Student(
            admission_number='CS2020001',
            full_name='Test Student',
            email='test.student@example.com',
            branch='Computer Science',
            batch_id=batch.id,
            mentor_id=mentor.id,
            status='Live'
        )
        db.session.add(student)
        db.session.commit()
        print(f"Created student: {student.full_name}")
        
        # Verify student exists
        student_check = Student.query.get('CS2020001')
        print(f"Student exists in live students: {student_check is not None}")
        print(f"Student status: {student_check.status if student_check else 'N/A'}")
        
        # Now trigger the batch completion process
        from app import api_confirm_batch_completion
        import json
        
        # Simulate the API call to confirm batch completion
        with app.test_client() as client:
            # First, let's check the current state
            response = client.post('/api/admin/batch/confirm_completion', 
                                 json={'confirmed': True},
                                 headers={'Content-Type': 'application/json'})
            
            print(f"API Response Status: {response.status_code}")
            response_data = response.get_json()
            print(f"API Response Data: {json.dumps(response_data, indent=2, default=str)}")
            
            # Check if student was moved to alumni
            alumni_student = AlumniStudent.query.filter_by(admission_number='CS2020001').first()
            print(f"Student in alumni table: {alumni_student is not None}")
            
            if alumni_student:
                print(f"Alumni record - Name: {alumni_student.name}, Email: {alumni_student.email}, Passout Year: {alumni_student.passout_year}")
            
            # Check if original student status was updated
            updated_student = Student.query.get('CS2020001')
            if updated_student:
                print(f"Updated student status: {updated_student.status}")
                print(f"Updated student mentor_id: {updated_student.mentor_id}")
                print(f"Updated student passout_year: {updated_student.passout_year}")
        
        print("Alumni functionality test completed!")

if __name__ == "__main__":
    test_alumni_functionality()