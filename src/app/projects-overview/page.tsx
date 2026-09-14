'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import AppLayout from '@/components/AppLayout';
import RecordForm from '@/components/RecordForm';
import { operation } from '@/components/ResourceWorkspace';
import { ProjectRegister } from '@/components/ProjectDashboard';
import ProjectsPageHeader from './components/ProjectsPageHeader';
import ProjectsKPIStrip from './components/ProjectsKPIStrip';
import ProjectsCharts from './components/ProjectsCharts';

export default function Page() {
  const router = useRouter();
  const [creating, setCreating] = useState(false);

  // DB Filter States
  const [statusFilter, setStatusFilter] = useState('');
  const [clientId, setClientId] = useState('');
  const [locationId, setLocationId] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  return (
    <AppLayout>
      <div className="space-y-6 fade-in">
        <ProjectsPageHeader
          onAddProject={() => setCreating(true)}
          statusFilter={statusFilter}
          setStatusFilter={setStatusFilter}
          clientId={clientId}
          setClientId={setClientId}
          locationId={locationId}
          setLocationId={setLocationId}
          dateFrom={dateFrom}
          setDateFrom={setDateFrom}
          dateTo={dateTo}
          setDateTo={setDateTo}
        />
        <ProjectsKPIStrip
          statusFilter={statusFilter}
          clientId={clientId}
          locationId={locationId}
          dateFrom={dateFrom}
          dateTo={dateTo}
        />
        <ProjectsCharts />
        <ProjectRegister dashboard />
      </div>
      {creating && (
        <RecordForm
          resource="projects"
          path="/api/v1/projects"
          operation={operation('/api/v1/projects', 'POST') || {}}
          onClose={() => setCreating(false)}
          onSaved={(r) => {
            setCreating(false);
            router.push('/project-command-center?project=' + r.id);
          }}
        />
      )}
    </AppLayout>
  );
}
