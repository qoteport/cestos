'use client';

import React from 'react';
import AppLayout from '@/components/AppLayout';
import DashboardHeader from './components/DashboardHeader';
import KPIBentoGrid from './components/KPIBentoGrid';
import NeedsAttentionPanel from './components/NeedsAttentionPanel';
import ProjectCards from './components/ProjectCards';
import ActivityFeed from './components/ActivityFeed';

export default function Page() {
  return (
    <AppLayout>
      <div className="space-y-6 fade-in">
        <DashboardHeader />
        <KPIBentoGrid />
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
          <div className="xl:col-span-2 space-y-6">
            <NeedsAttentionPanel />
            <ProjectCards />
          </div>
          <div>
            <ActivityFeed />
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
