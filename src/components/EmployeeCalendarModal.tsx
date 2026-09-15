'use client';

import React, { useState, useEffect } from 'react';
import { Calendar, ChevronLeft, ChevronRight, Clock, FileText, Activity, Briefcase, Eye, Edit } from 'lucide-react';
import { apiFetch } from '@/lib/api';
import { Row, display, title, Modal } from './DataUI';
import AssignmentDetailsModal from './AssignmentDetailsModal';
import RecordForm from './RecordForm';
import { formatAuditActivity } from './EmployeeDetailView';

interface EmployeeCalendarModalProps {
  employeeId: string;
  employeeName: string;
  onClose: () => void;
}

export default function EmployeeCalendarModal({
  employeeId,
  employeeName,
  onClose,
}: EmployeeCalendarModalProps) {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<string>(
    new Date().toISOString().slice(0, 10)
  );

  const [timeLogs, setTimeLogs] = useState<Row[]>([]);
  const [leaveRequests, setLeaveRequests] = useState<Row[]>([]);
  const [activities, setActivities] = useState<Row[]>([]);
  const [rotations, setRotations] = useState<Row[]>([]);
  const [assignments, setAssignments] = useState<Row[]>([]);

  const [viewingAssignment, setViewingAssignment] = useState<Row | null>(null);
  const [editingAssignment, setEditingAssignment] = useState<Row | null>(null);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const reloadData = () => {
    setLoading(true);
    setError('');

    const root = `/api/v1/employees/${employeeId}`;

    Promise.all([
      apiFetch<Row[]>(`${root}/time-logs`).catch(() => []),
      apiFetch<Row[]>(`${root}/leave-requests`).catch(() => []),
      apiFetch<Row[]>(`${root}/activity`).catch(() => []),
      apiFetch<Row[]>(`${root}/rotations`).catch(() => []),
      apiFetch<Row[]>(`${root}/assignments`).catch(() => []),
    ]).then(([timeData, leaveData, actData, rotData, assignData]) => {
      setTimeLogs(Array.isArray(timeData) ? timeData : (timeData as any)?.items || []);
      setLeaveRequests(Array.isArray(leaveData) ? leaveData : (leaveData as any)?.items || []);
      setActivities(Array.isArray(actData) ? actData : (actData as any)?.items || []);
      setRotations(Array.isArray(rotData) ? rotData : (rotData as any)?.items || []);
      setAssignments(Array.isArray(assignData) ? assignData : (assignData as any)?.items || []);
      setLoading(false);
    });
  };

  // Fetch performance, schedule, attendance & activity data
  useEffect(() => {
    reloadData();
  }, [employeeId]);

  // Calendar calculations
  const year = currentDate.getFullYear();
  const month = currentDate.getMonth(); // 0-indexed

  const firstDayOfMonth = new Date(year, month, 1);
  const lastDayOfMonth = new Date(year, month + 1, 0);

  const startingDayOfWeek = firstDayOfMonth.getDay(); // 0 = Sun, 1 = Mon ...
  const daysInMonth = lastDayOfMonth.getDate();

  const prevMonth = () => {
    setCurrentDate(new Date(year, month - 1, 1));
  };

  const nextMonth = () => {
    setCurrentDate(new Date(year, month + 1, 1));
  };

  const goToToday = () => {
    const today = new Date();
    setCurrentDate(today);
    setSelectedDate(today.toISOString().slice(0, 10));
  };

  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  // Helper to format Date string YYYY-MM-DD
  const formatDateKey = (y: number, m: number, d: number) => {
    const mm = String(m + 1).padStart(2, '0');
    const dd = String(d).padStart(2, '0');
    return `${y}-${mm}-${dd}`;
  };

  // Find events on a given date key (YYYY-MM-DD)
  const getEventsForDate = (dateStr: string) => {
    // Time log on this date
    const log = timeLogs.find(t => {
      const d = t.date ? String(t.date).slice(0, 10) : t.check_in ? String(t.check_in).slice(0, 10) : '';
      return d === dateStr;
    });

    // Leave request covering this date
    const leaves = leaveRequests.filter(l => {
      const start = l.start_date ? String(l.start_date).slice(0, 10) : '';
      const end = l.end_date ? String(l.end_date).slice(0, 10) : '';
      return start && end && dateStr >= start && dateStr <= end;
    });

    // Activity on this date
    const acts = activities.filter(a => {
      const d = a.occurred_at ? String(a.occurred_at).slice(0, 10) : a.created_at ? String(a.created_at).slice(0, 10) : '';
      return d === dateStr;
    });

    // Rotation active on this date
    const rots = rotations.filter(r => {
      const start = r.work_start_date ? String(r.work_start_date).slice(0, 10) : '';
      const end = r.off_end_date || r.work_end_date ? String(r.off_end_date || r.work_end_date).slice(0, 10) : '';
      return start && end && dateStr >= start && dateStr <= end;
    });

    // Project assignments active on this date
    const dayAssignments = assignments.filter(a => {
      const start = a.start_date ? String(a.start_date).slice(0, 10) : a.mobilization_date ? String(a.mobilization_date).slice(0, 10) : '';
      const end = a.end_date ? String(a.end_date).slice(0, 10) : a.demobilization_date ? String(a.demobilization_date).slice(0, 10) : '';
      if (!start) return false;
      if (end) return dateStr >= start && dateStr <= end;
      return dateStr >= start;
    });

    return { timeLog: log, leaves, activities: acts, rotations: rots, assignments: dayAssignments };
  };

  // Calculate monthly KPIs
  const currentMonthKey = `${year}-${String(month + 1).padStart(2, '0')}`;

  const daysPresentCount = timeLogs.filter(t => {
    const d = t.date ? String(t.date).slice(0, 7) : t.check_in ? String(t.check_in).slice(0, 7) : '';
    return d === currentMonthKey;
  }).length;

  const approvedLeavesCount = leaveRequests.filter(l => l.status === 'APPROVED').length;
  const pendingLeavesCount = leaveRequests.filter(l => l.status === 'PENDING').length;
  const activeAssignmentsCount = assignments.filter(a => a.status === 'ACTIVE' || !a.status).length;
  const totalActivitiesCount = activities.length;

  // Render Days Grid
  const renderCalendarDays = () => {
    const days = [];

    // Blank cells before month starts
    for (let i = 0; i < startingDayOfWeek; i++) {
      days.push(
        <div key={`pad-${i}`} className="h-20 bg-muted/20 border border-border/40 p-1.5 opacity-40" />
      );
    }

    // Days of current month
    for (let day = 1; day <= daysInMonth; day++) {
      const dateStr = formatDateKey(year, month, day);
      const isSelected = dateStr === selectedDate;
      const isToday = dateStr === new Date().toISOString().slice(0, 10);

      const { timeLog, leaves, activities: dayActs, assignments: dayAssigns } = getEventsForDate(dateStr);

      const hasEvents = !!timeLog || leaves.length > 0 || dayActs.length > 0 || dayAssigns.length > 0;

      days.push(
        <div
          key={dateStr}
          onClick={() => setSelectedDate(dateStr)}
          className={`h-20 border p-1.5 flex flex-col justify-between cursor-pointer transition-all ${
            isSelected
              ? 'ring-2 ring-primary bg-secondary/40 border-primary font-bold shadow-sm'
              : isToday
              ? 'bg-blue-50/70 border-blue-300 font-semibold' :'bg-card hover:bg-muted/40 border-border/60'
          }`}
        >
          <div className="flex justify-between items-center text-xs">
            <span className={`w-5 h-5 flex items-center justify-center rounded-full ${
              isToday ? 'bg-primary text-white font-bold' : 'text-foreground'
            }`}>
              {day}
            </span>

            {/* Event indicators dots */}
            {hasEvents && (
              <div className="flex gap-1 items-center">
                {dayAssigns.length > 0 && <span className="w-2 h-2 rounded-full bg-purple-600" title="Project Assignment" />}
                {leaves.length > 0 && <span className="w-2 h-2 rounded-full bg-emerald-500" title="Leave" />}
                {timeLog && <span className="w-2 h-2 rounded-full bg-blue-600" title="Time Log" />}
                {dayActs.length > 0 && <span className="w-2 h-2 rounded-full bg-amber-500" title="Activity" />}
              </div>
            )}
          </div>

          {/* Event badges on calendar day */}
          <div className="space-y-0.5 text-[10px] overflow-hidden">
            {dayAssigns.map((a, idx) => (
              <span
                key={`asgn-${idx}`}
                className="block truncate px-1 py-0.5 rounded bg-purple-100 text-purple-900 font-semibold flex items-center gap-1 border border-purple-200"
                title={`Project Assignment: ${a.project_name || a.role_on_project || 'Assignment'}`}
              >
                <Briefcase size={10} className="shrink-0 text-purple-700" />
                <span className="truncate">{a.project_name || a.role_on_project || 'Project'}</span>
              </span>
            ))}

            {timeLog && (
              <span className="block truncate px-1 py-0.5 rounded bg-blue-100 text-blue-800 font-medium flex items-center gap-1">
                <Clock size={10} className="shrink-0" />
                <span className="truncate">{timeLog.check_in ? String(timeLog.check_in).slice(11, 16) : 'Logged'}</span>
              </span>
            )}

            {leaves.map((l, idx) => (
              <span
                key={`lv-${idx}`}
                className={`block truncate px-1 py-0.5 rounded font-medium flex items-center gap-1 ${
                  l.status === 'APPROVED' ?'bg-emerald-100 text-emerald-800' :'bg-amber-100 text-amber-800'
                }`}
              >
                <Calendar size={10} className="shrink-0" />
                <span className="truncate">{l.leave_type || 'Leave'} ({l.status})</span>
              </span>
            ))}

            {!timeLog && leaves.length === 0 && dayAssigns.length === 0 && dayActs.length > 0 && (
              <span className="block truncate px-1 py-0.5 rounded bg-muted text-muted-foreground flex items-center gap-1">
                <Activity size={10} className="shrink-0" />
                <span className="truncate">{dayActs.length} {dayActs.length === 1 ? 'event' : 'events'}</span>
              </span>
            )}
          </div>
        </div>
      );
    }

    return days;
  };

  const selectedEvents = getEventsForDate(selectedDate);

  return (
    <Modal name={`Schedule & Performance Calendar — ${employeeName}`} onClose={onClose}>
      <div className="space-y-6">
        {/* KPI Performance Bar */}
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 border-b pb-4">
          <div className="p-3 rounded bg-purple-50/70 border border-purple-200">
            <span className="text-[11px] font-semibold text-purple-700 block">Project Assignments</span>
            <span className="text-xl font-bold text-purple-900">{activeAssignmentsCount} Active</span>
          </div>

          <div className="p-3 rounded bg-blue-50/70 border border-blue-200">
            <span className="text-[11px] font-semibold text-blue-700 block">Logged Present ({monthNames[month]})</span>
            <span className="text-xl font-bold text-blue-900">{daysPresentCount} Days</span>
          </div>

          <div className="p-3 rounded bg-emerald-50/70 border border-emerald-200">
            <span className="text-[11px] font-semibold text-emerald-700 block">Approved Leave</span>
            <span className="text-xl font-bold text-emerald-900">{approvedLeavesCount} Bookings</span>
          </div>

          <div className="p-3 rounded bg-amber-50/70 border border-amber-200">
            <span className="text-[11px] font-semibold text-amber-700 block">Pending Leave</span>
            <span className="text-xl font-bold text-amber-900">{pendingLeavesCount} Requests</span>
          </div>

          <div className="p-3 rounded bg-slate-50 border border-slate-200">
            <span className="text-[11px] font-semibold text-slate-700 block">Total Audit Logs</span>
            <span className="text-xl font-bold text-slate-900">{totalActivitiesCount} Events</span>
          </div>
        </div>

        {/* Month Navigation Header */}
        <div className="flex flex-wrap items-center justify-between gap-3 bg-muted/30 p-3 rounded border">
          <div className="flex items-center gap-2">
            <button
              onClick={prevMonth}
              className="btn-secondary text-xs p-1.5"
              aria-label="Previous month"
            >
              <ChevronLeft size={16} />
            </button>
            <h3 className="text-base font-bold text-foreground min-w-[160px] text-center">
              {monthNames[month]} {year}
            </h3>
            <button
              onClick={nextMonth}
              className="btn-secondary text-xs p-1.5"
              aria-label="Next month"
            >
              <ChevronRight size={16} />
            </button>
          </div>

          <div className="flex items-center gap-3 text-xs">
            <button onClick={goToToday} className="btn-secondary text-xs">
              Go To Today
            </button>
            <div className="flex items-center gap-2.5">
              <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-purple-600" /> Assignment</span>
              <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-blue-600" /> Time Log</span>
              <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-emerald-500" /> Leave</span>
              <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-amber-500" /> Activity</span>
            </div>
          </div>
        </div>

        {loading ? (
          <div className="p-12 text-center text-muted-foreground animate-pulse">
            Loading performance calendar, project assignments & leave bookings...
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Calendar Grid */}
            <div className="lg:col-span-2 space-y-2">
              <div className="grid grid-cols-7 gap-1 text-center font-bold text-xs text-muted-foreground uppercase py-1">
                <span>Sun</span>
                <span>Mon</span>
                <span>Tue</span>
                <span>Wed</span>
                <span>Thu</span>
                <span>Fri</span>
                <span>Sat</span>
              </div>
              <div className="grid grid-cols-7 gap-1">
                {renderCalendarDays()}
              </div>
            </div>

            {/* Day Details Inspector */}
            <div className="border rounded p-4 bg-card space-y-4 h-full">
              <div className="border-b pb-2">
                <span className="text-xs font-bold uppercase text-primary tracking-wider">
                  Selected Date Details
                </span>
                <h4 className="text-sm font-bold text-foreground mt-1">
                  {new Date(selectedDate + 'T00:00:00').toLocaleDateString('en-US', {
                    weekday: 'long',
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric',
                  })}
                </h4>
              </div>

              <div className="space-y-4 max-h-[380px] overflow-y-auto scrollbar-thin pr-1">
                {/* Project Assignments Section */}
                <div className="space-y-2">
                  <h5 className="text-xs font-bold text-muted-foreground uppercase flex items-center gap-1.5">
                    <Briefcase size={14} className="text-purple-600" /> Project Assignments
                  </h5>
                  {selectedEvents.assignments.length > 0 ? (
                    selectedEvents.assignments.map((a, i) => (
                      <div key={i} className="p-3 bg-purple-50/70 border border-purple-200 rounded text-xs space-y-1.5">
                        <div className="flex justify-between items-center font-bold text-purple-900">
                          <span>{display(a.project_name || a.project_id || 'Project Assignment')}</span>
                          <span className="px-1.5 py-0.5 rounded bg-purple-200 text-purple-900 text-[10px]">
                            {display(a.status || 'ACTIVE')}
                          </span>
                        </div>
                        <p className="text-purple-800 text-[11px]">
                          Role: <strong>{display(a.role_on_project || 'Member')}</strong>
                        </p>
                        <p className="text-purple-700 text-[11px]">
                          Dates: {display(a.start_date)} to {display(a.end_date || 'Ongoing')}
                        </p>
                        <div className="flex items-center gap-2 pt-1.5 border-t border-purple-200">
                          <button
                            type="button"
                            className="text-[11px] font-semibold text-purple-900 hover:underline flex items-center gap-1"
                            onClick={() => setViewingAssignment(a)}
                          >
                            <Eye size={12} /> View Details
                          </button>
                          <button
                            type="button"
                            className="text-[11px] font-semibold text-purple-900 hover:underline flex items-center gap-1"
                            onClick={() => setEditingAssignment(a)}
                          >
                            <Edit size={12} /> Edit
                          </button>
                        </div>
                      </div>
                    ))
                  ) : (
                    <p className="text-xs text-muted-foreground italic pl-2">No project assignment on this date.</p>
                  )}
                </div>

                {/* Time Log Section */}
                <div className="space-y-2 border-t pt-3">
                  <h5 className="text-xs font-bold text-muted-foreground uppercase flex items-center gap-1.5">
                    <Clock size={14} className="text-blue-600" /> Attendance / Time Log
                  </h5>
                  {selectedEvents.timeLog ? (
                    <div className="p-3 bg-blue-50/60 border border-blue-200 rounded text-xs space-y-1">
                      <div className="flex justify-between font-semibold text-blue-900">
                        <span>Status: {selectedEvents.timeLog.status || 'PRESENT'}</span>
                        <span>Date: {display(selectedEvents.timeLog.date)}</span>
                      </div>
                      <p className="text-blue-800">
                        Check In: <strong>{display(selectedEvents.timeLog.check_in)}</strong>
                      </p>
                      <p className="text-blue-800">
                        Check Out: <strong>{display(selectedEvents.timeLog.check_out)}</strong>
                      </p>
                    </div>
                  ) : (
                    <p className="text-xs text-muted-foreground italic pl-2">No time log recorded for this day.</p>
                  )}
                </div>

                {/* Leave Bookings Section */}
                <div className="space-y-2 border-t pt-3">
                  <h5 className="text-xs font-bold text-muted-foreground uppercase flex items-center gap-1.5">
                    <FileText size={14} className="text-emerald-600" /> Leave Bookings
                  </h5>
                  {selectedEvents.leaves.length > 0 ? (
                    selectedEvents.leaves.map((l, i) => (
                      <div key={i} className="p-3 bg-emerald-50/60 border border-emerald-200 rounded text-xs space-y-1">
                        <div className="flex justify-between font-semibold text-emerald-900">
                          <span>{l.leave_type || 'Leave Request'}</span>
                          <span className="px-1.5 py-0.5 rounded bg-emerald-200 text-emerald-800 text-[10px]">
                            {l.status}
                          </span>
                        </div>
                        <p className="text-emerald-800">
                          Dates: {display(l.start_date)} to {display(l.end_date)}
                        </p>
                        {l.reason && <p className="text-emerald-700 italic">"{l.reason}"</p>}
                      </div>
                    ))
                  ) : (
                    <p className="text-xs text-muted-foreground italic pl-2">No leave booked for this day.</p>
                  )}
                </div>

                {/* Activity & Audit Logs */}
                <div className="space-y-2 border-t pt-3">
                  <h5 className="text-xs font-bold text-muted-foreground uppercase flex items-center gap-1.5">
                    <Activity size={14} className="text-amber-600" /> Audit & Activity Logs
                  </h5>
                  {selectedEvents.activities.length > 0 ? (
                    selectedEvents.activities.map((a, i) => {
                      const { titleStr, descStr, formattedDate, IconNode, badgeColor } =
                        formatAuditActivity(a);
                      return (
                        <div
                          key={i}
                          className="p-2.5 bg-muted/20 border rounded flex items-center justify-between gap-3 text-xs"
                        >
                          <div className="flex items-center gap-2.5 min-w-0">
                            <span className={`p-1.5 rounded-full border shrink-0 ${badgeColor}`}>
                              <IconNode size={14} />
                            </span>
                            <div className="min-w-0">
                              <p className="font-bold text-foreground truncate">{titleStr}</p>
                              <p className="text-[11px] text-muted-foreground truncate">{descStr}</p>
                            </div>
                          </div>
                          <span className="text-[10px] font-mono text-muted-foreground whitespace-nowrap shrink-0">
                            {formattedDate}
                          </span>
                        </div>
                      );
                    })
                  ) : (
                    <p className="text-xs text-muted-foreground italic pl-2">No system activity logged on this date.</p>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Sub-modals inside Calendar */}
      {viewingAssignment && (
        <AssignmentDetailsModal
          assignment={viewingAssignment}
          employeeName={employeeName}
          onClose={() => setViewingAssignment(null)}
          onEdit={(item) => setEditingAssignment(item)}
        />
      )}

      {editingAssignment && (
        <RecordForm
          resource="employee-assignments"
          path={`/api/v1/employees/${employeeId}/assignments/${editingAssignment.id}`}
          title="Update Project Assignment"
          initial={editingAssignment}
          method="PATCH"
          operation={{
            schema: { $ref: '#/components/schemas/EmployeeAssignmentUpdate' },
            permissions: [],
          }}
          employeeId={employeeId}
          onClose={() => setEditingAssignment(null)}
          onSaved={() => {
            setEditingAssignment(null);
            reloadData();
          }}
        />
      )}
    </Modal>
  );
}
