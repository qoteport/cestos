'use client';

import { Modal } from './DataUI';
import { Pencil, Printer } from 'lucide-react';
import { printElement } from '@/lib/printElement';

export default function TrackerDetailsModal({ title, fields, onClose, onEdit, readOnly }: {
  title: string; fields: Array<[string, unknown]>; onClose: () => void; onEdit?: () => void; readOnly?: boolean;
}) {
  function print() {
    const element = document.querySelector<HTMLElement>('[data-tracker-details]');
    if (element) printElement(element, title);
  }
  return <Modal title={title} onClose={onClose} className="sm:!h-[90vh] sm:!max-h-[90vh] sm:!max-w-5xl" footer={<div className="flex w-full justify-end gap-2"><button type="button" className="btn-secondary inline-flex items-center gap-2" onClick={print}><Printer size={15} /> Print</button>{!readOnly && onEdit && <button type="button" className="btn-primary inline-flex items-center gap-2" onClick={onEdit}><Pencil size={15} /> Edit</button>}</div>}>
    <article data-tracker-details className="space-y-5 text-sm"><section className="overflow-hidden border border-slate-900 bg-white dark:bg-slate-950"><h3 className="bg-[#184877] px-3 py-2 text-center text-xs font-bold uppercase tracking-wide text-white">Record details</h3><div className="grid grid-cols-1 border-l border-t border-slate-900 sm:grid-cols-2">{fields.map(([label, value]) => <div key={label} className="min-w-0 border-b border-r border-slate-900 bg-white dark:bg-slate-950"><div className="bg-[#dbe7f4] px-2 py-1 text-[10px] font-bold uppercase tracking-wide text-slate-800">{label}</div><div className="min-h-12 whitespace-pre-wrap break-words px-3 py-2 text-sm font-medium text-slate-900 dark:text-white">{value == null || value === '' ? '—' : String(value)}</div></div>)}</div></section></article>
  </Modal>;
}

