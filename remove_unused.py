import os
import re

filepath = 'src/components/IncidentDetailModal.tsx'
with open(filepath, 'r', encoding='utf-8') as f:
    content = f.read()

content = re.sub(r'let lightThemeColor = \'[^\']*\';\n', '', content)
content = re.sub(r'let textColor = \'[^\']*\';\n', '', content)
content = re.sub(r' lightThemeColor = \'[^\']*\'; textColor = \'[^\']*\';', '', content)

with open(filepath, 'w', encoding='utf-8') as f:
    f.write(content)
print("Removed dead vars")
