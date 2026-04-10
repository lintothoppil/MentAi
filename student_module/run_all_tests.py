import os
import subprocess
import sys
import time

def run_system_tests():
    print("=" * 60)
    print("MENTAI CORE SYSTEM - AUTOMATED TEST RUNNER")
    print("=" * 60)
    
    # 1. Environment Check
    current_dir = os.path.dirname(os.path.abspath(__file__))
    test_file = os.path.join(current_dir, 'tests', 'test_core_loop.py')
    
    if not os.path.exists(test_file):
        print(f"Error: Test file not found at {test_file}")
        sys.exit(1)

    print(f"Targeting logic in: {os.path.abspath(current_dir)}")
    print(f"Executing suite: {test_file}")
    print("-" * 60)

    # 2. Execute Python Unittest
    try:
        # We set PYTHONPATH to ensures the imports work regardless of where the script is called from
        env = os.environ.copy()
        env["PYTHONPATH"] = current_dir
        
        process = subprocess.Popen(
            [sys.executable, test_file],
            env=env,
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            text=True
        )
        
        stdout, stderr = process.communicate()
        
        print(stdout)
        print(stderr)
        
        if process.returncode == 0:
            print("=" * 60)
            print("SUCCESS: All system core loops validated.")
            print("=" * 60)
        else:
            print("=" * 60)
            print("FAILURE: System loop integrity check failed.")
            print("Review the traceback above for diagnostics.")
            print("=" * 60)
            sys.exit(1)

    except Exception as e:
        print(f"Critical error during test execution: {e}")
        sys.exit(1)

if __name__ == "__main__":
    run_system_tests()
