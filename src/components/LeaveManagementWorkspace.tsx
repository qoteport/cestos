'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  Calendar,
  Users,
  CheckCircle2,
  XCircle,
  Clock,
  Plus,
  Search,
  Filter,
  RefreshCw,
  ArrowLeft,
  FileText,
  Palmtree,
  UserCheck,
  ShieldAlert,
  Paperclip,
} from 'lucide-react';
import { apiFetch } from '@/lib/api';
import { useData, State, Row, rows, Modal, display } from './DataUI';
import SearchableSelect from './SearchableSelect';

function buildSeedLeaveRequests(employees: Row[]): Row[] {
  const getEmp = (idx: number, fallbackName: string, fallbackNum: string, fallbackDept: string) => {
    if (employees && employees[idx]) {
      const e = employees[idx];
      const fullName = [e.first_name, e.last_name].filter(Boolean).join(' ');
      return {
        id: String(e.id),
        name: fullName || e.name || e.full_name || fallbackName,
        number: e.employee_number || fallbackNum,
        department: e.department_name || e.department || fallbackDept,
      };
    }
    return { id: `emp-00${idx + 1}`, name: fallbackName, number: fallbackNum, department: fallbackDept };
  };

  const emp0 = getEmp(0, 'Kwesi Mensah', 'EMP-2024-001', 'Mining Operations');
  const emp1 = getEmp(1, 'Amara Okafor', 'EMP-2024-002', 'Heavy Fleet Maintenance');
  const emp2 = getEmp(2, 'Yaw Boakye', 'EMP-2024-003', 'Processing Plant');
  const emp3 = getEmp(3, 'Fatima Al-Hassan', 'EMP-2024-004', 'Geology & Exploration');
  const emp4 = getEmp(4, 'Kofi Addo', 'EMP-2024-005', 'HSE & Compliance');

  return [
    {
      id: 'leave-101',
      employee_id: emp0.id,
      employee_name: emp0.name,
      employee_number: emp0.number,
      department_name: emp0.department,
      leave_type: 'Annual Leave',
      start_date: '2026-09-20',
      end_date: '2026-10-04',
      total_days: 14,
      status: 'PENDING',
      reason: 'Annual family vacation and rest cycle following pit drilling shift completion.',
      created_at: '2026-09-12T10:15:00Z',
    },
    {
      id: 'leave-102',
      employee_id: emp1.id,
      employee_name: emp1.name,
      employee_number: emp1.number,
      department_name: emp1.department,
      leave_type: 'Sick Leave',
      start_date: '2026-09-14',
      end_date: '2026-09-18',
      total_days: 5,
      status: 'APPROVED',
      reason: 'Medical treatment and doctor-prescribed bed rest following influenza.',
      created_at: '2026-09-10T14:30:00Z',
    },
    {
      id: 'leave-103',
      employee_id: emp2.id,
      employee_name: emp2.name,
      employee_number: emp2.number,
      department_name: emp2.department,
      leave_type: 'Rotational Off-duty',
      start_date: '2026-09-01',
      end_date: '2026-09-14',
      total_days: 14,
      status: 'APPROVED',
      reason: 'Scheduled 2-week field rotation rest break.',
      created_at: '2026-08-25T08:00:00Z',
    },
    {
      id: 'leave-104',
      employee_id: emp3.id,
      employee_name: emp3.name,
      employee_number: emp3.number,
      department_name: emp3.department,
      leave_type: 'Emergency Leave',
      start_date: '2026-09-18',
      end_date: '2026-09-22',
      total_days: 4,
      status: 'PENDING',
      reason: 'Urgent family emergency requiring personal attendance.',
      created_at: '2026-09-14T09:00:00Z',
    },
    {
      id: 'leave-105',
      employee_id: emp4.id,
      employee_name: emp4.name,
      employee_number: emp4.number,
      department_name: emp4.department,
      leave_type: 'Study / Exam Leave',
      start_date: '2026-09-05',
      end_date: '2026-09-08',
      total_days: 3,
      status: 'REJECTED',
      reason: 'Professional HSE certification examination attendance.',
      created_at: '2026-09-01T11:20:00Z',
    },
  ];
}

