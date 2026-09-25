import os

filepath = 'src/components/FinancePortalWorkspace.tsx'
with open(filepath, 'r', encoding='utf-8') as f:
    content = f.read()

content = content.replace("import React, { useState, useEffect, useCallback } from 'react';", "import React, { useState, useEffect, useCallback, useMemo } from 'react';")

with open(filepath, 'w', encoding='utf-8') as f:
    f.write(content)
print("Fixed useMemo import")
