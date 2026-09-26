'use client';

import { useState } from 'react';
import { apiFetch } from '@/lib/api';
import { Modal } from './DataUI';
import SearchableSelect from './SearchableSelect';
import TrackerDetailsModal from './TrackerDetailsModal';

const fields = [
  ['equipment', 'Equipment'], ['unit_number', 'Unit no.'], ['equipment_type', 'Type'], ['status', 'Status'],
  ['open_defects', 'Open defects'], ['action_required', 'Action required'], ['priority', 'Priority'], ['remarks', 'Remarks'],
] as const;
const statusOptions = ['Operational / Monitoring', 'Under Assessment', 'Operational / PM', 'Out of Service'];
const priorityOptions = ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'];

export default function EquipmentRegisterWizard({ projectId, assets, record, onClose, onSaved }: {
  projectId: string; assets: any[]; record?: any; onClose: () => void; onSaved: () => void;
}) {
  const [mode, setMode] = useState<'ASSISTED' | 'FREE_FLOW'>('ASSISTED');
  const [data, setData] = useState<any>(() => ({ equipment: '', unit_number: '', equipment_type: '', status: 'Operational / Monitoring', open_defects: '', action_required: '', priority: 'MEDIUM', remarks: '', ...record }));
  const [customEquipment, setCustomEquipment] = useState(Boolean(record?.equipment && !record?.asset_id));
  const [customStatus, setCustomStatus] = useState(Boolean(record?.status && !statusOptions.includes(record.status)));
  const [customPriority, setCustomPriority] = useState(Boolean(record?.priority && !priorityOptions.includes(record.priority)));
  const [saving, setSaving] = useState(false); const [error, setError] = useState('');
  const set = (key: string, value: any) => setData((old: any) => ({ ...old, [key]: value }));
  const assetOptions = [{ value: '__CUSTOM__', label: 'Enter a custom equipment name…' }, ...assets.map((a) => ({ value: String(a.id), label: a.name || a.asset_name || a.asset_number || 'Equipment', sublabel: a.asset_number || '' }))];
  async function save() {
    if (!String(data.equipment || '').trim()) { setError('Equipment is required.'); return; }
    setSaving(true); setError('');
    const payload = { ...data, project_id: projectId || null, asset_id: data.asset_id || null, priority: data.priority || 'MEDIUM' };
    try { await apiFetch(record?.id ? `/api/v1/equipment-register/${record.id}` : '/api/v1/equipment-register', { method: record?.id ? 'PATCH' : 'POST', body: JSON.stringify(payload) }); onSaved(); onClose(); }
    catch (e: any) { setError(e?.message || 'Could not save equipment register entry.'); }
    finally { setSaving(false); }
  }
  const input = (key: string, label: string) => <label key={key} className="block space-y-1.5"><span className="block text-xs font-semibold text-slate-700">{label}{key === 'equipment' ? ' *' : ''}</span>{['open_defects', 'action_required', 'remarks'].includes(key) ? <textarea className="input-field min-h-24 w-full rounded-xl border-slate-300 focus-visible:ring-2 focus-visible:ring-[#184877]" value={data[key] || ''} onChange={(e) => set(key, e.target.value)} /> : <input className="input-field w-full rounded-xl border-slate-300 focus-visible:ring-2 focus-visible:ring-[#184877]" value={data[key] || ''} onChange={(e) => set(key, e.target.value)} />}</label>;
  const equipmentControl = customEquipment ? <div className="space-y-1"><input className="input-field w-full rounded-xl" value={data.equipment || ''} placeholder="Enter equipment name" onChange={(e) => set('equipment', e.target.value)} /><button type="button" className="text-primary underline" onClick={() => { setCustomEquipment(false); set('equipment', ''); set('unit_number', ''); set('asset_id', null); }}>Choose registered equipment</button></div> : <SearchableSelect options={assetOptions} value={data.asset_id || ''} onChange={(value, option) => { if (value === '__CUSTOM__') { setCustomEquipment(true); set('asset_id', null); set('equipment', ''); set('unit_number', ''); } else { const asset = assets.find((a) => String(a.id) === String(value)); set('asset_id', value); set('equipment', option?.label || ''); set('unit_number', asset?.asset_number || asset?.unit_number || ''); set('equipment_type', asset?.category || asset?.asset_type || asset?.equipment_type || data.equipment_type || ''); } }} placeholder="Search equipment or enter custom" />;
  const choice = (key: 'status' | 'priority', label: string, choices: string[], isCustom: boolean, setCustom: (value: boolean) => void) => {
    const options = [
      { value: '__CUSTOM__', label: `Enter a custom ${label.toLowerCase()}…` },
      ...choices.map((c) => ({ value: c, label: c })),
    ];
    return (
      <label className="block space-y-1">
        <span className="block font-medium">{label}</span>
        {mode === 'FREE_FLOW' ? (
          <input className="input-field w-full rounded-xl" value={data[key] || ''} onChange={(e) => set(key, e.target.value)} />
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
  return <Modal title={`${record ? 'Edit' : 'New'} equipment register`} onClose={onClose} className="sm:!h-[90vh] sm:!max-h-[90vh] sm:!max-w-5xl" footer={<div className="flex w-full justify-between gap-2"><span className="text-xs text-slate-500">Required fields are marked *</span><button type="button" className="btn-primary inline-flex items-center gap-2 rounded-xl bg-[#184877]" onClick={() => void save()} disabled={saving}>{saving ? 'Saving…' : record ? 'Save changes' : 'Save register entry'}</button></div>}>
    <div className="space-y-4 text-sm"><div className="flex border-b" role="tablist" aria-label="Equipment register form mode">{(['ASSISTED', 'FREE_FLOW'] as const).map((v) => <button key={v} type="button" role="tab" aria-selected={mode === v} onClick={() => setMode(v)} className={`border-b-2 px-4 py-2 text-xs font-bold uppercase tracking-wide ${mode === v ? 'border-[#184877] text-[#184877]' : 'border-transparent text-muted-foreground'}`}>{v === 'ASSISTED' ? 'Assisted' : 'Free flow'}</button>)}</div>{error && <div role="alert" className="border border-red-200 bg-red-50 p-3 text-red-800 rounded-xl">{error}</div>}<section className="overflow-hidden border border-slate-900 rounded-2xl"><h3 className="bg-[#184877] px-3 py-2 text-center text-xs font-bold uppercase tracking-wide text-white">Equipment details and condition</h3><div className={`grid gap-x-5 gap-y-4 p-4 md:grid-cols-2 ${mode === 'FREE_FLOW' ? 'bg-slate-100' : 'bg-white'}`}>{mode === 'ASSISTED' ? <><label className="block space-y-1.5"><span className="block text-xs font-semibold text-slate-700">Equipment *</span>{equipmentControl}</label>{input('unit_number', 'Unit No.')}{input('equipment_type', 'Type')}{choice('status', 'Status', statusOptions, customStatus, setCustomStatus)}{input('open_defects', 'Open Defects')}{input('action_required', 'Action Required')}{choice('priority', 'Priority', priorityOptions, customPriority, setCustomPriority)}{input('remarks', 'Remarks')}</> : fields.map(([key, label]) => input(key, label))}</div></section></div>
  </Modal>;
}

export function EquipmentRegisterDetails({ record, onClose, onEdit }: { record: any; onClose: () => void; onEdit: () => void }) {
  return <TrackerDetailsModal title="Equipment register details" fields={fields.map(([key, label]) => [label, record[key]])} onClose={onClose} onEdit={onEdit} />;
}
