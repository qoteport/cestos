'use client';
import { useState, useEffect, useId, FormEvent } from 'react';
import Link from 'next/link';
import { Info } from 'lucide-react';
import contract from '@/lib/contract.json';
import { apiFetch } from '@/lib/api';
import { Modal, Row, title, rows, display } from './DataUI';
import EmployeeWizardForm from './EmployeeWizardForm';
import SearchableSelect, { SearchableSelectOption, MultiSearchableSelect } from './SearchableSelect';
const schemas: Row = contract.schemas;
export function resolve(s: Row): Row {
  if (s.$ref) return resolve(schemas[s.$ref.split('/').pop()!] || {});
  if (s.anyOf) {
    const chosen = s.anyOf.find((x: Row) => x.type !== 'null');
    return {
      ...resolve(chosen || {}),
      ...Object.fromEntries(Object.entries(s).filter(([k]) => k !== 'anyOf')),
    };
  }
  return s;
}
const lookup: Row = {
  default_location_id: 'locations',
  responsible_employee_id: 'employees',
  client_id: 'clients',
  project_id: 'projects',
  project_manager_id: 'employees',
  employee_id: 'employees',
  manager_employee_id: 'employees',
  primary_operator_id: 'employees',
  assigned_employee_id: 'employees',
  supervisor_id: 'employees',
  department_id: 'departments',
  parent_department_id: 'departments',
  position_id: 'positions',
  location_id: 'locations',
  asset_id: 'assets',
  asset_category_id: 'asset-categories',
  base_unit_id: 'inventory/units',
  unit_id: 'inventory/units',
  from_unit_id: 'inventory/units',
  to_unit_id: 'inventory/units',
  store_id: 'inventory/stores',
  from_store_id: 'inventory/stores',
  to_store_id: 'inventory/stores',
  bin_id: 'inventory/bins',
  from_bin_id: 'inventory/bins',
  to_bin_id: 'inventory/bins',
  item_id: 'inventory/items',
  supplier_id: 'inventory/suppliers',
  preferred_supplier_id: 'inventory/suppliers',
  lot_id: 'inventory/lots',
  serial_id: 'inventory/serials',
  original_issue_id: 'inventory/issues',
  request_id: 'inventory/requests',
  reservation_id: 'inventory/reservations',
  rotation_pattern_id: 'rotation-patterns',
  parent_component_id: 'components',
  contract_number: 'commercial/contracts',
  contract_id: 'commercial/contracts',
  commercial_contract_id: 'commercial/contracts',
};
const fieldEnums: Record<string, string[]> = {
  currency: ['USD', 'GHS', 'ZAR', 'EUR', 'GBP', 'CAD', 'AUD', 'KES', 'NGN'],
  pay_period: ['MONTHLY', 'ANNUAL', 'WEEKLY', 'DAILY', 'HOURLY'],
  relationship: [
    'Spouse',
    'Parent',
    'Sibling',
    'Child',
    'Partner',
    'Relative',
    'Friend',
    'Guardian',
    'Colleague',
    'Other',
  ],
  relationship_type: ['SPOUSE', 'CHILD', 'PARENT', 'SIBLING', 'DEPENDENT', 'OTHER'],
  gender: ['Male', 'Female', 'Other', 'Prefer Not To Say'],
  marital_status: ['Single', 'Married', 'Divorced', 'Widowed', 'Separated'],
  qualification_type: [
    'DEGREE',
    'DIPLOMA',
    'CERTIFICATE',
    'HIGH_SCHOOL',
    'VOCATIONAL',
    'MASTER',
    'DOCTORATE',
    'OTHER',
  ],
  proficiency_level: ['BEGINNER', 'INTERMEDIATE', 'ADVANCED', 'EXPERT', 'MASTER'],
  license_type: [
    'DRIVERS_LICENSE',
    'HEAVY_EQUIPMENT',
    'BLASTING',
    'SAFETY_CERTIFICATE',
    'CRANE_OPERATOR',
    'FIRST_AID',
    'HAZMAT',
    'OTHER',
  ],
  authorization_type: ['OPERATOR', 'MAINTENANCE', 'INSPECTOR', 'SUPERVISOR', 'LIMITED'],
  employment_type: [
    'FULL_TIME',
    'PART_TIME',
    'CONTRACT',
    'CASUAL',
    'TEMPORARY',
    'CONSULTANT',
    'INTERN',
  ],
  employment_status: [
    'ACTIVE',
    'ON_LEAVE',
    'OFF_ROTATION',
    'SUSPENDED',
    'EXITED',
    'RESIGNED',
    'TERMINATED',
  ],
  availability_status: [
    'AVAILABLE',
    'ASSIGNED',
    'ON_LEAVE',
    'OFF_ROTATION',
    'TRAINING',
    'UNAVAILABLE',
  ],
};

function SupplierInput({
  value,
  onChange,
  required,
}: {
  value: string;
  onChange: (v: string) => void;
  required: boolean;
}) {
  const [suppliers, setSuppliers] = useState<{ id: string; name: string }[]>([]);
  const listId = useId();
  useEffect(() => {
    apiFetch<{ id: string; name: string }[]>('/api/v1/fuel-suppliers')
      .then((s) => setSuppliers(s || []))
      .catch(() => {});
  }, []);
  return (
    <div>
      <input
        className="input-field"
        list={listId}
        value={value || ''}
        required={required}
        onChange={(e) => onChange(e.target.value)}
        placeholder="Type or select supplier name…"
      />
      <datalist id={listId}>
        {suppliers.map((s) => (
          <option key={s.id} value={s.name} />
        ))}
      </datalist>
    </div>
  );
}

export const DEFAULT_DRILL_TYPES = [
  'Diamond Core (DD)',
  'Reverse Circulation (RC)',
  'Rotary Air Blast (RAB)',
  'Blast Hole',
  'Geotechnical',
  'Grade Control',
  'Water Well',
  'Underground Diamond',
];

export function getStoredDrillTypes(): string[] {
  if (typeof window === 'undefined') return DEFAULT_DRILL_TYPES;
  try {
    const stored = localStorage.getItem('cestos_drill_types');
    if (stored) {
      const parsed = JSON.parse(stored);
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    }
  } catch {}
  return DEFAULT_DRILL_TYPES;
}

export function saveDrillType(newType: string) {
  if (!newType || typeof window === 'undefined') return;
  const current = getStoredDrillTypes();
  const trimmed = newType.trim();
  if (trimmed && !current.some((t) => t.toLowerCase() === trimmed.toLowerCase())) {
    const updated = [...current, trimmed];
    try {
      localStorage.setItem('cestos_drill_types', JSON.stringify(updated));
    } catch {}
  }
}

