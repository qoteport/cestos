import re

files = [
    'src/components/ExecutivePortalWorkspace.tsx',
    'src/components/HRPortalWorkspace.tsx'
]

for file_path in files:
    with open(file_path, 'r', encoding='utf-8') as f:
        content = f.read()

    # 1. Replace header
    content = content.replace('<th className="px-5 py-3.5">Contact</th>', '<th className="px-5 py-3.5">Assigned Project</th>')

    # 2. Replace body.
    # The body of the contact column looks like:
    # <td className="px-5 py-3.5 space-y-0.5">
    #   {emp.primary_phone || emp.phone_number ? (
    # ...
    #   )}
    # </td>
    # We will use regex to find this cell and replace it.
    
    # We find '<td className="px-5 py-3.5 space-y-0.5">' which is unique for the contact column?
    # Let's verify if there are other such columns. It's better to find the precise block.
    
    pattern = r'<td className="px-5 py-3\.5 space-y-0\.5">\s*\{emp\.primary_phone.*?\)\}\s*</td>'
    replacement = """<td className="px-5 py-3.5 space-y-0.5">
                              <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
                                {emp.current_project_name || emp.project_name || 'Unassigned / Available'}
                              </span>
                              {(emp.current_project_name || emp.project_name) && (
                                <span className="block text-[10px] text-slate-500 font-medium">Currently Deployed</span>
                              )}
                            </td>"""
                            
    content = re.sub(pattern, replacement, content, flags=re.DOTALL)
    
    with open(file_path, 'w', encoding='utf-8') as f:
        f.write(content)
    print(f"Updated {file_path}")

