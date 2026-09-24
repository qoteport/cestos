import os
import re

# ============================================================
# 1. GLOBAL: Underscore display fix in common display fields
# ============================================================

def replaceAll(content, old, new):
    return content.replace(old, new)

# IncidentReportingWorkspace - incident_type display
for filepath in [
    "src/components/IncidentReportingWorkspace.tsx",
    "src/components/FieldAdminPortalWorkspace.tsx",
    "src/components/HRPortalWorkspace.tsx",
    "src/components/ExecutivePortalWorkspace.tsx",
    "src/components/FinancePortalWorkspace.tsx",
]:
    with open(filepath, "r", encoding="utf-8") as f:
        content = f.read()
    original = content
    # Fix incident_type displayed raw
    content = re.sub(r'\{([a-z_]+)\.incident_type\}', lambda m: '{String(' + m.group(1) + '.incident_type || \'\').replaceAll(\'_\', \' \')}', content)
    content = re.sub(r'\{([a-z_]+)\.severity\}(?!\s*[|?])', lambda m: '{String(' + m.group(1) + '.severity || \'\').replaceAll(\'_\', \' \')}', content)
    content = re.sub(r'\{([a-z_]+)\.employment_status\}', lambda m: '{String(' + m.group(1) + '.employment_status || \'\').replaceAll(\'_\', \' \')}', content)
    content = re.sub(r'\{([a-z_]+)\.work_type\}', lambda m: '{String(' + m.group(1) + '.work_type || \'\').replaceAll(\'_\', \' \')}', content)
    # Fix maintenance_type
    content = re.sub(r'\{([a-z_]+)\.maintenance_type\}', lambda m: '{String(' + m.group(1) + '.maintenance_type || \'\').replaceAll(\'_\', \' \')}', content)

    if content != original:
        with open(filepath, "w", encoding="utf-8") as f:
            f.write(content)
        print(f"Fixed underscore display in {filepath}")
    else:
        print(f"No changes needed: {filepath}")

# ============================================================
# 2. NOTIFICATION WORKSPACE: Fix margin / padding for portal embedding
# ============================================================
with open("src/components/NotificationWorkspace.tsx", "r", encoding="utf-8") as f:
    content = f.read()
original = content

# Reduce outer padding from space-y-6 to space-y-4 when embedded
content = content.replace('<div className="space-y-6 fade-in">', '<div className="space-y-5 fade-in">')
# KPI cards: reduce from gap-4 to gap-3
content = content.replace('<div className="grid grid-cols-2 md:grid-cols-4 gap-4">', '<div className="grid grid-cols-2 md:grid-cols-4 gap-3">')

if content != original:
    with open("src/components/NotificationWorkspace.tsx", "w", encoding="utf-8") as f:
        f.write(content)
    print("Updated NotificationWorkspace padding")

# ============================================================
# 3. EXECUTIVE PORTAL: Fix main page padding / overflow for mobile
# ============================================================
with open("src/components/ExecutivePortalWorkspace.tsx", "r", encoding="utf-8") as f:
    content = f.read()
original = content

# Main container: reduce side padding on mobile
content = content.replace(
    'max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6 pb-24 md:pb-6',
    'max-w-7xl w-full mx-auto px-3 sm:px-6 lg:px-8 py-4 sm:py-6 space-y-4 sm:space-y-6 pb-24 md:pb-6'
)

# Fix maintenance cards overflow
content = content.replace(
    'overflow-x-auto',
    'overflow-x-auto max-w-full'
)

if content != original:
    with open("src/components/ExecutivePortalWorkspace.tsx", "w", encoding="utf-8") as f:
        f.write(content)
    print("Updated Executive Portal mobile layout")

print("All done")
