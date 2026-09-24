import re

for filepath in ["src/components/HRPortalWorkspace.tsx"]:
    with open(filepath, "r", encoding="utf-8") as f:
        content = f.read()
    original = content
    
    matches = re.findall(r'\{[^{}]{1,80}(?:incident_type|severity|employment_status|maintenance_type|work_type)[^{}]{0,50}\}', content)
    for m in set(matches):
        print(repr(m[:120]))
