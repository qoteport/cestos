import React from 'react';
import AppLayout from '@/components/AppLayout';
import ProjectHeader from './components/ProjectHeader';
import ProjectKPIStrip from './components/ProjectKPIStrip';
import ProjectTabs from './components/ProjectTabs';

export default function ProjectCommandCenterPage() {
  return (
    <AppLayout>
      <div className="space-y-5 fade-in">
        <ProjectHeader />
        <ProjectKPIStrip />
        <ProjectTabs />
      </div>
    </AppLayout>
  );
}