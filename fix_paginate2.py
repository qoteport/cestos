import re
import os

files = [
    'src/components/ExecutivePortalWorkspace.tsx',
    'src/components/HRPortalWorkspace.tsx'
]

PAGE_SIZE = 15

def get_pagination_ui(array_name, state_name):
    return f'''
              <div className="flex items-center justify-between mt-4 px-4 py-3 bg-slate-50 dark:bg-slate-800/50 border-t border-slate-200 dark:border-slate-800 rounded-b-2xl">
                <span className="text-xs text-slate-500 font-medium">
                  Showing {{Math.min(1 + ({state_name} - 1) * {PAGE_SIZE}, {array_name}.length)}} - {{Math.min({state_name} * {PAGE_SIZE}, {array_name}.length)}} of {{{array_name}.length}} records
                </span>
                <div className="flex items-center gap-2">
                  <button 
                    onClick={{() => set{state_name.capitalize()}(p => Math.max(1, p - 1))}} 
                    disabled={{{state_name} === 1}}
                    className="px-3 py-1.5 text-xs font-bold border border-slate-200 dark:border-slate-700 rounded-lg disabled:opacity-40 disabled:cursor-not-allowed hover:bg-white dark:hover:bg-slate-800 transition"
                  >
                    Prev
                  </button>
                  <span className="text-xs font-bold px-2">
                    Page {{{state_name}}} of {{Math.max(1, Math.ceil({array_name}.length / {PAGE_SIZE}))}}
                  </span>
                  <button 
                    onClick={{() => set{state_name.capitalize()}(p => Math.min(Math.ceil({array_name}.length / {PAGE_SIZE}), p + 1))}} 
                    disabled={{{state_name} >= Math.ceil({array_name}.length / {PAGE_SIZE})}}
                    className="px-3 py-1.5 text-xs font-bold border border-slate-200 dark:border-slate-700 rounded-lg disabled:opacity-40 disabled:cursor-not-allowed hover:bg-white dark:hover:bg-slate-800 transition"
                  >
                    Next
                  </button>
                </div>
              </div>
'''

for filepath in files:
    full_path = os.path.join(os.getcwd(), filepath)
    with open(full_path, 'r', encoding='utf-8') as f:
        content = f.read()
    
    arrays = ['scopedFuelAllocations', 'scopedPurchaseOrders', 'scopedFuelDeliveries', 'scopedMaintenanceRecords']
    states_to_add = set()
    
    for array_name in arrays:
        target_str = f"{array_name}.map("
        
        pos = 0
        while True:
            idx = content.find(target_str, pos)
            if idx == -1:
                break
                
            if "slice" in content[idx-10:idx]:
                pos = idx + 1
                continue
                
            print(f"Paginating {array_name} in {filepath}")
            
            state_name = array_name.replace('.', '').replace('?', '') + 'Page'
            states_to_add.add(state_name)
            
            slice_str = f".slice(({state_name} - 1) * {PAGE_SIZE}, {state_name} * {PAGE_SIZE})"
            
            table_end = content.find('</table>', idx)
            if table_end != -1:
                table_end += len('</table>')
                div_end = content.find('</div>', table_end)
                if div_end != -1 and not '<div' in content[table_end:div_end]:
                    insert_pos = div_end + len('</div>')
                else:
                    insert_pos = table_end
                    
                ui_str = get_pagination_ui(array_name, state_name)
                content = content[:insert_pos] + ui_str + content[insert_pos:]
            
            content = content[:idx + len(array_name)] + slice_str + content[idx + len(array_name):]
            
            pos = idx + len(target_str) + len(slice_str) + len(ui_str)
            
    if states_to_add:
        hook_insert = -1
        for hook_sig in ['useAuth();', 'useRouter();', 'useState(']:
            hook_insert = content.find(hook_sig)
            if hook_insert != -1:
                hook_insert = content.find('\n', hook_insert) + 1
                break
        
        if hook_insert != -1:
            state_declarations = "\n".join([f"  const [{s}, set{s.capitalize()}] = React.useState(1);" for s in states_to_add]) + "\n"
            content = content[:hook_insert] + state_declarations + content[hook_insert:]

    with open(full_path, 'w', encoding='utf-8') as f:
        f.write(content)

