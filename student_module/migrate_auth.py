
from models import db
from flask import Flask
import os
from sqlalchemy import text

app = Flask(__name__)
app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///mentorai.db'
db.init_app(app)

with app.app_context():
    try:
        db.session.execute(text("ALTER TABLE student_marks ADD COLUMN is_verified BOOLEAN DEFAULT 0"))
        db.session.execute(text("ALTER TABLE student_marks ADD COLUMN is_locked BOOLEAN DEFAULT 0"))
        db.session.commit()
        print("Successfully added columns.")
    except Exception as e:
        print(f"Error or columns exist: {e}")
