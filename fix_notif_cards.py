with open("src/components/NotificationWorkspace.tsx", "r", encoding="utf-8") as f:
    content = f.read()

# KPI cards had explicit bg-white -- make them use the theme card bg
content = content.replace(
    'className="card p-4 bg-white dark:bg-slate-900 border border-border"',
    'className="card p-4 border border-border"'
)

with open("src/components/NotificationWorkspace.tsx", "w", encoding="utf-8") as f:
    f.write(content)
print("Stripped explicit bg from KPI cards")
