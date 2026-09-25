import os

filepath = 'src/components/FinancePortalWorkspace.tsx'
with open(filepath, 'r', encoding='utf-8') as f:
    content = f.read()

memo_code = """
  const pendingItemsCount = useMemo(() => {
    let count = 0;
    count += expenses.filter((e: any) => e.status === 'PENDING' || e.status === 'REVIEW' || e.status === 'SUBMITTED').length;
    count += purchaseOrders.filter((po: any) => po.status === 'PENDING' || po.status === 'DRAFT').length;
    count += invoices.filter((i: any) => i.status === 'DRAFT' || i.status === 'PENDING').length;
    return count;
  }, [expenses, purchaseOrders, invoices]);

"""

if 'const pendingItemsCount =' not in content:
    # Let's inject it right after `return () => { active = false; };\n  }, [activeTab, user?.id, version]);`
    content = content.replace('  }, [activeTab, user?.id, version]);', '  }, [activeTab, user?.id, version]);\n' + memo_code)

with open(filepath, 'w', encoding='utf-8') as f:
    f.write(content)
print("Injected pendingItemsCount")
