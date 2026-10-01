'use client';

import { useState } from 'react';
import { ArrowLeft, Building2, FileText, Loader2, ShoppingCart, Upload, X } from 'lucide-react';
import { apiFetch } from '@/lib/api';

type ActionKind = 'expense' | 'purchase_order' | 'vendor';
type DraftReady = (kind: ActionKind, file: File, data: Record<string, any>, warning?: string | null) => void;

const schemas: Record<ActionKind, Record<string, any>> = {
  expense: {
    type: 'object', additionalProperties: false,
    properties: {
      pay_to_name: { type: 'string', description: 'Supplier or payee business name.' },
      pay_to_phone: { type: 'string' },
      bank_account_details: { type: 'string' },
      payment_method: { type: 'string', description: 'Use BANK_TRANSFER, MOBILE_MONEY, or CASH when stated.' },
      expense_date: { type: 'string', description: 'Date in YYYY-MM-DD when stated.' },
      total_cost: { type: 'number', description: 'Invoice total payable. Use 0 if it is not clear.' },
      items: {
        type: 'array', items: {
          type: 'object', additionalProperties: false,
          properties: {
            name: { type: 'string' }, description: { type: 'string' },
            quantity: { type: 'number' }, unit_cost: { type: 'number' },
          },
          required: ['name', 'description', 'quantity', 'unit_cost'],
        },
      },
    },
    required: ['pay_to_name', 'pay_to_phone', 'bank_account_details', 'payment_method', 'expense_date', 'total_cost', 'items'],
  },
  purchase_order: {
    type: 'object', additionalProperties: false,
    properties: {
      supplier_name: { type: 'string' }, currency: { type: 'string' },
      category: { type: 'string' }, notes: { type: 'string' },
      items: {
        type: 'array', items: {
          type: 'object', additionalProperties: false,
          properties: {
            item_name: { type: 'string' }, description: { type: 'string' },
            quantity_ordered: { type: 'number' }, unit_price: { type: 'number' },
          },
          required: ['item_name', 'description', 'quantity_ordered', 'unit_price'],
        },
      },
    },
    required: ['supplier_name', 'currency', 'category', 'notes', 'items'],
  },
  vendor: {
    type: 'object', additionalProperties: false,
    properties: {
      name: { type: 'string', description: 'Business or supplier name.' },
      supplier_number: { type: 'string' }, bank_account_type: { type: 'string' },
      payment_method: { type: 'string' }, bank_account_details: { type: 'string' },
    },
    required: ['name', 'supplier_number', 'bank_account_type', 'payment_method', 'bank_account_details'],
  },
};

const actions: { kind: ActionKind; title: string; description: string; icon: typeof FileText }[] = [
  { kind: 'expense', title: 'Create expense', description: 'Read an invoice and prepare an expense claim for Finance.', icon: FileText },
  { kind: 'purchase_order', title: 'Create purchase order', description: 'Read a quotation or request document and prepare a purchase order.', icon: ShoppingCart },
  { kind: 'vendor', title: 'Create vendor', description: 'Read a supplier document and prepare a vendor profile.', icon: Building2 },
];

