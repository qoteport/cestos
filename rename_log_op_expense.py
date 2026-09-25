filepaths = [
    "src/components/FieldAdminPortalWorkspace.tsx",
    "src/components/OperationalExpenseSubmissionModal.tsx"
]

for filepath in filepaths:
    with open(filepath, "r", encoding="utf-8") as f:
        content = f.read()
    if "Log Operational Expense" in content:
        content = content.replace("Log Operational Expense", "Submit Operational Expense Claim")
        with open(filepath, "w", encoding="utf-8") as f:
            f.write(content)
        print(f"Updated {filepath} successfully!")
    else:
        print(f"Target not found in {filepath}")
