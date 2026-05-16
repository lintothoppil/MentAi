"""
Adds ALL missing columns to the students table in instance/mentorai.db
so Flask can start without schema errors.
"""
import sqlite3, os

db_path = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'instance', 'mentorai.db')
print(f"Connecting to: {db_path}")

conn = sqlite3.connect(db_path)
cursor = conn.cursor()

def add_col(table, column, definition):
    cursor.execute(f"PRAGMA table_info({table})")
    cols = [r[1] for r in cursor.fetchall()]
    if column not in cols:
        print(f"  + Adding '{column}' to '{table}'")
        cursor.execute(f"ALTER TABLE {table} ADD COLUMN {column} {definition}")
        return True
    return False

try:
    # Students table - all columns from the model
    add_col('students', 'batch_id',       'INTEGER REFERENCES batches(id)')
    add_col('students', 'passout_year',   'INTEGER')
    add_col('students', 'password_hash',  'VARCHAR(255)')
    add_col('students', 'mentor_id',      'INTEGER REFERENCES faculty(id)')
    add_col('students', 'status',         "VARCHAR(20) DEFAULT 'Live'")
    add_col('students', 'dob',            'DATE')
    add_col('students', 'age',            'INTEGER')
    add_col('students', 'blood_group',    'VARCHAR(10)')
    add_col('students', 'religion',       'VARCHAR(50)')
    add_col('students', 'diocese',        'VARCHAR(100)')
    add_col('students', 'parish',         'VARCHAR(100)')
    add_col('students', 'caste_category', 'VARCHAR(20)')
    add_col('students', 'permanent_address', 'TEXT')
    add_col('students', 'contact_address',   'TEXT')
    add_col('students', 'mobile_number',  'VARCHAR(15)')
    add_col('students', 'photo_path',     'VARCHAR(255)')
    add_col('students', 'mentor_remarks', 'TEXT')
    add_col('students', 'profile_completed', 'BOOLEAN DEFAULT 0')
    add_col('students', 'created_at',     'DATETIME')

    conn.commit()
    print("\nAll columns added successfully.")

    # Verify
    cursor.execute("PRAGMA table_info(students)")
    cols = [r[1] for r in cursor.fetchall()]
    print(f"\nStudents table columns ({len(cols)}):", cols)

except Exception as e:
    conn.rollback()
    print(f"Error: {e}")
finally:
    conn.close()
