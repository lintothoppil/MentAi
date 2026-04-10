import joblib
import os
from sklearn.ensemble import RandomForestClassifier

MODEL_PATH = "trained_models/risk_model.pkl"

def train_model(X, y):
    if not os.path.exists("trained_models"):
        os.makedirs("trained_models")
    model = RandomForestClassifier()
    model.fit(X, y)
    joblib.dump(model, MODEL_PATH)

def predict_risk(features):
    if not os.path.exists(MODEL_PATH):
        # Fallback if no model trained (simulate based on simple heuristics)
        overall_pct, last7_avg, last14_avg, consecutive_absent, variance = features
        if overall_pct < 0.75 or last7_avg < 0.7:
            return 0.7 # High risk
        return 0.1 # Low risk
        
    try:
        model = joblib.load(MODEL_PATH)
        probability = model.predict_proba([features])[0][1]
        return probability
    except Exception as e:
        print(f"Error predicting risk: {e}")
        return 0.0

def build_feature_vector(records):
    import numpy as np
    
    if len(records) < 14:
        return None # Not enough data
        
    overall_pct = sum(records) / len(records)
    last7_avg = np.mean(records[-7:])
    last14_avg = np.mean(records[-14:])
    
    consecutive_absent = 0
    for r in records[::-1]:
        if r == 0:
            consecutive_absent += 1
        else:
            break
            
    variance = np.var(records)
    
    return [overall_pct, last7_avg, last14_avg, consecutive_absent, variance]

if __name__ == "__main__":
    import numpy as np
    print("Generating simulated student attendance data for training...")
    
    # Generate dummy data
    np.random.seed(42)
    X = []
    y = []
    
    for _ in range(1000):
        # Good students
        if np.random.rand() > 0.3:
            overall_pct = np.random.uniform(0.75, 1.0)
            last7_avg = np.random.uniform(0.7, 1.0)
            last14_avg = np.random.uniform(0.7, 1.0)
            consec_absent = np.random.randint(0, 3)
            variance = np.random.uniform(0.0, 0.05)
            X.append([overall_pct, last7_avg, last14_avg, consec_absent, variance])
            y.append(0) # Not at risk
        else:
            # At risk students
            overall_pct = np.random.uniform(0.4, 0.74)
            last7_avg = np.random.uniform(0.2, 0.69)
            last14_avg = np.random.uniform(0.3, 0.7)
            consec_absent = np.random.randint(2, 6)
            variance = np.random.uniform(0.05, 0.2)
            X.append([overall_pct, last7_avg, last14_avg, consec_absent, variance])
            y.append(1) # At risk
            
    print("Training Random Forest Classifier on simulated data...")
    train_model(X, y)
    print(f"Model successfully trained and saved to {MODEL_PATH}")
