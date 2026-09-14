'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import AppLayout from '@/components/AppLayout';
import EmployeeWizardForm from '@/components/EmployeeWizardForm';
import WorkforcePageHeader from './components/WorkforcePageHeader';
import WorkforceKPIStrip from './components/WorkforceKPIStrip';
import WorkforceCharts from './components/WorkforceCharts';
import UpcomingRotations from './components/UpcomingRotations';
import ComplianceAttention from './components/ComplianceAttention';

export default function Page() {
  const router = useRouter();
  const [addingEmployee, setAddingEmployee] = useState(false);

  // Filter state
  const [departmentId, setDepartmentId] = useState('');
  const [employmentStatus, setEmploymentStatus] = useState('');
  const [availabilityStatus, setAvailabilityStatus] = useState('');
  const [projectId, setProjectId] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  return (
    <AppLayout>
      <div className="space-y-6 fade-in">
        <WorkforcePageHeader
          onAddEmployee={() => setAddingEmployee(true)}
          departmentId={departmentId}
          setDepartmentId={setDepartmentId}
          employmentStatus={employmentStatus}
          setEmploymentStatus={setEmploymentStatus}
          availabilityStatus={availabilityStatus}
          setAvailabilityStatus={setAvailabilityStatus}
          projectId={projectId}
          setProjectId={setProjectId}
          dateFrom={dateFrom}
          setDateFrom={setDateFrom}
          dateTo={dateTo}
          setDateTo={setDateTo}
        />
        <WorkforceKPIStrip
          departmentId={departmentId}
          employmentStatus={employmentStatus}
          availabilityStatus={availabilityStatus}
          projectId={projectId}
          dateFrom={dateFrom}
          dateTo={dateTo}
        />
        <WorkforceCharts
          departmentId={departmentId}
          employmentStatus={employmentStatus}
          availabilityStatus={availabilityStatus}
          projectId={projectId}
        />
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
          <div className="xl:col-span-2">
            <UpcomingRotations />
          </div>
          <div>
            <ComplianceAttention />
          </div>
        </div>
      </div>
      {addingEmployee && (
        <EmployeeWizardForm
          onClose={() => setAddingEmployee(false)}
          onSaved={(emp) => {
            setAddingEmployee(false);
            if (emp?.id) router.push('/workspace/employees/' + emp.id);
          }}
        />
      )}
    </AppLayout>
  );
}
