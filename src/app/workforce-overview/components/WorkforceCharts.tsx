'use client';
import React from 'react';
import dynamic from 'next/dynamic';

const EmployeesByDeptChart = dynamic(() => import('./EmployeesByDeptChart'), { ssr: false });
const EmployeesByProjectChart = dynamic(() => import('./EmployeesByProjectChart'), { ssr: false });

export default function WorkforceCharts() {
  return (
    <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
      <div className="card p-5">
        <div className="mb-4">
          <p className="text-sm font-700 text-foreground">Employees by Department</p>
          <p className="text-xs text-muted-foreground">Current headcount per department</p>
        </div>
        <EmployeesByDeptChart />
      </div>
      <div className="card p-5">
        <div className="mb-4">
          <p className="text-sm font-700 text-foreground">Employees by Project</p>
          <p className="text-xs text-muted-foreground">Current deployment distribution</p>
        </div>
        <EmployeesByProjectChart />
      </div>
    </div>
  );
}