'use client';

import React, { useState, useEffect } from 'react';
import { 
  ShoppingBag, Plus, RefreshCw, CheckCircle2, Clock, Truck, PackageCheck, AlertCircle, FileText
} from 'lucide-react';
import { apiFetch, PurchaseOrderRead, receivePurchaseOrderGoods } from '@/lib/api';
import { Modal, rows } from './DataUI';

export default function ProcurementWorkspace() {
  const [loading, setLoading] = useState(true);
  const [orders, setOrders] = useState<PurchaseOrderRead[]>([]);
  const [suppliers, setSuppliers] = useState<any[]>([]);
  const [projects, setProjects] = useState<any[]>([]);
  const [version, setVersion] = useState(0);

  // New PO Modal
  const [showAddPo, setShowAddPo] = useState(false);
  const [newPo, setNewPo] = useState({
    supplier_id: '',
    project_id: '',
    currency: 'USD',
    notes: '',
    items: [
      { description: 'Drill Bit 7-1/4 Blade', quantity_ordered: 10, unit_price: 450 },
      { description: 'Hydraulic Hose 20ft', quantity_ordered: 5, unit_price: 120 },
    ],
  });

  // Goods Receipt Modal
  const [receivingPo, setReceivingPo] = useState<PurchaseOrderRead | null>(null);
  const [receiptQuantities, setReceiptQuantities] = useState<Record<string, number>>({});

  const reload = () => setVersion((v) => v + 1);

  useEffect(() => {
    let active = true;
    setLoading(true);

    Promise.all([
      apiFetch<PurchaseOrderRead[]>('/api/v1/procurement/purchase-orders').catch(() => []),
      apiFetch<any>('/api/v1/fuel-suppliers').catch(() => []),
      apiFetch<any>('/api/v1/projects?page_size=100').catch(() => ({ items: [] })),
    ]).then(([poRes, suppRes, projRes]) => {
      if (!active) return;
      setOrders(rows(poRes) as PurchaseOrderRead[]);
      setSuppliers(rows(suppRes));
      setProjects(rows(projRes));
      setLoading(false);
    });

    return () => {
      active = false;
    };
  }, [version]);

  const handleCreatePo = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await apiFetch('/api/v1/procurement/purchase-orders', {
        method: 'POST',
        body: JSON.stringify(newPo),
      });
      setShowAddPo(false);
      reload();
    } catch (err: any) {
      alert(err.message || 'Failed to create purchase order');
    }
  };

  const handleReceiveGoods = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!receivingPo) return;
    try {
      await receivePurchaseOrderGoods(receivingPo.id, receiptQuantities);
      setReceivingPo(null);
      reload();
    } catch (err: any) {
      alert(err.message || 'Failed to receive goods');
    }
  };

  const openReceiveModal = (po: PurchaseOrderRead) => {
    setReceivingPo(po);
    const initial: Record<string, number> = {};
    (po.items || []).forEach((item: any) => {
      initial[item.id] = item.quantity_ordered - (item.quantity_received || 0);
    });
    setReceiptQuantities(initial);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b pb-4">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <ShoppingBag className="h-6 w-6 text-primary" />
            Procurement & Purchase Orders
          </h1>
          <p className="text-sm text-muted-foreground">
            Purchase orders, vendor line items, goods receipt notes (GRN), and inventory receiving
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={reload}
            className="flex items-center gap-2 px-3 py-1.5 rounded border text-sm font-medium hover:bg-muted"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
          <button
            onClick={() => setShowAddPo(true)}
            className="flex items-center gap-2 px-3 py-1.5 bg-primary text-primary-foreground rounded text-sm font-medium hover:bg-primary/90"
          >
            <Plus className="h-4 w-4" />
            New Purchase Order
          </button>
        </div>
      </div>

      {/* Orders Grid */}
      <div className="border rounded-xl bg-card overflow-hidden">
        <table className="w-full text-sm text-left">
          <thead className="bg-muted/50 text-xs font-semibold uppercase text-muted-foreground">
            <tr>
              <th className="px-4 py-3">PO #</th>
              <th className="px-4 py-3">Line Items</th>
              <th className="px-4 py-3">Total Amount</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {orders.map((po) => (
              <tr key={po.id} className="hover:bg-muted/30">
                <td className="px-4 py-3 font-mono font-medium">{po.po_number}</td>
                <td className="px-4 py-3 text-xs text-muted-foreground">
                  {(po.items || []).map((i: any) => `${i.description} (${i.quantity_ordered})`).join(', ') || 'No line items'}
                </td>
                <td className="px-4 py-3 font-bold">${Number(po.total_amount).toLocaleString()} {po.currency}</td>
                <td className="px-4 py-3">
                  <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                    po.status === 'RECEIVED' ? 'bg-emerald-500/10 text-emerald-600' :
                    po.status === 'PARTIALLY_RECEIVED' ? 'bg-blue-500/10 text-blue-600' : 'bg-amber-500/10 text-amber-600'
                  }`}>
                    {po.status}
                  </span>
                </td>
                <td className="px-4 py-3 text-right">
                  {po.status !== 'RECEIVED' && (
                    <button
                      onClick={() => openReceiveModal(po)}
                      className="px-3 py-1 text-xs bg-primary text-primary-foreground rounded font-medium hover:bg-primary/90 flex items-center gap-1 ml-auto"
                    >
                      <PackageCheck className="h-3.5 w-3.5" />
                      Receive Goods
                    </button>
                  )}
                </td>
              </tr>
            ))}
            {orders.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-muted-foreground">
                  No purchase orders created yet. Click "New Purchase Order" to issue vendor POs.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* NEW PO MODAL */}
      {showAddPo && (
        <Modal title="Create Purchase Order" onClose={() => setShowAddPo(false)}>
          <form onSubmit={handleCreatePo} className="space-y-4">
            <div>
              <label className="block text-xs font-medium mb-1">Supplier</label>
              <select
                required
                value={newPo.supplier_id}
                onChange={(e) => setNewPo({ ...newPo, supplier_id: e.target.value })}
                className="w-full text-sm border rounded p-2 bg-background"
              >
                <option value="">Select Supplier...</option>
                {suppliers.map((s) => (
                  <option key={s.id} value={s.id}>{s.name}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium mb-1">Project</label>
              <select
                value={newPo.project_id}
                onChange={(e) => setNewPo({ ...newPo, project_id: e.target.value })}
                className="w-full text-sm border rounded p-2 bg-background"
              >
                <option value="">Select Project...</option>
                {projects.map((p) => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </select>
            </div>

            {/* Line Items */}
            <div className="space-y-2 border-t pt-2">
              <h4 className="text-xs font-bold uppercase text-muted-foreground">PO Line Items</h4>
              {newPo.items.map((item, idx) => (
                <div key={idx} className="grid grid-cols-3 gap-2 text-xs">
                  <input
                    type="text"
                    required
                    placeholder="Description"
                    value={item.description}
                    onChange={(e) => {
                      const copy = [...newPo.items];
                      copy[idx].description = e.target.value;
                      setNewPo({ ...newPo, items: copy });
                    }}
                    className="border rounded p-1.5 bg-background"
                  />
                  <input
                    type="number"
                    required
                    placeholder="Qty"
                    value={item.quantity_ordered}
                    onChange={(e) => {
                      const copy = [...newPo.items];
                      copy[idx].quantity_ordered = Number(e.target.value);
                      setNewPo({ ...newPo, items: copy });
                    }}
                    className="border rounded p-1.5 bg-background"
                  />
                  <input
                    type="number"
                    required
                    placeholder="Unit Price"
                    value={item.unit_price}
                    onChange={(e) => {
                      const copy = [...newPo.items];
                      copy[idx].unit_price = Number(e.target.value);
                      setNewPo({ ...newPo, items: copy });
                    }}
                    className="border rounded p-1.5 bg-background"
                  />
                </div>
              ))}
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowAddPo(false)}
                className="px-4 py-2 text-sm border rounded hover:bg-muted"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-2 text-sm bg-primary text-primary-foreground rounded font-medium hover:bg-primary/90"
              >
                Submit Purchase Order
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* GOODS RECEIPT MODAL */}
      {receivingPo && (
        <Modal title={`Goods Receipt Note - ${receivingPo.po_number}`} onClose={() => setReceivingPo(null)}>
          <form onSubmit={handleReceiveGoods} className="space-y-4">
            <p className="text-xs text-muted-foreground">Record quantities received from vendor against PO line items.</p>
            <div className="space-y-3">
              {(receivingPo.items || []).map((item: any) => (
                <div key={item.id} className="p-3 border rounded-lg bg-card space-y-1">
                  <div className="flex items-center justify-between text-xs font-semibold">
                    <span>{item.description}</span>
                    <span className="text-muted-foreground">Ordered: {item.quantity_ordered} | Received: {item.quantity_received || 0}</span>
                  </div>
                  <div className="flex items-center gap-2 pt-1">
                    <label className="text-xs font-medium">New Quantity Received:</label>
                    <input
                      type="number"
                      step="0.1"
                      min="0"
                      value={receiptQuantities[item.id] || 0}
                      onChange={(e) => setReceiptQuantities({ ...receiptQuantities, [item.id]: Number(e.target.value) })}
                      className="border rounded p-1 text-sm bg-background w-24"
                    />
                  </div>
                </div>
              ))}
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setReceivingPo(null)}
                className="px-4 py-2 text-sm border rounded hover:bg-muted"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-2 text-sm bg-primary text-primary-foreground rounded font-medium hover:bg-primary/90"
              >
                Confirm Goods Receipt
              </button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}
