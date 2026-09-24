filepath = "src/components/HRPortalWorkspace.tsx"
with open(filepath, "r", encoding="utf-8") as f:
    content = f.read()

start_marker = "{/*  TAB 8: NOTIFICATIONS  */}"
end_marker = "</main>"

start_idx = content.find(start_marker)
end_idx = content.find(end_marker, start_idx)

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
    with open(filepath, "w", encoding="utf-8") as f:
        f.write(content)
    print("Replaced HR notification block")
