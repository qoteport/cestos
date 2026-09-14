'use client';

import React from 'react';
import dynamic from 'next/dynamic';

const DrillingPerformanceChart = dynamic(() => import('./DrillingPerformanceChart'), { ssr: false });
const AssetStatusChart = dynamic(() => import('./AssetStatusChart'), { ssr: false });
const ConsumptionTrendChart = dynamic(() => import('./ConsumptionTrendChart'), { ssr: false });
const WorkforceDistributionChart = dynamic(() => import('./WorkforceDistributionChart'), { ssr: false });

interface DashboardChartsProps {
  timeframe?: string;
  dateFrom?: string;
  dateTo?: string;
  projectId?: string;
  status?: string;
}

export default function DashboardCharts({ projectId, status, dateFrom, dateTo }: DashboardChartsProps) {
  return (
    <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
      {/* Chart 1: Drilling Performance Trend */}
      <div className="card p-5">
        <div className="flex items-center justify-between mb-4">
          <div>
            <p className="text-sm font-700 text-foreground">Drilling Production Performance</p>
            <p className="text-xs text-muted-foreground">Monthly metres drilled and completed holes</p>
          </div>
          <span className="badge badge-neutral">Production</span>
        </div>
        <DrillingPerformanceChart projectId={projectId} />
      </div>

      {/* Chart 2: Fleet Status & Health */}
      <div className="card p-5">
        <div className="flex items-center justify-between mb-4">
          <div>
            <p className="text-sm font-700 text-foreground">Fleet Status & Asset Health</p>
            <p className="text-xs text-muted-foreground">Operating, available, maintenance, and breakdown ratio</p>
          </div>
          <span className="badge badge-neutral">Fleet</span>
        </div>
        <AssetStatusChart />
      </div>

      {/* Chart 3: Inventory Consumption Trend */}
      <div className="card p-5">
        <div className="flex items-center justify-between mb-4">
          <div>
            <p className="text-sm font-700 text-foreground">Inventory Consumption Trend</p>
            <p className="text-xs text-muted-foreground">Material consumption over time across major projects</p>
          </div>
          <span className="badge badge-neutral">Inventory</span>
        </div>
        <ConsumptionTrendChart />
      </div>

      {/* Chart 4: Workforce Distribution */}
      <div className="card p-5">
        <div className="flex items-center justify-between mb-4">
          <div>
            <p className="text-sm font-700 text-foreground">Workforce Deployment</p>
            <p className="text-xs text-muted-foreground">Employee assignment distribution per operational project</p>
          </div>
          <span className="badge badge-neutral">Workforce</span>
        </div>
        <WorkforceDistributionChart />
      </div>
    </div>
  );
}