import re
import os

files = [
    'src/components/ExecutivePortalWorkspace.tsx',
    'src/components/HRPortalWorkspace.tsx',
    'src/components/FinancePortalWorkspace.tsx',
    'src/components/FieldAdminPortalWorkspace.tsx'
]

bottom_nav_template = """
      {/* Mobile Bottom Navigation Tabbar */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-t border-slate-200 dark:border-slate-800 flex justify-around items-center h-16 px-1 shadow-[0_-4px_20px_-10px_rgba(0,0,0,0.1)] no-print">
        {navItems.map((item) => {
          const IconComp = item.icon;
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={`flex flex-col items-center justify-center w-full h-full space-y-1 transition ${
                isActive
                  ? 'text-indigo-600 dark:text-indigo-400'
                  : 'text-slate-500 hover:text-slate-900 dark:hover:text-slate-300'
              }`}
            >
              <div className="relative">
                <IconComp size={20} className={isActive ? 'opacity-100' : 'opacity-70'} />
                {item.badge !== undefined && item.badge > 0 && (
                  <span className="absolute -top-1.5 -right-2 px-1 py-0.5 rounded-full text-[8px] font-black bg-amber-500 text-white min-w-[14px] text-center">
                    {item.badge}
                  </span>
                )}
              </div>
              <span className={`text-[9px] font-bold tracking-tight truncate w-full text-center px-1 ${isActive ? '' : 'opacity-70'}`}>
                {item.label}
              </span>
            </button>
          );
        })}
      </nav>
"""

for filepath in files:
    full_path = os.path.join(os.getcwd(), filepath)
    with open(full_path, 'r', encoding='utf-8') as f:
        content = f.read()

    # 1. Hide hamburger buttons.
    # In Exec/HR: <button ... onClick={() => setMobileMenuOpen(!mobileMenuOpen)} className="md:hidden
    # In Finance/FieldAdmin: <button className="sm:hidden p-1.5 text-slate-600" onClick={() => setMobileMenuOpen(!mobileMenuOpen)}>
    
    # We'll use regex to find the hamburger button and add !hidden to its class
    content = re.sub(
        r'(<button[^>]*className="[^"]*)(hidden)([^"]*"[^>]*onClick=\{\(\) => setMobileMenuOpen\(!mobileMenuOpen\)\})', 
        r'\1!hidden\3', 
        content
    )
    content = re.sub(
        r'(<button[^>]*onClick=\{\(\) => setMobileMenuOpen\(!mobileMenuOpen\)\}[^>]*className="[^"]*)(hidden)([^"]*")', 
        r'\1!hidden\3', 
        content
    )

    # 2. Add padding to <main>
    # <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
    content = re.sub(r'(<main[^>]*className=")([^"]*)(")', r'\1\2 pb-24 md:pb-6\3', content)

    # 3. Inject Bottom Nav right before the last </div>
    last_div_idx = content.rfind('</div>\n  );\n}')
    if last_div_idx != -1:
        content = content[:last_div_idx] + bottom_nav_template + content[last_div_idx:]

    with open(full_path, 'w', encoding='utf-8') as f:
        f.write(content)

    print(f"Updated {filepath}")
