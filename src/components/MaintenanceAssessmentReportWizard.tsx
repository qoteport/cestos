'use client';

import { useMemo, useState } from 'react';
import { apiFetch } from '@/lib/api';
import { Modal, Row } from './DataUI';
import SearchableSelect from './SearchableSelect';
import { Paperclip, X } from 'lucide-react';

type ReportRow = Record<string, string>;
type ReportData = Record<string, any>;
type Column = { key: string; label: string; wide?: boolean; asset?: boolean };

const blankRow = (columns: Column[]): ReportRow => Object.fromEntries(columns.map(({ key }) => [key, '']));
const sectionDefinitions: Record<string, { title: string; columns: Column[] }> = {
  equipment_fleet: { title: 'Equipment fleet', columns: [
    { key: 'equipment', label: 'Equipment', asset: true },
    { key: 'quantity', label: 'Quantity' },
    { key: 'maintenance_focus', label: 'Maintenance focus', wide: true },
    { key: 'current_approach', label: 'Current approach', wide: true },
  ] },
  maintenance_assessment: { title: 'Maintenance assessment & corrective action', columns: [
    { key: 'area_equipment', label: 'Area / equipment', asset: true },
    { key: 'observation_failure', label: 'Observation / failure', wide: true },
    { key: 'action_taken_response', label: 'Action taken / response', wide: true },
    { key: 'current_status', label: 'Current status' },
  ] },
  preventive_improvements: { title: 'Preventive maintenance improvement', columns: [
    { key: 'pm_control', label: 'PM control' }, { key: 'purpose', label: 'Purpose', wide: true }, { key: 'status', label: 'Status' },
  ] },
  spare_parts_actions: { title: 'Spare parts & materials', columns: [
    { key: 'action', label: 'Action', wide: true }, { key: 'purpose', label: 'Purpose', wide: true }, { key: 'priority', label: 'Priority' }, { key: 'status', label: 'Status' },
  ] },
  manpower_requirements: { title: 'Manpower requirement', columns: [] },
  control_documents: { title: 'Maintenance control & documentation', columns: [
    { key: 'control_document', label: 'Control document' }, { key: 'purpose', label: 'Purpose', wide: true }, { key: 'implementation', label: 'Implementation' },
  ] },
  action_plan: { title: 'Initial action plan', columns: [
    { key: 'action', label: 'Action', wide: true }, { key: 'priority', label: 'Priority' }, { key: 'target', label: 'Target' }, { key: 'status', label: 'Status' },
  ] },
  maintenance_kpis: { title: 'Maintenance KPIs', columns: [
    { key: 'kpi', label: 'KPI' }, { key: 'purpose', label: 'Purpose', wide: true }, { key: 'frequency', label: 'Frequency' },
  ] },
};

const today = new Date().toISOString().slice(0, 10);
function emptyReport(projectId: string): ReportData {
  return {
    report_number: '', project_id: projectId || '', site_location_id: '', reporting_period_start: today,
    reporting_period_end: today, report_date: today, prepared_by_employee_id: '', prepared_by_name: '',
    prepared_by_position: '', submitted_to: '', status: 'DRAFT', executive_summary: '', conclusion: '',
    ...Object.fromEntries(Object.entries(sectionDefinitions).filter(([key]) => key !== 'manpower_requirements').map(([key, section]) => [key, [blankRow(section.columns)]])),
    manpower_requirements: '',
  };
}

function makeInitial(record: Row | undefined, projectId: string): ReportData {
  const initial = { ...emptyReport(projectId), ...(record || {}) };
  for (const [key, definition] of Object.entries(sectionDefinitions)) {
    if (key === 'manpower_requirements') {
      const value = record?.manpower_requirements;
      initial.manpower_requirements = Array.isArray(value) ? (value[0]?.recommendation || '') : (value || '');
      continue;
    }
    const rows = Array.isArray(record?.[key]) ? record?.[key] : [];
    initial[key] = rows.length ? rows.map((row: Row) => ({ ...row, ...Object.fromEntries(definition.columns.map(({ key: column }) => [column, row?.[column] == null ? '' : String(row[column])])), asset_id: row?.asset_id == null ? '' : String(row.asset_id) })) : [blankRow(definition.columns)];
  }
  return initial;
}

