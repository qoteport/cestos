'use client';
import { useEffect, useState } from 'react';
import { apiFetch, ApiError } from '@/lib/api';
import type { FieldWorkbook } from '@/lib/fieldWorkbook';
export default function WorkbookShareDialog({
  book,
  onClose,
}: {
  book: FieldWorkbook;
  onClose: () => void;
}) {
  const [emails, setEmails] = useState(''),
    [edit, setEdit] = useState(false),
    [days, setDays] = useState(7),
    [url, setUrl] = useState(''),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(''),
    [shares, setShares] = useState<{ id: string; expires_at: string; editors: number }[]>([]);
  const policy = {
    queueWhenOffline: false,
    cacheOfflineRead: false,
    cacheResponse: false,
    memoryCache: false,
  };
  const message = (e: unknown) =>
    e instanceof ApiError && e.status === 404
      ? 'Sharing is not available on this server yet. Deploy the workbook sharing backend and migration.'
      : e instanceof Error
        ? e.message
        : 'Sharing failed.';
  async function refresh() {
    try {
      const rows = await apiFetch<{ id: string; expires_at: string; editors: number }[]>(
        `/api/v1/workbook-shares?workbook_id=${encodeURIComponent(book.id)}`,
        {},
        true,
        policy
      );
      if (!Array.isArray(rows)) throw new Error('The server returned an invalid sharing response.');
      setShares(rows);
    } catch (e) {
      setError(message(e));
    }
  }
  useEffect(() => {
    void refresh();
  }, [book.id]);
  async function create() {
    setBusy(true);
    setError('');
    try {
      const result = await apiFetch<{ token: string }>(
        '/api/v1/workbook-shares',
        {
          method: 'POST',
          body: JSON.stringify({
            workbook: book,
            editor_emails: edit
              ? emails
                  .split(/[;,\n]/)
                  .map((e) => e.trim())
                  .filter(Boolean)
              : [],
            expires_days: days,
          }),
        },
        true,
        policy
      );
      setUrl(`${location.origin}/workbook-share#${result.token}`);
      await refresh();
    } catch (e) {
      setError(message(e));
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/40 p-4">
      <section
        role="dialog"
        aria-modal="true"
        aria-label="Share workbook"
        className="max-h-[85vh] w-full max-w-lg overflow-auto rounded-xl bg-white p-5 dark:bg-slate-900"
      >
        <h3 className="text-lg font-bold">Share workbook</h3>
        <p className="my-3 text-sm">
          Create a separate shared copy of the visible sheets. Anyone with the link can view it.
          Cell attachments on visible sheets are included. The original Excel file, hidden sheets and database mappings are excluded. Later
          changes to this local workbook do not automatically change the shared copy.
        </p>
        <label className="my-3 flex items-center gap-2 text-sm">
          <input type="checkbox" checked={edit} onChange={(e) => setEdit(e.target.checked)} />
          Allow named users to edit
        </label>
        {edit && (
          <label className="block text-sm">
            Editor account emails (same organization)
            <textarea
              className="input-field my-2 w-full"
              placeholder="name@company.com, colleague@company.com"
              value={emails}
              onChange={(e) => setEmails(e.target.value)}
            />
          </label>
        )}
        <label className="flex items-center gap-2 text-sm">
          Link expires in
          <input
            className="input-field w-20"
            type="number"
            min={1}
            max={90}
            value={days}
            onChange={(e) => setDays(Number(e.target.value))}
          />
          days
        </label>
        {error && (
          <p role="alert" className="my-3 text-sm text-red-600">
            {error}
          </p>
        )}
        {url && (
          <div className="my-3">
            <label className="text-sm">
              Share link
              <input
                className="input-field mt-1 w-full"
                readOnly
                value={url}
                onFocus={(e) => e.target.select()}
              />
            </label>
            <button
              type="button"
              className="mt-2 rounded border px-3 py-1"
              onClick={() =>
                void navigator.clipboard
                  .writeText(url)
                  .catch(() => setError('Select and copy the link manually.'))
              }
            >
              Copy link
            </button>
          </div>
        )}
        <div className="my-4 flex gap-2">
          <button
            type="button"
            className="btn-primary"
            disabled={busy || days < 1 || days > 90 || (edit && !emails.trim())}
            onClick={() => void create()}
          >
            {busy ? 'Creating…' : 'Create share link'}
          </button>
          <button type="button" className="rounded border px-3 py-1" onClick={onClose}>
            Close
          </button>
        </div>
        {shares.length > 0 && (
          <>
            <h4 className="font-semibold">Your existing links</h4>
            {shares.map((share) => (
              <div
                key={share.id}
                className="my-2 flex items-center justify-between gap-2 border-t py-2 text-xs"
              >
                <span>
                  Expires {new Date(share.expires_at).toLocaleDateString()} · {share.editors}{' '}
                  editors
                </span>
                <button
                  type="button"
                  disabled={busy}
                  onClick={async () => {
                    setBusy(true);
                    try {
                      await apiFetch(
                        `/api/v1/workbook-shares/${share.id}`,
                        { method: 'DELETE' },
                        true,
                        policy
                      );
                      setUrl('');
                      await refresh();
                    } catch (e) {
                      setError(message(e));
                    } finally {
                      setBusy(false);
                    }
                  }}
                >
                  Revoke
                </button>
              </div>
            ))}
          </>
        )}
      </section>
    </div>
  );
}
