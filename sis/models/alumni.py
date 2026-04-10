"""
Alumni Models - Graduated students tracking
"""
from extensions import db
from datetime import datetime


class AlumniStudent(db.Model):
    """Alumni student record for graduated students"""
    
    __tablename__ = 'alumni_student'
    
    id = db.Column(db.Integer, primary_key=True)
    admission_number = db.Column(db.String(20), nullable=False, index=True)
    name = db.Column(db.String(100), nullable=False)
    email = db.Column(db.String(120))
    department = db.Column(db.String(100))
    course_id = db.Column(db.Integer, db.ForeignKey('course.id'))
    batch_id = db.Column(db.Integer, db.ForeignKey('batch.id'))
    mentor_id = db.Column(db.Integer, db.ForeignKey('faculty.id'))
    passout_year = db.Column(db.Integer)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    
    # Relationships
    course = db.relationship('Course', foreign_keys=[course_id])
    batch = db.relationship('Batch', foreign_keys=[batch_id])
    
    def __repr__(self):
        return f'<Alumni {self.admission_number}: {self.name} ({self.passout_year})>'


class AlumniMentorHistory(db.Model):
    """History of mentor assignments for alumni"""
    
    __tablename__ = 'alumni_mentor_history'
    
    id = db.Column(db.Integer, primary_key=True)
    admission_number = db.Column(db.String(20), nullable=False, index=True)
    mentor_id = db.Column(db.Integer, db.ForeignKey('faculty.id'), nullable=False)
    start_date = db.Column(db.DateTime, nullable=False)
    end_date = db.Column(db.DateTime, nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    
    # Relationships
    mentor = db.relationship('Faculty')
    
    def __repr__(self):
        return f'<MentorHistory {self.admission_number}: Mentor {self.mentor_id}>'
