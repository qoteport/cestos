'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { Gauge, ArrowLeft, RefreshCw, Plus, Search, Filter, Activity, Clock, MapPin } from 'lucide-react';
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid } from 'recharts';
import { apiFetch } from '@/lib/api';
import { Row, display, Modal } from './DataUI';
import RecordForm from './RecordForm';
import SearchableSelect from './SearchableSelect';

export default function EquipmentMeterReadingsWorkspace() {
  const [loading, setLoading] = useState(true);
  const [meterReadings, setMeterReadings] = useState<Row[]>([]);
  const [assets, setAssets] = useState<Row[]>([]);
  const [version, setVersion] = useState(0);

  // Filters
  const [search, setSearch] = useState('');
  const [assetFilter, setAssetFilter] = useState('ALL');
  const [typeFilter, setTypeFilter] = useState('ALL');

  // Modal
  const [logging, setLogging] = useState(false);

  const reload = () => setVersion((v) => v + 1);

  useEffect(() => {
    let active = true;
    setLoading(true);

    apiFetch<any>('/api/v1/assets?page_size=50')
      .then(async (assetsData) => {
        if (!active) return;
        const assetList = Array.isArray(assetsData) ? assetsData : assetsData?.items || [];
        setAssets(assetList);

        const readingPromises = assetList.slice(0, 15).map(async (asset: Row) => {
          try {
            const readingsData = await apiFetch<any>(`/api/v1/assets/${asset.id}/meter-readings`);
            const rList = Array.isArray(readingsData) ? readingsData : readingsData?.items || [];
            return rList.map((r: Row) => ({
              ...r,
              asset_name: asset.name,
              asset_number: asset.asset_number,
              asset_id: asset.id,
              meter_type: asset.meter_type,
            }));
          } catch (_) {
            return [];
          }
        });

        const results = await Promise.all(readingPromises);
        if (active) {
          setMeterReadings(results.flat());
          setLoading(false);
        }
      })
      .catch(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [version]);

  const filteredReadings = meterReadings.filter((r) => {
    const searchStr = `${r.asset_name || ''} ${r.asset_number || ''} ${r.reading_type || ''} ${r.source || ''}`.toLowerCase();
    const matchesSearch = !search || searchStr.includes(search.toLowerCase());
    const matchesAsset = assetFilter === 'ALL' || String(r.asset_id) === assetFilter;
    const matchesType = typeFilter === 'ALL' || String(r.reading_type || r.meter_type || '').toUpperCase() === typeFilter;

    return matchesSearch && matchesAsset && matchesType;
  });

  const chartData = filteredReadings
    .slice()
    .sort((a, b) => (a.recorded_at || '').localeCompare(b.recorded_at || ''))
    .slice(-20)
    .map((r) => ({
      date: r.recorded_at ? new Date(r.recorded_at).toLocaleDateString() : '—',
      reading: Number(r.reading || r.value || 0),
      asset: r.asset_name,
    }));

  const totalReadings = meterReadings.length;
  const hoursCount = meterReadings.filter((r) => String(r.reading_type || r.meter_type).includes('HOURS')).length;
  const odometerCount = meterReadings.filter((r) => String(r.reading_type || r.meter_type).includes('ODOMETER')).length;

  const meterReadingCreateOp = {
    schema: {
      type: 'object',
      required: ['reading'],
      properties: {
        asset_id: { type: 'string', format: 'uuid', title: 'Target Equipment Asset' },
        reading: { type: 'number', title: 'Meter Reading Value' },
        reading_type: {
          type: 'string',
          enum: ['HOURS', 'ODOMETER_KM', 'ODOMETER_MILES'],
          title: 'Meter Reading Type',
          default: 'HOURS',
        },
        recorded_at: { type: 'string', format: 'date-time', title: 'Recorded Date & Time' },
        source: { type: 'string', title: 'Reading Source / Inspector' },
        notes: { type: 'string', title: 'Notes' },
      },
    },
    permissions: ['assets.update'],
  };

  return (
    <div className="space-y-6 fade-in">
      {/* Header */}
      <div className="flex flex-wrap justify-between items-center gap-4 border-b pb-4">
        <div>
          <Link href="/workspace/assets" className="text-xs text-primary flex items-center gap-1 mb-2 hover:underline">
            <ArrowLeft size={12} /> Equipment Fleet
          </Link>
          <h1 className="text-2xl font-bold text-foreground">Fleet Meter Readings & Gauges</h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            Centralized telemetry log for equipment operating hours, odometer distance readings, and usage tracking.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button onClick={reload} className="btn-secondary text-xs p-2.5" title="Refresh data">
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
          </button>
          {assets.length > 0 && (
            <button onClick={() => setLogging(true)} className="btn-primary text-xs flex items-center gap-1">
              <Plus size={14} /> Log Meter Reading
            </button>
          )}
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <div className="card p-4 space-y-1.5 border-l-4 border-l-primary">
          <span className="text-xs font-semibold text-muted-foreground block">Total Meter Entries</span>
          <div className="flex items-baseline justify-between">
            <span className="text-2xl font-extrabold text-foreground">{loading ? '…' : totalReadings}</span>
            <Gauge size={18} className="text-primary opacity-80" />
          </div>
          <p className="text-[11px] text-muted-foreground">Logged meter readings across fleet</p>
        </div>

        <div className="card p-4 space-y-1.5 border-l-4 border-l-indigo-500">
          <span className="text-xs font-semibold text-muted-foreground block">Hours Meter Logs</span>
          <div className="flex items-baseline justify-between">
            <span className="text-2xl font-extrabold text-indigo-700">{loading ? '…' : hoursCount}</span>
            <Clock size={18} className="text-indigo-600" />
          </div>
          <p className="text-[11px] text-muted-foreground">Engine & machinery operating hours</p>
        </div>

        <div className="card p-4 space-y-1.5 border-l-4 border-l-teal-500">
          <span className="text-xs font-semibold text-muted-foreground block">Odometer Distance Logs</span>
          <div className="flex items-baseline justify-between">
            <span className="text-2xl font-extrabold text-teal-700">{loading ? '…' : odometerCount}</span>
            <Activity size={18} className="text-teal-600" />
          </div>
          <p className="text-[11px] text-muted-foreground">Vehicle Odometer distance logs (KM / Miles)</p>
        </div>
      </div>

      {/* Meter Reading Trend Line Chart */}
      {chartData.length > 0 && (
        <div className="card p-5 space-y-3">
          <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
            <Gauge size={16} className="text-primary" /> Recent Meter Reading Trends across Fleet
          </h3>
          <div className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" tick={{ fontSize: 10 }} />
                <YAxis tick={{ fontSize: 10 }} />
                <Tooltip />
                <Line type="monotone" dataKey="reading" stroke="#1B4F8A" strokeWidth={2.5} dot={{ r: 4 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* Filter Bar */}
      <div className="card p-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-3 flex-1">
          <div className="relative flex-1 min-w-[200px] max-w-md">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search by equipment name or source..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="input-field pl-9 text-xs"
            />
          </div>

          <div className="flex items-center gap-2">
            <Filter size={14} className="text-muted-foreground shrink-0" />
            <div className="w-48">
              <SearchableSelect
                value={assetFilter}
                onChange={(val) => setAssetFilter(val)}
                options={[
                  { value: 'ALL', label: 'All Equipment Fleet' },
                  ...assets.map((a) => ({
                    value: String(a.id),
                    label: `${a.asset_number ? `${a.asset_number} — ` : ''}${a.name}`,
                  })),
                ]}
                searchable={assets.length > 5}
                ariaLabel="Filter Equipment Fleet"
              />
            </div>

            <div className="w-44">
              <SearchableSelect
                value={typeFilter}
                onChange={(val) => setTypeFilter(val)}
                options={[
                  { value: 'ALL', label: 'All Meter Types' },
                  { value: 'HOURS', label: 'Hours Meter' },
                  { value: 'ODOMETER_KM', label: 'Odometer (KM)' },
                  { value: 'ODOMETER_MILES', label: 'Odometer (Miles)' },
                ]}
                searchable={false}
                ariaLabel="Filter Meter Types"
              />
            </div>

            {(search || assetFilter !== 'ALL' || typeFilter !== 'ALL') && (
              <button
                type="button"
                className="btn-secondary text-xs py-1.5 px-3"
                onClick={() => {
                  setSearch('');
                  setAssetFilter('ALL');
                  setTypeFilter('ALL');
                }}
              >
                Reset
              </button>
            )}
          </div>
        </div>

        <span className="text-xs text-muted-foreground font-semibold">
          Showing {filteredReadings.length} meter entries
        </span>
      </div>

      {/* Main Table */}
      <div className="card p-5 overflow-hidden">
        {loading ? (
          <p className="text-sm text-muted-foreground py-12 text-center">Loading meter readings telemetry...</p>
        ) : filteredReadings.length === 0 ? (
          <div className="py-12 text-center text-muted-foreground space-y-2">
            <Gauge size={32} className="mx-auto text-muted-foreground/40" />
            <p className="text-sm font-semibold">No meter readings recorded matching filter criteria.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead className="bg-muted text-muted-foreground font-semibold border-b">
                <tr>
                  <th className="p-3">Equipment Asset</th>
                  <th className="p-3">Recorded Date & Time</th>
                  <th className="p-3">Meter Reading Value</th>
                  <th className="p-3">Meter Type</th>
                  <th className="p-3">Reading Source / Inspector</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {filteredReadings.map((r, idx) => (
                  <tr key={r.id || idx} className="hover:bg-muted/30 transition-colors">
                    <td className="p-3">
                      <Link href={`/workspace/assets/${r.asset_id}`} className="font-bold text-primary hover:underline block">
                        {r.asset_name}
                      </Link>
                      {r.asset_number && (
                        <span className="text-[11px] text-muted-foreground">Tag: {r.asset_number}</span>
                      )}
                    </td>

                    <td className="p-3 text-muted-foreground font-medium">
                      {r.recorded_at ? new Date(r.recorded_at).toLocaleString() : '—'}
                    </td>

                    <td className="p-3">
                      <span className="text-sm font-extrabold text-foreground">
                        {Number(r.reading || r.value || 0).toLocaleString()}
                      </span>
                    </td>

                    <td className="p-3">
                      <span className="badge badge-neutral text-[11px]">
                        {(r.reading_type || r.meter_type || 'HOURS').replace(/_/g, ' ')}
                      </span>
                    </td>

                    <td className="p-3 text-muted-foreground">
                      <span>{r.source || r.recorded_by_name || 'Operator / Manual Entry'}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Log Modal */}
      {logging && (
        <Modal name="Log Equipment Meter Reading" onClose={() => setLogging(false)}>
          <RecordForm
            operation={meterReadingCreateOp}
            path={assets[0] ? `/api/v1/assets/${assets[0].id}/meter-readings` : ''}
            method="POST"
            onSuccess={() => {
              setLogging(false);
              reload();
            }}
          />
        </Modal>
      )}
    </div>
  );
}
