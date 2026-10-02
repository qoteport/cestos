'use client';

import { useMemo, useState } from 'react';
import { apiFetch } from '@/lib/api';
import type { ComponentProps } from 'react';
import MaintenanceImportGate, { type SaveImportFiles } from './MaintenanceImportGate';
import { Modal, Row } from './DataUI';
import SearchableSelect from './SearchableSelect';
import AppDateTimePicker from './AppDateTimePicker';
import { Paperclip, X, FileSpreadsheet } from 'lucide-react';

type ReportRow = Record<string, string>;
type ReportData = Record<string, any>;
type Column = { key: string; label: string; wide?: boolean; asset?: boolean };

function parseCsvToRows(text: string): string[][] {
  const lines: string[][] = [];
  let cur: string[] = [];
  let field = '';
  let inQuotes = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    const next = text[i + 1];
    if (inQuotes) {
      if (c === '"' && next === '"') { field += '"'; i++; }
      else if (c === '"') { inQuotes = false; }
      else { field += c; }
    } else {
      if (c === '"') { inQuotes = true; }
      else if (c === ',' || c === '\t' || c === ';') { cur.push(field.trim()); field = ''; }
      else if (c === '\r') { /* ignore */ }
      else if (c === '\n') { cur.push(field.trim()); lines.push(cur); cur = []; field = ''; }
      else { field += c; }
    }
  }
  if (field || cur.length > 0) { cur.push(field.trim()); lines.push(cur); }
  return lines.filter((row) => row.some((cell) => cell.length > 0));
}

const blankRow = (columns: Column[]): ReportRow => Object.fromEntries(columns.map(({ key }) => [key, '']));
const sectionDefinitions: Record<string, { title: string; columns: Column[] }> = {
  equipment_fleet: { title: 'Equipment fleet', columns: [
    { key: 'equipment', label: 'Equipment', asset: true },
    { key: 'quantity', label: 'Quantity' },
    { key: 'maintenance_focus', label: 'Maintenance focus', wide: true },
    { key: 'current_approach', label: 'Current approach', wide: true },
  ] },
  maintenance_assessment: { title: 'Maintenance assessment & corrective action', columns: [
    { key: 'area_equipment', label: 'Area / equipment', asset: true },
    { key: 'observation_failure', label: 'Observation / failure', wide: true },
    { key: 'action_taken_response', label: 'Action taken / response', wide: true },
    { key: 'current_status', label: 'Current status' },
  ] },
  preventive_improvements: { title: 'Preventive maintenance improvement', columns: [
    { key: 'pm_control', label: 'PM control' }, { key: 'purpose', label: 'Purpose', wide: true }, { key: 'status', label: 'Status' },
  ] },
  spare_parts_actions: { title: 'Spare parts & materials', columns: [
    { key: 'action', label: 'Action', wide: true }, { key: 'purpose', label: 'Purpose', wide: true }, { key: 'priority', label: 'Priority' }, { key: 'status', label: 'Status' },
  ] },
  manpower_requirements: { title: 'Manpower requirement', columns: [] },
  control_documents: { title: 'Maintenance control & documentation', columns: [
    { key: 'control_document', label: 'Control document' }, { key: 'purpose', label: 'Purpose', wide: true }, { key: 'implementation', label: 'Implementation' },
  ] },
  action_plan: { title: 'Initial action plan', columns: [
    { key: 'action', label: 'Action', wide: true }, { key: 'priority', label: 'Priority' }, { key: 'target', label: 'Target' }, { key: 'status', label: 'Status' },
  ] },
  maintenance_kpis: { title: 'Maintenance KPIs', columns: [
    { key: 'kpi', label: 'KPI' }, { key: 'purpose', label: 'Purpose', wide: true }, { key: 'frequency', label: 'Frequency' },
  ] },
};

