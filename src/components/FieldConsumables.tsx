'use client';

import { useEffect, useState } from 'react';
import { apiFetch } from '@/lib/api';
import useAppFeedback from './useAppFeedback';

type Row = Record<string, any>;
type Line = { item_id: string; quantity: string };
export default function FieldConsumables({ projectId, logDate, onBusyChange }: {
  projectId: string; logDate: string; onBusyChange?: (busy: boolean) => void;
}) {
  const [rows, setRows] = useState<Row[]>([]);
  const [options, setOptions] = useState<{ items: Row[]; stores: Row[] }>({ items: [], stores: [] });
  const [store, setStore] = useState('');
  const [lines, setLines] = useState<Line[]>([{ item_id: '', quantity: '1' }]);
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [version, setVersion] = useState(0);
  const [submissionId, setSubmissionId] = useState('');
  const { notify } = useAppFeedback();
  useEffect(() => {
    const refresh = () => setVersion(v => v + 1);
    window.addEventListener('field-consumables-changed', refresh);
    window.addEventListener('focus', refresh);
    return () => { window.removeEventListener('field-consumables-changed', refresh); window.removeEventListener('focus', refresh); };
  }, []);
  useEffect(() => {
    const abort = new AbortController();
    setRows([]); setError('');
    if (!projectId || !logDate) return;
    setLoading(true);
    Promise.all([
      apiFetch<Row[]>(`/api/v1/field-portal/consumables?project_id=${encodeURIComponent(projectId)}&log_date=${encodeURIComponent(logDate)}`, { signal: abort.signal }),
      apiFetch<{ items: Row[]; stores: Row[] }>(`/api/v1/field-portal/consumables/options?project_id=${encodeURIComponent(projectId)}`, { signal: abort.signal }),
    ]).then(([records, choices]) => {
      if (!abort.signal.aborted) { setRows(records); setOptions(choices); }
    }).catch(err => {
      if (!abort.signal.aborted) { setError(err.message); notify({ type: 'error', message: err.message }); }
    }).finally(() => { if (!abort.signal.aborted) setLoading(false); });
    return () => abort.abort();
  }, [projectId, logDate, version, notify]);
  const save = async () => {
    if (busy) return;
    const fail = (message: string) => { setError(message); notify({ type: 'error', message }); };
    if (!projectId || !logDate || !store) return fail('Select a project, date and store.');
    if (lines.some(line => !line.item_id || !Number.isFinite(Number(line.quantity)) || Number(line.quantity) <= 0)) return fail('Select an item and a positive quantity for every row.');
    setError(''); setBusy(true); onBusyChange?.(true);
    const id = submissionId || crypto.randomUUID();
    setSubmissionId(id);
    try {
      const result = await apiFetch<Row>('/api/v1/field-portal/consumables', { method: 'POST', body: JSON.stringify({
        project_id: projectId, log_date: logDate, store_id: store, submission_id: id,
        items: lines.map(line => ({ item_id: line.item_id, quantity: line.quantity })),
      }) });
      setLines([{ item_id: '', quantity: '1' }]); setSubmissionId('');
      window.dispatchEvent(new Event('field-consumables-changed'));
      notify({ type: 'success', message: result.status === 'POSTED' ? 'Consumables saved and inventory updated.' : 'Consumables saved as an inventory issue awaiting approval.' });
    } catch (err) { fail(err instanceof Error ? err.message : 'Could not save consumables.'); }
    finally { setBusy(false); onBusyChange?.(false); }
  };
  return <section className="space-y-3 border rounded-lg p-3" aria-label="Shift date consumables">
    <div className="flex items-center justify-between gap-2"><h4 className="font-bold">Consumables used — {logDate || 'Select a date'}</h4>
      <button type="button" className="btn-secondary text-xs" disabled={busy || loading} onClick={() => setVersion(v => v + 1)}>Refresh</button></div>
    <p className="text-xs text-muted-foreground">Shared with consumables logging for this project and date. Save new entries here before submitting the shift; already logged items are not added again.</p>
    {error && <p role="alert" className="text-destructive whitespace-pre-wrap">{error}</p>}
    {loading ? <p role="status">Loading consumables…</p> : rows.length ? <div className="overflow-x-auto"><table className="w-full text-xs"><thead><tr className="text-left"><th>Item</th><th>Quantity</th><th>Issue</th><th>Status</th></tr></thead><tbody>
      {rows.map(row => <tr key={row.id}><td className="py-2">{row.item_name}</td><td>{row.quantity} {row.unit || row.unit_of_measure || 'PCS'}</td><td>{row.document_number}</td><td>{row.status === 'DRAFT' ? 'Awaiting approval' : row.status}</td></tr>)}
    </tbody></table></div> : <p className="text-muted-foreground">No consumables logged for this date.</p>}
    <fieldset disabled={busy || loading || !projectId || !logDate} className="space-y-3">
      <label className="block">Store / Warehouse<select aria-label="Consumables store" className="w-full border rounded p-2 bg-background" value={store} onChange={e => { setStore(e.target.value); setSubmissionId(''); }}><option value="">Select store</option>{options.stores.map(row => <option key={row.id} value={row.id}>{row.name}</option>)}</select></label>
      {lines.map((line, index) => <div key={index} className="flex gap-2 items-end">
        <label className="flex-1">Item<select aria-label={`Consumable item ${index + 1}`} className="w-full border rounded p-2 bg-background" value={line.item_id} onChange={e => { setLines(old => old.map((row, i) => i === index ? { ...row, item_id: e.target.value } : row)); setSubmissionId(''); }}><option value="">Select consumable</option>{options.items.map(row => <option key={row.id} value={row.id}>{row.name} | UoM: {row.unit || row.unit_of_measure || 'PCS'}{row.requires_approval_to_issue ? ' — approval required' : ''}</option>)}</select></label>
        <label className="w-24">Quantity<input aria-label={`Consumable quantity ${index + 1}`} type="number" step="0.0001" min="0.0001" className="w-full border rounded p-2 bg-background" value={line.quantity} onChange={e => { setLines(old => old.map((row, i) => i === index ? { ...row, quantity: e.target.value } : row)); setSubmissionId(''); }} /></label>
        <button type="button" className="btn-secondary" disabled={lines.length === 1} onClick={() => { setLines(old => old.filter((_, i) => i !== index)); setSubmissionId(''); }} aria-label={`Remove consumable ${index + 1}`}>Remove</button>
      </div>)}
      <div className="flex gap-2"><button type="button" className="btn-secondary" onClick={() => { setLines(old => [...old, { item_id: '', quantity: '1' }]); setSubmissionId(''); }}>Add item</button>
        <button type="button" className="btn-primary" onClick={save}>{busy ? 'Saving…' : 'Save consumables'}</button></div>
    </fieldset>
  </section>;
}
