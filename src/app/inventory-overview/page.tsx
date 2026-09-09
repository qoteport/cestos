import React from 'react';
import AppLayout from '@/components/AppLayout';
import InventoryPageHeader from './components/InventoryPageHeader';
import InventoryKPIGrid from './components/InventoryKPIGrid';
import CriticalActionRequired from './components/CriticalActionRequired';
import RecentMovements from './components/RecentMovements';
import InventoryCharts from './components/InventoryCharts';

export default function InventoryOverviewPage() {
  return (
    <AppLayout>
      <div className="space-y-6 fade-in">
        <InventoryPageHeader />
        <InventoryKPIGrid />
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
          <div className="xl:col-span-2">
            <CriticalActionRequired />
          </div>
          <div>
            <RecentMovements />
          </div>
        </div>
        <InventoryCharts />
      </div>
    </AppLayout>
  );
}