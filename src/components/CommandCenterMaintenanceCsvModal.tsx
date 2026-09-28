'use client';

import { useEffect, useMemo, useState } from 'react';
import { apiFetch } from '@/lib/api';
import SearchableSelect from './SearchableSelect';
import { X, Upload, Download, FileSpreadsheet, CheckCircle2, Circle, ArrowLeft, ArrowRight, Loader2 } from 'lucide-react';
import BreakdownJobCardWizard from './BreakdownJobCardWizard';
import PreventiveMaintenanceWizard from './PreventiveMaintenanceWizard';
import MaintenanceAssessmentReportWizard from './MaintenanceAssessmentReportWizard';
import ActionTrackerWizard from './ActionTrackerWizard';
import PMTrackerWizard from './PMTrackerWizard';
import EquipmentRegisterWizard from './EquipmentRegisterWizard';

type Kind = 'breakdown' | 'preventive' | 'assessment' | 'action' | 'pm' | 'equipment';
type CsvRecord = Record<string, any>;
type CsvRow = { record: CsvRecord; saved: boolean; sourceLine: number };

const definitions: Record<Kind, { label: string; template: string[] }> = {
  breakdown: { label: 'Breakdown cards', template: ['project_id', 'asset_id', 'job_control.date', 'job_control.equipment', 'job_control.fleet_unit_id', 'job_control.location', 'job_control.hour_km', 'job_control.operator_driver', 'job_control.department', 'job_control.time_reported', 'job_control.time_attended', 'reported_failure', 'corrective_action', 'parts_materials', 'labour_downtime', 'test_release', 'signatures'] },
  preventive: { label: 'Preventive cards', template: ['project_id', 'asset_id', 'job_card_number', 'status', 'pm_control.date', 'pm_control.pm_interval', 'pm_control.equipment', 'pm_control.fleet_unit_id', 'pm_control.location', 'pm_control.hour_meter_km', 'pm_control.technician_team', 'pm_control.work_order_no', 'pm_control.start_time', 'pm_control.finish_time', 'inspection_items', 'service_defect_control', 'machine_release', 'technicians', 'signatures', 'supervisor_comments'] },
  assessment: { label: 'Assessments', template: ['report_number', 'project_id', 'site_location_id', 'project_name_custom', 'reporting_period_start', 'reporting_period_end', 'report_date', 'prepared_by_name', 'prepared_by_position', 'submitted_to', 'status', 'equipment_asset_ids', 'equipment_fleet', 'maintenance_assessment', 'preventive_improvements', 'spare_parts_actions', 'manpower_requirements', 'control_documents', 'action_plan', 'maintenance_kpis', 'conclusion'] },
  action: { label: 'Action tracker', template: ['Date', 'Equipment / Area', 'Issue / Finding', 'Action Taken', 'Parts Required', 'Responsible', 'Priority', 'Status', 'Completion Date', 'Remarks'] },
  pm: { label: 'PM tracker', template: ['Equipment', 'Service Type', 'Due Date', 'Planned/Actual', 'PM Completed', 'Defects Found', 'Parts Required', 'Technician', 'Remarks'] },
  equipment: { label: 'Equipment register', template: ['Equipment', 'Unit No.', 'Type', 'Status', 'Open Defects', 'Action Required', 'Priority', 'Remarks'] },
};

function parseCsv(text: string): string[][] {
  const rows: string[][] = []; let row: string[] = []; let value = ''; let quoted = false;
  for (let i = 0; i < text.length; i += 1) {
    const c = text[i];
    if (quoted) {
      if (c === '"' && text[i + 1] === '"') { value += '"'; i += 1; }
      else if (c === '"') quoted = false;
      else value += c;
    } else if (c === '"') quoted = true;
    else if (c === ',') { row.push(value.trim()); value = ''; }
    else if (c === '\n') { row.push(value.trim()); if (row.some((cell) => cell)) rows.push(row); row = []; value = ''; }
    else if (c !== '\r') value += c;
  }
  row.push(value.trim()); if (row.some((cell) => cell)) rows.push(row);
  return rows;
}

function cellValue(raw: string): any {
  const value = raw.trim(); if (!value) return '';
  if (value[0] === '[' || value[0] === '{') { try { return JSON.parse(value); } catch { return value; } }
  if (/^(true|false)$/i.test(value)) return value.toLowerCase() === 'true';
  return value;
}

