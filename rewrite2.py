import re

with open('c:/Users/User/Documents/Projects/cestos-apps/cestos/src/components/ControlTowerWorkspace.tsx', 'r', encoding='utf-8') as f:
    text = f.read()

# Remove the active tab and effects
text = re.sub(
    r"const \[activeTab, setActiveTab\] = useState.*?\n.*?const \[search, setSearch\] = useState\(''\);\n.*?const \[selectedScorecard.*?null\);\n.*?const \[selectedOpp.*?null\);\n.*?useEffect\(\(\) => \{\n.*?\}, \[subResource\]\);\n",
    "",
    text,
    flags=re.DOTALL
)

# Also remove scorecard & opp states so TS doesn't complain about unused variables
text = re.sub(r"const \[search, setSearch\].*?\n", "", text)
text = re.sub(r"const \[selectedScorecard, setSelectedScorecard\].*?\n", "", text)
text = re.sub(r"const \[selectedOpp, setSelectedOpp\].*?\n", "", text)
text = re.sub(r"const \[scorecards, setScorecards\].*?\n", "", text)
text = re.sub(r"const \[opportunities, setOpportunities\].*?\n", "", text)
text = re.sub(r"const \[supervisorSearch, setSupervisorSearch\].*?\n", "", text)

# The form states
text = re.sub(r"// New Scorecard Form State.*?// New Opp Form State", "// New Opp Form State", text, flags=re.DOTALL)
text = re.sub(r"// New Opp Form State.*?(?=const reload =)", "", text, flags=re.DOTALL)

# Delete tabs UI
text = re.sub(
    r"\{\/\* Tabs \*\/\}.*?\{\/\* TAB 1: EXECUTIVE OVERVIEW \*\/\}",
    "{/* EXECUTIVE OVERVIEW */}",
    text,
    flags=re.DOTALL
)

# Remove the opening wrapper {activeTab === 'SUMMARY' && (
text = text.replace("{activeTab === 'SUMMARY' && (\n        <div className=\"space-y-6\">\n", "        <div className=\"space-y-6\">\n")

# Now, we need to cut from         </div>\n      )}\n\n      {/* TAB 2: all the way to       <ErrorModal
text = re.sub(
    r"        </div>\n      \)\}\n\n      \{\/\* TAB 2: FIELD LEADERSHIP OPERATIONS \*\/\}.*?(?=      <ErrorModal)",
    "        </div>\n\n",
    text,
    flags=re.DOTALL
)

# Delete the data fetching lines for scorecards and opportunities
text = re.sub(r"const sc = await \w+\('/api/v1/projects/scorecards/all'\);\n\s*setScorecards\(sc\);\n", "", text)
text = re.sub(r"const ops = await \w+\('/api/v1/projects/commercial-opportunities/all'\);\n\s*setOpportunities\(ops\);\n", "", text)

# Let's write back
with open('c:/Users/User/Documents/Projects/cestos-apps/cestos/src/components/ControlTowerWorkspace.tsx', 'w', encoding='utf-8') as f:
    f.write(text)

print('Success')
