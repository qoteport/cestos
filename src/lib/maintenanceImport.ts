export type MaintenanceImportKind = 'preventive' | 'assessment' | 'action' | 'pm' | 'equipment';
export type MaintenanceImportSheet = { name: string; score: number; records: Record<string, any>[]; csv: string };
type Section = { key: string; names: string[]; columns: Record<string, string[]> };
type Definition = { title: string; fields: Record<string, string[]>; strong: string[]; narratives?: string[]; sections?: Section[] };
export const normalizeImportLabel = (value: unknown) => String(value ?? '').normalize('NFKD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/^\s*(?:\d+|[a-z])[.)]\s*/, '').replace(/[^a-z0-9]+/g, ' ').trim();
const cols = (names: string[]) => Object.fromEntries(names.map((name) => [name, [name.replaceAll('_', ' ')]]));
export const maintenanceDefinitions: Record<MaintenanceImportKind, Definition> = {
  action: { title: 'New Action Tracker', strong: ['issue_finding', 'action_taken'], fields: {
    action_date: ['date'], equipment_area: ['equipment / area', 'equipment', 'area'], issue_finding: ['issue / finding', 'issue', 'finding'], action_taken: ['action taken'], parts_required: ['parts required'], responsible_name: ['responsible', 'responsible person'], priority: ['priority'], status: ['status'], completion_date: ['completion date'], remarks: ['remarks'],
  } },
  pm: { title: 'New PM Tracker', strong: ['service_type', 'pm_completed', 'planned_actual'], fields: {
    equipment: ['equipment', 'asset'], service_type: ['service type'], due_date: ['due date'], planned_actual: ['planned/actual'], pm_completed: ['pm completed'], defects_found: ['defects found'], parts_required: ['parts required'], technician_name: ['technician'], remarks: ['remarks'],
  } },
  equipment: { title: 'New Equipment Register', strong: ['unit_number', 'equipment_type', 'open_defects', 'action_required'], fields: {
    equipment: ['equipment', 'asset'], unit_number: ['unit no', 'unit number', 'fleet / unit id'], equipment_type: ['type', 'equipment type'], status: ['status'], open_defects: ['open defects'], action_required: ['action required'], priority: ['priority'], remarks: ['remarks'],
  } },
  preventive: { title: 'Create Preventive Maintenance Job Card', strong: ['pm_control.pm_interval', 'inspection_items', 'service_defect_control.pm_level', 'service_defect_control.pm_result'], fields: {
    job_card_number: ['pm job card no', 'pm job card number', 'job card no', 'job card number'],
    'pm_control.date': ['date'], 'pm_control.pm_interval': ['pm interval', 'service interval'], 'pm_control.equipment': ['equipment', 'machine'], 'pm_control.fleet_unit_id': ['fleet / unit id', 'unit no'], 'pm_control.location': ['location', 'site'], 'pm_control.hour_meter_km': ['hour meter / km', 'hour / km'], 'pm_control.technician_team': ['technician / team', 'technician'], 'pm_control.work_order_no': ['work order no'], 'pm_control.start_time': ['start time'], 'pm_control.finish_time': ['finish time'],
    'service_defect_control.pm_level': ['pm level'], 'service_defect_control.next_pm_due': ['next pm due'], 'service_defect_control.total_labour_hours': ['total labour hours', 'total labour hrs'], 'service_defect_control.machine_down_hours': ['machine down hours', 'machine down hrs'], 'service_defect_control.pm_result': ['pm result'], 'service_defect_control.defects_recommendations': ['defects / recommendations'], 'machine_release.machine_status': ['machine status'], supervisor_comments: ['supervisor comments'], 'signatures.technician.signer_name': ['technician sign'], 'signatures.supervisor.signer_name': ['supervisor sign'], 'signatures.operator.signer_name': ['operator sign'], inspection_items: ['inspection items'],
  }, narratives: ['supervisor_comments', 'service_defect_control.defects_recommendations'], sections: [{ key: 'inspection_items', names: ['inspection checklist', 'inspection and service checklist', 'inspection service checklist', 'pm checklist measurements'], columns: {
    sequence: ['no', 'sequence'], system_component: ['system / component', 'system component', 'system'], service_tasks: ['service tasks', 'service task', 'inspection / service task'], condition: ['condition'], condition_reading: ['condition / reading'], action_taken: ['action taken'], parts_text: ['parts used', 'parts / qty'], technician_initial: ['technician initial', 'tech initial'], supervisor_check: ['supervisor check'], remarks: ['remarks'],
  } }] },
  assessment: { title: 'New Maintenance Assessment Report', strong: ['prepared_by_name', 'executive_summary', 'maintenance_assessment', 'equipment_fleet', 'maintenance_kpis'], fields: {
    report_number: ['report number', 'report no'], report_date: ['report date', 'date'], reporting_period_start: ['reporting period start', 'period start', 'start date'], reporting_period_end: ['reporting period end', 'period end', 'end date'], project_name_custom: ['project', 'project name'], prepared_by_name: ['prepared by', 'preparer'], prepared_by_position: ['position', 'prepared by position'], submitted_to: ['submitted to'], executive_summary: ['executive summary'], manpower_requirements: ['manpower requirement', 'manpower requirements'], conclusion: ['conclusion'],
    equipment_fleet: ['equipment fleet'], maintenance_assessment: ['maintenance assessment corrective action'], preventive_improvements: ['preventive maintenance improvement'], spare_parts_actions: ['spare parts materials'], control_documents: ['maintenance control documentation'], action_plan: ['initial action plan', 'initial 30 day action plan'], maintenance_kpis: ['maintenance kpis'],
  }, narratives: ['executive_summary', 'manpower_requirements', 'conclusion'], sections: [
    { key: 'equipment_fleet', names: ['equipment fleet'], columns: cols(['equipment', 'quantity', 'maintenance_focus', 'current_approach']) },
    { key: 'maintenance_assessment', names: ['maintenance assessment corrective action'], columns: cols(['area_equipment', 'observation_failure', 'action_taken_response', 'current_status']) },
    { key: 'preventive_improvements', names: ['preventive maintenance improvement', 'preventive improvements'], columns: cols(['pm_control', 'purpose', 'status']) },
    { key: 'spare_parts_actions', names: ['spare parts materials'], columns: cols(['action', 'purpose', 'priority', 'status']) },
    { key: 'control_documents', names: ['maintenance control documentation'], columns: cols(['control_document', 'purpose', 'implementation']) },
    { key: 'action_plan', names: ['initial action plan', 'initial 30 day action plan'], columns: cols(['action', 'priority', 'target', 'status']) },
    { key: 'maintenance_kpis', names: ['maintenance kpis'], columns: cols(['kpi', 'purpose', 'frequency']) },
  ] },
};
const lookup = (fields: Record<string, string[]>) => new Map(Object.entries(fields).flatMap(([key, names]) => [key, ...names].map((name) => [normalizeImportLabel(name), key] as const)));
const get = (record: any, path: string): any => path.split('.').reduce((value, key) => value?.[key], record);
function put(record: any, path: string, value: any) {
  const keys = path.split('.'); let target = record;
  keys.slice(0, -1).forEach((key) => { target[key] ||= {}; target = target[key]; });
  target[keys[keys.length - 1]] = value;
}
function assign(record: any, path: string, text: string, definition: Definition) {
  if (!text.trim()) return;
  let value: any = text.trim();
  if (definition.sections?.some((section) => section.key === path)) {
    try { value = JSON.parse(value); } catch { throw new Error(`Use a table or a JSON array for ${path.replaceAll('_', ' ')}.`); }
    if (!Array.isArray(value)) throw new Error(`Expected rows for ${path.replaceAll('_', ' ')}.`);
    value = value.filter((row: any) => row && typeof row === 'object' && !Array.isArray(row));
  } else if (path === 'pm_completed') {
    if (!/^(yes|true|completed|1|no|false|not completed|0)$/i.test(value)) throw new Error('PM completed must be Yes or No.');
    value = /^(yes|true|completed|1)$/i.test(value);
  } else if (path === 'planned_actual') {
    value = value.toUpperCase();
    if (!['PLANNED', 'ACTUAL'].includes(value)) throw new Error('Planned/Actual must be Planned or Actual.');
  } else if (/(date|period_start|period_end)$/.test(path)) {
    const date = value.match(/^(\d{1,2})[/.\-](\d{1,2})[/.\-](\d{4})$/);
    if (date) value = `${date[3]}-${date[2].padStart(2, '0')}-${date[1].padStart(2, '0')}`;
  }
  put(record, path, value);
}
function recordScore(record: any, definition: Definition) {
  const has = (key: string) => { const value = get(record, key); return value !== undefined && value !== '' && (!Array.isArray(value) || value.length > 0); };
  const count = Object.keys(definition.fields).filter(has).length;
  return count >= 2 && definition.strong.some(has) ? count + definition.strong.filter(has).length * 3 : 0;
}
export function extractMaintenanceSheet(matrix: string[][], kind: MaintenanceImportKind): { records: any[]; score: number } | null {
  const definition = maintenanceDefinitions[kind]; const fields = lookup(definition.fields);
  const sectionFor = (text: string) => definition.sections?.find((section) => section.names.some((name) => normalizeImportLabel(name) === normalizeImportLabel(text)));
  const hasSections = matrix.some((row) => row.filter(Boolean).length === 1 && (sectionFor(row.find(Boolean) || '') || definition.narratives?.includes(fields.get(normalizeImportLabel(row.find(Boolean))) || '')));
  if (!hasSections) {
    const header = matrix.findIndex((row) => row.filter(Boolean).length >= 2 && row.filter(Boolean).filter((cell) => fields.has(normalizeImportLabel(cell))).length / row.filter(Boolean).length >= 0.8);
    if (header >= 0) {
      const keys = matrix[header].map((cell) => fields.get(normalizeImportLabel(cell)));
      const records = matrix.slice(header + 1).filter((row) => row.some(Boolean)).map((row) => {
        const record = {}; keys.forEach((key, index) => { if (key) assign(record, key, row[index] || '', definition); }); return record;
      }).filter((record) => recordScore(record, definition));
      if (records.length) return { records, score: Math.max(...records.map((record) => recordScore(record, definition))) };
    }
  }
  const record: any = {}; let narrative = ''; let section: Section | undefined; let columns: (string | undefined)[] | undefined;
  for (let index = 0; index < matrix.length; index += 1) {
    const row = matrix[index]; const nonempty = row.filter(Boolean);
    if (!nonempty.length) continue;
    if (nonempty.length === 1 && ['pm control machine identification', 'pm control', 'job control machine identification', 'service defect control', 'machine release sign off', 'machine release', 'signatures'].includes(normalizeImportLabel(nonempty[0]))) { section = undefined; columns = undefined; narrative = ''; continue; }
    const heading = nonempty.length === 1 ? sectionFor(nonempty[0]) : undefined;
    if (heading) { section = heading; columns = undefined; narrative = ''; record[heading.key] ||= []; continue; }
    const detected = (section ? [section] : definition.sections || []).find((candidate) => row.filter((cell) => lookup(candidate.columns).has(normalizeImportLabel(cell))).length >= 2);
    if (detected) { section = detected; const names = lookup(section.columns); columns = row.map((cell) => names.get(normalizeImportLabel(cell))); record[section.key] ||= []; narrative = ''; continue; }
    const labelKeys = row.map((cell) => fields.get(normalizeImportLabel(cell.split(':')[0])));
    if (labelKeys.some(Boolean)) {
      section = undefined; columns = undefined; narrative = '';
      labelKeys.forEach((key, column) => {
        if (!key) return;
        const colon = row[column].indexOf(':'); let value = colon >= 0 ? row[column].slice(colon + 1).trim() : '';
        if (!value) {
          const next = labelKeys.findIndex((candidate, i) => i > column && candidate);
          value = row.slice(column + 1, next >= 0 ? next : undefined).filter(Boolean).join(' ');
        }
        if (definition.narratives?.includes(key)) narrative = key;
        if (!value && !narrative) {
          const below = matrix[index + 1]?.[column] || '';
          if (!fields.has(normalizeImportLabel(below))) value = below;
        }
        assign(record, key, value, definition);
      });
    } else if (section && columns) {
      const entry = Object.fromEntries(columns.flatMap((key, i) => key ? [[key, row[i] || '']] : []));
      if (Object.values(entry).some(Boolean)) record[section.key].push(entry);
    } else if (narrative) {
      put(record, narrative, [get(record, narrative), nonempty.join(' ')].filter(Boolean).join('\n'));
    }
  }
  const score = recordScore(record, definition); return score ? { records: [record], score } : null;
}
export async function readMaintenanceImport(file: File, kind: MaintenanceImportKind): Promise<MaintenanceImportSheet[]> {
  if (!/\.(csv|xlsx|xls)$/i.test(file.name)) throw new Error('Choose a CSV or Excel file (.csv, .xlsx, .xls).');
  const XLSX = await import('xlsx');
  const workbook = /\.csv$/i.test(file.name) ? XLSX.read(await file.text(), { type: 'string', raw: true }) : XLSX.read(await file.arrayBuffer(), { type: 'array', cellNF: true, cellFormula: false });
  const matches: MaintenanceImportSheet[] = [];
  for (const name of workbook.SheetNames) {
    const sheet = workbook.Sheets[name]; if (!sheet?.['!ref']) continue;
    // Capture the source worksheet before normalizing dates or mapping fields.
    const csv = XLSX.utils.sheet_to_csv(sheet);
    for (const address of Object.keys(sheet)) {
      if (address.startsWith('!')) continue;
      const cell = sheet[address]; const format = String(cell.z || '').replace(/"[^"\n]*"/g, '');
      if (cell.t === 'n' && XLSX.SSF.is_date(format) && /[dy]/i.test(format)) {
        const date = XLSX.SSF.parse_date_code(cell.v, { date1904: workbook.Workbook?.WBProps?.date1904 });
        if (date) { cell.t = 's'; cell.v = `${date.y}-${String(date.m).padStart(2, '0')}-${String(date.d).padStart(2, '0')}`; delete cell.w; delete cell.z; }
      }
    }
    const matrix = XLSX.utils.sheet_to_json<string[]>(sheet, { header: 1, raw: false, defval: '', blankrows: true }).map((row) => row.map((value) => String(value ?? '').trim()));
    const match = extractMaintenanceSheet(matrix, kind);
    if (match) matches.push({ ...match, name, csv });
  }
  if (!matches.length) throw new Error('No worksheet matches this form. Choose another file, or continue to enter the details manually.');
  return matches.sort((a, b) => b.score - a.score);
}
export function maintenanceSourceFiles(original: File, sheet: { name: string; csv?: string }): File[] {
  if (/\.csv$/i.test(original.name)) return [original];
  const name = `${original.name.replace(/\.[^.]+$/, '')}-${sheet.name.replace(/[^a-z0-9_-]/gi, '_')}-source.csv`;
  return [original, new File(['\uFEFF' + (sheet.csv || '')], name, { type: 'text/csv;charset=utf-8' })];
}
