'use client';
import { useEffect, useState } from 'react';
import { apiFetch, apiFetchBlob, downloadBlob } from '@/lib/api';
import useAppFeedback from './useAppFeedback';

type Work = Record<string, any>;
export default function WorkCompletionDetails({ work, fieldPortal = false }: { work: Work; fieldPortal?: boolean }) {
  const [data, setData] = useState<Work | null>(null);
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);
  const [retry, setRetry] = useState(0);
  const { notify } = useAppFeedback();
  const kind = work.source === 'work_order' || work.wo_number ? 'WORK_ORDER' : 'MAINTENANCE';
  const path = fieldPortal ? `/api/v1/field-portal/work-orders/${work.id}/completion`
    : `/api/v1/assets/${work.asset_id}/logs/${kind}/${work.id}/completion`;
  useEffect(() => {
    const controller = new AbortController();
    setLoading(true); setFailed(false); setData(null);
    apiFetch<Work>(path, { signal: controller.signal }).then(value => {
      if (!controller.signal.aborted) setData(value);
    }).catch(error => {
      if (!controller.signal.aborted) { setFailed(true); notify({ type: 'error', message: error.message }); }
    }).finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [path, retry, work.completed_at, notify]);
  return <section className="border rounded-lg p-4 space-y-3 text-sm" aria-label="Work completion records">
    <h3 className="font-bold">Completion notes & documents</h3>
    {loading ? <p role="status">Loading completion records…</p> : failed
      ? <button type="button" className="btn-secondary" onClick={() => setRetry(value => value + 1)}>Retry completion records</button>
      : <>
        {data?.completed_at && <p className="text-xs text-muted-foreground">Completed {new Date(data.completed_at).toLocaleString()}</p>}
        <p className="whitespace-pre-wrap break-words">{data?.completion_notes || data?.notes || 'No completion notes recorded.'}</p>
        {data?.files?.length ? <ul className="space-y-2">{data.files.map((file: Work) => <li key={file.id}>
          <button type="button" className="text-primary underline text-left break-all" onClick={async () => {
            try { downloadBlob(await apiFetchBlob(file.download_url), file.file_name); }
            catch (error) { notify({ type: 'error', message: error instanceof Error ? error.message : 'Could not download the document.' }); }
          }}>{file.file_name}</button>
          {file.size_bytes != null && <span className="ml-2 text-xs text-muted-foreground">({(file.size_bytes / 1024).toFixed(1)} KB)</span>}
        </li>)}</ul> : <p className="text-xs text-muted-foreground">No completion documents uploaded.</p>}
      </>}
  </section>;
}
