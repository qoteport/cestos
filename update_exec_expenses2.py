filepath = "src/components/ExecutivePortalWorkspace.tsx"
with open(filepath, "r", encoding="utf-8") as f:
    content = f.read()

start_marker = "TAB 2: EXPENSES"
idx = content.find(start_marker)
if idx != -1:
    grid_start = content.find("<div className=\"grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4\">", idx)
    grid_end = content.find("</div>\n\n            {/* Expenses Read Only Component */}", grid_start)
    if grid_end == -1:
        grid_end = content.find("</div>\n\n            {/*", grid_start)
    
    if grid_start != -1 and grid_end != -1:
        # Include closing tag of grid
        grid_end += 6
        
        replacement = """<div>
              <h2 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
                Operational Expenses
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 font-medium">
                Expenditure tracking, vendor analytics, frequency intelligence, and expense claim management.
              </p>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-xs">
                <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Total Expenditure</p>
                <p className="text-2xl font-black text-slate-900 dark:text-white mt-1">
                  ${expenses.reduce((acc, e) => acc + Number(e.total_cost || e.amount || 0), 0).toLocaleString()}
                </p>
                <p className="text-[11px] text-indigo-600 font-bold mt-1">All Recorded Vouchers</p>
              </div>

              <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-xs">
                <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Total Claims</p>
                <p className="text-2xl font-black text-indigo-600 mt-1">{expenses.length}</p>
                <p className="text-[11px] text-indigo-600 font-bold mt-1">Operational Expense Claims</p>
              </div>

              <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-xs">
                <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Average Claim Value</p>
                <p className="text-2xl font-black text-emerald-600 mt-1">
                  ${(expenses.length > 0 ? expenses.reduce((acc, e) => acc + Number(e.total_cost || e.amount || 0), 0) / expenses.length : 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </p>
                <p className="text-[11px] text-emerald-600 font-bold mt-1">Mean expenditure per claim</p>
              </div>

              <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-xs">
                <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Pending Approvals</p>
                <p className="text-2xl font-black text-amber-600 mt-1">
                  $
                  {expenses
                    .filter((e) => (e.status || '').toUpperCase() === 'SUBMITTED' || (e.status || '').toUpperCase() === 'PENDING')
                    .reduce((acc, e) => acc + Number(e.total_cost || e.amount || 0), 0)
                    .toLocaleString()}
                </p>
                <p className="text-[11px] text-amber-600 font-bold mt-1">{unresolvedClaimsCount} Unresolved Claims</p>
              </div>
            </div>"""

        content = content[:grid_start] + replacement + content[grid_end:]
        with open(filepath, "w", encoding="utf-8") as f:
            f.write(content)
        print("Updated Executive Expenses KPI cards and header!")
    else:
        print(f"grid_start: {grid_start}, grid_end: {grid_end}")
else:
    print("start_marker not found")
