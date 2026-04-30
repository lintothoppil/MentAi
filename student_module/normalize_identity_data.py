from __future__ import annotations

import re
import sqlite3
from pathlib import Path

from app import app


DEPARTMENT_CODES = {
    "Computer Science and Engineering (CSE)": "CSE",
    "Electrical and Electronics Engineering (EEE)": "EEE",
    "Mechanical Engineering (ME)": "ME",
    "Civil Engineering (CE)": "CE",
    "Electronics and Communication Engineering (ECE)": "ECE",
    "Department of Computer Applications": "MCA",
    "Department of Business Administration": "MBA",
}

NAME_POOLS = {
    "Computer Science and Engineering (CSE)": [
        "Sam Mathew", "Arun George", "Neha Nair", "Vishnu Raj", "Anna Joseph", "Riya Thomas",
        "Joel Paul", "Akhil Babu", "Nithya Menon", "Alan Philip", "Sreya Roy", "Anand Krishnan",
    ],
    "Electrical and Electronics Engineering (EEE)": [
        "Rahul Joseph", "Sneha Nair", "Abel Thomas", "Meera Paul", "Nikhil Raj", "Anjali Varma",
        "Jerin Mathew", "Sanjana Das", "Anoop Krishnan", "Maria George", "Sreelakshmi Nair", "Adarsh Babu",
    ],
    "Mechanical Engineering (ME)": [
        "Abin Mathew", "Megha Roy", "Sanal Joseph", "Renu Paul", "Kiran Thomas", "Anu Krishnan",
        "Jobin George", "Steffi Nair", "Harish Raj", "Nikhitha Babu", "Manu Pillai", "Keerthi Das",
    ],
    "Civil Engineering (CE)": [
        "Akhil Thomas", "Nimisha Paul", "Vimal Roy", "Asha Nair", "Jithin Joseph", "Sandra Maria",
        "Rohit Krishnan", "Anitta George", "Nivin Babu", "Merin Mathew", "Aravind Das", "Sona Raj",
    ],
    "Electronics and Communication Engineering (ECE)": [
        "Kevin Paul", "Anjana Babu", "Sreedev Raj", "Diya Thomas", "Nithin George", "Gayathri Menon",
        "Arunima Roy", "Jewel Joseph", "Nandhu Krishnan", "Aleena Mathew", "Bibin Paul", "Helen Das",
    ],
    "Department of Computer Applications": [
        "Sam Jacob", "Aparna Nair", "Arjun Thomas", "Miya George", "Rahul Menon", "Sandra Joseph",
        "Vivek Paul", "Anna Maria", "Joel Mathew", "Megha Krishnan", "Alan Roy", "Nitya Babu",
        "Sneha Jacob", "Akhil Varghese", "Meera Nair", "Vishnu Thomas",
    ],
    "Department of Business Administration": [
        "Abel George", "Riya Joseph", "Naveen Raj", "Maya Thomas", "Anand Babu", "Neha Maria",
        "Sanjay Menon", "Keerthi Paul", "David Nair", "Anu George", "Fathima Rahman", "Vivek Krishna",
    ],
}

USED_NAMES: set[str] = set()


def _generate_names(department: str, start_year: int, end_year: int, count: int) -> list[str]:
    pool = NAME_POOLS.get(department, ["Student Name"])
    first_names = list(dict.fromkeys(name.split()[0] for name in pool))
    last_names = list(dict.fromkeys(" ".join(name.split()[1:]) or name.split()[0] for name in pool))
    candidates: list[str] = []

    for first_name in first_names:
        for last_name in last_names:
            candidates.append(f"{first_name} {last_name}")

    seed_value = sum(ord(ch) for ch in f"{department}|{start_year}|{end_year}")
    candidates.sort(key=lambda value: ((sum(ord(ch) for ch in value) + seed_value) % 9973, value))

    names: list[str] = []
    for candidate in candidates:
        if candidate in USED_NAMES:
            continue
        USED_NAMES.add(candidate)
        names.append(candidate)
        if len(names) >= count:
            return names

    suffix = 1
    label = _department_code(department, start_year, end_year)
    while len(names) < count:
        fallback = f"{label} Student {start_year % 100:02d}{suffix:02d}"
        if fallback not in USED_NAMES:
            USED_NAMES.add(fallback)
            names.append(fallback)
        suffix += 1
    return names


def _department_code(department: str, start_year: int, end_year: int) -> str:
    if department == "Department of Computer Applications":
        return "IMCA" if (end_year - start_year) >= 5 else "MCA"
    return DEPARTMENT_CODES[department]