const DEFAULT_PROJECT_TYPES = [
  'Exploration Drilling',
  'Grade Control Drilling',
  'Reverse Circulation (RC)',
  'Diamond Core Drilling',
  'Air Core Drilling',
  'Waterwell Drilling',
  'Mining Services',
  'Civil & Infrastructure',
  'Geotechnical & Environmental',
  'General Operations',
];

export function getStoredProjectTypes(): string[] {
  if (typeof window === 'undefined') return DEFAULT_PROJECT_TYPES;
  try {
    const stored = localStorage.getItem('cestos_project_types');
    if (stored) {
      const parsed = JSON.parse(stored);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return Array.from(new Set([...DEFAULT_PROJECT_TYPES, ...parsed]));
      }
    }
  } catch {}
  return DEFAULT_PROJECT_TYPES;
}

export function saveProjectType(newType: string) {
  if (!newType || typeof window === 'undefined') return;
  const current = getStoredProjectTypes();
  const trimmed = newType.trim();
  if (trimmed && !current.some((t) => t.toLowerCase() === trimmed.toLowerCase())) {
    const updated = [...current, trimmed];
    try {
      localStorage.setItem('cestos_project_types', JSON.stringify(updated));
    } catch {}
  }
}

function ProjectTypeInput({
  value,
  onChange,
  required,
}: {
  value: string;
  onChange: (v: string) => void;
  required?: boolean;
}) {
  const [types, setTypes] = useState<string[]>([]);
  const [isCustom, setIsCustom] = useState(false);
  const [customVal, setCustomVal] = useState('');

  useEffect(() => {
    const stored = getStoredProjectTypes();
    setTypes(stored);
    if (value && !stored.includes(value)) {
      setIsCustom(true);
      setCustomVal(value);
    }
  }, [value]);

  const handleSelectChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const val = e.target.value;
    if (val === '__ADD_NEW__') {
      setIsCustom(true);
      setCustomVal('');
      onChange('');
    } else {
      setIsCustom(false);
      onChange(val);
    }
  };

  return (
    <div className="space-y-1.5">
      <select
        className="input-field text-xs font-medium"
        value={isCustom ? '__ADD_NEW__' : value || ''}
        required={required && !isCustom}
        onChange={handleSelectChange}
      >
        <option value="">Select Project Type…</option>
        {types.map((t) => (
          <option key={t} value={t}>
            {t}
          </option>
        ))}
        <option value="__ADD_NEW__">+ Add New Project Type…</option>
      </select>
      {isCustom && (
        <div className="flex gap-1.5 items-center">
          <input
            className="input-field text-xs flex-1"
            value={customVal}
            required={required}
            autoFocus
            placeholder="Type new project type name…"
            onChange={(e) => {
              setCustomVal(e.target.value);
              onChange(e.target.value);
            }}
          />
          <button
            type="button"
            className="px-2 py-1 text-2xs rounded bg-muted hover:bg-muted/80 text-muted-foreground whitespace-nowrap"
            onClick={() => {
              setIsCustom(false);
              setCustomVal('');
              onChange('');
            }}
          >
            Cancel
          </button>
        </div>
      )}
    </div>
  );
}

function DrillTypeInput({
  value,
  onChange,
  required,
}: {
  value: string;
  onChange: (v: string) => void;
  required?: boolean;
}) {
  const [types, setTypes] = useState<string[]>([]);
  const listId = useId();

  useEffect(() => {
    setTypes(getStoredDrillTypes());
  }, []);

  return (
    <div>
      <input
        className="input-field"
        list={listId}
        value={value || ''}
        required={required}
        onChange={(e) => onChange(e.target.value)}
        placeholder="Select or type drill type…"
      />
      <datalist id={listId}>
        {types.map((t) => (
          <option key={t} value={t} />
        ))}
      </datalist>
    </div>
  );
}

function autoGenerateCode(str: string): string {
  if (!str) return '';
  const words = str.trim().split(/\s+/);
  if (words.length === 1) {
    return words[0].slice(0, 4).toUpperCase();
  }
  return words.map(w => w[0]).join('').toUpperCase().slice(0, 6);
}

const FIELD_HELP_TEXT: Record<string, string> = {
  start_date: 'Contractual start date of this project assignment.',
  end_date: 'Contractual end date or planned conclusion of this assignment.',
  mobilization_date: 'Date worker travels to site and begins mobilization/setup (may differ from contractual start date).',
  demobilization_date: 'Date worker completes site teardown/departure and demobilizes from site.',
  rotation_pattern_id: 'Standard work cycle schedule for this assignment (e.g. 4 Weeks On / 2 Weeks Off).',
  is_primary: 'Designates this project as the employee\'s main primary operational assignment.',
  role_on_project: 'Specific operational role or title assigned for this project.',
  supervisor_id: 'Designated supervisor or site manager overseeing this worker on site.',
  location_id: 'Specific site or operational location associated with the selected project.',
  position_id: 'Job position for this assignment (defaults to employee\'s current position).',
  assignment_type: 'Type of assignment (e.g. Project site, Base office, Training).',
  grade: 'Job band or compensation tier (e.g. G1 - G5, Executive, Senior, Entry Level).',
  level: 'Seniority level within band (e.g. L1 - Junior, L2 - Mid, L3 - Senior, L4 - Lead, L5 - Principal).',
  is_supervisory_role: 'When checked, employees holding this position are prioritized as supervisors across project assignments and team management.',
  parent_department_id: 'Parent department under which this organizational unit operates.',
  assigned_employee_id: 'Select the employee or technician responsible for carrying out this maintenance job.',
  is_recurring: 'Check this box if this maintenance task repeats on a regular schedule (e.g. weekly washing or monthly service).',
  recurrence_interval_days: 'Number of days between recurring occurrences (e.g. 7 for weekly, 30 for monthly). When completed, a new maintenance job is automatically scheduled.',
};

const FIELD_PLACEHOLDERS: Record<string, string> = {
  grade: 'e.g. G3, Band A, Senior',
  level: 'e.g. L2, Mid-Level, Lead',
  code: 'Auto-generated (e.g. SL-ENG)',
  purchase_price: 'e.g. 150000.00',
  recurrence_interval_days: 'e.g. 7 (weekly) or 30 (monthly)',
};

