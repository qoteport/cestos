'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { Search, User, Briefcase, Building2, AlertCircle, RefreshCw } from 'lucide-react';
import { apiFetch } from '@/lib/api';
import { Modal, Row } from './DataUI';
import EmployeeWizardForm from './EmployeeWizardForm';

interface EditEmployeeModalProps {
  title?: string;
  subtitle?: string;
  onClose: () => void;
  onSaved?: (updatedEmployee: Row) => void;
  onSelectEmployee?: (employee: Row) => void;
}

export default function EditEmployeeModal({
  title = 'Edit Employee Profile',
  subtitle = 'Select an active employee to proceed.',
  onClose,
  onSaved,
  onSelectEmployee,
}: EditEmployeeModalProps) {
  const [employees, setEmployees] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedEmployee, setSelectedEmployee] = useState<Row | null>(null);

  const fetchEmployees = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await apiFetch<any>('/api/v1/employees?page_size=100');
      const list = Array.isArray(res) ? res : res.items || [];
      setEmployees(list);
    } catch (err: any) {
      setError(err.message || 'Failed to load employees');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEmployees();
  }, []);

  const filteredEmployees = useMemo(() => {
    if (!searchQuery.trim()) return employees;
    const q = searchQuery.toLowerCase().trim();
    return employees.filter((emp) => {
      const fullName = `${emp.first_name || ''} ${emp.last_name || ''}`.toLowerCase();
      const code = (emp.employee_number || emp.code || '').toLowerCase();
      const title = (emp.job_title || emp.position?.name || '').toLowerCase();
      const dept = (emp.department?.name || emp.department_name || '').toLowerCase();
      const email = (emp.work_email || emp.personal_email || '').toLowerCase();
      return (
        fullName.includes(q) ||
        code.includes(q) ||
        title.includes(q) ||
        dept.includes(q) ||
        email.includes(q)
      );
    });
  }, [employees, searchQuery]);

  const handleSelect = (emp: Row) => {
    if (onSelectEmployee) {
      onSelectEmployee(emp);
    } else {
      setSelectedEmployee(emp);
    }
  };

  // If an employee is selected for full wizard edit (default mode when onSelectEmployee is omitted)
  if (selectedEmployee && !onSelectEmployee) {
    return (
      <EmployeeWizardForm
        initial={selectedEmployee}
        onClose={() => setSelectedEmployee(null)}
        onSaved={(updated) => {
          if (onSaved) onSaved(updated);
          onClose();
        }}
      />
    );
  }

  return (
    <Modal name={title} onClose={onClose}>
      <div className="space-y-4">
        {/* Search header */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pb-2 border-b">
          <p className="text-sm text-muted-foreground">
            {subtitle}
          </p>
          <div className="relative w-full sm:w-72 shrink-0">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={16} />
            <input
              type="text"
              placeholder="Search employee by name, ID, title..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2 text-sm border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-primary/20"
              autoFocus
            />
          </div>
        </div>

        {/* Loading state */}
        {loading && (
          <div className="py-12 text-center text-muted-foreground animate-pulse">
            <RefreshCw className="mx-auto mb-2 animate-spin text-primary" size={24} />
            Loading employee directory...
          </div>
        )}

        {/* Error state */}
        {!loading && error && (
          <div className="p-4 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-300 flex items-center justify-between">
            <div className="flex items-center gap-2 text-sm">
              <AlertCircle size={18} />
              <span>{error}</span>
            </div>
            <button
              onClick={fetchEmployees}
              className="text-xs font-semibold px-3 py-1 bg-red-100 dark:bg-red-800 rounded hover:bg-red-200"
            >
              Retry
            </button>
          </div>
        )}

        {/* Employee List */}
        {!loading && !error && (
          <div className="max-h-[60vh] overflow-y-auto space-y-2 pr-1">
            {filteredEmployees.length === 0 ? (
              <div className="py-12 text-center text-muted-foreground border border-dashed rounded-lg">
                <User className="mx-auto mb-2 opacity-40" size={32} />
                <p className="font-semibold text-foreground">No employees found</p>
                <p className="text-sm mt-1">
                  {searchQuery ? `No matches for "${searchQuery}"` : 'No employee records registered yet.'}
                </p>
              </div>
            ) : (
              filteredEmployees.map((emp) => {
                const fullName = `${emp.first_name || ''} ${emp.last_name || ''}`.trim() || 'Unnamed Employee';
                const empNo = emp.employee_number || emp.code || 'No ID';
                const jobTitle = emp.job_title || emp.position?.name || 'No Position';
                const deptName = emp.department?.name || emp.department_name || 'No Department';
                const status = (emp.employment_status || 'ACTIVE').toUpperCase();

                return (
                  <div
                    key={emp.id}
                    onClick={() => handleSelect(emp)}
                    className="flex items-center justify-between p-3.5 rounded-lg border bg-card hover:bg-accent/50 hover:border-primary/40 transition-all cursor-pointer group"
                  >
                    <div className="flex items-center gap-3.5">
                      {/* Avatar initial badge */}
                      <div className="w-10 h-10 rounded-full bg-primary/10 text-primary font-bold flex items-center justify-center text-sm shrink-0 group-hover:bg-primary group-hover:text-primary-foreground transition-colors">
                        {emp.first_name?.[0]?.toUpperCase() || emp.last_name?.[0]?.toUpperCase() || 'E'}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h4 className="font-semibold text-foreground text-sm group-hover:text-primary transition-colors">
                            {fullName}
                          </h4>
                          <span className="text-xs px-2 py-0.5 rounded-full bg-muted font-mono text-muted-foreground">
                            {empNo}
                          </span>
                        </div>
                        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-0.5 text-xs text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <Briefcase size={12} />
                            {jobTitle}
                          </span>
                          <span className="flex items-center gap-1">
                            <Building2 size={12} />
                            {deptName}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      <span
                        className={`text-xs px-2.5 py-1 rounded-full font-medium ${
                          status === 'ACTIVE'
                            ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                            : 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
                        }`}
                      >
                        {status}
                      </span>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleSelect(emp);
                        }}
                        className="px-3 py-1.5 text-xs font-semibold rounded-md bg-primary text-primary-foreground hover:bg-primary/90 transition-colors shadow-xs"
                      >
                        {onSelectEmployee ? 'Select' : 'Edit'}
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        )}
      </div>
    </Modal>
  );
}
