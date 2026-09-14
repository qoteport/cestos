'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Truck, AlertTriangle, Search, RefreshCw, ArrowLeft, ExternalLink, ShieldAlert, ShieldCheck, Clock, CheckCircle, Filter } from 'lucide-react';
import { apiFetch } from '@/lib/api';

interface ExpiringItem {
  id: string;
  asset_id: string | null;
  asset_name: string;
  asset_number: string;
  category: 'REGISTRATION' | 'INSURANCE' | 'WARRANTY' | 'CRITICAL_DEFECT';
  document_type: string;
  reference_number: string;
  provider_or_authority: string;
  expiry_date: string | null;
  days_remaining: number;
  urgency: 'EXPIRED' | 'CRITICAL' | 'WARNING' | 'UPCOMING';
  status: string;
  notes: string;
}

export default function EquipmentExpiringDocumentsWorkspace() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState<ExpiringItem[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [daysFilter, setDaysFilter] = useState<'30' | '60' | '90' | '180'>('60');
  const [categoryFilter, setCategoryFilter] = useState<string>('ALL');
  const [version, setVersion] = useState(0);

  const reload = () => setVersion(v => v + 1);

  useEffect(() => {
    let active = true;
    setLoading(true);

    apiFetch<ExpiringItem[]>(`/api/v1/assets/expiring-documents?days=${daysFilter}`)
      .then(res => {
        if (!active) return;
        setItems(Array.isArray(res) ? res : []);
        setLoading(false);
      })
      .catch(err => {
        console.error('Failed to load expiring equipment documents:', err);
        if (!active) return;
        setItems([]);
        setLoading(false);
      });

    return () => { active = false; };
  }, [daysFilter, version]);

  const filteredItems = items.filter(item => {
    const searchStr = `${item.asset_name} ${item.asset_number} ${item.document_type} ${item.reference_number} ${item.provider_or_authority} ${item.notes}`.toLowerCase();
    const matchesSearch = searchStr.includes(searchQuery.toLowerCase());
    const matchesCategory = categoryFilter === 'ALL' || item.category === categoryFilter;
    return matchesSearch && matchesCategory;
  });

  const totalExpiring = items.length;
  const criticalCount = items.filter(i => i.urgency === 'CRITICAL' || i.urgency === 'EXPIRED' || i.days_remaining <= 7).length;
  const insuranceCount = items.filter(i => i.category === 'INSURANCE').length;
  const regCount = items.filter(i => i.category === 'REGISTRATION').length;
  const warrantyCount = items.filter(i => i.category === 'WARRANTY').length;
  const defectCount = items.filter(i => i.category === 'CRITICAL_DEFECT').length;

  return (
    <div className="space-y-6 fade-in p-4 sm:p-6">
      {/* Header Bar */}
      <div className="flex flex-wrap justify-between items-center gap-4 border-b border-border pb-4">
        <div>
          <Link href="/fleet-dashboard" className="text-xs text-primary flex items-center gap-1 mb-2 hover:underline font-medium">
            <ArrowLeft size={12} /> Fleet & Equipment Dashboard
          </Link>
          <h1 className="text-2xl font-bold text-foreground tracking-tight flex items-center gap-2">
            <Truck className="h-6 w-6 text-primary" /> Expiring Equipment Licences & Compliance
          </h1>
          <p className="text-xs text-muted-foreground mt-1">
            Track road licences, operating permits, insurance policies, warranties, and urgent maintenance deadlines across all fleet assets.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button onClick={reload} className="btn-secondary text-xs p-2.5 flex items-center gap-1.5" title="Refresh compliance list">
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
            <span>Refresh</span>
          </button>

          <div className="flex items-center border border-border rounded-lg overflow-hidden bg-muted/40 p-0.5 text-xs">
            {(['30', '60', '90', '180'] as const).map(d => (
              <button
                key={d}
                onClick={() => setDaysFilter(d)}
                className={`px-3 py-1 font-semibold rounded-md transition-all ${
                  daysFilter === d ? 'bg-card text-primary shadow-sm' : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                {d} Days
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* KPI Cards Bar */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="card p-4 space-y-1.5 border-l-4 border-l-amber-500 bg-card">
          <span className="text-xs font-semibold text-muted-foreground block">Total Expiring & Compliance Items</span>
          <div className="flex items-baseline justify-between">
            <span className="text-2xl font-extrabold text-amber-800 dark:text-amber-400">{loading ? '—' : totalExpiring}</span>
            <AlertTriangle size={20} className="text-amber-600" />
          </div>
          <p className="text-[11px] text-muted-foreground">Expiries & deadlines within next {daysFilter} days</p>
        </div>

        <div className="card p-4 space-y-1.5 border-l-4 border-l-rose-500 bg-card">
          <span className="text-xs font-semibold text-muted-foreground block">Critical / Expired (≤ 7 Days)</span>
          <div className="flex items-baseline justify-between">
            <span className="text-2xl font-extrabold text-rose-800 dark:text-rose-400">{loading ? '—' : criticalCount}</span>
            <ShieldAlert size={20} className="text-rose-600" />
          </div>
          <p className="text-[11px] text-muted-foreground">Urgent renewal or maintenance required</p>
        </div>

        <div className="card p-4 space-y-1.5 border-l-4 border-l-blue-500 bg-card">
          <span className="text-xs font-semibold text-muted-foreground block">Insurances & Licences</span>
          <div className="flex items-baseline justify-between">
            <span className="text-2xl font-extrabold text-blue-800 dark:text-blue-400">{loading ? '—' : insuranceCount + regCount}</span>
            <ShieldCheck size={20} className="text-blue-600" />
          </div>
          <p className="text-[11px] text-muted-foreground">{insuranceCount} Insurances, {regCount} Licences</p>
        </div>

        <div className="card p-4 space-y-1.5 border-l-4 border-l-emerald-500 bg-card">
          <span className="text-xs font-semibold text-muted-foreground block">Warranties & Urgent Maintenance</span>
          <div className="flex items-baseline justify-between">
            <span className="text-2xl font-extrabold text-emerald-800 dark:text-emerald-400">{loading ? '—' : warrantyCount + defectCount}</span>
            <Clock size={20} className="text-emerald-600" />
          </div>
          <p className="text-[11px] text-muted-foreground">{warrantyCount} Warranties, {defectCount} Critical Defects</p>
        </div>
      </div>

      {/* Filter Tabs & Search Bar */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-card p-3 rounded-lg border border-border">
        {/* Category Tabs */}
        <div className="flex flex-wrap gap-1.5 text-xs font-medium">
          <button
            onClick={() => setCategoryFilter('ALL')}
            className={`px-3 py-1.5 rounded-md transition-all ${
              categoryFilter === 'ALL' ? 'bg-primary text-primary-foreground font-semibold shadow-sm' : 'bg-muted/50 text-muted-foreground hover:bg-muted'
            }`}
          >
            All Items ({totalExpiring})
          </button>
          <button
            onClick={() => setCategoryFilter('REGISTRATION')}
            className={`px-3 py-1.5 rounded-md transition-all ${
              categoryFilter === 'REGISTRATION' ? 'bg-primary text-primary-foreground font-semibold shadow-sm' : 'bg-muted/50 text-muted-foreground hover:bg-muted'
            }`}
          >
            Licences & Permits ({regCount})
          </button>
          <button
            onClick={() => setCategoryFilter('INSURANCE')}
            className={`px-3 py-1.5 rounded-md transition-all ${
              categoryFilter === 'INSURANCE' ? 'bg-primary text-primary-foreground font-semibold shadow-sm' : 'bg-muted/50 text-muted-foreground hover:bg-muted'
            }`}
          >
            Insurances ({insuranceCount})
          </button>
          <button
            onClick={() => setCategoryFilter('WARRANTY')}
            className={`px-3 py-1.5 rounded-md transition-all ${
              categoryFilter === 'WARRANTY' ? 'bg-primary text-primary-foreground font-semibold shadow-sm' : 'bg-muted/50 text-muted-foreground hover:bg-muted'
            }`}
          >
            Warranties ({warrantyCount})
          </button>
          {defectCount > 0 && (
            <button
              onClick={() => setCategoryFilter('CRITICAL_DEFECT')}
              className={`px-3 py-1.5 rounded-md transition-all ${
                categoryFilter === 'CRITICAL_DEFECT' ? 'bg-primary text-primary-foreground font-semibold shadow-sm' : 'bg-muted/50 text-muted-foreground hover:bg-muted'
              }`}
            >
              Critical Defects ({defectCount})
            </button>
          )}
        </div>

        {/* Search Input */}
        <div className="relative w-full sm:w-64">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search asset, policy #, provider..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 text-xs bg-background border border-input rounded-md focus:outline-none focus:ring-1 focus:ring-primary"
          />
        </div>
      </div>

      {/* Main Table */}
      <div className="card overflow-hidden border border-border shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead className="bg-muted/60 text-muted-foreground uppercase text-[11px] font-semibold border-b border-border">
              <tr>
                <th className="px-4 py-3">Equipment Asset</th>
                <th className="px-4 py-3">Type & Category</th>
                <th className="px-4 py-3">Reference / Policy #</th>
                <th className="px-4 py-3">Authority / Provider</th>
                <th className="px-4 py-3">Expiry Date</th>
                <th className="px-4 py-3">Days Remaining</th>
                <th className="px-4 py-3">Urgency Status</th>
                <th className="px-4 py-3 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {loading ? (
                <tr>
                  <td colSpan={8} className="px-4 py-12 text-center text-muted-foreground">
                    <RefreshCw className="h-6 w-6 animate-spin mx-auto mb-2 text-primary" />
                    <span>Loading equipment compliance & expiry records...</span>
                  </td>
                </tr>
              ) : filteredItems.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-4 py-12 text-center text-muted-foreground">
                    <CheckCircle className="h-8 w-8 text-emerald-500 mx-auto mb-2" />
                    <p className="font-semibold text-sm text-foreground">No expiring licences or documents found.</p>
                    <p className="text-xs text-muted-foreground mt-1">All equipment compliance documents are up to date for the selected {daysFilter}-day window.</p>
                  </td>
                </tr>
              ) : (
                filteredItems.map(item => {
                  const days = item.days_remaining;
                  const isExpired = days < 0;
                  const isCritical = days >= 0 && days <= 7;
                  const isWarning = days > 7 && days <= 30;

                  return (
                    <tr key={item.id} className="hover:bg-muted/30 transition-colors">
                      {/* Asset */}
                      <td className="px-4 py-3 font-medium">
                        <div className="flex flex-col">
                          <span className="font-semibold text-foreground">{item.asset_name}</span>
                          <span className="text-[11px] text-muted-foreground">{item.asset_number}</span>
                        </div>
                      </td>

                      {/* Document / Deadline Type */}
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1.5">
                          <span className={`px-2 py-0.5 text-[10px] font-bold rounded ${
                            item.category === 'REGISTRATION' ? 'bg-purple-100 text-purple-800 dark:bg-purple-950 dark:text-purple-300' :
                            item.category === 'INSURANCE' ? 'bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300' :
                            item.category === 'WARRANTY'? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300' : 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300'
                          }`}>
                            {item.category}
                          </span>
                          <span className="text-xs text-foreground">{item.document_type}</span>
                        </div>
                      </td>

                      {/* Reference Number */}
                      <td className="px-4 py-3 font-mono text-xs text-foreground">
                        {item.reference_number || '—'}
                      </td>

                      {/* Provider / Authority */}
                      <td className="px-4 py-3 text-muted-foreground">
                        {item.provider_or_authority || '—'}
                      </td>

                      {/* Expiry Date */}
                      <td className="px-4 py-3 font-medium text-foreground">
                        {item.expiry_date ? new Date(item.expiry_date).toLocaleDateString() : 'N/A'}
                      </td>

                      {/* Days Remaining */}
                      <td className="px-4 py-3">
                        <span className={`font-bold ${
                          isExpired ? 'text-rose-600 dark:text-rose-400' : isCritical ?'text-rose-500': isWarning ?'text-amber-600 dark:text-amber-400': 'text-emerald-600 dark:text-emerald-400'
                        }`}>
                          {isExpired ? `${Math.abs(days)} days ago` : `${days} days`}
                        </span>
                      </td>

                      {/* Urgency Badge */}
                      <td className="px-4 py-3">
                        {isExpired ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-bold rounded-full bg-rose-100 text-rose-800 dark:bg-rose-900/60 dark:text-rose-200">
                            <AlertTriangle size={12} /> EXPIRED
                          </span>
                        ) : isCritical ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-bold rounded-full bg-rose-50 text-rose-700 dark:bg-rose-950 dark:text-rose-300">
                            <ShieldAlert size={12} /> CRITICAL
                          </span>
                        ) : isWarning ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-bold rounded-full bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300">
                            <Clock size={12} /> WARNING
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-semibold rounded-full bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
                            <CheckCircle size={12} /> UPCOMING
                          </span>
                        )}
                      </td>

                      {/* Action */}
                      <td className="px-4 py-3 text-right">
                        {item.asset_id ? (
                          <button
                            onClick={() => router.push(`/workspace/assets/${item.asset_id}`)}
                            className="btn-secondary text-xs px-2.5 py-1 inline-flex items-center gap-1 hover:bg-muted"
                            title="View Asset Details"
                          >
                            <span>Asset</span>
                            <ExternalLink size={12} />
                          </button>
                        ) : (
                          <span className="text-muted-foreground text-[11px]">—</span>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
