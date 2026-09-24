filepath = "src/components/HRPortalWorkspace.tsx"
with open(filepath, "r", encoding="utf-8") as f:
    content = f.read()

start_idx = content.find("TAB 8: NOTIFICATIONS")
if start_idx != -1:
    # Go back to find the {/* comment opener
    start_idx = content.rfind("{/*", 0, start_idx)

end_idx = content.find("</main>", start_idx)

if start_idx == -1 or end_idx == -1:
    print("Could not find markers")
else:
    new_block = """{/*  TAB 8: NOTIFICATIONS  */}
        {activeTab === 'NOTIFICATIONS' && (
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xs overflow-hidden">
            <NotificationWorkspace hideSchedules={true} />
          </div>
        )}

      """
    content = content[:start_idx] + new_block + content[end_idx:]

    # Add import if not there
    if "import NotificationWorkspace" not in content:
        content = content.replace(
            "import useNotificationData from './useNotificationData';",
            "import useNotificationData from './useNotificationData';\nimport NotificationWorkspace from './NotificationWorkspace';"
        )

    with open(filepath, "w", encoding="utf-8") as f:
        f.write(content)
    print("Replaced HR notification block successfully")
