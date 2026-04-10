#!/usr/bin/env python3
"""
Comprehensive test script to verify the batch completion and alumni transfer functionality
"""
import os
from models import db, Student, Faculty, Course, Batch, AlumniStudent, AlumniMentorHistory
from app import app
from datetime import datetime
from flask_bcrypt import Bcrypt

def test_batch_completion():
    """Test the batch completion functionality"""
    bcrypt = Bcrypt(app)
    
    with app.app_context():
        print("Testing batch completion functionality...")
        
        # Clear any existing test data first
        # Need to handle foreign key constraints properly for SQLite
        from sqlalchemy import text
        if 'sqlite' in str(db.engine.url):
            db.session.execute(text("PRAGMA foreign_keys = OFF"))
        
        # Delete in proper order to respect foreign key constraints
        AlumniMentorHistory.query.delete()
        AlumniStudent.query.delete()
        Student.query.filter(Student.admission_number.like('TEST%')).delete()
        Faculty.query.filter(Faculty.username.like('test%')).delete()
        # Need to update students to remove batch_id reference before deleting batches
        from sqlalchemy import and_
        Student.query.filter(Student.admission_number.like('TEST%')).update({Student.batch_id: None})
        Batch.query.delete()
        Course.query.delete()
        db.session.commit()
        
        if 'sqlite' in str(db.engine.url):
            db.session.execute(text("PRAGMA foreign_keys = ON"))
        
        print("Cleared existing test data")
        
        # Create a test course
        course = Course(name="Computer Science", duration_years=4)
        db.session.add(course)
        db.session.commit()
        print(f"Created course: {course.name} with duration {course.duration_years} years")
        
        # Create a test batch that should be completed (ended in the past)
        current_year = datetime.now().year
        start_year = current_year - 5  # Started 5 years ago
        end_year = current_year - 1    # Ended last year (should be completed)
        batch = Batch(
            course_id=course.id,
            start_year=start_year,
            end_year=end_year,
            status='active'  # Initially active
        )
        db.session.add(batch)
        db.session.commit()
        print(f"Created batch: {start_year}-{end_year} (should be completed)")
        
        # Create a test faculty/mentor
        mentor = Faculty(
            username='test_mentor',
            password_hash=bcrypt.generate_password_hash('password').decode('utf-8'),
            name='Test Mentor',
            designation='Professor',
            department='Computer Science',
            status='Live'
        )
        db.session.add(mentor)
        db.session.commit()
        print(f"Created mentor: {mentor.name}")
        
        # Create multiple test students
        students_created = []
        for i in range(3):
            student = Student(
                admission_number=f'TEST202000{i+1}',
                full_name=f'Test Student {i+1}',
                email=f'test.student.{i+1}@example.com',
                branch='Computer Science',
                batch_id=batch.id,
                mentor_id=mentor.id,
                status='Live'
            )
            db.session.add(student)
            students_created.append(student)
        
        db.session.commit()
        print(f"Created {len(students_created)} test students")
        
        # Verify students exist in live table
        live_students = Student.query.filter(Student.admission_number.like('TEST%')).all()
        print(f"Live students before batch completion: {len(live_students)}")
        for student in live_students:
            print(f"  - {student.full_name} (Status: {student.status})")
        
        # Check if batch is detected as completed
        from app import api_get_batches
        import json
        
        with app.test_client() as client:
            response = client.get('/api/admin/batches')
            batches_data = response.get_json()
            print(f"Batches data: {json.dumps(batches_data, indent=2, default=str)}")
            
            # Find our test batch and check if it's marked as completed
            test_batch = None
            for batch_data in batches_data.get('data', []):
                if batch_data['start_year'] == start_year and batch_data['end_year'] == end_year:
                    test_batch = batch_data
                    break
            
            if test_batch:
                print(f"Test batch status: {test_batch['status']}")
                print(f"Test batch is_completed flag: {test_batch['is_completed']}")
        
        # Now trigger the batch completion process
        from app import api_confirm_batch_completion
        
        with app.test_client() as client:
            response = client.post('/api/admin/batch/confirm_completion', 
                                 json={'confirmed': True},
                                 headers={'Content-Type': 'application/json'})
            
            print(f"\nBatch completion API Response Status: {response.status_code}")
            response_data = response.get_json()
            print(f"Batch completion API Response Data: {json.dumps(response_data, indent=2, default=str)}")
            
            # Check how many students are in alumni now
            alumni_students = AlumniStudent.query.all()
            print(f"\nTotal alumni records: {len(alumni_students)}")
            for alumni in alumni_students:
                print(f"  - {alumni.name} (Passout Year: {alumni.passout_year})")
            
            # Check how many students remain in live table
            remaining_students = Student.query.filter(Student.admission_number.like('TEST%')).all()
            print(f"\nRemaining live students: {len(remaining_students)}")
            for student in remaining_students:
                print(f"  - {student.full_name} (Status: {student.status}, Passout Year: {student.passout_year})")
        
        # Check mentor history records
        mentor_histories = AlumniMentorHistory.query.all()
        print(f"\nMentor history records: {len(mentor_histories)}")
        for history in mentor_histories:
            print(f"  - Alumni: {history.admission_number}, Mentor ID: {history.mentor_id}")
        
        print("\nBatch completion functionality test completed!")

if __name__ == "__main__":
    test_batch_completion()