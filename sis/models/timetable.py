"""
Subject and Timetable Models
"""
from extensions import db
from datetime import datetime


class Subject(db.Model):
    """Subject/Course material"""
    
    __tablename__ = 'subject'
    
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(100), nullable=False)
    code = db.Column(db.String(20), unique=True)
    course_id = db.Column(db.Integer, db.ForeignKey('course.id'), nullable=False)
    semester = db.Column(db.Integer, nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    
    # Relationships
    timetable_slots = db.relationship('TimetableSlot', backref='subject', lazy='dynamic')
    
    def __repr__(self):
        return f'<Subject {self.code}: {self.name}>'


class TimetableSlot(db.Model):
    """Individual timetable slot"""
    
    __tablename__ = 'timetable_slot'
    
    id = db.Column(db.Integer, primary_key=True)
    batch_id = db.Column(db.Integer, db.ForeignKey('batch.id'), nullable=False)
    subject_id = db.Column(db.Integer, db.ForeignKey('subject.id'), nullable=False)
    faculty_id = db.Column(db.Integer, db.ForeignKey('faculty.id'), nullable=False)
    day = db.Column(db.String(3), nullable=False)  # Mon, Tue, Wed, Thu, Fri
    period_number = db.Column(db.Integer, nullable=False)  # 1-8
    semester = db.Column(db.Integer, nullable=False)
    academic_year = db.Column(db.Integer, nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    
    # Relationships
    faculty = db.relationship('Faculty', foreign_keys=[faculty_id])
    
    def __repr__(self):
        return f'<TimetableSlot {self.day} P{self.period_number}: {self.subject.name}>'
