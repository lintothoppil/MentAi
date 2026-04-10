from app import app, db, LoginCredential
with app.app_context():
    count = LoginCredential.query.count()
    LoginCredential.query.delete()
    db.session.commit()
    print(f"Cleared {count} student credentials.")
