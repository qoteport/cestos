import re

# 1. Remove wrapper div from Executive portal
with open("src/components/ExecutivePortalWorkspace.tsx", "r", encoding="utf-8") as f:
    content = f.read()
content = content.replace(
    '{activeTab === \'NOTIFICATIONS\' && (\n          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xs overflow-hidden">\n            <NotificationWorkspace hideSchedules={true} />\n          </div>\n        )}',
    "{activeTab === 'NOTIFICATIONS' && (\n          <NotificationWorkspace hideSchedules={true} />\n        )}"
)
with open("src/components/ExecutivePortalWorkspace.tsx", "w", encoding="utf-8") as f:
    f.write(content)
print("Fixed Executive")

# 2. Remove wrapper div from HR portal
with open("src/components/HRPortalWorkspace.tsx", "r", encoding="utf-8") as f:
    content = f.read()
content = content.replace(
    '{activeTab === \'NOTIFICATIONS\' && (\n          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xs overflow-hidden">\n            <NotificationWorkspace hideSchedules={true} />\n          </div>\n        )}',
    "{activeTab === 'NOTIFICATIONS' && (\n          <NotificationWorkspace hideSchedules={true} />\n        )}"
)
with open("src/components/HRPortalWorkspace.tsx", "w", encoding="utf-8") as f:
    f.write(content)
print("Fixed HR")

# 3. Remove the inline padding from NotificationWorkspace root wrapper
# Now it sits bare on the page - the page already has its own padding
with open("src/components/NotificationWorkspace.tsx", "r", encoding="utf-8") as f:
    content = f.read()
content = content.replace(
    '<div className="space-y-5 fade-in p-5 sm:p-6">',
    '<div className="space-y-5 fade-in px-1">'
)
with open("src/components/NotificationWorkspace.tsx", "w", encoding="utf-8") as f:
    f.write(content)
print("Fixed NotificationWorkspace padding")
