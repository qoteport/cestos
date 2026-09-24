with open('src/components/ExecutivePortalWorkspace.tsx', 'r', encoding='utf-8') as f:
    lines = f.readlines()

# 1. Add ShoppingBag to imports
for i, line in enumerate(lines[:50]):
    if "} from 'lucide-react';" in line:
        lines[i] = line.replace("} from 'lucide-react';", ", ShoppingBag } from 'lucide-react';")
        break

# 2. Find and comment out the FIRST occurrence of receiptQuantities and selectedReceiptItemIds
found_receipt = False
found_selected = False
for i, line in enumerate(lines):
    if 'const [receiptQuantities' in line and not found_receipt:
        lines[i] = '// ' + line
        found_receipt = True
    elif 'const [selectedReceiptItemIds' in line and not found_selected:
        lines[i] = '// ' + line
        found_selected = True

# 3. Find and comment out reload() on line 247ish
for i, line in enumerate(lines):
    if 'reload();' in line:
        lines[i] = line.replace('reload();', '// reload omitted')

with open('src/components/ExecutivePortalWorkspace.tsx', 'w', encoding='utf-8') as f:
    f.writelines(lines)