function getFieldLabel(key: string, resource: string): string {
  if (key === 'name' && resource === 'projects') return 'Project Title';
  if (key === 'rotation_pattern_id') return 'Rotation Pattern';
  if (key === 'supervisor_id') return 'Project Supervisor';
  if (key === 'manager_employee_id') return 'Department Manager';
  if (key === 'responsible_employee_id') return 'Responsible Employee';
  if (key === 'primary_operator_id') return 'Primary Operator';
  if (key === 'assigned_employee_id') return 'Assigned Technician / Employee';
  if (key === 'is_recurring') return 'Maintenance Schedule / Recurrence';
  if (key === 'recurrence_interval_days') return 'Recurrence Interval (Days)';
  if (key === 'location_id') return 'Work / Site Location';
  if (key === 'position_id') return 'Assignment Position';
  if (key === 'parent_department_id') return 'Parent Department';
  if (key === 'is_supervisory_role') return 'Is Supervisory Role';
  if (key === 'purchase_price') return 'Purchase Price / Asset Cost ($)';
  if (key === 'purchase_currency') return 'Purchase Currency';
  if (key === 'supplier_id' || key === 'preferred_supplier_id') return 'Supplier';
  if (key === 'contract_number' || key === 'contract_id' || key === 'commercial_contract_id') return 'Commercial Contract';
  return title(key);
}

function isSupervisorRow(r: Row): boolean {
  const role = String(r.role || '').toUpperCase();
  const pos = String(r.position_name || r.position?.title || r.position?.name || r.position || r.job_title || r.title || '').toLowerCase();
  const isSup = !!r.is_supervisor || !!r.is_supervisory_role || !!r.position?.is_supervisory_role;
  return (
    isSup ||
    role.includes('SUPERVISOR') ||
    role.includes('MANAGER') ||
    pos.includes('supervisor') ||
    pos.includes('manager') ||
    pos.includes('lead') ||
    pos.includes('foreman') ||
    pos.includes('superintendent') ||
    pos.includes('head') ||
    pos.includes('chief')
  );
}

function formatLookupOptionLabel(r: Row, route?: string): string {
  if (!r) return '';
  if (route === 'employees') {
    const name = [r.first_name, r.last_name].filter(Boolean).join(' ') || r.name || (r.employee_number ? `#${r.employee_number}` : '') || String(r.id || '');
    const pos = r.job_title || r.position_name || r.position?.title || (typeof r.position === 'string' ? r.position : '');
    return pos ? `${display(name)} (${pos})` : display(name);
  }
  if (route === 'inventory/suppliers' || route === 'suppliers') {
    const name = r.name || r.company_name || r.supplier_name || String(r.id || '');
    return r.code ? `${display(name)} [${r.code}]` : display(name);
  }
  if (route === 'departments') {
    const name = r.name || r.title || r.code || String(r.id || '');
    return r.code ? `${display(name)} [${r.code}]` : display(name);
  }
  if (route === 'positions') {
    const name = r.title || r.name || r.code || String(r.id || '');
    return r.code ? `${display(name)} (${r.code})` : display(name);
  }
  if (route === 'clients') {
    return display(r.name || r.company_name || r.code || r.id);
  }
  if (route === 'projects') {
    return display(r.name || r.title || r.project_number || r.code || r.id);
  }
  if (route === 'locations') {
    return display(r.name || r.site_name || r.code || r.id);
  }
  if (route === 'assets') {
    return display(r.asset_name || r.name || r.asset_tag || r.serial_number || r.id);
  }
  if (route === 'commercial/contracts') {
    const num = r.contract_number || r.number || r.code || r.title || r.name || String(r.id || '');
    const client = r.client?.name || r.client_name || '';
    const titleText = r.title || r.name || '';
    return client ? `${display(num)} — ${display(client)} (${display(titleText)})` : display(num);
  }
  return display(r.name || r.title || r.code || r.document_number || r.asset_name || r.id);
}

