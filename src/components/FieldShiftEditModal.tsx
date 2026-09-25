'use client';

import { useState } from 'react';
import { apiFetch } from '@/lib/api';
import { Modal } from './DataUI';
import useAppFeedback from './useAppFeedback';
import SearchableSelect from './SearchableSelect';

type Row = Record<string, any>;

export default function FieldShiftEditModal({ shift, assets, holes, sites = [], onClose, onSaved }: {
  shift: Row;
  assets: Row[];
  holes: Row[];
  sites?: Row[];
  onClose: () => void;
  onSaved: () => void;
}) {
  const [form, setForm] = useState({
    date: shift.date || shift.shift_date,
    shift_type: shift.shift_type,
    rig_id: shift.rig_id,
    notes: shift.notes || '',
    site_location_id: shift.site_location_id || '',
  });
  const [intervals, setIntervals] = useState<Row[]>((shift.intervals || []).map((row: Row) => ({ ...row })));
  const [times, setTimes] = useState<Row[]>((shift.time_segments || []).map((row: Row) => ({ ...row })));
  const [saving, setSaving] = useState(false);
  const { notify, formErrors } = useAppFeedback();
  const rigOptions = assets.some(asset => asset.id === shift.rig_id)
    ? assets
    : [{ id: shift.rig_id, name: shift.rig_name || 'Recorded rig' }, ...assets];
  const projectHoles = holes.filter(hole => hole.project_id === shift.project_id && (!form.site_location_id || hole.site_location_id === form.site_location_id));
  const locked = shift.status === 'APPROVED' || !!shift.approved_at;
  const fieldClassName = 'w-full border rounded-lg p-2 bg-background';

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (saving || locked) return;

    setSaving(true);
    try {
      await apiFetch(`/api/v1/field-portal/shifts/${shift.id}`, {
        method: 'PUT',
        body: JSON.stringify({
          ...form,
          site_location_id: form.site_location_id || null,
          intervals: intervals.map(row => ({
            drill_hole_id: row.drill_hole_id,
            from_depth_m: Number(row.from_depth_m),
            to_depth_m: Number(row.to_depth_m),
            core_recovered_m: row.core_recovered_m === '' || row.core_recovered_m == null ? null : Number(row.core_recovered_m),
            drilling_method: row.drilling_method || null,
            ground_conditions: row.ground_conditions || null,
          })),
          time_segments: times.map(row => ({
            category: row.category,
            reason_code: row.reason_code,
            hours: Number(row.hours),
            comments: row.comments || null,
          })),
        }),
      });
      notify({ type: 'success', message: 'Shift log updated.' });
      onSaved();
    } catch (error) {
      notify({ type: 'error', message: error instanceof Error ? error.message : 'Could not update shift log.' }, 'shift');
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal title="Edit Shift Production Report" error={formErrors.shift} onClose={() => { if (!saving) onClose(); }}>
      <form onSubmit={submit} className="space-y-4 text-xs">
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block font-bold mb-1">Drilling Rig / Equipment *</label>
            <select required value={form.rig_id} onChange={e => setForm({ ...form, rig_id: e.target.value })} className={fieldClassName}>
              {rigOptions.map(asset => <option key={asset.id} value={asset.id}>{asset.name || asset.asset_number}</option>)}
            </select>
          </div>
          <div>
            <label className="block font-bold mb-1">Site / Project</label>
            <SearchableSelect value={form.site_location_id} onChange={value => setForm({ ...form, site_location_id: value })} options={sites.filter(site => site.project_id === shift.project_id).map(site => ({ value: site.id, label: `${site.name} | ${site.project_name || shift.project_name || ''}` }))} placeholder="Select site / location" />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block font-bold mb-1">Shift Date *</label>
            <input required type="date" value={form.date} onChange={e => setForm({ ...form, date: e.target.value })} className={`${fieldClassName} font-mono`} />
          </div>
          <div>
            <label className="block font-bold mb-1">Shift Type *</label>
            <select value={form.shift_type} onChange={e => setForm({ ...form, shift_type: e.target.value })} className={`${fieldClassName} font-bold`}>
              <option value="DAY">Day Shift (DS)</option>
              <option value="NIGHT">Night Shift (NS)</option>
            </select>
          </div>
        </div>

        <div className="border-t pt-3 space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <label className="block font-bold text-foreground">Worked Drill Hole Intervals</label>
              <span className="text-[10px] text-muted-foreground block">Select drilled hole and enter the depth range for this shift</span>
            </div>
            <button type="button" onClick={() => setIntervals(values => { const used = new Set(values.map(row => row.drill_hole_id)); const next = projectHoles.find(hole => !used.has(hole.id) && Number(hole.current_depth_m ?? 0) < Number(hole.target_depth_m ?? Infinity)); return [...values, { drill_hole_id: next?.id || '', from_depth_m: next?.current_depth_m || 0, to_depth_m: next?.current_depth_m || 0, core_recovered_m: null }]; })} className="px-2 py-1 text-[11px] bg-secondary text-primary font-bold rounded-lg hover:bg-secondary/80">
              + Add Interval
            </button>
          </div>

          {intervals.map((row, index) => (
            <div key={index} className="p-3 border rounded-xl bg-muted/20 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold uppercase text-muted-foreground">Hole Interval #{index + 1}</span>
                <button type="button" disabled={intervals.length === 1} onClick={() => setIntervals(values => values.filter((_, i) => i !== index))} className="text-destructive hover:opacity-80 disabled:opacity-40">
                  Remove
                </button>
              </div>
              <div>
                <label className="block font-medium mb-1">Select Worked Drill Hole *</label>
                <select required value={row.drill_hole_id} className={fieldClassName} onChange={e => setIntervals(values => values.map((value, i) => i === index ? { ...value, drill_hole_id: e.target.value } : value))}>
                  <option value="">Select Drill Hole...</option>
                  {!projectHoles.some(hole => hole.id === row.drill_hole_id) && row.drill_hole_id && <option value={row.drill_hole_id}>{row.hole_number || 'Recorded hole'}</option>}
                  {projectHoles.map(hole => <option key={hole.id} value={hole.id}>{hole.hole_number}</option>)}
                </select>
              </div>
              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="block font-medium mb-1">From Depth (m) *</label>
                  <input type="number" min={0} step="0.01" required value={row.from_depth_m ?? ''} className={`${fieldClassName} font-mono`} onChange={e => setIntervals(values => values.map((value, i) => i === index ? { ...value, from_depth_m: e.target.value } : value))} />
                </div>
                <div>
                  <label className="block font-medium mb-1">To Depth (m) *</label>
                  <input type="number" min={0} step="0.01" required value={row.to_depth_m ?? ''} className={`${fieldClassName} font-mono font-bold`} onChange={e => setIntervals(values => values.map((value, i) => i === index ? { ...value, to_depth_m: e.target.value } : value))} />
                </div>
                <div>
                  <label className="block font-medium mb-1">Core Recovered (m)</label>
                  <input type="number" min={0} step="0.01" value={row.core_recovered_m ?? ''} className={`${fieldClassName} font-mono`} onChange={e => setIntervals(values => values.map((value, i) => i === index ? { ...value, core_recovered_m: e.target.value } : value))} />
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="border-t pt-3 space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <label className="block font-bold text-foreground">Shift Time Records</label>
              <span className="text-[10px] text-muted-foreground block">Record productive, standby, maintenance, or non-productive time</span>
            </div>
            <button type="button" onClick={() => setTimes(values => [...values, { category: 'PRODUCTIVE', reason_code: 'DRILLING', hours: 1 }])} className="px-2 py-1 text-[11px] bg-secondary text-primary font-bold rounded-lg hover:bg-secondary/80">
              + Add Time Record
            </button>
          </div>

          {times.map((row, index) => (
            <div key={index} className="p-3 border rounded-xl bg-muted/20 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold uppercase text-muted-foreground">Time Record #{index + 1}</span>
                <button type="button" onClick={() => setTimes(values => values.filter((_, i) => i !== index))} className="text-destructive hover:opacity-80">Remove</button>
              </div>
              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="block font-medium mb-1">Category *</label>
                  <select value={row.category} className={fieldClassName} onChange={e => setTimes(values => values.map((value, i) => i === index ? { ...value, category: e.target.value } : value))}>
                    {['PRODUCTIVE', 'STANDBY', 'MAINTENANCE', 'NON_PRODUCTIVE'].map(value => <option key={value} value={value}>{value.replace('_', ' ')}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block font-medium mb-1">Reason *</label>
                  <input required maxLength={100} value={row.reason_code || ''} className={fieldClassName} onChange={e => setTimes(values => values.map((value, i) => i === index ? { ...value, reason_code: e.target.value } : value))} />
                </div>
                <div>
                  <label className="block font-medium mb-1">Hours *</label>
                  <input type="number" required min={0.01} max={24} step="0.01" value={row.hours ?? ''} className={`${fieldClassName} font-mono`} onChange={e => setTimes(values => values.map((value, i) => i === index ? { ...value, hours: e.target.value } : value))} />
                </div>
              </div>
            </div>
          ))}
        </div>

        <div>
          <label className="block font-medium mb-1">Shift Notes / HSE Observations</label>
          <textarea rows={2} maxLength={20000} value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} placeholder="Log bit changes, ground condition remarks, or HSE observations..." className="w-full border rounded p-2 bg-background resize-y" />
        </div>

        <div className="sticky bottom-0 -mx-4 -mb-4 sm:-mx-6 sm:-mb-6 p-3.5 sm:px-6 sm:py-4 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-t border-slate-200 dark:border-slate-800 z-10 flex flex-col-reverse sm:flex-row items-stretch sm:items-center justify-end gap-2.5 sm:gap-3 mt-4">
          <button type="button" disabled={saving} onClick={onClose} className="px-4 py-2 border rounded-lg hover:bg-muted font-medium w-full sm:w-auto">Cancel</button>
          <button disabled={saving || locked} className="px-4 py-2 bg-primary text-primary-foreground font-bold rounded-lg hover:bg-primary/90 transition w-full sm:w-auto">{saving ? 'Saving...' : 'Save Shift Report'}</button>
        </div>
      </form>
    </Modal>
  );
}
