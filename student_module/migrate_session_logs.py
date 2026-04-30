"""
Migration: Recreate study_session_logs with nullable plan_subject_id
and the new student_id + subject_name columns.
"""
from app import app, db
from sqlalchemy import text

with app.app_context():
    with db.engine.connect() as conn:
        # 1. Check existing columns
        result = conn.execute(text("PRAGMA table_info(study_session_logs)"))
        existing_cols = [r[1] for r in result.fetchall()]
        print("Existing columns:", existing_cols)

        # 2. Create replacement table (plan_subject_id nullable)
        conn.execute(text("""
            CREATE TABLE IF NOT EXISTS study_session_logs_new (
                id INTEGER PRIMARY KEY,
                plan_subject_id INTEGER REFERENCES study_plan_subjects(id),
                student_id VARCHAR(20),
                subject_name VARCHAR(100),
                date DATE NOT NULL,
                hours_completed FLOAT DEFAULT 0,
                status VARCHAR(20) DEFAULT 'completed'
            )
        """))
        print("New table created.")

        # 3. Copy only columns that exist in the old table
        safe_cols = [c for c in existing_cols if c in
                     ["id", "plan_subject_id", "date", "hours_completed",
                      "student_id", "subject_name", "status"]]
        col_list = ", ".join(safe_cols)
        conn.execute(text(f"""
            INSERT INTO study_session_logs_new ({col_list})
            SELECT {col_list} FROM study_session_logs
        """))
        print(f"Copied {len(safe_cols)} columns: {safe_cols}")

        # 4. Swap tables
        conn.execute(text("DROP TABLE study_session_logs"))
        conn.execute(text("ALTER TABLE study_session_logs_new RENAME TO study_session_logs"))
        conn.commit()
        print("Migration complete!")

        # 5. Confirm final schema
        result = conn.execute(text("PRAGMA table_info(study_session_logs)"))
        print("\nFinal schema:")
        for r in result.fetchall():
            print(f"  col={r[1]}, type={r[2]}, notnull={r[3]}")
