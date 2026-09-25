with open('src/components/FinancePortalWorkspace.tsx', 'r', encoding='utf-8') as f:
    fin = f.read()

import re
new_po_form = re.search(r'(const \[newPoForm, setNewPoForm\] = useState\(\{.*?\n  \}\);)', fin, re.DOTALL).group(1)

with open('src/components/ExecutivePortalWorkspace.tsx', 'r', encoding='utf-8') as f:
    exec_content = f.read()

# Make sure we don't duplicate
if 'const [newPoForm, setNewPoForm]' not in exec_content:
    idx = exec_content.find('const [showAddPoModal, setShowAddPoModal] = useState(false);')
    if idx != -1:
        exec_content = exec_content[:idx] + new_po_form + '\n  ' + exec_content[idx:]
        with open('src/components/ExecutivePortalWorkspace.tsx', 'w', encoding='utf-8') as f:
            f.write(exec_content)
        print("Injected newPoForm")
else:
    print("newPoForm already exists")
