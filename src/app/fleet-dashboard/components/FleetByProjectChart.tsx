'use client';
import React from 'react';
import dynamic from 'next/dynamic';

const FleetBarChart = dynamic(() => import('./FleetBarChart'), { ssr: false });

export default function FleetByProjectChart() {
  return (
    <div className="card p-5 h-full">
      <div className="flex items-center justify-between mb-4">
        <div>
          <p className="text-sm font-700 text-foreground">Fleet by Project</p>
          <p className="text-xs text-muted-foreground">Current asset assignment distribution</p>
        </div>
        <div className="flex items-center gap-3 text-xs text-muted-foreground">
          <div className="flex items-center gap-1.5">
            <div className="w-2.5 h-2.5 rounded-sm bg-primary" />
            <span>Operating</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-2.5 h-2.5 rounded-sm bg-amber-400" />
            <span>Standby/Maint.</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-2.5 h-2.5 rounded-sm bg-red-400" />
            <span>Breakdown</span>
          </div>
        </div>
      </div>
      <FleetBarChart />
    </div>
  );
}