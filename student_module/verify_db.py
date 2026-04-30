from app import db, app
from sqlalchemy import inspect

with app.app_context():
    inspector = inspect(db.engine)
    tables = inspector.get_table_names()
    print("Tables in database:", tables)
    
    required = ['study_preferences', 'subject_perceptions', 'adaptive_timetables']
    missing = [t for t in required if t not in tables]
    
    if not missing:
        print("All required tables exist.")
    else:
        print("Missing tables:", missing)
        db.create_all()
        print("db.create_all() called.")
