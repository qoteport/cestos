'use client';
import React from 'react';
import dynamic from 'next/dynamic';

const ConsumptionByProjectChart = dynamic(() => import('./ConsumptionByProjectChart'), { ssr: false });
const ValueByCategoryChart = dynamic(() => import('./ValueByCategoryChart'), { ssr: false });

export default function InventoryCharts() {
  return (
    <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
      <div className="card p-5">
        <div className="mb-4">
          <p className="text-sm font-700 text-foreground">Consumption by Project</p>
          <p className="text-xs text-muted-foreground">Last 30 days — total value issued</p>
        </div>
        <ConsumptionByProjectChart />
      </div>
      <div className="card p-5">
        <div className="mb-4">
          <p className="text-sm font-700 text-foreground">Inventory Value by Category</p>
          <p className="text-xs text-muted-foreground">Current stock valuation breakdown</p>
        </div>
        <ValueByCategoryChart />
      </div>
    </div>
  );
}