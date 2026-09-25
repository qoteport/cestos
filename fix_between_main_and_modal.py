for filepath in ["src/components/ExecutivePortalWorkspace.tsx", "src/components/HRPortalWorkspace.tsx"]:
    with open(filepath, "r", encoding="utf-8") as f:
        content = f.read()
    
    idx_main = content.find("</main>")
    idx_po = content.find("PURCHASE ORDER DETAILS MODAL")
    if idx_po == -1:
        idx_po = content.find("{/*")
        # Find the next comment after main
        idx_po = content.find("{/*", idx_main + 7)

    if idx_main != -1 and idx_po != -1:
        content = content[:idx_main + 7] + "\n\n      " + content[idx_po:]
        with open(filepath, "w", encoding="utf-8") as f:
            f.write(content)
        print(f"Fixed {filepath}")
    else:
        print(f"Indices not found in {filepath}: main={idx_main}, po={idx_po}")
