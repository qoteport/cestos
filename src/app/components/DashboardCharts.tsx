'use client';
import React from 'react';
import dynamic from 'next/dynamic';

const ConsumptionTrendChart = dynamic(() => import('./ConsumptionTrendChart'), { ssr: false });
const WorkforceDistributionChart = dynamic(() => import('./WorkforceDistributionChart'), { ssr: false });

export default function DashboardCharts() {
  return (
    <div className="grid grid-cols-1 xl:grid-cols-2 2xl:grid-cols-2 gap-6">
      <div className="card p-5">
        <div className="flex items-center justify-between mb-4">
          <div>
            <p className="text-sm font-700 text-foreground">Inventory Consumption</p>
            <p className="text-xs text-muted-foreground">Last 30 days by project</p>
          </div>
          <span className="badge badge-neutral">Aug 10 – Sep 9</span>
        </div>
        <ConsumptionTrendChart />
      </div>
      <div className="card p-5">
        <div className="flex items-center justify-between mb-4">
          <div>
            <p className="text-sm font-700 text-foreground">Workforce by Project</p>
            <p className="text-xs text-muted-foreground">Current assignment distribution</p>
          </div>
        </div>
        <WorkforceDistributionChart />
      </div>
    </div>
  );
}