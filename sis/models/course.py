"""
Course Model

Represents academic programs (MCA, IMCA, MBA, B.Tech, etc.)

Migration Notes:
- duration_years determines max concurrent batches allowed
- IMCA: 5 years, MCA/MBA: 2 years, B.Tech/B.E.: 4 years
"""
from extensions import db
from datetime import datetime


class Course(db.Model):
    """Course model representing academic programs"""
    
    __tablename__ = 'course'
    
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(100), nullable=False, unique=True)
    department = db.Column(db.String(100), nullable=True)  # Department offering this course
    duration_years = db.Column(db.Integer, nullable=False, default=2)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    
    # Relationships
    batches = db.relationship('Batch', backref='course', lazy='dynamic', cascade='all, delete-orphan')
    subjects = db.relationship('Subject', backref='course', lazy='dynamic', cascade='all, delete-orphan')
    
    def __repr__(self):
        return f'<Course {self.name}>'
    
    def to_dict(self):
        """Convert course to dictionary"""
        return {
            'id': self.id,
            'name': self.name,
            'department': self.department,
            'duration_years': self.duration_years,
            'created_at': self.created_at.isoformat() if self.created_at else None
        }
    
    @staticmethod
    def get_course_duration(course_name: str) -> int:
        """
        Get standard duration for a course by name
        
        Args:
            course_name: Name of the course
            
        Returns:
            Duration in years
        """
        name_lower = course_name.lower().strip()
        
        # 5-year programs
        if 'imca' in name_lower or 'integrated mca' in name_lower:
            return 5
        
        # 4-year programs
        if any(x in name_lower for x in ['b.tech', 'btech', 'b.e', 'be', 'engineering']):
            return 4
        
        # 2-year programs
        if any(x in name_lower for x in ['mca', 'mba', 'm.tech', 'mtech']):
            return 2
        
        # Default
        return 2
