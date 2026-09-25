with open('src/components/ExecutivePortalWorkspace.tsx', 'r', encoding='utf-8') as f:
    lines = f.readlines()

btn_code = """              <button
                type="button"
                onClick={() => setShowAddPoModal(true)}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold shadow-sm transition flex items-center gap-1.5 shrink-0"
              >
                <Plus size={15} /> Create Purchase Order
              </button>
"""

# Insert at index 1583
lines.insert(1583, btn_code)

with open('src/components/ExecutivePortalWorkspace.tsx', 'w', encoding='utf-8') as f:
    f.writelines(lines)
