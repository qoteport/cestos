'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  Users, Calendar, Clock, Briefcase, Plus, Filter, Search, RefreshCw,
  CheckCircle, ArrowLeft, UserCheck, ShieldCheck, MapPin, Award, Eye
} from 'lucide-react';
import { apiFetch } from '@/lib/api';
import { Row, display, Modal } from './DataUI';
import RecordForm from './RecordForm';

export default function EmployeeAvailabilityWorkspace() {
  const [loading, setLoading] = useState(true);
  const [employees, setEmployees] = useState<Row[]>([]);
  const [projects, setProjects] = useState<Row[]>([]);
  const [departments, setDepartments] = useState<Row[]>([]);
  const [positions, setPositions] = useState<Row[]>([]);
  const [version, setVersion] = useState(0);

  // Filters & Views
  const [viewMode, setViewMode] = useState<'table' | 'calendar'>('table');
  const [searchQuery, setSearchQuery] = useState('');
  const [deptFilter, setDeptFilter] = useState('ALL');
  const [selectedMonth, setSelectedMonth] = useState<Date>(new Date());

  // Assign Modal
  const [assigningEmployee, setAssigningEmployee] = useState<Row | null>(null);

  const reload = () => setVersion(v => v + 1);

  useEffect(() => {
    let active = true;
    setLoading(true);

    Promise.all([
      apiFetch<any>('/api/v1/employees/available').catch(() => []),
      apiFetch<any>('/api/v1/projects?page_size=100').catch(() => []),
      apiFetch<any>('/api/v1/departments?page_size=100').catch(() => []),
      apiFetch<any>('/api/v1/positions?page_size=100').catch(() => []),
    ]).then(([empData, projData, deptData, posData]) => {
      if (!active) return;
      const empList = Array.isArray(empData) ? empData : empData?.items || [];
      const projList = Array.isArray(projData) ? projData : projData?.items || [];
      const dList = Array.isArray(deptData) ? deptData : deptData?.items || [];
      const pList = Array.isArray(posData) ? posData : posData?.items || [];

      setEmployees(empList);
      setProjects(projList);
      setDepartments(dList);
      setPositions(pList);
      setLoading(false);
    });

    return () => { active = false; };
  }, [version]);

  // Filtering
  const filteredEmployees = employees.filter(emp => {
    const nameStr = `${emp.first_name || ''} ${emp.last_name || ''} ${emp.name || ''} ${emp.employee_number || ''}`.toLowerCase();
    const matchesSearch = nameStr.includes(searchQuery.toLowerCase());
    const matchesDept = deptFilter === 'ALL' || String(emp.department_id) === deptFilter;
    return matchesSearch && matchesDept;
  });

  // KPI Calculations
  const totalAvailable = employees.length;
  const readyMobilize = employees.filter(e => e.employment_status === 'ACTIVE' || !e.on_leave).length;
  const offRotation = employees.filter(e => String(e.rotation_status || '').toLowerCase().includes('off')).length;
  const withLicences = employees.filter(e => (e.licenses_count || e.qualifications_count || 0) > 0).length;

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
            <span className="text-2xl font-extrabold text-foreground">{loading ? '—' : totalAvailable}</span>
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
          <p className="text-[11px] text-muted-foreground">Active personnel without active block</p>
        </div>

        <div className="card p-4 space-y-1.5 border-l-4 border-l-amber-500">
          <span className="text-xs font-semibold text-muted-foreground block">Off Rotation / Rest Period</span>
          <div className="flex items-baseline justify-between">
            <span className="text-2xl font-extrabold text-amber-700">{loading ? '—' : offRotation}</span>
            <Clock size={18} className="text-amber-600" />
          </div>
          <p className="text-[11px] text-muted-foreground">Currently on rest break cycle</p>
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
              className="input-field text-xs py-1.5 w-48"
            >
              <option value="ALL">All Departments</option>
              {departments.map(d => (
                <option key={d.id} value={d.id}>{d.name || d.title}</option>
              ))}
            </select>
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
                    const fullName = [emp.first_name, emp.last_name].filter(Boolean).join(' ') || emp.name || 'Employee';
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
                              <span className="text-[11px] text-muted-foreground">ID: {emp.employee_number || emp.id.slice(0, 8)}</span>
                            </div>
                          </div>
                        </td>

                        <td className="p-3">
                          <span className="font-semibold text-foreground block">{display(emp.position_name || emp.title || 'Staff')}</span>
                          <span className="text-muted-foreground text-[11px]">{display(emp.department_name || 'General')}</span>
                        </td>

                        <td className="p-3">
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-100 text-emerald-800 border border-emerald-200">
                            <CheckCircle size={10} /> Available
                          </span>
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
                            <button
                              type="button"
                              onClick={() => setAssigningEmployee(emp)}
                              className="btn-primary py-1 px-2.5 text-[11px] flex items-center gap-1"
                            >
                              <Briefcase size={12} /> Assign to Project
                            </button>
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
                  const fullName = [emp.first_name, emp.last_name].filter(Boolean).join(' ') || emp.name;
                  return (
                    <tr key={emp.id} className="hover:bg-muted/20 transition-colors">
                      <td className="p-3 font-semibold text-foreground sticky left-0 bg-card z-10 border-r">
                        <Link href={`/workspace/employees/${emp.id}`} className="hover:text-primary transition-colors block truncate">
                          {fullName}
                        </Link>
                        <span className="text-[10px] text-muted-foreground block font-normal">#{emp.employee_number || emp.id.slice(0, 6)}</span>
                      </td>

                      <td className="p-3 text-muted-foreground border-r truncate">
                        {display(emp.position_name || emp.title || 'Staff')}
                      </td>

                      <td className="p-3">
                        <div className="flex items-center gap-1">
                          <div className="flex-1 bg-emerald-100 text-emerald-800 border border-emerald-300 rounded px-3 py-1.5 text-xs font-semibold flex items-center justify-between">
                            <span className="flex items-center gap-1">
                              <CheckCircle size={12} className="text-emerald-600" />
                              Fully Available for Mobilization Entire Month
                            </span>
                            <span className="text-[11px] text-emerald-700">100% Free</span>
                          </div>
                        </div>
                      </td>

                      <td className="p-3 text-right">
                        <button
                          type="button"
                          onClick={() => setAssigningEmployee(emp)}
                          className="btn-primary py-1 px-2.5 text-[11px] shrink-0"
                        >
                          Assign
                        </button>
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
          title={`Assign ${[assigningEmployee.first_name, assigningEmployee.last_name].filter(Boolean).join(' ') || 'Employee'} to Project`}
          initial={{
            employee_id: assigningEmployee.id,
            start_date: new Date().toISOString().slice(0, 10),
            role: assigningEmployee.position_name || assigningEmployee.title || 'Operator',
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
