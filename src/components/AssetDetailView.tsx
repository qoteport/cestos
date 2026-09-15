'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  ArrowLeft,
  Edit,
  Upload,
  Truck,
  MapPin,
  Activity,
  Gauge,
  Fuel,
  Wrench,
  FileText,
  History,
  Plus,
  RefreshCw,
  Archive,
  Shield,
  ArrowRightLeft,
  Download,
  Eye,
  Paperclip,
  AlertTriangle,
  CheckCircle,
} from 'lucide-react';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from 'recharts';
import { apiFetch, apiFetchBlob, downloadBlob } from '@/lib/api';
import { useAuth } from './AuthProvider';
import { useData, State, Row, rows, Table, Facts, Modal, title } from './DataUI';
import { operation } from './ResourceWorkspace';
import RecordForm from './RecordForm';
import AssetAssignmentModal from './AssetAssignmentModal';
import OperationalUpload from './OperationalUpload';
import Icon from '@/components/ui/AppIcon';

const tabs = [
  ['overview', 'Overview', Activity],
  ['maintenance', 'Maintenance', Wrench],
  ['fuel-logs', 'Fuel logs', Fuel],
  ['meter-readings', 'Meter readings', Gauge],
  ['assignments', 'Assignments', ArrowRightLeft],
  ['inspections', 'Inspections', Shield],
  ['defects', 'Defects', Wrench],
  ['components', 'Components', Truck],
  ['documents', 'Documents', FileText],
  ['insurance', 'Insurance', Shield],
  ['registrations', 'Registrations', FileText],
  ['location-history', 'Location history', MapPin],
  ['status-history', 'Status history', History],
  ['activity', 'Activity', Activity],
] as const;
export function formatAssetAuditActivity(act: Row) {
  const rawAction = String(act.action || act.event_type || act.summary || 'asset.updated').toLowerCase();
  const timestamp = act.created_at || act.occurred_at || act.timestamp;

  let titleStr = 'Equipment Details Updated';
  let IconNode: React.ComponentType<{ size?: number; className?: string }> = Edit;
  let badgeColor = 'bg-blue-100 text-blue-800 border-blue-200';

  if (rawAction.includes('created') || rawAction.includes('registered')) {
    titleStr = 'Equipment Registered';
    IconNode = Plus;
    badgeColor = 'bg-emerald-100 text-emerald-800 border-emerald-200';
  } else if (rawAction.includes('assigned') || rawAction.includes('assignment')) {
    titleStr = 'Assigned to Project / Operator';
    IconNode = MapPin;
    badgeColor = 'bg-cyan-100 text-cyan-800 border-cyan-200';
  } else if (rawAction.includes('returned') || rawAction.includes('demobilized')) {
    titleStr = 'Returned / Unassigned';
    IconNode = History;
    badgeColor = 'bg-amber-100 text-amber-800 border-amber-200';
  } else if (rawAction.includes('status') || rawAction.includes('status_changed')) {
    titleStr = 'Operational Status Changed';
    IconNode = Activity;
    badgeColor = 'bg-purple-100 text-purple-800 border-purple-200';
  } else if (rawAction.includes('maintenance')) {
    titleStr = 'Maintenance Task Recorded';
    IconNode = Wrench;
    badgeColor = 'bg-orange-100 text-orange-800 border-orange-200';
  } else if (rawAction.includes('defect')) {
    titleStr = 'Defect / Fault Reported';
    IconNode = AlertTriangle;
    badgeColor = 'bg-rose-100 text-rose-800 border-rose-200';
  } else if (rawAction.includes('meter')) {
    titleStr = 'Meter Reading Logged';
    IconNode = Gauge;
    badgeColor = 'bg-indigo-100 text-indigo-800 border-indigo-200';
  } else if (rawAction.includes('fuel')) {
    titleStr = 'Fuel Entry Recorded';
    IconNode = Fuel;
    badgeColor = 'bg-teal-100 text-teal-800 border-teal-200';
  } else if (rawAction.includes('inspection')) {
    titleStr = 'Safety Inspection Completed';
    IconNode = CheckCircle;
    badgeColor = 'bg-sky-100 text-sky-800 border-sky-200';
  } else {
    titleStr = rawAction
      .split('.')
      .map((s) => s.replace(/_/g, ' '))
      .map((s) => s.charAt(0).toUpperCase() + s.slice(1))
      .join(' ');
  }

  const performedBy =
    act.performed_by_name ||
    act.user_name ||
    act.user_email ||
    (act.user
      ? [act.user.first_name, act.user.last_name].filter(Boolean).join(' ') || act.user.email || act.user.name
      : null) ||
    act.performed_by ||
    'System User';

  let detailsText = '';
  if (act.details && typeof act.details === 'object') {
    const changesArr: string[] = [];
    for (const [key, val] of Object.entries(act.details)) {
      if (key.endsWith('_id') || key === 'id' || key === 'asset_id') continue;
      if (val && typeof val === 'object') {
        const obj = val as Record<string, unknown>;
        if ('old' in obj || 'new' in obj) {
          const oldStr = obj.old != null ? String(obj.old) : 'None';
          const newStr = obj.new != null ? String(obj.new) : 'None';
          changesArr.push(`${title(key)} changed from "${oldStr}" to "${newStr}"`);
        }
      } else if (val != null) {
        changesArr.push(`${title(key)}: ${String(val)}`);
      }
    }
    detailsText = changesArr.join(' · ');
  }

  if (!detailsText && typeof act.details === 'string') {
    detailsText = act.details;
  }
  if (!detailsText && typeof act.description === 'string') {
    detailsText = act.description;
  }
  if (!detailsText && typeof act.notes === 'string') {
    detailsText = act.notes;
  }
  if (!detailsText) {
    detailsText = `${titleStr} recorded by ${performedBy}`;
  }

  return {
    titleStr,
    detailsText,
    performedBy,
    timestamp: timestamp ? new Date(timestamp).toLocaleString() : '—',
    IconNode,
    badgeColor,
  };
}

