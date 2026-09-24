import os
import re

filepath = 'src/components/ExecutivePortalWorkspace.tsx'
with open(filepath, 'r', encoding='utf-8') as f:
    content = f.read()

# 1. Imports
if 'NotificationWorkspace' not in content:
    content = content.replace("import React, { useState, useEffect, useMemo, useCallback } from 'react';", "import React, { useState, useEffect, useMemo, useCallback } from 'react';\nimport NotificationWorkspace from './NotificationWorkspace';\nimport useNotificationCount from './useNotificationCount';")

# 2. Hook
if 'const notificationCount = useNotificationCount();' not in content:
    content = content.replace('export default function ExecutivePortalWorkspace() {', 'export default function ExecutivePortalWorkspace() {\n  const notificationCount = useNotificationCount();')

# 3. Badge
bell_block_old = """
            <button
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
            </button>
"""
bell_block_new = """
            <button
              onClick={() => setActiveTab('NOTIFICATIONS')}
              className="relative p-2 rounded-xl border border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 transition"
              title="Notifications"
            >
              <Bell size={16} />
              {notificationCount > 0 && (
                <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 text-white text-[9px] font-bold rounded-full flex items-center justify-center border-2 border-white dark:border-slate-950">
                  {notificationCount}
                </span>
              )}
            </button>
"""
# Note: Since there might be slight whitespace differences, we can use regex.
content = re.sub(
    r'<button[^>]+onClick\{\(\) => setActiveTab\(\'NOTIFICATIONS\'\)\}[^>]+>\s*<Bell size=\{16\} />\s*\{unresolvedClaimsCount > 0 && \(\s*<span[^>]+>\s*\{unresolvedClaimsCount\}\s*</span>\s*\)\}\s*</button>',
    r'<button\n              onClick={() => setActiveTab(\'NOTIFICATIONS\')}\n              className="relative p-2 rounded-xl border border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 transition"\n              title="Notifications"\n            >\n              <Bell size={16} />\n              {notificationCount > 0 && (\n                <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 text-white text-[9px] font-bold rounded-full flex items-center justify-center border-2 border-white dark:border-slate-950">\n                  {notificationCount}\n                </span>\n              )}\n            </button>',
    content
)

# 4. Render block
# Replace everything from `{activeTab === 'NOTIFICATIONS' && (` down to `</main>` 
# Wait, replacing everything is dangerous. Let's find the specific block.
start_idx = content.find("{/*  TAB 8: NOTIFICATIONS  */}")
end_idx = content.find("</main>", start_idx)

if start_idx != -1 and end_idx != -1:
    old_block = content[start_idx:end_idx]
    new_block = "{/*  TAB 8: NOTIFICATIONS  */}\n        {activeTab === 'NOTIFICATIONS' && (\n          <NotificationWorkspace hideSchedules={true} />\n        )}\n\n      "
    content = content[:start_idx] + new_block + content[end_idx:]
else:
    print("Could not find TAB 8 block")

with open(filepath, 'w', encoding='utf-8') as f:
    f.write(content)
print("Updated ExecutivePortalWorkspace")
