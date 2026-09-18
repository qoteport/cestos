with open('c:/Users/User/Documents/Projects/cestos-apps/cestos/src/components/EmployeeDetailView.tsx', 'r', encoding='utf-8') as f:
    text = f.read()

replacement = '''                  <dd className="font-semibold text-foreground text-sm mt-0.5">
                    {display((Array.isArray(locations) ? locations : locations?.items || []).find((l: any) => l.id === employee.home_location_id)?.name) || 
display(employee.home_location_id)}
                  </dd>'''

import re
text = re.sub(r'                  <dd className="font-semibold text-foreground text-sm mt-0\.5">\s*\{display\(locations\?\.find\(l => l\.id === employee\.home_location_id\)\?\.name\) \|\|\s*display\(employee\.home_location_id\)\}\s*</dd>', replacement, text)

with open('c:/Users/User/Documents/Projects/cestos-apps/cestos/src/components/EmployeeDetailView.tsx', 'w', encoding='utf-8') as f:
    f.write(text)
print('Patched locations.find error')
