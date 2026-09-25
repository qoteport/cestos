for f in ["src/components/ExecutivePortalWorkspace.tsx", "src/components/HRPortalWorkspace.tsx", "src/components/FinancePortalWorkspace.tsx"]:
    with open(f, "r", encoding="utf-8") as fh:
        lines = fh.readlines()
    for i, line in enumerate(lines):
        if "NotificationWorkspace" in line:
            for j in range(max(0,i-4), min(len(lines), i+5)):
                print(str(j) + ": " + lines[j].rstrip().encode("ascii","ignore").decode())
            print("---")
