"""
Flask extensions initialization
"""
from flask_sqlalchemy import SQLAlchemy
from flask_login import LoginManager
from flask_bcrypt import Bcrypt

# Database instance
db = SQLAlchemy()

# Login manager for user authentication
login_manager = LoginManager()
login_manager.login_view = 'admin.login'
login_manager.login_message_category = 'info'

# Password hashing
bcrypt = Bcrypt()