function Reference({
  field,
  value,
  onChange,
  required,
  resource,
  formData,
}: {
  field: string;
  value: any;
  onChange: (v: any, row?: Row, extraData?: Row) => void;
  required: boolean;
  resource: string;
  formData?: Row;
}) {
  const route =
    field === 'category_id'
      ? resource.startsWith('inventory/')
        ? 'inventory/categories'
        : 'asset-categories'
      : field === 'parent_category_id'
        ? resource.includes('inventory')
          ? 'inventory/categories'
          : 'asset-categories'
        : lookup[field];
  const [search, setSearch] = useState('');
  const [options, setOptions] = useState<Row[]>([]);
  const [error, setError] = useState('');
  const [selectedEntity, setSelectedEntity] = useState<Row | null>(null);

  const selectedProjectId = formData?.project_id;

  useEffect(() => {
    if (!value || !route) return;
    if (options.some((r) => String(r.id) === String(value))) return;
    let active = true;
    apiFetch<Row>(`/api/v1/${route}/${value}`)
      .then((res) => {
        if (active && res && (res.id || res.name || res.first_name || res.title)) {
          setSelectedEntity(res);
        }
      })
      .catch(() => {});
    return () => { active = false; };
  }, [value, route, options]);

  useEffect(() => {
    if (!route) return;
    let active = true;
    const timer = setTimeout(async () => {
      try {
        let url = '/api/v1/' + route + '?page_size=100&search=' + encodeURIComponent(search);

        const d = await apiFetch(url);
        if (active) {
          let fetchedRows = rows(d);
          if (field === 'parent_department_id' && (formData?.id || formData?.department_id)) {
            const selfId = formData?.id || formData?.department_id;
            fetchedRows = fetchedRows.filter(r => String(r.id) !== String(selfId));
          }
          setOptions(fetchedRows);
          setError('');
        }
      } catch (e: any) {
        if (active) setError(e.message || 'Error loading options');
      }
    }, 200);
    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, [route, search, field, selectedProjectId]);

  if (!route)
    return (
      <input
        className="input-field text-xs"
        required={required}
        value={value || ''}
        onChange={(e) => onChange(e.target.value)}
        placeholder="Record ID"
      />
    );

  const selectedRow = options.find((r) => String(r.id) === String(value) || String(r.contract_number) === String(value)) || selectedEntity;

  const fieldLabel = field === 'manager_employee_id' ? 'Department Manager' : field === 'supervisor_id' ? 'Supervisor' : getFieldLabel(field, resource);

  const selectedFallbackLabel = selectedRow
    ? formatLookupOptionLabel(selectedRow, route)
    : (
        formData?.manager_name ||
        formData?.manager_employee_name ||
        formData?.manager_employee?.name ||
        formData?.responsible_employee_name ||
        formData?.responsible_employee?.name ||
        formData?.primary_operator_name ||
        formData?.primary_operator?.name ||
        formData?.employee_name ||
        (formData?.employee ? [formData.employee.first_name, formData.employee.last_name].filter(Boolean).join(' ') || formData.employee.name : null) ||
        (value ? `Selected ${fieldLabel} (${String(value).slice(0, 8)}...)` : '')
      );

  const searchableOptions: SearchableSelectOption[] = options.map((r) => ({
    value: field === 'contract_number' ? String(r.contract_number || r.id) : String(r.id),
    label: formatLookupOptionLabel(r, route),
    badge: (field === 'supervisor_id' || route === 'employees') && isSupervisorRow(r) ? 'Supervisor' : undefined,
    raw: r,
  }));

  if (value && !searchableOptions.some((opt) => String(opt.value) === String(value))) {
    searchableOptions.unshift({
      value: String(value),
      label: selectedFallbackLabel || `Selected ${fieldLabel}`,
    });
  }

  if (field === 'assigned_employee_id') {
    let currentValues: string[] = [];
    if (Array.isArray(value)) {
      currentValues = value.map(String).filter(Boolean);
    } else if (Array.isArray(formData?.assigned_employee_ids)) {
      currentValues = formData.assigned_employee_ids.map(String).filter(Boolean);
    } else if (typeof value === 'string' && value.trim()) {
      currentValues = value.split(',').map((s) => s.trim()).filter(Boolean);
    } else if (typeof formData?.assigned_employee_id === 'string' && formData.assigned_employee_id.trim()) {
      currentValues = formData.assigned_employee_id.split(',').map((s) => s.trim()).filter(Boolean);
    }

    return (
      <div className="space-y-1">
        <MultiSearchableSelect
          options={searchableOptions}
          values={currentValues}
          onChange={(nextValues, selectedOpts) => {
            const primaryId = nextValues[0] || '';
            const commaNames = selectedOpts.map((o) => o.label.replace(/\s*\([^)]*\)/g, '').trim()).join(', ');
            const matchedRow = options.find((r) => String(r.id) === String(primaryId)) || selectedOpts[0]?.raw;

            const extraUpdates: Row = {
              assigned_employee_id: primaryId,
              assigned_employee_ids: nextValues,
              assigned_employee_name: commaNames,
              assigned_employee_names: commaNames,
            };
            onChange(primaryId, matchedRow, extraUpdates);
          }}
          placeholder="Search and select technicians / employees (multiple allowed)..."
          required={required}
        />
        {error && <p className="text-xs text-red-700">{error}</p>}
      </div>
    );
  }

  return (
    <div className="space-y-1">
      <SearchableSelect
        options={searchableOptions}
        value={value || ''}
        onChange={(val, opt) => {
          const matchedRow = options.find((r) => String(r.id) === String(val)) || opt?.raw;
          onChange(val, matchedRow);
        }}
        placeholder={`Search and select ${fieldLabel.toLowerCase()}...`}
        required={required}
      />
      {error && <p className="text-xs text-red-700">{error}</p>}
      {route === 'inventory/suppliers' && (
        <p className="text-[11px] text-muted-foreground mt-0.5 flex items-center justify-between">
          <span>Define or manage suppliers:</span>
          <Link href="/workspace/inventory/suppliers" target="_blank" className="text-primary hover:underline font-semibold ml-1">
            Open Suppliers Workspace →
          </Link>
        </p>
      )}
    </div>
  );
}

