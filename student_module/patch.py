import os
import re

app_path = "app.py"

with open(app_path, "r", encoding="utf-8") as f:
    content = f.read()

# 1. Add route for bulk upload
bulk_upload_route = """
@app.route('/api/admin/students/bulk-upload', methods=['POST'])
def api_admin_bulk_upload_students():
    try:
        from bulk_upload import bulk_upload_students
        if 'file' not in request.files:
            return jsonify({'success': False, 'message': 'No file uploaded'}), 400
        
        file = request.files['file']
        if file.filename == '':
            return jsonify({'success': False, 'message': 'Empty file selected'}), 400
            
        result = bulk_upload_students(file)
        return jsonify({'success': result['failed'] == 0, 'data': result})
    except Exception as e:
        return jsonify({'success': False, 'message': str(e)}), 500
"""

if "api_admin_bulk_upload_students" not in content:
    content += "\n" + bulk_upload_route + "\n"

# 2. Add calculate_academic_status to API responses returning student lists
# We will do this via a small search-and-replace using regex, but doing it safely.
# Wait, let's just make sure we import it first.

if "from academic_utils import calculate_academic_status" not in content:
    content = "from academic_utils import calculate_academic_status\n" + content

# Instead of doing a complex regex string replacement, we can write a wrapper loop for the student list endpoints.
# The user wants "The Flask APIs must never return raw batch year without also computing and returning current_semester and student_status".
# Let's find common dictionary builds like `'batch': s.batch,` or `'branch': s.branch,` and inject our computed values.
# Or better, just patch `app.py` in the exact places.

# For example, in api_admin_students, or api_handler_students:
# Let's write the modified version back
with open(app_path, "w", encoding="utf-8") as f:
    f.write(content)

print("App patched with bulk-upload and imports.")
