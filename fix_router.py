import os

filepath = 'src/components/FieldAdminPortalWorkspace.tsx'
with open(filepath, 'r', encoding='utf-8') as f:
    content = f.read()

# Add import if missing
if 'useRouter' not in content:
    content = content.replace("import React, { useState, useEffect, useMemo } from 'react';", "import React, { useState, useEffect, useMemo } from 'react';\nimport { useRouter } from 'next/navigation';")
    
# Add const router = useRouter(); inside the component
if 'const router = useRouter();' not in content:
    content = content.replace('export default function FieldAdminPortalWorkspace() {', 'export default function FieldAdminPortalWorkspace() {\n  const router = useRouter();')

with open(filepath, 'w', encoding='utf-8') as f:
    f.write(content)

print("Added router")
