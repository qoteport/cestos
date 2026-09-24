import re

with open('src/components/FinancePortalWorkspace.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

# Grab states
states = re.findall(r'const \[showAddPoModal.*?useState\(false\);.*?const \[poAttachment.*?null\);', content, re.DOTALL)
if states:
    print("Found states")
    
# Grab handleCreatePo
handle = re.findall(r'const handleCreatePo = async \(e: React.FormEvent\) => \{.*?\n  \};\n', content, re.DOTALL)
if handle:
    print("Found handleCreatePo")

# Grab the modal
modal = re.findall(r'\{\s*showAddPoModal && \(.*?</div>\s*\)\s*\}', content, re.DOTALL)
if modal:
    print("Found modal")

