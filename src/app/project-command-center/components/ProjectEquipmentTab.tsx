'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { Plus } from 'lucide-react';
import { getProjects, getProjectEquipmentSummary } from '@/lib/api';

interface EquipmentItem {
  id?: string;
  asset_code?: string;
  code?: string;
  asset_number?: string;
  name?: string;
  category?: { name?: string } | string;
  status?: string;
  site?: { name?: string } | string;
  site_name?: string;
  latest_meter_reading?: { value?: number; unit?: string };
  operator?: { full_name?: string; first_name?: string; last_name?: string } | string;
  [key: string]: unknown;
}

function getStatusClass(status?: string): string {
  switch (status?.toUpperCase()) {
    case 'OPERATING': return 'badge-operating';
    case 'AVAILABLE': return 'badge-available';
    case 'STANDBY': return 'badge-standby';
    case 'BREAKDOWN': return 'badge-breakdown';
    case 'UNDER_MAINTENANCE': return 'badge-maintenance';
    default: return 'badge-neutral';
  }
}

function getCategoryName(cat: EquipmentItem['category']): string {
  if (!cat) return '—';
  if (typeof cat === 'object' && cat?.name) return cat.name;
  if (typeof cat === 'string') return cat;
  return '—';
}

function getSiteName(site: EquipmentItem['site'], siteName?: string): string {
  if (typeof site === 'object' && site?.name) return site.name;
  if (typeof site === 'string') return site;
  return siteName ?? '—';
}

function getMeter(item: EquipmentItem): string {
  if (item?.latest_meter_reading?.value !== undefined) {
    return `${item.latest_meter_reading.value.toLocaleString()} ${item.latest_meter_reading.unit ?? 'h'}`;
  }
  return '—';
}

function getOperatorName(op: EquipmentItem['operator']): string {
  if (!op) return '—';
  if (typeof op === 'object') {
    const o = op as { full_name?: string; first_name?: string; last_name?: string };
    return o?.full_name ?? (`${o?.first_name ?? ''} ${o?.last_name ?? ''}`.trim() || '—');
  }
  if (typeof op === 'string') return op;
  return '—';
}

export default function ProjectEquipmentTab() {
  const [equipment, setEquipment] = useState<EquipmentItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getProjects({ status: 'ACTIVE', page_size: '1' })
      .then(async res => {
        const first = res?.items?.[0];
        if (first?.id) {
          const summary = await getProjectEquipmentSummary(first.id);
          const data = summary as Record<string, unknown>;
          const assets = (data?.assets ?? data?.current_assets ?? data?.items ?? []) as EquipmentItem[];
          setEquipment(assets);
        }
      })
      .catch(() => setEquipment([]))
      .finally(() => setLoading(false));
  }, []);

  const operating = equipment.filter(e => e?.status?.toUpperCase() === 'OPERATING').length;
  const maintenance = equipment.filter(e => e?.status?.toUpperCase() === 'UNDER_MAINTENANCE').length;

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <span className="text-sm font-600 text-foreground">{equipment.length} assets assigned</span>
          {operating > 0 && <span className="badge badge-operating">{operating} Operating</span>}
          {maintenance > 0 && <span className="badge badge-maintenance">{maintenance} Maintenance</span>}
        </div>
        <button className="btn-primary text-xs py-1.5">
          <Plus size={13} />
          Assign Asset
        </button>
      </div>

      {loading ? (
        <div className="space-y-2">
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="h-10 bg-muted animate-pulse rounded" />
          ))}
        </div>
      ) : equipment.length === 0 ? (
        <div className="py-8 text-center text-sm text-muted-foreground">
          No equipment assigned to this project.
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
                <th>Site</th>
                <th>Meter</th>
                <th>Operator</th>
              </tr>
            </thead>
            <tbody>
              {equipment.map((asset, idx) => (
                <tr key={asset?.id ?? idx}>
                  <td>
                    <Link href="/fleet-dashboard" className="entity-link text-sm font-700">
                      {asset?.asset_code ?? asset?.code ?? '—'}
                    </Link>
                  </td>
                  <td className="text-xs text-muted-foreground tabular-nums">{asset?.asset_number ?? '—'}</td>
                  <td className="text-sm text-foreground">{asset?.name ?? '—'}</td>
                  <td className="text-xs text-muted-foreground">{getCategoryName(asset?.category)}</td>
                  <td><span className={`badge ${getStatusClass(asset?.status)}`}>{asset?.status?.replace(/_/g, ' ') ?? '—'}</span></td>
                  <td className="text-sm text-muted-foreground">{getSiteName(asset?.site, asset?.site_name)}</td>
                  <td className="text-sm tabular-nums text-foreground">{getMeter(asset)}</td>
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