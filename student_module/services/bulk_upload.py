import csv
from io import StringIO
from models import db, Faculty

def normalize_dept(dept: str) -> str:
    if not dept:
        return ""
    return dept.strip().lower().replace("-", " ").replace("_", " ")

def generate_username(name: str) -> str:
    # Just a helper to generate unique username if needed, or assume it's provided
    # If not provided, typically first name + last name initial
    pass

def is_mentor_eligible_calc(department: str, designation: str, status: str) -> bool:
    if status.lower() != 'live':
        return False
    
    dept_norm = normalize_dept(department)
    if dept_norm in ["bsh", "basic science and humanities"]:
        return False
        
    desig_norm = designation.lower().strip() if designation else ""
    if desig_norm in ["hod", "lab assistant"]:
        return False
        
    return True

def bulk_upload_faculty(csv_rows: list) -> dict:
    total_processed = 0
    successfully_added = 0
    failed_rows = []
    bsh_flagged = 0
    hod_conflicts = 0
    
    for idx, row in enumerate(csv_rows):
        total_processed += 1
        username = row.get("username", "").strip()
        name = row.get("name", "").strip()
        designation = row.get("designation", "").strip()
        department = row.get("department", "").strip()
        
        # In reality, CSV might just have 'is_hod' column
        is_hod_str = str(row.get("is_hod", "")).strip().lower()
        is_hod_upload = is_hod_str in ["yes", "true", "1"]
        
        # Override designation if HOD is requested in the upload
        if is_hod_upload:
            designation = "HOD"
            
        if not username or not name or not department:
            failed_rows.append({"row": idx+1, "name": name, "reason": "Missing required fields"})
            continue
            
        # Check if already exists
        if Faculty.query.filter_by(username=username).first():
            failed_rows.append({"row": idx+1, "name": name, "reason": "Username already exists"})
            continue
            
        # Rule B - HOD conflict
        if is_hod_upload or designation.upper() == "HOD":
            # Check DB
            existing_hod = Faculty.query.filter(
                Faculty.department.ilike(f"%{department}%"),
                Faculty.designation.ilike("HOD"),
                Faculty.status == 'Live'
            ).first()
            
            if existing_hod:
                hod_conflicts += 1
                failed_rows.append({
                    "row": idx+1, 
                    "name": name, 
                    "reason": f"HOD already assigned for this department: {existing_hod.name}. Resolve conflict manually in HOD Management."
                })
                continue
                
        # Rule A and C - Mentor eligibility
        mentor_eligible = is_mentor_eligible_calc(department, designation, "Live")
        
        if normalize_dept(department) in ["bsh", "basic science and humanities"]:
            bsh_flagged += 1
            
        from werkzeug.security import generate_password_hash
        
        try:
            faculty = Faculty(
                username=username,
                password_hash=generate_password_hash(username), # Default password
                name=name,
                designation=designation,
                department=department,
                status="Live",
                is_mentor_eligible=mentor_eligible
            )
            db.session.add(faculty)
            successfully_added += 1
        except Exception as e:
            failed_rows.append({"row": idx+1, "name": name, "reason": str(e)})
            
    try:
        db.session.commit()
    except Exception as e:
        db.session.rollback()
        return {"error": str(e)}
        
    return {
        "total_processed": total_processed,
        "successfully_added": successfully_added,
        "failed_rows": failed_rows,
        "bsh_flagged": bsh_flagged,
        "hod_conflicts": hod_conflicts
    }
