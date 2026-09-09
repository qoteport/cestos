'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { Search, Filter } from 'lucide-react';
import { getAssets } from '@/lib/api';

interface AssetItem {
  id?: string;
  asset_code?: string;
  code?: string;
  asset_number?: string;
  name?: string;
  category?: { name?: string } | string;
  status?: string;
  project?: { name?: string } | string;
  location?: { name?: string } | string;
  site?: string;
  latest_meter_reading?: { value?: number; unit?: string };
  meter?: string;
  last_inspection_date?: string;
  operator?: { full_name?: string; first_name?: string; last_name?: string } | string;
  has_open_defects?: boolean;
  [key: string]: unknown;
}

const STATUS_FILTERS = [
  { id: 'sf-all', label: 'All', value: '' },
  { id: 'sf-operating', label: 'Operating', value: 'OPERATING' },
  { id: 'sf-available', label: 'Available', value: 'AVAILABLE' },
  { id: 'sf-standby', label: 'Standby', value: 'STANDBY' },
  { id: 'sf-breakdown', label: 'Breakdown', value: 'BREAKDOWN' },
  { id: 'sf-maintenance', label: 'Maintenance', value: 'UNDER_MAINTENANCE' },
];

function getStatusClass(status?: string): string {
  switch (status?.toUpperCase()) {
    case 'OPERATING': return 'badge-operating';
    case 'AVAILABLE': return 'badge-available';
    case 'STANDBY': return 'badge-standby';
    case 'BREAKDOWN': return 'badge-breakdown';
    case 'UNDER_MAINTENANCE': return 'badge-maintenance';
    case 'OUT_OF_SERVICE': return 'badge-breakdown';
    default: return 'badge-neutral';
  }
}

function getCategoryName(cat: AssetItem['category']): string {
  if (!cat) return '—';
  if (typeof cat === 'object' && cat?.name) return cat.name;
  if (typeof cat === 'string') return cat;
  return '—';
}

function getProjectName(proj: AssetItem['project']): string {
  if (!proj) return '—';
  if (typeof proj === 'object' && proj?.name) return proj.name;
  if (typeof proj === 'string') return proj;
  return '—';
}

function getLocationName(loc: AssetItem['location'], site?: string): string {
  if (site) return site;
  if (!loc) return '—';
  if (typeof loc === 'object' && loc?.name) return loc.name;
  if (typeof loc === 'string') return loc;
  return '—';
}

function getMeter(asset: AssetItem): string {
  if (asset?.latest_meter_reading?.value !== undefined) {
    return `${asset.latest_meter_reading.value.toLocaleString()} ${asset.latest_meter_reading.unit ?? 'h'}`;
  }
  return asset?.meter ?? '—';
}

function getOperatorName(op: AssetItem['operator']): string {
  if (!op) return '—';
  if (typeof op === 'object') {
    const o = op as { full_name?: string; first_name?: string; last_name?: string };
    return (o?.full_name ?? (`${o?.first_name ?? ''} ${o?.last_name ?? ''}`).trim()) || '—';
  }
  if (typeof op === 'string') return op;
  return '—';
}

function formatDate(d?: string): string {
  if (!d) return '—';
  try { return new Date(d).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }); }
  catch { return d; }
}

export default function AssetStatusTable() {
  const [assets, setAssets] = useState<AssetItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  useEffect(() => {
    const params: Record<string, string> = { page_size: '50' };
    if (statusFilter) params.status = statusFilter;
    if (search) params.search = search;

    setLoading(true);
    getAssets(params)
      .then(res => setAssets((res?.items as AssetItem[]) ?? []))
      .catch(() => setAssets([]))
      .finally(() => setLoading(false));
  }, [statusFilter, search]);

  return (
    <div className="card">
      <div className="flex items-center justify-between px-4 py-3 border-b border-border flex-wrap gap-3">
        <span className="text-sm font-700 text-foreground">Asset Status</span>
        <div className="flex items-center gap-2 flex-wrap">
          <div className="flex items-center gap-1 flex-wrap">
            {STATUS_FILTERS.map(f => (
              <button
                key={f.id}
                onClick={() => setStatusFilter(f.value)}
                className={`px-2.5 py-1 rounded text-xs font-600 transition-colors ${
                  statusFilter === f.value ? 'bg-secondary text-primary' : 'text-muted-foreground hover:bg-muted'
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>
          <div className="relative">
            <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search assets..."
              className="input-field pl-8 py-1.5 text-xs w-44"
            />
          </div>
          <button className="btn-secondary text-xs py-1.5">
            <Filter size={13} />
            Filters
          </button>
        </div>
      </div>

      {loading ? (
        <div className="divide-y divide-border">
          {[1, 2, 3, 4, 5].map(i => (
            <div key={i} className="px-4 py-3 flex gap-4">
              <div className="h-4 bg-muted animate-pulse rounded w-16" />
              <div className="h-4 bg-muted animate-pulse rounded w-24" />
              <div className="h-4 bg-muted animate-pulse rounded w-32" />
              <div className="h-4 bg-muted animate-pulse rounded w-20" />
            </div>
          ))}
        </div>
      ) : assets.length === 0 ? (
        <div className="px-4 py-8 text-center text-sm text-muted-foreground">
          No assets found{statusFilter ? ` with status "${statusFilter}"` : ''}.
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="data-table">
            <thead>
              <tr>
                <th>Code</th>
                <th>Asset No.</th>
                <th>Name</th>
                <th>Category</th>
                <th>Status</th>
                <th>Project</th>
                <th>Site</th>
                <th>Meter</th>
                <th>Last Inspection</th>
                <th>Operator</th>
              </tr>
            </thead>
            <tbody>
              {assets.map((asset, idx) => (
                <tr key={asset?.id ?? idx}>
                  <td>
                    <Link href="/fleet-dashboard" className="entity-link text-sm font-700">
                      {asset?.asset_code ?? asset?.code ?? '—'}
                    </Link>
                  </td>
                  <td className="text-xs text-muted-foreground tabular-nums">{asset?.asset_number ?? '—'}</td>
                  <td className="text-sm text-foreground">{asset?.name ?? '—'}</td>
                  <td className="text-xs text-muted-foreground">{getCategoryName(asset?.category)}</td>
                  <td>
                    <span className={`badge ${getStatusClass(asset?.status)}`}>
                      {asset?.status?.replace(/_/g, ' ') ?? '—'}
                    </span>
                  </td>
                  <td className="text-sm text-muted-foreground">{getProjectName(asset?.project)}</td>
                  <td className="text-sm text-muted-foreground">{getLocationName(asset?.location, asset?.site)}</td>
                  <td className="text-sm tabular-nums text-foreground">{getMeter(asset)}</td>
                  <td className="text-xs text-muted-foreground">{formatDate(asset?.last_inspection_date)}</td>
                  <td className="text-sm text-muted-foreground">{getOperatorName(asset?.operator)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}