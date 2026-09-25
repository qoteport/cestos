'use client';

import { Modal } from './DataUI';
import { Printer, Pencil } from 'lucide-react';

const sections: Array<{ key: string; title: string; columns: Array<[string, string]> }> = [
  { key: 'equipment_fleet', title: 'Equipment fleet', columns: [['equipment', 'Equipment'], ['quantity', 'Quantity'], ['maintenance_focus', 'Maintenance focus'], ['current_approach', 'Current approach']] },
  { key: 'maintenance_assessment', title: 'Maintenance assessment & corrective action', columns: [['area_equipment', 'Area / equipment'], ['observation_failure', 'Observation / failure'], ['action_taken_response', 'Action taken / response'], ['current_status', 'Current status'], ['priority', 'Priority']] },
  { key: 'preventive_improvements', title: 'Preventive maintenance improvement', columns: [['pm_control', 'PM control'], ['purpose', 'Purpose'], ['status', 'Status']] },
  { key: 'spare_parts_actions', title: 'Spare parts & materials', columns: [['action', 'Action'], ['purpose', 'Purpose'], ['priority', 'Priority'], ['status', 'Status']] },
  { key: 'manpower_requirements', title: 'Manpower requirements', columns: [['role', 'Role / position'], ['site', 'Site / project'], ['justification', 'Justification'], ['priority', 'Priority'], ['status', 'Status']] },
  { key: 'control_documents', title: 'Maintenance control & documentation', columns: [['control_document', 'Control document'], ['purpose', 'Purpose'], ['implementation', 'Implementation']] },
  { key: 'action_plan', title: 'Initial action plan', columns: [['action', 'Action'], ['priority', 'Priority'], ['target', 'Target'], ['status', 'Status']] },
  { key: 'maintenance_kpis', title: 'Maintenance KPIs', columns: [['kpi', 'KPI'], ['purpose', 'Purpose'], ['frequency', 'Frequency']] },
];

function DisplayValue({ value }: { value: unknown }) {
  if (value === null || value === undefined || value === '') return <>—</>;
  return <span className="whitespace-pre-wrap break-words">{String(value)}</span>;
}

export default function MaintenanceAssessmentReportDetailsModal({
  record, onClose, onEdit, editable, projects = [], sites = [],
}: { record: any; onClose: () => void; onEdit: () => void; editable: boolean; projects?: any[]; sites?: any[] }) {
  const reportDate = (value?: string) => value ? new Date(`${value.slice(0, 10)}T00:00:00`).toLocaleDateString() : '—';
  const printable = () => window.print();
  return <Modal title={`Maintenance assessment · ${record.report_number || ''}`} onClose={onClose} className="sm:!h-[90vh] sm:!max-h-[90vh] sm:!max-w-6xl" footer={<div className="flex w-full justify-end gap-2"><button type="button" className="btn-secondary inline-flex items-center gap-2" onClick={printable}><Printer size={15} /> Print</button>{editable && <button type="button" className="btn-primary inline-flex items-center gap-2" onClick={onEdit}><Pencil size={15} /> Edit report</button>}</div>}>
    <article data-maint-assessment-print className="space-y-5 text-sm print:text-black">
      <section className="grid gap-px border border-slate-300 bg-slate-300 sm:grid-cols-2 lg:grid-cols-4">
        {[
          ['Report number', record.report_number], ['Report date', reportDate(record.report_date)],
          ['Reporting period', `${reportDate(record.reporting_period_start)} – ${reportDate(record.reporting_period_end)}`],
          ['Project', record.project_name_custom || record.project?.name || projects.find((item) => String(item.id) === String(record.project_id))?.name || '—'], ['Site / work location', record.site_name_custom || record.site?.name || sites.find((item) => String(item.id) === String(record.site_location_id))?.name || '—'],
          ['Status', record.status], ['Prepared by', record.prepared_by_name], ['Position', record.prepared_by_position], ['Submitted to', record.submitted_to],
        ].map(([label, value]) => <div key={label} className="bg-white px-3 py-2"><div className="text-[10px] font-bold uppercase text-slate-500">{label}</div><div className="mt-1 font-semibold text-slate-900">{value || '—'}</div></div>)}
      </section>
      {record.executive_summary && <section className="border border-slate-300"><h3 className="bg-[#184877] px-3 py-2 font-bold text-white">Executive summary</h3><p className="whitespace-pre-wrap p-3">{record.executive_summary}</p></section>}
      {sections.map((section) => {
        const rows = Array.isArray(record[section.key]) ? record[section.key] : [];
        if (!rows.length) return null;
        return <section key={section.key} className="overflow-hidden border border-slate-300"><h3 className="bg-[#184877] px-3 py-2 font-bold text-white">{section.title}</h3><div className="overflow-x-auto"><table className="w-full border-collapse text-left text-xs"><thead><tr className="bg-[#dbe7f4]">{section.columns.map(([, label]) => <th key={label} className="border border-slate-300 px-2 py-2 font-bold">{label}</th>)}</tr></thead><tbody>{rows.map((row: any, index: number) => <tr key={index} className="odd:bg-white even:bg-slate-50">{section.columns.map(([key]) => <td key={key} className="border border-slate-300 px-2 py-2 align-top"><DisplayValue value={row[key]} /></td>)}</tr>)}</tbody></table></div></section>;
      })}
      {record.conclusion && <section className="border border-slate-300"><h3 className="bg-[#184877] px-3 py-2 font-bold text-white">Conclusion</h3><p className="whitespace-pre-wrap p-3">{record.conclusion}</p></section>}
      <style jsx global>{`@media print { body * { visibility: hidden !important; } [data-maint-assessment-print], [data-maint-assessment-print] * { visibility: visible !important; } }`}</style>
    </article>
  </Modal>;
}
