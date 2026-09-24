import os
import shutil

src = 'src/app/executive-portal/my-profile/page.tsx'
dest_finance = 'src/app/finance-portal/my-profile/page.tsx'
dest_fieldadmin = 'src/app/field-admin-portal/my-profile/page.tsx'

os.makedirs('src/app/finance-portal/my-profile', exist_ok=True)
os.makedirs('src/app/field-admin-portal/my-profile', exist_ok=True)

with open(src, 'r', encoding='utf-8') as f:
    content = f.read()

# Finance Portal
finance_content = content.replace('/executive-portal', '/finance-portal')
finance_content = finance_content.replace('text-indigo-600', 'text-violet-600')
finance_content = finance_content.replace('dark:text-indigo-400', 'dark:text-violet-400')
finance_content = finance_content.replace('hover:text-indigo-800', 'hover:text-violet-800')
finance_content = finance_content.replace('bg-indigo-50', 'bg-violet-50')
finance_content = finance_content.replace('dark:bg-indigo-950/60', 'dark:bg-violet-950/60')
finance_content = finance_content.replace('text-indigo-700', 'text-violet-700')
finance_content = finance_content.replace('dark:text-indigo-300', 'dark:text-violet-300')
finance_content = finance_content.replace('border-indigo-200', 'border-violet-200')
finance_content = finance_content.replace('dark:border-indigo-800', 'dark:border-violet-800')

with open(dest_finance, 'w', encoding='utf-8') as f:
    f.write(finance_content)

# Field Admin Portal
fieldadmin_content = content.replace('/executive-portal', '/field-admin-portal')
fieldadmin_content = fieldadmin_content.replace('text-indigo-600', 'text-orange-600')
fieldadmin_content = fieldadmin_content.replace('dark:text-indigo-400', 'dark:text-orange-400')
fieldadmin_content = fieldadmin_content.replace('hover:text-indigo-800', 'hover:text-orange-800')
fieldadmin_content = fieldadmin_content.replace('bg-indigo-50', 'bg-orange-50')
fieldadmin_content = fieldadmin_content.replace('dark:bg-indigo-950/60', 'dark:bg-orange-950/60')
fieldadmin_content = fieldadmin_content.replace('text-indigo-700', 'text-orange-700')
fieldadmin_content = fieldadmin_content.replace('dark:text-indigo-300', 'dark:text-orange-300')
fieldadmin_content = fieldadmin_content.replace('border-indigo-200', 'border-orange-200')
fieldadmin_content = fieldadmin_content.replace('dark:border-indigo-800', 'dark:border-orange-800')

with open(dest_fieldadmin, 'w', encoding='utf-8') as f:
    f.write(fieldadmin_content)

print("Pages created.")
