with open('src/components/FinancePortalWorkspace.tsx', 'r', encoding='utf-8') as f:
    fin_content = f.read()

import re
states = re.search(r'(const \[showAddPoModal.*?useState\(false\);.*?const \[poAttachmentFile.*?null\);)', fin_content, re.DOTALL).group(1)
handle = re.search(r'(const handleCreatePo = async \(e: React.FormEvent\) => \{.*?\n  \};)', fin_content, re.DOTALL).group(1)

# Remove `reload();` from handleCreatePo
handle = handle.replace('reload();', '// reload omitted')

with open('src/components/ExecutivePortalWorkspace.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

# Add ShoppingBag import
if 'ShoppingBag' not in content:
    content = content.replace("} from 'lucide-react';", ", ShoppingBag } from 'lucide-react';")

# Inject states
if 'const [newPoForm' not in content:
    idx = content.find('const [viewingIncident, setViewingIncident] = useState<any>(null);')
    if idx != -1:
        idx += len('const [viewingIncident, setViewingIncident] = useState<any>(null);')
        content = content[:idx] + '\n  ' + states + '\n  ' + handle + '\n' + content[idx:]

with open('src/components/ExecutivePortalWorkspace.tsx', 'w', encoding='utf-8') as f:
    f.write(content)
