import sqlite3
c = sqlite3.connect('instance/mentorai.db')
cmds = [
    "ALTER TABLE faculty ADD COLUMN status VARCHAR(20) DEFAULT 'Live'",
    "ALTER TABLE students ADD COLUMN status VARCHAR(20) DEFAULT 'Live'",
    "ALTER TABLE students ADD COLUMN mentor_id INTEGER",
    "ALTER TABLE students ADD COLUMN mentor_remarks TEXT",
    "ALTER TABLE students ADD COLUMN caste_category VARCHAR(20)"
]
for cmd in cmds:
    try:
        c.execute(cmd)
        print("Success:", cmd)
    except Exception as e:
        print("Failed:", cmd, "->", e)
c.commit()
