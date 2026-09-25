for filepath in ["src/components/HRPortalWorkspace.tsx"]:
    with open(filepath, "r", encoding="utf-8") as f:
        content = f.read()
    original = content

    content = content.replace(
        "{inc.severity || 'MEDIUM'}",
        "{String(inc.severity || 'MEDIUM').replaceAll('_', ' ')}"
    )
    content = content.replace(
        "{inc.incident_type || 'HAZARD'}",
        "{String(inc.incident_type || 'HAZARD').replaceAll('_', ' ')}"
    )

    if content != original:
        with open(filepath, "w", encoding="utf-8") as f:
            f.write(content)
        print(f"Fixed {filepath}")
