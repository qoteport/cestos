with open('src/components/ExecutivePortalWorkspace.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

start_idx = content.find('TAB 8: NOTIFICATIONS')
if start_idx == -1:
    print('Not found')
else:
    # go back to the `{/*` part
    start_idx = content.rfind('{/*', 0, start_idx)
    end_idx = content.find('</main>', start_idx)
    
    new_block = """{/*  TAB 8: NOTIFICATIONS  */}
        {activeTab === 'NOTIFICATIONS' && (
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xs overflow-hidden">
            <NotificationWorkspace hideSchedules={true} />
          </div>
        )}
      """
    
    content = content[:start_idx] + new_block + content[end_idx:]
    with open('src/components/ExecutivePortalWorkspace.tsx', 'w', encoding='utf-8') as f:
        f.write(content)
    print('Replaced TAB 8 block successfully!')
