"""
Quick diagnostic: shows which database file Flask actually opens at runtime.
Run with: python student_module/show_db_path.py
"""
import sys, os
sys.path.insert(0, 'student_module')
os.chdir('student_module')

from app import app, db

with app.app_context():
    url = str(db.engine.url)
    print("DB URL:", url)
    # For sqlite, extract the file path
    if 'sqlite' in url:
        # URL format: sqlite:////absolute/path or sqlite:///relative/path
        path = url.replace('sqlite:///', '')
        if not os.path.isabs(path):
            path = os.path.join(os.getcwd(), path)
        print("Resolved DB path:", path)
        print("File exists:", os.path.exists(path))
        if os.path.exists(path):
            print("File size:", os.path.getsize(path), "bytes")
        
        # Check batch_id
        import sqlite3
        conn = sqlite3.connect(path)
        c = conn.cursor()
        c.execute("PRAGMA table_info(students)")
        cols = [r[1] for r in c.fetchall()]
        print("batch_id in students:", 'batch_id' in cols)
        c.execute("SELECT COUNT(*) FROM students")
        print("Student count:", c.fetchone()[0])
        conn.close()
