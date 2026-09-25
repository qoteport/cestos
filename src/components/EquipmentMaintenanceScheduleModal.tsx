'use client';

import { FormEvent, useEffect, useMemo, useState } from 'react';
import { apiFetch } from '@/lib/api';
import { Modal } from './DataUI';
import SearchableSelect from './SearchableSelect';

const initialChecklist = [
  'Inspect main hydraulic pump pressure and relief valves',
  'Replace primary and secondary oil & fuel filter cartridges',
  'Check boom cylinder hoses for cracks or leaks',
];

export default function EquipmentMaintenanceScheduleModal({ assets, employees, projectId, onClose, onSaved }: {
  assets: any[]; employees: any[]; projectId: string; onClose: () => void; onSaved: () => void;
}) {
  const [items, setItems] = useState<any[]>([]);
  const [form, setForm] = useState<any>({ asset_id: '', title: '', maintenance_type: 'PREVENTIVE', failure_taxonomy: 'GENERAL', scheduled_date: new Date().toISOString().slice(0, 10), meter_reading: '', estimated_hours: 4, downtime_hours: 0, assigned_to_ids: [], priority: 'HIGH', recurrence: 'EVERY_250_HOURS', notes: '' });
  const [checklist, setChecklist] = useState(initialChecklist);
  const [parts, setParts] = useState<any[]>([{ item_id: '', quantity: 1, unit: 'PCS' }]);
  const [attachment, setAttachment] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;
    apiFetch<any>('/api/v1/inventory/items?page_size=200').then((response) => {
      if (active) setItems(Array.isArray(response) ? response : response?.items || []);
    }).catch(() => { if (active) setItems([]); });
    return () => { active = false; };
  }, []);

  const employeeOptions = useMemo(() => employees.map((employee) => ({
    value: String(employee.id || employee.email),
    label: [employee.first_name, employee.last_name].filter(Boolean).join(' ') || employee.name || employee.email,
    sublabel: [employee.job_title || employee.position_name, employee.employee_number].filter(Boolean).join(' · '),
  })).filter((option) => option.label), [employees]);
  const assetOptions = assets.map((asset) => ({ value: String(asset.id), label: asset.name || asset.asset_number || asset.id, sublabel: [asset.asset_number, asset.make, asset.model].filter(Boolean).join(' · ') }));
  const inventoryOptions = items.map((item) => ({ value: String(item.id), label: `${item.name || item.item_name || 'Inventory item'}${item.code ? ` · ${item.code}` : ''}`, sublabel: `Unit: ${item.unit_of_measure || item.unit || 'PCS'}` }));

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (!form.asset_id || !form.title.trim() || form.assigned_to_ids.length === 0) {
      setError('Select equipment, enter a schedule title, and assign at least one technician.'); return;
    }
    setBusy(true); setError('');
    try {
      const assignedEmployeeId = form.assigned_to_ids[0];
      const selectedAsset = assets.find((asset) => String(asset.id) === String(form.asset_id));
      const selectedParts = parts.filter((part) => part.item_id).map((part) => {
        const item = items.find((row) => String(row.id) === String(part.item_id));
        return { item_name: item?.name || item?.item_name || 'Spare part', quantity: Number(part.quantity) || 1, unit: part.unit || item?.unit_of_measure || 'PCS' };
      });
      const details = [
        form.notes.trim(),
        `Maintenance taxonomy: ${form.failure_taxonomy}.`,
        `Estimated maintenance duration: ${form.estimated_hours} hours; estimated equipment downtime: ${form.downtime_hours} hours.`,
        selectedParts.length ? `Required parts: ${selectedParts.map((part) => `${part.item_name} × ${part.quantity} ${part.unit}`).join(', ')}.` : '',
        attachment ? `Attached procedure document: ${attachment.name}.` : '',
      ].filter(Boolean).join('\n');
      const response = await apiFetch<any>(`/api/v1/field-portal/assets/${encodeURIComponent(form.asset_id)}/work-orders`, {
        method: 'POST',
        body: JSON.stringify({
          project_id: projectId || selectedAsset?.assigned_project_id || undefined,
          title: form.title.trim(), description: details || undefined,
          maintenance_type: form.maintenance_type, priority: form.priority,
          scheduled_date: form.scheduled_date || undefined,
          assigned_employee_id: assignedEmployeeId,
          checklist: checklist.filter((task) => task.trim()).map((task, index) => ({ id: `c-${index + 1}`, task: task.trim(), completed: false })),
          meter_reading: form.meter_reading === '' ? undefined : Number(form.meter_reading),
          is_recurring: ['WEEKLY', 'MONTHLY', 'QUARTERLY'].includes(form.recurrence),
          recurrence_interval_days: ({ WEEKLY: 7, MONTHLY: 30, QUARTERLY: 90 } as Record<string, number>)[form.recurrence],
        }),
      });
      if (attachment) {
        const upload = new FormData(); upload.append('file', attachment); upload.append('title', `Maintenance Schedule ${response.id}`); upload.append('document_type', 'OTHER');
        await apiFetch('/api/v1/documents', { method: 'POST', body: upload });
      }
      onSaved(); onClose();
    } catch (exception) {
      setError(exception instanceof Error ? exception.message : 'Could not create the maintenance schedule.');
    } finally { setBusy(false); }
  }

  return <Modal title="Create & Dispatch Equipment Maintenance Schedule" onClose={onClose} className="max-w-3xl">
    <form onSubmit={submit} className="space-y-4 px-1 text-xs max-h-[78vh] overflow-y-auto">
      {error && <p role="alert" className="rounded-lg border border-red-300 bg-red-50 p-3 text-red-800">{error}</p>}
      <section className="space-y-3 rounded-xl border bg-slate-50 p-3 dark:bg-slate-800/40">
        <h4 className="border-b pb-1.5 font-bold uppercase tracking-wide text-slate-600 dark:text-slate-300">Equipment & service meter trigger</h4>
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="space-y-1 font-semibold">Target asset / equipment rig *<SearchableSelect value={form.asset_id} onChange={(value) => setForm({ ...form, asset_id: value })} options={assetOptions} placeholder="Search assigned project equipment..." /></label>
          <label className="space-y-1 font-semibold">Target service meter reading (hours) (optional)<input type="number" min="0" value={form.meter_reading} onChange={(event) => setForm({ ...form, meter_reading: event.target.value })} className="w-full rounded-lg border bg-background p-2" placeholder="e.g. 1670" /></label>
        </div>
      </section>
      <section className="space-y-3 rounded-xl border p-3">
        <label className="block space-y-1 font-semibold">Maintenance schedule title *<input required value={form.title} onChange={(event) => setForm({ ...form, title: event.target.value })} className="w-full rounded-lg border bg-background p-2" placeholder="e.g. 250-hour hydraulic oil & filter replacement cycle" /></label>
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="space-y-1 font-semibold">Maintenance type *<select value={form.maintenance_type} onChange={(event) => setForm({ ...form, maintenance_type: event.target.value })} className="w-full rounded-lg border bg-background p-2">{[['PREVENTIVE','Preventive maintenance (PM)'],['CORRECTIVE','Corrective repair'],['INSPECTION','Safety inspection & audit'],['OVERHAUL','Major component overhaul']].map(([value,label]) => <option key={value} value={value}>{label}</option>)}</select></label>
          <label className="space-y-1 font-semibold">Component system / failure taxonomy *<select value={form.failure_taxonomy} onChange={(event) => setForm({ ...form, failure_taxonomy: event.target.value })} className="w-full rounded-lg border bg-background p-2">{[['GENERAL','General PM / lubrication'],['HYDRAULIC','Hydraulic system'],['ENGINE','Engine & drivetrain'],['ELECTRICAL','Electrical & instrumentation'],['PNEUMATIC','Pneumatic & air compressor'],['STRUCTURAL','Structural & mast chassis']].map(([value,label]) => <option key={value} value={value}>{label}</option>)}</select></label>
          <label className="space-y-1 font-semibold">Priority level *<select value={form.priority} onChange={(event) => setForm({ ...form, priority: event.target.value })} className="w-full rounded-lg border bg-background p-2">{[['LOW','Low priority'],['NORMAL','Normal priority'],['HIGH','High priority'],['CRITICAL','Critical / downtime risk']].map(([value,label]) => <option key={value} value={value}>{label}</option>)}</select></label>
          <label className="space-y-1 font-semibold">Recurrence frequency<select value={form.recurrence} onChange={(event) => setForm({ ...form, recurrence: event.target.value })} className="w-full rounded-lg border bg-background p-2">{[['ONE_OFF','One-time service'],['EVERY_250_HOURS','Every 250 engine hours'],['EVERY_500_HOURS','Every 500 engine hours'],['WEEKLY','Weekly schedule'],['MONTHLY','Monthly schedule'],['QUARTERLY','Quarterly audit']].map(([value,label]) => <option key={value} value={value}>{label}</option>)}</select></label>
        </div>
      </section>
      <section className="space-y-3 rounded-xl border bg-slate-50 p-3 dark:bg-slate-800/40">
        <h4 className="border-b pb-1.5 font-bold uppercase tracking-wide text-slate-600 dark:text-slate-300">Scheduling & resource allocation</h4>
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="space-y-1 font-semibold">Scheduled start date *<input required type="date" value={form.scheduled_date} onChange={(event) => setForm({ ...form, scheduled_date: event.target.value })} className="w-full rounded-lg border bg-background p-2" /></label>
          <label className="space-y-1 font-semibold">Assign technician / specialist *<SearchableSelect value="" onChange={(value) => value && !form.assigned_to_ids.includes(value) && setForm({ ...form, assigned_to_ids: [...form.assigned_to_ids, value] })} options={employeeOptions} placeholder="Search employees..." /></label>
          <label className="space-y-1 font-medium">Estimated maintenance duration (hours)<input type="number" min="0.5" step="0.5" value={form.estimated_hours} onChange={(event) => setForm({ ...form, estimated_hours: Number(event.target.value) })} className="w-full rounded-lg border bg-background p-2" /></label>
          <label className="space-y-1 font-medium">Estimated equipment downtime (hours)<input type="number" min="0" step="0.5" value={form.downtime_hours} onChange={(event) => setForm({ ...form, downtime_hours: Number(event.target.value) })} className="w-full rounded-lg border bg-background p-2" /></label>
        </div>
        <div className="flex flex-wrap gap-2">{form.assigned_to_ids.map((id: string) => { const employee = employees.find((row) => String(row.id || row.email) === id); return <button type="button" key={id} onClick={() => setForm({ ...form, assigned_to_ids: form.assigned_to_ids.filter((value: string) => value !== id) })} className="rounded-lg border border-orange-300 bg-orange-50 px-2 py-1 text-orange-800 dark:bg-orange-950/30 dark:text-orange-200">{[employee?.first_name, employee?.last_name].filter(Boolean).join(' ') || employee?.name || id} ×</button>; })}</div>
      </section>
      <section className="space-y-2 rounded-xl border p-3"><div className="flex items-center justify-between"><h4 className="font-bold">Maintenance checklist tasks</h4><button type="button" onClick={() => setChecklist([...checklist, ''])} className="font-bold text-orange-700">+ Add checklist item</button></div>{checklist.map((task, index) => <div key={index} className="flex gap-2"><input value={task} onChange={(event) => setChecklist(checklist.map((value, i) => i === index ? event.target.value : value))} placeholder={`Task ${index + 1} instruction`} className="flex-1 rounded-lg border bg-background p-2" /><button type="button" onClick={() => setChecklist(checklist.filter((_, i) => i !== index))} className="px-2 text-red-600">Remove</button></div>)}</section>
      <section className="space-y-2 rounded-xl border p-3"><div className="flex items-center justify-between"><h4 className="font-bold">Required spare parts & consumables allocation</h4><button type="button" onClick={() => setParts([...parts, { item_id: '', quantity: 1, unit: 'PCS' }])} className="font-bold text-orange-700">+ Add spare part</button></div>{parts.map((part, index) => <div key={index} className="grid grid-cols-12 gap-2"><div className="col-span-7"><SearchableSelect value={part.item_id} onChange={(value) => setParts(parts.map((row, i) => i === index ? { ...row, item_id: value } : row))} options={inventoryOptions} placeholder="Select inventory part..." /></div><input type="number" min="1" value={part.quantity} onChange={(event) => setParts(parts.map((row, i) => i === index ? { ...row, quantity: Number(event.target.value) } : row))} className="col-span-3 rounded-lg border bg-background p-2" placeholder="Qty" /><input value={part.unit} onChange={(event) => setParts(parts.map((row, i) => i === index ? { ...row, unit: event.target.value } : row))} className="col-span-2 rounded-lg border bg-background p-2" placeholder="Unit" /></div>)}</section>
      <section className="space-y-3 rounded-xl border p-3"><label className="block space-y-1 font-semibold">Maintenance instructions & specific notes<textarea rows={3} value={form.notes} onChange={(event) => setForm({ ...form, notes: event.target.value })} className="w-full rounded-lg border bg-background p-2" placeholder="Specify torque specs, oil grade, safety permits, or procedure notes..." /></label><label className="block space-y-1 font-semibold">Attach OEM service manual / safety procedure document<input type="file" accept="image/*,application/pdf,.doc,.docx" onChange={(event) => setAttachment(event.target.files?.[0] || null)} className="block w-full rounded-lg border bg-background p-2" /></label>{attachment && <p className="text-slate-500">{attachment.name}</p>}</section>
      <div className="sticky bottom-0 -mx-4 -mb-4 sm:-mx-6 sm:-mb-6 p-3.5 sm:px-6 sm:py-4 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-t border-slate-200 dark:border-slate-800 z-10 flex flex-col-reverse sm:flex-row items-stretch sm:items-center justify-end gap-2.5 sm:gap-3 mt-4">
        <button type="button" onClick={onClose} className="rounded-lg border px-4 py-2 font-medium w-full sm:w-auto text-xs sm:text-sm hover:bg-slate-50 dark:hover:bg-slate-800 transition">Cancel</button>
        <button type="submit" disabled={busy} className="rounded-lg bg-orange-600 px-4 py-2 font-bold text-white hover:bg-orange-700 disabled:opacity-50 transition w-full sm:w-auto text-xs sm:text-sm">{busy ? 'Creating schedule…' : 'Create & dispatch maintenance schedule'}</button>
      </div>
    </form>
  </Modal>;
}
