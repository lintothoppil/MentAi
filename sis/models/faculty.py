"""
Faculty Model - Teaching staff
"""
from extensions import db
from datetime import datetime


class Faculty(db.Model):
    """Faculty model representing teaching staff"""
    
    __tablename__ = 'faculty'
    
    id = db.Column(db.Integer, primary_key=True)
    username = db.Column(db.String(50), unique=True, nullable=False, index=True)
    password_hash = db.Column(db.String(255), nullable=False)
    name = db.Column(db.String(100), nullable=False)
    designation = db.Column(db.String(50))  # HOD | Admin | Mentor | Subject Handler
    department = db.Column(db.String(100))
    is_mentor_eligible = db.Column(db.Boolean, default=True)
    status = db.Column(db.String(20), default='Live')
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    
    def __repr__(self):
        return f'<Faculty {self.username}: {self.name}>'
    
    def get_id(self):
        return f'faculty:{self.id}'
    
    def is_authenticated(self):
        return True
    
    def is_active(self):
        return self.status == 'Live'
    
    @staticmethod
    def compute_mentor_eligible(designation: str, department: str) -> bool:
        """Determine if faculty is eligible to be mentor"""
        ineligible_designations = ['hod', 'admin']
        ineligible_depts = ['basic science and humanities']
        
        desig_lower = designation.lower().strip() if designation else ''
        dept_lower = department.lower().strip() if department else ''
        
        if desig_lower in ineligible_designations:
            return False
        if dept_lower in ineligible_depts:
            return False
        
        return True
