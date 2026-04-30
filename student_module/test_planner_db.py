from app import app
from routes.smart_planner_routes import _ensure_tables
with app.app_context():
    _ensure_tables()
    # Quick sanity test
    from models import db
    r = db.session.execute(db.text("SELECT name FROM sqlite_master WHERE type='table' AND name LIKE 'sp_%'")).fetchall()
    print("Planner tables:", [row[0] for row in r])
    print("Backend OK")
