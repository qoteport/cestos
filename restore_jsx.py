import re
import os

files = [
    'src/components/ExecutivePortalWorkspace.tsx',
    'src/components/HRPortalWorkspace.tsx'
]

for filepath in files:
    full_path = os.path.join(os.getcwd(), filepath)
    with open(full_path, 'r', encoding='utf-8') as f:
        content = f.read()

    # Remove all `<>\n` and `\n</>\n`
    content = re.sub(r'^\s*<>\s*$', '', content, flags=re.MULTILINE)
    content = re.sub(r'^\s*</>\s*$', '', content, flags=re.MULTILINE)
    
    with open(full_path, 'w', encoding='utf-8') as f:
        f.write(content)

    print(f"Cleaned {filepath}")
