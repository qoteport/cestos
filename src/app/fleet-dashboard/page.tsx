import React from 'react';
import AppLayout from '@/components/AppLayout';
import FleetPageHeader from './components/FleetPageHeader';
import FleetKPIGrid from './components/FleetKPIGrid';
import FleetAttentionPanel from './components/FleetAttentionPanel';
import FleetByProjectChart from './components/FleetByProjectChart';
import AssetStatusTable from './components/AssetStatusTable';

export default function FleetDashboardPage() {
  return (
    <AppLayout>
      <div className="space-y-6 fade-in">
        <FleetPageHeader />
        <FleetKPIGrid />
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
          <div className="xl:col-span-1">
            <FleetAttentionPanel />
          </div>
          <div className="xl:col-span-2">
            <FleetByProjectChart />
          </div>
        </div>
        <AssetStatusTable />
      </div>
    </AppLayout>
  );
}