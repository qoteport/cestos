import os
import re

filepath = 'src/components/IncidentDetailModal.tsx'
with open(filepath, 'r', encoding='utf-8') as f:
    content = f.read()

content = content.replace('whitespace-pre-wrap font-medium', 'whitespace-pre-wrap')

with open(filepath, 'w', encoding='utf-8') as f:
    f.write(content)
print("Removed font-medium")
