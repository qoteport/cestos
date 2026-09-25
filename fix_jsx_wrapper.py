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

    # The issue is that the `) : (` block for arrays contains <div className="overflow-x-auto"> followed by the pagination <div className="flex...">.
    # To fix this, we can search for `) : (\n *<div className="overflow-x-auto"` and replace with `) : (\n<>\n<div className="overflow-x-auto"`.
    # And then we need to find the `</div>\n *)}` right after the pagination block and replace with `</div>\n</>\n)}`
    
    # Actually, it's safer to just regex replace specifically:
    # Pattern: `\) :\s*\(\s*(<div className="overflow-x-auto">.*?<div className="flex items-center justify-between mt-4 px-4 py-3 bg-slate-50.*?</div>\s*)\)`
    
    # Let's write a simple state machine to fix this.
    
    lines = content.split('\n')
    new_lines = []
    
    in_ternary_block = False
    brace_count = 0
    
    for i in range(len(lines)):
        line = lines[i]
        
        # When we see `) : (` followed by `<div className="overflow-x-auto"`
        if re.search(r'\) :\s*\(', line):
            if i + 1 < len(lines) and '<div className="overflow-x-auto"' in lines[i+1]:
                # Wrap it!
                new_lines.append(line)
                new_lines.append('                    <>')
                continue
                
        # Also, check if this line is closing the ternary: `)}`
        # But wait, what if we just replace `) : (\n *<div className="overflow-x-auto"`?
        new_lines.append(line)
        
    content = '\n'.join(new_lines)
    
    # Now for the closing fragment `</>`
    # We need to insert `</>` right before `)}` that closes the ternary.
    # We can just look for the pagination block end:
    # `Next\n                  </button>\n                </div>\n              </div>\n`
    # and if the next non-empty line is `)}`, insert `</>`.
    
    content = re.sub(
        r'(Next\s*</button>\s*</div>\s*</div>\s*)(?=\s*\)\})',
        r'\1\n                    </>\n',
        content
    )

    with open(full_path, 'w', encoding='utf-8') as f:
        f.write(content)

    print(f"Fixed JSX wrappers in {filepath}")