def _batch_label(department: str, start_year: int, end_year: int) -> str:
    if department == "Department of Computer Applications":
        return f"{_department_code(department, start_year, end_year)} {start_year}-{end_year}"
    return f"{start_year}-{end_year}"


def _real_email(name: str, admission_number: str) -> str:
    base = re.sub(r"[^a-z0-9]+", ".", name.lower()).strip(".")
    return f"{base}.{admission_number.lower()}@mentai.edu"


def _db_path() -> Path:
    return Path(app.instance_path) / "mentorai.db"


def _static_root() -> Path:
    return Path(app.root_path) / "static"


def _row_dicts(cursor: sqlite3.Cursor, query: str, params: tuple = ()) -> list[dict]:
    rows = cursor.execute(query, params).fetchall()
    cols = [desc[0] for desc in cursor.description]
    return [dict(zip(cols, row)) for row in rows]


def _reference_columns(cursor: sqlite3.Cursor) -> dict[str, list[str]]:
    refs: dict[str, list[str]] = {}
    tables = cursor.execute(
        "select name from sqlite_master where type='table' and name not like 'sqlite_%' order by name"
    ).fetchall()
    for (table_name,) in tables:
        cols = [row[1] for row in cursor.execute(f"pragma table_info({table_name})").fetchall()]
        matched = [c for c in cols if "admission" in c.lower() or c.lower() in ("student_id", "studentid")]
        if matched:
            refs[table_name] = matched
    return refs


def _sync_university_marks_paths(db_path: Path, static_root: Path) -> None:
    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()
    rows = cursor.execute(
        """
        select um.id, um.student_id, um.pdf_path, sem.name
        from university_marks um
        left join semesters sem on sem.id = um.semester_id
        """
    ).fetchall()

    marksheet_dir = static_root / "marksheets"
    marksheet_dir.mkdir(parents=True, exist_ok=True)

    for row_id, student_id, pdf_path, semester_name in rows:
        if not student_id or not semester_name:
            continue
        match = re.search(r"(\d+)", semester_name)
        if not match:
            continue
        semester_no = int(match.group(1))
        target_name = f"{student_id.lower()}_sem{semester_no}.pdf"
        target_rel = f"marksheets/{target_name}"
        if pdf_path == target_rel:
            continue

        old_path = static_root / str(pdf_path or "")
        new_path = marksheet_dir / target_name
        if old_path.exists() and old_path.resolve() != new_path.resolve() and not new_path.exists():
            old_path.rename(new_path)
        elif not new_path.exists():
            new_path.write_bytes(b"%PDF-1.1\n% normalized marksheet placeholder\n")

        cursor.execute(
            "update university_marks set pdf_path = ? where id = ?",
            (target_rel, row_id),
        )

    conn.commit()
    conn.close()


