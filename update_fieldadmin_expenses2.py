filepath = "src/components/FieldAdminPortalWorkspace.tsx"
with open(filepath, "r", encoding="utf-8") as f:
    content = f.read()

idx = content.find("Expense KPI & Intelligence Summary Cards")
if idx != -1:
    grid_start = content.find("<div className=\"grid grid-cols-2 lg:grid-cols-4 gap-3.5\">", idx)
    grid_end = content.find("</div>", grid_start)
    # Find the closing </div> of the 4th card then the container </div>
    for _ in range(4):
        grid_end = content.find("</div>", grid_end + 1)
    grid_end += 6

    replacement = """<div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5">
                  <div className="bg-white dark:bg-slate-900 border rounded-xl p-4 space-y-1">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Total Expenditure</span>
                    <p className="text-xl font-black text-orange-600">
                      ${expenseIntelligenceMetrics.totalExp.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </p>
                    <span className="text-[11px] text-slate-500 font-medium">All recorded vouchers</span>
                  </div>

                  <div className="bg-white dark:bg-slate-900 border rounded-xl p-4 space-y-1">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Total Claims</span>
                    <p className="text-xl font-black text-slate-900 dark:text-white">
                      {expenseIntelligenceMetrics.count}
                    </p>
                    <span className="text-[11px] text-slate-500 font-medium">Operational Expense Claims</span>
                  </div>

                  <div className="bg-white dark:bg-slate-900 border rounded-xl p-4 space-y-1">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Average Claim Value</span>
                    <p className="text-xl font-black text-emerald-600">
                      ${expenseIntelligenceMetrics.avgClaim.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </p>
                    <span className="text-[11px] text-slate-500 font-medium">Mean expenditure per claim</span>
                  </div>

                  <div className="bg-white dark:bg-slate-900 border rounded-xl p-4 space-y-1">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Total Purchased Line Items</span>
                    <p className="text-xl font-black text-amber-600">
                      {expenseIntelligenceMetrics.totalItemsCount}
                    </p>
                    <span className="text-[11px] text-slate-500 font-medium">Purchased items count</span>
                  </div>
                </div>"""

    content = content[:grid_start] + replacement + content[grid_end:]
    with open(filepath, "w", encoding="utf-8") as f:
        f.write(content)
    print("Successfully updated FieldAdmin Expenses KPI cards!")
else:
    print("Expense KPI & Intelligence Summary Cards not found")
