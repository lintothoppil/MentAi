from app import app, db, Timetable, Faculty

with app.app_context():
    with open("output_handler.txt", "w", encoding="utf-8") as f:
        f.write("Timetable Handlers:\n")
        seen = set()
        for t in Timetable.query.filter(Timetable.handler_name.isnot(None)):
            if (t.handler_name, t.handler_id) not in seen:
                f.write(f"Handler: {t.handler_name}, ID: {t.handler_id}\n")
                seen.add((t.handler_name, t.handler_id))
        
        f.write("\nFaculties:\n")
        for faculty in Faculty.query.all():
            f.write(f"ID: {faculty.id}, Name: {faculty.name}\n")
