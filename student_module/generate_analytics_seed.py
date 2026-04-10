import random
from datetime import datetime, timedelta
from app import app, db
from models import Student, Faculty, Course, Semester, Subject, SubjectAllocation, InternalMark, DailyAttendance, StudentAnalytics
from collections import Counter

def seed_analytics():
    with app.app_context():
        # 0. Create Faculty and Students if they don't exist
        if Faculty.query.count() == 0:
            faculty = Faculty(username="faculty1", password_hash="hash", name="Dr. Smith", designation="Professor", department="Department of Computer Applications")
            db.session.add(faculty)
            db.session.flush()
        else:
            faculty = Faculty.query.first()

        if Student.query.count() == 0:
            for i in range(240):
                s = Student(admission_number=f"A24{i:03d}", full_name=f"Student {i}", email=f"student{i}@example.com", branch="Department of Computer Applications", batch="2024-2026", status="Live", mentor_id=faculty.id)
                db.session.add(s)
            db.session.flush()

        students = Student.query.all()

        print(f"Generating data for {len(students)} students using Faculty: {faculty.name}")

        # Clear old relevant data safely
        InternalMark.query.delete()
        DailyAttendance.query.delete()
        StudentAnalytics.query.delete()
        SubjectAllocation.query.delete()
        Subject.query.delete()
        Semester.query.delete()
        Course.query.delete()
        db.session.commit()

        # 1. Create Course and Semester
        c_name = students[0].branch or "Department of Computer Applications"
        s_name = students[0].batch or "2024-2026"
        course = Course(name=c_name)
        semester = Semester(name=s_name)
        db.session.add(course)
        db.session.add(semester)
        db.session.commit()

        # 2. Create Subjects & Allocations
        subj_names = ["Data Mining", "Cloud Computing", "IoT", "DAA"]
        subjects = []
        for name in subj_names:
            s = Subject(name=name, course_id=course.id, semester_id=semester.id)
            db.session.add(s)
            subjects.append(s)
        db.session.commit()

        for s in subjects:
            alloc = SubjectAllocation(subject_id=s.id, faculty_id=faculty.id)
            db.session.add(alloc)
        db.session.commit()

        # 3. Generate Attendance and Marks
        start_date = datetime.now() - timedelta(days=35)
        
        count = 0
        for student in students:
            # Type of student
            behavior = count % 3 # 0: Improving, 1: Declining, 2: Stable
            
            # Attendance
            for i in range(35):
                curr_date = start_date + timedelta(days=i)
                if behavior == 0:
                    prob = 0.9 if i > 15 else 0.6  # Improving
                elif behavior == 1:
                    prob = 0.5 if i > 15 else 0.9  # Declining
                else:
                    prob = 0.8  # Stable
                
                is_present = 1 if random.random() < prob else 0
                
                att = DailyAttendance(
                    student_admission_number=student.admission_number,
                    date=curr_date.date(),
                    hour_1=is_present, hour_2=is_present, hour_3=is_present,
                    hour_4=is_present, hour_5=is_present, hour_6=is_present, hour_7=is_present
                )
                db.session.add(att)
            
            # Marks
            for subj in subjects:
                if behavior == 0: # Improving
                    mark1 = random.uniform(35, 60)
                    mark2 = mark1 + random.uniform(10, 25)
                elif behavior == 1: # Declining
                    mark1 = random.uniform(65, 90)
                    mark2 = mark1 - random.uniform(15, 30)
                else: # Stable
                    mark1 = random.uniform(55, 75)
                    mark2 = mark1 + random.uniform(-5, 5)
                    
                db.session.add(InternalMark(
                    student_id=student.admission_number, subject_id=subj.id,
                    exam_type="Internal1", marks=round(mark1, 2), uploaded_by=faculty.id
                ))
                db.session.add(InternalMark(
                    student_id=student.admission_number, subject_id=subj.id,
                    exam_type="Internal2", marks=round(mark2, 2), uploaded_by=faculty.id
                ))
                
            count += 1
        db.session.commit()
        print("Raw data seeded successfully. Now calculating analytics...")

        # 4. Calculate Analytics
        from app import calculate_analytics
        for student in students:
            calculate_analytics(student.admission_number)
            
        # 5. Print Distribution
        analytics = StudentAnalytics.query.all()
        risk_scores = [a.risk_score for a in analytics]
        statuses = [a.status for a in analytics]
        
        dist = Counter(statuses)
        
        print("\n--- Phase 2 Distribution Analysis ---")
        print(f"Total Students: {len(analytics)}")
        print(f"Improving: {dist.get('Improving', 0)}")
        print(f"Stable: {dist.get('Stable', 0)}")
        print(f"Declining: {dist.get('Declining', 0)}")
        print(f"Risk Score Min: {min(risk_scores):.2f}")
        print(f"Risk Score Max: {max(risk_scores):.2f}")
        print(f"Risk Score Mean: {sum(risk_scores)/len(risk_scores):.2f}")
        print("-------------------------------------")

if __name__ == "__main__":
    seed_analytics()
