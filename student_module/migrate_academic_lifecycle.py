# migrate_academic_lifecycle.py
from app import app, db
from models import Course, Batch, AlumniStudent, AlumniMentorHistory
import sqlite3

def run_migration():
    with app.app_context():
        # Create all new tables
        try:
            db.create_all()
            print("Created all new tables")
        except Exception as e:
            print(f"Error creating tables: {e}")
        
        # Add duration_years column to courses table if it doesn't exist
        try:
            # Check if column exists first
            from sqlalchemy import inspect
            inspector = inspect(db.engine)
            columns = [c['name'] for c in inspector.get_columns('courses')]
            
            if 'duration_years' not in columns:
                print("Adding duration_years column to courses table...")
                with db.engine.connect() as conn:
                    if 'sqlite' in str(db.engine.url):
                        # For SQLite, we need to handle the foreign key constraints properly
                        # Temporarily disable foreign key checks
                        conn.execute(db.text("PRAGMA foreign_keys = OFF;"))
                        
                        # Rename the old table
                        conn.execute(db.text("ALTER TABLE courses RENAME TO courses_old_temp;"))
                        
                        # Create new table with duration_years column
                        conn.execute(db.text("""
                            CREATE TABLE courses (
                                id INTEGER PRIMARY KEY AUTOINCREMENT,
                                name VARCHAR(120) UNIQUE NOT NULL,
                                duration_years INTEGER DEFAULT 4
                            );
                        """))
                        
                        # Copy data from old table to new table
                        conn.execute(db.text("""
                            INSERT INTO courses (id, name, duration_years)
                            SELECT id, name, COALESCE(duration_years, 4) FROM courses_old_temp;
                        """))
                        
                        # Drop the old table
                        conn.execute(db.text("DROP TABLE courses_old_temp;"))
                        
                        # Re-enable foreign key checks
                        conn.execute(db.text("PRAGMA foreign_keys = ON;"))
                    else:
                        # For PostgreSQL/MySQL
                        conn.execute(db.text("ALTER TABLE courses ADD COLUMN duration_years INTEGER DEFAULT 4;"))
                
                print("Added duration_years column to courses table")
            else:
                print("duration_years column already exists")
        
        except Exception as e:
            print(f"Error adding duration_years: {e}")
            # Try alternative approach for SQLite
            if 'sqlite' in str(db.engine.url):
                try:
                    with db.engine.connect() as conn:
                        # Check if we can add the column directly
                        conn.execute(db.text("ALTER TABLE courses ADD COLUMN duration_years INTEGER DEFAULT 4;"))
                    print("Added duration_years column to courses table (alternative method)")
                except Exception as e2:
                    print(f"Alternative method also failed: {e2}")
        
        # Create the new tables if they don't exist
        try:
            # Create batches table
            db.session.execute(db.text("""
                CREATE TABLE IF NOT EXISTS batches (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    course_id INTEGER NOT NULL,
                    start_year INTEGER NOT NULL,
                    end_year INTEGER NOT NULL,
                    status VARCHAR(20) DEFAULT 'active',
                    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                    FOREIGN KEY (course_id) REFERENCES courses(id)
                );
            """))
            
            # Create alumni_students table
            db.session.execute(db.text("""
                CREATE TABLE IF NOT EXISTS alumni_students (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    admission_number VARCHAR(20) UNIQUE NOT NULL,
                    name VARCHAR(100) NOT NULL,
                    email VARCHAR(100),
                    department VARCHAR(50),
                    course_id INTEGER,
                    batch_id INTEGER,
                    mentor_id INTEGER,
                    passout_year INTEGER,
                    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                    FOREIGN KEY (course_id) REFERENCES courses(id),
                    FOREIGN KEY (batch_id) REFERENCES batches(id),
                    FOREIGN KEY (mentor_id) REFERENCES faculty(id)
                );
            """))
            
            # Create alumni_mentor_history table
            db.session.execute(db.text("""
                CREATE TABLE IF NOT EXISTS alumni_mentor_history (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    admission_number VARCHAR(20) NOT NULL,
                    mentor_id INTEGER,
                    start_date DATETIME,
                    end_date DATETIME,
                    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                    FOREIGN KEY (mentor_id) REFERENCES faculty(id)
                );
            """))
            
            # Add batch_id and passout_year to students table if they don't exist
            inspector = inspect(db.engine)
            student_columns = [c['name'] for c in inspector.get_columns('students')]
            
            if 'batch_id' not in student_columns:
                db.session.execute(db.text("ALTER TABLE students ADD COLUMN batch_id INTEGER;"))
                print("Added batch_id column to students table")
            
            if 'passout_year' not in student_columns:
                db.session.execute(db.text("ALTER TABLE students ADD COLUMN passout_year INTEGER;"))
                print("Added passout_year column to students table")
            
            db.session.commit()
            print("Created all required tables and columns")
        except Exception as e:
            print(f"Error creating additional tables: {e}")
            db.session.rollback()

if __name__ == "__main__":
    run_migration()