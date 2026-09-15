'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { Fuel, ArrowLeft, RefreshCw, Plus, Search, Filter, DollarSign, Activity, AlertTriangle, TrendingUp, Zap, FileText } from 'lucide-react';
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid, Legend } from 'recharts';
import { apiFetch } from '@/lib/api';
import { Row, display, Modal } from './DataUI';
import RecordForm from './RecordForm';

export default function EquipmentFuelLogsWorkspace() {
  const [loading, setLoading] = useState(true);
  const [fuelLogs, setFuelLogs] = useState<Row[]>([]);
  const [assets, setAssets] = useState<Row[]>([]);
  const [version, setVersion] = useState(0);

  // Filters
  const [search, setSearch] = useState('');
  const [assetFilter, setAssetFilter] = useState('ALL');
  const [typeFilter, setTypeFilter] = useState('ALL');
  const [anomalyFilter, setAnomalyFilter] = useState<'ALL' | 'ANOMALIES_ONLY'>('ALL');

  // Modals
  const [logging, setLogging] = useState(false);
  const [selectedLog, setSelectedLog] = useState<Row | null>(null);

  // Fuel Reductions / Dip Checks
  const [fuelReductions, setFuelReductions] = useState<Row[]>([]);
  const [subModalOpen, setSubModalOpen] = useState(false);
  const [subRecordedAt, setSubRecordedAt] = useState('');
  const [subFuelLeft, setSubFuelLeft] = useState('');
  const [subReason, setSubReason] = useState('Daily Dip Check');
  const [subNotes, setSubNotes] = useState('');
  const [subSubmitting, setSubSubmitting] = useState(false);
  const [error, setError] = useState('');

  const reload = () => setVersion((v) => v + 1);

  useEffect(() => {
    let active = true;
    setLoading(true);

    apiFetch<any>('/api/v1/assets?page_size=50')
      .then(async (assetsData) => {
        if (!active) return;
        const assetList = Array.isArray(assetsData) ? assetsData : assetsData?.items || [];
        setAssets(assetList);

        // Concurrent batch fetch using Promise.all
        const logPromises = assetList.slice(0, 15).map(async (asset: Row) => {
          try {
            const fData = await apiFetch<any>(`/api/v1/assets/${asset.id}/fuel-logs?page_size=50`);
            const fList = Array.isArray(fData) ? fData : fData?.items || [];
            return fList.map((fl: Row) => ({
              ...fl,
              asset_name: asset.name,
              asset_number: asset.asset_number,
              asset_id: asset.id,
            }));
          } catch (_) {
            return [];
          }
        });

        const results = await Promise.all(logPromises);
        if (active) {
          setFuelLogs(results.flat());
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

  // Load dip check sub-entries when selectedLog changes
  useEffect(() => {
    let active = true;
    if (selectedLog) {
      apiFetch<Row[] | { items: Row[] }>(`/api/v1/assets/${selectedLog.asset_id}/fuel-reductions`)
        .then((res) => {
          if (!active) return;
          const list = (Array.isArray(res) ? res : res?.items || []).filter(
            (r: Row) => !r.fuel_log_id || String(r.fuel_log_id) === String(selectedLog.id)
          );
          setFuelReductions(list);
        })
        .catch(() => {
          if (active) setFuelReductions([]);
        });
    } else {
      setFuelReductions([]);
    }
    return () => {
      active = false;
    };
  }, [selectedLog]);

  async function handleCreateSubEntry(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedLog || subSubmitting) return;
    setSubSubmitting(true);
    setError('');

    const fuelLeft = Number(subFuelLeft) || 0;
    const parentLitres = Number(selectedLog.quantity_litres || 0);

    let baseLitres = parentLitres;
    if (fuelReductions.length > 0) {
      const prev = fuelReductions[0];
      if (prev.remaining_litres != null) {
        baseLitres = Number(prev.remaining_litres);
      }
    }

    const litresReduced = Math.max(0, baseLitres - fuelLeft);

    try {
      await apiFetch(`/api/v1/assets/${selectedLog.asset_id}/fuel-reductions`, {
        method: 'POST',
        body: JSON.stringify({
          fuel_log_id: selectedLog.id,
          recorded_at: subRecordedAt ? new Date(subRecordedAt).toISOString() : new Date().toISOString(),
          remaining_litres: fuelLeft,
          litres_reduced: litresReduced,
          reduction_reason: subReason || 'Daily Dip Check',
          notes: subNotes || undefined,
        }),
      });

      setSubModalOpen(false);
      setSubFuelLeft('');
      setSubNotes('');
      reload();

      const res = await apiFetch<Row[] | { items: Row[] }>(`/api/v1/assets/${selectedLog.asset_id}/fuel-reductions`);
      const list = (Array.isArray(res) ? res : res?.items || []).filter(
        (r: Row) => !r.fuel_log_id || String(r.fuel_log_id) === String(selectedLog.id)
      );
      setFuelReductions(list);
    } catch (err: any) {
      setError(err.message || 'Failed to record fuel sub-entry');
    } finally {
      setSubSubmitting(false);
    }
  }

  // Calculate Averages and Anomalies
  const nonZeroLitres = fuelLogs.map((f) => Number(f.quantity_litres || 0)).filter((v) => v > 0);
  const avgLitres = nonZeroLitres.length > 0 ? nonZeroLitres.reduce((a, b) => a + b, 0) / nonZeroLitres.length : 200;

  const nonZeroCosts = fuelLogs.map((f) => Number(f.unit_cost || 0)).filter((v) => v > 0);
  const avgCost = nonZeroCosts.length > 0 ? nonZeroCosts.reduce((a, b) => a + b, 0) / nonZeroCosts.length : 2.5;

  const logsWithAnomalies: Row[] = fuelLogs.map((fl: Row): Row => {
    const litres = Number(fl.quantity_litres || 0);
    const unitCost = Number(fl.unit_cost || 0);
    const notes = String(fl.notes || '').toUpperCase();
    const isSpike = litres > avgLitres * 1.6 || notes.includes('SPIKE') || notes.includes('HIGH CONSUMPTION');
    const isPriceAnomaly = unitCost > avgCost * 1.5 || notes.includes('PRICE') || notes.includes('EXCEEDS');
    const isAnomaly = isSpike || isPriceAnomaly;

    let anomalyReason = '';
    if (isSpike && isPriceAnomaly) anomalyReason = `Consumption Spike (${litres}L) & Price Surge ($${unitCost}/L)`;
    else if (isSpike) anomalyReason = `High Consumption Spike (${litres}L vs ${Math.round(avgLitres)}L avg)`;
    else if (isPriceAnomaly) anomalyReason = `Price Rate Anomaly ($${unitCost}/L vs $${avgCost.toFixed(2)}/L avg)`;

    return {
      ...fl,
      isAnomaly,
      isSpike,
      isPriceAnomaly,
      anomalyReason,
    };
  });

  const anomalyCount = logsWithAnomalies.filter((f) => f.isAnomaly).length;

  const filteredLogs = logsWithAnomalies.filter((fl) => {
    const searchStr = `${fl.supplier || ''} ${fl.reference_number || ''} ${fl.notes || ''} ${fl.asset_name || ''}`.toLowerCase();
    const matchesSearch = !search || searchStr.includes(search.toLowerCase());
    const matchesAsset = assetFilter === 'ALL' || String(fl.asset_id) === assetFilter;
    const matchesType = typeFilter === 'ALL' || String(fl.fuel_type || '').toUpperCase() === typeFilter;
    const matchesAnomaly = anomalyFilter === 'ALL' || fl.isAnomaly;

    return matchesSearch && matchesAsset && matchesType && matchesAnomaly;
  });

  const totalLitres = fuelLogs.reduce((sum, f) => sum + Number(f.quantity_litres || 0), 0);
  const totalCost = fuelLogs.reduce((sum, f) => sum + Number(f.quantity_litres || 0) * Number(f.unit_cost || 0), 0);
  const totalEntries = fuelLogs.length;

  // Prepare Consumption Line Chart Data (sorted chronologically)
  const lineChartData = logsWithAnomalies
    .slice()
    .sort((a, b) => (a.recorded_at || '').localeCompare(b.recorded_at || ''))
    .slice(-20)
    .map((f) => ({
      date: f.recorded_at ? new Date(f.recorded_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }) : '—',
      Litres: Number(f.quantity_litres || 0),
      UnitCost: Number(f.unit_cost || 0),
      asset: f.asset_name,
      isAnomaly: f.isAnomaly,
    }));

  const fuelLogCreateOp = {
    schema: {
      type: 'object',
      required: ['quantity_litres'],
      properties: {
        asset_id: { type: 'string', format: 'uuid', title: 'Target Equipment Asset' },
        recorded_at: { type: 'string', format: 'date-time', title: 'Recorded Date & Time' },
        fuel_type: {
          type: 'string',
          enum: ['DIESEL', 'PETROL', 'OTHER'],
          title: 'Fuel Type',
          default: 'DIESEL',
        },
        quantity_litres: { type: 'number', title: 'Quantity Dispatched (Litres)' },
        unit_cost: { type: 'number', title: 'Unit Cost ($ per Litre)' },
        meter_reading: { type: 'number', title: 'Current Meter Reading' },
        supplier: { type: 'string', title: 'Supplier / Fuel Station' },
        reference_number: { type: 'string', title: 'Reference / Receipt No.' },
        notes: { type: 'string', title: 'Notes / Remarks' },
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
          <h1 className="text-2xl font-bold text-foreground">Fleet Fuel Management & Consumption Analysis</h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            Monitor fuel consumption trends over time, detect abnormal usage spikes, track unit cost variances, and manage dip checks.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button onClick={reload} className="btn-secondary text-xs p-2.5" title="Refresh data">
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
          </button>
          {assets.length > 0 && (
            <button onClick={() => setLogging(true)} className="btn-primary text-xs flex items-center gap-1">
              <Plus size={14} /> Log Fuel Entry
            </button>
          )}
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="card p-4 space-y-1.5 border-l-4 border-l-primary">
          <span className="text-xs font-semibold text-muted-foreground block">Total Fuel Consumed</span>
          <div className="flex items-baseline justify-between">
            <span className="text-2xl font-extrabold text-foreground">{loading ? '…' : `${totalLitres.toLocaleString()} L`}</span>
            <Fuel size={18} className="text-primary opacity-80" />
          </div>
          <p className="text-[11px] text-muted-foreground">Across all recorded refilling logs</p>
        </div>

        <div className="card p-4 space-y-1.5 border-l-4 border-l-emerald-500">
          <span className="text-xs font-semibold text-muted-foreground block">Total Fuel Expenditure</span>
          <div className="flex items-baseline justify-between">
            <span className="text-2xl font-extrabold text-emerald-700">{loading ? '…' : `$${totalCost.toLocaleString(undefined, { minimumFractionDigits: 2 })}`}</span>
            <DollarSign size={18} className="text-emerald-600" />
          </div>
          <p className="text-[11px] text-muted-foreground">Total cost of fuel refilled</p>
        </div>

        <div className="card p-4 space-y-1.5 border-l-4 border-l-amber-500">
          <span className="text-xs font-semibold text-muted-foreground block">Detected Fuel Anomalies</span>
          <div className="flex items-baseline justify-between">
            <span className="text-2xl font-extrabold text-amber-800">{loading ? '…' : anomalyCount}</span>
            <AlertTriangle size={18} className="text-amber-600" />
          </div>
          <p className="text-[11px] text-muted-foreground">Spikes or rate variances</p>
        </div>

        <div className="card p-4 space-y-1.5 border-l-4 border-l-teal-500">
          <span className="text-xs font-semibold text-muted-foreground block">Total Refilling Logs</span>
          <div className="flex items-baseline justify-between">
            <span className="text-2xl font-extrabold text-teal-700">{loading ? '…' : totalEntries}</span>
            <Activity size={18} className="text-teal-600" />
          </div>
          <p className="text-[11px] text-muted-foreground">Fuel delivery & dip check records</p>
        </div>
      </div>

      {/* Anomalies Banner Card */}
      {anomalyCount > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-amber-900 font-bold text-sm">
              <Zap size={16} className="text-amber-600 fill-amber-500" />
              <span>{anomalyCount} Consumption & Rate Anomalies Flagged across Equipment Fleet</span>
            </div>
            <button
              onClick={() => setAnomalyFilter(anomalyFilter === 'ANOMALIES_ONLY' ? 'ALL' : 'ANOMALIES_ONLY')}
              className="text-xs font-bold text-amber-900 underline hover:text-amber-950"
            >
              {anomalyFilter === 'ANOMALIES_ONLY' ? 'Show All Refuel Logs' : 'Filter Anomalies Only'}
            </button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-xs">
            {logsWithAnomalies.filter((f) => f.isAnomaly).slice(0, 4).map((an, idx) => (
              <div key={an.id || idx} className="bg-white p-2.5 rounded border border-amber-300 flex justify-between items-center">
                <div>
                  <span className="font-bold text-foreground block">{an.asset_name}</span>
                  <span className="text-amber-900 text-[11px]">{an.anomalyReason}</span>
                </div>
                <button onClick={() => setSelectedLog(an)} className="btn-secondary py-0.5 px-2 text-[10px]">
                  Inspect
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Consumption Trend Line Graphs */}
      {lineChartData.length > 0 && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <div className="card p-5 space-y-3 lg:col-span-2">
            <div className="flex justify-between items-center">
              <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
                <TrendingUp size={16} className="text-primary" /> Fuel Consumption Trend (Litres over Time)
              </h3>
              <span className="text-[11px] text-muted-foreground font-semibold">
                Average Refuel: {Math.round(avgLitres)} Litres
              </span>
            </div>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={lineChartData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" tick={{ fontSize: 10 }} />
                  <YAxis tick={{ fontSize: 10 }} />
                  <Tooltip
                    formatter={(value: any) => [`${value} Litres`, 'Quantity']}
                    labelFormatter={(label, items) => {
                      const item = items && items[0] ? items[0].payload : null;
                      return item ? `${label} — ${item.asset}` : label;
                    }}
                  />
                  <Legend />
                  <Line type="monotone" dataKey="Litres" stroke="#E8530A" strokeWidth={3} activeDot={{ r: 8 }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="card p-5 space-y-3">
            <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
              <DollarSign size={16} className="text-emerald-600" /> Unit Cost Rate ($/Litre)
            </h3>
            <span className="text-[11px] text-muted-foreground block">
              Contract Rate Standard: ${avgCost.toFixed(2)} / Litre
            </span>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={lineChartData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" tick={{ fontSize: 9 }} />
                  <YAxis domain={['auto', 'auto']} tick={{ fontSize: 10 }} />
                  <Tooltip formatter={(value: any) => [`$${Number(value).toFixed(2)} / Litre`, 'Unit Cost']} />
                  <Line type="monotone" dataKey="UnitCost" stroke="#10B981" strokeWidth={2.5} />
                </LineChart>
              </ResponsiveContainer>
            </div>
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
              placeholder="Search by supplier, receipt # or notes..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="input-field pl-9 text-xs"
            />
          </div>

          <div className="flex items-center gap-2">
            <Filter size={14} className="text-muted-foreground shrink-0" />
            <select
              value={assetFilter}
              onChange={(e) => setAssetFilter(e.target.value)}
              className="input-field text-xs py-1.5 w-48 bg-background"
            >
              <option value="ALL">All Equipment Fleet</option>
              {assets.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.asset_number ? `${a.asset_number} — ` : ''}{a.name}
                </option>
              ))}
            </select>

            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              className="input-field text-xs py-1.5 w-36 bg-background"
            >
              <option value="ALL">All Fuel Types</option>
              <option value="DIESEL">Diesel</option>
              <option value="PETROL">Petrol</option>
            </select>

            <button
              type="button"
              onClick={() => setAnomalyFilter(anomalyFilter === 'ANOMALIES_ONLY' ? 'ALL' : 'ANOMALIES_ONLY')}
              className={`text-xs py-1.5 px-3 rounded font-semibold border ${
                anomalyFilter === 'ANOMALIES_ONLY'
                  ? 'bg-amber-100 text-amber-900 border-amber-300'
                  : 'bg-background text-foreground border-input hover:bg-muted'
              }`}
            >
              ⚠️ Anomalies Only {anomalyCount > 0 ? `(${anomalyCount})` : ''}
            </button>

            {(search || assetFilter !== 'ALL' || typeFilter !== 'ALL' || anomalyFilter !== 'ALL') && (
              <button
                type="button"
                className="btn-secondary text-xs py-1.5 px-3"
                onClick={() => {
                  setSearch('');
                  setAssetFilter('ALL');
                  setTypeFilter('ALL');
                  setAnomalyFilter('ALL');
                }}
              >
                Reset
              </button>
            )}
          </div>
        </div>

        <span className="text-xs text-muted-foreground font-semibold">
          Showing {filteredLogs.length} fuel logs
        </span>
      </div>

      {/* Main Table */}
      <div className="card p-5 overflow-hidden">
        {loading ? (
          <p className="text-sm text-muted-foreground py-12 text-center">Loading fuel logs database...</p>
        ) : filteredLogs.length === 0 ? (
          <div className="py-12 text-center text-muted-foreground space-y-2">
            <Fuel size={32} className="mx-auto text-muted-foreground/40" />
            <p className="text-sm font-semibold">No fuel logs recorded matching filter criteria.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead className="bg-muted text-muted-foreground font-semibold border-b">
                <tr>
                  <th className="p-3">Equipment Asset</th>
                  <th className="p-3">Recorded Date</th>
                  <th className="p-3">Fuel Type</th>
                  <th className="p-3">Quantity (Litres)</th>
                  <th className="p-3">Unit Cost ($/L)</th>
                  <th className="p-3">Meter Reading</th>
                  <th className="p-3">Supplier & Anomaly Status</th>
                  <th className="p-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {filteredLogs.map((fl, idx) => (
                  <tr
                    key={fl.id || idx}
                    className={`transition-colors ${
                      fl.isAnomaly ? 'bg-amber-50/70 hover:bg-amber-100/50' : 'hover:bg-muted/30'
                    }`}
                  >
                    <td className="p-3">
                      <Link href={`/workspace/assets/${fl.asset_id}`} className="font-bold text-primary hover:underline block">
                        {fl.asset_name}
                      </Link>
                      {fl.asset_number && (
                        <span className="text-[11px] text-muted-foreground">Tag: {fl.asset_number}</span>
                      )}
                    </td>

                    <td className="p-3 text-muted-foreground font-medium">
                      {fl.recorded_at ? new Date(fl.recorded_at).toLocaleDateString() : '—'}
                    </td>

                    <td className="p-3">
                      <span className="badge badge-neutral text-[11px]">
                        {fl.fuel_type || 'DIESEL'}
                      </span>
                    </td>

                    <td className="p-3">
                      <span className="text-sm font-extrabold text-foreground">
                        {Number(fl.quantity_litres || 0).toLocaleString()} L
                      </span>
                    </td>

                    <td className="p-3 font-semibold">
                      ${Number(fl.unit_cost || 0).toFixed(2)} / L
                    </td>

                    <td className="p-3">
                      <span className="font-semibold text-foreground">
                        {fl.meter_reading != null ? `${fl.meter_reading}` : '—'}
                      </span>
                    </td>

                    <td className="p-3 text-muted-foreground">
                      <span className="block font-medium text-foreground">{fl.supplier || 'Station / Depot'}</span>
                      {fl.isAnomaly ? (
                        <span className="inline-flex items-center gap-1 text-[10px] font-bold text-amber-800 bg-amber-200/80 px-1.5 py-0.5 rounded mt-0.5">
                          <AlertTriangle size={10} /> {fl.anomalyReason}
                        </span>
                      ) : (
                        fl.reference_number && <span className="text-[11px]">Ref: {fl.reference_number}</span>
                      )}
                    </td>

                    <td className="p-3 text-right">
                      <button
                        onClick={() => setSelectedLog(fl)}
                        className="btn-secondary py-1 px-2.5 text-[11px]"
                      >
                        Dip Checks & Details
                      </button>
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
        <Modal name="Log Fuel Entry" onClose={() => setLogging(false)}>
          <RecordForm
            operation={fuelLogCreateOp}
            path={assets[0] ? `/api/v1/assets/${assets[0].id}/fuel-logs` : ''}
            method="POST"
            onSuccess={() => {
              setLogging(false);
              reload();
            }}
          />
        </Modal>
      )}

      {/* Dip Check & Details Modal */}
      {selectedLog && (
        <Modal name={`Fuel Log & Dip Checks · ${selectedLog.asset_name}`} onClose={() => setSelectedLog(null)}>
          <div className="space-y-4 text-xs">
            {error && (
              <p role="alert" className="text-xs text-rose-700 bg-rose-50 p-2 rounded border border-rose-200">
                {error}
              </p>
            )}

            {selectedLog.isAnomaly && (
              <div className="bg-amber-100 border border-amber-300 p-3 rounded text-amber-900 font-medium space-y-1">
                <span className="font-bold flex items-center gap-1">
                  <AlertTriangle size={13} className="text-amber-700" /> Flagged Fuel Consumption Anomaly
                </span>
                <p>{selectedLog.anomalyReason}</p>
                {selectedLog.notes && <p className="text-[11px] italic text-amber-800">{selectedLog.notes}</p>}
              </div>
            )}

            <div className="grid grid-cols-2 gap-3">
              <div className="bg-muted/30 p-2.5 rounded">
                <span className="text-muted-foreground block">Equipment Asset</span>
                <strong className="text-sm font-semibold text-primary">{selectedLog.asset_name}</strong>
              </div>
              <div className="bg-muted/30 p-2.5 rounded">
                <span className="text-muted-foreground block">Initial Fuel Quantity</span>
                <strong className="text-sm font-semibold">{selectedLog.quantity_litres} Litres</strong>
              </div>
              <div className="bg-muted/30 p-2.5 rounded">
                <span className="text-muted-foreground block">Supplier / Depot</span>
                <strong className="text-sm font-semibold">{selectedLog.supplier || 'Station'}</strong>
              </div>
              <div className="bg-muted/30 p-2.5 rounded">
                <span className="text-muted-foreground block">Recorded At</span>
                <strong className="text-sm font-semibold">{selectedLog.recorded_at ? new Date(selectedLog.recorded_at).toLocaleDateString() : '—'}</strong>
              </div>
            </div>

            {/* Sub-Entries Dip Checks Section */}
            <div className="card p-3 space-y-3 bg-muted/20 border">
              <div className="flex justify-between items-center">
                <h4 className="font-bold text-foreground flex items-center gap-1.5">
                  <Fuel size={13} className="text-primary" /> Daily Dip Check / Fuel Reduction Sub-Entries
                </h4>
                <button
                  type="button"
                  onClick={() => setSubModalOpen(!subModalOpen)}
                  className="btn-secondary text-xs py-1 px-2.5 flex items-center gap-1"
                >
                  <Plus size={12} /> Record Dip Check
                </button>
              </div>

              {subModalOpen && (
                <form onSubmit={handleCreateSubEntry} className="p-3 bg-white rounded border space-y-3">
                  <div>
                    <label className="text-[11px] font-semibold block mb-1">Fuel Remaining in Tank (Litres)</label>
                    <input
                      type="number"
                      placeholder="e.g. 150"
                      value={subFuelLeft}
                      onChange={(e) => setSubFuelLeft(e.target.value)}
                      className="input-field text-xs"
                      required
                    />
                  </div>
                  <div>
                    <label className="text-[11px] font-semibold block mb-1">Recorded At</label>
                    <input
                      type="datetime-local"
                      value={subRecordedAt}
                      onChange={(e) => setSubRecordedAt(e.target.value)}
                      className="input-field text-xs"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] font-semibold block mb-1">Dip Check Reason / Notes</label>
                    <input
                      type="text"
                      placeholder="Daily dip check notes..."
                      value={subNotes}
                      onChange={(e) => setSubNotes(e.target.value)}
                      className="input-field text-xs"
                    />
                  </div>
                  <div className="flex justify-end gap-2 pt-1">
                    <button type="button" onClick={() => setSubModalOpen(false)} className="btn-secondary text-xs">
                      Cancel
                    </button>
                    <button type="submit" disabled={subSubmitting} className="btn-primary text-xs">
                      {subSubmitting ? 'Saving...' : 'Save Dip Check'}
                    </button>
                  </div>
                </form>
              )}

              {fuelReductions.length === 0 ? (
                <p className="text-xs text-muted-foreground italic py-2">No dip check sub-entries logged for this fuel batch.</p>
              ) : (
                <div className="space-y-2">
                  {fuelReductions.map((r, idx) => (
                    <div key={r.id || idx} className="flex justify-between items-center bg-white p-2.5 rounded border text-xs">
                      <div>
                        <span className="font-bold text-foreground block">{r.remaining_litres} L Remaining</span>
                        <span className="text-[11px] text-muted-foreground">
                          {r.litres_reduced ? `-${r.litres_reduced} L consumed · ` : ''}{r.reduction_reason || 'Daily Check'}
                        </span>
                      </div>
                      <span className="text-muted-foreground text-[11px]">
                        {r.recorded_at ? new Date(r.recorded_at).toLocaleString() : ''}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="flex justify-end pt-2">
              <button type="button" onClick={() => setSelectedLog(null)} className="btn-secondary text-xs">
                Close
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
