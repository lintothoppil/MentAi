import random
from datetime import datetime, timedelta
from app import app, db
from models import Student, Subject, InternalMark, DailyAttendance, Faculty

def seed_data():
    with app.app_context():
        students = Student.query.all()
        if not students:
            print("No students found. Please upload students first.")
            return

        subjects = Subject.query.all()
        if not subjects:
            print("No subjects found. Please upload a timetable first.")
            return

        faculty = Faculty.query.first()
        if not faculty:
            print("No faculty found.")
            return

        print("Seeding Phase 2 Data for", len(students), "students...")
        
        start_date = datetime.now() - timedelta(days=35)
        
        count = 0
        for student in students:
            # 1. Provide 30+ days of DailyAttendance
            # Alternate randomly between present and absent, to create slopes
            for i in range(35):
                curr_date = start_date + timedelta(days=i)
                # Let's say improving student or declining student randomly
                if count % 3 == 0:
                    prob_present = 0.9 if i > 15 else 0.6  # Improving
                elif count % 3 == 1:
                    prob_present = 0.5 if i > 15 else 0.9  # Declining
                else:
                    prob_present = 0.8  # Stable
                
                is_present = 1 if random.random() < prob_present else 0
                
                # Check exist
                record = DailyAttendance.query.filter_by(
                    student_admission_number=student.admission_number, 
                    date=curr_date.date()
                ).first()
                
                if not record:
                    att = DailyAttendance(
                        student_admission_number=student.admission_number,
                        date=curr_date.date(),
                        hour_1=is_present, hour_2=is_present, hour_3=is_present,
                        hour_4=is_present, hour_5=is_present, hour_6=is_present, hour_7=is_present
                    )
                    db.session.add(att)
            
            # 2. Assign 2 Internal Marks for 4 subjects
            student_subject_list = random.sample(subjects, min(len(subjects), 4))
            for subj in student_subject_list:
                # Same logic: improving, declining, or stable
                if count % 3 == 0:
                    mark1 = random.uniform(40, 60)
                    mark2 = mark1 + random.uniform(5, 20)  # Improving
                elif count % 3 == 1:
                    mark1 = random.uniform(70, 90)
                    mark2 = mark1 - random.uniform(15, 30) # Declining
                else:
                    mark1 = random.uniform(60, 80)
                    mark2 = mark1 + random.uniform(-5, 5)  # Stable
                    
                InternalMark.query.filter_by(student_id=student.admission_number, subject_id=subj.id).delete()
                
                db.session.add(InternalMark(
                    student_id=student.admission_number, subject_id=subj.id,
                    exam_type="Internal1", marks=round(mark1, 2), uploaded_by=faculty.id
                ))
                db.session.add(InternalMark(
                    student_id=student.admission_number, subject_id=subj.id,
                    exam_type="Internal2", marks=round(mark2, 2), uploaded_by=faculty.id
                ))
            
            count += 1
            if count % 10 == 0:
                print(f"Seeded {count} students...")
                
        db.session.commit()
        print("Data Seeding Complete!")

if __name__ == "__main__":
    seed_data()
