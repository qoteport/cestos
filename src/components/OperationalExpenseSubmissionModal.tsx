'use client';

import { FormEvent, useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { X, Plus, Loader2, Trash2, Paperclip } from 'lucide-react';
import { apiFetch } from '@/lib/api';
import SearchableSelect from './SearchableSelect';
import AppDateTimePicker from './AppDateTimePicker';
import { PurchaseOrderCategoryField } from './PurchaseOrderCategoryField';

type Row = Record<string, any>;
type ExpenseItem = { inventory_item_id: string; name: string; description?: string; quantity: string; unit_cost: string; custom_item?: boolean; is_auto_generated?: boolean };
const blankItem = (): ExpenseItem => ({ inventory_item_id: '', name: '', quantity: '1', unit_cost: '0', custom_item: false, is_auto_generated: false });
const inputClass = 'w-full rounded-lg border bg-background p-2.5';

export default function OperationalExpenseSubmissionModal({ onClose, onSubmitted, projectId, initialPurchaseOrder, initialDocumentDraft }: { onClose: () => void; onSubmitted: (expense: Row) => void; projectId?: string; initialPurchaseOrder?: Row; initialDocumentDraft?: { file: File; data: Row } | null }) {
  const [payees, setPayees] = useState<Row[]>([]);
  const [inventory, setInventory] = useState<Row[]>([]);
  const [purchaseOrders, setPurchaseOrders] = useState<Row[]>([]);
  const [purchaseOrderId, setPurchaseOrderId] = useState('');
  const [payeeId, setPayeeId] = useState('');
  const [payName, setPayName] = useState('');
  const [phone, setPhone] = useState('');
  const [bank, setBank] = useState('');
  const [category, setCategory] = useState('');
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
    if (po.category) setCategory(po.category);
    const orderItems = (po.items || []).map((line: Row) => ({
      inventory_item_id: line.inventory_item_id || '',
      name: line.item_name || line.description || '',
      description: line.description || '',
      quantity: String(line.quantity_ordered || 1),
      unit_cost: String(line.unit_price || 0),
      custom_item: !line.inventory_item_id,
      is_auto_generated: false,
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
      if (savedPayee.payment_method) setMethod(savedPayee.payment_method);
      if (savedPayee.bank_account_type) setCategory(savedPayee.bank_account_type);
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

  useEffect(() => {
    if (!initialDocumentDraft) return;
    const data = initialDocumentDraft.data || {};
    setInvoice(initialDocumentDraft.file);
    setPayName(String(data.pay_to_name || data.supplier_name || '').trim());
    setPayeeId(data.pay_to_name || data.supplier_name ? '__NEW__' : '');
    setPhone(String(data.pay_to_phone || ''));
    setBank(String(data.bank_account_details || ''));
    if (data.expense_date && /^\d{4}-\d{2}-\d{2}$/.test(String(data.expense_date))) setDate(String(data.expense_date));
    const methodValue = String(data.payment_method || '').toUpperCase().replace(/[ -]+/g, '_');
    if (['MOBILE_MONEY', 'BANK_TRANSFER', 'CASH', 'CARD', 'OTHER'].includes(methodValue)) setMethod(methodValue);
    const parsedItems = Array.isArray(data.items) ? data.items.map((item: Row) => ({
      inventory_item_id: '', name: String(item.name || item.item_name || '').trim(),
      description: String(item.description || ''), quantity: String(item.quantity ?? 1),
      unit_cost: String(item.unit_cost ?? item.unit_price ?? 0), custom_item: true, is_auto_generated: false,
    })) : [];
    setItems(parsedItems);
    const total = Number(data.total_cost);
    if (!parsedItems.length && Number.isFinite(total) && total >= 0) { setManualTotal(true); setManualAmount(String(total)); }
    else { setManualTotal(false); setManualAmount(''); }
  }, [initialDocumentDraft]);

  useEffect(() => {
    if (!payName) return;
    const matched = payees.find((p) => String(p.name || '').trim().toLowerCase() === payName.trim().toLowerCase());
    if (matched && (matched.bank_account_type || matched.category)) {
      setCategory(matched.bank_account_type || matched.category);
    }
  }, [payName, payees]);

  useEffect(() => {
    const selectedPayee = payees.find((p) => String(p.id) === payeeId || String(p.name || '').trim().toLowerCase() === payName.trim().toLowerCase());
    const catName = (selectedPayee && (selectedPayee.bank_account_type || selectedPayee.category)) || category || (payName.trim() ? payName.trim() : '');
    if (!catName) return;

    const displayName = `${catName.replace(/_/g, ' ')} (S)`;

    setItems((currentItems) => {
      if (currentItems.length === 0) {
        return [{
          inventory_item_id: '',
          name: displayName,
          description: displayName,
          quantity: '1',
          unit_cost: manualAmount || '0',
          custom_item: true,
          is_auto_generated: true,
        }];
      }
      if (currentItems.length === 1 && currentItems[0].is_auto_generated) {
        return [{
          ...currentItems[0],
          name: displayName,
          description: displayName,
          unit_cost: manualAmount || currentItems[0].unit_cost,
        }];
      }
      return currentItems;
    });
  }, [category, payName, payeeId, payees, manualAmount]);

  const itemOptions = useMemo(() => [
    { value: '__CUSTOM__', label: 'Create a new item…' },
    ...inventory.map((item) => ({ value: String(item.id), label: `${item.name || item.item_name || 'Inventory item'}${item.code ? ` · ${item.code}` : ''}`, sublabel: `Unit: ${item.unit_of_measure || item.unit || 'PCS'}` })),
  ], [inventory]);
  const payeeOptions = useMemo(() => [
    { value: '__NEW__', label: 'Add a new payee…' },
    ...payees.map((payee) => ({ value: String(payee.id), label: payee.name, sublabel: [payee.phone, payee.bank_account_details].filter(Boolean).join(' · ') })),
  ], [payees]);
  const calculatedTotal = items.reduce((sum, item) => sum + (Number(item.quantity) || 0) * (Number(item.unit_cost) || 0), 0);

  function handleInvoiceChange(file: File | null) {
    setInvoice(file);
  }

  const updateItem = (index: number, updates: Partial<ExpenseItem>) => setItems((rows) => rows.map((row, i) => i === index ? { ...row, ...updates, is_auto_generated: false } : row));
  const chooseInventoryItem = (index: number, id: string) => {
    if (id === '__CUSTOM__') { updateItem(index, { inventory_item_id: '', name: '', custom_item: true }); return; }
    const item = inventory.find((row) => String(row.id) === id);
    updateItem(index, { inventory_item_id: id, name: item?.name || item?.item_name || '', unit_cost: String(item?.unit_cost ?? item?.standard_cost ?? item?.average_cost ?? 0), custom_item: false });
  };

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (!payName.trim()) { setError('Enter who the expense is payable to.'); return; }
    if (items.some((item) => !item.name.trim() || Number(item.quantity) <= 0 || Number(item.unit_cost) < 0)) { setError('Complete each item name, quantity, and unit cost, or remove the blank item.'); return; }
    if (items.length === 0 && !manualTotal) { setError('Enter the total manually when no purchased items are listed.'); return; }
    if (manualTotal && (!manualAmount || Number(manualAmount) < 0)) { setError('Enter a valid manual total.'); return; }
    setBusy(true); setError('');
    try {
      let finalItems = items;
      if (finalItems.length === 0) {
        const selectedPayee = payees.find((p) => String(p.id) === payeeId || String(p.name || '').trim().toLowerCase() === payName.trim().toLowerCase());
        const catName = (selectedPayee && (selectedPayee.bank_account_type || selectedPayee.category)) || category || 'Operational Expense';
        const displayName = catName.replace(/_/g, ' ');
        const totalVal = manualTotal ? Number(manualAmount) : 0;
        finalItems = [{
          inventory_item_id: '',
          name: displayName,
          description: displayName,
          quantity: '1',
          unit_cost: String(totalVal),
        }];
      }
      const data = {
        purchase_order_id: purchaseOrderId || undefined,
        payee_id: payeeId && payeeId !== '__NEW__' ? payeeId : undefined,
        pay_to_name: payName.trim(),
        pay_to_phone: phone.trim() || undefined,
        bank_account_details: bank.trim() || undefined,
        expense_date: date,
        payment_method: method,
        category: category || undefined,
        items: finalItems.map((item) => ({ inventory_item_id: item.inventory_item_id || undefined, name: item.name.trim(), description: item.description?.trim() || undefined, quantity: Number(item.quantity), unit_cost: Number(item.unit_cost) })),
        total_cost: manualTotal ? Number(manualAmount) : undefined,
        manual_total: manualTotal,
      };
      const form = new FormData();
      form.append('expense_json', JSON.stringify(data));
      if (invoice) form.append('invoice', invoice);
      const created = await apiFetch<Row>('/api/v1/operational-expenses', { method: 'POST', body: form });
      onSubmitted(created);
    } catch (exception) {
      setError(exception instanceof Error ? exception.message : 'Could not submit expense to Finance.');
    } finally { setBusy(false); }
  }

  const [closing, setClosing] = useState(false);
  const handleClose = () => {
    if (closing) return;
    setClosing(true);
    setTimeout(onClose, 190);
  };

  return createPortal(
    <div className={`fixed inset-0 z-[99999] flex items-center justify-center bg-black/70 backdrop-blur-xs p-0 sm:p-4 overflow-hidden ${closing ? 'animate-modal-backdrop-out' : 'animate-modal-backdrop-in'}`} onClick={(event) => { if (event.target === event.currentTarget) handleClose(); }}>
      <section role="dialog" aria-modal="true" aria-label="Log operational expense" className={`flex h-[100dvh] sm:h-auto sm:max-h-[90vh] w-full max-w-full sm:max-w-3xl flex-col overflow-hidden rounded-none sm:rounded-2xl border-0 sm:border border-slate-200 dark:border-slate-800 bg-white shadow-2xl dark:bg-slate-900 ${closing ? 'animate-modal-content-out' : 'animate-modal-content-in'}`}>
        <header className="flex items-center justify-between border-b p-4 sm:p-5 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md shrink-0 sticky top-0 z-10">
          <div>
            <h2 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white">Submit Operational Expense Claim</h2>
            <p className="mt-0.5 text-xs text-slate-500">Submit purchased items and invoice details to Finance.</p>
          </div>
          <button
            type="button"
            aria-label="Close"
            onClick={handleClose}
            className="flex items-center justify-center w-10 h-10 rounded-full text-slate-500 hover:bg-slate-100 hover:text-slate-900 dark:hover:bg-slate-800 dark:hover:text-white transition"
          >
            <X size={20} />
          </button>
        </header>
        <form onSubmit={submit} className="flex flex-col h-full overflow-hidden">
          <div className="flex-1 space-y-4 overflow-y-auto p-4 sm:p-6 text-xs" style={{ overflowAnchor: 'none' }}>
            {error && <p role="alert" className="rounded-lg border border-red-300 bg-red-50 p-3 text-red-800">{error}</p>}
            <section className="grid gap-3 rounded-xl border p-3 sm:grid-cols-2">
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
                {purchaseOrderId && <p className="mt-1 font-normal text-slate-500">Purchase order items are prefilled. Update quantities, descriptions, and unit costs from the invoice; the linked purchase order will sync when you submit.</p>}
              </label>
              <label className="block space-y-1 font-semibold sm:col-span-1">
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
                      if (payee) {
                        setPayName(payee.name || '');
                        setPhone(payee.phone || '');
                        setBank(payee.bank_account_details || '');
                        if (payee.payment_method) setMethod(payee.payment_method);
                        if (payee.bank_account_type || payee.category) setCategory(payee.bank_account_type || payee.category);
                      }
                    }}
                    options={payeeOptions}
                    placeholder="Choose a saved payee or add a new one..."
                  />
                )}
              </label>
              <label className="block space-y-1 font-semibold sm:col-span-1">
                <span className="block">Category</span>
                <PurchaseOrderCategoryField value={category} onChange={(val) => setCategory(val)} />
              </label>
              {method === 'BANK_TRANSFER' && <label className="block space-y-1 font-semibold sm:col-span-2"><span className="block">Bank account details</span><textarea rows={4} className={inputClass} value={bank} onChange={(event) => setBank(event.target.value)} placeholder="Bank name, account name, account number, branch or other payment instructions" /></label>}
              {method === 'MOBILE_MONEY' && <label className="block space-y-1 font-semibold sm:col-span-2"><span className="block">Phone number</span><input type="tel" className={inputClass} value={phone} onChange={(event) => setPhone(event.target.value)} placeholder="Enter the payee's mobile money number" /></label>}
              <label className="block space-y-1 font-semibold"><span className="block">Date *</span><AppDateTimePicker mode="date" required value={date} onChange={(val) => setDate(val)} /></label>
              <label className="block space-y-1 font-semibold"><span className="block">Pay by *</span><SearchableSelect value={method} onChange={(val) => setMethod(val)} options={[['MOBILE_MONEY','Phone / mobile money'],['BANK_TRANSFER','Bank transfer'],['CASH','Cash'],['CARD','Card'],['OTHER','Other']].map(([value,label]) => ({ value, label }))} placeholder="Select payment method..." required /></label>
            </section>
            <section className="grid gap-3 rounded-xl border p-3 sm:grid-cols-2">
              <label className="block space-y-1 font-semibold sm:col-span-2">
                <span className="block">Invoice / supporting file <span className="font-normal text-slate-500">(optional)</span></span>
                <input
                  type="file"
                  accept=".pdf,.png,.jpg,.jpeg,.tif,.tiff,.bmp,.webp,.docx,.xls,.xlsx,.txt,.csv,.rtf"
                  className="w-full p-2 border rounded-xl bg-background text-xs text-muted-foreground file:mr-3 file:py-1 file:px-2.5 file:rounded-lg file:border-0 file:text-xs file:font-bold file:bg-orange-50 file:text-orange-700 hover:file:bg-orange-100 dark:file:bg-orange-950/60 dark:file:text-orange-300 cursor-pointer transition"
                  onChange={(event) => void handleInvoiceChange(event.target.files?.[0] || null)}
                />
                {invoice && <span className="block truncate text-[11px] font-normal text-slate-500">{invoice.name}</span>}
                <span className="block text-[11px] font-normal text-slate-500">Uploaded for reference. Enter purchased items and amounts manually.</span>
              </label>
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
                        <input required className={inputClass} value={item.name} onChange={(event) => updateItem(index, { name: event.target.value })} placeholder="Enter a new item name" />
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
                  <label className="block space-y-1 font-semibold sm:col-span-2">
                    <span className="block">Description</span>
                    <textarea rows={2} className={inputClass} value={item.description || ''} onChange={(event) => updateItem(index, { description: event.target.value })} placeholder="Optional line item specifications" />
                  </label>
                  <button type="button" onClick={() => setItems((rows) => rows.filter((_, i) => i !== index))} className="justify-self-start font-semibold text-red-700 hover:underline">Remove item</button>
                </div>
              ))}
              <button
                type="button"
                onClick={() => setItems((rows) => [...rows, blankItem()])}
                className="w-full py-2.5 px-4 border border-dashed border-orange-300 dark:border-orange-700/60 rounded-xl text-xs font-semibold text-orange-700 dark:text-orange-400 hover:bg-orange-50 dark:hover:bg-orange-950/30 flex items-center justify-center gap-1.5 transition-colors mt-2"
              >
                <Plus size={14} /> Add Item
              </button>
            </section>
            <section className="grid gap-3 rounded-xl border p-3 sm:grid-cols-2">
              <label className="flex items-center gap-2 font-semibold sm:col-span-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={manualTotal}
                  onChange={(event) => setManualTotal(event.target.checked)}
                  className="h-4 w-4 rounded-md border-slate-300 text-orange-600 focus:ring-orange-500 dark:border-slate-700 dark:bg-slate-900 accent-orange-600 cursor-pointer"
                />
                Enter total manually
              </label>
              <label className="block space-y-1 font-semibold sm:col-span-2"><span className="block">Total cost {manualTotal ? '*' : '(calculated)'}</span><input type="number" min="0" step="0.01" required={manualTotal} readOnly={!manualTotal} className={inputClass} value={manualTotal ? manualAmount : calculatedTotal.toFixed(2)} onChange={(event) => setManualAmount(event.target.value)} /></label>
              <p className="sm:col-span-2 text-slate-500">After submission, the expense status is <strong>Submitted</strong> and Finance is notified. Finance uploads the payment receipt when marking it complete.</p>
            </section>
          </div>
          {/* Sticky Footer */}
          <div className="sticky bottom-0 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-t border-slate-200 dark:border-slate-800 p-3.5 sm:px-6 sm:py-4 shrink-0 flex flex-row items-center justify-end gap-2 sm:gap-3 z-10">
            <button type="button" onClick={onClose} className="rounded-xl border px-4 py-2 font-semibold hover:bg-slate-50 dark:hover:bg-slate-800 transition w-full sm:w-auto">Cancel</button>
            <button type="submit" disabled={busy} className="rounded-xl bg-orange-600 px-5 py-2 font-bold text-white hover:bg-orange-700 disabled:opacity-50 transition w-full sm:w-auto shadow-xs">{busy ? 'Submitting…' : 'Submit expense to Finance'}</button>
          </div>
        </form>
      </section>
    </div>,
    document.body
  );
}
