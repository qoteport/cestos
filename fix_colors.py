import os
import re

filepath = 'src/components/IncidentDetailModal.tsx'
with open(filepath, 'r', encoding='utf-8') as f:
    content = f.read()

# Replace ${textColor} with standard text color in the grid
content = re.sub(
    r'<span className=\{`text-sm font-semibold mt-0\.5 \$\{textColor\}`\}>',
    r'<span className="text-sm font-semibold text-slate-900 dark:text-white mt-0.5">',
    content
)

# And remove lightThemeColor, textColor, themeColor entirely if we want?
# We can keep `themeColor` for the 2px strip at the very top of the modal.
# That's a nice subtle touch. 

# Let's also check if font-semibold is too much for the labels.
# <span className="block text-[10px] uppercase tracking-wider font-semibold text-slate-500">
content = content.replace(
    'font-semibold text-slate-500',
    'font-medium text-slate-500'
)

# And for the main values in the grid, let's use font-medium instead of font-semibold
content = content.replace(
    '<span className="text-sm font-semibold text-slate-900 dark:text-white mt-0.5">',
    '<span className="text-sm font-medium text-slate-900 dark:text-white mt-0.5">'
)
# Wait, status and reported by were already font-semibold or font-medium?
content = content.replace(
    '<span className="text-sm font-semibold text-slate-900 dark:text-white mt-0.5">',
    '<span className="text-sm font-medium text-slate-900 dark:text-white mt-0.5">'
)

with open(filepath, 'w', encoding='utf-8') as f:
    f.write(content)
print("Updated colors and font weights")
