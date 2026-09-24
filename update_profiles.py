import re

# 1. Finance Portal
with open("src/components/FinancePortalWorkspace.tsx", "r", encoding="utf-8") as f:
    content = f.read()

# Header button injection
finance_header_btn = """
            <button
              onClick={() => router.push('/finance-portal/my-profile')}
              className="hidden md:flex items-center gap-2 pl-3 border-l border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/50 p-1.5 -my-1.5 rounded-lg transition text-left"
              title="View My Profile"
            >
              <div className="w-8 h-8 rounded-full bg-violet-600 text-white font-bold text-xs flex items-center justify-center shadow-xs">
                {user?.first_name ? user.first_name[0] : 'U'}
              </div>
              <div className="text-left text-xs">
                <p className="font-bold text-slate-900 dark:text-slate-100 leading-tight">
                  {user?.first_name ? f"{user.first_name} {user.last_name or ''}".strip() : 'User'}
                </p>
                <p className="text-[10px] text-slate-500 font-medium">View My Profile</p>
              </div>
            </button>
"""
# Need to replace f"" with backticks because we're inside JS string, oops wait! This is JS code.
finance_header_btn = finance_header_btn.replace('f"{user.first_name} {user.last_name or \'\'}".strip()', '`${user.first_name} ${user.last_name || \'\'}`.trim()')

# Inject before hamburger menu
content = content.replace(
    '<button className="!hidden p-1.5 text-slate-600" onClick={() => setMobileMenuOpen(!mobileMenuOpen)}>',
    finance_header_btn + '\n            <button className="!hidden p-1.5 text-slate-600" onClick={() => setMobileMenuOpen(!mobileMenuOpen)}>'
)

# Remove MY_PROFILE references
content = content.replace(" | 'MY_PROFILE'", "")
content = content.replace(", 'MY_PROFILE'", "")
content = re.sub(r'\{\s*id:\s*\'MY_PROFILE\'.*?\},?\n?', '', content)

# Remove the render block
content = re.sub(
    r'case \'MY_PROFILE\':\s*return \(\s*<div.*?</div>\s*\);\s*',
    '',
    content,
    flags=re.DOTALL
)

with open("src/components/FinancePortalWorkspace.tsx", "w", encoding="utf-8") as f:
    f.write(content)


# 2. Field Admin Portal
with open("src/components/FieldAdminPortalWorkspace.tsx", "r", encoding="utf-8") as f:
    content = f.read()

fieldadmin_header_btn = """
            <button
              onClick={() => router.push('/field-admin-portal/my-profile')}
              className="hidden md:flex items-center gap-2 pl-3 border-l border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/50 p-1.5 -my-1.5 rounded-lg transition text-left"
              title="View My Profile"
            >
              <div className="w-8 h-8 rounded-full bg-orange-600 text-white font-bold text-xs flex items-center justify-center shadow-xs">
                {user?.first_name ? user.first_name[0] : 'U'}
              </div>
              <div className="text-left text-xs">
                <p className="font-bold text-slate-900 dark:text-slate-100 leading-tight">
                  {user?.first_name ? `${user.first_name} ${user.last_name || ''}`.trim() : 'Admin'}
                </p>
                <p className="text-[10px] text-slate-500 font-medium">View My Profile</p>
              </div>
            </button>
"""

content = content.replace(
    '<button className="!hidden p-1.5 text-slate-600" onClick={() => setMobileMenuOpen(!mobileMenuOpen)}>',
    fieldadmin_header_btn + '\n            <button className="!hidden p-1.5 text-slate-600" onClick={() => setMobileMenuOpen(!mobileMenuOpen)}>'
)

content = content.replace(" | 'MY_PROFILE'", "")
content = content.replace(", 'MY_PROFILE'", "")
content = re.sub(r'\{\s*id:\s*\'MY_PROFILE\'.*?\},?\n?', '', content)

# Remove 'MY_PROFILE' from the hidden array:
content = content.replace("'MY_PROFILE', ", "")

content = re.sub(
    r'\{activeTab === \'MY_PROFILE\' && \(\s*<div.*?</div>\s*\)\s*\}\s*',
    '',
    content,
    flags=re.DOTALL
)

with open("src/components/FieldAdminPortalWorkspace.tsx", "w", encoding="utf-8") as f:
    f.write(content)

print("Updated Workspaces")