function setPath(target: CsvRecord, path: string, value: any) {
  const parts = path.split('.').map((part) => part.trim()).filter(Boolean); if (!parts.length) return;
  let cursor = target;
  for (const part of parts.slice(0, -1)) { if (!cursor[part] || typeof cursor[part] !== 'object' || Array.isArray(cursor[part])) cursor[part] = {}; cursor = cursor[part]; }
  cursor[parts[parts.length - 1]] = value;
}

function escapeCsv(value: string) { return `"${value.replaceAll('"', '""')}"`; }

function normalizedLabel(value: string) { return value.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim(); }

function reportDate(value: string): string {
  const match = value.trim().match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{4})$/);
  if (!match) return '';
  const [, day, month, year] = match;
  return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
}

function matchRegisteredAsset(name: string, assets: any[]) {
  const normalized = normalizedLabel(name);
  if (!normalized) return undefined;
  const candidates = assets.map((item) => ({
    item,
    label: normalizedLabel(item.name || item.asset_name || item.asset_number || ''),
  })).filter((candidate) => candidate.label);
  const exact = candidates.find((candidate) => candidate.label === normalized);
  if (exact) return exact.item;
  const partial = candidates.filter(({ label }) => normalized.startsWith(`${label} `) || label.startsWith(`${normalized} `));
  return partial.length === 1 ? partial[0].item : undefined;
}

function assessmentCsvRecord(matrix: string[][], fallbackProjectId: string, assets: any[]): CsvRecord | null {
  const reportLayout = matrix.some((row) => row.some((cell) => /two.week maintenance assessment/i.test(cell)))
    || matrix.some((row) => row.some((cell) => normalizedLabel(cell).startsWith('reporting period')))
      && matrix.some((row) => row.some((cell) => /^\s*\d+\.\s*equipment fleet/i.test(cell)));
  if (!reportLayout) return null;

  const record: CsvRecord = {
    project_id: fallbackProjectId || '', status: 'DRAFT',
    equipment_fleet: [], maintenance_assessment: [], preventive_improvements: [], spare_parts_actions: [],
    manpower_requirements: '', control_documents: [], action_plan: [], maintenance_kpis: [],
  };
  const metadata = new Map<string, string>();
  for (const row of matrix) {
    const key = normalizedLabel(row[0] || '');
    if (key && row[1]) metadata.set(key, row[1].trim());
  }
  const periodValue = metadata.get('reporting period') || '';
  const dates = periodValue.split(/\s*(?:–|—|\bto\b)\s*/i).map(reportDate).filter(Boolean);
  if (dates[0]) record.reporting_period_start = dates[0];
  if (dates[1]) record.reporting_period_end = dates[1];
  record.report_date = reportDate(metadata.get('date') || '') || record.reporting_period_end || '';
  record.prepared_by_name = metadata.get('prepared by') || '';
  record.prepared_by_position = metadata.get('position') || '';
  record.submitted_to = metadata.get('submitted to') || '';

  const sectionMap: Record<string, { key: string; columns: string[] }> = {
    'equipment fleet': { key: 'equipment_fleet', columns: ['equipment', 'quantity', 'maintenance_focus', 'current_approach'] },
    'maintenance assessment corrective action': { key: 'maintenance_assessment', columns: ['area_equipment', 'observation_failure', 'action_taken_response', 'current_status'] },
    'preventive maintenance improvement': { key: 'preventive_improvements', columns: ['pm_control', 'purpose', 'status'] },
    'spare parts materials': { key: 'spare_parts_actions', columns: ['action', 'purpose', 'priority', 'status'] },
    'maintenance control documentation': { key: 'control_documents', columns: ['control_document', 'purpose', 'implementation'] },
    'initial 30 day action plan': { key: 'action_plan', columns: ['action', 'priority', 'target', 'status'] },
    'maintenance kpis': { key: 'maintenance_kpis', columns: ['kpi', 'purpose', 'frequency'] },
  };
  const headingPattern = /^\s*\d+\.\s*(.*?)\s*$/;
  for (let index = 0; index < matrix.length; index += 1) {
    const headingCell = matrix[index].find((cell) => headingPattern.test(cell));
    if (!headingCell) continue;
    const heading = normalizedLabel(headingCell.replace(headingPattern, '$1'));
    if (heading === 'executive summary') {
      record.executive_summary = matrix.slice(index + 1).find((row) => row[0]?.trim())?.[0]?.trim() || '';
      continue;
    }
    if (heading === 'manpower requirement') {
      record.manpower_requirements = matrix.slice(index + 1).find((row) => row[0]?.trim())?.[0]?.trim() || '';
      continue;
    }
    if (heading === 'conclusion') {
      record.conclusion = matrix.slice(index + 1).find((row) => row[0]?.trim())?.[0]?.trim() || '';
      continue;
    }
    const section = sectionMap[heading];
    if (!section) continue;
    let headerIndex = index + 1;
    while (headerIndex < matrix.length && !matrix[headerIndex].some((cell) => cell.trim())) headerIndex += 1;
    const headers = (matrix[headerIndex] || []).map(normalizedLabel);
    const fieldIndexes = section.columns.map((field) => {
      const label = normalizedLabel(field.replaceAll('_', ' '));
      return headers.findIndex((header) => header === label);
    });
    const entries: CsvRecord[] = [];
    for (let rowIndex = headerIndex + 1; rowIndex < matrix.length; rowIndex += 1) {
      if (matrix[rowIndex].some((cell) => headingPattern.test(cell))) break;
      const values = matrix[rowIndex];
      if (!values.some((cell) => cell.trim())) continue;
      const entry: CsvRecord = {};
      section.columns.forEach((field, fieldIndex) => {
        const columnIndex = fieldIndexes[fieldIndex];
        if (columnIndex >= 0 && values[columnIndex]?.trim()) entry[field] = values[columnIndex].trim();
      });
      if (!Object.values(entry).some(Boolean)) continue;
      if (section.key === 'equipment_fleet') {
        const asset = matchRegisteredAsset(entry.equipment || '', assets);
        entry.asset_id = asset ? String(asset.id) : '';
      }
      if (section.key === 'maintenance_assessment') {
        const asset = matchRegisteredAsset(entry.area_equipment || '', assets);
        entry.asset_id = asset ? String(asset.id) : '';
      }
      entries.push(entry);
    }
    record[section.key] = entries;
  }
  return record;
}

