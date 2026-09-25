import re

with open('src/components/FinancePortalWorkspace.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

# Grab states
states = re.search(r'(const \[showAddPoModal.*?useState\(false\);.*?const \[poAttachment.*?null\);)', content, re.DOTALL).group(1)

# Grab handleCreatePo
handle = re.search(r'(const handleCreatePo = async \(e: React.FormEvent\) => \{.*?\n  \};)', content, re.DOTALL).group(1)

# Grab the modal
modal = re.search(r'(\{\s*showAddPoModal && \(.*?</div>\s*\)\s*\})', content, re.DOTALL).group(1)

# Now we need to inject them into ExecutivePortalWorkspace.tsx
with open('src/components/ExecutivePortalWorkspace.tsx', 'r', encoding='utf-8') as f:
    exec_content = f.read()

# Inject states and handler right after setViewingIncident
insert_idx = exec_content.find('const [viewingIncident, setViewingIncident] = useState<any>(null);')
if insert_idx != -1:
    insert_idx += len('const [viewingIncident, setViewingIncident] = useState<any>(null);')
    exec_content = exec_content[:insert_idx] + "\n  " + states + "\n  " + handle + "\n" + exec_content[insert_idx:]
else:
    print("Could not find insert point for states")

# Inject button
header_text = 'Purchase Orders &amp; Procurement Subledger\n              </h2>\n              <p className="text-xs text-slate-500 dark:text-slate-400">'
btn_code = """
              </div>
              <button
                type="button"
                onClick={() => setShowAddPoModal(true)}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold shadow-sm transition flex items-center gap-1.5 shrink-0"
              >
                <Plus size={15} /> Create Purchase Order
              </button>
            </div>
"""
# Need to find the exact header in ExecutivePortalWorkspace
header_match = re.search(r'(<h2 className="text-lg font-black text-slate-900 dark:text-white flex items-center gap-2">\s*<ShoppingCart className="h-6 w-6 text-indigo-600" /> Purchase Orders &amp; Procurement Subledger\s*</h2>\s*<p className="text-xs text-slate-500 dark:text-slate-400 mt-1">\s*Vendor purchase orders, line-item procurement commitments, and Goods Receipt Notes \(GRN\)\.\s*</p>\s*</div>)', exec_content, re.DOTALL)
if header_match:
    original = header_match.group(1)
    # the original ends with </div> which closes the flex container
    # we replace </div> with the button and </div>
    new_header = original[:-6] + btn_code
    exec_content = exec_content.replace(original, new_header)
else:
    print("Could not find PO header")

# Inject modal before the last </div>
end_idx = exec_content.rfind('</div>\n  );\n}')
if end_idx != -1:
    # replace violet with indigo in the modal
    modal = modal.replace('violet', 'indigo')
    exec_content = exec_content[:end_idx] + "\n      " + modal + "\n    " + exec_content[end_idx:]
else:
    print("Could not find end of file")

with open('src/components/ExecutivePortalWorkspace.tsx', 'w', encoding='utf-8') as f:
    f.write(exec_content)
print("Done extracting and injecting")
