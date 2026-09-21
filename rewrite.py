import sys

with open('c:/Users/User/Documents/Projects/cestos-apps/cestos/src/components/ControlTowerWorkspace.tsx', 'r', encoding='utf-8') as f:
    lines = f.readlines()

new_lines = []
skip = False

for i, line in enumerate(lines):
    if 'const [activeTab, setActiveTab]' in line:
        continue
    if 'const [search, setSearch] = useState' in line:
        continue
    if 'const [selectedScorecard, setSelectedScorecard]' in line:
        continue
    if 'const [selectedOpp, setSelectedOpp]' in line:
        continue
    if 'const [showAddScorecard, setShowAddScorecard]' in line:
        continue
    if 'const [showAddOpp, setShowAddOpp]' in line:
        continue
    if 'const [editingOpp, setEditingOpp]' in line:
        continue
    if 'const [editOppForm, setEditOppForm]' in line:
        continue
    if 'const [scorecards, setScorecards]' in line:
        continue
    if 'const [opportunities, setOpportunities]' in line:
        continue

    # Skip useEffect for subResource active tab
    if 'if (subResource === \'scorecards\') setActiveTab' in line:
        continue
    if 'else if (subResource === \'opportunities\'' in line:
        continue

    # Tabs container
    if '{/* Tabs */}' in line:
        skip = True
    if skip and '</div>' in line and '{/* TAB 1: EXECUTIVE OVERVIEW */}' in lines[i+2]:
        skip = False
        continue

    # Wrapper around summary
    if "{activeTab === 'SUMMARY' && (" in line:
        continue
    
    # End of TAB 1 wrapper
    if 'TAB 2: FIELD LEADERSHIP OPERATIONS' in line:
        # Before adding this line, we need to add the closing div for the space-y-6 of the overview, wait no! The space-y-6 div was opened inside the wrapper.
        # So we don't need to close it if we just truncate everything here.
        # But wait, there is a </div> from space-y-6. It is followed by )}
        pass

    new_lines.append(line)

with open('c:/Users/User/Documents/Projects/cestos-apps/cestos/src/components/ControlTowerWorkspace_tmp.tsx', 'w', encoding='utf-8') as f:
    f.writelines(new_lines)
