'use client';

import { useState } from 'react';
import { ArrowLeft, ArrowRight, Building2, FileText, Loader2, ShoppingCart, Upload, X, Zap, Sparkles, CheckCircle2, AlertTriangle } from 'lucide-react';
import { apiFetch } from '@/lib/api';

type ActionKind = 'expense' | 'purchase_order' | 'vendor';
type DraftReady = (kind: ActionKind, file: File, data: Record<string, any>, warning?: string | null) => void;

const schemas: Record<ActionKind, Record<string, any>> = {
  expense: {
    type: 'object',
    additionalProperties: false,
    properties: {
      pay_to_name: { type: 'string', description: 'Supplier or payee business name.' },
      pay_to_phone: { type: 'string' },
      bank_account_details: { type: 'string' },
      payment_method: { type: 'string', description: 'Use BANK_TRANSFER, MOBILE_MONEY, or CASH when stated.' },
      expense_date: { type: 'string', description: 'Date in YYYY-MM-DD when stated.' },
      total_cost: { type: 'number', description: 'Invoice total payable. Use 0 if it is not clear.' },
      items: {
        type: 'array',
        items: {
          type: 'object',
          additionalProperties: false,
          properties: {
            name: { type: 'string' },
            description: { type: 'string' },
            quantity: { type: 'number' },
            unit_cost: { type: 'number' },
          },
          required: ['name', 'description', 'quantity', 'unit_cost'],
        },
      },
    },
    required: ['pay_to_name', 'pay_to_phone', 'bank_account_details', 'payment_method', 'expense_date', 'total_cost', 'items'],
  },
  purchase_order: {
    type: 'object',
    additionalProperties: false,
    properties: {
      supplier_name: { type: 'string' },
      currency: { type: 'string' },
      category: { type: 'string' },
      notes: { type: 'string' },
      items: {
        type: 'array',
        items: {
          type: 'object',
          additionalProperties: false,
          properties: {
            item_name: { type: 'string' },
            description: { type: 'string' },
            quantity_ordered: { type: 'number' },
            unit_price: { type: 'number' },
          },
          required: ['item_name', 'description', 'quantity_ordered', 'unit_price'],
        },
      },
    },
    required: ['supplier_name', 'currency', 'category', 'notes', 'items'],
  },
  vendor: {
    type: 'object',
    additionalProperties: false,
    properties: {
      name: { type: 'string', description: 'Business or supplier name.' },
      supplier_number: { type: 'string' },
      bank_account_type: { type: 'string' },
      payment_method: { type: 'string' },
      bank_account_details: { type: 'string' },
    },
    required: ['name', 'supplier_number', 'bank_account_type', 'payment_method', 'bank_account_details'],
  },
};

