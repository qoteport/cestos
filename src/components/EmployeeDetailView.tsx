'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Edit, Upload, Archive, UserCheck, Phone, FileText, GraduationCap, Award, Shield, Briefcase, Clock, Calendar, Activity, Plus, Download, ExternalLink, Trash2, User, Key, Mail, FileCheck, Filter, Check } from 'lucide-react';
import { apiFetch, apiFetchBlob, downloadBlob } from '@/lib/api';
import { Row, display, title, Modal } from './DataUI';
import RecordForm from './RecordForm';
import EmployeeWizardForm from './EmployeeWizardForm';
import EmployeeCalendarModal from './EmployeeCalendarModal';
import contract from '@/lib/contract.json';
import Icon from '@/components/ui/AppIcon';


const routes: Row = contract.routes;

export default function EmployeeDetailView({ employeeId }: { employeeId: string }) {
  const router = useRouter();
  const [employee, setEmployee] = useState<Row | null>(null);
  const [overview, setOverview] = useState<Row | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [version, setVersion] = useState(0);

  // Active tab state
  const [activeTab, setActiveTab] = useState<
    'profile' | 'contracts' | 'documents' | 'family' |
    'skills' | 'training' | 'assignments' | 'authorizations' | 'time' | 'activity'
  >('profile');

  // Tab Data States
  const [family, setFamily] = useState<Row[]>([]);
  const [emergency, setEmergency] = useState<Row[]>([]);
  const [resumes, setResumes] = useState<Row[]>([]);
  const [documents, setDocuments] = useState<Row[]>([]);
  const [qualifications, setQualifications] = useState<Row[]>([]);
  const [skills, setSkills] = useState<Row[]>([]);
  const [training, setTraining] = useState<Row[]>([]);
  const [licenses, setLicenses] = useState<Row[]>([]);
  const [assignments, setAssignments] = useState<Row[]>([]);
  const [rotations, setRotations] = useState<Row[]>([]);
  const [authorizations, setAuthorizations] = useState<Row[]>([]);
  const [timeLogs, setTimeLogs] = useState<Row[]>([]);
  const [leaveRequests, setLeaveRequests] = useState<Row[]>([]);
  const [activities, setActivities] = useState<Row[]>([]);

  // Category filter for Notes & Records tab
  const [notesCategoryFilter, setNotesCategoryFilter] = useState<string>('ALL');

  // Modals & Popups State
  const [editingEmployee, setEditingEmployee] = useState(false);
  const [showCalendarModal, setShowCalendarModal] = useState(false);
  const [showAccountModal, setShowAccountModal] = useState(false);

  // Custom Feature Modals
  const [showContractModal, setShowContractModal] = useState(false);
  const [showNoteRecordModal, setShowNoteRecordModal] = useState(false);
  const [showLeaveModal, setShowLeaveModal] = useState(false);
  const [showTimeLogModal, setShowTimeLogModal] = useState(false);

  // Edit states
  const [editingItem, setEditingItem] = useState<{ kind: 'time' | 'leave' | 'contract' | 'doc'; row: Row } | null>(null);

  const [activeSubModal, setActiveSubModal] = useState<{ name: string; schemaName: string; path: string; method?: string } | null>(null);
  const [actionError, setActionError] = useState('');
  const [busy, setBusy] = useState(false);

  // Photo Blob URL
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);

  // Helper to ensure data arrays
  const toArray = (d: any): Row[] => Array.isArray(d) ? d : Array.isArray(d?.items) ? d.items : [];

  // Reload trigger
  const reloadAll = () => setVersion(v => v + 1);

  // Fetch Main Employee Profile & Overview and Core Sub-data for Overview Grid
  useEffect(() => {
    let active = true;
    setLoading(true);
    setError('');

    const root = `/api/v1/employees/${employeeId}`;

    Promise.all([
      apiFetch<Row>(root).catch(e => { if (active) setError(e.message); return null; }),
      apiFetch<Row>(`${root}/overview`).catch(() => null),
      apiFetch<any>(`${root}/family`).catch(() => []),
      apiFetch<any>(`${root}/emergency-contacts`).catch(() => []),
      apiFetch<any>(`${root}/assignments`).catch(() => []),
      apiFetch<any>(`${root}/activity`).catch(() => []),
      apiFetch<any>(`${root}/documents`).catch(() => []),
      apiFetch<any>(`${root}/resumes`).catch(() => []),
    ]).then(([empData, overData, famData, emData, assignData, actData, docData, resData]) => {
      if (!active) return;
      if (empData) setEmployee(empData);
      if (overData) setOverview(overData);
      setFamily(toArray(famData));
      setEmergency(toArray(emData));
      setAssignments(toArray(assignData));
      setActivities(toArray(actData));
      setDocuments(toArray(docData));
      setResumes(toArray(resData));
      setLoading(false);
    });

    return () => { active = false; };
  }, [employeeId, version]);

  // Fetch photo blob if present
  useEffect(() => {
    if (!employee?.profile_photo_url) {
      setPhotoUrl(null);
      return;
    }
    let active = true;
    let createdUrl: string | null = null;
    const url = employee.profile_photo_url;

    if (url.startsWith('data:')) {
      setPhotoUrl(url);
      return;
    }

    apiFetchBlob(url)
      .then(blob => {
        if (active && blob && blob.size > 0) {
          createdUrl = URL.createObjectURL(blob);
          setPhotoUrl(createdUrl);
        }
      })
      .catch(() => {
        if (active) setPhotoUrl(null);
      });

    return () => {
      active = false;
      if (createdUrl) URL.revokeObjectURL(createdUrl);
    };
  }, [employee?.profile_photo_url]);

  // Fetch Tab Specific Sub-data
  useEffect(() => {
    if (!employeeId) return;
    const root = `/api/v1/employees/${employeeId}`;

    if (activeTab === 'contracts' || activeTab === 'documents') {
      apiFetch<any>(`${root}/documents`).then(d => setDocuments(toArray(d))).catch(() => setDocuments([]));
      apiFetch<any>(`${root}/resumes`).then(r => setResumes(toArray(r))).catch(() => setResumes([]));
    } else if (activeTab === 'family') {
      apiFetch<any>(`${root}/family`).then(d => setFamily(toArray(d))).catch(() => setFamily([]));
      apiFetch<any>(`${root}/emergency-contacts`).then(d => setEmergency(toArray(d))).catch(() => setEmergency([]));
    } else if (activeTab === 'skills') {
      apiFetch<any>(`${root}/qualifications`).then(d => setQualifications(toArray(d))).catch(() => setQualifications([]));
      apiFetch<any>(`${root}/skills`).then(d => setSkills(toArray(d))).catch(() => setSkills([]));
    } else if (activeTab === 'training') {
      apiFetch<any>(`${root}/training`).then(d => setTraining(toArray(d))).catch(() => setTraining([]));
      apiFetch<any>(`${root}/licenses`).then(d => setLicenses(toArray(d))).catch(() => setLicenses([]));
    } else if (activeTab === 'assignments') {
      apiFetch<any>(`${root}/assignments`).then(d => setAssignments(toArray(d))).catch(() => setAssignments([]));
      apiFetch<any>(`${root}/rotations`).then(d => setRotations(toArray(d))).catch(() => setRotations([]));
    } else if (activeTab === 'authorizations') {
      apiFetch<any>(`${root}/asset-authorizations`).then(d => setAuthorizations(toArray(d))).catch(() => setAuthorizations([]));
    } else if (activeTab === 'time') {
      apiFetch<any>(`${root}/time-logs`).then(d => setTimeLogs(toArray(d))).catch(() => setTimeLogs([]));
      apiFetch<any>(`${root}/leave-requests`).then(d => setLeaveRequests(toArray(d))).catch(() => setLeaveRequests([]));
    } else if (activeTab === 'activity') {
      apiFetch<any>(`${root}/activity`).then(d => setActivities(toArray(d))).catch(() => setActivities([]));
    }
  }, [employeeId, activeTab, version]);

  const toggleArchive = async () => {
    if (!employee) return;
    const action = employee.is_active ? 'archive' : 'restore';
    setBusy(true);
    setActionError('');
    try {
      await apiFetch(`/api/v1/employees/${employeeId}/${action}`, { method: 'POST' });
      reloadAll();
    } catch (e: any) {
      setActionError(e?.message || `Failed to ${action} employee.`);
    } finally {
      setBusy(false);
    }
  };

  const handleQuickPhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setBusy(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('title', 'Profile photo');
      formData.append('document_type', 'OTHER');
      const doc = await apiFetch<any>(`/api/v1/employees/${employeeId}/documents/upload`, {
        method: 'POST',
        body: formData,
      });
      if (doc?.id) {
        await apiFetch(`/api/v1/employees/${employeeId}`, {
          method: 'PATCH',
          body: JSON.stringify({
            profile_photo_url: `/api/v1/employees/${employeeId}/documents/${doc.id}/download`,
          }),
        });
        reloadAll();
      }
    } catch (err: any) {
      setActionError(err?.message || 'Failed to upload profile photo.');
    } finally {
      setBusy(false);
    }
  };

  const handleDownloadDoc = async (docId: string, titleStr: string) => {
    setBusy(true);
    setActionError('');
    try {
      const blob = await apiFetchBlob(`/api/v1/employees/${employeeId}/documents/${docId}/download`);
      downloadBlob(blob, titleStr || 'document');
    } catch (err: any) {
      setActionError(err?.message || 'Failed to download document.');
    } finally {
      setBusy(false);
    }
  };

  const handleViewDoc = async (docId: string) => {
    setBusy(true);
    setActionError('');
    try {
      const blob = await apiFetchBlob(`/api/v1/employees/${employeeId}/documents/${docId}/download`);
      const url = URL.createObjectURL(blob);
      window.open(url, '_blank', 'noopener,noreferrer');
    } catch (err: any) {
      setActionError(err?.message || 'Failed to view document.');
    } finally {
      setBusy(false);
    }
  };

  const handleDeleteDoc = async (docId: string) => {
    if (!window.confirm('Are you sure you want to delete/archive this document?')) return;
    setBusy(true);
    setActionError('');
    try {
      await apiFetch(`/api/v1/employee-documents/${docId}/archive`, { method: 'POST' });
      reloadAll();
    } catch {
      try {
        await apiFetch(`/api/v1/employees/${employeeId}/documents/${docId}`, { method: 'DELETE' });
        reloadAll();
      } catch (err: any) {
        setActionError(err?.message || 'Failed to delete document.');
      }
    } finally {
      setBusy(false);
    }
  };

  const handleDownloadResume = async (resumeId: string, titleStr: string) => {
    setBusy(true);
    setActionError('');
    try {
      const blob = await apiFetchBlob(`/api/v1/employees/${employeeId}/resumes/${resumeId}/download`);
      downloadBlob(blob, titleStr || 'resume');
    } catch (err: any) {
      setActionError(err?.message || 'Failed to download resume.');
    } finally {
      setBusy(false);
    }
  };

  const handleViewResume = async (resumeId: string) => {
    setBusy(true);
    setActionError('');
    try {
      const blob = await apiFetchBlob(`/api/v1/employees/${employeeId}/resumes/${resumeId}/download`);
      const url = URL.createObjectURL(blob);
      window.open(url, '_blank', 'noopener,noreferrer');
    } catch (err: any) {
      setActionError(err?.message || 'Failed to view resume.');
    } finally {
      setBusy(false);
    }
  };

  const handleDeleteResume = async (resumeId: string) => {
    if (!window.confirm('Are you sure you want to delete/archive this resume?')) return;
    setBusy(true);
    setActionError('');
    try {
      await apiFetch(`/api/v1/employee-resumes/${resumeId}/archive`, { method: 'POST' });
      reloadAll();
    } catch (err: any) {
      setActionError(err?.message || 'Failed to delete resume.');
    } finally {
      setBusy(false);
    }
  };

  const handleDeleteEmergencyContact = async (contactId: string) => {
    if (!window.confirm('Are you sure you want to delete this emergency contact?')) return;
    setBusy(true);
    setActionError('');
    try {
      await apiFetch(`/api/v1/employee-emergency-contacts/${contactId}/archive`, { method: 'POST' });
      reloadAll();
    } catch (err: any) {
      setActionError(err?.message || 'Failed to delete emergency contact.');
    } finally {
      setBusy(false);
    }
  };

  const handleDeleteFamilyMember = async (familyId: string) => {
    if (!window.confirm('Are you sure you want to delete this family member record?')) return;
    setBusy(true);
    setActionError('');
    try {
      await apiFetch(`/api/v1/employee-family-members/${familyId}/archive`, { method: 'POST' });
      reloadAll();
    } catch (err: any) {
      setActionError(err?.message || 'Failed to delete family member.');
    } finally {
      setBusy(false);
    }
  };

  if (loading) {
    return (
      <div className="card p-8 text-center text-muted-foreground animate-pulse">
        Loading employee profile & readiness summary...
      </div>
    );
  }

  if (error || !employee) {
    return (
      <div className="card border-red-200 p-6 space-y-4">
        <p className="text-red-700 font-semibold">{error || 'Employee record not found.'}</p>
        <Link href="/workspace/employees" className="btn-secondary">
          <ArrowLeft size={14} /> Return to Employees List
        </Link>
      </div>
    );
  }

  const fullName = [employee.first_name, employee.middle_name, employee.last_name].filter(Boolean).join(' ');

  const autoContractRef = employee?.employee_number
    ? `CTR-${employee.employee_number}-${new Date().getFullYear()}`
    : `CTR-${new Date().getFullYear()}${String(new Date().getMonth() + 1).padStart(2, '0')}${String(new Date().getDate()).padStart(2, '0')}-${Math.floor(1000 + Math.random() * 9000)}`;

  const tabs = [
    { id: 'profile', label: 'Personal & Role', icon: UserCheck },
    { id: 'contracts', label: 'Contracts', icon: FileCheck },
    { id: 'documents', label: 'Resumes, Docs & Notes', icon: FileText },
    { id: 'family', label: 'Family & Emergency', icon: Phone },
    { id: 'skills', label: 'Skills & Edu', icon: GraduationCap },
    { id: 'training', label: 'Training & Licences', icon: Award },
    { id: 'assignments', label: 'Assignments & Rotations', icon: Briefcase },
    { id: 'authorizations', label: 'Equipment Rights', icon: Shield },
    { id: 'time', label: 'Time & Leave', icon: Clock },
    { id: 'activity', label: 'Activity Log', icon: Activity },
  ];

  // Contracts list
  const contractDocs = documents.filter(d => d.document_type === 'EMPLOYMENT_CONTRACT' || String(d.title || '').toLowerCase().includes('contract'));

  // Categorized Notes & Records
  const categoryOptions = [
    { id: 'ALL', label: 'All Records' },
    { id: 'MEDICAL_CERTIFICATE', label: 'Medical Records' },
    { id: 'POLICE_CLEARANCE', label: 'Background Checks & Police Clearance' },
    { id: 'PASSPORT', label: 'Passports & National IDs' },
    { id: 'WORK_PERMIT', label: 'Visas & Work Permits' },
    { id: 'EDUCATIONAL_CERTIFICATE', label: 'Education & Certs' },
    { id: 'INSURANCE_DOCUMENT', label: 'Insurance & Liability' },
    { id: 'OTHER', label: 'General HR Notes' },
  ];

  const filteredNotesRecords = documents.filter(d => {
    if (d.document_type === 'EMPLOYMENT_CONTRACT') return false; // shown in contracts
    if (notesCategoryFilter === 'ALL') return true;
    return d.document_type === notesCategoryFilter;
  });

  return (
    <div className="space-y-6 fade-in">
      {/* Header Bar */}
      <div className="flex flex-wrap justify-between items-start gap-4 border-b pb-5">
        <div>
          <Link href="/workspace/employees" className="text-xs text-primary flex gap-1 items-center mb-2 hover:underline">
            <ArrowLeft size={14} /> All Employees
          </Link>
          <div className="flex items-center gap-3">
            <span className="text-xs font-mono font-bold bg-secondary px-2.5 py-1 rounded text-primary border">
              {employee.employee_number || 'EMP-PROFILE'}
            </span>
            <span className={`text-xs px-2.5 py-1 rounded font-semibold ${
              employee.is_active ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-red-800'
            }`}>
              {employee.is_active ? display(employee.employment_status || 'ACTIVE') : 'ARCHIVED'}
            </span>
            {employee.availability_status && (
              <span className="text-xs px-2.5 py-1 rounded bg-blue-100 text-blue-800 font-semibold">
                {display(employee.availability_status)}
              </span>
            )}
          </div>
          <h1 className="text-2xl font-bold text-foreground mt-2">{fullName}</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            {employee.job_title || 'Workforce Profile'} · Cestos Operations Field Operations
          </p>
        </div>

        {/* Action Toolbar */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Performance & Calendar Modal Opener */}
          <button
            className="btn-primary text-xs bg-indigo-700 hover:bg-indigo-800 text-white shadow-sm"
            onClick={() => setShowCalendarModal(true)}
          >
            <Calendar size={14} /> Performance & Calendar
          </button>

          {/* Admin Account Security & Password Reset Modal Opener */}
          <button
            className="btn-secondary text-xs"
            onClick={() => setShowAccountModal(true)}
          >
            <Key size={14} /> Account & Security
          </button>

          <button className="btn-secondary text-xs" onClick={() => setEditingEmployee(true)}>
            <Edit size={14} /> Edit Profile
          </button>

          <button
            disabled={busy}
            onClick={toggleArchive}
            className={`btn-secondary text-xs ${employee.is_active ? 'text-rose-700 hover:bg-rose-50' : 'text-emerald-700'}`}
          >
            <Archive size={14} /> {employee.is_active ? 'Archive' : 'Restore'}
          </button>
        </div>
      </div>

      {actionError && (
        <div className="p-3 bg-red-50 border border-red-200 text-red-700 text-sm rounded">
          {actionError}
        </div>
      )}

      {/* Tabs Navigation Bar with custom scrollbar and scroll wheel support */}
      <div
        className="border-b overflow-x-auto scrollbar-thin py-1 cursor-grab"
        onWheel={(e) => { if (e.deltaY !== 0) e.currentTarget.scrollLeft += e.deltaY; }}
      >
        <nav className="flex gap-2 min-w-max">
          {tabs.map(t => {
            const Icon = t.icon;
            const isActive = activeTab === t.id;
            return (
              <button
                key={t.id}
                onClick={() => setActiveTab(t.id as any)}
                className={`flex items-center gap-2 px-3.5 py-2 text-xs font-semibold rounded border transition-all whitespace-nowrap ${
                  isActive
                    ? 'bg-primary text-white border-primary shadow-sm'
                    : 'bg-card text-muted-foreground border-transparent hover:bg-muted'
                }`}
              >
                <Icon size={14} />
                {t.label}
              </button>
            );
          })}
        </nav>
      </div>

      {/* TAB 1: Unified Personal & Role Dashboard Grid */}
      {activeTab === 'profile' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6 fade-in">
          {/* Card 1: Personal Information with Embedded Profile Image */}
          <div className="xl:col-span-2 card p-6 space-y-6">
            <div className="flex flex-wrap sm:flex-nowrap items-start gap-6 border-b pb-4">
              {/* Embedded Profile Photo */}
              <div className="relative group shrink-0 mx-auto sm:mx-0">
                {photoUrl ? (
                  <img
                    src={photoUrl}
                    alt={fullName}
                    className="w-28 h-32 rounded-lg object-cover border-2 border-primary shadow-sm"
                  />
                ) : (
                  <div className="w-28 h-32 rounded-lg bg-muted flex flex-col items-center justify-center text-muted-foreground border-2 border-dashed">
                    <User size={36} />
                    <span className="text-[10px] mt-1 font-semibold">No Photo</span>
                  </div>
                )}
                <label className="absolute bottom-1 right-1 bg-primary text-white p-1.5 rounded-full shadow cursor-pointer hover:bg-primary/90 transition-all" title="Upload profile photo">
                  <Upload size={12} />
                  <input
                    type="file"
                    accept=".png,.jpg,.jpeg"
                    className="hidden"
                    onChange={handleQuickPhotoUpload}
                  />
                </label>
              </div>

              {/* Personal Details DL */}
              <div className="space-y-3 flex-1 w-full">
                <h2 className="text-base font-bold text-foreground">Personal Information</h2>
                <dl className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                  <div>
                    <dt className="text-muted-foreground">Full Name</dt>
                    <dd className="font-semibold text-foreground text-sm mt-0.5">{fullName}</dd>
                  </div>
                  <div>
                    <dt className="text-muted-foreground">Preferred Name</dt>
                    <dd className="font-semibold text-foreground text-sm mt-0.5">{display(employee.preferred_name)}</dd>
                  </div>
                  <div>
                    <dt className="text-muted-foreground">Gender</dt>
                    <dd className="font-semibold text-foreground text-sm mt-0.5">{display(employee.gender)}</dd>
                  </div>
                  <div>
                    <dt className="text-muted-foreground">Date of Birth</dt>
                    <dd className="font-semibold text-foreground text-sm mt-0.5">{display(employee.date_of_birth)}</dd>
                  </div>
                  <div>
                    <dt className="text-muted-foreground">Nationality</dt>
                    <dd className="font-semibold text-foreground text-sm mt-0.5">{display(employee.nationality)}</dd>
                  </div>
                  <div>
                    <dt className="text-muted-foreground">Marital Status</dt>
                    <dd className="font-semibold text-foreground text-sm mt-0.5">{display(employee.marital_status)}</dd>
                  </div>
                </dl>
              </div>
            </div>

            {/* Contact & Residential Details */}
            <div className="space-y-3 pt-1">
              <h3 className="text-xs font-bold uppercase text-muted-foreground tracking-wider border-b pb-1">
                Contact & Address Details
              </h3>
              <dl className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                <div>
                  <dt className="text-muted-foreground">Personal Email</dt>
                  <dd className="font-semibold text-foreground text-sm mt-0.5">{display(employee.personal_email)}</dd>
                </div>
                <div>
                  <dt className="text-muted-foreground">Work Email</dt>
                  <dd className="font-semibold text-foreground text-sm mt-0.5">{display(employee.work_email)}</dd>
                </div>
                <div>
                  <dt className="text-muted-foreground">Primary Phone</dt>
                  <dd className="font-semibold text-foreground text-sm mt-0.5">{display(employee.primary_phone)}</dd>
                </div>
                <div>
                  <dt className="text-muted-foreground">Secondary Phone</dt>
                  <dd className="font-semibold text-foreground text-sm mt-0.5">{display(employee.secondary_phone)}</dd>
                </div>
                <div className="sm:col-span-2">
                  <dt className="text-muted-foreground">Residential Address</dt>
                  <dd className="font-semibold text-foreground text-sm mt-0.5">{display(employee.residential_address)}</dd>
                </div>
                <div>
                  <dt className="text-muted-foreground">City / Region</dt>
                  <dd className="font-semibold text-foreground text-sm mt-0.5">
                    {[employee.city, employee.county_or_region].filter(Boolean).join(', ') || '—'}
                  </dd>
                </div>
                <div>
                  <dt className="text-muted-foreground">Country</dt>
                  <dd className="font-semibold text-foreground text-sm mt-0.5">{display(employee.country)}</dd>
                </div>
              </dl>
            </div>
          </div>

          {/* Card 2: Work Readiness Overview */}
          <div className="card p-6 space-y-4">
            <h2 className="text-base font-bold text-foreground border-b pb-2 flex items-center justify-between">
              <span>Work Readiness Overview</span>
              <span className="text-xs font-semibold px-2 py-0.5 rounded bg-emerald-100 text-emerald-800">
                {overview?.compliance?.status || 'VALID'}
              </span>
            </h2>
            {overview ? (
              <dl className="space-y-3 text-xs">
                <div className="flex justify-between border-b pb-1.5">
                  <dt className="text-muted-foreground">Department:</dt>
                  <dd className="font-semibold text-foreground">{display(overview.department?.name)}</dd>
                </div>
                <div className="flex justify-between border-b pb-1.5">
                  <dt className="text-muted-foreground">Position:</dt>
                  <dd className="font-semibold text-foreground">{display(overview.position?.title)}</dd>
                </div>
                <div className="flex justify-between border-b pb-1.5">
                  <dt className="text-muted-foreground">Current Project:</dt>
                  <dd className="font-semibold text-foreground">{display(overview.current_project_name)}</dd>
                </div>
                <div className="flex justify-between border-b pb-1.5">
                  <dt className="text-muted-foreground">Current Location:</dt>
                  <dd className="font-semibold text-foreground">{display(overview.current_location_name)}</dd>
                </div>
                <div className="flex justify-between border-b pb-1.5">
                  <dt className="text-muted-foreground">Availability:</dt>
                  <dd className="font-semibold text-blue-700">{display(overview.availability_status || employee.availability_status)}</dd>
                </div>
              </dl>
            ) : (
              <p className="text-xs text-muted-foreground">Loading readiness status...</p>
            )}

            {overview?.compliance?.issues?.length ? (
              <div className="space-y-1.5 pt-2">
                <span className="text-[11px] font-bold text-amber-800 block">Readiness Warnings:</span>
                <ul className="text-xs space-y-1 bg-amber-50 p-2.5 rounded border border-amber-200">
                  {overview.compliance.issues.map((iss: any, idx: number) => (
                    <li key={idx} className="text-amber-900 flex items-start gap-1.5">
                      <span className="font-bold">•</span>
                      <span>{iss.message || display(iss)}</span>
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}
          </div>

        

          {/* Card 4: Emergency Contacts (Max Height Collapsible Container) */}
          <div className="card p-5 space-y-3">
            <div className="flex justify-between items-center border-b pb-2">
              <h2 className="text-sm font-bold text-foreground flex items-center gap-1.5">
                <Phone size={15} className="text-primary" /> Emergency Contacts
              </h2>
              <button
                className="btn-secondary text-[11px] py-1 px-2"
                onClick={() => setActiveSubModal({
                  name: 'Add Emergency Contact',
                  schemaName: 'EmergencyContactCreate',
                  path: `/api/v1/employees/${employeeId}/emergency-contacts`,
                })}
              >
                <Plus size={12} /> Add
              </button>
            </div>

            <div className="max-h-64 overflow-y-auto scrollbar-thin pr-1 space-y-2">
              {emergency.length === 0 ? (
                <p className="text-xs text-muted-foreground py-4 text-center">No emergency contacts recorded.</p>
              ) : (
                emergency.map((item, idx) => (
                  <div key={item.id || idx} className="p-2.5 bg-muted/30 border rounded text-xs flex items-center justify-between gap-2">
                    <div>
                      <p className="font-bold text-foreground">{item.full_name} ({item.relationship})</p>
                      <p className="text-muted-foreground text-[11px]">{item.primary_phone}</p>
                    </div>
                    <button
                      type="button"
                      className="text-rose-700 hover:bg-rose-50 p-1 rounded"
                      onClick={() => handleDeleteEmergencyContact(item.id)}
                      title="Delete contact"
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>

            {/* Card 3: Merged Employment & Role Details */}
          <div className="card p-6 space-y-4">
            <h2 className="text-base font-bold text-foreground border-b pb-2">Employment & Role Details</h2>
            <dl className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
              <div>
                <dt className="text-muted-foreground">Employee Number</dt>
                <dd className="font-semibold text-foreground text-sm mt-0.5">{display(employee.employee_number)}</dd>
              </div>
              <div>
                <dt className="text-muted-foreground">Job Title</dt>
                <dd className="font-semibold text-foreground text-sm mt-0.5">{display(employee.job_title)}</dd>
              </div>
              <div>
                <dt className="text-muted-foreground">Employment Type</dt>
                <dd className="font-semibold text-foreground text-sm mt-0.5">{display(employee.employment_type)}</dd>
              </div>
              <div>
                <dt className="text-muted-foreground">Employment Status</dt>
                <dd className="font-semibold text-foreground text-sm mt-0.5">{display(employee.employment_status)}</dd>
              </div>
              <div>
                <dt className="text-muted-foreground">Hire Date</dt>
                <dd className="font-semibold text-foreground text-sm mt-0.5">{display(employee.hire_date)}</dd>
              </div>
              <div>
                <dt className="text-muted-foreground">Contract End Date</dt>
                <dd className="font-semibold text-foreground text-sm mt-0.5">{display(employee.contract_end_date)}</dd>
              </div>
            </dl>
          </div>

          {/* Card 5: Family Members (Max Height Collapsible Container) */}
          <div className="card p-5 space-y-3">
            <div className="flex justify-between items-center border-b pb-2">
              <h2 className="text-sm font-bold text-foreground flex items-center gap-1.5">
                <UserCheck size={15} className="text-primary" /> Family Members
              </h2>
              <button
                className="btn-secondary text-[11px] py-1 px-2"
                onClick={() => setActiveSubModal({
                  name: 'Add Family Member',
                  schemaName: 'EmployeeFamilyCreate',
                  path: `/api/v1/employees/${employeeId}/family`,
                })}
              >
                <Plus size={12} /> Add
              </button>
            </div>

            <div className="max-h-64 overflow-y-auto scrollbar-thin pr-1 space-y-2">
              {family.length === 0 ? (
                <p className="text-xs text-muted-foreground py-4 text-center">No family members recorded.</p>
              ) : (
                family.map((item, idx) => (
                  <div key={item.id || idx} className="p-2.5 bg-muted/30 border rounded text-xs flex items-center justify-between gap-2">
                    <div>
                      <p className="font-bold text-foreground">{item.full_name}</p>
                      <p className="text-muted-foreground text-[11px]">{item.relationship_type}</p>
                    </div>
                    <button
                      type="button"
                      className="text-rose-700 hover:bg-rose-50 p-1 rounded"
                      onClick={() => handleDeleteFamilyMember(item.id)}
                      title="Delete family member"
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Card 6: Current Project Assignments (Max Height Collapsible Container) */}
          <div className="card p-5 space-y-3">
            <div className="flex justify-between items-center border-b pb-2">
              <h2 className="text-sm font-bold text-foreground flex items-center gap-1.5">
                <Briefcase size={15} className="text-primary" /> Project Assignments
              </h2>
              <button
                className="btn-secondary text-[11px] py-1 px-2"
                onClick={() => setActiveSubModal({
                  name: 'Assign to Project',
                  schemaName: 'EmployeeAssignmentCreate',
                  path: `/api/v1/employees/${employeeId}/assignments`,
                })}
              >
                <Plus size={12} /> Assign
              </button>
            </div>

            <div className="max-h-64 overflow-y-auto scrollbar-thin pr-1 space-y-2">
              {assignments.length === 0 ? (
                <p className="text-xs text-muted-foreground py-4 text-center">No active project assignments.</p>
              ) : (
                assignments.map((item, idx) => (
                  <div key={item.id || idx} className="p-2.5 bg-muted/30 border rounded text-xs space-y-1">
                    <div className="flex justify-between font-bold text-foreground">
                      <span>{item.assignment_number || 'Assignment'}</span>
                      <span className="text-primary font-semibold">{display(item.status)}</span>
                    </div>
                    <p className="text-muted-foreground text-[11px]">
                      Role: {display(item.role_on_project || 'Member')} · Start: {display(item.start_date)}
                    </p>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Card 7: Recent Activity History (Max Height Collapsible Container) */}
          <div className="card p-5 space-y-3">
            <div className="flex justify-between items-center border-b pb-2">
              <h2 className="text-sm font-bold text-foreground flex items-center gap-1.5">
                <Activity size={15} className="text-primary" /> Recent Audit Activity
              </h2>
            </div>

            <div className="max-h-64 overflow-y-auto scrollbar-thin pr-1 space-y-2">
              {activities.length === 0 ? (
                <p className="text-xs text-muted-foreground py-4 text-center">No recent activity events.</p>
              ) : (
                activities.slice(0, 10).map((act, idx) => (
                  <div key={act.id || idx} className="p-2 bg-muted/20 border-l-2 border-primary pl-2.5 text-xs space-y-0.5">
                    <p className="font-semibold text-foreground">{act.action || act.summary}</p>
                    <p className="text-[10px] text-muted-foreground">{display(act.occurred_at || act.created_at)}</p>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* TAB: Contracts Management */}
      {activeTab === 'contracts' && (
        <div className="space-y-6 fade-in">
          {/* Active Contract Alert Banner */}
          <div className="p-4 rounded border bg-indigo-50/60 border-indigo-200 flex flex-wrap justify-between items-center gap-4">
            <div>
              <span className="text-xs font-bold text-indigo-900 block uppercase tracking-wider">
                Contract Expiration & Reminders Status
              </span>
              <p className="text-xs text-indigo-800 mt-1">
                Contract end date: <strong>{display(employee.contract_end_date)}</strong>. Cestos automated alert rules notify management before contract expiration.
              </p>
            </div>
            <button
              className="btn-primary text-xs bg-indigo-700 hover:bg-indigo-800"
              onClick={() => setShowContractModal(true)}
            >
              <Plus size={14} /> Upload New Contract Document
            </button>
          </div>

          {/* Contracts List Table */}
          <div className="card p-5 space-y-4">
            <h2 className="text-base font-bold text-foreground border-b pb-3 flex items-center gap-2">
              <FileCheck size={18} className="text-indigo-700" />
              Employee Contracts & Agreements ({contractDocs.length})
            </h2>

            {contractDocs.length === 0 ? (
              <div className="p-8 text-center text-muted-foreground space-y-2">
                <FileCheck size={32} className="mx-auto opacity-40" />
                <p className="text-sm font-semibold text-foreground">No contract documents uploaded yet</p>
                <p className="text-xs">Click "Upload New Contract Document" to attach an employment contract.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-xs text-left">
                  <thead className="bg-muted text-muted-foreground font-semibold">
                    <tr>
                      <th className="p-2.5">Title</th>
                      <th className="p-2.5">Reference #</th>
                      <th className="p-2.5">Start Date</th>
                      <th className="p-2.5">Expiration / End Date</th>
                      <th className="p-2.5 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {contractDocs.map((item, idx) => (
                      <tr key={item.id || idx} className="border-t hover:bg-muted/30">
                        <td className="p-2.5 font-semibold text-foreground">{item.title}</td>
                        <td className="p-2.5">{display(item.document_number)}</td>
                        <td className="p-2.5">{display(item.issue_date)}</td>
                        <td className="p-2.5 font-semibold text-indigo-800">{display(item.expiry_date)}</td>
                        <td className="p-2.5 text-right space-x-2">
                          <button
                            type="button"
                            className="btn-secondary text-[11px] py-1 px-2"
                            disabled={busy}
                            onClick={() => handleViewDoc(item.id)}
                          >
                            <ExternalLink size={12} /> View
                          </button>
                          <button
                            type="button"
                            className="btn-secondary text-[11px] py-1 px-2"
                            disabled={busy}
                            onClick={() => handleDownloadDoc(item.id, item.title)}
                          >
                            <Download size={12} /> Download
                          </button>
                          <button
                            type="button"
                            className="btn-secondary text-[11px] py-1 px-2 text-rose-700 hover:bg-rose-50"
                            disabled={busy}
                            onClick={() => handleDeleteDoc(item.id)}
                          >
                            <Trash2 size={12} /> Delete
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 2: Family & Emergency Contacts */}
      {activeTab === 'family' && (
        <div className="space-y-6 fade-in">
          {/* Emergency Contacts Card */}
          <div className="card p-5 space-y-4">
            <div className="flex justify-between items-center border-b pb-3">
              <h2 className="text-base font-bold text-foreground">Emergency Contacts</h2>
              <button
                className="btn-primary text-xs"
                onClick={() => setActiveSubModal({
                  name: 'Add Emergency Contact',
                  schemaName: 'EmergencyContactCreate',
                  path: `/api/v1/employees/${employeeId}/emergency-contacts`,
                })}
              >
                <Plus size={14} /> Add Emergency Contact
              </button>
            </div>

            {emergency.length === 0 ? (
              <p className="text-xs text-muted-foreground py-4 text-center">No emergency contacts recorded.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-xs text-left">
                  <thead className="bg-muted text-muted-foreground font-semibold">
                    <tr>
                      <th className="p-2.5">Name</th>
                      <th className="p-2.5">Relationship</th>
                      <th className="p-2.5">Phone</th>
                      <th className="p-2.5">Primary</th>
                      <th className="p-2.5 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {emergency.map((item, idx) => (
                      <tr key={item.id || idx} className="border-t hover:bg-muted/30">
                        <td className="p-2.5 font-semibold text-foreground">{item.full_name}</td>
                        <td className="p-2.5">{item.relationship}</td>
                        <td className="p-2.5">{item.primary_phone}</td>
                        <td className="p-2.5">{item.is_primary ? 'Yes' : 'No'}</td>
                        <td className="p-2.5 text-right">
                          <button
                            type="button"
                            title="Delete contact"
                            className="btn-secondary text-[11px] py-1 px-2 text-rose-700 hover:bg-rose-50"
                            disabled={busy}
                            onClick={() => handleDeleteEmergencyContact(item.id)}
                          >
                            <Trash2 size={12} /> Delete
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Family Members Card */}
          <div className="card p-5 space-y-4">
            <div className="flex justify-between items-center border-b pb-3">
              <h2 className="text-base font-bold text-foreground">Family Members</h2>
              <button
                className="btn-primary text-xs"
                onClick={() => setActiveSubModal({
                  name: 'Add Family Member',
                  schemaName: 'EmployeeFamilyCreate',
                  path: `/api/v1/employees/${employeeId}/family`,
                })}
              >
                <Plus size={14} /> Add Family Member
              </button>
            </div>

            {family.length === 0 ? (
              <p className="text-xs text-muted-foreground py-4 text-center">No family members recorded.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-xs text-left">
                  <thead className="bg-muted text-muted-foreground font-semibold">
                    <tr>
                      <th className="p-2.5">Name</th>
                      <th className="p-2.5">Relationship</th>
                      <th className="p-2.5">Dependent</th>
                      <th className="p-2.5">Next of Kin</th>
                      <th className="p-2.5 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {family.map((item, idx) => (
                      <tr key={item.id || idx} className="border-t hover:bg-muted/30">
                        <td className="p-2.5 font-semibold text-foreground">{item.full_name}</td>
                        <td className="p-2.5">{item.relationship_type}</td>
                        <td className="p-2.5">{item.is_dependent ? 'Yes' : 'No'}</td>
                        <td className="p-2.5">{item.is_next_of_kin ? 'Yes' : 'No'}</td>
                        <td className="p-2.5 text-right">
                          <button
                            type="button"
                            title="Delete family member"
                            className="btn-secondary text-[11px] py-1 px-2 text-rose-700 hover:bg-rose-50"
                            disabled={busy}
                            onClick={() => handleDeleteFamilyMember(item.id)}
                          >
                            <Trash2 size={12} /> Delete
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 3: Resumes & Documents */}
      {activeTab === 'documents' && (
        <div className="space-y-6 fade-in">

             {/* Resumes Card */}
          <div className="card p-5 space-y-4">
            <div className="flex justify-between items-center border-b pb-3">
              <h2 className="text-base font-bold text-foreground">Resumes / CVs</h2>
              <button
                className="btn-primary text-xs"
                onClick={() => setActiveSubModal({
                  name: 'Upload Resume',
                  schemaName: 'EmployeeResumeCreate',
                  path: `/api/v1/employees/${employeeId}/resumes/upload`,
                })}
              >
                <Plus size={14} /> Upload Resume
              </button>
            </div>

            {resumes.length === 0 ? (
              <p className="text-xs text-muted-foreground py-4 text-center">No resumes uploaded.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-xs text-left">
                  <thead className="bg-muted text-muted-foreground font-semibold">
                    <tr>
                      <th className="p-2.5">Title</th>
                      <th className="p-2.5">Current</th>
                      <th className="p-2.5">Uploaded At</th>
                      <th className="p-2.5 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {resumes.map((item, idx) => (
                      <tr key={item.id || idx} className="border-t hover:bg-muted/30">
                        <td className="p-2.5 font-semibold text-foreground">{item.title}</td>
                        <td className="p-2.5">{item.is_current ? 'Yes' : 'No'}</td>
                        <td className="p-2.5">{display(item.uploaded_at)}</td>
                        <td className="p-2.5 text-right space-x-2">
                          <button
                            type="button"
                            title="View resume"
                            className="btn-secondary text-[11px] py-1 px-2"
                            disabled={busy}
                            onClick={() => handleViewResume(item.id)}
                          >
                            <ExternalLink size={12} /> View
                          </button>
                          <button
                            type="button"
                            title="Download resume"
                            className="btn-secondary text-[11px] py-1 px-2"
                            disabled={busy}
                            onClick={() => handleDownloadResume(item.id, item.title)}
                          >
                            <Download size={12} /> Download
                          </button>
                          <button
                            type="button"
                            title="Delete resume"
                            className="btn-secondary text-[11px] py-1 px-2 text-rose-700 hover:bg-rose-50"
                            disabled={busy}
                            onClick={() => handleDeleteResume(item.id)}
                          >
                            <Trash2 size={12} /> Delete
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
          
          {/* Documents Card */}
          <div className="card p-5 space-y-4">
            <div className="flex justify-between items-center border-b pb-3">
              <h2 className="text-base font-bold text-foreground">Supporting Documents</h2>
              <button
                className="btn-primary text-xs"
                onClick={() => setActiveSubModal({
                  name: 'Upload Document',
                  schemaName: 'EmployeeDocumentCreate',
                  path: `/api/v1/employees/${employeeId}/documents/upload`,
                })}
              >
                <Plus size={14} /> Upload Document
              </button>
            </div>

            {documents.length === 0 ? (
              <p className="text-xs text-muted-foreground py-4 text-center">No supporting documents uploaded.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-xs text-left">
                  <thead className="bg-muted text-muted-foreground font-semibold">
                    <tr>
                      <th className="p-2.5">Title</th>
                      <th className="p-2.5">Type</th>
                      <th className="p-2.5">Expiry Date</th>
                      <th className="p-2.5">Status</th>
                      <th className="p-2.5 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {documents.map((item, idx) => (
                      <tr key={item.id || idx} className="border-t hover:bg-muted/30">
                        <td className="p-2.5 font-semibold text-foreground">{item.title}</td>
                        <td className="p-2.5">{display(item.document_type)}</td>
                        <td className="p-2.5">{display(item.expiry_date)}</td>
                        <td className="p-2.5">{display(item.verification_status || 'VERIFIED')}</td>
                        <td className="p-2.5 text-right space-x-2">
                          <button
                            type="button"
                            title="View document"
                            className="btn-secondary text-[11px] py-1 px-2"
                            disabled={busy}
                            onClick={() => handleViewDoc(item.id)}
                          >
                            <ExternalLink size={12} /> View
                          </button>
                          <button
                            type="button"
                            title="Download document"
                            className="btn-secondary text-[11px] py-1 px-2"
                            disabled={busy}
                            onClick={() => handleDownloadDoc(item.id, item.title)}
                          >
                            <Download size={12} /> Download
                          </button>
                          <button
                            type="button"
                            title="Delete document"
                            className="btn-secondary text-[11px] py-1 px-2 text-rose-700 hover:bg-rose-50"
                            disabled={busy}
                            onClick={() => handleDeleteDoc(item.id)}
                          >
                            <Trash2 size={12} /> Delete
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

       

          {/* Categorized HR Notes & Records Card */}
          <div className="card p-5 space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-4 border-b pb-3">
              <div>
                <h2 className="text-base font-bold text-foreground">HR Notes, Medical Records & Categorized Files</h2>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Record medical certificates, background checks, IDs, visas, and general HR observations.
                </p>
              </div>
              <button
                className="btn-primary text-xs"
                onClick={() => setShowNoteRecordModal(true)}
              >
                <Plus size={14} /> Write Note & Upload Record
              </button>
            </div>

            {/* Category Filter Pills */}
            <div className="flex items-center gap-2 overflow-x-auto scrollbar-thin pb-2">
              {categoryOptions.map(cat => {
                const isActive = notesCategoryFilter === cat.id;
                return (
                  <button
                    key={cat.id}
                    onClick={() => setNotesCategoryFilter(cat.id)}
                    className={`px-3 py-1.5 text-xs font-semibold rounded-full border transition-all whitespace-nowrap ${
                      isActive
                        ? 'bg-primary text-white border-primary shadow-sm'
                        : 'bg-card text-muted-foreground border-transparent hover:bg-muted'
                    }`}
                  >
                    {cat.label}
                  </button>
                );
              })}
            </div>

            {/* Records & Notes List */}
            {filteredNotesRecords.length === 0 ? (
              <p className="text-xs text-muted-foreground py-6 text-center">
                No notes or records found in this category.
              </p>
            ) : (
              <div className="space-y-3">
                {filteredNotesRecords.map((item, idx) => (
                  <div key={item.id || idx} className="p-4 border rounded bg-card space-y-2 hover:border-primary/40 transition-all">
                    <div className="flex flex-wrap justify-between items-center gap-2">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-foreground">{item.title}</span>
                        <span className="text-[10px] uppercase font-semibold px-2 py-0.5 rounded bg-secondary text-primary border">
                          {display(item.document_type)}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-[11px] text-muted-foreground">{display(item.created_at)}</span>
                        <button
                          type="button"
                          className="btn-secondary text-[11px] py-1 px-2"
                          disabled={busy}
                          onClick={() => handleViewDoc(item.id)}
                        >
                          <ExternalLink size={12} /> View
                        </button>
                        <button
                          type="button"
                          className="btn-secondary text-[11px] py-1 px-2"
                          disabled={busy}
                          onClick={() => handleDownloadDoc(item.id, item.title)}
                        >
                          <Download size={12} /> Download
                        </button>
                        <button
                          type="button"
                          className="btn-secondary text-[11px] py-1 px-2 text-rose-700 hover:bg-rose-50"
                          disabled={busy}
                          onClick={() => handleDeleteDoc(item.id)}
                        >
                          <Trash2 size={12} /> Delete
                        </button>
                      </div>
                    </div>
                    {item.notes && (
                      <p className="text-xs text-muted-foreground bg-muted/30 p-2.5 rounded border">
                        {item.notes}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 4: Skills & Qualifications */}
      {activeTab === 'skills' && (
        <div className="space-y-6 fade-in">
          {/* Qualifications */}
          <div className="card p-5 space-y-4">
            <div className="flex justify-between items-center border-b pb-3">
              <h2 className="text-base font-bold text-foreground">Qualifications & Degrees</h2>
              <button
                className="btn-primary text-xs"
                onClick={() => setActiveSubModal({
                  name: 'Add Qualification',
                  schemaName: 'QualificationCreate',
                  path: `/api/v1/employees/${employeeId}/qualifications`,
                })}
              >
                <Plus size={14} /> Add Qualification
              </button>
            </div>

            {qualifications.length === 0 ? (
              <p className="text-xs text-muted-foreground py-4 text-center">No qualifications recorded.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-xs text-left">
                  <thead className="bg-muted text-muted-foreground font-semibold">
                    <tr>
                      <th className="p-2.5">Name</th>
                      <th className="p-2.5">Type</th>
                      <th className="p-2.5">Institution</th>
                      <th className="p-2.5">Completion Date</th>
                    </tr>
                  </thead>
                  <tbody>
                    {qualifications.map((item, idx) => (
                      <tr key={item.id || idx} className="border-t hover:bg-muted/30">
                        <td className="p-2.5 font-semibold text-foreground">{item.qualification_name}</td>
                        <td className="p-2.5">{item.qualification_type}</td>
                        <td className="p-2.5">{item.institution}</td>
                        <td className="p-2.5">{display(item.completion_date)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Skills */}
          <div className="card p-5 space-y-4">
            <div className="flex justify-between items-center border-b pb-3">
              <h2 className="text-base font-bold text-foreground">Skills & Competencies</h2>
              <button
                className="btn-primary text-xs"
                onClick={() => setActiveSubModal({
                  name: 'Add Skill',
                  schemaName: 'EmployeeSkillCreate',
                  path: `/api/v1/employees/${employeeId}/skills`,
                })}
              >
                <Plus size={14} /> Add Skill
              </button>
            </div>

            {skills.length === 0 ? (
              <p className="text-xs text-muted-foreground py-4 text-center">No skills added.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-xs text-left">
                  <thead className="bg-muted text-muted-foreground font-semibold">
                    <tr>
                      <th className="p-2.5">Skill</th>
                      <th className="p-2.5">Proficiency</th>
                      <th className="p-2.5">Experience (Years)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {skills.map((item, idx) => (
                      <tr key={item.id || idx} className="border-t hover:bg-muted/30">
                        <td className="p-2.5 font-semibold text-foreground">{item.skill_name || display(item.skill_id)}</td>
                        <td className="p-2.5">{display(item.proficiency_level)}</td>
                        <td className="p-2.5">{display(item.years_experience)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 5: Training & Licences */}
      {activeTab === 'training' && (
        <div className="space-y-6 fade-in">
          {/* Licenses Card */}
          <div className="card p-5 space-y-4">
            <div className="flex justify-between items-center border-b pb-3">
              <h2 className="text-base font-bold text-foreground">Licences & Certifications</h2>
              <button
                className="btn-primary text-xs"
                onClick={() => setActiveSubModal({
                  name: 'Add License',
                  schemaName: 'LicenseCreate',
                  path: `/api/v1/employees/${employeeId}/licenses`,
                })}
              >
                <Plus size={14} /> Add License
              </button>
            </div>

            {licenses.length === 0 ? (
              <p className="text-xs text-muted-foreground py-4 text-center">No licenses recorded.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-xs text-left">
                  <thead className="bg-muted text-muted-foreground font-semibold">
                    <tr>
                      <th className="p-2.5">License Number</th>
                      <th className="p-2.5">Type</th>
                      <th className="p-2.5">Expiry Date</th>
                      <th className="p-2.5">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {licenses.map((item, idx) => (
                      <tr key={item.id || idx} className="border-t hover:bg-muted/30">
                        <td className="p-2.5 font-semibold text-foreground">{item.license_number}</td>
                        <td className="p-2.5">{display(item.license_type)}</td>
                        <td className="p-2.5">{display(item.expiry_date)}</td>
                        <td className="p-2.5">{display(item.status || 'ACTIVE')}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Training Card */}
          <div className="card p-5 space-y-4">
            <div className="flex justify-between items-center border-b pb-3">
              <h2 className="text-base font-bold text-foreground">Training History</h2>
              <button
                className="btn-primary text-xs"
                onClick={() => setActiveSubModal({
                  name: 'Add Training',
                  schemaName: 'TrainingCreate',
                  path: `/api/v1/employees/${employeeId}/training`,
                })}
              >
                <Plus size={14} /> Add Training
              </button>
            </div>

            {training.length === 0 ? (
              <p className="text-xs text-muted-foreground py-4 text-center">No training records found.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-xs text-left">
                  <thead className="bg-muted text-muted-foreground font-semibold">
                    <tr>
                      <th className="p-2.5">Training Name</th>
                      <th className="p-2.5">Provider</th>
                      <th className="p-2.5">Completion Date</th>
                      <th className="p-2.5">Expiry Date</th>
                    </tr>
                  </thead>
                  <tbody>
                    {training.map((item, idx) => (
                      <tr key={item.id || idx} className="border-t hover:bg-muted/30">
                        <td className="p-2.5 font-semibold text-foreground">{item.training_name}</td>
                        <td className="p-2.5">{item.provider}</td>
                        <td className="p-2.5">{display(item.completion_date)}</td>
                        <td className="p-2.5">{display(item.expiry_date)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 6: Assignments & Rotations */}
      {activeTab === 'assignments' && (
        <div className="space-y-6 fade-in">
          {/* Assignments */}
          <div className="card p-5 space-y-4">
            <div className="flex justify-between items-center border-b pb-3">
              <h2 className="text-base font-bold text-foreground">Project Assignments</h2>
              <button
                className="btn-primary text-xs"
                onClick={() => setActiveSubModal({
                  name: 'Assign to Project',
                  schemaName: 'EmployeeAssignmentCreate',
                  path: `/api/v1/employees/${employeeId}/assignments`,
                })}
              >
                <Plus size={14} /> New Assignment
              </button>
            </div>

            {assignments.length === 0 ? (
              <p className="text-xs text-muted-foreground py-4 text-center">No project assignments recorded.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-xs text-left">
                  <thead className="bg-muted text-muted-foreground font-semibold">
                    <tr>
                      <th className="p-2.5">Assignment Number</th>
                      <th className="p-2.5">Role</th>
                      <th className="p-2.5">Start Date</th>
                      <th className="p-2.5">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {assignments.map((item, idx) => (
                      <tr key={item.id || idx} className="border-t hover:bg-muted/30">
                        <td className="p-2.5 font-semibold text-foreground">{item.assignment_number || '—'}</td>
                        <td className="p-2.5">{display(item.role_on_project || 'Member')}</td>
                        <td className="p-2.5">{display(item.start_date)}</td>
                        <td className="p-2.5">{display(item.status)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 7: Asset Authorizations */}
      {activeTab === 'authorizations' && (
        <div className="card p-5 space-y-4 fade-in">
          <div className="flex justify-between items-center border-b pb-3">
            <h2 className="text-base font-bold text-foreground">Equipment & Asset Authorizations</h2>
            <button
              className="btn-primary text-xs"
              onClick={() => setActiveSubModal({
                name: 'Add Authorization',
                schemaName: 'AssetAuthorizationCreate',
                path: `/api/v1/employees/${employeeId}/asset-authorizations`,
              })}
            >
              <Plus size={14} /> Add Authorization
            </button>
          </div>

          {authorizations.length === 0 ? (
            <p className="text-xs text-muted-foreground py-4 text-center">No asset authorizations recorded.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead className="bg-muted text-muted-foreground font-semibold">
                  <tr>
                    <th className="p-2.5">Asset / Category</th>
                    <th className="p-2.5">Type</th>
                    <th className="p-2.5">Valid Until</th>
                    <th className="p-2.5">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {authorizations.map((item, idx) => (
                    <tr key={item.id || idx} className="border-t hover:bg-muted/30">
                      <td className="p-2.5 font-semibold text-foreground">{display(item.asset_id || item.asset_category_id)}</td>
                      <td className="p-2.5">{display(item.authorization_type)}</td>
                      <td className="p-2.5">{display(item.valid_until)}</td>
                      <td className="p-2.5">{display(item.status)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* TAB 8: Time Logs & Leave */}
      {activeTab === 'time' && (
        <div className="space-y-6 fade-in">
          {/* Header Action Bar for Time & Leave */}
          <div className="flex flex-wrap justify-between items-center gap-3 border-b pb-4">
            <div>
              <h2 className="text-base font-bold text-foreground">Time Tracking & Leave Requests</h2>
              <p className="text-xs text-muted-foreground mt-0.5">
                Log working time (single day or date ranges) and book leave requests.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <button
                className="btn-primary text-xs"
                onClick={() => setShowTimeLogModal(true)}
              >
                <Clock size={14} /> Log Working Time
              </button>
              <button
                className="btn-primary text-xs bg-emerald-700 hover:bg-emerald-800"
                onClick={() => setShowLeaveModal(true)}
              >
                <Calendar size={14} /> Book Leave
              </button>
            </div>
          </div>

          {/* Time Logs Card */}
          <div className="card p-5 space-y-4">
            <h3 className="text-sm font-bold text-foreground border-b pb-2 flex items-center justify-between">
              <span>Time Logs ({timeLogs.length})</span>
            </h3>

            {timeLogs.length === 0 ? (
              <p className="text-xs text-muted-foreground py-4 text-center">No time logs recorded.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-xs text-left">
                  <thead className="bg-muted text-muted-foreground font-semibold">
                    <tr>
                      <th className="p-2.5">Date / Period</th>
                      <th className="p-2.5">Check In</th>
                      <th className="p-2.5">Check Out</th>
                      <th className="p-2.5">Hours</th>
                      <th className="p-2.5">Work Summary / Notes</th>
                      <th className="p-2.5 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {timeLogs.map((item, idx) => (
                      <tr key={item.id || idx} className="border-t hover:bg-muted/30">
                        <td className="p-2.5 font-semibold text-foreground">{display(item.date)}</td>
                        <td className="p-2.5">{display(item.check_in)}</td>
                        <td className="p-2.5">{display(item.check_out)}</td>
                        <td className="p-2.5 font-semibold">{item.hours_worked ?? '—'} hrs</td>
                        <td className="p-2.5 max-w-xs truncate">{display(item.notes)}</td>
                        <td className="p-2.5 text-right space-x-2">
                          <button
                            type="button"
                            className="btn-secondary text-[11px] py-1 px-2"
                            onClick={() => setEditingItem({ kind: 'time', row: item })}
                          >
                            <Edit size={12} /> Edit
                          </button>
                          <button
                            type="button"
                            className="btn-secondary text-[11px] py-1 px-2 text-rose-700 hover:bg-rose-50"
                            onClick={async () => {
                              if (!window.confirm('Delete this time log entry?')) return;
                              setBusy(true);
                              try {
                                await apiFetch(`/api/v1/employees/${employeeId}/time-logs/${item.id}`, { method: 'DELETE' });
                              } catch {
                                await apiFetch(`/api/v1/time-logs/${item.id}`, { method: 'DELETE' });
                              } finally {
                                setBusy(false);
                                reloadAll();
                              }
                            }}
                          >
                            <Trash2 size={12} /> Delete
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Leave Requests Card */}
          <div className="card p-5 space-y-4">
            <div className="flex justify-between items-center border-b pb-2">
              <h3 className="text-sm font-bold text-foreground">
                Leave Bookings ({leaveRequests.length})
              </h3>
              <button
                className="btn-primary text-xs bg-emerald-700 hover:bg-emerald-800"
                onClick={() => setShowLeaveModal(true)}
              >
                <Plus size={14} /> Book Leave
              </button>
            </div>

            {leaveRequests.length === 0 ? (
              <p className="text-xs text-muted-foreground py-4 text-center">No leave requests booked.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-xs text-left">
                  <thead className="bg-muted text-muted-foreground font-semibold">
                    <tr>
                      <th className="p-2.5">Type</th>
                      <th className="p-2.5">Start Date</th>
                      <th className="p-2.5">End Date</th>
                      <th className="p-2.5">Reason</th>
                      <th className="p-2.5">Status</th>
                      <th className="p-2.5 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {leaveRequests.map((item, idx) => (
                      <tr key={item.id || idx} className="border-t hover:bg-muted/30">
                        <td className="p-2.5 font-semibold text-foreground">{item.leave_type || 'Leave'}</td>
                        <td className="p-2.5">{display(item.start_date)}</td>
                        <td className="p-2.5">{display(item.end_date)}</td>
                        <td className="p-2.5 max-w-xs truncate">{display(item.reason)}</td>
                        <td className="p-2.5">
                          <span className={`px-2 py-0.5 rounded font-semibold text-[10px] ${
                            item.status === 'APPROVED' ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
                          }`}>
                            {display(item.status || 'PENDING')}
                          </span>
                        </td>
                        <td className="p-2.5 text-right space-x-2">
                          <button
                            type="button"
                            className="btn-secondary text-[11px] py-1 px-2"
                            onClick={() => setEditingItem({ kind: 'leave', row: item })}
                          >
                            <Edit size={12} /> Edit
                          </button>
                          <button
                            type="button"
                            className="btn-secondary text-[11px] py-1 px-2 text-rose-700 hover:bg-rose-50"
                            onClick={async () => {
                              if (!window.confirm('Cancel/delete this leave request?')) return;
                              setBusy(true);
                              try {
                                await apiFetch(`/api/v1/employees/${employeeId}/leave-requests/${item.id}`, { method: 'DELETE' });
                              } catch {
                                await apiFetch(`/api/v1/leave-requests/${item.id}`, { method: 'DELETE' });
                              } finally {
                                setBusy(false);
                                reloadAll();
                              }
                            }}
                          >
                            <Trash2 size={12} /> Cancel
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 9: Formatted Human-Readable Activity Log */}
      {activeTab === 'activity' && (
        <div className="card p-5 space-y-4 fade-in">
          <h2 className="text-base font-bold text-foreground border-b pb-3">Activity & Audit Trail</h2>
          {activities.length === 0 ? (
            <p className="text-xs text-muted-foreground py-4 text-center">No recent activity logged for this employee.</p>
          ) : (
            <div className="space-y-3">
              {activities.map((act, idx) => {
                const rawAction = String(act.action || act.summary || 'employee.updated').toLowerCase();
                const summary = act.summary || '';
                const timestamp = act.occurred_at || act.created_at;

                let titleStr = 'Employee Record Updated';
                let IconNode = Activity;
                let badgeColor = 'bg-blue-100 text-blue-800';

                if (rawAction.includes('created')) {
                  titleStr = 'Employee Profile Created';
                  IconNode = Plus;
                  badgeColor = 'bg-emerald-100 text-emerald-800';
                } else if (rawAction.includes('updated')) {
                  titleStr = 'Updated Employee Profile Details';
                  IconNode = Edit;
                  badgeColor = 'bg-blue-100 text-blue-800';
                } else if (rawAction.includes('document')) {
                  titleStr = summary ? `Uploaded Document (${summary})` : 'Uploaded Supporting Document';
                  IconNode = FileText;
                  badgeColor = 'bg-purple-100 text-purple-800';
                } else if (rawAction.includes('emergency')) {
                  titleStr = 'Emergency Contact Updated';
                  IconNode = Phone;
                  badgeColor = 'bg-amber-100 text-amber-800';
                } else if (rawAction.includes('family')) {
                  titleStr = 'Family Member Updated';
                  IconNode = UserCheck;
                  badgeColor = 'bg-indigo-100 text-indigo-800';
                } else if (rawAction.includes('time') || rawAction.includes('log')) {
                  titleStr = 'Logged Working Time';
                  IconNode = Clock;
                  badgeColor = 'bg-blue-100 text-blue-800';
                } else if (rawAction.includes('leave')) {
                  titleStr = 'Submitted Leave Booking';
                  IconNode = Calendar;
                  badgeColor = 'bg-emerald-100 text-emerald-800';
                } else if (rawAction.includes('archived')) {
                  titleStr = 'Archived Profile Record';
                  IconNode = Archive;
                  badgeColor = 'bg-rose-100 text-rose-800';
                } else if (summary) {
                  titleStr = summary;
                }

                const dateStr = timestamp ? new Date(timestamp).toLocaleString('en-US', {
                  month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit', hour12: true
                }) : '—';

                return (
                  <div key={act.id || idx} className="p-3 bg-muted/20 border rounded flex items-center justify-between gap-4 hover:bg-muted/40 transition-all">
                    <div className="flex items-center gap-3">
                      <span className={`p-2 rounded-full border ${badgeColor}`}>
                        <IconNode size={16} />
                      </span>
                      <div>
                        <p className="text-xs font-bold text-foreground">{titleStr}</p>
                        {act.summary && act.summary !== titleStr && (
                          <p className="text-[11px] text-muted-foreground">{act.summary}</p>
                        )}
                      </div>
                    </div>
                    <span className="text-[11px] font-mono text-muted-foreground whitespace-nowrap">
                      {dateStr}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* CUSTOM MODAL: Upload Contract Document */}
      {showContractModal && (
        <Modal name="Upload Employment Contract Document" onClose={() => setShowContractModal(false)}>
          <form
            className="space-y-4"
            onSubmit={async (e) => {
              e.preventDefault();
              const form = e.currentTarget;
              const titleVal = (form.elements.namedItem('contract_title') as HTMLInputElement).value;
              const refVal = (form.elements.namedItem('contract_ref') as HTMLInputElement).value;
              const startVal = (form.elements.namedItem('start_date') as HTMLInputElement).value;
              const endVal = (form.elements.namedItem('end_date') as HTMLInputElement).value;
              const notesVal = (form.elements.namedItem('notes') as HTMLTextAreaElement).value;
              const fileInput = form.elements.namedItem('contract_file') as HTMLInputElement;

              if (!fileInput.files?.[0]) return;

              setBusy(true);
              try {
                const formData = new FormData();
                formData.append('file', fileInput.files[0]);
                formData.append('title', titleVal);
                formData.append('document_type', 'EMPLOYMENT_CONTRACT');
                if (refVal) formData.append('document_number', refVal);
                if (startVal) formData.append('issue_date', startVal);
                if (endVal) formData.append('expiry_date', endVal);
                if (notesVal) formData.append('notes', notesVal);

                await apiFetch(`/api/v1/employees/${employeeId}/documents/upload`, {
                  method: 'POST',
                  body: formData,
                });

                // Update employee contract end date so automated contract alerts trigger
                if (endVal || startVal) {
                  await apiFetch(`/api/v1/employees/${employeeId}`, {
                    method: 'PATCH',
                    body: JSON.stringify({
                      ...(startVal ? { contract_start_date: startVal } : {}),
                      ...(endVal ? { contract_end_date: endVal } : {}),
                    }),
                  });
                }

                setShowContractModal(false);
                reloadAll();
              } catch (err: any) {
                setActionError(err?.message || 'Failed to upload contract document.');
              } finally {
                setBusy(false);
              }
            }}
          >
            <div>
              <label className="block text-xs font-semibold mb-1">Contract Document Title *</label>
              <input required name="contract_title" className="input-field" placeholder="e.g. 2026 Employment Contract" defaultValue="Full-Time Employment Agreement" />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div>
                <label className="block text-xs font-semibold mb-1">Document / Ref #</label>
                <input name="contract_ref" className="input-field" placeholder="e.g. CTR-2026-88" defaultValue={autoContractRef} />
              </div>
              <div>
                <label className="block text-xs font-semibold mb-1">Contract Start Date *</label>
                <input required type="date" name="start_date" className="input-field" defaultValue={new Date().toISOString().slice(0, 10)} />
              </div>
              <div>
                <label className="block text-xs font-semibold mb-1">Contract Expiration / End Date *</label>
                <input required type="date" name="end_date" className="input-field" defaultValue={employee.contract_end_date ? String(employee.contract_end_date).slice(0, 10) : ''} />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold mb-1">Select Contract File (.pdf, .doc, .docx, .png) *</label>
              <input required type="file" name="contract_file" accept=".pdf,.doc,.docx,.png,.jpg,.jpeg" className="input-field text-xs p-1" />
            </div>

            <div>
              <label className="block text-xs font-semibold mb-1">Terms / Notes</label>
              <textarea name="notes" rows={2} className="input-field" placeholder="Key contract clauses or terms summary..." />
            </div>

            <div className="flex justify-end gap-2 border-t pt-3">
              <button type="button" className="btn-secondary text-xs" onClick={() => setShowContractModal(false)}>Cancel</button>
              <button disabled={busy} type="submit" className="btn-primary text-xs bg-indigo-700 hover:bg-indigo-800">
                {busy ? 'Uploading...' : 'Upload Contract'}
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* CUSTOM MODAL: HR Note & Record Upload */}
      {showNoteRecordModal && (
        <Modal name="Write Note & Upload Categorized Record" onClose={() => setShowNoteRecordModal(false)}>
          <form
            className="space-y-4"
            onSubmit={async (e) => {
              e.preventDefault();
              const form = e.currentTarget;
              const titleVal = (form.elements.namedItem('doc_title') as HTMLInputElement).value;
              const catVal = (form.elements.namedItem('doc_cat') as HTMLSelectElement).value;
              const expiryVal = (form.elements.namedItem('doc_expiry') as HTMLInputElement).value;
              const notesVal = (form.elements.namedItem('doc_notes') as HTMLTextAreaElement).value;
              const fileInput = form.elements.namedItem('doc_file') as HTMLInputElement;

              setBusy(true);
              try {
                if (fileInput.files?.[0]) {
                  const formData = new FormData();
                  formData.append('file', fileInput.files[0]);
                  formData.append('title', titleVal);
                  formData.append('document_type', catVal);
                  if (expiryVal) formData.append('expiry_date', expiryVal);
                  if (notesVal) formData.append('notes', notesVal);

                  await apiFetch(`/api/v1/employees/${employeeId}/documents/upload`, {
                    method: 'POST',
                    body: formData,
                  });
                } else {
                  // Text note entry
                  await apiFetch(`/api/v1/employees/${employeeId}/documents`, {
                    method: 'POST',
                    body: JSON.stringify({
                      title: titleVal,
                      document_type: catVal,
                      expiry_date: expiryVal || null,
                      notes: notesVal || null,
                    }),
                  });
                }

                setShowNoteRecordModal(false);
                reloadAll();
              } catch (err: any) {
                setActionError(err?.message || 'Failed to save record.');
              } finally {
                setBusy(false);
              }
            }}
          >
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold mb-1">Title *</label>
                <input required name="doc_title" className="input-field" placeholder="e.g. Annual Medical Checkup Certificate" />
              </div>
              <div>
                <label className="block text-xs font-semibold mb-1">Category / Document Type *</label>
                <select name="doc_cat" className="input-field" defaultValue="MEDICAL_CERTIFICATE">
                  <option value="MEDICAL_CERTIFICATE">Medical Records & Health</option>
                  <option value="POLICE_CLEARANCE">Background Checks & Police Clearance</option>
                  <option value="PASSPORT">Passport / National ID</option>
                  <option value="WORK_PERMIT">Visas & Work Permits</option>
                  <option value="EDUCATIONAL_CERTIFICATE">Educational / Trade Certificates</option>
                  <option value="INSURANCE_DOCUMENT">Insurance & Liability</option>
                  <option value="OTHER">General HR Note / Other</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold mb-1">Expiration / Review Date (Optional)</label>
              <input type="date" name="doc_expiry" className="input-field max-w-xs" />
            </div>

            <div>
              <label className="block text-xs font-semibold mb-1">Detailed HR Note / Comments *</label>
              <textarea required name="doc_notes" rows={3} className="input-field" placeholder="Write internal HR observations or notes regarding this record..." />
            </div>

            <div>
              <label className="block text-xs font-semibold mb-1">Attach File (Optional: .pdf, .doc, .jpg)</label>
              <input type="file" name="doc_file" accept=".pdf,.doc,.docx,.png,.jpg,.jpeg" className="input-field text-xs p-1" />
            </div>

            <div className="flex justify-end gap-2 border-t pt-3">
              <button type="button" className="btn-secondary text-xs" onClick={() => setShowNoteRecordModal(false)}>Cancel</button>
              <button disabled={busy} type="submit" className="btn-primary text-xs">
                {busy ? 'Saving...' : 'Save Record & Note'}
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* CUSTOM MODAL: Book Leave */}
      {showLeaveModal && (
        <Modal name="Book Leave Request" onClose={() => setShowLeaveModal(false)}>
          <form
            className="space-y-4"
            onSubmit={async (e) => {
              e.preventDefault();
              const form = e.currentTarget;
              const typeVal = (form.elements.namedItem('leave_type') as HTMLSelectElement).value;
              const startVal = (form.elements.namedItem('leave_start') as HTMLInputElement).value;
              const endVal = (form.elements.namedItem('leave_end') as HTMLInputElement).value;
              const reasonVal = (form.elements.namedItem('leave_reason') as HTMLTextAreaElement).value;

              setBusy(true);
              try {
                await apiFetch(`/api/v1/employees/${employeeId}/leave-requests`, {
                  method: 'POST',
                  body: JSON.stringify({
                    leave_type: typeVal,
                    start_date: startVal,
                    end_date: endVal,
                    reason: reasonVal,
                  }),
                });

                setShowLeaveModal(false);
                reloadAll();
              } catch (err: any) {
                setActionError(err?.message || 'Failed to submit leave request.');
              } finally {
                setBusy(false);
              }
            }}
          >
            <div>
              <label className="block text-xs font-semibold mb-1">Leave Type *</label>
              <select name="leave_type" className="input-field" defaultValue="ANNUAL">
                <option value="ANNUAL">Annual Leave</option>
                <option value="SICK">Sick Leave</option>
                <option value="MATERNITY">Maternity Leave</option>
                <option value="PATERNITY">Paternity Leave</option>
                <option value="COMPASSIONATE">Compassionate Leave</option>
                <option value="UNPAID">Unpaid Leave</option>
                <option value="STUDY">Study Leave</option>
                <option value="OTHER">Other</option>
              </select>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold mb-1">Start Date *</label>
                <input required type="date" name="leave_start" className="input-field" defaultValue={new Date().toISOString().slice(0, 10)} />
              </div>
              <div>
                <label className="block text-xs font-semibold mb-1">End Date *</label>
                <input required type="date" name="leave_end" className="input-field" defaultValue={new Date().toISOString().slice(0, 10)} />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold mb-1">Reason / Notes *</label>
              <textarea required name="leave_reason" rows={2} className="input-field" placeholder="Provide reason for leave booking..." />
            </div>

            <div className="flex justify-end gap-2 border-t pt-3">
              <button type="button" className="btn-secondary text-xs" onClick={() => setShowLeaveModal(false)}>Cancel</button>
              <button disabled={busy} type="submit" className="btn-primary text-xs bg-emerald-700 hover:bg-emerald-800">
                {busy ? 'Submitting...' : 'Book Leave'}
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* CUSTOM MODAL: Log Time (Single Day or Date Range Period) */}
      {showTimeLogModal && (
        <Modal name="Log Working Time (Single Day or Date Range Period)" onClose={() => setShowTimeLogModal(false)}>
          <form
            className="space-y-4"
            onSubmit={async (e) => {
              e.preventDefault();
              const form = e.currentTarget;
              const isPeriod = (form.elements.namedItem('log_mode') as HTMLSelectElement).value === 'PERIOD';
              const startVal = (form.elements.namedItem('log_start') as HTMLInputElement).value;
              const endVal = (form.elements.namedItem('log_end') as HTMLInputElement).value;
              const checkInVal = (form.elements.namedItem('log_checkin') as HTMLInputElement).value;
              const checkOutVal = (form.elements.namedItem('log_checkout') as HTMLInputElement).value;
              const hoursVal = Number((form.elements.namedItem('log_hours') as HTMLInputElement).value) || 8;
              const notesVal = (form.elements.namedItem('log_notes') as HTMLTextAreaElement).value;

              setBusy(true);
              try {
                if (isPeriod && startVal && endVal && startVal < endVal) {
                  // Generate logs across period
                  const startDate = new Date(startVal);
                  const endDate = new Date(endVal);
                  const cur = new Date(startDate);

                  while (cur <= endDate) {
                    const dateStr = cur.toISOString().slice(0, 10);
                    // Skip weekends if desired or log all
                    if (cur.getDay() !== 0 && cur.getDay() !== 6) {
                      await apiFetch(`/api/v1/employees/${employeeId}/time-logs`, {
                        method: 'POST',
                        body: JSON.stringify({
                          date: dateStr,
                          check_in: `${dateStr}T${checkInVal || '08:00'}:00`,
                          check_out: `${dateStr}T${checkOutVal || '17:00'}:00`,
                          hours_worked: hoursVal,
                          notes: notesVal || `Period booking (${startVal} to ${endVal})`,
                        }),
                      });
                    }
                    cur.setDate(cur.getDate() + 1);
                  }
                } else {
                  // Single day log
                  await apiFetch(`/api/v1/employees/${employeeId}/time-logs`, {
                    method: 'POST',
                    body: JSON.stringify({
                      date: startVal,
                      check_in: checkInVal ? `${startVal}T${checkInVal}:00` : null,
                      check_out: checkOutVal ? `${startVal}T${checkOutVal}:00` : null,
                      hours_worked: hoursVal,
                      notes: notesVal,
                    }),
                  });
                }

                setShowTimeLogModal(false);
                reloadAll();
              } catch (err: any) {
                setActionError(err?.message || 'Failed to log working time.');
              } finally {
                setBusy(false);
              }
            }}
          >
            <div>
              <label className="block text-xs font-semibold mb-1">Booking Mode *</label>
              <select name="log_mode" className="input-field">
                <option value="SINGLE">Single Day Entry</option>
                <option value="PERIOD">Multi-Day Period Range (e.g. Entire Week Task)</option>
              </select>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold mb-1">Start Date *</label>
                <input required type="date" name="log_start" className="input-field" defaultValue={new Date().toISOString().slice(0, 10)} />
              </div>
              <div>
                <label className="block text-xs font-semibold mb-1">End Date (For Period Mode)</label>
                <input type="date" name="log_end" className="input-field" defaultValue={new Date().toISOString().slice(0, 10)} />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div>
                <label className="block text-xs font-semibold mb-1">Check In Time</label>
                <input type="time" name="log_checkin" className="input-field" defaultValue="08:00" />
              </div>
              <div>
                <label className="block text-xs font-semibold mb-1">Check Out Time</label>
                <input type="time" name="log_checkout" className="input-field" defaultValue="17:00" />
              </div>
              <div>
                <label className="block text-xs font-semibold mb-1">Hours Per Day *</label>
                <input required type="number" step="0.5" name="log_hours" className="input-field" defaultValue={8} />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold mb-1">Work Summary / Task Description *</label>
              <textarea required name="log_notes" rows={2} className="input-field" placeholder="e.g. Website development & IT infrastructure upgrade..." />
            </div>

            <div className="flex justify-end gap-2 border-t pt-3">
              <button type="button" className="btn-secondary text-xs" onClick={() => setShowTimeLogModal(false)}>Cancel</button>
              <button disabled={busy} type="submit" className="btn-primary text-xs">
                {busy ? 'Logging...' : 'Log Time'}
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* CUSTOM MODAL: Admin Account Security & Password Reset */}
      {showAccountModal && (
        <Modal name={`Account Security & Password Reset — ${fullName}`} onClose={() => setShowAccountModal(false)}>
          <div className="space-y-5">
            <div className="p-3 bg-muted/30 border rounded text-xs space-y-1">
              <p className="font-semibold text-foreground">Linked Account Details</p>
              <p className="text-muted-foreground">Work Email: <strong>{display(employee.work_email)}</strong></p>
              <p className="text-muted-foreground">Personal Email: <strong>{display(employee.personal_email)}</strong></p>
              <p className="text-muted-foreground">Employee #: <strong>{display(employee.employee_number)}</strong></p>
            </div>

            {/* Email Change Form */}
            <form
              className="border-t pt-3 space-y-3"
              onSubmit={async (e) => {
                e.preventDefault();
                const form = e.currentTarget;
                const emailVal = (form.elements.namedItem('acc_email') as HTMLInputElement).value;

                setBusy(true);
                try {
                  await apiFetch(`/api/v1/employees/${employeeId}`, {
                    method: 'PATCH',
                    body: JSON.stringify({ work_email: emailVal }),
                  });
                  reloadAll();
                  alert('Account work email updated successfully.');
                } catch (err: any) {
                  setActionError(err?.message || 'Failed to update email.');
                } finally {
                  setBusy(false);
                }
              }}
            >
              <h4 className="text-xs font-bold uppercase text-primary tracking-wider">Update Account Email</h4>
              <div className="flex gap-2 items-center">
                <input
                  required
                  type="email"
                  name="acc_email"
                  className="input-field text-xs"
                  defaultValue={employee.work_email || employee.personal_email || ''}
                  placeholder="employee@company.com"
                />
                <button disabled={busy} type="submit" className="btn-secondary text-xs shrink-0">
                  Update Email
                </button>
              </div>
            </form>

            {/* Send Password Reset Request Button */}
            <div className="border-t pt-4 space-y-2">
              <h4 className="text-xs font-bold uppercase text-primary tracking-wider">Password Reset Email</h4>
              <p className="text-xs text-muted-foreground">
                Trigger a secure password reset email to this employee's work email address ({employee.work_email || 'Not set'}).
              </p>
              <button
                disabled={busy}
                className="btn-primary text-xs bg-indigo-700 hover:bg-indigo-800"
                onClick={async () => {
                  const targetEmail = employee.work_email || employee.personal_email;
                  if (!targetEmail) {
                    alert('Please set a work email for this employee first.');
                    return;
                  }
                  setBusy(true);
                  try {
                    await apiFetch(`/api/v1/hr/password-reset`, {
                      method: 'POST',
                      body: JSON.stringify({ email: targetEmail }),
                    });
                    alert(`Password reset link sent to ${targetEmail}.`);
                  } catch (err: any) {
                    alert(`Password reset notice: ${err?.message || 'Email request triggered.'}`);
                  } finally {
                    setBusy(false);
                  }
                }}
              >
                <Mail size={14} /> Send Password Reset Email
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* MODAL: Performance & Calendar Popup */}
      {showCalendarModal && (
        <EmployeeCalendarModal
          employeeId={employeeId}
          employeeName={fullName}
          onClose={() => setShowCalendarModal(false)}
        />
      )}

      {/* MODAL: Edit Main Employee Profile (Multi-staged Wizard) */}
      {editingEmployee && (
        <EmployeeWizardForm
          initial={employee}
          onClose={() => setEditingEmployee(false)}
          onSaved={() => {
            setEditingEmployee(false);
            reloadAll();
          }}
        />
      )}

      {/* MODAL: Generic Sub-item Record Form */}
      {activeSubModal && (
        <RecordForm
          resource="employees"
          path={activeSubModal.path}
          operation={{
            schema: { $ref: `#/components/schemas/${activeSubModal.schemaName}` },
            permissions: [],
          }}
          onClose={() => setActiveSubModal(null)}
          onSaved={() => {
            setActiveSubModal(null);
            reloadAll();
          }}
        />
      )}
    </div>
  );
}
