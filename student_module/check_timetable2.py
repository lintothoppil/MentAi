from app import app, db, Timetable, Student

with app.app_context():
    with open("output_utf8.txt", "w", encoding="utf-8") as f:
        f.write("Timetables:\n")
        for t in Timetable.query.all():
            f.write(f"[{t.department}] [{t.batch}] {t.subject} handler={t.handler_name}\n")
        f.write("\nStudents:\n")
        for s in Student.query.all()[:5]:
            f.write(f"Adm: {s.admission_number}, Dept: {s.branch}, Batch: {s.batch}\n")
