from app import app, db, Student

with app.app_context():
    with open('batch_dump.txt', 'w', encoding='utf-8') as f:
        for dept in set(s.branch for s in Student.query.all() if s.branch):
            batches = set(s.batch for s in Student.query.filter_by(branch=dept).all())
            f.write(f'{dept} -> {batches}\n')
