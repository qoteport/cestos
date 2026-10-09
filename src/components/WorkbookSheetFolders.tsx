'use client';
import { useEffect, useState } from 'react';
import { Folder, FolderPlus, Trash2, X } from 'lucide-react';
import type { FieldWorkbook } from '@/lib/fieldWorkbook';
import { changeFolder, removeFolder } from '@/lib/workbookMedia';
import SearchableSelect from './SearchableSelect';
export default function WorkbookSheetFolders({
  book,
  onChange,
  onClose,
  onSelect,
}: {
  book: FieldWorkbook;
  onChange: (book: FieldWorkbook) => void;
  onClose: () => void;
  onSelect: (index: number) => void;
}) {
  const [name, setName] = useState(''),
    [error, setError] = useState('');
  useEffect(() => {
    const close = (event: KeyboardEvent) => { if (event.key === 'Escape') onClose(); };
    window.addEventListener('keydown', close);
    return () => window.removeEventListener('keydown', close);
  }, [onClose]);
  const act = (fn: () => FieldWorkbook) => {
    try {
      onChange(fn());
      setError('');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not update folders.');
    }
  };
  return (
    <div className="fixed inset-0 z-[75] flex items-center justify-center bg-slate-950/50 p-4">
      <section
        role="dialog"
        aria-modal="true"
        aria-label="Organize worksheets"
        className="max-h-[85dvh] w-full max-w-2xl overflow-auto rounded-xl bg-white p-5 shadow-xl dark:bg-slate-900"
      >
        <div className="flex items-center justify-between">
          <h3 className="flex items-center gap-2 font-semibold">
            <Folder size={18} />
            Organize sheets
          </h3>
          <button type="button" aria-label="Close folders" onClick={onClose}>
            <X size={18} />
          </button>
        </div>
        <p className="my-2 text-sm text-slate-500">
          Group related sheets. Removing a folder keeps its sheets in Unfiled. Changes can be
          undone.
        </p>
        <div className="my-3 flex gap-2">
          <input
            aria-label="New folder name"
            maxLength={60}
            placeholder="Folder name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="min-w-0 flex-1 rounded border bg-transparent p-2 text-sm"
          />
          <button
            type="button"
            disabled={!name.trim() || (book.folders?.length || 0) >= 50}
            className="flex items-center gap-2 rounded border px-3 text-sm"
            onClick={() => {
              act(() => changeFolder(book, crypto.randomUUID(), name));
              setName('');
            }}
          >
            <FolderPlus size={16} />
            Create
          </button>
        </div>
        {error && (
          <p role="alert" className="text-sm text-red-600">
            {error}
          </p>
        )}
        <div className="space-y-2">
          {(book.folders || []).map((f) => (
            <div key={f.id} className="flex items-center gap-2 rounded border p-2">
              <Folder size={16} />
              <input
                aria-label={`Rename folder ${f.name}`}
                key={f.id + f.name}
                defaultValue={f.name}
                maxLength={60}
                className="min-w-0 flex-1 bg-transparent text-sm"
                onBlur={(e) => {
                  if (e.target.value !== f.name)
                    act(() => changeFolder(book, f.id, e.target.value));
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') e.currentTarget.blur();
                }}
              />
              <span className="text-xs text-slate-500">
                {book.sheets.filter((s) => s.folderId === f.id).length} sheets
              </span>
              <button
                type="button"
                aria-label={`Remove folder ${f.name}`}
                className="rounded p-1 text-red-600"
                onClick={() => act(() => removeFolder(book, f.id))}
              >
                <Trash2 size={16} />
              </button>
            </div>
          ))}
        </div>
        <h4 className="mb-2 mt-5 text-sm font-semibold">Move sheets to folders</h4>
        <div className="space-y-2">
          {book.sheets.map((s, i) => (
            <div key={s.id} className="grid grid-cols-2 items-center gap-3 rounded border p-2">
              <button
                type="button"
                className="truncate text-left text-sm underline"
                onClick={() => {
                  onSelect(i);
                  onClose();
                }}
              >
                {s.name}
              </button>
              <SearchableSelect
                ariaLabel={`Folder for ${s.name}`}
                value={s.folderId || ''}
                options={[
                  { value: '', label: 'Unfiled' },
                  ...(book.folders || []).map((f) => ({ value: f.id, label: f.name })),
                ]}
                onChange={(folderId) =>
                  onChange({
                    ...book,
                    sheets: book.sheets.map((row) =>
                      row.id === s.id ? { ...row, folderId: folderId || undefined } : row
                    ),
                  })
                }
              />
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
