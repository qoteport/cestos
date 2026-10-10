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
  Search,
  FolderOpen,
} from 'lucide-react';
import SearchableSelect from './SearchableSelect';
import { readDeviceLibrary, saveDeviceLibrary, type DeviceWorkbook } from '@/lib/workbookDevice';

type Document = { id: string; title: string; tags: string[]; created_at: string };
type Organization = { folders: { id: string; name: string; parentId?: string }[]; files: Record<string, string> };

const control = 'rounded-lg border px-2 py-1.5 text-xs disabled:opacity-40 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors';

export default function WorkbookLibrary({
  scope,
  documents,
  devices,
  busy,
  loading,
  onRefresh,
  onSyncRecovery,
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
  onSyncRecovery: () => void;
  onOpen: (doc?: Document, device?: DeviceWorkbook) => void;
  onCopy: (doc?: Document, device?: DeviceWorkbook) => void;
  onDelete: (doc: Document) => void;
}) {
  const [organization, setOrganization] = useState<Organization>({ folders: [], files: {} });
  const [ready, setReady] = useState(false);
  const [error, setError] = useState('');
  const [folder, setFolder] = useState('*');
  const [query, setQuery] = useState('');
  const [showRecovery, setShowRecovery] = useState(false);
  const [sort, setSort] = useState('recent');
  const [page, setPage] = useState(1);
  const [moving, setMoving] = useState<{ id: string; name: string } | null>(null);
  const [moveSelectedFolderId, setMoveSelectedFolderId] = useState<string>('');
  const [moveSearchQuery, setMoveSearchQuery] = useState('');

  // Folder modal state (Create / Rename)
  const [folderModal, setFolderModal] = useState<{
    open: boolean;
    mode: 'create' | 'rename';
    folderId?: string;
    parentId?: string;
    name: string;
  } | null>(null);

  // Context menu state
  const [contextMenu, setContextMenu] = useState<{
    x: number;
    y: number;
    folderId: string;
    folderName: string;
    parentId?: string;
  } | null>(null);

  // Delete folder confirmation modal state
  const [deletingFolder, setDeletingFolder] = useState<{
    id: string;
    name: string;
  } | null>(null);

  const [folderSearch, setFolderSearch] = useState('');
  const [expanded, setExpanded] = useState<string[]>(['root']);
  const [moveExpanded, setMoveExpanded] = useState<string[]>(['root']);

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

  // Close context menu on window click
  useEffect(() => {
    const handleClick = () => setContextMenu(null);
    const handleKey = (event: KeyboardEvent) => { if (event.key === 'Escape') setContextMenu(null); };
    window.addEventListener('click', handleClick);
    window.addEventListener('keydown', handleKey);
    window.addEventListener('resize', handleClick);
    return () => {
      window.removeEventListener('click', handleClick);
      window.removeEventListener('keydown', handleKey);
      window.removeEventListener('resize', handleClick);
    };
  }, []);

  const openContextMenu = (e: React.MouseEvent, f: { id: string; name: string; parentId?: string }) => {
    e.preventDefault();
    e.stopPropagation();
    const x = Math.max(10, Math.min(e.clientX, (typeof window !== 'undefined' ? window.innerWidth : 1000) - 200));
    const y = Math.max(10, Math.min(e.clientY, (typeof window !== 'undefined' ? window.innerHeight : 1000) - 230));
    setContextMenu({
      x,
      y,
      folderId: f.id,
      folderName: f.name,
      parentId: f.parentId,
    });
  };

  useEffect(() => {
    let active = true;
    const refresh = () => { void readDeviceLibrary<Organization>(`${scope}:file-folders`).then(rows => { if (active && rows?.[0]) setOrganization(rows[0]); }).catch(() => { if(active) setError('Could not refresh folders.'); }); };
    window.addEventListener('cestos:workbook-folders', refresh);
    return () => { active = false; window.removeEventListener('cestos:workbook-folders', refresh); };
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

  const isRecovery = (name: string) => / — local recovery(?: — local recovery)*$/.test(name);
  const recoveryCount = rows.filter(row => isRecovery(row.name)).length;

  const visible = useMemo(
    () =>
      rows
        .filter(row => isRecovery(row.name) === showRecovery)
        .filter(row =>
          folder === '*'
            ? true
            : folder === ''
            ? !organization.files[row.id]
            : organization.files[row.id] === folder
        )
        .filter(row => row.name.toLowerCase().includes(query.toLowerCase()))
        .sort((a, b) => (sort === 'name' ? a.name.localeCompare(b.name) : b.date.localeCompare(a.date))),
    [rows, folder, organization, query, sort, showRecovery]
  );

  const pages = Math.max(1, Math.ceil(visible.length / 40));
  const current = Math.min(page, pages);

  useEffect(() => setPage(1), [folder, query, sort, showRecovery]);

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

  async function handleSaveFolderModal() {
    if (!folderModal) return;
    const name = folderModal.name.trim();
    if (!name) return;

    const parentId = folderModal.parentId || undefined;
    const isRename = folderModal.mode === 'rename';
    const folderId = folderModal.folderId;

    if (
      organization.folders.some(
        f =>
          f.id !== folderId &&
          f.parentId === parentId &&
          f.name.toLowerCase() === name.toLowerCase()
      )
    ) {
      setError('A folder with this name already exists in this location.');
      return;
    }

    const id = isRename && folderId ? folderId : crypto.randomUUID();
    const updatedFolders = isRename
      ? organization.folders.map(f => (f.id === id ? { ...f, name, parentId } : f))
      : [...organization.folders, { id, name, parentId }];

    if (await save({ ...organization, folders: updatedFolders })) {
      setFolderModal(null);
      setFolder(id);
      setExpanded(ids => [...ids, 'root', ...(parentId ? [parentId] : [])]);
    }
  }

  // Delete Folder Handlers
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

  // Tree component for sidebar
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
              className={`group/item flex items-center gap-1 rounded py-1 px-1 select-none transition-colors ${
                isSelected
                  ? 'bg-emerald-100 dark:bg-emerald-950 font-semibold text-emerald-900 dark:text-emerald-200'
                  : 'hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300'
              }`}
              style={{ paddingLeft: depth * 12 + 4 }}
              onContextMenu={e => openContextMenu(e, f)}
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
                onContextMenu={e => openContextMenu(e, f)}
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
                onContextMenu={e => openContextMenu(e, f)}
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
                    setFolderModal({
                      open: true,
                      mode: 'rename',
                      folderId: f.id,
                      parentId: f.parentId,
                      name: f.name,
                    });
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
                    setFolderModal({
                      open: true,
                      mode: 'create',
                      parentId: f.id,
                      name: '',
                    });
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

  // Tree component for Move Dialog
  const renderMoveTree = (parent?: string, depth = 0): React.ReactNode => {
    return organization.folders
      .filter(f => f.parentId === parent)
      .filter(f => !moveSearchQuery || pathFor(f.id).toLowerCase().includes(moveSearchQuery.toLowerCase()))
      .map(f => {
        const children = organization.folders.some(child => child.parentId === f.id);
        const open = !!moveSearchQuery || moveExpanded.includes(f.id);
        const isSelected = moveSelectedFolderId === f.id;
        return (
          <div key={f.id}>
            <div
              className={`flex items-center gap-1.5 rounded-lg py-1.5 px-2 cursor-pointer transition-colors ${
                isSelected
                  ? 'bg-emerald-100 border border-emerald-300 font-semibold text-emerald-900 dark:bg-emerald-950 dark:border-emerald-800 dark:text-emerald-200'
                  : 'hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300'
              }`}
              style={{ paddingLeft: depth * 16 + 8 }}
              onClick={() => setMoveSelectedFolderId(f.id)}
            >
              <button
                type="button"
                className="p-0.5 text-slate-400 hover:text-slate-700"
                onClick={e => {
                  e.stopPropagation();
                  setMoveExpanded(ids => (open ? ids.filter(id => id !== f.id) : [...ids, f.id]));
                }}
              >
                {children ? open ? <ChevronDown size={14} /> : <ChevronRight size={14} /> : <Folder size={14} className="text-emerald-600" />}
              </button>
              <span className="text-xs font-medium truncate min-w-0 flex-1">{f.name}</span>
            </div>
            {children && open && renderMoveTree(f.id, depth + 1)}
          </div>
        );
      });
  };

  return (
    <section className="overflow-hidden rounded-xl border bg-white dark:bg-slate-900 shadow-sm">
      <header className="flex flex-wrap items-center justify-between gap-3 border-b p-4">
        <div>
          <h3 className="font-semibold">Saved workbooks & templates</h3>
          <p className="text-xs text-slate-500">{rows.length} file{rows.length === 1 ? '' : 's'}</p>
        </div>
        <div className="flex min-w-0 flex-1 items-center gap-2 sm:max-w-xl">
          <input
            aria-label="Search workbooks"
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="Search files in this folder..."
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
              className="flex items-center gap-1 text-xs font-semibold text-slate-900 dark:text-slate-100"
              aria-expanded={expanded.includes('root')}
              onContextMenu={e => openContextMenu(e, { id: '*', name: 'Workbook folders' })}
              onClick={() => setExpanded(ids => (ids.includes('root') ? ids.filter(id => id !== 'root') : [...ids, 'root']))}
            >
              {expanded.includes('root') ? <ChevronDown size={15} /> : <ChevronRight size={15} />}
              Workbook folders
            </button>
            <button
              type="button"
              aria-label="Create new workbook folder"
              title="Create new folder"
              className="rounded p-1 text-slate-600 hover:bg-slate-200 dark:text-slate-300 dark:hover:bg-slate-800 transition-colors"
              onClick={() => {
                setFolderModal({
                  open: true,
                  mode: 'create',
                  parentId: undefined,
                  name: '',
                });
              }}
            >
              <Plus size={16} />
            </button>
          </div>

          <input
            aria-label="Search workbook folders"
            placeholder="Search folders..."
            value={folderSearch}
            onChange={e => setFolderSearch(e.target.value)}
            className="w-full rounded-lg border bg-transparent p-2 text-xs"
          />

          <div className="space-y-1 pt-1">
            <button
              type="button"
              className={`block w-full text-left text-xs rounded-lg px-2 py-1.5 transition-colors ${
                folder === '*'
                  ? 'bg-emerald-100 font-semibold text-emerald-900 dark:bg-emerald-950 dark:text-emerald-200'
                  : 'hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300'
              }`}
              onClick={() => setFolder('*')}
              onContextMenu={e => openContextMenu(e, { id: '*', name: 'All workbooks' })}
            >
              All workbooks ({rows.length})
            </button>
            <button
              type="button"
              className={`block w-full text-left text-xs rounded-lg px-2 py-1.5 transition-colors ${
                folder === ''
                  ? 'bg-emerald-100 font-semibold text-emerald-900 dark:bg-emerald-950 dark:text-emerald-200'
                  : 'hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300'
              }`}
              onClick={() => setFolder('')}
              onContextMenu={e => openContextMenu(e, { id: '', name: 'Unfiled workbooks' })}
            >
              Unfiled workbooks
            </button>
          </div>

          {(expanded.includes('root') || folderSearch) && (
            <nav aria-label="Workbook folder tree" className="mt-2 space-y-0.5 border-t pt-2">
              {tree()}
            </nav>
          )}
        </aside>

        <div className="min-w-0">
          {recoveryCount > 0 && <div className="flex flex-wrap items-center justify-between gap-2 border-b bg-amber-50/60 p-3 dark:bg-amber-950/20">
            <div><p className="text-xs font-semibold">Recovery copies ({recoveryCount})</p><p className="text-xs text-slate-500">Kept separately from your files. Sync preserves each version; it does not merge or overwrite the original.</p></div>
            <div className="flex gap-2"><button type="button" className={control} aria-pressed={showRecovery} onClick={() => setShowRecovery(value => !value)}>{showRecovery ? 'Back to files' : 'View recovery copies'}</button><button type="button" className={control} disabled={busy || !ready} onClick={onSyncRecovery}>Sync all recovery copies</button></div>
          </div>}

          <div className="flex flex-wrap items-center justify-between gap-2 border-b p-3">
            <div className="flex items-center gap-2">
              <span className="text-sm font-semibold">{showRecovery ? 'Recovery copies' : folder === '*' ? 'All files' : folder === '' ? 'Unfiled' : pathFor(folder)}</span>
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
                        setFolderModal({
                          open: true,
                          mode: 'rename',
                          folderId: f.id,
                          parentId: f.parentId,
                          name: f.name,
                        });
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
          {loading && <p role="status" className="p-3 text-xs text-slate-500">Refreshing files...</p>}

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
                    onClick={() => {
                      setMoving({ id: row.id, name: row.name });
                      setMoveSelectedFolderId(organization.files[row.id] || '');
                      setMoveSearchQuery('');
                      setMoveExpanded(['root', ...(organization.files[row.id] ? [organization.files[row.id]] : [])]);
                    }}
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

      {/* Right-Click Context Menu Overlay & Popover */}
      {contextMenu && (
        <>
          <div
            className="fixed inset-0 z-[99] bg-transparent"
            onClick={() => setContextMenu(null)}
            onContextMenu={e => {
              e.preventDefault();
              setContextMenu(null);
            }}
          />
          <div
            className="fixed z-[100] w-48 rounded-xl border bg-white p-1.5 shadow-xl dark:bg-slate-900 dark:border-slate-800"
            role="menu"
            aria-label={`${contextMenu.folderName} actions`}
            onKeyDown={e => {
              if (!['ArrowDown', 'ArrowUp', 'Home', 'End'].includes(e.key)) return;
              e.preventDefault();
              const items = Array.from(e.currentTarget.querySelectorAll<HTMLButtonElement>('[role="menuitem"]'));
              const index = items.indexOf(document.activeElement as HTMLButtonElement);
              const next = e.key === 'Home' ? 0 : e.key === 'End' ? items.length - 1 : (index + (e.key === 'ArrowDown' ? 1 : -1) + items.length) % items.length;
              items[next]?.focus();
            }}
            style={{ top: contextMenu.y, left: contextMenu.x, maxHeight: 'calc(100vh - 20px)', overflowY: 'auto' }}
            onClick={e => e.stopPropagation()}
          >
            <div className="px-2 py-1 text-[11px] font-semibold text-slate-400 border-b dark:border-slate-800 truncate">
              {contextMenu.folderName}
            </div>
            <button
              type="button"
              role="menuitem"
              autoFocus
              className="flex w-full items-center gap-2 rounded-lg px-2.5 py-1.5 text-xs text-slate-700 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-800"
              onClick={() => {
                setFolder(contextMenu.folderId);
                setContextMenu(null);
              }}
            >
              <FolderOpen size={14} className="text-emerald-600" />
              View workbooks
            </button>
            <button
              type="button"
              role="menuitem"
              className="flex w-full items-center gap-2 rounded-lg px-2.5 py-1.5 text-xs text-slate-700 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-800"
              onClick={() => {
                setFolderModal({
                  open: true,
                  mode: 'create',
                  parentId: contextMenu.folderId && contextMenu.folderId !== '*' ? contextMenu.folderId : undefined,
                  name: '',
                });
                setContextMenu(null);
              }}
            >
              <Plus size={14} className="text-blue-600" />
              {contextMenu.folderId && contextMenu.folderId !== '*' ? 'Add subfolder' : 'Add folder'}
            </button>
            {contextMenu.folderId && contextMenu.folderId !== '*' && <>
            <button
              type="button"
              role="menuitem"
              className="flex w-full items-center gap-2 rounded-lg px-2.5 py-1.5 text-xs text-slate-700 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-800"
              onClick={() => {
                setFolderModal({
                  open: true,
                  mode: 'rename',
                  folderId: contextMenu.folderId,
                  parentId: contextMenu.parentId,
                  name: contextMenu.folderName,
                });
                setContextMenu(null);
              }}
            >
              <Pencil size={14} className="text-amber-600" />
              Rename folder
            </button>
            <button
              type="button"
              role="menuitem"
              className="flex w-full items-center gap-2 rounded-lg px-2.5 py-1.5 text-xs text-red-600 hover:bg-red-50 dark:hover:bg-red-950/40"
              onClick={() => {
                setDeletingFolder({ id: contextMenu.folderId, name: contextMenu.folderName });
                setContextMenu(null);
              }}
            >
              <Trash2 size={14} />
              Delete folder
            </button>
            </>}
          </div>
        </>
      )}

      {/* Create / Rename Folder Modal */}
      {folderModal?.open && (
        <div className="fixed inset-0 z-[95] flex items-center justify-center bg-black/50 p-4">
          <section
            role="dialog"
            aria-modal="true"
            aria-label={folderModal.mode === 'rename' ? 'Rename folder' : 'Create folder'}
            className="w-full max-w-sm space-y-4 rounded-xl bg-white p-5 shadow-xl dark:bg-slate-900"
          >
            <div className="flex items-center justify-between border-b pb-3 dark:border-slate-800">
              <h4 className="flex items-center gap-2 text-base font-semibold text-slate-900 dark:text-slate-100">
                <FolderPlus size={18} className="text-emerald-600" />
                {folderModal.mode === 'rename' ? 'Rename Folder' : 'Create New Folder'}
              </h4>
              <button
                type="button"
                className="rounded p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                onClick={() => setFolderModal(null)}
              >
                <X size={16} />
              </button>
            </div>

            <div className="space-y-3">
              <div>
                <label className="mb-1 block text-xs font-medium text-slate-700 dark:text-slate-300">
                  Folder Name <span className="text-red-500">*</span>
                </label>
                <input
                  aria-label="Folder name"
                  maxLength={60}
                  autoFocus
                  value={folderModal.name}
                  onChange={e => setFolderModal({ ...folderModal, name: e.target.value })}
                  placeholder="Enter folder name..."
                  className="w-full rounded-lg border bg-transparent p-2 text-xs outline-none focus:ring-2 focus:ring-emerald-500/20"
                />
              </div>

              <div>
                <label className="mb-1 block text-xs font-medium text-slate-700 dark:text-slate-300">
                  Parent Folder
                </label>
                <SearchableSelect
                  ariaLabel="Parent folder"
                  value={folderModal.parentId || ''}
                  options={[
                    { value: '', label: 'None (Top-level folder)' },
                    ...organization.folders
                      .filter(f => f.id !== folderModal.folderId)
                      .map(f => ({ value: f.id, label: pathFor(f.id) })),
                  ]}
                  onChange={id => setFolderModal({ ...folderModal, parentId: id || undefined })}
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t dark:border-slate-800">
              <button
                type="button"
                className={control}
                onClick={() => setFolderModal(null)}
              >
                Cancel
              </button>
              <button
                type="button"
                className="rounded-lg bg-emerald-600 px-3.5 py-1.5 text-xs font-medium text-white hover:bg-emerald-700 disabled:opacity-40"
                disabled={!folderModal.name.trim()}
                onClick={() => void handleSaveFolderModal()}
              >
                {folderModal.mode === 'rename' ? 'Save Changes' : 'Create Folder'}
              </button>
            </div>
          </section>
        </div>
      )}

      {/* Enhanced Move Workbook Dialog */}
      {moving && (
        <div className="fixed inset-0 z-[95] flex items-center justify-center bg-black/50 p-4">
          <section
            role="dialog"
            aria-modal="true"
            aria-label="Move workbook to folder"
            className="w-full max-w-md space-y-4 rounded-xl bg-white p-5 shadow-xl dark:bg-slate-900"
          >
            <div className="flex items-center justify-between border-b pb-3 dark:border-slate-800">
              <h4 className="flex items-center gap-2 text-base font-semibold text-slate-900 dark:text-slate-100">
                <FolderInput size={18} className="text-emerald-600" />
                Move Workbook
              </h4>
              <button
                type="button"
                className="rounded p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                onClick={() => setMoving(null)}
              >
                <X size={16} />
              </button>
            </div>

            <p className="truncate text-xs text-slate-500 font-medium">
              File: <span className="font-semibold text-slate-800 dark:text-slate-200">{moving.name}</span>
            </p>

            <div className="space-y-2">
              <div className="relative">
                <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  aria-label="Search destination folders"
                  placeholder="Search destination folders..."
                  value={moveSearchQuery}
                  onChange={e => setMoveSearchQuery(e.target.value)}
                  className="w-full rounded-lg border bg-transparent pl-8 pr-3 py-1.5 text-xs outline-none focus:ring-2 focus:ring-emerald-500/20"
                />
              </div>

              <div className="max-h-60 overflow-y-auto rounded-lg border bg-slate-50/50 p-2 space-y-1 dark:bg-slate-950/40">
                <div
                  className={`flex items-center gap-1.5 rounded-lg py-1.5 px-2 cursor-pointer transition-colors ${
                    moveSelectedFolderId === ''
                      ? 'bg-emerald-100 border border-emerald-300 font-semibold text-emerald-900 dark:bg-emerald-950 dark:border-emerald-800 dark:text-emerald-200'
                      : 'hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300'
                  }`}
                  onClick={() => setMoveSelectedFolderId('')}
                >
                  <Folder size={14} className="text-slate-400" />
                  <span className="text-xs font-medium">Unfiled (Root level)</span>
                </div>

                {renderMoveTree()}
              </div>
            </div>

            <div className="flex items-center justify-between pt-2 border-t dark:border-slate-800">
              <span className="text-[11px] text-slate-500 truncate max-w-[200px]">
                Selected: <strong className="text-slate-700 dark:text-slate-300">{moveSelectedFolderId ? pathFor(moveSelectedFolderId) : 'Unfiled'}</strong>
              </span>
              <div className="flex gap-2">
                <button
                  type="button"
                  className={control}
                  onClick={() => setMoving(null)}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  className="rounded-lg bg-emerald-600 px-3.5 py-1.5 text-xs font-medium text-white hover:bg-emerald-700"
                  onClick={() => {
                    void (async () => {
                      const files = { ...organization.files };
                      if (moveSelectedFolderId) files[moving.id] = moveSelectedFolderId;
                      else delete files[moving.id];
                      if (await save({ ...organization, files })) setMoving(null);
                    })();
                  }}
                >
                  Move Here
                </button>
              </div>
            </div>
          </section>
        </div>
      )}

      {/* Delete Folder Confirmation Dialog */}
      {deletingFolder && (
        <div className="fixed inset-0 z-[95] flex items-center justify-center bg-black/50 p-4">
          <section
            role="dialog"
            aria-modal="true"
            aria-label="Delete folder confirmation"
            className="w-full max-w-md space-y-4 rounded-xl bg-white p-6 shadow-xl dark:bg-slate-900"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-2.5 text-red-600">
                <AlertTriangle size={22} className="shrink-0" />
                <h4 className="text-base font-semibold text-slate-900 dark:text-slate-100">
                  Delete folder &quot;{deletingFolder.name}&quot;?
                </h4>
              </div>
              <button
                type="button"
                className="rounded p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                onClick={() => setDeletingFolder(null)}
              >
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
