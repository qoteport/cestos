'use client';

import { useRef, useState } from 'react';
import { apiFetch } from '@/lib/api';
import type { ComponentProps } from 'react';
import MaintenanceImportGate, { type SaveImportFiles } from './MaintenanceImportGate';
import { Modal } from './DataUI';
import SearchableSelect from './SearchableSelect';
import TrackerDetailsModal from './TrackerDetailsModal';

const fields = [
  ['equipment', 'Equipment'], ['unit_number', 'Unit no.'], ['equipment_type', 'Type'], ['status', 'Status'],
  ['open_defects', 'Open defects'], ['action_required', 'Action required'], ['priority', 'Priority'], ['remarks', 'Remarks'],
] as const;
const statusOptions = ['Operational / Monitoring', 'Under Assessment', 'Operational / PM', 'Out of Service'];
const priorityOptions = ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'];

function EquipmentRow({ data, setData, assets, mode }: { data: any; setData: (value: any) => void; assets: any[]; mode: 'ASSISTED' | 'FREE_FLOW' }) {
  const [customEquipment, setCustomEquipment] = useState(Boolean(data.equipment && !data.asset_id));
  const [customStatus, setCustomStatus] = useState(Boolean(data.status && !statusOptions.includes(data.status)));
  const [customPriority, setCustomPriority] = useState(Boolean(data.priority && !priorityOptions.includes(data.priority)));
  const set = (key: string, value: any) => setData((old: any) => ({ ...old, [key]: value }));
  const assetOptions = [{ value: '__CUSTOM__', label: 'Enter a custom equipment name…' }, ...assets.map((a) => ({ value: String(a.id), label: a.name || a.asset_name || a.asset_number || 'Equipment', sublabel: a.asset_number || '' }))];
  const input = (key: string, label: string) => <label key={key} className="block space-y-1.5"><span className="block text-xs font-semibold text-slate-700">{label}{key === 'equipment' ? ' *' : ''}</span>{['open_defects', 'action_required', 'remarks'].includes(key) ? <textarea className={`input-field min-h-24 w-full border-slate-300 focus-visible:ring-2 focus-visible:ring-[#184877] ${mode === 'FREE_FLOW' ? 'rounded-none' : 'rounded-xl'}`} value={data[key] || ''} onChange={(e) => set(key, e.target.value)} /> : <input className={`input-field w-full border-slate-300 focus-visible:ring-2 focus-visible:ring-[#184877] ${mode === 'FREE_FLOW' ? 'rounded-none' : 'rounded-xl'}`} value={data[key] || ''} onChange={(e) => set(key, e.target.value)} />}</label>;
  const equipmentControl = customEquipment ? <div className="space-y-1"><input className="input-field w-full rounded-xl" value={data.equipment || ''} placeholder="Enter equipment name" onChange={(e) => set('equipment', e.target.value)} /><button type="button" className="text-primary underline" onClick={() => { setCustomEquipment(false); set('equipment', ''); set('unit_number', ''); set('asset_id', null); }}>Choose registered equipment</button></div> : <SearchableSelect options={assetOptions} value={data.asset_id || ''} onChange={(value, option) => { if (value === '__CUSTOM__') { setCustomEquipment(true); set('asset_id', null); set('equipment', ''); set('unit_number', ''); } else { const asset = assets.find((a) => String(a.id) === String(value)); set('asset_id', value); set('equipment', option?.label || ''); set('unit_number', asset?.asset_number || asset?.unit_number || ''); set('equipment_type', asset?.category || asset?.asset_type || asset?.equipment_type || data.equipment_type || ''); } }} placeholder="Search equipment or enter custom" />;
  const choice = (key: 'status' | 'priority', label: string, choices: string[], isCustom: boolean, setCustom: (value: boolean) => void) => {
    const options = [
      { value: '__CUSTOM__', label: `Enter a custom ${label.toLowerCase()}â€¦` },
      ...choices.map((c) => ({ value: c, label: c })),
    ];
    return (
      <label className="block space-y-1">
        <span className="block font-medium">{label}</span>
        {mode === 'FREE_FLOW' ? (
          <input className="input-field w-full rounded-none" value={data[key] || ''} onChange={(e) => set(key, e.target.value)} />
        ) : isCustom ? (
          <div className="space-y-1">
            <input className="input-field w-full rounded-xl" value={data[key] || ''} onChange={(e) => set(key, e.target.value)} />
            <button type="button" className="text-primary underline" onClick={() => { setCustom(false); set(key, choices[0]); }}>
              Choose a listed value
            </button>
          </div>
        ) : (
          <SearchableSelect
            options={options}
            value={data[key] || choices[0]}
            onChange={(value) => {
              if (value === '__CUSTOM__') {
                setCustom(true);
                set(key, '');
              } else {
                set(key, value);
              }
            }}
          />
        )}
      </label>
    );
  };
  return <section className={`overflow-hidden border border-slate-900 ${mode === 'FREE_FLOW' ? 'rounded-none' : 'rounded-2xl'}`}><h3 className="bg-[#184877] px-3 py-2 text-center text-xs font-bold uppercase tracking-wide text-white">Equipment details and condition</h3><div className={`grid gap-x-5 gap-y-4 p-4 md:grid-cols-2 ${mode === 'FREE_FLOW' ? 'bg-slate-100' : 'bg-white'}`}>{mode === 'ASSISTED' ? <><label className="block space-y-1.5"><span className="block text-xs font-semibold text-slate-700">Equipment *</span>{equipmentControl}</label>{input('unit_number', 'Unit No.')}{input('equipment_type', 'Type')}{choice('status', 'Status', statusOptions, customStatus, setCustomStatus)}{input('open_defects', 'Open Defects')}{input('action_required', 'Action Required')}{choice('priority', 'Priority', priorityOptions, customPriority, setCustomPriority)}{input('remarks', 'Remarks')}</> : fields.map(([key, label]) => input(key, label))}</div></section>;
}

