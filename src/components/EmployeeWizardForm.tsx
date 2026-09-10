'use client';

import React, { useState, useEffect, ChangeEvent, FormEvent } from 'react';
import { X, ArrowLeft, ArrowRight, Check, Upload, Plus, Trash2, User, Briefcase, FileText, Phone, ShieldCheck } from 'lucide-react';
import { apiFetch } from '@/lib/api';
import { Modal, Row, display } from './DataUI';

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
  const [step, setStep] = useState(1);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

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
    department_id: initial?.department_id || '',
    position_id: initial?.position_id || '',
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
      .then(d => { if (active) setDepartments(Array.isArray(d) ? d : d.items || []); })
      .catch(() => {});
    apiFetch<any>('/api/v1/positions?page_size=100')
      .then(d => { if (active) setPositions(Array.isArray(d) ? d : d.items || []); })
      .catch(() => {});
    apiFetch<any>('/api/v1/employees?page_size=100')
      .then(d => { if (active) setSupervisors(Array.isArray(d) ? d : d.items || []); })
      .catch(() => {});
    apiFetch<any>('/api/v1/locations?page_size=100')
      .then(d => { if (active) setLocations(Array.isArray(d) ? d : d.items || []); })
      .catch(() => {});
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
    if (!validateStep(step)) return;

    setBusy(true);
    setError('');

    try {
      // Build main payload
      const payload: Record<string, any> = {};

      Object.entries({ ...personal, ...employment }).forEach(([k, v]) => {
        if (v !== '' && v !== null && v !== undefined) {
          payload[k] = v;
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
      <div className="space-y-6">
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
                      ? 'bg-emerald-50 text-emerald-800 border-emerald-300'
                      : 'bg-muted/50 text-muted-foreground border-transparent hover:bg-muted'
                  }`}
                >
                  <span className={`w-5 h-5 flex items-center justify-center rounded-full text-[10px] font-bold ${
                    isActive ? 'bg-white text-primary' : isDone ? 'bg-emerald-600 text-white' : 'bg-muted-foreground/20'
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

        <form onSubmit={handleSubmit} className="space-y-6">
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
                  <label className="block text-xs font-semibold mb-1">Preferred Name</label>
                  <input
                    className="input-field"
                    value={personal.preferred_name}
                    onChange={e => setPersonal({ ...personal, preferred_name: e.target.value })}
                    placeholder="e.g. Johnny"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold mb-1">Gender</label>
                  <select
                    className="input-field"
                    value={personal.gender}
                    onChange={e => setPersonal({ ...personal, gender: e.target.value })}
                  >
                    <option value="">Select gender...</option>
                    <option value="Male">Male</option>
                    <option value="Female">Female</option>
                    <option value="Other">Other</option>
                    <option value="Prefer Not To Say">Prefer Not To Say</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold mb-1">Date of Birth</label>
                  <input
                    type="date"
                    className="input-field"
                    value={personal.date_of_birth}
                    onChange={e => setPersonal({ ...personal, date_of_birth: e.target.value })}
                  />
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
                  <select
                    className="input-field"
                    value={personal.marital_status}
                    onChange={e => setPersonal({ ...personal, marital_status: e.target.value })}
                  >
                    <option value="">Select status...</option>
                    <option value="Single">Single</option>
                    <option value="Married">Married</option>
                    <option value="Divorced">Divorced</option>
                    <option value="Widowed">Widowed</option>
                    <option value="Separated">Separated</option>
                  </select>
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
                  <select
                    className="input-field"
                    value={employment.department_id}
                    onChange={e => setEmployment({ ...employment, department_id: e.target.value })}
                  >
                    <option value="">Select department...</option>
                    {departments.map(d => (
                      <option key={d.id} value={d.id}>{d.name || d.code}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold mb-1">Position</label>
                  <select
                    className="input-field"
                    value={employment.position_id}
                    onChange={e => setEmployment({ ...employment, position_id: e.target.value })}
                  >
                    <option value="">Select position...</option>
                    {positions.map(p => (
                      <option key={p.id} value={p.id}>{p.title}</option>
                    ))}
                  </select>
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
                  <select
                    className="input-field"
                    value={employment.employment_type}
                    onChange={e => setEmployment({ ...employment, employment_type: e.target.value })}
                  >
                    <option value="FULL_TIME">Full Time</option>
                    <option value="PART_TIME">Part Time</option>
                    <option value="CONTRACT">Contract</option>
                    <option value="CASUAL">Casual</option>
                    <option value="TEMPORARY">Temporary</option>
                    <option value="CONSULTANT">Consultant</option>
                    <option value="INTERN">Intern</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold mb-1">Employment Status</label>
                  <select
                    className="input-field"
                    value={employment.employment_status}
                    onChange={e => setEmployment({ ...employment, employment_status: e.target.value })}
                  >
                    <option value="ACTIVE">Active</option>
                    <option value="ON_LEAVE">On Leave</option>
                    <option value="OFF_ROTATION">Off Rotation</option>
                    <option value="SUSPENDED">Suspended</option>
                    <option value="EXITED">Exited</option>
                    <option value="RESIGNED">Resigned</option>
                    <option value="TERMINATED">Terminated</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold mb-1">Availability Status</label>
                  <select
                    className="input-field"
                    value={employment.availability_status}
                    onChange={e => setEmployment({ ...employment, availability_status: e.target.value })}
                  >
                    <option value="AVAILABLE">Available</option>
                    <option value="ASSIGNED">Assigned</option>
                    <option value="ON_LEAVE">On Leave</option>
                    <option value="OFF_ROTATION">Off Rotation</option>
                    <option value="TRAINING">Training</option>
                    <option value="UNAVAILABLE">Unavailable</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold mb-1">Hire Date</label>
                  <input
                    type="date"
                    className="input-field"
                    value={employment.hire_date}
                    onChange={e => setEmployment({ ...employment, hire_date: e.target.value })}
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold mb-1">Supervisor</label>
                  <select
                    className="input-field"
                    value={employment.supervisor_id}
                    onChange={e => setEmployment({ ...employment, supervisor_id: e.target.value })}
                  >
                    <option value="">Select supervisor...</option>
                    {supervisors.map(s => (
                      <option key={s.id} value={s.id}>
                        {s.first_name || s.last_name ? `${s.first_name || ''} ${s.last_name || ''}`.trim() : s.id}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold mb-1">Home Location</label>
                  <select
                    className="input-field"
                    value={employment.home_location_id}
                    onChange={e => setEmployment({ ...employment, home_location_id: e.target.value })}
                  >
                    <option value="">Select home location...</option>
                    {locations.map(l => (
                      <option key={l.id} value={l.id}>{l.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold mb-1">Contract End Date</label>
                  <input
                    type="date"
                    className="input-field"
                    value={employment.contract_end_date}
                    onChange={e => setEmployment({ ...employment, contract_end_date: e.target.value })}
                  />
                </div>
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
                          <select
                            required
                            className="input-field text-xs"
                            value={contact.relationship}
                            onChange={e => updateEmergencyContact(index, 'relationship', e.target.value)}
                          >
                            <option value="">Select relationship...</option>
                            <option value="Spouse">Spouse</option>
                            <option value="Parent">Parent</option>
                            <option value="Sibling">Sibling</option>
                            <option value="Child">Child</option>
                            <option value="Partner">Partner</option>
                            <option value="Relative">Relative</option>
                            <option value="Friend">Friend</option>
                            <option value="Guardian">Guardian</option>
                            <option value="Colleague">Colleague</option>
                            <option value="Other">Other</option>
                          </select>
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
                      #{i + 1}: {c.full_name} ({c.relationship}) — {c.primary_phone}
                    </p>
                  ))}
                  {emergencyContacts.length === 0 && <p className="text-xs text-muted-foreground">None added</p>}
                </div>
              </div>
            </div>
          )}

          {/* Action Footer */}
          <div className="flex items-center justify-between border-t pt-4">
            <div>
              {step > 1 && (
                <button
                  type="button"
                  onClick={prevStep}
                  className="btn-secondary text-xs"
                  disabled={busy}
                >
                  <ArrowLeft size={14} /> Back
                </button>
              )}
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onClose}
                className="btn-secondary text-xs"
                disabled={busy}
              >
                Cancel
              </button>

              {step < 5 ? (
                <button
                  type="button"
                  onClick={nextStep}
                  className="btn-primary text-xs"
                >
                  Continue <ArrowRight size={14} />
                </button>
              ) : (
                <button
                  type="submit"
                  disabled={busy}
                  className="btn-primary text-xs bg-emerald-700 hover:bg-emerald-800"
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
