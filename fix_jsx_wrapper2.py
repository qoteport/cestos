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

    # Find `) : (` followed by `<div className="overflow-x-auto`
    content = re.sub(
        r'(\) :\s*\(\s*)(<div className="overflow-x-auto)',
        r'\1<>\n\2',
        content
    )
    
    # We already inserted `</>` for some of them where the Next button block matched.
    # But wait, what if we double wrap? We can just do a very safe replacement.
    # Remove existing `<>` that we just added if any, to start clean:
    content = content.replace('                    <>\n', '')
    content = content.replace('\n                    </>\n\n)}', '\n)}')

    # Clean wrap
    content = re.sub(
        r'(\) :\s*\(\s*)(<div className="overflow-x-auto)',
        r'\1<>\n\2',
        content
    )
    
    # The end fragment:
    content = re.sub(
        r'(Next\s*</button>\s*</div>\s*</div>\s*)(?=\s*\)\})',
        r'\1\n</>\n',
        content
    )

    with open(full_path, 'w', encoding='utf-8') as f:
        f.write(content)

    print(f"Fixed JSX wrappers completely in {filepath}")
