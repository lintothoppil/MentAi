
from models import db
from flask import Flask
import os
import sqlalchemy

app = Flask(__name__)
app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///mentorai.db'
db.init_app(app)

with app.app_context():
    try:
        db.session.execute(sqlalchemy.text("ALTER TABLE student_marks ADD COLUMN university_grade VARCHAR(10)"))
        db.session.commit()
        print("Successfully added university_grade column.")
    except Exception as e:
        print(f"Column might already exist or error: {e}")