const actions: { kind: ActionKind; title: string; description: string; icon: typeof FileText; badge: string }[] = [
  {
    kind: 'expense',
    title: 'Create Expense Claim',
    description: 'Upload an invoice or receipt to auto-extract line items and prepare an expense voucher for Finance.',
    icon: FileText,
    badge: 'Expense Voucher',
  },
  {
    kind: 'purchase_order',
    title: 'Create Purchase Order',
    description: 'Upload a quotation or request document to prepare a draft PO with supplier items and pricing.',
    icon: ShoppingCart,
    badge: 'Purchase Order',
  },
  {
    kind: 'vendor',
    title: 'Create Vendor Profile',
    description: 'Upload a supplier profile or tax invoice to register vendor contact and bank payment details.',
    icon: Building2,
    badge: 'Vendor Master',
  },
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
    <div
      className="fixed inset-0 z-[10020] flex items-center justify-center bg-black/70 p-2 backdrop-blur-xs sm:p-6"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget && !busy) onClose();
      }}
    >
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="finance-command-title"
        className="flex h-[min(92dvh,880px)] w-full max-w-5xl flex-col overflow-hidden rounded-2xl border border-slate-200 bg-card shadow-2xl dark:border-slate-800"
      >
        {/* Plain Clean Popup Header */}
        <header className="flex shrink-0 items-center justify-between border-b border-border bg-card px-4 py-3.5 sm:px-6 sm:py-4 sticky top-0 z-10">
          <div className="flex items-center gap-3">
            {kind && (
              <button
                type="button"
                onClick={() => {
                  if (!busy) {
                    setKind(null);
                    setFile(null);
                    setError('');
                  }
                }}
                disabled={busy}
                aria-label="Back to actions"
                className="rounded-lg p-1.5 hover:bg-muted text-muted-foreground transition disabled:opacity-50"
              >
                <ArrowLeft size={18} />
              </button>
            )}
            <div className="w-9 h-9 rounded-xl bg-violet-100 dark:bg-violet-950/60 text-violet-600 dark:text-violet-400 flex items-center justify-center shrink-0">
              <Zap size={20} className="fill-amber-500 text-amber-500" />
            </div>
            <div>
              <h2 id="finance-command-title" className="font-bold text-base sm:text-lg text-foreground flex items-center gap-2">
                Finance Command Center
              </h2>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={busy}
            aria-label="Close command center"
            className="rounded-full p-1.5 hover:bg-muted text-muted-foreground transition disabled:opacity-50"
          >
            <X size={18} />
          </button>
        </header>

        {!kind ? (
          <div className="flex-1 overflow-y-auto p-5 sm:p-8 bg-slate-50/50 dark:bg-slate-950/40">
            <div className="mx-auto max-w-4xl">
              {/* Header Badge & Title */}
              <div className="text-center sm:text-left mb-6">
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-violet-100 dark:bg-violet-950/60 text-violet-700 dark:text-violet-300 text-xs font-extrabold uppercase tracking-wider mb-2 border border-violet-200 dark:border-violet-800">
                  <Zap size={13} className="fill-amber-500 text-amber-500" /> Smart Document Assistant
                </span>
                <h3 className="text-2xl font-black text-foreground tracking-tight">What would you like to create?</h3>
                <p className="mt-1 text-sm text-muted-foreground max-w-2xl">
                  Start with the source document. We’ll prepare a draft form for you to review and edit before saving.
                </p>
              </div>

              {/* 3 Action Cards */}
              <div className="mt-6 grid gap-5 md:grid-cols-3">
                {actions.map(({ kind: actionKind, title, description, icon: Icon, badge }) => (
                  <button
                    key={actionKind}
                    type="button"
                    onClick={() => setKind(actionKind)}
                    className="group relative flex flex-col justify-between rounded-2xl border border-slate-200 dark:border-slate-800 bg-card p-6 text-left transition-all duration-200 hover:-translate-y-1 hover:border-violet-500 dark:hover:border-violet-500 hover:shadow-xl dark:bg-slate-900/80"
                  >
                    <div>
                      <div className="flex items-center justify-between mb-4">
                        <span className="inline-flex h-12 w-12 items-center justify-center rounded-xl bg-violet-100 text-violet-700 group-hover:bg-violet-600 group-hover:text-white dark:bg-violet-950/80 dark:text-violet-300 transition-colors shadow-xs">
                          <Icon size={22} />
                        </span>
                        <span className="text-[10px] font-extrabold uppercase tracking-wider px-2.5 py-1 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                          {badge}
                        </span>
                      </div>
                      <span className="block text-base font-extrabold text-foreground group-hover:text-violet-600 dark:group-hover:text-violet-400 transition-colors">
                        {title}
                      </span>
                      <span className="mt-2 block text-xs leading-relaxed text-muted-foreground">{description}</span>
                    </div>

                    <div className="mt-6 pt-3 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between text-xs font-bold text-violet-600 dark:text-violet-400 group-hover:translate-x-0.5 transition-transform">
                      <span className="flex items-center gap-1">
                        <Zap size={12} className="fill-amber-500 text-amber-500" /> Start Document Extraction
                      </span>
                      <ArrowRight size={14} />
                    </div>
                  </button>
                ))}
              </div>
            </div>
          </div>
        ) : (
          <div className="flex flex-1 items-center justify-center overflow-y-auto p-5 sm:p-10 bg-slate-50/50 dark:bg-slate-950/40">
            <div className="w-full max-w-2xl rounded-2xl border border-slate-200 dark:border-slate-800 bg-card p-6 sm:p-8 shadow-lg dark:bg-slate-900/90">
              <div className="flex items-center gap-3.5 pb-5 border-b border-border">
                {(() => {
                  const action = actions.find((item) => item.kind === kind)!;
                  const Icon = action.icon;
                  return (
                    <span className="inline-flex h-12 w-12 items-center justify-center rounded-xl bg-violet-100 text-violet-700 dark:bg-violet-950 dark:text-violet-300 shadow-xs shrink-0">
                      <Icon size={24} />
                    </span>
                  );
                })()}
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-extrabold text-lg text-foreground">{actions.find((item) => item.kind === kind)?.title}</h3>
                    <span className="inline-flex items-center gap-1 text-[10px] font-extrabold px-2 py-0.5 rounded-md bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300">
                      <Zap size={11} className="fill-amber-500 text-amber-500" /> Auto-Extract
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5">Upload a source document to prepare the draft form automatically.</p>
                </div>
              </div>

              {/* Upload Dropzone */}
              <div className="mt-6 rounded-2xl border-2 border-dashed border-violet-200 dark:border-violet-900/60 bg-violet-50/40 dark:bg-violet-950/20 p-8 text-center transition-colors">
                {busy ? (
                  <div className="py-4">
                    <div className="relative inline-flex items-center justify-center mb-3">
                      <Loader2 className="h-12 w-12 animate-spin text-violet-600" />
                      <Zap size={18} className="absolute fill-amber-500 text-amber-500 animate-pulse" />
                    </div>
                    <p className="font-bold text-foreground text-base">Reading document & parsing fields…</p>
                    <p className="mt-1 text-xs text-muted-foreground max-w-sm mx-auto">
                      Analyzing text structure and populating values. All extracted fields will remain fully editable in the draft form.
                    </p>
                  </div>
                ) : (
                  <>
                    <div className="w-14 h-14 mx-auto rounded-2xl bg-white dark:bg-slate-800 text-violet-600 dark:text-violet-400 flex items-center justify-center shadow-md border border-violet-100 dark:border-violet-900/40 mb-4">
                      <Upload size={26} />
                    </div>
                    <p className="font-extrabold text-foreground text-base">Choose an invoice, quotation, or supporting document</p>
                    <p className="mt-1 text-xs text-muted-foreground">PDF, image, spreadsheet, or document · up to 10 MB</p>
                    <label className="mt-6 inline-flex cursor-pointer items-center gap-2 rounded-xl bg-violet-600 hover:bg-violet-700 px-6 py-3 text-sm font-bold text-white shadow-md transition-transform active:scale-95">
                      <Zap size={16} className="fill-amber-300 text-amber-300" /> Select Document
                      <input
                        type="file"
                        className="sr-only"
                        accept=".pdf,.png,.jpg,.jpeg,.tif,.tiff,.bmp,.webp,.docx,.xls,.xlsx,.pptx,.txt,.csv,.rtf"
                        onChange={(event) => {
                          const upload = event.target.files?.[0];
                          if (upload) void processDocument(upload);
                          event.currentTarget.value = '';
                        }}
                      />
                    </label>
                  </>
                )}
              </div>

              {file && (
                <div className="mt-4 p-3 rounded-xl bg-slate-100 dark:bg-slate-800 flex items-center gap-2 text-xs text-muted-foreground">
                  <CheckCircle2 size={16} className="text-emerald-500 shrink-0" />
                  <span className="truncate">
                    Selected file: <strong className="text-foreground">{file.name}</strong>
                  </span>
                </div>
              )}

              {error && (
                <div
                  role="alert"
                  className="mt-4 rounded-xl border border-amber-300 bg-amber-50 p-4 text-sm text-amber-950 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-100"
                >
                  <p className="font-bold flex items-center gap-1.5">
                    <AlertTriangle size={16} className="text-amber-600 shrink-0" /> Couldn’t prepare the draft automatically
                  </p>
                  <p className="mt-1 text-xs leading-relaxed">{error}</p>
                  <button
                    type="button"
                    onClick={() => file && onDraftReady(kind, file, {}, error)}
                    className="mt-3 rounded-xl bg-amber-700 px-4 py-2 text-xs font-bold text-white hover:bg-amber-800 transition"
                  >
                    Continue with a blank form
                  </button>
                </div>
              )}

              <p className="mt-5 text-[11px] leading-relaxed text-muted-foreground border-t border-border pt-4">
                Extraction is only a starting point. Review every value in the editable form before saving. Expense invoices and purchase order quotations are attached directly to their respective records.
              </p>
            </div>
          </div>
        )}
      </section>
    </div>
  );
}
