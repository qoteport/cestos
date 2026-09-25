import os
import glob
import re

files = glob.glob('src/components/**/*.tsx', recursive=True)

for filepath in files:
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()

    original = content
    
    # We want to find patterns like:
    # [...someArray, { value: '__CUSTOM__', label: 'something' }]
    # And replace them with:
    # [{ value: '__CUSTOM__', label: 'something' }, ...someArray]
    
    # It might be spread operators like: [...employeeOptions, { value: '__CUSTOM__', label: 'Enter a custom technician' }]
    # regex: \[(\.\.\.\w+),\s*(\{\s*value:\s*'__CUSTOM__',\s*label:\s*'[^']+'\s*\})\]
    
    pattern = r'\[(\.\.\.[a-zA-Z0-9_\.]+),\s*(\{\s*value:\s*(?:[\'"])__CUSTOM__(?:[\'"]),\s*label:\s*(?:[\'"])[^\'"]+(?:[\'"])\s*\})\]'
    content = re.sub(pattern, r'[\2, \1]', content)

    # Sometimes there's complex mappings:
    # [...sites.map((site) => ({ value: String(site.id), label: site.name || site.id })), { value: '__CUSTOM__', label: '[Create new location]' }]
    pattern2 = r'\[(\.\.\.[a-zA-Z0-9_\.]+\.map\([^\]]+\)),\s*(\{\s*value:\s*(?:[\'"])__CUSTOM__(?:[\'"]),\s*label:\s*(?:[\'"])[^\'"]+(?:[\'"])\s*\})\]'
    
    # We need to be careful with pattern2 because of nested parentheses.
    # Instead, let's use a simpler approach: finding `{ value: '__CUSTOM__' ... }` and seeing if it follows a spread.
    
    # Actually, we can use a more generic substitution that matches `[...SOMETHING, { value: '__CUSTOM__', label: 'SOMETHING' }]`
    # We can match `\[(\.\.\.[^,\]]+(?:,[^,\]]+)*?),\s*(\{\s*value:\s*'__CUSTOM__',\s*label:\s*'[^']+'\s*\})\]`
    
    # Let's write a targeted function to find the exact occurrences and replace them.
    
    if content != original:
        print(f"Updated {filepath} using standard pattern")
        with open(filepath, 'w', encoding='utf-8') as f:
            f.write(content)

