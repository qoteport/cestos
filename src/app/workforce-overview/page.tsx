'use client';

import React from 'react';
import AppLayout from '@/components/AppLayout';
import WorkforcePageHeader from './components/WorkforcePageHeader';
import WorkforceKPIStrip from './components/WorkforceKPIStrip';
import WorkforceCharts from './components/WorkforceCharts';
import UpcomingRotations from './components/UpcomingRotations';
import ComplianceAttention from './components/ComplianceAttention';

export default function Page() {
  return (
    <AppLayout>
      <div className="space-y-6 fade-in">
        <WorkforcePageHeader />
        <WorkforceKPIStrip />
        <WorkforceCharts />
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
          <div className="xl:col-span-2">
            <UpcomingRotations />
          </div>
          <div>
            <ComplianceAttention />
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
