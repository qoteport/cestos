'use client';
import { useEffect, useState, useMemo } from 'react';
import { X, Check, Loader2, ArrowRight, Save, Database } from 'lucide-react';
import { apiFetch } from '@/lib/api';
import type { FieldSheet } from '@/lib/fieldWorkbook';
import { actionPath, sheetChanges, type RecordChange, type WorkspaceSource } from '@/lib/workbookDatabaseWorkspace';

const options = { queueWhenOffline: false, cacheResponse: false, cacheOfflineRead: false, memoryCache: false };

export default function WorkbookDatabaseReview({
  sheet,
  onClose,
  onSaved,
}: {
  sheet: FieldSheet;
  onClose: () => void;
  onSaved: (row: number, record: Record<string, unknown>) => void;
}) {
  const [changes, setChanges] = useState<RecordChange[]>([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState<number[]>([]);
  const [attempted, setAttempted] = useState<number[]>([]);
  const [selectedRows, setSelectedRows] = useState<Set<number>>(new Set());
  const [savingProgress, setSavingProgress] = useState<{ current: number; total: number } | null>(null);

  useEffect(() => {
    let live = true;
    void apiFetch<WorkspaceSource[]>('/api/v1/workbook-connections/workspace', {}, true, options)
      .then((sources) => {
        const source = sources.find((s) => s.id === sheet.databaseSource?.path);
        if (!source) throw Error('This table is no longer available to your account.');
        const rows = sheetChanges(sheet, source);
        if (live) {
          setChanges(rows);
          setSelectedRows(new Set(rows.map((r) => r.row)));
        }
      })
      .catch((e) => {
        if (live) setError(e.message);
      })
      .finally(() => {
        if (live) setLoading(false);
      });
    return () => {
      live = false;
    };
  }, [sheet]);

  const pendingChanges = useMemo(() => changes.filter((c) => !done.includes(c.row)), [changes, done]);

  const allSelected = pendingChanges.length > 0 && pendingChanges.every((c) => selectedRows.has(c.row));
  const someSelected = pendingChanges.some((c) => selectedRows.has(c.row)) && !allSelected;

  function toggleSelectAll() {
    if (allSelected) {
      setSelectedRows(new Set());
    } else {
      setSelectedRows(new Set(pendingChanges.map((c) => c.row)));
    }
  }

  function toggleSelectRow(row: number) {
    const next = new Set(selectedRows);
    if (next.has(row)) {
      next.delete(row);
    } else {
      next.add(row);
    }
    setSelectedRows(next);
  }

  async function saveSingle(change: RecordChange) {
    setBusy(true);
    setError('');
    try {
      const path = actionPath(change.action, change.id);
      if (change.id) {
        const current = await apiFetch<Record<string, unknown>>(path, {}, true, options);
        for (const [key, value] of Object.entries(change.before)) {
          if (String(current[key] ?? '') !== String(value ?? '')) {
            throw Error('This record changed on the server. Reload the table and review your edits before saving.');
          }
        }
      }
      setAttempted((items) => [...items, change.row]);
      const record = await apiFetch<Record<string, unknown>>(
        path,
        { method: change.action.method, body: JSON.stringify(change.values) },
        true,
        options
      );
      if (!record || typeof record !== 'object' || record.id == null) {
        throw Error('The server did not return a record ID. Reload the table to verify the result.');
      }
      onSaved(change.row, record);
      setDone((items) => [...items, change.row]);
    } catch (e) {
      setError(
        (e instanceof Error ? e.message : 'Could not confirm save') +
          ' If a request was sent, it will not be automatically retried. Check the database before submitting again.'
      );
    } finally {
      setBusy(false);
    }
  }

  async function saveSelected() {
    const targetChanges = changes.filter((c) => selectedRows.has(c.row) && !done.includes(c.row));
    if (!targetChanges.length) return;

    setBusy(true);
    setError('');
    let count = 0;

    for (const change of targetChanges) {
      count++;
      setSavingProgress({ current: count, total: targetChanges.length });
      try {
        const path = actionPath(change.action, change.id);
        if (change.id) {
          const current = await apiFetch<Record<string, unknown>>(path, {}, true, options);
          for (const [key, value] of Object.entries(change.before)) {
            if (String(current[key] ?? '') !== String(value ?? '')) {
              throw Error(`Row ${change.row + 1}: Record changed on server. Reload table before saving.`);
            }
          }
        }
        setAttempted((items) => [...items, change.row]);
        const record = await apiFetch<Record<string, unknown>>(
          path,
          { method: change.action.method, body: JSON.stringify(change.values) },
          true,
          options
        );
        if (!record || typeof record !== 'object' || record.id == null) {
          throw Error(`Row ${change.row + 1}: Server did not return record ID.`);
        }
        onSaved(change.row, record);
        setDone((items) => [...items, change.row]);
      } catch (e) {
        setError(
          (e instanceof Error ? e.message : 'Save failed') +
            ` (Stopped at row ${change.row + 1} after saving ${count - 1} records)`
        );
        break;
      }
    }

    setSavingProgress(null);
    setBusy(false);
  }

  const selectedCount = pendingChanges.filter((c) => selectedRows.has(c.row)).length;

  return (
    <div className="fixed inset-0 z-[95] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <section
        role="dialog"
        aria-modal="true"
        aria-label="Review and save database changes"
        className="flex max-h-[90dvh] w-full max-w-4xl flex-col rounded-2xl bg-white shadow-2xl dark:bg-slate-900 border dark:border-slate-800 overflow-hidden"
      >
        {/* Header */}
        <header className="flex items-center justify-between border-b px-6 py-4 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300">
              <Database size={18} />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                Review and save
                <span className="text-slate-400 font-normal">·</span>
                <span className="text-emerald-700 dark:text-emerald-400">{sheet.name}</span>
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Connected table: <code className="font-mono text-slate-700 dark:text-slate-300">{sheet.databaseSource?.path}</code>
              </p>
            </div>
          </div>
          <button
            type="button"
            disabled={busy}
            onClick={onClose}
            aria-label="Close"
            className="rounded-lg p-2 text-slate-400 hover:bg-slate-200/60 hover:text-slate-600 dark:hover:bg-slate-800 dark:hover:text-slate-200 transition-colors"
          >
            <X size={18} />
          </button>
        </header>

        {/* Toolbar & Select All */}
        {!loading && !error && changes.length > 0 && (
          <div className="flex flex-wrap items-center justify-between gap-3 border-b px-6 py-3 bg-slate-50/80 dark:bg-slate-800/20 dark:border-slate-800">
            <label className="flex items-center gap-2.5 cursor-pointer select-none text-xs font-medium text-slate-700 dark:text-slate-300">
              <input
                type="checkbox"
                checked={allSelected}
                ref={(input) => {
                  if (input) input.indeterminate = someSelected;
                }}
                onChange={toggleSelectAll}
                disabled={busy || !pendingChanges.length}
                className="h-4 w-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500 dark:border-slate-700 dark:bg-slate-800"
              />
              <span>
                Select all ({selectedCount} of {pendingChanges.length} pending selected)
              </span>
            </label>

            <div className="flex items-center gap-2">
              <button
                type="button"
                disabled={busy || selectedCount === 0}
                onClick={() => void saveSelected()}
                className="flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-xs font-semibold text-white shadow-sm hover:bg-emerald-700 disabled:opacity-50 transition-colors dark:bg-emerald-600 dark:hover:bg-emerald-500"
              >
                {busy && savingProgress ? (
                  <>
                    <Loader2 size={14} className="animate-spin" />
                    Saving {savingProgress.current} of {savingProgress.total}...
                  </>
                ) : (
                  <>
                    <Save size={14} />
                    Save selected ({selectedCount})
                  </>
                )}
              </button>
            </div>
          </div>
        )}

        {/* Body Content */}
        <div className="flex-1 overflow-auto p-6">
          {loading && (
            <div className="flex flex-col items-center justify-center py-12 text-slate-500 dark:text-slate-400">
              <Loader2 size={24} className="animate-spin mb-2 text-emerald-600" />
              <p className="text-xs">Checking permissions and database changes...</p>
            </div>
          )}

          {error && (
            <div role="alert" className="mb-4 rounded-xl border border-rose-200 bg-rose-50 p-4 text-xs text-rose-700 dark:border-rose-900/40 dark:bg-rose-950/20 dark:text-rose-300">
              <p className="font-semibold mb-0.5">Error processing database updates</p>
              <p>{error}</p>
            </div>
          )}

          {!loading && !changes.length && (
            <div className="flex flex-col items-center justify-center py-16 text-slate-400">
              <Check size={32} className="mb-2 text-emerald-500" />
              <p className="text-sm font-medium text-slate-600 dark:text-slate-300">No database changes to save</p>
              <p className="text-xs text-slate-400 mt-1">All sheet records are currently synchronized with the database.</p>
            </div>
          )}

          {!loading && changes.length > 0 && (
            <div className="overflow-hidden rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b bg-slate-100/70 text-slate-600 dark:bg-slate-800/60 dark:border-slate-800 dark:text-slate-300">
                    <th className="w-10 p-3 text-center">#</th>
                    <th className="w-28 p-3 font-semibold">Row & Action</th>
                    <th className="w-36 p-3 font-semibold">Record ID</th>
                    <th className="p-3 font-semibold">Changes (Before ➔ After)</th>
                    <th className="w-32 p-3 font-semibold text-right">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 dark:divide-slate-800 bg-white dark:bg-slate-900">
                  {changes.map((change) => {
                    const isDone = done.includes(change.row);
                    const isAttempted = attempted.includes(change.row);
                    const isSelected = selectedRows.has(change.row);
                    const isCreate = !change.id;

                    return (
                      <tr
                        key={change.row}
                        className={`transition-colors hover:bg-slate-50/80 dark:hover:bg-slate-800/40 ${
                          isDone ? 'bg-emerald-50/30 dark:bg-emerald-950/10' : ''
                        }`}
                      >
                        <td className="p-3 text-center align-top">
                          <input
                            type="checkbox"
                            checked={isSelected}
                            disabled={busy || isDone}
                            onChange={() => toggleSelectRow(change.row)}
                            className="h-4 w-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500 dark:border-slate-700 dark:bg-slate-800"
                          />
                        </td>
                        <td className="p-3 align-top">
                          <div className="font-semibold text-slate-900 dark:text-slate-100">Row {change.row + 1}</div>
                          <span
                            className={`inline-block mt-1 rounded-md px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider ${
                              isCreate
                                ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                                : 'bg-indigo-100 text-indigo-800 dark:bg-indigo-950 dark:text-indigo-300'
                            }`}
                          >
                            {isCreate ? 'Create' : 'Update'}
                          </span>
                        </td>
                        <td className="p-3 align-top font-mono text-slate-600 dark:text-slate-400">
                          {change.id ? change.id : <span className="text-slate-400 italic">New record</span>}
                        </td>
                        <td className="p-3 align-top">
                          <div className="space-y-1.5">
                            {Object.entries(change.values).map(([key, val]) => {
                              const beforeVal = String(change.before[key] ?? '—');
                              const afterVal = typeof val === 'object' ? JSON.stringify(val) : String(val ?? '');
                              return (
                                <div key={key} className="flex flex-wrap items-center gap-1.5 text-[11px]">
                                  <span className="font-medium text-slate-700 dark:text-slate-300">{key}:</span>
                                  {!isCreate && (
                                    <>
                                      <span className="max-w-[120px] truncate rounded bg-slate-100 px-1.5 py-0.5 text-slate-500 dark:bg-slate-800 dark:text-slate-400" title={beforeVal}>
                                        {beforeVal}
                                      </span>
                                      <ArrowRight size={10} className="text-slate-400" />
                                    </>
                                  )}
                                  <span className="max-w-[180px] truncate rounded bg-emerald-50 px-1.5 py-0.5 font-medium text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300" title={afterVal}>
                                    {afterVal}
                                  </span>
                                </div>
                              );
                            })}
                          </div>
                        </td>
                        <td className="p-3 align-top text-right">
                          {isDone ? (
                            <span className="inline-flex items-center gap-1 rounded-lg bg-emerald-100 px-2.5 py-1 text-xs font-semibold text-emerald-800 dark:bg-emerald-950 dark:text-emerald-200">
                              <Check size={12} /> Saved
                            </span>
                          ) : (
                            <button
                              type="button"
                              disabled={busy || isAttempted}
                              onClick={() => void saveSingle(change)}
                              className="rounded-lg border border-slate-300 bg-white px-2.5 py-1 text-xs font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700 transition-colors"
                            >
                              {isAttempted ? 'Retry' : isCreate ? 'Save create' : 'Save update'}
                            </button>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
