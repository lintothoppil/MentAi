from app import app, db
from sqlalchemy import text
from models import Course, Semester, Subject, SubjectAllocation, InternalMark, UniversityMark

def run_migration():
    with app.app_context():
        # First, drop the old marks table if it exists
        try:
            db.session.execute(text("DROP TABLE IF EXISTS marks"))
            print("Dropped 'marks' table.")
        except Exception as e:
            print("Could not drop 'marks' table:", e)
        
        # Create new tables
        db.create_all()
        print("Created new Schema tables (Course, Semester, Subject, SubjectAllocation, InternalMark, UniversityMark)")
        
        db.session.commit()

if __name__ == "__main__":
    run_migration()
