import re
import os

files = [
    'src/components/FinancePortalWorkspace.tsx',
    'src/components/FieldAdminPortalWorkspace.tsx',
    'src/components/AdminWorkspace.tsx'
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
    
    # 1. Find all arrays being mapped in tbody
    matches = list(re.finditer(r'<table[^>]*>.*?<tbody[^>]*>\s*\{\s*([a-zA-Z0-9_\.]+)\.map\(', content, re.DOTALL))
    
    # Reverse to not mess up offsets
    states_to_add = set()
    
    for m in reversed(matches):
        array_name = m.group(1)
        if 'slice' in array_name or array_name in ['roleList', 'poItems']:
            continue
            
        print(f"Paginating {array_name} in {filepath}")
        
        state_name = array_name.replace('.', '').replace('?', '') + 'Page'
        states_to_add.add(state_name)
        
        # We need to replace rray_name.map with rray_name.slice(...).map
        map_index = m.end(1)
        slice_str = f".slice(({state_name} - 1) * {PAGE_SIZE}, {state_name} * {PAGE_SIZE})"
        
        # We also need to insert the pagination UI after the table.
        # Find the closing </table> after map_index
        table_end = content.find('</table>', map_index)
        if table_end != -1:
            table_end += len('</table>')
            # Check if the next closing tag is </div> (the wrapper)
            # We usually have a <div className="overflow-x-auto rounded-2xl ..."> wrapping the table
            div_end = content.find('</div>', table_end)
            if div_end != -1 and not '<div' in content[table_end:div_end]:
                # Insert after the wrapper div
                insert_pos = div_end + len('</div>')
            else:
                insert_pos = table_end
                
            ui_str = get_pagination_ui(array_name, state_name)
            
            content = content[:insert_pos] + ui_str + content[insert_pos:]
        
        # Insert slice
        content = content[:map_index] + slice_str + content[map_index:]
        
    if states_to_add:
        # Find where to insert state variables
        # Usually inside the component, before the return statement.
        # Let's just find const [loading, setLoading] or similar and insert there.
        # Or find eturn ( and insert right before it.
        # However, there are multiple returns in large components.
        # We can find const router = useRouter(); or const { user } = useAuth();
        hook_insert = -1
        for hook_sig in ['useAuth();', 'useRouter();', 'useState(']:
            hook_insert = content.find(hook_sig)
            if hook_insert != -1:
                hook_insert = content.find('\n', hook_insert) + 1
                break
        
        if hook_insert != -1:
            state_declarations = "\n".join([f"  const [{s}, set{s.capitalize()}] = React.useState(1);" for s in states_to_add]) + "\n"
            content = content[:hook_insert] + state_declarations + content[hook_insert:]
        else:
            print(f"Could not find insert point for states in {filepath}")

    with open(full_path, 'w', encoding='utf-8') as f:
        f.write(content)
