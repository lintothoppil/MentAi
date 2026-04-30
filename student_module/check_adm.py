from app import app, Student
with app.app_context():
    print([s.admission_number for s in Student.query.limit(5).all()])
