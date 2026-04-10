"""Check batch data for A23MCA students"""
import sys
sys.path.insert(0, 'd:\\mentAi\\student_module')

from app import app
from models import Student

with app.app_context():
    students = Student.query.filter(Student.admission_number.like('A23MCA%')).all()
    
    print("A23MCA Students (2023 batch):")
    print("-" * 60)
    for s in students:
        batch_val = s.batch if s.batch else "NULL"
        batch_id_val = s.batch_id if s.batch_id else "NULL"
        print(f"{s.admission_number}: Batch='{batch_val}', BatchID={batch_id_val}")
