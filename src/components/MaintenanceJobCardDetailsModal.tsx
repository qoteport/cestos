'use client';

import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { apiFetch, apiFetchBlob, downloadBlob } from '@/lib/api';
import { openUniversalFileViewer } from '@/lib/fileViewer';
import { Modal } from './DataUI';
import { Download, Eye, Printer } from 'lucide-react';
import SearchableSelect from './SearchableSelect';

type Kind = 'work_order' | 'preventive' | 'breakdown';
type Field = { key: string; label: string; json?: boolean };

const fieldsByKind: Record<Kind, Field[]> = {
  preventive: [
    { key: 'pm_control', label: 'PM control', json: true },
    { key: 'inspection_items', label: 'Checklist and measurements', json: true },
    { key: 'service_defect_control', label: 'Service interval and defects', json: true },
    { key: 'machine_release', label: 'Machine release', json: true },
    { key: 'technicians', label: 'Technicians', json: true },
    { key: 'signatures', label: 'Signatures', json: true },
    { key: 'supervisor_comments', label: 'Supervisor comments' },
  ],
  breakdown: [
    { key: 'job_control', label: 'Job control', json: true },
    { key: 'reported_failure', label: 'Reported failure' },
    { key: 'corrective_action', label: 'Corrective action' },
    { key: 'parts_materials', label: 'Parts, consumables and materials', json: true },
    { key: 'labour_downtime', label: 'Labour and downtime', json: true },
    { key: 'test_release', label: 'Test and release', json: true },
    { key: 'signatures', label: 'Signatures', json: true },
  ],
  work_order: [
    { key: 'title', label: 'Title' },
    { key: 'description', label: 'Description' },
    { key: 'work_type', label: 'Work type' },
    { key: 'priority', label: 'Priority' },
    { key: 'failure_taxonomy', label: 'Failure taxonomy' },
    { key: 'scheduled_date', label: 'Scheduled date' },
    { key: 'assigned_technician_id', label: 'Assigned technician ID' },
    { key: 'downtime_hours', label: 'Downtime hours' },
    { key: 'estimated_lost_contribution', label: 'Estimated lost contribution' },
    { key: 'root_cause', label: 'Root cause' },
    { key: 'remedy', label: 'Remedy' },
    { key: 'notes', label: 'Notes' },
  ],
};

const pretty = (value: any) => typeof value === 'string' ? value : JSON.stringify(value ?? {}, null, 2);
const labelOf = (value: string) => value.replaceAll('_', ' ').replace(/\b\w/g, (letter) => letter.toUpperCase());
const shown = (value: any, key?: string) => {
  if (value === null || value === undefined || value === '') return '—';
  if (Array.isArray(value)) return value.join(', ');
  if (typeof value === 'object') return value.signer_name || value.name || 'Signature attached';
  if (typeof value === 'string' && key && /(date|_at|_due)$/.test(key) && /^\d{4}-\d{2}-\d{2}/.test(value)) {
    const parsed = new Date(value);
    if (!Number.isNaN(parsed.getTime())) return key.endsWith('_at') || value.includes('T') ? parsed.toLocaleString() : parsed.toLocaleDateString();
  }
  return String(value);
};

function InfoGrid({ values }: { values: Record<string, any> }) {
  return <div className="grid gap-0 border-l border-t border-slate-900 sm:grid-cols-2">{Object.entries(values).filter(([, value]) => value !== undefined).map(([key, value]) => <div key={key} className="min-w-0 border-b border-r border-slate-900 bg-white dark:bg-slate-950"><p className="bg-[#dbe7f4] px-2 py-1 text-[10px] font-bold uppercase tracking-wide text-slate-800">{labelOf(key)}</p><p className="min-h-9 whitespace-pre-wrap break-words px-2 py-2 text-sm font-medium">{shown(value, key)}</p></div>)}</div>;
}

function CardSection({ title, children }: { title: string; children: ReactNode }) {
  return <section className="overflow-hidden border border-slate-900 bg-white dark:bg-slate-950"><h4 className="bg-[#184877] px-3 py-2 text-center text-xs font-bold uppercase tracking-wide text-white">{title}</h4><div className="space-y-3 p-3 sm:p-4">{children}</div></section>;
}

