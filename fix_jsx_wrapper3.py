import re
import os

files = [
    'src/components/ExecutivePortalWorkspace.tsx',
    'src/components/HRPortalWorkspace.tsx'
]

for filepath in files:
    full_path = os.path.join(os.getcwd(), filepath)
    with open(full_path, 'r', encoding='utf-8') as f:
        content = f.read()

    # The block looks exactly like:
    # `                  ) : (\n\n<div className="overflow-x-auto"`
    # or `                  ) : (\n<div className="overflow-x-auto rounded-2xl...`
    # We want to replace `) : (\n` with `) : (<>\n`
    # But ONLY for the ones followed by `<div className="overflow-x-auto"`
    
    lines = content.split('\n')
    new_lines = []
    
    for i in range(len(lines)):
        line = lines[i]
        
        # When we see `) : (` followed closely by `<div className="overflow-x-auto"`
        if ') : (' in line:
            # check the next 5 lines
            for j in range(1, min(6, len(lines) - i)):
                if '<div className="overflow-x-auto"' in lines[i+j] or '<div className="overflow-x-auto ' in lines[i+j]:
                    line = line.replace(') : (', ') : (<>')
                    break
                    
        # Now we need to insert `</>` before `)}` that closes the block.
        # It's always after `Next\n                  </button>\n                </div>\n              </div>\n`
        # Let's do this via regex on the whole string afterwards.
        new_lines.append(line)
        
    content = '\n'.join(new_lines)
    
    content = re.sub(
        r'(Next\s*</button>\s*</div>\s*</div>\s*)(?=\s*\)\})',
        r'\1\n</>\n',
        content
    )

    with open(full_path, 'w', encoding='utf-8') as f:
        f.write(content)

    print(f"Fixed JSX wrappers in {filepath}")
