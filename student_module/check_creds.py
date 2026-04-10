from app import app, db, LoginCredential
with app.app_context():
    creds = LoginCredential.query.all()
    print(f"Total: {len(creds)}")
    for c in creds[:5]:
        print(c.admission_number)
