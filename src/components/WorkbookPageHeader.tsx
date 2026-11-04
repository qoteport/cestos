'use client';
import type {ReactNode} from 'react';
import {ArrowLeft} from 'lucide-react';

/** Header for full pages inside the Workbooks window (Quick answers, Dashboards). */
export default function WorkbookPageHeader({backLabel,onBack,icon,title,subtitle,actions,toolbar}:{backLabel:string;onBack:()=>void;icon:ReactNode;title:string;subtitle?:string;actions?:ReactNode;toolbar?:ReactNode}){
  return <header className="shrink-0 border-b border-slate-200 bg-white px-4 py-3 dark:border-slate-800 dark:bg-slate-900 sm:px-6">
    <nav aria-label="Breadcrumb" className="mb-2 flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400">
      <button type="button" onClick={onBack} className="inline-flex items-center gap-1 rounded px-1.5 py-0.5 font-medium text-emerald-700 hover:bg-emerald-50 hover:text-emerald-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600/40 dark:text-emerald-300 dark:hover:bg-emerald-950"><ArrowLeft size={14}/>{backLabel}</button>
      <span aria-hidden="true">/</span><span aria-current="page">{title}</span>
    </nav>
    <div className="flex flex-wrap items-center gap-3">
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300">{icon}</span>
      <div className="min-w-0 flex-1"><h2 className="text-lg font-semibold leading-tight text-slate-900 dark:text-white">{title}</h2>{subtitle&&<p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">{subtitle}</p>}</div>
      <div data-cestos-desktop-slot className="flex flex-wrap items-center gap-1 empty:hidden"/>
      {actions&&<div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </div>
    {toolbar&&<div className="mt-3 border-t border-slate-100 pt-3 dark:border-slate-800">{toolbar}</div>}
  </header>;
}
