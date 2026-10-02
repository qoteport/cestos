'use client';

import { Modal } from './DataUI';
import { useEffect, useState } from 'react';
import { Download, Eye, Pencil, Printer } from 'lucide-react';
import { apiFetch, apiFetchBlob, downloadBlob } from '@/lib/api';
import { openUniversalFileViewer } from '@/lib/fileViewer';
import { printElement } from '@/lib/printElement';

export default function TrackerDetailsModal({ title, fields, onClose, onEdit, readOnly, recordId, importSourceType }: {
  title: string; fields: Array<[string, unknown]>; onClose: () => void; onEdit?: () => void; readOnly?: boolean; recordId?: string; importSourceType?: string;
}) {
  const [attachments, setAttachments] = useState<any[]>([]);
  useEffect(() => {
    if (!recordId || !importSourceType) return;
    let active = true;
    apiFetch<any>(`/api/v1/documents?view=all&page_size=20&source_type=${importSourceType}&source_id=${encodeURIComponent(recordId)}`)
      .then((result) => { if (active) setAttachments(Array.isArray(result) ? result : result?.items || []); })
      .catch(() => { if (active) setAttachments([]); });
    return () => { active = false; };
  }, [recordId, importSourceType]);
  async function openAttachment(file: any, download = false) {
    const blob = await apiFetchBlob(`/api/v1/documents/${file.id}/${download ? 'download' : 'view?disposition=inline'}`);
    const name = file.file_name || file.title || 'maintenance-import.csv';
    if (download) downloadBlob(blob, name); else openUniversalFileViewer({ blob, fileName: name, title: 'Imported maintenance source file' });
  }
  function print() {
    const element = document.querySelector<HTMLElement>('[data-tracker-details]');
    if (element) printElement(element, title);
  }
  return <Modal title={title} onClose={onClose} className="sm:!h-[90vh] sm:!max-h-[90vh] sm:!max-w-5xl" footer={<div className="flex w-full justify-end gap-2"><button type="button" className="btn-secondary rounded-xl inline-flex items-center gap-2" onClick={print}><Printer size={15} /> Print</button>{!readOnly && onEdit && <button type="button" className="btn-primary rounded-xl inline-flex items-center gap-2" onClick={onEdit}><Pencil size={15} /> Edit</button>}</div>}>
    <article data-tracker-details className="space-y-5 text-sm print:text-black"><section className="overflow-hidden border border-slate-900 rounded-none print:rounded-none bg-white dark:bg-slate-950"><h3 className="bg-[#184877] px-3 py-2 text-center text-xs font-bold uppercase tracking-wide text-white">Record details</h3><div className="grid grid-cols-1 border-l border-t border-slate-900 sm:grid-cols-2">{fields.map(([label, value]) => <div key={label} className="min-w-0 border-b border-r border-slate-900 bg-white dark:bg-slate-950"><div className="bg-[#dbe7f4] px-2 py-1 text-[10px] font-bold uppercase tracking-wide text-slate-800">{label}</div><div className="min-h-12 whitespace-pre-wrap break-words px-3 py-2 text-sm font-medium text-slate-900 dark:text-white">{value == null || value === '' ? '—' : String(value)}</div></div>)}</div></section>{attachments.length > 0 && <section className="border border-slate-300 bg-white dark:bg-slate-950"><h3 className="bg-[#184877] px-3 py-2 text-xs font-bold uppercase tracking-wide text-white">Imported source file</h3><div className="space-y-2 p-3">{attachments.map((file) => <div key={file.id} className="flex flex-wrap items-center justify-between gap-2 text-xs"><span className="truncate font-semibold text-slate-700 dark:text-slate-200">{file.file_name || file.title}</span><div className="flex gap-2"><button type="button" className="btn-secondary rounded-lg inline-flex items-center gap-1" onClick={() => void openAttachment(file)}><Eye size={13} /> View</button><button type="button" className="btn-secondary rounded-lg inline-flex items-center gap-1" onClick={() => void openAttachment(file, true)}><Download size={13} /> Download</button></div></div>)}</div></section>}</article>
  </Modal>;
}
