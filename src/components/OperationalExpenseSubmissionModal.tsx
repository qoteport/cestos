'use client';

import { FormEvent, useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { apiFetch } from '@/lib/api';
import SearchableSelect from './SearchableSelect';

type Row = Record<string, any>;
type ExpenseItem = { inventory_item_id: string; name: string; quantity: string; unit_cost: string; custom_item?: boolean };
const blankItem = (): ExpenseItem => ({ inventory_item_id: '', name: '', quantity: '1', unit_cost: '0', custom_item: false });
const inputClass = 'w-full rounded-lg border bg-background p-2.5';

export default function OperationalExpenseSubmissionModal({ onClose, onSubmitted, projectId, initialPurchaseOrder }: { onClose: () => void; onSubmitted: (expense: Row) => void; projectId?: string; initialPurchaseOrder?: Row }) {
  const [payees, setPayees] = useState<Row[]>([]);
  const [inventory, setInventory] = useState<Row[]>([]);
  const [purchaseOrders, setPurchaseOrders] = useState<Row[]>([]);
  const [purchaseOrderId, setPurchaseOrderId] = useState('');
  const [payeeId, setPayeeId] = useState('');
  const [payName, setPayName] = useState('');
  const [phone, setPhone] = useState('');
  const [bank, setBank] = useState('');
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [method, setMethod] = useState('MOBILE_MONEY');
  const [invoice, setInvoice] = useState<File | null>(null);
  const [manualTotal, setManualTotal] = useState(false);
  const [manualAmount, setManualAmount] = useState('');
  const [items, setItems] = useState<ExpenseItem[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  function applyPurchaseOrder(po: Row, availablePayees: Row[] = payees) {
    setPurchaseOrderId(String(po.id));
    const orderItems = (po.items || []).map((line: Row) => ({
      inventory_item_id: line.inventory_item_id || '',
      name: line.item_name || line.description || '',
      quantity: String(line.quantity_ordered || 1),
      unit_cost: String(line.unit_price || 0),
      custom_item: !line.inventory_item_id,
    }));
    setItems(orderItems);
    setManualTotal(orderItems.length === 0);
    setManualAmount(orderItems.length ? '' : String(po.total_amount || ''));

    const supplierName = String(po.supplier_name || '').trim();
    if (!supplierName) return;
    const savedPayee = availablePayees.find((payee) => String(payee.name || '').trim().toLowerCase() === supplierName.toLowerCase());
    if (savedPayee) {
      setPayeeId(String(savedPayee.id));
      setPayName(savedPayee.name || supplierName);
      setPhone(savedPayee.phone || '');
      setBank(savedPayee.bank_account_details || '');
    } else {
      setPayeeId('__NEW__');
      setPayName(supplierName);
      setPhone('');
      setBank('');
    }
  }

  useEffect(() => {
    let active = true;
    Promise.all([
      apiFetch<Row[]>('/api/v1/operational-expenses/payees'),
      apiFetch<any>('/api/v1/inventory/items?page_size=200'),
      apiFetch<Row[]>('/api/v1/procurement/purchase-orders'),
    ]).then(([payeeRows, inventoryResponse, poRows]) => {
      if (!active) return;
      setPayees(Array.isArray(payeeRows) ? payeeRows : []);
      setInventory(Array.isArray(inventoryResponse) ? inventoryResponse : inventoryResponse?.items || []);
      const approvedOrders = (Array.isArray(poRows) ? poRows : []).filter((po) => String(po.status).toUpperCase() === 'APPROVED' && (!projectId || String(po.project_id || '') === projectId));
      setPurchaseOrders(approvedOrders);
      if (initialPurchaseOrder) {
        const po = approvedOrders.find((row) => String(row.id) === String(initialPurchaseOrder.id)) || initialPurchaseOrder;
        applyPurchaseOrder(po, Array.isArray(payeeRows) ? payeeRows : []);
      }
    }).catch((exception) => { if (active) setError(exception instanceof Error ? exception.message : 'Could not load expense options.'); });
    return () => { active = false; };
  }, [projectId, initialPurchaseOrder?.id]);

  const itemOptions = useMemo(() => [
    { value: '__CUSTOM__', label: 'Create a new item…' },
    ...inventory.map((item) => ({ value: String(item.id), label: `${item.name || item.item_name || 'Inventory item'}${item.code ? ` · ${item.code}` : ''}`, sublabel: `Unit: ${item.unit_of_measure || item.unit || 'PCS'}` })),
  ], [inventory]);
  const payeeOptions = useMemo(() => [
    { value: '__NEW__', label: 'Add a new payee…' },
    ...payees.map((payee) => ({ value: String(payee.id), label: payee.name, sublabel: [payee.phone, payee.bank_account_details].filter(Boolean).join(' · ') })),
  ], [payees]);
  const calculatedTotal = items.reduce((sum, item) => sum + (Number(item.quantity) || 0) * (Number(item.unit_cost) || 0), 0);

  const updateItem = (index: number, updates: Partial<ExpenseItem>) => setItems((rows) => rows.map((row, i) => i === index ? { ...row, ...updates } : row));
  const chooseInventoryItem = (index: number, id: string) => {
    if (id === '__CUSTOM__') { updateItem(index, { inventory_item_id: '', name: '', custom_item: true }); return; }
    const item = inventory.find((row) => String(row.id) === id);
    updateItem(index, { inventory_item_id: id, name: item?.name || item?.item_name || '', unit_cost: String(item?.unit_cost ?? item?.standard_cost ?? item?.average_cost ?? 0), custom_item: false });
  };

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (!invoice) { setError('Attach the invoice or supporting document.'); return; }
    if (!payName.trim()) { setError('Enter who the expense is payable to.'); return; }
    if (items.some((item) => !item.name.trim() || Number(item.quantity) <= 0 || Number(item.unit_cost) < 0)) { setError('Complete each item name, quantity, and unit cost, or remove the blank item.'); return; }
    if (items.length === 0 && !manualTotal) { setError('Enter the total manually when no purchased items are listed.'); return; }
    if (manualTotal && (!manualAmount || Number(manualAmount) < 0)) { setError('Enter a valid manual total.'); return; }
    setBusy(true); setError('');
    try {
      const data = {
        purchase_order_id: purchaseOrderId || undefined,
        payee_id: payeeId && payeeId !== '__NEW__' ? payeeId : undefined,
        pay_to_name: payName.trim(),
        pay_to_phone: phone.trim() || undefined,
        bank_account_details: bank.trim() || undefined,
        expense_date: date,
        payment_method: method,
        items: items.map((item) => ({ inventory_item_id: item.inventory_item_id || undefined, name: item.name.trim(), quantity: Number(item.quantity), unit_cost: Number(item.unit_cost) })),
        total_cost: manualTotal ? Number(manualAmount) : undefined,
        manual_total: manualTotal,
      };
      const form = new FormData();
      form.append('expense_json', JSON.stringify(data));
      form.append('invoice', invoice);
      const created = await apiFetch<Row>('/api/v1/operational-expenses', { method: 'POST', body: form });
      onSubmitted(created);
    } catch (exception) {
      setError(exception instanceof Error ? exception.message : 'Could not submit expense to Finance.');
    } finally { setBusy(false); }
  }

  return createPortal(
    <div className="fixed inset-0 z-[99999] flex items-center justify-center bg-black/70 backdrop-blur-xs p-0 sm:p-4 overflow-hidden" onClick={(event) => { if (event.target === event.currentTarget) onClose(); }}>
      <section role="dialog" aria-modal="true" aria-label="Log operational expense" className="flex h-[100dvh] sm:h-auto sm:max-h-[90vh] w-full max-w-full sm:max-w-3xl flex-col overflow-hidden rounded-none sm:rounded-2xl border-0 sm:border border-slate-200 dark:border-slate-800 bg-white shadow-2xl dark:bg-slate-900">
        <header className="flex items-center justify-between border-b p-4 sm:p-5 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md shrink-0 sticky top-0 z-10">
          <div>
            <h2 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white">Submit Operational Expense Claim</h2>
            <p className="mt-0.5 text-xs text-slate-500">Submit purchased items and invoice details to Finance.</p>
          </div>
          <button type="button" aria-label="Close" onClick={onClose} className="rounded-full p-1.5 text-slate-500 hover:bg-slate-100 hover:text-slate-900 dark:hover:bg-slate-800 dark:hover:text-white transition">×</button>
        </header>
        <form onSubmit={submit} className="flex flex-col h-full overflow-hidden">
          <div className="flex-1 space-y-4 overflow-y-auto p-4 sm:p-6 text-xs">
            {error && <p role="alert" className="rounded-lg border border-red-300 bg-red-50 p-3 text-red-800">{error}</p>}
            <section className="grid gap-3 rounded-xl border bg-slate-50 p-3 dark:bg-slate-800/40 sm:grid-cols-2">
              <label className="block space-y-1 font-semibold sm:col-span-2">
                <span className="block">Approved purchase order (optional)</span>
                <SearchableSelect
                  value={purchaseOrderId}
                  onChange={(value) => {
                    const po = purchaseOrders.find((row) => String(row.id) === value);
                    if (po) applyPurchaseOrder(po);
                    else setPurchaseOrderId(value);
                  }}
                  options={purchaseOrders.map((po) => ({ value: String(po.id), label: `${po.po_number} · ${po.currency} ${Number(po.total_amount || 0).toLocaleString()}` }))}
                  placeholder="Link an approved purchase order…"
                />
              </label>
              <label className="block space-y-1 font-semibold sm:col-span-2">
                <span className="block">Pay to name *</span>
                {payeeId === '__NEW__' ? (
                  <>
                    <input autoFocus required className={inputClass} value={payName} onChange={(event) => setPayName(event.target.value)} placeholder="Enter the payee name" />
                    <button type="button" className="mt-1 text-orange-700 underline" onClick={() => { setPayeeId(''); setPayName(''); }}>Choose a saved payee</button>
                  </>
                ) : (
                  <SearchableSelect
                    value={payeeId}
                    onChange={(value) => {
                      if (value === '__NEW__') { setPayeeId('__NEW__'); setPayName(''); setPhone(''); setBank(''); return; }
                      setPayeeId(value);
                      const payee = payees.find((row) => String(row.id) === value);
                      if (payee) { setPayName(payee.name || ''); setPhone(payee.phone || ''); setBank(payee.bank_account_details || ''); }
                    }}
                    options={payeeOptions}
                    placeholder="Choose a saved payee or add a new one..."
                  />
                )}
              </label>
              {method === 'BANK_TRANSFER' && <label className="block space-y-1 font-semibold sm:col-span-2"><span className="block">Bank account details</span><textarea rows={4} className={inputClass} value={bank} onChange={(event) => setBank(event.target.value)} placeholder="Bank name, account name, account number, branch or other payment instructions" /></label>}
              {method === 'MOBILE_MONEY' && <label className="block space-y-1 font-semibold sm:col-span-2"><span className="block">Phone number</span><input type="tel" className={inputClass} value={phone} onChange={(event) => setPhone(event.target.value)} placeholder="Enter the payee's mobile money number" /></label>}
              <label className="block space-y-1 font-semibold"><span className="block">Date *</span><input required type="date" className={inputClass} value={date} onChange={(event) => setDate(event.target.value)} /></label>
              <label className="block space-y-1 font-semibold"><span className="block">Pay by *</span><select required className={inputClass} value={method} onChange={(event) => setMethod(event.target.value)}>{[['MOBILE_MONEY','Phone / mobile money'],['BANK_TRANSFER','Bank transfer'],['CASH','Cash'],['CARD','Card'],['OTHER','Other']].map(([value,label]) => <option key={value} value={value}>{label}</option>)}</select></label>
            </section>
            <section className="space-y-3 rounded-xl border p-3">
              <div className="flex items-center justify-between"><h3 className="font-bold text-slate-800 dark:text-slate-100">Items purchased</h3><button type="button" onClick={() => setItems((rows) => [...rows, blankItem()])} className="font-bold text-orange-700 dark:text-orange-400">+ Add item</button></div>
              {items.length === 0 && <p className="rounded-lg border border-dashed p-3 text-slate-500">No purchased items added. You can submit an expense with a manually entered total.</p>}
              {items.map((item, index) => (
                <div key={index} className="grid gap-2 rounded-lg border bg-slate-50 p-3 dark:bg-slate-800/40 sm:grid-cols-3">
                  <label className="block space-y-1 font-semibold sm:col-span-1">
                    <span className="block">Inventory item / item name *</span>
                    {item.custom_item ? (
                      <>
                        <input autoFocus required className={inputClass} value={item.name} onChange={(event) => updateItem(index, { name: event.target.value })} placeholder="Enter a new item name" />
                        <button type="button" className="mt-1 text-orange-700 underline" onClick={() => updateItem(index, { custom_item: false, name: '' })}>Choose an inventory item</button>
                      </>
                    ) : (
                      <SearchableSelect value={item.inventory_item_id || ''} onChange={(id) => chooseInventoryItem(index, id)} options={itemOptions} placeholder="Search items or create one..." />
                    )}
                  </label>
                  <label className="block space-y-1 font-semibold">
                    <span className="block">Quantity *</span>
                    <input required type="number" min="0.001" step="0.001" className={inputClass} value={item.quantity} onChange={(event) => updateItem(index, { quantity: event.target.value })} />
                  </label>
                  <label className="block space-y-1 font-semibold">
                    <span className="block">Unit cost *</span>
                    <input required type="number" min="0" step="0.01" className={inputClass} value={item.unit_cost} onChange={(event) => updateItem(index, { unit_cost: event.target.value })} />
                  </label>
                  <button type="button" onClick={() => setItems((rows) => rows.filter((_, i) => i !== index))} className="justify-self-start font-semibold text-red-700 hover:underline">Remove item</button>
                </div>
              ))}
            </section>
            <section className="grid gap-3 rounded-xl border p-3 sm:grid-cols-2">
              <label className="flex items-center gap-2 font-semibold sm:col-span-2"><input type="checkbox" checked={manualTotal} onChange={(event) => setManualTotal(event.target.checked)} /> Enter total manually</label>
              <label className="block space-y-1 font-semibold sm:col-span-2"><span className="block">Total cost {manualTotal ? '*' : '(calculated)'}</span><input type="number" min="0" step="0.01" required={manualTotal} readOnly={!manualTotal} className={inputClass} value={manualTotal ? manualAmount : calculatedTotal.toFixed(2)} onChange={(event) => setManualAmount(event.target.value)} /></label>
              <label className="block space-y-1 font-semibold sm:col-span-2"><span className="block">Invoice upload *</span><input type="file" required accept=".pdf,.png,.jpg,.jpeg,.doc,.docx,.xls,.xlsx,.txt,.csv" className={inputClass} onChange={(event) => setInvoice(event.target.files?.[0] || null)} /></label>
              <p className="sm:col-span-2 text-slate-500">After submission, the expense status is <strong>Submitted</strong> and Finance is notified. Finance uploads the payment receipt when marking it complete.</p>
            </section>
          </div>
          {/* Sticky Footer */}
          <div className="sticky bottom-0 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-t border-slate-200 dark:border-slate-800 p-3.5 sm:px-6 sm:py-4 shrink-0 flex flex-row items-center justify-end gap-2 sm:gap-3 z-10">
            <button type="button" onClick={onClose} className="rounded-lg border px-4 py-2 font-semibold hover:bg-slate-50 dark:hover:bg-slate-800 transition w-full sm:w-auto">Cancel</button>
            <button type="submit" disabled={busy} className="rounded-lg bg-orange-600 px-5 py-2 font-bold text-white hover:bg-orange-700 disabled:opacity-50 transition w-full sm:w-auto">{busy ? 'Submitting…' : 'Submit expense to Finance'}</button>
          </div>
        </form>
      </section>
    </div>,
    document.body
  );
}
