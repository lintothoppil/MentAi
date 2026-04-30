"""
Database Migration Script for AI Performance Analysis System
Run this script to create the new tables for remedial classes, AI reports, and notifications.
"""

import sys
import os

# Add parent directory to path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app import app, db
from models import RemedialClass, AIPerformanceReport, RemedialNotification

def migrate():
    """Create new tables for AI performance analysis system."""
    with app.app_context():
        print("Starting database migration for AI Performance Analysis System...")
        print()
        
        try:
            # Create all tables (SQLAlchemy will only create tables that don't exist)
            print("Creating tables...")
            db.create_all()
            print("Tables created successfully!")
            print()
            
            # Verify tables exist
            from sqlalchemy import inspect
            inspector = inspect(db.engine)
            tables = inspector.get_table_names()
            
            required_tables = ['remedial_classes', 'ai_performance_reports', 'remedial_notifications']
            
            print("Verifying tables...")
            for table in required_tables:
                if table in tables:
                    print(f"  OK {table}")
                else:
                    print(f"  MISSING {table}")
            
            print()
            print("Migration completed successfully!")
            print()
            print("New tables created:")
            print("  - remedial_classes: Stores remedial class schedules")
            print("  - ai_performance_reports: Stores AI-generated analysis reports")
            print("  - remedial_notifications: Stores notification for remedial classes")
            print()
            
        except Exception as e:
            print(f"Migration failed: {str(e)}")
            import traceback
            traceback.print_exc()
            sys.exit(1)

if __name__ == '__main__':
    migrate()
