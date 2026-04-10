import os
import sys
from sklearn.model_selection import cross_val_score
from sklearn.ensemble import RandomForestClassifier
import joblib

sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

def validate_model():
    from app import app, db
    from models import StudentAnalytics
    from analytics.train_model import export_training_data

    with app.app_context():
        X, y = export_training_data()

        if len(X) < 10:
            print("Not enough data to run validation.")
            return

        print(f"Total dataset size: {len(X)}")

        # 1. Cross Validation
        model = RandomForestClassifier(n_estimators=100, max_depth=5, random_state=42)
        scores = cross_val_score(model, X, y, cv=5)
        print(f"\n--- 5-Fold Cross Validation ---")
        print(f"CV Scores: {scores}")
        print(f"Mean CV Accuracy: {scores.mean():.4f}")

        # 2. Train the model to test for mismatches on whole dataset (overfit check)
        model.fit(X, y)
        probs = model.predict_proba(X)

        students = StudentAnalytics.query.all()
        
        mismatches = 0
        significant_deltas = 0
        total = len(students)

        print("\n--- Model vs Deterministic Mismatch Analysis ---")
        for idx, student in enumerate(students):
            # Probability of target class (Declining = 1)
            ml_prob = probs[idx][1] * 100
            
            # Deterministic Risk
            det_risk = student.risk_score
            
            delta = ml_prob - det_risk

            is_declining_deterministic = (student.status == "Declining")
            is_declining_ml = (ml_prob > 70.0) # Using 0.7 as threshold

            if is_declining_deterministic != is_declining_ml:
                mismatches += 1

            if abs(delta) > 20: 
                # Consider strictly larger deltas
                significant_deltas += 1

        print(f"\nTotal Students Evaluated: {total}")
        print(f"Total Mismatches (Deterministic 'Declining' vs ML > 70%): {mismatches}")
        print(f"Total Significant Deltas (Difference > 20%): {significant_deltas}")
        
        print("\n--- 10 Sample Edge Cases (High Delta) ---")
        sampled = 0
        for idx, student in enumerate(students):
            ml_prob = probs[idx][1] * 100
            det_risk = student.risk_score
            delta = ml_prob - det_risk
            
            if abs(delta) > 20 and sampled < 10:
                print(f"Student: {student.student_id}")
                print(f"  Deterministic Status: {student.status}")
                print(f"  Det Risk: {det_risk:.2f} | ML Prob: {ml_prob:.2f} | Delta: {delta:.2f}")
                print(f"  Att Slp: {student.attendance_slope:.3f} | Mk Slp: {student.marks_slope:.1f}")
                print(f"  Att pct: {student.attendance_percentage:.1f} | Avg Mk: {student.avg_internal_marks:.1f} | Fails: {student.failure_count}")
                sampled += 1

if __name__ == "__main__":
    validate_model()
