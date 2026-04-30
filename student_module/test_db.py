"""
Test database connection and table creation
"""
from dotenv import load_dotenv
load_dotenv()

import os
from flask import Flask
from models import db

app = Flask(__name__)
app.config['SQLALCHEMY_DATABASE_URI'] = os.getenv('DATABASE_URL', 'sqlite:///mentorai.db')
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False

print(f"Database URL: {app.config['SQLALCHEMY_DATABASE_URI']}")

db.init_app(app)

with app.app_context():
    try:
        print("Creating tables...")
        db.create_all()
        print("✅ Database tables created successfully!")
        
        # Test creating a simple record
        from models import UserScheduleSettings
        print("✅ Models imported successfully!")
        
        print("\nDatabase is working correctly!")
    except Exception as e:
        print(f"❌ Error: {e}")
        import traceback
        traceback.print_exc()
