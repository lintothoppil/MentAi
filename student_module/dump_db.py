from app import app, db
from models import Student, Faculty, AlumniStudent, Course
from pprint import pprint

with app.app_context():
    with open('dump.txt', 'w', encoding='utf-8') as f:
        f.write('Students:\n')
        f.write(repr(set(s.branch for s in Student.query.all())) + '\n\n')
        f.write('Faculty:\n')
        f.write(repr(set(f.department for f in Faculty.query.all())) + '\n\n')
        f.write('Alumni:\n')
        f.write(repr(set(a.department for a in AlumniStudent.query.all())) + '\n\n')
        f.write('Courses:\n')
        f.write(repr(set(c.name for c in Course.query.all())) + '\n')