export default function AssetDetailView({ assetId }: { assetId: string }) {
  const auth = useAuth();
  const root = '/api/v1/assets/' + assetId;
  const overview = useData(root + '/overview');
  const metrics = useData(root + '/operating-metrics');
  const [tab, setTab] = useState('overview');
  const [maintenanceFilter, setMaintenanceFilter] = useState('ALL');
  const [page, setPage] = useState(1);

  const path = root + '/' + tab;
  const allowed = (p: string, method = 'GET') => {
    const op = operation(p, method);
    return !!op && (op.permissions || []).every((code: string) => auth.can(code));
  };
  const records = useData(
    tab !== 'overview' && allowed(path)
      ? path +
          (tab === 'maintenance' || tab === 'fuel-logs' ? '?page=' + page + '&page_size=20' : '')
      : null
  );
  const meters = useData(allowed(root + '/meter-readings') ? root + '/meter-readings' : null);
  const [form, setForm] = useState<{
    path: string;
    name: string;
    operation?: Row;
    initial?: Row;
    method?: 'POST' | 'PATCH';
  } | null>(null);
  const [transfer, setTransfer] = useState(false);
  const [upload, setUpload] = useState<'photo' | 'document' | null>(null);
  const [selected, setSelected] = useState<Row | null>(null);
  const [error, setError] = useState('');
  const [photo, setPhoto] = useState('');
  const [previewFile, setPreviewFile] = useState<{
    id?: string;
    title: string;
    filename: string;
    size_bytes?: number;
    url?: string;
    blob?: Blob;
  } | null>(null);
  const d = overview.data;
  const asset = d?.asset;
  const primary = d?.latest_photos?.find((r: Row) => r.is_primary) || d?.latest_photos?.[0];
  useEffect(() => {
    let active = true;
    let url = '';
    setPhoto('');
    if (primary?.id) {
      apiFetchBlob('/api/v1/asset-media/' + primary.id + '/download')
        .then((blob) => {
          url = URL.createObjectURL(blob);
          if (active) setPhoto(url);
          else URL.revokeObjectURL(url);
        })
        .catch(() => {});
    }
    return () => {
      active = false;
      if (url) URL.revokeObjectURL(url);
    };
  }, [primary?.id]);
  function reload() {
    overview.reload();
    metrics.reload();
    records.reload();
    meters.reload();
  }
const maintenanceCreateOp = {
  schema: {
    type: 'object',
    required: ['title'],
    properties: {
      project_id: { type: 'string', format: 'uuid', title: 'Assigned Project' },
      title: { type: 'string', minLength: 1, maxLength: 200, title: 'Job Title' },
      description: { type: 'string', title: 'Description / Scope of Work' },
      is_recurring: { type: 'boolean', title: 'Maintenance Schedule / Recurrence', default: false },
      recurrence_interval_days: { type: 'number', title: 'Recurrence Interval (Days)', default: 7 },
      maintenance_type: {
        type: 'string',
        enum: ['PREVENTIVE', 'CORRECTIVE', 'INSPECTION', 'SERVICE', 'OTHER'],
        title: 'Maintenance Type',
        default: 'SERVICE',
      },
      priority: {
        type: 'string',
        enum: ['LOW', 'NORMAL', 'HIGH', 'CRITICAL'],
        title: 'Priority',
        default: 'NORMAL',
      },
      scheduled_date: { type: 'string', format: 'date', title: 'Scheduled Date' },
      assigned_employee_id: { type: 'string', format: 'uuid', title: 'Assigned Technician' },
      meter_reading: { type: 'number', title: 'Meter Reading' },
      provider: { type: 'string', title: 'Service Provider / Contractor' },
      cost: { type: 'number', title: 'Maintenance Cost ($)' },
      currency: { type: 'string', title: 'Currency', default: 'USD' },
    },
  },
  permissions: ['assets.update'],
};

const maintenanceEditOp = {
  schema: {
    type: 'object',
    properties: {
      project_id: { type: 'string', format: 'uuid', title: 'Assigned Project' },
      title: { type: 'string', minLength: 1, maxLength: 200, title: 'Job Title' },
      description: { type: 'string', title: 'Description / Scope of Work' },
      is_recurring: { type: 'boolean', title: 'Maintenance Schedule / Recurrence' },
      recurrence_interval_days: { type: 'number', title: 'Recurrence Interval (Days)' },
      maintenance_type: {
        type: 'string',
        enum: ['PREVENTIVE', 'CORRECTIVE', 'INSPECTION', 'SERVICE', 'OTHER'],
        title: 'Maintenance Type',
      },
      priority: {
        type: 'string',
        enum: ['LOW', 'NORMAL', 'HIGH', 'CRITICAL'],
        title: 'Priority',
      },
      scheduled_date: { type: 'string', format: 'date', title: 'Scheduled Date' },
      assigned_employee_id: { type: 'string', format: 'uuid', title: 'Assigned Technician' },
      meter_reading: { type: 'number', title: 'Meter Reading' },
      provider: { type: 'string', title: 'Service Provider / Contractor' },
      cost: { type: 'number', title: 'Maintenance Cost ($)' },
      currency: { type: 'string', title: 'Currency', default: 'USD' },
    },
  },
  permissions: ['assets.update'],
};

const fuelLogEditOp = {
  schema: {
    type: 'object',
    properties: {
      project_id: { type: 'string', format: 'uuid', title: 'Assigned Project' },
      recorded_at: { type: 'string', format: 'date-time', title: 'Recorded At' },
      fuel_type: { type: 'string', enum: ['DIESEL', 'PETROL', 'OTHER'], title: 'Fuel Type' },
      quantity_litres: { type: 'number', title: 'Quantity (Litres)' },
      unit_cost: { type: 'number', title: 'Unit Cost ($)' },
      currency: { type: 'string', title: 'Currency', default: 'USD' },
      meter_reading: { type: 'number', title: 'Meter Reading' },
      supplier: { type: 'string', title: 'Supplier' },
      reference_number: { type: 'string', title: 'Reference / Receipt No.' },
      notes: { type: 'string', title: 'Notes' },
    },
  },
  permissions: ['assets.update'],
};

const assignmentCreateOp = {
  schema: {
    type: 'object',
    required: ['project_id', 'assigned_at'],
    properties: {
      project_id: { type: 'string', format: 'uuid', title: 'Assigned Project' },
      location_id: { type: 'string', format: 'uuid', title: 'Work / Site Location' },
      responsible_employee_id: { type: 'string', format: 'uuid', title: 'Responsible Employee / Supervisor' },
      primary_operator_id: { type: 'string', format: 'uuid', title: 'Primary Operator' },
      assigned_at: { type: 'string', format: 'date-time', title: 'Assignment Date & Time' },
      starting_meter: { type: 'number', title: 'Starting Meter Reading' },
      expected_return_at: { type: 'string', format: 'date', title: 'Expected Return Date' },
      notes: { type: 'string', title: 'Notes / Assignment Purpose' },
    },
  },
  permissions: ['assets.assign'],
};

const assignmentCompleteOp = {
  schema: {
    type: 'object',
    required: ['returned_at'],
    properties: {
      returned_at: { type: 'string', format: 'date-time', title: 'Return Date & Time' },
      ending_meter: { type: 'number', title: 'Ending Meter Reading' },
      notes: { type: 'string', title: 'Completion Notes & Asset Condition' },
    },
  },
  permissions: ['assets.assign'],
};

const defectEditOp = {
  schema: {
    type: 'object',
    properties: {
      severity: {
        type: 'string',
        enum: ['MINOR', 'MAJOR', 'CRITICAL'],
        title: 'Severity',
      },
      status: {
        type: 'string',
        enum: ['OPEN', 'RESOLVED', 'CLOSED'],
        title: 'Status',
      },
      description: { type: 'string', title: 'Defect Description' },
      notes: { type: 'string', title: 'Notes / Action Taken' },
    },
  },
  permissions: ['assets.defects.manage', 'assets.update'],
};

const componentCreateOp = {
  schema: {
    type: 'object',
    required: ['name'],
    properties: {
      parent_component_id: { type: 'string', format: 'uuid', title: 'Parent Component' },
      name: { type: 'string', title: 'Component Name' },
      component_number: { type: 'string', title: 'Component / Serial Number' },
      part_number: { type: 'string', title: 'Part Number' },
      expected_life_cycles: { type: 'number', title: 'Expected Life Cycles' },
      status: {
        type: 'string',
        enum: ['INSTALLED', 'REMOVED', 'MAINTENANCE', 'REPLACED'],
        title: 'Status',
        default: 'INSTALLED',
      },
    },
  },
  permissions: ['assets.update'],
};

const assetEditOp = {
  schema: {
    type: 'object',
    required: ['name'],
    properties: {
      name: { type: 'string', title: 'Asset / Equipment Name' },
      asset_number: { type: 'string', title: 'Asset Tag / Equipment Number' },
      category_id: { type: 'string', format: 'uuid', title: 'Asset Category' },
      manufacturer: { type: 'string', title: 'Manufacturer / Make' },
      model: { type: 'string', title: 'Model' },
      year_of_manufacture: { type: 'integer', title: 'Year of Manufacture' },
      serial_number: { type: 'string', title: 'Serial Number / VIN' },
      chassis_number: { type: 'string', title: 'Chassis Number' },
      engine_manufacturer: { type: 'string', title: 'Engine Manufacturer' },
      engine_model: { type: 'string', title: 'Engine Model' },
      ownership_type: {
        type: 'string',
        enum: ['OWNED', 'LEASED', 'RENTED'],
        title: 'Ownership Type',
        default: 'OWNED',
      },
      status: {
        type: 'string',
        enum: ['OPERATIONAL', 'STANDBY', 'MAINTENANCE', 'BREAKDOWN', 'OUT_OF_SERVICE'],
        title: 'Asset Status',
      },
      meter_type: {
        type: 'string',
        enum: ['HOURS', 'ODOMETER_KM', 'ODOMETER_MILES', 'NONE'],
        title: 'Meter Reading Type',
      },
      current_meter_reading: { type: 'number', title: 'Current Meter Reading' },
      purchase_price: { type: 'number', title: 'Purchase Price / Asset Cost ($)' },
      purchase_currency: { type: 'string', title: 'Purchase Currency', default: 'USD' },
      purchase_date: { type: 'string', format: 'date', title: 'Purchase Date' },
      location_id: { type: 'string', format: 'uuid', title: 'Default Location / Base Site' },
      responsible_employee_id: { type: 'string', format: 'uuid', title: 'Responsible Manager / Engineer' },
    },
  },
  permissions: ['assets.update'],
};

  function resolveTabOperation(p: string, method: string): Row | null {
    if (p === root || p === '/api/v1/assets/' + assetId) {
      return assetEditOp;
    }
    if (p.endsWith('/complete')) {
      return assignmentCompleteOp;
    }
    if (tab === 'assignments') {
      return assignmentCreateOp;
    }
    if (tab === 'maintenance') {
      return method === 'PATCH' ? maintenanceEditOp : maintenanceCreateOp;
    }
    if (tab === 'fuel-logs' && method === 'PATCH') {
      return fuelLogEditOp;
    }
    if (tab === 'defects' && method === 'PATCH') {
      return defectEditOp;
    }
    if (tab === 'components') {
      return componentCreateOp;
    }
    let direct = operation(p, method);
    if (direct && direct.schema && Object.keys(direct.schema).length > 0) return direct;

    const basePath = p.replace(/\/[0-9a-f-]{36}(?:\/[^/]+)?$/i, '');
    direct = operation(basePath, 'POST') || operation(basePath, 'GET');
    if (direct && direct.schema && Object.keys(direct.schema).length > 0) return direct;

    const map: Record<string, string> = {
      maintenance: 'MaintenanceCreate',
      'fuel-logs': 'FuelLogCreate',
      inspections: 'InspectionUpdate',
      assignments: 'AssetAssignmentCreate',
      components: 'AssetComponentCreate',
      documents: 'AssetDocumentCreate',
      insurance: 'AssetInsuranceCreate',
      registrations: 'AssetRegistrationCreate',
      'meter-readings': 'AssetMeterReadingCreate',
      defects: 'AssetDefectCreate',
    };
    const refName = map[tab];
    if (refName) {
      return {
        schema: { $ref: '#/components/schemas/' + refName },
        permissions: ['assets.update'],
      };
    }
    return null;
  }

  function openForm(p: string, name: string, initial?: Row, op?: Row) {
    setSelected(null);
    const isEdit = !!initial;
    const defaults: Row = {};
    const projId = d?.current_project?.id || d?.current_project_id || asset?.current_project_id || asset?.project_id;
    if (projId) defaults.project_id = projId;
    const locId = d?.current_location?.id || d?.location_id || d?.current_location_id || asset?.location_id || asset?.default_location_id;
    if (locId) defaults.location_id = locId;

    const resolvedOp = op || resolveTabOperation(p, isEdit ? 'PATCH' : 'POST');
    const mergedInitial = initial ? { ...defaults, ...initial } : defaults;
    setForm({
      path: p,
      name,
      initial: Object.keys(mergedInitial).length ? mergedInitial : undefined,
      operation: resolvedOp || undefined,
      method: isEdit ? 'PATCH' : 'POST',
    });
  }

  const [selectedAssignmentId, setSelectedAssignmentId] = useState<string>('');
  const [assignmentSummaryData, setAssignmentSummaryData] = useState<Row | null>(null);
  const [logFiles, setLogFiles] = useState<Row[]>([]);
  const [logFileUpload, setLogFileUpload] = useState<boolean>(false);
  const [logFileTitle, setLogFileTitle] = useState('');
  const [logFile, setLogFile] = useState<File | null>(null);
  const [logFileBusy, setLogFileBusy] = useState(false);

  const [fuelReductions, setFuelReductions] = useState<Row[]>([]);
  const [subEntryModalOpen, setSubEntryModalOpen] = useState(false);
  const [subRecordedAt, setSubRecordedAt] = useState('');
  const [subStartDate, setSubStartDate] = useState('');
  const [subEndDate, setSubEndDate] = useState('');
  const [subFuelLeft, setSubFuelLeft] = useState('');
  const [subReason, setSubReason] = useState('Daily Dip Check');
  const [subNotes, setSubNotes] = useState('');
  const [subSubmitting, setSubSubmitting] = useState(false);

  useEffect(() => {
    let active = true;
    if (selected && tab === 'fuel-logs') {
      apiFetch<Row[] | { items: Row[] }>('/api/v1/assets/' + assetId + '/fuel-reductions')
        .then((res) => {
          if (!active) return;
          const list = rows(res).filter(
            (r: Row) => !r.fuel_log_id || String(r.fuel_log_id) === String(selected.id)
          );
          setFuelReductions(list);
        })
        .catch(() => {
          if (active) setFuelReductions([]);
        });
    } else {
      setFuelReductions([]);
    }
    return () => {
      active = false;
    };
  }, [selected, tab, assetId]);

  async function handleCreateSubEntry(e: React.FormEvent) {
    e.preventDefault();
    if (!selected || subSubmitting) return;
    setSubSubmitting(true);
    setError('');

    const fuelLeft = Number(subFuelLeft) || 0;
    const parentLitres = Number(selected.quantity_litres || 0);

    let baseLitres = parentLitres;
    if (fuelReductions.length > 0) {
      const prev = fuelReductions[0];
      if (prev.remaining_litres != null) {
        baseLitres = Number(prev.remaining_litres);
      }
    }

    const litresReduced = Math.max(0, baseLitres - fuelLeft);

    let notesText = subNotes.trim();
    if (subStartDate || subEndDate) {
      const spanText = `[Date Span: ${subStartDate || 'N/A'} to ${subEndDate || 'N/A'}]`;
      notesText = notesText ? `${spanText} ${notesText}` : spanText;
    }

    try {
      await apiFetch('/api/v1/assets/' + assetId + '/fuel-reductions', {
        method: 'POST',
        body: JSON.stringify({
          fuel_log_id: selected.id,
          recorded_at: subRecordedAt ? new Date(subRecordedAt).toISOString() : new Date().toISOString(),
          remaining_litres: fuelLeft,
          litres_reduced: litresReduced,
          reduction_reason: subReason || 'Daily Dip Check',
          notes: notesText || undefined,
        }),
      });

      setSubEntryModalOpen(false);
      setSubFuelLeft('');
      setSubNotes('');
      setSubStartDate('');
      setSubEndDate('');
      reload();

      const res = await apiFetch<Row[] | { items: Row[] }>('/api/v1/assets/' + assetId + '/fuel-reductions');
      const list = rows(res).filter((r: Row) => !r.fuel_log_id || String(r.fuel_log_id) === String(selected.id));
      setFuelReductions(list);
    } catch (err: any) {
      setError(err.message || 'Failed to record fuel sub-entry');
    } finally {
      setSubSubmitting(false);
    }
  }

  useEffect(() => {
    let active = true;
    setLogFiles([]);
    setLogFile(null);
    setLogFileTitle('');
    setLogFileUpload(false);
    if (selected && ['maintenance', 'fuel-logs', 'inspections', 'meter-readings', 'defects'].includes(tab)) {
      const typeMap: Record<string, string> = {
        maintenance: 'MAINTENANCE',
        'fuel-logs': 'FUEL',
        inspections: 'INSPECTION',
        'meter-readings': 'METER',
        defects: 'DEFECT',
      };
      apiFetch<Row[]>(
        '/api/v1/assets/' + assetId + '/logs/' + typeMap[tab] + '/' + selected.id + '/files'
      )
        .then((f) => {
          if (active) setLogFiles(f || []);
        })
        .catch((e) => {
          if (active) setError(e.message);
        });
    } else {
      setLogFiles([]);
    }
    return () => {
      active = false;
    };
  }, [selected, tab, assetId]);

  useEffect(() => {
    if (tab === 'assignments' && selectedAssignmentId) {
      apiFetch<Row>(
        '/api/v1/assets/' + assetId + '/assignments/' + selectedAssignmentId + '/summary'
      )
        .then((s) => setAssignmentSummaryData(s))
        .catch(() => setAssignmentSummaryData(null));
    } else {
      setAssignmentSummaryData(null);
    }
  }, [tab, selectedAssignmentId, assetId]);

  async function handleLogFileUpload(e: React.FormEvent) {
    e.preventDefault();
    if (!selected || !logFile || logFileBusy) return;
    setLogFileBusy(true);
    const typeMap: Record<string, string> = {
      maintenance: 'MAINTENANCE',
      'fuel-logs': 'FUEL',
      inspections: 'INSPECTION',
      'meter-readings': 'METER',
      defects: 'DEFECT',
    };
    try {
      const fd = new FormData();
      fd.append('title', logFileTitle.trim() || logFile.name);
      fd.append('file', logFile);
      await apiFetch(
        '/api/v1/assets/' + assetId + '/logs/' + typeMap[tab] + '/' + selected.id + '/files',
        {
          method: 'POST',
          body: fd,
        }
      );
      setLogFileUpload(false);
      setLogFileTitle('');
      setLogFile(null);
      const f = await apiFetch<Row[]>(
        '/api/v1/assets/' + assetId + '/logs/' + typeMap[tab] + '/' + selected.id + '/files'
      );
      setLogFiles(f || []);
    } catch (err: any) {
      setError(err.message || 'File upload failed');
    } finally {
      setLogFileBusy(false);
    }
  }

  async function handleLogFileView(f: Row) {
    setError('');
    try {
      const blob = await apiFetchBlob(
        '/api/v1/assets/' + assetId + '/log-files/' + f.id + '/download'
      );
      const objectUrl = URL.createObjectURL(blob);
      setPreviewFile({
        id: String(f.id),
        title: f.title || f.file_name || 'Attached Evidence File',
        filename: f.file_name || 'file',
        size_bytes: f.size_bytes,
        url: objectUrl,
        blob,
      });
    } catch (err: any) {
      setError(err.message || 'Unable to load file preview');
    }
  }

  async function handleLogFileDownload(fileId: string, filename: string) {
    try {
      const blob = await apiFetchBlob(
        '/api/v1/assets/' + assetId + '/log-files/' + fileId + '/download'
      );
      downloadBlob(blob, filename);
    } catch (err: any) {
      setError(err.message || 'Download failed');
    }
  }

  async function handleDocumentView(row: Row) {
    setError('');
    try {
      const docId = row.document_id || row.id;
      const blob = await apiFetchBlob(root + '/documents/' + docId + '/download');
      const objectUrl = URL.createObjectURL(blob);
      setPreviewFile({
        id: String(docId),
        title: row.title || row.file_name || 'Asset Document',
        filename: row.file_name || 'document.pdf',
        size_bytes: row.file_size_bytes,
        url: objectUrl,
        blob,
      });
    } catch (e: any) {
      setError(e.message || 'Unable to view document preview');
    }
  }
  async function download(row: Row) {
    setError('');
    try {
      downloadBlob(
        await apiFetchBlob(root + '/documents/' + row.id + '/download'),
        row.file_name || row.title || 'document'
      );
    } catch (e: any) {
      setError(e.message);
    }
  }
  const meterRows = rows(meters.data)
    .filter((r) => r.reading_type === asset?.meter_type)
    .slice()
    .sort((a, b) => a.recorded_at.localeCompare(b.recorded_at))
    .map((r) => ({
      date: new Date(r.recorded_at).toLocaleDateString(),
      reading: Number(r.reading),
    }));
  const monthly = (metrics.data?.fuel_by_month || []).map((r: Row) => ({
    month: new Date(r.month).toLocaleDateString(undefined, { year: 'numeric', month: 'short' }),
    litres: Number(r.litres),
  }));
  const activeMaintenance = (metrics.data?.maintenance_by_status || [])
    .filter((r: Row) => ['OPEN', 'IN_PROGRESS'].includes(r.status))
    .reduce((sum: number, r: Row) => sum + Number(r.count), 0);
  return (
    <div className="space-y-5 fade-in">
      <Link className="text-xs text-primary flex gap-1 items-center" href="/workspace/assets">
        <ArrowLeft size={13} />
        Back to assets
      </Link>
      <State loading={overview.loading} error={overview.error} retry={overview.reload}>
        {asset && (
          <>
            <div className="flex justify-between gap-4 flex-wrap items-center">
              <div>
                <p className="text-xs font-semibold text-primary uppercase tracking-widest">
                  {asset.asset_number}
                </p>
                <h1 className="text-2xl font-bold tracking-tight mt-1">{asset.name}</h1>
                <p className="text-sm text-muted-foreground mt-1">
                  {d.category?.name} · {asset.manufacturer} {asset.model}
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                <button className="btn-secondary text-xs" onClick={reload}>
                  <RefreshCw size={14} />
                  Refresh
                </button>
                {allowed(root, 'PATCH') && (
                  <button
                    className="btn-secondary text-xs"
                    onClick={() => openForm(root, 'Edit asset', asset, assetEditOp)}
                  >
                    <Edit size={14} />
                    Edit asset
                  </button>
                )}
                {asset.is_active &&
                  allowed(root + (d.current_assignment ? '/transfer' : '/assignments'), 'POST') && (
                    <button className="btn-primary text-xs" onClick={() => setTransfer(true)}>
                      <ArrowRightLeft size={14} />
                      {d.current_assignment ? 'Transfer asset' : 'Assign to project'}
                    </button>
                  )}
              </div>
            </div>
            <section className="card p-5">
              <div className="flex flex-col md:flex-row gap-6">
                <div className="w-full md:w-48 shrink-0">
                  <div className="aspect-[4/3] bg-muted rounded-lg overflow-hidden flex items-center justify-center">
                    {photo ? (
                      <img src={photo} alt={asset.name} className="w-full h-full object-cover" />
                    ) : (
                      <Truck size={48} className="text-muted-foreground/50" />
                    )}
                  </div>
                  {allowed(root + '/media/upload', 'POST') && (
                    <button
                      className="btn-secondary text-xs w-full mt-2"
                      onClick={() => setUpload('photo')}
                    >
                      <Upload size={13} />
                      Upload photo
                    </button>
                  )}
                </div>
                <div className="flex-1 space-y-4">
                  <div className="flex flex-wrap gap-2">
                    <span className="badge badge-neutral">{asset.status?.replace(/_/g, ' ')}</span>
                    <span
                      className={'badge ' + (d.is_deployable ? 'badge-active' : 'badge-neutral')}
                    >
                      {d.is_deployable
                        ? 'Available for deployment'
                        : d.operational_availability?.replace(/_/g, ' ') || 'Unavailable'}
                    </span>
                    {!asset.is_active && (
                      <span className="badge badge-neutral">Archived from active fleet</span>
                    )}
                  </div>
                  <div className="grid sm:grid-cols-2 gap-4">
                    <div>
                      <p className="text-xs text-muted-foreground">Current project</p>
                      {d.current_project ? (
                        <Link
                          className="text-sm font-semibold text-primary"
                          href={'/project-command-center?project=' + d.current_project.id}
                        >
                          {d.current_project.name}
                        </Link>
                      ) : (
                        <p className="text-sm mt-1">Unassigned</p>
                      )}
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Current location</p>
                      <p className="text-sm mt-1">{d.current_location?.name || 'Not recorded'}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Primary operator</p>
                      <p className="text-sm mt-1">
                        {d.primary_operator
                          ? [d.primary_operator.first_name, d.primary_operator.last_name].join(' ')
                          : 'Not assigned'}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Responsible employee</p>
                      <p className="text-sm mt-1">
                        {d.responsible_employee
                          ? [
                              d.responsible_employee.first_name,
                              d.responsible_employee.last_name,
                            ].join(' ')
                          : 'Not assigned'}
                      </p>
                    </div>
                  </div>
                  {d.reasons?.length > 0 && (
                    <div className="rounded bg-amber-50 border border-amber-200 p-3 text-xs text-amber-900">
                      <strong>Readiness checks</strong>
                      <ul className="list-disc pl-4 mt-1">
                        {d.reasons.map((r: string) => (
                          <li key={r}>{r}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                  <div className="flex gap-2 flex-wrap">
                    {asset.is_active && allowed(root + '/status', 'POST') && (
                      <button
                        className="btn-secondary text-xs"
                        onClick={() => openForm(root + '/status', 'Change asset status')}
                      >
                        Change status
                      </button>
                    )}
                    {asset.is_active &&
                      auth.can('assets.archive') &&
                      auth.can('assets.status.change') && (
                        <button
                          className="btn-secondary text-xs text-red-700"
                          onClick={() =>
                            openForm(
                              root + '/retire',
                              'Retire asset — close assignments and maintenance first'
                            )
                          }
                        >
                          <Archive size={13} />
                          Retire asset
                        </button>
                      )}
                  </div>
                </div>
              </div>
            </section>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              {[
                [
                  'Current meter',
                  asset.current_meter_reading ?? '—',
                  asset.meter_type?.replace(/_/g, ' '),
                ],
                [
                  'Fuel logged',
                  metrics.loading ? '…' : metrics.error ? '—' : (metrics.data?.fuel_litres ?? 0),
                  'Litres · all recorded logs',
                ],
                [
                  'Open maintenance',
                  metrics.loading ? '…' : metrics.error ? '—' : activeMaintenance,
                  'Open or in progress',
                ],
                [
                  'Open defects',
                  d.open_defects?.length ?? 0,
                  d.meter_status === 'STALE' ? 'Meter reading is stale' : 'Equipment readiness',
                ],
              ].map(([label, value, sub]) => (
                <div className="kpi-card" key={String(label)}>
                  <div className="kpi-label">{label}</div>
                  <div className="kpi-value-sm">{value}</div>
                  <div className="kpi-sub">{sub}</div>
                </div>
              ))}
            </div>
            {metrics.error && (
              <p role="alert" className="text-sm text-red-700">
                Operating metrics: {metrics.error}
              </p>
            )}
            <nav className="tab-nav overflow-x-auto" aria-label="Asset sections">
              {tabs
                .filter(([key]) => key === 'overview' || allowed(root + '/' + key))
                .map(([key, label, Icon]) => (
                  <button
                    key={key}
                    className={
                      'tab-item flex gap-2 items-center whitespace-nowrap ' +
                      (tab === key ? 'active' : '')
                    }
                    onClick={() => {
                      setTab(key);
                      setPage(1);
                    }}
                  >
                    <Icon size={14} />
                    {label}
                  </button>
                ))}
            </nav>
            {tab === 'overview' ? (
              <>
                <div className="grid lg:grid-cols-2 gap-5">
                  <section className="card p-5">
                    <h2 className="section-header mb-4">
                      Meter trend · {asset.meter_type?.replace(/_/g, ' ')}
                    </h2>
                    {meterRows.length ? (
                      <div className="h-56">
                        <ResponsiveContainer width="100%" height="100%">
                          <LineChart data={meterRows}>
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis dataKey="date" tick={{ fontSize: 10 }} />
                            <YAxis tick={{ fontSize: 10 }} />
                            <Tooltip />
                            <Line
                              type="monotone"
                              dataKey="reading"
                              stroke="#1B4F8A"
                              strokeWidth={2}
                            />
                          </LineChart>
                        </ResponsiveContainer>
                      </div>
                    ) : (
                      <p className="text-sm text-muted-foreground py-16 text-center">
                        No meter readings recorded.
                      </p>
                    )}
                  </section>
                  <section className="card p-5">
                    <h2 className="section-header mb-4">Fuel logged by month · litres</h2>
                    {monthly.length ? (
                      <div className="h-56">
                        <ResponsiveContainer width="100%" height="100%">
                          <BarChart data={monthly}>
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis dataKey="month" tick={{ fontSize: 10 }} />
                            <YAxis tick={{ fontSize: 10 }} />
                            <Tooltip />
                            <Bar dataKey="litres" fill="#E8530A" radius={[4, 4, 0, 0]} />
                          </BarChart>
                        </ResponsiveContainer>
                      </div>
                    ) : (
                      <p className="text-sm text-muted-foreground py-16 text-center">
                        No fuel logs recorded.
                      </p>
                    )}
                  </section>
                </div>
                <section className="card p-5">
                  <h2 className="section-header mb-5">Asset specifications & ownership</h2>
                  <Facts
                    data={Object.fromEntries(
                      Object.entries(asset).filter(
                        ([k]) => !['photo_url', 'profile_photo_url'].includes(k)
                      )
                    )}
                  />
                </section>
              </>
            ) : (
              <section className="card overflow-hidden">
                <header className="flex justify-between p-4 border-b gap-2 flex-wrap items-center">
                  <h2 className="section-header">{title(tab)}</h2>
                  <div className="flex gap-2 flex-wrap items-center">
                    {tab === 'fuel-logs' && allowed(root + '/fuel-reductions', 'POST') && (
                      <button
                        className="btn-secondary text-xs"
                        onClick={() =>
                          openForm(
                            root + '/fuel-reductions',
                            'Record fuel reduction / daily consumption'
                          )
                        }
                      >
                        <Fuel size={13} />
                        Record fuel reduction
                      </button>
                    )}
                    {tab === 'documents'
                      ? allowed(root + '/documents/upload', 'POST') && (
                          <button
                            className="btn-primary text-xs"
                            onClick={() => setUpload('document')}
                          >
                            <Upload size={13} />
                            Upload document
                          </button>
                        )
                      : tab === 'assignments'
                        ? d.current_assignment &&
                          allowed(
                            '/api/v1/asset-assignments/' + d.current_assignment.id + '/complete',
                            'POST'
                          ) && (
                            <button
                              className="btn-secondary text-xs"
                              onClick={() =>
                                openForm(
                                  '/api/v1/asset-assignments/' +
                                    d.current_assignment.id +
                                    '/complete',
                                  'Complete assignment'
                                )
                              }
                            >
                              Complete assignment
                            </button>
                          )
                        : asset.is_active &&
                          allowed(path, 'POST') && (
                            <button
                              className="btn-primary text-xs"
                              onClick={() => openForm(path, 'Add ' + title(tab).toLowerCase())}
                            >
                              <Plus size={13} />
                              Add record
                            </button>
                          )}
                  </div>
                </header>
                <State loading={records.loading} error={records.error} retry={records.reload}>
                  {tab === 'maintenance' && (
                    <div className="p-4 border-b bg-muted/30 space-y-4">
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                        <div className="card p-3 bg-white border border-border">
                          <span className="text-2xs font-semibold text-muted-foreground uppercase block">
                            Total Maintenance Jobs
                          </span>
                          <span className="text-lg font-bold text-foreground">
                            {rows(records.data).length}
                          </span>
                        </div>
                        <div className="card p-3 bg-white border border-border">
                          <span className="text-2xs font-semibold text-muted-foreground uppercase block">
                            Recurring Schedules
                          </span>
                          <span className="text-lg font-bold text-blue-700">
                            {rows(records.data).filter((r: Row) => r.is_recurring).length}
                          </span>
                        </div>
                        <div className="card p-3 bg-white border border-border">
                          <span className="text-2xs font-semibold text-muted-foreground uppercase block">
                            In Progress Jobs
                          </span>
                          <span className="text-lg font-bold text-amber-700">
                            {rows(records.data).filter((r: Row) => String(r.status || '').toUpperCase() === 'IN_PROGRESS').length}
                          </span>
                        </div>
                        <div className="card p-3 bg-white border border-border">
                          <span className="text-2xs font-semibold text-muted-foreground uppercase block">
                            Completed Jobs
                          </span>
                          <span className="text-lg font-bold text-emerald-700">
                            {
                              rows(records.data).filter((r: Row) =>
                                ['COMPLETED', 'RESOLVED', 'CLOSED', 'POSTED'].includes(
                                  String(r.status || '').toUpperCase()
                                )
                              ).length
                            }
                          </span>
                        </div>
                      </div>
                      <div className="flex items-center justify-between flex-wrap gap-2">
                        <div className="flex items-center gap-2">
                          <label className="text-xs font-semibold text-muted-foreground">Filter Maintenance View:</label>
                          <select
                            className="input-field text-xs font-medium max-w-xs"
                            value={maintenanceFilter}
                            onChange={(e) => setMaintenanceFilter(e.target.value)}
                          >
                            <option value="ALL">All Maintenance Records</option>
                            <option value="RECURRING">Recurring Maintenance Schedules</option>
                            <option value="IN_PROGRESS">In Progress Jobs</option>
                            <option value="SCHEDULED">Scheduled / Open</option>
                            <option value="COMPLETED">Completed Jobs</option>
                          </select>
                        </div>
                      </div>
                    </div>
                  )}
                  {tab === 'assignments' && rows(records.data).length > 0 && (
                    <div className="p-4 border-b bg-muted/30 space-y-4">
                      <div className="flex items-center gap-3 flex-wrap">
                        <label className="text-xs font-semibold text-muted-foreground">
                          Filter operational costs by assignment:
                        </label>
                        <select
                          className="input-field text-xs max-w-md"
                          value={selectedAssignmentId}
                          onChange={(e) => setSelectedAssignmentId(e.target.value)}
                        >
                          <option value="">All assignments (Select to view site costs)</option>
                          {rows(records.data).map((a: Row) => (
                            <option key={a.id} value={a.id}>
                              {a.project_name || a.project?.name || 'Project Assignment'}
                              {a.location_name || a.location?.name ? ` · ${a.location_name || a.location?.name}` : ''} (
                              {a.assigned_at ? new Date(a.assigned_at).toLocaleDateString() : ''} -{' '}
                              {a.returned_at
                                ? new Date(a.returned_at).toLocaleDateString()
                                : 'Present'}
                              )
                            </option>
                          ))}
                        </select>
                      </div>
                      {assignmentSummaryData && (
                        <div className="card p-4 bg-white border border-primary/20 space-y-3">
                          <div className="flex justify-between items-center border-b pb-2">
                            <h3 className="text-xs font-bold uppercase tracking-wider text-primary">
                              Assignment Site Cost Summary
                            </h3>
                            <span className="badge badge-active text-xs">
                              Selected Assignment Period
                            </span>
                          </div>
                          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                            <div className="bg-muted/40 p-2.5 rounded">
                              <span className="text-muted-foreground block">Fuel Consumed</span>
                              <strong className="text-sm font-semibold">
                                {assignmentSummaryData.fuel_litres || 0} Litres
                              </strong>
                              {assignmentSummaryData.fuel_cost != null && (
                                <span className="block text-muted-foreground mt-0.5">
                                  ${Number(assignmentSummaryData.fuel_cost).toFixed(2)}
                                </span>
                              )}
                            </div>
                            <div className="bg-muted/40 p-2.5 rounded">
                              <span className="text-muted-foreground block">Maintenance Cost</span>
                              <strong className="text-sm font-semibold">
                                {assignmentSummaryData.maintenance_count || 0} Jobs
                              </strong>
                              {assignmentSummaryData.maintenance_cost != null && (
                                <span className="block text-muted-foreground mt-0.5">
                                  ${Number(assignmentSummaryData.maintenance_cost).toFixed(2)}
                                </span>
                              )}
                            </div>
                            <div className="bg-muted/40 p-2.5 rounded">
                              <span className="text-muted-foreground block">Meter Usage</span>
                              <strong className="text-sm font-semibold">
                                Start: {assignmentSummaryData.start_meter ?? '—'}
                              </strong>
                              <span className="block text-muted-foreground mt-0.5">
                                End: {assignmentSummaryData.end_meter ?? 'Current'}
                              </span>
                            </div>
                            <div className="bg-muted/40 p-2.5 rounded">
                              <span className="text-muted-foreground block">Inspections Done</span>
                              <strong className="text-sm font-semibold">
                                {assignmentSummaryData.inspections_count || 0} Inspections
                              </strong>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                  {tab === 'location-history' ? (
                    <div className="p-4 space-y-6">
                      <div className="card p-5 bg-gradient-to-r from-blue-50/80 via-indigo-50/50 to-white border border-blue-200/60 shadow-sm space-y-4">
                        <div className="flex justify-between items-start flex-wrap gap-3">
                          <div className="flex items-center gap-3">
                            <div className="p-3 bg-blue-600 text-white rounded-xl shadow-md">
                              <MapPin size={24} />
                            </div>
                            <div>
                              <span className="text-2xs uppercase tracking-wider text-blue-700 font-bold block">
                                Current Registered Location
                              </span>
                              <h3 className="text-lg font-bold text-slate-900 mt-0.5">
                                {d?.current_location?.name || asset?.current_location?.name || 'Unassigned / In Transit'}
                              </h3>
                              {d?.current_location?.address && (
                                <p className="text-xs text-muted-foreground mt-0.5">{d.current_location.address}</p>
                              )}
                            </div>
                          </div>
                          {d?.current_location?.latitude != null && d?.current_location?.longitude != null && (
                            <div className="bg-white/90 border border-blue-200 px-3 py-2 rounded-lg text-xs font-mono font-medium text-blue-900 shadow-xs flex items-center gap-2">
                              <MapPin size={14} className="text-blue-600" />
                              <span>
                                {Number(d.current_location.latitude).toFixed(4)}° N, {Number(d.current_location.longitude).toFixed(4)}° E
                              </span>
                            </div>
                          )}
                        </div>

                        <div className="border border-blue-200/80 rounded-xl bg-white p-4 overflow-hidden relative shadow-inner">
                          <div className="flex items-center justify-between text-xs mb-3 border-b pb-2">
                            <span className="font-semibold text-slate-700 uppercase tracking-wider text-[11px] flex items-center gap-1.5">
                              <MapPin size={13} className="text-blue-600" />
                              Geographic Site Location Map
                            </span>
                            <span className="text-muted-foreground text-[11px]">
                              {d?.current_project?.name || 'Active Assignment Site'}
                            </span>
                          </div>
                          <div className="h-44 bg-slate-900 rounded-lg relative overflow-hidden flex items-center justify-center p-4 text-white">
                            <div className="absolute inset-0 bg-[radial-gradient(#38bdf8_1px,transparent_1px)] [background-size:16px_16px] opacity-20" />
                            <div className="relative z-10 text-center space-y-2 max-w-sm">
                              <div className="inline-flex p-3 bg-blue-500/20 backdrop-blur border border-blue-400/30 rounded-full text-blue-300 animate-pulse">
                                <MapPin size={28} />
                              </div>
                              <h4 className="font-bold text-sm text-white">
                                {d?.current_location?.name || asset?.current_location?.name || 'Location Coordinates'}
                              </h4>
                              {d?.current_location?.latitude != null && d?.current_location?.longitude != null ? (
                                <div className="inline-block bg-blue-950/80 border border-blue-500/30 px-3 py-1 rounded text-xs font-mono text-blue-200">
                                  Lat: {d.current_location.latitude}, Lng: {d.current_location.longitude}
                                </div>
                              ) : (
                                <p className="text-xs text-slate-400 italic">
                                  Coordinates logged on transfer history timeline below
                                </p>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>

                      <div className="space-y-3">
                        <div className="flex items-center justify-between border-b pb-2">
                          <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
                            <History size={14} />
                            Location Transfer & Movement History ({rows(records.data).length})
                          </h3>
                        </div>

                        {rows(records.data).length === 0 ? (
                          <div className="text-center py-8 text-muted-foreground text-xs italic bg-white rounded-lg border">
                            No location transfers or history records logged yet.
                          </div>
                        ) : (
                          <div className="relative pl-6 border-l-2 border-blue-200 space-y-6 my-4">
                            {rows(records.data).map((r: Row, idx: number) => (
                              <div key={r.id || idx} className="relative group">
                                <div className="absolute -left-[31px] top-1.5 w-4 h-4 rounded-full bg-blue-600 border-4 border-white shadow-sm ring-1 ring-blue-300" />
                                <div className="bg-white rounded-xl border p-4 shadow-2xs hover:shadow-xs transition space-y-3">
                                  <div className="flex justify-between items-start flex-wrap gap-2">
                                    <div>
                                      <div className="flex items-center gap-2">
                                        <span className="badge badge-active text-[11px] uppercase tracking-wider font-semibold">
                                          {r.event_type?.replace(/_/g, ' ') || 'LOCATION CHANGE'}
                                        </span>
                                        {r.recorded_at && (
                                          <span className="text-xs text-muted-foreground font-medium">
                                            {new Date(r.recorded_at).toLocaleString()}
                                          </span>
                                        )}
                                      </div>
                                      <h4 className="text-sm font-bold text-slate-900 mt-1 flex items-center gap-1.5">
                                        <MapPin size={14} className="text-blue-600 shrink-0" />
                                        {r.location_name || r.location?.name || 'Location Event'}
                                      </h4>
                                    </div>
                                    {r.meter_reading != null && (
                                      <div className="text-right bg-muted/40 px-2.5 py-1 rounded border text-xs">
                                        <span className="text-2xs text-muted-foreground block font-semibold uppercase">Meter Reading</span>
                                        <span className="font-bold text-foreground">
                                          {r.meter_reading} {asset?.meter_type?.replace(/_/g, ' ') || ''}
                                        </span>
                                      </div>
                                    )}
                                  </div>

                                  <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-2.5 text-xs pt-1">
                                    {r.project_name && (
                                      <div className="bg-slate-50 p-2.5 rounded border">
                                        <span className="text-muted-foreground text-[11px] block">Project / Work Site</span>
                                        <span className="font-semibold text-slate-800">{r.project_name}</span>
                                      </div>
                                    )}
                                    {(r.latitude != null || r.longitude != null) && (
                                      <div className="bg-slate-50 p-2.5 rounded border">
                                        <span className="text-muted-foreground text-[11px] block">Coordinates</span>
                                        <span className="font-mono font-medium text-blue-700">
                                          {r.latitude}° N, {r.longitude}° E
                                        </span>
                                      </div>
                                    )}
                                    {r.recorded_by_name && (
                                      <div className="bg-slate-50 p-2.5 rounded border">
                                        <span className="text-muted-foreground text-[11px] block">Recorded By</span>
                                        <span className="font-medium text-slate-800">{r.recorded_by_name}</span>
                                      </div>
                                    )}
                                  </div>

                                  {r.notes && (
                                    <p className="text-xs text-slate-600 bg-blue-50/40 p-2.5 rounded border border-blue-100 italic">
                                      "{r.notes}"
                                    </p>
                                  )}
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  ) : tab === 'status-history' ? (
                    <div className="p-4 space-y-6">
                      <div className="card p-5 bg-gradient-to-r from-amber-50/80 via-orange-50/40 to-white border border-amber-200/60 shadow-sm space-y-3">
                        <div className="flex justify-between items-center flex-wrap gap-3">
                          <div className="flex items-center gap-3">
                            <div className="p-3 bg-amber-600 text-white rounded-xl shadow-md">
                              <Activity size={24} />
                            </div>
                            <div>
                              <span className="text-2xs uppercase tracking-wider text-amber-700 font-bold block">
                                Current Equipment Operational Status
                              </span>
                              <div className="flex items-center gap-2 mt-1">
                                <span
                                  className={`badge text-sm py-1 px-3 ${
                                    asset?.status === 'OPERATING' ?'badge-active'
                                      : asset?.status === 'AVAILABLE' ?'badge-standby'
                                        : asset?.status === 'BREAKDOWN' ?'badge-breakdown'
                                          : asset?.status === 'MAINTENANCE' ?'badge-maintenance' :'badge-neutral'
                                  }`}
                                >
                                  {asset?.status?.replace(/_/g, ' ') || 'UNKNOWN'}
                                </span>
                              </div>
                            </div>
                          </div>
                          <div className="text-right bg-white/90 border px-3 py-2 rounded-lg text-xs">
                            <span className="text-muted-foreground block text-[11px]">Total Status Transitions</span>
                            <strong className="text-base font-bold text-slate-900">{rows(records.data).length} Logged</strong>
                          </div>
                        </div>
                      </div>

                      <div className="space-y-3">
                        <div className="flex items-center justify-between border-b pb-2">
                          <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
                            <History size={14} />
                            Status Progression & State Change History ({rows(records.data).length})
                          </h3>
                        </div>

                        {rows(records.data).length === 0 ? (
                          <div className="text-center py-8 text-muted-foreground text-xs italic bg-white rounded-lg border">
                            No status change history recorded for this equipment yet.
                          </div>
                        ) : (
                          <div className="relative pl-6 border-l-2 border-amber-300 space-y-6 my-4">
                            {rows(records.data).map((r: Row, idx: number) => (
                              <div key={r.id || idx} className="relative group">
                                <div className="absolute -left-[31px] top-1.5 w-4 h-4 rounded-full bg-amber-500 border-4 border-white shadow-sm ring-1 ring-amber-300" />
                                <div className="bg-white rounded-xl border p-4 shadow-2xs hover:shadow-xs transition space-y-3">
                                  <div className="flex justify-between items-start flex-wrap gap-2">
                                    <div className="space-y-1">
                                      <span className="text-xs text-muted-foreground font-medium block">
                                        {r.changed_at ? new Date(r.changed_at).toLocaleString() : '—'}
                                      </span>

                                      <div className="flex items-center gap-2 flex-wrap pt-0.5">
                                        <span className="badge badge-neutral text-xs">
                                          {r.previous_status?.replace(/_/g, ' ') || 'INITIAL STATE'}
                                        </span>
                                        <span className="text-amber-600 font-bold text-xs">➔</span>
                                        <span
                                          className={`badge text-xs ${
                                            r.new_status === 'OPERATING' ?'badge-active'
                                              : r.new_status === 'AVAILABLE' ?'badge-standby'
                                                : r.new_status === 'BREAKDOWN' ?'badge-breakdown'
                                                  : r.new_status === 'MAINTENANCE' ?'badge-maintenance' :'badge-neutral'
                                          }`}
                                        >
                                          {r.new_status?.replace(/_/g, ' ') || 'NEW STATUS'}
                                        </span>
                                      </div>
                                    </div>

                                    {r.changed_by_name && (
                                      <div className="text-right bg-muted/40 px-2.5 py-1 rounded border text-xs">
                                        <span className="text-2xs text-muted-foreground block font-semibold uppercase">Changed By</span>
                                        <span className="font-semibold text-slate-800">{r.changed_by_name}</span>
                                      </div>
                                    )}
                                  </div>

                                  <div className="grid sm:grid-cols-2 gap-2.5 text-xs pt-1">
                                    {r.project_name && (
                                      <div className="bg-slate-50 p-2.5 rounded border">
                                        <span className="text-muted-foreground text-[11px] block">Project Context</span>
                                        <span className="font-semibold text-slate-800">{r.project_name}</span>
                                      </div>
                                    )}
                                    {r.location_name && (
                                      <div className="bg-slate-50 p-2.5 rounded border">
                                        <span className="text-muted-foreground text-[11px] block">Location Site</span>
                                        <span className="font-semibold text-slate-800">{r.location_name}</span>
                                      </div>
                                    )}
                                  </div>

                                  {r.reason && (
                                    <div className="bg-amber-50/50 p-3 rounded-lg border border-amber-200/60 text-xs text-slate-700 space-y-1">
                                      <span className="font-semibold text-amber-900 text-[11px] block uppercase tracking-wider">
                                        Reason / Trigger Notes
                                      </span>
                                      <p className="leading-relaxed whitespace-pre-line">{r.reason}</p>
                                    </div>
                                  )}
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  ) : (
                    <Table
                      data={
                        tab === 'assignments'
                          ? rows(records.data).map((r: Row) => ({
                              ...r,
                              project_assigned:
                                r.project_name || r.project?.name || d?.current_project?.name || 'Project Assignment',
                              work_site_location: r.location_name || r.location?.name || '—',
                              assigned_personnel:
                                r.responsible_employee_name ||
                                r.responsible_employee?.name ||
                                (r.responsible_employee
                                  ? [r.responsible_employee.first_name, r.responsible_employee.last_name]
                                      .filter(Boolean)
                                      .join(' ')
                                  : null) ||
                                r.primary_operator_name ||
                                r.primary_operator?.name ||
                                '—',
                              assignment_period: `${r.assigned_at ? new Date(r.assigned_at).toLocaleDateString() : '—'} – ${
                                r.returned_at ? new Date(r.returned_at).toLocaleDateString() : 'Present'
                              }`,
                            }))
                          : tab === 'meter-readings'
                            ? rows(records.data).map((r: Row) => ({
                                ...r,
                                project_site_location:
                                  (r.project?.name || r.project_name
                                    ? `${r.project?.name || r.project_name} (${r.location?.name || r.location_name || 'Site'})`
                                    : null) ||
                                  r.location?.name ||
                                  r.location_name ||
                                  (d?.current_project?.name
                                    ? `${d.current_project.name} (${d.current_location?.name || 'Site'})`
                                    : null) ||
                                  'Assigned Site',
                              }))
                            : tab === 'maintenance'
                              ? rows(records.data)
                                  .filter((r: Row) => {
                                    if (maintenanceFilter === 'RECURRING') return !!r.is_recurring;
                                    if (maintenanceFilter === 'IN_PROGRESS') return String(r.status || '').toUpperCase() === 'IN_PROGRESS';
                                    if (maintenanceFilter === 'COMPLETED')
                                      return ['COMPLETED', 'RESOLVED', 'CLOSED', 'POSTED'].includes(String(r.status || '').toUpperCase());
                                    if (maintenanceFilter === 'SCHEDULED')
                                      return ['SCHEDULED', 'OPEN', 'PENDING', 'DRAFT'].includes(String(r.status || '').toUpperCase());
                                    return true;
                                  })
                                  .map((r: Row) => ({
                                    ...r,
                                    schedule_type: r.is_recurring ? `Recurring (${r.recurrence_interval_days || 7}d)` : 'Scheduled Job',
                                    scheduled_date_fmt: r.scheduled_date ? new Date(r.scheduled_date).toLocaleDateString() : '—',
                                    cost_fmt: r.cost != null ? `$${Number(r.cost).toFixed(2)}` : '—',
                                  }))
                            : tab === 'activity'
                              ? rows(records.data).map((r: Row) => {
                                  const formatted = formatAssetAuditActivity(r);
                                  return {
                                    ...r,
                                    action: formatted.titleStr,
                                    occurred_at: formatted.timestamp,
                                    entity_type: (r.entity_type || 'equipment').replace(/_/g, ' '),
                                    performed_by: formatted.performedBy,
                                    details_summary: formatted.detailsText,
                                  };
                                })
                              : rows(records.data)
                      }
                      columns={
                        tab === 'assignments'
                          ? [
                              'assignment_number',
                              'project_assigned',
                              'work_site_location',
                              'assigned_personnel',
                              'assignment_period',
                              'status',
                            ]
                          : tab === 'fuel-logs'
                            ? [
                                'recorded_at',
                                'fuel_type',
                                'quantity_litres',
                                'meter_reading',
                                'supplier',
                              ]
                            : tab === 'maintenance'
                              ? ['title', 'maintenance_type', 'priority', 'status', 'schedule_type', 'scheduled_date_fmt', 'cost_fmt']
                              : tab === 'meter-readings'
                                ? ['recorded_at', 'reading_type', 'reading', 'project_site_location', 'source']
                                : tab === 'activity'
                                  ? ['action', 'occurred_at', 'performed_by', 'details_summary']
                                  : undefined
                      }
                      onSelect={setSelected}
                    />
                  )}
                  {['maintenance', 'fuel-logs'].includes(tab) && (
                    <div className="flex justify-between p-4 border-t text-xs">
                      <span>
                        {records.data?.total || 0} records · Page {page}
                      </span>
                      <div className="flex gap-2">
                        <button
                          className="btn-secondary text-xs"
                          disabled={page === 1}
                          onClick={() => setPage(page - 1)}
                        >
                          Previous
                        </button>
                        <button
                          className="btn-secondary text-xs"
                          disabled={page * 20 >= (records.data?.total || 0)}
                          onClick={() => setPage(page + 1)}
                        >
                          Next
                        </button>
                      </div>
                    </div>
                  )}
                </State>
              </section>
            )}
          </>
        )}
      </State>
      {error && (
        <p role="alert" className="text-sm text-red-700">
          {error}
        </p>
      )}
      {selected && (
        <Modal
          name={
            tab === 'activity' ?'Activity Detail · ' + (selected.action || 'Action')
              : tab === 'maintenance' ?'Maintenance Job Details · ' + (selected.title || 'Job')
                : tab === 'fuel-logs' ?'Fuel Log Details & Dip Readings · ' + (selected.recorded_at ? new Date(selected.recorded_at).toLocaleDateString() : 'Fuel Entry')
                  : tab === 'assignments' ?'Assignment Record Details · ' + (selected.project_name || selected.project?.name || 'Project Assignment')
                    : selected.title || selected.name || title(tab) + ' record'
          }
          onClose={() => {
            setSelected(null);
            setLogFileUpload(false);
            setSubEntryModalOpen(false);
          }}
        >
          {error && (
            <p role="alert" className="text-sm text-red-700">
              {error}
            </p>
          )}
          {tab === 'maintenance' ? (
            <div className="space-y-5">
              {selected.scheduled_date &&
                ['OPEN', 'IN_PROGRESS'].includes(selected.status || 'OPEN') &&
                new Date(selected.scheduled_date) < new Date(new Date().setHours(0, 0, 0, 0)) && (
                  <div className="bg-red-50 border border-red-200 text-red-900 p-3 rounded-lg text-xs flex items-center justify-between font-medium">
                    <div className="flex items-center gap-2">
                      <AlertTriangle className="text-red-600 shrink-0" size={16} />
                      <span>
                        This maintenance job is <strong>OVERDUE</strong> (Scheduled:{' '}
                        {new Date(selected.scheduled_date).toLocaleDateString()}). Assigned personnel have been alerted!
                      </span>
                    </div>
                  </div>
                )}

              <div className="flex justify-between items-center bg-muted/30 p-3.5 rounded-lg border flex-wrap gap-2">
                <div>
                  <span className="text-2xs uppercase tracking-wider text-muted-foreground block font-semibold">
                    Maintenance Status
                  </span>
                  <div className="flex items-center gap-2 mt-1">
                    <span
                      className={`badge ${
                        selected.status === 'COMPLETED' ?'badge-active'
                          : selected.status === 'IN_PROGRESS' ?'badge-maintenance'
                            : selected.status === 'CANCELLED' ?'badge-neutral' :'badge-standby'
                      }`}
                    >
                      {selected.status?.replace(/_/g, ' ') || 'OPEN'}
                    </span>
                    <span
                      className={`badge ${
                        selected.priority === 'CRITICAL' ?'badge-breakdown'
                          : selected.priority === 'HIGH' ?'badge-maintenance' :'badge-neutral'
                      }`}
                    >
                      {selected.priority || 'NORMAL'} Priority
                    </span>
                    {selected.is_recurring && (
                      <span className="badge badge-active flex items-center gap-1">
                        <RefreshCw size={11} className="animate-spin-slow" />
                        Recurring ({selected.recurrence_interval_days ? `${selected.recurrence_interval_days}d` : 'Schedule'})
                      </span>
                    )}
                  </div>
                </div>
                <div className="text-right">
                  <span className="text-2xs uppercase tracking-wider text-muted-foreground block font-semibold">
                    Maintenance Type
                  </span>
                  <span className="text-xs font-bold text-foreground mt-1 block">
                    {selected.maintenance_type?.replace(/_/g, ' ') || 'SERVICE'}
                  </span>
                </div>
              </div>

              <div className="grid sm:grid-cols-2 gap-3 text-xs">
                <div className="bg-white p-3 rounded border space-y-1">
                  <span className="text-muted-foreground text-[11px]">Job Title</span>
                  <p className="font-semibold text-sm text-foreground">{selected.title || '—'}</p>
                </div>
                <div className="bg-white p-3 rounded border space-y-1">
                  <span className="text-muted-foreground text-[11px]">Assigned Technician / Employee</span>
                  <p className="font-semibold text-sm text-primary">
                    {selected.assigned_employee_name ||
                      selected.assigned_employee?.name ||
                      (selected.assigned_employee
                        ? [selected.assigned_employee.first_name, selected.assigned_employee.last_name]
                            .filter(Boolean)
                            .join(' ')
                        : null) ||
                      (selected.assigned_employee_id ? 'Assigned Employee' : 'Unassigned')}
                  </p>
                </div>
                <div className="bg-white p-3 rounded border space-y-1">
                  <span className="text-muted-foreground text-[11px]">Assigned Project</span>
                  <p className="font-semibold text-sm text-primary">
                    {selected.project?.name || selected.project_name || d?.current_project?.name || 'Asset Assigned Project'}
                  </p>
                </div>
                <div className="bg-white p-3 rounded border space-y-1">
                  <span className="text-muted-foreground text-[11px]">Scheduled / Logged Date</span>
                  <p className="font-medium text-foreground">
                    {selected.scheduled_date
                      ? new Date(selected.scheduled_date).toLocaleDateString()
                      : selected.created_at
                        ? new Date(selected.created_at).toLocaleDateString()
                        : '—'}
                  </p>
                </div>
                <div className="bg-white p-3 rounded border space-y-1">
                  <span className="text-muted-foreground text-[11px]">Recurrence Interval</span>
                  <p className="font-medium text-foreground">
                    {selected.is_recurring
                      ? `Every ${selected.recurrence_interval_days || 7} days (Auto-reschedules on completion)`
                      : 'One-time Job'}
                  </p>
                </div>
                <div className="bg-white p-3 rounded border space-y-1">
                  <span className="text-muted-foreground text-[11px]">Maintenance Cost</span>
                  <p className="font-semibold text-foreground">
                    {selected.cost != null
                      ? `$${Number(selected.cost).toLocaleString('en-US', { minimumFractionDigits: 2 })} ${selected.currency || 'USD'}`
                      : '—'}
                  </p>
                </div>
                <div className="bg-white p-3 rounded border space-y-1">
                  <span className="text-muted-foreground text-[11px]">Service Provider / Workshop</span>
                  <p className="font-medium text-foreground">{selected.provider || 'Internal Workshop'}</p>
                </div>
                <div className="bg-white p-3 rounded border space-y-1">
                  <span className="text-muted-foreground text-[11px]">Meter Reading at Maintenance</span>
                  <p className="font-medium text-foreground">
                    {selected.meter_reading != null
                      ? `${selected.meter_reading} ${asset.meter_type?.replace(/_/g, ' ') || ''}`
                      : '—'}
                  </p>
                </div>
              </div>

              {selected.description && (
                <div className="bg-white p-3.5 rounded border space-y-1 text-xs">
                  <span className="text-muted-foreground font-semibold text-[11px] block uppercase tracking-wider">
                    Work Scope & Description
                  </span>
                  <p className="text-foreground leading-relaxed whitespace-pre-line">{selected.description}</p>
                </div>
              )}

              {(selected.completion_notes || selected.notes) && (
                <div className="bg-blue-50/60 border border-blue-200 p-3.5 rounded-lg text-xs space-y-1">
                  <span className="text-blue-900 font-bold text-[11px] block uppercase tracking-wider">
                    Completion & Action Notes
                  </span>
                  <p className="text-blue-950 whitespace-pre-line">{selected.completion_notes || selected.notes}</p>
                </div>
              )}
            </div>
          ) : tab === 'fuel-logs' ? (
            <div className="space-y-5">
              <div className="grid sm:grid-cols-3 gap-3 text-xs bg-muted/20 p-3 rounded-lg border">
                <div>
                  <span className="text-muted-foreground block text-[11px]">Refuel Date</span>
                  <strong className="text-sm font-semibold">
                    {selected.recorded_at ? new Date(selected.recorded_at).toLocaleDateString() : '—'}
                  </strong>
                </div>
                <div>
                  <span className="text-muted-foreground block text-[11px]">Quantity Refueled</span>
                  <strong className="text-sm font-semibold text-primary">
                    {selected.quantity_litres || 0} Litres
                  </strong>
                </div>
                <div>
                  <span className="text-muted-foreground block text-[11px]">Fuel Type / Supplier</span>
                  <strong className="text-sm font-semibold">
                    {selected.fuel_type || 'DIESEL'} {selected.supplier ? `· ${selected.supplier}` : ''}
                  </strong>
                </div>
              </div>

              {/* Sub-Entries / Dip Readings Section */}
              <div className="border rounded-lg p-4 space-y-3 bg-white">
                <div className="flex justify-between items-center flex-wrap gap-2">
                  <div>
                    <h4 className="text-xs font-bold uppercase tracking-wider text-foreground">
                      Sub-Entries: Fuel Dip & Consumption Clocking
                    </h4>
                    <p className="text-[11px] text-muted-foreground">
                      Clock in remaining fuel left; consumption is automatically subtracted for planning.
                    </p>
                  </div>
                  {!subEntryModalOpen && asset.is_active && auth.can('assets.update') && (
                    <button
                      className="btn-primary text-xs"
                      onClick={() => {
                        setSubRecordedAt(new Date().toISOString().slice(0, 16));
                        setSubEntryModalOpen(true);
                      }}
                    >
                      <Plus size={12} />
                      Clock Fuel Left (Dip Reading)
                    </button>
                  )}
                </div>

                {subEntryModalOpen && (
                  <form onSubmit={handleCreateSubEntry} className="p-4 bg-muted/40 rounded-lg space-y-3 border text-xs">
                    <h5 className="font-bold text-xs text-primary">New Dip Reading / Sub-Entry</h5>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="block font-semibold mb-1">Check Date & Time *</label>
                        <input
                          type="datetime-local"
                          className="input-field text-xs"
                          required
                          value={subRecordedAt}
                          onChange={(e) => setSubRecordedAt(e.target.value)}
                        />
                      </div>
                      <div>
                        <label className="block font-semibold mb-1">Reason / Check Type</label>
                        <select
                          className="input-field text-xs"
                          value={subReason}
                          onChange={(e) => setSubReason(e.target.value)}
                        >
                          <option value="Daily Dip Check">Daily Dip Check</option>
                          <option value="Shift End Reading">Shift End Reading</option>
                          <option value="Pre-Operation Inspection">Pre-Operation Inspection</option>
                          <option value="Weekly Fleet Check">Weekly Fleet Check</option>
                          <option value="Other">Other</option>
                        </select>
                      </div>
                      <div>
                        <label className="block font-semibold mb-1">Date Span Start (Optional)</label>
                        <input
                          type="date"
                          className="input-field text-xs"
                          value={subStartDate}
                          onChange={(e) => setSubStartDate(e.target.value)}
                        />
                      </div>
                      <div>
                        <label className="block font-semibold mb-1">Date Span End (Optional)</label>
                        <input
                          type="date"
                          className="input-field text-xs"
                          value={subEndDate}
                          onChange={(e) => setSubEndDate(e.target.value)}
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                      <div>
                        <label className="block font-semibold mb-1">Fuel Left in Tank (Litres) *</label>
                        <input
                          type="number"
                          step="any"
                          min="0"
                          className="input-field text-xs"
                          required
                          placeholder="e.g. 350"
                          value={subFuelLeft}
                          onChange={(e) => setSubFuelLeft(e.target.value)}
                        />
                      </div>
                      <div className="bg-amber-50 border border-amber-200 p-2.5 rounded flex items-center justify-between">
                        <span className="text-[11px] font-semibold text-amber-900">Calculated Consumption:</span>
                        <strong className="text-sm font-bold text-amber-950">
                          {subFuelLeft !== '' ? (
                            `${Math.max(
                              0,
                              (fuelReductions.length > 0 && fuelReductions[0].remaining_litres != null
                                ? Number(fuelReductions[0].remaining_litres)
                                : Number(selected.quantity_litres || 0)) - Number(subFuelLeft)
                            ).toFixed(1)} Litres Consumed`
                          ) : (
                            '—'
                          )}
                        </strong>
                      </div>
                    </div>

                    <div>
                      <label className="block font-semibold mb-1">Notes / Operational Context (Optional)</label>
                      <input
                        type="text"
                        className="input-field text-xs"
                        placeholder="e.g. Completed 8 hours drilling shift"
                        value={subNotes}
                        onChange={(e) => setSubNotes(e.target.value)}
                      />
                    </div>

                    <div className="flex justify-end gap-2 pt-2">
                      <button
                        type="button"
                        className="btn-secondary text-xs"
                        onClick={() => setSubEntryModalOpen(false)}
                      >
                        Cancel
                      </button>
                      <button disabled={subSubmitting} className="btn-primary text-xs">
                        {subSubmitting ? 'Saving Sub-Entry…' : 'Save Dip Reading'}
                      </button>
                    </div>
                  </form>
                )}

                {fuelReductions.length > 0 ? (
                  <div className="overflow-x-auto border rounded bg-white">
                    <table className="w-full text-xs text-left">
                      <thead className="bg-muted/50 border-b">
                        <tr>
                          <th className="p-2 font-semibold">Date & Span</th>
                          <th className="p-2 font-semibold">Check Reason</th>
                          <th className="p-2 font-semibold">Fuel Left</th>
                          <th className="p-2 font-semibold">Litres Consumed</th>
                          <th className="p-2 font-semibold">Notes</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y">
                        {fuelReductions.map((r: Row) => (
                          <tr key={r.id}>
                            <td className="p-2 text-foreground font-medium">
                              {r.recorded_at ? new Date(r.recorded_at).toLocaleString() : '—'}
                            </td>
                            <td className="p-2 text-muted-foreground">{r.reduction_reason || 'Daily Dip Check'}</td>
                            <td className="p-2 font-semibold text-green-700">
                              {r.remaining_litres != null ? `${r.remaining_litres} L` : '—'}
                            </td>
                            <td className="p-2 font-bold text-amber-700">
                              {r.litres_reduced != null ? `${r.litres_reduced} L` : '—'}
                            </td>
                            <td className="p-2 text-muted-foreground">{r.notes || '—'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <p className="text-xs text-muted-foreground italic py-2">
                    No dip sub-entries recorded for this fuel log yet.
                  </p>
                )}
              </div>
            </div>
          ) : tab === 'activity' ? (
            <div className="space-y-4">
              <div className="bg-muted/30 p-3 rounded space-y-1 text-xs border">
                <div>
                  <strong>Action:</strong>{' '}
                  <span className="badge badge-active ml-2">{selected.action}</span>
                </div>
                <div>
                  <strong>Occurred At:</strong>{' '}
                  {selected.occurred_at ? new Date(selected.occurred_at).toLocaleString() : '—'}
                </div>
                <div>
                  <strong>Entity Type:</strong> {selected.entity_type || 'Asset'}
                </div>
              </div>
              <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                Recorded Changes
              </h4>
              <div className="border rounded overflow-hidden">
                <table className="w-full text-xs text-left">
                  <thead className="bg-muted border-b">
                    <tr>
                      <th className="p-2 font-semibold">Field</th>
                      <th className="p-2 font-semibold">Previous Value</th>
                      <th className="p-2 font-semibold">New Value</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {Array.from(
                      new Set([
                        ...Object.keys(selected.old_values || {}),
                        ...Object.keys(selected.new_values || {}),
                      ])
                    ).map((key) => {
                      const oldVal = selected.old_values?.[key];
                      const newVal = selected.new_values?.[key];
                      return (
                        <tr key={key}>
                          <td className="p-2 font-mono text-[11px] text-muted-foreground">{key}</td>
                          <td className="p-2 text-red-700 bg-red-50/50">
                            {oldVal != null ? String(oldVal) : '—'}
                          </td>
                          <td className="p-2 text-green-700 bg-green-50/50 font-semibold">
                            {newVal != null ? String(newVal) : '—'}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          ) : tab === 'assignments' ? (
            <div className="space-y-5">
              <div className="flex justify-between items-center bg-muted/30 p-3.5 rounded-lg border flex-wrap gap-2">
                <div>
                  <span className="text-2xs uppercase tracking-wider text-muted-foreground block font-semibold">
                    Assignment Status
                  </span>
                  <div className="flex items-center gap-2 mt-1">
                    <span
                      className={`badge ${
                        selected.status === 'ACTIVE' ?'badge-active'
                          : selected.status === 'COMPLETED' ?'badge-neutral' :'badge-standby'
                      }`}
                    >
                      {selected.status?.replace(/_/g, ' ') || 'ACTIVE'}
                    </span>
                    {selected.assignment_number && (
                      <span className="badge badge-neutral font-mono">
                        #{selected.assignment_number}
                      </span>
                    )}
                  </div>
                </div>
                <div className="text-right">
                  <span className="text-2xs uppercase tracking-wider text-muted-foreground block font-semibold">
                    Assignment Period
                  </span>
                  <span className="text-xs font-bold text-foreground mt-1 block">
                    {selected.assigned_at ? new Date(selected.assigned_at).toLocaleDateString() : '—'} –{' '}
                    {selected.returned_at ? new Date(selected.returned_at).toLocaleDateString() : 'Present'}
                  </span>
                </div>
              </div>

              <div className="grid sm:grid-cols-2 gap-3 text-xs">
                <div className="bg-white p-3 rounded border space-y-1">
                  <span className="text-muted-foreground text-[11px]">Assigned Project</span>
                  <p className="font-semibold text-sm text-primary">
                    {selected.project_name || selected.project?.name || d?.current_project?.name || 'Project'}
                  </p>
                </div>
                <div className="bg-white p-3 rounded border space-y-1">
                  <span className="text-muted-foreground text-[11px]">Work / Site Location</span>
                  <p className="font-semibold text-sm text-foreground">
                    {selected.location_name || selected.location?.name || '—'}
                  </p>
                </div>
                <div className="bg-white p-3 rounded border space-y-1">
                  <span className="text-muted-foreground text-[11px]">Responsible Employee / Supervisor</span>
                  <p className="font-medium text-foreground">
                    {selected.responsible_employee_name ||
                      selected.responsible_employee?.name ||
                      (selected.responsible_employee
                        ? [selected.responsible_employee.first_name, selected.responsible_employee.last_name]
                            .filter(Boolean)
                            .join(' ')
                        : null) ||
                      '—'}
                  </p>
                </div>
                <div className="bg-white p-3 rounded border space-y-1">
                  <span className="text-muted-foreground text-[11px]">Primary Operator</span>
                  <p className="font-medium text-foreground">
                    {selected.primary_operator_name ||
                      selected.primary_operator?.name ||
                      (selected.primary_operator
                        ? [selected.primary_operator.first_name, selected.primary_operator.last_name]
                            .filter(Boolean)
                            .join(' ')
                        : null) ||
                      '—'}
                  </p>
                </div>
                <div className="bg-white p-3 rounded border space-y-1">
                  <span className="text-muted-foreground text-[11px]">Starting Meter Reading</span>
                  <p className="font-medium text-foreground">
                    {selected.starting_meter != null
                      ? `${selected.starting_meter} ${asset.meter_type?.replace(/_/g, ' ') || ''}`
                      : '—'}
                  </p>
                </div>
                <div className="bg-white p-3 rounded border space-y-1">
                  <span className="text-muted-foreground text-[11px]">Ending / Return Meter Reading</span>
                  <p className="font-medium text-foreground">
                    {selected.ending_meter != null
                      ? `${selected.ending_meter} ${asset.meter_type?.replace(/_/g, ' ') || ''}`
                      : selected.status === 'ACTIVE' ?'Active on site' :'—'}
                  </p>
                </div>
              </div>

              {selected.notes && (
                <div className="bg-white p-3.5 rounded border space-y-1 text-xs">
                  <span className="text-muted-foreground font-semibold text-[11px] block uppercase tracking-wider">
                    Assignment Notes & Purpose
                  </span>
                  <p className="text-foreground leading-relaxed whitespace-pre-line">{selected.notes}</p>
                </div>
              )}
            </div>
          ) : tab === 'activity' && selected ? (
            <div className="space-y-4">
              {(() => {
                const formatted = formatAssetAuditActivity(selected);
                return (
                  <>
                    <div className="flex items-center gap-3 p-4 bg-muted/40 rounded-lg border">
                      <div className={`p-2.5 rounded-lg border ${formatted.badgeColor}`}>
                        <formatted.IconNode size={20} />
                      </div>
                      <div>
                        <h3 className="font-bold text-sm text-foreground">{formatted.titleStr}</h3>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          Occurred: <strong>{formatted.timestamp}</strong> · Performed by{' '}
                          <strong className="text-foreground">{formatted.performedBy}</strong>
                        </p>
                      </div>
                    </div>

                    <div className="bg-white p-4 rounded-lg border space-y-2">
                      <span className="text-2xs font-bold text-muted-foreground uppercase tracking-wider block">
                        Activity Summary & Context
                      </span>
                      <p className="text-sm text-foreground leading-relaxed">
                        {formatted.detailsText}
                      </p>
                    </div>

                    {selected.details &&
                      typeof selected.details === 'object' &&
                      Object.keys(selected.details).length > 0 && (
                        <div className="border rounded-lg overflow-hidden text-xs">
                          <div className="bg-muted px-3.5 py-2 font-semibold text-muted-foreground uppercase tracking-wider text-[11px]">
                            Property Change Audit Log
                          </div>
                          <div className="divide-y bg-white">
                            {Object.entries(selected.details)
                              .filter(([k]) => !k.endsWith('_id') && k !== 'id')
                              .map(([key, val]: [string, any]) => (
                                <div
                                  key={key}
                                  className="px-3.5 py-2 flex justify-between items-center gap-4"
                                >
                                  <span className="font-medium text-slate-700">{title(key)}</span>
                                  {val && typeof val === 'object' && ('old' in (val as Record<string, unknown>) || 'new' in (val as Record<string, unknown>)) ? (
                                    <div className="text-right">
                                      <span className="text-red-600 line-through mr-2">
                                        {String((val as Record<string, unknown>).old ?? '—')}
                                      </span>
                                      <span className="text-emerald-700 font-semibold">
                                        {String((val as Record<string, unknown>).new ?? '—')}
                                      </span>
                                    </div>
                                  ) : (
                                    <span className="text-slate-900 font-medium">{String(val)}</span>
                                  )}
                                </div>
                              ))}
                          </div>
                        </div>
                      )}
                  </>
                );
              })()}
            </div>
          ) : (
            <Facts data={selected} />
          )}
          {['maintenance', 'fuel-logs', 'inspections', 'meter-readings', 'defects'].includes(tab) && (
            <div className="mt-5 border-t pt-4 space-y-3">
              <div className="flex justify-between items-center">
                <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                  Attached Receipts & Files
                </h3>
                {!logFileUpload && asset.is_active && auth.can('assets.update') && (
                  <button className="btn-secondary text-xs" onClick={() => setLogFileUpload(true)}>
                    <Upload size={12} />
                    Attach file
                  </button>
                )}
              </div>
              {logFileUpload && (
                <form
                  onSubmit={handleLogFileUpload}
                  className="p-3 bg-muted/40 rounded space-y-3 border"
                >
                  <div>
                    <label className="block text-xs font-semibold mb-1">Select File *</label>
                    <input
                      className="input-field text-xs p-1"
                      type="file"
                      required
                      onChange={(e) => {
                        const file = e.target.files?.[0] || null;
                        setLogFile(file);
                        if (file && !logFileTitle) {
                          setLogFileTitle(file.name);
                        }
                      }}
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold mb-1">
                      File Title / Description (Optional)
                    </label>
                    <input
                      className="input-field text-xs"
                      placeholder="e.g. Service Receipt, Evidence Photo"
                      value={logFileTitle}
                      onChange={(e) => setLogFileTitle(e.target.value)}
                    />
                  </div>
                  <div className="flex justify-end gap-2">
                    <button
                      type="button"
                      className="btn-secondary text-xs"
                      onClick={() => setLogFileUpload(false)}
                    >
                      Cancel
                    </button>
                    <button disabled={logFileBusy} className="btn-primary text-xs">
                      {logFileBusy ? 'Uploading…' : 'Upload'}
                    </button>
                  </div>
                </form>
              )}
              {logFiles.length > 0 ? (
                <ul className="divide-y border rounded bg-white text-xs">
                  {logFiles.map((f: Row) => (
                    <li key={f.id} className="p-2.5 flex justify-between items-center gap-2">
                      <div className="min-w-0 flex-1">
                        <strong className="block font-medium truncate">{f.title || f.file_name}</strong>
                        <span className="text-muted-foreground text-[11px]">
                          {f.file_name} {f.size_bytes ? `· ${Math.round(f.size_bytes / 1024)} KB` : ''}
                        </span>
                      </div>
                      <div className="flex items-center gap-1.5 shrink-0">
                        <button
                          className="btn-secondary text-xs flex items-center gap-1"
                          onClick={() => void handleLogFileView(f)}
                          title="View file preview"
                        >
                          <Eye size={12} />
                          View
                        </button>
                        <button
                          className="btn-secondary text-xs flex items-center gap-1"
                          onClick={() => handleLogFileDownload(f.id, f.file_name || 'file')}
                          title="Download file"
                        >
                          <Download size={12} />
                          Download
                        </button>
                      </div>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-xs text-muted-foreground italic">
                  No attached files or receipts yet.
                </p>
              )}
            </div>
          )}
          <div className="flex gap-2 mt-5 border-t pt-4 flex-wrap">
            {(tab === 'documents' || selected.document_id) && (
              <>
                <button
                  className="btn-secondary text-xs flex items-center gap-1"
                  onClick={() =>
                    void handleDocumentView(
                      selected.document_id
                        ? { id: selected.document_id, title: selected.title || 'document' }
                        : selected
                    )
                  }
                  title="View document preview"
                >
                  <Eye size={13} />
                  View
                </button>
                <button
                  className="btn-primary text-xs flex items-center gap-1"
                  onClick={() =>
                    void download(
                      selected.document_id
                        ? { id: selected.document_id, title: selected.title || 'document' }
                        : selected
                    )
                  }
                  title="Download document"
                >
                  <Download size={13} />
                  Download
                </button>
              </>
            )}
            {tab === 'maintenance' && auth.can('assets.update') && (
              <button
                className="btn-secondary text-xs"
                onClick={() =>
                  openForm(root + '/maintenance/' + selected.id, 'Edit maintenance job', selected, maintenanceEditOp)
                }
              >
                <Edit size={13} />
                Edit job
              </button>
            )}
            {tab === 'fuel-logs' && auth.can('assets.update') && (
              <button
                className="btn-secondary text-xs"
                onClick={() =>
                  openForm(root + '/fuel-logs/' + selected.id, 'Edit fuel log', selected, fuelLogEditOp)
                }
              >
                <Edit size={13} />
                Edit fuel log
              </button>
            )}
            {tab === 'defects' && auth.can('assets.defects.manage') && (
              <button
                className="btn-secondary text-xs"
                onClick={() =>
                  openForm(root + '/defects/' + selected.id, 'Edit defect', selected, defectEditOp)
                }
              >
                <Edit size={13} />
                Edit defect
              </button>
            )}
            {tab === 'inspections' && auth.can('assets.inspections.manage') && (
              <button
                className="btn-secondary text-xs"
                onClick={() =>
                  openForm(
                    '/api/v1/assets/' + assetId + '/inspections/' + selected.id,
                    'Edit inspection',
                    selected
                  )
                }
              >
                <Edit size={13} />
                Edit inspection
              </button>
            )}
            {tab === 'assignments' && (
              <button
                className="btn-secondary text-xs"
                onClick={() =>
                  openForm('/api/v1/asset-assignments/' + selected.id, 'Edit assignment', selected)
                }
              >
                <Edit size={13} />
                Edit assignment
              </button>
            )}
            {tab === 'maintenance' &&
              ['OPEN', 'IN_PROGRESS'].includes(selected.status) &&
              auth.can('assets.update') && (
                <button
                  className="btn-primary text-xs"
                  onClick={() => {
                    const next =
                      selected.status === 'OPEN'
                        ? ['IN_PROGRESS', 'COMPLETED', 'CANCELLED']
                        : ['COMPLETED', 'CANCELLED'];
                    openForm(
                      root + '/maintenance/' + selected.id + '/status',
                      'Update maintenance status',
                      undefined,
                      {
                        schema: {
                          type: 'object',
                          required: ['status', 'notes'],
                          properties: {
                            status: { type: 'string', enum: next },
                            notes: { type: 'string', minLength: 1, maxLength: 20000 },
                          },
                        },
                      }
                    );
                  }}
                >
                  Update maintenance status
                </button>
              )}
            {tab === 'defects' &&
              selected.status !== 'RESOLVED'&& allowed('/api/v1/asset-defects/' + selected.id + '/resolve', 'POST') && (
                <button
                  className="btn-primary text-xs"
                  onClick={() =>
                    openForm('/api/v1/asset-defects/' + selected.id + '/resolve', 'Resolve defect')
                  }
                >
                  Resolve defect
                </button>
              )}
            {tab === 'meter-readings' && auth.can('assets.update') && (
              <button
                className="btn-secondary text-xs"
                onClick={() =>
                  openForm(
                    root + '/meter-readings/' + selected.id,
                    'Edit meter reading',
                    selected
                  )
                }
              >
                <Edit size={13} />
                Edit meter reading
              </button>
            )}
          </div>
        </Modal>
      )}
      {form && (
        <RecordForm
          resource={form.path.slice(8)}
          path={form.path}
          operation={form.operation || operation(form.path, form.method || 'POST') || {}}
          initial={form.initial}
          title={form.name}
          method={form.method}
          onClose={() => setForm(null)}
          onSaved={() => {
            setForm(null);
            reload();
          }}
        />
      )}
      {transfer && asset && (
        <AssetAssignmentModal
          asset={asset}
          currentProject={d.current_project}
          onClose={() => setTransfer(false)}
          onSaved={() => {
            setTransfer(false);
            reload();
          }}
        />
      )}
      {upload && (
        <OperationalUpload
          path={root + (upload === 'photo' ? '/media/upload' : '/documents/upload')}
          photo={upload === 'photo'}
          onClose={() => setUpload(null)}
          onSaved={() => {
            setUpload(null);
            reload();
          }}
        />
      )}
      {previewFile && (
        <Modal
          name={`Document & Evidence Preview: ${previewFile.title || previewFile.filename}`}
          onClose={() => setPreviewFile(null)}
        >
          <div className="space-y-4">
            <div className="flex items-center justify-between p-3 bg-muted/30 border rounded-lg text-xs">
              <div>
                <h4 className="font-bold text-foreground text-sm">{previewFile.title}</h4>
                <p className="text-muted-foreground text-[11px]">
                  {previewFile.filename} {previewFile.size_bytes ? `· ${Math.round(previewFile.size_bytes / 1024)} KB` : ''}
                </p>
              </div>
              {previewFile.blob && (
                <button
                  className="btn-primary text-xs flex items-center gap-1.5"
                  onClick={() => downloadBlob(previewFile.blob!, previewFile.filename)}
                >
                  <Download size={13} /> Download File
                </button>
              )}
            </div>

            <div className="border rounded-lg bg-slate-950 p-2 min-h-[300px] flex items-center justify-center text-center overflow-hidden">
              {previewFile.url && (previewFile.filename.match(/\.(jpg|jpeg|png|gif|webp|svg)$/i) || previewFile.blob?.type.startsWith('image/')) ? (
                <img
                  src={previewFile.url}
                  alt={previewFile.title}
                  className="max-h-[500px] max-w-full object-contain rounded"
                />
              ) : previewFile.url && (previewFile.filename.match(/\.(pdf|txt|html)$/i) || previewFile.blob?.type.includes('pdf')) ? (
                <iframe
                  src={previewFile.url}
                  title={previewFile.title}
                  className="w-full h-[500px] rounded bg-white"
                />
              ) : (
                <div className="p-8 text-slate-400 space-y-3">
                  <FileText size={48} className="mx-auto text-slate-500" />
                  <p className="text-xs font-medium">Inline preview not available for this file type.</p>
                  <p className="text-[11px] text-slate-500">{previewFile.filename}</p>
                </div>
              )}
            </div>

            <div className="flex justify-end border-t pt-3">
              <button type="button" className="btn-secondary text-xs" onClick={() => setPreviewFile(null)}>
                Close Preview
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
