#!/usr/bin/env python3
"""
Script to clear the database and reset all data for testing
"""
import os
from models import db, Student, Faculty, Timetable, LoginCredential, Parent, Guardian, Academic, OtherInfo, WorkExperience, Note, Course, Semester, Subject, SubjectAllocation, InternalMark, UniversityMark, Attendance, MentoringSession, LeaveRequest, Activity, DailyAttendance, StudentAttendance, Alert, WeeklyStudyPlan, StudyPlanSubject, StudySessionLog, MentorIntervention, InterventionOutcome, Batch, AlumniStudent, AlumniMentorHistory
from app import app

def clear_database():
    """Clear all data from the database"""
    with app.app_context():
        print("Starting database reset...")
        
        # Drop all tables
        db.drop_all()
        print("All tables dropped.")
        
        # Recreate all tables
        db.create_all()
        print("All tables recreated.")
        
        # Create admin user
        from flask_bcrypt import Bcrypt
        bcrypt = Bcrypt(app)
        
        # Check if admin user already exists
        from models import Faculty
        existing_admin = Faculty.query.filter_by(username='admin').first()
        if not existing_admin:
            pw_hash = bcrypt.generate_password_hash('admin123').decode('utf-8')
            admin = Faculty(
                username='admin',
                password_hash=pw_hash,
                name='Administrator',
                designation='Admin',
                department='All',
                status='Live'
            )
            db.session.add(admin)
            db.session.commit()
            print("Admin user created: admin/admin123")
        else:
            print("Admin user already exists")
        
        print("Database reset completed successfully!")

if __name__ == "__main__":
    clear_database()