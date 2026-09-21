'use client';

import React, { useEffect, useState } from 'react';
import { Bell, CheckCircle2, Share2, Plus, RefreshCw, Search, Filter, Wrench, Package, Users, FolderKanban, Clock, Mail, ShieldAlert, Play, Trash2, Pencil } from 'lucide-react';
import { apiFetch } from '@/lib/api';
import { useAuth } from './AuthProvider';
import useNotificationCount from './useNotificationCount';
import useNotificationData from './useNotificationData';
import useAppFeedback from './useAppFeedback';
import { useData, State, Row, rows, Modal, title } from './DataUI';

const DOMAIN_RULES: Record<string, { value: string; label: string }[]> = {
  INVENTORY: [
    { value: 'INVENTORY_CONSUMABLES_EXPIRY', label: 'Consumables Expiry Threshold Alert' },
    { value: 'INVENTORY_LOW_STOCK', label: 'Inventory Low Stock Alert' },
  ],
  EQUIPMENT: [
    { value: 'EQUIPMENT_MAINTENANCE_DUE', label: 'Equipment Maintenance Due / Overdue' },
    { value: 'EQUIPMENT_STATUS_CHANGE', label: 'Equipment Breakdown / Maintenance / Quarantine Alert' },
  ],
  WORKFORCE: [
    { value: 'WORKFORCE_DOCUMENT_EXPIRY', label: 'Workforce Document / Licence Expiry' },
    { value: 'WORKFORCE_ROTATION_DUE', label: 'Upcoming Rotation End Date Alert' },
  ],
  PROJECTS: [
    { value: 'PROJECT_MILESTONE_DUE', label: 'Project Expected End Date Alert' },
  ],
};

