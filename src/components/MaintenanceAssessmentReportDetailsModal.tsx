'use client';

import { useEffect, useState } from 'react';
import { Modal } from './DataUI';
import { Printer, Pencil, Paperclip, Eye, Download } from 'lucide-react';
import { apiFetch, apiFetchBlob, downloadBlob } from '@/lib/api';
import { openUniversalFileViewer } from '@/lib/fileViewer';
import { printElement } from '@/lib/printElement';

const sections: Array<{ key: string; title: string; columns: Array<[string, string]> }> = [
  { key: 'equipment_fleet', title: 'Equipment Fleet', columns: [['equipment', 'Equipment'], ['quantity', 'Quantity'], ['maintenance_focus', 'Maintenance focus'], ['current_approach', 'Current approach']] },
  { key: 'maintenance_assessment', title: 'Maintenance Assessment & Corrective Action', columns: [['area_equipment', 'Area / equipment'], ['observation_failure', 'Observation / failure'], ['action_taken_response', 'Action taken / response'], ['current_status', 'Current status'], ['priority', 'Priority']] },
  { key: 'preventive_improvements', title: 'Preventive Maintenance Improvement', columns: [['pm_control', 'PM control'], ['purpose', 'Purpose'], ['status', 'Status']] },
  { key: 'spare_parts_actions', title: 'Spare Parts & Materials', columns: [['action', 'Action'], ['purpose', 'Purpose'], ['priority', 'Priority'], ['status', 'Status']] },
  { key: 'manpower_requirements', title: 'Manpower Requirement', columns: [['role', 'Role / position'], ['site', 'Site / project'], ['justification', 'Justification'], ['priority', 'Priority'], ['status', 'Status']] },
  { key: 'control_documents', title: 'Maintenance Control & Documentation', columns: [['control_document', 'Control document'], ['purpose', 'Purpose'], ['implementation', 'Implementation']] },
  { key: 'action_plan', title: 'Initial Action Plan', columns: [['action', 'Action'], ['priority', 'Priority'], ['target', 'Target'], ['status', 'Status']] },
  { key: 'maintenance_kpis', title: 'Maintenance KPIs', columns: [['kpi', 'KPI'], ['purpose', 'Purpose'], ['frequency', 'Frequency']] },
];

function DisplayValue({ value }: { value: unknown }) {
  if (value === null || value === undefined || value === '') return <>—</>;
  return <span className="whitespace-pre-wrap break-words">{String(value)}</span>;
}

