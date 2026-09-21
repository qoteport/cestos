import re

with open('c:/Users/User/Documents/Projects/cestos-apps/cestos/src/components/ControlTowerWorkspace.tsx', 'r', encoding='utf-8') as f:
    text = f.read()

# 1. Remove Tabs UI
tabs_ui_pattern = r'\{\/\* Tabs \*\/\}\s*<div className="flex border-b space-x-4">.*?</div>\s*\{\/\* TAB 1: EXECUTIVE OVERVIEW \*\/\}'
text = re.sub(tabs_ui_pattern, '{/* TAB 1: EXECUTIVE OVERVIEW */}', text, flags=re.DOTALL)

# 2. Unwrap TAB 1
text = text.replace("{activeTab === 'SUMMARY' && (", "")
text = re.sub(r'\{\/\* TAB 2: FIELD LEADERSHIP OPERATIONS \*\/\}.*', '    </div>\n  );\n}', text, flags=re.DOTALL)

# 3. Fix the closing div for the space-y-6 inside TAB 1.
# Actually, if I remove {activeTab === 'SUMMARY' && (, I need to remove the matching )} that was before TAB 2.
# Wait, my replace of TAB 2 to the end of file with </div>\n  );\n} will close the main wrapper, but what about the space-y-6 div?
# Let's be precise.
