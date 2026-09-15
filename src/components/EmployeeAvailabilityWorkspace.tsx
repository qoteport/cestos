'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { Users, Calendar, Clock, Briefcase, Filter, Search, RefreshCw, CheckCircle, ArrowLeft, UserCheck, ShieldCheck, MapPin, Eye } from 'lucide-react';
import { apiFetch } from '@/lib/api';
import { Row, display, Modal } from './DataUI';
import RecordForm from './RecordForm';

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
    const match = departments.find(d => String(d.id) === String(emp.department_id));
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
    const match = positions.find(p => String(p.id) === String(emp.position_id));
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

export default function EmployeeAvailabilityWorkspace() {
  const [loading, setLoading] = useState(true);
  const [employees, setEmployees] = useState<Row[]>([]);
  const [projects, setProjects] = useState<Row[]>([]);
  const [departments, setDepartments] = useState<Row[]>([]);
  const [positions, setPositions] = useState<Row[]>([]);
  const [leaveRequests, setLeaveRequests] = useState<Row[]>([]);
  const [version, setVersion] = useState(0);

  // Filters & Views
  const [viewMode, setViewMode] = useState<'table' | 'calendar'>('table');
  const [searchQuery, setSearchQuery] = useState('');
  const [deptFilter, setDeptFilter] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'AVAILABLE' | 'ON_LEAVE'>('ALL');
  const [selectedMonth, setSelectedMonth] = useState<Date>(new Date());

  // Assign Modal
  const [assigningEmployee, setAssigningEmployee] = useState<Row | null>(null);

  const reload = () => setVersion(v => v + 1);

  useEffect(() => {
    let active = true;
    setLoading(true);

    Promise.all([
      apiFetch<any>('/api/v1/employees/available?page_size=100')
        .catch(() => apiFetch<any>('/api/v1/employees?page_size=100'))
        .catch(() => []),
      apiFetch<any>('/api/v1/employees?page_size=100').catch(() => []),
      apiFetch<any>('/api/v1/projects?page_size=100').catch(() => []),
      apiFetch<any>('/api/v1/departments?page_size=100').catch(() => []),
      apiFetch<any>('/api/v1/positions?page_size=100').catch(() => []),
      apiFetch<any>('/api/v1/employees/leave-requests/all')
        .catch(() => apiFetch<any>('/api/v1/hr/leave-requests'))
        .catch(() => []),
    ]).then(([availData, allEmpData, projData, deptData, posData, leaveData]) => {
      if (!active) return;
      const availList = Array.isArray(availData) ? availData : availData?.items || [];
      const allEmpList = Array.isArray(allEmpData) ? allEmpData : allEmpData?.items || [];
      const projList = Array.isArray(projData) ? projData : projData?.items || [];
      const dList = Array.isArray(deptData) ? deptData : deptData?.items || [];
      const pList = Array.isArray(posData) ? posData : posData?.items || [];
      const lList = Array.isArray(leaveData) ? leaveData : leaveData?.items || [];

      // Map all employees by ID for enrichment
      const empMap = new Map<string, Row>();
      allEmpList.forEach((e: Row) => empMap.set(String(e.id), e));

      const targetList = availList.length > 0 ? availList : allEmpList;
      const enrichedList = targetList.map((e: Row) => {
        const fullRec = empMap.get(String(e.id)) || {};
        return { ...fullRec, ...e };
      });

      setEmployees(enrichedList);
      setProjects(projList);
      setDepartments(dList);
      setPositions(pList);
      setLeaveRequests(lList);
      setLoading(false);
    });

    return () => { active = false; };
  }, [version]);

  // Filtering
  const filteredEmployees = employees.filter(emp => {
    const fullName = getEmployeeFullName(emp);
    const role = getEmployeeRole(emp, positions);
    const dept = getEmployeeDepartment(emp, departments);
    const { onLeave } = getEmployeeLeaveInfo(emp, leaveRequests);

    const searchStr = `${fullName} ${emp.employee_number || ''} ${role} ${dept}`.toLowerCase();
    const matchesSearch = !searchQuery || searchStr.includes(searchQuery.toLowerCase());
    const matchesDept = deptFilter === 'ALL' || String(emp.department_id) === deptFilter;
    const matchesStatus =
      statusFilter === 'ALL' ||
      (statusFilter === 'AVAILABLE' && !onLeave) ||
      (statusFilter === 'ON_LEAVE' && onLeave);

    return matchesSearch && matchesDept && matchesStatus;
  });

  // KPI Calculations
  const totalWorkforce = employees.length;
  const onLeaveCount = employees.filter((e) => getEmployeeLeaveInfo(e, leaveRequests).onLeave).length;
  const readyMobilize = employees.filter((e) => !getEmployeeLeaveInfo(e, leaveRequests).onLeave).length;
  const withLicences = employees.filter((e) => (e.licenses_count || e.qualifications_count || 0) > 0).length;

  // Calendar Timeline Helpers
  const currentYear = selectedMonth.getFullYear();
  const currentMonthIdx = selectedMonth.getMonth();
  const daysInMonth = new Date(currentYear, currentMonthIdx + 1, 0).getDate();
  const monthName = selectedMonth.toLocaleString('en-US', { month: 'long', year: 'numeric' });

  return (
    <div className="space-y-6 fade-in">
      {/* Header Bar */}
      <div className="flex flex-wrap justify-between items-center gap-4 border-b pb-4">
        <div>
          <Link href="/workforce-overview" className="text-xs text-primary flex items-center gap-1 mb-2 hover:underline">
            <ArrowLeft size={12} /> Workforce Overview
          </Link>
          <h1 className="text-2xl font-bold text-foreground">Employee Availability & Deployment</h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            Monitor unassigned personnel, review availability schedules, and deploy team members to active projects.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button onClick={reload} className="btn-secondary text-xs p-2.5" title="Refresh data">
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
          </button>

          {/* View Mode Switcher */}
          <div className="flex items-center border rounded-lg overflow-hidden bg-muted/40 p-0.5">
            <button
              onClick={() => setViewMode('table')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-all ${
                viewMode === 'table' ? 'bg-card text-primary shadow-sm' : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              Table View
            </button>
            <button
              onClick={() => setViewMode('calendar')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-all flex items-center gap-1.5 ${
                viewMode === 'calendar' ? 'bg-card text-primary shadow-sm' : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <Calendar size={13} /> Calendar View
            </button>
          </div>
        </div>
      </div>

      {/* Activity KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="card p-4 space-y-1.5 border-l-4 border-l-primary">
          <span className="text-xs font-semibold text-muted-foreground block">Available Workforce</span>
          <div className="flex items-baseline justify-between">
            <span className="text-2xl font-extrabold text-foreground">{loading ? '—' : readyMobilize}</span>
            <Users size={18} className="text-primary opacity-80" />
          </div>
          <p className="text-[11px] text-muted-foreground">Unassigned & ready for deployment</p>
        </div>

        <div className="card p-4 space-y-1.5 border-l-4 border-l-emerald-500">
          <span className="text-xs font-semibold text-muted-foreground block">Ready for Immediate Mobilization</span>
          <div className="flex items-baseline justify-between">
            <span className="text-2xl font-extrabold text-emerald-700">{loading ? '—' : readyMobilize}</span>
            <UserCheck size={18} className="text-emerald-600" />
          </div>
          <p className="text-[11px] text-muted-foreground">Active personnel ready for assignment</p>
        </div>

        <div className="card p-4 space-y-1.5 border-l-4 border-l-amber-500">
          <span className="text-xs font-semibold text-muted-foreground block">On Approved Leave / Off-Duty</span>
          <div className="flex items-baseline justify-between">
            <span className="text-2xl font-extrabold text-amber-700">{loading ? '—' : onLeaveCount}</span>
            <Clock size={18} className="text-amber-600" />
          </div>
          <p className="text-[11px] text-muted-foreground">Currently unavailable on approved leave</p>
        </div>

        <div className="card p-4 space-y-1.5 border-l-4 border-l-blue-500">
          <span className="text-xs font-semibold text-muted-foreground block">Certified Personnel</span>
          <div className="flex items-baseline justify-between">
            <span className="text-2xl font-extrabold text-blue-700">{loading ? '—' : withLicences}</span>
            <ShieldCheck size={18} className="text-blue-600" />
          </div>
          <p className="text-[11px] text-muted-foreground">With active tickets & certifications</p>
        </div>
      </div>

      {/* Filter Toolbar */}
      <div className="card p-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-3 flex-1">
          <div className="relative flex-1 min-w-[200px] max-w-md">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search by name, employee # or role..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="input-field pl-9 text-xs"
            />
          </div>

          <div className="flex items-center gap-2">
            <Filter size={14} className="text-muted-foreground shrink-0" />
            <select
              value={deptFilter}
              onChange={e => setDeptFilter(e.target.value)}
              className="input-field text-xs py-1.5 w-44 bg-background"
            >
              <option value="ALL">All Departments</option>
              {departments.map(d => (
                <option key={d.id} value={d.id}>{d.name || d.title}</option>
              ))}
            </select>

            <select
              value={statusFilter}
              onChange={e => setStatusFilter(e.target.value as any)}
              className="input-field text-xs py-1.5 w-44 bg-background"
            >
              <option value="ALL">All Availability Statuses</option>
              <option value="AVAILABLE">Available Only</option>
              <option value="ON_LEAVE">On Leave / Unavailable</option>
            </select>

            {(searchQuery || deptFilter !== 'ALL' || statusFilter !== 'ALL') && (
              <button
                type="button"
                className="btn-secondary text-xs py-1.5 px-3"
                onClick={() => {
                  setSearchQuery('');
                  setDeptFilter('ALL');
                  setStatusFilter('ALL');
                }}
              >
                Reset Filters
              </button>
            )}
          </div>
        </div>

        <span className="text-xs text-muted-foreground font-semibold">
          Showing {filteredEmployees.length} of {employees.length} available
        </span>
      </div>

      {/* MAIN VIEW MODE: Table View */}
      {viewMode === 'table' && (
        <div className="card p-5 space-y-4">
          {filteredEmployees.length === 0 ? (
            <div className="py-12 text-center text-muted-foreground space-y-2">
              <Users size={32} className="mx-auto text-muted-foreground/50" />
              <p className="text-sm font-semibold">No available employees found matching filter criteria.</p>
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
                  {filteredEmployees.map(emp => {
                    const fullName = getEmployeeFullName(emp);
                    const roleName = getEmployeeRole(emp, positions);
                    const deptName = getEmployeeDepartment(emp, departments);
                    const { onLeave, leaveDetails } = getEmployeeLeaveInfo(emp, leaveRequests);
                    return (
                      <tr key={emp.id} className="hover:bg-muted/30 transition-colors">
                        <td className="p-3">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-primary/10 text-primary font-bold flex items-center justify-center text-xs shrink-0 border border-primary/20">
                              {fullName.charAt(0)}
                            </div>
                            <div>
                              <Link href={`/workspace/employees/${emp.id}`} className="font-bold text-foreground hover:text-primary transition-colors block">
                                {fullName}
                              </Link>
                              <span className="text-[11px] text-muted-foreground">ID: {emp.employee_number || String(emp.id).slice(0, 8)}</span>
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
                              <Clock size={10} /> On Leave (Unavailable)
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-100 text-emerald-800 border border-emerald-200">
                              <CheckCircle size={10} /> Available
                            </span>
                          )}
                        </td>

                        <td className="p-3 text-muted-foreground">
                          <span className="flex items-center gap-1 text-xs text-foreground">
                            <MapPin size={12} className="text-muted-foreground" />
                            {display(emp.work_location || emp.home_location || 'Headquarters')}
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
                            {onLeave ? (
                              <button
                                type="button"
                                disabled
                                title="Employee is currently on approved leave"
                                className="btn-secondary opacity-60 cursor-not-allowed py-1 px-2.5 text-[11px] flex items-center gap-1"
                              >
                                <Clock size={12} /> On Leave
                              </button>
                            ) : (
                              <button
                                type="button"
                                onClick={() => setAssigningEmployee(emp)}
                                className="btn-primary py-1 px-2.5 text-[11px] flex items-center gap-1"
                              >
                                <Briefcase size={12} /> Assign to Project
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
          )}
        </div>
      )}

      {/* MAIN VIEW MODE: Calendar / Timeline Schedule */}
      {viewMode === 'calendar' && (
        <div className="card p-5 space-y-4">
          <div className="flex justify-between items-center border-b pb-3">
            <h2 className="text-base font-bold text-foreground flex items-center gap-2">
              <Calendar size={18} className="text-primary" /> Availability Schedule — {monthName}
            </h2>
            <div className="flex items-center gap-2">
              <button
                className="btn-secondary text-xs px-2.5 py-1"
                onClick={() => setSelectedMonth(new Date(currentYear, currentMonthIdx - 1, 1))}
              >
                Previous Month
              </button>
              <button
                className="btn-secondary text-xs px-2.5 py-1"
                onClick={() => setSelectedMonth(new Date())}
              >
                Today
              </button>
              <button
                className="btn-secondary text-xs px-2.5 py-1"
                onClick={() => setSelectedMonth(new Date(currentYear, currentMonthIdx + 1, 1))}
              >
                Next Month
              </button>
            </div>
          </div>

          <div className="overflow-x-auto border rounded-lg">
            <table className="w-full text-xs text-left min-w-[800px]">
              <thead className="bg-muted text-muted-foreground font-semibold border-b">
                <tr>
                  <th className="p-3 w-48 sticky left-0 bg-muted z-10 border-r">Employee</th>
                  <th className="p-3 w-32 border-r">Position</th>
                  <th className="p-3">Month Availability Overview ({daysInMonth} Days)</th>
                  <th className="p-3 text-right w-28">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {filteredEmployees.map(emp => {
                  const fullName = getEmployeeFullName(emp);
                  const roleName = getEmployeeRole(emp, positions);
                  const { onLeave, leaveDetails } = getEmployeeLeaveInfo(emp, leaveRequests);
                  return (
                    <tr key={emp.id} className="hover:bg-muted/20 transition-colors">
                      <td className="p-3 font-semibold text-foreground sticky left-0 bg-card z-10 border-r">
                        <Link href={`/workspace/employees/${emp.id}`} className="hover:text-primary transition-colors block truncate">
                          {fullName}
                        </Link>
                        <span className="text-[10px] text-muted-foreground block font-normal">#{emp.employee_number || String(emp.id).slice(0, 6)}</span>
                      </td>

                      <td className="p-3 text-muted-foreground border-r truncate">
                        {display(roleName)}
                      </td>

                      <td className="p-3">
                        <div className="flex items-center gap-1">
                          {onLeave ? (
                            <div className="flex-1 bg-amber-100 text-amber-900 border border-amber-300 rounded px-3 py-1.5 text-xs font-semibold flex items-center justify-between">
                              <span className="flex items-center gap-1">
                                <Clock size={12} className="text-amber-700" />
                                On Approved Leave ({leaveDetails?.leave_type || 'Approved Leave'}) — Unavailable
                              </span>
                              <span className="text-[11px] text-amber-800 font-bold">Off Duty</span>
                            </div>
                          ) : (
                            <div className="flex-1 bg-emerald-100 text-emerald-800 border border-emerald-300 rounded px-3 py-1.5 text-xs font-semibold flex items-center justify-between">
                              <span className="flex items-center gap-1">
                                <CheckCircle size={12} className="text-emerald-600" />
                                Fully Available for Mobilization Entire Month
                              </span>
                              <span className="text-[11px] text-emerald-700">100% Free</span>
                            </div>
                          )}
                        </div>
                      </td>

                      <td className="p-3 text-right">
                        {onLeave ? (
                          <button
                            type="button"
                            disabled
                            className="btn-secondary opacity-60 cursor-not-allowed py-1 px-2.5 text-[11px]"
                          >
                            On Leave
                          </button>
                        ) : (
                          <button
                            type="button"
                            onClick={() => setAssigningEmployee(emp)}
                            className="btn-primary py-1 px-2.5 text-[11px] shrink-0"
                          >
                            Assign
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* MODAL: Quick Assign Employee to Project */}
      {assigningEmployee && (
        <RecordForm
          resource="employee-assignments"
          path={`/api/v1/employees/${assigningEmployee.id}/assignments`}
          title={`Assign ${getEmployeeFullName(assigningEmployee)} to Project`}
          initial={{
            employee_id: assigningEmployee.id,
            start_date: new Date().toISOString().slice(0, 10),
            role: getEmployeeRole(assigningEmployee, positions),
          }}
          method="POST"
          operation={{
            schema: { $ref: '#/components/schemas/EmployeeAssignmentCreate' },
            permissions: [],
          }}
          employeeId={assigningEmployee.id}
          employeeData={assigningEmployee}
          onClose={() => setAssigningEmployee(null)}
          onSaved={() => {
            setAssigningEmployee(null);
            reload();
          }}
        />
      )}
    </div>
  );
}
