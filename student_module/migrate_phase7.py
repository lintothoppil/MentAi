import os
import sys

# Ensure we can import from the current directory
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

def migrate_phase7():
    from app import app, db
    from models import InterventionOutcome
    
    with app.app_context():
        print("Checking for Phase 7 tables...")
        db.create_all()
        print("InterventionOutcome table verified/created.")

if __name__ == "__main__":
    migrate_phase7()
