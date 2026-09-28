'use client';

import React, { useEffect, useMemo, useState } from 'react';
import {
  FileText,
  Plus,
  RefreshCw,
  AlertTriangle,
  Paperclip,
  CheckCircle2,
  Trash2,
  X,
  CreditCard,
  Building2,
  Calendar,
  User,
  Phone,
  Upload,
  DollarSign,
  Check,
  Mail,
  Briefcase,
} from 'lucide-react';
import { apiFetch, apiFetchBlob, downloadBlob } from '@/lib/api';
import { openUniversalFileViewer } from '@/lib/fileViewer';
import { useAuth } from './AuthProvider';
import SearchableSelect from './SearchableSelect';
import AppDateTimePicker from './ui/AppDateTimePicker';
import { useOperationalDataSync } from '@/lib/operationalDataSync';
import OperationalExpenseSubmissionModal from './OperationalExpenseSubmissionModal';

type Row = Record<string, any>;
const paidAmountFor = (row: Row) => Array.isArray(row.payments) && row.payments.length
  ? row.payments.reduce((sum: number, payment: Row) => sum + Number(payment.amount || 0), 0)
  : Number(row.paid_amount) || 0;

const methods = [
  ['BANK_TRANSFER', 'Bank transfer'],
  ['MOBILE_MONEY', 'Mobile money'],
  ['CASH', 'Cash'],
  ['CARD', 'Card'],
  ['OTHER', 'Other'],
];

function StatusBadge({ status }: { status: string }) {
  const s = (status || '').trim().toUpperCase().replace(/[\s-]+/g, '_');
  const map: Record<string, string> = {
    PAID: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-300',
    COMPLETED: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-300',
    PARTIALLY_PAID: 'bg-blue-100 text-blue-800 dark:bg-blue-950/50 dark:text-blue-300',
    PAYMENT_RECONCILIATION_REQUIRED: 'bg-amber-100 text-amber-800 dark:bg-amber-950/50 dark:text-amber-300',
    APPROVED: 'bg-violet-100 text-violet-800 dark:bg-violet-950/50 dark:text-violet-300',
    PENDING: 'bg-amber-100 text-amber-800 dark:bg-amber-950/50 dark:text-amber-300',
    SUBMITTED: 'bg-amber-100 text-amber-800 dark:bg-amber-950/50 dark:text-amber-300',
    REJECTED: 'bg-red-100 text-red-800 dark:bg-red-950/50 dark:text-red-300',
    DRAFT: 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-300',
  };
  const labels: Record<string, string> = {
    PARTIALLY_PAID: 'Outstanding',
    PAYMENT_RECONCILIATION_REQUIRED: 'Pending Payment',
  };
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold ${map[s] || 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300'}`}>
      {labels[s] || String(status || '').replaceAll('_', ' ')}
    </span>
  );
}

