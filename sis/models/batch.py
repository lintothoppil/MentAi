"""
Batch Model

Represents a specific cohort of students (e.g., MCA 2024-2026)

Migration Notes:
- status: "active" | "completed"
- Auto-promoted to alumni when end_year <= current_year
"""
from extensions import db
from datetime import datetime


class Batch(db.Model):
    """Batch model representing a student cohort"""
    
    __tablename__ = 'batch'
    
    id = db.Column(db.Integer, primary_key=True)
    course_id = db.Column(db.Integer, db.ForeignKey('course.id'), nullable=False)
    start_year = db.Column(db.Integer, nullable=False)
    end_year = db.Column(db.Integer, nullable=False)
    status = db.Column(db.String(20), default='active')  # active | completed
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    
    # Relationships
    students = db.relationship('Student', backref='batch', lazy='dynamic')
    timetable_slots = db.relationship('TimetableSlot', backref='batch', lazy='dynamic')
    
    def __repr__(self):
        return f'<Batch {self.start_year}-{self.end_year} ({self.status})>'
    
    def to_dict(self):
        """Convert batch to dictionary"""
        return {
            'id': self.id,
            'course_id': self.course_id,
            'course_name': self.course.name if self.course else None,
            'start_year': self.start_year,
            'end_year': self.end_year,
            'status': self.status,
            'label': f"{self.course.name} {self.start_year}-{self.end_year}" if self.course else f"{self.start_year}-{self.end_year}"
        }
    
    @property
    def is_expired(self):
        """Check if batch end year has passed"""
        from datetime import datetime
        now = datetime.now()
        
        # Expired if end_year < current_year
        # OR end_year == current_year AND month >= 6 (June graduation)
        if self.end_year < now.year:
            return True
        if self.end_year == now.year and now.month >= 6:
            return True
        return False
    
    @staticmethod
    def get_batch_label(batch_str: str) -> str:
        """
        Extract and format batch label from string
        
        Args:
            batch_str: Raw batch string (e.g., "MCA 2024-2026")
            
        Returns:
            Formatted label
        """
        import re
        match = re.search(r'(\d{4})\s*-\s*(\d{4})', batch_str or '')
        if match:
            return f"{match.group(1)}-{match.group(2)}"
        return batch_str or "Unknown"
