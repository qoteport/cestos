import os

filepath = 'src/components/FinancePortalWorkspace.tsx'
with open(filepath, 'r', encoding='utf-8') as f:
    content = f.read()

# 1. Inject useMemo
memo_code = """
  const pendingItemsCount = useMemo(() => {
    let count = 0;
    count += expenses.filter((e: any) => e.status === 'PENDING' || e.status === 'REVIEW' || e.status === 'SUBMITTED').length;
    count += purchaseOrders.filter((po: any) => po.status === 'PENDING' || po.status === 'DRAFT').length;
    count += invoices.filter((i: any) => i.status === 'DRAFT' || i.status === 'PENDING').length;
    return count;
  }, [expenses, purchaseOrders, invoices]);

"""
content = content.replace('  //  Scoping & Filtering Helpers', memo_code + '  //  Scoping & Filtering Helpers')


# 2. Inject Bell Button
bell_code = """
            <button
              onClick={() => setActiveTab('NOTIFICATIONS')}
              className="relative p-2 rounded-xl border border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 transition"
              title="Notifications"
            >
              <Bell size={16} />
              {pendingItemsCount > 0 && (
                <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 text-white text-[9px] font-bold rounded-full flex items-center justify-center border-2 border-white dark:border-slate-950">
                  {pendingItemsCount}
                </span>
              )}
            </button>
"""

# Insert before signOut
content = content.replace(
    '            <button\n              onClick={() => void signOut()}',
    bell_code + '\n            <button\n              onClick={() => void signOut()}'
)

with open(filepath, 'w', encoding='utf-8') as f:
    f.write(content)

print("Injected Bell Notifications System to Finance Portal")
