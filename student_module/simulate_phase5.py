import os
import sys

sys.path.append(os.path.dirname(os.path.abspath(__file__)))

def run_simulation():
    from app import app, db
    from models import StudentAnalytics, WeeklyStudyPlan, StudyPlanSubject, StudySessionLog
    from datetime import date, timedelta
    
    with app.app_context():
        # Schema migration
        db.create_all()
        
        print("--- PHASE 5 SIMULATION TEST ---")
        
        def simulate_case(name, mock_det, mock_ml, mock_comp):
            c_mod = 0.0
            if mock_comp >= 0.8:
                c_mod = -0.05
            elif mock_comp >= 0.4:
                c_mod = 0.0
            else:
                c_mod = 0.10
                
            r_det = mock_det / 100.0
            r_ml = mock_ml / 100.0
            
            r_det_adj = max(0.0, min(1.0, r_det + c_mod))
            r_ml_adj = max(0.0, min(1.0, r_ml + c_mod))
            
            final_risk = (0.5 * r_det_adj + 0.5 * r_ml_adj) * 100.0
            original_risk = (0.5 * r_det + 0.5 * r_ml) * 100.0
            print(f"[{name}] Det: {mock_det} | ML: {mock_ml} | Comp: {int(mock_comp*100)}% -> Mod: {c_mod}")
            print(f"Original Combo: {original_risk:.1f} | Adjusted Combo: {final_risk:.1f} | Shift: {final_risk - original_risk:+.1f}")
            print("-" * 50)
            
        # Case A: Declining student + 90% compliance
        simulate_case("Case A", 85.0, 75.0, 0.90)
        
        # Case B: Stable student + 20% compliance
        simulate_case("Case B", 45.0, 20.0, 0.20)
        
        # Case C: Improving student + 95% compliance
        simulate_case("Case C", 5.0, 0.0, 0.95)

if __name__ == "__main__":
    run_simulation()
