import os

field_admin = 'src/components/FieldAdminPortalWorkspace.tsx'
finance = 'src/components/FinancePortalWorkspace.tsx'

with open(field_admin, 'r', encoding='utf-8') as f:
    content = f.read()
    
# Replace navItems in the bottom nav of FieldAdmin
content = content.replace('{navItems.map((item) => {', '{tabs.map((item) => {')
# Fix icon component rendering (since it's a ReactNode)
# wait, my injected bottom nav looks like:
# const IconComp = item.icon;
# <IconComp size={20} className={isActive ? 'opacity-100' : 'opacity-70'} />
# Let's just replace the whole bottom nav block in FieldAdmin
import re
content = re.sub(
    r'<nav className="md:hidden fixed bottom-0.*?nav>',
    """<nav className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-t border-slate-200 dark:border-slate-800 flex justify-around items-center h-16 px-1 shadow-[0_-4px_20px_-10px_rgba(0,0,0,0.1)] no-print">
        {tabs.map((t) => {
          const isActive = activeTab === t.id;
          return (
            <button
              key={t.id}
              onClick={() => setActiveTab(t.id)}
              className={`flex flex-col items-center justify-center w-full h-full space-y-1 transition ${
                isActive
                  ? 'text-orange-600 dark:text-orange-400'
                  : 'text-slate-500 hover:text-slate-900 dark:hover:text-slate-300'
              }`}
            >
              <div className={`relative ${isActive ? 'opacity-100' : 'opacity-70'}`}>
                {t.icon}
              </div>
              <span className={`text-[9px] font-bold tracking-tight truncate w-full text-center px-1 ${isActive ? '' : 'opacity-70'}`}>
                {t.label}
              </span>
            </button>
          );
        })}
      </nav>""",
    content,
    flags=re.DOTALL
)

with open(field_admin, 'w', encoding='utf-8') as f:
    f.write(content)
    
# Now fix FinancePortalWorkspace.tsx
with open(finance, 'r', encoding='utf-8') as f:
    content = f.read()

# Add badge?: number to FinanceTab interface
# wait, navItems is defined as `const navItems = [...]`. Let's just remove the badge code from Finance bottom nav!
content = re.sub(
    r'\{item\.badge \!== undefined && item\.badge > 0 && \([\s\S]*?</span>\s*\)\}',
    '',
    content
)

with open(finance, 'w', encoding='utf-8') as f:
    f.write(content)

print("Fixed FieldAdmin and Finance bottom navs")