function EquipmentRegisterWizardForm({ saveImportFiles, projectId, assets, record, onClose, onSaved, initialMode = 'FREE_FLOW' }: {
  saveImportFiles?: SaveImportFiles;
  projectId: string; assets: any[]; record?: any; onClose: () => void; onSaved: (recordId?: string) => void; initialMode?: 'ASSISTED' | 'FREE_FLOW';
}) {
  const [mode, setMode] = useState<'ASSISTED' | 'FREE_FLOW'>(initialMode);
  const [rows, setRows] = useState<any[]>(() => (Array.isArray(record) ? record : [record || {}]).map((row: any) => ({ equipment: '', unit_number: '', equipment_type: '', status: 'Operational / Monitoring', open_defects: '', action_required: '', priority: 'MEDIUM', remarks: '', ...row })));
  const savedIds = useRef<Record<number, string>>({});
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [progress, setProgress] = useState('');
  async function save() {
    const invalid = rows.findIndex((row) => !String(row.equipment || '').trim());
    if (invalid >= 0) { setError(`Equipment is required in row ${invalid + 1}.`); return; }
    setSaving(true); setError('');
    let completed = 0;
    try {
      for (const [index, row] of rows.entries()) {
        setProgress(`Saving ${index + 1} of ${rows.length}…`);
        const id = savedIds.current[index] || row.id;
        const saved = await apiFetch<any>(id ? `/api/v1/equipment-register/${id}` : '/api/v1/equipment-register', { method: id ? 'PATCH' : 'POST', body: JSON.stringify({ ...row, project_id: projectId || null, asset_id: row.asset_id || null, priority: row.priority || 'MEDIUM' }) });
        savedIds.current[index] = saved.id;
        await saveImportFiles?.(saved.id);
        completed += 1;
      }
      onSaved(savedIds.current[0]); onClose();
    } catch (e: any) { setError(`${completed} of ${rows.length} entries completed. ${e?.message || 'Could not save equipment register.'} Save again to retry; saved entries will be updated.`); }
    finally { setSaving(false); setProgress(''); }
  }
  return <Modal title={`${record?.id ? 'Edit' : 'New'} equipment register`} onClose={onClose} className="sm:!h-[90vh] sm:!max-h-[90vh] sm:!max-w-5xl" footer={<div className="flex w-full justify-between gap-2"><span className="text-xs text-slate-500">{rows.length} equipment {rows.length === 1 ? 'entry' : 'entries'} · Required fields are marked *</span><button type="button" className="btn-primary rounded-xl bg-[#184877]" onClick={() => void save()} disabled={saving}>{saving ? progress || 'Saving…' : rows.length > 1 ? `Save all ${rows.length} entries` : record?.id ? 'Save changes' : 'Save register entry'}</button></div>}>
    <div className="space-y-4 text-sm">
      <div className="flex border-b" role="tablist" aria-label="Equipment register form mode">{(['FREE_FLOW', 'ASSISTED'] as const).map((value) => <button key={value} type="button" role="tab" aria-selected={mode === value} onClick={() => setMode(value)} className={`border-b-2 px-4 py-2 text-xs font-bold uppercase tracking-wide ${mode === value ? 'border-[#184877] text-[#184877]' : 'border-transparent text-muted-foreground'}`}>{value === 'FREE_FLOW' ? 'Free flow' : 'Assisted'}</button>)}</div>
      {error && <div role="alert" className="rounded-xl border border-red-200 bg-red-50 p-3 text-red-800">{error}</div>}
      <fieldset disabled={saving} className="space-y-6">
        {rows.map((row, index) => <div key={index} className="space-y-2"><h2 className="font-semibold">{index + 1}. {row.equipment || 'Equipment'}</h2><EquipmentRow data={row} assets={assets} mode={mode} setData={(update) => setRows((current) => current.map((item, position) => position === index ? typeof update === 'function' ? update(item) : update : item))} /></div>)}
      </fieldset>
    </div>
  </Modal>;
}

export function EquipmentRegisterDetails({ record, onClose, onEdit }: { record: any; onClose: () => void; onEdit: () => void }) {
  return <TrackerDetailsModal title="Equipment register details" fields={fields.map(([key, label]) => [label, record[key]])} onClose={onClose} onEdit={onEdit} recordId={String(record.id)} importSourceType="equipment_register_import" />;
}

export default function EquipmentRegisterWizard(props: Omit<ComponentProps<typeof EquipmentRegisterWizardForm>, 'saveImportFiles'>) {
  return <MaintenanceImportGate kind="equipment" record={props.record} assets={props.assets} onClose={props.onClose}>{(draft, saveImportFiles) => <EquipmentRegisterWizardForm {...props} record={draft} saveImportFiles={saveImportFiles} />}</MaintenanceImportGate>;
}
