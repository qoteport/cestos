'use client';

import { FormEvent, useState } from 'react';
import Link from 'next/link';
import { ShieldCheck, CheckSquare, Square, Search, UserCheck, Info, UserMinus, ShieldOff, AlertTriangle } from 'lucide-react';
import { apiFetch } from '@/lib/api';
import { useAuth } from './AuthProvider';
import { Modal, Row, State, display, rows, useData } from './DataUI';
import SearchableSelect from './SearchableSelect';
import AppDateTimePicker from './ui/AppDateTimePicker';

// ── Unified Searchable Supervisor / Project Selector ─────────────────────────
function SingleSearchSelect({
  label,
  name,
  options,
  placeholder,
  required = false,
  defaultValue = '',
  onChange,
}: {
  label: string;
  name: string;
  options: { id: string; name: string; subtitle?: string; disabled?: boolean }[];
  placeholder: string;
  required?: boolean;
  defaultValue?: string;
  onChange?: (val: string) => void;
}) {
  const [selectedId, setSelectedId] = useState(defaultValue);

  return (
    <div className="space-y-1.5">
      <label className="block text-sm font-600 text-foreground">{label}</label>
      <input type="hidden" name={name} value={selectedId} required={required} />
      <SearchableSelect
        options={[
          { value: '', label: placeholder },
          ...options.map((opt) => ({
            value: opt.id,
            label: opt.subtitle ? `${opt.name} (${opt.subtitle})` : opt.name,
            disabled: opt.disabled,
          })),
        ]}
        value={selectedId}
        onChange={(val) => {
          setSelectedId(val);
          if (onChange) onChange(val);
        }}
        placeholder={placeholder}
        searchable={options.length > 5}
        required={required}
      />
    </div>
  );
}

