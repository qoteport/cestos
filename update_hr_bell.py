filepath = "src/components/HRPortalWorkspace.tsx"
with open(filepath, "r", encoding="utf-8") as f:
    content = f.read()

if "import useNotificationCount" not in content:
    content = content.replace(
        "import NotificationWorkspace from './NotificationWorkspace';",
        "import NotificationWorkspace from './NotificationWorkspace';\nimport useNotificationCount from './useNotificationCount';"
    )

if "const notificationCount = useNotificationCount();" not in content:
    content = content.replace(
        "export default function HRPortalWorkspace() {",
        "export default function HRPortalWorkspace() {\n  const notificationCount = useNotificationCount();"
    )

target = """            <button
              onClick={() => setActiveTab('NOTIFICATIONS')}
              className="relative p-2 rounded-xl border border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 transition"
              title="Notifications"
            >
              <Bell size={16} />
              {unresolvedClaimsCount > 0 && (
                <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 text-white text-[9px] font-bold rounded-full flex items-center justify-center border-2 border-white dark:border-slate-950">
                  {unresolvedClaimsCount}
                </span>
              )}
            </button>"""

replacement = """            <button
              onClick={() => setActiveTab('NOTIFICATIONS')}
              className={`relative p-2 rounded-xl border transition ${
                notificationCount > 0
                  ? 'border-emerald-300 dark:border-emerald-800 bg-emerald-50/80 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400'
                  : 'border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300'
              }`}
              title={notificationCount > 0 ? `${notificationCount} new notifications` : 'Notifications'}
            >
              <Bell size={16} className={notificationCount > 0 ? 'text-emerald-600 dark:text-emerald-400 animate-pulse' : ''} />
              {notificationCount > 0 && (
                <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 bg-red-500 text-white text-[9px] font-bold rounded-full flex items-center justify-center border-2 border-white dark:border-slate-950 shadow-xs">
                  {notificationCount > 99 ? '99+' : notificationCount}
                </span>
              )}
            </button>"""

if target in content:
    content = content.replace(target, replacement)

with open(filepath, "w", encoding="utf-8") as f:
    f.write(content)
print("Successfully updated HR Bell icon!")
