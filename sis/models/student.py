"""
Student Model

Represents enrolled students in the system
"""
from extensions import db
from datetime import datetime


class Student(db.Model):
    """Student model"""
    
    __tablename__ = 'student'
    
    id = db.Column(db.Integer, primary_key=True)
    admission_number = db.Column(db.String(20), unique=True, nullable=False, index=True)
    full_name = db.Column(db.String(100), nullable=False)
    roll_number = db.Column(db.String(10))
    email = db.Column(db.String(120), unique=True, nullable=False)
    branch = db.Column(db.String(100), nullable=False)  # Department name
    batch_id = db.Column(db.Integer, db.ForeignKey('batch.id'), nullable=True)
    batch = db.Column(db.String(50))  # String format: "2024-2026"
    mentor_id = db.Column(db.Integer, db.ForeignKey('faculty.id'))
    status = db.Column(db.String(20), default='Live')  # Live | Dropout | Passed Out
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    
    # Relationships
    mentor = db.relationship('Faculty', foreign_keys=[mentor_id], backref='mentees')
    login_credential = db.relationship('LoginCredential', backref='student', uselist=False, cascade='all, delete-orphan')
    
    def __repr__(self):
        return f'<Student {self.admission_number}: {self.full_name}>'
    
    def get_id(self):
        """Required for Flask-Login"""
        return f'student:{self.admission_number}'
    
    def is_authenticated(self):
        return True
    
    def is_active(self):
        return self.status == 'Live'
    
    def to_dict(self):
        return {
            'id': self.id,
            'admission_number': self.admission_number,
            'full_name': self.full_name,
            'email': self.email,
            'branch': self.branch,
            'batch': self.batch,
            'batch_id': self.batch_id,
            'status': self.status,
            'mentor_name': self.mentor.name if self.mentor else None
        }
