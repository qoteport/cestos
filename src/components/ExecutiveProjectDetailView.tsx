'use client';

import React from 'react';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import ProjectCommand from './ProjectCommand';

export default function ExecutiveProjectDetailView({
  projectId,
  onBack,
}: {
  projectId: string;
  onBack?: () => void;
}) {
  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 py-6 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto space-y-4">
        <div className="flex items-center justify-between border-b pb-3 border-slate-200 dark:border-slate-800">
          <div className="flex items-center gap-3">
            {onBack ? (
              <button
                type="button"
                onClick={onBack}
                className="inline-flex items-center gap-1.5 text-xs font-bold text-indigo-600 dark:text-indigo-400 hover:text-indigo-800 dark:hover:text-indigo-300 transition"
              >
                <ArrowLeft size={14} /> Back to Projects Table
              </button>
            ) : (
              <Link
                href="/executive-portal"
                className="inline-flex items-center gap-1.5 text-xs font-bold text-indigo-600 dark:text-indigo-400 hover:text-indigo-800 dark:hover:text-indigo-300 transition"
              >
                <ArrowLeft size={14} /> Back to Executive Portal
              </Link>
            )}
          </div>
          <span className="text-xs font-bold text-slate-500 bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 px-3 py-1 rounded-full border border-indigo-200 dark:border-indigo-800">
            Executive View A Read Only Mode
          </span>
        </div>

        <ProjectCommand projectId={projectId} onBack={onBack} readOnly={true} />
      </div>
    </div>
  );
}

