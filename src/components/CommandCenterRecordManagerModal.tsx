'use client';

import { useEffect, useMemo, useState } from 'react';
import { AlertTriangle, Edit3, LoaderCircle, Search, Trash2 } from 'lucide-react';
import { Modal, Row } from './DataUI';
import { apiFetch } from '@/lib/api';
import { toast } from 'sonner';

type Entity = 'projects' | 'employees' | 'equipment' | 'suppliers';
type Field = { key: string; label: string; type?: 'date' | 'textarea' };
const entities: Array<{ id: Entity; label: string }> = [
  { id: 'projects', label: 'Projects' }, { id: 'employees', label: 'Employees' },
  { id: 'equipment', label: 'Equipment' }, { id: 'suppliers', label: 'Suppliers' },
];
const fields: Record<Entity, Field[]> = {
  projects: [
    { key: 'name', label: 'Project name' }, { key: 'description', label: 'Description', type: 'textarea' },
    { key: 'project_type', label: 'Project type' }, { key: 'drilling_type', label: 'Drilling type' },
    { key: 'contract_number', label: 'Contract number' }, { key: 'start_date', label: 'Start date', type: 'date' },
    { key: 'expected_end_date', label: 'Expected end date', type: 'date' }, { key: 'status', label: 'Status' },
    { key: 'default_currency', label: 'Default currency' }, { key: 'notes', label: 'Notes', type: 'textarea' },
  ],
  employees: [
    { key: 'first_name', label: 'First name' }, { key: 'middle_name', label: 'Middle name' },
    { key: 'last_name', label: 'Last name' }, { key: 'preferred_name', label: 'Preferred name' },
    { key: 'personal_email', label: 'Personal email' }, { key: 'work_email', label: 'Work email' },
    { key: 'primary_phone', label: 'Primary phone' }, { key: 'department', label: 'Department' },
    { key: 'job_title', label: 'Job title' }, { key: 'employment_status', label: 'Employment status' },
    { key: 'hire_date', label: 'Hire date', type: 'date' }, { key: 'notes', label: 'Notes', type: 'textarea' },
  ],
  equipment: [
    { key: 'name', label: 'Equipment name' }, { key: 'description', label: 'Description', type: 'textarea' },
    { key: 'manufacturer', label: 'Manufacturer' }, { key: 'model', label: 'Model' },
    { key: 'serial_number', label: 'Serial number' }, { key: 'year_of_manufacture', label: 'Year of manufacture' },
    { key: 'status', label: 'Status' }, { key: 'default_location_id', label: 'Location ID' },
    { key: 'notes', label: 'Notes', type: 'textarea' },
  ],
  suppliers: [
    { key: 'name', label: 'Supplier name' }, { key: 'contact_name', label: 'Contact name' },
    { key: 'email', label: 'Email' }, { key: 'phone', label: 'Phone' },
    { key: 'address', label: 'Address', type: 'textarea' }, { key: 'country', label: 'Country' },
    { key: 'notes', label: 'Notes', type: 'textarea' },
  ],
};
const updatePaths: Record<Entity, (id: string) => string> = {
  projects: (id) => `/api/v1/projects/${id}`,
  employees: (id) => `/api/v1/employees/${id}`,
  equipment: (id) => `/api/v1/assets/${id}`,
  suppliers: (id) => `/api/v1/inventory/suppliers/${id}`,
};

function labelOf(entity: Entity, row: Row): string {
  if (entity === 'employees') return [row.first_name, row.last_name].filter(Boolean).join(' ') || row.employee_number || 'Employee';
  if (entity === 'equipment') return [row.asset_number, row.name || row.model].filter(Boolean).join(' · ') || 'Equipment';
  if (entity === 'suppliers') return row.name || 'Supplier';
  return row.name || row.project_number || 'Project';
}

