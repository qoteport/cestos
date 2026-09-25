'use client';

import React, { useState, useEffect } from 'react';
import { ShieldCheck, User, Mail, Key, Shield, UserCheck, AlertCircle, RefreshCw, Check } from 'lucide-react';
import { apiFetch } from '@/lib/api';
import { Modal, Row } from './DataUI';

interface RegisterUserModalProps {
  onClose: () => void;
  onSaved: () => void;
}

export default function RegisterUserModal({ onClose, onSaved }: RegisterUserModalProps) {
  const [email, setEmail] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [password, setPassword] = useState('');
  const [isSuperuser, setIsSuperuser] = useState(false);
  const [portalType, setPortalType] = useState<string>('FIELD');
  const [selectedRoleIds, setSelectedRoleIds] = useState<string[]>([]);
  const [selectedEmployeeId, setSelectedEmployeeId] = useState('');

  // Lookups
  const [roles, setRoles] = useState<Row[]>([]);
  const [employees, setEmployees] = useState<Row[]>([]);
  const [loadingData, setLoadingData] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;
    setLoadingData(true);
    Promise.all([
      apiFetch<any>('/api/v1/users/roles/all').catch(() => []),
      apiFetch<any>('/api/v1/employees?page_size=100').catch(() => []),
    ]).then(([rolesRes, empRes]) => {
      if (!active) return;
      const roleList = Array.isArray(rolesRes) ? rolesRes : rolesRes.items || [];
      const empList = Array.isArray(empRes) ? empRes : empRes.items || [];
      setRoles(roleList);
      setEmployees(empList);
      setLoadingData(false);
    });
    return () => {
      active = false;
    };
  }, []);

  const handleEmployeeSelect = (empId: string) => {
    setSelectedEmployeeId(empId);
    if (!empId) return;
    const emp = employees.find((e) => String(e.id) === empId);
    if (emp) {
      if (emp.work_email || emp.personal_email) {
        setEmail(emp.work_email || emp.personal_email);
      }
      if (emp.first_name) setFirstName(emp.first_name);
      if (emp.last_name) setLastName(emp.last_name);
    }
  };

  const toggleRole = (roleId: string) => {
    setSelectedRoleIds((prev) =>
      prev.includes(roleId) ? prev.filter((id) => id !== roleId) : [...prev, roleId]
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!email.trim()) {
      setError('Email address is required.');
      return;
    }
    if (!password.trim()) {
      setError('Password is required.');
      return;
    }
    if (password.length < 12) {
      setError('Password must be at least 12 characters long.');
      return;
    }

    setBusy(true);
    try {
      // 1. Create the user
      const createdUser = await apiFetch<Row>('/api/v1/users', {
        method: 'POST',
        body: JSON.stringify({
          email: email.trim(),
          first_name: firstName.trim(),
          last_name: lastName.trim(),
          password: password,
        }),
      });

      // 2. Attach security roles & superuser status if selected
      if (createdUser?.id && (selectedRoleIds.length > 0 || isSuperuser || portalType !== 'FULL')) {
        await apiFetch(`/api/v1/users/${createdUser.id}`, {
          method: 'PATCH',
          body: JSON.stringify({
            is_active: true,
            is_superuser: isSuperuser,
            portal_type: portalType,
            is_field_portal_only: portalType === 'FIELD',
            role_ids: selectedRoleIds,
          }),
        });
      }

      // 3. Link account to employee profile if selected
      if (selectedEmployeeId) {
        await apiFetch(`/api/v1/employees/${selectedEmployeeId}/account/link`, {
          method: 'POST',
        }).catch(() => {});
      }

      onSaved();
    } catch (err: any) {
      setError(err.message || 'Failed to register system user account');
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal name="Register System User Account" onClose={onClose}>
      <form onSubmit={handleSubmit} className="space-y-6">
        {error && (
          <div className="p-3.5 rounded-lg bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-300 flex items-center gap-2 text-sm">
            <AlertCircle size={18} className="shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Section 1: Employee Association (Optional) */}
        <div className="space-y-3 p-4 rounded-lg bg-muted/30 border">
          <label className="block text-xs font-bold uppercase tracking-wider text-muted-foreground">
            Associate with Employee Profile (Optional)
          </label>
          <select
            value={selectedEmployeeId}
            onChange={(e) => handleEmployeeSelect(e.target.value)}
            className="w-full p-2 text-sm border rounded-md bg-background focus:outline-none focus:ring-2 focus:ring-primary/20"
          >
            <option value="">-- No employee linked (Standalone Account) --</option>
            {employees.map((emp) => (
              <option key={emp.id} value={emp.id}>
                {emp.first_name} {emp.last_name} ({emp.employee_number || emp.job_title || 'Employee'})
              </option>
            ))}
          </select>
          <p className="text-xs text-muted-foreground">
            Selecting an employee will auto-fill their contact details and link their personnel record to this login.
          </p>
        </div>

        {/* Section 2: Basic Account Credentials */}
        <div className="space-y-4">
          <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground border-b pb-1">
            Account Credentials
          </h4>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold mb-1">First Name</label>
              <input
                type="text"
                placeholder="John"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                className="w-full p-2 text-sm border rounded-md bg-background focus:outline-none focus:ring-2 focus:ring-primary/20"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold mb-1">Last Name</label>
              <input
                type="text"
                placeholder="Doe"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                className="w-full p-2 text-sm border rounded-md bg-background focus:outline-none focus:ring-2 focus:ring-primary/20"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold mb-1">Work Email Address *</label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={15} />
                <input
                  type="email"
                  required
                  placeholder="user@company.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 text-sm border rounded-md bg-background focus:outline-none focus:ring-2 focus:ring-primary/20"
                />
              </div>
            </div>
            <div>
              <label className="block text-xs font-semibold mb-1">Initial Password * (min 12 chars)</label>
              <div className="relative">
                <Key className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={15} />
                <input
                  type="password"
                  required
                  placeholder="••••••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 text-sm border rounded-md bg-background focus:outline-none focus:ring-2 focus:ring-primary/20"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Section 3: Roles & Permissions Selection */}
        <div className="space-y-3">
          <div className="flex items-center justify-between border-b pb-1">
            <div>
              <h4 className="text-xs font-semibold text-foreground">
                Assigned Security Roles
              </h4>
              <p className="text-[11px] text-muted-foreground">
                Select one or more roles to grant granular permissions.
              </p>
            </div>
            <span className="text-xs text-muted-foreground">
              {selectedRoleIds.length} role(s) selected
            </span>
          </div>

          {loadingData ? (
            <div className="py-6 text-center text-xs text-muted-foreground animate-pulse">
              <RefreshCw className="mx-auto mb-1 animate-spin" size={18} />
              Loading system security roles...
            </div>
          ) : (
            <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
              {roles.length === 0 ? (
                <div className="p-4 text-center text-xs text-muted-foreground border border-dashed rounded">
                  No security roles defined.
                </div>
              ) : (
                roles.map((role) => {
                  const isChecked = selectedRoleIds.includes(String(role.id));
                  const permCount = Array.isArray(role.permissions) ? role.permissions.length : 0;

                  return (
                    <div
                      key={role.id}
                      onClick={() => toggleRole(String(role.id))}
                      className={`flex items-start justify-between p-3 rounded-lg border cursor-pointer transition-all ${
                        isChecked
                          ? 'border-primary bg-primary/5 dark:bg-primary/10'
                          : 'hover:bg-muted/50'
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        <div
                          className={`w-5 h-5 rounded border mt-0.5 flex items-center justify-center transition-colors ${
                            isChecked
                              ? 'bg-primary text-primary-foreground border-primary'
                              : 'border-muted-foreground/40'
                          }`}
                        >
                          {isChecked && <Check size={13} strokeWidth={3} />}
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-semibold text-sm text-foreground">
                              {role.name}
                            </span>
                            {role.is_system_role && (
                              <span className="text-[10px] px-1.5 py-0.5 rounded bg-muted font-medium text-muted-foreground">
                                System Role
                              </span>
                            )}
                          </div>
                          {role.description && (
                            <p className="text-xs text-muted-foreground mt-0.5 leading-tight">
                              {role.description}
                            </p>
                          )}
                        </div>
                      </div>

                      <span className="text-xs px-2 py-0.5 rounded bg-secondary font-mono text-muted-foreground shrink-0">
                        {permCount} permission(s)
                      </span>
                    </div>
                  );
                })
              )}
            </div>
          )}

          {/* Superuser Toggle */}
          <div className="p-3.5 rounded-lg border border-amber-200 dark:border-amber-900 bg-amber-50/50 dark:bg-amber-950/20 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <ShieldCheck className="text-amber-600 dark:text-amber-400 shrink-0" size={20} />
              <div>
                <h5 className="font-semibold text-sm text-amber-900 dark:text-amber-200">
                  Grant Superuser Privileges
                </h5>
                <p className="text-xs text-amber-700 dark:text-amber-400">
                  Full unrestricted administrative control across all organizations and modules.
                </p>
              </div>
            </div>
            <input
              type="checkbox"
              checked={isSuperuser}
              onChange={(e) => setIsSuperuser(e.target.checked)}
              className="w-4 h-4 rounded border-amber-400 text-primary focus:ring-primary/20 cursor-pointer"
            />
          </div>

          {/* Portal Access Mode */}
          <div className="p-3.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-900/20 space-y-2">
            <div className="flex items-center gap-2.5 mb-2">
              <UserCheck className="text-slate-600 dark:text-slate-400 shrink-0" size={20} />
              <div>
                <h5 className="font-semibold text-sm text-slate-900 dark:text-slate-200">Portal Access Mode</h5>
                <p className="text-xs text-slate-600 dark:text-slate-400">Controls which portal this user sees on login.</p>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2">
              {([
                { value: 'FIELD',       label: 'Field Portal',         color: 'bg-blue-50 border-blue-300 dark:bg-blue-900/30 dark:border-blue-700' },
                { value: 'FIELD_ADMIN', label: 'Field Admin Portal',   color: 'bg-orange-50 border-orange-300 dark:bg-orange-900/30 dark:border-orange-700' },
                { value: 'HR',          label: 'HR Portal',            color: 'bg-emerald-50 border-emerald-300 dark:bg-emerald-900/30 dark:border-emerald-700' },
                { value: 'FINANCE',     label: 'Finance Portal',       color: 'bg-violet-50 border-violet-300 dark:bg-violet-900/30 dark:border-violet-700' },
                { value: 'EXECUTIVE',   label: 'Executive Portal',     color: 'bg-indigo-50 border-indigo-300 dark:bg-indigo-900/30 dark:border-indigo-700' },
              ] as const).map(({ value, label, color }) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => setPortalType(value)}
                  className={`p-2 rounded-lg border-2 text-xs font-semibold text-left transition-all ${color} ${
                    portalType === value ? 'ring-2 ring-primary' : 'opacity-70 hover:opacity-100'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="sticky bottom-0 -mx-4 -mb-4 sm:-mx-6 sm:-mb-6 p-3.5 sm:px-6 sm:py-4 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-t border-slate-200 dark:border-slate-800 z-10 flex flex-col-reverse sm:flex-row items-stretch sm:items-center justify-end gap-2.5 sm:gap-3 mt-4">
          <button
            type="button"
            onClick={onClose}
            disabled={busy}
            className="px-4 py-2 text-xs sm:text-sm font-semibold rounded-lg border hover:bg-muted transition-colors w-full sm:w-auto"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={busy}
            className="px-5 py-2 text-xs sm:text-sm font-semibold rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-colors flex items-center justify-center gap-2 w-full sm:w-auto"
          >
            {busy && <RefreshCw size={14} className="animate-spin" />}
            {busy ? 'Registering User...' : 'Register User & Assign Access'}
          </button>
        </div>
      </form>
    </Modal>
  );
}
