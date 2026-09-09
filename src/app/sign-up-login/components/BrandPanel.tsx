import React from 'react';
import AppLogo from '@/components/ui/AppLogo';

const STATS = [
  { id: 'bp-stat-projects', label: 'Active Projects', value: '6' },
  { id: 'bp-stat-employees', label: 'Deployed Employees', value: '147' },
  { id: 'bp-stat-assets', label: 'Operating Assets', value: '18' },
  { id: 'bp-stat-stores', label: 'Inventory Stores', value: '9' },
];

const FEATURES = [
  { id: 'bp-feat-workforce', text: 'Workforce & rotation management' },
  { id: 'bp-feat-fleet', text: 'Equipment fleet command center' },
  { id: 'bp-feat-inventory', text: 'Full inventory lifecycle tracking' },
  { id: 'bp-feat-projects', text: 'Cross-domain project visibility' },
];

export default function BrandPanel() {
  return (
    <div className="hidden lg:flex flex-col w-[480px] xl:w-[520px] flex-shrink-0 gradient-brand text-white relative overflow-hidden">
      {/* Background grid decoration */}
      <div
        className="absolute inset-0 opacity-5"
        style={{
          backgroundImage: `repeating-linear-gradient(0deg, transparent, transparent 40px, rgba(255,255,255,0.3) 40px, rgba(255,255,255,0.3) 41px), repeating-linear-gradient(90deg, transparent, transparent 40px, rgba(255,255,255,0.3) 40px, rgba(255,255,255,0.3) 41px)`,
        }}
      />

      <div className="relative z-10 flex flex-col h-full p-10 xl:p-12">
        {/* Logo */}
        <div className="flex items-center gap-3 mb-12">
          <AppLogo size={36} />
          <div>
            <p className="text-lg font-bold leading-tight">Cestos Operations</p>
            <p className="text-xs text-blue-200 font-400">Field Operations Command Platform</p>
          </div>
        </div>

        {/* Hero copy */}
        <div className="mb-10">
          <h1 className="text-3xl xl:text-4xl font-700 leading-tight mb-4" style={{ letterSpacing: '-0.02em' }}>
            One platform for your entire operations.
          </h1>
          <p className="text-blue-200 text-base leading-relaxed">
            Manage workforce, equipment fleet, and inventory across all active drill sites from a single command center.
          </p>
        </div>

        {/* Feature list */}
        <div className="space-y-3 mb-10">
          {FEATURES?.map(f => (
            <div key={f?.id} className="flex items-center gap-3">
              <div className="w-5 h-5 rounded-full border-2 border-blue-300 flex items-center justify-center flex-shrink-0">
                <div className="w-2 h-2 rounded-full bg-blue-300" />
              </div>
              <span className="text-sm text-blue-100 font-400">{f?.text}</span>
            </div>
          ))}
        </div>

        {/* Stats grid */}
        <div className="grid grid-cols-2 gap-3 mt-auto">
          {STATS?.map(s => (
            <div key={s?.id} className="bg-white/10 rounded border border-white/20 px-4 py-3">
              <p className="text-2xl font-700 tabular-nums">{s?.value}</p>
              <p className="text-xs text-blue-200 font-400 mt-0.5">{s?.label}</p>
            </div>
          ))}
        </div>

        <p className="text-2xs text-blue-300 mt-6">
          Live operational data • Sep 9, 2026
        </p>
      </div>
    </div>
  );
}