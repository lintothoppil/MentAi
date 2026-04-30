import sqlite3

db_path = 'instance/mentorai.db'
conn = sqlite3.connect(db_path)
c = conn.cursor()

print('=== student_marks for A24MCA* students ===')
c.execute("""
    SELECT student_id, subject_code, internal1, internal2, internal3, 
           university_mark, university_grade, semester
    FROM student_marks
    WHERE student_id LIKE 'A24MCA%'
    ORDER BY student_id, semester
""")
for r in c.fetchall(): print(r)

print()
print('=== faculty/handler details for handler IDs 18 and 19 ===')
c.execute("SELECT id, name, department, designation, is_subject_handler FROM faculty WHERE id IN (18, 19)")
for r in c.fetchall(): print(r)

conn.close()
