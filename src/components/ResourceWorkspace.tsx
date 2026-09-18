'use client';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useSearchParams, useRouter } from 'next/navigation';
import { Plus, RefreshCw, Search, ArrowLeft, ArrowRight, ExternalLink, Truck, Clock, CheckCircle, MapPin, Eye } from 'lucide-react';
import contract from '@/lib/contract.json';
import { apiFetch, apiFetchBlob } from '@/lib/api';
import { useAuth } from './AuthProvider';
import { Row, title, rows, display, useData, State, Table, Facts, Modal } from './DataUI';
import RecordForm from './RecordForm';
import AssetDetailView from './AssetDetailView';
import EmployeeDetailView from './EmployeeDetailView';
import EmployeeWizardForm from './EmployeeWizardForm';
import { ProjectRegister } from './ProjectDashboard';
import EmployeeAvailabilityWorkspace from './EmployeeAvailabilityWorkspace';
import RotationsWorkspace from './RotationsWorkspace';
import TrainingComplianceWorkspace from './TrainingComplianceWorkspace';
import ExpiringDocumentsWorkspace from './ExpiringDocumentsWorkspace';
import EquipmentExpiringDocumentsWorkspace from './EquipmentExpiringDocumentsWorkspace';
import StoreDetailView from './StoreDetailView';
import ItemDetailView from './ItemDetailView';
import NotificationWorkspace from './NotificationWorkspace';
import AdminWorkspace from './AdminWorkspace';
import IncidentReportingWorkspace from './IncidentReportingWorkspace';
import LeaveManagementWorkspace from './LeaveManagementWorkspace';

function getEmployeeFullName(emp: Row): string {
  if (!emp) return 'Employee';
  const nameParts = [emp.first_name, emp.last_name].filter(Boolean).join(' ');
  if (nameParts.trim()) return nameParts.trim();
  if (emp.name && typeof emp.name === 'string') return emp.name;
  if (emp.full_name && typeof emp.full_name === 'string') return emp.full_name;
  if (emp.employee_name && typeof emp.employee_name === 'string') return emp.employee_name;
  if (emp.user && typeof emp.user === 'object') {
    const uParts = [emp.user.first_name, emp.user.last_name].filter(Boolean).join(' ');
    if (uParts.trim()) return uParts.trim();
    if (emp.user.name) return emp.user.name;
    if (emp.user.email) return emp.user.email;
  }
  if (emp.employee_number) return `Staff #${emp.employee_number}`;
  if (emp.id) return `Staff #${String(emp.id).slice(0, 8)}`;
  return 'Employee';
}

function getEmployeeDepartment(emp: Row, departments: Row[]): string {
  if (!emp) return 'General Operations';
  if (emp.department_name && typeof emp.department_name === 'string') return emp.department_name;
  if (emp.department && typeof emp.department === 'object' && emp.department.name) return emp.department.name;
  if (emp.department_title && typeof emp.department_title === 'string') return emp.department_title;
  if (emp.department_id) {
    const match = departments.find((d) => String(d.id) === String(emp.department_id));
    if (match) return match.name || match.title || 'Department';
  }
  return 'General Operations';
}

function getEmployeeRole(emp: Row, positions: Row[]): string {
  if (!emp) return 'Operations Staff';
  if (emp.position_name && typeof emp.position_name === 'string') return emp.position_name;
  if (emp.position && typeof emp.position === 'object' && emp.position.name) return emp.position.name;
  if (emp.job_title && typeof emp.job_title === 'string') return emp.job_title;
  if (emp.title && typeof emp.title === 'string') return emp.title;
  if (emp.position_title && typeof emp.position_title === 'string') return emp.position_title;
  if (emp.user_role && typeof emp.user_role === 'string') return emp.user_role;
  if (emp.position_id) {
    const match = positions.find((p) => String(p.id) === String(emp.position_id));
    if (match) return match.name || match.title || 'Position';
  }
  return 'Operations Staff';
}

function getEmployeeLeaveInfo(emp: Row, leaveRequests: Row[]): { onLeave: boolean; leaveDetails?: Row } {
  if (emp.on_leave === true || emp.employment_status === 'ON_LEAVE' || emp.status === 'ON_LEAVE') {
    return { onLeave: true };
  }
  const todayStr = new Date().toISOString().slice(0, 10);
  const activeLeave = leaveRequests.find((l) => {
    if (String(l.employee_id) !== String(emp.id)) return false;
    if (l.status !== 'APPROVED') return false;
    if (!l.start_date || !l.end_date) return false;
    return l.start_date <= todayStr && l.end_date >= todayStr;
  });
  if (activeLeave) {
    return { onLeave: true, leaveDetails: activeLeave };
  }
  return { onLeave: false };
}

