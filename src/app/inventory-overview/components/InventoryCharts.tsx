'use client';

import React from 'react';
import { useData } from '@/components/DataUI';
import ConsumptionByProjectChart from './ConsumptionByProjectChart';
import ValueByCategoryChart from './ValueByCategoryChart';

interface InventoryChartsProps {
  storeId?: string;
  categoryId?: string;
  supplierId?: string;
  projectId?: string;
}

export default function InventoryCharts({
  storeId,
  categoryId,
  supplierId,
  projectId,
}: InventoryChartsProps) {
  const queryParams = new URLSearchParams();
  if (storeId) queryParams.set('store_id', storeId);
  if (categoryId) queryParams.set('category_id', categoryId);
  if (supplierId) queryParams.set('supplier_id', supplierId);
  if (projectId) queryParams.set('project_id', projectId);

  const url = '/api/v1/inventory/stats' + (queryParams.toString() ? '?' + queryParams.toString() : '');
  const statsRes = useData(url);
  const consumptionData = statsRes.data?.consumption_by_project || [];
  const valueCategoryData = statsRes.data?.value_by_category || [];

  return (
    <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
      <div className="card p-5">
        <div className="mb-4 flex items-center justify-between">
          <div>
            <p className="text-sm font-700 text-foreground">Consumption by Project</p>
            <p className="text-xs text-muted-foreground">Last 30 days — total value issued</p>
          </div>
          {statsRes.loading && <span className="text-[11px] text-muted-foreground animate-pulse">Loading live data...</span>}
        </div>
        <ConsumptionByProjectChart data={consumptionData} />
      </div>
      <div className="card p-5">
        <div className="mb-4 flex items-center justify-between">
          <div>
            <p className="text-sm font-700 text-foreground">Inventory Value by Category</p>
            <p className="text-xs text-muted-foreground">Current stock valuation breakdown</p>
          </div>
          {statsRes.loading && <span className="text-[11px] text-muted-foreground animate-pulse">Loading live data...</span>}
        </div>
        <ValueByCategoryChart data={valueCategoryData} />
      </div>
    </div>
  );
}