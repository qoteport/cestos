import re

files = [
    'src/components/ExecutivePortalWorkspace.tsx',
    'src/components/HRPortalWorkspace.tsx'
]

for file_path in files:
    with open(file_path, 'r', encoding='utf-8') as f:
        content = f.read()

    # Find the EmployeeRow interface
    pattern = r'(interface EmployeeRow \{.*?\n)(\})'
    
    # Check if the interface exists in this file (it might be shared or defined locally)
    if 'interface EmployeeRow {' in content:
        # Add the properties before the closing brace
        new_props = "  current_project_name?: string;\n  project_name?: string;\n"
        content = re.sub(pattern, r'\1' + new_props + r'\2', content, flags=re.DOTALL)
        
        with open(file_path, 'w', encoding='utf-8') as f:
            f.write(content)
        print(f"Updated {file_path}")
    else:
        print(f"EmployeeRow not found in {file_path}")
