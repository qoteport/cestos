'use client';
import WorkbookMappingAssistant from './WorkbookMappingAssistant';
import { createContext, useContext, useCallback, useEffect, useMemo, useState } from 'react';
import { apiFetch, ApiError } from '@/lib/api';
import type { FieldSheet } from '@/lib/fieldWorkbook';
import {
  defaultLayout,
  extractMapping,
  headerNames,
  suggestFields,
  cellAddress,
  parseCellAddress,
  assertLayout,
  type MappingLayout,
  type MappingTable,
  type MappingField,
} from '@/lib/workbookMapping';
import { useAuth } from './AuthProvider';
import { readDeviceLibrary, saveDeviceLibrary } from '@/lib/workbookDevice';
import SearchableSelect from './SearchableSelect';
function mappingError(error: unknown) {
  if (error instanceof ApiError && error.status === 404)
    return 'Database mapping is unavailable on this server. Update the backend, then retry. Your sheet is unchanged.';
  return error instanceof Error ? error.message : 'Could not load database mapping.';
}
const InputValidity = createContext<(label: string, pending: boolean) => void>(() => {});
const input = 'rounded border border-slate-300 bg-transparent px-2 py-1 text-sm';
function CellInput({
  value,
  onChange,
  label,
}: {
  value: string;
  onChange: (value: string) => boolean;
  label: string;
}) {
  const [text, setText] = useState(value);
  const validity = useContext(InputValidity);
  const commit = () => validity(label, !onChange(text));
  useEffect(() => () => validity(label, false), [label, validity]);
  useEffect(() => setText(value), [value]);
  return (
    <input
      className={input}
      aria-label={label}
      value={text}
      placeholder={label.startsWith('Cell for ') ? 'B4' : '3, 4'}
      onChange={(e) => {
        setText(e.target.value);
        validity(label, true);
      }}
      onBlur={commit}
      onKeyDown={(e) => {
        if (e.key === 'Enter') {
          e.preventDefault();
          commit();
        }
      }}
    />
  );
}
function DatabaseRecordPicker({
  fieldName,
  value,
  tables,
  disabled,
  onChange,
}: {
  fieldName: string;
  value: string;
  tables: MappingTable[];
  disabled?: boolean;
  onChange: (value: string) => void;
}) {
  const [selectedTableId, setSelectedTableId] = useState(() => {
    const base = fieldName.replace(/_ids?$/, '').replace(/_/g, '').toLowerCase();
    const match = tables.find((t) => {
      const tn = t.name.replace(/_/g, '').toLowerCase();
      const tid = t.id.split('/').pop()?.replace(/_/g, '').toLowerCase() || '';
      return tn.includes(base) || base.includes(tn) || tid.includes(base) || base.includes(tid);
    });
    return match?.id || tables[0]?.id || '';
  });

  const [records, setRecords] = useState<{ value: string; label: string }[]>([]);
  const [loadingRecords, setLoadingRecords] = useState(false);
  const [manual, setManual] = useState(!/_ids?$/.test(fieldName));
  const [recordError, setRecordError] = useState('');

  useEffect(() => {
    if (!selectedTableId || manual) return;
    let active = true;
    setLoadingRecords(true);
    setRecords([]);
    setRecordError('');
    const policy = { cacheResponse: true, cacheOfflineRead: true, memoryCache: true };
    void (async () => {
      try {
        const res = await apiFetch<any>(
          selectedTableId.includes('?') ? selectedTableId : `${selectedTableId}?page_size=100`,
          {},
          true,
          policy
        );
        if (!active) return;
        const items = Array.isArray(res) ? res : res?.items || [];
        const opts = items.map((row: any) => {
          const id = String(row.id || row.key || row.code || '');
          const name = String(row.name || row.title || row.display_name || row.fleet_number || row.asset_number || row.full_name || id);
          const sub = row.code || row.asset_number || row.job_title || row.status || '';
          return {
            value: id,
            label: `${name}${sub ? ` (${sub})` : ''}`,
          };
        });
        setRecords(opts);
      } catch {
        if (active) { setRecords([]); setRecordError('Records could not be loaded. Check your connection and table permissions, or enter a known ID.'); }
      } finally {
        if (active) setLoadingRecords(false);
      }
    })();
    return () => {
      active = false;
    };
  }, [selectedTableId, manual]);

  if (manual) {
    return (
      <div className="flex items-center gap-1.5 text-xs">
        <input
          type="text"
          className={input}
          placeholder="Enter constant value / ID"
          value={value}
          disabled={disabled}
          onChange={(e) => onChange(e.target.value)}
        />
        <button
          type="button"
          className="text-xs text-blue-600 underline whitespace-nowrap"
          onClick={() => setManual(false)}
        >
          Select record
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-1 text-xs min-w-56">
      <div className="flex items-center gap-1">
        <span className="text-slate-500 text-[11px] shrink-0">Table:</span>
        <div className="min-w-0 flex-1">
          <SearchableSelect
            ariaLabel={`Table for ${fieldName}`}
            value={selectedTableId}
            disabled={disabled}
            options={tables.map((t) => ({ value: t.id, label: t.name }))}
            onChange={(tId) => { setSelectedTableId(tId); onChange(''); }}
          />
        </div>
      </div>
      {recordError && <p role="alert" className="text-xs text-amber-700">{recordError}</p>}
      <div className="flex items-center gap-1">
        <span className="text-slate-500 text-[11px] shrink-0">Record:</span>
        <div className="min-w-0 flex-1">
          <SearchableSelect
            ariaLabel={`Record for ${fieldName}`}
            value={value}
            disabled={disabled || loadingRecords}
            placeholder={loadingRecords ? 'Loading records...' : 'Select database record'}
            options={records}
            onChange={(recId) => onChange(recId)}
          />
        </div>
        <button
          type="button"
          title="Switch to manual text input"
          className="text-[11px] text-slate-500 underline shrink-0 ml-1"
          onClick={() => setManual(true)}
        >
          Custom
        </button>
      </div>
    </div>
  );
}

export default function WorkbookDatabaseConnection({
  sheet,
  onClose,
  onSave,
  onIssue,
}: {
  sheet: FieldSheet;
  onClose: () => void;
  onSave: (connection: NonNullable<FieldSheet['connection']>) => void;
  onIssue: (r: number, c: number, message: string) => void;
}) {
  const { user, offline } = useAuth();
  const [inputValidity, setInputValidity] = useState<Record<string, boolean>>({});
  const markInput = useCallback(
    (label: string, pending: boolean) =>
      setInputValidity((old) => (old[label] === pending ? old : { ...old, [label]: pending })),
    []
  );
  const pendingInputs = Object.values(inputValidity).some(Boolean);
  const [tables, setTables] = useState<MappingTable[]>([]),
    [table, setTable] = useState(sheet.connection?.table || ''),
    [layout, setLayout] = useState(() => defaultLayout(sheet));
  const [busy, setBusy] = useState(false),
    [error, setError] = useState(''),
    [retry, setRetry] = useState(0),
    [cached, setCached] = useState(false),
    [online, setOnline] = useState(true),
    [result, setResult] = useState<any>(null);
  const [pick, setPick] = useState<string | null>(null),
    [page, setPage] = useState(0),
    [columnPage, setColumnPage] = useState(0);
  const selected = tables.find((t) => t.id === table);
  useEffect(() => {
    const update = () => {
      setOnline(navigator.onLine);
      setRetry((n) => n + 1);
    };
    update();
    window.addEventListener('online', update);
    window.addEventListener('offline', update);
    return () => {
      window.removeEventListener('online', update);
      window.removeEventListener('offline', update);
    };
  }, []);
  useEffect(() => {
    let active = true;
    setBusy(true);
    setError('');
    setResult(null);
    setTables([]);
    setCached(true);
    const scope = `workbook-mapping:${user?.id || 'anonymous'}`;
    void (async () => {
      try {
        const old = await readDeviceLibrary<MappingTable>(scope).catch(() => undefined);
        if (!active) return;
        if (old) setTables(old);
        if (!navigator.onLine || offline) return;
        const fresh = await apiFetch<MappingTable[]>(
          '/api/v1/workbook-connections/tables',
          {},
          true,
          { bypassMemoryRead: true, cacheOfflineRead: false, cacheResponse: false }
        );
        if (!active) return;
        setTables(fresh);
        setCached(false);
        await saveDeviceLibrary(scope, fresh);
      } catch (e) {
        if (active) setError(mappingError(e));
      } finally {
        if (active) setBusy(false);
      }
    })();
    return () => {
      active = false;
    };
  }, [retry, user?.id, offline]);
  const update = (change: Partial<MappingLayout>) => {
    setResult(null);
    setError('');
    setLayout((l) => ({ ...l, ...change }));
  };
  const extraction = useMemo(() => {
    try {
      return { data: extractMapping(sheet, layout), error: '' };
    } catch (e) {
      return { data: null, error: mappingError(e) };
    }
  }, [sheet, layout]);
  const headers = useMemo(() => headerNames(sheet, layout), [sheet, layout]);
  const missing =
    selected?.columns.filter((f) => f.required && !layout.fields[f.name]).map((f) => f.name) || [];
  const localIssues = extraction.data?.issues || [];
  const connection = (validated = false): NonNullable<FieldSheet['connection']> => ({
    table,
    mapping: {},
    headerRow: Math.min(...(layout.headerRows.length ? layout.headerRows : [0])),
    layout,
    writeMode: 'insert',
    importId:
      sheet.connection?.table === table && sheet.connection.importId
        ? sheet.connection.importId
        : crypto.randomUUID(),
    ...(validated ? { validatedAt: new Date().toISOString() } : {}),
  });
  const fingerprint = JSON.stringify({ table, layout, sheet, user: user?.id });
  const save = (validated = false) => {
    try {
      if (pendingInputs)
        throw Error('Finish entering valid header rows and cell references before saving.');
      assertLayout(sheet, layout);
      if (validated && result?.fingerprint !== fingerprint)
        throw Error('The sheet or mapping changed. Validate it again.');
      if (!selected) throw Error('Select an available table.');
      onSave(connection(validated));
    } catch (e) {
      setError(mappingError(e));
    }
  };
  const setField = (name: string, source?: MappingField) => {
    const fields = { ...layout.fields };
    if (source) fields[name] = source;
    else delete fields[name];
    update({ fields });
  };
  const setAddress = (name: string, value: string, kind: 'cell' | 'block') => {
    try {
      const p = parseCellAddress(value);
      if (p.r >= sheet.cells.length || p.c >= sheet.widths.length)
        throw Error('Choose a cell inside this sheet.');
      setField(name, { kind, ...p });
      return true;
    } catch (e) {
      setError(mappingError(e));
      return false;
    }
  };
  const listNumbers = (text: string, max: number) => {
    const values = text
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean)
      .map(Number);
    if (values.some((n) => !Number.isInteger(n) || n < 1 || n > max))
      throw Error(`Enter comma-separated numbers from 1 to ${max}.`);
    return [...new Set(values.map((n) => n - 1))];
  };
  const changeMode = (mode: MappingLayout['mode']) => {
    const next = {
      ...layout,
      mode,
      start:
        mode === 'rows'
          ? Math.min(sheet.cells.length - 1, Math.max(0, ...layout.headerRows) + 1)
          : mode === 'columns'
            ? Math.min(sheet.widths.length - 1, layout.labelColumn + 1)
            : 0,
      end: mode === 'columns' ? sheet.widths.length - 1 : sheet.cells.length - 1,
      fields: {},
      needsReview: false,
    };
    update(next);
  };
  async function validate() {
    if (pendingInputs || !extraction.data || !selected || missing.length || localIssues.length)
      return;
    setBusy(true);
    setError('');
    setResult(null);
    try {
      const response = await apiFetch(
        '/api/v1/workbook-connections/preview',
        {
          method: 'POST',
          body: JSON.stringify({
            table,
            mapping: extraction.data.mapping,
            rows: extraction.data.rows,
          }),
        },
        true,
        { queueWhenOffline: false }
      );
      setResult({ ...(response as object), fingerprint });
    } catch (e) {
      setError(mappingError(e));
    } finally {
      setBusy(false);
    }
  }
  const jump = (row: number, field: string, message: string) => {
    const p = extraction.data?.locations[row - 1]?.[field];
    if (p) onIssue(p.r, p.c, message);
  };
  return (
    <InputValidity.Provider value={markInput}>
      <div
        className="fixed inset-0 z-[70] flex items-center justify-center bg-slate-950/50 p-3"
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
          aria-label="Connect to Database Table"
          className="max-h-[94dvh] w-full max-w-6xl overflow-auto rounded-xl bg-white p-5 text-slate-900 shadow-xl dark:bg-slate-900 dark:text-slate-100"
        >
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-bold">Connect to Database Table</h3>
            <button
              type="button"
              className="rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-1 text-xs font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-750 transition-colors"
              onClick={onClose}
            >
              Close
            </button>
          </div>
          <p className="my-1.5 text-xs text-slate-600 dark:text-slate-400">
            Map <span className="font-semibold text-slate-800 dark:text-slate-200">{sheet.name}</span> to a database table to preview extracted records.
          </p>
          <div className="mb-3 inline-flex items-center gap-1.5 rounded-md bg-amber-50 dark:bg-amber-950/40 px-2.5 py-1 text-xs font-medium text-amber-800 dark:text-amber-300 border border-amber-200/60 dark:border-amber-800/40">
            <span>Mapping preview only · No database changes made</span>
          </div>
          {(cached || !online || offline) && (
            <p className="my-2 text-xs text-slate-500 dark:text-slate-400">
              Offline mode: Saved table definitions available. Reconnect to verify current permissions.
            </p>
          )}
          {error && (
            <p role="alert" className="my-2 text-sm text-red-600">
              {error}
            </p>
          )}
          <div className="flex items-center gap-2">
            <div className="min-w-0 flex-1">
              <SearchableSelect
                ariaLabel="Database table"
                value={table}
                disabled={busy}
                options={tables.map((t) => ({
                  value: t.id,
                  label: t.name,
                  sublabel:
                    t.validationAvailable === false
                      ? 'Mapping draft only · no supported create validator'
                      : 'Schema validation available',
                }))}
                onChange={(id) => {
                  setTable(id);
                  setResult(null);
                  update({ fields: {} });
                }}
                placeholder={busy ? 'Loading tables...' : 'Select database table'}
              />
            </div>
            <button
              type="button"
              className={input}
              disabled={busy}
              onClick={() => setRetry((n) => n + 1)}
            >
              Refresh tables
            </button>
          </div>
          {!busy && !tables.length && (
            <p className="my-3 text-sm">
              No tables were returned. Refresh after the backend update; tables are limited to the
              application endpoints your account can access.
            </p>
          )}
          {selected && (
            <>
              <fieldset disabled={busy} className="my-4 space-y-3 rounded border p-3">
                <legend className="px-1 font-semibold">1. Sheet layout</legend>
                <SearchableSelect
                  ariaLabel="Record layout"
                  value={layout.mode}
                  options={[
                    {
                      value: 'rows',
                      label: 'Records down rows — table with one or more header rows',
                    },
                    {
                      value: 'columns',
                      label: 'Records across columns — field labels down a column',
                    },
                    { value: 'form', label: 'Single form — values in individual cells' },
                    { value: 'blocks', label: 'Repeated forms — one record per block of rows' },
                  ]}
                  onChange={(value) => {
                    if (value) changeMode(value as MappingLayout['mode']);
                  }}
                />
                <div className="flex flex-wrap items-center gap-3">
                  {layout.mode === 'rows' && (
                    <label className="text-sm">
                      Header rows{' '}
                      <CellInput
                        label="Header rows"
                        value={layout.headerRows.map((r) => r + 1).join(', ')}
                        onChange={(text) => {
                          try {
                            update({ headerRows: listNumbers(text, sheet.cells.length) });
                            return true;
                          } catch (e) {
                            setError(mappingError(e));
                            return false;
                          }
                        }}
                      />
                    </label>
                  )}
                  {layout.mode === 'columns' && (
                    <label className="text-sm">
                      Labels in column{' '}
                      <input
                        className={input}
                        type="number"
                        min={1}
                        max={sheet.widths.length}
                        value={layout.labelColumn + 1}
                        onChange={(e) => update({ labelColumn: Number(e.target.value) - 1 })}
                      />
                    </label>
                  )}
                  <label className="text-sm">
                    First {layout.mode === 'columns' ? 'column' : 'row'}{' '}
                    <input
                      className={input}
                      type="number"
                      min={1}
                      max={layout.mode === 'columns' ? sheet.widths.length : sheet.cells.length}
                      value={layout.start + 1}
                      onChange={(e) => update({ start: Number(e.target.value) - 1 })}
                    />
                  </label>
                  <label className="text-sm">
                    Last {layout.mode === 'columns' ? 'column' : 'row'}{' '}
                    <input
                      className={input}
                      type="number"
                      min={1}
                      max={layout.mode === 'columns' ? sheet.widths.length : sheet.cells.length}
                      value={layout.end + 1}
                      onChange={(e) => update({ end: Number(e.target.value) - 1 })}
                    />
                  </label>
                  {layout.mode === 'blocks' && (
                    <label className="text-sm">
                      Rows per form{' '}
                      <input
                        className={input}
                        type="number"
                        min={1}
                        max={sheet.cells.length}
                        value={layout.blockSize}
                        onChange={(e) => update({ blockSize: Number(e.target.value) })}
                      />
                    </label>
                  )}
                  {layout.mode !== 'form' && (
                    <label className="text-sm">
                      Exclude {layout.mode === 'columns' ? 'columns' : 'rows / block start rows'}{' '}
                      <CellInput
                        label="Excluded records"
                        value={layout.exclude.map((r) => r + 1).join(', ')}
                        onChange={(text) => {
                          try {
                            update({
                              exclude: listNumbers(
                                text,
                                layout.mode === 'columns' ? sheet.widths.length : sheet.cells.length
                              ),
                            });
                            return true;
                          } catch (e) {
                            setError(mappingError(e));
                            return false;
                          }
                        }}
                      />
                    </label>
                  )}
                </div>
                <p className="text-xs text-slate-500">
                  Use exclusions for totals, notes and repeated headings. Empty records are skipped.
                  For repeated forms, map the first block; the same cell positions repeat in each
                  block.
                </p>
                {layout.needsReview && (
                  <div className="text-sm text-amber-700">
                    Rows or columns changed since this mapping was saved. Review every reference.
                    <button
                      type="button"
                      className={`${input} ml-2`}
                      onClick={() => {
                        try {
                          assertLayout(sheet, { ...layout, needsReview: false });
                          update({ needsReview: false });
                        } catch (e) {
                          setError(mappingError(e));
                        }
                      }}
                    >
                      Confirm reviewed layout
                    </button>
                  </div>
                )}
              </fieldset>
              <div className="flex items-center justify-between">
                <h4 className="font-semibold">2. Map database fields</h4>
                <button
                  type="button"
                  className={input}
                  disabled={busy}
                  onClick={() => update({ fields: {...suggestFields(sheet, layout, selected), ...Object.fromEntries(Object.entries(layout.fields).filter(([,field])=>field.kind==='constant'))} })}
                >
                  Suggest from labels
                </button>
              </div>
              <section className="my-3 rounded-xl border border-emerald-200 bg-emerald-50/40 p-3 dark:bg-emerald-950/20" aria-label="Hidden database details">
                <h5 className="text-sm font-semibold">Details not on the sheet</h5>
                <p className="mt-1 text-xs text-slate-600 dark:text-slate-300">Set a project, site, employee or another value once for every imported record. These details are saved with the connection and included in validation, without adding cells or columns. Use sheet mappings when values differ between rows.</p>
                <SearchableSelect ariaLabel="Add hidden database detail" value="" disabled={busy}
                  placeholder="Choose a database field…"
                  options={selected.columns.filter(field=>layout.fields[field.name]?.kind!=='constant').map(field=>({value:field.name,label:`${field.name}${field.required?' · Required':''}`}))}
                  onChange={name=>{if(name)setField(name,{kind:'constant',r:0,c:0,value:''});}}/>
                {selected.columns.filter(field=>layout.fields[field.name]?.kind==='constant').map(field=><div key={field.name} className="mt-3 rounded-lg border bg-white p-3 dark:bg-slate-900">
                  <div className="mb-2 flex items-center justify-between gap-2"><span className="text-sm font-medium">{field.name}{field.required?' · Required':''}</span><button type="button" className="text-xs underline" disabled={busy} onClick={()=>setField(field.name,undefined)}>Remove hidden value</button></div>
                  <DatabaseRecordPicker fieldName={field.name} value={layout.fields[field.name].value||''} tables={tables} disabled={busy} onChange={value=>setField(field.name,{kind:'constant',r:0,c:0,value})}/>
                  <p className="mt-1 text-xs text-slate-500">Applies to every extracted record. The spreadsheet stays unchanged.</p>
                </div>)}
              </section>
              <div className="my-2 overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr>
                      <th className="p-2 text-left">Database field</th>
                      <th className="p-2 text-left">Read from</th>
                      <th className="p-2 text-left">Sheet location or hidden value</th>
                    </tr>
                  </thead>
                  <tbody>
                    {selected.columns.map((field, index) => {
                      const f = layout.fields[field.name];
                      const defaultKind =
                        layout.mode === 'rows'
                          ? 'column'
                          : layout.mode === 'columns'
                            ? 'row'
                            : layout.mode === 'blocks'
                              ? 'block'
                              : 'cell';
                      const kind = f?.kind || 'none';
                      return (
                        <tr key={field.name} className="border-t">
                          <td className="p-2">
                            {field.name}
                            <span className="block text-xs text-slate-500">
                              {field.type}
                              {field.required ? ' · Required' : ''}
                              {field.nullable ? ' · Nullable' : ''}
                            </span>
                          </td>
                          <td className="min-w-40 p-2">
                            <SearchableSelect
                              ariaLabel={`Source for ${field.name}`}
                              value={kind}
                              disabled={busy}
                              options={[
                                { value: 'none', label: 'Not mapped' },
                                ...(layout.mode === 'rows'
                                  ? [{ value: 'column', label: 'Column in each data row' }]
                                  : layout.mode === 'columns'
                                    ? [{ value: 'row', label: 'Row in each data column' }]
                                    : layout.mode === 'blocks'
                                      ? [{ value: 'block', label: 'Cell in each form block' }]
                                      : []),
                                { value: 'cell', label: 'Fixed cell / report value' },
                                { value: 'constant', label: 'Hidden value / database record' },
                              ]}
                              onChange={(value) =>
                                setField(
                                  field.name,
                                  !value || value === 'none'
                                    ? undefined
                                    : {
                                        kind: value as MappingField['kind'],
                                        r: layout.mode === 'blocks' ? layout.start : 0,
                                        c: f?.c ?? (index < headers.length ? index : 0),
                                        value: f?.value ?? '',
                                      }
                                )
                              }
                            />
                          </td>
                          <td className="min-w-60 p-2">
                            {kind === 'column' || kind === 'row' ? (
                              <SearchableSelect
                                disabled={busy}
                                ariaLabel={`Map ${field.name}`}
                                value={f && (f.kind as string) !== 'none' ? String(f.kind === 'column' ? f.c : f.r) : ''}
                                placeholder={kind === 'column' ? 'Select column...' : 'Select row...'}
                                options={
                                  kind === 'column'
                                    ? headers.map((h, c) => ({
                                        value: String(c),
                                        label: `${cellAddress(0, c).replace(/1$/, '')}: ${h || '(no label)'}`,
                                      }))
                                    : sheet.cells.map((row, r) => ({
                                        value: String(r),
                                        label: `${r + 1}: ${row[layout.labelColumn] || '(no label)'}`,
                                      }))
                                }
                                onChange={(v) =>
                                  v === ''
                                    ? setField(field.name, undefined)
                                    : setField(field.name, {
                                        kind: kind as MappingField['kind'],
                                        r: kind === 'column' ? 0 : Number(v),
                                        c: kind === 'column' ? Number(v) : 0,
                                      })
                                }
                              />
                            ) : kind === 'constant' ? (
                              <DatabaseRecordPicker
                                fieldName={field.name}
                                value={f?.value || ''}
                                tables={tables}
                                disabled={busy}
                                onChange={(val) =>
                                  setField(field.name, { kind: 'constant', r: 0, c: 0, value: val })
                                }
                              />
                            ) : f && (f.kind as string) !== 'none' ? (
                              <div className="flex gap-2">
                                <CellInput
                                  label={`Cell for ${field.name}`}
                                  value={cellAddress(f.r, f.c)}
                                  onChange={(value) =>
                                    setAddress(field.name, value, f.kind as 'cell' | 'block')
                                  }
                                />
                                <button
                                  type="button"
                                  className={input}
                                  onClick={() => {
                                    setPick(field.name);
                                    setPage(Math.floor(f.r / 12));
                                    setColumnPage(Math.floor(f.c / 8));
                                  }}
                                >
                                  Pick cell
                                </button>
                              </div>
                            ) : (
                              <span className="text-slate-400">—</span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
              <details open={!!pick} className="my-3 rounded border p-3">
                <summary className="cursor-pointer font-medium">
                  Inspect sheet / select header rows
                </summary>
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <strong>
                      {pick ? `Pick a cell for ${pick}` : 'Select row labels to toggle header rows'}
                    </strong>
                    <button type="button" className={input} onClick={() => setPick(null)}>
                      Done
                    </button>
                    <button
                      type="button"
                      disabled={page === 0}
                      onClick={() => setPage((p) => p - 1)}
                    >
                      ↑ Rows
                    </button>
                    <button
                      type="button"
                      disabled={(page + 1) * 12 >= sheet.cells.length}
                      onClick={() => setPage((p) => p + 1)}
                    >
                      ↓ Rows
                    </button>
                    <button
                      type="button"
                      disabled={columnPage === 0}
                      onClick={() => setColumnPage((p) => p - 1)}
                    >
                      ← Columns
                    </button>
                    <button
                      type="button"
                      disabled={(columnPage + 1) * 8 >= sheet.widths.length}
                      onClick={() => setColumnPage((p) => p + 1)}
                    >
                      Columns →
                    </button>
                  </div>
                  <div className="overflow-auto">
                    <table className="my-2 text-xs">
                      <tbody>
                        {sheet.cells.slice(page * 12, page * 12 + 12).map((row, i) => (
                          <tr key={i}>
                            <th className="border p-2">
                              <button
                                type="button"
                                disabled={layout.mode !== 'rows' || busy}
                                aria-pressed={layout.headerRows.includes(page * 12 + i)}
                                className={
                                  layout.headerRows.includes(page * 12 + i)
                                    ? 'font-bold text-blue-600'
                                    : ''
                                }
                                onClick={() => {
                                  const r = page * 12 + i;
                                  update({
                                    headerRows: layout.headerRows.includes(r)
                                      ? layout.headerRows.filter((h) => h !== r)
                                      : [...layout.headerRows, r].sort((a, b) => a - b),
                                  });
                                }}
                              >
                                Row {page * 12 + i + 1}
                                {layout.headerRows.includes(page * 12 + i) ? ' · Header' : ''}
                              </button>
                            </th>
                            {row.slice(columnPage * 8, columnPage * 8 + 8).map((value, j) => {
                              const r = page * 12 + i,
                                c = columnPage * 8 + j;
                              return (
                                <td key={j} className="border">
                                  <button
                                    type="button"
                                    className="min-h-12 min-w-24 p-2 text-left hover:bg-blue-100"
                                    onClick={() => {
                                      if (!pick) return;
                                      setField(pick, {
                                        kind:
                                          layout.fields[pick]?.kind === 'block' ? 'block' : 'cell',
                                        r,
                                        c,
                                      });
                                      setPick(null);
                                    }}
                                  >
                                    <span className="block text-slate-500">
                                      {cellAddress(r, c)}
                                    </span>
                                    {value.slice(0, 70) || '—'}
                                  </button>
                                </td>
                              );
                            })}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </details>
              <h4 className="mt-4 font-semibold">3. Extracted records</h4>
              {extraction.error && (
                <p role="alert" className="my-2 text-amber-700">
                  {extraction.error}
                </p>
              )}
              {missing.length > 0 && (
                <p className="my-2 text-sm text-amber-700">
                  Required fields to map: {missing.join(', ')}
                </p>
              )}
              {extraction.data && (
                <>
                  <p className="my-2 text-sm">
                    {extraction.data.rows.length} records extracted. Showing the first 10; click a
                    value to inspect its source cell.
                  </p>
                  <div className="max-h-64 overflow-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr>
                          {Object.keys(extraction.data.mapping).map((name) => (
                            <th key={name} className="border p-2 text-left">
                              {name}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {extraction.data.rows.slice(0, 10).map((row, i) => (
                          <tr key={i}>
                            {row.map((value, j) => {
                              const name = Object.keys(extraction.data!.mapping)[j],
                                p = extraction.data!.locations[i][name];
                              return (
                                <td key={j} className="border p-2">
                                  <button
                                    type="button"
                                    title={`Inspect ${cellAddress(p.r, p.c)}`}
                                    onClick={() => {
                                      setPick(name);
                                      setPage(Math.floor(p.r / 12));
                                      setColumnPage(Math.floor(p.c / 8));
                                    }}
                                  >
                                    {value || '—'}
                                    <span className="ml-2 text-xs text-slate-400">
                                      {cellAddress(p.r, p.c)}
                                    </span>
                                  </button>
                                </td>
                              );
                            })}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </>
              )}
              {localIssues.map((issue, i) => (
                <p key={i} className="text-sm text-red-600">
                  Record {issue.row} · {issue.field}: {issue.message}
                </p>
              ))}
              {selected.validationAvailable === false && (
                <p className="my-3 text-sm">
                  This table is available to your account for reading. You can save its mapping, but
                  it has no supported create validator. Required fields and write rules are not yet
                  verified.
                </p>
              )}
              <div className="my-4 flex gap-2">
                <button
                  type="button"
                  className="btn-primary"
                  disabled={
                    busy ||
                    pendingInputs ||
                    !extraction.data?.rows.length ||
                    !!missing.length ||
                    !!localIssues.length ||
                    !online ||
                    offline ||
                    cached ||
                    selected.validationAvailable === false
                  }
                  onClick={() => void validate()}
                >
                  Validate against database
                </button>
                <button
                  type="button"
                  className={input}
                  disabled={busy || pendingInputs || !!extraction.error || sheet.previewLimited}
                  onClick={() => save()}
                >
                  Save mapping draft
                </button>
              </div>
              {result?.fingerprint === fingerprint && (
                <div className="rounded border p-3">
                  <p>{result.count} records passed schema parsing.</p>
                  {result.issues?.length ? (
                    <ul className="max-h-48 overflow-auto text-sm text-red-600">
                      {result.issues.map((issue: any, i: number) => (
                        <li key={i}>
                          <button
                            type="button"
                            className="py-1 text-left underline"
                            onClick={() => jump(issue.row, issue.field, issue.message)}
                          >
                            Record {issue.row || '—'} · {issue.field}: {issue.message}
                          </button>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <>
                      <p className="my-2 text-emerald-700">
                        Schema and available database checks passed. Destination business rules
                        still apply before any future import.
                      </p>
                      <button type="button" className="btn-primary" onClick={() => save(true)}>
                        Save validated mapping
                      </button>
                    </>
                  )}
                </div>
              )}
            </>
          )}
        </section>
      </div>
    </InputValidity.Provider>
  );
}
