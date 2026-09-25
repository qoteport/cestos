'use client';

import React from 'react';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import EmployeeDetailView from './EmployeeDetailView';

export default function ExecutiveEmployeeDetailView({
  employeeId,
  onBack,
}: {
  employeeId: string;
  onBack?: () => void;
}) {
  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 py-6 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto space-y-4">
        <div className="flex items-center justify-start border-b pb-3 border-slate-200 dark:border-slate-800">
          <div className="flex items-center gap-3">
            {onBack ? (
              <button
                type="button"
                onClick={onBack}
                className="inline-flex items-center gap-1.5 text-xs font-bold text-indigo-600 dark:text-indigo-400 hover:text-indigo-800 dark:hover:text-indigo-300 transition text-left justify-start"
              >
                <ArrowLeft size={14} /> Back to Employees Table
              </button>
            ) : (
              <Link
                href="/executive-portal"
                className="inline-flex items-center gap-1.5 text-xs font-bold text-indigo-600 dark:text-indigo-400 hover:text-indigo-800 dark:hover:text-indigo-300 transition text-left justify-start"
              >
                <ArrowLeft size={14} /> Back to Executive Portal
              </Link>
            )}
          </div>
        </div>

        <EmployeeDetailView employeeId={employeeId} onClose={onBack} readOnly={true} hideBackButton={true} />
      </div>
    </div>
  );
}
