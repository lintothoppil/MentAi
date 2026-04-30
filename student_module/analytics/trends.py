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
            ordered_scores = []
            for exam_name in sorted(exams.keys()):
                value = exams.get(exam_name)
                if value is None:
                    continue
                try:
                    ordered_scores.append(float(value))
                except (TypeError, ValueError):
                    continue

            if not ordered_scores:
                continue

            avg = sum(ordered_scores) / len(ordered_scores)
            sum_avg += avg

            for score in ordered_scores:
                if score < 40:
                    failure_count += 1

            if len(ordered_scores) >= 2:
                slope = ordered_scores[-1] - ordered_scores[0]
                sum_slope += slope
                if slope < -15:
                    marks_drop_flag = 1
            else:
                sum_slope += 0.0
                
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

    # 4. Composite Risk Score with severity instead of only binary flags.
    attendance_risk = 0.0
    if att_percent < 75:
        attendance_risk = min(100.0, ((75.0 - att_percent) / 75.0) * 100.0)
    if att_slope < -0.05:
        attendance_risk = max(attendance_risk, min(100.0, attendance_risk + 15.0))
    if att_drop_flag:
        attendance_risk = max(attendance_risk, 25.0)

    marks_risk = 0.0
    if total_avg_marks > 0:
        marks_risk = min(100.0, max(0.0, ((50.0 - total_avg_marks) / 50.0) * 100.0))
    if marks_drop_flag:
        marks_risk = max(marks_risk, min(100.0, marks_risk + 20.0))

    failure_factor = min(failure_count, 6) / 6.0
    failure_risk = failure_factor * 100.0

    risk_score = (
        (0.35 * attendance_risk) +
        (0.40 * marks_risk) +
        (0.25 * failure_risk)
    )
    risk_score = max(0.0, min(100.0, risk_score))

    # 5. Improvement Detection
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
