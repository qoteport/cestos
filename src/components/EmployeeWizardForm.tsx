'use client';
import BirthDateInput from './BirthDateInput';

import React, { useState, useEffect, ChangeEvent, FormEvent, useRef } from 'react';
import { ArrowLeft, ArrowRight, Check, Upload, Plus, Trash2, User, Briefcase, FileText, Phone, ShieldCheck } from 'lucide-react';
import { useAuth } from './AuthProvider';
import { employeePermissions } from '@/lib/employeePermissions';
import { apiFetch } from '@/lib/api';
import { Modal, Row } from './DataUI';
import SearchableSelect from './SearchableSelect';
import AppDateTimePicker from './ui/AppDateTimePicker';

interface LookupOption {
  id: string;
  name?: string;
  first_name?: string;
  last_name?: string;
  title?: string;
  [key: string]: any;
}

interface EmergencyContactItem {
  full_name: string;
  relationship: string;
  primary_phone: string;
  email?: string;
  address?: string;
  is_primary?: boolean;
}

interface EmployeeWizardFormProps {
  initial?: Row;
  onClose: () => void;
  onSaved: (employee: Row) => void;
}

export default function EmployeeWizardForm({ initial, onClose, onSaved }: EmployeeWizardFormProps) {
  const auth = useAuth();
  const canAttachContract = employeePermissions(auth.access).contracts;
  const [step, setStep] = useState(1);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [reviewReady, setReviewReady] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (containerRef.current?.parentElement) {
      containerRef.current.parentElement.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }, [step]);

  useEffect(() => {
    if (step === 5) {
      setReviewReady(false);
      const timer = setTimeout(() => setReviewReady(true), 600);
      return () => clearTimeout(timer);
    }
  }, [step]);

  // Step 1: Personal Details
  const [personal, setPersonal] = useState({
    first_name: initial?.first_name || '',
    middle_name: initial?.middle_name || '',
    last_name: initial?.last_name || '',
    preferred_name: initial?.preferred_name || '',
    gender: initial?.gender || '',
    date_of_birth: initial?.date_of_birth ? String(initial.date_of_birth).slice(0, 10) : '',
    nationality: initial?.nationality || '',
    marital_status: initial?.marital_status || '',
    personal_email: initial?.personal_email || '',
    work_email: initial?.work_email || '',
    primary_phone: initial?.primary_phone || '',
    secondary_phone: initial?.secondary_phone || '',
    residential_address: initial?.residential_address || '',
    city: initial?.city || '',
    county_or_region: initial?.county_or_region || '',
    country: initial?.country || '',
    bio: initial?.bio || '',
  });

  // Step 2: Employment Details
  const [employment, setEmployment] = useState({
    department_id: initial?.department_id || (typeof initial?.department === 'object' ? initial?.department?.id : '') || '',
    position_id: initial?.position_id || (typeof initial?.position === 'object' ? initial?.position?.id : '') || '',
    job_title: initial?.job_title || '',
    employment_type: initial?.employment_type || 'FULL_TIME',
    employment_status: initial?.employment_status || 'ACTIVE',
    hire_date: initial?.hire_date ? String(initial.hire_date).slice(0, 10) : new Date().toISOString().slice(0, 10),
    probation_end_date: initial?.probation_end_date ? String(initial.probation_end_date).slice(0, 10) : '',
    confirmation_date: initial?.confirmation_date ? String(initial.confirmation_date).slice(0, 10) : '',
    contract_start_date: initial?.contract_start_date ? String(initial.contract_start_date).slice(0, 10) : '',
    contract_end_date: initial?.contract_end_date ? String(initial.contract_end_date).slice(0, 10) : '',
    supervisor_id: initial?.supervisor_id || '',
    home_location_id: initial?.home_location_id || '',
    availability_status: initial?.availability_status || 'AVAILABLE',
    notes: initial?.notes || '',
  });

  // Step 3: Files & Attachments
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [resumeFile, setResumeFile] = useState<File | null>(null);
  const [contractFile, setContractFile] = useState<File | null>(null);

  // Step 4: Emergency Contacts
  const [emergencyContacts, setEmergencyContacts] = useState<EmergencyContactItem[]>([]);

  // Lookups for dropdowns
  const [departments, setDepartments] = useState<LookupOption[]>([]);
  const [positions, setPositions] = useState<LookupOption[]>([]);
  const [supervisors, setSupervisors] = useState<LookupOption[]>([]);
  const [locations, setLocations] = useState<LookupOption[]>([]);

  useEffect(() => {
    let active = true;
    apiFetch<any>('/api/v1/departments?page_size=100')
      .then(d => {
        if (!active) return;
        const list = Array.isArray(d) ? d : d.items || [];
        setDepartments(list);
        if (initial) {
          const deptVal = (initial.department?.name || initial.department_name || initial.department || '').toString().toLowerCase();
          const matchDept = list.find((item: any) =>
            item.id === initial.department_id ||
            item.id === initial.department?.id ||
            (deptVal && item.name?.toLowerCase() === deptVal)
          );
          if (matchDept) {
            setEmployment(prev => ({ ...prev, department_id: matchDept.id }));
          }
        }
      })
      .catch(() => { });

    apiFetch<any>('/api/v1/positions?page_size=100')
      .then(d => {
        if (!active) return;
        const list = Array.isArray(d) ? d : d.items || [];
        setPositions(list);
        if (initial) {
          const posVal = (initial.job_title || initial.position?.title || initial.position?.name || initial.position || '').toString().toLowerCase();
          const matchPos = list.find((item: any) =>
            item.id === initial.position_id ||
            item.id === initial.position?.id ||
            (posVal && (item.title || item.name)?.toLowerCase() === posVal)
          );
          if (matchPos) {
            setEmployment(prev => ({ ...prev, position_id: matchPos.id }));
          }
        }
      })
      .catch(() => { });

    apiFetch<any>('/api/v1/employees?page_size=100')
      .then(d => { if (active) setSupervisors(Array.isArray(d) ? d : d.items || []); })
      .catch(() => { });
    apiFetch<any>('/api/v1/locations?page_size=100')
      .then(d => { if (active) setLocations(Array.isArray(d) ? d : d.items || []); })
      .catch(() => { });
    return () => { active = false; };
  }, []);

  const handlePhotoChange = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setPhotoFile(file);
      const url = URL.createObjectURL(file);
      setPhotoPreview(url);
    }
  };

  const addEmergencyContact = () => {
    setEmergencyContacts([
      ...emergencyContacts,
      {
        full_name: '',
        relationship: '',
        primary_phone: '',
        email: '',
        address: '',
        is_primary: emergencyContacts.length === 0,
      },
    ]);
  };

  const removeEmergencyContact = (index: number) => {
    setEmergencyContacts(emergencyContacts.filter((_, i) => i !== index));
  };

  const updateEmergencyContact = (index: number, field: keyof EmergencyContactItem, value: any) => {
    setEmergencyContacts(
      emergencyContacts.map((contact, i) => (i === index ? { ...contact, [field]: value } : contact))
    );
  };

  const validateStep = (s: number): boolean => {
    setError('');
    if (s === 1) {
      if (!personal.first_name.trim()) {
        setError('First name is required.');
        return false;
      }
      if (!personal.last_name.trim()) {
        setError('Last name is required.');
        return false;
      }
    }
    if (s === 4) {
      for (let i = 0; i < emergencyContacts.length; i++) {
        const c = emergencyContacts[i];
        if (!c.full_name.trim() || !c.relationship.trim() || !c.primary_phone.trim()) {
          setError(`Emergency contact #${i + 1} requires Name, Relationship, and Phone.`);
          return false;
        }
      }
    }
    return true;
  };

  const nextStep = () => {
    if (validateStep(step)) {
      setStep(s => Math.min(s + 1, 5));
    }
  };

  const prevStep = () => {
    setError('');
    setStep(s => Math.max(s - 1, 1));
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (busy) return;
    if (step < 5) {
      if (validateStep(step)) {
        setStep(s => Math.min(s + 1, 5));
      }
      return;
    }
    for (const stage of [1, 4]) {
      if (!validateStep(stage)) { setStep(stage); return; }
    }

    setBusy(true);
    setError('');

    try {
      // Build main payload
      const payload: Record<string, any> = {};

      Object.entries({ ...personal, ...employment }).forEach(([k, v]) => {
        const value = typeof v === 'string' ? v.trim() : v;
        if (k !== 'availability_status' && value !== '' && value !== null && value !== undefined) {
          payload[k] = value;
        }
      });

      let saved: Row;
      if (initial?.id) {
        saved = await apiFetch<Row>(`/api/v1/employees/${initial.id}`, {
          method: 'PATCH',
          body: JSON.stringify(payload),
        });
      } else {
        saved = await apiFetch<Row>('/api/v1/employees', {
          method: 'POST',
          body: JSON.stringify(payload),
        });
      }

      const empId = saved.id || initial?.id;

      if (empId) {
        // Upload photo if selected
        if (photoFile) {
          try {
            const formData = new FormData();
            formData.append('file', photoFile);
            formData.append('title', 'Profile photo');
            formData.append('document_type', 'OTHER');
            const doc = await apiFetch<any>(`/api/v1/employees/${empId}/documents/upload`, {
              method: 'POST',
              body: formData,
            });
            if (doc?.id) {
              await apiFetch(`/api/v1/employees/${empId}`, {
                method: 'PATCH',
                body: JSON.stringify({
                  profile_photo_url: `/api/v1/employees/${empId}/documents/${doc.id}/download`,
                }),
              });
            }
          } catch {
            // photo upload error handled gracefully
          }
        }

        // Upload resume if selected
        if (resumeFile) {
          try {
            const formData = new FormData();
            formData.append('file', resumeFile);
            formData.append('title', resumeFile.name);
            await apiFetch(`/api/v1/employees/${empId}/resumes/upload`, {
              method: 'POST',
              body: formData,
            });
          } catch {
            // resume upload error handled gracefully
          }
        }

        // Upload contract document if selected
        if (canAttachContract && contractFile) {
          try {
            const formData = new FormData();
            formData.append('file', contractFile);
            formData.append(
              'title',
              `Employment Contract - ${personal.first_name || ''} ${personal.last_name || ''}`.trim() || contractFile.name
            );
            formData.append('document_type', 'EMPLOYMENT_CONTRACT');
            const startDate = employment.contract_start_date || employment.hire_date;
            if (startDate) formData.append('issue_date', startDate);
            if (employment.contract_end_date) formData.append('expiry_date', employment.contract_end_date);
            await apiFetch(`/api/v1/employees/${empId}/documents/upload`, {
              method: 'POST',
              body: formData,
            });
          } catch {
            // contract upload error handled gracefully
          }
        }

        // Add emergency contacts
        for (let i = 0; i < emergencyContacts.length; i++) {
          const contact = emergencyContacts[i];
          if (contact.full_name.trim()) {
            try {
              await apiFetch(`/api/v1/employees/${empId}/emergency-contacts`, {
                method: 'POST',
                body: JSON.stringify({
                  full_name: contact.full_name,
                  relationship: contact.relationship,
                  primary_phone: contact.primary_phone,
                  email: contact.email || null,
                  address: contact.address || null,
                  is_primary: i === 0,
                  priority: Math.min(i + 1, 10),
                }),
              });
            } catch {
              // contact save error handled gracefully
            }
          }
        }
      }

      onSaved(saved);
    } catch (err: any) {
      setError(err?.message || 'Failed to save employee profile. Please check details and try again.');
    } finally {
      setBusy(false);
    }
  };

  const stepTitles = [
    { num: 1, label: 'Personal', icon: User },
    { num: 2, label: 'Employment', icon: Briefcase },
    { num: 3, label: 'Attachments', icon: FileText },
    { num: 4, label: 'Emergency Contacts', icon: Phone },
    { num: 5, label: 'Review & Confirm', icon: ShieldCheck },
  ];

  return (
    <Modal name={initial ? `Edit Employee Profile` : `New Employee Onboarding`} onClose={onClose}>
      <div className="space-y-6" ref={containerRef}>
        {/* Wizard Stepper Bar */}
        <div className="border-b pb-4">
          <div className="flex items-center justify-between gap-2 overflow-x-auto py-1">
            {stepTitles.map((s) => {
              const Icon = s.icon;
              const isActive = step === s.num;
              const isDone = step > s.num;

              return (
                <button
                  key={s.num}
                  type="button"
                  onClick={() => {
                    if (s.num < step || validateStep(step)) {
                      setStep(s.num);
                    }
                  }}
                  className={`flex items-center gap-2 px-3 py-2 text-xs font-semibold rounded border transition-all whitespace-nowrap ${
                    isActive
                      ? 'bg-primary text-white border-primary shadow-sm'
                      : isDone
                      ? 'bg-emerald-50 text-emerald-800 border-emerald-300' :'bg-muted/50 text-muted-foreground border-transparent hover:bg-muted'
                  }`}
                >
                  <span className={`w-5 h-5 flex items-center justify-center rounded-full text-[10px] font-bold ${isActive ? 'bg-white text-primary' : isDone ? 'bg-emerald-600 text-white' : 'bg-muted-foreground/20'
                    }`}>
                    {isDone ? <Check size={12} /> : s.num}
                  </span>
                  <span>{s.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {error && (
          <div role="alert" className="p-3 bg-red-50 border border-red-200 text-red-700 text-sm rounded">
            {error}
          </div>
        )}

        <form
          onSubmit={handleSubmit}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && (e.target as HTMLElement).tagName !== 'TEXTAREA') {
              e.preventDefault();
            }
          }}
          className="space-y-6"
        >
          {/* STEP 1: Personal Details */}
          {step === 1 && (
            <div className="space-y-4 fade-in">
              <h3 className="text-base font-bold text-foreground flex items-center gap-2 border-b pb-2">
                <User size={18} className="text-primary" />
                Personal Information
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold mb-1">First Name *</label>
                  <input
                    required
                    className="input-field"
                    value={personal.first_name}
                    onChange={e => setPersonal({ ...personal, first_name: e.target.value })}
                    placeholder="e.g. John"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold mb-1">Middle Name</label>
                  <input
                    className="input-field"
                    value={personal.middle_name}
                    onChange={e => setPersonal({ ...personal, middle_name: e.target.value })}
                    placeholder="e.g. Edward"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold mb-1">Last Name *</label>
                  <input
                    required
                    className="input-field"
                    value={personal.last_name}
                    onChange={e => setPersonal({ ...personal, last_name: e.target.value })}
                    placeholder="e.g. Doe"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold mb-1">NASCOP Number</label>
                  <input
                    className="input-field"
                    value={personal.preferred_name}
                    onChange={e => setPersonal({ ...personal, preferred_name: e.target.value })}
                    placeholder="e.g. NASCOP-12345"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold mb-1">Gender</label>
                  <SearchableSelect
                    value={personal.gender}
                    onChange={(val) => setPersonal({ ...personal, gender: val })}
                    placeholder="Select gender..."
                    options={[
                      { value: '', label: 'Select gender...' },
                      { value: 'Male', label: 'Male' },
                      { value: 'Female', label: 'Female' },
                      { value: 'Other', label: 'Other' },
                      { value: 'Prefer Not To Say', label: 'Prefer Not To Say' },
                    ]}
                    searchable={false}
                    ariaLabel="Gender"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold mb-1">Date of Birth</label>
                  <BirthDateInput value={personal.date_of_birth} onChange={value => setPersonal({ ...personal, date_of_birth: value })} />
                </div>
                <div>
                  <label className="block text-xs font-semibold mb-1">Nationality</label>
                  <input
                    className="input-field"
                    value={personal.nationality}
                    onChange={e => setPersonal({ ...personal, nationality: e.target.value })}
                    placeholder="e.g. Liberian"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold mb-1">Marital Status</label>
                  <SearchableSelect
                    value={personal.marital_status}
                    onChange={(val) => setPersonal({ ...personal, marital_status: val })}
                    placeholder="Select status..."
                    options={[
                      { value: '', label: 'Select status...' },
                      { value: 'SINGLE', label: 'Single' },
                      { value: 'MARRIED', label: 'Married' },
                      { value: 'DIVORCED', label: 'Divorced' },
                      { value: 'WIDOWED', label: 'Widowed' },
                      { value: 'SEPARATED', label: 'Separated' },
                    ]}
                    searchable={false}
                    ariaLabel="Marital Status"
                  />
                </div>
              </div>

              <h4 className="text-xs font-bold uppercase text-muted-foreground tracking-wider pt-2 border-b pb-1">
                Contact & Residential Address
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold mb-1">Personal Email</label>
                  <input
                    type="email"
                    className="input-field"
                    value={personal.personal_email}
                    onChange={e => setPersonal({ ...personal, personal_email: e.target.value })}
                    placeholder="john.doe@gmail.com"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold mb-1">Work Email</label>
                  <input
                    type="email"
                    className="input-field"
                    value={personal.work_email}
                    onChange={e => setPersonal({ ...personal, work_email: e.target.value })}
                    placeholder="jdoe@cestos.com"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold mb-1">Primary Phone</label>
                  <input
                    className="input-field"
                    value={personal.primary_phone}
                    onChange={e => setPersonal({ ...personal, primary_phone: e.target.value })}
                    placeholder="+231 886 000 000"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold mb-1">Secondary Phone</label>
                  <input
                    className="input-field"
                    value={personal.secondary_phone}
                    onChange={e => setPersonal({ ...personal, secondary_phone: e.target.value })}
                    placeholder="+231 770 000 000"
                  />
                </div>
                <div className="md:col-span-2">
                  <label className="block text-xs font-semibold mb-1">Residential Address</label>
                  <textarea
                    rows={2}
                    className="input-field"
                    value={personal.residential_address}
                    onChange={e => setPersonal({ ...personal, residential_address: e.target.value })}
                    placeholder="Street address, community..."
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold mb-1">City</label>
                  <input
                    className="input-field"
                    value={personal.city}
                    onChange={e => setPersonal({ ...personal, city: e.target.value })}
                    placeholder="Monrovia"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold mb-1">Country</label>
                  <input
                    className="input-field"
                    value={personal.country}
                    onChange={e => setPersonal({ ...personal, country: e.target.value })}
                    placeholder="Liberia"
                  />
                </div>
              </div>
            </div>
          )}

          {/* STEP 2: Employment Details */}
          {step === 2 && (
            <div className="space-y-4 fade-in">
              <h3 className="text-base font-bold text-foreground flex items-center gap-2 border-b pb-2">
                <Briefcase size={18} className="text-primary" />
                Employment & Role Details
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold mb-1">Department</label>
                  <SearchableSelect
                    value={employment.department_id}
                    onChange={(val) => setEmployment({ ...employment, department_id: val })}
                    placeholder="Select department..."
                    options={[
                      { value: '', label: 'Select department...' },
                      ...departments.map((d) => ({
                        value: String(d.id),
                        label: d.name || d.code,
                      })),
                    ]}
                    searchable={departments.length > 5}
                    ariaLabel="Department"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold mb-1">Position</label>
                  <SearchableSelect
                    value={employment.position_id}
                    onChange={(val) => setEmployment({ ...employment, position_id: val })}
                    placeholder="Select position..."
                    options={[
                      { value: '', label: 'Select position...' },
                      ...positions.map((p) => ({
                        value: String(p.id),
                        label: p.title || p.name || `Position ${p.id}`,
                      })),
                    ]}
                    searchable={positions.length > 5}
                    ariaLabel="Position"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold mb-1">Job Title</label>
                  <input
                    className="input-field"
                    value={employment.job_title}
                    onChange={e => setEmployment({ ...employment, job_title: e.target.value })}
                    placeholder="e.g. Senior Drill Specialist"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold mb-1">Employment Type</label>
                  <SearchableSelect
                    value={employment.employment_type}
                    onChange={(val) => setEmployment({ ...employment, employment_type: val })}
                    options={[
                      { value: 'FULL_TIME', label: 'Full Time' },
                      { value: 'PART_TIME', label: 'Part Time' },
                      { value: 'CONTRACT', label: 'Contract' },
                      { value: 'CASUAL', label: 'Casual' },
                      { value: 'TEMPORARY', label: 'Temporary' },
                      { value: 'CONSULTANT', label: 'Consultant' },
                      { value: 'INTERN', label: 'Intern' },
                    ]}
                    searchable={false}
                    ariaLabel="Employment Type"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold mb-1">Employment Status</label>
                  <SearchableSelect
                    value={employment.employment_status}
                    onChange={(val) => setEmployment({ ...employment, employment_status: val })}
                    options={[
                      { value: 'ACTIVE', label: 'Active' },
                      { value: 'ON_LEAVE', label: 'On Leave' },
                      { value: 'OFF_ROTATION', label: 'Off Rotation' },
                      { value: 'SUSPENDED', label: 'Suspended' },
                      { value: 'EXITED', label: 'Exited' },
                      { value: 'RESIGNED', label: 'Resigned' },
                      { value: 'TERMINATED', label: 'Terminated' },
                    ]}
                    searchable={false}
                    ariaLabel="Employment Status"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold mb-1">Availability Status</label>
                  <SearchableSelect
                    value={employment.availability_status}
                    onChange={(val) => setEmployment({ ...employment, availability_status: val })}
                    options={[
                      { value: 'AVAILABLE', label: 'Available' },
                      { value: 'ASSIGNED', label: 'Assigned' },
                      { value: 'ON_LEAVE', label: 'On Leave' },
                      { value: 'OFF_ROTATION', label: 'Off Rotation' },
                      { value: 'TRAINING', label: 'Training' },
                      { value: 'UNAVAILABLE', label: 'Unavailable' },
                    ]}
                    searchable={false}
                    ariaLabel="Availability Status"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold mb-1">Supervisor</label>
                  <SearchableSelect
                    value={employment.supervisor_id}
                    onChange={(val) => setEmployment({ ...employment, supervisor_id: val })}
                    placeholder="Select supervisor..."
                    options={[
                      { value: '', label: 'Select supervisor...' },
                      ...supervisors.map((s) => ({
                        value: String(s.id),
                        label: s.first_name || s.last_name ? `${s.first_name || ''} ${s.last_name || ''}`.trim() : s.id,
                      })),
                    ]}
                    searchable={supervisors.length > 5}
                    ariaLabel="Supervisor"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold mb-1">Work Location</label>
                  <SearchableSelect
                    value={employment.home_location_id}
                    onChange={(val) => setEmployment({ ...employment, home_location_id: val })}
                    placeholder="Select work location..."
                    options={[
                      { value: '', label: 'Select work location...' },
                      ...locations.map((l) => ({
                        value: String(l.id),
                        label: l.name || `Location ${l.id}`,
                      })),
                    ]}
                    searchable={locations.length > 5}
                    ariaLabel="Work Location"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold mb-1">Hire Date</label>
                  <AppDateTimePicker
                    mode="date"
                    value={employment.hire_date}
                    onChange={(newHireDate) => {
                      setEmployment(prev => ({
                        ...prev,
                        hire_date: newHireDate,
                        contract_start_date: prev.contract_start_date || newHireDate,
                      }));
                    }}
                    placeholder="Select hire date"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold mb-1">Contract Start Date</label>
                  <AppDateTimePicker
                    mode="date"
                    value={employment.contract_start_date || employment.hire_date}
                    onChange={(val) => setEmployment({ ...employment, contract_start_date: val })}
                    placeholder="Select start date"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold mb-1">Contract End Date</label>
                  <AppDateTimePicker
                    mode="date"
                    value={employment.contract_end_date}
                    onChange={(val) => setEmployment({ ...employment, contract_end_date: val })}
                    placeholder="Select end date"
                  />
                </div>
                {canAttachContract && <div className="md:col-span-2 border rounded p-4 space-y-3 bg-muted/20">
                  <span className="text-xs font-bold uppercase text-primary tracking-wider block">
                    Employment Contract Attachment (Optional)
                  </span>
                  <p className="text-xs text-muted-foreground">
                    Attach the signed employment contract or agreement document. Start and end dates above will be saved with the document.
                  </p>
                  {contractFile ? (
                    <div className="p-3 bg-card border rounded text-xs flex items-center justify-between">
                      <span className="font-semibold text-primary truncate max-w-[300px]">
                        {contractFile.name}
                      </span>
                      <button
                        type="button"
                        className="text-red-600 text-xs hover:underline"
                        onClick={() => setContractFile(null)}
                      >
                        Remove
                      </button>
                    </div>
                  ) : (
                    <div className="p-3 border-2 border-dashed rounded text-center bg-card">
                      <label className="btn-secondary cursor-pointer text-xs">
                        <Upload size={14} />
                        Attach Contract Document
                        <input
                          type="file"
                          accept=".pdf,.doc,.docx,.png,.jpg,.jpeg"
                          className="hidden"
                          onChange={e => setContractFile(e.target.files?.[0] || null)}
                        />
                      </label>
                    </div>
                  )}
                </div>}
                <div className="md:col-span-2">
                  <label className="block text-xs font-semibold mb-1">Employment Notes</label>
                  <textarea
                    rows={2}
                    className="input-field"
                    value={employment.notes}
                    onChange={e => setEmployment({ ...employment, notes: e.target.value })}
                    placeholder="Additional details regarding employment contract or role..."
                  />
                </div>
              </div>
            </div>
          )}

          {/* STEP 3: Attachments & Files */}
          {step === 3 && (
            <div className="space-y-4 fade-in">
              <h3 className="text-base font-bold text-foreground flex items-center gap-2 border-b pb-2">
                <FileText size={18} className="text-primary" />
                Profile Photo & Resume Attachments
              </h3>
              <p className="text-xs text-muted-foreground">
                Attach a profile photo and resume for this employee. Files will be saved when you submit the form.
              </p>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2">
                {/* Profile Photo */}
                <div className="border rounded p-4 space-y-3 bg-card">
                  <span className="text-xs font-bold uppercase text-muted-foreground tracking-wider block">
                    Profile Photo
                  </span>
                  <div className="flex items-center gap-4">
                    {photoPreview ? (
                      <img
                        src={photoPreview}
                        alt="Photo preview"
                        className="w-20 h-20 rounded-full object-cover border-2 border-primary"
                      />
                    ) : (
                      <div className="w-20 h-20 rounded-full bg-muted flex items-center justify-center text-muted-foreground border">
                        <User size={32} />
                      </div>
                    )}
                    <div className="space-y-2">
                      <label className="btn-secondary cursor-pointer text-xs">
                        <Upload size={14} />
                        Choose Photo
                        <input
                          type="file"
                          accept=".png,.jpg,.jpeg"
                          className="hidden"
                          onChange={handlePhotoChange}
                        />
                      </label>
                      <p className="text-[11px] text-muted-foreground">PNG or JPEG up to 5MB.</p>
                    </div>
                  </div>
                </div>

                {/* Resume Upload */}
                <div className="border rounded p-4 space-y-3 bg-card">
                  <span className="text-xs font-bold uppercase text-muted-foreground tracking-wider block">
                    Resume / CV Document
                  </span>
                  <div className="space-y-2">
                    {resumeFile ? (
                      <div className="p-3 bg-secondary/50 border rounded text-xs flex items-center justify-between">
                        <span className="font-semibold text-primary truncate max-w-[200px]">
                          {resumeFile.name}
                        </span>
                        <button
                          type="button"
                          className="text-red-600 text-xs hover:underline"
                          onClick={() => setResumeFile(null)}
                        >
                          Remove
                        </button>
                      </div>
                    ) : (
                      <div className="p-4 border-2 border-dashed rounded text-center space-y-2">
                        <FileText size={24} className="mx-auto text-muted-foreground opacity-50" />
                        <label className="btn-secondary cursor-pointer text-xs">
                          <Upload size={14} />
                          Select Resume File
                          <input
                            type="file"
                            accept=".pdf,.doc,.docx"
                            className="hidden"
                            onChange={e => setResumeFile(e.target.files?.[0] || null)}
                          />
                        </label>
                      </div>
                    )}
                    <p className="text-[11px] text-muted-foreground">PDF, DOC, or DOCX formats.</p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* STEP 4: Emergency Contacts */}
          {step === 4 && (
            <div className="space-y-4 fade-in">
              <div className="flex items-center justify-between border-b pb-2">
                <h3 className="text-base font-bold text-foreground flex items-center gap-2">
                  <Phone size={18} className="text-primary" />
                  Emergency Contacts
                </h3>
                <button
                  type="button"
                  onClick={addEmergencyContact}
                  className="btn-secondary text-xs"
                >
                  <Plus size={14} />
                  Add Emergency Contact
                </button>
              </div>

              <p className="text-xs text-muted-foreground">
                Add emergency contacts for field operations safety compliance.
              </p>

              {emergencyContacts.length === 0 ? (
                <div className="p-6 border rounded text-center text-muted-foreground bg-muted/20">
                  <Phone className="mx-auto mb-2 opacity-40" size={28} />
                  <p className="text-sm font-semibold">No emergency contacts added</p>
                  <p className="text-xs mt-1">Click "Add Emergency Contact" to add primary contacts now.</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {emergencyContacts.map((contact, index) => (
                    <div key={index} className="border rounded p-4 bg-card space-y-3 relative">
                      <div className="flex items-center justify-between border-b pb-2">
                        <span className="text-xs font-bold text-primary">
                          Contact #{index + 1} {index === 0 ? '(Primary Next of Kin)' : ''}
                        </span>
                        <button
                          type="button"
                          onClick={() => removeEmergencyContact(index)}
                          className="text-red-600 hover:text-red-800 p-1 text-xs flex items-center gap-1"
                        >
                          <Trash2 size={14} /> Remove
                        </button>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        <div>
                          <label className="block text-[11px] font-semibold mb-1">Full Name *</label>
                          <input
                            required
                            className="input-field text-xs"
                            value={contact.full_name}
                            onChange={e => updateEmergencyContact(index, 'full_name', e.target.value)}
                            placeholder="e.g. Mary Doe"
                          />
                        </div>
                        <div>
                          <label className="block text-[11px] font-semibold mb-1">Relationship *</label>
                          <SearchableSelect
                            value={contact.relationship}
                            onChange={(val) => updateEmergencyContact(index, 'relationship', val)}
                            placeholder="Select relationship..."
                            options={[
                              { value: 'Spouse', label: 'Spouse' },
                              { value: 'Parent', label: 'Parent' },
                              { value: 'Sibling', label: 'Sibling' },
                              { value: 'Child', label: 'Child' },
                              { value: 'Partner', label: 'Partner' },
                              { value: 'Relative', label: 'Relative' },
                              { value: 'Friend', label: 'Friend' },
                              { value: 'Guardian', label: 'Guardian' },
                              { value: 'Colleague', label: 'Colleague' },
                              { value: 'Other', label: 'Other' },
                            ]}
                            searchable={false}
                            required
                            ariaLabel="Relationship"
                          />
                        </div>
                        <div>
                          <label className="block text-[11px] font-semibold mb-1">Primary Phone *</label>
                          <input
                            required
                            className="input-field text-xs"
                            value={contact.primary_phone}
                            onChange={e => updateEmergencyContact(index, 'primary_phone', e.target.value)}
                            placeholder="+231 886 111 222"
                          />
                        </div>
                        <div>
                          <label className="block text-[11px] font-semibold mb-1">Email (Optional)</label>
                          <input
                            type="email"
                            className="input-field text-xs"
                            value={contact.email || ''}
                            onChange={e => updateEmergencyContact(index, 'email', e.target.value)}
                            placeholder="mary.doe@gmail.com"
                          />
                        </div>
                        <div className="md:col-span-2">
                          <label className="block text-[11px] font-semibold mb-1">Address (Optional)</label>
                          <input
                            className="input-field text-xs"
                            value={contact.address || ''}
                            onChange={e => updateEmergencyContact(index, 'address', e.target.value)}
                            placeholder="Street address, city or community..."
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* STEP 5: Review & Save */}
          {step === 5 && (
            <div className="space-y-4 fade-in">
              <h3 className="text-base font-bold text-foreground flex items-center gap-2 border-b pb-2">
                <ShieldCheck size={18} className="text-emerald-700" />
                Review & Finalize Profile
              </h3>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Personal Review */}
                <div className="border rounded p-4 bg-muted/20 space-y-2">
                  <h4 className="text-xs font-bold uppercase text-primary tracking-wider">Personal Summary</h4>
                  <dl className="text-xs space-y-1">
                    <div className="flex justify-between border-b py-1">
                      <dt className="text-muted-foreground">Full Name:</dt>
                      <dd className="font-semibold text-foreground">{personal.first_name} {personal.middle_name} {personal.last_name}</dd>
                    </div>
                    <div className="flex justify-between border-b py-1">
                      <dt className="text-muted-foreground">Emails:</dt>
                      <dd className="font-semibold text-foreground">{personal.work_email || personal.personal_email || '—'}</dd>
                    </div>
                    <div className="flex justify-between border-b py-1">
                      <dt className="text-muted-foreground">Phone:</dt>
                      <dd className="font-semibold text-foreground">{personal.primary_phone || '—'}</dd>
                    </div>
                    <div className="flex justify-between py-1">
                      <dt className="text-muted-foreground">Location:</dt>
                      <dd className="font-semibold text-foreground">{personal.city ? `${personal.city}, ${personal.country}` : '—'}</dd>
                    </div>
                  </dl>
                </div>

                {/* Employment Review */}
                <div className="border rounded p-4 bg-muted/20 space-y-2">
                  <h4 className="text-xs font-bold uppercase text-primary tracking-wider">Employment Summary</h4>
                  <dl className="text-xs space-y-1">
                    <div className="flex justify-between border-b py-1">
                      <dt className="text-muted-foreground">Job Title:</dt>
                      <dd className="font-semibold text-foreground">{employment.job_title || '—'}</dd>
                    </div>
                    <div className="flex justify-between border-b py-1">
                      <dt className="text-muted-foreground">Employment Type:</dt>
                      <dd className="font-semibold text-foreground">{employment.employment_type}</dd>
                    </div>
                    <div className="flex justify-between border-b py-1">
                      <dt className="text-muted-foreground">Status:</dt>
                      <dd className="font-semibold text-foreground">{employment.employment_status}</dd>
                    </div>
                    <div className="flex justify-between py-1">
                      <dt className="text-muted-foreground">Hire Date:</dt>
                      <dd className="font-semibold text-foreground">{employment.hire_date || '—'}</dd>
                    </div>
                  </dl>
                </div>

                {/* Attachments Review */}
                <div className="border rounded p-4 bg-muted/20 space-y-2">
                  <h4 className="text-xs font-bold uppercase text-primary tracking-wider">Attachments</h4>
                  {canAttachContract && <p className="text-xs">Contract: {contractFile ? contractFile.name : 'No contract attached'}</p>}
                  <p className="text-xs">Photo: {photoFile ? photoFile.name : 'No photo uploaded'}</p>
                  <p className="text-xs">Resume: {resumeFile ? resumeFile.name : 'No resume uploaded'}</p>
                </div>

                {/* Emergency Contacts Review */}
                <div className="border rounded p-4 bg-muted/20 space-y-2">
                  <h4 className="text-xs font-bold uppercase text-primary tracking-wider">
                    Emergency Contacts ({emergencyContacts.length})
                  </h4>
                  {emergencyContacts.map((c, i) => (
                    <p key={i} className="text-xs text-foreground font-medium">
                      #{i + 1}: {c.full_name} ({c.relationship}) — {c.primary_phone} {c.address ? `• ${c.address}` : ''}
                    </p>
                  ))}
                  {emergencyContacts.length === 0 && <p className="text-xs text-muted-foreground">None added</p>}
                </div>
              </div>
            </div>
          )}

          {/* Action Footer */}
          <div className="sticky bottom-0 -mx-4 -mb-4 sm:-mx-6 sm:-mb-6 p-3.5 sm:px-6 sm:py-4 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-t border-slate-200 dark:border-slate-800 z-10 flex flex-row items-center justify-between gap-2.5 sm:gap-3 mt-6">
            <div>
              {step > 1 && (
                <button
                  type="button"
                  onClick={prevStep}
                  className="btn-secondary text-xs w-full sm:w-auto"
                  disabled={busy}
                >
                  <ArrowLeft size={14} /> Back
                </button>
              )}
            </div>
            <div className="flex flex-col-reverse sm:flex-row items-stretch sm:items-center gap-2.5 sm:gap-3 w-full sm:w-auto">
              <button
                type="button"
                onClick={onClose}
                className="btn-secondary text-xs w-full sm:w-auto"
                disabled={busy}
              >
                Cancel
              </button>

              {step < 5 ? (
                <button
                  type="button"
                  onClick={nextStep}
                  className="btn-primary text-xs w-full sm:w-auto"
                >
                  Continue <ArrowRight size={14} />
                </button>
              ) : (
                <button
                  type="button"
                  onClick={handleSubmit}
                  disabled={busy || !reviewReady}
                  className={`btn-primary text-xs w-full sm:w-auto ${!reviewReady ? 'opacity-50 cursor-not-allowed' : 'bg-emerald-700 hover:bg-emerald-800'}`}
                >
                  {busy ? 'Saving Employee...' : initial ? 'Save Changes' : 'Create Employee Profile'}
                </button>
              )}
            </div>
          </div>
        </form>
      </div>
    </Modal>
  );
}