// ── Modal for Batch Assigning Project Supervisor to Multiple Employees ───────
function AssignSupervisorModal({
  projectId,
  employees,
  onClose,
  onSaved,
}: {
  projectId: string;
  employees: Row[];
  onClose: () => void;
  onSaved: () => void;
}) {
  const auth = useAuth();
  const [selectedEmpIds, setSelectedEmpIds] = useState<string[]>(employees.map((e) => e.id));
  const [empSearch, setEmpSearch] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const supervisors = useData('/api/v1/employees?page_size=100');

  const filteredEmployees = employees.filter((emp) => {
    const fullName = display(emp).toLowerCase();
    const num = String(emp.employee_number || '').toLowerCase();
    const q = empSearch.toLowerCase();
    return fullName.includes(q) || num.includes(q);
  });

  const toggleEmp = (id: string) => {
    setSelectedEmpIds((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    );
  };

  const toggleAll = () => {
    if (selectedEmpIds.length === employees.length) {
      setSelectedEmpIds([]);
    } else {
      setSelectedEmpIds(employees.map((e) => e.id));
    }
  };

  const supervisorOptions = rows(supervisors.data)
    .filter((s) => s.is_active)
    .map((s) => ({
      id: String(s.id),
      name: display(s),
      subtitle: String(s.employee_number || ''),
    }));

  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (busy || !selectedEmpIds.length) return;
    setError('');
    setBusy(true);
    const values = new FormData(e.currentTarget);
    const supervisorId = values.get('supervisor_id') || null;

    try {
      // For each selected employee, fetch active assignment and update supervisor_id
      await Promise.all(
        selectedEmpIds.map(async (empId) => {
          const res = await apiFetch<{ items?: Row[] }>('/api/v1/employees/' + empId + '/assignments');
          const assignmentsList = Array.isArray(res) ? res : res?.items || [];
          const activeAssignment = assignmentsList.find(
            (a) => a.status === 'ACTIVE' && a.project_id === projectId
          );

          if (activeAssignment) {
            await apiFetch('/api/v1/employee-assignments/' + activeAssignment.id, {
              method: 'PATCH',
              body: JSON.stringify({ supervisor_id: supervisorId }),
            });
          }
        })
      );
      onSaved();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to batch assign supervisor');
    } finally {
      setBusy(false);
    }
  }

  return (
    <Modal name="Assign Project Supervisor (Batch)" onClose={() => { if (!busy) onClose(); }}>
      <form className="space-y-4" onSubmit={submit}>
        <p className="text-sm text-muted-foreground">
          Select one or multiple employees on this project and assign their designated supervisor in bulk.
        </p>

        {/* Multi-employee Checklist */}
        <div className="border border-border rounded-lg p-3 space-y-3 bg-muted/20">
          <div className="flex items-center justify-between">
            <label className="text-xs font-700 uppercase tracking-widest text-muted-foreground">
              Select Employees ({selectedEmpIds.length} of {employees.length} selected)
            </label>
            <button
              type="button"
              className="text-xs text-primary font-600 hover:underline flex items-center gap-1"
              onClick={toggleAll}
            >
              {selectedEmpIds.length === employees.length ? 'Deselect All' : 'Select All'}
            </button>
          </div>

          <div className="relative">
            <Search size={13} className="absolute left-2.5 top-2.5 text-muted-foreground" />
            <input
              type="text"
              className="input-field text-xs pl-8 py-1.5"
              placeholder="Search team members…"
              value={empSearch}
              onChange={(e) => setEmpSearch(e.target.value)}
            />
          </div>

          <div className="max-h-[160px] overflow-y-auto divide-y divide-border border border-border rounded bg-background">
            {filteredEmployees.map((emp) => {
              const isChecked = selectedEmpIds.includes(emp.id);
              return (
                <div
                  key={emp.id}
                  className="flex items-center gap-3 p-2 hover:bg-muted/40 cursor-pointer text-xs"
                  onClick={() => toggleEmp(emp.id)}
                >
                  {isChecked ? (
                    <CheckSquare size={16} className="text-primary flex-shrink-0" />
                  ) : (
                    <Square size={16} className="text-muted-foreground flex-shrink-0" />
                  )}
                  <span className="font-600 text-foreground">{display(emp)}</span>
                  <span className="text-muted-foreground">({emp.employee_number || 'Team member'})</span>
                </div>
              );
            })}
            {!filteredEmployees.length && (
              <p className="text-xs text-muted-foreground p-3 text-center">No matching employees found.</p>
            )}
          </div>
        </div>

        {/* Unified Searchable Supervisor Dropdown */}
        <State loading={supervisors.loading} error={supervisors.error} retry={supervisors.reload}>
          <SingleSearchSelect
            label="Project supervisor"
            name="supervisor_id"
            placeholder="Select project supervisor (optional)"
            options={supervisorOptions}
          />
        </State>

        {error && <p role="alert" className="text-sm text-red-700">{error}</p>}

        <div className="flex justify-end gap-2 pt-2">
          <button type="button" disabled={busy} className="btn-secondary text-xs" onClick={onClose}>
            Cancel
          </button>
          <button
            type="submit"
            className="btn-primary text-xs"
            disabled={busy || !auth.can('employees.assign') || !selectedEmpIds.length}
          >
            {busy ? 'Assigning…' : `Assign supervisor to ${selectedEmpIds.length} employee${selectedEmpIds.length !== 1 ? 's' : ''}`}
          </button>
        </div>
      </form>
    </Modal>
  );
}

