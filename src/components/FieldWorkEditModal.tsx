'use client';

import { useState } from 'react';
import { apiFetch } from '@/lib/api';
import { Modal } from './DataUI';
import useAppFeedback from './useAppFeedback';

type Work = Record<string, any>;
export function canEditFieldWork(work: Work) {
  return work.can_edit === true && !work.approved_at
    && !['COMPLETED', 'APPROVED', 'CANCELLED'].includes(work.status);
}

export default function FieldWorkEditModal({ work, employees, onClose, onSaved }: {
  work: Work; employees: Work[]; onClose: () => void; onSaved: (saved: Work) => void;
}) {
  const detailed = work.source === 'work_order';
  const [form, setForm] = useState({
    title: work.title || '', description: work.description || '',
    priority: work.priority || (detailed ? 'MEDIUM' : 'NORMAL'),
    maintenance_type: work.maintenance_type || (detailed ? 'CORRECTIVE' : 'SERVICE'),
    scheduled_date: work.scheduled_date?.slice(0, 10) || '',
    assigned_employee_id: work.assigned_employee_id || '',
    is_recurring: !!work.is_recurring,
    recurrence_interval_days: work.recurrence_interval_days || 30,
  });
  const [saving, setSaving] = useState(false);
  const { notify, formErrors } = useAppFeedback();
  const candidates = employees.some(employee => employee.id === work.assigned_employee_id)
    ? employees : [{ id: work.assigned_employee_id, name: work.assigned_to || 'Current assignee' }, ...employees];
  const label = work.editKind === 'schedule' ? 'maintenance schedule' : 'work order';
  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (saving || !canEditFieldWork(work)) return;
    setSaving(true);
    try {
      const saved = await apiFetch<Work>(`/api/v1/field-portal/work-orders/${work.id}/details`, {
        method: 'PATCH', body: JSON.stringify({
          ...form, title: form.title.trim(), description: form.description || null,
          scheduled_date: form.scheduled_date || null,
          recurrence_interval_days: form.is_recurring ? Number(form.recurrence_interval_days) : null,
        }),
      });
      const assignee = candidates.find(employee => employee.id === form.assigned_employee_id);
      onSaved({ ...work, ...saved, asset_name: work.asset_name,
        assigned_to: assignee?.name || [assignee?.first_name, assignee?.last_name].filter(Boolean).join(' ') || work.assigned_to,
        due_date: saved.scheduled_date,
      });
      notify({ type: 'success', message: `${label === 'work order' ? 'Work order' : 'Maintenance schedule'} updated.` });
    } catch (error) {
      notify({ type: 'error', message: error instanceof Error ? error.message : 'Could not save changes.' }, 'edit');
    } finally {
      setSaving(false);
    }
  }
  return (
    <Modal title={`Edit ${label}`} error={formErrors.edit} onClose={() => { if (!saving) onClose(); }}>
      <form onSubmit={submit} className="space-y-4 text-sm">
        <p className="text-muted-foreground">Equipment: <strong>{work.asset_name || 'Assigned equipment'}</strong></p>
        <label className="block">Title
          <input required maxLength={200} value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} className="w-full mt-1 rounded-lg border bg-background px-3 py-2" />
        </label>
        <label className="block">Description / scope of work
          <textarea maxLength={20000} rows={4} value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} className="w-full mt-1 rounded-lg border bg-background px-3 py-2" />
        </label>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <label>Priority
            <select value={form.priority} onChange={e => setForm({ ...form, priority: e.target.value })} className="w-full mt-1 rounded-lg border bg-background px-3 py-2">
              {['LOW', detailed ? 'MEDIUM' : 'NORMAL', 'HIGH', 'CRITICAL'].map(value => <option key={value}>{value}</option>)}
            </select>
          </label>
          <label>Work type
            <select value={form.maintenance_type} onChange={e => setForm({ ...form, maintenance_type: e.target.value })} className="w-full mt-1 rounded-lg border bg-background px-3 py-2">
              {(detailed ? ['PREVENTIVE', 'CORRECTIVE', 'EMERGENCY', 'OVERHAUL'] : ['PREVENTIVE', 'CORRECTIVE', 'INSPECTION', 'SERVICE', 'OTHER']).map(value => <option key={value}>{value}</option>)}
            </select>
          </label>
          <label>Scheduled date
            <input type="date" value={form.scheduled_date} onChange={e => setForm({ ...form, scheduled_date: e.target.value })} className="w-full mt-1 rounded-lg border bg-background px-3 py-2" />
          </label>
          <label>Assigned technician
            <select required disabled={!work.can_reassign} value={form.assigned_employee_id} onChange={e => setForm({ ...form, assigned_employee_id: e.target.value })} className="w-full mt-1 rounded-lg border bg-background px-3 py-2">
              {candidates.map(employee => <option key={employee.id} value={employee.id}>{employee.name || `${employee.first_name || ''} ${employee.last_name || ''}`.trim()}</option>)}
            </select>
          </label>
        </div>
        {!detailed && <div className="space-y-2">
          <label className="flex gap-2 items-center"><input type="checkbox" checked={form.is_recurring} onChange={e => setForm({ ...form, is_recurring: e.target.checked })} /> Recurring maintenance</label>
          {form.is_recurring && <label className="block">Repeat every (days)
            <input type="number" required min={1} max={365} value={form.recurrence_interval_days} onChange={e => setForm({ ...form, recurrence_interval_days: e.target.value })} className="w-full mt-1 rounded-lg border bg-background px-3 py-2" />
          </label>}
        </div>}
        <div className="flex justify-end gap-2 border-t pt-4">
          <button type="button" disabled={saving} className="btn-secondary" onClick={onClose}>Cancel</button>
          <button type="submit" disabled={saving || !form.title.trim() || !canEditFieldWork(work)} className="btn-primary">{saving ? 'Saving…' : 'Save changes'}</button>
        </div>
      </form>
    </Modal>
  );
}
