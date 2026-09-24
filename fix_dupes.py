with open('src/components/ExecutivePortalWorkspace.tsx', 'r', encoding='utf-8') as f:
    lines = f.readlines()

new_lines = []
in_dupe = False
skipping = False

# We will just write a regex to remove everything from the first "const [viewingPo, setViewingPo]" to the end of "const handleCreatePo".
# Actually, the easiest way is to just grab the file, find the injected strings and replace them with empty string ONCE or multiple times if they are exact duplicates.
import re
with open('src/components/ExecutivePortalWorkspace.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

# The block of states to remove:
states_regex = r'const \[showAddPoModal, setShowAddPoModal\] = useState\(false\);\n\s*const \[viewingPo, setViewingPo\] = useState<any \| null>\(null\);\n\s*const \[editingPo, setEditingPo\] = useState<any \| null>\(null\);\n\s*const \[receivingPo, setReceivingPo\] = useState<any \| null>\(null\);\n\s*const \[receiptQuantities, setReceiptQuantities\] = useState<Record<string, number>>\(\{\}\);\n\s*const \[selectedReceiptItemIds, setSelectedReceiptItemIds\] = useState<string\[\]>\(\[\]\);\n\s*const \[poSubmitBusy, setPoSubmitBusy\] = useState\(false\);\n\s*const \[poAttachmentFile, setPoAttachmentFile\] = useState<File \| null>\(null\);'

# Find all occurrences
matches = list(re.finditer(states_regex, content))
if len(matches) > 1:
    # Remove the first occurrence
    m = matches[0]
    content = content[:m.start()] + content[m.end():]

# Find handleCreatePo
handle_regex = r'const handleCreatePo = async \(e: React\.FormEvent\) => \{.*?\n  \};\n'
matches = list(re.finditer(handle_regex, content, re.DOTALL))
if len(matches) > 1:
    m = matches[0]
    content = content[:m.start()] + content[m.end():]

# Find newPoForm
newpoform_regex = r'const \[newPoForm, setNewPoForm\] = useState\(\{.*?\n  \}\);'
matches = list(re.finditer(newpoform_regex, content, re.DOTALL))
if len(matches) > 1:
    m = matches[0]
    content = content[:m.start()] + content[m.end():]

with open('src/components/ExecutivePortalWorkspace.tsx', 'w', encoding='utf-8') as f:
    f.write(content)

