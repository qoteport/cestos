with open('src/components/ExecutivePortalWorkspace.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

# Remove the duplicated states I injected at viewingIncident
# The block was 8 lines, but my regex grabbed a specific block.
import re
states = re.search(r'(const \[showAddPoModal.*?useState\(false\);.*?const \[poAttachmentFile.*?null\);)', content, re.DOTALL)
if states:
    s = states.group(1)
    # only replace the FIRST occurrence (the one I injected)
    content = content.replace('\n  ' + s, '', 1)

handle = re.search(r'(const handleCreatePo = async \(e: React.FormEvent\) => \{.*?\n  \};)', content, re.DOTALL)
if handle:
    h = handle.group(1)
    content = content.replace('\n  ' + h, '', 1)

modal = re.search(r'(\{\s*showAddPoModal && \(.*?</div>\s*\)\s*\})', content, re.DOTALL)
if modal:
    m = modal.group(1)
    # The injected one is at the end of the file. We should replace the LAST occurrence.
    idx = content.rfind(m)
    if idx != -1:
        content = content[:idx] + content[idx+len(m):]

with open('src/components/ExecutivePortalWorkspace.tsx', 'w', encoding='utf-8') as f:
    f.write(content)
