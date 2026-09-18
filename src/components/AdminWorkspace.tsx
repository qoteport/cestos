'use client';

import React, { useState, useEffect } from 'react';
import { ShieldCheck, Users, KeyRound, CalendarCheck, FileText, Plus, RefreshCw, Search, CheckCircle2, XCircle, Clock, UserCheck, UserX, Mail, UserPlus, ShieldAlert, Filter, BookOpen,  } from 'lucide-react';
import { apiFetch } from '@/lib/api';
import { useAuth, canAccessAdministration } from './AuthProvider';
import { useData, State, Row, rows, Modal, title } from './DataUI';
import SystemManual from './SystemManual';

export default function AdminWorkspace(props: { initialTab?: 'users' | 'roles' | 'leave' | 'audit' | 'manual' } = {}) {
  const auth = useAuth();
  if (auth.loading) return null;
  if (!canAccessAdministration(auth)) return <div className="card p-6">Administration is not available for your account.</div>;
  return <AdminWorkspaceContent {...props} />;
}

function AdminWorkspaceContent({
  initialTab = 'users',
}: {
  initialTab?: 'users' | 'roles' | 'leave' | 'audit' | 'manual';
} = {}) {
  const auth = useAuth();
  const [tab, setTab] = useState<'users' | 'roles' | 'leave' | 'audit' | 'manual'>(initialTab);
  const [search, setSearch] = useState('');
  const [leaveStatusFilter, setLeaveStatusFilter] = useState<'ALL' | 'PENDING' | 'APPROVED' | 'REJECTED'>('ALL');
  const [actionError, setActionError] = useState('');
  const [actionSuccess, setActionSuccess] = useState('');

  // Modals state
  const [createUserOpen, setCreateUserOpen] = useState(false);
  const [newUserEmail, setNewUserEmail] = useState('');
  const [newUserFirstName, setNewUserFirstName] = useState('');
  const [newUserLastName, setNewUserLastName] = useState('');
  const [newUserPassword, setNewUserPassword] = useState('');
  const [createUserBusy, setCreateUserBusy] = useState(false);

  const [editUser, setEditUser] = useState<Row | null>(null);
  const [editRoleIds, setEditRoleIds] = useState<string[]>([]);
  const [editIsActive, setEditIsActive] = useState<boolean>(true);
  const [editIsSuperuser, setEditIsSuperuser] = useState<boolean>(false);
  const [updateUserBusy, setUpdateUserBusy] = useState<boolean>(false);

  useEffect(() => {
    if (editUser) {
      setEditRoleIds(Array.isArray(editUser.roles) ? editUser.roles.map((r: any) => String(r.id)) : []);
      setEditIsActive(!!editUser.is_active);
      setEditIsSuperuser(!!editUser.is_superuser);
    }
  }, [editUser]);

  // Modals state for Role Creation
  const [createRoleOpen, setCreateRoleOpen] = useState(false);
  const [newRoleName, setNewRoleName] = useState('');
  const [newRoleDescription, setNewRoleDescription] = useState('');
  const [createRoleBusy, setCreateRoleBusy] = useState(false);
  const [savingRoleId, setSavingRoleId] = useState<string | null>(null);

  // Data fetching
  const usersRes = useData('/api/v1/users?page_size=100');
  const userList = rows(usersRes.data);

  const rolesRes = useData('/api/v1/users/roles/all');
  const roleList = rows(rolesRes.data);

  const permissionsRes = useData('/api/v1/users/permissions/all');
  const permList = rows(permissionsRes.data);

  const handleToggleRolePermission = async (roleId: string, code: string, currentPerms: any[]) => {
    const currentCodes = currentPerms.map((p: any) => p.code || p);
    const hasCode = currentCodes.includes(code);
    const updatedCodes = hasCode ? currentCodes.filter((c: string) => c !== code) : [...currentCodes, code];
    setSavingRoleId(roleId);
    setActionError('');
    setActionSuccess('');
    try {
      await apiFetch(`/api/v1/users/roles/${roleId}/permissions`, {
        method: 'PUT',
        body: JSON.stringify({ permission_codes: updatedCodes }),
      });
      setActionSuccess('Role permissions updated successfully.');
      rolesRes.reload();
    } catch (err: any) {
      setActionError(err.message || 'Failed to update role permissions');
    } finally {
      setSavingRoleId(null);
    }
  };

  const handleCreateRole = async (e: React.FormEvent) => {
    e.preventDefault();
    setActionError('');
    setActionSuccess('');
    setCreateRoleBusy(true);
    try {
      await apiFetch('/api/v1/users/roles', {
        method: 'POST',
        body: JSON.stringify({
          name: newRoleName,
          description: newRoleDescription,
          permission_codes: [],
        }),
      });
      setActionSuccess(`Security role "${newRoleName}" created successfully.`);
      setCreateRoleOpen(false);
      setNewRoleName('');
      setNewRoleDescription('');
      rolesRes.reload();
    } catch (err: any) {
      setActionError(err.message || 'Failed to create security role');
    } finally {
      setCreateRoleBusy(false);
    }
  };

  const employeesRes = useData('/api/v1/employees?page_size=100');
  const employeeList = rows(employeesRes.data);

  const leaveUrl = leaveStatusFilter === 'ALL' ?'/api/v1/employees/leave-requests/all' 
    : `/api/v1/employees/leave-requests/all?status=${leaveStatusFilter}`;
  const leaveRes = useData(leaveUrl);
  const leaveList = rows(leaveRes.data);

  const auditRes = useData('/api/v1/hr/audit-logs');
  const auditList = rows(auditRes.data);

  // Helper map for employee names
  const employeeMap = new Map<string, string>();
  employeeList.forEach((e) => {
    employeeMap.set(String(e.id), `${e.first_name || ''} ${e.last_name || ''}`.trim() || String(e.employee_number || e.id));
  });

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setActionError('');
    setActionSuccess('');
    setCreateUserBusy(true);
    try {
      await apiFetch('/api/v1/users', {
        method: 'POST',
        body: JSON.stringify({
          email: newUserEmail,
          first_name: newUserFirstName,
          last_name: newUserLastName,
          password: newUserPassword,
        }),
      });
      setActionSuccess(`User ${newUserEmail} created successfully.`);
      setCreateUserOpen(false);
      setNewUserEmail('');
      setNewUserFirstName('');
      setNewUserLastName('');
      setNewUserPassword('');
      usersRes.reload();
    } catch (err: any) {
      setActionError(err.message || 'Failed to create user');
    } finally {
      setCreateUserBusy(false);
    }
  };

  const handleUpdateUserAccess = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editUser) return;
    setActionError('');
    setActionSuccess('');
    setUpdateUserBusy(true);
    try {
      await apiFetch(`/api/v1/users/${editUser.id}`, {
        method: 'PATCH',
        body: JSON.stringify({
          is_active: editIsActive,
          is_superuser: editIsSuperuser,
          role_ids: editRoleIds,
        }),
      });
      setActionSuccess(`Access controls updated for ${editUser.email}`);
      setEditUser(null);
      usersRes.reload();
    } catch (err: any) {
      setActionError(err.message || 'Failed to update user access');
    } finally {
      setUpdateUserBusy(false);
    }
  };

  const handleLeaveDecision = async (leaveId: string, action: 'approve' | 'reject') => {
    setActionError('');
    setActionSuccess('');
    try {
      await apiFetch(`/api/v1/employees/${leaveId}/${action}`, {
        method: 'PATCH',
      });
      setActionSuccess(`Leave request ${action === 'approve' ? 'approved' : 'rejected'} successfully.`);
      leaveRes.reload();
    } catch (err: any) {
      setActionError(err.message || `Failed to ${action} leave request`);
    }
  };

  const filteredUsers = userList.filter((u) => {
    const q = search.toLowerCase();
    return (
      !q ||
      String(u.email || '').toLowerCase().includes(q) ||
      String(u.first_name || '').toLowerCase().includes(q) ||
      String(u.last_name || '').toLowerCase().includes(q)
    );
  });

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b pb-4">
        <div>
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-7 h-7 text-primary" />
            <h1 className="text-2xl font-bold text-foreground">Administrative Workspace</h1>
          </div>
          <p className="text-sm text-muted-foreground mt-1">
            Manage system users, roles and permissions, approve organization leave requests, and inspect audit trails.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {tab === 'users' && (
            <button
              onClick={() => setCreateUserOpen(true)}
              className="px-4 py-2 bg-primary text-primary-foreground font-medium rounded-lg hover:bg-primary/90 transition flex items-center gap-2 text-sm shadow-sm"
            >
              <UserPlus className="w-4 h-4" />
              Add User
            </button>
          )}
          <button
            onClick={() => {
              usersRes.reload();
              leaveRes.reload();
              auditRes.reload();
            }}
            className="p-2 border rounded-lg hover:bg-muted text-muted-foreground transition"
            title="Refresh Data"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Action Alerts */}
      {actionError && (
        <div className="p-4 rounded-lg bg-destructive/10 border border-destructive/20 text-destructive text-sm flex items-center gap-2">
          <ShieldAlert className="w-5 h-5 flex-shrink-0" />
          <span>{actionError}</span>
        </div>
      )}
      {actionSuccess && (
        <div className="p-4 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-800 text-sm flex items-center gap-2 dark:bg-emerald-950/40 dark:border-emerald-800 dark:text-emerald-200">
          <CheckCircle2 className="w-5 h-5 flex-shrink-0" />
          <span>{actionSuccess}</span>
        </div>
      )}

      {/* Workspace Tabs */}
      <div className="flex items-center gap-1 border-b">
        <button
          onClick={() => setTab('users')}
          className={`px-4 py-2.5 font-medium text-sm border-b-2 transition flex items-center gap-2 ${
            tab === 'users' ?'border-primary text-primary font-semibold' :'border-transparent text-muted-foreground hover:text-foreground'
          }`}
        >
          <Users className="w-4 h-4" />
          Users & Access Control ({userList.length})
        </button>

        <button
          onClick={() => setTab('leave')}
          className={`px-4 py-2.5 font-medium text-sm border-b-2 transition flex items-center gap-2 ${
            tab === 'leave' ?'border-primary text-primary font-semibold' :'border-transparent text-muted-foreground hover:text-foreground'
          }`}
        >
          <CalendarCheck className="w-4 h-4" />
          Leave Approvals ({leaveList.length})
        </button>

        <button
          onClick={() => setTab('roles')}
          className={`px-4 py-2.5 font-medium text-sm border-b-2 transition flex items-center gap-2 ${
            tab === 'roles' ?'border-primary text-primary font-semibold' :'border-transparent text-muted-foreground hover:text-foreground'
          }`}
        >
          <KeyRound className="w-4 h-4" />
          Roles & Permissions Matrix
        </button>

        <button
          onClick={() => setTab('audit')}
          className={`px-4 py-2.5 font-medium text-sm border-b-2 transition flex items-center gap-2 ${
            tab === 'audit' ?'border-primary text-primary font-semibold' :'border-transparent text-muted-foreground hover:text-foreground'
          }`}
        >
          <FileText className="w-4 h-4" />
          Audit Trail ({auditList.length})
        </button>

        <button
          onClick={() => setTab('manual')}
          className={`px-4 py-2.5 font-medium text-sm border-b-2 transition flex items-center gap-2 ${
            tab === 'manual' ?'border-primary text-primary font-semibold' :'border-transparent text-muted-foreground hover:text-foreground'
          }`}
        >
          <BookOpen className="w-4 h-4" />
          System & User Manual
        </button>
      </div>

      {/* TAB 5: SYSTEM & USER MANUAL */}
      {tab === 'manual' && <SystemManual />}

      {/* TAB 1: USERS & ACCESS CONTROL */}
      {tab === 'users' && (
        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <div className="relative flex-1 max-w-md">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <input
                type="text"
                placeholder="Search users by name or email..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-9 pr-4 py-2 rounded-lg border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
              />
            </div>
          </div>

          <State loading={usersRes.loading} error={usersRes.error} retry={usersRes.reload}>
            <div className="border rounded-xl bg-card overflow-hidden shadow-sm">
              <table className="w-full text-sm text-left border-collapse">
                <thead className="bg-muted/50 text-xs font-semibold text-muted-foreground border-b uppercase tracking-wider">
                  <tr>
                    <th className="p-3">User</th>
                    <th className="p-3">Email</th>
                    <th className="p-3">Account Status</th>
                    <th className="p-3">Roles / Privilege</th>
                    <th className="p-3">Last Login</th>
                    <th className="p-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {filteredUsers.map((u) => {
                    const fullName = `${u.first_name || ''} ${u.last_name || ''}`.trim() || 'User';
                    return (
                      <tr key={String(u.id)} className="hover:bg-muted/30 transition">
                        <td className="p-3">
                          <div className="flex items-center gap-3">
                            <div className="w-9 h-9 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-xs">
                              {fullName.charAt(0).toUpperCase()}
                            </div>
                            <div>
                              <p className="font-semibold text-foreground">{fullName}</p>
                              <span className="text-xs text-muted-foreground font-mono">ID: {String(u.id).substring(0, 8)}...</span>
                            </div>
                          </div>
                        </td>
                        <td className="p-3 text-muted-foreground">
                          <div className="flex items-center gap-1.5">
                            <Mail className="w-3.5 h-3.5 text-muted-foreground" />
                            <span>{String(u.email || '')}</span>
                          </div>
                        </td>
                        <td className="p-3">
                          {u.is_active ? (
                            <span className="px-2.5 py-1 rounded-full text-xs font-medium bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 inline-flex items-center gap-1">
                              <UserCheck className="w-3 h-3" /> Active
                            </span>
                          ) : (
                            <span className="px-2.5 py-1 rounded-full text-xs font-medium bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300 inline-flex items-center gap-1">
                              <UserX className="w-3 h-3" /> Inactive
                            </span>
                          )}
                          {u.setup_required && (
                            <span className="ml-2 px-2 py-0.5 rounded text-[10px] font-semibold bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300">
                              Setup Pending
                            </span>
                          )}
                        </td>
                        <td className="p-3">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            {u.is_superuser && (
                              <span className="px-2 py-0.5 rounded text-xs font-bold bg-purple-100 text-purple-800 dark:bg-purple-950 dark:text-purple-300">
                                Superuser
                              </span>
                            )}
                            {Array.isArray(u.roles) && u.roles.length > 0 ? (
                              u.roles.map((r: any) => (
                                <span key={String(r.id || r.name)} className="px-2 py-0.5 rounded text-xs bg-secondary text-secondary-foreground border">
                                  {r.name}
                                </span>
                              ))
                            ) : (
                              <span className="text-xs text-muted-foreground italic">Standard User</span>
                            )}
                          </div>
                        </td>
                        <td className="p-3 text-xs text-muted-foreground">
                          {u.last_login_at ? new Date(String(u.last_login_at)).toLocaleString() : 'Never'}
                        </td>
                        <td className="p-3 text-right">
                          <button
                            onClick={() => setEditUser(u)}
                            className="px-3 py-1.5 text-xs font-medium border rounded-md hover:bg-muted transition"
                          >
                            Manage Access
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                  {filteredUsers.length === 0 && (
                    <tr>
                      <td colSpan={6} className="p-8 text-center text-muted-foreground text-sm">
                        No users match the specified criteria.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </State>
        </div>
      )}

      {/* TAB 2: LEAVE APPROVALS */}
      {tab === 'leave' && (
        <div className="space-y-4">
          <div className="flex items-center gap-2 border-b pb-3">
            <span className="text-sm text-muted-foreground font-medium flex items-center gap-1">
              <Filter className="w-4 h-4" /> Filter Status:
            </span>
            {(['ALL', 'PENDING', 'APPROVED', 'REJECTED'] as const).map((st) => (
              <button
                key={st}
                onClick={() => setLeaveStatusFilter(st)}
                className={`px-3 py-1 rounded-md text-xs font-medium transition ${
                  leaveStatusFilter === st
                    ? 'bg-primary text-primary-foreground shadow-sm'
                    : 'bg-muted text-muted-foreground hover:text-foreground'
                }`}
              >
                {st}
              </button>
            ))}
          </div>

          <State loading={leaveRes.loading} error={leaveRes.error} retry={leaveRes.reload}>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {leaveList.map((l) => {
                const empName = employeeMap.get(String(l.employee_id)) || 'Employee';
                return (
                  <div key={String(l.id)} className="p-4 border rounded-xl bg-card space-y-3 shadow-sm hover:border-primary/40 transition">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-semibold text-foreground text-base">{empName}</p>
                        <p className="text-xs text-muted-foreground">Requested on {new Date(String(l.created_at)).toLocaleDateString()}</p>
                      </div>
                      <div>
                        {l.status === 'PENDING' && (
                          <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300 flex items-center gap-1">
                            <Clock className="w-3.5 h-3.5" /> Pending
                          </span>
                        )}
                        {l.status === 'APPROVED' && (
                          <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 flex items-center gap-1">
                            <CheckCircle2 className="w-3.5 h-3.5" /> Approved
                          </span>
                        )}
                        {l.status === 'REJECTED' && (
                          <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300 flex items-center gap-1">
                            <XCircle className="w-3.5 h-3.5" /> Rejected
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-2 text-xs bg-muted/40 p-2.5 rounded-lg border">
                      <div>
                        <span className="text-muted-foreground block">Start Date</span>
                        <span className="font-medium text-foreground">{String(l.start_date)}</span>
                      </div>
                      <div>
                        <span className="text-muted-foreground block">End Date</span>
                        <span className="font-medium text-foreground">{String(l.end_date)}</span>
                      </div>
                    </div>

                    {l.reason && (
                      <p className="text-xs text-muted-foreground bg-background p-2.5 rounded border italic">
                        "{String(l.reason)}"
                      </p>
                    )}

                    {l.status === 'PENDING' && (
                      <div className="flex items-center gap-2 pt-2 border-t">
                        <button
                          onClick={() => handleLeaveDecision(String(l.id), 'approve')}
                          className="flex-1 py-1.5 px-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-medium transition flex items-center justify-center gap-1.5"
                        >
                          <CheckCircle2 className="w-3.5 h-3.5" /> Approve
                        </button>
                        <button
                          onClick={() => handleLeaveDecision(String(l.id), 'reject')}
                          className="flex-1 py-1.5 px-3 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-xs font-medium transition flex items-center justify-center gap-1.5"
                        >
                          <XCircle className="w-3.5 h-3.5" /> Reject
                        </button>
                      </div>
                    )}
                  </div>
                );
              })}

              {leaveList.length === 0 && (
                <div className="col-span-full p-12 text-center text-muted-foreground border rounded-xl bg-card">
                  No leave requests found for the selected status.
                </div>
              )}
            </div>
          </State>
        </div>
      )}

      {/* TAB 3: ROLES & PERMISSIONS MATRIX */}
      {tab === 'roles' && (
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b pb-4">
            <div>
              <h3 className="font-bold text-foreground text-lg flex items-center gap-2">
                <KeyRound className="w-5 h-5 text-primary" /> System & Organization Security Roles Matrix
              </h3>
              <p className="text-xs text-muted-foreground mt-1">
                Configure granular permissions across Projects, Workforce, Equipment, Inventory, HR, Financials, and File Downloads per role. Superadmins always bypass permission restrictions.
              </p>
            </div>
            <div className="flex items-center gap-2 w-full sm:w-auto">
              <div className="relative w-full sm:w-72">
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <input
                  type="search"
                  aria-label="Search permissions"
                  placeholder="Search permissions..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 rounded-lg border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
                />
              </div>
              <button
              onClick={() => setCreateRoleOpen(true)}
              className="px-3.5 py-2 bg-primary text-primary-foreground font-medium rounded-lg hover:bg-primary/90 transition text-xs shadow-sm flex items-center gap-1.5 shrink-0"
            >
              <Plus className="w-4 h-4" /> Add Security Role
              </button>
            </div>
          </div>

          <State loading={rolesRes.loading || permissionsRes.loading} error={rolesRes.error || permissionsRes.error} retry={() => { rolesRes.reload(); permissionsRes.reload(); }}>
            <div role="region" aria-label="Security roles permissions matrix" tabIndex={0} className="max-h-[70dvh] overflow-auto border rounded-xl bg-card shadow-sm scrollbar-thin focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
              <table className="w-full text-xs text-left border-collapse min-w-[800px]">
                <thead className="sticky top-0 z-20 bg-muted text-muted-foreground font-semibold border-b shadow-sm">
                  <tr>
                    <th scope="col" className="p-3 w-72 sticky left-0 bg-muted z-30 shadow-sm border-r">
                      Permission Domain & Function
                    </th>
                    {roleList.map((r: any) => (
                      <th scope="col" key={String(r.id)} className="p-3 text-center min-w-[130px] bg-muted border-r">
                        <div className="font-bold text-foreground">{r.name}</div>
                        {r.is_system_role && (
                          <span className="text-[10px] px-1.5 py-0.5 rounded bg-secondary text-primary font-mono inline-block mt-0.5">
                            System
                          </span>
                        )}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {[
                    {
                      category: 'Projects & Financials',
                      perms: [
                        { code: 'projects.read', name: 'Read Assigned Projects', desc: 'View basic project overview' },
                        { code: 'projects.read_assigned', name: 'Read Assigned Projects Only', desc: 'Restrict project reads to assigned projects' },
                        { code: 'projects.read_all', name: 'Read All Projects', desc: 'View all projects across organization' },
                        { code: 'projects.financials.read', name: 'Read Project Financials', desc: 'View contract values and budget figures' },
                        { code: 'projects.create', name: 'Create Projects', desc: 'Onboard new project contracts' },
                        { code: 'projects.update', name: 'Update Projects', desc: 'Edit project parameters and statuses' },
                        { code: 'projects.tasks.manage', name: 'Manage Tasks', desc: 'Assign and edit operational project tasks' },
                      ],
                    },
                    {
                      category: 'Workforce, HR & Governance',
                      perms: [
                        { code: 'employees.read_basic', name: 'Read Employee Register', desc: 'View employee list & profiles' },
                        { code: 'employees.create', name: 'Onboard Employees', desc: 'Create new workforce profiles' },
                        { code: 'employees.write', name: 'Edit Employee Profiles', desc: 'Update personal & operational data' },
                        { code: 'employees.contracts.read', name: 'Read Employment Contracts', desc: 'View assigned or permitted employment contracts' },
                        { code: 'employees.contracts.write', name: 'Write Employment Contracts', desc: 'Upload, update, or archive employment contracts' },
                        { code: 'employees.salary.read', name: 'Read Employee Salaries', desc: 'View salary records & compensation' },
                        { code: 'employees.salary.write', name: 'Write Employee Salaries', desc: 'Create or close salary periods' },
                        { code: 'employees.salary.manage', name: 'Manage Salaries', desc: 'Record or end employee salary periods' },
                        { code: 'employees.alerts.manage', name: 'Contract Expiry Rules', desc: 'Configure reminder and alert rules' },
                        { code: 'departments.manage', name: 'Manage Departments', desc: 'Create and update organizational departments' },
                        { code: 'positions.manage', name: 'Manage Job Positions', desc: 'Create and update job position designations' },
                      ],
                    },
                    {
                      category: 'Equipment, Maintenance & Operations',
                      perms: [
                        { code: 'assets.read', name: 'Read Equipment Register', desc: 'View fleet assets & availability' },
                        { code: 'assets.read_assigned', name: 'Read Assigned Equipment Only', desc: 'Restrict equipment reads to assigned assets' },
                        { code: 'assets.create', name: 'Add Equipment', desc: 'Register new machinery or vehicles' },
                        { code: 'assets.update', name: 'Update Equipment', desc: 'Edit specifications & status' },
                        { code: 'assets.assignments.manage', name: 'Manage Asset Assignments', desc: 'Assign equipment to sites/operators' },
                        { code: 'assets.logs.write', name: 'Write Maintenance & Fuel Logs', desc: 'Log maintenance, fuel, and meter readings' },
                        { code: 'assets.transfers.manage', name: 'Manage Asset Transfers', desc: 'Transfer equipment across locations' },
                        { code: 'assets.archive', name: 'Archive / Retire Assets', desc: 'Decommission or dispose of assets' },
                      ],
                    },
                    {
                      category: 'Inventory & Stock Control',
                      perms: [
                        { code: 'inventory.read', name: 'Read Inventory Catalog', desc: 'View items, stores, and stock levels' },
                        { code: 'inventory.read_assigned', name: 'Read Assigned Stores Only', desc: 'Restrict stock reads to assigned stores or projects' },
                        { code: 'inventory.requests.create', name: 'Create Material Requests', desc: 'Submit stock issues requests' },
                        { code: 'inventory.requests.manage', name: 'Approve Material Requests', desc: 'Approve or reject stock requests' },
                        { code: 'inventory.write', name: 'Post Stock Transactions', desc: 'Record receipts, issues, and transfers' },
                        { code: 'inventory.audits.manage', name: 'Manage Stock Counts', desc: 'Perform audits and inventory adjustments' },
                        { code: 'inventory.manage', name: 'Inventory Administration', desc: 'Configure stores, bins, and access control' },
                      ],
                    },
                    {
                      category: 'Administration & File Access',
                      perms: [
                        { code: 'users.read', name: 'Read System Users & Roles', desc: 'View user accounts & access levels' },
                        { code: 'users.create', name: 'Manage User Accounts', desc: 'Create users and assign security roles' },
                        { code: 'roles.manage', name: 'Manage Permissions Matrix', desc: 'Edit role permissions and matrix' },
                        { code: 'documents.download', name: 'Download Raw Document Files', desc: 'Download original attachments and files' },
                      ],
                    },
                  ].filter((group) => !search.trim() || group.category.toLowerCase().includes(search.trim().toLowerCase()) || group.perms.some((p) => `${p.name} ${p.code} ${p.desc}`.toLowerCase().includes(search.trim().toLowerCase()))).map((group) => (
                    <React.Fragment key={group.category}>
                      <tr className="bg-muted/40 font-bold text-foreground">
                        <td colSpan={roleList.length + 1} className="p-2.5 uppercase tracking-wider text-[10px] text-primary">
                          {group.category}
                        </td>
                      </tr>
                      {group.perms.filter((p) => !search.trim() || `${p.name} ${p.code} ${p.desc}`.toLowerCase().includes(search.trim().toLowerCase())).map((p) => (
                        <tr key={p.code} className="hover:bg-muted/20 transition">
                          <td className="p-3 sticky left-0 bg-card z-10 border-r shadow-sm">
                            <span className="font-semibold text-foreground block">{p.name}</span>
                            <span className="text-[10px] text-muted-foreground block">{p.desc}</span>
                            <span className="text-[9px] font-mono text-muted-foreground/75 block mt-0.5">{p.code}</span>
                          </td>
                          {roleList.map((r: any) => {
                            const roleId = String(r.id);
                            const currentPerms = Array.isArray(r.permissions) ? r.permissions : [];
                            const hasCode = currentPerms.some((perm: any) => (perm.code || perm) === p.code);
                            const isBusy = savingRoleId === roleId;
                            return (
                              <td key={roleId} className="p-3 text-center border-r align-middle">
                                <input
                                  type="checkbox"
                                  checked={hasCode}
                                  disabled={isBusy}
                                  onChange={() => handleToggleRolePermission(roleId, p.code, currentPerms)}
                                  className="h-4 w-4 rounded border-input text-primary focus:ring-primary/20 cursor-pointer disabled:opacity-40"
                                />
                              </td>
                            );
                          })}
                        </tr>
                      ))}
                    </React.Fragment>
                  ))}
                </tbody>
              </table>
            </div>
          </State>
        </div>
      )}

      {/* TAB 4: AUDIT TRAIL */}
      {tab === 'audit' && (
        <div className="space-y-4">
          <State loading={auditRes.loading} error={auditRes.error} retry={auditRes.reload}>
            <div className="border rounded-xl bg-card overflow-hidden shadow-sm">
              <table className="w-full text-xs text-left border-collapse">
                <thead className="bg-muted/50 font-semibold text-muted-foreground border-b uppercase tracking-wider">
                  <tr>
                    <th className="p-3">Occurred At</th>
                    <th className="p-3">Action</th>
                    <th className="p-3">Entity Type</th>
                    <th className="p-3">Entity ID</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {auditList.map((a: any, idx: number) => (
                    <tr key={String(a.id || idx)} className="hover:bg-muted/30">
                      <td className="p-3 text-muted-foreground">
                        {a.created_at ? new Date(String(a.created_at)).toLocaleString() : 'N/A'}
                      </td>
                      <td className="p-3 font-semibold text-foreground">{String(a.action || '')}</td>
                      <td className="p-3">
                        <span className="px-2 py-0.5 rounded bg-secondary text-secondary-foreground border text-[10px]">
                          {String(a.entity_type || 'system')}
                        </span>
                      </td>
                      <td className="p-3 font-mono text-muted-foreground">{String(a.entity_id || '')}</td>
                    </tr>
                  ))}
                  {auditList.length === 0 && (
                    <tr>
                      <td colSpan={4} className="p-8 text-center text-muted-foreground">
                        No audit events recorded.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </State>
        </div>
      )}

      {/* CREATE USER MODAL */}
      {createUserOpen && (
        <Modal name="Add New User Account" onClose={() => setCreateUserOpen(false)}>
          <form onSubmit={handleCreateUser} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-muted-foreground mb-1">Email Address</label>
              <input
                type="email"
                required
                value={newUserEmail}
                onChange={(e) => setNewUserEmail(e.target.value)}
                className="w-full px-3 py-2 border rounded-lg text-sm bg-background"
                placeholder="user@organization.com"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-muted-foreground mb-1">First Name</label>
                <input
                  type="text"
                  required
                  value={newUserFirstName}
                  onChange={(e) => setNewUserFirstName(e.target.value)}
                  className="w-full px-3 py-2 border rounded-lg text-sm bg-background"
                  placeholder="Jane"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-muted-foreground mb-1">Last Name</label>
                <input
                  type="text"
                  required
                  value={newUserLastName}
                  onChange={(e) => setNewUserLastName(e.target.value)}
                  className="w-full px-3 py-2 border rounded-lg text-sm bg-background"
                  placeholder="Doe"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-muted-foreground mb-1">Initial Password</label>
              <input
                type="password"
                required
                minLength={12}
                value={newUserPassword}
                onChange={(e) => setNewUserPassword(e.target.value)}
                className="w-full px-3 py-2 border rounded-lg text-sm bg-background"
                placeholder="Minimum 12 characters"
              />
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t">
              <button
                type="button"
                onClick={() => setCreateUserOpen(false)}
                className="px-4 py-2 text-sm border rounded-lg hover:bg-muted"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={createUserBusy}
                className="px-4 py-2 text-sm bg-primary text-primary-foreground font-semibold rounded-lg hover:bg-primary/90 disabled:opacity-50"
              >
                {createUserBusy ? 'Creating...' : 'Create User'}
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* EDIT USER ACCESS MODAL */}
      {editUser && (
        <Modal name={`Manage User Access: ${editUser?.email || ''}`} onClose={() => setEditUser(null)}>
          <form onSubmit={handleUpdateUserAccess} className="space-y-5">
            <div className="p-3.5 bg-muted/40 rounded-lg border space-y-1 text-xs">
              <div className="flex items-center justify-between">
                <span className="font-semibold text-foreground text-sm">
                  {editUser?.first_name} {editUser?.last_name}
                </span>
                <span className="font-mono text-muted-foreground">ID: {String(editUser?.id)}</span>
              </div>
              <p className="text-muted-foreground">{editUser?.email}</p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 border-t pt-4">
              <label className="flex items-start gap-3 p-3 border rounded-lg hover:bg-muted/30 cursor-pointer transition">
                <input
                  type="checkbox"
                  checked={editIsActive}
                  onChange={(e) => setEditIsActive(e.target.checked)}
                  className="mt-0.5 h-4 w-4 rounded border-input text-primary focus:ring-primary/20"
                />
                <div>
                  <span className="text-xs font-semibold text-foreground block">Active Account</span>
                  <span className="text-[11px] text-muted-foreground">
                    Allow user to log in and access system functions.
                  </span>
                </div>
              </label>

              <label className="flex items-start gap-3 p-3 border rounded-lg hover:bg-muted/30 cursor-pointer transition">
                <input
                  type="checkbox"
                  checked={editIsSuperuser}
                  onChange={(e) => setEditIsSuperuser(e.target.checked)}
                  className="mt-0.5 h-4 w-4 rounded border-input text-purple-600 focus:ring-purple-500/20"
                />
                <div>
                  <span className="text-xs font-semibold text-foreground block flex items-center gap-1">
                    Superuser Privilege
                  </span>
                  <span className="text-[11px] text-muted-foreground">
                    Bypass granular permission checks across all modules.
                  </span>
                </div>
              </label>
            </div>

            <div className="border-t pt-4 space-y-3">
              <div>
                <h4 className="text-xs font-semibold text-foreground">Assigned Security Roles</h4>
                <p className="text-[11px] text-muted-foreground">
                  Select one or more roles to grant granular permissions.
                </p>
              </div>

              <div className="max-h-60 overflow-y-auto border rounded-lg divide-y bg-background">
                {roleList.map((r: any) => {
                  const roleId = String(r.id);
                  const isChecked = editRoleIds.includes(roleId);
                  return (
                    <label
                      key={roleId}
                      className="flex items-start gap-3 p-3 hover:bg-muted/40 cursor-pointer transition"
                    >
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setEditRoleIds([...editRoleIds, roleId]);
                          } else {
                            setEditRoleIds(editRoleIds.filter((id) => id !== roleId));
                          }
                        }}
                        className="mt-0.5 h-4 w-4 rounded border-input text-primary focus:ring-primary/20"
                      />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-semibold text-foreground">{r.name}</span>
                          {r.is_system_role && (
                            <span className="text-[10px] px-1.5 py-0.5 rounded bg-muted text-muted-foreground font-mono">
                              System
                            </span>
                          )}
                        </div>
                        {r.description && (
                          <p className="text-[11px] text-muted-foreground mt-0.5">{r.description}</p>
                        )}
                      </div>
                    </label>
                  );
                })}
                {roleList.length === 0 && (
                  <div className="p-4 text-center text-xs text-muted-foreground">
                    No security roles defined.
                  </div>
                )}
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t">
              <button
                type="button"
                onClick={() => setEditUser(null)}
                className="px-4 py-2 text-xs font-medium border rounded-lg hover:bg-muted"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={updateUserBusy}
                className="px-4 py-2 text-xs bg-primary text-primary-foreground font-semibold rounded-lg hover:bg-primary/90 disabled:opacity-50"
              >
                {updateUserBusy ? 'Saving Changes...' : 'Save Access Changes'}
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* CREATE SECURITY ROLE MODAL */}
      {createRoleOpen && (
        <Modal name="Add New Security Role" onClose={() => setCreateRoleOpen(false)}>
          <form onSubmit={handleCreateRole} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-muted-foreground mb-1">Role Name</label>
              <input
                type="text"
                required
                value={newRoleName}
                onChange={(e) => setNewRoleName(e.target.value)}
                className="w-full px-3 py-2 border rounded-lg text-sm bg-background"
                placeholder="e.g. Site Supervisor, Inventory Clerk"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-muted-foreground mb-1">Description</label>
              <textarea
                rows={3}
                value={newRoleDescription}
                onChange={(e) => setNewRoleDescription(e.target.value)}
                className="w-full px-3 py-2 border rounded-lg text-sm bg-background"
                placeholder="Brief description of the responsibilities and scope for this role..."
              />
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t">
              <button
                type="button"
                onClick={() => setCreateRoleOpen(false)}
                className="px-4 py-2 text-xs font-medium border rounded-lg hover:bg-muted"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={createRoleBusy}
                className="px-4 py-2 text-xs bg-primary text-primary-foreground font-semibold rounded-lg hover:bg-primary/90 disabled:opacity-50"
              >
                {createRoleBusy ? 'Creating...' : 'Create Security Role'}
              </button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}
