from services.batch_service import get_course_max_batches

test_cases = [
    "Department of Computer Applications",
    "MCA",
    "IMCA", 
    "Department of Business Administration",
    "MBA",
    "Computer Science and Engineering (CSE)",
    "Electrical and Electronics Engineering (EEE)",
    "Mechanical Engineering (ME)",
    "Civil Engineering (CE)",
    "Electronics and Communication Engineering (ECE)",
]

for course in test_cases:
    result = get_course_max_batches(course)
    print(f"{course:50} → {result} batches")
