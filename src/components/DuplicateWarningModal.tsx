'use client';

import React from 'react';
import { createPortal } from 'react-dom';
import { AlertTriangle, X, Check, ArrowRight, Layers, DollarSign, Calendar, Building2, User } from 'lucide-react';

export interface DuplicateRecordItem {
  name: string;
  quantity?: number | string;
  unit_price?: number | string;
  unit_cost?: number | string;
  description?: string;
}

export interface DuplicateRecordData {
  id?: string;
  reference?: string;
  vendor: string;
  date: string;
  total: number;
  currency?: string;
  status?: string;
  created_by?: string;
  items?: DuplicateRecordItem[];
  notes?: string;
}

export interface DuplicateWarningModalProps {
  isOpen: boolean;
  entityType: 'Operational Expense' | 'Purchase Order';
  currentRecord: DuplicateRecordData;
  duplicateRecord: DuplicateRecordData | null;
  onSaveAnyway: () => void;
  onDiscard: () => void;
}

export function checkLineItemsMatch(itemsA?: DuplicateRecordItem[], itemsB?: DuplicateRecordItem[]): boolean {
  if (!itemsA?.length || !itemsB?.length) return false;
  const normA = itemsA
    .map((it) => ({
      name: String(it.name || it.description || '').trim().toLowerCase(),
      qty: Number(it.quantity || 0),
    }))
    .filter((it) => it.name);

  const normB = itemsB
    .map((it) => ({
      name: String(it.name || it.description || '').trim().toLowerCase(),
      qty: Number(it.quantity || 0),
    }))
    .filter((it) => it.name);

  if (normA.length === 0 || normB.length === 0) return false;

  let matched = 0;
  for (const a of normA) {
    if (normB.some((b) => b.name === a.name && (Math.abs(b.qty - a.qty) < 0.01 || b.qty === 0 || a.qty === 0))) {
      matched++;
    }
  }
  return matched >= Math.min(normA.length, normB.length) / 2;
}

