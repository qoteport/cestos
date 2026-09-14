'use client';
import { useState, useMemo } from 'react';
import Link from 'next/link';
import {
  ArrowLeft,
  Package,
  Layers,
  Building2,
  History,
  DollarSign,
  TrendingDown,
  TrendingUp,
  AlertTriangle,
  Boxes,
  Plus,
  Minus,
  SlidersHorizontal,
  FileText,
  Truck,
  Tag,
  Clock,
  CheckCircle2,
  Calendar,
} from 'lucide-react';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from 'recharts';
import { useData, State, Row, rows, Table, Facts, Modal } from './DataUI';
import RecordForm from './RecordForm';
import { operation } from './ResourceWorkspace';
import { useAuth } from './AuthProvider';

export default function ItemDetailView({ itemId }: { itemId: string }) {
  const auth = useAuth();
  const root = `/api/v1/inventory/items/${itemId}`;
  const overviewRes = useData(`${root}/overview`);
  const stockRes = useData(`${root}/stock?page_size=100`);

  const [tab, setTab] = useState<'overview' | 'stores' | 'history' | 'suppliers'>('overview');
  const [timeframe, setTimeframe] = useState<'7d' | '30d' | '90d' | 'all'>('30d');

  // Action Modals State
  const [activeModal, setActiveModal] = useState<'pick' | 'receive' | 'adjust' | null>(null);

  const overview = overviewRes.data || {};
  const item = overview.item || {};
  const category = overview.category || {};
  const unit = overview.base_unit || {};
  const stockList = rows(stockRes.data || overview.stock);
  const transactions = rows(overview.recent_transactions);
  const suppliers = rows(overview.supplier_options);

  // Compute trend data for Stock Level vs Consumption Line Chart
  const chartData = useMemo(() => {
    if (!transactions.length) return [];

    const now = new Date();
    let daysToInclude = 30;
    if (timeframe === '7d') daysToInclude = 7;
    if (timeframe === '90d') daysToInclude = 90;
    if (timeframe === 'all') daysToInclude = 365;

    const cutoff = new Date(now.getTime() - daysToInclude * 24 * 60 * 60 * 1000);

    // Filter and sort transactions chronologically
    const filteredTxns = transactions
      .filter((t: any) => {
        const d = new Date(t.created_at || t.transaction_date || Date.now());
        return d >= cutoff;
      })
      .sort((a: any, b: any) => {
        return (
          new Date(a.created_at || a.transaction_date || 0).getTime() -
          new Date(b.created_at || b.transaction_date || 0).getTime()
        );
      });

    // Build timeline points per day
    const dayMap = new Map<string, { stock_level: number; consumption: number; receipts: number }>();
    
    // Group transactions by date string YYYY-MM-DD
    let currentStock = Number(overview.quantity_on_hand || 0);

    // Work backwards or forward to simulate stock points
    filteredTxns.forEach((txn: any) => {
      const d = new Date(txn.created_at || txn.transaction_date || Date.now());
      const dateStr = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });

      if (!dayMap.has(dateStr)) {
        dayMap.set(dateStr, { stock_level: 0, consumption: 0, receipts: 0 });
      }
      const entry = dayMap.get(dateStr)!;

      const qty = Math.abs(Number(txn.quantity || 0));
      const type = String(txn.transaction_type || '').toUpperCase();

      if (type.includes('ISSUE') || type.includes('CONSUMPTION') || type.includes('PICK') || type.includes('OUT')) {
        entry.consumption += qty;
      } else if (type.includes('RECEIPT') || type.includes('IN') || type.includes('OPENING')) {
        entry.receipts += qty;
      }
    });

    // If dayMap is sparse or empty, build synthetic dates from transactions or provide standard points
    const points: Array<{ date: string; 'Stock Level': number; 'Consumption (Picked)': number }> = [];

    if (dayMap.size > 0) {
      let runningStock = Number(overview.quantity_on_hand || 0);
      // Calculate initial stock at start of range by unwinding transactions
      let netChange = 0;
      dayMap.forEach((v) => {
        netChange += v.receipts - v.consumption;
      });
      runningStock = Math.max(0, runningStock - netChange);

      dayMap.forEach((v, dateStr) => {
        runningStock = Math.max(0, runningStock + v.receipts - v.consumption);
        points.push({
          date: dateStr,
          'Stock Level': runningStock,
          'Consumption (Picked)': v.consumption,
        });
      });
    } else {
      // Fallback timeline point showing current state
      const dateStr = now.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
      points.push({
        date: dateStr,
        'Stock Level': Number(overview.quantity_on_hand || 0),
        'Consumption (Picked)': 0,
      });
    }

    return points;
  }, [transactions, overview.quantity_on_hand, timeframe]);

  const handleActionSaved = () => {
    setActiveModal(null);
    overviewRes.reload();
    stockRes.reload();
  };

  return (
    <div className="space-y-6">
      {/* Action Forms Modals */}
      {activeModal === 'pick' && (
        <Modal name="Take / Pick Stock (-)" onClose={() => setActiveModal(null)}>
          <RecordForm
            resource="inventory/issues"
            operation={
              operation('/api/v1/inventory/issues', 'POST') || {
                method: 'POST',
                permissions: ['inventory.issues.create'],
              }
            }
            path="/api/v1/inventory/issues"
            initial={{
              item_id: itemId,
              purpose: 'PROJECT_CONSUMPTION',
              transaction_date: new Date().toISOString().slice(0, 10),
            }}
            onClose={() => setActiveModal(null)}
            onSaved={handleActionSaved}
          />
        </Modal>
      )}

      {activeModal === 'receive' && (
        <Modal name="Receive Stock Intake (+)" onClose={() => setActiveModal(null)}>
          <RecordForm
            resource="inventory/receipts"
            operation={
              operation('/api/v1/inventory/receipts', 'POST') || {
                method: 'POST',
                permissions: ['inventory.receipts.create'],
              }
            }
            path="/api/v1/inventory/receipts"
            allowFile={true}
            initial={{
              item_id: itemId,
              purpose: 'PURCHASE_RECEIPT',
              transaction_date: new Date().toISOString().slice(0, 10),
            }}
            onClose={() => setActiveModal(null)}
            onSaved={handleActionSaved}
          />
        </Modal>
      )}

      {activeModal === 'adjust' && (
        <Modal name="Adjust Count / Reconciliation" onClose={() => setActiveModal(null)}>
          <RecordForm
            resource="inventory/adjustments"
            operation={
              operation('/api/v1/inventory/adjustments', 'POST') || {
                method: 'POST',
                permissions: ['inventory.adjustments.create'],
              }
            }
            path="/api/v1/inventory/adjustments"
            initial={{
              item_id: itemId,
              purpose: 'POSITIVE_ADJUSTMENT',
              transaction_date: new Date().toISOString().slice(0, 10),
            }}
            onClose={() => setActiveModal(null)}
            onSaved={handleActionSaved}
          />
        </Modal>
      )}

      {/* Header & Quick Action Buttons */}
      <div className="flex justify-between items-center flex-wrap gap-4 border-b pb-4">
        <div>
          <Link
            href="/workspace/inventory/items"
            className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground mb-1.5 transition"
          >
            <ArrowLeft size={13} />
            Back to Inventory Catalog
          </Link>
          <div className="flex items-center gap-3">
            <div className="p-3 bg-primary/10 text-primary rounded-xl shrink-0">
              <Package size={26} />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-xl font-bold text-slate-900">
                  {item.name || 'Inventory Item'}
                </h1>
                <span className="badge badge-active text-[11px] font-mono">
                  {item.item_number || item.sku || 'SKU-000'}
                </span>
                {category.name && (
                  <span className="badge text-[11px] bg-slate-100 text-slate-700">
                    {category.name}
                  </span>
                )}
              </div>
              <p className="text-xs text-muted-foreground mt-0.5 max-w-2xl">
                {item.description || 'No description recorded for this stock item.'}
              </p>
            </div>
          </div>
        </div>

        {/* Header Action Buttons */}
        <div className="flex items-center gap-2">
          {auth.can('inventory.manage') && (
            <>
              <button
                onClick={() => setActiveModal('pick')}
                className="px-3 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 shadow-sm transition"
                title="Report taking stock for project, asset, or employee usage"
              >
                <Minus size={14} />
                Take / Pick Stock (-)
              </button>

              <button
                onClick={() => setActiveModal('receive')}
                className="px-3 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 shadow-sm transition"
                title="Receive incoming shipment from vendor or purchase order"
              >
                <Plus size={14} />
                Receive Stock (+)
              </button>

              <button
                onClick={() => setActiveModal('adjust')}
                className="px-3 py-2 bg-slate-800 hover:bg-slate-900 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 shadow-sm transition"
                title="Reconcile stock count or report loss, damage, or quarantine"
              >
                <SlidersHorizontal size={14} />
                Adjust Count
              </button>
            </>
          )}
        </div>
      </div>

      {/* State Loading / Error Handler */}
      <State loading={overviewRes.loading} error={overviewRes.error} retry={overviewRes.reload}>
        {/* KPI Bento Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
          <div className="card p-4 space-y-1 bg-white border border-slate-200/80 rounded-xl shadow-xs">
            <span className="text-[11px] uppercase tracking-wider text-muted-foreground font-bold block">
              Quantity on Hand
            </span>
            <div className="flex items-baseline justify-between">
              <strong className="text-2xl font-bold text-slate-900">
                {Number(overview.quantity_on_hand || 0).toLocaleString()}
              </strong>
              <span className="text-xs text-muted-foreground font-semibold">{unit.symbol || 'units'}</span>
            </div>
            <span className="text-[11px] text-muted-foreground block">Across all warehouses</span>
          </div>

          <div className="card p-4 space-y-1 bg-white border border-slate-200/80 rounded-xl shadow-xs">
            <span className="text-[11px] uppercase tracking-wider text-muted-foreground font-bold block">
              Available Stock
            </span>
            <div className="flex items-baseline justify-between">
              <strong className="text-2xl font-bold text-blue-700">
                {Number(overview.quantity_available ?? overview.quantity_on_hand ?? 0).toLocaleString()}
              </strong>
              <Boxes size={18} className="text-blue-600" />
            </div>
            <span className="text-[11px] text-muted-foreground block">Unreserved & ready</span>
          </div>

          <div className="card p-4 space-y-1 bg-white border border-slate-200/80 rounded-xl shadow-xs">
            <span className="text-[11px] uppercase tracking-wider text-muted-foreground font-bold block">
              Total Stock Value
            </span>
            <div className="flex items-baseline justify-between">
              <strong className="text-2xl font-bold text-emerald-700">
                ${Number(overview.inventory_value || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}
              </strong>
              <DollarSign size={18} className="text-emerald-600" />
            </div>
            <span className="text-[11px] text-muted-foreground block">Total asset valuation</span>
          </div>

          <div className="card p-4 space-y-1 bg-white border border-slate-200/80 rounded-xl shadow-xs">
            <span className="text-[11px] uppercase tracking-wider text-muted-foreground font-bold block">
              Reorder Point
            </span>
            <div className="flex items-baseline justify-between">
              <strong className="text-2xl font-bold text-amber-700">
                {Number(overview.reorder_point || item.reorder_point || 0).toLocaleString()}
              </strong>
              <AlertTriangle size={18} className="text-amber-600" />
            </div>
            <span className="text-[11px] text-muted-foreground block">
              Min: {Number(overview.minimum_stock_level || item.minimum_stock_level || 0)}
            </span>
          </div>

          <div className="card p-4 space-y-1 bg-white border border-slate-200/80 rounded-xl shadow-xs col-span-2 lg:col-span-1">
            <span className="text-[11px] uppercase tracking-wider text-muted-foreground font-bold block">
              Avg Unit Cost
            </span>
            <div className="flex items-baseline justify-between">
              <strong className="text-2xl font-bold text-slate-900">
                ${Number(overview.average_unit_cost || item.standard_cost || 0).toFixed(2)}
              </strong>
              <Tag size={18} className="text-slate-500" />
            </div>
            <span className="text-[11px] text-muted-foreground block">Per {unit.name || 'unit'}</span>
          </div>
        </div>

        {/* Main Comparison Chart: Stock Level vs. Consumption Trend */}
        <div className="card p-5 bg-white border border-slate-200 rounded-xl shadow-xs space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b pb-3">
            <div>
              <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <TrendingUp size={18} className="text-primary" />
                Stock Level vs. Consumption Trend
              </h2>
              <p className="text-xs text-muted-foreground mt-0.5">
                Comparison of daily cumulative stock on hand vs. material issued / picked over time.
              </p>
            </div>

            {/* Timeframe Filter Buttons */}
            <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-lg self-start sm:self-auto">
              {(['7d', '30d', '90d', 'all'] as const).map((tf) => (
                <button
                  key={tf}
                  onClick={() => setTimeframe(tf)}
                  className={`px-2.5 py-1 text-xs font-medium rounded-md transition ${
                    timeframe === tf
                      ? 'bg-white text-slate-900 shadow-xs font-bold'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  {tf === '7d' ? '7 Days' : tf === '30d' ? '30 Days' : tf === '90d' ? '90 Days' : 'All Time'}
                </button>
              ))}
            </div>
          </div>

          <div className="h-[280px] w-full pt-2">
            {chartData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData} margin={{ top: 10, right: 30, left: 0, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                  <XAxis
                    dataKey="date"
                    tick={{ fontSize: 11, fill: '#64748B' }}
                    axisLine={{ stroke: '#CBD5E1' }}
                    tickLine={false}
                  />
                  <YAxis
                    tick={{ fontSize: 11, fill: '#64748B' }}
                    axisLine={{ stroke: '#CBD5E1' }}
                    tickLine={false}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#FFFFFF',
                      borderColor: '#CBD5E1',
                      borderRadius: '8px',
                      boxShadow: '0 4px 12px rgba(0,0,0,0.08)',
                      fontSize: '12px',
                    }}
                  />
                  <Legend wrapperStyle={{ paddingTop: '10px', fontSize: '12px' }} />
                  <Line
                    type="monotone"
                    dataKey="Stock Level"
                    stroke="#2563EB"
                    strokeWidth={2.5}
                    dot={{ r: 3, fill: '#2563EB' }}
                    activeDot={{ r: 6 }}
                  />
                  <Line
                    type="monotone"
                    dataKey="Consumption (Picked)"
                    stroke="#D97706"
                    strokeWidth={2.5}
                    dot={{ r: 3, fill: '#D97706' }}
                    activeDot={{ r: 6 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-xs text-muted-foreground">
                No activity data available for the selected timeframe.
              </div>
            )}
          </div>
        </div>

        {/* Tabbed Detail Sections */}
        <div className="space-y-4">
          <div className="flex border-b gap-4">
            <button
              onClick={() => setTab('overview')}
              className={`pb-2.5 text-xs font-semibold border-b-2 transition flex items-center gap-1.5 ${
                tab === 'overview'
                  ? 'border-primary text-primary'
                  : 'border-transparent text-muted-foreground hover:text-foreground'
              }`}
            >
              <Package size={14} />
              Stock Overview & Details
            </button>

            <button
              onClick={() => setTab('stores')}
              className={`pb-2.5 text-xs font-semibold border-b-2 transition flex items-center gap-1.5 ${
                tab === 'stores'
                  ? 'border-primary text-primary'
                  : 'border-transparent text-muted-foreground hover:text-foreground'
              }`}
            >
              <Building2 size={14} />
              Store & Bin Balances ({stockList.length})
            </button>

            <button
              onClick={() => setTab('history')}
              className={`pb-2.5 text-xs font-semibold border-b-2 transition flex items-center gap-1.5 ${
                tab === 'history'
                  ? 'border-primary text-primary'
                  : 'border-transparent text-muted-foreground hover:text-foreground'
              }`}
            >
              <History size={14} />
              Recent Movement Ledger ({transactions.length})
            </button>

            <button
              onClick={() => setTab('suppliers')}
              className={`pb-2.5 text-xs font-semibold border-b-2 transition flex items-center gap-1.5 ${
                tab === 'suppliers'
                  ? 'border-primary text-primary'
                  : 'border-transparent text-muted-foreground hover:text-foreground'
              }`}
            >
              <Truck size={14} />
              Supplier Options ({suppliers.length})
            </button>
          </div>

          {/* TAB 1: Stock Overview & Details */}
          {tab === 'overview' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="card p-5 bg-white border border-slate-200 rounded-xl space-y-3">
                <h3 className="text-sm font-bold text-slate-900 border-b pb-2">Catalog Specification</h3>
                <Facts
                  data={{
                    'Item Number / SKU': item.item_number || item.sku || 'N/A',
                    'Item Category': category.name || 'Uncategorized',
                    'Base Unit of Measure': `${unit.name || 'Unit'} (${unit.symbol || 'unit'})`,
                    'Tracking Method': item.tracking_type || 'QUANTITY',
                    'Standard Unit Cost': `$${Number(overview.average_unit_cost || item.standard_cost || 0).toFixed(2)}`,
                    'Minimum Stock Level': Number(item.minimum_stock_level || 0),
                    'Maximum Stock Level': Number(item.maximum_stock_level || 0),
                    'Reorder Point Threshold': Number(item.reorder_point || 0),
                    'Default Bin Location': item.default_bin_code || 'N/A',
                    'Item Status': item.is_active ? 'Active' : 'Inactive',
                  }}
                />
              </div>

              <div className="card p-5 bg-white border border-slate-200 rounded-xl space-y-3">
                <h3 className="text-sm font-bold text-slate-900 border-b pb-2">Inventory Stocking Status</h3>
                <div className="space-y-3 text-xs">
                  <div className="flex justify-between items-center p-3 bg-slate-50 rounded-lg">
                    <span className="font-medium text-slate-700">Stock Availability Status:</span>
                    <span
                      className={`badge font-semibold ${
                        Number(overview.quantity_on_hand || 0) <= 0
                          ? 'bg-red-100 text-red-800'
                          : Number(overview.quantity_on_hand || 0) <= Number(overview.minimum_stock_level || 0)
                          ? 'bg-amber-100 text-amber-800'
                          : 'bg-emerald-100 text-emerald-800'
                      }`}
                    >
                      {Number(overview.quantity_on_hand || 0) <= 0
                        ? 'OUT OF STOCK'
                        : Number(overview.quantity_on_hand || 0) <= Number(overview.minimum_stock_level || 0)
                        ? 'LOW STOCK'
                        : 'HEALTHY STOCK'}
                    </span>
                  </div>

                  <div className="p-3 border rounded-lg space-y-2">
                    <span className="font-semibold text-slate-900 block">Stock Actions Quick Guide:</span>
                    <p className="text-muted-foreground">
                      Use <strong>Take / Pick Stock (-)</strong> to issue tools, parts, or materials for project or maintenance operations.
                    </p>
                    <p className="text-muted-foreground">
                      Use <strong>Receive Stock (+)</strong> when new inventory shipments arrive from vendor purchase orders.
                    </p>
                    <p className="text-muted-foreground">
                      Use <strong>Adjust Count</strong> to record physical count reconciliations, damaged goods, or quarantine holds.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: Store & Bin Balances */}
          {tab === 'stores' && (
            <div className="card p-5 bg-white border border-slate-200 rounded-xl space-y-3">
              <h3 className="text-sm font-bold text-slate-900">Storage Facility Balances</h3>
              {stockList.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="w-full text-xs text-left">
                    <thead className="bg-slate-50 text-slate-700 font-semibold border-b">
                      <tr>
                        <th className="p-3">Store Location</th>
                        <th className="p-3">Bin Location</th>
                        <th className="p-3 text-right">Quantity on Hand</th>
                        <th className="p-3 text-right">Available Qty</th>
                        <th className="p-3 text-right">Quarantined Qty</th>
                        <th className="p-3 text-right">Stock Valuation</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {stockList.map((st: any, idx: number) => (
                        <tr key={st.id || idx} className="hover:bg-slate-50">
                          <td className="p-3 font-semibold text-slate-900">
                            {st.store_name || st.store?.name || 'Store Facility'}
                          </td>
                          <td className="p-3 font-mono text-muted-foreground">
                            {st.bin_code || st.bin?.bin_code || 'MAIN-BIN'}
                          </td>
                          <td className="p-3 text-right font-bold text-slate-900">
                            {Number(st.quantity_on_hand || 0).toLocaleString()} {unit.symbol || ''}
                          </td>
                          <td className="p-3 text-right text-blue-700 font-semibold">
                            {Number(st.quantity_available ?? st.quantity_on_hand ?? 0).toLocaleString()}
                          </td>
                          <td className="p-3 text-right text-amber-700">
                            {Number(st.quantity_quarantined || 0).toLocaleString()}
                          </td>
                          <td className="p-3 text-right text-emerald-700 font-semibold">
                            ${Number(st.inventory_value || 0).toFixed(2)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="p-6 text-center text-xs text-muted-foreground border rounded-lg bg-slate-50">
                  No specific store balance records found for this item.
                </div>
              )}
            </div>
          )}

          {/* TAB 3: Recent Movement Ledger */}
          {tab === 'history' && (
            <div className="card p-5 bg-white border border-slate-200 rounded-xl space-y-3">
              <h3 className="text-sm font-bold text-slate-900">Recent Inventory Transaction Ledger</h3>
              {transactions.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="w-full text-xs text-left">
                    <thead className="bg-slate-50 text-slate-700 font-semibold border-b">
                      <tr>
                        <th className="p-3">Date</th>
                        <th className="p-3">Transaction Type</th>
                        <th className="p-3">From / To Store</th>
                        <th className="p-3 text-right">Quantity</th>
                        <th className="p-3 text-right">Unit Cost</th>
                        <th className="p-3">Ref Number</th>
                        <th className="p-3">Notes / Purpose</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {transactions.map((txn: any, idx: number) => {
                        const isIssue = String(txn.transaction_type || '').includes('ISSUE');
                        const isReceipt = String(txn.transaction_type || '').includes('RECEIPT');
                        return (
                          <tr key={txn.id || idx} className="hover:bg-slate-50">
                            <td className="p-3 text-muted-foreground">
                              {txn.created_at || txn.transaction_date
                                ? new Date(txn.created_at || txn.transaction_date).toLocaleDateString('en-GB', {
                                    day: '2-digit',
                                    month: 'short',
                                    year: 'numeric',
                                  })
                                : '—'}
                            </td>
                            <td className="p-3 font-semibold">
                              <span
                                className={`badge text-[10px] ${
                                  isReceipt
                                    ? 'bg-emerald-100 text-emerald-800'
                                    : isIssue
                                    ? 'bg-amber-100 text-amber-800'
                                    : 'bg-slate-100 text-slate-800'
                                }`}
                              >
                                {txn.transaction_type?.replace(/_/g, ' ') || 'MOVEMENT'}
                              </span>
                            </td>
                            <td className="p-3 text-slate-800">
                              {txn.from_store_name || txn.to_store_name || 'Main Warehouse'}
                            </td>
                            <td
                              className={`p-3 text-right font-bold ${
                                isReceipt ? 'text-emerald-700' : isIssue ? 'text-amber-700' : 'text-slate-900'
                              }`}
                            >
                              {isIssue ? '-' : isReceipt ? '+' : ''}
                              {Number(txn.quantity || 0).toLocaleString()} {unit.symbol || ''}
                            </td>
                            <td className="p-3 text-right text-slate-700">
                              ${Number(txn.unit_cost || 0).toFixed(2)}
                            </td>
                            <td className="p-3 font-mono text-muted-foreground">
                              {txn.reference_number || '—'}
                            </td>
                            <td className="p-3 text-muted-foreground truncate max-w-xs">
                              {txn.notes || txn.purpose || '—'}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="p-6 text-center text-xs text-muted-foreground border rounded-lg bg-slate-50">
                  No recent transaction records for this item.
                </div>
              )}
            </div>
          )}

          {/* TAB 4: Supplier Options */}
          {tab === 'suppliers' && (
            <div className="card p-5 bg-white border border-slate-200 rounded-xl space-y-3">
              <h3 className="text-sm font-bold text-slate-900">Approved Vendor & Supplier Catalog</h3>
              {suppliers.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {suppliers.map((sup: any, idx: number) => (
                    <div key={sup.id || idx} className="p-4 border rounded-xl space-y-2 bg-slate-50/50">
                      <div className="flex justify-between items-center">
                        <strong className="text-sm text-slate-900 font-bold">
                          {sup.supplier_name || sup.supplier?.name || 'Vendor Supplier'}
                        </strong>
                        {sup.is_preferred && (
                          <span className="badge bg-emerald-100 text-emerald-800 text-[10px] font-bold">
                            PREFERRED
                          </span>
                        )}
                      </div>
                      <div className="text-xs text-muted-foreground space-y-1">
                        <div>Vendor SKU / Part #: <span className="font-mono text-slate-900">{sup.supplier_part_number || 'N/A'}</span></div>
                        <div>Contract Purchase Price: <span className="font-bold text-emerald-700">${Number(sup.unit_price || 0).toFixed(2)}</span></div>
                        <div>Lead Time: <span className="font-medium text-slate-800">{sup.lead_time_days || 7} Days</span></div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="p-6 text-center text-xs text-muted-foreground border rounded-lg bg-slate-50">
                  No specific supplier pricing records mapped to this item.
                </div>
              )}
            </div>
          )}
        </div>
      </State>
    </div>
  );
}
