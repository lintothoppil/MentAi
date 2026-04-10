from app import app, db, Timetable, Student

with app.app_context():
    print("Timetables:")
    for t in Timetable.query.all():
        print(f"[{t.department}] [{t.batch}] {t.subject} handler={t.handler_name}")
    print("\nStudents:")
    for s in Student.query.all()[:5]:
        print(f"Adm: {s.admission_number}, Dept: {s.branch}, Batch: {s.batch}")
