'use client';
import { useEffect, useState } from 'react';
import { loadWorkbookCatalog } from '@/lib/workbookCatalog';
import { apiFetch } from '@/lib/api';
import { databaseSheets, loadDatabaseRecords } from '@/lib/workbookDatabaseSource';
import { type WorkspaceSource, type Schema, fieldValue, resolvedSchema } from '@/lib/workbookDatabaseWorkspace';
import { newWorkbook, type FieldWorkbook, type FieldSheet } from '@/lib/fieldWorkbook';
import {
  Database,
  TableProperties,
  FileSpreadsheet,
  Plus,
  RefreshCw,
  Search,
  Lock,
  Unlock,
  X,
  AlertCircle,
  CheckCircle2,
} from 'lucide-react';

const fresh = { cacheResponse: false, cacheOfflineRead: false, memoryCache: false, queueWhenOffline: false };
const control = 'rounded-lg border px-2.5 py-1.5 text-xs font-medium disabled:opacity-40 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors';

export default function WorkbookDatabaseWorkspace({ onOpen }: { onOpen: (book: FieldWorkbook) => void }) {
  const [sources, setSources] = useState<WorkspaceSource[]>([]);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [search, setSearch] = useState('');
  const [related, setRelated] = useState(true);
  const [creating, setCreating] = useState<WorkspaceSource | null>(null);
  const [notice, setNotice] = useState('');

  async function refresh() {
    setBusy(true);
    setError('');
    setNotice('');
    setSources([]);
    try {
      const result = await loadWorkbookCatalog(path => apiFetch(path, {}, true, fresh));
      setSources(result.sources);
      setNotice(result.notice);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not load tables');
    } finally {
      setBusy(false);
    }
  }

  useEffect(() => {
    void refresh();
  }, []);

  async function open(source: WorkspaceSource) {
    setBusy(true);
    setError('');
    try {
      const selected = [
        source,
        ...(related
          ? sources.filter(item => source.relations?.some(relation => relation.target === item.id) && item.id !== source.id)
          : []),
      ];
      const sheets: FieldSheet[] = [];
      for (const item of selected) {
        const records = await loadDatabaseRecords(item, (30 - sheets.length) * 1999, path => apiFetch(path, {}, true, fresh));
        sheets.push(...databaseSheets(item, records, item.columns.slice(0, 100).map(c => c.name), sheets.map(s => s.name)));
      }
      onOpen({ ...newWorkbook(), name: source.name, sheets });
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not load table');
    } finally {
      setBusy(false);
    }
  }

  const filteredSources = sources.filter(s => s.name.toLowerCase().includes(search.toLowerCase()));

  return (
    <section className="overflow-hidden rounded-xl border bg-white dark:bg-slate-900 shadow-sm">
      <header className="flex flex-wrap items-center justify-between gap-3 border-b p-4">
        <div>
          <h3 className="flex items-center gap-2 text-base font-semibold text-slate-900 dark:text-slate-100">
            <Database size={19} className="text-emerald-600" />
            Database tables
          </h3>
          <p className="mt-0.5 text-xs text-slate-500">
            {sources.length} table{sources.length === 1 ? '' : 's'}
          </p>
        </div>
        <div className="flex min-w-0 flex-1 items-center gap-2 sm:max-w-xl">
          <div className="relative flex-1">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              aria-label="Search database tables"
              placeholder="Search tables in this catalog…"
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full rounded-lg border bg-transparent pl-9 pr-3 py-2 text-sm outline-none focus:ring-2 focus:ring-emerald-500/20"
            />
          </div>
          <button
            type="button"
            className={`${control} flex items-center gap-1.5`}
            disabled={busy}
            onClick={() => void refresh()}
          >
            <RefreshCw size={14} className={busy ? 'animate-spin' : ''} />
            Refresh
          </button>
        </div>
      </header>

      <div className="flex flex-wrap items-center justify-between gap-3 border-b bg-slate-50/60 px-4 py-2.5 dark:bg-slate-950/30">
        <label className="flex items-center gap-2 text-xs font-medium text-slate-700 dark:text-slate-300 cursor-pointer">
          <input
            type="checkbox"
            checked={related}
            onChange={e => setRelated(e.target.checked)}
            className="rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
          />
          Also open accessible related tables (all visible records)
        </label>
        <span className="text-xs text-slate-500 font-medium">
          {filteredSources.length} of {sources.length} tables
        </span>
      </div>

      <div className="p-0">
        {notice && (
          <div role="status" className="m-4 flex items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-xs text-emerald-800 dark:border-emerald-900/50 dark:bg-emerald-950/40 dark:text-emerald-300">
            <CheckCircle2 size={16} className="shrink-0 text-emerald-600" />
            {notice}
          </div>
        )}

        {error && (
          <div role="alert" className="m-4 flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 p-3 text-xs text-red-800 dark:border-red-900/50 dark:bg-red-950/40 dark:text-red-300">
            <AlertCircle size={16} className="shrink-0 text-red-600" />
            {error}
          </div>
        )}

        {busy && !sources.length && (
          <div role="status" className="p-8 text-center text-xs text-slate-500">
            <RefreshCw size={20} className="mx-auto mb-2 animate-spin text-emerald-600" />
            Loading database tables...
          </div>
        )}

        {!busy && !sources.length && !error && (
          <div className="p-12 text-center text-sm text-slate-500">
            No supported tables are available to this account.
          </div>
        )}

        {!busy && sources.length > 0 && !filteredSources.length && (
          <div className="p-12 text-center text-sm text-slate-500">
            No database tables match &quot;{search}&quot;.
          </div>
        )}

        {filteredSources.length > 0 && (
          <div className="divide-y border-b dark:border-slate-800">
            {filteredSources.map(source => (
              <div
                key={source.id}
                className="group flex flex-wrap items-center gap-3 px-4 py-3 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors"
              >
                <TableProperties size={19} className="shrink-0 text-emerald-600" />

                <div className="min-w-0 flex-1">
                  <button
                    type="button"
                    disabled={busy}
                    title={source.name}
                    className="text-left font-medium text-sm text-slate-900 dark:text-slate-100 hover:text-emerald-600 dark:hover:text-emerald-400 truncate block"
                    onClick={() => void open(source)}
                  >
                    {source.name}
                  </button>
                  <span className="block text-[11px] text-slate-500 mt-0.5">
                    {source.columns.length} columns · {source.relations?.length || 0} relations ·{' '}
                    {source.update ? 'Editable' : 'View only'}
                  </span>
                </div>

                <span
                  className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[10px] font-semibold shrink-0 ${
                    source.update
                      ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300'
                      : 'bg-amber-50 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300'
                  }`}
                >
                  {source.update ? <Unlock size={10} /> : <Lock size={10} />}
                  {source.update ? 'Editable' : 'View only'}
                </span>

                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    className="rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-emerald-700 transition-colors flex items-center gap-1.5 disabled:opacity-40"
                    disabled={busy}
                    onClick={() => void open(source)}
                  >
                    <FileSpreadsheet size={14} />
                    View
                  </button>

                  <button
                    type="button"
                    className={`${control} flex items-center gap-1`}
                    disabled={busy || !source.create}
                    title={!source.create ? 'No supported create action for this account' : undefined}
                    onClick={() => setCreating(source)}
                  >
                    <Plus size={14} />
                    New record
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <footer className="flex items-center justify-between p-3 text-xs text-slate-500">
        <span>{filteredSources.length} tables available</span>
      </footer>

      {creating && (
        <NewDatabaseRecord
          source={creating}
          onCreated={() => {
            setCreating(null);
            setNotice('Database record created successfully.');
          }}
          onClose={() => setCreating(null)}
        />
      )}
    </section>
  );
}

function NewDatabaseRecord({ source, onClose, onCreated }: { source: WorkspaceSource; onClose: () => void; onCreated: () => void }) {
  const [values, setValues] = useState<Record<string, string>>({});
  const [preview, setPreview] = useState<Record<string, unknown> | null>(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const schema = source.create!.schema;

  function review() {
    try {
      const data: Record<string, unknown> = {};
      for (const [name, value] of Object.entries(values))
        if (value !== '') data[name] = fieldValue(value, schema.properties![name], schema);
      for (const name of schema.required || []) if (!(name in data)) throw Error(`${name} is required.`);
      setPreview(data);
      setError('');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Invalid record');
    }
  }

  async function save() {
    if (!preview || submitted) return;
    setBusy(true);
    setSubmitted(true);
    try {
      await apiFetch(source.create!.path, { method: 'POST', body: JSON.stringify(preview) }, true, fresh);
      setError('');
      onCreated();
    } catch (e) {
      setError(
        (e instanceof Error ? e.message : 'Could not confirm save') +
          ' Check the table before trying again; this dialog will not resend the record.'
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="fixed inset-0 z-[95] flex items-center justify-center bg-black/50 p-4">
      <section
        role="dialog"
        aria-modal="true"
        aria-label="New database record"
        className="max-h-[85dvh] w-full max-w-xl space-y-4 overflow-auto rounded-xl bg-white p-6 shadow-xl dark:bg-slate-900"
      >
        <div className="flex items-center justify-between border-b pb-3 dark:border-slate-800">
          <h3 className="flex items-center gap-2 font-bold text-base text-slate-900 dark:text-slate-100">
            <Plus size={18} className="text-emerald-600" />
            New record · {source.name}
          </h3>
          <button
            type="button"
            className="rounded p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
            disabled={busy}
            onClick={onClose}
          >
            <X size={18} />
          </button>
        </div>

        {preview ? (
          <div className="space-y-3">
            <p className="text-xs text-slate-600 dark:text-slate-300">
              Review the exact values before creating this database record:
            </p>
            <pre className="max-h-60 overflow-auto whitespace-pre-wrap rounded-lg border bg-slate-50 p-3 text-xs font-mono dark:bg-slate-950/40">
              {JSON.stringify(preview, null, 2)}
            </pre>
            <div className="flex justify-end gap-2 pt-2 border-t dark:border-slate-800">
              <button type="button" className={control} disabled={busy || submitted} onClick={() => setPreview(null)}>
                Back
              </button>
              <button
                type="button"
                className="rounded-lg bg-emerald-600 px-3.5 py-1.5 text-xs font-medium text-white hover:bg-emerald-700 disabled:opacity-40"
                disabled={busy || submitted}
                onClick={() => void save()}
              >
                {busy ? 'Saving...' : 'Confirm create record'}
              </button>
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            <div className="space-y-3 max-h-[50dvh] overflow-y-auto pr-1">
              {Object.entries(schema.properties || {}).map(([name, definition]) => {
                const field = resolvedSchema(definition, schema);
                const typed = field.anyOf?.find((s: Schema) => s.type !== 'null') || field;
                return (
                  <label key={name} className="block text-xs font-medium text-slate-700 dark:text-slate-300">
                    {name}
                    {schema.required?.includes(name) ? <span className="text-red-500 font-bold ml-0.5">*</span> : ''}
                    <textarea
                      rows={typed.type === 'object' || typed.type === 'array' ? 3 : 1}
                      value={values[name] || ''}
                      onChange={e => setValues({ ...values, [name]: e.target.value })}
                      placeholder={typed.enum?.join(' / ') || typed.format || typed.type || 'Value'}
                      className="mt-1 block w-full rounded-lg border bg-transparent p-2 text-xs font-normal outline-none focus:ring-2 focus:ring-emerald-500/20"
                    />
                    {field.description && <span className="mt-0.5 block text-[11px] font-normal text-slate-500">{field.description}</span>}
                  </label>
                );
              })}
            </div>
            <p className="text-[11px] text-slate-500">
              Use record IDs for relationships, true/false for booleans, and JSON for nested fields. Server validation and account permissions apply.
            </p>
            <div className="flex justify-end gap-2 pt-2 border-t dark:border-slate-800">
              <button type="button" className={control} onClick={onClose}>
                Cancel
              </button>
              <button
                type="button"
                className="rounded-lg bg-emerald-600 px-3.5 py-1.5 text-xs font-medium text-white hover:bg-emerald-700"
                onClick={review}
              >
                Review new record
              </button>
            </div>
          </div>
        )}

        {error && (
          <div role="alert" className="flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 p-3 text-xs text-red-800 dark:border-red-900/50 dark:bg-red-950/40 dark:text-red-300">
            <AlertCircle size={16} className="shrink-0 text-red-600" />
            {error}
          </div>
        )}
      </section>
    </div>
  );
}