export default function MaintenanceAssessmentReportWizard({
  assets, employees, projects = [], projectId, record, onClose, onSaved,
}: {
  assets: Row[]; employees: Row[]; projects?: Row[]; projectId: string; record?: Row;
  onClose: () => void; onSaved: () => void;
}) {
  const [data, setData] = useState<ReportData>(() => makeInitial(record, projectId));
  const [step, setStep] = useState(0);
  const [mode, setMode] = useState<'ASSISTED' | 'FREE_FLOW'>('ASSISTED');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [pendingFiles, setPendingFiles] = useState<File[]>([]);
  const [createdRecordId, setCreatedRecordId] = useState<string | null>(null);
  const [customProject, setCustomProject] = useState(Boolean(record?.project_name_custom));
  const [customPreparer, setCustomPreparer] = useState(Boolean(record?.prepared_by_name && !record?.prepared_by_employee_id));

  const assetOptions = useMemo(() => assets.map((asset) => ({
    value: String(asset.id),
    label: asset.name || asset.asset_name || asset.asset_number || 'Equipment',
    sublabel: [asset.asset_number, asset.make, asset.model].filter(Boolean).join(' · '),
  })), [assets]);
  const employeeOptions = employees.map((employee) => ({
    value: String(employee.id),
    label: [employee.first_name, employee.last_name].filter(Boolean).join(' ') || employee.name || 'Employee',
    sublabel: employee.position_name || employee.job_title || employee.employee_number || '',
  }));
  const projectOptions = [{ value: '__CUSTOM__', label: 'Enter a custom project name…' }, ...projects.map((project) => ({ value: String(project.id), label: project.name || project.project_name || project.project_number }))];
  const preparerOptions = [{ value: '__CUSTOM__', label: 'Enter a custom preparer…' }, ...employeeOptions];
  const sectionHeadingClass = mode === 'FREE_FLOW'
    ? 'bg-[#184877] px-2 py-1 text-center text-[11px] font-bold text-white'
    : 'border-b pb-2 text-sm font-bold';

  const patch = (key: string, value: any) => setData((old) => ({ ...old, [key]: value }));
  const patchRow = (section: string, index: number, key: string, value: string) => setData((old) => ({
    ...old, [section]: old[section].map((row: ReportRow, rowIndex: number) => rowIndex === index ? { ...row, [key]: value } : row),
  }));
  const addRow = (section: string) => setData((old) => ({ ...old, [section]: [...old[section], blankRow(sectionDefinitions[section].columns)] }));
  const removeRow = (section: string, index: number) => setData((old) => ({
    ...old, [section]: old[section].length <= 1 ? [blankRow(sectionDefinitions[section].columns)] : old[section].filter((_: ReportRow, rowIndex: number) => rowIndex !== index),
  }));

  const equipmentIds = [...new Set(Object.values(sectionDefinitions).flatMap((section, index) => {
    const key = Object.keys(sectionDefinitions)[index];
    return key === 'equipment_fleet' || key === 'maintenance_assessment' ? (data[key] || []).map((row: ReportRow) => row.asset_id).filter((id: string) => id && id !== '__CUSTOM__') : [];
  }))];

  const controls = <div className="space-y-4">
    {mode === 'ASSISTED' && <h3 className={sectionHeadingClass}>Report control</h3>}
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
      <label className="space-y-1"><span className="block font-medium">Reporting period start *</span><input className="input-field" type="date" value={data.reporting_period_start} onChange={(e) => patch('reporting_period_start', e.target.value)} required /></label>
      <label className="space-y-1"><span className="block font-medium">Reporting period end *</span><input className="input-field" type="date" value={data.reporting_period_end} onChange={(e) => patch('reporting_period_end', e.target.value)} required /></label>
      <label className="space-y-1"><span className="block font-medium">Report date *</span><input className="input-field" type="date" value={data.report_date} onChange={(e) => patch('report_date', e.target.value)} required /></label>
      <label className="space-y-1"><span className="block font-medium">Project</span>{customProject ? <div className="space-y-1"><input autoFocus className="input-field" value={data.project_name_custom || ''} onChange={(e) => patch('project_name_custom', e.target.value)} placeholder="Enter a custom project name" maxLength={200} /><button type="button" className="text-primary underline" onClick={() => { setCustomProject(false); patch('project_name_custom', null); }}>Choose a registered project</button></div> : <SearchableSelect options={projectOptions} value={data.project_id} onChange={(value) => { if (value === '__CUSTOM__') { setCustomProject(true); patch('project_name_custom', ''); return; } setCustomProject(false); patch('project_name_custom', null); patch('project_id', value); }} placeholder="Search projects" />}</label>
      <label className="space-y-1"><span className="block font-medium">Prepared by *</span>{customPreparer ? <div className="space-y-1"><input autoFocus className="input-field" value={data.prepared_by_name || ''} onChange={(e) => patch('prepared_by_name', e.target.value)} placeholder="Enter preparer name" required maxLength={200} /><button type="button" className="text-primary underline" onClick={() => { setCustomPreparer(false); patch('prepared_by_name', ''); }}>Choose an employee</button></div> : <SearchableSelect options={preparerOptions} value={data.prepared_by_employee_id} onChange={(value, option) => { if (value === '__CUSTOM__') { setCustomPreparer(true); patch('prepared_by_employee_id', null); patch('prepared_by_name', ''); return; } setCustomPreparer(false); patch('prepared_by_employee_id', value); if (option) { const employee = employees.find((row) => String(row.id) === String(value)); const name = [employee?.first_name, employee?.last_name].filter(Boolean).join(' ') || employee?.name || option.label; patch('prepared_by_name', name); patch('prepared_by_position', employee?.position_name || employee?.job_title || data.prepared_by_position); } }} placeholder="Search employees or enter custom" />}</label>
      <label className="space-y-1"><span className="block font-medium">Position</span><input className="input-field" value={data.prepared_by_position || ''} onChange={(e) => patch('prepared_by_position', e.target.value)} maxLength={150} /></label>
      <label className="space-y-1"><span className="block font-medium">Submitted to</span><input className="input-field" value={data.submitted_to || ''} onChange={(e) => patch('submitted_to', e.target.value)} maxLength={200} /></label>
    </div>
    {mode === 'ASSISTED' && <section className="space-y-2 border border-border p-3">
      <label className="block space-y-1 font-medium"><span className="flex items-center gap-2"><Paperclip size={14} /> Attach supporting files</span><input type="file" multiple accept="image/*,application/pdf,.doc,.docx,.xls,.xlsx" onChange={(event) => setPendingFiles((files) => [...files, ...Array.from(event.target.files || [])])} className="block w-full rounded-lg border bg-background p-2" /></label>
      {pendingFiles.length > 0 && <ul className="space-y-1">{pendingFiles.map((file, index) => <li key={`${file.name}-${file.size}-${index}`} className="flex items-center justify-between gap-2 rounded border bg-muted/30 px-2 py-1"><span className="truncate">{file.name}</span><button type="button" aria-label={`Remove ${file.name}`} onClick={() => setPendingFiles((files) => files.filter((_, fileIndex) => fileIndex !== index))} className="text-red-700"><X size={14} /></button></li>)}</ul>}
      <p className="text-[11px] text-muted-foreground">Existing attachments are kept when editing. New files are linked to this assessment after it is saved.</p>
    </section>}
  </div>;

  const textBlock = (key: string, label: string, required = false) => <label className="block space-y-1" key={key}><span className="block font-medium">{label}{required ? ' *' : ''}</span><textarea className="input-field min-h-32 resize-y" value={data[key] || ''} onChange={(e) => patch(key, e.target.value)} maxLength={20000} /></label>;

  const tableSection = (sectionKey: string) => {
    const definition = sectionDefinitions[sectionKey];
    if (sectionKey === 'manpower_requirements') return <section key={sectionKey} className="space-y-2"><h3 className={sectionHeadingClass}>{definition.title}</h3><textarea className="input-field min-h-32 w-full resize-y" aria-label={definition.title} value={data.manpower_requirements || ''} onChange={(event) => patch('manpower_requirements', event.target.value)} maxLength={20000} /></section>;
    return <div className="space-y-3" key={sectionKey}>
      <div className={`flex items-center justify-between gap-2 ${sectionHeadingClass}`}><h3 className="text-sm font-bold">{definition.title}</h3><button type="button" className="btn-secondary text-xs" onClick={() => addRow(sectionKey)}>+ Add row</button></div>
      {(data[sectionKey] || []).map((row: ReportRow, index: number) => <div key={`${sectionKey}-${index}`} className="grid gap-3 rounded-lg border border-border bg-muted/10 p-3 sm:grid-cols-2 lg:grid-cols-3">
        {definition.columns.map((column) => {
          if (column.asset) {
            const showCustom = row.asset_id === '__CUSTOM__' || (!row.asset_id && Boolean(row[column.key]));
            return <div className="space-y-1" key={column.key}>
              <span className="block font-medium">{column.label}</span>
              {showCustom ? <div className="space-y-1">
                <input autoFocus className="input-field" value={row[column.key] || ''} onChange={(event) => patchRow(sectionKey, index, column.key, event.target.value)} placeholder={`Enter custom ${column.label.toLowerCase()}`} />
                <button type="button" className="text-primary underline" onClick={() => { patchRow(sectionKey, index, 'asset_id', ''); patchRow(sectionKey, index, column.key, ''); }}>Choose registered equipment</button>
              </div> : <SearchableSelect
                options={[{ value: '__CUSTOM__', label: `Enter custom ${column.label.toLowerCase()}…` }, ...assetOptions]}
                value={row.asset_id || ''}
                onChange={(value) => {
                  if (value === '__CUSTOM__') { patchRow(sectionKey, index, 'asset_id', '__CUSTOM__'); patchRow(sectionKey, index, column.key, ''); return; }
                  const asset = assets.find((item) => String(item.id) === String(value));
                  patchRow(sectionKey, index, 'asset_id', value);
                  patchRow(sectionKey, index, column.key, asset?.name || asset?.asset_name || asset?.asset_number || '');
                }}
                placeholder={`Search ${column.label.toLowerCase()} or enter custom`}
              />}
            </div>;
          }
          return <label className={column.wide ? 'space-y-1 sm:col-span-2' : 'space-y-1'} key={column.key}>
            <span className="block font-medium">{column.label}</span>
            {column.key === 'priority' ? (
              <SearchableSelect
                options={[
                  { value: 'LOW', label: 'LOW' },
                  { value: 'MEDIUM', label: 'MEDIUM' },
                  { value: 'HIGH', label: 'HIGH' },
                  { value: 'CRITICAL', label: 'CRITICAL' },
                ]}
                value={row[column.key] || ''}
                onChange={(val) => patchRow(sectionKey, index, column.key, val)}
                placeholder="Select priority"
              />
            ) : column.key === 'status' || column.key === 'current_status' ? (
              <SearchableSelect
                options={[
                  { value: 'OPEN', label: 'OPEN' },
                  { value: 'IN_PROGRESS', label: 'IN PROGRESS' },
                  { value: 'COMPLETED', label: 'COMPLETED' },
                  { value: 'ON_HOLD', label: 'ON HOLD' },
                  { value: 'MONITORING', label: 'MONITORING' },
                  { value: 'CANCELLED', label: 'CANCELLED' },
                ]}
                value={row[column.key] || ''}
                onChange={(val) => patchRow(sectionKey, index, column.key, val)}
                placeholder="Select status"
              />
            ) : ['observation_failure', 'action_taken_response', 'maintenance_focus', 'current_approach', 'purpose', 'justification'].includes(column.key)
              ? <textarea className="input-field min-h-20 resize-y" value={row[column.key] || ''} onChange={(event) => patchRow(sectionKey, index, column.key, event.target.value)} />
              : <input className="input-field" value={row[column.key] || ''} onChange={(event) => patchRow(sectionKey, index, column.key, event.target.value)} />}
          </label>;
        })}
        <div className="flex items-end justify-end"><button type="button" className="text-xs font-semibold text-red-700" onClick={() => removeRow(sectionKey, index)} disabled={data[sectionKey].length <= 1}>Remove row</button></div>
      </div>)}
    </div>;
  };

  const steps = [
    { title: 'Report Control', body: <>{controls}</> },
    { title: 'Executive Summary & Equipment', body: <div className="space-y-6">{textBlock('executive_summary', 'Executive summary')}{tableSection('equipment_fleet')}</div> },
    { title: 'Maintenance Assessment', body: tableSection('maintenance_assessment') },
    { title: 'Preventive Maintenance Improvement', body: tableSection('preventive_improvements') },
    { title: 'Parts & Manpower', body: <div className="space-y-6">{tableSection('spare_parts_actions')}{tableSection('manpower_requirements')}</div> },
    { title: 'Controls & Action Plan', body: <div className="space-y-6">{tableSection('control_documents')}{tableSection('action_plan')}</div> },
    { title: 'KPIs & Conclusion', body: <div className="space-y-6">{tableSection('maintenance_kpis')}{textBlock('conclusion', 'Conclusion')}</div> },
  ];

  async function save() {
    if (!String(data.prepared_by_name || '').trim()) { setError('Enter the report preparer name.'); setStep(0); return; }
    if (data.reporting_period_end < data.reporting_period_start) { setError('The reporting period end date must be on or after the start date.'); setStep(0); return; }
    setSaving(true); setError('');
    let reportWasSaved = false;
    try {
      const payload = { ...data, project_id: data.project_id || null, site_location_id: data.site_location_id || null, prepared_by_employee_id: data.prepared_by_employee_id || null, equipment_asset_ids: equipmentIds, manpower_requirements: data.manpower_requirements?.trim() ? [{ recommendation: data.manpower_requirements.trim() }] : [], equipment_fleet: (data.equipment_fleet || []).map((row: ReportRow) => ({ ...row, asset_id: row.asset_id === '__CUSTOM__' ? null : row.asset_id })), maintenance_assessment: (data.maintenance_assessment || []).map((row: ReportRow) => ({ ...row, asset_id: row.asset_id === '__CUSTOM__' ? null : row.asset_id })) };
      let reportId = record?.id || createdRecordId;
      if (reportId) { await apiFetch(`/api/v1/maintenance-assessments/${reportId}`, { method: 'PATCH', body: JSON.stringify(payload) }); reportWasSaved = true; }
      else {
        const created = await apiFetch<any>('/api/v1/maintenance-assessments', { method: 'POST', body: JSON.stringify(payload) });
        reportId = created.id;
        reportWasSaved = true;
        setCreatedRecordId(reportId);
      }
      for (const file of pendingFiles) {
        const form = new FormData();
        form.append('file', file);
        form.append('title', file.name);
        form.append('category', 'Equipment');
        form.append('source_type', 'maintenance_assessment');
        form.append('source_id', reportId);
        form.append('visibility', 'PUBLIC');
        await apiFetch('/api/v1/documents', { method: 'POST', body: form });
        setPendingFiles((files) => files.filter((pending) => pending !== file));
      }
      onSaved(); onClose();
    } catch (err: any) { setError(`${err?.message || 'Could not save maintenance assessment report.'}${reportWasSaved ? ' The report was saved; retry to upload any remaining attachments.' : ''}`); }
    finally { setSaving(false); }
  }

  const footer = <div className="flex w-full items-center justify-between gap-2">
    {mode === 'ASSISTED' && step > 0 ? <button type="button" className="btn-secondary text-xs" onClick={() => setStep(step - 1)}>Back</button> : <span />}
    <div className="flex items-center gap-2">{mode === 'ASSISTED' && step < steps.length - 1 && <button type="button" className="btn-primary text-xs" onClick={() => setStep(step + 1)}>Next</button>}<button type="button" className="btn-primary text-xs" onClick={() => void save()} disabled={saving}>{saving ? 'Saving…' : record ? 'Save changes' : 'Save assessment'}</button></div>
  </div>;

  return <Modal title={`${record ? 'Edit' : 'New'} Maintenance Assessment Report`} onClose={onClose} className="sm:!h-[90vh] sm:!max-h-[90vh] sm:!max-w-6xl" footer={footer}>
    <div className="space-y-4 text-xs">
      <div className="flex border-b" role="tablist" aria-label="Maintenance assessment form mode">
        {(['ASSISTED', 'FREE_FLOW'] as const).map((view) => <button type="button" key={view} role="tab" aria-selected={mode === view} onClick={() => setMode(view)} className={`border-b-2 px-4 py-2 font-bold ${mode === view ? 'border-primary text-primary' : 'border-transparent text-muted-foreground'}`}>{view === 'ASSISTED' ? 'Assisted' : 'Free flow'}</button>)}
      </div>
      {error && <div role="alert" className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-red-800">{error}</div>}
      {mode === 'ASSISTED' && <div className="flex flex-wrap gap-1.5">{steps.map((item, index) => <button key={item.title} type="button" onClick={() => setStep(index)} className={`rounded-full border px-2.5 py-1 text-[11px] font-semibold ${step === index ? 'border-blue-800 bg-blue-800 text-white' : 'text-muted-foreground'}`}>{index + 1}. {item.title}</button>)}</div>}
      <div className={`max-h-[64vh] space-y-6 overflow-y-auto p-1 ${mode === 'FREE_FLOW' ? 'bg-slate-100 p-2 sm:p-4' : ''}`}>{mode === 'ASSISTED' ? steps[step].body : steps.map((item) => <section key={item.title} className="space-y-4 bg-white p-3 text-slate-900 shadow sm:p-4"><h2 className={sectionHeadingClass}>{item.title}</h2>{item.body}</section>)}</div>
    </div>
  </Modal>;
}
