import os

def swap_custom_in_file(filepath):
    with open(filepath, 'r', encoding='utf-8') as f:
        lines = f.readlines()
        
    out_lines = []
    i = 0
    changed = False
    while i < len(lines):
        line = lines[i]
        
        # Look for the start of the array
        if 'const itemOptions = useMemo(() => [' in line:
            out_lines.append(line)
            # The next lines are array elements
            # line i+1 is ...inventory.map
            # line i+2 is { value: '__CUSTOM__', ... }
            map_line = lines[i+1]
            custom_line = lines[i+2]
            if '__CUSTOM__' in custom_line or 'Create a new' in custom_line:
                out_lines.append(custom_line)
                out_lines.append(map_line)
                changed = True
                i += 2
            else:
                pass
        elif 'const payeeOptions = useMemo(() => [' in line:
            out_lines.append(line)
            map_line = lines[i+1]
            custom_line = lines[i+2]
            if '__NEW__' in custom_line or 'Add a new' in custom_line or 'Create a new' in custom_line:
                out_lines.append(custom_line)
                out_lines.append(map_line)
                changed = True
                i += 2
            else:
                pass
        else:
            out_lines.append(line)
        i += 1
        
    if changed:
        with open(filepath, 'w', encoding='utf-8') as f:
            f.writelines(out_lines)
        print(f"Fixed arrays in {filepath}")

swap_custom_in_file('src/components/OperationalExpenseSubmissionModal.tsx')
