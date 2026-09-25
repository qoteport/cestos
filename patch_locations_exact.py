with open('c:/Users/User/Documents/Projects/cestos-apps/cestos/src/components/EmployeeDetailView.tsx', 'r', encoding='utf-8') as f:
    text = f.read()

text = text.replace(
    '{display(locations?.find(l => l.id === employee.home_location_id)?.name) || display(employee.home_location_id)}',
    '{display((Array.isArray(locations) ? locations : locations?.items || []).find((l: any) => l.id === employee.home_location_id)?.name) || display(employee.home_location_id)}'
)

with open('c:/Users/User/Documents/Projects/cestos-apps/cestos/src/components/EmployeeDetailView.tsx', 'w', encoding='utf-8') as f:
    f.write(text)
print('Patched exactly')
