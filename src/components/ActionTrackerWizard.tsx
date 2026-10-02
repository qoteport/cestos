'use client';

import { useState } from 'react';
import { apiFetch } from '@/lib/api';
import type { ComponentProps } from 'react';
import MaintenanceImportGate, { type SaveImportFiles } from './MaintenanceImportGate';
import { Modal } from './DataUI';
import SearchableSelect from './SearchableSelect';
import TrackerDetailsModal from './TrackerDetailsModal';

const today = new Date().toISOString().slice(0, 10);
const fields = [
  ['action_date', 'Date'], ['equipment_area', 'Equipment / area'], ['issue_finding', 'Issue / finding'],
  ['action_taken', 'Action taken'], ['parts_required', 'Parts required'], ['responsible_name', 'Responsible'],
  ['priority', 'Priority'], ['status', 'Status'], ['completion_date', 'Completion date'], ['remarks', 'Remarks'],
] as const;

function ActionTrackerWizardForm({ saveImportFiles, projectId, assets, employees, record, onClose, onSaved, initialMode = 'FREE_FLOW' }: {
  saveImportFiles?: SaveImportFiles;
  projectId: string; assets: any[]; employees: any[]; record?: any; onClose: () => void; onSaved: (recordId?: string) => void; initialMode?: 'ASSISTED' | 'FREE_FLOW';
}) {
  const [savedRecordId, setSavedRecordId] = useState<string>(record?.id || '');
  const [mode, setMode] = useState<'ASSISTED' | 'FREE_FLOW'>(initialMode);
  const [data, setData] = useState<any>(() => ({ action_date: today, equipment_area: '', issue_finding: '', action_taken: '', parts_required: '', responsible_name: '', priority: 'MEDIUM', status: 'OPEN', completion_date: '', remarks: '', ...record }));
  const [customEquipment, setCustomEquipment] = useState(Boolean(record?.equipment_area && !record?.asset_id));
  const [customResponsible, setCustomResponsible] = useState(Boolean(record?.responsible_name && !record?.responsible_employee_id));
  const [customStatus, setCustomStatus] = useState(Boolean(record?.status && !['OPEN', 'IN_PROGRESS', 'COMPLETED', 'ON_HOLD', 'CANCELLED'].includes(record.status)));
  const [customPriority, setCustomPriority] = useState(Boolean(record?.priority && !['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'].includes(record.priority)));
  const [saving, setSaving] = useState(false); const [error, setError] = useState('');
  const set = (key: string, value: any) => setData((old: any) => ({ ...old, [key]: value }));
  const assetOptions = [{ value: '__CUSTOM__', label: 'Enter a custom equipment / areaâ€¦' }, ...assets.map((a) => ({ value: String(a.id), label: a.name || a.asset_name || a.asset_number || 'Equipment', sublabel: a.asset_number || '' }))];
  const employeeOptions = [{ value: '__CUSTOM__', label: 'Enter a custom responsible personâ€¦' }, ...employees.map((e) => ({ value: String(e.id), label: [e.first_name, e.last_name].filter(Boolean).join(' ') || e.name || 'Employee', sublabel: e.employee_number || e.position_name || '' }))];
  async function save() {
    if (!data.action_date || !String(data.equipment_area || '').trim() || !String(data.issue_finding || '').trim()) { setError('Date, Equipment / Area, and Issue / Finding are required.'); return; }
    setSaving(true); setError('');
    const payload = { ...data, project_id: projectId || null, asset_id: data.asset_id || null, responsible_employee_id: data.responsible_employee_id || null, completion_date: data.completion_date || null };
    try {
      const saved = await apiFetch<any>(savedRecordId ? `/api/v1/action-tracker/${savedRecordId}` : '/api/v1/action-tracker', { method: savedRecordId ? 'PATCH' : 'POST', body: JSON.stringify(payload) });
      setSavedRecordId(saved.id); await saveImportFiles?.(saved.id); onSaved(saved.id); onClose();
    } catch (e: any) { setError(e?.message || 'Could not save action tracker entry.'); }
    finally { setSaving(false); }
  }
  const priorityOptions = [
    { value: '__CUSTOM__', label: 'Enter a custom priorityâ€¦' },
    { value: 'LOW', label: 'LOW' },
    { value: 'MEDIUM', label: 'MEDIUM' },
    { value: 'HIGH', label: 'HIGH' },
    { value: 'CRITICAL', label: 'CRITICAL' },
  ];
  const statusOptions = [
    { value: '__CUSTOM__', label: 'Enter a custom statusâ€¦' },
    { value: 'OPEN', label: 'OPEN' },
    { value: 'IN_PROGRESS', label: 'IN PROGRESS' },
    { value: 'COMPLETED', label: 'COMPLETED' },
    { value: 'ON_HOLD', label: 'ON HOLD' },
    { value: 'CANCELLED', label: 'CANCELLED' },
  ];
  const input = (key: string, label: string) => (
    <label key={key} className="block space-y-1.5">
      <span className="block text-xs font-semibold text-slate-700">
        {label}{['action_date', 'equipment_area', 'issue_finding'].includes(key) ? ' *' : ''}
      </span>
      {['issue_finding', 'action_taken', 'parts_required', 'remarks'].includes(key) ? (
        <textarea
          className={`input-field min-h-24 w-full border-slate-300 focus-visible:ring-2 focus-visible:ring-[#184877] ${mode === 'FREE_FLOW' ? 'rounded-none' : 'rounded-xl'}`}
          value={data[key] || ''}
          onChange={(e) => set(key, e.target.value)}
        />
      ) : key === 'status' && mode === 'ASSISTED' ? (
        customStatus ? (
          <div className="space-y-1">
            <input
              autoFocus
              className="input-field w-full rounded-xl border-slate-300 focus-visible:ring-2 focus-visible:ring-[#184877]"
              value={data.status || ''}
              placeholder="Enter custom status"
              onChange={(e) => set('status', e.target.value)}
            />
            <button
              type="button"
              className="text-xs text-primary underline"
              onClick={() => {
                setCustomStatus(false);
                set('status', 'OPEN');
              }}
            >
              Choose a listed status
            </button>
          </div>
        ) : (
          <SearchableSelect
            options={statusOptions}
            value={data.status || 'OPEN'}
            onChange={(val) => {
              if (val === '__CUSTOM__') {
                setCustomStatus(true);
                set('status', '');
              } else {
                set('status', val);
              }
            }}
            placeholder="Select status or enter custom"
          />
        )
      ) : key === 'priority' && mode === 'ASSISTED' ? (
        customPriority ? (
          <div className="space-y-1">
            <input
              autoFocus
              className="input-field w-full rounded-xl border-slate-300 focus-visible:ring-2 focus-visible:ring-[#184877]"
              value={data.priority || ''}
              placeholder="Enter custom priority"
              onChange={(e) => set('priority', e.target.value)}
            />
            <button
              type="button"
              className="text-xs text-primary underline"
              onClick={() => {
                setCustomPriority(false);
                set('priority', 'MEDIUM');
              }}
            >
              Choose a listed priority
            </button>
          </div>
        ) : (
          <SearchableSelect
            options={priorityOptions}
            value={data.priority || 'MEDIUM'}
            onChange={(val) => {
              if (val === '__CUSTOM__') {
                setCustomPriority(true);
                set('priority', '');
              } else {
                set('priority', val);
              }
            }}
            placeholder="Select priority or enter custom"
          />
        )
      ) : (
        <input
          className={`input-field w-full border-slate-300 opacity-100 font-medium focus-visible:ring-2 focus-visible:ring-[#184877] ${mode === 'FREE_FLOW' ? 'rounded-none' : 'rounded-xl'}`}
          type={key.includes('date') ? 'date' : 'text'}
          value={data[key] || ''}
          onChange={(e) => set(key, e.target.value)}
        />
      )}
    </label>
  );
  const assistedEquipment = customEquipment ? <div className="space-y-1"><input className="input-field w-full rounded-xl" value={data.equipment_area || ''} placeholder="Enter equipment or area" onChange={(e) => set('equipment_area', e.target.value)} /><button type="button" className="text-primary underline" onClick={() => { setCustomEquipment(false); set('equipment_area', ''); set('asset_id', ''); }}>Choose registered equipment</button></div> : <SearchableSelect options={assetOptions} value={data.asset_id || ''} onChange={(value, option) => { if (value === '__CUSTOM__') { setCustomEquipment(true); set('asset_id', null); set('equipment_area', ''); } else { set('asset_id', value); set('equipment_area', option?.label || ''); } }} placeholder="Search equipment or enter custom" />;
  const assistedResponsible = customResponsible ? <div className="space-y-1"><input className="input-field w-full rounded-xl" value={data.responsible_name || ''} placeholder="Enter responsible person" onChange={(e) => set('responsible_name', e.target.value)} /><button type="button" className="text-primary underline" onClick={() => { setCustomResponsible(false); set('responsible_name', ''); }}>Choose an employee</button></div> : <SearchableSelect options={employeeOptions} value={data.responsible_employee_id || ''} onChange={(value, option) => { if (value === '__CUSTOM__') { setCustomResponsible(true); set('responsible_employee_id', null); set('responsible_name', ''); } else { set('responsible_employee_id', value); set('responsible_name', option?.label || ''); } }} placeholder="Search employees or enter custom" />;
  return <Modal title={`${record?.id ? 'Edit' : 'New'} action tracker`} onClose={onClose} className="sm:!h-[90vh] sm:!max-h-[90vh] sm:!max-w-5xl" footer={<div className="flex w-full justify-between gap-2"><span className="text-xs text-slate-500">Required fields are marked *</span><button type="button" className="btn-primary inline-flex items-center gap-2 rounded-xl bg-[#184877]" onClick={() => void save()} disabled={saving}>{saving ? 'Savingâ€¦' : record?.id ? 'Save changes' : 'Save action'}</button></div>}>
    <div className="space-y-4 text-sm"><div className="flex border-b" role="tablist" aria-label="Action tracker form mode">{(['FREE_FLOW', 'ASSISTED'] as const).map((v) => <button key={v} type="button" role="tab" aria-selected={mode === v} onClick={() => setMode(v)} className={`border-b-2 px-4 py-2 text-xs font-bold uppercase tracking-wide ${mode === v ? 'border-[#184877] text-[#184877]' : 'border-transparent text-muted-foreground'}`}>{v === 'ASSISTED' ? 'Assisted' : 'Free flow'}</button>)}</div>{error && <div role="alert" className="border border-red-200 bg-red-50 p-3 text-red-800 rounded-xl">{error}</div>}<section className={`overflow-hidden border border-slate-900 ${mode === 'FREE_FLOW' ? 'rounded-none' : 'rounded-2xl'}`}><h3 className="bg-[#184877] px-3 py-2 text-center text-xs font-bold uppercase tracking-wide text-white">Action details</h3><div className={`grid gap-x-5 gap-y-4 p-4 md:grid-cols-2 ${mode === 'FREE_FLOW' ? 'bg-slate-100' : 'bg-white'}`}>{mode === 'ASSISTED' ? <>{input('action_date', 'Date')}<label className="block space-y-1.5"><span className="block text-xs font-semibold text-slate-700">Equipment / Area *</span>{assistedEquipment}</label>{input('issue_finding', 'Issue / Finding')}{input('action_taken', 'Action Taken')}{input('parts_required', 'Parts Required')}<label className="block space-y-1.5"><span className="block text-xs font-semibold text-slate-700">Responsible</span>{assistedResponsible}</label>{input('priority', 'Priority')}{input('status', 'Status')}{input('completion_date', 'Completion Date')}{input('remarks', 'Remarks')}</> : fields.map(([key, label]) => input(key, label))}</div></section></div>
  </Modal>;
}

export function ActionTrackerDetails({ record, onClose, onEdit }: { record: any; onClose: () => void; onEdit: () => void }) {
  const values: Array<[string, unknown]> = fields.map(([key, label]) => [label, record[key] || 'â€”']);
  return <TrackerDetailsModal title="Action tracker details" fields={values} onClose={onClose} onEdit={onEdit} recordId={String(record.id)} importSourceType="action_tracker_import" />;
}

export default function ActionTrackerWizard(props: Omit<ComponentProps<typeof ActionTrackerWizardForm>, 'saveImportFiles'>) {
  return <MaintenanceImportGate kind="action" record={props.record} assets={props.assets} employees={props.employees} onClose={props.onClose}>{(draft, saveImportFiles) => <ActionTrackerWizardForm {...props} record={draft} saveImportFiles={saveImportFiles} />}</MaintenanceImportGate>;
}
