from app import app, db
from models import RoutinePreference

with app.app_context():
    db.create_all()
    print("Database synced successfully.")
