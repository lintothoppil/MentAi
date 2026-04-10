from app import app, db, Student
with app.app_context():
    s = Student.query.first()
    if s:
        print(f"ADM: {s.admission_number}")
        print(f"NAME: '{s.full_name}'")
        print(f"EMAIL: '{s.email}'")
    else:
        print("No students")
