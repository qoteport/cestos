const fs = require('fs');

let content = fs.readFileSync('src/components/ExecutivePortalWorkspace.tsx', 'utf8');

// 1. Component name
content = content.replace(/ExecutivePortalWorkspace/g, 'HRPortalWorkspace');

// 2. Tab type
content = content.replace(/type ExecutiveTab =[\s\S]*?;/, `type HRTab =
  | 'PEOPLE'
  | 'HSE'
  | 'PROJECTS'
  | 'COMPLIANCE'
  | 'DOC_REQUESTS'
  | 'NOTIFICATIONS';`);
content = content.replace(/ExecutiveTab/g, 'HRTab');

// 3. Colors
content = content.replace(/indigo/g, 'emerald');

// 4. Update navItems
content = content.replace(/const navItems:[\s\S]*?\];/, `const navItems: { id: HRTab; label: string; icon: React.ComponentType<{ size?: number; className?: string }>; badge?: number }[] = [
    { id: 'PEOPLE', label: 'Employees', icon: Users },
    { id: 'DOC_REQUESTS', label: 'Document Requests', icon: Download },
    { id: 'HSE', label: 'HSE & Safety', icon: ShieldAlert },
    { id: 'PROJECTS', label: 'Projects', icon: Briefcase },
    { id: 'COMPLIANCE', label: 'Compliance & Documents', icon: Shield },
  ];`);

// 5. Update header and texts
content = content.replace(/Executive Portal/g, 'HR Portal');
content = content.replace(/Executive Management/g, 'Human Resources Management');

// 6. Update the employee links from /executive-portal/employees to /hr-portal/employees
content = content.replace(/\/executive-portal\/employees\//g, '/hr-portal/employees/');
content = content.replace(/\/executive-portal\/my-profile/g, '/hr-portal/my-profile');
content = content.replace(/\/executive-portal\/projects\//g, '/hr-portal/projects/');

// 7. Inject state for document requests
content = content.replace(/const \[incidents, setIncidents\] = useState.*?;\n/g, 
`const [incidents, setIncidents] = useState<any[]>([]);
  const [downloadRequests, setDownloadRequests] = useState<any[]>([]);
`);

// 8. Inject fetch for document requests
content = content.replace(/apiFetch<any>\('\/api\/v1\/incidents\?page_size=100'\)\.catch\(\(\) => \[\]\),/g,
`apiFetch<any>('/api/v1/incidents?page_size=100').catch(() => []),
        apiFetch<any>('/api/v1/hr/document-download-requests').catch(() => []),`);

content = content.replace(/const \[empRes, expRes, invRes, poRes, fuelRes, allocRes, astRes, locRes, incRes, projRes\] = await Promise\.all\(\[/g,
`const [empRes, expRes, invRes, poRes, fuelRes, allocRes, astRes, locRes, incRes, docReqRes, projRes] = await Promise.all([`);

// Wait, the order of responses might be messed up if I just add one.
// Let's replace the whole loadData block.