function equipmentRegisterCsvRecords(matrix: string[][], fallbackProjectId: string): CsvRow[] | null {
  const headerIndex = matrix.findIndex((row) => {
    const headers = row.map(normalizedLabel);
    return headers.includes('equipment') && (headers.includes('unit no') || headers.includes('type') || headers.includes('open defects'));
  });
  if (headerIndex < 0) return null;
  const aliases: Record<string, string> = {
    equipment: 'equipment', asset: 'equipment', 'unit no': 'unit_number', 'unit number': 'unit_number', 'unit no.': 'unit_number',
    type: 'equipment_type', 'equipment type': 'equipment_type', status: 'status', 'open defects': 'open_defects',
    'action required': 'action_required', priority: 'priority', remarks: 'remarks',
  };
  const headers = matrix[headerIndex].map(normalizedLabel);
  if (!headers.some((header) => aliases[header] === 'equipment')) return null;
  return matrix.slice(headerIndex + 1).flatMap((values) => {
    const record: CsvRecord = { project_id: fallbackProjectId || '' };
    headers.forEach((header, columnIndex) => {
      const key = aliases[header];
      const value = values[columnIndex]?.trim();
      if (key && value) record[key] = value;
    });
    return String(record.equipment || '').trim() ? [{ record, saved: false }] : [];
  }).map((row, index) => ({ ...row, sourceLine: headerIndex + index + 2 }));
}

function trackerDate(value: string): string {
  const text = value.trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(text)) return text;
  const match = text.match(/^(\d{1,2})[/.\-](\d{1,2})[/.\-](\d{4})$/);
  if (!match) return text;
  const [, day, month, year] = match;
  return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
}