export default function MaintenanceJobCardDetailsModal({
  record,
  kind,
  editable,
  startEditing = false,
  onClose,
  onSaved,
  onEdit,
}: {
  record: any;
  kind: Kind;
  editable: boolean;
  startEditing?: boolean;
  onClose: () => void;
  onSaved: () => void;
  onEdit?: () => void;
}) {
  const fields = fieldsByKind[kind];
  const [editing, setEditing] = useState(startEditing);
  const [status, setStatus] = useState(record.status || 'DRAFT');
  const [values, setValues] = useState<Record<string, string>>(() => Object.fromEntries(fields.map((field: Field) => [field.key, pretty(record[field.key])] )));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [attachments, setAttachments] = useState<any[]>([]);
  const [attachmentsLoading, setAttachmentsLoading] = useState(kind !== 'work_order');
  const [siteName, setSiteName] = useState('');
  const [fileBusy, setFileBusy] = useState<string | null>(null);
  const printableRef = useRef<HTMLDivElement>(null);
  const title = record.display_title || record.title || record.job_card_number || record.wo_number || 'Maintenance record';
  const kindLabel = kind === 'preventive' ? 'Preventive maintenance job card' : kind === 'breakdown' ? 'Breakdown repair job card' : 'Work order';
  const endpoint = useMemo(() => kind === 'preventive' ? `/api/v1/pm-job-cards/${record.id}` : kind === 'breakdown' ? `/api/v1/pm-job-cards/breakdown/${record.id}` : `/api/v1/maintenance/work-orders/${record.id}`, [kind, record.id]);

  useEffect(() => {
    if (record.project_id && record.site_location_id) {
      apiFetch<any>(`/api/v1/projects/${record.project_id}/sites`)
        .then((result) => {
          const sites = Array.isArray(result) ? result : result?.items || [];
          const site = sites.find((item: any) => String(item.id) === String(record.site_location_id));
          if (site) setSiteName(site.name || site.site_name || site.code || '');
        })
        .catch(() => {});
    }
    if (kind === 'work_order') { setAttachmentsLoading(false); return; }
    setAttachmentsLoading(true);
    const sourceType = kind === 'preventive' ? 'pm_job_card' : 'breakdown_job_card';
    let active = true;
    apiFetch<any>(`/api/v1/documents?view=all&page_size=20&source_type=${sourceType}&source_id=${encodeURIComponent(record.id)}`)
      .then(async (result) => {
        let files = Array.isArray(result) ? result : result?.items || [];
        // Older job cards uploaded files as ordinary library documents before
        // source links were supported; locate those by their established title.
        if (!files.length && record.job_card_number) {
          const legacyTitle = `${kind === 'preventive' ? 'PM' : 'Breakdown'} Job Card ${record.job_card_number}`;
          const legacy = await apiFetch<any>(`/api/v1/documents?view=all&page_size=20&q=${encodeURIComponent(legacyTitle)}`);
          files = (Array.isArray(legacy) ? legacy : legacy?.items || []).filter((file: any) => file.title === legacyTitle);
        }
        if (active) { setAttachments(files); setAttachmentsLoading(false); }
      })
      .catch(() => { if (active) { setAttachments([]); setAttachmentsLoading(false); } });
    return () => { active = false; };
  }, [kind, record.id, record.project_id, record.site_location_id, record.job_card_number]);

  async function openAttachment(file: any, download = false) {
    setFileBusy(file.id);
    try {
      const blob = await apiFetchBlob(`/api/v1/documents/${file.id}/${download ? 'download' : 'view?disposition=inline'}`);
      if (download) downloadBlob(blob, file.file_name || file.title || 'maintenance-attachment');
      else openUniversalFileViewer({ blob, fileName: file.file_name || file.title || 'maintenance-attachment', title: 'Maintenance job card attachment' });
    } catch (exception: any) {
      setError(exception?.message || 'Could not open the attached file.');
    } finally { setFileBusy(null); }
  }

  function printDetails() {
    const printWindow = window.open('', '_blank', 'width=1100,height=850');
    if (!printWindow || !printableRef.current) {
      setError('Allow pop-ups to print this maintenance record.');
      return;
    }
    const stylesheets = Array.from(document.querySelectorAll<HTMLLinkElement>('link[rel="stylesheet"]'))
      .map((link) => `<link rel="stylesheet" href="${link.href}">`).join('');
    printWindow.document.open();
    printWindow.document.write(`<!doctype html><html><head><meta charset="utf-8"><title>${kindLabel}</title>${stylesheets}<style>
      @page { size: landscape; margin: 12mm; }
      body { margin: 0; padding: 16px; color: #0f172a; background: white; font-family: Arial, sans-serif; }
      * { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
      button { display: none !important; }
      section, table, .border { break-inside: avoid; }
      main { max-width: 100%; }
    </style></head><body><main>${printableRef.current.innerHTML}</main></body></html>`);
    printWindow.document.close();
    printWindow.onload = () => {
      printWindow.focus();
      printWindow.print();
      printWindow.onafterprint = () => printWindow.close();
    };
  }

  async function save() {
    const body: Record<string, any> = { status };
    try {
      for (const field of fields) body[field.key] = field.json ? JSON.parse(values[field.key] || (field.key.endsWith('items') || field.key === 'technicians' ? '[]' : '{}')) : values[field.key] || null;
    } catch (parseError: any) {
      setError(`Check the JSON for “${fields.find((field: Field) => { try { if (field.json) JSON.parse(values[field.key] || '{}'); return false; } catch { return true; } })?.label || 'the edited field'}”.`);
      return;
    }
    setBusy(true);
    setError('');
    try {
      await apiFetch(endpoint, { method: 'PATCH', body: JSON.stringify(body) });
      onSaved();
      onClose();
    } catch (exception: any) {
      setError(exception?.message || 'Could not save this job card.');
    } finally {
      setBusy(false);
    }
  }

  return <Modal title={editing ? `Edit ${kindLabel}` : kindLabel} onClose={onClose} className="sm:!max-w-4xl sm:!max-h-[90vh]" footer={<div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
    <div className="flex min-w-0 items-center gap-2 overflow-x-auto">
      {kind !== 'work_order' && (attachmentsLoading ? <span className="text-xs text-slate-500">Checking attachments…</span> : attachments.length ? attachments.map((file: any) => <div key={file.id} className="flex shrink-0 items-center gap-2 rounded-none border border-slate-400 bg-[#f4f7fb] px-2 py-1.5 dark:bg-slate-800">
        <span className="max-w-40 truncate text-[11px] font-semibold" title={file.file_name || file.title}>{file.file_name || file.title || 'Job card attachment'}</span>
        <button type="button" onClick={() => void openAttachment(file)} disabled={fileBusy !== null} className="inline-flex items-center gap-1 bg-[#184877] px-2 py-1 text-[11px] font-bold text-white disabled:opacity-50"><Eye size={12} />View</button>
        <button type="button" onClick={() => void openAttachment(file, true)} disabled={fileBusy !== null} className="inline-flex items-center gap-1 border border-slate-400 px-2 py-1 text-[11px] font-bold disabled:opacity-50"><Download size={12} />Download</button>
      </div>) : <div className="flex shrink-0 items-center gap-2"><span className="text-xs text-slate-500">No attached files</span><button type="button" onClick={printDetails} className="inline-flex items-center gap-1 bg-[#184877] px-3 py-2 text-xs font-bold text-white"><Printer size={13} />Print</button></div>)}
    </div>
    <div className="flex shrink-0 justify-end gap-2">
      <button type="button" onClick={onClose} className="border border-slate-400 px-4 py-2 text-xs font-bold">Close</button>
      {editable && (onEdit ? <button type="button" onClick={onEdit} className="bg-[#184877] px-4 py-2 text-xs font-bold text-white">Edit record</button> : editing ? <button type="button" onClick={save} disabled={busy} className="bg-[#184877] px-4 py-2 text-xs font-bold text-white disabled:opacity-50">{busy ? 'Saving…' : 'Save changes'}</button> : <button type="button" onClick={() => setEditing(true)} className="bg-[#184877] px-4 py-2 text-xs font-bold text-white">Edit record</button>)}
    </div>
  </div>}>
    <div ref={printableRef} className="space-y-4 text-sm">
      <div className="overflow-hidden border border-slate-900 bg-white dark:bg-slate-950">
        <p className="bg-[#184877] px-3 py-2 text-center text-xs font-bold uppercase tracking-wide text-white">{kind === 'preventive' ? 'Maintenance Control — Preventive Maintenance Job Card' : kind === 'breakdown' ? 'Daily Maintenance / Breakdown Repair Job Card' : 'Work Order Record'}</p>
        <div className="p-3 sm:p-4">
          <p className="text-xs font-bold uppercase tracking-wide text-slate-600">{record.job_card_number || record.wo_number || 'Record'}</p>
          <h3 className="mt-1 text-base font-bold text-slate-900 dark:text-white">{title}</h3>
          <p className="mt-1 text-xs text-slate-500">Created {record.created_at ? new Date(record.created_at).toLocaleString() : '—'} · Status: {record.status || '—'}</p>
        </div>
      </div>
      {editing ? <>
        <div className="block space-y-1 font-semibold">
          <span>Status</span>
          <SearchableSelect
            value={status}
            onChange={(val) => setStatus(val)}
            options={(kind === 'work_order' ? ['OPEN', 'IN_PROGRESS', 'WAITING_PARTS', 'COMPLETED', 'CANCELLED'] : kind === 'preventive' ? ['DRAFT', 'IN_PROGRESS', 'PENDING_SIGNOFF', 'COMPLETED', 'CANCELLED'] : ['DRAFT', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED']).map((value) => ({ value, label: value }))}
            searchable={false}
            ariaLabel="Status"
          />
        </div>
        {fields.map((field: Field) => <label key={field.key} className="block space-y-1 font-semibold"><span>{field.label}{field.json ? ' (JSON)' : ''}</span><textarea rows={field.json ? 6 : 3} className="w-full rounded-lg border bg-background p-2.5 font-normal" value={values[field.key] ?? ''} onChange={(event) => setValues((current) => ({ ...current, [field.key]: event.target.value }))} /></label>)}
      </> : <>
        {kind === 'preventive' ? <div className="space-y-4">
          <CardSection title="PM control"><InfoGrid values={{ date: record.pm_control?.date, pm_interval: record.pm_control?.pm_interval, status: record.status, equipment: record.pm_control?.equipment, fleet_unit_id: record.pm_control?.fleet_unit_id, location: record.pm_control?.location || siteName || record.site_location_id, hour_meter_km: record.pm_control?.hour_meter_km, technician_team: record.pm_control?.technician_team, work_order_no: record.pm_control?.work_order_no, start_time: record.pm_control?.start_time, finish_time: record.pm_control?.finish_time }} /></CardSection>
          <CardSection title="Checklist and measurements">{Array.isArray(record.inspection_items) && record.inspection_items.length ? <div className="space-y-3">{record.inspection_items.map((item: any, index: number) => <div key={`${item.system_component || 'system'}-${index}`} className="rounded-lg border p-3"><div className="flex flex-wrap items-center justify-between gap-2"><h5 className="font-bold">{item.system_component || `Inspection ${index + 1}`}</h5><span className="rounded-full bg-slate-100 px-2 py-1 text-[10px] font-semibold dark:bg-slate-800">{shown([item.condition, item.condition_reading].filter(Boolean).join(' — '))}</span></div>{Array.isArray(item.service_tasks) ? <p className="mt-2 text-xs text-slate-600 dark:text-slate-300">{item.service_tasks.join(' · ')}</p> : item.service_tasks && <p className="mt-2 text-xs text-slate-600 dark:text-slate-300">{item.service_tasks}</p>}<InfoGrid values={{ action_taken: item.action_taken, parts_used: Array.isArray(item.parts_used) ? item.parts_used.map((part: any) => typeof part === 'string' ? part : `${part.name || part.description || 'Part'}${part.quantity ? ` × ${part.quantity}` : ''}`) : item.parts_used || item.parts_text, technician_initial: item.technician_initial, supervisor_check: item.supervisor_check, remarks: item.remarks }} /></div>)}</div> : <p className="text-sm text-slate-500">No inspection items recorded.</p>}</CardSection>
          <CardSection title="Service interval and defects"><InfoGrid values={{ pm_level: record.service_defect_control?.pm_level, next_pm_due: record.service_defect_control?.next_pm_due, total_labour_hours: record.service_defect_control?.total_labour_hours, machine_down_hours: record.service_defect_control?.machine_down_hours, pm_result: record.service_defect_control?.pm_result, defects_recommendations: record.service_defect_control?.defects_recommendations }} /></CardSection>
          <CardSection title="Release and sign-off"><InfoGrid values={{ machine_status: record.machine_release?.machine_status, technician_sign: record.signatures?.technician, supervisor_sign: record.signatures?.supervisor, operator_sign: record.signatures?.operator, supervisor_comments: record.supervisor_comments }} /><div className="grid gap-3 sm:grid-cols-3">{['technician', 'supervisor', 'operator'].map((role) => { const signature = record.signatures?.[role]; const image = typeof signature === 'object' ? signature?.image_data : null; return image ? <div key={role} className="rounded-lg border p-3"><p className="mb-2 text-xs font-semibold capitalize">{role} signature</p><img src={image} alt={`${role} signature`} className="h-12 max-w-full object-contain" /></div> : null; })}</div></CardSection>
        </div> : kind === 'breakdown' ? <div className="space-y-4">
          <CardSection title="Job control and machine identification"><InfoGrid values={{ status: record.status, equipment: record.job_control?.equipment || record.job_control?.equipment_name, fleet_unit_id: record.job_control?.fleet_unit_id, location: record.job_control?.location || siteName || record.site_location_id, hour_km: record.job_control?.hour_km || record.job_control?.hour_meter_km, operator_driver: record.job_control?.operator_driver || record.job_control?.operator || record.job_control?.driver, department: record.job_control?.department, time_reported: record.job_control?.time_reported, time_attended: record.job_control?.time_attended }} /></CardSection>
          <CardSection title="Reported failure"><p className="whitespace-pre-wrap text-sm">{record.reported_failure || 'No failure details recorded.'}</p></CardSection>
          <CardSection title="Corrective action and work completed"><p className="whitespace-pre-wrap text-sm">{record.corrective_action || 'No corrective action recorded.'}</p></CardSection>
          <CardSection title="Parts, consumables and materials">{Array.isArray(record.parts_materials) && record.parts_materials.length ? <div className="overflow-x-auto"><table className="w-full min-w-[680px] text-left text-xs"><thead><tr className="border-b text-slate-500">{['Description', 'Part no.', 'Qty', 'Unit', 'Source', 'Condition', 'Old returned', 'Remarks'].map((heading) => <th key={heading} className="p-2">{heading}</th>)}</tr></thead><tbody>{record.parts_materials.map((part: any, index: number) => <tr key={index} className="border-b last:border-0">{['description', 'part_no', 'qty', 'unit', 'source', 'condition', 'old_returned', 'remarks'].map((key) => <td key={key} className="p-2 align-top">{shown(part[key])}</td>)}</tr>)}</tbody></table></div> : <p className="text-sm text-slate-500">No parts or consumables recorded.</p>}</CardSection>
          <CardSection title="Labour and downtime">{Array.isArray(record.labour_downtime) && record.labour_downtime.length ? <div className="overflow-x-auto"><table className="w-full min-w-[620px] text-left text-xs"><thead><tr className="border-b text-slate-500">{['Technician', 'Start', 'Finish', 'Labour hrs', 'Down hrs', 'Work hrs', 'Remarks'].map((heading) => <th key={heading} className="p-2">{heading}</th>)}</tr></thead><tbody>{record.labour_downtime.map((line: any, index: number) => <tr key={index} className="border-b last:border-0">{['technician', 'start', 'finish', 'labour_hours', 'machine_down_hours', 'work_hours', 'remarks'].map((key) => <td key={key} className="p-2 align-top">{shown(line[key])}</td>)}</tr>)}</tbody></table></div> : <p className="text-sm text-slate-500">No labour or downtime entries recorded.</p>}</CardSection>
          <CardSection title="Test, release and sign-off"><InfoGrid values={{ ...record.test_release, technician_sign: record.signatures?.technician?.signer_name || record.signatures?.technician || record.signatures?.technician_sign, supervisor_sign: record.signatures?.supervisor?.signer_name || record.signatures?.supervisor || record.signatures?.supervisor_sign, operator_sign: record.signatures?.operator?.signer_name || record.signatures?.operator || record.signatures?.operator_sign }} /></CardSection>
        </div> : <div className="space-y-4"><CardSection title="Work order details"><InfoGrid values={{ title: record.title, description: record.description, work_type: record.work_type, priority: record.priority, scheduled_date: record.scheduled_date, status: record.status, assigned_technician_id: record.assigned_technician_id, downtime_hours: record.downtime_hours, root_cause: record.root_cause, remedy: record.remedy, notes: record.notes }} /></CardSection></div>}

      </>}
      {error && <p role="alert" className="rounded-lg border border-red-300 bg-red-50 p-3 text-sm text-red-800">{error}</p>}


    </div>
  </Modal>;
}
