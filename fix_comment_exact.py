for filepath in ["src/components/ExecutivePortalWorkspace.tsx", "src/components/HRPortalWorkspace.tsx"]:
    with open(filepath, "r", encoding="utf-8") as f:
        content = f.read()

    content = content.replace("      PURCHASE ORDER DETAILS MODAL  */}", "      {/*  PURCHASE ORDER DETAILS MODAL  */}")
    with open(filepath, "w", encoding="utf-8") as f:
        f.write(content)
    print(f"Fixed comment in {filepath}")
