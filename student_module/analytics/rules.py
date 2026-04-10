def rule_check(attendance_records):
    # records is a list of 1s and 0s
    if not attendance_records:
        return None
    
    total = len(attendance_records)
    present = sum(attendance_records)
    
    percentage = (present / total) * 100
    
    flags = []
    if percentage < 75:
        flags.append("LOW_ATTENDANCE")
        
    # Check 3 consecutive absences
    consecutive_absent = 0
    for record in attendance_records:
        if record == 0:
            consecutive_absent += 1
            if consecutive_absent >= 3:
                flags.append("CONSECUTIVE_ABSENTEES")
                break
        else:
            consecutive_absent = 0
            
    return flags if flags else None
