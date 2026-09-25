import re

filepath = "src/components/ExecutivePortalWorkspace.tsx"
with open(filepath, "r", encoding="utf-8") as f:
    content = f.read()

# Find ALL JSX text expressions that contain underscore-bearing field names
matches = re.findall(r'\{[^{}]{1,80}(?:incident_type|severity|employment_status|maintenance_type|work_type|display_type)[^{}]{0,50}\}', content)
for m in set(matches):
    print(repr(m[:120]))
