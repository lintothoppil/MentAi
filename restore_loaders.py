import os
import re

directory = r"d:\mentAi\src\pages"

def process_file(filepath):
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()
        
    if '<NotebookLoader size="sm"' not in content:
        return

    original_content = content

    print(f"Restoring in {filepath}")

    # Replace small notebook loader with Loader2
    content = re.sub(
        r'<NotebookLoader size="sm" [^>]*>', 
        '<Loader2 className="mr-2 h-4 w-4 animate-spin" />', 
        content
    )

    if '<Loader2' in content:
        # Check if Loader2 is already imported
        lucide_import = re.search(r'import\s*{([^}]*)}\s*from\s*["\']lucide-react["\'];?', content)
        if lucide_import:
            if 'Loader2' not in lucide_import.group(1):
                # Add to existing import
                new_import = lucide_import.group(0).replace('{', '{ Loader2, ')
                content = content.replace(lucide_import.group(0), new_import)
        else:
            # find last import
            imports = list(re.finditer(r'^import .*[\n\r]*', content, re.MULTILINE))
            if imports:
                last_import = imports[-1]
                insert_index = last_import.end()
                content = content[:insert_index] + 'import { Loader2 } from "lucide-react";\n' + content[insert_index:]

    # if NotebookLoader is no longer used, remove its import
    if '<NotebookLoader' not in content:
        content = re.sub(r'import\s*{\s*NotebookLoader\s*}\s*from\s*["\']@/components/ui/NotebookLoader["\'];?\s*', '', content)

    if original_content != content:
        with open(filepath, 'w', encoding='utf-8') as f:
            f.write(content)
        print(f"Updated {filepath}")

for root, dirs, files in os.walk(directory):
    for file in files:
        if file.endswith('.tsx') or file.endswith('.ts'):
            filepath = os.path.join(root, file)
            process_file(filepath)
