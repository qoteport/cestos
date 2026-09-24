import os

filepath = 'src/components/OperationalExpenseSubmissionModal.tsx'
with open(filepath, 'r', encoding='utf-8') as f:
    content = f.read()

# Replace itemOptions
content = content.replace(
"""const itemOptions = useMemo(() => [
    ...inventory.map((item) => ({ value: String(item.id), label: `${item.name || item.item_name || 'Inventory item'}${item.code ? ` - ${item.code}` : ''}`, sublabel: `Unit: ${item.unit_of_measure || item.unit || 'PCS'}` })),
    { value: '__CUSTOM__', label: 'Create a new item' },
  ], [inventory]);""",
"""const itemOptions = useMemo(() => [
    { value: '__CUSTOM__', label: 'Create a new item' },
    ...inventory.map((item) => ({ value: String(item.id), label: `${item.name || item.item_name || 'Inventory item'}${item.code ? ` - ${item.code}` : ''}`, sublabel: `Unit: ${item.unit_of_measure || item.unit || 'PCS'}` })),
  ], [inventory]);""")

# Replace payeeOptions
content = content.replace(
"""const payeeOptions = useMemo(() => [
    ...payees.map((payee) => ({ value: String(payee.id), label: payee.name, sublabel: [payee.phone, payee.bank_account_details].filter(Boolean).join(' - ') })),
    { value: '__CUSTOM__', label: 'Create a new payee' },
  ], [payees]);""",
"""const payeeOptions = useMemo(() => [
    { value: '__CUSTOM__', label: 'Create a new payee' },
    ...payees.map((payee) => ({ value: String(payee.id), label: payee.name, sublabel: [payee.phone, payee.bank_account_details].filter(Boolean).join(' - ') })),
  ], [payees]);""")

# Wait, the spacing/quotes might be slightly different in the actual file.
# Let's use regex.
import re
content = re.sub(
    r'const itemOptions = useMemo\(\(\) => \[\s*\.\.\.inventory\.map\([^\]]+\),\s*\{\s*value:\s*\'__CUSTOM__\',\s*label:\s*\'Create a new item\'\s*\},\s*\],\s*\[inventory\]\);',
    r"const itemOptions = useMemo(() => [\n    { value: '__CUSTOM__', label: 'Create a new item' },\n    ...inventory.map((item) => ({ value: String(item.id), label: `${item.name || item.item_name || 'Inventory item'}${item.code ? ` - ${item.code}` : ''}`, sublabel: `Unit: ${item.unit_of_measure || item.unit || 'PCS'}` })),\n  ], [inventory]);",
    content
)

content = re.sub(
    r'const payeeOptions = useMemo\(\(\) => \[\s*\.\.\.payees\.map\([^\]]+\),\s*\{\s*value:\s*\'__CUSTOM__\',\s*label:\s*\'Create a new payee\'\s*\},\s*\],\s*\[payees\]\);',
    r"const payeeOptions = useMemo(() => [\n    { value: '__CUSTOM__', label: 'Create a new payee' },\n    ...payees.map((payee) => ({ value: String(payee.id), label: payee.name, sublabel: [payee.phone, payee.bank_account_details].filter(Boolean).join(' - ') })),\n  ], [payees]);",
    content
)

with open(filepath, 'w', encoding='utf-8') as f:
    f.write(content)
print("Updated OperationalExpenseSubmissionModal")