export default function NotificationWorkspace({ fieldPortal = false }: { fieldPortal?: boolean }) {
  const auth = useAuth();
  const canManageSchedules = !fieldPortal && (!!auth.access?.is_superuser || ['employees.alerts.manage', 'inventory.manage', 'inventory.admin', 'inventory.write', 'assets.update', 'assets.manage', 'assets.write', 'projects.update', 'projects.manage', 'projects.write'].some(code => auth.access?.permissions.includes(code)));
  const [page, setPage] = useState(1);
  const [tab, setTab] = useState<'notifications' | 'schedules'>('notifications');
  const [domainFilter, setDomainFilter] = useState<string>('ALL');
  const [resolvedFilter, setResolvedFilter] = useState<'ALL' | 'UNRESOLVED' | 'RESOLVED'>('ALL');
  const [search, setSearch] = useState('');
  const [query, setQuery] = useState('');

  // Modals state
  const [forwardNotif, setForwardNotif] = useState<Row | null>(null);
  const [forwardTargetUserIds, setForwardTargetUserIds] = useState<string[]>([]);
  const [forwardSearch, setForwardSearch] = useState('');
  const [forwardNotes, setForwardNotes] = useState('');
  const [forwardingBusy, setForwardingBusy] = useState(false);
  const [actionError, setActionErrorState] = useState('');
  const { notify } = useAppFeedback();
  const setActionError = (message: string) => {
    setActionErrorState(message);
    if (message) notify({ type: 'error', message });
  };
  const setActionSuccess = (message: string) => {
    if (message) notify({ type: 'success', message });
  };

  const [createScheduleOpen, setCreateScheduleOpen] = useState(false);
  const [editingSchedule, setEditingSchedule] = useState<Row | null>(null);
  const [schedTitle, setSchedTitle] = useState('');
  const [schedDomain, setSchedDomain] = useState('INVENTORY');
  const [schedRuleType, setSchedRuleType] = useState('INVENTORY_CONSUMABLES_EXPIRY');
  const [schedLeadDays, setSchedLeadDays] = useState(14);
  const [schedFrequency, setSchedFrequency] = useState('DAILY');
  const [schedPriority, setSchedPriority] = useState('IMPORTANT');
  const [schedDelivery, setSchedDelivery] = useState('BOTH');
  const [schedRecipients, setSchedRecipients] = useState<string[]>([]);
  const [recipientSearch, setRecipientSearch] = useState('');
  const [schedIsActive, setSchedIsActive] = useState(true);
  const [schedBusy, setSchedBusy] = useState(false);

  // Helper function to check if employee is supervisor/manager
  const isSupervisor = (u: Row) => {
    if (u.is_supervisory_role) return true;
    const titleStr = String(u.job_title || u.position_name || u.role || '').toLowerCase();
    return (
      titleStr.includes('supervisor') ||
      titleStr.includes('manager') ||
      titleStr.includes('lead') ||
      titleStr.includes('head') ||
      titleStr.includes('director') ||
      titleStr.includes('chief')
    );
  };

  // Fetch users for forwarding and recipient selection
  const usersRes = useData(fieldPortal ? null : '/api/v1/employees?page_size=100');
  const userList = rows(usersRes.data);

  // Fetch notifications
  const params = new URLSearchParams({ page: String(page), page_size: '50' });
  if (domainFilter !== 'ALL') params.set('domain', domainFilter);
  if (resolvedFilter === 'RESOLVED') params.set('is_resolved', 'true');
  if (resolvedFilter === 'UNRESOLVED') params.set('is_resolved', 'false');
  if (query) params.set('search', query);

  const notifsRes = useNotificationData(tab === 'notifications' ? '/api/v1/notifications?' + params.toString() : null);
  useEffect(() => { if (notifsRes.error) notify({ type: 'error', message: notifsRes.error }); }, [notifsRes.error, notify]);
  const notifItems = rows(notifsRes.data?.items || notifsRes.data);
  const totalNotifs = notifsRes.data?.total ?? notifItems.length;

  // Fetch schedules
  const schedsRes = useData(canManageSchedules ? '/api/v1/notification-schedules' : null);
  const scheduleItems = rows(schedsRes.data);

  useEffect(() => { setPage(1); }, [domainFilter, resolvedFilter, query]);


  // Actions
  async function markRead(id: string) {
    try {
      await apiFetch(`/api/v1/notifications/${id}/read`, { method: 'POST' });
      window.dispatchEvent(new Event('cestos:notifications-changed'));
    } catch (e: any) {
      setActionError(e.message || 'Failed to mark read');
    }
  }

  async function resolveNotification(id: string) {
    try {
      await apiFetch(`/api/v1/notifications/${id}/resolve`, { method: 'POST' });
      window.dispatchEvent(new Event('cestos:notifications-changed'));
    } catch (e: any) {
      setActionError(e.message || 'Failed to resolve notification');
    }
  }

  async function handleForwardSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!forwardNotif || forwardTargetUserIds.length === 0) return;
    setForwardingBusy(true);
    setActionError('');
    try {
      await apiFetch(`/api/v1/notifications/${forwardNotif.id}/forward`, {
        method: 'POST',
        body: JSON.stringify({
          target_user_ids: forwardTargetUserIds,
          notes: forwardNotes || undefined,
        }),
      });
      setForwardNotif(null);
      setForwardTargetUserIds([]);
      setForwardSearch('');
      setForwardNotes('');
      window.dispatchEvent(new Event('cestos:notifications-changed'));
    } catch (e: any) {
      setActionError(e.message || 'Failed to forward notification');
    } finally {
      setForwardingBusy(false);
    }
  }

  const openCreateSchedule = () => {
    setEditingSchedule(null);
    setSchedTitle('');
    setSchedDomain('INVENTORY');
    setSchedRuleType('INVENTORY_CONSUMABLES_EXPIRY');
    setSchedLeadDays(14);
    setSchedFrequency('DAILY');
    setSchedPriority('IMPORTANT');
    setSchedDelivery('BOTH');
    setSchedRecipients([]);
    setRecipientSearch('');
    setSchedIsActive(true);
    setActionError('');
    setCreateScheduleOpen(true);
  };

  const openEditSchedule = (s: Row) => {
    setEditingSchedule(s);
    setSchedTitle(String(s.title || ''));
    const domainVal = String(s.domain || 'INVENTORY');
    setSchedDomain(domainVal);
    const availableRules = DOMAIN_RULES[domainVal] || [];
    const ruleVal = String(s.rule_type || (availableRules[0]?.value || 'INVENTORY_CONSUMABLES_EXPIRY'));
    setSchedRuleType(ruleVal);
    setSchedLeadDays(s.lead_time_days !== undefined && s.lead_time_days !== null ? Number(s.lead_time_days) : 14);
    setSchedFrequency(String(s.frequency || 'DAILY'));
    setSchedPriority(String(s.priority_tag || 'IMPORTANT'));
    setSchedDelivery(String(s.delivery_method || 'BOTH'));
    const recs = Array.isArray(s.recipient_user_ids)
      ? s.recipient_user_ids.map(String)
      : [];
    setSchedRecipients(recs);
    setRecipientSearch('');
    setSchedIsActive(s.is_active !== undefined && s.is_active !== null ? Boolean(s.is_active) : true);
    setActionError('');
    setCreateScheduleOpen(true);
  };

  async function handleScheduleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSchedBusy(true);
    setActionError('');
    try {
      const payload = {
        title: schedTitle || 'Notification Schedule',
        domain: schedDomain,
        rule_type: schedRuleType,
        lead_time_days: Number(schedLeadDays),
        frequency: schedFrequency,
        priority_tag: schedPriority,
        delivery_method: schedDelivery,
        recipient_user_ids: schedRecipients,
        is_active: schedIsActive,
      };

      if (editingSchedule) {
        await apiFetch(`/api/v1/notification-schedules/${editingSchedule.id}`, {
          method: 'PATCH',
          body: JSON.stringify(payload),
        });
      } else {
        await apiFetch('/api/v1/notification-schedules', {
          method: 'POST',
          body: JSON.stringify(payload),
        });
      }
      setCreateScheduleOpen(false);
      setEditingSchedule(null);
      setSchedTitle('');
      setSchedRecipients([]);
      schedsRes.reload();
      window.dispatchEvent(new Event('cestos:notifications-changed'));
    } catch (e: any) {
      setActionError(e.message || (editingSchedule ? 'Failed to update schedule' : 'Failed to create schedule'));
    } finally {
      setSchedBusy(false);
    }
  }

  async function triggerScheduleNow(schedId: string) {
    try {
      setActionError('');
      setActionSuccess('');
      const result = await apiFetch<any>(`/api/v1/notification-schedules/${schedId}/run-now`, { method: 'POST' });
      setActionSuccess(`Schedule evaluated: ${result.generated_notifications} new recipient notifications. Email deliveries are queued when enabled.`);
      schedsRes.reload();
      window.dispatchEvent(new Event('cestos:notifications-changed'));
    } catch (e: any) {
      setActionError(e.message || 'Failed to trigger schedule');
    }
  }

  async function deleteSchedule(schedId: string) {
    try {
      await apiFetch(`/api/v1/notification-schedules/${schedId}`, { method: 'DELETE' });
      schedsRes.reload();
    } catch (e: any) {
      setActionError(e.message || 'Failed to delete schedule');
    }
  }

  const unreadCount = useNotificationCount();
  const unresolvedCount = notifItems.filter((n) => !n.is_resolved).length;

  return (
    <div className="space-y-6 fade-in">
      {/* Header & KPI Summary */}
      <div className="flex flex-wrap justify-between items-end gap-4">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2.5">
            <Bell className="text-primary" size={26} />
            {fieldPortal ? 'Field Notifications' : 'Notifications & Scheduling Command Center'}
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            {fieldPortal ? 'Your project assignments, maintenance tasks, contract reminders, and leave updates.' : 'Granular automated notification schedules across Projects, Workforce, Equipment & Inventory'}
          </p>
        </div>
        <div className="flex gap-2">
          <button className="btn-secondary text-xs" onClick={() => { notifsRes.reload(); schedsRes.reload(); }}>
            <RefreshCw size={14} />
            Refresh
          </button>
          {!fieldPortal && <button className="btn-primary text-xs" onClick={openCreateSchedule}>
            <Plus size={14} />
            New Schedule
          </button>}
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="card p-4 bg-white border border-border">
          <div className="flex justify-between items-start">
            <span className="text-2xs font-semibold text-muted-foreground uppercase tracking-wider">Unread Alerts</span>
            <span className="p-2 bg-blue-50 text-blue-600 rounded-lg"><Bell size={16} /></span>
          </div>
          <p className="text-2xl font-bold text-foreground mt-2">{unreadCount}</p>
        </div>

        <div className="card p-4 bg-white border border-border">
          <div className="flex justify-between items-start">
            <span className="text-2xs font-semibold text-muted-foreground uppercase tracking-wider">Unresolved Issues</span>
            <span className="p-2 bg-amber-50 text-amber-600 rounded-lg"><ShieldAlert size={16} /></span>
          </div>
          <p className="text-2xl font-bold text-amber-700 mt-2">{unresolvedCount}</p>
        </div>

        {!fieldPortal && <>
        <div className="card p-4 bg-white border border-border">
          <div className="flex justify-between items-start">
            <span className="text-2xs font-semibold text-muted-foreground uppercase tracking-wider">Active Schedules</span>
            <span className="p-2 bg-purple-50 text-purple-600 rounded-lg"><Clock size={16} /></span>
          </div>
          <p className="text-2xl font-bold text-purple-700 mt-2">{scheduleItems.length}</p>
        </div>

        </>}
        <div className="card p-4 bg-white border border-border">
          <div className="flex justify-between items-start">
            <span className="text-2xs font-semibold text-muted-foreground uppercase tracking-wider">Total Feed Log</span>
            <span className="p-2 bg-emerald-50 text-emerald-600 rounded-lg"><CheckCircle2 size={16} /></span>
          </div>
          <p className="text-2xl font-bold text-emerald-700 mt-2">{totalNotifs}</p>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="border-b flex gap-6 text-sm font-semibold">
        <button
          className={`pb-3 border-b-2 flex items-center gap-2 transition-colors ${
            tab === 'notifications'
              ? 'border-primary text-primary' :'border-transparent text-muted-foreground hover:text-foreground'
          }`}
          onClick={() => setTab('notifications')}
        >
          <Bell size={16} />
          Alert Feed ({notifItems.length})
        </button>
        {!fieldPortal && <>
        <button
          className={`pb-3 border-b-2 flex items-center gap-2 transition-colors ${
            tab === 'schedules' ?'border-primary text-primary' :'border-transparent text-muted-foreground hover:text-foreground'
          }`}
          disabled={!canManageSchedules} onClick={() => setTab('schedules')}
        >
          <Clock size={16} />
          Automated Schedules ({scheduleItems.length})
        </button>
        </>}
      </div>

      {tab === 'notifications' ? (
        <div className="space-y-4">
          {/* Filters & Search */}
          <div className="card p-3 flex flex-wrap gap-3 items-center justify-between bg-muted/20">
            <div className="flex flex-wrap items-center gap-2 text-xs">
              <span className="text-muted-foreground font-semibold flex items-center gap-1">
                <Filter size={13} /> Domain:
              </span>
              {['ALL', 'PROJECTS', 'WORKFORCE', 'EQUIPMENT', 'INVENTORY'].map((d) => (
                <button
                  key={d}
                  className={`px-2.5 py-1 rounded-full text-xs font-semibold transition-colors ${
                    domainFilter === d
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-white text-muted-foreground hover:bg-muted border'
                  }`}
                  onClick={() => setDomainFilter(d)}
                >
                  {d === 'ALL' ? 'All Domains' : title(d)}
                </button>
              ))}
            </div>

            <div className="flex items-center gap-2 text-xs">
              <span className="text-muted-foreground font-semibold">Status:</span>
              <select
                className="input-field text-xs py-1 px-2"
                value={resolvedFilter}
                onChange={(e) => setResolvedFilter(e.target.value as any)}
              >
                <option value="ALL">All Statuses</option>
                <option value="UNRESOLVED">Unresolved Only</option>
                <option value="RESOLVED">Resolved Only</option>
              </select>
            </div>
          </div>

          {/* Search Form */}
          <form
            className="flex gap-2"
            onSubmit={(e) => {
              e.preventDefault();
              setQuery(search);
            }}
          >
            <input
              className="input-field text-xs max-w-md"
              placeholder="Search notifications message context…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            <button className="btn-secondary text-xs">
              <Search size={14} /> Search
            </button>
          </form>

          {/* Notifications Feed */}
          <State loading={notifsRes.loading} error="" retry={notifsRes.reload}>
            {notifItems.length === 0 ? (
              <div className="card p-10 text-center text-muted-foreground">
                <Bell size={32} className="mx-auto mb-2 opacity-40" />
                <p className="font-semibold text-foreground">No notifications found</p>
                <p className="text-xs mt-1">Adjust filters or trigger a schedule to generate alerts.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {notifItems.map((n: Row) => {
                  const isResolved = !!n.is_resolved;
                  const isRead = !!n.read_at;
                  const priority = n.priority_tag || 'IMPORTANT';
                  const domain = n.domain || 'WORKFORCE';
                  const delivery = n.delivery_method || 'BOTH';

                  return (
                    <div
                      key={n.id}
                      className={`card p-4 border transition-all ${
                        isResolved
                          ? 'bg-slate-50/60 border-slate-200 text-slate-600 opacity-80'
                          : isRead
                            ? 'bg-white border-border' :'bg-blue-50/30 border-blue-200 shadow-sm'
                      }`}
                    >
                      <div className="flex flex-wrap justify-between items-start gap-3">
                        <div className="space-y-1 max-w-3xl">
                          <div className="flex flex-wrap items-center gap-2">
                            {/* Domain Badge */}
                            <span className="badge bg-slate-100 text-slate-800 border-slate-200 text-2xs font-bold uppercase flex items-center gap-1">
                              {domain === 'EQUIPMENT' ? (
                                <Wrench size={10} />
                              ) : domain === 'INVENTORY' ? (
                                <Package size={10} />
                              ) : domain === 'PROJECTS' ? (
                                <FolderKanban size={10} />
                              ) : (
                                <Users size={10} />
                              )}
                              {domain}
                            </span>

                            {/* Priority Badge */}
                            <span
                              className={`badge text-2xs font-bold uppercase ${
                                priority === 'CRITICAL' ?'bg-red-100 text-red-800 border-red-200'
                                  : priority === 'IMPORTANT' ?'bg-amber-100 text-amber-800 border-amber-200' :'bg-blue-100 text-blue-800 border-blue-200'
                              }`}
                            >
                              {priority}
                            </span>

                            {/* Delivery Method Badge */}
                            <span className="badge bg-indigo-50 text-indigo-700 border-indigo-200 text-2xs font-medium flex items-center gap-1">
                              <Mail size={10} />
                              Method: {delivery}
                            </span>

                            {!isRead && (
                              <span className="badge bg-blue-600 text-white text-2xs font-bold">
                                UNREAD
                              </span>
                            )}

                            {isResolved && (
                              <span className="badge bg-emerald-100 text-emerald-800 border-emerald-200 text-2xs font-semibold flex items-center gap-1">
                                <CheckCircle2 size={10} />
                                RESOLVED
                              </span>
                            )}
                          </div>

                          {/* Message Content */}
                          <p className="text-sm font-medium text-foreground leading-relaxed mt-1">
                            {n.message}
                          </p>

                          {/* Forwarded Metadata */}
                          {n.forwarded_from_name && (
                            <p className="text-xs text-indigo-700 bg-indigo-50/60 p-2 rounded border border-indigo-100 italic">
                              ↳ Forwarded by <strong>{n.forwarded_from_name}</strong>
                              {n.forward_notes ? `: "${n.forward_notes}"` : ''}
                            </p>
                          )}

                          {/* Timestamp & User attribution */}
                          <div className="flex flex-wrap items-center gap-3 text-2xs text-muted-foreground pt-1">
                            <span>Logged: {new Date(n.created_at).toLocaleString()}</span>
                            {n.recipient_name && <span>Recipient: {n.recipient_name}</span>}
                            {isResolved && n.resolved_at && (
                              <span className="text-emerald-700 font-medium">
                                Resolved at {new Date(n.resolved_at).toLocaleString()}
                                {n.resolved_by_name ? ` by ${n.resolved_by_name}` : ''}
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Action buttons */}
                        <div className="flex items-center gap-2 shrink-0">
                          {!isRead && (
                            <button
                              className="btn-secondary text-2xs py-1 px-2.5"
                              onClick={() => markRead(n.id)}
                            >
                              Mark Read
                            </button>
                          )}

                          {!isResolved && (
                            <button
                              className="btn-primary bg-emerald-600 hover:bg-emerald-700 text-2xs py-1 px-2.5"
                              onClick={() => resolveNotification(n.id)}
                            >
                              <CheckCircle2 size={12} />
                              Resolve
                            </button>
                          )}

                          {!fieldPortal && <>
                          <button
                            className="btn-secondary text-2xs py-1 px-2.5 text-indigo-700 hover:bg-indigo-50"
                            onClick={() => {
                              setActionError('');
                              setForwardNotif(n);
                              setForwardTargetUserIds([]);
                              setForwardSearch('');
                              setForwardNotes('');
                            }}
                          >
                            <Share2 size={12} />
                            Forward
                          </button>                          </>}

                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </State>
          <div className="flex items-center justify-end gap-3 text-sm">
            <button className="btn-secondary" disabled={page <= 1} onClick={() => setPage((value) => value - 1)}>Previous</button>
            <span>Page {page} of {Math.max(1, Math.ceil(Number(totalNotifs) / 50))}</span>
            <button className="btn-secondary" disabled={page * 50 >= Number(totalNotifs)} onClick={() => setPage((value) => value + 1)}>Next</button>
          </div>
        </div>
      ) : (
        /* Granular Notification Schedules Tab */
        <div className="space-y-4">
          <div className="flex justify-between items-center bg-muted/20 p-3 rounded card">
            <span className="text-xs text-muted-foreground">
              Automated rule evaluation runs daily to check lead thresholds across consumables, inventory, workforce & equipment.
            </span>
            {!fieldPortal && <button className="btn-primary text-xs" onClick={openCreateSchedule}>
              <Plus size={14} />
              Create Schedule Rule
            </button>}
          </div>

          <State loading={schedsRes.loading} error={schedsRes.error} retry={schedsRes.reload}>
            {scheduleItems.length === 0 ? (
              <div className="card p-10 text-center text-muted-foreground">
                <Clock size={32} className="mx-auto mb-2 opacity-40" />
                <p className="font-semibold text-foreground">No notification schedules configured</p>
                <p className="text-xs mt-1">Set up granular schedules to automate expiry and maintenance alerts.</p>
              </div>
            ) : (
              <div className="overflow-x-auto card">
                <table className="w-full text-xs text-left">
                  <thead className="bg-muted text-muted-foreground uppercase text-[11px]">
                    <tr>
                      <th className="px-4 py-3 font-semibold">Schedule Title & Domain</th>
                      <th className="px-4 py-3 font-semibold">Rule Criteria</th>
                      <th className="px-4 py-3 font-semibold">Lead Time</th>
                      <th className="px-4 py-3 font-semibold">Frequency</th>
                      <th className="px-4 py-3 font-semibold">Tag & Delivery</th>
                      <th className="px-4 py-3 font-semibold">Status</th>
                      <th className="px-4 py-3 font-semibold text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {scheduleItems.map((s: Row) => (
                      <tr key={s.id} className="hover:bg-muted/50">
                        <td className="px-4 py-3 font-semibold text-foreground">
                          <div>{s.title}</div>
                          <span className="text-2xs text-muted-foreground uppercase tracking-wider font-bold">
                            {s.domain}
                          </span>
                        </td>
                        <td className="px-4 py-3 font-medium text-slate-700">
                          {s.rule_type?.replace(/_/g, ' ')}
                        </td>
                        <td className="px-4 py-3 font-semibold text-primary">
                          {s.lead_time_days} Days Lead Time
                        </td>
                        <td className="px-4 py-3">
                          <div>{s.frequency || 'DAILY'}</div>
                          <div className="text-muted-foreground mt-1">Last run: {s.last_run_at ? new Date(s.last_run_at).toLocaleString() : 'Never'}</div>
                          <div className="text-muted-foreground">Next: {s.next_run_at ? new Date(s.next_run_at).toLocaleString() : s.frequency === 'ONCE' && s.last_run_at ? 'Completed' : 'Awaiting scheduler'}</div>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex gap-1.5 flex-wrap">
                            <span className="badge bg-amber-100 text-amber-800 text-2xs font-bold">
                              {s.priority_tag || 'IMPORTANT'}
                            </span>
                            <span className="badge bg-indigo-50 text-indigo-700 text-2xs font-medium">
                              {s.delivery_method || 'BOTH'}
                            </span>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          {s.is_active ? (
                            <span className="badge badge-active text-2xs font-bold">ACTIVE</span>
                          ) : (
                            <span className="badge badge-neutral text-2xs">INACTIVE</span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-right">
                          <div className="flex justify-end gap-2">
                            <button
                              className="btn-secondary text-2xs py-1 px-2.5 text-blue-700 hover:bg-blue-50"
                              onClick={() => openEditSchedule(s)}
                              title="Edit schedule"
                            >
                              <Pencil size={11} /> Edit
                            </button>
                            <button
                              className="btn-secondary text-2xs py-1 px-2.5 text-emerald-700 hover:bg-emerald-50"
                              onClick={() => triggerScheduleNow(s.id)}
                              title="Run schedule evaluation immediately"
                            >
                              <Play size={11} /> Run Now
                            </button>
                            <button
                              className="btn-secondary text-2xs py-1 px-2 text-red-600 hover:bg-red-50"
                              onClick={() => deleteSchedule(s.id)}
                            >
                              <Trash2 size={11} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </State>
        </div>
      )}

      {/* Forward Notification Modal */}
      {forwardNotif && (() => {
        const filteredForwardUsers = userList
          .filter((u: Row) => {
            const q = forwardSearch.toLowerCase();
            if (!q) return true;
            const name = `${u.first_name || ''} ${u.last_name || ''}`.toLowerCase();
            const email = String(u.work_email || u.email || '').toLowerCase();
            const empNum = String(u.employee_number || '').toLowerCase();
            const titleStr = String(u.job_title || u.position_name || u.department || '').toLowerCase();
            return name.includes(q) || email.includes(q) || empNum.includes(q) || titleStr.includes(q);
          })
          .sort((a: Row, b: Row) => {
            const aSup = isSupervisor(a) ? 1 : 0;
            const bSup = isSupervisor(b) ? 1 : 0;
            if (aSup !== bSup) return bSup - aSup;
            const aName = `${a.first_name || ''} ${a.last_name || ''}`.trim();
            const bName = `${b.first_name || ''} ${b.last_name || ''}`.trim();
            return aName.localeCompare(bName);
          });

        return (
          <Modal
            name="Forward Notification Alert"
            onClose={() => setForwardNotif(null)}
          >
            <form onSubmit={handleForwardSubmit} className="space-y-4 text-xs">
              <div className="p-3 bg-muted/40 rounded-lg border text-foreground font-medium flex items-start gap-2">
                <span className="text-primary font-bold text-base leading-none">“</span>
                <p className="italic text-xs flex-1">{String(forwardNotif.message)}</p>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="font-semibold text-foreground">
                    Select Target Employee / Recipient *
                  </label>
                  <span className="text-[11px] font-mono text-muted-foreground">
                    {forwardTargetUserIds.length} selected
                  </span>
                </div>

                {/* Search Bar */}
                <div className="relative mb-2">
                  <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
                  <input
                    type="text"
                    placeholder="Search employees by name, job title, or email..."
                    value={forwardSearch}
                    onChange={(e) => setForwardSearch(e.target.value)}
                    className="w-full pl-8 pr-3 py-1.5 rounded-md border bg-background text-xs focus:outline-none focus:ring-1 focus:ring-primary"
                  />
                </div>

                {/* Quick Select Actions */}
                <div className="flex items-center gap-2 mb-2">
                  <button
                    type="button"
                    onClick={() => {
                      const supervisorIds = filteredForwardUsers
                        .filter((u: Row) => isSupervisor(u))
                        .map((u: Row) => String(u.id));
                      setForwardTargetUserIds(Array.from(new Set([...forwardTargetUserIds, ...supervisorIds])));
                    }}
                    className="px-2 py-1 rounded bg-purple-50 hover:bg-purple-100 text-purple-700 dark:bg-purple-950/40 dark:text-purple-300 text-[10px] font-semibold transition"
                  >
                    + Select All Supervisors
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      const allFilteredIds = filteredForwardUsers.map((u: Row) => String(u.id));
                      setForwardTargetUserIds(Array.from(new Set([...forwardTargetUserIds, ...allFilteredIds])));
                    }}
                    className="px-2 py-1 rounded bg-muted hover:bg-muted/80 text-muted-foreground text-[10px] font-semibold transition"
                  >
                    Select All Listed
                  </button>
                  {forwardTargetUserIds.length > 0 && (
                    <button
                      type="button"
                      onClick={() => setForwardTargetUserIds([])}
                      className="px-2 py-1 rounded bg-rose-50 hover:bg-rose-100 text-rose-700 text-[10px] font-semibold transition"
                    >
                      Clear Selection
                    </button>
                  )}
                </div>

                {/* Employee Checkbox List */}
                <div className="max-h-56 overflow-y-auto border rounded-lg divide-y bg-background">
                  {filteredForwardUsers.map((u: Row) => {
                    const empId = String(u.id);
                    const isChecked = forwardTargetUserIds.includes(empId);
                    const supervisor = isSupervisor(u);
                    const empName = [u.first_name, u.last_name].filter(Boolean).join(' ') || u.name || u.email;
                    const titleOrDept = u.job_title || u.position_name || u.department || '';

                    return (
                      <label
                        key={empId}
                        className={`flex items-center gap-3 p-2.5 hover:bg-muted/40 cursor-pointer transition ${
                          isChecked ? 'bg-primary/5' : ''
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setForwardTargetUserIds([...forwardTargetUserIds, empId]);
                            } else {
                              setForwardTargetUserIds(forwardTargetUserIds.filter((id) => id !== empId));
                            }
                          }}
                          className="h-4 w-4 rounded border-input text-primary focus:ring-primary/20"
                        />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="font-semibold text-foreground text-xs truncate">{empName}</span>
                            {supervisor && (
                              <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-purple-100 text-purple-800 dark:bg-purple-950 dark:text-purple-300">
                                Supervisor
                              </span>
                            )}
                            {u.employee_number && (
                              <span className="font-mono text-[10px] text-muted-foreground">({u.employee_number})</span>
                            )}
                          </div>
                          <p className="text-[11px] text-muted-foreground truncate">
                            {titleOrDept ? `${titleOrDept} • ` : ''}{u.work_email || u.email || ''}
                          </p>
                        </div>
                      </label>
                    );
                  })}

                  {filteredForwardUsers.length === 0 && (
                    <div className="p-4 text-center text-xs text-muted-foreground">
                      No employees match the search filter.
                    </div>
                  )}
                </div>
              </div>

              <div>
                <label className="block font-semibold mb-1">Forwarding Notes / Instruction (Optional)</label>
                <textarea
                  className="w-full p-2.5 border rounded-lg text-xs bg-background focus:outline-none focus:ring-1 focus:ring-primary h-20"
                  placeholder="e.g. Please check contract expiration timeline and review extension terms."
                  value={forwardNotes}
                  onChange={(e) => setForwardNotes(e.target.value)}
                />
              </div>

      {actionError && (
                <p role="alert" className="text-rose-700 bg-rose-50 p-2.5 rounded-lg border border-rose-200 text-xs">
                  {actionError}
                </p>
              )}

              <div className="flex justify-end gap-2 border-t pt-3">
                <button
                  type="button"
                  className="px-4 py-2 rounded-lg border text-xs hover:bg-muted font-medium"
                  onClick={() => setForwardNotif(null)}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={forwardingBusy || forwardTargetUserIds.length === 0}
                  className="px-4 py-2 rounded-lg bg-primary text-primary-foreground font-semibold text-xs hover:bg-primary/90 disabled:opacity-50"
                >
                  {forwardingBusy
                    ? 'Forwarding…'
                    : `Forward Notification (${forwardTargetUserIds.length})`}
                </button>
              </div>
            </form>
          </Modal>
        );
      })()}

      {/* Create / Edit Granular Schedule Modal */}
      {createScheduleOpen && (
        <Modal
          name={editingSchedule ? "Edit Automated Notification Schedule" : "Setup Automated Notification Schedule"}
          onClose={() => {
            setCreateScheduleOpen(false);
            setEditingSchedule(null);
          }}
        >
          <form onSubmit={handleScheduleSubmit} className="space-y-4 text-xs">
            <div>
              <label className="block font-semibold mb-1">Schedule Title *</label>
              <input
                className="input-field text-xs"
                required
                placeholder="e.g. Consumables Expiry 14-Day Lead Alert"
                value={schedTitle}
                onChange={(e) => setSchedTitle(e.target.value)}
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block font-semibold mb-1">Domain *</label>
                <select
                  className="input-field text-xs"
                  value={schedDomain}
                  onChange={(e) => {
                    const newDomain = e.target.value;
                    setSchedDomain(newDomain);
                    const availableRules = DOMAIN_RULES[newDomain] || [];
                    if (availableRules.length > 0) {
                      setSchedRuleType(availableRules[0].value);
                    }
                  }}
                >
                  <option value="INVENTORY">Inventory Domain</option>
                  <option value="EQUIPMENT">Equipment Domain</option>
                  <option value="WORKFORCE">Workforce Domain</option>
                  <option value="PROJECTS">Projects Domain</option>
                </select>
              </div>

              <div>
                <label className="block font-semibold mb-1">Rule Category Criteria *</label>
                <select
                  className="input-field text-xs"
                  value={schedRuleType}
                  onChange={(e) => setSchedRuleType(e.target.value)}
                >
                  {(DOMAIN_RULES[schedDomain] || []).map((r) => (
                    <option key={r.value} value={r.value}>
                      {r.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block font-semibold mb-1">Lead Time (Days Before Expiry / Event) *</label>
                <input
                  className="input-field text-xs"
                  type="number"
                  min="1"
                  max="365"
                  required
                  value={schedLeadDays}
                  onChange={(e) => setSchedLeadDays(Number(e.target.value))}
                />
                <span className="text-[11px] text-muted-foreground block mt-0.5">
                  e.g. 14 days before expiry date
                </span>
              </div>

              <div>
                <label className="block font-semibold mb-1">Notification Frequency *</label>
                <select
                  className="input-field text-xs"
                  value={schedFrequency}
                  onChange={(e) => setSchedFrequency(e.target.value)}
                >
                  <option value="DAILY">Daily (Once Everyday)</option>
                  <option value="EVERY_OTHER_DAY">Every 2 Days</option>
                  <option value="WEEKLY">Weekly</option>
                  <option value="BIWEEKLY">Every 2 Weeks</option>
                  <option value="MONTHLY">Monthly</option>
                  <option value="ONCE">Once Only</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block font-semibold mb-1">Priority Tag *</label>
                <select
                  className="input-field text-xs"
                  value={schedPriority}
                  onChange={(e) => setSchedPriority(e.target.value)}
                >
                  <option value="NORMAL">NORMAL</option>
                  <option value="IMPORTANT">IMPORTANT</option>
                  <option value="CRITICAL">CRITICAL</option>
                </select>
              </div>

              <div>
                <label className="block font-semibold mb-1">Delivery Method *</label>
                <select
                  className="input-field text-xs"
                  value={schedDelivery}
                  onChange={(e) => setSchedDelivery(e.target.value)}
                >
                  <option value="BOTH">BOTH (Email & On-Platform) [Default]</option>
                  <option value="EMAIL">EMAIL Only</option>
                  <option value="ON_PLATFORM">ON_PLATFORM Only</option>
                </select>
              </div>
            </div>

            {/* Active Status Checkbox */}
            <div className="flex items-center gap-2 p-2.5 rounded-lg border bg-muted/20">
              <input
                id="schedIsActive"
                type="checkbox"
                checked={schedIsActive}
                onChange={(e) => setSchedIsActive(e.target.checked)}
                className="rounded border-input text-primary focus:ring-primary h-4 w-4"
              />
              <label htmlFor="schedIsActive" className="text-xs font-semibold cursor-pointer select-none">
                Active Schedule (Automated evaluations are active)
              </label>
            </div>

            {/* Redesigned Employee Selection */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block font-semibold">
                  Target Recipients ({schedRecipients.length} Selected)
                </label>
                <div className="flex gap-2 text-2xs">
                  <button
                    type="button"
                    className="text-primary hover:underline font-medium"
                    onClick={() => {
                      setSchedRecipients(userList.map((u: Row) => String(u.user_id || u.id)));
                    }}
                  >
                    Select All
                  </button>
                  <span className="text-muted-foreground">•</span>
                  <button
                    type="button"
                    className="text-muted-foreground hover:underline"
                    onClick={() => setSchedRecipients([])}
                  >
                    Clear All
                  </button>
                </div>
              </div>

              <div className="border rounded-lg p-2 space-y-2 bg-background">
                {/* Search input */}
                <div className="relative">
                  <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
                  <input
                    type="text"
                    placeholder="Search employees by name, title, or department..."
                    value={recipientSearch}
                    onChange={(e) => setRecipientSearch(e.target.value)}
                    className="w-full pl-8 pr-3 py-1.5 text-xs rounded border bg-card focus:outline-none focus:ring-1 focus:ring-primary"
                  />
                </div>

                {/* Sorted & Filtered list with checkboxes */}
                <div className="max-h-48 overflow-y-auto space-y-1 pr-1 scrollbar-thin divide-y divide-border/40">
                  {(() => {
                    const isSupervisor = (u: Row) =>
                      Boolean(
                        u.is_supervisory_role ||
                        (u.position_name || u.job_title || u.role || '').toLowerCase().includes('supervisor') ||
                        (u.position_name || u.job_title || u.role || '').toLowerCase().includes('manager') ||
                        (u.position_name || u.job_title || u.role || '').toLowerCase().includes('lead') ||
                        (u.position_name || u.job_title || u.role || '').toLowerCase().includes('head')
                      );

                    const sorted = [...userList].sort((a: Row, b: Row) => {
                      const supA = isSupervisor(a) ? 1 : 0;
                      const supB = isSupervisor(b) ? 1 : 0;
                      if (supA !== supB) return supB - supA; // Supervisors first
                      const nameA = `${a.first_name || ''} ${a.last_name || ''}`.trim();
                      const nameB = `${b.first_name || ''} ${b.last_name || ''}`.trim();
                      return nameA.localeCompare(nameB);
                    });

                    const filtered = sorted.filter((u: Row) => {
                      const q = recipientSearch.toLowerCase();
                      const name = `${u.first_name || ''} ${u.last_name || ''}`.toLowerCase();
                      const email = (u.work_email || u.personal_email || u.email || '').toLowerCase();
                      const title = (u.position_name || u.job_title || u.department_name || '').toLowerCase();
                      return !q || name.includes(q) || email.includes(q) || title.includes(q);
                    });

                    if (filtered.length === 0) {
                      return (
                        <p className="text-muted-foreground text-center py-4 italic text-xs">
                          No employees match "{recipientSearch}"
                        </p>
                      );
                    }

                    return filtered.map((u: Row) => {
                      const uid = String(u.user_id || u.id);
                      const checked = schedRecipients.includes(uid);
                      const fullName = [u.first_name, u.last_name].filter(Boolean).join(' ') || u.name || u.email || 'Employee';
                      const titleText = u.position_name || u.job_title || u.department_name || '';
                      const supervisor = isSupervisor(u);

                      return (
                        <label
                          key={uid}
                          className={`flex items-center justify-between p-2 rounded cursor-pointer transition text-xs ${
                            checked ? 'bg-primary/10 border-primary/20 font-medium' : 'hover:bg-muted/40'
                          }`}
                        >
                          <div className="flex items-center gap-2.5">
                            <input
                              type="checkbox"
                              checked={checked}
                              onChange={(e) => {
                                if (e.target.checked) {
                                  setSchedRecipients([...schedRecipients, uid]);
                                } else {
                                  setSchedRecipients(schedRecipients.filter((id) => id !== uid));
                                }
                              }}
                              className="rounded border-input text-primary focus:ring-primary h-4 w-4"
                            />
                            <div>
                              <span className="text-foreground font-semibold block">{fullName}</span>
                              {titleText && <span className="text-muted-foreground text-2xs block">{titleText}</span>}
                            </div>
                          </div>

                          {supervisor && (
                            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300 border border-amber-300">
                              Supervisor
                            </span>
                          )}
                        </label>
                      );
                    });
                  })()}
                </div>
              </div>
              <span className="text-[11px] text-muted-foreground block mt-1">
                Check specific employees to receive automated notification alerts. Leave blank to notify the schedule creator. Selected employees must have an active user account.
              </span>
            </div>


            {actionError && (
              <p role="alert" className="text-red-700 bg-red-50 p-2 rounded">
                {actionError}
              </p>
            )}

            <div className="flex justify-end gap-2 border-t pt-3">
              <button
                type="button"
                className="btn-secondary text-xs"
                onClick={() => {
                  setCreateScheduleOpen(false);
                  setEditingSchedule(null);
                }}
              >
                Cancel
              </button>
              <button disabled={schedBusy} className="btn-primary text-xs">
                {schedBusy
                  ? (editingSchedule ? 'Updating Schedule…' : 'Creating Schedule…')
                  : (editingSchedule ? 'Update Notification Schedule' : 'Save Notification Schedule')}
              </button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}
