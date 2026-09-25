filepath = "src/components/HRPortalWorkspace.tsx"
with open(filepath, "r", encoding="utf-8") as f:
    content = f.read()

idx = content.find("FLOATING BUBBLE FOR UNRESOLVED CLAIMS")
if idx != -1:
    start_idx = content.rfind("{/*", 0, idx)
    end_idx = content.find(")}", idx) + 2
    content = content[:start_idx] + content[end_idx:]
    with open(filepath, "w", encoding="utf-8") as f:
        f.write(content)
    print("Successfully removed unresolved claims bubble from HRPortalWorkspace!")
else:
    print("Bubble comment not found in HRPortalWorkspace")
