"""
Student Module – Flask Application Factory
==========================================
Provides create_app() for use with Flask-Migrate and testing.
"""

import logging
import os

from flask import Flask
from flask_migrate import Migrate

from student_module.models.study_plan_models import db

logger = logging.getLogger(__name__)


def create_app(config_overrides: dict | None = None) -> Flask:
    """Create and configure the Flask application."""
    app = Flask(__name__, instance_relative_config=True)

    # ------------------------------------------------------------------
    # Default configuration
    # ------------------------------------------------------------------
    app.config.setdefault(
        "SQLALCHEMY_DATABASE_URI",
        os.environ.get(
            "DATABASE_URL",
            "mysql+pymysql://root:password@localhost/mentai",
        ),
    )
    app.config.setdefault("SQLALCHEMY_TRACK_MODIFICATIONS", False)
    app.config.setdefault("SECRET_KEY", os.environ.get("SECRET_KEY", "change-me"))
    app.config.setdefault("JSON_SORT_KEYS", False)

    if config_overrides:
        app.config.update(config_overrides)

    # ------------------------------------------------------------------
    # Extensions
    # ------------------------------------------------------------------
    db.init_app(app)
    Migrate(app, db)

    # ------------------------------------------------------------------
    # Blueprints
    # ------------------------------------------------------------------
    from student_module.routes.study_plan_routes import study_plan_bp

    app.register_blueprint(study_plan_bp)

    # ------------------------------------------------------------------
    # Logging
    # ------------------------------------------------------------------
    logging.basicConfig(
        level=logging.INFO,
        format="%(asctime)s  %(levelname)-8s  %(name)s  %(message)s",
    )

    return app


if __name__ == "__main__":
    import os as _os
    application = create_app()
    debug_mode = _os.environ.get("FLASK_DEBUG", "0").lower() in ("1", "true", "yes")
    application.run(debug=debug_mode, port=5000)
