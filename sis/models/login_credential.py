"""
Login Credential Model - Student login credentials
"""
from extensions import db
from datetime import datetime


class LoginCredential(db.Model):
    """Student login credentials"""
    
    __tablename__ = 'login_credential'
    
    id = db.Column(db.Integer, primary_key=True)
    student_id = db.Column(db.String(20), db.ForeignKey('student.admission_number'), unique=True, nullable=False)
    username = db.Column(db.String(50), unique=True, nullable=False, index=True)
    password_hash = db.Column(db.String(255), nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    
    def __repr__(self):
        return f'<LoginCredential {self.username}>'
