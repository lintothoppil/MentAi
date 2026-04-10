#!/usr/bin/env python3
"""
Test script to verify the alumni API endpoints work properly
"""
import os
from models import db, Student, Faculty, Course, Batch, AlumniStudent, AlumniMentorHistory
from app import app
from datetime import datetime
from flask_bcrypt import Bcrypt
import json

def test_alumni_api():
    """Test the alumni API endpoints"""
    bcrypt = Bcrypt(app)
    
    with app.app_context():
        print("Testing alumni API endpoints...")
        
        # Clear any existing test data first
        from sqlalchemy import text
        if 'sqlite' in str(db.engine.url):
            db.session.execute(text("PRAGMA foreign_keys = OFF"))
        
        # Delete in proper order to respect foreign key constraints
        AlumniMentorHistory.query.delete()
        AlumniStudent.query.delete()
        Student.query.filter(Student.admission_number.like('TEST%')).delete()
        Faculty.query.filter(Faculty.username.like('test%')).delete()
        Student.query.filter(Student.admission_number.like('TEST%')).update({Student.batch_id: None})
        Batch.query.delete()
        Course.query.delete()
        db.session.commit()
        
        if 'sqlite' in str(db.engine.url):
            db.session.execute(text("PRAGMA foreign_keys = ON"))
        
        print("Cleared existing test data")
        
        # Create test data
        # Create a course
        course = Course(name="Computer Science", duration_years=4)
        db.session.add(course)
        db.session.commit()
        print(f"Created course: {course.name}")
        
        # Create a batch
        batch = Batch(
            course_id=course.id,
            start_year=2020,
            end_year=2024,
            status='completed'  # Completed batch for alumni
        )
        db.session.add(batch)
        db.session.commit()
        print(f"Created batch: 2020-2024")
        
        # Create a faculty/mentor
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
        
        # Create some alumni students
        for i in range(5):
            alumni = AlumniStudent(
                admission_number=f'TEST202000{i+1}',
                name=f'Test Alumni {i+1}',
                email=f'test.alumni.{i+1}@example.com',
                department='Computer Science',
                course_id=course.id,
                batch_id=batch.id,
                mentor_id=mentor.id,
                passout_year=2024
            )
            db.session.add(alumni)
        
        # Create another department's alumni
        course2 = Course(name="Electrical Engineering", duration_years=4)
        db.session.add(course2)
        db.session.commit()
        
        batch2 = Batch(
            course_id=course2.id,
            start_year=2021,
            end_year=2025,
            status='completed'
        )
        db.session.add(batch2)
        db.session.commit()
        
        for i in range(3):
            alumni2 = AlumniStudent(
                admission_number=f'ELEC202100{i+1}',
                name=f'EE Alumni {i+1}',
                email=f'ee.alumni.{i+1}@example.com',
                department='Electrical Engineering',
                course_id=course2.id,
                batch_id=batch2.id,
                mentor_id=mentor.id,
                passout_year=2025
            )
            db.session.add(alumni2)
        
        db.session.commit()
        print(f"Created test alumni records")
        
        # Test API endpoints using test client
        with app.test_client() as client:
            print("\n--- Testing /api/admin/alumni/departments ---")
            response = client.get('/api/admin/alumni/departments')
            print(f"Status: {response.status_code}")
            dept_data = response.get_json()
            print(f"Response: {json.dumps(dept_data, indent=2, default=str)}")
            
            print("\n--- Testing /api/admin/alumni/batches ---")
            response = client.get('/api/admin/alumni/batches')
            print(f"Status: {response.status_code}")
            batch_data = response.get_json()
            print(f"Response: {json.dumps(batch_data, indent=2, default=str)}")
            
            print("\n--- Testing /api/admin/alumni/search ---")
            response = client.get('/api/admin/alumni/search?search=test&page=1&per_page=10')
            print(f"Status: {response.status_code}")
            search_data = response.get_json()
            print(f"Response: {json.dumps(search_data, indent=2, default=str)}")
            
            print("\n--- Testing /api/admin/alumni/department/<dept>/batches ---")
            response = client.get('/api/admin/alumni/department/Computer%20Science/batches')
            print(f"Status: {response.status_code}")
            dept_batches_data = response.get_json()
            print(f"Response: {json.dumps(dept_batches_data, indent=2, default=str)}")
            
            print("\n--- Testing /api/admin/alumni/department/<dept>/batch/<id> ---")
            response = client.get('/api/admin/alumni/department/Computer%20Science/batch/1')
            print(f"Status: {response.status_code}")
            dept_batch_alumni_data = response.get_json()
            print(f"Response: {json.dumps(dept_batch_alumni_data, indent=2, default=str)}")
        
        print("\nAlumni API test completed!")

if __name__ == "__main__":
    test_alumni_api()