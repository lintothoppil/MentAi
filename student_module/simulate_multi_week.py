import os
import sys

def simulate_multi_week():
    print("--- 3-WEEK OSCILLATION & CUMULATIVE DRIFT SIMULATION ---")
    
    # Prove that because Base Risk is derived purely from deterministic raw data 
    # (marks, attendance) and ML probability, the modifier never corrupts the base state.
    base_det = 85.0 # Constant raw deterministic risk
    base_ml  = 75.0 # Constant raw ML risk
    
    print(f"Raw Base Risk (Unmodified): {0.5 * base_det + 0.5 * base_ml:.1f}\n")
    
    def simulate_week(week_num, comp_fraction):
        # 1. Recalculate Modifier
        if comp_fraction >= 0.8:
            c_mod = -0.05
        elif comp_fraction >= 0.4:
            c_mod = 0.0
        else:
            c_mod = 0.10
            
        # 2. Apply to static base values (Proving no cumulative drift)
        r_det = base_det / 100.0
        r_ml = base_ml / 100.0
        
        r_det_adj = max(0.0, min(1.0, r_det + c_mod))
        r_ml_adj = max(0.0, min(1.0, r_ml + c_mod))
        
        adj_risk = (0.5 * r_det_adj + 0.5 * r_ml_adj) * 100.0
        
        print(f"Week {week_num} | Compliance: {int(comp_fraction*100)}% -> Mod: {c_mod:+.2f}")
        print(f"  Adjusted Risk => {adj_risk:.1f} (Shift: {adj_risk - 80.0:+.1f})")
        print("-" * 50)
        
    simulate_week(1, 0.20) # Low compliance
    simulate_week(2, 0.85) # High compliance
    simulate_week(3, 0.30) # Low compliance
    
if __name__ == "__main__":
    simulate_multi_week()
