'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { GraduationCap, ShieldCheck, AlertTriangle, Plus, Filter, Search, RefreshCw, ArrowLeft, Calendar } from 'lucide-react';
import { apiFetch } from '@/lib/api';
import { toast } from 'sonner';
import { Row, display, Modal } from './DataUI';
import SearchableSelect from './SearchableSelect';
import AppDateTimePicker from './ui/AppDateTimePicker';

export default function TrainingComplianceWorkspace() {
  const [loading, setLoading] = useState(true);
  const [complianceData, setComplianceData] = useState<Row | null>(null);
  const [expiringTraining, setExpiringTraining] = useState<Row[]>([]);
  const [trainingList, setTrainingList] = useState<Row[]>([]);
  const [employees, setEmployees] = useState<Row[]>([]);
  const [version, setVersion] = useState(0);

  // Filter & Active Tab
  const [activeTab, setActiveTab] = useState<'COURSES' | 'EXPIRING' | 'PROGRAMS'>('COURSES');
  const [searchQuery, setSearchQuery] = useState('');

  // Modals
  const [showPlanModal, setShowPlanModal] = useState(false);
  const [savingPlan, setSavingPlan] = useState(false);
  const [planError, setPlanError] = useState('');
  const [selectedEmpIds, setSelectedEmpIds] = useState<string[]>([]);
  const [empSearchModal, setEmpSearchModal] = useState('');
  const [planForm, setPlanForm] = useState({
    training_name: '',
    training_type: 'MANDATORY',
    training_provider: '',
    training_start: new Date().toISOString().slice(0, 10),
    training_expiry: '',
  });

  const reload = () => setVersion(v => v + 1);

  const openPlanModal = () => {
    setSelectedEmpIds([]);
    setPlanError('');
    setEmpSearchModal('');
    setPlanForm({
      training_name: '',
      training_type: 'MANDATORY',
      training_provider: '',
      training_start: new Date().toISOString().slice(0, 10),
      training_expiry: '',
    });
    setShowPlanModal(true);
  };

  const modalEmpSearchFiltered = employees.filter(e => {
    const name = [e.first_name, e.last_name].filter(Boolean).join(' ') || e.name || e.employee_number || '';
    const pos = e.position_name || e.title || '';
    const searchStr = `${name} ${pos} ${e.employee_number || ''}`.toLowerCase();
    return searchStr.includes(empSearchModal.toLowerCase());
  });

  useEffect(() => {
    let active = true;
    setLoading(true);

    Promise.all([
      apiFetch<any>('/api/v1/training/records').catch(() => null),
      apiFetch<any>('/api/v1/training/expiring?days=60').catch(() => []),
      apiFetch<any>('/api/v1/employee-licenses/expiring?days=60').catch(() => []),
      apiFetch<any>('/api/v1/employees?page_size=100').catch(() => []),
    ]).then(([comp, expTrain, expLic, emp]) => {
      if (!active) return;
      if (comp) {
        setComplianceData(comp);
        const list = comp.training || comp.courses || comp.items || comp.records || (Array.isArray(comp) ? comp : []);
        setTrainingList(Array.isArray(list) ? list : []);
      }
      const expList = [
        ...(Array.isArray(expTrain) ? expTrain : expTrain?.items || []),
        ...(Array.isArray(expLic) ? expLic : expLic?.items || []),
      ];
      setExpiringTraining(expList);
      setEmployees(Array.isArray(emp) ? emp : emp?.items || []);
      setLoading(false);
    });

    return () => { active = false; };
  }, [version]);

  // Derived metrics synced with DB and endpoint data
  const totalCourses = complianceData?.total_courses ?? complianceData?.active_courses ?? trainingList.length;
  const expiringCount = complianceData?.expiring_count ?? expiringTraining.length;
  const complianceRate = complianceData?.compliance_percentage ?? complianceData?.compliance_rate ?? complianceData?.overall_compliance_rate ?? (trainingList.length ? Math.round(trainingList.filter(t => t.status === 'COMPLETED' && (!t.expiry_date || t.expiry_date >= new Date().toISOString().slice(0, 10))).length / trainingList.length * 100) : 0);
  const plannedSessions = complianceData?.planned_count ?? complianceData?.planned_sessions ?? complianceData?.upcoming_sessions ?? trainingList.filter(t => ['PLANNED', 'IN_PROGRESS'].includes(String(t.status).toUpperCase())).length;

  const filteredTraining = trainingList.filter(t => {
    const searchStr = `${t.training_name || t.name || ''} ${t.training_type || ''} ${t.employee_name || ''}`.toLowerCase();
    return searchStr.includes(searchQuery.toLowerCase());
  });

  const filteredExpiring = expiringTraining.filter(t => {
    const searchStr = `${t.training_name || t.name || ''} ${t.employee_name || ''}`.toLowerCase();
    return searchStr.includes(searchQuery.toLowerCase());
  });

  return (
    <div className="space-y-6 fade-in">
      {/* Header Bar */}
      <div className="flex flex-wrap justify-between items-center gap-4 border-b pb-4">
        <div>
          <Link href="/workforce-overview" className="text-xs text-primary flex items-center gap-1 mb-2 hover:underline">
            <ArrowLeft size={12} /> Workforce Overview
          </Link>
          <h1 className="text-2xl font-bold text-foreground">Workforce Training & Compliance Planner</h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            Track safety compliance rates, manage expiring tickets & certifications, and schedule mandatory training programs.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button onClick={reload} className="btn-secondary text-xs p-0.5" title="Refresh compliance metrics">
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
          </button>

          <button
            onClick={openPlanModal}
            className="btn-primary text-xs flex items-center gap-1.5 bg-emerald-700 hover:bg-emerald-800"
          >
            <Plus size={14} /> Plan Training Program
          </button>
        </div>
      </div>

      {/* Compliance Rate & KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="card p-4 space-y-1.5 border-l-4 border-l-emerald-500">
          <span className="text-xs font-semibold text-muted-foreground block">Overall Compliance Rate</span>
          <div className="flex items-baseline justify-between">
            <span className="text-2xl font-extrabold text-emerald-800">{loading ? '—' : `${complianceRate}%`}</span>
            <ShieldCheck size={18} className="text-emerald-600" />
          </div>
          <p className="text-[11px] text-muted-foreground">Certified workforce active tickets</p>
        </div>

        <div className="card p-4 space-y-1.5 border-l-4 border-l-blue-500">
          <span className="text-xs font-semibold text-muted-foreground block">Active Training Courses</span>
          <div className="flex items-baseline justify-between">
            <span className="text-2xl font-extrabold text-blue-800">{loading ? '—' : totalCourses}</span>
            <GraduationCap size={18} className="text-blue-600" />
          </div>
          <p className="text-[11px] text-muted-foreground">Recorded compliance courses</p>
        </div>

        <div className="card p-4 space-y-1.5 border-l-4 border-l-amber-500">
          <span className="text-xs font-semibold text-muted-foreground block">Expiring (Next 60 Days)</span>
          <div className="flex items-baseline justify-between">
            <span className="text-2xl font-extrabold text-amber-800">{loading ? '—' : expiringCount}</span>
            <AlertTriangle size={18} className="text-amber-600" />
          </div>
          <p className="text-[11px] text-muted-foreground">Requires renewal or recertification</p>
        </div>

        <div className="card p-4 space-y-1.5 border-l-4 border-l-purple-500">
          <span className="text-xs font-semibold text-muted-foreground block">Planned Training Sessions</span>
          <div className="flex items-baseline justify-between">
            <span className="text-2xl font-extrabold text-purple-800">
              {loading ? '—' : plannedSessions}
            </span>
            <Calendar size={18} className="text-purple-600" />
          </div>
          <p className="text-[11px] text-muted-foreground">Scheduled upcoming programs</p>
        </div>
      </div>

      {/* Tabs & Search Header */}
      <div className="card p-4 space-y-4">
        <div className="flex flex-wrap justify-between items-center gap-3 border-b pb-3">
          <div className="flex items-center gap-1">
            <button
              onClick={() => setActiveTab('COURSES')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-all ${
                activeTab === 'COURSES' ? 'bg-primary text-primary-foreground shadow-sm' : 'btn-secondary'
              }`}
            >
              Training Courses & Records
            </button>
            <button
              onClick={() => setActiveTab('EXPIRING')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-all flex items-center gap-1.5 ${
                activeTab === 'EXPIRING' ? 'bg-amber-700 text-white shadow-sm' : 'btn-secondary text-amber-700'
              }`}
            >
              <AlertTriangle size={12} /> Expiring Certificates ({expiringCount})
            </button>
            <button
              onClick={() => setActiveTab('PROGRAMS')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-all ${
                activeTab === 'PROGRAMS' ? 'bg-primary text-primary-foreground shadow-sm' : 'btn-secondary'
              }`}
            >
              Planned Training Programs
            </button>
          </div>

          <div className="relative w-64">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search course or employee..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="input-field pl-9 text-xs py-1.5"
            />
          </div>
        </div>

        {/* TAB 1: Courses & Records Table */}
        {activeTab === 'COURSES' && (
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead className="bg-muted text-muted-foreground font-semibold border-b">
                <tr>
                  <th className="p-3">Training Course / Title</th>
                  <th className="p-3">Category / Type</th>
                  <th className="p-3">Employee</th>
                  <th className="p-3">Completion Date</th>
                  <th className="p-3">Expiry Date</th>
                  <th className="p-3">Status</th>
                  <th className="p-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {filteredTraining.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-8 text-center text-muted-foreground">
                      No training courses recorded yet. Click <strong>Plan Training Program</strong> to schedule new sessions.
                    </td>
                  </tr>
                ) : (
                  filteredTraining.map((item, idx) => (
                    <tr key={item.id || idx} className="hover:bg-muted/30 transition-colors">
                      <td className="p-3 font-semibold text-foreground">{display(item.training_name || item.name || 'Safety Induction')}</td>
                      <td className="p-3 text-muted-foreground">{display(item.training_type || 'MANDATORY')}</td>
                      <td className="p-3 font-medium text-foreground">{display(item.employee_name || 'Staff Member')}</td>
                      <td className="p-3 text-muted-foreground">{display(item.completion_date || item.issue_date)}</td>
                      <td className="p-3 text-muted-foreground">{display(item.expiry_date || 'No Expiry')}</td>
                      <td className="p-3">
                        <span className="px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-100 text-emerald-800 border border-emerald-300">
                          {display(item.status || 'COMPLETED')}
                        </span>
                      </td>
                      <td className="p-3 text-right">
                        {item.employee_id && (
                          <Link href={`/workspace/employees/${item.employee_id}?tab=training`} className="btn-secondary py-1 px-2.5 text-[11px]">
                            View Record
                          </Link>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}

        {/* TAB 2: Expiring Certificates */}
        {activeTab === 'EXPIRING' && (
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead className="bg-muted text-muted-foreground font-semibold border-b">
                <tr>
                  <th className="p-3">Employee</th>
                  <th className="p-3">Training Certificate</th>
                  <th className="p-3">Completion Date</th>
                  <th className="p-3">Expiry Date</th>
                  <th className="p-3">Days Remaining</th>
                  <th className="p-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {filteredExpiring.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-8 text-center text-muted-foreground">
                      No training certificates expiring in the next 60 days. All certificates are compliant!
                    </td>
                  </tr>
                ) : (
                  filteredExpiring.map((item, idx) => {
                    const daysLeft = item.days_left ?? item.days_remaining ?? 15;
                    const urgencyBadge =
                      daysLeft <= 7
                        ? 'bg-rose-100 text-rose-800 border-rose-300 font-bold' :'bg-amber-100 text-amber-800 border-amber-300 font-semibold';
                    return (
                      <tr key={item.id || idx} className="hover:bg-muted/30 transition-colors">
                        <td className="p-3 font-semibold text-foreground">
                          {item.employee_id ? (
                            <Link href={`/workspace/employees/${item.employee_id}`} className="hover:text-primary transition-colors">
                              {display(item.employee_name || item.employee_id)}
                            </Link>
                          ) : (
                            display(item.employee_name || 'Employee')
                          )}
                        </td>
                        <td className="p-3 text-foreground font-medium">{display(item.training_name || item.name || 'Cert')}</td>
                        <td className="p-3 text-muted-foreground">{display(item.completion_date || item.issue_date)}</td>
                        <td className="p-3 font-semibold text-rose-700">{display(item.expiry_date)}</td>
                        <td className="p-3">
                          <span className={`px-2.5 py-0.5 rounded-full text-[11px] border ${urgencyBadge}`}>
                            Expiring in {daysLeft} days
                          </span>
                        </td>
                        <td className="p-3 text-right">
                          {item.employee_id && (
                            <Link href={`/workspace/employees/${item.employee_id}?tab=training`} className="btn-primary py-1 px-2.5 text-[11px]">
                              Renew Ticket
                            </Link>
                          )}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        )}

        {/* TAB 3: Planned Programs */}
        {activeTab === 'PROGRAMS' && (
          <div className="space-y-4">
            <div className="flex justify-between items-center border-b pb-2">
              <p className="text-xs text-muted-foreground">Scheduled mandatory safety programs and upcoming refresher courses.</p>
              <button
                onClick={openPlanModal}
                className="btn-primary text-xs flex items-center gap-1.5"
              >
                <Plus size={13} /> Schedule Program
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {filteredTraining.filter(course => ['PLANNED', 'IN_PROGRESS'].includes(course.status)).map(course => <div key={course.id} className="p-4 border rounded-lg bg-card space-y-2">
                <h3 className="font-bold">{course.training_name}</h3>
                <p className="text-xs">{course.employee_name} · {course.status.replace('_', ' ')}</p>
                <p className="text-xs text-muted-foreground">Starts {course.start_date || 'Date to be confirmed'} · {course.provider || 'Provider to be confirmed'}</p>
              </div>)}
              {!filteredTraining.some(course => ['PLANNED', 'IN_PROGRESS'].includes(course.status)) && <p className="text-xs text-muted-foreground">No planned training programs.</p>}
            </div>
          </div>
        )}
      </div>

      {/* MODAL: Plan Training Program */}
      {showPlanModal && (
        <Modal name="Plan New Training Program / Course" error={planError} onClose={() => { if (!savingPlan) setShowPlanModal(false); }}>
          <form
            className="space-y-4"
            onSubmit={async (e) => {
              e.preventDefault();
              if (savingPlan) return;
              setPlanError('');
              if (selectedEmpIds.length === 0) {
                setPlanError('Please select at least one employee for this training program.');
                toast.warning('Please select at least one employee for this training program.');
                return;
              }

              try {
                setSavingPlan(true);
                const results = await Promise.allSettled(
                  selectedEmpIds.map(empId =>
                    apiFetch(`/api/v1/employees/${empId}/training`, {
                      method: 'POST',
                      body: JSON.stringify({
                        training_name: planForm.training_name,
                        training_type: planForm.training_type,
                        provider: planForm.training_provider || undefined,
                        start_date: planForm.training_start,
                        expiry_date: planForm.training_expiry || undefined,
                        status: 'PLANNED',
                      }),
                    })
                  )
                );

                const failed = selectedEmpIds.filter((_, index) => results[index].status === 'rejected');
                if (failed.length) {
                  setSelectedEmpIds(failed);
                  reload();
                  const failure = results.find(result => result.status === 'rejected') as PromiseRejectedResult;
                  throw new Error(`${failed.length} participant(s) could not be saved. ${failure.reason?.message || 'Please retry.'} Successful participants have been removed from the selection.`);
                }
                setShowPlanModal(false);
                setSelectedEmpIds([]);
                toast.success('Training course planned successfully.');
                reload();
              } catch (err: any) {
                setPlanError(err?.message || 'Failed to plan training course.');
                toast.error(err?.message || 'Failed to plan training course.');
              } finally { setSavingPlan(false); }
            }}
          >
            <div>
              <div className="flex justify-between items-center mb-1">
                <label className="block text-xs font-semibold">
                  Target Employees * {selectedEmpIds.length > 0 && <span className="text-emerald-600 font-bold">({selectedEmpIds.length} selected)</span>}
                </label>
                <div className="flex items-center gap-2 text-[11px]">
                  <button
                    type="button"
                    className="text-primary hover:underline font-medium"
                    onClick={() => {
                      const allIds = modalEmpSearchFiltered.map(e => String(e.id));
                      setSelectedEmpIds(prev => Array.from(new Set([...prev, ...allIds])));
                    }}
                  >
                    Select All ({modalEmpSearchFiltered.length})
                  </button>
                  <span className="text-muted-foreground">|</span>
                  <button
                    type="button"
                    className="text-muted-foreground hover:underline"
                    onClick={() => setSelectedEmpIds([])}
                  >
                    Clear All
                  </button>
                </div>
              </div>

              <div className="relative mb-2">
                <Search size={13} className="absolute left-2.5 top-2.5 text-muted-foreground" />
                <input
                  type="text"
                  placeholder="Filter employees by name or position..."
                  value={empSearchModal}
                  onChange={(e) => setEmpSearchModal(e.target.value)}
                  className="input-field pl-8 text-xs py-1.5"
                />
              </div>

              <div className="max-h-44 overflow-y-auto border rounded-md p-2 bg-background space-y-1.5 divide-y divide-border/40">
                {modalEmpSearchFiltered.length === 0 ? (
                  <div className="text-xs text-muted-foreground p-2 text-center">No matching employees found</div>
                ) : (
                  modalEmpSearchFiltered.map(e => {
                    const empIdStr = String(e.id);
                    const isChecked = selectedEmpIds.includes(empIdStr);
                    const empName = [e.first_name, e.last_name].filter(Boolean).join(' ') || e.name || e.employee_number;
                    return (
                      <label key={e.id} className="flex items-center gap-2.5 text-xs pt-1.5 first:pt-0 cursor-pointer hover:bg-muted/40 p-1 rounded transition-colors">
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={(evt) => {
                            if (evt.target.checked) {
                              setSelectedEmpIds(prev => [...prev, empIdStr]);
                            } else {
                              setSelectedEmpIds(prev => prev.filter(id => id !== empIdStr));
                            }
                          }}
                          className="rounded border-gray-300 text-emerald-600 focus:ring-emerald-500 h-3.5 w-3.5"
                        />
                        <div className="flex-1 min-w-0">
                          <span className="font-medium text-foreground block truncate">{empName}</span>
                          <span className="text-[10px] text-muted-foreground block truncate">
                            {e.employee_number ? `#${e.employee_number} • ` : ''}{e.position_name || e.title || 'Staff'}
                          </span>
                        </div>
                      </label>
                    );
                  })
                )}
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold mb-1">Course / Training Program Title *</label>
              <input
                required
                type="text"
                className="input-field"
                placeholder="e.g. Basic Offshore Safety Induction & Emergency Training (BOSIET)"
                value={planForm.training_name}
                onChange={(e) => setPlanForm({ ...planForm, training_name: e.target.value })}
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold mb-1">Training Type *</label>
                <SearchableSelect
                  options={[
                    { value: 'MANDATORY', label: 'Mandatory Safety' },
                    { value: 'TECHNICAL', label: 'Technical Skills' },
                    { value: 'COMPLIANCE', label: 'Regulatory Compliance' },
                    { value: 'RECURRENT', label: 'Recurrent Refresher' },
                    { value: 'OTHER', label: 'Other' },
                  ]}
                  value={planForm.training_type}
                  onChange={(val) => setPlanForm({ ...planForm, training_type: val })}
                  searchable={false}
                />
              </div>
              <div>
                <label className="block text-xs font-semibold mb-1">Provider / Institution</label>
                <input
                  type="text"
                  className="input-field"
                  placeholder="e.g. National Safety Institute"
                  value={planForm.training_provider}
                  onChange={(e) => setPlanForm({ ...planForm, training_provider: e.target.value })}
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold mb-1">Training Start Date *</label>
                <AppDateTimePicker
                  mode="date"
                  required
                  value={planForm.training_start}
                  onChange={(val) => setPlanForm({ ...planForm, training_start: val })}
                  placeholder="Select start date"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold mb-1">Validity / Expiry Date</label>
                <AppDateTimePicker
                  mode="date"
                  value={planForm.training_expiry}
                  onChange={(val) => setPlanForm({ ...planForm, training_expiry: val })}
                  placeholder="Select expiry date"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 border-t pt-3">
              <button type="button" className="btn-secondary text-xs" onClick={() => setShowPlanModal(false)}>Cancel</button>
              <button type="submit" disabled={savingPlan} className="btn-primary text-xs bg-emerald-700 hover:bg-emerald-800">
                Plan Program ({selectedEmpIds.length}) & Save
              </button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}
