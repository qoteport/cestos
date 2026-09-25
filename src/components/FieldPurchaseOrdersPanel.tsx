'use client';

import { FormEvent, useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { apiFetch, apiFetchBlob, downloadBlob, receivePurchaseOrderGoods } from '@/lib/api';
import { Eye, Download, FileText, Paperclip, X, Plus, CheckCircle2, ShoppingCart, Truck, PackageCheck, RefreshCw } from 'lucide-react';
import SearchableSelect from './SearchableSelect';
import OperationalExpenseSubmissionModal from './OperationalExpenseSubmissionModal';
import UniversalFileViewerModal from './UniversalFileViewerModal';
import { PurchaseOrderCategoryField, purchaseOrderCategoryLabel } from './PurchaseOrderCategoryField';
import { useOperationalDataSync } from '@/lib/operationalDataSync';

type Row = Record<string, any>;
type Line = { item_name: string; description: string; quantity_ordered: string; unit_price: string };
type FormStep = 'EDIT' | 'PREVIEW';
const blankLine = (): Line => ({ item_name: '', description: '', quantity_ordered: '1', unit_price: '0' });
const input = 'w-full rounded-lg border bg-background p-2.5';

function ExpensePaymentBadge({ status }: { status?: string | null }) {
  const value = String(status || '').toUpperCase();
  const style = value === 'PAID' ? 'bg-emerald-100 text-emerald-800'
    : value === 'PARTIALLY_PAID' ? 'bg-blue-100 text-blue-800'
    : 'bg-amber-100 text-amber-800';
  const label = value === 'PAID' ? 'Expense paid'
    : value === 'PARTIALLY_PAID' ? 'Partially paid'
    : value === 'PAYMENT_RECONCILIATION_REQUIRED' ? 'Payment reconciliation required'
    : 'Expense raised';
  return <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${style}`}>{label}</span>;
}

export default function FieldPurchaseOrdersPanel({
  projectId,
  projectName,
  datePreset = 'ALL',
  customStartDate,
  customEndDate,
  openCreateSignal = 0,
}: {
  projectId: string;
  projectName?: string;
  datePreset?: string;
  customStartDate?: string;
  customEndDate?: string;
  openCreateSignal?: number;
}) {
  const [orders, setOrders] = useState<Row[]>([]);
  const [suppliers, setSuppliers] = useState<Row[]>([]);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [formStep, setFormStep] = useState<FormStep>('EDIT');
  const [editing, setEditing] = useState<Row | null>(null);
  const [orderProjectId, setOrderProjectId] = useState('');
  const [supplier, setSupplier] = useState('');
  const [currency, setCurrency] = useState('USD');
  const [category, setCategory] = useState('');
  const [notes, setNotes] = useState('');
  const [lines, setLines] = useState<Line[]>([]);
  const [manualTotal, setManualTotal] = useState('0');
  const [quotation, setQuotation] = useState<File | null>(null);
  const [existingQuotation, setExistingQuotation] = useState('');
  const [expensePO, setExpensePO] = useState<Row | null>(null);
  const [raisedPurchaseOrderIds, setRaisedPurchaseOrderIds] = useState<Set<string>>(new Set());
  const [viewDetailPO, setViewDetailPO] = useState<Row | null>(null);
  const [receivingPO, setReceivingPO] = useState<Row | null>(null);
  const [receiptQuantities, setReceiptQuantities] = useState<Record<string, number>>({});
  const [selectedReceiptItemIds, setSelectedReceiptItemIds] = useState<string[]>([]);
  const [receivingBusy, setReceivingBusy] = useState(false);
  const [viewerState, setViewerState] = useState<{ isOpen: boolean; fileUrl?: string; blob?: Blob; fileName?: string; title?: string; fileType?: string }>({ isOpen: false });
  const handledPurchaseOrderLink = useRef('');

  async function handleDownloadPOAttachment(poId: string, fileName?: string) {
    try {
      const blob = await apiFetchBlob(`/api/v1/procurement/purchase-orders/${poId}/attachment`);
      downloadBlob(blob, fileName || `PO_Attachment_${poId}.pdf`);
    } catch (err: any) {
      setMessage(`Could not download attachment: ${err?.message || 'Download error'}`);
    }
  }

  async function handleViewPOAttachment(poId: string) {
    try {
      const blob = await apiFetchBlob(`/api/v1/procurement/purchase-orders/${poId}/attachment`);
      const url = URL.createObjectURL(blob);
      setViewerState({
        isOpen: true,
        blob,
        fileName: `Purchase_Order_${poId}_Attachment.pdf`,
        title: `Purchase Order Quotation Attachment`,
      });
    } catch (err: any) {
      setMessage(`Could not view attachment: ${err?.message || 'View error'}`);
    }
  }

  async function handleViewPaymentReceipt(payment: Row) {
    try {
      const blob = await apiFetchBlob(`/api/v1/operational-expenses/${payment.expense_id}/payments/${payment.id}/receipt`);
      setViewerState({ isOpen: true, blob, fileName: payment.receipt_name || 'Payment receipt', title: 'Finance payment receipt' });
    } catch (err: any) {
      setMessage(`Could not view payment receipt: ${err?.message || 'View error'}`);
    }
  }

  async function handleDownloadPaymentReceipt(payment: Row) {
    try {
      const blob = await apiFetchBlob(`/api/v1/operational-expenses/${payment.expense_id}/payments/${payment.id}/receipt`);
      downloadBlob(blob, payment.receipt_name || 'Payment receipt');
    } catch (err: any) {
      setMessage(`Could not download payment receipt: ${err?.message || 'Download error'}`);
    }
  }

  async function reload() {
    const [poRows, supplierRows] = await Promise.all([
      apiFetch<Row[]>('/api/v1/procurement/purchase-orders'),
      apiFetch<Row[]>('/api/v1/fuel-suppliers').catch(() => []),
    ]);
    setOrders(Array.isArray(poRows) ? poRows : []);
    const orderList = Array.isArray(poRows) ? poRows : [];
    const requestedId = new URLSearchParams(window.location.search).get('purchase_order_id');
    const linkedOrder = requestedId ? orderList.find((row) => String(row.id) === requestedId) : null;
    if (linkedOrder && handledPurchaseOrderLink.current !== requestedId) {
      setViewDetailPO(linkedOrder);
      handledPurchaseOrderLink.current = requestedId!;
    } else {
      setViewDetailPO((current) => current ? orderList.find((row) => row.id === current.id) || current : null);
    }
    setSuppliers(Array.isArray(supplierRows) ? supplierRows : []);
  }
  useEffect(() => {
    const refresh = () => { if (document.visibilityState === 'visible') void reload().catch((e) => setMessage(e.message || 'Could not refresh purchase orders.')); };
    refresh();
    const interval = window.setInterval(refresh, 60_000);
    window.addEventListener('focus', refresh);
    return () => { window.clearInterval(interval); window.removeEventListener('focus', refresh); };
  }, []);
  useOperationalDataSync(() => { if (document.visibilityState === 'visible') void reload().catch((e) => setMessage(e.message || 'Could not refresh purchase orders.')); });

  const isWithinDate = (dateInput: string | Date | undefined) => {
    if (datePreset === 'ALL') return true;
    if (!dateInput) return true;
    const d = new Date(dateInput);
    if (isNaN(d.getTime())) return true;
    const now = new Date();
    if (datePreset === 'TODAY') {
      const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0);
      const endOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
      return d >= startOfDay && d <= endOfDay;
    }
    if (datePreset === '10_DAYS') {
      const tenDaysAgo = new Date(now.getTime() - 10 * 24 * 60 * 60 * 1000);
      tenDaysAgo.setHours(0, 0, 0, 0);
      return d >= tenDaysAgo && d <= now;
    }
    if (datePreset === '30_DAYS') {
      const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      thirtyDaysAgo.setHours(0, 0, 0, 0);
      return d >= thirtyDaysAgo && d <= now;
    }
    if (datePreset === 'CUSTOM') {
      if (customStartDate) {
        const start = new Date(customStartDate);
        if (!isNaN(start.getTime()) && d < start) return false;
      }
      if (customEndDate) {
        const end = new Date(customEndDate);
        if (!isNaN(end.getTime()) && d > end) return false;
      }
      return true;
    }
    return true;
  };

  const filteredOrders = useMemo(() => {
    return orders.filter((po) => {
      if (projectId && po.project_id && String(po.project_id) !== String(projectId)) return false;
      return isWithinDate(po.order_date || po.created_at || po.date);
    });
  }, [orders, projectId, datePreset, customStartDate, customEndDate]);

  const supplierOptions = useMemo(() => suppliers.map((row) => ({ value: String(row.name || ''), label: String(row.name || '') })).filter((o) => o.value), [suppliers]);
  const hasExpense = (po: Row) => Boolean(po.expense_raised) || raisedPurchaseOrderIds.has(String(po.id));
  const canReceive = (po: Row) => ['APPROVED', 'SENT_TO_SUPPLIER', 'PARTIALLY_RECEIVED'].includes(String(po.status || '').toUpperCase()) && (po.items || []).some((item: Row) => Number(item.quantity_received || 0) < Number(item.quantity_ordered || 0));
  const lineTotal = lines.reduce((sum, row) => sum + (Number(row.quantity_ordered) || 0) * (Number(row.unit_price) || 0), 0);
  const total = lineTotal > 0 ? lineTotal : (Number(manualTotal) || 0);
  const openCreate = () => {
    setEditing(null); setOrderProjectId(projectId); setFormStep('EDIT'); setSupplier(''); setCurrency('USD'); setCategory(''); setNotes(''); setLines([]); setManualTotal('0'); setQuotation(null); setExistingQuotation(''); setShowForm(true);
  };
  const lastHandledCreateSignal = useRef(openCreateSignal);
  useEffect(() => {
    if (openCreateSignal && openCreateSignal > lastHandledCreateSignal.current) {
      lastHandledCreateSignal.current = openCreateSignal;
      openCreate();
    }
  }, [openCreateSignal]);
  const openEdit = (po: Row) => {
    setEditing(po); setOrderProjectId(String(po.project_id || projectId)); setFormStep('EDIT'); setSupplier(po.supplier_name || ''); setCurrency(po.currency || 'USD'); setCategory(po.category || ''); setNotes(po.notes || '');
    const existingLines = (po.items || []).map((row: Row) => ({ item_name: row.item_name || '', description: row.description || '', quantity_ordered: String(row.quantity_ordered || 1), unit_price: String(row.unit_price || 0) }));
    setLines(existingLines);
    setManualTotal(String(existingLines.reduce((sum: number, row: Line) => sum + (Number(row.quantity_ordered) || 0) * (Number(row.unit_price) || 0), 0) > 0 ? 0 : Number(po.total_amount || 0)));
    setQuotation(null); setExistingQuotation(po.attachment_file_name || ''); setShowForm(true);
  };
  async function upload(poId: string) {
    if (!quotation) return;
    const data = new FormData(); data.append('file', quotation);
    await apiFetch(`/api/v1/procurement/purchase-orders/${poId}/attachment`, { method: 'POST', body: data });
  }
  function submit(event: FormEvent) {
    event.preventDefault();
    const enteredLines = lines.filter((line) => line.item_name.trim() || line.description.trim() || Number(line.unit_price) > 0);
    if (!supplier.trim() || enteredLines.some((line) => !line.description.trim() || Number(line.quantity_ordered) <= 0 || Number(line.unit_price) < 0)) {
      setMessage('Enter a supplier and complete each purchase order line.'); return;
    }
    setMessage('');
    setFormStep('PREVIEW');
  }

  async function saveOrder(saveAsDraft: boolean) {
    setBusy(true); setMessage('');
    try {
      const payload = {
        supplier_name: supplier.trim(), project_id: orderProjectId || undefined, currency, category: category.trim() || null, notes: notes.trim() || undefined,
        total_amount: lineTotal > 0 ? lineTotal : Number(manualTotal) || 0,
        items: lines.filter((line) => line.item_name.trim() || line.description.trim() || Number(line.unit_price) > 0).map((line) => ({ item_name: line.item_name.trim() || undefined, description: line.description.trim(), quantity_ordered: Number(line.quantity_ordered), unit_price: Number(line.unit_price) })),
        ...(!editing ? { save_as_draft: saveAsDraft } : {}),
      };
      let po: Row;
      if (editing) {
        po = await apiFetch<Row>(`/api/v1/procurement/purchase-orders/${editing.id}`, { method: 'PATCH', body: JSON.stringify(payload) });
      } else {
        po = await apiFetch<Row>('/api/v1/procurement/purchase-orders', { method: 'POST', body: JSON.stringify(payload) });
      }
      let fileWarning = '';
      try { await upload(po.id); } catch (e: any) { fileWarning = ` The order was saved, but the quotation upload failed: ${e?.message || 'upload error'}`; }
      if (!fileWarning && !saveAsDraft && po.status === 'DRAFT') {
        po = await apiFetch<Row>(`/api/v1/procurement/purchase-orders/${po.id}/submit`, { method: 'POST' });
      }
      const result = saveAsDraft
        ? `Purchase order ${po.po_number} saved as a draft.`
        : !editing || editing.status === 'DRAFT'
          ? `Purchase order ${po.po_number} submitted for executive approval.`
          : `Purchase order ${po.po_number} updated.`;
      setShowForm(false); setFormStep('EDIT'); setMessage(`${result}${fileWarning}`); await reload();
    } catch (e: any) { setMessage(e?.message || 'Could not save purchase order.'); }
    finally { setBusy(false); }
  }

  function openReceive(po: Row) {
    setReceivingPO(po);
    setReceiptQuantities(Object.fromEntries((po.items || []).map((item: Row) => [String(item.id), Math.max(0, Number(item.quantity_ordered || 0) - Number(item.quantity_received || 0))])));
    setSelectedReceiptItemIds([]);
  }

  async function submitReceipt(event: FormEvent) {
    event.preventDefault();
    if (!receivingPO || selectedReceiptItemIds.length === 0) return;
    setReceivingBusy(true);
    try {
      const quantities = Object.fromEntries(selectedReceiptItemIds.map((itemId) => [itemId, Number(receiptQuantities[itemId]) || 0]));
      await receivePurchaseOrderGoods(String(receivingPO.id), quantities);
      const poNumber = receivingPO.po_number;
      setReceivingPO(null);
      setMessage(`Goods received against PO ${poNumber}.`);
      await reload();
    } catch (e: any) {
      setMessage(e?.message || 'Could not record goods receipt.');
    } finally { setReceivingBusy(false); }
  }

  return <section className="space-y-4">
    <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border bg-white p-4 shadow-sm dark:bg-slate-900">
      <div><h2 className="text-lg font-bold">Purchase Orders</h2><p className="text-xs text-slate-500">Create project purchase requests for Finance and Executive review{projectName ? ` · ${projectName}` : ''}.</p></div>
      <div className="flex gap-2"><button type="button" onClick={() => void reload()} className="inline-flex items-center gap-1.5 rounded-lg border px-3 py-2 text-xs font-semibold hover:bg-slate-50 dark:hover:bg-slate-800"><RefreshCw size={13} />Refresh</button><button type="button" onClick={openCreate} className="rounded-lg bg-orange-600 px-4 py-2 text-xs font-bold text-white hover:bg-orange-700">+ Create Purchase Order</button></div>
    </div>
    {message && <p role="status" className="rounded-lg border border-orange-200 bg-orange-50 p-3 text-xs text-orange-900">{message}</p>}
    <div className="overflow-x-auto rounded-xl border bg-white dark:bg-slate-900">
      <table className="w-full min-w-[1120px] text-left text-xs">
        <thead className="bg-slate-50 uppercase text-slate-500 dark:bg-slate-800">
          <tr>
            <th className="p-3">PO number</th><th className="p-3">Supplier</th><th className="p-3">Items</th><th className="p-3">Category</th><th className="p-3">Amount</th><th className="p-3">Quotation</th><th className="p-3">Finance payments</th><th className="p-3">Status</th><th className="p-3">Action</th>
          </tr>
        </thead>
        <tbody className="divide-y">
          {filteredOrders.map((po) => {
            const payments = po.expense_payments || [];
            return <tr key={po.id} className="align-top">
              <td className="p-3 font-mono font-bold">{po.po_number}</td>
              <td className="p-3">{po.supplier_name || '—'}</td>
              <td className="p-3">{(po.items || []).length}</td>
              <td className="p-3">{purchaseOrderCategoryLabel(po.category)}</td>
              <td className="whitespace-nowrap p-3">{po.currency} {Number(po.total_amount || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
              <td className="p-3">{po.attachment_file_name ? <div className="flex min-w-40 items-center gap-1.5"><button type="button" onClick={() => void handleViewPOAttachment(po.id)} className="inline-flex min-w-0 items-center gap-1 rounded border border-orange-200 bg-orange-50 px-2 py-1 font-mono text-[11px] font-semibold text-orange-800 transition hover:bg-orange-100 dark:border-orange-800 dark:bg-orange-950/40 dark:text-orange-300" title={`View attached quotation: ${po.attachment_file_name}`}><Paperclip size={12} className="shrink-0 text-orange-600" /><span className="max-w-[110px] truncate">{po.attachment_file_name}</span></button><button type="button" onClick={() => void handleDownloadPOAttachment(po.id, po.attachment_file_name)} className="rounded p-1 text-slate-500 transition hover:bg-slate-100 hover:text-orange-600 dark:hover:bg-slate-800" title={`Download ${po.attachment_file_name}`}><Download size={13} /></button></div> : <span className="text-[11px] text-slate-400">No quotation</span>}</td>
              <td className="p-3">
                <div className="min-w-[225px] space-y-1.5">
                  <div className="rounded-md border border-blue-100 bg-blue-50 px-2.5 py-1.5 dark:border-blue-900 dark:bg-blue-950/30">
                    <div className="flex justify-between gap-3"><span className="text-slate-600 dark:text-slate-300">Paid to date</span><strong className="whitespace-nowrap">{po.currency} {Number(po.expense_paid_amount || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</strong></div>
                    {po.expense_raised && <div className="mt-0.5 flex justify-between gap-3 text-[10px] text-slate-500"><span>Balance</span><span className="whitespace-nowrap">{po.currency} {Number(po.expense_balance_due || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span></div>}
                  </div>
                  {payments.length ? payments.map((payment: Row, index: number) => <div key={payment.id} className="rounded-md border px-2.5 py-1.5">
                    <div className="flex items-center justify-between gap-3"><span className="font-semibold text-slate-600 dark:text-slate-300">Installment {payments.length - index}</span><strong className="whitespace-nowrap">{po.currency} {Number(payment.amount || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</strong></div>
                    <div className="mt-0.5 flex flex-wrap items-center justify-between gap-x-2 text-[10px] text-slate-500"><span>{payment.payment_date ? new Date(`${payment.payment_date}T00:00:00`).toLocaleDateString() : 'Date unavailable'}</span>{payment.reference && <span className="max-w-28 truncate" title={payment.reference}>Ref: {payment.reference}</span>}</div>
                    {payment.receipt_name ? <div className="mt-1 flex items-center gap-2 border-t pt-1"><span className="max-w-28 truncate text-[10px] text-slate-500" title={payment.receipt_name}>{payment.receipt_name}</span><button type="button" onClick={() => void handleViewPaymentReceipt(payment)} className="inline-flex items-center gap-1 font-semibold text-blue-700 underline" title={`View ${payment.receipt_name}`}><Eye size={11} />View</button><button type="button" onClick={() => void handleDownloadPaymentReceipt(payment)} className="inline-flex items-center gap-1 font-semibold text-slate-600 hover:text-blue-700" title={`Download ${payment.receipt_name}`}><Download size={11} />Download</button></div> : <p className="mt-1 text-[10px] text-slate-400">No receipt attached</p>}
                  </div>) : <span className="text-[10px] text-slate-400">No payments recorded</span>}
                </div>
              </td>
              <td className="p-3"><div className="flex flex-col items-start gap-1"><span>{String(po.status).replaceAll('_', ' ')}</span>{hasExpense(po) && <ExpensePaymentBadge status={po.expense_status} />}</div></td>
              <td className="p-3"><div className="flex min-w-36 flex-wrap gap-2"><button type="button" onClick={() => setViewDetailPO(po)} className="inline-flex items-center gap-1 rounded border border-slate-200 bg-white px-2.5 py-1.5 font-semibold transition hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:hover:bg-slate-700" title="View PO Details & Line Items"><Eye size={13} className="shrink-0 text-orange-600" />Details</button>{['DRAFT', 'WAITING_APPROVAL'].includes(po.status) && <button type="button" onClick={() => openEdit(po)} className="rounded border px-2.5 py-1.5 font-semibold hover:bg-orange-50">{po.status === 'DRAFT' ? 'Edit draft' : 'Edit / add quotation'}</button>}{po.status === 'APPROVED' && !hasExpense(po) && <button type="button" onClick={() => setExpensePO(po)} className="rounded bg-orange-600 px-2.5 py-1.5 font-bold text-white hover:bg-orange-700">Raise Expense</button>}{canReceive(po) && <button type="button" onClick={() => openReceive(po)} className="inline-flex items-center gap-1 rounded bg-emerald-600 px-2.5 py-1.5 font-bold text-white hover:bg-emerald-700"><Truck size={12} />Receive Goods</button>}</div></td>
            </tr>;
          })}
          {filteredOrders.length === 0 && <tr><td className="p-8 text-center text-slate-500" colSpan={9}>No purchase orders found matching the selected filters.</td></tr>}
        </tbody>
      </table>
    </div>
    {showForm && createPortal(
      <div className="fixed inset-0 z-[99999] flex items-center justify-center bg-black/70 backdrop-blur-xs p-0 sm:p-4 overflow-hidden" onClick={(e) => { if (e.target === e.currentTarget) { setShowForm(false); setFormStep('EDIT'); } }}>
        <div className="w-full h-[100dvh] sm:h-auto sm:max-h-[90vh] max-w-full sm:max-w-4xl rounded-none sm:rounded-2xl border-0 sm:border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-2xl flex flex-col overflow-hidden">
          <form onSubmit={submit} className="flex flex-col h-full overflow-hidden">
            {/* Sticky Header */}
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 px-4 py-3.5 sm:px-6 sm:py-4 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md shrink-0 sticky top-0 z-10">
              <div>
                <h3 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white">
                  {editing ? `Edit Purchase Order ${editing.po_number}` : 'Create Purchase Order'}
                </h3>
                <p className="text-xs text-slate-500">
                  {formStep === 'PREVIEW' ? 'Review the details before sending this request.' : 'Save a draft or preview your purchase order before sending it.'}
                </p>
              </div>
              <button
                type="button"
                onClick={() => { setShowForm(false); setFormStep('EDIT'); }}
                className="p-1.5 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 hover:text-slate-900 dark:hover:text-white transition"
              >
                <X size={20} />
              </button>
            </div>

            {/* Scrollable Body */}
            <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4">
              {formStep === 'EDIT' ? (
                <>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <label className="space-y-1 text-xs font-semibold">
                      <span className="block">Supplier *</span>
                      <SearchableSelect
                        value={supplier}
                        onChange={setSupplier}
                        options={[...supplierOptions, ...(supplier && !supplierOptions.some((o) => o.value.toLowerCase() === supplier.toLowerCase()) ? [{ value: supplier, label: `Use ${supplier}` }] : [])]}
                        placeholder="Search or enter supplier name"
                      />
                      <input className={input} value={supplier} onChange={(e) => setSupplier(e.target.value)} placeholder="Or type a new supplier name" />
                    </label>
                    <label className="space-y-1 text-xs font-semibold">
                      <span className="block">Project</span>
                      <input readOnly className={`${input} bg-slate-100 dark:bg-slate-800`} value={editing && editing.project_id !== projectId ? (editing.project_name || 'Original assigned project') : (projectName || 'Selected project')} />
                    </label>
                    <label className="space-y-1 text-xs font-semibold">
                      <span className="block">Category (optional)</span>
                      <PurchaseOrderCategoryField value={category} onChange={setCategory} className={input} />
                    </label>
                    <div className="space-y-1 text-xs font-semibold">
                      <span className="block mb-1">Currency *</span>
                      <SearchableSelect
                        value={currency}
                        onChange={(val) => setCurrency(val)}
                        options={[
                          { value: 'USD', label: 'USD ($)' },
                          { value: 'EUR', label: 'EUR (€)' },
                          { value: 'GBP', label: 'GBP (£)' },
                          { value: 'ZAR', label: 'ZAR (R)' },
                        ]}
                        searchable={false}
                      />
                    </div>
                    <label className="space-y-1 text-xs font-semibold">
                      <span className="block">Quotation / supporting file</span>
                      <input type="file" accept=".pdf,.png,.jpg,.jpeg,.doc,.docx,.xls,.xlsx" className={input} onChange={(e) => setQuotation(e.target.files?.[0] || null)} />
                      {existingQuotation && <span className="block text-slate-500">Current file: {existingQuotation}</span>}
                    </label>
                    <label className="space-y-1 text-xs font-semibold sm:col-span-2">
                      <span className="block">Notes / specifications</span>
                      <textarea rows={3} className={input} value={notes} onChange={(e) => setNotes(e.target.value)} />
                    </label>
                  </div>
                  <section className="space-y-2">
                    <div className="flex items-center justify-between">
                      <div>
                        <h4 className="text-sm font-bold">Purchase Order Line Items <span className="font-normal text-slate-500">(optional)</span></h4>
                        <p className="text-[11px] text-slate-500">Leave blank and enter a total below if you do not need itemized lines.</p>
                      </div>
                      <button type="button" onClick={() => setLines((rows) => [...rows, blankLine()])} className="text-xs font-bold text-orange-700 dark:text-orange-400">+ Add item</button>
                    </div>
                    {lines.map((line, index) => (
                      <div key={index} className="grid gap-2 rounded-lg border p-3 sm:grid-cols-2 lg:grid-cols-12 bg-slate-50/50 dark:bg-slate-800/40">
                        <label className="space-y-1 text-xs font-semibold lg:col-span-3">
                          <span className="block">Item / service</span>
                          <input className={input} value={line.item_name} onChange={(e) => setLines((rows) => rows.map((r, i) => i === index ? { ...r, item_name: e.target.value } : r))} />
                        </label>
                        <label className="space-y-1 text-xs font-semibold lg:col-span-5">
                          <span className="block">Description</span>
                          <textarea rows={1} maxLength={255} className={input} value={line.description} onChange={(e) => setLines((rows) => rows.map((r, i) => i === index ? { ...r, description: e.target.value } : r))} />
                        </label>
                        <label className="space-y-1 text-xs font-semibold lg:col-span-1">
                          <span className="block">Quantity</span>
                          <input min="0.001" step="0.001" type="number" className={input} value={line.quantity_ordered} onChange={(e) => setLines((rows) => rows.map((r, i) => i === index ? { ...r, quantity_ordered: e.target.value } : r))} />
                        </label>
                        <label className="space-y-1 text-xs font-semibold lg:col-span-2">
                          <span className="block">Unit price</span>
                          <input min="0" step="0.01" type="number" className={input} value={line.unit_price} onChange={(e) => setLines((rows) => rows.map((r, i) => i === index ? { ...r, unit_price: e.target.value } : r))} />
                        </label>
                        <button type="button" onClick={() => setLines((rows) => rows.filter((_, i) => i !== index))} className="self-center rounded-lg border px-2 py-2 text-xs text-red-700 hover:bg-red-50 dark:hover:bg-red-950/30 lg:col-span-1">Remove</button>
                      </div>
                    ))}
                  </section>
                </>
              ) : (
                <>
                  <div className="grid gap-3 rounded-xl border bg-slate-50 p-4 text-sm dark:bg-slate-800/40 sm:grid-cols-2">
                    <div><span className="block text-[10px] font-bold uppercase text-slate-500">Supplier</span><strong>{supplier}</strong></div>
                    <div><span className="block text-[10px] font-bold uppercase text-slate-500">Category</span><strong>{purchaseOrderCategoryLabel(category)}</strong></div>
                    <div><span className="block text-[10px] font-bold uppercase text-slate-500">Project</span><strong>{editing && editing.project_id !== projectId ? (editing.project_name || 'Original assigned project') : (projectName || 'Selected project')}</strong></div>
                    <div><span className="block text-[10px] font-bold uppercase text-slate-500">Currency</span><strong>{currency}</strong></div>
                    <div><span className="block text-[10px] font-bold uppercase text-slate-500">Quotation</span><strong>{quotation?.name || existingQuotation || 'None attached'}</strong></div>
                    <div className="sm:col-span-2"><span className="block text-[10px] font-bold uppercase text-slate-500">Notes</span><p className="whitespace-pre-wrap">{notes || '—'}</p></div>
                  </div>
                  <div className="overflow-x-auto rounded-xl border">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-slate-50 text-slate-500 dark:bg-slate-800">
                        <tr>
                          <th className="p-3">Item / service</th>
                          <th className="p-3">Description</th>
                          <th className="p-3">Quantity</th>
                          <th className="p-3">Unit price</th>
                          <th className="p-3 text-right">Line total</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y">
                        {lines.map((line, index) => (
                          <tr key={index}>
                            <td className="p-3">{line.item_name || '—'}</td>
                            <td className="p-3">{line.description}</td>
                            <td className="p-3">{line.quantity_ordered}</td>
                            <td className="p-3">{currency} {Number(line.unit_price || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                            <td className="p-3 text-right font-semibold">{currency} {(Number(line.quantity_ordered || 0) * Number(line.unit_price || 0)).toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </>
              )}
            </div>

            {/* Sticky Action Footer */}
            <div className="sticky bottom-0 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-t border-slate-200 dark:border-slate-800 p-3.5 sm:px-6 sm:py-4 shrink-0 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 z-10">
              <label className="flex items-center gap-2 text-sm font-bold">
                Total: {currency}
                {formStep === 'EDIT' ? (
                  lineTotal > 0 ? (
                    <span>{lineTotal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                  ) : (
                    <input aria-label="Purchase order total" type="number" min="0" step="0.01" value={manualTotal} onChange={(event) => setManualTotal(event.target.value)} className="w-32 sm:w-40 rounded-lg border bg-background p-2 text-sm font-semibold" />
                  )
                ) : (
                  <span>{total.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                )}
              </label>
              <div className="flex flex-col-reverse sm:flex-row items-stretch sm:items-center gap-2 sm:gap-2.5 w-full sm:w-auto">
                {formStep === 'EDIT' ? (
                  <>
                    <button type="button" onClick={() => { setShowForm(false); setFormStep('EDIT'); }} className="rounded-lg border px-4 py-2 text-xs font-semibold hover:bg-slate-50 dark:hover:bg-slate-800 transition w-full sm:w-auto">
                      Cancel
                    </button>
                    {(!editing || editing.status === 'DRAFT') && (
                      <button type="button" disabled={busy} onClick={() => void saveOrder(true)} className="rounded-lg border border-orange-300 px-4 py-2 text-xs font-bold text-orange-800 dark:text-orange-300 hover:bg-orange-50 dark:hover:bg-orange-950/30 disabled:opacity-50 transition w-full sm:w-auto">
                        {busy ? 'Saving…' : 'Save as draft'}
                      </button>
                    )}
                    <button type="submit" disabled={busy} className="rounded-lg bg-orange-600 px-4 py-2 text-xs font-bold text-white hover:bg-orange-700 disabled:opacity-50 transition w-full sm:w-auto">
                      Preview Purchase Order
                    </button>
                  </>
                ) : (
                  <>
                    <button type="button" onClick={() => setFormStep('EDIT')} className="rounded-lg border px-4 py-2 text-xs font-semibold hover:bg-slate-50 dark:hover:bg-slate-800 transition w-full sm:w-auto">
                      Back to edit
                    </button>
                    {editing?.status === 'WAITING_APPROVAL' ? (
                      <button type="button" disabled={busy} onClick={() => void saveOrder(false)} className="rounded-lg bg-orange-600 px-4 py-2 text-xs font-bold text-white hover:bg-orange-700 disabled:opacity-50 transition w-full sm:w-auto">
                        {busy ? 'Saving…' : 'Save changes'}
                      </button>
                    ) : (
                      <button type="button" disabled={busy} onClick={() => void saveOrder(false)} className="rounded-lg bg-orange-600 px-4 py-2 text-xs font-bold text-white hover:bg-orange-700 disabled:opacity-50 transition w-full sm:w-auto">
                        {busy ? 'Submitting…' : 'Submit for Executive approval'}
                      </button>
                    )}
                  </>
                )}
              </div>
            </div>
          </form>
        </div>
      </div>,
      document.body
    )}

    {/* VIEW PO DETAILS MODAL */}
    {viewDetailPO && createPortal(
      <div className="fixed inset-0 z-[99999] flex items-center justify-center bg-black/70 backdrop-blur-xs p-0 sm:p-4 overflow-hidden" onClick={(e) => { if (e.target === e.currentTarget) setViewDetailPO(null); }}>
        <div className="bg-white dark:bg-slate-900 w-full h-[100dvh] sm:h-auto sm:max-h-[90vh] max-w-full sm:max-w-4xl border-0 sm:border border-slate-200 dark:border-slate-800 rounded-none sm:rounded-2xl shadow-2xl flex flex-col overflow-hidden">
          {/* Sticky Header */}
          <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 px-4 py-3.5 sm:px-6 sm:py-4 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md shrink-0 sticky top-0 z-10">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-orange-50 dark:bg-orange-950/40 text-orange-600 flex items-center justify-center font-bold">
                <ShoppingCart size={18} />
              </div>
              <div>
                <h3 className="font-bold text-base text-slate-900 dark:text-white">
                  Purchase Order Details
                </h3>
                <p className="text-xs text-slate-500 font-mono">
                  PO #: {viewDetailPO.po_number || viewDetailPO.id}
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setViewDetailPO(null)}
              className="p-1.5 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 hover:text-slate-900 dark:hover:text-white transition"
            >
              <X size={20} />
            </button>
          </div>

          {/* Content Body */}
          {(() => {
            const poItems = Array.isArray(viewDetailPO.items) ? viewDetailPO.items : [];
            const totalOrdered = poItems.reduce((sum: number, item: any) => sum + (Number(item.quantity_ordered || item.quantity || 0) * Number(item.unit_price || item.price || 0)), 0) || Number(viewDetailPO.total_amount || 0);
            const totalReceived = poItems.reduce((sum: number, item: any) => sum + (Number(item.quantity_received || 0) * Number(item.unit_price || item.price || 0)), 0);
            const remaining = Math.max(0, totalOrdered - totalReceived);
            const siteName = viewDetailPO.project_name || projectName || 'Assigned Site';
            const poNotes = viewDetailPO.notes ? String(viewDetailPO.notes).replace(/\[Attached Docket:\s*([^\]]+)\]/gi, '').trim() : '';

            return (
              <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6 bg-white dark:bg-slate-900">
                {/* Summary Header Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 p-5 rounded-xl border border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900">
                  {/* Left Column */}
                  <div className="space-y-3.5">
                    <div>
                      <span className="text-[10px] font-extrabold uppercase tracking-widest text-slate-400 block">Supplier</span>
                      <h4 className="text-lg font-black text-slate-900 dark:text-white mt-0.5">
                        {viewDetailPO.supplier_name || viewDetailPO.vendor_name || viewDetailPO.vendor || viewDetailPO.supplier || 'Site Vendor'}
                      </h4>
                    </div>

                    <div>
                      <span className="text-[10px] font-extrabold uppercase tracking-widest text-slate-400 block">Project</span>
                      <span className="text-sm font-bold text-slate-800 dark:text-slate-200 mt-0.5 block">{siteName}</span>
                    </div>

                    <div>
                      <span className="text-[10px] font-extrabold uppercase tracking-widest text-slate-400 block">Category</span>
                      <span className="text-sm font-semibold text-slate-700 dark:text-slate-300 mt-0.5 block">{purchaseOrderCategoryLabel(viewDetailPO.category)}</span>
                    </div>

                    <div>
                      <span className="text-[10px] font-extrabold uppercase tracking-widest text-slate-400 block">Total Amount</span>
                      <span className="text-lg font-black text-emerald-600 mt-0.5 block">
                        {viewDetailPO.currency || 'USD'} {Number(totalOrdered).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </span>
                    </div>

                    <div>
                      <span className="text-[10px] font-extrabold uppercase tracking-widest text-slate-400 block mb-1">Status</span>
                      <span className={`inline-flex px-2.5 py-1 rounded-md text-[10px] font-bold ${
                        viewDetailPO.status === 'APPROVED' ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300' :
                        viewDetailPO.status === 'WAITING_APPROVAL' ? 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300' :
                        'bg-slate-200 text-slate-800 dark:bg-slate-800 dark:text-slate-200'
                      }`}>
                        {String(viewDetailPO.status).replaceAll('_', ' ')}
                      </span>
                    </div>
                  </div>

                  {/* Right Column */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 p-4 rounded-xl border border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 text-sm">
                    <div>
                      <span className="block text-[10px] uppercase font-bold text-slate-400">PO Number</span>
                      <span className="font-mono font-medium text-slate-700 dark:text-slate-200">{viewDetailPO.po_number || viewDetailPO.id}</span>
                    </div>
                    <div>
                      <span className="block text-[10px] uppercase font-bold text-slate-400">Requested By</span>
                      <span className="font-medium text-slate-700 dark:text-slate-200">{viewDetailPO.created_by_name || '—'}</span>
                    </div>
                    <div>
                      <span className="block text-[10px] uppercase font-bold text-slate-400">Order Date</span>
                      <span className="font-medium text-slate-700 dark:text-slate-200">{viewDetailPO.created_at ? new Date(viewDetailPO.created_at).toLocaleString() : '—'}</span>
                    </div>
                    <div>
                      <span className="block text-[10px] uppercase font-bold text-slate-400">Goods Received</span>
                      <span className="font-bold text-emerald-600">{viewDetailPO.currency || 'USD'} {totalReceived.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                    </div>
                    <div className="sm:col-span-2">
                      <span className="block text-[10px] uppercase font-bold text-slate-400">Remaining Open</span>
                      <span className="font-bold text-amber-600">{viewDetailPO.currency || 'USD'} {remaining.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                    </div>
                    {poNotes && (
                      <div className="sm:col-span-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                        <span className="block text-[10px] uppercase font-bold text-slate-400">Notes / Specifications</span>
                        <span className="font-medium text-slate-700 dark:text-slate-200 whitespace-pre-wrap">{poNotes}</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Finance Payment History Section */}
                {viewDetailPO.expense_raised && (
                  <section className="space-y-2 rounded-xl border border-blue-100 dark:border-blue-900 bg-white dark:bg-slate-900 p-4">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div>
                        <h4 className="font-bold text-xs uppercase tracking-wider text-slate-900 dark:text-white">Finance payment history</h4>
                        <p className="mt-1 text-[11px] text-slate-600 dark:text-slate-300">Paid {viewDetailPO.currency || 'USD'} {Number(viewDetailPO.expense_paid_amount || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} of {viewDetailPO.currency || 'USD'} {Number(viewDetailPO.expense_total_amount || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} · Balance {viewDetailPO.currency || 'USD'} {Number(viewDetailPO.expense_balance_due || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
                      </div>
                      {hasExpense(viewDetailPO) && <ExpensePaymentBadge status={viewDetailPO.expense_status} />}
                    </div>
                    {(viewDetailPO.expense_payments || []).length ? (
                      <div className="overflow-x-auto rounded-lg border border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900">
                        <table className="w-full text-left text-xs">
                          <thead className="bg-white dark:bg-slate-900 text-[10px] uppercase text-slate-400 font-extrabold border-b border-slate-100 dark:border-slate-800">
                            <tr>
                              <th className="p-2.5">Payment date</th>
                              <th className="p-2.5">Expense</th>
                              <th className="p-2.5">Amount paid</th>
                              <th className="p-2.5">Reference</th>
                              <th className="p-2.5">Receipt</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                            {viewDetailPO.expense_payments.map((payment: Row) => (
                              <tr key={payment.id}>
                                <td className="p-2.5">{payment.payment_date ? new Date(`${payment.payment_date}T00:00:00`).toLocaleDateString() : '—'}</td>
                                <td className="p-2.5 font-mono">{payment.expense_number || 'Operational expense'}</td>
                                <td className="p-2.5 font-semibold">{viewDetailPO.currency || 'USD'} {Number(payment.amount || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                                <td className="p-2.5">{payment.reference || '—'}</td>
                                <td className="p-2.5">
                                  {payment.receipt_name ? (
                                    <div className="flex items-center gap-2">
                                      <button type="button" onClick={() => void handleViewPaymentReceipt(payment)} className="inline-flex items-center gap-1 font-semibold text-blue-700 underline"><Eye size={12} />View</button>
                                      <button type="button" onClick={() => void handleDownloadPaymentReceipt(payment)} className="inline-flex items-center gap-1 font-semibold text-slate-600 hover:text-blue-700"><Download size={12} />Download</button>
                                      <span className="max-w-40 truncate text-[10px] text-slate-500">{payment.receipt_name}</span>
                                    </div>
                                  ) : (
                                    <span className="text-slate-400">No receipt attached</span>
                                  )}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    ) : (
                      <p className="rounded-lg bg-white p-3 text-xs text-slate-500 dark:bg-slate-900 border border-slate-100 dark:border-slate-800">No finance payments have been recorded yet.</p>
                    )}
                  </section>
                )}

                {/* Line Items Breakdown Table */}
                <div className="rounded-xl border border-slate-100 dark:border-slate-800 overflow-hidden bg-white dark:bg-slate-900">
                  <div className="px-4 py-2.5 border-b border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 text-xs font-bold uppercase tracking-wide text-slate-700 dark:text-slate-300">
                    Order Line Items Breakdown
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs">
                      <thead className="border-b border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-400 font-extrabold text-[10px] uppercase">
                        <tr>
                          <th className="px-4 py-2.5">Item / Service</th>
                          <th className="px-4 py-2.5">Description</th>
                          <th className="px-4 py-2.5 text-center">Ordered</th>
                          <th className="px-4 py-2.5 text-center">Received</th>
                          <th className="px-4 py-2.5 text-right">Unit Price</th>
                          <th className="px-4 py-2.5 text-right">Line Total</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                        {poItems.map((item: any, idx: number) => {
                          const qtyOrd = Number(item.quantity_ordered || item.quantity || 1);
                          const qtyRec = Number(item.quantity_received || 0);
                          const price = Number(item.unit_price || item.price || 0);
                          return (
                            <tr key={idx} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30">
                              <td className="px-4 py-3 font-semibold text-slate-800 dark:text-slate-200">{item.item_name || item.description || 'Line Item'}</td>
                              <td className="px-4 py-3 font-medium text-slate-600 dark:text-slate-400 whitespace-pre-wrap">{item.description || '—'}</td>
                              <td className="px-4 py-3 font-mono text-center text-slate-700 dark:text-slate-300">{qtyOrd}</td>
                              <td className="px-4 py-3 font-mono text-center text-emerald-600 font-bold">{qtyRec}</td>
                              <td className="px-4 py-3 font-mono text-right text-slate-700 dark:text-slate-300">${price.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                              <td className="px-4 py-3 font-mono text-right font-bold text-slate-900 dark:text-white">${(qtyOrd * price).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                            </tr>
                          );
                        })}
                        {poItems.length === 0 && (
                          <tr>
                            <td colSpan={6} className="px-4 py-6 text-center text-slate-400 italic">No line items recorded.</td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            );
          })()}

          {/* Sticky Footer */}
          <div className="flex flex-col-reverse sm:flex-row items-stretch sm:items-center justify-between border-t border-slate-100 dark:border-slate-800 px-4 py-3 sm:px-6 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md shrink-0 gap-3 sticky bottom-0 z-10">
            <span className="text-xs text-slate-400 font-mono text-center sm:text-left">Status: {viewDetailPO.status || 'PENDING'}</span>
            <div className="flex flex-col-reverse sm:flex-row items-stretch sm:items-center gap-2 w-full sm:w-auto">
              {viewDetailPO.attachment_file_name ? (
                <button
                  type="button"
                  onClick={() => void handleViewPOAttachment(viewDetailPO.id)}
                  className="px-4 py-2 bg-orange-600 hover:bg-orange-700 text-white font-bold rounded-lg text-xs flex items-center justify-center gap-1.5 transition w-full sm:w-auto"
                >
                  <Eye size={14} /> View Quotation / Supporting Document
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => void handleDownloadPOAttachment(viewDetailPO.id, 'docket.pdf')}
                  className="px-4 py-2 bg-orange-600 hover:bg-orange-700 text-white font-bold rounded-lg text-xs flex items-center justify-center gap-1.5 transition w-full sm:w-auto"
                >
                  <Eye size={14} /> View Generated PO Docket
                </button>
              )}
              {canReceive(viewDetailPO) && (
                <button
                  type="button"
                  onClick={() => {
                    const targetPo = viewDetailPO;
                    setViewDetailPO(null);
                    openReceive(targetPo);
                  }}
                  className="px-3.5 py-2 bg-emerald-600 text-white rounded-lg text-xs font-bold hover:bg-emerald-700 transition flex items-center justify-center gap-1 w-full sm:w-auto"
                >
                  <Truck size={13} /> Receive Goods
                </button>
              )}
              {viewDetailPO.status === 'APPROVED' && !hasExpense(viewDetailPO) && (
                <button
                  type="button"
                  onClick={() => {
                    const poToExpense = viewDetailPO;
                    setViewDetailPO(null);
                    setExpensePO(poToExpense);
                  }}
                  className="px-3.5 py-2 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-bold hover:bg-slate-50 dark:hover:bg-slate-800 transition w-full sm:w-auto"
                >
                  Raise Expense
                </button>
              )}
              <button
                type="button"
                onClick={() => setViewDetailPO(null)}
                className="px-3.5 py-2 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-bold hover:bg-slate-50 dark:hover:bg-slate-800 transition w-full sm:w-auto"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      </div>,
      document.body
    )}

    {receivingPO && createPortal(
      <div className="fixed inset-0 z-[99999] flex items-center justify-center bg-black/70 backdrop-blur-xs p-0 sm:p-4 overflow-hidden" onClick={(e) => { if (e.target === e.currentTarget) setReceivingPO(null); }}>
        <div className="w-full h-[100dvh] sm:h-auto sm:max-h-[90vh] max-w-full sm:max-w-4xl rounded-none sm:rounded-2xl border-0 sm:border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-2xl flex flex-col overflow-hidden">
          <form onSubmit={submitReceipt} className="flex flex-col h-full overflow-hidden">
            {/* Sticky Header */}
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 px-4 py-3.5 sm:px-6 sm:py-4 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md shrink-0 sticky top-0 z-10">
              <div>
                <h3 className="flex items-center gap-2 text-base sm:text-lg font-bold text-slate-900 dark:text-white">
                  <PackageCheck size={18} className="text-emerald-600" />
                  Receive Goods: {receivingPO.po_number}
                </h3>
                <p className="mt-0.5 text-xs text-slate-500">
                  Select the items received at the site and enter quantities. Unselected items remain outstanding.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setReceivingPO(null)}
                className="p-1.5 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 hover:text-slate-900 dark:hover:text-white transition"
              >
                <X size={20} />
              </button>
            </div>

            {/* Scrollable Table Body */}
            <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4">
              <div className="overflow-x-auto rounded-lg border border-slate-200 dark:border-slate-800">
                <table className="w-full min-w-[650px] text-left text-xs">
                  <thead className="bg-slate-50 text-slate-500 dark:bg-slate-800">
                    <tr>
                      <th className="p-3">Select</th>
                      <th className="p-3">Item / description</th>
                      <th className="p-3 text-right">Ordered</th>
                      <th className="p-3 text-right">Received</th>
                      <th className="p-3 text-right">Outstanding</th>
                      <th className="p-3 text-right">Receive now</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {(receivingPO.items || []).map((item: Row) => {
                      const id = String(item.id);
                      const outstanding = Math.max(0, Number(item.quantity_ordered || 0) - Number(item.quantity_received || 0));
                      const checked = selectedReceiptItemIds.includes(id);
                      return (
                        <tr key={id} className={checked ? 'bg-emerald-50/70 dark:bg-emerald-950/20' : ''}>
                          <td className="p-3">
                            <input
                              aria-label={`Select ${item.item_name || item.description}`}
                              type="checkbox"
                              checked={checked}
                              disabled={outstanding <= 0}
                              onChange={(event) => setSelectedReceiptItemIds((current) => event.target.checked ? [...current, id] : current.filter((value) => value !== id))}
                              className="h-4 w-4 accent-emerald-600"
                            />
                          </td>
                          <td className="p-3">
                            <span className="font-semibold">{item.item_name || item.description}</span>
                            {item.item_name && <span className="block text-slate-500">{item.description}</span>}
                            {outstanding <= 0 && <span className="mt-1 inline-flex rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-bold text-emerald-700">Fully received</span>}
                          </td>
                          <td className="p-3 text-right font-mono">{Number(item.quantity_ordered || 0).toLocaleString()}</td>
                          <td className="p-3 text-right font-mono">{Number(item.quantity_received || 0).toLocaleString()}</td>
                          <td className="p-3 text-right font-mono font-bold text-amber-700">{outstanding.toLocaleString()}</td>
                          <td className="p-3 text-right">
                            <input
                              aria-label={`Quantity received for ${item.item_name || item.description}`}
                              type="number"
                              min="0.001"
                              max={outstanding}
                              step="0.001"
                              disabled={!checked || outstanding <= 0}
                              value={checked ? (receiptQuantities[id] ?? outstanding) : 0}
                              onChange={(event) => setReceiptQuantities((current) => ({ ...current, [id]: Math.min(outstanding, Math.max(0, Number(event.target.value) || 0)) }))}
                              className="w-24 rounded-lg border bg-white p-2 text-right font-mono disabled:opacity-40 dark:bg-slate-950"
                            />
                          </td>
                        </tr>
                      );
                    })}
                    {!(receivingPO.items || []).length && (
                      <tr><td colSpan={6} className="p-8 text-center text-slate-500">This purchase order has no line items.</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Sticky Action Footer */}
            <div className="sticky bottom-0 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-t border-slate-200 dark:border-slate-800 p-3.5 sm:px-6 sm:py-4 shrink-0 flex flex-row items-center justify-end gap-2 sm:gap-3 z-10">
              <button type="button" onClick={() => setReceivingPO(null)} className="rounded-lg border px-4 py-2.5 text-xs font-semibold hover:bg-slate-50 dark:hover:bg-slate-800 transition flex-1 sm:flex-initial text-center">
                Cancel
              </button>
              <button type="submit" disabled={receivingBusy || selectedReceiptItemIds.length === 0 || selectedReceiptItemIds.some((id) => Number(receiptQuantities[id]) <= 0)} className="inline-flex items-center justify-center gap-1.5 rounded-lg bg-emerald-600 px-4 py-2.5 text-xs font-bold text-white hover:bg-emerald-700 transition disabled:opacity-50 flex-1 sm:flex-initial">
                {receivingBusy ? 'Saving…' : <><PackageCheck size={14} />Save Goods Receipt</>}
              </button>
            </div>
          </form>
        </div>
      </div>,
      document.body
    )}
    {expensePO && <OperationalExpenseSubmissionModal projectId={String(expensePO.project_id || projectId || '')} initialPurchaseOrder={expensePO} onClose={() => setExpensePO(null)} onSubmitted={async (expense) => { const poNumber = expensePO.po_number; const poId = String(expensePO.id); setRaisedPurchaseOrderIds((current) => new Set(current).add(poId)); setExpensePO(null); setMessage(`${expense.expense_number || 'Expense'} submitted to Finance for ${poNumber}.`); await reload(); }} />}
    <UniversalFileViewerModal isOpen={viewerState.isOpen} onClose={() => setViewerState({ isOpen: false })} fileUrl={viewerState.fileUrl} blob={viewerState.blob} fileName={viewerState.fileName} title={viewerState.title} />
  </section>;
}
