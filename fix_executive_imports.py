filepath = 'src/components/ExecutivePortalWorkspace.tsx'
with open(filepath, 'r', encoding='utf-8') as f:
    content = f.read()

if 'import NotificationWorkspace' not in content:
    content = content.replace("import React, { useState, useEffect, useMemo } from 'react';", "import React, { useState, useEffect, useMemo } from 'react';\nimport NotificationWorkspace from './NotificationWorkspace';\nimport useNotificationCount from './useNotificationCount';")
    with open(filepath, 'w', encoding='utf-8') as f:
        f.write(content)
    print("Fixed imports")