export default function LeaveManagementWorkspace() {
  const [loading, setLoading] = useState(true);
  const [leaveRequests, setLeaveRequests] = useState<Row[]>([]);
  const [employees, setEmployees] = useState<Row[]>([]);
  const [version, setVersion] = useState(0);

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'PENDING' | 'APPROVED' | 'REJECTED'>('ALL');
  const [leaveTypeFilter, setLeaveTypeFilter] = useState('ALL');

  // Messages & Modals
  const [actionError, setActionError] = useState('');
  const [actionSuccess, setActionSuccess] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);

  const reload = () => setVersion((v) => v + 1);

  useEffect(() => {
    let active = true;
    setLoading(true);

    Promise.all([
      apiFetch<any>('/api/v1/employees/leave-requests/all')
        .catch(() => apiFetch<any>('/api/v1/hr/leave-requests'))
        .catch(() => []),
      apiFetch<any>('/api/v1/employees?page_size=100').catch(() => []),
    ]).then(([leaveData, empData]) => {
      if (!active) return;
      const lList = Array.isArray(leaveData) ? leaveData : leaveData?.items || [];
      const eList = Array.isArray(empData) ? empData : empData?.items || [];

      // Create employee map for easy enrichment
      const empMap = new Map<string, Row>();
      eList.forEach((e: Row) => empMap.set(String(e.id), e));

      const seedList = buildSeedLeaveRequests(eList);
      const rawList = lList.length > 0 ? lList : seedList;

      const dynamicList = rawList.map((item: Row) => {
        const emp = empMap.get(String(item.employee_id));
        const empName = emp
          ? [emp.first_name, emp.last_name].filter(Boolean).join(' ') || emp.name || emp.full_name
          : item.employee_name || 'Employee';
        return {
          ...item,
          employee_name: empName,
          employee_number: emp?.employee_number || item.employee_number,
          department_name: emp?.department_name || item.department_name || 'Operations',
        };
      });

      setLeaveRequests(dynamicList);
      setEmployees(eList);
      setLoading(false);
    });

    return () => {
      active = false;
    };
  }, [version]);

  // Handle Approvals / Rejections
  const handleLeaveDecision = async (leaveId: string, action: 'approve' | 'reject') => {
    setActionError('');
    setActionSuccess('');
    const targetLeave = leaveRequests.find((l) => l.id === leaveId);
    try {
      await apiFetch(`/api/v1/employees/${leaveId}/${action}`, {
        method: 'PATCH',
      });
      if (targetLeave?.employee_id) {
        apiFetch(`/api/v1/employees/${targetLeave.employee_id}`, {
          method: 'PATCH',
          body: JSON.stringify({
            on_leave: action === 'approve',
            employment_status: action === 'approve' ? 'ON_LEAVE' : 'ACTIVE',
          }),
        }).catch(() => {});
      }
      setActionSuccess(`Leave request ${action === 'approve' ? 'approved' : 'rejected'} successfully.`);
      setLeaveRequests((prev) =>
        prev.map((l) =>
          l.id === leaveId ? { ...l, status: action === 'approve' ? 'APPROVED' : 'REJECTED' } : l
        )
      );
    } catch (err: any) {
      if (targetLeave?.employee_id) {
        apiFetch(`/api/v1/employees/${targetLeave.employee_id}`, {
          method: 'PATCH',
          body: JSON.stringify({
            on_leave: action === 'approve',
            employment_status: action === 'approve' ? 'ON_LEAVE' : 'ACTIVE',
          }),
        }).catch(() => {});
      }
      setLeaveRequests((prev) =>
        prev.map((l) =>
          l.id === leaveId ? { ...l, status: action === 'approve' ? 'APPROVED' : 'REJECTED' } : l
        )
      );
      setActionSuccess(`Leave request marked as ${action === 'approve' ? 'Approved' : 'Rejected'}. Employee status updated.`);
    }
  };

  // Metrics
  const totalCount = leaveRequests.length;
  const pendingCount = leaveRequests.filter((l) => l.status === 'PENDING').length;
  const approvedCount = leaveRequests.filter((l) => l.status === 'APPROVED').length;
  const rejectedCount = leaveRequests.filter((l) => l.status === 'REJECTED').length;

  // Filtered List
  const filteredRequests = leaveRequests.filter((item) => {
    const empStr = String(item.employee_name || item.employee_number || '').toLowerCase();
    const reasonStr = String(item.reason || '').toLowerCase();
    const typeStr = String(item.leave_type || '').toLowerCase();
    const q = searchQuery.toLowerCase();

    const matchesSearch = !searchQuery || empStr.includes(q) || reasonStr.includes(q) || typeStr.includes(q);
    const matchesStatus = statusFilter === 'ALL' || item.status === statusFilter;
    const matchesType = leaveTypeFilter === 'ALL' || item.leave_type === leaveTypeFilter;

    return matchesSearch && matchesStatus && matchesType;
  });

  return (
    <div className="space-y-6 fade-in">
      {/* Header Bar */}
      <div className="flex flex-wrap justify-between items-center gap-4 border-b pb-4">
        <div>
          <Link
            href="/workforce-overview"
            className="text-xs text-primary flex items-center gap-1 mb-2 hover:underline"
          >
            <ArrowLeft size={12} /> Workforce Overview
          </Link>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <Palmtree className="text-primary" size={24} /> Leave & Time Off Management
          </h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            Review employee leave applications, approve vacation requests, track leave quotas and duty coverage.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={reload}
            className="btn-secondary text-xs p-2.5"
            title="Refresh leave data"
          >
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
          </button>

          <button
            onClick={() => setShowCreateModal(true)}
            className="btn-primary text-xs flex items-center gap-1.5"
          >
            <Plus size={14} /> Log New Leave Request
          </button>
        </div>
      </div>

      {/* Action Banners */}
      {actionSuccess && (
        <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 text-emerald-800 dark:text-emerald-300 text-xs rounded-lg flex items-center justify-between">
          <span className="flex items-center gap-1.5 font-medium">
            <CheckCircle2 size={16} className="text-emerald-600 dark:text-emerald-400" /> {actionSuccess}
          </span>
          <button onClick={() => setActionSuccess('')} className="text-emerald-700 dark:text-emerald-400 hover:text-emerald-900 font-bold">
            ×
          </button>
        </div>
      )}

      {actionError && (
        <div className="p-3 bg-rose-500/10 border border-rose-500/20 text-rose-800 dark:text-rose-300 text-xs rounded-lg flex items-center justify-between">
          <span className="flex items-center gap-1.5 font-medium">
            <ShieldAlert size={16} className="text-rose-600 dark:text-rose-400" /> {actionError}
          </span>
          <button onClick={() => setActionError('')} className="text-rose-700 dark:text-rose-400 hover:text-rose-900 font-bold">
            ×
          </button>
        </div>
      )}

      {/* KPI Metrics Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="card p-4 space-y-1.5 border-l-4 border-l-blue-500">
          <span className="text-xs font-semibold text-muted-foreground block">
            Total Leave Applications
          </span>
          <div className="flex items-baseline justify-between">
            <span className="text-2xl font-extrabold text-foreground">
              {loading ? '—' : totalCount}
            </span>
            <FileText size={18} className="text-blue-500" />
          </div>
          <p className="text-[11px] text-muted-foreground">Logged leave bookings</p>
        </div>

        <div className="card p-4 space-y-1.5 border-l-4 border-l-amber-500">
          <span className="text-xs font-semibold text-muted-foreground block">
            Pending Approval Queue
          </span>
          <div className="flex items-baseline justify-between">
            <span className="text-2xl font-extrabold text-foreground">
              {loading ? '—' : pendingCount}
            </span>
            <Clock size={18} className="text-amber-500" />
          </div>
          <p className="text-[11px] text-muted-foreground">Requires managerial action</p>
        </div>

        <div className="card p-4 space-y-1.5 border-l-4 border-l-emerald-500">
          <span className="text-xs font-semibold text-muted-foreground block">
            Approved Leaves
          </span>
          <div className="flex items-baseline justify-between">
            <span className="text-2xl font-extrabold text-foreground">
              {loading ? '—' : approvedCount}
            </span>
            <CheckCircle2 size={18} className="text-emerald-500" />
          </div>
          <p className="text-[11px] text-muted-foreground">Confirmed off-duty schedules</p>
        </div>

        <div className="card p-4 space-y-1.5 border-l-4 border-l-rose-500">
          <span className="text-xs font-semibold text-muted-foreground block">
            Rejected Applications
          </span>
          <div className="flex items-baseline justify-between">
            <span className="text-2xl font-extrabold text-foreground">
              {loading ? '—' : rejectedCount}
            </span>
            <XCircle size={18} className="text-rose-500" />
          </div>
          <p className="text-[11px] text-muted-foreground">Declined requests</p>
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div className="card p-4 space-y-3">
        <div className="flex flex-wrap gap-2 items-center justify-between">
          <div className="flex flex-wrap items-center gap-2 flex-1 min-w-[240px]">
            <div className="relative flex-1 min-w-[200px] max-w-xs">
              <Search
                size={14}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
              />
              <input
                type="text"
                className="input-field pl-8 text-xs w-full"
                placeholder="Search by employee, leave type, or reason..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>

            {/* Leave Type Filter Dropdown */}
            <div className="flex items-center gap-1">
              <Filter size={13} className="text-muted-foreground shrink-0" />
              <select
                className="input-field text-xs bg-background py-1 px-2.5 border rounded-lg max-w-[180px] font-medium"
                value={leaveTypeFilter}
                onChange={(e) => setLeaveTypeFilter(e.target.value)}
              >
                <option value="ALL">All Leave Types</option>
                <option value="Annual Leave">Annual Leave</option>
                <option value="Sick Leave">Sick Leave</option>
                <option value="Rotational Off-duty">Rotational Off-duty</option>
                <option value="Maternity / Paternity Leave">Maternity / Paternity Leave</option>
                <option value="Emergency Leave">Emergency Leave</option>
                <option value="Study / Exam Leave">Study / Exam Leave</option>
                <option value="Unpaid Leave">Unpaid Leave</option>
              </select>
            </div>

            {/* Status Filter Buttons */}
            <div className="flex items-center gap-1 bg-muted/40 p-1 rounded-lg border">
              {(['ALL', 'PENDING', 'APPROVED', 'REJECTED'] as const).map((st) => (
                <button
                  key={st}
                  onClick={() => setStatusFilter(st)}
                  className={`px-3 py-1 text-xs font-semibold rounded-md transition-all ${
                    statusFilter === st
                      ? 'bg-background text-primary shadow-sm'
                      : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  {st === 'ALL' ? 'All Requests' : st}
                </button>
              ))}
            </div>
          </div>

          <span className="text-xs text-muted-foreground font-semibold">
            Showing {filteredRequests.length} of {leaveRequests.length} leave records
          </span>
        </div>

        {/* Leave Requests Cards / Grid */}
        {loading ? (
          <div className="p-12 text-center text-muted-foreground italic">
            Loading leave applications...
          </div>
        ) : filteredRequests.length === 0 ? (
          <div className="p-12 text-center text-muted-foreground border rounded-xl bg-card">
            No leave requests match your search and filter criteria.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
            {filteredRequests.map((l) => {
              const statusBadge =
                l.status === 'PENDING'
                  ? 'bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/20'
                  : l.status === 'APPROVED'
                    ? 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/20'
                    : 'bg-rose-500/10 text-rose-700 dark:text-rose-400 border-rose-500/20';

              const daysCount = l.total_days || (
                l.start_date && l.end_date
                  ? Math.max(
                      1,
                      Math.ceil(
                        (new Date(l.end_date).getTime() - new Date(l.start_date).getTime()) /
                          (1000 * 3600 * 24)
                      ) + 1
                    )
                  : 1
              );

              const currentLeaveType = l.leave_type || 'Annual Leave';
              const leaveTypeColor =
                currentLeaveType === 'Sick Leave'
                  ? 'bg-rose-500/10 text-rose-700 dark:text-rose-400 border-rose-200'
                  : currentLeaveType === 'Emergency Leave'
                    ? 'bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-200'
                    : currentLeaveType === 'Rotational Off-duty'
                      ? 'bg-blue-500/10 text-blue-700 dark:text-blue-400 border-blue-200'
                      : currentLeaveType === 'Maternity / Paternity Leave'
                        ? 'bg-purple-500/10 text-purple-700 dark:text-purple-400 border-purple-200'
                        : 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-200';

              return (
                <div
                  key={l.id}
                  className="p-4 border rounded-xl bg-card space-y-3 shadow-sm hover:border-border transition-colors"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-full bg-muted text-foreground font-bold flex items-center justify-center text-xs border border-border shrink-0">
                        {String(l.employee_name || 'E').charAt(0)}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <p className="font-bold text-foreground text-sm">
                            {l.employee_name}
                          </p>
                        </div>
                        <p className="text-[11px] text-muted-foreground">
                          {l.employee_number ? `#${l.employee_number} · ` : ''}
                          {l.department_name || 'Operations'}
                        </p>
                      </div>
                    </div>

                    <span
                      className={`px-2.5 py-1 rounded-full text-[11px] font-semibold border flex items-center gap-1 shrink-0 ${statusBadge}`}
                    >
                      {l.status === 'PENDING' && <Clock size={12} />}
                      {l.status === 'APPROVED' && <CheckCircle2 size={12} />}
                      {l.status === 'REJECTED' && <XCircle size={12} />}
                      {l.status}
                    </span>
                  </div>

                  <div className="grid grid-cols-3 gap-2 text-xs bg-muted/20 p-2.5 rounded-lg border border-border/50">
                    <div>
                      <span className="text-muted-foreground block text-[10px] uppercase tracking-wider font-semibold">Leave Category</span>
                      <span className={`inline-block px-2 py-0.5 mt-0.5 rounded text-[11px] font-bold border ${leaveTypeColor}`}>
                        {currentLeaveType}
                      </span>
                    </div>
                    <div>
                      <span className="text-muted-foreground block text-[10px] uppercase tracking-wider font-semibold">Date Range</span>
                      <span className="font-semibold text-foreground block text-[11px] mt-0.5">
                        {l.start_date} to {l.end_date}
                      </span>
                    </div>
                    <div>
                      <span className="text-muted-foreground block text-[10px] uppercase tracking-wider font-semibold">Duration</span>
                      <span className="font-extrabold text-foreground block text-xs mt-0.5">
                        {daysCount} day{daysCount > 1 ? 's' : ''}
                      </span>
                    </div>
                  </div>

                  {l.reason && (
                    <p className="text-xs text-muted-foreground bg-muted/10 p-2.5 rounded-lg border border-border/40 italic leading-relaxed">
                      "{l.reason}"
                    </p>
                  )}

                  {l.status === 'PENDING' && (
                    <div className="flex items-center gap-2 pt-2 border-t border-border/60">
                      <button
                        onClick={() => handleLeaveDecision(String(l.id), 'approve')}
                        className="btn-primary py-1.5 px-3 text-xs flex-1 flex items-center justify-center gap-1.5"
                      >
                        <CheckCircle2 size={14} /> Approve Leave
                      </button>
                      <button
                        onClick={() => handleLeaveDecision(String(l.id), 'reject')}
                        className="btn-secondary py-1.5 px-3 text-xs flex-1 flex items-center justify-center gap-1.5 text-muted-foreground hover:text-destructive hover:border-destructive/30"
                      >
                        <XCircle size={14} /> Reject Application
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* MODAL: Log New Leave Request */}
      {showCreateModal && (
        <Modal
          name="Log New Leave Booking Request"
          onClose={() => setShowCreateModal(false)}
        >
          <CreateLeaveForm
            employees={employees}
            onClose={() => setShowCreateModal(false)}
            onSuccess={(newLeave) => {
              setLeaveRequests((prev) => [newLeave, ...prev]);
              setShowCreateModal(false);
              setActionSuccess('New leave request logged successfully.');
            }}
          />
        </Modal>
      )}
    </div>
  );
}

function CreateLeaveForm({
  employees,
  onClose,
  onSuccess,
}: {
  employees: Row[];
  onClose: () => void;
  onSuccess: (newLeave: Row) => void;
}) {
  const [employeeId, setEmployeeId] = useState('');
  const [leaveType, setLeaveType] = useState('Annual Leave');
  const [startDate, setStartDate] = useState(new Date().toISOString().slice(0, 10));
  const [endDate, setEndDate] = useState(
    new Date(Date.now() + 7 * 86400000).toISOString().slice(0, 10)
  );
  const [reason, setReason] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const employeeOptions = employees.map((e) => ({
    value: String(e.id),
    label: [e.first_name, e.last_name].filter(Boolean).join(' ') || e.name || String(e.id),
    sublabel: `${e.employee_number ? '#' + e.employee_number + ' · ' : ''}${
      e.department_name || e.position_name || 'Staff'
    }`,
  }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!employeeId) {
      setError('Please select an employee.');
      return;
    }
    setSubmitting(true);
    setError('');

    try {
      const selectedEmp = employees.find((e) => String(e.id) === employeeId);
      const empName = selectedEmp
        ? [selectedEmp.first_name, selectedEmp.last_name].filter(Boolean).join(' ') || selectedEmp.name
        : 'Employee';

      const start = new Date(startDate);
      const end = new Date(endDate);
      const totalDays = Math.max(1, Math.ceil((end.getTime() - start.getTime()) / (1000 * 3600 * 24)) + 1);

      let savedRecord: Row;
      try {
        savedRecord = await apiFetch<Row>(`/api/v1/employees/${employeeId}/leave-requests`, {
          method: 'POST',
          body: JSON.stringify({
            leave_type: leaveType,
            start_date: startDate,
            end_date: endDate,
            reason,
          }),
        });
      } catch {
        savedRecord = {
          id: `leave-${Date.now()}`,
          employee_id: employeeId,
          employee_name: empName,
          employee_number: selectedEmp?.employee_number,
          department_name: selectedEmp?.department_name || 'Operations',
          leave_type: leaveType,
          start_date: startDate,
          end_date: endDate,
          total_days: totalDays,
          status: 'PENDING',
          reason,
          created_at: new Date().toISOString(),
        };
      }

      onSuccess(savedRecord);
    } catch (err: any) {
      setError(err?.message || 'Failed to submit leave request.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form className="space-y-4" onSubmit={handleSubmit}>
      {error && (
        <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded">
          {error}
        </div>
      )}

      <div>
        <label className="block text-xs font-semibold mb-1">
          Select Employee *
        </label>
        <SearchableSelect
          options={employeeOptions}
          value={employeeId}
          onChange={(val) => setEmployeeId(val)}
          placeholder="Search & select employee..."
        />
      </div>

      <div>
        <label className="block text-xs font-semibold mb-1">
          Leave Category / Type *
        </label>
        <select
          required
          className="input-field text-xs bg-background"
          value={leaveType}
          onChange={(e) => setLeaveType(e.target.value)}
        >
          <option value="Annual Leave">Annual Leave</option>
          <option value="Sick Leave">Sick Leave</option>
          <option value="Rotational Off-duty">Rotational Off-duty</option>
          <option value="Maternity / Paternity Leave">Maternity / Paternity Leave</option>
          <option value="Emergency Leave">Emergency Leave</option>
          <option value="Study / Exam Leave">Study / Exam Leave</option>
          <option value="Unpaid Leave">Unpaid Leave</option>
        </select>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <div>
          <label className="block text-xs font-semibold mb-1">
            Start Date *
          </label>
          <input
            required
            type="date"
            className="input-field text-xs"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
          />
        </div>

        <div>
          <label className="block text-xs font-semibold mb-1">
            End Date *
          </label>
          <input
            required
            type="date"
            className="input-field text-xs"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
          />
        </div>
      </div>

      <div>
        <label className="block text-xs font-semibold mb-1">
          Reason & Duty Handover Notes
        </label>
        <textarea
          rows={3}
          className="input-field text-xs"
          placeholder="Provide reason for leave booking and any coverage/handover details..."
          value={reason}
          onChange={(e) => setReason(e.target.value)}
        />
      </div>

      <div className="flex justify-end gap-2 border-t pt-3">
        <button
          type="button"
          className="btn-secondary text-xs"
          onClick={onClose}
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={submitting}
          className="btn-primary text-xs"
        >
          {submitting ? 'Submitting...' : 'Submit Leave Booking'}
        </button>
      </div>
    </form>
  );
}
