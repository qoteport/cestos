import re

files = [
    'src/components/FieldAdminPortalWorkspace.tsx',
    'src/components/ExecutivePortalWorkspace.tsx',
    'src/components/HRPortalWorkspace.tsx'
]

for file_path in files:
    with open(file_path, 'r', encoding='utf-8') as f:
        content = f.read()
    
    # 1. Replace the modal block
    # Finding the modal block using regex can be tricky due to nested divs, but since we know it starts with {viewingIncident && (
    # and ends with the close report button and a few divs, let's just use string finding.
    start_str = '{viewingIncident && ('
    
    start_idx = content.find(start_str)
    if start_idx != -1:
        # To find the end, let's look for "Close Report" which is near the end, then find the enclosing div closes
        close_btn_idx = content.find('Close Report\n              </button>\n            </div>\n          </div>\n        </div>\n      )}', start_idx)
        
        if close_btn_idx != -1:
            end_idx = close_btn_idx + len('Close Report\n              </button>\n            </div>\n          </div>\n        </div>\n      )}')
            
            # Replace
            new_code = '{viewingIncident && <IncidentDetailModal incident={viewingIncident} onClose={() => setViewingIncident(null)} />}'
            content = content[:start_idx] + new_code + content[end_idx:]
            
            # 2. Add import
            if 'IncidentDetailModal' not in content[:1000]:
                content = "import IncidentDetailModal from './IncidentDetailModal';\n" + content
                
            with open(file_path, 'w', encoding='utf-8') as f:
                f.write(content)
            print(f"Updated {file_path}")
        else:
            print(f"Could not find end of modal in {file_path}")
    else:
        print(f"Could not find start of modal in {file_path}")