const today = new Date().toISOString().slice(0, 10);
function emptyReport(projectId: string): ReportData {
  return {
    report_number: '', project_id: projectId || '', site_location_id: '', reporting_period_start: today,
    reporting_period_end: today, report_date: today, prepared_by_employee_id: '', prepared_by_name: '',
    prepared_by_position: '', submitted_to: '', status: 'DRAFT', executive_summary: '', conclusion: '',
    ...Object.fromEntries(Object.entries(sectionDefinitions).filter(([key]) => key !== 'manpower_requirements').map(([key, section]) => [key, [blankRow(section.columns)]])),
    manpower_requirements: '',
  };
}

function makeInitial(record: Row | undefined, projectId: string): ReportData {
  const initial = { ...emptyReport(projectId), ...(record || {}) };
  for (const [key, definition] of Object.entries(sectionDefinitions)) {
    if (key === 'manpower_requirements') {
      const value = record?.manpower_requirements;
      initial.manpower_requirements = Array.isArray(value) ? (value[0]?.recommendation || '') : (value || '');
      continue;
    }
    const rows = Array.isArray(record?.[key]) ? record?.[key] : [];
    initial[key] = rows.length ? rows.map((row: Row) => ({ ...row, ...Object.fromEntries(definition.columns.map(({ key: column }) => [column, row?.[column] == null ? '' : String(row[column])])), asset_id: row?.asset_id == null ? '' : String(row.asset_id) })) : [blankRow(definition.columns)];
  }
  return initial;
}

