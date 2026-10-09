'use client';
import { useEffect, useMemo, useState } from 'react';
import {
  Folder,
  FolderPlus,
  FolderInput,
  FileSpreadsheet,
  Copy,
  Trash2,
  Pencil,
  Plus,
  ChevronRight,
  ChevronDown,
  AlertTriangle,
  X,
} from 'lucide-react';
import SearchableSelect from './SearchableSelect';
import { readDeviceLibrary, saveDeviceLibrary, type DeviceWorkbook } from '@/lib/workbookDevice';

type Document = { id: string; title: string; tags: string[]; created_at: string };
type Organization = { folders: { id: string; name: string; parentId?: string }[]; files: Record<string, string> };

const control = 'rounded-lg border px-2 py-1.5 text-xs disabled:opacity-40 hover:bg-slate-50 dark:hover:bg-slate-800';

export default function WorkbookLibrary({
  scope,
  documents,
  devices,
  busy,
  loading,
  onRefresh,
  onOpen,
  onCopy,
  onDelete,
}: {
  scope: string;
  documents: Document[];
  devices: DeviceWorkbook[];
  busy: boolean;
  loading: boolean;
  onRefresh: () => void;
  onOpen: (doc?: Document, device?: DeviceWorkbook) => void;
  onCopy: (doc?: Document, device?: DeviceWorkbook) => void;
  onDelete: (doc: Document) => void;
}) {
  const [organization, setOrganization] = useState<Organization>({ folders: [], files: {} });
  const [ready, setReady] = useState(false);
  const [error, setError] = useState('');
  const [folder, setFolder] = useState('*');
  const [query, setQuery] = useState('');
  const [sort, setSort] = useState('recent');
  const [page, setPage] = useState(1);
  const [folderName, setFolderName] = useState('');
  const [editing, setEditing] = useState<string | null>(null);
  const [moving, setMoving] = useState<{ id: string; name: string } | null>(null);

  // Delete folder confirmation modal state
  const [deletingFolder, setDeletingFolder] = useState<{
    id: string;
    name: string;
  } | null>(null);

  const [folderSearch, setFolderSearch] = useState('');
  const [expanded, setExpanded] = useState<string[]>(['root']);
  const [parentId, setParentId] = useState<string | undefined>();

  const pathFor = (id: string): string => {
    const parts: string[] = [];
    const seen = new Set<string>();
    let current = organization.folders.find(f => f.id === id);
    while (current && !seen.has(current.id)) {
      seen.add(current.id);
      parts.unshift(current.name);
      current = organization.folders.find(f => f.id === current!.parentId);
    }
    return parts.join(' / ');
  };

  const getSubtreeFolderIds = (folderId: string): string[] => {
    const ids = [folderId];
    let added = true;
    while (added) {
      added = false;
      for (const f of organization.folders) {
        if (f.parentId && ids.includes(f.parentId) && !ids.includes(f.id)) {
          ids.push(f.id);
          added = true;
        }
      }
    }
    return ids;
  };

  const matches = (id: string): boolean =>
    pathFor(id).toLowerCase().includes(folderSearch.toLowerCase()) ||
    organization.folders.some(f => f.parentId === id && matches(f.id));

  useEffect(() => {
    let live = true;
    setReady(false);
    void readDeviceLibrary<Organization>(`${scope}:file-folders`)
      .then(rows => {
        if (live) {
          setOrganization(rows?.[0] || { folders: [], files: {} });
          setReady(true);
        }
      })
      .catch(() => {
        if (live) setError('Could not load library folders. Reload to retry.');
      });
    return () => {
      live = false;
    };
  }, [scope]);

  const rows = useMemo(() => {
    const map = new Map<string, { id: string; name: string; date: string; template: boolean; doc?: Document; device?: DeviceWorkbook }>();
    for (const doc of documents) {
      const id = doc.tags.find(t => t.startsWith('wb-'))?.slice(3) || `document:${doc.id}`;
      map.set(id, { id, name: doc.title, date: doc.created_at, template: doc.tags.includes('workbook-template'), doc });
    }
    for (const device of devices) {
      const old = map.get(device.book.id);
      map.set(device.book.id, { ...old, id: device.book.id, name: device.book.name, date: device.savedAt, template: device.book.template, device });
    }
    return [...map.values()];
  }, [documents, devices]);

  const visible = useMemo(
    () =>
      rows
        .filter(row =>
          folder === '*'
            ? true
            : folder === ''
            ? !organization.files[row.id]
            : organization.files[row.id] === folder
        )
        .filter(row => row.name.toLowerCase().includes(query.toLowerCase()))
        .sort((a, b) => (sort === 'name' ? a.name.localeCompare(b.name) : b.date.localeCompare(a.date))),
    [rows, folder, organization, query, sort]
  );

  const pages = Math.max(1, Math.ceil(visible.length / 40));
  const current = Math.min(page, pages);

  useEffect(() => setPage(1), [folder, query, sort]);

  async function save(next: Organization) {
    try {
      await saveDeviceLibrary(`${scope}:file-folders`, [next]);
      setOrganization(next);
      setError('');
      return true;
    } catch {
      setError('Could not save folders on this device. Your files have not moved.');
      return false;
    }
  }

  async function saveFolder() {
    const name = folderName.trim();
    if (!name) return;
    const currentParent = editing
      ? organization.folders.find(item => item.id === editing)?.parentId
      : parentId;
    if (
      organization.folders.some(
        f =>
          f.id !== editing &&
          f.parentId === currentParent &&
          f.name.toLowerCase() === name.toLowerCase()
      )
    ) {
      setError('A folder with this name already exists.');
      return;
    }
    const id = editing || crypto.randomUUID();
    if (
      await save({
        ...organization,
        folders: editing
          ? organization.folders.map(f => (f.id === id ? { ...f, name } : f))
          : [...organization.folders, { id, name, parentId: currentParent }],
      })
    ) {
      setFolderName('');
      setEditing(null);
      setFolder(id);
      setExpanded(ids => [...ids, 'root', ...(currentParent ? [currentParent] : [])]);
    }
  }

  // Confirm Delete Folder Handlers
  const folderFilesToDelete = useMemo(() => {
    if (!deletingFolder) return [];
    const subtreeIds = getSubtreeFolderIds(deletingFolder.id);
    return rows.filter(r => organization.files[r.id] && subtreeIds.includes(organization.files[r.id]));
  }, [deletingFolder, organization, rows]);

  async function handleConfirmDeleteFolder(mode: 'move_to_unfiled' | 'delete_all') {
    if (!deletingFolder) return;
    const targetFolderId = deletingFolder.id;
    const subtreeIds = getSubtreeFolderIds(targetFolderId);

    const updatedFiles = { ...organization.files };

    if (mode === 'move_to_unfiled') {
      for (const file of folderFilesToDelete) {
        delete updatedFiles[file.id];
      }
    } else if (mode === 'delete_all') {
      for (const file of folderFilesToDelete) {
        delete updatedFiles[file.id];
        if (file.doc) {
          onDelete(file.doc);
        }
      }
    }

    const updatedFolders = organization.folders.filter(f => !subtreeIds.includes(f.id));

    if (await save({ folders: updatedFolders, files: updatedFiles })) {
      if (subtreeIds.includes(folder)) {
        setFolder('*');
      }
      setDeletingFolder(null);
    }
  }

  const tree = (parent?: string, depth = 0): React.ReactNode =>
    organization.folders
      .filter(f => f.parentId === parent)
      .filter(f => !folderSearch || matches(f.id))
      .map(f => {
        const children = organization.folders.some(child => child.parentId === f.id);
        const open = !!folderSearch || expanded.includes(f.id);
        const isSelected = folder === f.id;
        return (
          <div key={f.id}>
            <div
              className={`group/item flex items-center gap-1 rounded py-1 px-1 hover:bg-slate-100 dark:hover:bg-slate-800 ${
                isSelected ? 'bg-emerald-100 dark:bg-emerald-950 font-medium text-emerald-900 dark:text-emerald-200' : ''
              }`}
              style={{ paddingLeft: depth * 12 + 4 }}
            >
              <button
                type="button"
                aria-label={`${open ? 'Collapse' : 'Expand'} ${f.name}`}
                aria-expanded={children ? open : undefined}
                className="p-1 text-slate-500 hover:text-slate-900 dark:hover:text-slate-100"
                onClick={() => {
                  setFolder(f.id);
                  setExpanded(ids => (open ? ids.filter(id => id !== f.id) : [...ids, f.id]));
                }}
              >
                {children ? open ? <ChevronDown size={14} /> : <ChevronRight size={14} /> : <Folder size={14} />}
              </button>
              <button
                type="button"
                className="min-w-0 flex-1 truncate text-left text-xs"
                title={pathFor(f.id)}
                onClick={() => {
                  setFolder(f.id);
                  setExpanded(ids => (ids.includes(f.id) ? ids.filter(id => id !== f.id) : [...ids, f.id]));
                }}
              >
                {f.name}
              </button>

              <div className="flex items-center gap-0.5 opacity-80 group-hover/item:opacity-100">
                <button
                  type="button"
                  aria-label={`Rename folder ${f.name}`}
                  title="Rename folder"
                  className="p-1 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"
                  onClick={() => {
                    setEditing(f.id);
                    setFolderName(f.name);
                  }}
                >
                  <Pencil size={13} />
                </button>
                <button
                  type="button"
                  aria-label={`Delete folder ${f.name}`}
                  title="Delete folder"
                  className="p-1 text-slate-400 hover:text-red-600"
                  onClick={() => {
                    setDeletingFolder({ id: f.id, name: f.name });
                  }}
                >
                  <Trash2 size={13} />
                </button>
                <button
                  type="button"
                  aria-label={`Create subfolder in ${f.name}`}
                  title="Create subfolder"
                  className="p-1 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"
                  disabled={!ready}
                  onClick={() => {
                    setParentId(f.id);
                    setEditing(null);
                    setFolderName('');
                    setExpanded(ids => [...ids, f.id]);
                  }}
                >
                  <Plus size={14} />
                </button>
              </div>
            </div>
            {children && open && tree(f.id, depth + 1)}
          </div>
        );
      });

  return (
    <section className="overflow-hidden rounded-xl border bg-white dark:bg-slate-900">
      <header className="flex flex-wrap items-center justify-between gap-3 border-b p-4">
        <div>
          <h3 className="font-semibold">Saved workbooks & templates</h3>
          <p className="text-xs text-slate-500">{rows.length} files · Online and device copies together</p>
        </div>
        <div className="flex min-w-0 flex-1 items-center gap-2 sm:max-w-xl">
          <input
            aria-label="Search workbooks"
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="Search files in this folder…"
            className="min-w-0 flex-1 rounded-lg border bg-transparent px-3 py-2 text-sm"
          />
          <button type="button" className={control} disabled={loading} onClick={onRefresh}>
            Refresh
          </button>
        </div>
      </header>

      <div className="grid md:grid-cols-[220px_minmax(0,1fr)]">
        <aside className="space-y-2.5 border-b bg-slate-50/60 p-3 md:border-b-0 md:border-r dark:bg-slate-950/30">
          <div className="flex items-center justify-between">
            <button
              type="button"
              className="flex items-center gap-1 text-xs font-semibold"
              aria-expanded={expanded.includes('root')}
              onClick={() => setExpanded(ids => (ids.includes('root') ? ids.filter(id => id !== 'root') : [...ids, 'root']))}
            >
              {expanded.includes('root') ? <ChevronDown size={15} /> : <ChevronRight size={15} />}
              Workbook folders
            </button>
            <button
              type="button"
              aria-label="Create top-level workbook folder"
              title="Create top-level folder"
              className="rounded p-1 hover:bg-slate-200 dark:hover:bg-slate-800"
              onClick={() => {
                setParentId(undefined);
                setEditing(null);
                setFolderName('');
              }}
            >
              <Plus size={16} />
            </button>
          </div>

          <input
            aria-label="Search workbook folders"
            placeholder="Search folders…"
            value={folderSearch}
            onChange={e => setFolderSearch(e.target.value)}
            className="w-full rounded border bg-transparent p-2 text-xs"
          />

          <div className="space-y-1 pt-1">
            <button
              type="button"
              className={`block w-full text-left text-xs rounded px-2 py-1 ${
                folder === '*'
                  ? 'bg-emerald-100 font-semibold text-emerald-900 dark:bg-emerald-950 dark:text-emerald-200'
                  : 'hover:bg-slate-100 dark:hover:bg-slate-800'
              }`}
              onClick={() => setFolder('*')}
            >
              All workbooks ({rows.length})
            </button>
            <button
              type="button"
              className={`block w-full text-left text-xs rounded px-2 py-1 ${
                folder === ''
                  ? 'bg-emerald-100 font-semibold text-emerald-900 dark:bg-emerald-950 dark:text-emerald-200'
                  : 'hover:bg-slate-100 dark:hover:bg-slate-800'
              }`}
              onClick={() => setFolder('')}
            >
              Unfiled workbooks
            </button>
          </div>

          {(expanded.includes('root') || folderSearch) && (
            <nav aria-label="Workbook folder tree" className="mt-2 space-y-0.5 border-t pt-2">
              {tree()}
            </nav>
          )}

          <form
            className="space-y-2 border-t pt-3"
            onSubmit={e => {
              e.preventDefault();
              void saveFolder();
            }}
          >
            <p className="text-[11px] font-medium text-slate-600 dark:text-slate-400">
              {editing
                ? 'Rename workbook folder'
                : parentId
                ? `New subfolder in ${pathFor(parentId)}`
                : 'New top-level workbook folder'}
            </p>
            <input
              aria-label={editing ? 'Rename library folder' : 'New library folder'}
              maxLength={60}
              value={folderName}
              onChange={e => setFolderName(e.target.value)}
              placeholder={editing ? 'Enter new name' : 'Folder name'}
              className="w-full rounded border bg-transparent p-2 text-xs"
            />
            <div className="flex gap-2">
              <button className={`${control} flex flex-1 items-center justify-center gap-1.5 font-medium`} disabled={!ready || !folderName.trim()}>
                <FolderPlus size={14} />
                {editing ? 'Save name' : 'Create folder'}
              </button>
              {editing && (
                <button
                  type="button"
                  className={control}
                  onClick={() => {
                    setEditing(null);
                    setFolderName('');
                  }}
                >
                  Cancel
                </button>
              )}
            </div>
          </form>

          <p className="text-[11px] leading-relaxed text-slate-500">
            Folder organization is saved offline on this device. Removing a folder will ask whether to keep workbooks in Unfiled or delete them.
          </p>
        </aside>

        <div className="min-w-0">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b p-3">
            <div className="flex items-center gap-2">
              <span className="text-sm font-semibold">{folder === '*' ? 'All files' : folder === '' ? 'Unfiled' : pathFor(folder)}</span>
              {folder && folder !== '*' && (
                <>
                  <button
                    type="button"
                    aria-label="Rename folder"
                    title="Rename folder"
                    className={control}
                    onClick={() => {
                      const f = organization.folders.find(item => item.id === folder);
                      if (f) {
                        setEditing(f.id);
                        setFolderName(f.name);
                      }
                    }}
                  >
                    <Pencil size={14} />
                  </button>
                  <button
                    type="button"
                    aria-label="Delete folder"
                    title="Delete folder"
                    className={`${control} text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950/40`}
                    onClick={() => {
                      const f = organization.folders.find(item => item.id === folder);
                      if (f) {
                        setDeletingFolder({ id: f.id, name: f.name });
                      }
                    }}
                  >
                    <Trash2 size={14} />
                  </button>
                </>
              )}
            </div>
            <SearchableSelect
              ariaLabel="Sort workbooks"
              value={sort}
              onChange={setSort}
              options={[
                { value: 'recent', label: 'Recently saved' },
                { value: 'name', label: 'Name A–Z' },
              ]}
            />
          </div>

          {error && <p role="alert" className="p-3 text-sm text-red-600">{error}</p>}
          {loading && <p role="status" className="p-3 text-xs text-slate-500">Refreshing files…</p>}

          {!visible.length && (
            <p className="p-8 text-center text-sm text-slate-500">
              {query
                ? 'No matching files.'
                : folder === '*'
                ? 'Create or import a workbook to get started.'
                : 'This folder is empty. Use the folder icon on a file to move it here.'}
            </p>
          )}

          <div className="divide-y">
            {visible.slice((current - 1) * 40, current * 40).map(row => (
              <div key={row.id} className="group flex flex-wrap items-center gap-3 px-3 py-2.5 hover:bg-slate-50 dark:hover:bg-slate-800/50">
                <FileSpreadsheet size={19} className="shrink-0 text-emerald-600" />
                <button type="button" disabled={busy} title={row.name} className="min-w-0 flex-1 text-left" onClick={() => onOpen(row.doc, row.device)}>
                  <span className="block truncate text-sm font-medium">{row.name}</span>
                  <span className="block text-[11px] text-slate-500">
                    {row.template ? 'Template · ' : ''}
                    {row.device ? 'Available offline' : 'Online'} · {new Date(row.date).toLocaleDateString()} ·{' '}
                    {organization.folders.find(f => f.id === organization.files[row.id])?.name || 'Unfiled'}
                  </span>
                </button>
                <div className="flex items-center gap-1.5">
                  <button type="button" className={control} disabled={busy} onClick={() => onOpen(row.doc, row.device)}>
                    {row.template ? 'Use template' : 'Open'}
                  </button>

                  <button
                    type="button"
                    aria-label={`Move ${row.name} to folder`}
                    title="Move to folder"
                    className={`${control} flex items-center gap-1 text-slate-700 dark:text-slate-300`}
                    disabled={!ready}
                    onClick={() => setMoving({ id: row.id, name: row.name })}
                  >
                    <FolderInput size={15} />
                  </button>

                  <button type="button" aria-label={`Copy ${row.name}`} className={control} disabled={busy} onClick={() => onCopy(row.doc, row.device)}>
                    <Copy size={14} />
                  </button>
                  {row.doc && (
                    <button type="button" aria-label={`Delete ${row.name}`} className={control} disabled={busy} onClick={() => onDelete(row.doc!)}>
                      <Trash2 size={14} />
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>

          <footer className="flex items-center justify-between border-t p-3 text-xs text-slate-500">
            <span>
              {visible.length} files · Page {current} of {pages}
            </span>
            <div className="flex gap-2">
              <button type="button" className={control} disabled={current === 1} onClick={() => setPage(current - 1)}>
                Previous
              </button>
              <button type="button" className={control} disabled={current >= pages} onClick={() => setPage(current + 1)}>
                Next
              </button>
            </div>
          </footer>
        </div>
      </div>

      {moving && (
        <div className="fixed inset-0 z-[95] flex items-center justify-center bg-black/40 p-4">
          <section role="dialog" aria-modal="true" aria-label="Move workbook" className="w-full max-w-sm space-y-3.5 rounded-xl bg-white p-5 shadow-lg dark:bg-slate-900">
            <div className="flex items-center justify-between">
              <h4 className="flex items-center gap-2 font-semibold">
                <FolderInput size={18} className="text-emerald-600" />
                Move workbook
              </h4>
              <button type="button" className="rounded p-1 hover:bg-slate-100 dark:hover:bg-slate-800" onClick={() => setMoving(null)}>
                <X size={16} />
              </button>
            </div>
            <p className="break-words text-sm font-medium text-slate-700 dark:text-slate-300">{moving.name}</p>
            <div>
              <label className="mb-1 block text-xs text-slate-500">Destination folder</label>
              <SearchableSelect
                ariaLabel="Destination folder"
                value={organization.files[moving.id] || ''}
                options={[{ value: '', label: 'Unfiled' }, ...organization.folders.map(f => ({ value: f.id, label: pathFor(f.id) }))]}
                onChange={id => {
                  void (async () => {
                    const files = { ...organization.files };
                    if (id) files[moving.id] = id;
                    else delete files[moving.id];
                    if (await save({ ...organization, files })) setMoving(null);
                  })();
                }}
              />
            </div>
          </section>
        </div>
      )}

      {deletingFolder && (
        <div className="fixed inset-0 z-[95] flex items-center justify-center bg-black/50 p-4">
          <section role="dialog" aria-modal="true" aria-label="Delete folder confirmation" className="w-full max-w-md space-y-4 rounded-xl bg-white p-6 shadow-xl dark:bg-slate-900">
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-2.5 text-red-600">
                <AlertTriangle size={22} className="shrink-0" />
                <h4 className="text-base font-semibold text-slate-900 dark:text-slate-100">
                  Delete folder &quot;{deletingFolder.name}&quot;?
                </h4>
              </div>
              <button type="button" className="rounded p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200" onClick={() => setDeletingFolder(null)}>
                <X size={18} />
              </button>
            </div>

            {folderFilesToDelete.length > 0 ? (
              <div className="space-y-3">
                <p className="text-sm text-slate-600 dark:text-slate-300">
                  This folder contains <strong className="font-semibold text-slate-900 dark:text-white">{folderFilesToDelete.length} workbook(s)</strong>. What would you like to do with the files inside?
                </p>
                <div className="max-h-40 overflow-y-auto rounded-lg border bg-slate-50 p-2.5 space-y-1.5 dark:bg-slate-950/40">
                  {folderFilesToDelete.map(file => (
                    <div key={file.id} className="flex items-center gap-2 text-xs text-slate-700 dark:text-slate-300">
                      <FileSpreadsheet size={15} className="shrink-0 text-emerald-600" />
                      <span className="truncate font-medium">{file.name}</span>
                    </div>
                  ))}
                </div>
                <div className="flex flex-col gap-2 pt-2 sm:flex-row sm:justify-end">
                  <button
                    type="button"
                    className="rounded-lg border bg-slate-100 px-3.5 py-2 text-xs font-medium text-slate-800 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
                    onClick={() => void handleConfirmDeleteFolder('move_to_unfiled')}
                  >
                    Move files to Unfiled & Delete folder
                  </button>

                  <button
                    type="button"
                    className="rounded-lg bg-red-600 px-3.5 py-2 text-xs font-medium text-white hover:bg-red-700"
                    onClick={() => void handleConfirmDeleteFolder('delete_all')}
                  >
                    Delete folder & all files inside
                  </button>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <p className="text-sm text-slate-600 dark:text-slate-300">
                  This folder is empty. Are you sure you want to delete it?
                </p>
                <div className="flex justify-end gap-2 pt-2">
                  <button
                    type="button"
                    className="rounded-lg border px-3.5 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50 dark:text-slate-300 dark:hover:bg-slate-800"
                    onClick={() => setDeletingFolder(null)}
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    className="rounded-lg bg-red-600 px-3.5 py-2 text-xs font-medium text-white hover:bg-red-700"
                    onClick={() => void handleConfirmDeleteFolder('move_to_unfiled')}
                  >
                    Delete folder
                  </button>
                </div>
              </div>
            )}
          </section>
        </div>
      )}
    </section>
  );
}
