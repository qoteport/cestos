import re

files = [
    'src/components/ExecutivePortalWorkspace.tsx',
    'src/components/HRPortalWorkspace.tsx'
]

for filepath in files:
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()

    # Fix location matching
    content = content.replace('locations.find((l) => l.id === emp.home_location_id)?.name', 'locations.find((l) => String(l.id) === String(emp.home_location_id))?.name')

    # Fix StatusBadge
    content = content.replace('<StatusBadge status={emp.is_active ? \'ACTIVE / AVAILABLE\' : \'ARCHIVED\'} />', '<StatusBadge status={emp.employment_status || (emp.is_active ? \'ACTIVE / AVAILABLE\' : \'ARCHIVED\')} />')

    with open(filepath, 'w', encoding='utf-8') as f:
        f.write(content)

    print(f"Updated {filepath}")