export default function MaintenanceAssessmentReportDetailsModal({
  record, onClose, onEdit, editable, projects = [],
}: { record: any; onClose: () => void; onEdit: () => void; editable: boolean; projects?: any[] }) {
  const [attachments, setAttachments] = useState<any[]>([]);
  const [attachmentsLoading, setAttachmentsLoading] = useState(true);
  const [fileBusy, setFileBusy] = useState<string | null>(null);
  const [fileError, setFileError] = useState('');
  const reportDate = (value?: string) => value ? new Date(`${value.slice(0, 10)}T00:00:00`).toLocaleDateString() : '—';
  const printable = () => {
    const content = document.getElementById('maint-assessment-printable-area');
    if (content) printElement(content, record.report_number || 'Two-week Maintenance Assessment & Initial Action Report');
  };

  useEffect(() => {
    let active = true;
    setAttachmentsLoading(true);
    apiFetch<any>(`/api/v1/documents?view=all&page_size=100&source_type=maintenance_assessment&source_id=${encodeURIComponent(record.id)}`)
      .then((result) => { if (active) setAttachments(Array.isArray(result) ? result : result?.items || []); })
      .catch(() => { if (active) setAttachments([]); })
      .finally(() => { if (active) setAttachmentsLoading(false); });
    return () => { active = false; };
  }, [record.id]);

  async function openAttachment(file: any, download = false) {
    setFileBusy(file.id); setFileError('');
    try {
      const blob = await apiFetchBlob(`/api/v1/documents/${file.id}/${download ? 'download' : 'view?disposition=inline'}`);
      const name = file.file_name || file.title || 'maintenance-assessment-attachment';
      if (download) downloadBlob(blob, name);
      else openUniversalFileViewer({ blob, fileName: name, title: 'Maintenance assessment attachment' });
    } catch (error: any) { setFileError(error?.message || 'Could not open the attached file.'); }
    finally { setFileBusy(null); }
  }

  return <Modal title="Two-week Maintenance Assessment & Initial Action Report" onClose={onClose} className="sm:!h-[90vh] sm:!max-h-[90vh] sm:!max-w-5xl text-upper" footer={<div className="flex w-full justify-end gap-2"><button type="button" className="btn-secondary inline-flex items-center gap-2" onClick={printable}><Printer size={15} /> Print</button>{editable && <button type="button" className="btn-primary inline-flex items-center gap-2" onClick={onEdit}><Pencil size={15} /> Edit report</button>}</div>}>
    <article id="maint-assessment-printable-area" className="space-y-5 text-sm print:text-black">
      <header className="border-b border-slate-300 pb-3">

        {record.report_number && <p className="text-xs font-semibold text-slate-500">{record.report_number}</p>}
      </header>
      <section className="grid gap-px border border-slate-300 bg-slate-300 sm:grid-cols-2 lg:grid-cols-4">
        {[
          ['Report date', reportDate(record.report_date)],
          ['Reporting period', `${reportDate(record.reporting_period_start)} – ${reportDate(record.reporting_period_end)}`],
          ['Project', record.project_name_custom || record.project?.name || projects.find((item) => String(item.id) === String(record.project_id))?.name || '—'],
          ['Prepared by', record.prepared_by_name], ['Position', record.prepared_by_position], ['Submitted to', record.submitted_to], ['', ' '], [' ', ' '],
        ].map(([label, value]) => <div key={label} className="bg-white px-3 py-2"><div className="text-[10px] font-bold text-slate-500">{label}</div><div className="mt-1 font-semibold text-slate-900">{value || '—'}</div></div>)}
      </section>

      {record.executive_summary && <section className="border border-slate-300"><h3 className="bg-[#184877] px-3 py-2 font-bold text-white">Executive summary</h3><p className="whitespace-pre-wrap p-3">{record.executive_summary}</p></section>}
      {sections.map((section) => {
        const rawRows = Array.isArray(record[section.key]) ? record[section.key] : [];
        const rows = rawRows.length ? rawRows : [{}];
        return <section key={section.key} className="overflow-hidden border border-slate-300 bg-white"><h3 className="bg-[#184877] px-3 py-2 font-bold text-white">{section.title}</h3><div className="overflow-x-auto"><table className="w-full border-collapse text-left text-xs"><thead><tr className="bg-[#dbe7f4]">{section.columns.map(([, label]) => <th key={label} className="border border-slate-300 px-2 py-2 font-bold">{label}</th>)}</tr></thead><tbody>{rows.map((row: any, index: number) => <tr key={index} className="odd:bg-white even:bg-slate-50">{section.columns.map(([key]) => <td key={key} className="border border-slate-300 px-2 py-2 align-top"><DisplayValue value={row[key]} /></td>)}</tr>)}</tbody></table></div></section>;
      })}
      {Array.isArray(record.manpower_requirements) && record.manpower_requirements[0]?.recommendation && <section className="border border-slate-300"><h3 className="bg-[#184877] px-3 py-2 font-bold text-white">Manpower requirement recommendation</h3><p className="whitespace-pre-wrap p-3">{record.manpower_requirements[0].recommendation}</p></section>}
      {record.conclusion && <section className="border border-slate-300"><h3 className="bg-[#184877] px-3 py-2 font-bold text-white">Conclusion</h3><p className="whitespace-pre-wrap p-3">{record.conclusion}</p></section>}
       <section className="border border-slate-300">
        <h3 className="flex items-center gap-2 bg-[#184877] px-3 py-2 font-bold text-white"><Paperclip size={14} /> Attachments</h3>
        <div className="space-y-2 p-3">
          {fileError && <p role="alert" className="text-xs text-red-700">{fileError}</p>}
          {attachmentsLoading ? <p className="text-xs text-slate-500">Loading attachments…</p> : attachments.length ? attachments.map((file: any) => <div key={file.id} className="flex flex-wrap items-center justify-between gap-2 border border-slate-300 bg-[#f4f7fb] px-3 py-2"><span className="min-w-0 flex-1 truncate text-xs font-semibold" title={file.file_name || file.title}>{file.file_name || file.title || 'Attachment'}</span><div className="flex gap-2 no-print"><button type="button" disabled={fileBusy !== null} onClick={() => void openAttachment(file)} className="inline-flex items-center gap-1 bg-[#184877] px-2.5 py-1.5 text-xs font-bold text-white disabled:opacity-50"><Eye size={13} /> View</button><button type="button" disabled={fileBusy !== null} onClick={() => void openAttachment(file, true)} className="inline-flex items-center gap-1 border border-slate-400 px-2.5 py-1.5 text-xs font-bold disabled:opacity-50"><Download size={13} /> Download</button></div></div>) : <p className="text-xs text-slate-500">No files attached to this report.</p>}
        </div>
      </section>
      <style jsx global>{`
        @media print {
          @page {
            size: A4 portrait;
            margin: 10mm;
          }
          *, *::before, *::after {
            border-radius: 0 !important;
          }
          body * {
            visibility: hidden !important;
          }
          #maint-assessment-printable-area,
          #maint-assessment-printable-area * {
            visibility: visible !important;
            border-radius: 0 !important;
          }
          #maint-assessment-printable-area {
            position: absolute !important;
            left: 0 !important;
            top: 0 !important;
            width: 100% !important;
            height: auto !important;
            margin: 0 !important;
            padding: 0 !important;
            overflow: visible !important;
            background: white !important;
            color: black !important;
            border-radius: 0 !important;
          }
          .no-print {
            display: none !important;
          }
        }
      `}</style>
    </article>
  </Modal>;
}
