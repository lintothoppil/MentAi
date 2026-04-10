import traceback, sys

errors = []

modules = [
    'utils.decorators',
    'utils.validators',
    'utils.risk_engine',
    'utils.ai',
]

routes = [
    'routes.auth_routes',
    'routes.admin_routes',
    'routes.student_routes',
    'routes.mentor_routes',
    'routes.subject_handler_routes',
    'routes.hod_routes',
]

for mod in modules + routes:
    try:
        __import__(mod)
        print(f"  OK  {mod}")
    except Exception as e:
        errors.append((mod, str(e)))
        print(f"  ERR {mod}: {e}")

if errors:
    print(f"\n{len(errors)} error(s) found.")
    sys.exit(1)
else:
    print("\nAll imports clean.")
