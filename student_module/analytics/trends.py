import math

def calculate_slope(values):
    n = len(values)
    if n < 2: return 0.0
    x = list(range(n))
    mean_x = sum(x) / n
    mean_y = sum(values) / n

    numerator = sum((x[i] - mean_x) * (values[i] - mean_y) for i in range(n))
    denominator = sum((x[i] - mean_x) ** 2 for i in range(n))

    return numerator / denominator if denominator != 0 else 0.0

def compute_student_analytics(student, attendance_records, internal_marks):
    # attendance_records is a list of 1s (P) and 0s (A) chronologically
    # internal_marks is a dict: subject_id -> {'Internal1': score, 'Internal2': score}
    
    # 1. Attendance Engine
    att_percent = 0.0
    att_slope = 0.0
    att_drop_flag = 0
    if attendance_records:
        att_percent = (sum(attendance_records) / len(attendance_records)) * 100
        
        # Calculate slope over the last 30 entries (or fewer if not enough data)
        recent_att = attendance_records[-30:]
        att_slope = calculate_slope(recent_att)
        
        if att_percent < 75 or att_slope < -0.05:  # Arbitrary slope threshold for drop
            att_drop_flag = 1
            
    # 2. Marks Engine
    total_avg_marks = 0.0
    marks_slope_sum = 0.0
    failure_count = 0
    marks_drop_flag = 0
    
    subject_count = len(internal_marks)
    if subject_count > 0:
        sum_avg = 0
        sum_slope = 0
        for subj_id, exams in internal_marks.items():
            if 'Internal1' in exams and 'Internal2' in exams:
                val1, val2 = exams['Internal1'], exams['Internal2']
                avg = (val1 + val2) / 2.0
                sum_avg += avg
                slope = val2 - val1 # Positive if improved
                sum_slope += slope
                
                if val1 < 40: failure_count += 1
                if val2 < 40: failure_count += 1
                
                # Drop detection
                if (val2 - val1) < -15:
                    marks_drop_flag = 1
            else:
                # Only 1 exam (or None)
                val = list(exams.values())[0] if exams else 0
                sum_avg += val
                if val < 40: failure_count += 1
                
        total_avg_marks = sum_avg / subject_count
        marks_slope = sum_slope / subject_count  # Avg diff per subject
        
    else:
        marks_slope = 0.0

    # 3. Marks Variance
    all_marks = []
    for exams in internal_marks.values():
        all_marks.extend(exams.values())
        
    marks_variance = 0.0
    if len(all_marks) > 1:
        mean_mark = sum(all_marks) / len(all_marks)
        marks_variance = sum((x - mean_mark) ** 2 for x in all_marks) / len(all_marks)

    # 4. Composite Risk Score
    attendance_weight = 0.4
    marks_weight = 0.4
    failure_weight = 0.2
    
    # Normalize failure count slightly (say, max scale is 5 failures = 100% of failure weight)
    failure_factor = min(failure_count, 5) / 5.0
    
    risk_score = (
        (attendance_weight * att_drop_flag * 100) +
        (marks_weight * marks_drop_flag * 100) +
        (failure_weight * failure_factor * 100)
    )
    
    # 4. Improvement Detection
    status = "Stable"
    if risk_score >= 60:
        status = "Declining"
    elif att_slope > 0.02 and marks_slope > 5:
        status = "Improving"
        
    return {
        "attendance_percentage": att_percent,
        "attendance_slope": att_slope,
        "avg_internal_marks": total_avg_marks,
        "marks_slope": marks_slope,
        "failure_count": failure_count,
        "marks_variance": marks_variance,
        "risk_score": risk_score,
        "status": status
    }
