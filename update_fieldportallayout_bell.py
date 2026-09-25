filepath = "src/components/FieldPortalLayout.tsx"
with open(filepath, "r", encoding="utf-8") as f:
    content = f.read()

target = """            <Link
              href="/field-portal/notifications"
              title="Notifications"
              aria-label={`Notifications${unreadNotifications ? `, ${unreadNotifications} unread` : ''}`}
              className="relative p-2 text-blue-800 bg-blue-50 border border-blue-200 hover:bg-blue-100 focus-visible:ring-2 focus-visible:ring-blue-600 rounded-lg"
            >
              <Bell className="h-5 w-5" />
              {unreadNotifications > 0 && <span className="absolute -top-1 -right-1 min-w-5 h-5 px-1 rounded-full bg-red-600 text-white ring-2 ring-white text-[10px] leading-5 text-center font-bold">{unreadNotifications > 99 ? '99+' : unreadNotifications}</span>}
            </Link>"""

replacement = """            <Link
              href="/field-portal/notifications"
              title={unreadNotifications > 0 ? `${unreadNotifications} new notifications` : 'Notifications'}
              aria-label={`Notifications${unreadNotifications ? `, ${unreadNotifications} unread` : ''}`}
              className={`relative p-2 rounded-lg border transition ${
                unreadNotifications > 0
                  ? 'bg-amber-50 border-amber-300 text-amber-700 dark:bg-amber-950/40 dark:border-amber-800 dark:text-amber-400'
                  : 'text-blue-800 bg-blue-50 border-blue-200 hover:bg-blue-100'
              }`}
            >
              <Bell className={`h-5 w-5 ${unreadNotifications > 0 ? 'text-amber-600 dark:text-amber-400 animate-pulse' : ''}`} />
              {unreadNotifications > 0 && (
                <span className="absolute -top-1 -right-1 min-w-5 h-5 px-1 rounded-full bg-red-600 text-white ring-2 ring-white text-[10px] leading-5 text-center font-bold">
                  {unreadNotifications > 99 ? '99+' : unreadNotifications}
                </span>
              )}
            </Link>"""

if target in content:
    content = content.replace(target, replacement)

with open(filepath, "w", encoding="utf-8") as f:
    f.write(content)
print("Successfully updated FieldPortalLayout Bell icon!")
