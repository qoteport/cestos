import os

filepath = 'src/components/FieldAdminPortalWorkspace.tsx'
with open(filepath, 'r', encoding='utf-8') as f:
    content = f.read()

# Fix the dangling syntax `     /> },\n  ];`
content = content.replace('    { id: \'NOTIFICATIONS\', label: \'Notifications\', icon: <Clock size={16} /> },\n     /> },\n  ];', '    { id: \'NOTIFICATIONS\', label: \'Notifications\', icon: <Clock size={16} /> },\n  ];')

with open(filepath, 'w', encoding='utf-8') as f:
    f.write(content)

print("Fixed syntax in FieldAdmin")