export default function FinanceCommandCenterModal({ onClose, onDraftReady }: { onClose: () => void; onDraftReady: DraftReady }) {
  const [kind, setKind] = useState<ActionKind | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  async function processDocument(upload: File) {
    if (!kind) return;
    setFile(upload);
    setBusy(true);
    setError('');
    try {
      const form = new FormData();
      form.append('file', upload);
      form.append('json_schema', JSON.stringify(schemas[kind]));
      const result = await apiFetch<any>('/api/v1/utils/extract-schema', { method: 'POST', body: form });
      onDraftReady(kind, upload, result?.data || {}, result?.warning || null);
    } catch (exception) {
      setError(exception instanceof Error ? exception.message : 'Could not read this document. You can continue and enter everything manually.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="fixed inset-0 z-[10020] flex items-center justify-center bg-slate-950/70 p-2 backdrop-blur-sm sm:p-6" onMouseDown={(event) => { if (event.target === event.currentTarget && !busy) onClose(); }}>
      <section role="dialog" aria-modal="true" aria-labelledby="finance-command-title" className="flex h-[min(92dvh,900px)] w-full max-w-5xl flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl dark:border-slate-700 dark:bg-slate-900">
        <header className="flex shrink-0 items-center justify-between bg-[#173F73] px-5 py-4 text-white sm:px-7">
          <div className="flex items-center gap-3">
            {kind && <button type="button" onClick={() => { if (!busy) { setKind(null); setFile(null); setError(''); } }} disabled={busy} aria-label="Back to actions" className="rounded-lg p-2 hover:bg-white/10 disabled:opacity-50"><ArrowLeft size={18} /></button>}
            <div><p className="text-[10px] font-bold uppercase tracking-[.16em] text-blue-100">Finance portal</p><h2 id="finance-command-title" className="mt-0.5 text-lg font-black sm:text-xl">Command center</h2></div>
          </div>
          <button type="button" onClick={onClose} disabled={busy} aria-label="Close command center" className="rounded-full p-2 hover:bg-white/10 disabled:opacity-50"><X size={20} /></button>
        </header>

        {!kind ? (
          <div className="flex-1 overflow-y-auto p-5 sm:p-8">
            <div className="mx-auto max-w-3xl">
              <h3 className="text-xl font-black text-slate-900 dark:text-white">What would you like to create?</h3>
              <p className="mt-1 text-sm text-slate-500">Start with the source document. We’ll prepare a draft form for you to review and edit before saving.</p>
              <div className="mt-7 grid gap-4 md:grid-cols-3">
                {actions.map(({ kind: actionKind, title, description, icon: Icon }) => (
                  <button key={actionKind} type="button" onClick={() => setKind(actionKind)} className="group min-h-48 rounded-2xl border border-slate-200 bg-white p-5 text-left transition hover:-translate-y-0.5 hover:border-violet-400 hover:shadow-lg dark:border-slate-700 dark:bg-slate-800/70 dark:hover:border-violet-500">
                    <span className="inline-flex h-11 w-11 items-center justify-center rounded-xl bg-violet-50 text-violet-700 group-hover:bg-violet-600 group-hover:text-white dark:bg-violet-950/60 dark:text-violet-300"><Icon size={20} /></span>
                    <span className="mt-5 block text-sm font-extrabold text-slate-900 dark:text-white">{title}</span>
                    <span className="mt-1.5 block text-xs leading-relaxed text-slate-500 dark:text-slate-400">{description}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        ) : (
          <div className="flex flex-1 items-center justify-center overflow-y-auto p-5 sm:p-10">
            <div className="w-full max-w-2xl rounded-2xl border border-slate-200 bg-slate-50 p-5 sm:p-8 dark:border-slate-700 dark:bg-slate-800/50">
              <div className="flex items-center gap-3">
                {(() => { const action = actions.find((item) => item.kind === kind)!; const Icon = action.icon; return <span className="inline-flex h-12 w-12 items-center justify-center rounded-xl bg-violet-100 text-violet-700 dark:bg-violet-950 dark:text-violet-300"><Icon size={22} /></span>; })()}
                <div><h3 className="font-extrabold text-slate-900 dark:text-white">{actions.find((item) => item.kind === kind)?.title}</h3><p className="text-xs text-slate-500">Upload a source document to prepare the form.</p></div>
              </div>
              <div className="mt-6 rounded-xl border-2 border-dashed border-slate-300 bg-white p-7 text-center dark:border-slate-600 dark:bg-slate-900 sm:p-10">
                {busy ? (
                  <><Loader2 className="mx-auto h-10 w-10 animate-spin text-violet-600" /><p className="mt-4 font-bold text-slate-800 dark:text-slate-100">Reading document and preparing a draft…</p><p className="mt-1 text-xs text-slate-500">This can take a few moments. The extracted values will remain editable.</p></>
                ) : (
                  <>
                    <Upload className="mx-auto h-10 w-10 text-violet-600" />
                    <p className="mt-4 font-bold text-slate-800 dark:text-slate-100">Choose an invoice, quotation, or supporting file</p>
                    <p className="mt-1 text-xs text-slate-500">PDF, image, spreadsheet, or document · up to 10 MB</p>
                    <label className="mt-5 inline-flex cursor-pointer items-center gap-2 rounded-xl bg-violet-600 px-5 py-3 text-sm font-bold text-white transition hover:bg-violet-700">
                      <Upload size={16} /> Select document
                      <input type="file" className="sr-only" accept=".pdf,.png,.jpg,.jpeg,.tif,.tiff,.bmp,.webp,.docx,.xls,.xlsx,.pptx,.txt,.csv,.rtf" onChange={(event) => { const upload = event.target.files?.[0]; if (upload) void processDocument(upload); event.currentTarget.value = ''; }} />
                    </label>
                  </>
                )}
              </div>
              {file && <p className="mt-3 truncate text-xs text-slate-500">Selected: <span className="font-semibold text-slate-700 dark:text-slate-200">{file.name}</span></p>}
              {error && <div role="alert" className="mt-4 rounded-xl border border-amber-300 bg-amber-50 p-4 text-sm text-amber-950 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-100"><p className="font-bold">Couldn’t prepare the draft</p><p className="mt-1 text-xs leading-relaxed">{error}</p><button type="button" onClick={() => file && onDraftReady(kind, file, {}, error)} className="mt-3 rounded-lg bg-amber-700 px-3 py-2 text-xs font-bold text-white hover:bg-amber-800">Continue with a blank form</button></div>}
              <p className="mt-4 text-[11px] leading-relaxed text-slate-500">Extraction is only a starting point. Review every value in the editable form before saving. Expense invoices and purchase order quotations are saved with their records.</p>
            </div>
          </div>
        )}
      </section>
    </div>
  );
}
