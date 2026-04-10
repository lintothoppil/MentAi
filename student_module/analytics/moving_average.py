import numpy as np

def moving_average(records, window=7):
    if len(records) < window:
        return None
        
    avg = np.mean(records[-window:])
    
    if avg < 0.7:
        return "LOW_MOVING_AVERAGE"
        
    # Check downward trend for 3 windows
    if len(records) >= window + 2:
        avg1 = np.mean(records[-(window+2):-2])
        avg2 = np.mean(records[-(window+1):-1])
        avg3 = np.mean(records[-window:])
        if avg1 > avg2 > avg3 and avg3 < 0.8:
            return "DOWNWARD_TREND"
            
    return None
