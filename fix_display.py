import re

def fix_underscores_in_display(filepath, fields):
    with open(filepath, "r", encoding="utf-8") as f:
        content = f.read()
    original = content
    for field in fields:
        # Match patterns like {item.field_name} or {n.field_name} or {emp.field_name}
        # but NOT in JSX attribute values like value={...} or in || chains already escaped
        pattern = r'\{([a-zA-Z_][a-zA-Z0-9_]*)\.(' + field + r')\}'
        def replacer(m):
            obj = m.group(1)
            fld = m.group(2)
            return '{String(' + obj + '.' + fld + ' || \'\').replaceAll(\'_\', \' \')}'
        content = re.sub(pattern, replacer, content)
    
    if content != original:
        with open(filepath, "w", encoding="utf-8") as f:
            f.write(content)
        print(f"Fixed: {filepath}")
    else:
        print(f"No change: {filepath}")

files_and_fields = [
    ("src/components/ExecutivePortalWorkspace.tsx",     ["incident_type", "employment_status", "maintenance_type", "work_type"]),
    ("src/components/HRPortalWorkspace.tsx",            ["incident_type", "employment_status", "work_type"]),
    ("src/components/FinancePortalWorkspace.tsx",       ["status", "employment_status"]),
    ("src/components/FieldAdminPortalWorkspace.tsx",    ["incident_type", "employment_status", "maintenance_type", "work_type", "severity"]),
    ("src/components/IncidentReportingWorkspace.tsx",   ["incident_type", "severity", "employment_status"]),
    ("src/components/NotificationWorkspace.tsx",        ["domain"]),
]

for filepath, fields in files_and_fields:
    fix_underscores_in_display(filepath, fields)
