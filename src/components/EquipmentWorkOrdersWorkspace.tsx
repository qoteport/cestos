'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { FileText, ArrowLeft, RefreshCw, Plus, Search, Filter, CheckCircle, Clock, AlertTriangle } from 'lucide-react';
import { apiFetch } from '@/lib/api';
import { Row, display, Modal } from './DataUI';
import RecordForm from './RecordForm';

export default function EquipmentWorkOrdersWorkspace() {
  const [loading, setLoading] = useState(true);
  const [workOrders, setWorkOrders] = useState<Row[]>([]);
  const [assets, setAssets] = useState<Row[]>([]);
  const [version, setVersion] = useState(0);

  // Filters
  const [search, setSearch] = useState('');
  const [assetFilter, setAssetFilter] = useState('ALL');
  const [priorityFilter, setPriorityFilter] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState('ALL');

  // Modal
  const [creating, setCreating] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<Row | null>(null);

  const reload = () => setVersion((v) => v + 1);

  useEffect(() => {
    let active = true;
    setLoading(true);

    apiFetch<any>('/api/v1/assets?page_size=50')
      .then(async (assetsData) => {
        if (!active) return;
        const assetList = Array.isArray(assetsData) ? assetsData : assetsData?.items || [];
        setAssets(assetList);

        const orderPromises = assetList.slice(0, 15).map(async (asset: Row) => {
          try {
            const mData = await apiFetch<any>(`/api/v1/assets/${asset.id}/maintenance?page_size=50`);
            const mList = Array.isArray(mData) ? mData : mData?.items || [];
            return mList.map((j: Row) => ({
              ...j,
              asset_name: asset.name,
              asset_number: asset.asset_number,
              asset_id: asset.id,
            }));
          } catch (_) {
            return [];
          }
        });

        const results = await Promise.all(orderPromises);
        if (active) {
          setWorkOrders(results.flat());
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

  const filteredOrders = workOrders.filter((w) => {
    const searchStr = `${w.title || ''} ${w.description || ''} ${w.asset_name || ''} ${w.provider || ''}`.toLowerCase();
    const matchesSearch = !search || searchStr.includes(search.toLowerCase());
    const matchesAsset = assetFilter === 'ALL' || String(w.asset_id) === assetFilter;
    const matchesPriority = priorityFilter === 'ALL' || String(w.priority || '').toUpperCase() === priorityFilter;
    const matchesStatus = statusFilter === 'ALL' || String(w.status || '').toUpperCase() === statusFilter;

    return matchesSearch && matchesAsset && matchesPriority && matchesStatus;
  });

  const totalOrders = workOrders.length;
  const inProgressCount = workOrders.filter((w) => String(w.status || '').toUpperCase() === 'IN_PROGRESS').length;
  const highPriorityCount = workOrders.filter((w) => ['HIGH', 'CRITICAL'].includes(String(w.priority || '').toUpperCase())).length;
  const completedCount = workOrders.filter((w) => ['COMPLETED', 'RESOLVED', 'CLOSED'].includes(String(w.status || '').toUpperCase())).length;

  const workOrderCreateOp = {
    schema: {
      type: 'object',
      required: ['title'],
      properties: {
        asset_id: { type: 'string', format: 'uuid', title: 'Target Equipment Asset' },
        title: { type: 'string', minLength: 1, maxLength: 200, title: 'Work Order Title / Dispatch' },
        description: { type: 'string', title: 'Work Order Scope & Instructions' },
        priority: {
          type: 'string',
          enum: ['LOW', 'NORMAL', 'HIGH', 'CRITICAL'],
          title: 'Priority Level',
          default: 'NORMAL',
        },
        scheduled_date: { type: 'string', format: 'date', title: 'Scheduled Execution Date' },
        assigned_employee_id: { type: 'string', format: 'uuid', title: 'Assigned Lead Technician' },
        provider: { type: 'string', title: 'External Service Contractor' },
        cost: { type: 'number', title: 'Estimated Work Order Cost ($)' },
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
          <h1 className="text-2xl font-bold text-foreground">Equipment Work Orders Dispatch</h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            Dispatch, assign, and track operational work orders, repair job cards, and contractor work orders.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button onClick={reload} className="btn-secondary text-xs p-2.5" title="Refresh data">
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
          </button>
          {assets.length > 0 && (
            <button onClick={() => setCreating(true)} className="btn-primary text-xs flex items-center gap-1">
              <Plus size={14} /> Create Work Order
            </button>
          )}
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="card p-4 space-y-1.5 border-l-4 border-l-primary">
          <span className="text-xs font-semibold text-muted-foreground block">Total Work Orders</span>
          <div className="flex items-baseline justify-between">
            <span className="text-2xl font-extrabold text-foreground">{loading ? '…' : totalOrders}</span>
            <FileText size={18} className="text-primary opacity-80" />
          </div>
          <p className="text-[11px] text-muted-foreground">Dispatched work order job cards</p>
        </div>

        <div className="card p-4 space-y-1.5 border-l-4 border-l-amber-500">
          <span className="text-xs font-semibold text-muted-foreground block">Active / Dispatched</span>
          <div className="flex items-baseline justify-between">
            <span className="text-2xl font-extrabold text-amber-700">{loading ? '…' : inProgressCount}</span>
            <Clock size={18} className="text-amber-600" />
          </div>
          <p className="text-[11px] text-muted-foreground">Currently undergoing site repairs</p>
        </div>

        <div className="card p-4 space-y-1.5 border-l-4 border-l-rose-500">
          <span className="text-xs font-semibold text-muted-foreground block">High Priority Orders</span>
          <div className="flex items-baseline justify-between">
            <span className="text-2xl font-extrabold text-rose-700">{loading ? '…' : highPriorityCount}</span>
            <AlertTriangle size={18} className="text-rose-600" />
          </div>
          <p className="text-[11px] text-muted-foreground">Urgent repair work orders</p>
        </div>

        <div className="card p-4 space-y-1.5 border-l-4 border-l-emerald-500">
          <span className="text-xs font-semibold text-muted-foreground block">Completed Orders</span>
          <div className="flex items-baseline justify-between">
            <span className="text-2xl font-extrabold text-emerald-700">{loading ? '…' : completedCount}</span>
            <CheckCircle size={18} className="text-emerald-600" />
          </div>
          <p className="text-[11px] text-muted-foreground">Successfully closed work orders</p>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="card p-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-3 flex-1">
          <div className="relative flex-1 min-w-[200px] max-w-md">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search work order title, scope or provider..."
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
              className="input-field text-xs py-1.5 w-44 bg-background"
            >
              <option value="ALL">All Equipment Fleet</option>
              {assets.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.asset_number ? `${a.asset_number} — ` : ''}{a.name}
                </option>
              ))}
            </select>

            <select
              value={priorityFilter}
              onChange={(e) => setPriorityFilter(e.target.value)}
              className="input-field text-xs py-1.5 w-36 bg-background"
            >
              <option value="ALL">All Priorities</option>
              <option value="LOW">Low</option>
              <option value="NORMAL">Normal</option>
              <option value="HIGH">High</option>
              <option value="CRITICAL">Critical</option>
            </select>

            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="input-field text-xs py-1.5 w-40 bg-background"
            >
              <option value="ALL">All Statuses</option>
              <option value="IN_PROGRESS">In Progress</option>
              <option value="SCHEDULED">Scheduled</option>
              <option value="COMPLETED">Completed</option>
            </select>

            {(search || assetFilter !== 'ALL' || priorityFilter !== 'ALL' || statusFilter !== 'ALL') && (
              <button
                type="button"
                className="btn-secondary text-xs py-1.5 px-3"
                onClick={() => {
                  setSearch('');
                  setAssetFilter('ALL');
                  setPriorityFilter('ALL');
                  setStatusFilter('ALL');
                }}
              >
                Reset
              </button>
            )}
          </div>
        </div>

        <span className="text-xs text-muted-foreground font-semibold">
          Showing {filteredOrders.length} work orders
        </span>
      </div>

      {/* Main Table */}
      <div className="card p-5 overflow-hidden">
        {loading ? (
          <p className="text-sm text-muted-foreground py-12 text-center">Loading work order dispatch register...</p>
        ) : filteredOrders.length === 0 ? (
          <div className="py-12 text-center text-muted-foreground space-y-2">
            <FileText size={32} className="mx-auto text-muted-foreground/40" />
            <p className="text-sm font-semibold">No work orders recorded matching filter criteria.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead className="bg-muted text-muted-foreground font-semibold border-b">
                <tr>
                  <th className="p-3">Work Order Title</th>
                  <th className="p-3">Assigned Equipment</th>
                  <th className="p-3">Priority Level</th>
                  <th className="p-3">Status</th>
                  <th className="p-3">Contractor / Technician</th>
                  <th className="p-3">Scheduled Date</th>
                  <th className="p-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {filteredOrders.map((w, idx) => {
                  const status = String(w.status || 'SCHEDULED').toUpperCase();
                  const priority = String(w.priority || 'NORMAL').toUpperCase();

                  return (
                    <tr key={w.id || idx} className="hover:bg-muted/30 transition-colors">
                      <td className="p-3">
                        <span className="font-bold text-foreground block">{w.title}</span>
                        {w.description && (
                          <span className="text-[11px] text-muted-foreground line-clamp-1">{w.description}</span>
                        )}
                      </td>

                      <td className="p-3">
                        <Link href={`/workspace/assets/${w.asset_id}`} className="font-semibold text-primary hover:underline block">
                          {w.asset_name}
                        </Link>
                        {w.asset_number && (
                          <span className="text-[11px] text-muted-foreground">Tag: {w.asset_number}</span>
                        )}
                      </td>

                      <td className="p-3">
                        <span
                          className={`inline-block px-2 py-0.5 rounded text-[11px] font-bold ${
                            priority === 'CRITICAL' ? 'bg-rose-100 text-rose-800 border border-rose-200'
                              : priority === 'HIGH' ? 'bg-amber-100 text-amber-800 border border-amber-200'
                                : 'bg-slate-100 text-slate-700'
                          }`}
                        >
                          {priority}
                        </span>
                      </td>

                      <td className="p-3">
                        {status === 'COMPLETED' || status === 'RESOLVED' ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-100 text-emerald-800 border border-emerald-200">
                            <CheckCircle size={10} /> Completed
                          </span>
                        ) : status === 'IN_PROGRESS' ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-amber-100 text-amber-900 border border-amber-300">
                            <Clock size={10} /> In Progress
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-slate-100 text-slate-800 border border-slate-200">
                            {status}
                          </span>
                        )}
                      </td>

                      <td className="p-3 text-muted-foreground">
                        <span>{w.provider || w.assigned_employee_name || 'In-house Technician'}</span>
                      </td>

                      <td className="p-3 text-muted-foreground font-medium">
                        {w.scheduled_date ? new Date(w.scheduled_date).toLocaleDateString() : '—'}
                      </td>

                      <td className="p-3 text-right">
                        <button
                          onClick={() => setSelectedOrder(w)}
                          className="btn-secondary py-1 px-2.5 text-[11px]"
                        >
                          Details
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Create Modal */}
      {creating && (
        <Modal name="Create Work Order" onClose={() => setCreating(false)}>
          <RecordForm
            operation={workOrderCreateOp}
            path={assets[0] ? `/api/v1/assets/${assets[0].id}/maintenance` : ''}
            method="POST"
            onSuccess={() => {
              setCreating(false);
              reload();
            }}
          />
        </Modal>
      )}

      {/* Details Modal */}
      {selectedOrder && (
        <Modal name={`Work Order Details · ${selectedOrder.title}`} onClose={() => setSelectedOrder(null)}>
          <div className="space-y-4 text-xs">
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-muted/30 p-2.5 rounded">
                <span className="text-muted-foreground block">Work Order Title</span>
                <strong className="text-sm font-semibold">{selectedOrder.title}</strong>
              </div>
              <div className="bg-muted/30 p-2.5 rounded">
                <span className="text-muted-foreground block">Assigned Asset</span>
                <strong className="text-sm font-semibold text-primary">{selectedOrder.asset_name}</strong>
              </div>
              <div className="bg-muted/30 p-2.5 rounded">
                <span className="text-muted-foreground block">Priority Level</span>
                <strong className="text-sm font-semibold">{selectedOrder.priority}</strong>
              </div>
              <div className="bg-muted/30 p-2.5 rounded">
                <span className="text-muted-foreground block">Contractor / Technician</span>
                <strong className="text-sm font-semibold">{selectedOrder.provider || 'In-house'}</strong>
              </div>
            </div>

            <div className="flex justify-end pt-2">
              <button type="button" onClick={() => setSelectedOrder(null)} className="btn-secondary text-xs">
                Close
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
