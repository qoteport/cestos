import re

for filepath in ["src/components/ExecutivePortalWorkspace.tsx", "src/components/HRPortalWorkspace.tsx"]:
    with open(filepath, "r", encoding="utf-8") as f:
        content = f.read()

    # Replace any comment matching PURCHASE ORDER DETAILS MODAL with standard JSX comment
    content = re.sub(r'\{\/\*\s*PURCHASE ORDER DETAILS MODAL.*?\*\/\}', '{/* PURCHASE ORDER DETAILS MODAL */}', content)

    with open(filepath, "w", encoding="utf-8") as f:
        f.write(content)
    print(f"Cleaned PO comment in {filepath}")
