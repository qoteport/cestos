import re

def fix_file(filepath, changes):
    with open(filepath, "r", encoding="utf-8") as f:
        content = f.read()
    original = content
    for old, new in changes:
        content = content.replace(old, new)
    if content != original:
        with open(filepath, "w", encoding="utf-8") as f:
            f.write(content)
        print(f"Updated {filepath}")
    else:
        print(f"No change: {filepath}")

# === 1. NOTIFICATION WORKSPACE: Fix header title and subtitle ===
fix_file("src/components/NotificationWorkspace.tsx", [
    (
        "fieldPortal ? 'Field Notifications' : 'Notifications & Scheduling Command Center'",
        "fieldPortal ? 'Field Notifications' : 'Notification Queue'"
    ),
    (
        "fieldPortal ? 'Your project assignments, maintenance tasks, contract reminders, and leave updates.' : 'Automated rules across Projects, Workforce, Equipment, Inventory, Finance, and HSE'",
        "fieldPortal ? 'Your project assignments, maintenance tasks, contract reminders, and leave updates.' : 'Review and act on system alerts across all operations.'"
    ),
])

# === 2. ALL PORTALS: Remove label spans from bottom nav buttons, tighten height ===
portal_files = [
    "src/components/ExecutivePortalWorkspace.tsx",
    "src/components/HRPortalWorkspace.tsx",
    "src/components/FinancePortalWorkspace.tsx",
    "src/components/FieldAdminPortalWorkspace.tsx",
]

# Old nav item template with label
old_nav_class_h16 = 'flex justify-around items-center h-16 px-1 shadow-[0_-4px_20px_-10px_rgba(0,0,0,0.1)] no-print'
new_nav_class_h14 = 'flex justify-around items-center h-14 px-1 shadow-[0_-4px_20px_-10px_rgba(0,0,0,0.1)] no-print'

old_btn_class = 'flex flex-col items-center justify-center w-full h-full space-y-1 transition'
new_btn_class = 'flex flex-col items-center justify-center w-full h-full transition'

# Old label span
old_label_span = '''              <span className={`text-[9px] font-bold tracking-tight truncate w-full text-center px-1 ${isActive ? '' : 'opacity-70'}`}>
                {item.label}
              </span>'''
new_label_span = ''  # remove it entirely

for filepath in portal_files:
    with open(filepath, "r", encoding="utf-8") as f:
        content = f.read()
    original = content
    content = content.replace(old_nav_class_h16, new_nav_class_h14)
    content = content.replace(old_btn_class, new_btn_class)
    # Remove the label span - look for the span pattern in each file more flexibly
    # Different files might have slightly different whitespace
    content = re.sub(
        r'\s*<span className=\{`text-\[9px\] font-bold tracking-tight truncate w-full text-center px-1 \$\{isActive \? \'\' : \'opacity-70\'\}`\}>\s*\{item\.label\}\s*</span>',
        '',
        content
    )
    if content != original:
        with open(filepath, "w", encoding="utf-8") as f:
            f.write(content)
        print(f"Updated bottom nav in {filepath}")

# === 3. GLOBAL UNDERSCORE -> SPACE: In incident/category display contexts ===
# Add replaceAll('_', ' ') in the incident type display in IncidentDetailModal
fix_file("src/components/IncidentDetailModal.tsx", [
    (
        "{incident.incident_type || 'INCIDENT'}",
        "{String(incident.incident_type || 'INCIDENT').replaceAll('_', ' ')}"
    ),
    (
        "{incident.severity || 'MEDIUM'}",
        "{String(incident.severity || 'MEDIUM').replaceAll('_', ' ')}"
    ),
    (
        "{incident.status || 'OPEN'}",
        "{String(incident.status || 'OPEN').replaceAll('_', ' ')}"
    ),
])

print("Done")
