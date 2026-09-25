import os

filepath = 'src/components/FieldAdminPortalWorkspace.tsx'
with open(filepath, 'r', encoding='utf-8') as f:
    content = f.read()

if 'import { useRouter } from' not in content:
    content = content.replace("import React, { useState, useEffect, useCallback } from 'react';", "import React, { useState, useEffect, useCallback } from 'react';\nimport { useRouter } from 'next/navigation';")

with open(filepath, 'w', encoding='utf-8') as f:
    f.write(content)
print("Added useRouter import to FieldAdmin")
