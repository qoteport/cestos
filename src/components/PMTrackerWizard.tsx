'use client';

import { useState } from 'react';
import { apiFetch } from '@/lib/api';
import { Modal } from './DataUI';
import SearchableSelect from './SearchableSelect';
import TrackerDetailsModal from './TrackerDetailsModal';

const today = new Date().toISOString().slice(0, 10);
const fields = [
  ['equipment', 'Equipment'], ['service_type', 'Service type'], ['due_date', 'Due date'],
  ['planned_actual', 'Planned/actual'], ['pm_completed', 'PM completed'], ['defects_found', 'Defects found'],
  ['parts_required', 'Parts required'], ['technician_name', 'Technician'], ['remarks', 'Remarks'],
] as const;

export default function PMTrackerWizard({ projectId, assets, employees, record, onClose, onSaved }: {
  projectId: string; assets: any[]; employees: any[]; record?: any; onClose: () => void; onSaved: () => void;
}) {
  const [mode, setMode] = useState<'ASSISTED' | 'FREE_FLOW'>('ASSISTED');
  const [data, setData] = useState<any>(() => ({ equipment: '', service_type: '', due_date: today, planned_actual: 'PLANNED', pm_completed: false, defects_found: '', parts_required: '', technician_name: '', remarks: '', ...record }));
  const [customEquipment, setCustomEquipment] = useState(Boolean(record?.equipment && !record?.asset_id));
  const [customTechnician, setCustomTechnician] = useState(Boolean(record?.technician_name && !record?.technician_employee_id));
  const [saving, setSaving] = useState(false); const [error, setError] = useState('');
  const set = (key: string, value: any) => setData((old: any) => ({ ...old, [key]: value }));
  const assetOptions = [{ value: '__CUSTOM__', label: 'Enter a custom equipment name…' }, ...assets.map((a) => ({ value: String(a.id), label: a.name || a.asset_name || a.asset_number || 'Equipment', sublabel: a.asset_number || '' }))];
  const employeeOptions = [{ value: '__CUSTOM__', label: 'Enter a custom technician…' }, ...employees.map((e) => ({ value: String(e.id), label: [e.first_name, e.last_name].filter(Boolean).join(' ') || e.name || 'Employee', sublabel: e.employee_number || e.position_name || '' }))];
  async function save() {
    if (!String(data.equipment || '').trim() || !String(data.service_type || '').trim() || !data.due_date) { setError('Equipment, Service Type, and Due Date are required.'); return; }
    setSaving(true); setError('');
    const payload = { ...data, project_id: projectId || null, asset_id: data.asset_id || null, technician_employee_id: data.technician_employee_id || null, pm_completed: typeof data.pm_completed === 'string' ? /^(yes|true|completed|1)$/i.test(data.pm_completed.trim()) : Boolean(data.pm_completed) };
    try { await apiFetch(record?.id ? `/api/v1/pm-tracker/${record.id}` : '/api/v1/pm-tracker', { method: record?.id ? 'PATCH' : 'POST', body: JSON.stringify(payload) }); onSaved(); onClose(); }
    catch (e: any) { setError(e?.message || 'Could not save PM tracker entry.'); }
    finally { setSaving(false); }
  }
  const plannedActualOptions = [{ value: 'PLANNED', label: 'Planned' }, { value: 'ACTUAL', label: 'Actual' }];
  const pmCompletedOptions = [{ value: 'false', label: 'No' }, { value: 'true', label: 'Yes' }];
  const input = (key: string, label: string) => (
    <label key={key} className="block space-y-1.5">
      <span className="block text-xs font-semibold text-slate-700">
        {label}{['equipment', 'service_type', 'due_date'].includes(key) ? ' *' : ''}
      </span>
      {key === 'defects_found' || key === 'parts_required' || key === 'remarks' ? (
        <textarea
          className="input-field min-h-24 w-full rounded-none border-slate-300 focus-visible:ring-2 focus-visible:ring-[#184877]"
          value={data[key] || ''}
          onChange={(e) => set(key, e.target.value)}
        />
      ) : key === 'planned_actual' && mode === 'ASSISTED' ? (
        <SearchableSelect options={plannedActualOptions} value={data[key] || 'PLANNED'} onChange={(val) => set(key, val)} />
      ) : key === 'pm_completed' ? (
        mode === 'ASSISTED' ? (
          <SearchableSelect options={pmCompletedOptions} value={data[key] ? 'true' : 'false'} onChange={(val) => set(key, val === 'true')} />
        ) : (
          <input
            className="input-field w-full rounded-none border-slate-300 focus-visible:ring-2 focus-visible:ring-[#184877]"
            value={data[key] ? 'Yes' : 'No'}
            onChange={(e) => set(key, e.target.value)}
            placeholder="Yes or No"
          />
        )
      ) : (
        <input
          className="input-field w-full rounded-none border-slate-300 opacity-100 font-medium focus-visible:ring-2 focus-visible:ring-[#184877]"
          type={key === 'due_date' ? 'date' : 'text'}
          value={data[key] || ''}
          onChange={(e) => set(key, e.target.value)}
        />
      )}
    </label>
  );
  const equipmentControl = customEquipment ? <div className="space-y-1"><input className="input-field w-full" value={data.equipment || ''} placeholder="Enter equipment" onChange={(e) => set('equipment', e.target.value)} /><button type="button" className="text-primary underline" onClick={() => { setCustomEquipment(false); set('equipment', ''); set('asset_id', null); }}>Choose registered equipment</button></div> : <SearchableSelect options={assetOptions} value={data.asset_id || ''} onChange={(value, option) => { if (value === '__CUSTOM__') { setCustomEquipment(true); set('asset_id', null); set('equipment', ''); } else { set('asset_id', value); set('equipment', option?.label || ''); } }} placeholder="Search equipment or enter custom" />;
  const technicianControl = customTechnician ? <div className="space-y-1"><input className="input-field w-full" value={data.technician_name || ''} placeholder="Enter technician" onChange={(e) => set('technician_name', e.target.value)} /><button type="button" className="text-primary underline" onClick={() => { setCustomTechnician(false); set('technician_name', ''); }}>Choose an employee</button></div> : <SearchableSelect options={employeeOptions} value={data.technician_employee_id || ''} onChange={(value, option) => { if (value === '__CUSTOM__') { setCustomTechnician(true); set('technician_employee_id', null); set('technician_name', ''); } else { set('technician_employee_id', value); set('technician_name', option?.label || ''); } }} placeholder="Search employees or enter custom" />;
  return <Modal title={`${record ? 'Edit' : 'New'} PM tracker`} onClose={onClose} className="sm:!h-[90vh] sm:!max-h-[90vh] sm:!max-w-5xl" footer={<div className="flex w-full justify-between gap-2"><span className="text-xs text-slate-500">Required fields are marked *</span><button type="button" className="btn-primary inline-flex items-center gap-2 rounded-none bg-[#184877]" onClick={() => void save()} disabled={saving}>{saving ? 'Saving…' : record ? 'Save changes' : 'Save PM record'}</button></div>}>
    <div className="space-y-4 text-sm"><div className="flex border-b" role="tablist" aria-label="PM tracker form mode">{(['ASSISTED', 'FREE_FLOW'] as const).map((v) => <button key={v} type="button" role="tab" aria-selected={mode === v} onClick={() => setMode(v)} className={`border-b-2 px-4 py-2 text-xs font-bold uppercase tracking-wide ${mode === v ? 'border-[#184877] text-[#184877]' : 'border-transparent text-muted-foreground'}`}>{v === 'ASSISTED' ? 'Assisted' : 'Free flow'}</button>)}</div>{error && <div role="alert" className="border border-red-200 bg-red-50 p-3 text-red-800">{error}</div>}<section className="overflow-hidden border border-slate-900"><h3 className="bg-[#184877] px-3 py-2 text-center text-xs font-bold uppercase tracking-wide text-white">PM schedule and completion</h3><div className={`grid gap-x-5 gap-y-4 p-4 md:grid-cols-2 ${mode === 'FREE_FLOW' ? 'bg-slate-100' : 'bg-white'}`}>{mode === 'ASSISTED' ? <><label className="block space-y-1.5"><span className="block text-xs font-semibold text-slate-700">Equipment *</span>{equipmentControl}</label>{input('service_type', 'Service Type')}{input('due_date', 'Due Date')}{input('planned_actual', 'Planned/Actual')}{input('pm_completed', 'PM Completed')}{input('defects_found', 'Defects Found')}{input('parts_required', 'Parts Required')}<label className="block space-y-1.5"><span className="block text-xs font-semibold text-slate-700">Technician</span>{technicianControl}</label>{input('remarks', 'Remarks')}</> : fields.map(([key, label]) => input(key, label))}</div></section></div>
  </Modal>;
}

export function PMTrackerDetails({ record, onClose, onEdit }: { record: any; onClose: () => void; onEdit: () => void }) {
  const values: Array<[string, unknown]> = fields.map(([key, label]) => [label, key === 'pm_completed' ? (record[key] ? 'Yes' : 'No') : key === 'planned_actual' ? String(record[key] || '').replace('_', ' ') : record[key] || '—']);
  return <TrackerDetailsModal title="PM tracker details" fields={values} onClose={onClose} onEdit={onEdit} />;
}
