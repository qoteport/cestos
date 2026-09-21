'use client';
import { useEffect, useState } from 'react';
import { apiFetch } from '@/lib/api';
import { Modal } from './DataUI';
import useAppFeedback from './useAppFeedback';

type RecordRow = Record<string, any>;
const columns = {
  maintenance: ['title', 'maintenance_type', 'priority', 'status', 'scheduled_date', 'completed_at', 'notes'],
  fuel: ['recorded_at', 'fuel_type', 'quantity_litres', 'meter_reading', 'supplier', 'notes'],
  meter: ['recorded_at', 'reading', 'reading_type', 'source', 'notes'],
};
export default function FieldEquipmentDetails({ asset, projectId, onClose }: { asset: RecordRow; projectId: string; onClose: () => void }) {
  const [kind, setKind] = useState<keyof typeof columns>('maintenance');
  const [page, setPage] = useState(1);
  const [data, setData] = useState<RecordRow | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [retry, setRetry] = useState(0);
  const { notify } = useAppFeedback();
  useEffect(() => {
    const controller = new AbortController();
    setLoading(true); setData(null); setError('');
    const query = new URLSearchParams({ project_id: projectId, kind, page: String(page) });
    apiFetch<RecordRow>(`/api/v1/field-portal/equipment/${asset.id}/history?${query}`, { signal: controller.signal })
      .then(value => { if (!controller.signal.aborted) setData(value); })
      .catch(error => { if (!controller.signal.aborted) { setError(error.message); notify({ type: 'error', message: error.message }); } })
      .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [asset.id, projectId, kind, page, retry, notify]);
  return <Modal title={`Equipment details · ${asset.name || asset.asset_number}`} onClose={onClose} className="max-w-5xl">
    <div className="space-y-4 text-sm">
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {['asset_number', 'make', 'model', 'status', 'serial_number', 'current_meter_reading', 'meter_type'].map(key => <div key={key}>
          <dt className="text-xs text-muted-foreground capitalize">{key.replace(/_/g, ' ')}</dt><dd>{data?.asset?.[key] ?? asset[key] ?? '—'}</dd>
        </div>)}
      </div>
      <div className="flex flex-wrap gap-2" role="tablist" aria-label="Equipment history">
        {(['maintenance', 'fuel', 'meter'] as const).map(value => <button type="button" key={value} role="tab" aria-selected={kind === value}
          className={kind === value ? 'btn-primary' : 'btn-secondary'} onClick={() => { setKind(value); setPage(1); }}>
          {{ maintenance: 'Maintenance records', fuel: 'Fuel logs', meter: 'Meter readings' }[value]}</button>)}
      </div>
      {loading ? <p role="status">Loading records…</p> : error
        ? <button className="btn-secondary" onClick={() => setRetry(value => value + 1)}>Retry records</button>
        : <div className="overflow-x-auto"><table className="w-full text-left text-xs">
          <thead><tr>{columns[kind].map(key => <th key={key} className="p-2 border-b capitalize">{key.replace(/_/g, ' ')}</th>)}</tr></thead>
          <tbody>{data?.items?.map((row: RecordRow) => <tr key={`${row.source || kind}-${row.id}`}>
            {columns[kind].map(key => <td key={key} className="p-2 border-b whitespace-pre-wrap">{key === 'status' && row.approved_at ? 'APPROVED' : String(row[key] ?? '—')}</td>)}
          </tr>)}</tbody>
        </table>{!data?.items?.length && <p className="py-4 text-muted-foreground">No records found.</p>}</div>}
      <div className="flex justify-between items-center">
        <button className="btn-secondary" disabled={loading || page === 1} onClick={() => setPage(value => value - 1)}>Previous</button>
        <span>Page {page} · {data?.total ?? 0} records</span>
        <button className="btn-secondary" disabled={loading || !data || page * data.page_size >= data.total} onClick={() => setPage(value => value + 1)}>Next</button>
      </div>
    </div>
  </Modal>;
}