export default function OperationalExpensesWorkspace({
  readOnly = false,
  accent = 'violet',
}: {
  readOnly?: boolean;
  accent?: 'emerald' | 'indigo' | 'orange' | 'violet' | 'amber';
}) {
  const auth = useAuth();
  const finance =
    !readOnly &&
    (auth.user?.portal_type === 'FINANCE' ||
    auth.access?.is_superuser ||
    auth.access?.roles?.some((r: string) => ['finance', 'accountant', 'accounts payable'].includes(r.toLowerCase())));

  const [rows, setRows] = useState<Row[]>([]);
  const [focusedExpenseId] = useState(() => typeof window === 'undefined' ? '' : new URLSearchParams(window.location.search).get('expense_id') || '');
  const [payees, setPayees] = useState<Row[]>([]);
  const [inventory, setInventory] = useState<Row[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const [payeeId, setPayeeId] = useState('');
  const [payName, setPayName] = useState('');
  const [phone, setPhone] = useState('');
  const [bank, setBank] = useState('');
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [method, setMethod] = useState('BANK_TRANSFER');
  const [invoice, setInvoice] = useState<File | null>(null);
  const [manual, setManual] = useState(false);
  const [manualTotal, setManualTotal] = useState('');
  const [items, setItems] = useState<Row[]>([{ inventory_item_id: '', name: '', quantity: '1', unit_cost: '0' }]);

  const [showForm, setShowForm] = useState(false);
  const [showExpenseModal, setShowExpenseModal] = useState(false);
  const [viewingExpense, setViewingExpense] = useState<Row | null>(null);

  // Disbursement Modal State
  const [payingRow, setPayingRow] = useState<Row | null>(null);
  const [paymentReceiptFile, setPaymentReceiptFile] = useState<File | null>(null);
  const [paymentAmount, setPaymentAmount] = useState('');
  const [paymentDate, setPaymentDate] = useState(new Date().toISOString().slice(0, 10));

  const reload = async () => {
    try {
      const [expenseRows, payeeRows, inventoryRows] = await Promise.all([
        apiFetch<any>('/api/v1/operational-expenses').catch(() => []),
        apiFetch<any>('/api/v1/operational-expenses/payees').catch(() => []),
        apiFetch<any>('/api/v1/inventory/items?page_size=200').catch(() => ({ items: [] })),
      ]);
      setRows(Array.isArray(expenseRows) ? expenseRows : (expenseRows as any)?.items || []);
      setPayees(Array.isArray(payeeRows) ? payeeRows : (payeeRows as any)?.items || []);
      setInventory(Array.isArray(inventoryRows) ? inventoryRows : (inventoryRows as any)?.items || []);
    } catch (e) {
      setRows([]);
      setError(e instanceof Error ? e.message : 'Could not load expenses');
    }
  };

  useEffect(() => {
    void reload();
  }, []);
  useOperationalDataSync((update) => {
    if (update.domain === 'expenses' && document.visibilityState === 'visible') void reload();
  });
  useEffect(() => {
    if (!focusedExpenseId || !rows.some((row) => String(row.id) === focusedExpenseId)) return;
    document.getElementById(`operational-expense-${focusedExpenseId}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }, [focusedExpenseId, rows]);

  const handleOpenFile = async (path: string, fileName: string) => {
    try {
      const blob = await apiFetchBlob(path);
      openUniversalFileViewer({ blob, fileName, title: 'Operational expense file' });
    } catch (err: any) {
      setError(err?.message || 'Failed to download or view file. Check user permissions.');
    }
  };

  const computed = useMemo(
    () => items.reduce((total, item) => total + (Number(item.quantity) || 0) * (Number(item.unit_cost) || 0), 0),
    [items]
  );

  const payeeOptions = payees.map((p) => ({ value: p.id, label: `${p.name}${p.phone ? ` | ${p.phone}` : ''}` }));
  const itemOptions = inventory.map((i) => ({ value: i.id, label: `${i.name || i.item_name || 'Item'}${i.sku ? ` | ${i.sku}` : ''}` }));

  const addInventory = (idx: number, id: string) => {
    const item = inventory.find((x) => x.id === id);
    setItems((old) =>
      old.map((x, i) =>
        i === idx
          ? {
              ...x,
              inventory_item_id: id,
              name: item?.name || item?.item_name || '',
              unit_cost: String(item?.unit_cost ?? item?.cost ?? 0),
            }
          : x
      )
    );
  };

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!invoice) {
      setError('Attach the invoice or supporting document docket.');
      return;
    }
    setBusy(true);
    setError('');
    try {
      const data = {
        payee_id: payeeId || undefined,
        pay_to_name: payName,
        pay_to_phone: phone || undefined,
        bank_account_details: bank || undefined,
        expense_date: date,
        payment_method: method,
        items: items.map(({ inventory_item_id, ...x }) => ({ ...x, inventory_item_id: inventory_item_id || undefined })),
        total_cost: manual ? Number(manualTotal) : undefined,
        manual_total: manual,
      };
      const form = new FormData();
      form.append('expense_json', JSON.stringify(data));
      form.append('invoice', invoice);

      await apiFetch('/api/v1/operational-expenses', { method: 'POST', body: form });
      window.dispatchEvent(new CustomEvent('operational-expenses:updated'));

      setItems([{ inventory_item_id: '', name: '', quantity: '1', unit_cost: '0' }]);
      setInvoice(null);
      setManual(false);
      setManualTotal('');
      await reload();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not submit expense claim.');
    } finally {
      setBusy(false);
    }
  }

  async function handleConfirmPayment(e: React.FormEvent) {
    e.preventDefault();
    if (!payingRow) return;

    setBusy(true);
    setError('');
    try {
      const form = new FormData();
      form.append('amount', paymentAmount);
      form.append('payment_date', paymentDate);
      if (paymentReceiptFile) form.append('receipt', paymentReceiptFile);
      else if (!payingRow.receipt_name) throw new Error('Upload the receipt or payment proof for this disbursement.');
      await apiFetch(`/api/v1/operational-expenses/${payingRow.id}/payment-receipt`, { method: 'POST', body: form });
      setPayingRow(null);
      setPaymentReceiptFile(null);
      await reload();
      window.dispatchEvent(new CustomEvent('operational-expenses:updated'));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not complete payment receipt processing.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-6 w-full">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b pb-4">
        <div>
          <h1 className="text-xl font-bold text-foreground flex items-center gap-2">
            <div className="p-2 rounded-xl bg-violet-100 dark:bg-violet-950 text-violet-600">
              <FileText size={20} />
            </div>
            Operational Expenses &amp; Claims Submission
          </h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            Submit purchases for payment and track Finance processing and disbursement.
          </p>
        </div>
        {!readOnly && (
          <button
            type="button"
            onClick={() => setShowExpenseModal(true)}
            className="px-4 py-2 bg-violet-600 hover:bg-violet-700 text-white font-bold rounded-xl text-xs shadow-sm transition flex items-center gap-1.5 shrink-0"
          >
            <Plus size={15} /> Submit Operational Expense Claim
          </button>
        )}
      </div>

      {/* Error Alert */}
      {error && (
        <div role="alert" className="flex items-center justify-between p-3.5 rounded-xl border border-red-200 bg-red-50 text-red-800 dark:bg-red-950/40 dark:border-red-800 dark:text-red-300 text-xs font-semibold">
          <div className="flex items-center gap-2">
            <AlertTriangle size={16} className="shrink-0 text-red-600" />
            <span>{error}</span>
          </div>
          <button onClick={() => setError('')} className="p-1 hover:opacity-70"><X size={15} /></button>
        </div>
      )}

      {/* Expense Submission Form */}
      {!readOnly && showForm && (
        <form onSubmit={submit} className="bg-card border rounded-2xl p-5 shadow-sm space-y-5">
          <div className="flex items-center justify-between border-b pb-3 border-border">
            <h2 className="font-bold text-sm text-foreground flex items-center gap-2">
              <Plus size={16} className="text-violet-600" /> Submit New Operational Expense Claim
            </h2>
            <span className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider">Voucher Intake</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-foreground mb-1 flex items-center gap-1.5">
                <User size={13} className="text-violet-600" /> Saved Payee Selection
              </label>
              <SearchableSelect
                value={payeeId}
                onChange={(id) => {
                  setPayeeId(id);
                  const p = payees.find((x) => x.id === id);
                  if (p) {
                    setPayName(p.name);
                    setPhone(p.phone || '');
                    setBank(p.bank_account_details || '');
                  }
                }}
                options={payeeOptions}
                placeholder="Choose saved payee or enter new below..."
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-foreground mb-1 flex items-center gap-1.5">
                <User size={13} className="text-violet-600" /> Pay To Name *
              </label>
              <input
                required
                type="text"
                placeholder="Payee or vendor full name"
                className="w-full border rounded-xl p-2.5 bg-background text-xs font-medium focus:ring-2 focus:ring-violet-500 focus:outline-none"
                value={payName}
                onChange={(e) => setPayName(e.target.value)}
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-foreground mb-1 flex items-center gap-1.5">
                <Phone size={13} className="text-violet-600" /> Mobile / Contact Phone
              </label>
              <input
                type="text"
                placeholder="+256 700 000 000"
                className="w-full border rounded-xl p-2.5 bg-background text-xs font-medium focus:ring-2 focus:ring-violet-500 focus:outline-none"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-foreground mb-1 flex items-center gap-1.5">
                <Building2 size={13} className="text-violet-600" /> Bank Account / Mobile Money Details
              </label>
              <input
                type="text"
                placeholder="Bank Account # / MoMo Number"
                className="w-full border rounded-xl p-2.5 bg-background text-xs font-medium focus:ring-2 focus:ring-violet-500 focus:outline-none"
                value={bank}
                onChange={(e) => setBank(e.target.value)}
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-foreground mb-1 flex items-center gap-1.5">
                <Calendar size={13} className="text-violet-600" /> Expense Claim Date *
              </label>
              <AppDateTimePicker
                mode="date"
                required
                value={date}
                onChange={(val) => setDate(val)}
                placeholder="Select expense claim date"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-foreground mb-1 flex items-center gap-1.5">
                <CreditCard size={13} className="text-violet-600" /> Payment Disbursement Method *
              </label>
              <SearchableSelect
                required
                options={methods.map(([v, l]) => ({ value: v, label: l }))}
                value={method}
                onChange={(val) => setMethod(val)}
                searchable={false}
              />
            </div>
          </div>

          {/* Line Items */}
          <div className="space-y-3 border-t pt-4">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-xs uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                <FileText size={14} className="text-violet-600" /> Purchased Line Items
              </h3>
              <button
                type="button"
                className="px-3 py-1.5 bg-violet-50 dark:bg-violet-950/60 hover:bg-violet-100 text-violet-700 dark:text-violet-300 rounded-lg text-xs font-bold transition flex items-center gap-1"
                onClick={() => setItems((old) => [...old, { inventory_item_id: '', name: '', quantity: '1', unit_cost: '0' }])}
              >
                <Plus size={13} /> Add Item
              </button>
            </div>

            {items.map((item, i) => (
              <div key={i} className="grid grid-cols-1 md:grid-cols-5 gap-2.5 p-3 rounded-xl border bg-muted/30">
                <div className="md:col-span-2">
                  <label className="block text-[11px] font-bold text-muted-foreground mb-0.5">Inventory Item Lookup</label>
                  <SearchableSelect
                    value={item.inventory_item_id}
                    onChange={(id) => addInventory(i, id)}
                    options={itemOptions}
                    placeholder="Search inventory items..."
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-muted-foreground mb-0.5">Item Name *</label>
                  <input
                    required
                    className="w-full border rounded-lg p-2 bg-background text-xs"
                    value={item.name}
                    onChange={(e) => setItems((old) => old.map((x, j) => (j === i ? { ...x, name: e.target.value } : x)))}
                    placeholder="Or enter custom item"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-muted-foreground mb-0.5">Quantity</label>
                  <input
                    required
                    type="number"
                    min="0.001"
                    step="0.001"
                    className="w-full border rounded-lg p-2 bg-background font-mono text-xs text-center"
                    value={item.quantity}
                    onChange={(e) => setItems((old) => old.map((x, j) => (j === i ? { ...x, quantity: e.target.value } : x)))}
                  />
                </div>
                <div className="flex items-center gap-2">
                  <div className="flex-1">
                    <label className="block text-[11px] font-bold text-muted-foreground mb-0.5">Unit Cost ($)</label>
                    <input
                      required
                      type="number"
                      min="0"
                      step="0.01"
                      className="w-full border rounded-lg p-2 bg-background font-mono text-xs text-right"
                      value={item.unit_cost}
                      onChange={(e) => setItems((old) => old.map((x, j) => (j === i ? { ...x, unit_cost: e.target.value } : x)))}
                    />
                  </div>
                  {items.length > 1 && (
                    <button
                      type="button"
                      onClick={() => setItems((old) => old.filter((_, j) => j !== i))}
                      className="p-2 text-red-500 hover:text-red-700 mt-4"
                    >
                      <Trash2 size={14} />
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>

          {/* Totals & Upload */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 border-t pt-4">
            <div className="space-y-3">
              <label className="flex items-center gap-2 text-xs font-bold text-foreground cursor-pointer">
                <input
                  type="checkbox"
                  checked={manual}
                  onChange={(e) => setManual(e.target.checked)}
                  className="rounded border-gray-300 text-violet-600 focus:ring-violet-500"
                />
                Override &amp; Enter total cost manually
              </label>

              <div>
                <label className="block text-xs font-bold text-foreground mb-1">
                  Total Cost {manual ? '*' : '(Calculated from line items)'}
                </label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  required={manual}
                  readOnly={!manual}
                  className="w-full border rounded-xl p-2.5 bg-background font-mono font-bold text-sm text-violet-600 focus:ring-2 focus:ring-violet-500 focus:outline-none"
                  value={manual ? manualTotal : computed.toFixed(2)}
                  onChange={(e) => setManualTotal(e.target.value)}
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-foreground mb-1">
                Invoice / Docket Document Upload *
              </label>
              <input
                type="file"
                required
                accept=".pdf,.png,.jpg,.jpeg,.doc,.docx,.xls,.xlsx,.txt,.csv"
                className="w-full p-2 border rounded-xl bg-background text-xs text-muted-foreground file:mr-3 file:py-1 file:px-2.5 file:rounded-lg file:border-0 file:text-xs file:font-bold file:bg-violet-50 file:text-violet-700 hover:file:bg-violet-100 dark:file:bg-violet-950/60 dark:file:text-violet-300 cursor-pointer"
                onChange={(e) => setInvoice(e.target.files?.[0] || null)}
              />
              {invoice && (
                <p className="text-[11px] text-violet-600 dark:text-violet-400 font-medium mt-1 flex items-center gap-1">
                  <Paperclip size={12} /> {invoice.name} ({(invoice.size / 1024).toFixed(1)} KB)
                </p>
              )}
            </div>
          </div>

          <div className="flex justify-end pt-2">
            <button
              type="submit"
              disabled={busy}
              className="px-6 py-2.5 bg-violet-600 hover:bg-violet-700 text-white font-bold rounded-xl text-xs shadow-sm transition flex items-center gap-2 disabled:opacity-50"
            >
              {busy ? <RefreshCw className="h-4 w-4 animate-spin" /> : <CheckCircle2 size={16} />}
              Submit Expense Claim to Finance
            </button>
          </div>
        </form>
      )}

      {/* Claims Processing Table */}
      <div className="bg-card border rounded-2xl shadow-sm overflow-hidden">
        <div className="border-b p-4 flex items-center justify-between bg-muted/30">
          <h2 className="font-bold text-sm text-foreground flex items-center gap-2">
            <FileText size={16} className="text-violet-600" />
            {finance ? 'Expense Claims Awaiting Finance Action' : 'My Submitted Expense Claims'}
          </h2>
          <span className="text-xs font-bold text-muted-foreground">{rows.length} claims</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead className="bg-muted/50 border-b">
              <tr>
                {['Expense #', 'Submitted By', 'Category', 'Payee Name', 'Date', 'Total Cost ($)', 'Paid / Balance', 'Status', 'Invoice / Receipt', finance ? 'Payment Action' : ''].filter(Boolean).map((h) => (
                  <th key={h} className={`px-4 py-3 font-bold text-muted-foreground uppercase tracking-wider ${['Total Cost ($)', 'Paid / Balance', 'Payment Action'].includes(h) ? 'text-right' : 'text-left'}`}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y">
              {rows.length === 0 ? (
                <tr>
                  <td colSpan={9} className="px-4 py-8 text-center text-muted-foreground">
                    No expense claims logged.
                  </td>
                </tr>
              ) : (
                rows.map((row) => {
                  const sName = row.submitted_by_name || row.submitted_by?.full_name || (row.submitted_by?.first_name ? `${row.submitted_by.first_name} ${row.submitted_by.last_name || ''}`.trim() : null) || row.created_by_name || (auth.user?.first_name ? `${auth.user.first_name} ${auth.user.last_name || ''}`.trim() : 'Operations Supervisor');
                  const sPos = row.submitted_by_position || row.submitted_by_title || row.submitted_by?.job_title || row.submitted_by?.role || (auth.user?.is_superuser ? 'Operations Director' : auth.user?.portal_type ? `${auth.user.portal_type.replace('_', ' ')} Admin` : 'Field Administrator');
                  const sEmail = row.submitted_by_email || row.submitted_by?.email || row.email || auth.user?.email || 'operations@cestos.com';

                  return (
                    <tr id={`operational-expense-${row.id}`} key={row.id} className={`hover:bg-muted/30 transition ${String(row.id) === focusedExpenseId ? 'bg-amber-100 outline outline-2 outline-amber-500 dark:bg-amber-950/50' : ''}`}>
                      <td className="px-4 py-3 font-mono font-bold text-foreground">
                        <button
                          type="button"
                          onClick={() => setViewingExpense(row)}
                          className="hover:underline text-violet-600 dark:text-violet-400 font-bold text-xs"
                          title="Click to view Operational Expense Voucher"
                        >
                          {row.expense_number || row.id.slice(0, 8)}
                        </button>
                      </td>
                      <td className="px-4 py-3 space-y-0.5">
                        <div className="font-bold text-foreground flex items-center gap-1">
                          <User size={12} className="text-violet-600 shrink-0" />
                          <span>{sName}</span>
                        </div>
                        <div className="text-[11px] text-muted-foreground font-medium flex items-center gap-1">
                          <Briefcase size={11} className="text-slate-400 shrink-0" />
                          <span>{sPos}</span>
                        </div>
                        <div>
                          <a
                            href={`mailto:${sEmail}`}
                            onClick={(e) => e.stopPropagation()}
                            className="inline-flex items-center gap-1 text-violet-600 dark:text-violet-400 hover:text-violet-800 dark:hover:text-violet-300 font-mono text-[11px] font-bold underline"
                            title={`Send email to ${sName}`}
                          >
                            <Mail size={11} className="shrink-0" />
                            {sEmail}
                          </a>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <span className="inline-flex items-center px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-[11px] font-medium">
                          {String(row.cost_category || row.expense_type || row.category || 'General').replaceAll('_', ' ')}
                        </span>
                      </td>
                      <td className="px-4 py-3 font-medium text-foreground">{row.pay_to_name}</td>
                      <td className="px-4 py-3 font-mono text-muted-foreground">{row.expense_date}</td>
                      <td className="px-4 py-3 text-right font-black text-emerald-600">
                        ${Number(row.total_cost || row.amount || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="whitespace-nowrap font-semibold text-blue-700 dark:text-blue-400">
                          Paid: ${paidAmountFor(row).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </div>
                        <div className="whitespace-nowrap text-[10px] text-slate-500">
                          Balance: ${Number(row.balance_due ?? Math.max(0, Number(row.total_cost || row.amount || 0) - paidAmountFor(row))).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </div>
                        {Array.isArray(row.payments) && row.payments.length > 0 && (
                          <div className="text-[10px] text-slate-500">
                            {row.payments.length} installment{row.payments.length === 1 ? '' : 's'}
                          </div>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <StatusBadge status={row.status || 'SUBMITTED'} />
                      </td>
                      <td className="px-4 py-3">
                        {(() => {
                          const fileName = row.invoice_name || row.receipt_name || row.receipt_file_name || row.attachment;
                          if (!fileName) return <span className="text-muted-foreground text-[11px]">No docket</span>;
                          return (
                            <div className="flex flex-wrap items-center gap-2">
                              {(row.invoice_name || row.invoice_path || (!row.receipt_name && !row.receipt_file_name)) && (
                                <button
                                  type="button"
                                  onClick={() => void handleOpenFile(`/api/v1/operational-expenses/${row.id}/files/invoice`, row.invoice_name || fileName)}
                                  className="inline-flex items-center gap-1 text-violet-600 hover:text-violet-800 dark:text-violet-400 font-bold underline text-xs cursor-pointer"
                                >
                                  <Paperclip size={13} /> {row.invoice_name || fileName}
                                </button>
                              )}
                              {(row.receipt_name || row.receipt_file_name) && (
                                <button
                                  type="button"
                                  onClick={() => void handleOpenFile(`/api/v1/operational-expenses/${row.id}/files/receipt`, row.receipt_name || row.receipt_file_name || 'Receipt')}
                                  className="inline-flex items-center gap-1 text-emerald-600 hover:text-emerald-800 dark:text-emerald-400 font-bold underline text-xs cursor-pointer"
                                >
                                  <Paperclip size={13} /> {row.receipt_name || row.receipt_file_name}
                                </button>
                              )}
                            </div>
                          );
                        })()}
                      </td>
                      {finance && (
                        <td className="px-4 py-3">
                          {Number(row.balance_due ?? (Number(row.total_cost || 0) - paidAmountFor(row))) > 0 ? (
                            <button
                              type="button"
                              onClick={() => {
                                setPayingRow(row);
                                setPaymentReceiptFile(null);
                                setPaymentAmount(String(Math.max(0, Number(row.total_cost || 0) - paidAmountFor(row)).toFixed(2)));
                                setPaymentDate(new Date().toISOString().slice(0, 10));
                              }}
                              className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-lg text-xs transition flex items-center gap-1.5 shadow-xs"
                            >
                              <Upload size={13} /> {paidAmountFor(row) > 0 ? 'Record Payment' : 'Pay & Upload'}
                            </button>
                          ) : (
                            <span className="text-emerald-600 font-bold text-[11px] flex items-center gap-1">
                              <CheckCircle2 size={13} /> Disbursement Paid
                            </span>
                          )}
                        </td>
                      )}
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* View Operational Expense Voucher Modal */}
      {viewingExpense && (() => {
        const vName = viewingExpense.submitted_by_name || viewingExpense.submitted_by?.full_name || (viewingExpense.submitted_by?.first_name ? `${viewingExpense.submitted_by.first_name} ${viewingExpense.submitted_by.last_name || ''}`.trim() : null) || viewingExpense.created_by_name || (auth.user?.first_name ? `${auth.user.first_name} ${auth.user.last_name || ''}`.trim() : 'Operations Supervisor');
        const vPos = viewingExpense.submitted_by_position || viewingExpense.submitted_by_title || viewingExpense.submitted_by?.job_title || viewingExpense.submitted_by?.role || (auth.user?.is_superuser ? 'Operations Director' : auth.user?.portal_type ? `${auth.user.portal_type.replace('_', ' ')} Admin` : 'Field Administrator');
        const vEmail = viewingExpense.submitted_by_email || viewingExpense.submitted_by?.email || viewingExpense.email || auth.user?.email || 'operations@cestos.com';
        const bal = Number(viewingExpense.balance_due ?? Math.max(0, Number(viewingExpense.total_cost || viewingExpense.amount || 0) - paidAmountFor(viewingExpense)));
        const canPay = finance && bal > 0 && ['SUBMITTED', 'PENDING', 'PARTIALLY_PAID', 'PARTIAL_PAYMENT', 'PAYMENT_RECONCILIATION_REQUIRED', 'APPROVED'].includes((viewingExpense.status || '').toUpperCase());

        return (
          <div className="fixed inset-0 bg-slate-950/75 z-[9999] flex items-center justify-center p-0 sm:p-4 overflow-hidden">
            <div className="bg-card border rounded-none sm:rounded-2xl max-w-full sm:max-w-4xl w-full h-full sm:h-auto sm:max-h-[90vh] flex flex-col overflow-hidden shadow-2xl">
              <div className="flex items-center justify-between border-b px-4 py-3.5 sm:px-6 sm:py-4 bg-card shrink-0">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-lg bg-violet-100 dark:bg-violet-950 text-violet-600 flex items-center justify-center font-bold">
                    <DollarSign size={18} />
                  </div>
                  <div>
                    <h3 className="font-bold text-base text-foreground">Operational Expense Voucher</h3>
                    <p className="text-xs text-muted-foreground font-mono">
                      Ref #: {viewingExpense.expense_number || viewingExpense.id?.slice(0, 8)}
                    </p>
                  </div>
                </div>
                <button type="button" onClick={() => setViewingExpense(null)} className="p-1.5 rounded-full hover:bg-muted text-muted-foreground">
                  <X size={20} />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 p-5 rounded-xl border bg-muted/20">
                  <div className="space-y-4">
                    <div>
                      <span className="text-[10px] font-extrabold uppercase tracking-widest text-violet-600">Official Expense Claim</span>
                      <h4 className="text-lg font-black text-foreground mt-1">{viewingExpense.pay_to_name || 'Operational Vendor'}</h4>
                      <p className="text-xs text-muted-foreground mt-1">Payment Method: {String(viewingExpense.payment_method || 'BANK_TRANSFER').replaceAll('_', ' ')}</p>
                    </div>

                    <div className="flex items-center gap-3 pt-1">
                      <StatusBadge status={viewingExpense.status || 'SUBMITTED'} />
                      <span className="text-xs text-muted-foreground font-mono">{viewingExpense.expense_date || '—'}</span>
                    </div>

                    <div className="p-3 rounded-xl border bg-violet-50/50 dark:bg-violet-950/20 text-xs space-y-1">
                      <span className="text-[10px] font-extrabold uppercase tracking-wider text-violet-600 dark:text-violet-400 block">Submitted By</span>
                      <p className="font-bold text-foreground flex items-center gap-1.5"><User size={13} className="text-violet-600 shrink-0" /> {vName}</p>
                      <p className="text-[11px] text-muted-foreground font-medium">{vPos}</p>
                      <a href={`mailto:${vEmail}`} className="text-violet-600 dark:text-violet-400 hover:underline font-mono text-[11px] font-bold inline-flex items-center gap-1">
                        <Mail size={11} /> {vEmail}
                      </a>
                    </div>

                    <div className="grid grid-cols-2 gap-3 p-3.5 rounded-xl border bg-background">
                      <div>
                        <span className="block text-[10px] uppercase font-bold text-muted-foreground">Payable To</span>
                        <span className="text-sm font-bold text-foreground">{viewingExpense.pay_to_name || '—'}</span>
                      </div>
                      <div className="text-right">
                        <span className="block text-[10px] uppercase font-bold text-muted-foreground">Total Expenditure</span>
                        <span className="text-lg font-black text-emerald-600">
                          ${Number(viewingExpense.total_cost || viewingExpense.amount || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 p-4 rounded-xl border bg-background text-sm">
                    <div>
                      <span className="block text-[10px] uppercase font-bold text-muted-foreground">Payee phone</span>
                      <span className="font-medium text-foreground">{viewingExpense.pay_to_phone || '—'}</span>
                    </div>
                    <div>
                      <span className="block text-[10px] uppercase font-bold text-muted-foreground">Bank account details</span>
                      <span className="font-medium text-foreground whitespace-pre-wrap">{viewingExpense.bank_account_details || '—'}</span>
                    </div>
                    <div>
                      <span className="block text-[10px] uppercase font-bold text-muted-foreground">Paid to date</span>
                      <span className="font-bold text-emerald-600">${paidAmountFor(viewingExpense).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                    </div>
                    <div>
                      <span className="block text-[10px] uppercase font-bold text-muted-foreground">Remaining Balance</span>
                      <span className="font-bold text-amber-600">${bal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                    </div>
                  </div>
                </div>

                {Array.isArray(viewingExpense.items) && viewingExpense.items.length > 0 && (
                  <div className="rounded-xl border overflow-hidden bg-background">
                    <div className="px-4 py-2.5 border-b bg-muted/40 text-xs font-bold uppercase tracking-wide text-foreground">
                      Items purchased
                    </div>
                    <div className="divide-y">
                      {viewingExpense.items.map((item: any, index: number) => (
                        <div key={`${item.name || 'item'}-${index}`} className="px-4 py-3 flex justify-between gap-4 text-sm">
                          <span className="text-foreground">
                            {item.name || 'Item'} <span className="text-muted-foreground font-mono text-xs">× {item.quantity}</span>
                          </span>
                          <span className="font-semibold text-foreground">
                            ${Number(item.total ?? Number(item.quantity || 0) * Number(item.unit_cost || 0)).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              <div className="flex items-center justify-between border-t px-4 py-3 sm:px-6 bg-card shrink-0 gap-2">
                <span className="text-xs text-muted-foreground font-mono">Status: {String(viewingExpense.status || 'SUBMITTED').trim().toUpperCase().replace(/[\s-]+/g, '_') === 'PARTIALLY_PAID' ? 'Outstanding' : (viewingExpense.status || 'SUBMITTED').replaceAll('_', ' ')}</span>
                <div className="flex items-center gap-2">
                  {canPay && (
                    <button
                      type="button"
                      onClick={() => {
                        const target = viewingExpense;
                        setViewingExpense(null);
                        setPayingRow(target);
                        setPaymentReceiptFile(null);
                        setPaymentAmount(String(Math.max(0, Number(target.total_cost || 0) - paidAmountFor(target)).toFixed(2)));
                        setPaymentDate(new Date().toISOString().slice(0, 10));
                      }}
                      className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-xs flex items-center gap-1.5 transition shadow-sm cursor-pointer"
                    >
                      <DollarSign size={14} /> Record Payment
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => setViewingExpense(null)}
                    className="px-4 py-2 border rounded-xl font-semibold text-xs hover:bg-muted transition cursor-pointer"
                  >
                    Close
                  </button>
                </div>
              </div>
            </div>
          </div>
        );
      })()}

      {/* Pay & Upload Disbursement Modal */}
      {payingRow && (() => {
        const pName = payingRow.submitted_by_name || payingRow.submitted_by?.full_name || (payingRow.submitted_by?.first_name ? `${payingRow.submitted_by.first_name} ${payingRow.submitted_by.last_name || ''}`.trim() : null) || payingRow.created_by_name || (auth.user?.first_name ? `${auth.user.first_name} ${auth.user.last_name || ''}`.trim() : 'Operations Supervisor');
        const pPos = payingRow.submitted_by_position || payingRow.submitted_by_title || payingRow.submitted_by?.job_title || payingRow.submitted_by?.role || (auth.user?.is_superuser ? 'Operations Director' : auth.user?.portal_type ? `${auth.user.portal_type.replace('_', ' ')} Admin` : 'Field Administrator');
        const pEmail = payingRow.submitted_by_email || payingRow.submitted_by?.email || payingRow.email || auth.user?.email || 'operations@cestos.com';
        const pPhone = payingRow.pay_to_phone || payingRow.phone || payingRow.phone_number || payingRow.payee_phone || payingRow.payee?.phone || payingRow.contact_phone;
        const pBank = payingRow.bank_account_details || payingRow.bank_details || payingRow.account_number || payingRow.bank_account || payingRow.payee?.bank_account_details || payingRow.account_details;
        const recordedPayments = Array.isArray(payingRow.payments) ? payingRow.payments : [];
        const paidToDate = paidAmountFor(payingRow);

        return (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs">
            <div className="bg-card border rounded-2xl p-6 max-w-xl sm:max-w-2xl w-full max-h-[calc(100dvh-2rem)] flex flex-col overflow-hidden shadow-2xl">
              <div className="flex shrink-0 items-center justify-between border-b pb-3 border-border">
                <h3 className="font-bold text-base flex items-center gap-2 text-foreground">
                  <DollarSign className="h-5 w-5 text-emerald-600" /> Process Payment Disbursement
                </h3>
                <button onClick={() => setPayingRow(null)} className="p-1 rounded-lg hover:bg-muted text-muted-foreground"><X size={18} /></button>
              </div>

              <form onSubmit={handleConfirmPayment} className="flex min-h-0 flex-col overflow-hidden">
                <div className="min-h-0 flex-1 space-y-4 overflow-y-auto overscroll-contain py-4 px-1">
                {/* Voucher Details Card */}
                <div className="p-4 bg-muted/40 rounded-xl space-y-2 text-xs border">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Voucher Ref #:</span>
                    <span className="font-mono font-bold text-foreground">{payingRow.expense_number || payingRow.id}</span>
                  </div>
                  <div className="flex justify-between items-start">
                    <span className="text-muted-foreground">Submitted By:</span>
                    <div className="text-right">
                      <p className="font-bold text-foreground flex items-center justify-end gap-1"><User size={12} className="text-violet-600" /> {pName}</p>
                      <p className="text-[11px] text-muted-foreground font-medium">{pPos}</p>
                      <a href={`mailto:${pEmail}`} className="text-violet-600 dark:text-violet-400 hover:underline font-mono text-[11px] font-bold inline-flex items-center gap-1">
                        <Mail size={11} /> {pEmail}
                      </a>
                    </div>
                  </div>
                  <div className="flex justify-between pt-1 border-t border-border">
                    <span className="text-muted-foreground">Payee Name:</span>
                    <span className="font-bold text-foreground">{payingRow.pay_to_name || 'New Supplier'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Disbursement Method:</span>
                    <span className="font-medium text-foreground">{String(payingRow.payment_method || 'BANK_TRANSFER').replaceAll('_', ' ')}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Phone Number:</span>
                    <span className="font-mono font-semibold text-foreground">{pPhone || '—'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Bank Account Details:</span>
                    <span className="font-mono font-semibold text-foreground">{pBank || '—'}</span>
                  </div>
                  <div className="flex justify-between pt-1 border-t border-border">
                    <span className="font-bold text-foreground">Expense total:</span>
                    <span className="font-mono font-black text-sm">${Number(payingRow.total_cost || 0).toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Paid to date:</span>
                    <span className="font-mono font-bold text-emerald-600">${paidToDate.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="font-bold text-foreground">Remaining balance:</span>
                    <span className="font-mono font-black text-sm text-amber-600">${Math.max(0, Number(payingRow.total_cost || 0) - paidToDate).toLocaleString()}</span>
                  </div>
                </div>

              {recordedPayments.length > 0 && (
                <div className="rounded-xl border p-3 space-y-2 max-h-36 overflow-y-auto">
                  <p className="text-xs font-bold text-foreground">Payments already recorded</p>
                  {recordedPayments.map((payment: Row) => (
                    <div key={payment.id} className="flex justify-between gap-3 text-xs border-t pt-2">
                      <span className="text-muted-foreground">{payment.payment_date ? new Date(`${payment.payment_date}T00:00:00`).toLocaleDateString() : 'Date unavailable'}{payment.reference ? ` · ${payment.reference}` : ''}</span>
                      <strong className="text-emerald-700">${Number(payment.amount || 0).toLocaleString()}</strong>
                    </div>
                  ))}
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-1">
                <div className="space-y-1">
                  <label className="block text-xs font-bold text-foreground">Amount paid now ($) *</label>
                  <input
                    type="number"
                    min="0.01"
                    max={Math.max(0, Number(payingRow.total_cost || 0) - paidToDate)}
                    step="0.01"
                    required
                    value={paymentAmount}
                    onChange={(e) => setPaymentAmount(e.target.value)}
                    className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm  font-bold text-foreground focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 shadow-xs"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold mb-1">Payment date</label>
                  <AppDateTimePicker
                    mode="date"
                    required
                    value={paymentDate}
                    onChange={(val) => setPaymentDate(val)}
                    placeholder="Select payment date"
                  />
                </div>
              </div>

              {/* Payment Receipt Upload Box */}
              <div>
                <label className="block text-xs font-bold text-foreground mb-1">
                  Payment Receipt / Bank Transfer Proof {payingRow.receipt_name ? '(optional: existing receipt will be reused)' : '(required)'}
                </label>
                <input
                  type="file"
                  accept=".pdf,.png,.jpg,.jpeg,.doc,.docx,.txt"
                  onChange={(e) => setPaymentReceiptFile(e.target.files?.[0] || null)}
                  className="w-full p-2 border rounded-xl bg-background text-xs text-muted-foreground file:mr-3 file:py-1 file:px-2.5 file:rounded-lg file:border-0 file:text-xs file:font-bold file:bg-emerald-50 file:text-emerald-700 hover:file:bg-emerald-100 dark:file:bg-emerald-950/60 dark:file:text-emerald-300 cursor-pointer"
                />
                {paymentReceiptFile && (
                  <p className="text-[11px] text-emerald-600 dark:text-emerald-400 font-medium mt-1 flex items-center gap-1">
                    <Paperclip size={12} /> {paymentReceiptFile.name} ({(paymentReceiptFile.size / 1024).toFixed(1)} KB)
                  </p>
                )}
              </div>

              {payingRow.payment_history_missing && (
                <p className="rounded-lg border border-amber-300 bg-amber-50 p-3 text-xs text-amber-900">
                  This older expense was marked completed without saving the amount paid. Record the actual payment amount and date to reconcile its vendor balance. Its existing receipt will be attached automatically if you do not upload a replacement.
                </p>
              )}
                </div>

              <div className="flex shrink-0 justify-end gap-2 border-t border-border bg-card pt-3">
                <button
                  type="button"
                  onClick={() => setPayingRow(null)}
                  className="px-4 py-2 border rounded-xl text-xs font-bold hover:bg-muted"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={busy}
                  className="px-5 py-2 bg-emerald-600 text-white font-bold rounded-xl text-xs hover:bg-emerald-700 flex items-center gap-1.5 shadow-xs disabled:opacity-50"
                >
                  {busy ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Check size={16} />}
                  Record Payment
                </button>
              </div>
            </form>
          </div>
        </div>
        );
      })()}

      {showExpenseModal && (
        <OperationalExpenseSubmissionModal
          onClose={() => setShowExpenseModal(false)}
          onSubmitted={() => {
            setShowExpenseModal(false);
            void reload();
          }}
        />
      )}
    </div>
  );
}
