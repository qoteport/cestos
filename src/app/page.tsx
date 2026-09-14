'use client';

import React, { useState } from 'react';
import AppLayout from '@/components/AppLayout';
import DashboardHeader from './components/DashboardHeader';
import KPIBentoGrid from './components/KPIBentoGrid';
import DashboardCharts from './components/DashboardCharts';
import NeedsAttentionPanel from './components/NeedsAttentionPanel';
import ProjectCards from './components/ProjectCards';
import ActivityFeed from './components/ActivityFeed';

export default function Page() {
  const [timeframe, setTimeframe] = useState('all_time');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [projectId, setProjectId] = useState('');
  const [status, setStatus] = useState('');
  const [refreshKey, setRefreshKey] = useState(0);

  const handleRefresh = () => {
    setRefreshKey((prev) => prev + 1);
  };

  return (
    <AppLayout>
      <div key={refreshKey} className="space-y-6 fade-in">
        {/* Executive Header with Filter Controls */}
        <DashboardHeader
          timeframe={timeframe}
          setTimeframe={setTimeframe}
          dateFrom={dateFrom}
          setDateFrom={setDateFrom}
          dateTo={dateTo}
          setDateTo={setDateTo}
          projectId={projectId}
          setProjectId={setProjectId}
          status={status}
          setStatus={setStatus}
          onRefresh={handleRefresh}
        />

        {/* Expanded 8-Card Executive KPI Metrics */}
        <KPIBentoGrid
          timeframe={timeframe}
          dateFrom={dateFrom}
          dateTo={dateTo}
          projectId={projectId}
          status={status}
        />

        {/* Executive Charts Panel (2x2 Grid) */}
        <DashboardCharts
          timeframe={timeframe}
          dateFrom={dateFrom}
          dateTo={dateTo}
          projectId={projectId}
          status={status}
        />

        {/* Bottom Section: Operations, Projects & Activity Feed */}
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