function MaintenanceAssessmentReportWizardForm({ saveImportFiles,
  assets, employees, projects = [], projectId, record, onClose, onSaved, initialMode = 'FREE_FLOW',
}: {
  saveImportFiles?: SaveImportFiles;
  assets: Row[]; employees: Row[]; projects?: Row[]; projectId: string; record?: Row;
  onClose: () => void; onSaved: (recordId?: string) => void;
  initialMode?: 'ASSISTED' | 'FREE_FLOW';
}) {
  const [data, setData] = useState<ReportData>(() => makeInitial(record, projectId));
  const [step, setStep] = useState(0);
  const [mode, setMode] = useState<'ASSISTED' | 'FREE_FLOW'>(initialMode);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [pendingFiles, setPendingFiles] = useState<File[]>([]);
  const [createdRecordId, setCreatedRecordId] = useState<string | null>(null);
  const [customProject, setCustomProject] = useState(Boolean(record?.project_name_custom));
  const [customPreparer, setCustomPreparer] = useState(Boolean(record?.prepared_by_name && !record?.prepared_by_employee_id));

  const assetOptions = useMemo(() => assets.map((asset) => ({
    value: String(asset.id),
    label: asset.name || asset.asset_name || asset.asset_number || 'Equipment',
    sublabel: [asset.asset_number, asset.make, asset.model].filter(Boolean).join(' Â· '),
  })), [assets]);
  const employeeOptions = employees.map((employee) => ({
    value: String(employee.id),
    label: [employee.first_name, employee.last_name].filter(Boolean).join(' ') || employee.name || 'Employee',
    sublabel: employee.position_name || employee.job_title || employee.employee_number || '',
  }));
  const projectOptions = [{ value: '__CUSTOM__', label: 'Enter a custom project nameâ€¦' }, ...projects.map((project) => ({ value: String(project.id), label: project.name || project.project_name || project.project_number }))];
  const preparerOptions = [{ value: '__CUSTOM__', label: 'Enter a custom preparerâ€¦' }, ...employeeOptions];
  const sectionHeadingClass = mode === 'FREE_FLOW'
    ? 'bg-[#184877] px-2 py-1 text-center text-[11px] font-bold text-white'
    : 'border-b pb-2 text-sm font-bold';

  const patch = (key: string, value: any) => setData((old) => ({ ...old, [key]: value }));
  const patchRow = (section: string, index: number, key: string, value: string) => setData((old) => ({
    ...old, [section]: old[section].map((row: ReportRow, rowIndex: number) => rowIndex === index ? { ...row, [key]: value } : row),
  }));
  const addRow = (section: string) => setData((old) => ({ ...old, [section]: [...old[section], blankRow(sectionDefinitions[section].columns)] }));
  const removeRow = (section: string, index: number) => setData((old) => ({
    ...old, [section]: old[section].length <= 1 ? [blankRow(sectionDefinitions[section].columns)] : old[section].filter((_: ReportRow, rowIndex: number) => rowIndex !== index),
  }));

  const equipmentIds = [...new Set(Object.values(sectionDefinitions).flatMap((section, index) => {
    const key = Object.keys(sectionDefinitions)[index];
    return key === 'equipment_fleet' || key === 'maintenance_assessment' ? (data[key] || []).map((row: ReportRow) => row.asset_id).filter((id: string) => id && id !== '__CUSTOM__') : [];
  }))];

  const [parseNotice, setParseNotice] = useState<string | null>(null);

  const handleSpreadsheetAutoFill = async (file: File) => {
    try {
      const text = await file.text();
      const rows = parseCsvToRows(text);
      if (rows.length < 2) return;
      const headers = rows[0].map((h) => h.toLowerCase());
      const dataRows = rows.slice(1);

      let filledCount = 0;
      const newData = { ...data };

      // Try matching equipment fleet columns
      if (headers.some((h) => h.includes('equipment') || h.includes('machine') || h.includes('focus') || h.includes('approach'))) {
        const parsedFleet: ReportRow[] = [];
        dataRows.forEach((r) => {
          const eqCol = r[headers.findIndex((h) => h.includes('equipment') || h.includes('asset') || h.includes('machine'))] || '';
          const qtyCol = r[headers.findIndex((h) => h.includes('qty') || h.includes('quantity'))] || '1';
          const focusCol = r[headers.findIndex((h) => h.includes('focus') || h.includes('maint'))] || '';
          const approachCol = r[headers.findIndex((h) => h.includes('approach') || h.includes('current'))] || '';
          if (eqCol || focusCol || approachCol) {
            const matchedAsset = assets.find((a) => (a.name || a.asset_name || a.asset_number || '').toLowerCase() === eqCol.toLowerCase());
            parsedFleet.push({
              equipment: eqCol,
              asset_id: matchedAsset ? String(matchedAsset.id) : '',
              quantity: qtyCol,
              maintenance_focus: focusCol,
              current_approach: approachCol,
            });
          }
        });
        if (parsedFleet.length > 0) {
          newData.equipment_fleet = parsedFleet;
          filledCount += parsedFleet.length;
        }
      }

      // Try matching maintenance assessment columns
      if (headers.some((h) => h.includes('observation') || h.includes('failure') || h.includes('action') || h.includes('status'))) {
        const parsedAssessment: ReportRow[] = [];
        dataRows.forEach((r) => {
          const areaCol = r[headers.findIndex((h) => h.includes('area') || h.includes('equipment') || h.includes('asset'))] || '';
          const obsCol = r[headers.findIndex((h) => h.includes('obs') || h.includes('failure') || h.includes('issue'))] || '';
          const actCol = r[headers.findIndex((h) => h.includes('action') || h.includes('response') || h.includes('repair'))] || '';
          const stCol = r[headers.findIndex((h) => h.includes('status'))] || 'OPEN';
          if (areaCol || obsCol || actCol) {
            const matchedAsset = assets.find((a) => (a.name || a.asset_name || a.asset_number || '').toLowerCase() === areaCol.toLowerCase());
            parsedAssessment.push({
              area_equipment: areaCol,
              asset_id: matchedAsset ? String(matchedAsset.id) : '',
              observation_failure: obsCol,
              action_taken_response: actCol,
              current_status: stCol.toUpperCase().replace(/\s+/g, '_'),
            });
          }
        });
        if (parsedAssessment.length > 0) {
          newData.maintenance_assessment = parsedAssessment;
          filledCount += parsedAssessment.length;
        }
      }

      if (filledCount > 0) {
        setData(newData);
        setParseNotice(`Parsed ${file.name}: Automatically populated ${filledCount} row(s) into report sections.`);
      }
    } catch {
      /* ignore file read error */
    }
  };

  const controls = <div className="space-y-4">
    {mode === 'ASSISTED' && <h3 className={sectionHeadingClass}>Report control</h3>}
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
      <label className="space-y-1"><span className="block font-medium">Reporting period start *</span><AppDateTimePicker mode="date" required value={data.reporting_period_start} onChange={(val) => patch('reporting_period_start', val)} /></label>
      <label className="space-y-1"><span className="block font-medium">Reporting period end *</span><AppDateTimePicker mode="date" required value={data.reporting_period_end} onChange={(val) => patch('reporting_period_end', val)} /></label>
      <label className="space-y-1"><span className="block font-medium">Report date *</span><AppDateTimePicker mode="date" required value={data.report_date} onChange={(val) => patch('report_date', val)} /></label>
      <label className="space-y-1"><span className="block font-medium">Project</span>{customProject ? <div className="space-y-1"><input autoFocus className="input-field" value={data.project_name_custom || ''} onChange={(e) => patch('project_name_custom', e.target.value)} placeholder="Enter a custom project name" maxLength={200} /><button type="button" className="text-primary underline" onClick={() => { setCustomProject(false); patch('project_name_custom', null); }}>Choose a registered project</button></div> : <SearchableSelect options={projectOptions} value={data.project_id} onChange={(value) => { if (value === '__CUSTOM__') { setCustomProject(true); patch('project_name_custom', ''); return; } setCustomProject(false); patch('project_name_custom', null); patch('project_id', value); }} placeholder="Search projects" />}</label>
      <label className="space-y-1"><span className="block font-medium">Prepared by *</span>{customPreparer ? <div className="space-y-1"><input autoFocus className="input-field" value={data.prepared_by_name || ''} onChange={(e) => patch('prepared_by_name', e.target.value)} placeholder="Enter preparer name" required maxLength={200} /><button type="button" className="text-primary underline" onClick={() => { setCustomPreparer(false); patch('prepared_by_name', ''); }}>Choose an employee</button></div> : <SearchableSelect options={preparerOptions} value={data.prepared_by_employee_id} onChange={(value, option) => { if (value === '__CUSTOM__') { setCustomPreparer(true); patch('prepared_by_employee_id', null); patch('prepared_by_name', ''); return; } setCustomPreparer(false); patch('prepared_by_employee_id', value); if (option) { const employee = employees.find((row) => String(row.id) === String(value)); const name = [employee?.first_name, employee?.last_name].filter(Boolean).join(' ') || employee?.name || option.label; patch('prepared_by_name', name); patch('prepared_by_position', employee?.position_name || employee?.job_title || data.prepared_by_position); } }} placeholder="Search employees or enter custom" />}</label>
      <label className="space-y-1"><span className="block font-medium">Position</span><input className="input-field" value={data.prepared_by_position || ''} onChange={(e) => patch('prepared_by_position', e.target.value)} maxLength={150} /></label>
      <label className="space-y-1"><span className="block font-medium">Submitted to</span><input className="input-field" value={data.submitted_to || ''} onChange={(e) => patch('submitted_to', e.target.value)} maxLength={200} /></label>
    </div>
    {mode === 'ASSISTED' && <section className="space-y-2 border border-border rounded-md p-3">
      <label className="block space-y-1 font-medium"><span className="flex items-center gap-2"><Paperclip size={14} /> Attach supporting files (.csv, .xlsx, .pdf, images)</span><input type="file" multiple accept="image/*,application/pdf,.doc,.docx,.xls,.xlsx,.csv,.tsv" onChange={(event) => {
        const added = Array.from(event.target.files || []);
        setPendingFiles((files) => [...files, ...added]);
        added.forEach((f) => {
          if (f.name.endsWith('.csv') || f.name.endsWith('.tsv') || f.name.endsWith('.txt')) {
            void handleSpreadsheetAutoFill(f);
          }
        });
      }} className="block w-full rounded-lg border bg-background p-2" /></label>
      {parseNotice && (
        <div className="flex items-center justify-between p-2 rounded bg-emerald-50 text-emerald-800 border border-emerald-200 text-xs">
          <span className="flex items-center gap-1.5"><FileSpreadsheet size={14} /> {parseNotice}</span>
          <button type="button" onClick={() => setParseNotice(null)} className="text-emerald-900 font-bold hover:underline">Dismiss</button>
        </div>
      )}
      {pendingFiles.length > 0 && <ul className="space-y-1">{pendingFiles.map((file, index) => <li key={`${file.name}-${file.size}-${index}`} className="flex items-center justify-between gap-2 rounded border bg-muted/30 px-2 py-1"><span className="truncate flex items-center gap-1.5">{file.name.match(/\.(csv|tsv|xlsx|xls)$/i) && <FileSpreadsheet size={13} className="text-emerald-600" />}{file.name}</span><button type="button" aria-label={`Remove ${file.name}`} onClick={() => setPendingFiles((files) => files.filter((_, fileIndex) => fileIndex !== index))} className="text-red-700"><X size={14} /></button></li>)}</ul>}
      <p className="text-[11px] text-muted-foreground">Existing attachments are kept when editing. Tabular spreadsheet files (.csv, .tsv) uploaded here will automatically parse and auto-fill report sections.</p>
    </section>}
  </div>;

  const textBlock = (key: string, label: string, required = false) => <label className="block space-y-1" key={key}><span className="block font-medium">{label}{required ? ' *' : ''}</span><textarea className="input-field min-h-32 resize-y" value={data[key] || ''} onChange={(e) => patch(key, e.target.value)} maxLength={20000} /></label>;

  const tableSection = (sectionKey: string) => {
    const definition = sectionDefinitions[sectionKey];
    if (sectionKey === 'manpower_requirements') return <section key={sectionKey} className="space-y-2"><h3 className={sectionHeadingClass}>{definition.title}</h3><textarea className={`input-field min-h-32 w-full resize-y ${mode === 'FREE_FLOW' ? 'rounded-none' : ''}`} aria-label={definition.title} value={data.manpower_requirements || ''} onChange={(event) => patch('manpower_requirements', event.target.value)} maxLength={20000} /></section>;
    return <div className="space-y-3" key={sectionKey}>
      <div className={`flex items-center justify-between gap-2 ${sectionHeadingClass}`}><h3 className="text-sm font-bold">{definition.title}</h3><button type="button" className={`btn-secondary text-xs rounded-none ${mode === 'FREE_FLOW' ? 'border-slate-400' : ''}`} onClick={() => addRow(sectionKey)}>+ Add row</button></div>
      {(data[sectionKey] || []).map((row: ReportRow, index: number) => {
        // Order columns for Maintenance Assessment & Corrective Action so status dropdown comes before text inputs
        let columnsToRender = definition.columns;
        if (sectionKey === 'maintenance_assessment') {
          const areaCol = definition.columns.find((c) => c.key === 'area_equipment');
          const statusCol = definition.columns.find((c) => c.key === 'current_status');
          const obsCol = definition.columns.find((c) => c.key === 'observation_failure');
          const actCol = definition.columns.find((c) => c.key === 'action_taken_response');
          columnsToRender = [areaCol, statusCol, obsCol, actCol].filter((c): c is Column => Boolean(c));
        }

        const gridColsClass = sectionKey === 'equipment_fleet'
          ? 'grid gap-3 border border-border bg-muted/10 p-3 grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 ' + (mode === 'FREE_FLOW' ? 'rounded-none' : 'rounded-lg')
          : sectionKey === 'maintenance_assessment'
          ? 'grid gap-3 border border-border bg-muted/10 p-3 grid-cols-1 md:grid-cols-2 ' + (mode === 'FREE_FLOW' ? 'rounded-none' : 'rounded-lg')
          : 'grid gap-3 border border-border bg-muted/10 p-3 sm:grid-cols-2 lg:grid-cols-3 ' + (mode === 'FREE_FLOW' ? 'rounded-none' : 'rounded-lg');

        return (
          <div key={`${sectionKey}-${index}`} className={gridColsClass}>
            {columnsToRender.map((column) => {
              if (column.asset) {
                const showCustom = row.asset_id === '__CUSTOM__' || (!row.asset_id && Boolean(row[column.key]));
                const colSpanClass = sectionKey === 'equipment_fleet' ? 'space-y-1 col-span-1 sm:col-span-2 lg:col-span-2' : sectionKey === 'maintenance_assessment' ? 'space-y-1 md:col-span-1' : 'space-y-1';
                return <div className={colSpanClass} key={column.key}>
                  <span className="block font-medium">{column.label}</span>
                  {showCustom ? <div className="space-y-1">
                    <input autoFocus className={`input-field ${mode === 'FREE_FLOW' ? 'rounded-none' : ''}`} value={row[column.key] || ''} onChange={(event) => patchRow(sectionKey, index, column.key, event.target.value)} placeholder={`Enter custom ${column.label.toLowerCase()}`} />
                    <button type="button" className="text-primary underline" onClick={() => { patchRow(sectionKey, index, 'asset_id', ''); patchRow(sectionKey, index, column.key, ''); }}>Choose registered equipment</button>
                  </div> : <SearchableSelect
                    className={mode === 'FREE_FLOW' ? 'rounded-none' : ''}
                    options={[{ value: '__CUSTOM__', label: `Enter custom ${column.label.toLowerCase()}â€¦` }, ...assetOptions]}
                    value={row.asset_id || ''}
                    onChange={(value) => {
                      if (value === '__CUSTOM__') { patchRow(sectionKey, index, 'asset_id', '__CUSTOM__'); patchRow(sectionKey, index, column.key, ''); return; }
                      const asset = assets.find((item) => String(item.id) === String(value));
                      patchRow(sectionKey, index, 'asset_id', value);
                      patchRow(sectionKey, index, column.key, asset?.name || asset?.asset_name || asset?.asset_number || '');
                    }}
                    placeholder={`Search ${column.label.toLowerCase()} or enter custom`}
                  />}
                </div>;
              }

              let colSpanClass = 'space-y-1';
              if (sectionKey === 'equipment_fleet') {
                if (column.key === 'quantity') colSpanClass = 'space-y-1 col-span-1 sm:col-span-1 lg:col-span-1';
                else if (column.key === 'maintenance_focus') colSpanClass = 'space-y-1 col-span-1 sm:col-span-1 lg:col-span-2';
                else if (column.key === 'current_approach') colSpanClass = 'space-y-1 col-span-1 sm:col-span-2 lg:col-span-1';
              } else if (sectionKey === 'maintenance_assessment') {
                if (column.key === 'current_status') colSpanClass = 'space-y-1 md:col-span-1';
                else if (column.wide || column.key === 'observation_failure' || column.key === 'action_taken_response') colSpanClass = 'space-y-1 md:col-span-2';
              } else if (column.wide) {
                colSpanClass = 'space-y-1 sm:col-span-2';
              }

              return <label className={colSpanClass} key={column.key}>
                <span className="block font-medium">{column.label}</span>
                {column.key === 'priority' ? (
                  <SearchableSelect
                    className={mode === 'FREE_FLOW' ? 'rounded-none' : ''}
                    options={[
                      { value: 'LOW', label: 'LOW' },
                      { value: 'MEDIUM', label: 'MEDIUM' },
                      { value: 'HIGH', label: 'HIGH' },
                      { value: 'CRITICAL', label: 'CRITICAL' },
                      ...(row[column.key] && !['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'].includes(String(row[column.key]).toUpperCase()) ? [{ value: String(row[column.key]), label: String(row[column.key]) }] : []),
                    ]}
                    value={row[column.key] || ''}
                    onChange={(val) => patchRow(sectionKey, index, column.key, val)}
                    placeholder="Select priority"
                  />
                ) : column.key === 'status' || column.key === 'current_status' ? (
                  <SearchableSelect
                    className={mode === 'FREE_FLOW' ? 'rounded-none' : ''}
                    options={[
                      { value: 'OPEN', label: 'OPEN' },
                      { value: 'IN_PROGRESS', label: 'IN PROGRESS' },
                      { value: 'COMPLETED', label: 'COMPLETED' },
                      { value: 'ON_HOLD', label: 'ON HOLD' },
                      { value: 'MONITORING', label: 'MONITORING' },
                      { value: 'CANCELLED', label: 'CANCELLED' },
                      ...(row[column.key] && !['OPEN', 'IN_PROGRESS', 'COMPLETED', 'ON_HOLD', 'MONITORING', 'CANCELLED'].includes(String(row[column.key]).toUpperCase().replace(/\s+/g, '_')) ? [{ value: String(row[column.key]), label: String(row[column.key]) }] : []),
                    ]}
                    value={row[column.key] || ''}
                    onChange={(val) => patchRow(sectionKey, index, column.key, val)}
                    placeholder="Select status"
                  />
                ) : ['observation_failure', 'action_taken_response', 'maintenance_focus', 'current_approach', 'purpose', 'justification'].includes(column.key)
                  ? <textarea className={`input-field min-h-20 resize-y ${mode === 'FREE_FLOW' ? 'rounded-none' : ''}`} value={row[column.key] || ''} onChange={(event) => patchRow(sectionKey, index, column.key, event.target.value)} />
                  : <input className={`input-field ${mode === 'FREE_FLOW' ? 'rounded-none' : ''}`} value={row[column.key] || ''} onChange={(event) => patchRow(sectionKey, index, column.key, event.target.value)} />}
              </label>;
            })}
            <div className="flex items-end justify-end sm:col-span-2 lg:col-span-6"><button type="button" className="text-xs font-semibold text-red-700" onClick={() => removeRow(sectionKey, index)} disabled={data[sectionKey].length <= 1}>Remove row</button></div>
          </div>
        );
      })}
    </div>;
  };

  const steps = [
    { title: '', body: <>{controls}</> },
    { title: 'Executive Summary & Equipment', body: <div className="space-y-6">{textBlock('executive_summary', 'Executive summary')}{tableSection('equipment_fleet')}</div> },
    { title: 'Maintenance Assessment', body: tableSection('maintenance_assessment') },
    { title: 'Preventive Maintenance Improvement', body: tableSection('preventive_improvements') },
    { title: 'Parts & Manpower', body: <div className="space-y-6">{tableSection('spare_parts_actions')}{tableSection('manpower_requirements')}</div> },
    { title: 'Controls & Action Plan', body: <div className="space-y-6">{tableSection('control_documents')}{tableSection('action_plan')}</div> },
    { title: 'KPIs & Conclusion', body: <div className="space-y-6">{tableSection('maintenance_kpis')}{textBlock('conclusion', 'Conclusion')}</div> },
  ];

  async function save() {
    if (!String(data.prepared_by_name || '').trim()) { setError('Enter the report preparer name.'); setStep(0); return; }
    if (data.reporting_period_end < data.reporting_period_start) { setError('The reporting period end date must be on or after the start date.'); setStep(0); return; }
    setSaving(true); setError('');
    let reportWasSaved = false;
    try {
      const payload = { ...data, project_id: data.project_id || null, site_location_id: data.site_location_id || null, prepared_by_employee_id: data.prepared_by_employee_id || null, equipment_asset_ids: equipmentIds, manpower_requirements: data.manpower_requirements?.trim() ? [{ recommendation: data.manpower_requirements.trim() }] : [], equipment_fleet: (data.equipment_fleet || []).map((row: ReportRow) => ({ ...row, asset_id: row.asset_id === '__CUSTOM__' ? null : row.asset_id })), maintenance_assessment: (data.maintenance_assessment || []).map((row: ReportRow) => ({ ...row, asset_id: row.asset_id === '__CUSTOM__' ? null : row.asset_id })) };
      let reportId = record?.id || createdRecordId;
      if (reportId) { await apiFetch(`/api/v1/maintenance-assessments/${reportId}`, { method: 'PATCH', body: JSON.stringify(payload) }); reportWasSaved = true; }
      else {
        const created = await apiFetch<any>('/api/v1/maintenance-assessments', { method: 'POST', body: JSON.stringify(payload) });
        reportId = created.id;
        reportWasSaved = true;
        setCreatedRecordId(reportId);
      }
      for (const file of pendingFiles) {
        const form = new FormData();
        form.append('file', file);
        form.append('title', file.name);
        form.append('category', 'Equipment');
        form.append('source_type', 'maintenance_assessment');
        form.append('source_id', reportId);
        form.append('visibility', 'PUBLIC');
        await apiFetch('/api/v1/documents', { method: 'POST', body: form });
        setPendingFiles((files) => files.filter((pending) => pending !== file));
      }
      await saveImportFiles?.(reportId);
      onSaved(reportId); onClose();
    } catch (err: any) { setError(`${err?.message || 'Could not save maintenance assessment report.'}${reportWasSaved ? ' The report was saved; retry to upload any remaining attachments.' : ''}`); }
    finally { setSaving(false); }
  }

  const footer = <div className="flex w-full items-center justify-between gap-2">
    {mode === 'ASSISTED' && step > 0 ? <button type="button" className="btn-secondary rounded-xl text-xs" onClick={() => setStep(step - 1)}>Back</button> : <span />}
    <div className="flex items-center gap-2">{mode === 'ASSISTED' && step < steps.length - 1 && <button type="button" className="btn-primary rounded-xl text-xs" onClick={() => setStep(step + 1)}>Next</button>}<button type="button" className="btn-primary rounded-xl text-xs" onClick={() => void save()} disabled={saving}>{saving ? 'Savingâ€¦' : record?.id ? 'Save changes' : 'Save assessment'}</button></div>
  </div>;

  return <Modal title={`${record?.id ? 'Edit' : 'New'} Maintenance Assessment Report`} onClose={onClose} className="sm:!h-[90vh] sm:!max-h-[90vh] sm:!max-w-6xl" footer={footer}>
    <div className="space-y-4 text-xs">
      <div className="flex border-b" role="tablist" aria-label="Maintenance assessment form mode">
        {(['FREE_FLOW', 'ASSISTED'] as const).map((view) => <button type="button" key={view} role="tab" aria-selected={mode === view} onClick={() => setMode(view)} className={`border-b-2 px-4 py-2 font-bold ${mode === view ? 'border-primary text-primary' : 'border-transparent text-muted-foreground'}`}>{view === 'ASSISTED' ? 'Assisted' : 'Free flow'}</button>)}
      </div>
      {error && <div role="alert" className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-red-800">{error}</div>}
      {mode === 'ASSISTED' && <div className="flex flex-wrap gap-1.5">{steps.map((item, index) => <button key={item.title} type="button" onClick={() => setStep(index)} className={`rounded-full border px-2.5 py-1 text-[11px] font-semibold ${step === index ? 'border-blue-800 bg-blue-800 text-white' : 'text-muted-foreground'}`}>{index + 1}. {item.title}</button>)}</div>}
      <div className={`max-h-[64vh] space-y-6 overflow-y-auto p-1 ${mode === 'FREE_FLOW' ? 'bg-slate-100 p-2 sm:p-4' : ''}`}>{mode === 'ASSISTED' ? steps[step].body : steps.map((item) => <section key={item.title} className="space-y-4 bg-white p-3 text-slate-900 shadow sm:p-4 rounded-none [&_input]:rounded-none [&_textarea]:rounded-none [&_div]:rounded-none [&_button]:rounded-none"><h2 className={sectionHeadingClass}>{item.title}</h2>{item.body}</section>)}</div>
    </div>
  </Modal>;
}

export default function MaintenanceAssessmentReportWizard(props: Omit<ComponentProps<typeof MaintenanceAssessmentReportWizardForm>, 'saveImportFiles'>) {
  return <MaintenanceImportGate kind="assessment" record={props.record} assets={props.assets} employees={props.employees} onClose={props.onClose}>{(draft, saveImportFiles) => <MaintenanceAssessmentReportWizardForm {...props} record={draft} saveImportFiles={saveImportFiles} />}</MaintenanceImportGate>;
}
