"""
Creates/resets student login credentials in instance/mentorai.db
Run from d:\mentAi: python student_module/create_student_credentials.py
"""
import sqlite3, os, sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

import bcrypt

DB_PATH = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'instance', 'mentorai.db')
DEFAULT_PASSWORD = 'student@123'

# Target students: one per department/batch for testing
TARGET_STUDENTS = [
    'A22CSE001',   # CSE 2022
    'A24CSE002',   # CSE 2024
    'A24MCA001',   # MCA 2024
    'A25MCA001',   # MCA 2025
    'A24IMCA002',  # IMCA 2024
    'A24MBA001',   # MBA 2024
]

def main():
    print(f"DB: {DB_PATH}")
    conn = sqlite3.connect(DB_PATH)
    c = conn.cursor()

    # Verify DB has students
    c.execute("SELECT COUNT(*) FROM students")
    print(f"Total students in DB: {c.fetchone()[0]}")

    pw_hash = bcrypt.hashpw(DEFAULT_PASSWORD.encode(), bcrypt.gensalt()).decode()

    print(f"\nSetting password '{DEFAULT_PASSWORD}' for:")
    print("-" * 60)

    created = updated = skipped = 0
    for adm in TARGET_STUDENTS:
        c.execute("SELECT full_name, branch, batch FROM students WHERE admission_number=?", (adm,))
        row = c.fetchone()
        if not row:
            print(f"  {adm}: NOT FOUND in students table")
            skipped += 1
            continue

        name, branch, batch = row
        c.execute("SELECT admission_number FROM login_credentials WHERE admission_number=?", (adm,))
        existing = c.fetchone()

        if existing:
            c.execute("UPDATE login_credentials SET password_hash=? WHERE admission_number=?", (pw_hash, adm))
            updated += 1
            status = "UPDATED"
        else:
            c.execute("INSERT INTO login_credentials (admission_number, password_hash) VALUES (?,?)", (adm, pw_hash))
            created += 1
            status = "CREATED"

        print(f"  [{status}] {adm} | {name} | {batch}")

    conn.commit()
    conn.close()

    print("-" * 60)
    print(f"Created: {created}  Updated: {updated}  Skipped: {skipped}")
    print(f"\nLogin credentials summary:")
    print(f"{'Admission No':<15} {'Name':<25} {'Batch':<20} {'Password'}")
    print("-" * 75)

    conn = sqlite3.connect(DB_PATH)
    c = conn.cursor()
    c.execute("""
        SELECT s.admission_number, s.full_name, s.batch
        FROM students s JOIN login_credentials lc ON s.admission_number = lc.admission_number
        ORDER BY s.admission_number
    """)
    for row in c.fetchall():
        print(f"  {row[0]:<15} {row[1]:<25} {(row[2] or 'N/A'):<20} student@123")
    conn.close()

if __name__ == '__main__':
    main()