def normalize_all_identity_data() -> None:
    db_path = _db_path()
    conn = sqlite3.connect(db_path)
    conn.row_factory = sqlite3.Row
    cursor = conn.cursor()
    USED_NAMES.clear()

    cursor.execute("PRAGMA foreign_keys = OFF")

    student_updates: dict[str, dict] = {}
    alumni_updates: list[dict] = []

    batches = _row_dicts(
        cursor,
        """
        select
            b.id as batch_id,
            b.course_id,
            b.start_year,
            b.end_year,
            b.status,
            c.name as department
        from batches b
        join courses c on c.id = b.course_id
        order by c.name asc, b.start_year asc, b.end_year asc, b.id asc
        """,
    )

    for batch in batches:
        department = batch["department"]
        start_year = int(batch["start_year"])
        end_year = int(batch["end_year"])
        batch_id = int(batch["batch_id"])
        course_id = int(batch["course_id"])
        code = _department_code(department, start_year, end_year)
        label = _batch_label(department, start_year, end_year)

        students = _row_dicts(
            cursor,
            """
            select admission_number, full_name, email, status, passout_year
            from students
            where batch_id = ?
            order by admission_number asc
            """,
            (batch_id,),
        )
        alumni = _row_dicts(
            cursor,
            """
            select id, admission_number, name, email, passout_year, mentor_id
            from alumni_students
            where batch_id = ?
            order by admission_number asc, id asc
            """,
            (batch_id,),
        )

        alumni_by_admission = {row["admission_number"]: row for row in alumni}
        people: list[dict] = []

        for student in students:
            people.append(
                {
                    "student": student,
                    "alumni": alumni_by_admission.pop(student["admission_number"], None),
                }
            )

        for alum in sorted(alumni_by_admission.values(), key=lambda item: (item["admission_number"], item["id"])):
            people.append({"student": None, "alumni": alum})

        if not people:
            continue

        target_names = _generate_names(department, start_year, end_year, len(people))

        for index, person in enumerate(people, start=1):
            new_admission = f"A{str(start_year)[2:]}{code}{index:03d}"
            new_name = target_names[index - 1]
            new_email = _real_email(new_name, new_admission)

            if person["student"]:
                student = person["student"]
                student_updates[student["admission_number"]] = {
                    "new_admission": new_admission,
                    "full_name": new_name,
                    "email": new_email,
                    "roll_number": new_admission,
                    "branch": department,
                    "batch": label,
                    "status": student["status"],
                    "passout_year": end_year if student["status"] == "Passed Out" else None,
                }

            if person["alumni"]:
                alum = person["alumni"]
                alumni_updates.append(
                    {
                        "id": alum["id"],
                        "old_admission": alum["admission_number"],
                        "new_admission": new_admission,
                        "name": new_name,
                        "email": new_email,
                        "department": department,
                        "course_id": course_id,
                        "batch_id": batch_id,
                        "mentor_id": alum["mentor_id"],
                        "passout_year": end_year,
                    }
                )

    refs = _reference_columns(cursor)

    for old_admission, update in student_updates.items():
        new_admission = update["new_admission"]
        if old_admission == new_admission:
            continue
        for table_name, columns in refs.items():
            for column_name in columns:
                cursor.execute(
                    f"UPDATE {table_name} SET {column_name} = ? WHERE {column_name} = ?",
                    (new_admission, old_admission),
                )

    for old_admission, update in student_updates.items():
        new_admission = update["new_admission"]
        cursor.execute(
            """
            update students
            set admission_number = ?,
                roll_number = ?,
                full_name = ?,
                branch = ?,
                batch = ?,
                email = ?,
                passout_year = ?,
                status = ?
            where admission_number = ?
            """,
            (
                new_admission,
                update["roll_number"],
                update["full_name"],
                update["branch"],
                update["batch"],
                update["email"],
                update["passout_year"],
                update["status"],
                new_admission,
            ),
        )

    for alum in alumni_updates:
        cursor.execute(
            """
            update alumni_students
            set admission_number = ?,
                name = ?,
                email = ?,
                department = ?,
                course_id = ?,
                batch_id = ?,
                mentor_id = ?,
                passout_year = ?
            where id = ?
            """,
            (
                alum["new_admission"],
                alum["name"],
                alum["email"],
                alum["department"],
                alum["course_id"],
                alum["batch_id"],
                alum["mentor_id"],
                alum["passout_year"],
                alum["id"],
            ),
        )

    conn.commit()
    cursor.execute("PRAGMA foreign_keys = ON")
    conn.close()

    static_root = _static_root()
    for old_admission, update in student_updates.items():
        new_admission = update["new_admission"]
        if old_admission == new_admission:
            continue

        old_token = old_admission.lower()
        new_token = new_admission.lower()

        for relative_dir in ("marksheets", "photos"):
            folder = static_root / relative_dir
            if not folder.exists():
                continue
            for path in folder.iterdir():
                if old_token not in path.name.lower():
                    continue
                new_name = re.sub(re.escape(old_token), new_token, path.name, flags=re.IGNORECASE)
                new_path = path.with_name(new_name)
                if not new_path.exists():
                    path.rename(new_path)

    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()
    for old_admission, update in student_updates.items():
        new_admission = update["new_admission"]
        if old_admission == new_admission:
            continue
        old_token = old_admission.lower()
        new_token = new_admission.lower()
        for table_name, column_name in (
            ("students", "photo_path"),
            ("certificates", "certificate_path"),
            ("timetables", "file_path"),
            ("university_marks", "pdf_path"),
        ):
            cols = [row[1] for row in cursor.execute(f"pragma table_info({table_name})").fetchall()]
            if column_name not in cols:
                continue
            rows = cursor.execute(
                f"select rowid, {column_name} from {table_name} where {column_name} is not null and lower({column_name}) like ?",
                (f"%{old_token}%",),
            ).fetchall()
            for rowid, value in rows:
                updated_value = re.sub(re.escape(old_token), new_token, value, flags=re.IGNORECASE)
                cursor.execute(
                    f"update {table_name} set {column_name} = ? where rowid = ?",
                    (updated_value, rowid),
                )

    conn.commit()
    conn.close()

    _sync_university_marks_paths(db_path, static_root)


if __name__ == "__main__":
    with app.app_context():
        normalize_all_identity_data()
        print("Identity data normalized successfully.")
