'use client';

import React from 'react';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import ProjectCommand from './ProjectCommand';

export default function ExecutiveProjectDetailView({
  projectId,
  onBack,
  backHref = '/executive-portal',
  backLabel = 'Back to Executive Portal',
  portalTheme = 'indigo',
}: {
  projectId: string;
  onBack?: () => void;
  backHref?: string;
  backLabel?: string;
  portalTheme?: 'indigo' | 'emerald' | 'orange' | 'violet';
}) {
  const themeClass =
    portalTheme === 'emerald'
      ? 'text-emerald-600 dark:text-emerald-400 hover:text-emerald-800 dark:hover:text-emerald-300'
      : portalTheme === 'orange'
      ? 'text-orange-600 dark:text-orange-400 hover:text-orange-800 dark:hover:text-orange-300'
      : portalTheme === 'violet'
      ? 'text-violet-600 dark:text-violet-400 hover:text-violet-800 dark:hover:text-violet-300'
      : 'text-indigo-600 dark:text-indigo-400 hover:text-indigo-800 dark:hover:text-indigo-300';

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 py-6 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto space-y-4">
        <div className="flex items-center justify-start border-b pb-3 border-slate-200 dark:border-slate-800">
          <div className="flex items-center gap-3">
            {onBack ? (
              <button
                type="button"
                onClick={onBack}
                className={`inline-flex items-center gap-1.5 text-xs font-bold ${themeClass} transition text-left justify-start`}
              >
                <ArrowLeft size={14} /> Back to Projects Table
              </button>
            ) : (
              <Link
                href={backHref}
                className={`inline-flex items-center gap-1.5 text-xs font-bold ${themeClass} transition text-left justify-start`}
              >
                <ArrowLeft size={14} /> {backLabel}
              </Link>
            )}
          </div>
        </div>

        <ProjectCommand projectId={projectId} onBack={onBack} readOnly={true} hideBackNav={true} />
      </div>
    </div>
  );
}