function actionTrackerCsvRecords(matrix: string[][], fallbackProjectId: string): CsvRow[] | null {
  const headerIndex = matrix.findIndex((row) => {
    const headers = row.map(normalizedLabel);
    return headers.includes('equipment area') && headers.includes('issue finding') && headers.includes('action taken');
  });
  if (headerIndex < 0) return null;
  const aliases: Record<string, string> = {
    date: 'action_date', 'action date': 'action_date', 'equipment area': 'equipment_area', equipment: 'equipment_area', area: 'equipment_area',
    'issue finding': 'issue_finding', issue: 'issue_finding', finding: 'issue_finding', 'action taken': 'action_taken',
    'parts required': 'parts_required', parts: 'parts_required', responsible: 'responsible_name', 'responsible person': 'responsible_name',
    priority: 'priority', status: 'status', 'completion date': 'completion_date', completion: 'completion_date', remarks: 'remarks',
  };
  const headers = matrix[headerIndex].map(normalizedLabel);
  return matrix.slice(headerIndex + 1).flatMap((values) => {
    const record: CsvRecord = { project_id: fallbackProjectId || '' };
    headers.forEach((header, columnIndex) => {
      const key = aliases[header];
      const value = values[columnIndex]?.trim();
      if (!key || !value) return;
      record[key] = key === 'action_date' || key === 'completion_date' ? trackerDate(value) : value;
    });
    return String(record.equipment_area || '').trim() || String(record.issue_finding || '').trim()
      ? [{ record, saved: false, sourceLine: 0 }]
      : [];
  }).map((row, index) => ({ ...row, sourceLine: headerIndex + index + 2 }));
}

function pmTrackerCsvRecords(matrix: string[][], fallbackProjectId: string): CsvRow[] | null {
  const headerIndex = matrix.findIndex((row) => {
    const headers = row.map(normalizedLabel);
    return headers.includes('equipment') && headers.includes('service type') && headers.includes('due date');
  });
  if (headerIndex < 0) return null;
  const aliases: Record<string, string> = {
    equipment: 'equipment', asset: 'equipment', 'service type': 'service_type', service: 'service_type',
    'due date': 'due_date', due: 'due_date', 'planned actual': 'planned_actual', planned: 'planned_actual',
    'pm completed': 'pm_completed', completed: 'pm_completed', 'defects found': 'defects_found', defects: 'defects_found',
    'parts required': 'parts_required', parts: 'parts_required', technician: 'technician_name', 'technician name': 'technician_name', remarks: 'remarks',
  };
  const headers = matrix[headerIndex].map(normalizedLabel);
  return matrix.slice(headerIndex + 1).flatMap((values) => {
    const record: CsvRecord = { project_id: fallbackProjectId || '' };
    headers.forEach((header, columnIndex) => {
      const key = aliases[header];
      const value = values[columnIndex]?.trim();
      if (!key || !value) return;
      if (key === 'due_date') record[key] = trackerDate(value);
      else if (key === 'pm_completed') {
        if (/^(yes|true|completed|1)$/i.test(value)) record[key] = true;
        else if (/^(no|false|not completed|0)$/i.test(value)) record[key] = false;
        else record[key] = value;
      } else if (key === 'planned_actual' && /^(planned|actual)$/i.test(value)) record[key] = value.toUpperCase();
      else record[key] = value;
    });
    return String(record.equipment || '').trim() || String(record.service_type || '').trim()
      ? [{ record, saved: false, sourceLine: 0 }]
      : [];
  }).map((row, index) => ({ ...row, sourceLine: headerIndex + index + 2 }));
}

