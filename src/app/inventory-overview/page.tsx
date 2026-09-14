'use client';

import React, { useState } from 'react';
import AppLayout from '@/components/AppLayout';
import InventoryPageHeader from './components/InventoryPageHeader';
import InventoryKPIGrid from './components/InventoryKPIGrid';
import CriticalActionRequired from './components/CriticalActionRequired';
import RecentMovements from './components/RecentMovements';
import InventoryCharts from './components/InventoryCharts';

export default function Page() {
  const [refreshKey, setRefreshKey] = useState(0);

  // DB Filter States
  const [storeId, setStoreId] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [supplierId, setSupplierId] = useState('');
  const [projectId, setProjectId] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  return (
    <AppLayout>
      <div className="space-y-6 fade-in">
        <InventoryPageHeader
          onRefresh={() => setRefreshKey((k) => k + 1)}
          storeId={storeId}
          setStoreId={setStoreId}
          categoryId={categoryId}
          setCategoryId={setCategoryId}
          supplierId={supplierId}
          setSupplierId={setSupplierId}
          projectId={projectId}
          setProjectId={setProjectId}
          dateFrom={dateFrom}
          setDateFrom={setDateFrom}
          dateTo={dateTo}
          setDateTo={setDateTo}
        />
        <InventoryKPIGrid
          key={`kpi-${refreshKey}`}
          storeId={storeId}
          categoryId={categoryId}
          supplierId={supplierId}
          projectId={projectId}
          dateFrom={dateFrom}
          dateTo={dateTo}
        />
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
          <div className="xl:col-span-2">
            <CriticalActionRequired key={`crit-${refreshKey}`} />
          </div>
          <div>
            <RecentMovements key={`mov-${refreshKey}`} />
          </div>
        </div>
        <InventoryCharts
          key={`charts-${refreshKey}`}
          storeId={storeId}
          categoryId={categoryId}
          supplierId={supplierId}
          projectId={projectId}
        />
      </div>
    </AppLayout>
  );
}
