"""
Database Migration – Study Plan Tables
=======================================
Creates the four tables required by the Study Plan Generation module:
  - study_plan_templates
  - study_plans
  - weekly_plans
  - daily_tasks

Run with:
    flask db upgrade

Or execute directly against a live MySQL connection:
    python student_module/migrations/create_study_plan_tables.py
"""

CREATE_STUDY_PLAN_TEMPLATES = """
CREATE TABLE IF NOT EXISTS study_plan_templates (
    id          INT AUTO_INCREMENT PRIMARY KEY,
    name        VARCHAR(120)  NOT NULL,
    description TEXT,
    subject_config JSON        NOT NULL DEFAULT (JSON_ARRAY()),
    duration_weeks INT         NOT NULL DEFAULT 12,
    daily_hours    FLOAT       NOT NULL DEFAULT 3.0,
    is_active      TINYINT(1)  NOT NULL DEFAULT 1,
    created_at     DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
    updated_at     DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6)
                               ON UPDATE CURRENT_TIMESTAMP(6),
    INDEX idx_spt_active (is_active)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
"""

CREATE_STUDY_PLANS = """
CREATE TABLE IF NOT EXISTS study_plans (
    id                  INT AUTO_INCREMENT PRIMARY KEY,
    student_id          INT          NOT NULL,
    template_id         INT,
    title               VARCHAR(200) NOT NULL,
    description         TEXT,
    status              ENUM('active','completed','archived','paused')
                            NOT NULL DEFAULT 'active',
    start_date          DATE         NOT NULL,
    end_date            DATE         NOT NULL,
    total_weekly_hours  FLOAT        NOT NULL DEFAULT 20.0,
    subjects            JSON         NOT NULL DEFAULT (JSON_ARRAY()),
    overall_progress    FLOAT        NOT NULL DEFAULT 0.0,
    ai_insights         JSON         DEFAULT (JSON_OBJECT()),
    created_at          DATETIME(6)  NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
    updated_at          DATETIME(6)  NOT NULL DEFAULT CURRENT_TIMESTAMP(6)
                                     ON UPDATE CURRENT_TIMESTAMP(6),
    FOREIGN KEY (student_id)   REFERENCES students(id)  ON DELETE CASCADE,
    FOREIGN KEY (template_id)  REFERENCES study_plan_templates(id)
                                    ON DELETE SET NULL,
    INDEX idx_sp_student   (student_id),
    INDEX idx_sp_status    (status),
    INDEX idx_sp_dates     (start_date, end_date)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
"""

CREATE_WEEKLY_PLANS = """
CREATE TABLE IF NOT EXISTS weekly_plans (
    id                    INT AUTO_INCREMENT PRIMARY KEY,
    study_plan_id         INT       NOT NULL,
    week_number           INT       NOT NULL,
    start_date            DATE      NOT NULL,
    end_date              DATE      NOT NULL,
    allocated_hours       FLOAT     NOT NULL DEFAULT 0.0,
    actual_hours          FLOAT     NOT NULL DEFAULT 0.0,
    completion_percentage FLOAT     NOT NULL DEFAULT 0.0,
    subject_hours         JSON      DEFAULT (JSON_OBJECT()),
    notes                 TEXT,
    created_at            DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
    updated_at            DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6)
                                      ON UPDATE CURRENT_TIMESTAMP(6),
    FOREIGN KEY (study_plan_id) REFERENCES study_plans(id) ON DELETE CASCADE,
    UNIQUE KEY  uq_wp_plan_week (study_plan_id, week_number),
    INDEX       idx_wp_dates    (start_date, end_date)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
"""

CREATE_DAILY_TASKS = """
CREATE TABLE IF NOT EXISTS daily_tasks (
    id                  INT AUTO_INCREMENT PRIMARY KEY,
    weekly_plan_id      INT          NOT NULL,
    subject_name        VARCHAR(150) NOT NULL,
    title               VARCHAR(300) NOT NULL,
    description         TEXT,
    scheduled_date      DATE         NOT NULL,
    estimated_minutes   INT          NOT NULL DEFAULT 60,
    actual_minutes      INT          NOT NULL DEFAULT 0,
    status              ENUM('pending','in_progress','completed','skipped')
                            NOT NULL DEFAULT 'pending',
    priority            ENUM('low','medium','high','critical')
                            NOT NULL DEFAULT 'medium',
    progress_percentage FLOAT        NOT NULL DEFAULT 0.0,
    student_notes       TEXT,
    resources           JSON         DEFAULT (JSON_ARRAY()),
    completed_at        DATETIME(6),
    created_at          DATETIME(6)  NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
    updated_at          DATETIME(6)  NOT NULL DEFAULT CURRENT_TIMESTAMP(6)
                                     ON UPDATE CURRENT_TIMESTAMP(6),
    FOREIGN KEY (weekly_plan_id) REFERENCES weekly_plans(id) ON DELETE CASCADE,
    INDEX idx_dt_weekly_plan  (weekly_plan_id),
    INDEX idx_dt_scheduled    (scheduled_date),
    INDEX idx_dt_status       (status),
    INDEX idx_dt_subject      (subject_name)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
"""

ALL_STATEMENTS = [
    ("study_plan_templates", CREATE_STUDY_PLAN_TEMPLATES),
    ("study_plans", CREATE_STUDY_PLANS),
    ("weekly_plans", CREATE_WEEKLY_PLANS),
    ("daily_tasks", CREATE_DAILY_TASKS),
]


def run_migration(connection):
    """Execute all CREATE TABLE statements against *connection*."""
    cursor = connection.cursor()
    for table_name, sql in ALL_STATEMENTS:
        print(f"  Creating table '{table_name}' … ", end="", flush=True)
        cursor.execute(sql)
        print("OK")
    connection.commit()
    cursor.close()
    print("Migration complete.")


if __name__ == "__main__":
    import os
    import pymysql

    conn = pymysql.connect(
        host=os.environ.get("DB_HOST", "localhost"),
        user=os.environ.get("DB_USER", "root"),
        password=os.environ.get("DB_PASSWORD", ""),
        database=os.environ.get("DB_NAME", "mentai"),
        charset="utf8mb4",
    )
    try:
        run_migration(conn)
    finally:
        conn.close()
