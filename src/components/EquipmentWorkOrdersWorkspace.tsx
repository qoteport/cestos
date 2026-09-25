'use client';
import WorkCompletionDetails from './WorkCompletionDetails';
import useAppFeedback from './useAppFeedback';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { FileText, ArrowLeft, RefreshCw, Plus, Search, Filter, CheckCircle, Clock, AlertTriangle, Users, UserCheck, Wrench, User } from 'lucide-react';
import { apiFetch } from '@/lib/api';
import { Row, display, Modal } from './DataUI';
import RecordForm from './RecordForm';
import SearchableSelect from './SearchableSelect';
import AppDateTimePicker from './ui/AppDateTimePicker';

export default function EquipmentWorkOrdersWorkspace() {
  const { notify } = useAppFeedback();
  const [loading, setLoading] = useState(true);
  const [workOrders, setWorkOrders] = useState<Row[]>([]);
  const [assets, setAssets] = useState<Row[]>([]);
  const [employees, setEmployees] = useState<Row[]>([]);
  const [version, setVersion] = useState(0);

  // Filters
  const [search, setSearch] = useState('');
  const [assetFilter, setAssetFilter] = useState('ALL');
  const [priorityFilter, setPriorityFilter] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState('ALL');

  // Modal state
  const [creating, setCreating] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<Row | null>(null);
  const [newWorkOrder, setNewWorkOrder] = useState({
    asset_id: '',
    title: '',
    description: '',
    priority: 'NORMAL',
    maintenance_type: 'SERVICE',
    scheduled_date: new Date().toISOString().slice(0, 10),
    assigned_employee_id: '',
    provider: '',
    cost: 0,
  });

  const reload = () => setVersion((v) => v + 1);

  const handleCreateWorkOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    const targetAssetId = newWorkOrder.asset_id || (assets[0] ? assets[0].id : '');
    if (!targetAssetId) {
      alert('Please select a Target Equipment Asset');
      return;
    }
    if (!newWorkOrder.title.trim()) {
      alert('Please enter a Work Order Title');
      return;
    }

    try {
      await apiFetch(`/api/v1/assets/${targetAssetId}/maintenance`, {
        method: 'POST',
        body: JSON.stringify({
          title: newWorkOrder.title.trim(),
          description: newWorkOrder.description.trim() || undefined,
          maintenance_type: newWorkOrder.maintenance_type,
          priority: newWorkOrder.priority,
          scheduled_date: newWorkOrder.scheduled_date || undefined,
          assigned_employee_id: newWorkOrder.assigned_employee_id || undefined,
          provider: newWorkOrder.provider.trim() || undefined,
          cost: Number(newWorkOrder.cost) || 0,
        }),
      });
      setCreating(false);
      setNewWorkOrder({
        asset_id: '',
        title: '',
        description: '',
        priority: 'NORMAL',
        maintenance_type: 'SERVICE',
        scheduled_date: new Date().toISOString().slice(0, 10),
        assigned_employee_id: '',
        provider: '',
        cost: 0,
      });
      reload();
    } catch (err: any) {
      alert(err.message || 'Failed to create work order');
    }
  };

  useEffect(() => {
    let active = true;
    setLoading(true);

    Promise.all([
      apiFetch<any>('/api/v1/assets?page_size=50').catch(() => []),
      apiFetch<any>('/api/v1/employees?page_size=100').catch(() => []),
      apiFetch<Row[]>('/api/v1/maintenance/work-orders'),
    ])
      .then(async ([assetsData, employeesData, detailedOrders]) => {
        if (!active) return;
        const assetList = Array.isArray(assetsData) ? assetsData : assetsData?.items || [];
        const empList = Array.isArray(employeesData) ? employeesData : employeesData?.items || [];
        setAssets(assetList);
        setEmployees(empList);

        const empMap = new Map<string, any>(empList.map((e: any) => [String(e.id), e]));

        const orderPromises = assetList.slice(0, 15).map(async (asset: Row) => {
          try {
            const mData = await apiFetch<any>(`/api/v1/assets/${asset.id}/maintenance?page_size=50`);
            const mList = Array.isArray(mData) ? mData : mData?.items || [];
            return mList.map((j: Row) => {
              const emp = j.assigned_employee_id ? empMap.get(String(j.assigned_employee_id)) : null;
              const empName = emp ? (emp.first_name ? `${emp.first_name} ${emp.last_name}`.trim() : emp.name || emp.email) : (j.assigned_employee_name || null);
              const empRole = emp?.job_title || emp?.position || 'Maintenance Technician';

              return {
                ...j,
                asset_name: asset.name,
                asset_number: asset.asset_number,
                asset_id: asset.id,
                assigned_employee_name: empName,
                assigned_employee_role: empRole,
              };
            });
          } catch (_) {
            return [];
          }
        });

        const results = await Promise.all(orderPromises);
        const detailed = detailedOrders.map((order: Row) => {
          const asset = assetList.find((item: Row) => item.id === order.asset_id);
          const employee = empMap.get(String(order.assigned_technician_id));
          return { ...order, source: 'work_order', asset_name: asset?.name || order.asset_id,
            asset_number: asset?.asset_number, maintenance_type: order.work_type,
            assigned_employee_id: order.assigned_technician_id,
            assigned_employee_name: employee ? `${employee.first_name || ''} ${employee.last_name || ''}`.trim() : null };
        });
        const fetchedOrders = [...results.flat(), ...detailed];

        if (active) {
          setWorkOrders(fetchedOrders);
          setLoading(false);
        }
      })
      .catch((error) => {
        if (active) { setLoading(false); notify({ type: 'error', message: error.message || 'Could not load work orders.' }); }
      });

    return () => {
      active = false;
    };
  }, [version, notify]);

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
            <div className="w-44">
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

            <div className="w-36">
              <SearchableSelect
                value={priorityFilter}
                onChange={(val) => setPriorityFilter(val)}
                options={[
                  { value: 'ALL', label: 'All Priorities' },
                  { value: 'LOW', label: 'Low' },
                  { value: 'NORMAL', label: 'Normal' },
                  { value: 'HIGH', label: 'High' },
                  { value: 'CRITICAL', label: 'Critical' },
                ]}
                searchable={false}
                ariaLabel="Filter Priority"
              />
            </div>

            <div className="w-40">
              <SearchableSelect
                value={statusFilter}
                onChange={(val) => setStatusFilter(val)}
                options={[
                  { value: 'ALL', label: 'All Statuses' },
                  { value: 'IN_PROGRESS', label: 'In Progress' },
                  { value: 'SCHEDULED', label: 'Scheduled' },
                  { value: 'COMPLETED', label: 'Completed' },
                ]}
                searchable={false}
                ariaLabel="Filter Status"
              />
            </div>

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
                  <th className="p-3">Assigned Individuals</th>
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

                      <td className="p-3">
                        <span className="font-bold text-foreground block">
                          {w.assigned_employee_name || w.provider || 'In-house Technician'}
                        </span>
                        <span className="text-[10px] text-muted-foreground block">
                          {w.assigned_employee_role || (w.provider ? 'Service Contractor' : 'Maintenance Team')}
                        </span>
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
        <Modal name="Create Equipment Work Order" onClose={() => setCreating(false)}>
          <form onSubmit={handleCreateWorkOrder} className="space-y-4 text-xs">
            <div className="space-y-1">
              <label className="font-semibold text-foreground block">Target Equipment Asset *</label>
              <SearchableSelect
                value={newWorkOrder.asset_id || (assets[0]?.id ? String(assets[0]?.id) : '')}
                onChange={(val) => setNewWorkOrder({ ...newWorkOrder, asset_id: val })}
                options={assets.map((a) => ({
                  value: String(a.id),
                  label: `${a.asset_number ? `${a.asset_number} — ` : ''}${a.name}`,
                }))}
                searchable={assets.length > 5}
                required
                ariaLabel="Target Equipment Asset"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="font-semibold text-foreground block">Work Order Title / Dispatch *</label>
                <input
                  type="text"
                  placeholder="e.g. Track Tensioning & Undercarriage Safety Check"
                  value={newWorkOrder.title}
                  onChange={(e) => setNewWorkOrder({ ...newWorkOrder, title: e.target.value })}
                  className="input-field text-xs w-full"
                  required
                />
              </div>

              <div className="space-y-1">
                <label className="font-semibold text-foreground block">Priority Level</label>
                <SearchableSelect
                  value={newWorkOrder.priority}
                  onChange={(val) => setNewWorkOrder({ ...newWorkOrder, priority: val })}
                  options={[
                    { value: 'LOW', label: 'Low Priority' },
                    { value: 'NORMAL', label: 'Normal Priority' },
                    { value: 'HIGH', label: 'High Priority' },
                    { value: 'CRITICAL', label: 'Critical Priority' },
                  ]}
                  searchable={false}
                  ariaLabel="Priority Level"
                />
              </div>
            </div>

            <div className="space-y-1">
              <label className="font-semibold text-foreground block">Work Order Scope & Maintenance Instructions</label>
              <textarea
                rows={3}
                placeholder="Specify detailed work order instructions, replacement parts required, and safety protocols..."
                value={newWorkOrder.description}
                onChange={(e) => setNewWorkOrder({ ...newWorkOrder, description: e.target.value })}
                className="input-field text-xs w-full"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="font-semibold text-foreground block">Scheduled Execution Date</label>
                <AppDateTimePicker
                  mode="date"
                  value={newWorkOrder.scheduled_date}
                  onChange={(val) => setNewWorkOrder({ ...newWorkOrder, scheduled_date: val })}
                  placeholder="Select scheduled date"
                />
              </div>

              <div className="space-y-1">
                <label className="font-semibold text-foreground block">Assigned Lead Technician / Individual</label>
                <SearchableSelect
                  value={newWorkOrder.assigned_employee_id}
                  onChange={(val) => setNewWorkOrder({ ...newWorkOrder, assigned_employee_id: val })}
                  options={[
                    { value: '', label: 'Unassigned / In-house Maintenance Team' },
                    ...employees.map((emp) => ({
                      value: String(emp.id),
                      label: `${emp.first_name ? `${emp.first_name} ${emp.last_name}`.trim() : emp.name || emp.email}${emp.job_title ? ` (${emp.job_title})` : ''}`,
                    })),
                  ]}
                  searchable={employees.length > 5}
                  ariaLabel="Assigned Lead Technician"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="font-semibold text-foreground block">External Service Contractor (Optional)</label>
                <input
                  type="text"
                  placeholder="e.g. TrackTech Field Services Ltd"
                  value={newWorkOrder.provider}
                  onChange={(e) => setNewWorkOrder({ ...newWorkOrder, provider: e.target.value })}
                  className="input-field text-xs w-full"
                />
              </div>

              <div className="space-y-1">
                <label className="font-semibold text-foreground block">Estimated Work Order Cost ($)</label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  placeholder="0.00"
                  value={newWorkOrder.cost || ''}
                  onChange={(e) => setNewWorkOrder({ ...newWorkOrder, cost: Number(e.target.value) })}
                  className="input-field text-xs w-full"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t">
              <button
                type="button"
                onClick={() => setCreating(false)}
                className="btn-secondary text-xs py-1.5 px-3"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="btn-primary text-xs py-1.5 px-4 font-semibold"
              >
                Dispatch Work Order
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* Details Modal */}
      {selectedOrder && (
        <Modal name={`Work Order Details · ${selectedOrder.title}`} onClose={() => setSelectedOrder(null)}>
          <WorkCompletionDetails work={selectedOrder} />
          <div className="space-y-4 text-xs">
            {/* Top Overview Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              <div className="bg-muted/40 p-3 rounded-lg border">
                <span className="text-[10px] uppercase font-semibold text-muted-foreground block">Work Order Title</span>
                <strong className="text-sm font-bold text-foreground block mt-0.5">{selectedOrder.title}</strong>
                {selectedOrder.wo_number && (
                  <span className="text-[10px] text-muted-foreground">WO #: {selectedOrder.wo_number}</span>
                )}
              </div>
              <div className="bg-muted/40 p-3 rounded-lg border">
                <span className="text-[10px] uppercase font-semibold text-muted-foreground block">Assigned Equipment Asset</span>
                <strong className="text-sm font-bold text-primary block mt-0.5">{selectedOrder.asset_name}</strong>
                {selectedOrder.asset_number && (
                  <span className="text-[10px] text-muted-foreground">Tag: {selectedOrder.asset_number}</span>
                )}
              </div>
              <div className="bg-muted/40 p-3 rounded-lg border">
                <span className="text-[10px] uppercase font-semibold text-muted-foreground block">Priority & Status</span>
                <div className="flex items-center gap-1.5 mt-1">
                  <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                    String(selectedOrder.priority || '').toUpperCase() === 'CRITICAL' ? 'bg-rose-100 text-rose-800' :
                    String(selectedOrder.priority || '').toUpperCase() === 'HIGH' ? 'bg-amber-100 text-amber-800' :
                    'bg-slate-100 text-slate-700'
                  }`}>
                    {selectedOrder.priority || 'NORMAL'}
                  </span>
                  <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-primary/10 text-primary">
                    {selectedOrder.status || 'SCHEDULED'}
                  </span>
                </div>
              </div>
              <div className="bg-muted/40 p-3 rounded-lg border">
                <span className="text-[10px] uppercase font-semibold text-muted-foreground block">Execution & Cost</span>
                <strong className="text-sm font-bold text-foreground block mt-0.5">
                  {selectedOrder.cost ? `$${Number(selectedOrder.cost).toLocaleString()}` : 'Standard Maintenance'}
                </strong>
                <span className="text-[10px] text-muted-foreground">
                  Date: {selectedOrder.scheduled_date ? new Date(selectedOrder.scheduled_date).toLocaleDateString() : 'Immediate Dispatch'}
                </span>
              </div>
            </div>

            {/* Scope & Instructions */}
            {selectedOrder.description && (
              <div className="bg-muted/20 p-3 rounded-lg border space-y-1">
                <span className="text-[10px] font-semibold uppercase text-muted-foreground block">Work Order Scope & Maintenance Instructions</span>
                <p className="text-xs leading-relaxed text-foreground whitespace-pre-wrap">{selectedOrder.description}</p>
              </div>
            )}

            {/* ASSIGNED INDIVIDUALS & MAINTENANCE PERSONNEL SECTION */}
            <div className="border rounded-lg p-3.5 bg-card space-y-3">
              <div className="flex items-center justify-between border-b pb-2">
                <h3 className="font-semibold text-xs text-foreground flex items-center gap-2">
                  <Users className="h-4 w-4 text-primary" />
                  Assigned Individuals & Maintenance Personnel
                </h3>
                <span className="text-[10px] px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-700 font-semibold border border-emerald-500/20">
                  Active Dispatch Roster
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                {/* 1. Lead Technician / Assigned Employee */}
                <div className="p-3 rounded-lg border bg-muted/30 space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] uppercase font-bold text-muted-foreground flex items-center gap-1">
                      <UserCheck className="h-3.5 w-3.5 text-emerald-600" /> Assigned Lead Technician
                    </span>
                    <span className="text-[9px] px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-800 font-semibold">Technician</span>
                  </div>
                  <strong className="text-xs font-bold text-foreground block mt-1">
                    {selectedOrder.assigned_employee_name || 'In-House Service Lead'}
                  </strong>
                  <span className="text-[10px] text-muted-foreground block">
                    {selectedOrder.assigned_employee_role || 'Heavy Equipment Maintenance Specialist'}
                  </span>
                </div>

                {/* 2. Service Contractor / External Provider */}
                <div className="p-3 rounded-lg border bg-muted/30 space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] uppercase font-bold text-muted-foreground flex items-center gap-1">
                      <Wrench className="h-3.5 w-3.5 text-blue-600" /> External Service Provider
                    </span>
                    <span className="text-[9px] px-1.5 py-0.5 rounded bg-blue-100 text-blue-800 font-semibold">Contractor</span>
                  </div>
                  <strong className="text-xs font-bold text-foreground block mt-1">
                    {selectedOrder.provider || 'Internal Mechanical Workshop'}
                  </strong>
                  <span className="text-[10px] text-muted-foreground block">
                    {selectedOrder.provider ? 'External Field Service Contractor' : 'In-House Fleet Maintenance Bay'}
                  </span>
                </div>

                {/* 3. Dispatched By / Author */}
                <div className="p-3 rounded-lg border bg-muted/30 space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] uppercase font-bold text-muted-foreground flex items-center gap-1">
                      <User className="h-3.5 w-3.5 text-amber-600" /> Dispatched By
                    </span>
                    <span className="text-[9px] px-1.5 py-0.5 rounded bg-amber-100 text-amber-800 font-semibold">Supervisor</span>
                  </div>
                  <strong className="text-xs font-bold text-foreground block mt-1">
                    {selectedOrder.created_by_name || selectedOrder.author || 'Operations Dispatch Controller'}
                  </strong>
                  <span className="text-[10px] text-muted-foreground block">
                    Maintenance Supervisor & Dispatch Author
                  </span>
                </div>
              </div>

              {/* Roster Badges / Assigned Individuals List */}
              <div className="pt-1 flex flex-wrap items-center gap-2 border-t mt-2">
                <span className="text-[10px] font-semibold text-muted-foreground">Assigned Personnel Roster:</span>
                {selectedOrder.assigned_employee_name && (
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-medium bg-emerald-50 text-emerald-800 border border-emerald-200">
                    <UserCheck className="h-3 w-3 text-emerald-600" />
                    <strong>{selectedOrder.assigned_employee_name}</strong>
                    <span className="text-[9px] opacity-75">({selectedOrder.assigned_employee_role || 'Lead Mechanic'})</span>
                  </span>
                )}
                {selectedOrder.provider && (
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-medium bg-blue-50 text-blue-800 border border-blue-200">
                    <Wrench className="h-3 w-3 text-blue-600" />
                    <strong>{selectedOrder.provider}</strong>
                    <span className="text-[9px] opacity-75">(Contractor)</span>
                  </span>
                )}
                {selectedOrder.created_by_name && (
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-medium bg-amber-50 text-amber-800 border border-amber-200">
                    <User className="h-3 w-3 text-amber-600" />
                    <strong>{selectedOrder.created_by_name}</strong>
                    <span className="text-[9px] opacity-75">(Author)</span>
                  </span>
                )}
                {!selectedOrder.assigned_employee_name && !selectedOrder.provider && (
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-medium bg-slate-100 text-slate-700 border">
                    <Users className="h-3 w-3 text-slate-500" />
                    <strong>In-house Fleet Maintenance & Undercarriage Crew</strong>
                  </span>
                )}
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
