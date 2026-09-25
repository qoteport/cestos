filepath = "src/components/FieldAdminPortalWorkspace.tsx"
with open(filepath, "r", encoding="utf-8") as f:
    content = f.read()

if "import useNotificationCount" not in content:
    content = content.replace(
        "import NotificationWorkspace from './NotificationWorkspace';",
        "import NotificationWorkspace from './NotificationWorkspace';\nimport useNotificationCount from './useNotificationCount';"
    )

content = content.replace(
    "HardHat, User, Wrench,",
    "HardHat, Bell, User, Wrench,"
)

if "const notificationCount = useNotificationCount();" not in content:
    content = content.replace(
        "export default function FieldAdminPortalWorkspace() {",
        "export default function FieldAdminPortalWorkspace() {\n  const notificationCount = useNotificationCount();"
    )

target = """            <button
              onClick={() => void signOut()}
              className="p-2 rounded-xl border border-slate-200 dark:border-slate-800 hover:bg-red-50 dark:hover:bg-red-950/40 text-slate-600 dark:text-slate-300 hover:text-red-600 dark:hover:text-red-400 transition"
              title="Sign Out"
            >
              <LogOut size={16} />
            </button>"""

replacement = """            <button
              onClick={() => setActiveTab('NOTIFICATIONS')}
              className={`relative p-2 rounded-xl border transition ${
                notificationCount > 0
                  ? 'border-orange-300 dark:border-orange-800 bg-orange-50/80 dark:bg-orange-950/50 text-orange-600 dark:text-orange-400'
                  : 'border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300'
              }`}
              title={notificationCount > 0 ? `${notificationCount} new notifications` : 'Notifications'}
            >
              <Bell size={16} className={notificationCount > 0 ? 'text-orange-600 dark:text-orange-400 animate-pulse' : ''} />
              {notificationCount > 0 && (
                <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 bg-red-500 text-white text-[9px] font-bold rounded-full flex items-center justify-center border-2 border-white dark:border-slate-950 shadow-xs">
                  {notificationCount > 99 ? '99+' : notificationCount}
                </span>
              )}
            </button>

            <button
              onClick={() => void signOut()}
              className="p-2 rounded-xl border border-slate-200 dark:border-slate-800 hover:bg-red-50 dark:hover:bg-red-950/40 text-slate-600 dark:text-slate-300 hover:text-red-600 dark:hover:text-red-400 transition"
              title="Sign Out"
            >
              <LogOut size={16} />
            </button>"""

if target in content:
    content = content.replace(target, replacement)

with open(filepath, "w", encoding="utf-8") as f:
    f.write(content)
print("Successfully updated FieldAdmin Bell icon!")
