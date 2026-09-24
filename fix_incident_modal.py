import os
import re

filepath = 'src/components/IncidentDetailModal.tsx'
with open(filepath, 'r', encoding='utf-8') as f:
    content = f.read()

# Replace fonts
content = content.replace('font-black', 'font-semibold')
content = content.replace('font-extrabold', 'font-semibold')
content = content.replace('font-bold', 'font-semibold') # Wait, maybe font-semibold is better for most

# Fix the specific grid background.
# We had: <div className={`grid grid-cols-2 md:grid-cols-4 gap-4 p-5 rounded-xl border border-slate-200 dark:border-slate-800 ${lightThemeColor} print:bg-transparent print:border-black print:rounded-none`}>
content = re.sub(
    r'<div className=\{`grid grid-cols-2 md:grid-cols-4 gap-4 p-5 rounded-xl border border-slate-200 dark:border-slate-800 \$\{lightThemeColor\} print:bg-transparent print:border-black print:rounded-none`\}>',
    r'<div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/30 print:bg-transparent print:border-black print:rounded-none">',
    content
)

# Fix Corrective actions styling
# <h4 className="text-sm font-semibold uppercase tracking-wider text-emerald-800 dark:text-emerald-400 border-b border-emerald-200 dark:border-emerald-800 pb-2 print:text-black print:border-black">Immediate Corrective Actions Taken</h4>
content = re.sub(
    r'<h4 className="([^"]*)text-emerald-800 dark:text-emerald-400 border-b border-emerald-200 dark:border-emerald-800([^"]*)">Immediate Corrective Actions Taken</h4>',
    r'<h4 className="\1text-slate-800 dark:text-slate-200 border-b border-slate-200 dark:border-slate-700\2">Immediate Corrective Actions Taken</h4>',
    content
)

# <div className="text-sm text-emerald-950 dark:text-emerald-100 leading-relaxed whitespace-pre-wrap font-medium p-4 bg-emerald-50 dark:bg-emerald-900/20 rounded-xl border border-emerald-100 dark:border-emerald-800/50 print:bg-transparent print:p-0 print:border-none print:text-black">
content = re.sub(
    r'<div className="text-sm text-emerald-950 dark:text-emerald-100 leading-relaxed whitespace-pre-wrap font-medium p-4 bg-emerald-50 dark:bg-emerald-900/20 rounded-xl border border-emerald-100 dark:border-emerald-800/50 print:bg-transparent print:p-0 print:border-none print:text-black">',
    r'<div className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed whitespace-pre-wrap font-medium p-4 bg-slate-50 dark:bg-slate-800/30 rounded-xl border border-slate-200 dark:border-slate-700 print:bg-transparent print:p-0 print:border-none print:text-black">',
    content
)

# Revert font-bold on some important buttons if we want them to remain, or just leave as font-semibold. font-semibold is fine.
# We also had text-[10px] uppercase tracking-wider font-bold text-slate-500 -> now font-semibold. That's good.

# Wait, the word "font-semibold" might get replaced if I run multiple replacements, but I did font-black -> font-semibold, font-extrabold -> font-semibold, font-bold -> font-semibold.

with open(filepath, 'w', encoding='utf-8') as f:
    f.write(content)
print("Updated Incident Detail Modal styling")
