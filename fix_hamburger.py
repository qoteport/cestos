import re
import os

files = [
    'src/components/ExecutivePortalWorkspace.tsx',
    'src/components/HRPortalWorkspace.tsx',
    'src/components/FinancePortalWorkspace.tsx',
    'src/components/FieldAdminPortalWorkspace.tsx'
]

for filepath in files:
    full_path = os.path.join(os.getcwd(), filepath)
    with open(full_path, 'r', encoding='utf-8') as f:
        content = f.read()

    # Change "md:!hidden" back to "hidden"
    content = content.replace('className="md:!hidden ', 'className="!hidden ')
    content = content.replace('className="sm:!hidden ', 'className="!hidden ')
    
    with open(full_path, 'w', encoding='utf-8') as f:
        f.write(content)

    print(f"Fixed {filepath}")
