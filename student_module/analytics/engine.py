from models import db, Student, StudentAttendance, Alert
from .rules import rule_check
from .moving_average import moving_average
from .ml_model import build_feature_vector, predict_risk
from sqlalchemy import asc

def run_full_analysis():
    # Fetch all live students
    students = Student.query.filter_by(status='Live').all()
    
    for student in students:
        # Get historical attendance records
        records = StudentAttendance.query.filter_by(student_admission_number=student.admission_number).order_by(asc(StudentAttendance.date)).all()
        if not records:
            continue
            
        # 1 for P/OD, 0 for A
        binary_records = [1 if r.status in ['P', 'OD'] else 0 for r in records]
        
        # 1. Rule Engine
        rule_flags = rule_check(binary_records) or []
        for flag in rule_flags:
            msg = "Attendance dropped below 75%" if flag == "LOW_ATTENDANCE" else "3 consecutive absences detected"
            create_or_update_alert(student, flag, msg)
            
        # 2. Moving Average
        ma_flag = moving_average(binary_records)
        if ma_flag:
            msg = "Gradual decline in attendance detected over the last few days" if ma_flag == "DOWNWARD_TREND" else "7-day average attendance is extremely low"
            create_or_update_alert(student, ma_flag, msg)
            
        # 3. ML Risk Prediction
        features = build_feature_vector(binary_records)
        if features:
            risk_prob = predict_risk(features)
            if risk_prob > 0.65:
                msg = f"High risk of critical attendance drop predicted (Probability: {int(risk_prob*100)}%)"
                create_or_update_alert(student, "ML_HIGH_RISK", msg)
                
def create_or_update_alert(student, alert_type, message):
    # Check if a recent alert of same type exists for student
    from datetime import datetime, timedelta
    recent_alert = Alert.query.filter_by(
        student_admission_number=student.admission_number,
        type=alert_type
    ).filter(Alert.created_at >= datetime.utcnow() - timedelta(days=2)).first()
    
    if not recent_alert:
        print(f"[{alert_type}] Alert generated for {student.admission_number}: {message}")
        alert = Alert(
            student_admission_number=student.admission_number,
            mentor_id=student.mentor_id,
            type=alert_type,
            message=message
        )
        db.session.add(alert)
        db.session.commit()