export default function CommandCenterRecordManagerModal({ onClose, onChanged, canEdit }: {
  onClose: () => void; onChanged: () => void; canEdit: (entity: Entity) => boolean;
}) {
  const [entity, setEntity] = useState<Entity>('projects');
  const [records, setRecords] = useState<Row[]>([]);
  const [selected, setSelected] = useState<Row | null>(null);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editValues, setEditValues] = useState<Record<string, string>>({});
  const [preview, setPreview] = useState<any | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [archiving, setArchiving] = useState(false);

  async function loadRecords() {
    setLoading(true);
    try {
      const result = await apiFetch<any>(`/api/v1/command-center/records/${entity}`);
      const next = Array.isArray(result?.items) ? result.items : [];
      setRecords(next);
      setSelected((current) => current ? next.find((row: Row) => row.id === current.id) || null : null);
    } catch (error: any) {
      toast.error(error?.message || `Could not load ${entity}.`);
      setRecords([]);
    } finally { setLoading(false); }
  }
  useEffect(() => { setSelected(null); setSearch(''); void loadRecords(); }, [entity]);

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return records;
    return records.filter((row) => JSON.stringify(row).toLowerCase().includes(query));
  }, [records, search]);

  function beginEdit(row: Row) {
    setSelected(row);
    setEditValues(Object.fromEntries(fields[entity].map(({ key }) => [key, row[key] == null ? '' : (key.endsWith('_date') ? String(row[key]).slice(0, 10) : String(row[key]))])));
  }

  async function saveEdit(event: React.FormEvent) {
    event.preventDefault();
    if (!selected) return;
    const payload: Record<string, unknown> = {};
    for (const field of fields[entity]) {
      if (editValues[field.key] !== String(selected[field.key] ?? '')) {
        payload[field.key] = editValues[field.key] === '' ? null : editValues[field.key];
      }
    }
    if (!Object.keys(payload).length) { toast.info('No changes to save.'); return; }
    setSaving(true);
    try {
      const updated = await apiFetch<Row>(updatePaths[entity](selected.id), { method: 'PATCH', body: JSON.stringify(payload) });
      setSelected(updated);
      setRecords((rows) => rows.map((row) => row.id === updated.id ? updated : row));
      toast.success(`${labelOf(entity, updated)} updated.`);
      onChanged();
    } catch (error: any) { toast.error(error?.message || 'Could not save this record.'); }
    finally { setSaving(false); }
  }

  async function openDeletePreview(row: Row) {
    setPreviewLoading(true);
    try {
      const result = await apiFetch<any>(`/api/v1/command-center/records/${entity}/${row.id}/impact`);
      setPreview(result);
    } catch (error: any) { toast.error(error?.message || 'Could not check linked records.'); }
    finally { setPreviewLoading(false); }
  }

  async function confirmArchive() {
    if (!preview?.record?.id) return;
    setArchiving(true);
    try {
      await apiFetch(`/api/v1/command-center/records/${entity}/${preview.record.id}/archive`, {
        method: 'POST', body: JSON.stringify({ expected_updated_at: preview.record.updated_at }),
      });
      toast.success(`${preview.label} archived. Linked records were preserved.`);
      setPreview(null); setSelected(null); await loadRecords(); onChanged();
    } catch (error: any) { toast.error(error?.message || 'Could not archive this record. Refresh and review its impact.'); }
    finally { setArchiving(false); }
  }

  return <>
    <Modal title="Manage operational records" onClose={onClose} className="sm:!h-[92vh] sm:!max-h-[92vh] sm:!max-w-7xl" footer={<div className="flex w-full items-center justify-between gap-3"><p className="text-xs text-slate-500">Delete uses a reversible archive. Related records are never cascade-deleted.</p><button type="button" className="btn-secondary" onClick={onClose}>Close</button></div>}>
      <div className="grid min-h-[65vh] gap-5 xl:grid-cols-[minmax(0,1fr)_minmax(420px,0.9fr)]">
        <section className="min-w-0 space-y-4">
          <div className="grid gap-3 sm:grid-cols-[220px_1fr]">
            <label className="block space-y-1"><span className="text-xs font-semibold">Record type</span><select className="input-field w-full" value={entity} onChange={(event) => setEntity(event.target.value as Entity)}>{entities.map((item) => <option key={item.id} value={item.id}>{item.label}</option>)}</select></label>
            <label className="relative block space-y-1"><span className="text-xs font-semibold">Search records</span><Search size={15} className="absolute left-3 top-9 text-slate-400" /><input className="input-field w-full pl-9" value={search} onChange={(event) => setSearch(event.target.value)} placeholder={`Search ${entity}...`} /></label>
          </div>
          <div className="max-h-[62vh] overflow-auto border border-slate-200 dark:border-slate-700">
            {loading ? <div className="flex items-center justify-center gap-2 p-10 text-sm text-slate-500"><LoaderCircle className="animate-spin" size={17} /> Loading records…</div> : filtered.length ? <table className="w-full text-left text-sm"><thead className="sticky top-0 bg-slate-100 text-xs uppercase text-slate-600 dark:bg-slate-800 dark:text-slate-300"><tr><th className="px-3 py-3">Record</th><th className="px-3 py-3">Status / reference</th></tr></thead><tbody>{filtered.map((row) => <tr key={row.id} className={`cursor-pointer border-t border-slate-200 hover:bg-blue-50 dark:border-slate-700 dark:hover:bg-slate-800 ${selected?.id === row.id ? 'bg-blue-50 dark:bg-slate-800' : ''}`} onClick={() => beginEdit(row)}><td className="px-3 py-3 font-semibold">{labelOf(entity, row)}<span className="mt-0.5 block text-[11px] font-normal text-slate-500">{row.id}</span></td><td className="px-3 py-3 text-xs">{row.status || row.employment_status || row.employee_number || row.asset_number || row.project_number || '—'}</td></tr>)}</tbody></table> : <div className="p-10 text-center text-sm text-slate-500">No records found.</div>}
          </div>
          <p className="text-xs text-slate-500">{filtered.length} of {records.length} records{records.length === 1000 ? ' (showing first 1,000)' : ''}</p>
        </section>

        <section className="min-w-0 border border-slate-200 p-4 dark:border-slate-700">
          {!selected ? <div className="flex h-full min-h-64 items-center justify-center text-center text-sm text-slate-500">Select a record to review, edit, or archive it.</div> : <>
            <div className="mb-4 flex items-start justify-between gap-3 border-b pb-3"><div><p className="text-xs font-bold uppercase tracking-wide text-blue-700">{entities.find((item) => item.id === entity)?.label.slice(0, -1)}</p><h3 className="mt-1 text-lg font-bold">{labelOf(entity, selected)}</h3><p className="mt-1 break-all text-[11px] text-slate-500">ID: {selected.id}</p></div><button type="button" className="inline-flex items-center gap-1.5 border border-red-200 px-3 py-2 text-xs font-bold text-red-700 hover:bg-red-50" onClick={() => void openDeletePreview(selected)}><Trash2 size={14} /> Delete</button></div>
            <form onSubmit={saveEdit} className="grid max-h-[57vh] gap-3 overflow-auto pr-1 sm:grid-cols-2">
              {fields[entity].map((field) => <label key={field.key} className={`block space-y-1 ${field.type === 'textarea' ? 'sm:col-span-2' : ''}`}><span className="text-xs font-semibold">{field.label}</span>{field.type === 'textarea' ? <textarea className="input-field min-h-24 w-full" value={editValues[field.key] || ''} onChange={(event) => setEditValues((values) => ({ ...values, [field.key]: event.target.value }))} /> : <input className="input-field w-full" type={field.type || 'text'} value={editValues[field.key] || ''} onChange={(event) => setEditValues((values) => ({ ...values, [field.key]: event.target.value }))} />}</label>)}
              <div className="flex items-end gap-2 sm:col-span-2"><button type="submit" disabled={!canEdit(entity) || saving} className="btn-primary inline-flex items-center gap-2 disabled:opacity-50" title={!canEdit(entity) ? 'You do not have edit permission for this record type.' : undefined}>{saving ? <LoaderCircle size={15} className="animate-spin" /> : <Edit3 size={15} />} Save changes</button>{!canEdit(entity) && <span className="text-xs text-amber-700">Your role can review and archive records, but cannot edit this type.</span>}</div>
            </form>
          </>}
        </section>
      </div>
    </Modal>

    {preview && <Modal title="Review archive impact" onClose={() => setPreview(null)} className="sm:!max-h-[85vh] sm:!max-w-3xl" footer={<div className="flex w-full justify-between gap-3"><button type="button" className="btn-secondary" onClick={() => setPreview(null)}>Cancel</button><button type="button" disabled={archiving || preview.record.updated_at == null} className="inline-flex items-center gap-2 bg-red-700 px-4 py-2 text-sm font-bold text-white disabled:opacity-50" onClick={() => void confirmArchive()}>{archiving ? <LoaderCircle size={15} className="animate-spin" /> : <Trash2 size={15} />} Archive selected record</button></div>}>
      <div className="space-y-4">
        <div className="flex gap-3 border border-amber-300 bg-amber-50 p-4 text-sm text-amber-950"><AlertTriangle className="mt-0.5 shrink-0" size={18} /><p><strong>{preview.label}</strong> will be archived and removed from active lists. Linked records will remain in the database and will not be cascade-deleted.</p></div>
        <div className="border border-slate-200 dark:border-slate-700"><h3 className="border-b bg-slate-50 px-4 py-3 text-sm font-bold dark:bg-slate-800">Linked records found</h3><div className="max-h-[48vh] overflow-auto p-4">{preview.dependencies?.length ? <div className="space-y-4">{preview.dependencies.map((group: any) => <section key={group.entity}><h4 className="mb-2 text-xs font-bold uppercase text-slate-600">{group.label} · {group.count}{group.truncated ? ' (first 500 shown)' : ''}</h4><ul className="space-y-1">{group.items.map((item: any) => <li key={item.id} className="break-words border-b py-1.5 text-xs"><span className="font-semibold">{item.label}</span><span className="ml-2 text-slate-500">{item.id}</span></li>)}</ul></section>)}</div> : <p className="text-sm text-emerald-700">No linked records were found. This record can be archived safely.</p>}</div></div>
      </div>
    </Modal>}
  </>;
}