function Fields({
  schema,
  data,
  change,
  resource,
  fieldPrefix = 'field',
}: {
  schema: Row;
  data: Row;
  change: (data: Row) => void;
  resource: string;
  fieldPrefix?: string;
}) {
  const [advanced, setAdvanced] = useState(false);
  const required = schema.required || [];
  const extraCommon =
    resource.includes('fuel-logs') ||
    resource.includes('maintenance') ||
    resource === 'project-records'
      ? [
          'record_type',
          'fuel_type',
          'is_recurring',
          'recurrence_interval_days',
          'maintenance_type',
          'recorded_at',
          'scheduled_date',
          'priority',
          'assigned_employee_id',
          'provider',
          'currency',
          'cost',
          'unit_cost',
        ]
      : [];
  const [initialKeys] = useState(() => new Set(Object.keys(data).filter((k) => data[k] != null)));
  const common = [
    'name',
    'title',
    'code',
    'first_name',
    'last_name',
    'type',
    'status',
    'category_id',
    'supplier_id',
    'project_id',
    'department_id',
    'parent_department_id',
    'grade',
    'level',
    'is_supervisory_role',
    'project_type',
    'drilling_type',
    'drill_type',
    'client_id',
    'target_metres',
    'contract_value',
    'start_date',
    'end_date',
    'contract_number',
  ];
  let fields = Object.entries(schema.properties || {}).filter(
    ([k]) => !['organization_id', 'created_by_id', 'updated_by_id'].includes(k)
  );

  // Remove duplicate plain rotation_pattern text field if rotation_pattern_id reference dropdown exists
  if (schema.properties?.rotation_pattern_id && schema.properties?.rotation_pattern) {
    fields = fields.filter(([k]) => k !== 'rotation_pattern');
  }

  if (resource === 'projects') {
    fields = fields.filter(([k]) => !['notes', 'contract_value', 'default_currency', 'currency'].includes(k));
  }
  const isPrimary = (key: string) =>
    required.includes(key) ||
    common.includes(key) ||
    extraCommon.includes(key) ||
    initialKeys.has(key);

  const primaryFields = fields.filter(([k]) => isPrimary(k));
  const additionalFields = fields.filter(([k]) => !isPrimary(k));

  const renderField = ([key, raw]: [string, any]) => {
    if (key === 'recurrence_interval_days') {
      const isRec = data.is_recurring === true || data.is_recurring === 'true';
      if (!isRec) return null;
    }

    const s = resolve(raw as Row);
    const val = data[key] ?? s.default ?? '';
    const set = (value: any, row?: Row, extraData?: Row) => {
      const next = { ...data, ...extraData, [key]: value };
      if (key === 'project_id' && data.project_id !== value) {
        next.location_id = '';
      }
      if (key === 'item_id' && row?.base_unit_id) {
        next.unit_id = row.base_unit_id;
        next.currency = row.default_currency || 'USD';
      }
      if ((key === 'title' || key === 'name') && (resource === 'positions' || resource === 'departments')) {
        const generated = autoGenerateCode(value);
        if (!data.code || data.code === autoGenerateCode(data[key] || '')) {
          next.code = generated;
        }
      }
      change(next);
    };

    const helpText = FIELD_HELP_TEXT[key];
    const labelText = getFieldLabel(key, resource);

    if (s.type === 'array') {
      const entries = data[key] || [];
      return (
        <fieldset className="md:col-span-2 border rounded p-4 space-y-4" key={key}>
          <legend className="font-semibold px-2">{title(key)}</legend>
          {entries.map((entry: Row, index: number) => (
            <div className="border rounded p-3 space-y-3" key={index}>
              <div className="flex justify-between text-sm">
                <strong>Line {index + 1}</strong>
                <button
                  type="button"
                  className="text-red-700"
                  onClick={() => set(entries.filter((_: Row, i: number) => i !== index))}
                >
                  Remove
                </button>
              </div>
              <Fields
                schema={resolve(s.items)}
                data={entry}
                resource={resource}
                change={(d) =>
                  set(entries.map((r: Row, i: number) => (i === index ? d : r)))
                }
              />
            </div>
          ))}
          <button
            type="button"
            className="btn-secondary"
            onClick={() => set([...entries, {}])}
          >
            Add line
          </button>
        </fieldset>
      );
    }

    return (
      <div key={key}>
        <div className="flex items-center gap-1.5 mb-1.5">
          <label
            className="block text-xs font-semibold"
            htmlFor={fieldPrefix + '-' + key}
          >
            {labelText}
            {required.includes(key) ? ' *' : ''}
          </label>
          {helpText && (
            <div className="relative group inline-flex items-center">
              <Info size={13} className="text-muted-foreground/70 hover:text-primary transition-colors cursor-help" />
              <div className="absolute left-0 bottom-full mb-1.5 hidden group-hover:block w-64 p-2.5 bg-slate-900 text-slate-100 text-[11px] leading-tight rounded-md shadow-xl z-50 pointer-events-none transition-opacity">
                {helpText}
                <div className="absolute top-full left-2 border-4 border-transparent border-t-slate-900" />
              </div>
            </div>
          )}
        </div>
        {key === 'supplier' ? (
          <SupplierInput value={val} onChange={set} required={required.includes(key)} />
        ) : key === 'project_type' ? (
          <ProjectTypeInput value={val} onChange={set} required={required.includes(key)} />
        ) : key === 'drilling_type' || key === 'drill_type' ? (
          <DrillTypeInput value={val} onChange={set} required={required.includes(key)} />
        ) : key === 'is_recurring' ? (
          <select
            id={fieldPrefix + '-' + key}
            className="input-field text-xs font-medium"
            value={val === true || val === 'true' ? 'true' : 'false'}
            required={required.includes(key)}
            onChange={(e) => {
              const isRec = e.target.value === 'true';
              const next: Row = { ...data, is_recurring: isRec };
              if (isRec && (!data.recurrence_interval_days || Number(data.recurrence_interval_days) <= 0)) {
                next.recurrence_interval_days = 7;
              }
              change(next);
            }}
          >
            <option value="false">One-time Maintenance</option>
            <option value="true">Recurring Maintenance</option>
          </select>
        ) : (key.endsWith('_id') || !!lookup[key]) ? (
          <Reference
            field={key}
            value={val}
            onChange={set}
            required={required.includes(key)}
            resource={resource}
            formData={data}
          />
        ) : s.enum ? (
          <select
            id={fieldPrefix + '-' + key}
            className="input-field text-xs"
            value={val}
            required={required.includes(key)}
            onChange={(e) => set(e.target.value)}
          >
            <option value="">Select…</option>
            {s.enum.map((v: string) => (
              <option value={v} key={v}>
                {title(v.toLowerCase())}
              </option>
            ))}
          </select>
        ) : s.type === 'boolean' ? (
          <input
            id={fieldPrefix + '-' + key}
            type="checkbox"
            checked={!!val}
            onChange={(e) => set(e.target.checked)}
          />
        ) : (
          <input
            id={fieldPrefix + '-' + key}
            className="input-field text-xs"
            value={val}
            placeholder={FIELD_PLACEHOLDERS[key] || s.placeholder || ''}
            type={
              s.format === 'date'
                ? 'date'
                : s.format === 'date-time'
                  ? 'datetime-local'
                  : s.type === 'integer' || s.type === 'number'
                    ? 'number'
                    : 'text'
            }
            step="any"
            min={s.minimum}
            max={s.maximum}
            minLength={s.minLength}
            maxLength={s.maxLength}
            required={required.includes(key)}
            onChange={(e) => set(e.target.value)}
          />
        )}
      </div>
    );
  };

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {primaryFields.map(renderField)}
      </div>

      {additionalFields.length > 0 && (
        <div className="pt-2 border-t border-border">
          <button
            type="button"
            className="text-sm font-semibold text-primary hover:underline flex items-center gap-1 mb-3"
            onClick={() => setAdvanced(!advanced)}
          >
            {advanced ? 'Show fewer fields' : 'Additional details (' + additionalFields.length + ')'}
          </button>

          {advanced && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 fade-in pt-1">
              {additionalFields.map(renderField)}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function clean(data: Row, schema: Row): Row {
  const out: Row = {};
  for (const [key, raw] of Object.entries(schema.properties || {})) {
    const s = resolve(raw as Row);
    const val = data[key] ?? s.default;
    if (val === '' || val == null) continue;
    if (s.type === 'array') out[key] = val.map((v: Row) => clean(v, resolve(s.items)));
    else if (s.format === 'date-time') out[key] = new Date(val).toISOString();
    else if (s.type === 'integer' || s.type === 'number') out[key] = Number(val);
    else out[key] = val;
  }
  return out;
}
export default function RecordForm({
  resource = '',
  operation,
  path,
  initial,
  method,
  onClose,
  onSaved,
  onSuccess,
  title: customTitle,
  allowFile,
  employeeId,
  employeeData,
}: {
  resource?: string;
  operation: Row;
  path: string;
  initial?: Row;
  method?: string;
  onClose?: () => void;
  onSaved?: (row: Row) => void;
  onSuccess?: () => void;
  title?: string;
  allowFile?: boolean;
  employeeId?: string;
  employeeData?: Row;
}) {
  const isEmployeeMainRecord =
    (path === '/api/v1/employees' || /^\/api\/v1\/employees\/[^\/]+$/.test(path)) &&
    !path.includes('/create-issue');
  if (isEmployeeMainRecord) {
    return <EmployeeWizardForm initial={initial} onClose={onClose || (() => {})} onSaved={onSaved || (() => {})} />;
  }
  const isAssetMainRecord =
    path === '/api/v1/assets' || /^\/api\/v1\/assets\/[0-9a-f-]{36}$/i.test(path);
  const isClientMainRecord =
    resource === 'clients' &&
    (path === '/api/v1/clients' || /^\/api\/v1\/clients\/[0-9a-f-]{36}$/i.test(path));
  const isItemMainRecord =
    (resource === 'inventory/items' || resource === 'items') &&
    (path === '/api/v1/inventory/items' || /^\/api\/v1\/inventory\/items\/[0-9a-f-]{36}$/i.test(path));
  const schema = structuredClone(resolve(operation?.schema || {}));
  if (resource === 'employee-assignments' && initial?.id && schema.properties) {
    schema.properties.project_id = {
      type: 'string',
      title: 'Project',
    };
  }
  if (resource === 'projects' && schema.properties) {
    delete schema.properties.notes;
  }
  if (resource === 'positions' && schema.properties) {
    if (!schema.properties.is_supervisory_role) {
      schema.properties.is_supervisory_role = {
        type: 'boolean',
        title: 'Is Supervisory Role',
        default: false,
      };
    }
  }
  if (isClientMainRecord && schema.properties) {
    delete schema.properties.profile_photo_url;
  }
  if (isItemMainRecord && schema.properties) {
    delete schema.properties.image_url;
  }
  if (schema.properties) {
    delete schema.properties.file_url;
    delete schema.properties.file_name;
    delete schema.properties.mime_type;
    delete schema.properties.file_size;
    delete schema.properties.file_hash;
    delete schema.properties.evidence_photo_url;
  }
  if (isAssetMainRecord && schema.properties) {
    delete schema.properties.photo_url;
    delete schema.properties.profile_photo_url;
  }

  const assetMatch = path.match(
    /^\/api\/v1\/assets\/([0-9a-f-]{36})\/([^/]+)(?:\/([^/]+))?(?:\/status)?$/i
  );
  const logTypes: Record<string, string> = {
    maintenance: 'MAINTENANCE',
    'fuel-logs': 'FUEL',
    'fuel-reductions': 'FUEL_REDUCTION',
    inspections: 'INSPECTION',
    'meter-readings': 'METER',
    defects: 'DEFECT',
  };
  const logType = assetMatch ? logTypes[assetMatch[2]] : undefined;
  const hasAssetDocument = !!assetMatch && !!schema.properties?.document_id;
  if (hasAssetDocument) delete schema.properties.document_id;
  const supportsAssetFiles =
    allowFile ||
    !!logType ||
    hasAssetDocument ||
    resource.includes('receipts') ||
    resource.includes('defect') ||
    path.includes('defect');
  const kind = resource.replace('inventory/', '');
  if (schema.properties?.items && resource.startsWith('inventory/')) {
    const base = [
      'transaction_date',
      'project_id',
      'asset_id',
      'employee_id',
      'reason',
      'notes',
      'reference_number',
      'items',
    ];
    const extra: Row = {
      receipts: ['store_id', 'supplier_id', 'purpose'],
      issues: ['store_id', 'purpose', 'request_id', 'reservation_id', 'expected_return_at'],
      returns: ['store_id', 'original_issue_id', 'condition'],
      transfers: ['from_store_id', 'to_store_id'],
      requests: ['store_id', 'purpose', 'priority', 'needed_by_date'],
      adjustments: ['store_id', 'purpose'],
      'stock-counts': ['store_id', 'count_type'],
    };
    schema.properties = Object.fromEntries(
      Object.entries(schema.properties).filter(([k]) =>
        [...base, ...(extra[kind] || [])].includes(k)
      )
    );
    const purposes: Row = {
      receipts: ['PURCHASE_RECEIPT', 'OPENING_BALANCE', 'OTHER_RECEIPT'],
      issues: [
        'PROJECT_CONSUMPTION',
        'ASSET_CONSUMPTION',
        'EMPLOYEE_USE',
        'MAINTENANCE',
        'PPE',
        'TOOLS',
        'OFFICE_USE',
        'CAMP_USE',
        'OTHER',
      ],
      requests: ['PROJECT_CONSUMPTION', 'ASSET_CONSUMPTION', 'EMPLOYEE_USE', 'OTHER'],
      adjustments: [
        'POSITIVE_ADJUSTMENT',
        'NEGATIVE_ADJUSTMENT',
        'DAMAGE',
        'LOSS',
        'WRITE_OFF',
        'QUARANTINE',
        'RELEASE_FROM_QUARANTINE',
      ],
    };
    if (schema.properties.purpose && purposes[kind])
      schema.properties.purpose = {
        type: 'string',
        enum: purposes[kind],
        default: purposes[kind][0],
      };
    schema.required = [
      ...(schema.required || []),
      ...(kind === 'transfers'
        ? ['from_store_id', 'to_store_id']
        : kind === 'requests'
          ? []
          : ['store_id']),
      ...(kind === 'returns' ? ['original_issue_id'] : kind === 'adjustments' ? ['reason'] : []),
    ];
  }
  const [data, setData] = useState<Row>(initial || {});

  useEffect(() => {
    if (resource === 'projects' && !initial?.id && !data.contract_number) {
      const year = new Date().getFullYear();
      const randomNum = Math.floor(1000 + Math.random() * 9000);
      const autoContract = `CNT-${year}-${randomNum}`;
      setData((prev) => ({ ...prev, contract_number: autoContract }));
    }

    const isAssignment = resource === 'employee-assignments' || path.includes('/assignments');
    if (isAssignment && !initial?.id) {
      const applyEmployeeDefaults = (emp: Row) => {
        const posId = emp.position_id || (emp.position && typeof emp.position === 'object' ? emp.position.id : null);
        const posTitle = emp.job_title || emp.position_name || (typeof emp.position === 'string' ? emp.position : emp.position?.name) || '';

        setData((prev) => ({
          ...prev,
          position_id: prev.position_id || posId || prev.position_id,
          role_on_project: prev.role_on_project || posTitle || prev.role_on_project,
        }));
      };

      if (employeeData) {
        applyEmployeeDefaults(employeeData);
      } else if (employeeId) {
        apiFetch<Row>(`/api/v1/employees/${employeeId}`)
          .then((emp) => {
            if (emp) applyEmployeeDefaults(emp);
          })
          .catch(() => {});
      }
    }
  }, [resource, path, initial, employeeData, employeeId]);

  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [attachments, setAttachments] = useState<File[]>([]);
  const [uploadedCount, setUploadedCount] = useState(0);
  const [savedRecord, setSavedRecord] = useState<Row | null>(null);
  const [savedDocument, setSavedDocument] = useState<Row | null>(null);
  const [savedAsset, setSavedAsset] = useState<Row | null>(null);
  const [savedPhoto, setSavedPhoto] = useState<Row | null>(null);
  const [savedClient, setSavedClient] = useState<Row | null>(null);
  const [savedItem, setSavedItem] = useState<Row | null>(null);
  const isAssignmentEdit = resource === 'employee-assignments' && !!initial?.id;
  const [deleteBusy, setDeleteBusy] = useState(false);
  const deleteAssignment = async () => {
    if (!isAssignmentEdit || !window.confirm('Cancel this assignment? Its history will be preserved.')) return;
    setDeleteBusy(true);
    try {
      const result = await apiFetch(path, { method: 'DELETE' });
      onSaved?.(result as Row);

    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not cancel assignment.');
    } finally {
      setDeleteBusy(false);
    }
  };
  const modalName = customTitle || (initial ? 'Edit ' : 'New ') + title(resource.split('/').pop()!);
  async function submit(e: FormEvent) {
    e.preventDefault();
    if (busy) return;
    setBusy(true);
    setError('');
    try {
      const body = clean(data, schema);
      if (resource === 'projects') {
        if (body.drilling_type) saveDrillType(String(body.drilling_type));
        if (body.project_type) saveProjectType(String(body.project_type));
      }
      let result: Row;
      if (supportsAssetFiles && assetMatch) {
        const root = '/api/v1/assets/' + assetMatch[1];
        let document = savedDocument;
        if (hasAssetDocument && attachments[0] && !document) {
          const upload = new FormData();
          upload.append('file', attachments[0]);
          upload.append('title', attachments[0].name);
          document = await apiFetch<Row>(root + '/documents/upload', {
            method: 'POST',
            body: upload,
          });
          setSavedDocument(document);
        }
        if (document) body.document_id = document.id;
        else if (hasAssetDocument && initial?.document_id) body.document_id = initial.document_id;
        result =
          savedRecord ||
          (await apiFetch<Row>(path, {
            method: method || (initial?.id ? 'PATCH' : 'POST'),
            body: JSON.stringify(body),
          }));
        setSavedRecord(result);
        if (logType && !hasAssetDocument) {
          for (let index = uploadedCount; index < attachments.length; index++) {
            const upload = new FormData();
            upload.append('file', attachments[index]);
            upload.append('title', attachments[index].name);
            await apiFetch(root + '/logs/' + logType + '/' + result.id + '/files', {
              method: 'POST',
              body: upload,
            });
            setUploadedCount(index + 1);
          }
        }
        if (onSaved) onSaved(result);
        if (onSuccess) onSuccess();
        return;
      }
      if (isAssetMainRecord) {
        result =
          savedAsset ||
          (await apiFetch<Row>(path, {
            method: method || (initial?.id ? 'PATCH' : 'POST'),
            body: JSON.stringify(body),
          }));
        setSavedAsset(result);
        if (file) {
          let media = savedPhoto;
          if (!media) {
            const upload = new FormData();
            upload.append('file', file);
            upload.append('caption', result.name || 'Asset photo');
            media = await apiFetch<Row>('/api/v1/assets/' + result.id + '/media/upload', {
              method: 'POST',
              body: upload,
            });
            setSavedPhoto(media);
          }
          await apiFetch('/api/v1/asset-media/' + media.id + '/set-primary', { method: 'POST' });
        }
        if (onSaved) onSaved(result);
        if (onSuccess) onSuccess();
        return;
      }
      if (isClientMainRecord) {
        result =
          savedClient ||
          (await apiFetch<Row>(path, {
            method: method || (initial?.id ? 'PATCH' : 'POST'),
            body: JSON.stringify(body),
          }));
        setSavedClient(result);
        if (file) {
          const upload = new FormData();
          upload.append('file', file);
          result = await apiFetch<Row>('/api/v1/clients/' + result.id + '/logo', {
            method: 'POST',
            body: upload,
          });
        }
        if (onSaved) onSaved(result);
        if (onSuccess) onSuccess();
        return;
      }
      if (isItemMainRecord) {
        result =
          savedItem ||
          (await apiFetch<Row>(path, {
            method: method || (initial?.id ? 'PATCH' : 'POST'),
            body: JSON.stringify(body),
          }));
        setSavedItem(result);
        if (file) {
          const upload = new FormData();
          upload.append('file', file);
          const photoRes = await apiFetch<Row>('/api/v1/inventory/items/' + result.id + '/photo', {
            method: 'POST',
            body: upload,
          });
          if (photoRes?.image_url) {
            result = { ...result, image_url: photoRes.image_url };
          }
        }
        if (onSaved) onSaved(result);
        if (onSuccess) onSuccess();
        return;
      }
      const isUploadEndpoint =
        path.includes('/upload') ||
        path.includes('/resumes') ||
        resource.includes('upload') ||
        resource.includes('resumes');

      if (isUploadEndpoint) {
        if (!file && !initial?.id) {
          setError('Please select a file to upload.');
          setBusy(false);
          return;
        }
        const form = new FormData();
        if (file) {
          form.append('file', file);
        }
        for (const [k, v] of Object.entries(body)) {
          if (v !== null && v !== undefined && v !== '') {
            form.append(k, String(v));
          }
        }
        if (!body.title && file?.name) {
          form.append('title', file.name);
        }
        result = await apiFetch(path, { method: 'POST', body: form });
        if (onSaved) onSaved(result);
        if (onSuccess) onSuccess();
        return;
      }

      if (file && resource === 'hr/me/leave-requests') {
        const form = new FormData();
        for (const [k, v] of Object.entries(body)) form.append(k, String(v));
        form.append('file', file);
        result = await apiFetch(path + '/upload', { method: 'POST', body: form });
      } else {
        result = await apiFetch(path, {
          method: method || (initial?.id ? 'PATCH' : 'POST'),
          body: JSON.stringify(body),
        });
        if (attachments.length > 0) {
          for (const att of attachments) {
            try {
              const formData = new FormData();
              formData.append('file', att);
              formData.append('title', att.name);
              formData.append('category', 'Receipts');
              await apiFetch('/api/v1/documents', {
                method: 'POST',
                body: formData,
              });
            } catch {}
          }
        }
        if (file && employeeId) {
          try {
            const formData = new FormData();
            formData.append('file', file);
            formData.append(
              'title',
              (customTitle || 'Attachment') +
                ' - ' +
                (result.qualification_name ||
                  result.training_name ||
                  result.license_number ||
                  result.title ||
                  'File')
            );
            formData.append('document_type', 'OTHER');
            await apiFetch(`/api/v1/employees/${employeeId}/documents/upload`, {
              method: 'POST',
              body: formData,
            });
          } catch {}
        }
      }
      if (onSaved) onSaved(result);
      if (onSuccess) onSuccess();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not save.');
    } finally {
      setBusy(false);
    }
  }

  const formExplanations: Record<string, string> = {
    'inventory/receipts': 'Record incoming stock received into inventory stores from suppliers or purchase orders.',
    'inventory/issues': 'Record stock issued and taken out of inventory for projects, equipment, or employee usage.',
    'inventory/adjustments': 'Reconcile recorded stock levels with actual physical counts, breakage, or inventory loss.',
    'inventory/transfers': 'Relocate inventory stock between warehouses, project sites, or storage bins.',
    'inventory/requests': 'Submit formal requisition requests for stock items to be fulfilled from inventory.',
    'inventory/items': 'Manage item catalog records, SKUs, base units of measure, and default reorder thresholds.',
    'inventory/stores': 'Manage physical warehouse facilities, project store locations, and storage bins.',
    'inventory/suppliers': 'Manage vendor details, supplier contacts, lead times, and unit pricing.',
  };
  const formDesc = formExplanations[resource] || formExplanations[resource.replace('inventory/', '')];

  return (
    <Modal name={modalName} onClose={onClose || (() => {})}>
      <form onSubmit={submit} className="space-y-5">
        {formDesc && (
          <p className="text-xs text-primary/90 bg-primary/5 border border-primary/10 rounded-lg p-3 flex items-start gap-2">
            <Info size={15} className="mt-0.5 shrink-0 text-primary" />
            <span>{formDesc}</span>
          </p>
        )}
        <p className="text-sm text-muted-foreground">
          Required fields are marked *. Changes are validated by Cestos before saving.
        </p>
        {path.endsWith('/retire') && (
          <p className="text-sm text-amber-900 bg-amber-50 border border-amber-200 rounded p-3">
            Retirement takes this asset out of service and removes it from the active fleet. All
            logs and assignment history are retained.
          </p>
        )}
        <fieldset disabled={!!savedRecord || busy}>
          <Fields schema={schema} data={data} change={setData} resource={resource} />
        </fieldset>
        {supportsAssetFiles && (
          <label className="block text-xs font-semibold border-t pt-3">
            {hasAssetDocument
              ? 'Document (optional)'
              : 'Attach receipts, reports or photos (optional)'}
            <input
              className="input-field mt-1 text-xs"
              type="file"
              multiple={!hasAssetDocument}
              disabled={!!savedRecord || !!savedDocument || busy}
              accept=".pdf,.doc,.docx,.xls,.xlsx,.txt,.csv,.png,.jpg,.jpeg"
              onChange={(e) => setAttachments(Array.from(e.target.files || []))}
            />
            {initial?.document_id && (
              <span className="block mt-1 font-normal">
                The current document is kept unless you upload a replacement.
              </span>
            )}
            {attachments.length > 0 && (
              <span className="block mt-1 font-normal">
                {attachments.map((f) => f.name).join(', ')}
              </span>
            )}
          </label>
        )}
        {savedRecord && error && (
          <p className="text-sm text-amber-800">
            The record is saved. Retry to upload the remaining files without creating another
            record.
          </p>
        )}
        {isAssetMainRecord && (
          <label className="block text-xs font-semibold border-t pt-3">
            Asset photo (optional)
            <input
              className="input-field mt-1 text-xs"
              type="file"
              accept=".png,.jpg,.jpeg"
              onChange={(e) => {
                setFile(e.target.files?.[0] || null);
                setSavedPhoto(null);
              }}
            />
            <span className="block text-xs font-normal text-muted-foreground mt-1">
              Choose a PNG or JPEG. The photo will be saved with this asset.
            </span>
          </label>
        )}
        {savedAsset && error && (
          <p className="text-sm text-amber-800">
            The asset has been saved. Retry to finish the photo upload without creating another
            asset.
          </p>
        )}
        {isClientMainRecord && (
          <label className="block text-xs font-semibold border-t pt-3">
            Client logo (optional)
            <input
              className="input-field mt-1 text-xs"
              type="file"
              accept=".png,.jpg,.jpeg"
              onChange={(e) => {
                setFile(e.target.files?.[0] || null);
              }}
            />
            <span className="block text-xs font-normal text-muted-foreground mt-1">
              Choose a PNG or JPEG.
              {initial?.profile_photo_url
                ? ' Uploading a new file replaces the current logo.'
                : ' The logo will be saved with this client.'}
            </span>
          </label>
        )}
        {savedClient && error && (
          <p className="text-sm text-amber-800">
            The client has been saved. Retry to finish the logo upload without creating another
            client.
          </p>
        )}
        {isItemMainRecord && (
          <label className="block text-xs font-semibold border-t pt-3">
            Item Image / Photo (Optional)
            <input
              className="input-field mt-1 text-xs"
              type="file"
              accept=".png,.jpg,.jpeg,.webp"
              onChange={(e) => {
                setFile(e.target.files?.[0] || null);
              }}
            />
            <span className="block text-xs font-normal text-muted-foreground mt-1">
              Choose an image file (PNG, JPEG, or WebP).
              {initial?.image_url
                ? ' Uploading a new image will replace the current item photo.'
                : ' The image will be uploaded and saved with this item.'}
            </span>
          </label>
        )}
        {savedItem && error && (
          <p className="text-sm text-amber-800">
            The item has been saved. Retry to finish uploading the photo without creating another item.
          </p>
        )}
        {(allowFile ||
          employeeId ||
          path.includes('/upload') ||
          path.includes('/resumes') ||
          resource === 'employees' ||
          resource === 'hr/me/leave-requests') && (
          <label className="block text-xs font-semibold border-t pt-3">
            {path.includes('/upload') || path.includes('/resumes')
              ? 'Select File to Upload *'
              : 'Attach Supporting File / Certificate (Optional)'}
            <input
              required={path.includes('/upload') || path.includes('/resumes')}
              className="input-field mt-1 text-xs p-1"
              type="file"
              accept=".pdf,.doc,.docx,.png,.jpg,.jpeg,.txt"
              onChange={(e) => setFile(e.target.files?.[0] || null)}
            />
          </label>
        )}
        {error && (
          <p role="alert" className="text-sm text-red-700 bg-red-50 p-3 rounded">
            {error}
          </p>
        )}
        <div className="flex justify-between gap-3 border-t pt-4">
          {isAssignmentEdit ? (
            <button type="button" disabled={busy || deleteBusy} onClick={() => void deleteAssignment()} className="btn-secondary text-xs text-red-700 border-red-200">
              {deleteBusy ? 'Cancelling…' : 'Delete Assignment'}
            </button>
          ) : <span />}
          <div className="flex gap-3">
          <button type="button" className="btn-secondary text-xs" onClick={onClose}>
            Cancel
          </button>
          <button disabled={busy} className="btn-primary text-xs">
            {busy ? 'Saving…' : 'Save Record'}
          </button>
          </div>
        </div>
      </form>
    </Modal>
  );
}
