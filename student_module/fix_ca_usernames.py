"""
fix_ca_usernames.py
Renames all Computer Applications faculty usernames to a unified ca_pro# scheme.
HOD (ca_hod) is left unchanged.
"""
import sys
sys.path.insert(0, 'd:/mentAi/student_module')

from app import app
from models import db, Faculty

# Ordered mapping: old_username -> new_username
RENAME_MAP = [
    ("ca_pro",    "ca_pro1"),
    ("ca_apro",   "ca_pro2"),
    ("mca_fac_4", "ca_pro3"),
    ("mca_fac_5", "ca_pro4"),
    ("mca_fac_6", "ca_pro5"),
    ("mca_fac_7", "ca_pro6"),
    ("mca_fac_8", "ca_pro7"),
]

def run():
    with app.app_context():
        print("=== CA Faculty Username Normalisation ===\n")

        # Pre-flight: make sure none of the new usernames already exist
        # (to avoid unique-constraint conflicts)
        for old, new in RENAME_MAP:
            existing = Faculty.query.filter_by(username=new).first()
            if existing:
                print(f"  [WARN] Target username '{new}' already exists (id={existing.id}). Skipping.")
                continue

        renamed = []
        skipped = []

        for old, new in RENAME_MAP:
            faculty = Faculty.query.filter_by(username=old).first()
            if not faculty:
                print(f"  [SKIP] '{old}' not found in DB.")
                skipped.append(old)
                continue

            # Check if target already taken
            clash = Faculty.query.filter_by(username=new).first()
            if clash:
                print(f"  [SKIP] '{new}' already exists (id={clash.id}), cannot rename '{old}'.")
                skipped.append(old)
                continue

            old_username = faculty.username
            faculty.username = new
            renamed.append((old_username, new, faculty.name))
            print(f"  {old_username:15s} -> {new:10s}  ({faculty.name})")

        try:
            db.session.commit()
            print(f"\n✅ Renamed {len(renamed)} faculty usernames successfully.")
        except Exception as e:
            db.session.rollback()
            print(f"\n❌ Commit failed: {e}")
            return

        if skipped:
            print(f"⚠️  Skipped: {skipped}")

        print("\n=== Final CA Faculty State ===")
        ca_faculty = Faculty.query.filter(
            Faculty.department.ilike('%computer application%')
        ).order_by(Faculty.id).all()
        for f in ca_faculty:
            print(f"  ID:{f.id:3d} | {f.username:12s} | {f.name} | HOD:{f.is_hod}")

if __name__ == '__main__':
    run()
