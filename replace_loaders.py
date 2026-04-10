import os
import re

directory = r"d:\mentAi\src\pages"

def process_file(filepath):
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()
        
    if 'animate-spin' not in content:
        return

    original_content = content

    print(f"Processing {filepath}")

    # Add import if needed
    if 'NotebookLoader' not in content:
        # Find the last import
        imports = re.finditer(r'^import .*;\n', content, re.MULTILINE)
        last_import = list(imports)[-1]
        insert_index = last_import.end()
        content = content[:insert_index] + 'import { NotebookLoader } from "@/components/ui/NotebookLoader";\n' + content[insert_index:]

    # Replace SVG loaders
    svg_pattern = r'<svg [^>]*animate-spin[^>]*>.*?<\/svg>'
    content = re.sub(svg_pattern, '<NotebookLoader size="sm" className="mr-2 text-current" />', content, flags=re.DOTALL)

    # Replace Loader2 h-8 w-8 or h-4 w-4
    
    # Large loader
    content = re.sub(r'<Loader2 className="[^"]*h-8 w-8[^"]*animate-spin[^"]*" />', 
                     '<NotebookLoader size="lg" className="text-primary" />', content)
                     
    # Small loader inside buttons
    content = re.sub(r'<Loader2 className="[^"]*h-4 w-4[^"]*animate-spin[^"]*" />', 
                     '<NotebookLoader size="sm" className="mr-2 text-current" />', content)

    # Small loader fallback
    content = re.sub(r'<Loader2 [^>]*animate-spin[^>]*>', 
                     '<NotebookLoader size="sm" className="mr-2 text-current" />', content)

    # Clean up any leftover Loader2 imports if it's no longer used
    if '<Loader2' not in content:
        content = re.sub(r',\s*Loader2', '', content)
        content = re.sub(r'Loader2\s*,', '', content)
        content = re.sub(r'import\s*{\s*Loader2\s*}\s*from\s*["\']lucide-react["\'];\n', '', content)
        
    if original_content != content:
        with open(filepath, 'w', encoding='utf-8') as f:
            f.write(content)
        print(f"Updated {filepath}")

for root, dirs, files in os.walk(directory):
    for file in files:
        if file.endswith('.tsx') or file.endswith('.ts'):
            filepath = os.path.join(root, file)
            process_file(filepath)