export default function DuplicateWarningModal({
  isOpen,
  entityType,
  currentRecord,
  duplicateRecord,
  onSaveAnyway,
  onDiscard,
}: DuplicateWarningModalProps) {
  if (!isOpen || !duplicateRecord) return null;

  const currency = currentRecord.currency || duplicateRecord.currency || 'USD';
  const hasLineItemsMatch = checkLineItemsMatch(currentRecord.items, duplicateRecord.items);

  const formatCurrency = (val: number) =>
    `${currency} ${Number(val || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

  const modalContent = (
    <div className="fixed inset-0 z-[100005] flex items-center justify-center bg-black/75 backdrop-blur-xs p-2 sm:p-4 overflow-hidden animate-modal-backdrop-in">
      <div
        role="dialog"
        aria-modal="true"
        aria-label={`Potential Duplicate ${entityType}`}
        className="w-full h-full sm:h-auto sm:max-h-[92vh] max-w-full sm:max-w-4xl rounded-none sm:rounded-2xl border-0 sm:border border-amber-200 dark:border-amber-900/60 bg-white dark:bg-slate-900 shadow-2xl flex flex-col overflow-hidden animate-modal-content-in"
      >
        {/* Header */}
        <div className="flex items-start justify-between border-b border-amber-100 dark:border-amber-950/80 px-4 py-3.5 sm:px-6 sm:py-4 bg-amber-50/70 dark:bg-amber-950/30 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/20 text-amber-600 dark:text-amber-400 border border-amber-300 dark:border-amber-700/60 flex items-center justify-center shrink-0">
              <AlertTriangle size={22} className="animate-pulse" />
            </div>
            <div>
              <h3 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                Potential Duplicate {entityType} Detected
              </h3>
              <p className="text-xs text-amber-800 dark:text-amber-300 mt-0.5">
                A matching record for this supplier was found on the same date with an identical total amount.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onDiscard}
            className="p-1.5 rounded-full hover:bg-slate-200/60 dark:hover:bg-slate-800 text-slate-500 hover:text-slate-900 dark:hover:text-white transition"
            title="Cancel and review"
          >
            <X size={20} />
          </button>
        </div>

        {/* Match badges summary */}
        <div className="px-4 sm:px-6 py-2.5 bg-amber-100/40 dark:bg-amber-950/40 border-b border-amber-100 dark:border-amber-900/40 flex flex-wrap items-center gap-2 text-xs">
          <span className="font-semibold text-slate-600 dark:text-slate-400 text-[11px] uppercase tracking-wider">Matching Criteria:</span>
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-amber-500/15 text-amber-800 dark:text-amber-300 font-medium">
            <Building2 size={12} /> Same Vendor ({currentRecord.vendor})
          </span>
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-amber-500/15 text-amber-800 dark:text-amber-300 font-medium">
            <Calendar size={12} /> Same Date ({currentRecord.date || 'Today'})
          </span>
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-amber-500/15 text-amber-800 dark:text-amber-300 font-medium">
            <DollarSign size={12} /> Same Total ({formatCurrency(currentRecord.total)})
          </span>
          {hasLineItemsMatch && (
            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-emerald-500/15 text-emerald-800 dark:text-emerald-300 font-medium">
              <Layers size={12} /> Matching Line Items
            </span>
          )}
        </div>

        {/* Side-by-side comparison body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
            {/* Left Card: Current Entry (Unsaved) */}
            <div className="rounded-xl border border-blue-200 dark:border-blue-900/50 bg-blue-50/30 dark:bg-blue-950/20 p-4 space-y-3.5 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between border-b border-blue-100 dark:border-blue-900/40 pb-2.5 mb-3">
                  <span className="text-xs font-bold uppercase tracking-wider text-blue-700 dark:text-blue-400">
                    Your Current Entry
                  </span>
                  <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-blue-100 text-blue-800 dark:bg-blue-900/60 dark:text-blue-200">
                    Pending Save
                  </span>
                </div>

                <div className="space-y-2.5 text-xs">
                  <div>
                    <span className="text-[10px] uppercase font-bold text-slate-400 block">Supplier / Payee</span>
                    <span className="font-semibold text-slate-900 dark:text-white text-sm">
                      {currentRecord.vendor || '—'}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <span className="text-[10px] uppercase font-bold text-slate-400 block">Date</span>
                      <span className="font-medium text-slate-800 dark:text-slate-200">
                        {currentRecord.date || 'Today'}
                      </span>
                    </div>
                    <div>
                      <span className="text-[10px] uppercase font-bold text-slate-400 block">Total Amount</span>
                      <span className="font-bold text-emerald-600 dark:text-emerald-400 text-sm">
                        {formatCurrency(currentRecord.total)}
                      </span>
                    </div>
                  </div>

                  {currentRecord.items && currentRecord.items.length > 0 && (
                    <div className="pt-2">
                      <span className="text-[10px] uppercase font-bold text-slate-400 block mb-1">
                        Line Items ({currentRecord.items.length})
                      </span>
                      <div className="max-h-36 overflow-y-auto rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-2 space-y-1.5">
                        {currentRecord.items.map((item, idx) => (
                          <div key={idx} className="flex items-center justify-between text-[11px] border-b last:border-b-0 pb-1 last:pb-0 border-slate-100 dark:border-slate-800">
                            <span className="font-medium truncate max-w-[180px]">{item.name || item.description || 'Item'}</span>
                            <span className="text-slate-500 font-mono">
                              {item.quantity} × {currency} {Number(item.unit_price ?? item.unit_cost ?? 0).toFixed(2)}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {currentRecord.notes && (
                    <div className="pt-1">
                      <span className="text-[10px] uppercase font-bold text-slate-400 block">Notes</span>
                      <span className="text-slate-600 dark:text-slate-300 italic truncate block">
                        {currentRecord.notes}
                      </span>
                    </div>
                  )}
                </div>
              </div>

              <div className="pt-2 border-t border-blue-100 dark:border-blue-900/40 text-[11px] text-blue-700 dark:text-blue-400 flex items-center gap-1 font-medium">
                <span>Not committed to the database yet.</span>
              </div>
            </div>

            {/* Right Card: Existing System Record */}
            <div className="rounded-xl border border-amber-300 dark:border-amber-800/60 bg-amber-50/40 dark:bg-amber-950/20 p-4 space-y-3.5 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between border-b border-amber-200 dark:border-amber-900/50 pb-2.5 mb-3">
                  <span className="text-xs font-bold uppercase tracking-wider text-amber-800 dark:text-amber-300">
                    Existing Record in System
                  </span>
                  <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-amber-200/70 text-amber-900 dark:bg-amber-900/60 dark:text-amber-200 font-mono">
                    {duplicateRecord.reference || duplicateRecord.id?.slice(0, 8) || 'Already Saved'}
                  </span>
                </div>

                <div className="space-y-2.5 text-xs">
                  <div>
                    <span className="text-[10px] uppercase font-bold text-slate-400 block">Supplier / Payee</span>
                    <span className="font-semibold text-slate-900 dark:text-white text-sm">
                      {duplicateRecord.vendor || '—'}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <span className="text-[10px] uppercase font-bold text-slate-400 block">Date</span>
                      <span className="font-medium text-slate-800 dark:text-slate-200">
                        {duplicateRecord.date?.slice(0, 10) || '—'}
                      </span>
                    </div>
                    <div>
                      <span className="text-[10px] uppercase font-bold text-slate-400 block">Total Amount</span>
                      <span className="font-bold text-emerald-600 dark:text-emerald-400 text-sm">
                        {formatCurrency(duplicateRecord.total)}
                      </span>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <span className="text-[10px] uppercase font-bold text-slate-400 block">Status</span>
                      <span className="font-semibold uppercase text-slate-700 dark:text-slate-300">
                        {duplicateRecord.status || 'SUBMITTED'}
                      </span>
                    </div>
                    {duplicateRecord.created_by && (
                      <div>
                        <span className="text-[10px] uppercase font-bold text-slate-400 block">Submitter</span>
                        <span className="font-medium text-slate-700 dark:text-slate-300 truncate block">
                          {duplicateRecord.created_by}
                        </span>
                      </div>
                    )}
                  </div>

                  {duplicateRecord.items && duplicateRecord.items.length > 0 && (
                    <div className="pt-2">
                      <span className="text-[10px] uppercase font-bold text-slate-400 block mb-1">
                        Line Items ({duplicateRecord.items.length})
                      </span>
                      <div className="max-h-36 overflow-y-auto rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-2 space-y-1.5">
                        {duplicateRecord.items.map((item, idx) => (
                          <div key={idx} className="flex items-center justify-between text-[11px] border-b last:border-b-0 pb-1 last:pb-0 border-slate-100 dark:border-slate-800">
                            <span className="font-medium truncate max-w-[180px]">{item.name || item.description || 'Item'}</span>
                            <span className="text-slate-500 font-mono">
                              {item.quantity || (item as any).quantity_ordered} × {currency} {Number(item.unit_price ?? item.unit_cost ?? 0).toFixed(2)}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {duplicateRecord.notes && (
                    <div className="pt-1">
                      <span className="text-[10px] uppercase font-bold text-slate-400 block">Notes</span>
                      <span className="text-slate-600 dark:text-slate-300 italic truncate block">
                        {duplicateRecord.notes}
                      </span>
                    </div>
                  )}
                </div>
              </div>

              <div className="pt-2 border-t border-amber-200 dark:border-amber-900/50 text-[11px] text-amber-800 dark:text-amber-300 flex items-center gap-1 font-medium">
                <span>Already recorded in the database.</span>
              </div>
            </div>
          </div>

          <div className="p-3 bg-slate-50 dark:bg-slate-800/40 rounded-xl border border-slate-200 dark:border-slate-800 text-xs text-slate-600 dark:text-slate-400 flex items-center justify-between">
            <span>
              If this was already entered previously, choose <strong>Discard</strong> to prevent creating a double record. If this is a separate, distinct expense or order, choose <strong>Save Anyway</strong>.
            </span>
          </div>
        </div>

        {/* Sticky Footer */}
        <div className="sticky bottom-0 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-t border-slate-200 dark:border-slate-800 p-3.5 sm:px-6 sm:py-4 shrink-0 flex flex-row items-center justify-end gap-2 sm:gap-3 z-10">
          <button
            type="button"
            onClick={onDiscard}
            className="rounded-xl border border-slate-300 dark:border-slate-700 px-4 py-2 text-xs sm:text-sm font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition flex items-center justify-center gap-1.5 w-full sm:w-auto"
          >
            <X size={15} /> Discard (Cancel Save)
          </button>
          <button
            type="button"
            onClick={onSaveAnyway}
            className="rounded-xl bg-amber-600 hover:bg-amber-700 text-white px-5 py-2 text-xs sm:text-sm font-bold shadow-md transition flex items-center justify-center gap-1.5 w-full sm:w-auto"
          >
            <Check size={16} strokeWidth={2.5} /> Save Anyway
          </button>
        </div>
      </div>
    </div>
  );

  return typeof document !== 'undefined' ? createPortal(modalContent, document.body) : null;
}
