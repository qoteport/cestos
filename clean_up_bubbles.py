for filepath in ["src/components/ExecutivePortalWorkspace.tsx", "src/components/HRPortalWorkspace.tsx"]:
    with open(filepath, "r", encoding="utf-8") as f:
        lines = f.readlines()
    
    new_lines = []
    skip = False
    for line in lines:
        if "className=\"fixed bottom-6 right-6 z-50 flex items-center gap-2.5" in line or "<span>{unresolvedClaimsCount} Unresolved Claims</span>" in line or "FLOATING BUBBLE FOR UNRESOLVED CLAIMS" in line:
            continue
        if "animate-bounce\"" in line or "animate-ping\"" in line and "unresolved" not in line and "badge" not in line:
            if "bg-amber-500" in line or "fixed bottom" in line:
                continue
        if "<FileText size={16} />" in line and len(new_lines) > 0 and "</main>" in new_lines[-1]:
            continue
        new_lines.append(line)

    with open(filepath, "w", encoding="utf-8") as f:
        f.writelines(new_lines)
    print(f"Cleaned up {filepath}")
