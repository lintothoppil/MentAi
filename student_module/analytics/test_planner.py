import os
import sys

sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

def validate_planner():
    from app import app
    from models import StudentAnalytics
    from analytics.planner import generate_study_plan
    
    with app.app_context():
        # Get a mix of statuses
        improving = StudentAnalytics.query.filter_by(status="Improving").limit(3).all()
        stable = StudentAnalytics.query.filter_by(status="Stable").limit(3).all()
        declining = StudentAnalytics.query.filter_by(status="Declining").limit(4).all()
        
        test_students = improving + stable + declining
        
        for sa in test_students:
            plan = generate_study_plan(sa.student_id, base_hours=14)
            print("-" * 50)
            print(f"Student: {plan['student_id']} | Status: {plan['status']}")
            print(f"Det Risk: {plan['det_risk']} | ML Prob: {plan['ml_prob']}%")
            print(f"Base Hours: {plan['base_hours']} | Target Allocated: {plan['total_allocated_hours']:.1f} | Boost: {plan['boost_applied']}")
            
            for sub in plan["subjects"]:
                print(f"  {sub['subject_name']:18} : {sub['allocated_hours']} hrs | Priority: {sub['priority']:8} | Weakness: {sub['weakness_score']:.2f} | Avg: {sub['avg_marks']:.1f} | Slope: {sub['slope']:.1f} | Fails: {sub['fails']}")
                
        print("-" * 50)

if __name__ == "__main__":
    validate_planner()
