from app import app
from models import db, Alert, StudentAttendance

with app.app_context():
    db.create_all()
    print("New tables created successfully.")
