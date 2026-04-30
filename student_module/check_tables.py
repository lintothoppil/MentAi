from app import app, db
with app.app_context():
    r = db.session.execute(db.text("SELECT name FROM sqlite_master WHERE type='table' ORDER BY name")).fetchall()
    print([row[0] for row in r])
