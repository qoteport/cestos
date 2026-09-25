filepath = "src/components/FinancePortalWorkspace.tsx"
with open(filepath, "r", encoding="utf-8") as f:
    content = f.read()

target = """            {/* KPI Summary Cards */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
              <div className="p-4 bg-card border rounded-2xl shadow-xs space-y-1">
                <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider block">Total Expenditure</span>
                <p className="text-2xl font-black text-violet-600">${totalExp.toLocaleString()}</p>
                <span className="text-[10px] text-muted-foreground">{count} claims submitted</span>
              </div>
              <div className="p-4 bg-card border rounded-2xl shadow-xs space-y-1">
                <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider block">Average Claim Value</span>
                <p className="text-2xl font-black text-foreground">${Math.round(avgClaim).toLocaleString()}</p>
                <span className="text-[10px] text-muted-foreground">Per expense voucher</span>
              </div>
              <div className="p-4 bg-card border rounded-2xl shadow-xs space-y-1">
                <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider block">Highest Single Claim</span>
                <p className="text-2xl font-black text-emerald-600">${maxClaim.toLocaleString()}</p>
                <span className="text-[10px] text-muted-foreground">Peak expenditure item</span>
              </div>
              <div className="p-4 bg-card border rounded-2xl shadow-xs space-y-1">
                <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider block">Line Items Purchased</span>
                <p className="text-2xl font-black text-amber-600">{totalItemsCount}</p>
                <span className="text-[10px] text-muted-foreground">Purchased items count</span>
              </div>
            </div>"""

replacement = """            {/* KPI Summary Cards */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
              <div className="p-4 bg-card border rounded-2xl shadow-xs space-y-1">
                <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider block">Total Expenditure</span>
                <p className="text-2xl font-black text-violet-600">${totalExp.toLocaleString()}</p>
                <span className="text-[10px] text-muted-foreground">All recorded vouchers</span>
              </div>
              <div className="p-4 bg-card border rounded-2xl shadow-xs space-y-1">
                <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider block">Total Claims</span>
                <p className="text-2xl font-black text-foreground">{count}</p>
                <span className="text-[10px] text-muted-foreground">Operational Expense Claims</span>
              </div>
              <div className="p-4 bg-card border rounded-2xl shadow-xs space-y-1">
                <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider block">Average Claim Value</span>
                <p className="text-2xl font-black text-emerald-600">${avgClaim.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
                <span className="text-[10px] text-muted-foreground">Mean expenditure per claim</span>
              </div>
              <div className="p-4 bg-card border rounded-2xl shadow-xs space-y-1">
                <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider block">Line Items Purchased</span>
                <p className="text-2xl font-black text-amber-600">{totalItemsCount}</p>
                <span className="text-[10px] text-muted-foreground">Purchased items count</span>
              </div>
            </div>"""

if target in content:
    content = content.replace(target, replacement)
    with open(filepath, "w", encoding="utf-8") as f:
        f.write(content)
    print("Successfully updated Finance Expenses metrics!")
else:
    print("Target string not found in FinancePortalWorkspace.tsx!")
