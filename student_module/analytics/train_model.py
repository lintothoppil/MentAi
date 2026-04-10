import os
import sys

# Ensure backend imports work
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

def export_training_data():
    from app import app, db
    from models import StudentAnalytics

    with app.app_context():
        students = StudentAnalytics.query.all()
        
        X = []
        y = []
        
        for s in students:
            # Prevent data leakage, exclude risk_score and status
            X.append([
                s.attendance_percentage,
                s.attendance_slope,
                s.avg_internal_marks,
                s.marks_slope,
                s.failure_count,
                s.marks_variance
            ])
            
            # Predict "Declining" status
            y.append(1 if s.status == "Declining" else 0)
            
        return X, y

def train():
    from sklearn.ensemble import RandomForestClassifier
    from sklearn.model_selection import train_test_split
    from sklearn.metrics import classification_report, accuracy_score
    import joblib

    print("Extracting dataset...")
    X, y = export_training_data()
    
    if len(X) < 10:
        print("Not enough data to train. Seed analytics first.")
        return
        
    print(f"Data Extracted. Total samples: {len(X)}")

    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=0.2, random_state=42
    )

    print("Training RandomForest Classifier...")
    model = RandomForestClassifier(
        n_estimators=100,
        max_depth=5,
        random_state=42
    )

    model.fit(X_train, y_train)

    print("Evaluating Model...")
    predictions = model.predict(X_test)

    print("\n--- Classification Report ---")
    print(classification_report(y_test, predictions, zero_division=0))
    
    accuracy = accuracy_score(y_test, predictions)
    print(f"Overall Accuracy: {accuracy * 100:.2f}%")
    
    print("\n--- Feature Importances ---")
    features = [
        "attendance_percentage", 
        "attendance_slope", 
        "avg_internal_marks", 
        "marks_slope", 
        "failure_count", 
        "marks_variance"
    ]
    importances = model.feature_importances_
    for feature, imp in zip(features, importances):
        print(f"{feature}: {imp:.4f}")

    # Save Model
    model_dir = os.path.join(os.path.dirname(__file__), "trained_models")
    os.makedirs(model_dir, exist_ok=True)
    model_path = os.path.join(model_dir, "risk_model.pkl")
    joblib.dump(model, model_path)
    print(f"\nModel securely saved to {model_path}")

def predict_student_risk(student_analytics):
    import joblib
    
    model_path = os.path.join(os.path.dirname(__file__), "trained_models", "risk_model.pkl")
    if not os.path.exists(model_path):
        return 0.0 # Return 0 if ML hasn't been trained yet
        
    model = joblib.load(model_path)
    
    features = [[
        student_analytics.attendance_percentage,
        student_analytics.attendance_slope,
        student_analytics.avg_internal_marks,
        student_analytics.marks_slope,
        student_analytics.failure_count,
        student_analytics.marks_variance
    ]]

    # predict_proba returns [[P(class 0), P(class 1)]]
    # We want Probability of class 1 ("Declining")
    prob = model.predict_proba(features)[0][1] 

    # Return as percentage 0-100
    return prob * 100

if __name__ == "__main__":
    train()
