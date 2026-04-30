import os
import sys

sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

def generate_study_plan(student_id, base_hours=14):
    from app import app, db
    from models import StudentAnalytics, InternalMark, Subject
    
    # Fetch analytics securely
    analytics = StudentAnalytics.query.filter_by(student_id=student_id).first()
    if not analytics:
        return {"error": "No analytics found for student"}
        
    # 1. Risk-Aware Booster Logic
    if analytics.ml_risk_probability > 75.0:
        total_hours = base_hours * 1.25
        boost_applied = "ML Risk > 75%"
    elif analytics.status == "Declining":
        total_hours = base_hours * 1.15
        boost_applied = "Deterministic Declining"
    else:
        total_hours = base_hours
        boost_applied = "None"
        
    # 2. Per-Subject Processing
    student = Student.query.get(student_id)
    marks = InternalMark.query.filter_by(student_id=student_id).all()
    subj_data = {}
    
    for m in marks:
        if m.subject_id not in subj_data:
            subj_data[m.subject_id] = {
                "name": m.subject.name,
                "Internal1": None,
                "Internal2": None,
                "fails": m.marks < 40 if m.marks else 0
            }
        subj_data[m.subject_id][m.exam_type] = m.marks
        if m.marks < 40:
            subj_data[m.subject_id]["fails"] += 1
            
    # Fallback: If no marks, use batch subjects
    if not subj_data and student and student.batch_id:
        course_id = student.batch_info.course_id
        batch_subjects = Subject.query.filter_by(course_id=course_id).all()
        for s in batch_subjects:
            subj_data[s.id] = {
                "name": s.name,
                "Internal1": None,
                "Internal2": None,
                "fails": 0
            }
            
    subjects = []
    total_weakness = 0.0
    
    for sid, data in subj_data.items():
        val1 = data.get("Internal1")
        val2 = data.get("Internal2")
        
        # If only one exam, slope is 0. If both, slope = val2 - val1
        if val1 is not None and val2 is not None:
            avg_mark = (val1 + val2) / 2.0
            raw_slope = val2 - val1
        elif val1 is not None:
            avg_mark = val1
            raw_slope = 0.0
        elif val2 is not None:
            avg_mark = val2
            raw_slope = 0.0
        else:
            avg_mark = 0.0
            raw_slope = 0.0
            
        normalized_marks = avg_mark / 100.0
        marks_slope_normalized = raw_slope / 100.0
        
        negative_slope_component = max(0, -marks_slope_normalized)
        failure_component = 1.0 if data["fails"] > 0 else 0.0
        
        # 3. Weakness Score Formula
        weakness_score = (
            (1.0 - normalized_marks) * 0.5 + 
            negative_slope_component * 0.3 + 
            failure_component * 0.2
        )
        
        # Avoid absolutely 0 weakness to prevent div-by-zero
        weakness_score = max(0.05, weakness_score)
        
        total_weakness += weakness_score
        
        subjects.append({
            "subject_id": sid,
            "subject_name": data["name"],
            "weakness_score": weakness_score,
            "avg_marks": avg_mark,
            "fails": data["fails"],
            "slope": raw_slope
        })
        
    # 4. Proportional Hour Allocation & Priority
    # Sort by weakness descending
    subjects.sort(key=lambda x: x["weakness_score"], reverse=True)
    
    if len(subjects) > 0:
        top_25_idx = max(1, int(len(subjects) * 0.25))
    else:
        top_25_idx = 0
        
    for idx, sub in enumerate(subjects):
        # Proportional allocation
        allocated = (sub["weakness_score"] / total_weakness) * total_hours
        
        # Minimum constraint
        if allocated < 1.0:
            allocated = 1.0
            
        sub["allocated_hours"] = round(allocated, 1)
        
        # Classification
        if idx < top_25_idx and sub["weakness_score"] > 0.4:
            sub["priority"] = "Critical"
        elif sub["weakness_score"] > 0.25:
            sub["priority"] = "Moderate"
        else:
            sub["priority"] = "Stable"

    return {
        "student_id": student_id,
        "det_risk": analytics.risk_score,
        "ml_prob": round(analytics.ml_risk_probability, 1),
        "status": analytics.status,
        "base_hours": base_hours,
        "total_allocated_hours": sum(s["allocated_hours"] for s in subjects),
        "boost_applied": boost_applied,
        "subjects": subjects
    }

def generate_and_lock_weekly_plan(student_id):
    from datetime import date, timedelta
    from app import app, db
    from models import WeeklyStudyPlan, StudyPlanSubject

    today = date.today()
    week_start = today - timedelta(days=today.weekday())
    week_end = week_start + timedelta(days=6)

    existing = WeeklyStudyPlan.query.filter_by(
        student_id=student_id,
        week_start=week_start
    ).first()

    if existing:
        return existing

    plan_data = generate_study_plan(student_id)
    if "error" in plan_data:
        return None

    plan = WeeklyStudyPlan(
        student_id=student_id,
        week_start=week_start,
        week_end=week_end,
        total_hours=plan_data["total_allocated_hours"],
        booster_applied=plan_data["boost_applied"],
        deterministic_risk=plan_data["det_risk"],
        ml_probability=plan_data["ml_prob"]
    )

    db.session.add(plan)
    db.session.flush()

    for subject in plan_data["subjects"]:
        db.session.add(StudyPlanSubject(
            plan_id=plan.id,
            subject_id=subject["subject_id"],
            allocated_hours=subject["allocated_hours"],
            weakness_score=subject["weakness_score"],
            priority=subject["priority"]
        ))

    db.session.commit()
    return plan
