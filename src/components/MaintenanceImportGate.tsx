 'use client';

import { useRef, useState, type ReactNode } from 'react';
import { apiFetch } from '@/lib/api';
import { maintenanceDefinitions, maintenanceSourceFiles, normalizeImportLabel, readMaintenanceImport, type MaintenanceImportKind, type MaintenanceImportSheet } from '@/lib/maintenanceImport';
import { Modal } from './DataUI';
import { UploadCloud, FileSpreadsheet } from 'lucide-react';

const sourceTypes: Record<MaintenanceImportKind, string> = { preventive: 'pm_job_card', assessment: 'maintenance_assessment', action: 'action_tracker_import', pm: 'pm_tracker_import', equipment: 'equipment_register_import' };
export type SaveImportFiles = (recordId: string) => Promise<void>;

export default function MaintenanceImportGate({ kind, record, assets = [], employees = [], onClose, children }: {
  kind: MaintenanceImportKind; record?: any; assets?: any[]; employees?: any[]; onClose: () => void;
  children: (draft: any, saveImportFiles: SaveImportFiles) => ReactNode;
}) {
  const [ready, setReady] = useState(Boolean(record));
  const [draft, setDraft] = useState<any>(record);
  const [file, setFile] = useState<File | null>(null);
  const [sheets, setSheets] = useState<MaintenanceImportSheet[]>([]);
  const [sheetIndex, setSheetIndex] = useState(0);
  const [rowIndex, setRowIndex] = useState(0);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const uploaded = useRef(new Set<string>());
  const sheet = sheets[sheetIndex];
  const selected = sheet?.records[rowIndex];

  async function upload(source: File) {
    setBusy(true); setError(''); setFile(null); setSheets([]);
    try { setSheets(await readMaintenanceImport(source, kind)); setFile(source); setSheetIndex(0); setRowIndex(0); }
    catch (error) { setError(error instanceof Error ? error.message : 'Could not read this file. You can continue with manual entry.'); }
    finally { setBusy(false); }
  }
  function proceed() {
    if (selected) {
      const prepare = (source: any) => {
      const next = structuredClone(source);
      const equipment = kind === 'preventive' ? next.pm_control?.equipment : next.equipment_area || next.equipment;
      const identifier = next.unit_number || next.pm_control?.fleet_unit_id;
      const matches = assets.filter((asset) => (identifier ? [asset.asset_number, asset.fleet_number] : [asset.name, asset.asset_name, asset.description]).some((value) => value && normalizeImportLabel(value) === normalizeImportLabel(identifier || equipment)));
      if (matches.length === 1) next.asset_id = String(matches[0].id);
      for (const [nameKey, idKey] of [['responsible_name', 'responsible_employee_id'], ['technician_name', 'technician_employee_id'], ['prepared_by_name', 'prepared_by_employee_id']]) {
        const people = employees.filter((person) => next[nameKey] && normalizeImportLabel([person.first_name, person.middle_name, person.last_name].filter(Boolean).join(' ') || person.name) === normalizeImportLabel(next[nameKey]));
        if (people.length === 1) next[idKey] = String(people[0].id);
      }
      return next;
      };
      setDraft(kind === 'equipment' ? sheet.records.map(prepare) : prepare(selected));
    } else setDraft(undefined);
    setReady(true);
  }
  async function saveImportFiles(recordId: string) {
    if (!file || !sheet) return;
    const sources = maintenanceSourceFiles(file, sheet);
    for (let index = 0; index < sources.length; index += 1) {
      const key = `${recordId}:${index}`;
      if (uploaded.current.has(key)) continue;
      const form = new FormData();
      form.append('file', sources[index]); form.append('title', sources[index].name.slice(0, 250));
      form.append('category', 'Equipment'); form.append('source_type', sourceTypes[kind]); form.append('source_id', recordId); form.append('visibility', 'PUBLIC');
      try { await apiFetch('/api/v1/documents', { method: 'POST', body: form }); uploaded.current.add(key); }
      catch { throw new Error('The record was saved, but a source attachment could not be uploaded. Save again to retry the remaining attachment.'); }
    }
  }
  if (ready) return <>{children(draft, saveImportFiles)}</>;
  return <Modal title={maintenanceDefinitions[kind].title} onClose={onClose} footer={<div className="flex w-full items-center justify-between gap-3"><span className="text-xs text-muted-foreground">{selected ? 'Review the prefilled fields next.' : 'No file? Continue to enter the details manually.'}</span><button type="button" className="btn-primary rounded-xl" disabled={busy} onClick={proceed}>Continue</button></div>}>
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">Upload a CSV or Excel file to prefill this form, or continue without a file. For Excel, we scan the worksheets and select the strongest match.</p>
      <label className="group block rounded-2xl border-2 border-dashed border-slate-300 bg-slate-50/70 p-6 text-center transition-all hover:border-[#184877] hover:bg-blue-50/50 cursor-pointer">
        <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-100/80 text-[#184877] transition-transform group-hover:scale-110">
          <UploadCloud className="h-6 w-6" />
        </div>
        <span className="mb-1 block text-sm font-bold text-slate-800">Optional CSV or Excel file</span>
        <span className="mb-4 block text-xs text-slate-500">Supports .csv, .xlsx, .xls spreadsheets</span>
        <input type="file" accept=".csv,.xlsx,.xls,text/csv,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" disabled={busy} onChange={(event) => { const source = event.target.files?.[0]; event.target.value = ''; if (source) void upload(source); }} className="block w-full max-w-md mx-auto text-xs text-slate-500 file:mr-3 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:bg-[#184877] file:text-white hover:file:bg-[#113456] file:cursor-pointer transition-colors shadow-sm" />
      </label>
      {busy && <p role="status">Reading file and checking worksheets...</p>}
      {error && <p role="alert" className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800">{error}</p>}
      {selected && <section className="space-y-3 rounded-xl border bg-muted/30 p-4">
        <p className="text-sm font-semibold">{file?.name}</p>
        <label className="block text-sm">Matched worksheet<select className="mt-1 block w-full rounded-lg border bg-background p-2" value={sheetIndex} onChange={(event) => { setSheetIndex(Number(event.target.value)); setRowIndex(0); }}>{sheets.map((item, index) => <option key={item.name} value={index}>{item.name}</option>)}</select></label>
        {sheets.length > 1 && <p className="text-xs">Several worksheets match. Check the selected worksheet before continuing.</p>}
        {kind === 'equipment' && <p className="text-sm font-semibold">All {sheet.records.length} equipment rows will open for review and saving together.</p>}
        {kind !== 'equipment' && sheet.records.length > 1 && <label className="block text-sm">Record to open<select className="mt-1 block w-full rounded-lg border bg-background p-2" value={rowIndex} onChange={(event) => setRowIndex(Number(event.target.value))}>{sheet.records.map((item, index) => <option key={index} value={index}>{index + 1}. {item.equipment || item.equipment_area || item.pm_control?.equipment || item.report_number || item.prepared_by_name || 'Record'}</option>)}</select><span className="text-xs text-muted-foreground">Only this record will be opened.</span></label>}
        <dl className="grid gap-3 text-sm sm:grid-cols-2">{Object.entries(selected).map(([key, value]) => <div key={key}><dt className="font-semibold capitalize">{key.replaceAll('_', ' ')}</dt><dd className="whitespace-pre-wrap break-words text-muted-foreground">{Array.isArray(value) ? `${value.length} rows` : value && typeof value === 'object' ? Object.entries(value).map(([label, text]) => `${label.replaceAll('_', ' ')}: ${typeof text === 'object' ? JSON.stringify(text) : text}`).join('\n') : String(value)}</dd></div>)}</dl>
        <p className="text-xs text-muted-foreground">On save, we attach the unchanged original file and, for Excel, a CSV copy of this worksheet. CSV copies contain cell values; the original preserves formatting and formulas.</p>
        <button type="button" className="text-xs underline" onClick={() => { setFile(null); setSheets([]); setError(''); }}>Remove file and enter manually</button>
      </section>}
    </div>
  </Modal>;
}
