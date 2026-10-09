'use client';
import { useState } from 'react';
import { Paperclip, Download, Trash2, Upload, X } from 'lucide-react';
import {
  assetUrl,
  imageMime,
  videoMime,
  readWorkbookAsset,
  type WorkbookAsset,
} from '@/lib/workbookMedia';
import { downloadBlob } from '@/lib/api';
export default function WorkbookCellMedia({
  title,
  assets,
  onClose,
  onAdd,
  onRemove,
}: {
  title: string;
  assets: WorkbookAsset[];
  onClose: () => void;
  onAdd?: (assets: WorkbookAsset[]) => void;
  onRemove?: (id: string) => void;
}) {
  const [busy, setBusy] = useState(false),
    [error, setError] = useState('');
  async function add(files: FileList | null) {
    if (!files?.length || !onAdd) return;
    setBusy(true);
    setError('');
    try {
      if (files.length + assets.length > 10) throw Error('A cell can hold up to 10 attachments.');
      const items = await Promise.all(Array.from(files).map(readWorkbookAsset));
      onAdd(items);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not attach files.');
    } finally {
      setBusy(false);
    }
  }
  function download(a: WorkbookAsset) {
    const bytes = Uint8Array.from(atob(a.data), (ch) => ch.charCodeAt(0));
    downloadBlob(new Blob([bytes], { type: 'application/octet-stream' }), a.name);
  }
  return (
    <div
      className="fixed inset-0 z-[85] flex items-center justify-center bg-slate-950/50 p-4"
      onKeyDown={(e) => {
        if (e.key === 'Escape') {
          e.stopPropagation();
          onClose();
        }
      }}
    >
      <section
        role="dialog"
        aria-modal="true"
        aria-label="Cell attachments"
        className="max-h-[90dvh] w-full max-w-2xl overflow-auto rounded-xl bg-white p-5 text-slate-900 shadow-xl dark:bg-slate-900 dark:text-slate-100"
      >
        <div className="flex items-center justify-between">
          <h3 className="flex items-center gap-2 font-semibold">
            <Paperclip size={18} />
            {title}
          </h3>
          <button type="button" aria-label="Close attachments" onClick={onClose}>
            <X size={20} />
          </button>
        </div>
        {onAdd && (
          <label className="my-4 flex cursor-pointer items-center justify-center gap-2 rounded-lg border-2 border-dashed p-5 text-sm">
            <Upload size={18} />
            {busy ? 'Adding files...' : 'Add images, files or videos'}
            <input
              aria-label="Attach files to cell"
              type="file"
              multiple
              disabled={busy}
              className="sr-only"
              onChange={(e) => {
                void add(e.target.files);
                e.target.value = '';
              }}
            />
          </label>
        )}
        <p className="my-2 text-xs text-slate-500">
          Media uploads to the document library and stays cached here for offline use. Excel and CSV exports include secure file links. Up to 8 MB per file, 10 per cell
          and 20 MB per workbook. Download other file types to open them on your device.
        </p>
        {error && (
          <p role="alert" className="my-2 text-sm text-red-600">
            {error}
          </p>
        )}
        {!assets.length && (
          <p className="py-6 text-center text-sm text-slate-500">
            No attachments in this cell yet.
          </p>
        )}
        <div className="space-y-3">
          {assets.map((a) => (
            <article key={a.id} className="rounded-lg border p-3">
              {imageMime(a.mime) ? (
                <img
                  src={assetUrl(a)}
                  alt={a.name}
                  className="mx-auto max-h-64 max-w-full object-contain"
                />
              ) : videoMime(a.mime) ? (
                <video src={assetUrl(a)} controls preload="metadata" className="max-h-72 w-full" />
              ) : (
                <div className="flex items-center gap-2 p-3 text-slate-500">
                  <Paperclip size={24} />
                  <span>File attachment</span>
                </div>
              )}
              <div className="mt-3 flex items-center gap-2">
                <span className="min-w-0 flex-1 break-all text-sm">
                  {a.name}
                  <span className="block text-xs text-slate-500">
                    {(a.size / 1024).toFixed(0)} KB · {a.documentId ? 'Server link ready' : 'Saved offline · upload pending'}
                  </span>
                </span>
                <button
                  type="button"
                  aria-label={`Download ${a.name}`}
                  className="rounded border p-2"
                  onClick={() => download(a)}
                >
                  <Download size={16} />
                </button>
                {onRemove && (
                  <button
                    type="button"
                    aria-label={`Remove ${a.name}`}
                    disabled={busy}
                    className="rounded border p-2 text-red-600"
                    onClick={() => onRemove(a.id)}
                  >
                    <Trash2 size={16} />
                  </button>
                )}
              </div>
            </article>
          ))}
        </div>
      </section>
    </div>
  );
}
