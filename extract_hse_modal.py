import re

with open('src/components/FieldAdminPortalWorkspace.tsx', 'r', encoding='utf-8') as f:
    fa_content = f.read()

# Find the viewingIncident modal
start_idx = fa_content.find('{viewingIncident && (')
end_idx = fa_content.find('</div>\n  );\n}')

if start_idx != -1 and end_idx != -1:
    # Ensure we get the correct closing tags.
    # The modal starts with '{viewingIncident && (' and ends just before the final wrapper '</div>\n  );\n}'
    modal_content = fa_content[start_idx:end_idx]
    
    # We will inject this into ExecutivePortalWorkspace and HRPortalWorkspace
    for file_path in ['src/components/ExecutivePortalWorkspace.tsx', 'src/components/HRPortalWorkspace.tsx']:
        with open(file_path, 'r', encoding='utf-8') as tf:
            target_content = tf.read()
        
        # In Executive and HR portals, if they already have {viewingIncident && (, we replace it.
        # Otherwise, insert it before the last </div>\n  );
        if '{viewingIncident && (' in target_content:
            print(f"File {file_path} already has viewingIncident modal?")
        else:
            target_end_idx = target_content.rfind('</div>\n  );\n}')
            if target_end_idx != -1:
                new_target = target_content[:target_end_idx] + "\n      " + modal_content + "\n    " + target_content[target_end_idx:]
                with open(file_path, 'w', encoding='utf-8') as tf:
                    tf.write(new_target)
                print(f"Injected into {file_path}")
            else:
                print(f"Could not find end of component in {file_path}")
else:
    print("Could not find modal in FieldAdminPortalWorkspace")