export default function CommandCenterMaintenanceCsvModal({ onClose, initialKind = 'breakdown' }: { onClose: () => void; initialKind?: Kind }) {
  const [kind, setKind] = useState<Kind>(initialKind);
  const [rows, setRows] = useState<CsvRow[]>([]);
  const [selected, setSelected] = useState(0);
  const [projectId, setProjectId] = useState('');
  const [projects, setProjects] = useState<any[]>([]);
  const [assets, setAssets] = useState<any[]>([]);
  const [employees, setEmployees] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [activeWizard, setActiveWizard] = useState(false);
  const [fileName, setFileName] = useState('');
  const [sourceFile, setSourceFile] = useState<File | null>(null);
  const definition = definitions[kind];

  useEffect(() => {
    let active = true;
    Promise.allSettled([
      apiFetch<any>('/api/v1/projects?page_size=100'),
      apiFetch<any>('/api/v1/assets?page_size=100'),
      apiFetch<any>('/api/v1/employees?page_size=100'),
    ]).then((results) => {
      if (!active) return;
      const list = (result: PromiseSettledResult<any>) => result.status === 'fulfilled' ? (Array.isArray(result.value) ? result.value : result.value?.items || []) : [];
      setProjects(list(results[0])); setAssets(list(results[1])); setEmployees(list(results[2])); setLoading(false);
    });
    return () => { active = false; };
  }, []);

  const currentRow = rows[selected];
  const incompleteRows = useMemo(() => rows.filter((row) => !row.saved).length, [rows]);
  const projectOptions = useMemo(() => projects.map((project) => ({
    value: String(project.id), label: project.name || project.project_name || project.project_number || project.id, sublabel: project.project_number || '',
  })), [projects]);

  async function loadCsv(file?: File) {
    setError(''); setFileName(''); setSourceFile(null); if (!file) return;
    try {
      const parsed = parseCsv(await file.text());
      if (parsed.length < 2) throw new Error('The CSV needs a header row and at least one data row.');
      if (kind === 'assessment') {
        const report = assessmentCsvRecord(parsed, projectId, assets);
        if (report) {
          setRows([{ record: report, saved: false, sourceLine: 1 }]); setSelected(0); setFileName(file.name); setSourceFile(file);
          return;
        }
      }
      if (kind === 'equipment') {
        const registerRows = equipmentRegisterCsvRecords(parsed, projectId);
        if (registerRows) {
          if (!registerRows.length) throw new Error('The equipment register CSV has a header row but no equipment records.');
          setRows(registerRows); setSelected(0); setFileName(file.name); setSourceFile(file);
          return;
        }
      }
      if (kind === 'action') {
        const trackerRows = actionTrackerCsvRecords(parsed, projectId);
        if (trackerRows) {
          if (!trackerRows.length) throw new Error('The Action Tracker CSV has a header row but no action records.');
          setRows(trackerRows); setSelected(0); setFileName(file.name); setSourceFile(file);
          return;
        }
      }
      if (kind === 'pm') {
        const trackerRows = pmTrackerCsvRecords(parsed, projectId);
        if (trackerRows) {
          if (!trackerRows.length) throw new Error('The PM Tracker CSV has a header row but no maintenance records.');
          setRows(trackerRows); setSelected(0); setFileName(file.name); setSourceFile(file);
          return;
        }
      }
      const headers = parsed[0].map((header) => header.trim());
      if (headers.some((header) => !header)) throw new Error('Every CSV column needs a header.');
      const imported = parsed.slice(1).map((values, rowIndex) => {
        const record: CsvRecord = {};
        headers.forEach((header, columnIndex) => {
          const value = cellValue(values[columnIndex] || ''); if (value === '') return;
          if (header === 'record_json') {
            if (typeof value !== 'object' || Array.isArray(value)) throw new Error(`Row ${rowIndex + 2}: record_json must contain a JSON object.`);
            Object.assign(record, value);
          } else setPath(record, header, value);
        });
        delete record.id;
        if (!record.project_id && projectId) record.project_id = projectId;
        return { record, saved: false, sourceLine: rowIndex + 2 };
      });
      setRows(imported); setSelected(0); setFileName(file.name); setSourceFile(file);
    } catch (e: any) { setRows([]); setError(e?.message || 'Could not read this CSV.'); }
  }

  function downloadTemplate() {
    const csv = `${definition.template.map(escapeCsv).join(',')}\n`;
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' }); const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a'); anchor.href = url; anchor.download = `${kind}-maintenance-template.csv`; anchor.click(); URL.revokeObjectURL(url);
  }

  async function handleSaved(recordId?: string) {
    const sourceTypes: Partial<Record<Kind, string>> = { breakdown: 'breakdown_job_card_import', preventive: 'pm_job_card_import', assessment: 'maintenance_assessment_import', action: 'action_tracker_import', pm: 'pm_tracker_import', equipment: 'equipment_register_import' };
    const sourceType = sourceTypes[kind];
    if (sourceFile && recordId && sourceType) {
      try {
        const form = new FormData(); form.append('file', sourceFile); form.append('title', `Imported ${definition.label.toLowerCase()} — ${sourceFile.name}`.slice(0, 250)); form.append('category', 'Equipment'); form.append('tags', 'maintenance,import'); form.append('source_type', sourceType); form.append('source_id', recordId); form.append('visibility', 'PUBLIC');
        await apiFetch('/api/v1/documents', { method: 'POST', body: form });
      } catch (err: any) {
        setRows((old) => old.map((row, index) => index === selected ? { ...row, record: { ...row.record, id: recordId }, saved: false } : row));
        setError(`The maintenance record was saved, but its source CSV could not be attached. Reopen the row and save again to retry. ${err?.message || ''}`);
        setActiveWizard(false);
        return;
      }
    }
    setRows((old) => old.map((row, index) => index === selected ? { ...row, record: recordId ? { ...row.record, id: recordId } : row.record, saved: true } : row));
    setActiveWizard(false);
  }

  const projectValue = (currentRow?.record.project_id || projectId || '');
  const shared = { projectId: projectValue, assets, employees, record: currentRow?.record, onClose: () => setActiveWizard(false), onSaved: handleSaved };
  const wizard = activeWizard && currentRow ? kind === 'breakdown'
    ? <BreakdownJobCardWizard initialView="FREE_FLOW" {...shared} />
    : kind === 'preventive' ? <PreventiveMaintenanceWizard initialView="FREE_FLOW" {...shared} />
    : kind === 'assessment' ? <MaintenanceAssessmentReportWizard projects={projects} initialMode="FREE_FLOW" {...shared} />
    : kind === 'action' ? <ActionTrackerWizard initialMode="FREE_FLOW" {...shared} />
    : kind === 'pm' ? <PMTrackerWizard initialMode="FREE_FLOW" {...shared} />
    : <EquipmentRegisterWizard initialMode="FREE_FLOW" {...shared} /> : null;

  return <>
    <div className="fixed inset-0 z-[120] flex items-center justify-center bg-slate-950/65 p-3 sm:p-6" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}>
      <section className="flex max-h-[94vh] w-full max-w-6xl flex-col overflow-hidden rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-2xl">
        <header className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 bg-[#123f68] dark:bg-slate-950 px-6 py-4 text-white rounded-t-3xl">
          <div><p className="text-xs font-semibold uppercase tracking-[.16em] text-blue-100">Command center</p><h2 className="mt-1 text-xl font-bold">Import maintenance records from CSV</h2></div>
          <button type="button" className="p-2 rounded-full hover:bg-white/10 transition" onClick={onClose} aria-label="Close"><X size={20} /></button>
        </header>
        <div className="flex-1 space-y-5 overflow-y-auto p-6">
          <p className="text-xs font-medium text-slate-600 dark:text-slate-400">Upload one record type at a time. Each row opens in its free-flow form for review and editing before it is saved.</p>
          <div className="grid gap-4 md:grid-cols-3">
            <div className="block space-y-1.5"><span className="text-xs font-semibold text-slate-700 dark:text-slate-300">Record type</span><SearchableSelect value={kind} onChange={(val) => { setKind(val as Kind); setRows([]); setFileName(''); setError(''); }} options={(Object.keys(definitions) as Kind[]).map((key) => ({ value: key, label: definitions[key].label }))} searchable={false} /></div>
            <div className="block space-y-1.5"><span className="text-xs font-semibold text-slate-700 dark:text-slate-300">Default project (optional)</span><SearchableSelect value={projectId} onChange={(val) => setProjectId(val)} options={[{ value: '', label: 'Use project_id from CSV / form' }, ...projectOptions]} placeholder="Use project_id from CSV / form" searchable /></div>
            <div className="flex items-end gap-2"><button type="button" onClick={downloadTemplate} className="inline-flex h-10 items-center gap-2 rounded-xl border border-slate-300 dark:border-slate-700 px-3.5 text-xs font-bold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 transition shadow-xs"><Download size={15} />Download template</button><label className="inline-flex h-10 cursor-pointer items-center gap-2 rounded-xl bg-[#184877] px-4 text-xs font-bold text-white hover:bg-[#123f68] transition shadow-xs"><Upload size={15} />Upload CSV<input type="file" accept=".csv,text/csv" className="hidden" onChange={(event) => void loadCsv(event.target.files?.[0])} /></label></div>
          </div>
          <div className="rounded-2xl border-l-4 border-blue-500 border-y border-r border-blue-200 bg-blue-50/80 dark:bg-blue-950/40 p-4 text-xs text-blue-950 dark:text-blue-200 shadow-xs"><b>CSV format:</b> Use the template headers; nested form fields use dot notation (for example <code>job_control.equipment</code>). Array/object fields accept JSON in one quoted cell. The importer also recognizes the two-week assessment report, Equipment Register, Action Tracker, and PM Tracker column layouts.</div>
          {loading && <div className="flex items-center gap-2 text-xs font-medium text-slate-500 rounded-xl p-3 bg-slate-50 dark:bg-slate-800"><Loader2 className="animate-spin text-blue-600" size={16} />Loading project and employee options…</div>}
          {error && <p role="alert" className="rounded-2xl border border-red-200 bg-red-50 p-4 text-xs font-medium text-red-700 dark:bg-red-950/40 dark:text-red-300 shadow-xs">{error}</p>}
          {fileName && <div className="flex items-center gap-2 text-xs font-bold text-slate-800 dark:text-slate-200"><FileSpreadsheet size={17} className="text-emerald-600" />{fileName}<span className="font-normal text-slate-500">· {rows.length} rows · {incompleteRows} awaiting review</span></div>}
          {rows.length > 0 && <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_300px]">
            <div className="overflow-hidden rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs"><table className="w-full min-w-[520px] text-left text-xs"><thead className="bg-slate-100 dark:bg-slate-800 text-[11px] font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300"><tr><th className="px-4 py-3">CSV row</th><th className="px-4 py-3">Preview</th><th className="px-4 py-3">Review</th></tr></thead><tbody>{rows.map((row, index) => <tr key={row.sourceLine} className={`border-t border-slate-200 dark:border-slate-800 ${index === selected ? 'bg-blue-50 dark:bg-blue-950/40 font-semibold' : ''}`}><td className="px-4 py-3 font-mono text-xs text-slate-500">{row.sourceLine}</td><td className="max-w-[450px] truncate px-4 py-3">{String(row.record.job_card_number || row.record.pm_control?.job_card_number || row.record.report_number || row.record.prepared_by_name || row.record.equipment || row.record.job_control?.equipment || row.record.issue_finding || row.record.reported_failure || row.record.executive_summary || '(record)')}</td><td className="px-4 py-3">{row.saved ? <span className="inline-flex items-center gap-1 font-bold text-emerald-600"><CheckCircle2 size={15} />Saved</span> : <button type="button" onClick={() => setSelected(index)} className="font-bold text-blue-700 dark:text-blue-400 hover:underline">Select</button>}</td></tr>)}</tbody></table></div>
            <aside className="space-y-4 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-800/40 p-5 shadow-xs"><h3 className="font-bold text-slate-900 dark:text-white text-sm">Review row {currentRow?.sourceLine}</h3><p className="text-xs text-slate-500">Open the imported values in the matching free-flow form. Edit any field, then save to create the record.</p><button type="button" disabled={!currentRow || currentRow.saved} onClick={() => setActiveWizard(true)} className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#184877] px-4 py-3 text-xs font-bold text-white transition hover:bg-[#123f68] disabled:cursor-not-allowed disabled:bg-slate-300 dark:disabled:bg-slate-700 shadow-xs"><FileSpreadsheet size={16} />{currentRow?.saved ? 'Already saved' : 'Open free-flow form'}</button><div className="flex justify-between gap-2"><button type="button" className="inline-flex items-center gap-1 rounded-xl border border-slate-200 dark:border-slate-700 px-3 py-2 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition disabled:opacity-40" disabled={selected <= 0} onClick={() => setSelected((value) => Math.max(0, value - 1))}><ArrowLeft size={14} />Previous</button><button type="button" className="inline-flex items-center gap-1 rounded-xl border border-slate-200 dark:border-slate-700 px-3 py-2 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition disabled:opacity-40" disabled={selected >= rows.length - 1} onClick={() => setSelected((value) => Math.min(rows.length - 1, value + 1))}>Next<ArrowRight size={14} /></button></div><p className="text-[11px] text-slate-500">Saved rows are marked and skipped. Remaining rows can be reviewed in any order.</p></aside>
          </div>}
          {!rows.length && !fileName && <div className="flex min-h-48 flex-col items-center justify-center rounded-3xl border-2 border-dashed border-slate-300 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/30 p-8 text-slate-500"><Circle size={32} className="text-slate-400 mb-2" /><p className="text-xs font-medium">Choose a record type, download its template, and upload your completed CSV.</p></div>}
        </div>
        <footer className="flex justify-end border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 px-6 py-4 rounded-b-3xl"><button type="button" onClick={onClose} className="rounded-xl border border-slate-300 dark:border-slate-700 px-5 py-2 text-xs font-bold text-slate-700 dark:text-slate-300 hover:bg-white dark:hover:bg-slate-800 transition shadow-xs">Close</button></footer>
      </section>
    </div>
    {wizard}
  </>;
}
