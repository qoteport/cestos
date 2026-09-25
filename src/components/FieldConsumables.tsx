'use client';

import { useEffect, useState } from 'react';
import { apiFetch } from '@/lib/api';
import useAppFeedback from './useAppFeedback';
import SearchableSelect from './SearchableSelect';

type Row = Record<string, any>;
type Line = { item_id: string; quantity: string; bucket_id?: string; serial_id?: string };
type Options = { items: Row[]; stores: Row[]; stock: Row[]; serials: Row[] };
export default function FieldConsumables({ projectId, logDate, onBusyChange, onDirtyChange }: {
  projectId: string; logDate: string; onBusyChange?: (busy: boolean) => void; onDirtyChange?: (dirty: boolean) => void;
}) {
  const [rows, setRows] = useState<Row[]>([]);
  const [options, setOptions] = useState<Options>({ items: [], stores: [], stock: [], serials: [] });
  const [store, setStore] = useState('');
  const [lines, setLines] = useState<Line[]>([{ item_id: '', quantity: '1' }]);
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [version, setVersion] = useState(0);
  const [submissionId, setSubmissionId] = useState('');
  const { notify } = useAppFeedback();
  const availableItems = options.items.filter(item => !store || options.stock.some(stock => stock.item_id === item.id && stock.store_id === store && Number(stock.available ?? 0) > 0));
  useEffect(() => { onDirtyChange?.(lines.some(line => !!line.item_id)); }, [lines, onDirtyChange]);
  useEffect(() => () => { onDirtyChange?.(false); }, [onDirtyChange]);
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
      apiFetch<Options>(`/api/v1/field-portal/consumables/options?project_id=${encodeURIComponent(projectId)}`, { signal: abort.signal }),
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
    if (lines.some(line => !line.bucket_id && options.stock.filter(bucket => bucket.item_id === line.item_id && bucket.store_id === store).length > 1)) return fail('Choose a stock location for each item with multiple locations.');
    setError(''); setBusy(true); onBusyChange?.(true);
    const id = submissionId || crypto.randomUUID();
    setSubmissionId(id);
    try {
      const result = await apiFetch<Row>('/api/v1/field-portal/consumables', { method: 'POST', body: JSON.stringify({
        project_id: projectId, log_date: logDate, store_id: store, submission_id: id,
        items: lines.map(line => {
          const buckets = options.stock.filter(bucket => bucket.item_id === line.item_id && bucket.store_id === store);
          const bucket = buckets.find(row => row.id === line.bucket_id) || (buckets.length === 1 ? buckets[0] : undefined);
          return { item_id: line.item_id, quantity: line.quantity, bin_id: bucket?.bin_id, lot_id: bucket?.lot_id, serial_id: line.serial_id || undefined };
        }),
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
    {error && <p role="alert" className="text-destructive whitespace-pre-wrap">{error}</p>}
    {loading ? <p role="status">Loading consumables…</p> : rows.length ? <div className="overflow-x-auto"><table className="w-full text-xs"><thead><tr className="text-left"><th>Item</th><th>Quantity</th><th>Issue</th><th>Status</th></tr></thead><tbody>
      {rows.map(row => <tr key={row.id}><td className="py-2">{row.item_name}</td><td>{row.quantity} {row.unit || row.unit_of_measure || 'PCS'}</td><td>{row.document_number}</td><td>{row.status === 'DRAFT' ? 'Awaiting approval' : row.status}</td></tr>)}
    </tbody></table></div> : <p className="text-muted-foreground">No consumables logged for this date.</p>}
    <fieldset disabled={busy || loading || !projectId || !logDate} className="space-y-3">
      <div>
        <label className="block text-xs font-semibold mb-1">Store / Warehouse</label>
        <SearchableSelect
          ariaLabel="Consumables store"
          value={store}
          onChange={(val) => {
            setStore(val);
            setLines((old) => old.map((line) => ({ ...line, item_id: '', bucket_id: '', serial_id: '' })));
            setSubmissionId('');
          }}
          options={[
            { value: '', label: 'Select store' },
            ...options.stores.map((row) => ({ value: row.id, label: row.name })),
          ]}
          placeholder="Select store"
          searchable={options.stores.length > 5}
        />
      </div>
      {lines.map((line, index) => <div key={index} className="flex flex-wrap gap-2 items-end">
        <div className="flex-1 min-w-[220px]"><span className="block mb-1">Item</span><SearchableSelect ariaLabel={`Consumable item ${index + 1}`} value={line.item_id} onChange={value => { setLines(old => old.map((row, i) => i === index ? { ...row, item_id: value, bucket_id: '', serial_id: '' } : row)); setSubmissionId(''); }} options={availableItems.map(row => ({ value: row.id, label: `${row.name} | UoM: ${row.unit || row.unit_of_measure || 'PCS'}${row.requires_approval_to_issue ? ' — approval required' : ''}` }))} placeholder={store ? 'Search consumables' : 'Select a store first'} /></div>
        <div className="flex-1 min-w-[180px]">
          <span className="block mb-1">Stock location</span>
          <SearchableSelect
            ariaLabel={`Stock location ${index + 1}`}
            value={line.bucket_id || ''}
            onChange={(val) => {
              setLines((old) => old.map((row, i) => (i === index ? { ...row, bucket_id: val, serial_id: '' } : row)));
              setSubmissionId('');
            }}
            options={[
              { value: '', label: 'Default / select stock' },
              ...options.stock
                .filter((row) => row.item_id === line.item_id && row.store_id === store)
                .map((row) => ({
                  value: row.id,
                  label: `${row.bin || 'Unbinned'}${row.lot ? ` / ${row.lot}` : ''} — ${row.available} available`,
                })),
            ]}
            placeholder="Default / select stock"
            searchable={false}
          />
        </div>
        {options.serials.some(row => row.item_id === line.item_id && row.store_id === store) && (
          <div className="flex-1 min-w-[150px]">
            <span className="block mb-1">Serial</span>
            <SearchableSelect
              ariaLabel={`Serial ${index + 1}`}
              value={line.serial_id || ''}
              onChange={(val) => {
                setLines((old) => old.map((row, i) => (i === index ? { ...row, serial_id: val } : row)));
                setSubmissionId('');
              }}
              options={[
                { value: '', label: 'Select serial' },
                ...options.serials
                  .filter((row) => row.item_id === line.item_id && row.store_id === store)
                  .map((row) => ({ value: row.id, label: row.serial_number })),
              ]}
              placeholder="Select serial"
              searchable={false}
            />
          </div>
        )}
        <label className="w-24">Quantity<input aria-label={`Consumable quantity ${index + 1}`} type="number" step="0.0001" min="0.0001" className="w-full border rounded p-2 bg-background" value={line.quantity} onChange={e => { setLines(old => old.map((row, i) => i === index ? { ...row, quantity: e.target.value } : row)); setSubmissionId(''); }} /></label>
        <button type="button" className="btn-secondary" disabled={lines.length === 1} onClick={() => { setLines(old => old.filter((_, i) => i !== index)); setSubmissionId(''); }} aria-label={`Remove consumable ${index + 1}`}>Remove</button>
      </div>)}
      <div className="flex gap-2"><button type="button" className="btn-secondary" onClick={() => { setLines(old => [...old, { item_id: '', quantity: '1' }]); setSubmissionId(''); }}>Add item</button>
        <button type="button" className="btn-primary" onClick={save}>{busy ? 'Saving…' : 'Save consumables'}</button></div>
    </fieldset>
  </section>;
}