// ── Transfer Employee Modal ──────────────────────────────────────────────────
export function TransferEmployeeModal({
  employee,
  projectId,
  onClose,
  onSaved,
}: {
  employee: Row;
  projectId: string;
  onClose: () => void;
  onSaved: () => void;
}) {
  const auth = useAuth();
  const assignments = useData('/api/v1/employees/' + employee.id + '/assignments');
  const [destination, setDestination] = useState(projectId);
  const projects = useData('/api/v1/projects?page_size=100');
  const supervisors = useData('/api/v1/employees?page_size=100');
  const sites = useData(destination ? '/api/v1/projects/' + destination + '/sites' : null);

  const current = rows(assignments.data).find((a) => a.status === 'ACTIVE' && a.is_primary);

  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const projectOptions = rows(projects.data)
    .filter((p) => p.is_active)
    .map((p) => ({
      id: String(p.id),
      name: String(p.name),
      subtitle: String(p.project_number || ''),
      disabled: p.id === current?.project_id,
    }));

  const isSupervisorRow = (s: Row) => {
    const role = String(s.role || '').toUpperCase();
    const pos = String(s.position_name || s.position || s.job_title || s.title || '').toLowerCase();
    return (
      !!s.is_supervisor ||
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
  };

  const supervisorOptions = rows(supervisors.data)
    .filter((s) => s.id !== employee.id && s.is_active)
    .sort((a, b) => (isSupervisorRow(b) ? 1 : 0) - (isSupervisorRow(a) ? 1 : 0))
    .map((s) => ({
      id: String(s.id),
      name: display(s),
      subtitle: s.job_title || s.position_name || (isSupervisorRow(s) ? 'Supervisor' : String(s.employee_number || '')),
    }));

  const defaultRole = employee.job_title || employee.position_name || (typeof employee.position === 'string' ? employee.position : employee.position?.name) || '';
  const [startDate, setStartDate] = useState(new Date().toISOString().slice(0, 10));
  const [locationId, setLocationId] = useState('');

  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (busy) return;
    setError('');
    setBusy(true);
    const values = new FormData(e.currentTarget);
    const body: Row = {
      project_id: destination,
      start_date: startDate,
      location_id: locationId || null,
      role_on_project: values.get('role_on_project') || null,
      supervisor_id: values.get('supervisor_id') || null,
      notes: values.get('notes') || null,
    };
    const path = '/api/v1/employees/' + employee.id + (current ? '/transfer' : '/assignments');

    try {
      await apiFetch(path, {
        method: 'POST',
        body: JSON.stringify(body),
      });
      onSaved();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to transfer employee');
    } finally {
      setBusy(false);
    }
  }

  const permitted = auth.can(current ? 'employees.transfer' : 'employees.assign');

  return (
    <Modal name={`Transfer employee: ${display(employee)}`} onClose={() => { if (!busy) onClose(); }}>
      <State loading={assignments.loading} error={assignments.error} retry={assignments.reload}>
        <form className="space-y-4" onSubmit={submit}>
          <p className="text-sm text-muted-foreground">
            {current
              ? 'Transfer this employee to another active project. The current assignment will conclude on the effective date.'
              : 'Assign this employee to an active project.'}
          </p>
          {current && <div className="border-l-4 border-[#184877] bg-blue-50 px-3 py-2 text-sm text-slate-800"><span className="font-semibold">Current project: </span>{current.project_name || current.project?.name || current.project?.project_name || current.project_id}</div>}

          {/* Unified Project Dropdown */}
          <State loading={projects.loading} error={projects.error} retry={projects.reload}>
            <SingleSearchSelect
              label="Destination project"
              name="destination"
              placeholder="Select project"
              required
              defaultValue={destination}
              options={projectOptions}
              onChange={(val) => setDestination(val)}
            />
          </State>

          <div>
            <div className="flex items-center gap-1.5 font-500 text-sm mb-1">
              <span>Effective start date *</span>
              <div className="relative group inline-flex items-center">
                <Info size={13} className="text-muted-foreground/70 hover:text-primary transition-colors cursor-help" />
                <div className="absolute left-0 bottom-full mb-1.5 hidden group-hover:block w-64 p-2 bg-slate-900 text-slate-100 text-[11px] leading-tight rounded shadow-xl z-50 pointer-events-none">
                  Contractual date when worker begins project assignment.
                  <div className="absolute top-full left-2 border-4 border-transparent border-t-slate-900" />
                </div>
              </div>
            </div>
            <AppDateTimePicker
              mode="date"
              required
              min={current?.start_date}
              value={startDate}
              onChange={(val) => setStartDate(val)}
              placeholder="Select start date"
            />
          </div>

          <State loading={sites.loading} error={sites.error} retry={sites.reload}>
            <div>
              <div className="flex items-center gap-1.5 font-500 text-sm mb-1">
                <span>Project site / location</span>
                <div className="relative group inline-flex items-center">
                  <Info size={13} className="text-muted-foreground/70 hover:text-primary transition-colors cursor-help" />
                  <div className="absolute left-0 bottom-full mb-1.5 hidden group-hover:block w-64 p-2 bg-slate-900 text-slate-100 text-[11px] leading-tight rounded shadow-xl z-50 pointer-events-none">
                    Specific site location associated with the selected destination project.
                    <div className="absolute top-full left-2 border-4 border-transparent border-t-slate-900" />
                  </div>
                </div>
              </div>
              <SearchableSelect
                key={destination}
                options={[
                  { value: '', label: 'No site assigned' },
                  ...rows(sites.data)
                    .filter((s) => s.is_active)
                    .map((s) => ({ value: s.id, label: s.name })),
                ]}
                value={locationId}
                onChange={(val) => setLocationId(val)}
                placeholder="No site assigned"
                searchable={rows(sites.data).length > 5}
              />
            </div>
          </State>

          <div>
            <div className="flex items-center gap-1.5 font-500 text-sm mb-1">
              <span>Role on project</span>
              <div className="relative group inline-flex items-center">
                <Info size={13} className="text-muted-foreground/70 hover:text-primary transition-colors cursor-help" />
                <div className="absolute left-0 bottom-full mb-1.5 hidden group-hover:block w-64 p-2 bg-slate-900 text-slate-100 text-[11px] leading-tight rounded shadow-xl z-50 pointer-events-none">
                  Designated site role (defaults to employee's position).
                  <div className="absolute top-full left-2 border-4 border-transparent border-t-slate-900" />
                </div>
              </div>
            </div>
            <input name="role_on_project" maxLength={150} className="input-field" defaultValue={defaultRole} placeholder="e.g. Drill Operator" />
          </div>

          {/* Unified Searchable Supervisor Dropdown */}
          <State loading={supervisors.loading} error={supervisors.error} retry={supervisors.reload}>
            <SingleSearchSelect
              label="Project supervisor"
              name="supervisor_id"
              placeholder="Select project supervisor (optional)"
              options={supervisorOptions}
            />
          </State>

          <label className="block text-sm font-500">
            Assignment / transfer notes
            <textarea name="notes" className="input-field mt-1" rows={2} />
          </label>

          {error && <p role="alert" className="text-sm text-red-700">{error}</p>}
          {!permitted && (
            <p className="text-sm text-muted-foreground">
              You do not have permission for this assignment action.
            </p>
          )}

          <div className="flex justify-end gap-2 pt-2">
            <button type="button" disabled={busy} className="btn-secondary text-xs" onClick={onClose}>
              Cancel
            </button>
            <button
              type="submit"
              className="btn-primary text-xs"
              disabled={busy || !permitted || !destination || destination === current?.project_id}
            >
              {busy ? 'Saving…' : current ? 'Transfer employee' : 'Assign employee'}
            </button>
          </div>
        </form>
      </State>
    </Modal>
  );
}

// ── Main Component ───────────────────────────────────────────────────────────
export default function ProjectWorkforce({
  projectId,
  employees,
  assignments = [],
  onSaved,
}: {
  projectId: string;
  employees: Row[];
  assignments?: Row[];
  onSaved: () => void;
}) {
  const auth = useAuth();
  const [picking, setPicking] = useState(false);
  const [assigningSupervisor, setAssigningSupervisor] = useState(false);
  const [search, setSearch] = useState('');
  const [selectedEmp, setSelectedEmp] = useState<Row | null>(null);
  const [assignmentToRemove, setAssignmentToRemove] = useState<{ employee: Row; assignment: Row } | null>(null);
  const [supervisorToRemove, setSupervisorToRemove] = useState<{ employee: Row; reports: Row[] } | null>(null);
  const [inspectingEmployeeId, setInspectingEmployeeId] = useState<string | null>(null);
  const [removalBusy, setRemovalBusy] = useState(false);
  const [removalError, setRemovalError] = useState('');

  const candidates = useData(
    picking ? '/api/v1/employees?page_size=100&search=' + encodeURIComponent(search) : null
  );

  // Project supervisor status is based on active project-assignment links. This
  // lets the project remove a supervisor designation without changing an HR
  // title or an organization-wide employee flag.
  const supervisorIds = new Set<string>();
  employees.forEach((emp) => {
    if (emp.assignment_supervisor_id) supervisorIds.add(String(emp.assignment_supervisor_id));
  });
  assignments.forEach((a: Row) => {
    if (a.supervisor_id && String(a.project_id) === projectId && a.status === 'ACTIVE') {
      supervisorIds.add(String(a.supervisor_id));
    }
  });

  async function inspectAssignmentRemoval(employee: Row) {
    setRemovalError(''); setInspectingEmployeeId(String(employee.id));
    try {
      const response = await apiFetch<any>(`/api/v1/employees/${employee.id}/assignments`);
      const list = Array.isArray(response) ? response : response?.items || [];
      const assignment = list.find((item: Row) => item.status === 'ACTIVE' && String(item.project_id) === projectId);
      if (!assignment) { setRemovalError(`${display(employee)} has no active assignment on this project.`); return; }
      setAssignmentToRemove({ employee, assignment });
    } catch (err) { setRemovalError(err instanceof Error ? err.message : 'Could not load this employee’s project assignment.'); }
    finally { setInspectingEmployeeId(null); }
  }

  async function inspectSupervisorRemoval(employee: Row) {
    setRemovalError(''); setInspectingEmployeeId(String(employee.id));
    try {
      const reports = await Promise.all(employees.map(async (teamMember) => {
        const response = await apiFetch<any>(`/api/v1/employees/${teamMember.id}/assignments`);
        const list = Array.isArray(response) ? response : response?.items || [];
        return list.find((item: Row) => item.status === 'ACTIVE' && String(item.project_id) === projectId && String(item.supervisor_id) === String(employee.id));
      }));
      setSupervisorToRemove({ employee, reports: reports.filter(Boolean) as Row[] });
    } catch (err) { setRemovalError(err instanceof Error ? err.message : 'Could not load the employees assigned to this supervisor.'); }
    finally { setInspectingEmployeeId(null); }
  }

  async function confirmAssignmentRemoval() {
    if (!assignmentToRemove || removalBusy) return;
    setRemovalBusy(true); setRemovalError('');
    try {
      await apiFetch(`/api/v1/employee-assignments/${assignmentToRemove.assignment.id}/complete`, { method: 'POST' });
      setAssignmentToRemove(null); onSaved();
    } catch (err) { setRemovalError(err instanceof Error ? err.message : 'Could not remove this employee from the project.'); }
    finally { setRemovalBusy(false); }
  }

  async function confirmSupervisorRemoval() {
    if (!supervisorToRemove || removalBusy || !supervisorToRemove.reports.length) return;
    setRemovalBusy(true); setRemovalError('');
    let completed = 0;
    try {
      for (const assignment of supervisorToRemove.reports) {
        await apiFetch(`/api/v1/employee-assignments/${assignment.id}`, { method: 'PATCH', body: JSON.stringify({ supervisor_id: null }) });
        completed += 1;
      }
      setSupervisorToRemove(null); onSaved();
    } catch (err) {
      setRemovalError(completed ? `Supervisor links were cleared for ${completed} employee(s), but another update failed: ${err instanceof Error ? err.message : 'Unknown error'}` : err instanceof Error ? err.message : 'Could not remove this supervisor designation.');
      if (completed) onSaved();
    } finally { setRemovalBusy(false); }
  }

  return (
    <div className="space-y-4">
      {/* Section Header with Actions */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold">Project workforce</h2>
          <p className="text-sm text-muted-foreground">
            Personnel assigned to this project ({employees.length} team member{employees.length !== 1 ? 's' : ''}).
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {auth.can('employees.assign') && employees.length > 0 && (
            <button
              className="btn-secondary text-xs flex items-center gap-1.5"
              onClick={() => setAssigningSupervisor(true)}
            >
              <UserCheck size={13} className="text-primary" />
              Assign project supervisor
            </button>
          )}
          {auth.can('employees.read_basic') &&
            (auth.can('employees.assign') || auth.can('employees.transfer')) && (
              <button className="btn-primary text-xs" onClick={() => setPicking(true)}>
                Assign / transfer employee
              </button>
            )}
        </div>
      </div>

      {/* Workforce Cards — supervisors listed first */}
      {[...employees]
        .sort((a, b) => {
          const aSuper = supervisorIds.has(String(a.id)) ? 0 : 1;
          const bSuper = supervisorIds.has(String(b.id)) ? 0 : 1;
          return aSuper - bSuper;
        })
        .map((e) => {
        const isSupervisor = supervisorIds.has(String(e.id));
        const hasDirectReports = employees.some((member) => String(member.assignment_supervisor_id) === String(e.id))
          || assignments.some((assignment) => assignment.status === 'ACTIVE' && String(assignment.project_id) === projectId && String(assignment.supervisor_id) === String(e.id));
        const subtitle = [
          e.employee_number || 'No employee #',
          e.role_on_project || e.job_title || '',
        ].filter(Boolean).join(' · ');
        return (
          <div className="border rounded-lg p-4 flex flex-wrap items-center justify-between gap-3" key={e.id}>
            <div>
              <div className="flex items-center gap-2">
                <Link className="text-primary font-semibold hover:underline" href={'/workspace/employees/' + e.id}>
                  {display(e)}
                </Link>
                {isSupervisor && (
                  <span className="badge badge-active flex items-center gap-1 text-[11px] py-0.5 px-2 bg-primary/10 text-primary border-primary/20">
                    <ShieldCheck size={12} />
                    Supervisor
                  </span>
                )}
              </div>
              <p className="text-xs text-muted-foreground mt-0.5">{subtitle}</p>
            </div>
            <div className="flex gap-2">
              {auth.can('employees.transfer') && (
                <button
                  className="btn-secondary text-xs"
                  onClick={() => setSelectedEmp(e)}
                >
                  Transfer to another project
                </button>
              )}
              {auth.can('employees.assign') && hasDirectReports && <button type="button" className="btn-secondary text-xs inline-flex items-center gap-1" disabled={inspectingEmployeeId === String(e.id)} onClick={() => void inspectSupervisorRemoval(e)}><ShieldOff size={13} />{inspectingEmployeeId === String(e.id) ? 'Loading…' : 'Remove as supervisor'}</button>}
              {auth.can('employees.assign') && <button type="button" className="btn-secondary text-xs inline-flex items-center gap-1 text-red-700" disabled={inspectingEmployeeId === String(e.id)} onClick={() => void inspectAssignmentRemoval(e)}><UserMinus size={13} />{inspectingEmployeeId === String(e.id) ? 'Loading…' : 'Remove from project'}</button>}
            </div>
          </div>
        );
      })}

      {!employees.length && (
        <p className="py-8 text-center text-muted-foreground">
          No employees assigned to this project.
        </p>
      )}

      {removalError && !assignmentToRemove && !supervisorToRemove && <p role="alert" className="flex items-center gap-2 border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800"><AlertTriangle size={15} />{removalError}<button type="button" className="ml-auto font-bold underline" onClick={() => setRemovalError('')}>Dismiss</button></p>}

      {assignmentToRemove && <Modal name="Remove employee from project?" onClose={() => { if (!removalBusy) { setAssignmentToRemove(null); setRemovalError(''); } }}>
        <div className="space-y-4">
          <p className="text-sm text-slate-700">This will end <b>{display(assignmentToRemove.employee)}</b>’s active assignment to this project effective today. Their employee record and assignment history will remain available.</p>
          {removalError && <p role="alert" className="border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">{removalError}</p>}
          <div className="flex justify-end gap-2"><button type="button" disabled={removalBusy} className="btn-secondary text-xs" onClick={() => { setAssignmentToRemove(null); setRemovalError(''); }}>Cancel</button><button type="button" disabled={removalBusy} className="inline-flex items-center gap-1 bg-red-700 px-3 py-2 text-xs font-bold text-white hover:bg-red-800 disabled:opacity-50" onClick={() => void confirmAssignmentRemoval()}><UserMinus size={14} />{removalBusy ? 'Removing…' : 'Remove from project'}</button></div>
        </div>
      </Modal>}

      {supervisorToRemove && <Modal name="Remove project supervisor designation?" onClose={() => { if (!removalBusy) { setSupervisorToRemove(null); setRemovalError(''); } }}>
        <div className="space-y-4">
          {supervisorToRemove.reports.length ? <><p className="text-sm text-slate-700">This clears <b>{display(supervisorToRemove.employee)}</b> as the designated supervisor for these active project assignments. Their own project assignment and employee profile will remain unchanged.</p><div className="max-h-64 divide-y overflow-y-auto border border-slate-200">{supervisorToRemove.reports.map((assignment) => { const member = employees.find((item) => String(item.id) === String(assignment.employee_id)); return <div key={assignment.id} className="px-3 py-2 text-sm"><span className="font-semibold">{member ? display(member) : assignment.employee_name || 'Team member'}</span><span className="ml-2 text-xs text-slate-500">{assignment.assignment_number || ''}</span></div>; })}</div></> : <p className="text-sm text-slate-700">{display(supervisorToRemove.employee)} has no active project assignments currently designated to them as supervisor.</p>}
          {removalError && <p role="alert" className="border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">{removalError}</p>}
          <div className="flex justify-end gap-2"><button type="button" disabled={removalBusy} className="btn-secondary text-xs" onClick={() => { setSupervisorToRemove(null); setRemovalError(''); }}>Close</button>{supervisorToRemove.reports.length > 0 && <button type="button" disabled={removalBusy} className="inline-flex items-center gap-1 bg-red-700 px-3 py-2 text-xs font-bold text-white hover:bg-red-800 disabled:opacity-50" onClick={() => void confirmSupervisorRemoval()}><ShieldOff size={14} />{removalBusy ? 'Removing…' : 'Remove supervisor designation'}</button>}</div>
        </div>
      </Modal>}

      {/* Modal: Pick New Employee to Assign */}
      {picking && (
        <Modal name="Choose employee to assign" onClose={() => setPicking(false)}>
          <input
            aria-label="Search employees"
            className="input-field mb-4"
            placeholder="Search employees…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <State loading={candidates.loading} error={candidates.error} retry={candidates.reload}>
            <div className="space-y-2 max-h-[50vh] overflow-y-auto">
              {rows(candidates.data)
                .filter((e) => e.is_active && !employees.some((existing) => existing.id === e.id))
                .map((e) => (
                  <button
                    key={e.id}
                    className="block w-full text-left border rounded-lg p-3 hover:bg-muted/40 transition-colors"
                    onClick={() => {
                      setSelectedEmp(e);
                      setPicking(false);
                    }}
                  >
                    <p className="font-600 text-sm">{display(e)}</p>
                    <p className="text-xs text-muted-foreground">{e.employee_number}</p>
                  </button>
                ))}
            </div>
            <p className="text-xs text-muted-foreground mt-3">
              Showing up to 100 matches. Search to find more employees.
            </p>
          </State>
        </Modal>
      )}

      {/* Modal: Batch Assign Supervisor */}
      {assigningSupervisor && (
        <AssignSupervisorModal
          projectId={projectId}
          employees={employees}
          onClose={() => setAssigningSupervisor(false)}
          onSaved={() => {
            setAssigningSupervisor(false);
            onSaved();
          }}
        />
      )}

      {/* Modal: Transfer Employee */}
      {selectedEmp && (
        <TransferEmployeeModal
          employee={selectedEmp}
          projectId={projectId}
          onClose={() => setSelectedEmp(null)}
          onSaved={() => {
            setSelectedEmp(null);
            onSaved();
          }}
        />
      )}
    </div>
  );
}
