"""
Flask Application Factory and Main Entry Point
"""
from flask import Flask, jsonify
from flask_login import LoginManager, logout_user, login_required
from flask_migrate import Migrate
from config import Config
from extensions import db, login_manager, bcrypt
from models.student import Student
from models.faculty import Faculty
from models.batch import Batch
from models.course import Course
from models.alumni import AlumniStudent, AlumniMentorHistory
from routes.admin_routes import admin_bp
from routes.teacher_routes import teacher_bp
from routes.student_routes import student_bp
import logging

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


def create_app(config_class=Config):
    """Application factory for creating Flask app instance"""
    
    app = Flask(__name__)
    app.config.from_object(config_class)
    
    # Initialize extensions
    db.init_app(app)
    login_manager.init_app(app)
    bcrypt.init_app(app)
    migrate = Migrate(app, db)
    
    # Register blueprints
    app.register_blueprint(admin_bp, url_prefix='/admin')
    app.register_blueprint(teacher_bp, url_prefix='/teacher')
    app.register_blueprint(student_routes_bp, url_prefix='/student')
    
    # User loader for Flask-Login
    @login_manager.user_loader
    def load_user(user_id):
        # user_id format: "type:id" e.g., "student:A24MCA001" or "faculty:5"
        try:
            user_type, uid = user_id.split(':')
            if user_type == 'student':
                return Student.query.get(uid)
            elif user_type == 'faculty':
                return Faculty.query.get(int(uid))
        except (ValueError, AttributeError):
            pass
        return None
    
    # Auto-promote expired batches on startup
    @app.before_first_request
    def promote_expired_on_startup():
        """Run alumni promotion for expired batches before first request"""
        try:
            from services.alumni_service import promote_expired_batches_to_alumni
            result = promote_expired_batches_to_alumni()
            if result.get('success'):
                logger.info(f"Auto-promoted {result.get('expired_batches_found')} batches to alumni")
        except Exception as e:
            logger.error(f"Error during startup alumni promotion: {str(e)}")
    
    # Health check endpoint
    @app.route('/health')
    def health_check():
        return jsonify({'status': 'healthy', 'sis_version': '1.0.0'})
    
    # Error handlers
    @app.errorhandler(404)
    def not_found(error):
        return jsonify({'error': 'Not found', 'message': str(error)}), 404
    
    @app.errorhandler(500)
    def internal_error(error):
        db.session.rollback()
        return jsonify({'error': 'Internal server error', 'message': str(error)}), 500
    
    return app


if __name__ == '__main__':
    app = create_app()
    app.run(debug=True, host='0.0.0.0', port=5000)
