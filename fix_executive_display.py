import re

filepath = "src/components/ExecutivePortalWorkspace.tsx"
with open(filepath, "r", encoding="utf-8") as f:
    content = f.read()
original = content

# Target raw display patterns - look in JSX context (between > and <)
# These are the typical patterns: inc.incident_type, incident.severity etc
patterns = [
    # Incident type cells
    (r'\{inc\.incident_type\}', "{String(inc.incident_type || '').replaceAll('_', ' ')}"),
    (r'\{incident\.incident_type\}', "{String(incident.incident_type || '').replaceAll('_', ' ')}"),
    (r'\{item\.incident_type\}', "{String(item.incident_type || '').replaceAll('_', ' ')}"),
    (r'\{i\.incident_type\}', "{String(i.incident_type || '').replaceAll('_', ' ')}"),
    # Severity
    (r'\{inc\.severity\}', "{String(inc.severity || '').replaceAll('_', ' ')}"),
    (r'\{incident\.severity\}', "{String(incident.severity || '').replaceAll('_', ' ')}"),
    (r'\{item\.severity\}', "{String(item.severity || '').replaceAll('_', ' ')}"),
    (r'\{i\.severity\}', "{String(i.severity || '').replaceAll('_', ' ')}"),
    # Employment status
    (r'\{emp\.employment_status\}', "{String(emp.employment_status || '').replaceAll('_', ' ')}"),
    (r'\{e\.employment_status\}', "{String(e.employment_status || '').replaceAll('_', ' ')}"),
    (r'\{employee\.employment_status\}', "{String(employee.employment_status || '').replaceAll('_', ' ')}"),
    # Work type
    (r'\{item\.work_type\}', "{String(item.work_type || '').replaceAll('_', ' ')}"),
    (r'\{row\.work_type\}', "{String(row.work_type || '').replaceAll('_', ' ')}"),
    # Maintenance type
    (r'\{item\.maintenance_type\}', "{String(item.maintenance_type || '').replaceAll('_', ' ')}"),
    (r'\{row\.maintenance_type\}', "{String(row.maintenance_type || '').replaceAll('_', ' ')}"),
    # Display type  
    (r'\{item\.display_type\}', "{String(item.display_type || '').replaceAll('_', ' ')}"),
    (r'\{row\.display_type\}', "{String(row.display_type || '').replaceAll('_', ' ')}"),
]

for pattern, replacement in patterns:
    content = re.sub(pattern, replacement, content)

if content != original:
    with open(filepath, "w", encoding="utf-8") as f:
        f.write(content)
    print(f"Fixed Executive Portal underscore display")
else:
    print("No matches found - patterns may differ")
    # Debug: show what patterns exist
    for var in ['inc.', 'item.', 'row.', 'i.', 'emp.', 'incident.']:
        matches = [m.group() for m in re.finditer(r'\{' + var.replace('.', r'\.') + r'[a-zA-Z_]+\}', content)]
        if matches:
            print(f"  Found: {set(matches[:5])}")
