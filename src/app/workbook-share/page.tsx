'use client';
import WorkbookCellMedia from '@/components/WorkbookCellMedia';
import type {WorkbookAsset} from '@/lib/workbookMedia';
import { useEffect, useRef, useState } from 'react';
import { apiFetch, downloadBlob } from '@/lib/api';
import { useAuth } from '@/components/AuthProvider';
import FieldWorkbookDialog from '@/components/FieldWorkbookDialog';
import FieldWorkbookWorkspace from '@/components/FieldWorkbookWorkspace';
import { validateWorkbook, exportWorkbook, type FieldWorkbook } from '@/lib/fieldWorkbook';
import { printSheet, printableSheetHtml } from '@/lib/workbookConvenience';
const policy = {
  cacheOfflineRead: false,
  cacheResponse: false,
  memoryCache: false,
  bypassMemoryRead: true,
  queueWhenOffline: false,
};
export default function SharedWorkbookPage() {
  const { user, loading } = useAuth();
  const [refresh, setRefresh] = useState(0);
  const [token, setToken] = useState(''),
    [book, setBook] = useState<FieldWorkbook | null>(null),
    [error, setError] = useState(''),
    [canEdit, setCanEdit] = useState(false),
    [editing, setEditing] = useState(false),
    [sheet, setSheet] = useState(0);
  const revision = useRef(0);
  const [mediaKey,setMediaKey]=useState<string|null>(null);
  useEffect(() => {
    setToken(location.hash.slice(1));
  }, []);
  useEffect(() => {
    if (!token) return;
    let active = true;
    setBook(null);
    setError('');
    void apiFetch<{ workbook: FieldWorkbook; revision: number }>(
      `/api/v1/workbook-shares/${encodeURIComponent(token)}`,
      {},
      false,
      policy
    )
      .then((data) => {
        if (active) {
          setBook(validateWorkbook(data.workbook));
          revision.current = data.revision;
        }
      })
      .catch((e) => {
        if (active) setError(e.message);
      });
    return () => {
      active = false;
    };
  }, [token, refresh]);
  useEffect(() => {
    setCanEdit(false);
    if (!token || !user) return;
    let active = true;
    void apiFetch<{ can_edit: boolean }>(
      `/api/v1/workbook-shares/${encodeURIComponent(token)}/access`,
      {},
      true,
      policy
    )
      .then((data) => {
        if (active) setCanEdit(data.can_edit);
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, [token, user?.id]);
  async function publish(next: FieldWorkbook) {
    const result = await apiFetch<{ revision: number }>(
      `/api/v1/workbook-shares/${encodeURIComponent(token)}`,
      { method: 'PUT', body: JSON.stringify({ workbook: next, revision: revision.current }) },
      true,
      policy
    );
    revision.current = result.revision;
  }
  const active = book?.sheets[sheet];
  return (
    <main className="min-h-screen bg-slate-50 p-4 text-slate-900">
      <header className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold">{book?.name || 'Shared workbook'}</h1>
          <p className="text-sm text-slate-500">
            {canEdit
              ? 'You have permission to edit this shared copy.'
              : 'Read-only shared workbook'}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            className="rounded border px-3 py-2"
            onClick={() => setRefresh((value) => value + 1)}
          >
            Refresh
          </button>
          <button
            className="rounded border px-3 py-2 disabled:opacity-40"
            disabled={!canEdit || loading}
            onClick={() => setEditing(true)}
          >
            Edit workbook
          </button>
          <button
            className="rounded border px-3 py-2 disabled:opacity-40"
            disabled={!canEdit}
            onClick={() => location.assign('/field-admin-portal')}
          >
            New workbook
          </button>
          {!user && !loading && (
            <a className="rounded border px-3 py-2" href="/sign-up-login">
              Sign in to check edit access
            </a>
          )}
          <button
            className="rounded border px-3 py-2"
            disabled={!active}
            onClick={() => {
              try {
                if (active && book) printSheet(active, book.name,book.assets);
              } catch (e) {
                setError(e instanceof Error ? e.message : 'Print failed');
              }
            }}
          >
            Print active sheet
          </button>
          <button
            className="rounded border px-3 py-2"
            disabled={!book}
            onClick={() => {
              if (book)
                void exportWorkbook(book)
                  .then((blob) =>
                    downloadBlob(blob, `${book.name.replace(/[\\/:*?"<>|]/g, '-')}.xlsx`)
                  )
                  .catch((e) => setError(e.message));
            }}
          >
            Download Excel
          </button>
        </div>
      </header>
      {error && (
        <p role="alert" className="my-3 text-red-600">
          {error}
        </p>
      )}
      {!token && (
        <p>The share link is missing. Open the complete link supplied by the workbook owner.</p>
      )}
      {book && active && (
        <>
          <nav className="mb-3 flex gap-2" aria-label="Shared worksheets">
            {book.sheets.map((s, i) => (
              <button
                key={s.id}
                className={`rounded border px-3 py-1 ${sheet === i ? 'bg-emerald-100' : ''}`}
                onClick={() => {setSheet(i);setMediaKey(null);}}
              >
                {book.folders?.find(f=>f.id===s.folderId)?.name ? `${book.folders.find(f=>f.id===s.folderId)!.name} / ` : ''}{s.name}
              </button>
            ))}
          </nav>
          {!!Object.keys(active.media||{}).length&&<div className="my-3 flex flex-wrap gap-2" aria-label="Sheet attachments">{Object.entries(active.media||{}).filter(([,ids])=>ids.length).map(([key,ids])=><button key={key} type="button" className="rounded border px-3 py-1 text-sm" onClick={()=>setMediaKey(key)}>Attachments · row {Number(key.split(':')[0])+1}, column {Number(key.split(':')[1])+1} ({ids.length})</button>)}</div>}
          {mediaKey&&<WorkbookCellMedia title="Shared cell attachments" assets={(active.media?.[mediaKey]||[]).map(id=>book.assets?.[id]).filter((a):a is WorkbookAsset=>!!a)} onClose={()=>setMediaKey(null)}/>}
          <iframe
            title="Read-only worksheet"
            sandbox=""
            className="h-[75vh] w-full border bg-white"
            srcDoc={printableSheetHtml(active, book.name,book.assets)}
          />
        </>
      )}
      {canEdit && book && user && (
        <FieldWorkbookDialog
          open={editing}
          onClose={() => {
            setEditing(false);
            setRefresh((value) => value + 1);
          }}
        >
          <FieldWorkbookWorkspace
            projects={[]}
            assets={[]}
            employees={[]}
            sites={[]}
            storageScope={`shared:${user.id}:${book.id}:${token}`}
            initialWorkbook={book}
            onPublish={publish}
          />
        </FieldWorkbookDialog>
      )}
    </main>
  );
}