import EquipmentComponentsWorkspace from './EquipmentComponentsWorkspace';
import EquipmentMeterReadingsWorkspace from './EquipmentMeterReadingsWorkspace';
import EquipmentMaintenanceWorkspace from './EquipmentMaintenanceWorkspace';
import EquipmentWorkOrdersWorkspace from './EquipmentWorkOrdersWorkspace';
import EquipmentDefectsWorkspace from './EquipmentDefectsWorkspace';
import EquipmentInspectionsWorkspace from './EquipmentInspectionsWorkspace';
import EquipmentFuelLogsWorkspace from './EquipmentFuelLogsWorkspace';
import ControlTowerWorkspace from './ControlTowerWorkspace';
import DrillingWorkspace from './DrillingWorkspace';
import CommercialCostingWorkspace from './CommercialCostingWorkspace';
import ProcurementWorkspace from './ProcurementWorkspace';
import HseIncidentsWorkspace from './HseIncidentsWorkspace';

const routes: Row = contract.routes;
export function operation(path: string, method: string): Row | null {
  const key =
    Object.keys(routes).find((k) => k === path) ||
    Object.keys(routes).find(
      (k) => k.includes('{') && new RegExp('^' + k.replace(/\{[^}]+\}/g, '[^/]+') + '$').test(path)
    );
  return key ? routes[key][method] || null : null;
}
function ClientLogo({ clientId }: { clientId: string }) {
  const [src, setSrc] = useState<string | null>(null);
  useEffect(() => {
    let active = true;
    apiFetchBlob(`/api/v1/clients/${clientId}/logo`)
      .then((blob) => {
        if (active) setSrc(URL.createObjectURL(blob));
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, [clientId]);
  if (!src) return null;
  return (
    <div className="mb-4">
      <img
        src={src}
        alt="Client logo"
        className="h-16 w-auto max-w-48 rounded border border-border object-contain bg-white p-1"
      />
    </div>
  );
}
function normalizeResource(res: string): string {
  if (res === 'inventory/stock-register') return 'inventory/stock';
  if (res === 'inventory/audits') return 'inventory/stock-counts';
  if (res === 'inventory/movements') return 'inventory/transactions';
  if (res === 'inventory/demand-forecast') return 'inventory/forecast';
  if (res === 'inventory/policies') return 'inventory/stock-policies';
  return res;
}

export default function ResourceWorkspace({ resource }: { resource: string }) {
  const normResource = normalizeResource(resource);
  const searchParams = useSearchParams();

  // Phase 1-6 Custom Workspaces
  if (normResource.startsWith('control-tower')) return <ControlTowerWorkspace />;
  if (normResource.startsWith('drilling')) return <DrillingWorkspace />;
  if (normResource.startsWith('commercial')) return <CommercialCostingWorkspace />;
  if (normResource.startsWith('procurement') || normResource === 'purchase-orders') return <ProcurementWorkspace />;
  if (normResource.startsWith('hse') || normResource === 'capa') return <HseIncidentsWorkspace />;

  if (normResource === 'projects') return <ProjectRegister />;
  if (normResource === 'employees/available') return <EmployeeAvailabilityWorkspace />;
  if (normResource === 'rotations/current' || normResource === 'rotations/upcoming') return <RotationsWorkspace />;
  if (normResource === 'training/compliance') return <TrainingComplianceWorkspace />;
  if (normResource === 'employee-documents/expiring') return <ExpiringDocumentsWorkspace />;
  if (normResource === 'assets/expiring-documents' || normResource === 'assets/expiring') return <EquipmentExpiringDocumentsWorkspace />;
  if (normResource === 'hr/notifications' || normResource === 'notifications' || normResource === 'notification-schedules') return <NotificationWorkspace />;
  if (normResource === 'admin/leave' || normResource === 'leave-management' || normResource === 'hr/leave-requests' || normResource === 'employees/leave-requests' || normResource === 'leaves' || normResource === 'leave') return <LeaveManagementWorkspace />;
  if (normResource === 'admin' || normResource === 'users' || normResource === 'roles' || normResource === 'admin/users' || normResource === 'admin/roles') return <AdminWorkspace initialTab="users" />;
  if (normResource === 'incidents' || normResource === 'hr/incidents' || normResource === 'safety/incidents' || normResource === 'incident-reports') return <HseIncidentsWorkspace />;

  // Standalone Equipment Workspaces
  if (normResource === 'components' || normResource === 'assets/components') return <EquipmentComponentsWorkspace />;
  if (normResource === 'assets/meter-readings' || normResource === 'meter-readings' || normResource === 'meter_readings') return <EquipmentMeterReadingsWorkspace />;
  if (normResource === 'maintenance' || normResource === 'assets/maintenance') return <EquipmentMaintenanceWorkspace />;
  if (normResource === 'maintenance/work-orders' || normResource === 'work-orders' || normResource === 'work_orders') return <EquipmentWorkOrdersWorkspace />;
  if (normResource === 'maintenance/defects' || normResource === 'defects' || normResource === 'assets/defects') return <EquipmentDefectsWorkspace />;
  if (normResource === 'inspections' || normResource === 'assets/inspections') return <EquipmentInspectionsWorkspace />;
  if (normResource === 'fuel-logs' || normResource === 'fuel_logs' || normResource === 'assets/fuel-logs') return <EquipmentFuelLogsWorkspace />;

  const matchStore = /^(inventory\/stores|stores)\/([0-9a-f-]{36})$/i.exec(normResource);
  if (matchStore) return <StoreDetailView storeId={matchStore[2]} />;

  const matchItem = /^(inventory\/items|items)\/([0-9a-f-]{36})$/i.exec(normResource);
  if (matchItem) return <ItemDetailView itemId={matchItem[2]} />;

  const matchAsset = /^(assets)\/([0-9a-f-]{36})$/i.exec(normResource);
  if (matchAsset) return <AssetDetailView assetId={matchAsset[2]} />;

  const matchEmployee = /^(employees)\/([0-9a-f-]{36}|me)$/i.exec(normResource);
  if (matchEmployee) return <EmployeeDetailView employeeId={matchEmployee[2]} />;

  return <ResourceList key={normResource} resource={normResource} />;
}

function ResourceList({ resource }: { resource: string }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const queryParam = searchParams.get('search') || '';
  const auth = useAuth();
  const path = '/api/v1/' + resource;
  const read = operation(path, 'GET');
  const create = operation(path, 'POST');
  const allowed = (op: Row | null) =>
    !!op && (op.permissions || []).every((p: string) => auth.can(p));
  const [search, setSearch] = useState('');
  const [query, setQuery] = useState('');
  const [page, setPage] = useState(1);
  const [departments, setDepartments] = useState<Row[]>([]);
  const [positions, setPositions] = useState<Row[]>([]);
  const [roles, setRoles] = useState<Row[]>([]);
  const [leaveRequests, setLeaveRequests] = useState<Row[]>([]);
  const [deptFilter, setDeptFilter] = useState('');
  const [posFilter, setPosFilter] = useState('');
  const [roleFilter, setRoleFilter] = useState('');

  useEffect(() => {
    const value = queryParam;
    setSearch(value);
    setQuery(value);
    setPage(1);
  }, [resource, queryParam]);

  useEffect(() => {
    if (resource !== 'employees') return;
    let active = true;
    apiFetch<any>('/api/v1/departments?page_size=100')
      .then((d) => {
        if (!active) return;
        setDepartments(Array.isArray(d) ? d : d.items || []);
      })
      .catch(() => {});
    apiFetch<any>('/api/v1/positions?page_size=100')
      .then((d) => {
        if (!active) return;
        setPositions(Array.isArray(d) ? d : d.items || []);
      })
      .catch(() => {});
    apiFetch<any>('/api/v1/employees/leave-requests/all')
      .catch(() => apiFetch<any>('/api/v1/hr/leave-requests'))
      .then((d) => {
        if (!active) return;
        const lList = Array.isArray(d) ? d : d?.items || [];
        setLeaveRequests(lList);
      })
      .catch(() => {});
    apiFetch<any>('/api/v1/users/roles/all')
      .then((d) => {
        if (!active) return;
        const rList = Array.isArray(d) ? d : d.items || [];
        setRoles(rList);
      })
      .catch(() => {
        if (active) {
          setRoles([
            { id: 'system_administrator', name: 'System Administrator' },
            { id: 'hr_manager', name: 'HR Manager' },
            { id: 'project_manager', name: 'Project Manager' },
            { id: 'site_supervisor', name: 'Site Supervisor' },
            { id: 'field_worker', name: 'Field Worker' },
            { id: 'storekeeper', name: 'Storekeeper' },
            { id: 'operations_lead', name: 'Operations Lead' },
          ]);
        }
      });
    return () => {
      active = false;
    };
  }, [resource]);

  const [selected, setSelected] = useState<Row | null>(null);
  const [editing, setEditing] = useState(false);
  const [creating, setCreating] = useState(false);
  const params = new URLSearchParams();
  if (read?.parameters?.includes('page')) params.set('page', String(page));
  if (read?.parameters?.includes('page_size')) params.set('page_size', '20');
  if (query && read?.parameters?.includes('search')) params.set('search', query);
  if (deptFilter && read?.parameters?.includes('department_id')) params.set('department_id', deptFilter);
  if (posFilter && read?.parameters?.includes('position_id')) params.set('position_id', posFilter);
  const req = useData(allowed(read) ? path + '?' + params : null);
  const list = rows(req.data);

  let displayList = list;
  if (resource === 'employees') {
    if (deptFilter) {
      displayList = displayList.filter((r) => {
        const dId = r.department_id || r.department?.id;
        const dName = (r.department_name || r.department?.name || r.department || '').toString().toLowerCase();
        return dId === deptFilter || dName === deptFilter.toLowerCase();
      });
    }
    if (posFilter) {
      displayList = displayList.filter((r) => {
        const pId = r.position_id || r.position?.id;
        const pTitle = (r.job_title || r.position?.title || r.position?.name || r.position || '').toString().toLowerCase();
        return pId === posFilter || pTitle === posFilter.toLowerCase();
      });
    }
    if (roleFilter) {
      displayList = displayList.filter((r) => {
        const rVal = (
          r.user_role ||
          r.role ||
          r.user?.role ||
          r.system_role ||
          (Array.isArray(r.roles) ? r.roles.map((x: any) => x.name || x.code || x).join(' ') : '')
        )
          .toString()
          .toLowerCase();
        return rVal.includes(roleFilter.toLowerCase());
      });
    }
  }

  const total = req.data?.total ?? displayList.length;
  const pages = req.data?.pages ?? Math.max(1, Math.ceil(total / 20));
  const label = title(resource.split('/').pop()!);
  const detail = useData(
    selected && operation(path + '/' + selected.id, 'GET') ? path + '/' + selected.id : null
  );
  const current = detail.data || selected;
  const update = selected ? operation(path + '/' + selected.id, 'PATCH') : null;
  const [actionError, setActionError] = useState('');
  const [busy, setBusy] = useState(false);
  const [pending, setPending] = useState<string | null>(null);
  const [reason, setReason] = useState('');
  const [counts, setCounts] = useState<Row>({});
  const kind = resource.replace('inventory/', '');
  let actions: string[] = [];
  if (resource.startsWith('inventory/') && current) {
    const status = current.status;
    if (
      [
        'receipts',
        'issues',
        'returns',
        'transfers',
        'requests',
        'adjustments',
        'stock-counts',
      ].includes(kind)
    ) {
      if (status === 'DRAFT')
        actions =
          kind === 'stock-counts'
            ? ['start']
            : kind === 'requests'
              ? ['submit', 'cancel']
              : kind === 'transfers'
                ? ['approve', 'cancel']
                : ['adjustments', 'issues'].includes(kind)
                  ? ['approve', ...(kind === 'issues' ? ['post'] : []), 'cancel']
                  : ['post', ...(kind === 'receipts' ? ['cancel'] : [])];
      if (status === 'APPROVED')
        actions =
          kind === 'transfers'
            ? ['dispatch', 'cancel']
            : kind === 'requests'
              ? ['create-issue']
              : ['post'];
      if (status === 'IN_TRANSIT') actions = ['receive'];
      if (status === 'IN_PROGRESS') actions = ['submit'];
      if (status === 'SUBMITTED') actions = ['approve', ...(kind === 'requests' ? ['reject'] : [])];
      if (kind === 'stock-counts' && !['POSTED', 'CANCELLED', 'DRAFT'].includes(status))
        actions.push('restart');
    } else if (kind === 'reservations' && status === 'ACTIVE') actions = ['release', 'cancel'];
  }
  async function perform(action: string) {
    if (!current) return;
    setBusy(true);
    setActionError('');
    try {
      await apiFetch(path + '/' + current.id + '/' + action, {
        method: 'POST',
        body: JSON.stringify({
          reason: reason || undefined,
          ...(Object.keys(counts).length ? { quantities: counts } : {}),
        }),
      });
      setPending(null);
      setReason('');
      setCounts({});
      detail.reload();
      req.reload();
    } catch (e) {
      setActionError(e instanceof Error ? e.message : 'Action failed.');
    } finally {
      setBusy(false);
    }
  }
  if (!read)
    return (
      <div className="card p-8">
        <h1 className="text-xl font-bold">This view is unavailable</h1>
        <p className="mt-2 text-muted-foreground">Choose a section from the navigation.</p>
      </div>
    );

  return (
    <div className="space-y-5 fade-in">
      <div className="flex flex-wrap justify-between gap-4 items-end">
        <div>
          <Link
            href={resource.startsWith('inventory/') ? '/inventory-overview' : '/'}
            className="text-xs text-primary flex gap-1 items-center mb-3"
          >
            <ArrowLeft size={12} />
            Overview
          </Link>
          <h1 className="text-2xl font-bold">{label}</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {req.loading ? 'Loading records' : `${total} records`} · Cestos Operations
          </p>
        </div>
        <div className="flex gap-2">
          <button aria-label="Refresh records" className="btn-secondary" onClick={req.reload}>
            <RefreshCw size={16} />
          </button>
          {allowed(create) && (
            <button className="btn-primary" onClick={() => setCreating(true)}>
              <Plus size={16} />
              New {label.toLowerCase()}
            </button>
          )}
        </div>
      </div>
      {!allowed(read) ? (
        <div className="card p-8 text-muted-foreground">
          Your account does not have access to these records.
        </div>
      ) : (
        <>
          <form
            className="card p-3 flex gap-2"
            onSubmit={(e) => {
              e.preventDefault();
              setQuery(search);
              setPage(1);
            }}
          >
            {resource === 'employees' ? (
              <div className="flex flex-wrap gap-2 items-center w-full">
                <input
                  aria-label={'Search ' + label}
                  className="input-field flex-1 min-w-full"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search employee name, number, email..."
                />
                <select
                  aria-label="Filter by department"
                  className="input-field w-auto min-w-[150px] bg-background text-xs"
                  value={deptFilter}
                  onChange={(e) => {
                    setDeptFilter(e.target.value);
                    setPage(1);
                  }}
                >
                  <option value="">All Departments</option>
                  {departments.map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.name}
                    </option>
                  ))}
                </select>
                <select
                  aria-label="Filter by position"
                  className="input-field w-auto min-w-[150px] bg-background text-xs"
                  value={posFilter}
                  onChange={(e) => {
                    setPosFilter(e.target.value);
                    setPage(1);
                  }}
                >
                  <option value="">All Positions</option>
                  {positions.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.title || p.name}
                    </option>
                  ))}
                </select>
                <select
                  aria-label="Filter by user role"
                  className="input-field w-auto min-w-[150px] bg-background text-xs"
                  value={roleFilter}
                  onChange={(e) => {
                    setRoleFilter(e.target.value);
                    setPage(1);
                  }}
                >
                  <option value="">All User Roles</option>
                  {roles.map((r) => (
                    <option key={r.id || r.code || r.name} value={r.name || r.code || r.id}>
                      {r.name || r.title || r.code}
                    </option>
                  ))}
                </select>
              
                {(search || deptFilter || posFilter || roleFilter) && (
                  <button
                    type="button"
                    className="btn-secondary text-xs text-muted-foreground hover:text-foreground"
                    onClick={() => {
                      setSearch('');
                      setQuery('');
                      setDeptFilter('');
                      setPosFilter('');
                      setRoleFilter('');
                      setPage(1);
                    }}
                  >
                    Reset
                  </button>
                )}
              </div>
            ) : read.parameters?.includes('search') ? (
              <>
                <input
                  aria-label={'Search ' + label}
                  className="input-field max-w-lg"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder={'Search ' + label.toLowerCase() + '…'}
                />
                <button className="btn-secondary">
                  <Search size={16} />
                  Search
                </button>
              </>
            ) : (
              <p className="text-sm text-muted-foreground px-2 py-1">
                Select a record to view its details.
              </p>
            )}
          </form>
          <State loading={req.loading} error={req.error} retry={req.reload}>
            <div className="card overflow-hidden">
              {resource === 'employees' ? (
                displayList.length === 0 ? (
                  <div className="py-12 text-center text-muted-foreground space-y-2">
                    <p className="text-sm font-semibold">No employees found matching filter criteria.</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-xs text-left">
                      <thead className="bg-muted text-muted-foreground font-semibold border-b">
                        <tr>
                          <th className="p-3">Employee Name</th>
                          <th className="p-3">Department & Role</th>
                          <th className="p-3">Status</th>
                          <th className="p-3">Home Location</th>
                          <th className="p-3">Contact</th>
                          <th className="p-3 text-right">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y">
                        {displayList.map((emp) => {
                          const fullName = getEmployeeFullName(emp);
                          const roleName = getEmployeeRole(emp, positions);
                          const deptName = getEmployeeDepartment(emp, departments);
                          const { onLeave } = getEmployeeLeaveInfo(emp, leaveRequests);
                          const empStatus = (emp.employment_status || emp.status || 'ACTIVE').toString().toUpperCase();

                          return (
                            <tr key={emp.id} className="hover:bg-muted/30 transition-colors">
                              <td className="p-3">
                                <div className="flex items-center gap-3">
                                  <div className="w-8 h-8 rounded-full bg-primary/10 text-primary font-bold flex items-center justify-center text-xs shrink-0 border border-primary/20">
                                    {fullName.charAt(0).toUpperCase()}
                                  </div>
                                  <div>
                                    <Link
                                      href={`/workspace/employees/${emp.id}`}
                                      className="font-bold text-foreground hover:text-primary transition-colors block"
                                    >
                                      {fullName}
                                    </Link>
                                    <span className="text-[11px] text-muted-foreground">
                                      ID: {emp.employee_number || String(emp.id).slice(0, 8)}
                                    </span>
                                  </div>
                                </div>
                              </td>

                              <td className="p-3">
                                <span className="font-semibold text-foreground block">{display(roleName)}</span>
                                <span className="text-muted-foreground text-[11px]">{display(deptName)}</span>
                              </td>

                              <td className="p-3">
                                {onLeave ? (
                                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-amber-100 text-amber-900 border border-amber-300">
                                    <Clock size={10} /> On Leave
                                  </span>
                                ) : empStatus === 'ACTIVE' || empStatus === 'EMPLOYED' ? (
                                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-100 text-emerald-800 border border-emerald-200">
                                    <CheckCircle size={10} /> Active / Available
                                  </span>
                                ) : (
                                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-slate-100 text-slate-800 border border-slate-200">
                                    {empStatus.replace(/_/g, ' ')}
                                  </span>
                                )}
                              </td>

                              <td className="p-3 text-muted-foreground">
                                <span className="flex items-center gap-1 text-xs text-foreground">
                                  <MapPin size={12} className="text-muted-foreground" />
                                  {display(
                                    emp.work_location ||
                                      emp.home_location ||
                                      emp.location_name ||
                                      emp.location?.name ||
                                      'Headquarters'
                                  )}
                                </span>
                              </td>

                              <td className="p-3 text-muted-foreground">
                                <span className="block text-[11px] text-foreground">{emp.email || '—'}</span>
                                <span className="block text-[11px]">{emp.phone || '—'}</span>
                              </td>

                              <td className="p-3 text-right">
                                <div className="flex items-center justify-end gap-2">
                                  <Link
                                    href={`/workspace/employees/${emp.id}`}
                                    className="btn-secondary py-1 px-2.5 text-[11px] flex items-center gap-1"
                                  >
                                    <Eye size={12} /> Profile
                                  </Link>
                                  {allowed(update) && (
                                    <button
                                      type="button"
                                      onClick={() => {
                                        setSelected(emp);
                                        setEditing(true);
                                      }}
                                      className="btn-secondary py-1 px-2.5 text-[11px]"
                                    >
                                      Edit
                                    </button>
                                  )}
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )
              ) : resource === 'assets' ? (
                <div className="overflow-x-auto">
                  <table className="w-full text-xs text-left">
                    <thead className="bg-muted text-muted-foreground font-semibold border-b">
                      <tr>
                        <th className="p-3">Asset Photo</th>
                        <th className="p-3">Asset Name & Tag</th>
                        <th className="p-3">Manufacturer & Model</th>
                        <th className="p-3">Status</th>
                        <th className="p-3">Created At</th>
                        <th className="p-3 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {displayList.map((asset) => {
                        const imgUrl = asset.photo_url || asset.profile_photo_url || asset.image_url;
                        const createdDateStr = asset.created_at
                          ? new Date(asset.created_at).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })
                          : '—';
                        const status = (asset.status || 'AVAILABLE').toString().toUpperCase();

                        return (
                          <tr key={asset.id} className="hover:bg-muted/30 transition-colors">
                            <td className="p-3">
                              {imgUrl ? (
                                <img
                                  src={imgUrl}
                                  alt={asset.name || 'Asset'}
                                  className="w-10 h-10 rounded-lg object-cover border border-border shadow-xs"
                                />
                              ) : (
                                <div className="w-10 h-10 rounded-lg bg-primary/10 text-primary font-bold flex items-center justify-center text-xs shrink-0 border border-primary/20">
                                  <Truck size={18} />
                                </div>
                              )}
                            </td>

                            <td className="p-3">
                              <Link
                                href={`/workspace/assets/${asset.id}`}
                                className="font-bold text-foreground hover:text-primary transition-colors block text-sm"
                              >
                                {asset.name}
                              </Link>
                              <span className="text-[11px] text-muted-foreground font-mono">
                                Tag: {asset.asset_number || asset.serial_number || '—'}
                              </span>
                            </td>

                            <td className="p-3">
                              <span className="font-semibold text-foreground block">
                                {asset.manufacturer || '—'}
                              </span>
                              <span className="text-muted-foreground text-[11px]">
                                {asset.model ? `Model: ${asset.model}` : '—'}
                              </span>
                            </td>

                            <td className="p-3">
                              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-100 text-emerald-800 border border-emerald-200">
                                <CheckCircle size={10} /> {status.replace(/_/g, ' ')}
                              </span>
                            </td>

                            <td className="p-3 font-medium text-foreground">
                              {createdDateStr}
                            </td>

                            <td className="p-3 text-right">
                              <div className="flex items-center justify-end gap-2">
                                <Link
                                  href={`/workspace/assets/${asset.id}`}
                                  className="btn-secondary py-1 px-2.5 text-[11px] flex items-center gap-1"
                                >
                                  <Eye size={12} /> Open
                                </Link>
                                {allowed(update) && (
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setSelected(asset);
                                      setEditing(true);
                                    }}
                                    className="btn-secondary py-1 px-2.5 text-[11px]"
                                  >
                                    Edit
                                  </button>
                                )}
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              ) : (
                <Table
                  data={displayList}
                  onSelect={(row) => {
                    if (resource === 'inventory/stores' || resource === 'stores') {
                      router.push('/workspace/inventory/stores/' + row.id);
                    } else if (resource === 'hr/salaries' && row.employee_id) {
                      router.push('/workspace/employees/' + row.employee_id);
                    } else if (resource === 'employees') {
                      router.push('/workspace/employees/' + row.id);
                    } else if (resource === 'assets') {
                      router.push('/workspace/assets/' + row.id);
                    } else {
                      setSelected(row);
                    }
                  }}
                />
              )}
              {pages > 1 && (
                <div className="flex items-center justify-between border-t p-3 text-xs text-muted-foreground">
                  <span>
                    Showing {displayList.length} of {total} records
                  </span>
                  <div className="flex gap-2">
                    <button
                      className="btn-secondary"
                      disabled={page === 1}
                      onClick={() => setPage(page - 1)}
                    >
                      Previous
                    </button>
                    <button
                      className="btn-secondary"
                      disabled={page >= pages}
                      onClick={() => setPage(page + 1)}
                    >
                      Next
                    </button>
                  </div>
                </div>
              )}
            </div>
          </State>
        </>
      )}
      {selected && !editing && (
        <Modal
          name={display(
            current?.name ||
              current?.document_number ||
              current?.employee_number ||
              current?.asset_number ||
              label
          )}
          onClose={() => setSelected(null)}
        >
          <State loading={detail.loading} error={detail.error} retry={detail.reload}>
            {current && (
              <>
                {resource === 'clients' && current?.profile_photo_url && (
                  <ClientLogo clientId={current.id} />
                )}
                {(resource === 'inventory/items' || resource === 'items') ? (
                  <div className="space-y-4">
                    <Facts
                      data={{
                        'Item Number / SKU': current.item_number || current.sku || 'N/A',
                        'Item Name': current.name || 'N/A',
                        'Category': current.category_name || current.category?.name || 'Catalog Item',
                        'Base Unit': current.unit_symbol || current.base_unit?.symbol || 'units',
                        'Standard Cost': current.standard_cost != null ? `$${Number(current.standard_cost).toFixed(2)}` : 'N/A',
                        'Minimum Stock Level': current.minimum_stock_level ?? 0,
                        'Reorder Point': current.reorder_point ?? 0,
                        'Status': current.is_active !== false ? 'Active' : 'Inactive',
                      }}
                    />
                    <div className="p-3.5 bg-blue-50/80 border border-blue-200/80 rounded-xl text-xs text-slate-800 flex items-center justify-between flex-wrap gap-2 mt-4">
                      <div>
                        <span className="font-bold text-slate-900 block">Complete Item Detail Page Available</span>
                        <span className="text-muted-foreground text-[11px]">View live stock levels, consumption trends, store balances & actions.</span>
                      </div>
                      <Link
                        className="btn-primary text-xs font-semibold shrink-0 flex items-center gap-1.5 shadow-xs"
                        href={'/workspace/inventory/items/' + current.id}
                        onClick={() => setSelected(null)}
                      >
                        <span>More Details & Charts</span>
                        <ArrowRight size={13} />
                      </Link>
                    </div>
                  </div>
                ) : (
                  <Facts data={current} />
                )}
                {current.items && (
                  <div className="mt-6">
                    <h3 className="font-semibold mb-3">Items</h3>
                    <Table data={current.items} />
                  </div>
                )}
                <div className="flex flex-wrap gap-2 mt-6 border-t pt-4">
                  {(resource === 'inventory/items' || resource === 'items') && (
                    <Link
                      className="btn-primary text-xs font-semibold flex items-center gap-1.5"
                      href={'/workspace/inventory/items/' + current.id}
                      onClick={() => setSelected(null)}
                    >
                      <span>More Details / Full Workspace</span>
                      <ExternalLink size={13} />
                    </Link>
                  )}
                  {allowed(update) &&
                    (!resource.startsWith('inventory/') ||
                      !current.status ||
                      current.status === 'DRAFT') && (
                      <button className="btn-secondary text-xs" onClick={() => setEditing(true)}>
                        Edit record
                      </button>
                    )}
                  {resource === 'projects' && (
                    <Link
                      className="btn-primary"
                      href={'/project-command-center?project=' + current.id}
                    >
                      Open command center
                    </Link>
                  )}
                  {actions
                    .filter((a) => allowed(operation(path + '/' + current.id + '/' + a, 'POST')))
                    .map((a) => (
                      <button
                        className="btn-primary"
                        key={a}
                        onClick={() => {
                          setPending(a);
                          setActionError('');
                        }}
                      >
                        {title(a)}
                      </button>
                    ))}
                </div>
              </>
            )}
          </State>
        </Modal>
      )}
      {pending && current && (
        <Modal name={title(pending) + ' ' + label.toLowerCase()} onClose={() => setPending(null)}>
          {pending === 'create-issue' ? (
            <RecordForm
              resource={resource}
              path={path + '/' + current.id + '/create-issue'}
              operation={operation(path + '/' + current.id + '/create-issue', 'POST')!}
              onClose={() => setPending(null)}
              onSaved={() => {
                setPending(null);
                req.reload();
              }}
            />
          ) : (
            <form
              className="space-y-4"
              onSubmit={(e) => {
                e.preventDefault();
                void perform(pending);
              }}
            >
              <p className="text-sm text-muted-foreground">
                Apply this action to {current.document_number || 'the selected record'}.
              </p>
              {kind === 'stock-counts' &&
                pending === 'submit' &&
                current.items?.map((line: Row) => (
                  <label className="block text-sm" key={line.id}>
                    Count for {line.item_id}
                    <input
                      className="input-field mt-1"
                      required
                      type="number"
                      min="0"
                      step="0.0001"
                      value={counts[line.id] ?? ''}
                      onChange={(e) => setCounts({ ...counts, [line.id]: e.target.value })}
                    />
                  </label>
                ))}
              <label className="block text-sm">
                Reason{pending === 'restart' ? ' *' : ' (optional)'}
                <input
                  className="input-field mt-1"
                  value={reason}
                  required={pending === 'restart'}
                  onChange={(e) => setReason(e.target.value)}
                />
              </label>
              {actionError && (
                <p role="alert" className="text-red-700">
                  {actionError}
                </p>
              )}
              <button disabled={busy} className="btn-primary">
                {busy ? 'Processing…' : title(pending)}
              </button>
            </form>
          )}
        </Modal>
      )}
      {creating && resource === 'employees' && (
        <EmployeeWizardForm
          onClose={() => setCreating(false)}
          onSaved={(emp) => {
            setCreating(false);
            req.reload();
            if (emp?.id) router.push('/workspace/employees/' + emp.id);
          }}
        />
      )}
      {(creating || editing) && resource !== 'employees' && (
        <RecordForm
          resource={resource}
          path={editing ? path + '/' + selected!.id : path}
          operation={editing ? update! : create!}
          initial={editing ? current : undefined}
          onClose={() => {
            setCreating(false);
            setEditing(false);
          }}
          onSaved={() => {
            setCreating(false);
            setEditing(false);
            setSelected(null);
            req.reload();
          }}
        />
      )}
    </div>
  );
}
