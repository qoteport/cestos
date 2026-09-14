'use client';
import React, { useState } from 'react';
import { BookOpen, ArrowRightLeft, Sliders, TrendingUp, AlertTriangle, PackageCheck, Layers,  } from 'lucide-react';
import Icon from '@/components/ui/AppIcon';


export default function SystemManual() {
  const [activeSection, setActiveSection] = useState<
    'overview' | 'grn' | 'issues' | 'adjustments' | 'reorder' | 'valuation'
  >('overview');

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 text-white p-6 rounded-2xl shadow-sm border border-slate-800">
        <div className="flex items-center gap-3 mb-2">
          <div className="p-2.5 bg-primary/20 text-primary-foreground rounded-xl border border-primary/30">
            <BookOpen className="w-6 h-6 text-blue-400" />
          </div>
          <div>
            <h2 className="text-xl font-bold">Cestos Operations & Inventory Manual</h2>
            <p className="text-xs text-slate-300">
              Official guide to managing stock receipts, goods issues, count reconciliations, reorder thresholds, and valuation.
            </p>
          </div>
        </div>
      </div>

      {/* Manual Quick Navigation Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        {[
          { id: 'overview', title: 'System Overview', icon: Layers, desc: 'Architecture & stock models' },
          { id: 'grn', title: 'Stock Receipts (GRN)', icon: PackageCheck, desc: 'Vendor intake & PO receiving' },
          { id: 'issues', title: 'Goods Issues (GIN)', icon: ArrowRightLeft, desc: 'Picking & project consumption' },
          { id: 'adjustments', title: 'Stock Adjustments', icon: Sliders, desc: 'Counts, damage & quarantine' },
          { id: 'reorder', title: 'Reorder Points', icon: AlertTriangle, desc: 'Min/Max & automated alerts' },
          { id: 'valuation', title: 'Stock Valuation', icon: TrendingUp, desc: 'FIFO & average unit costs' },
        ].map((item) => {
          const Icon = item.icon;
          const isActive = activeSection === item.id;
          return (
            <button
              key={item.id}
              onClick={() => setActiveSection(item.id as any)}
              className={`p-3.5 rounded-xl border text-left transition flex flex-col justify-between space-y-2 ${
                isActive
                  ? 'bg-primary/5 border-primary text-primary shadow-xs font-semibold'
                  : 'bg-white border-slate-200 text-slate-700 hover:border-slate-300 hover:bg-slate-50'
              }`}
            >
              <div className="flex items-center justify-between">
                <Icon className={`w-5 h-5 ${isActive ? 'text-primary' : 'text-slate-500'}`} />
                {isActive && <span className="w-1.5 h-1.5 rounded-full bg-primary" />}
              </div>
              <div>
                <span className="text-xs font-bold block">{item.title}</span>
                <span className="text-[10px] text-muted-foreground block line-clamp-1">{item.desc}</span>
              </div>
            </button>
          );
        })}
      </div>

      {/* Content Body */}
      <div className="card p-6 bg-white border border-slate-200 rounded-xl space-y-6">
        {/* SECTION 1: SYSTEM OVERVIEW */}
        {activeSection === 'overview' && (
          <div className="space-y-4">
            <div className="border-b pb-3">
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <Layers className="w-5 h-5 text-primary" />
                1. Cestos Inventory Architecture & Concepts
              </h3>
              <p className="text-xs text-muted-foreground mt-1">
                How Cestos unifies multi-store stock visibility across warehouses, project sites, and equipment fleets.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
              <div className="p-4 border rounded-xl space-y-2 bg-slate-50">
                <h4 className="font-bold text-slate-900 text-sm">Key Terminology</h4>
                <ul className="space-y-1.5 text-muted-foreground list-disc pl-4">
                  <li><strong>Quantity on Hand (QOH):</strong> Total physical count residing in store bins.</li>
                  <li><strong>Quantity Available:</strong> QOH minus active reservations for upcoming projects.</li>
                  <li><strong>Reorder Point (ROP):</strong> Calculated minimum stock level triggering reorder warnings.</li>
                  <li><strong>Storage Bin:</strong> Specific shelf/location code within a warehouse facility (e.g. BAY-01-A).</li>
                </ul>
              </div>

              <div className="p-4 border rounded-xl space-y-2 bg-slate-50">
                <h4 className="font-bold text-slate-900 text-sm">Real-time Data Flow</h4>
                <p className="text-muted-foreground">
                  Every material movement (Receipts, Issues, Transfers, Adjustments) writes to an immutable transaction ledger. Stock balances, valuations, and dashboard KPIs update in real time.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* SECTION 2: STOCK RECEIPTS (GRN) */}
        {activeSection === 'grn' && (
          <div className="space-y-4">
            <div className="border-b pb-3">
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <PackageCheck className="w-5 h-5 text-emerald-600" />
                2. Goods Receipt Notes (GRN) & Receiving Inventory
              </h3>
              <p className="text-xs text-muted-foreground mt-1">
                How to receive vendor purchase orders and record incoming stock.
              </p>
            </div>

            <div className="space-y-3 text-xs text-slate-700">
              <div className="p-4 border border-emerald-100 bg-emerald-50/50 rounded-xl space-y-2">
                <h4 className="font-bold text-emerald-900 text-sm">When to use "Receive Stock (+)"</h4>
                <p>
                  Use this action whenever new material arrives from vendors, purchase orders, or external suppliers. Recording a Goods Receipt increases store stock levels and calculates moving average costs.
                </p>
              </div>

              <div className="space-y-2">
                <h4 className="font-bold text-slate-900">Step-by-Step Receiving Process:</h4>
                <ol className="list-decimal pl-5 space-y-1.5 text-muted-foreground">
                  <li>Navigate to <strong>Inventory Overview</strong> or an individual <strong>Item Detail Page</strong>.</li>
                  <li>Click the green <strong>Receive Stock (+)</strong> button.</li>
                  <li>Select the target <strong>Store Facility</strong> and optional <strong>Storage Bin</strong>.</li>
                  <li>Enter the received <strong>Quantity</strong> and <strong>Unit Cost</strong>.</li>
                  <li>Attach supporting vendor delivery notes, PO numbers, or invoices if available.</li>
                  <li>Click <strong>Save Record</strong> to commit the intake.</li>
                </ol>
              </div>
            </div>
          </div>
        )}

        {/* SECTION 3: GOODS ISSUES & PICKING */}
        {activeSection === 'issues' && (
          <div className="space-y-4">
            <div className="border-b pb-3">
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <ArrowRightLeft className="w-5 h-5 text-amber-600" />
                3. Goods Issues (GIN) & Picking Items
              </h3>
              <p className="text-xs text-muted-foreground mt-1">
                Reporting stock taken out of inventory for projects, maintenance, or employee use.
              </p>
            </div>

            <div className="space-y-3 text-xs text-slate-700">
              <div className="p-4 border border-amber-100 bg-amber-50/50 rounded-xl space-y-2">
                <h4 className="font-bold text-amber-900 text-sm">Difference: Pick / Issue vs. Stock Adjustment</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-1">
                  <div>
                    <strong>Take / Pick Stock (Goods Issue):</strong>
                    <p className="text-muted-foreground mt-0.5">
                      Used when items are intentionally issued for an active Project, Heavy Machinery Maintenance, or Personnel use. This attributes financial cost directly to the project account.
                    </p>
                  </div>
                  <div>
                    <strong>Stock Adjustment:</strong>
                    <p className="text-muted-foreground mt-0.5">
                      Used during physical audits to correct miscounts, record damaged or lost goods, or move items to quarantine.
                    </p>
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <h4 className="font-bold text-slate-900">How to Issue / Pick Items:</h4>
                <ol className="list-decimal pl-5 space-y-1.5 text-muted-foreground">
                  <li>Click <strong>Take / Pick Stock (-)</strong> from the Command Bar or Item Workspace.</li>
                  <li>Select the source <strong>Store Location</strong> where the item was taken.</li>
                  <li>Specify the <strong>Project</strong> or <strong>Asset / Equipment</strong> consuming the material.</li>
                  <li>Enter the quantity issued and click <strong>Save Record</strong>.</li>
                </ol>
              </div>
            </div>
          </div>
        )}

        {/* SECTION 4: STOCK ADJUSTMENTS */}
        {activeSection === 'adjustments' && (
          <div className="space-y-4">
            <div className="border-b pb-3">
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <Sliders className="w-5 h-5 text-slate-800" />
                4. Stock Adjustments & Physical Count Reconciliation
              </h3>
              <p className="text-xs text-muted-foreground mt-1">
                Reconciling physical audit counts, damage reports, and quarantine holds.
              </p>
            </div>

            <div className="space-y-3 text-xs text-slate-700">
              <p className="text-muted-foreground">
                Stock adjustments reconcile discrepancies between recorded database balances and actual shelf counts. Adjustments require specifying a valid reason code for audit compliance.
              </p>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div className="p-3 border rounded-lg bg-slate-50 space-y-1">
                  <span className="font-bold text-slate-900 block">Count Variance</span>
                  <span className="text-muted-foreground block text-[11px]">
                    Positive or negative variance adjustments following cycle counts or annual stocktakes.
                  </span>
                </div>

                <div className="p-3 border rounded-lg bg-slate-50 space-y-1">
                  <span className="font-bold text-slate-900 block">Damage & Loss</span>
                  <span className="text-muted-foreground block text-[11px]">
                    Writing off items damaged during transport, expired materials, or stolen stock.
                  </span>
                </div>

                <div className="p-3 border rounded-lg bg-slate-50 space-y-1">
                  <span className="font-bold text-slate-900 block">Quarantine</span>
                  <span className="text-muted-foreground block text-[11px]">
                    Isolating suspect parts or unverified batches prior to quality assurance sign-off.
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* SECTION 5: REORDER POINTS */}
        {activeSection === 'reorder' && (
          <div className="space-y-4">
            <div className="border-b pb-3">
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-amber-600" />
                5. Reorder Point Thresholds & Critical Alerts
              </h3>
              <p className="text-xs text-muted-foreground mt-1">
                Managing minimum stock levels, reorder points, and automated replenishment alerts.
              </p>
            </div>

            <div className="space-y-3 text-xs text-slate-700">
              <p className="text-muted-foreground">
                Cestos continuously monitors available stock against designated minimum and safety stock levels. Items falling below reorder thresholds automatically surface in the <strong>Action Required</strong> center.
              </p>

              <div className="p-4 border rounded-xl bg-amber-50/50 border-amber-200 space-y-2">
                <h4 className="font-bold text-amber-900 text-sm">Status Classifications:</h4>
                <ul className="space-y-1 text-amber-800 list-disc pl-4">
                  <li><strong>HEALTHY:</strong> Quantity available is safely above the reorder point.</li>
                  <li><strong>LOW STOCK:</strong> Stock level has reached or dropped below the reorder point threshold.</li>
                  <li><strong>CRITICAL / OUT OF STOCK:</strong> Quantity on hand is 0 or below critical safety buffer.</li>
                </ul>
              </div>
            </div>
          </div>
        )}

        {/* SECTION 6: STOCK VALUATION */}
        {activeSection === 'valuation' && (
          <div className="space-y-4">
            <div className="border-b pb-3">
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-emerald-600" />
                6. Inventory Stock Valuation & Financial Audit
              </h3>
              <p className="text-xs text-muted-foreground mt-1">
                Understanding stock asset valuation, weighted average costs, and audit trails.
              </p>
            </div>

            <div className="space-y-3 text-xs text-slate-700">
              <p className="text-muted-foreground">
                Total inventory value is calculated as the sum of all store balances multiplied by their average unit cost ($). The <strong>Inventory Value by Category</strong> chart breaks down financial equity across lubricants, spares, safety gear, and consumables.
              </p>

              <div className="p-4 border rounded-xl bg-slate-50 space-y-2">
                <h4 className="font-bold text-slate-900">Audit Trail Compliance</h4>
                <p className="text-muted-foreground">
                  Every inventory transaction records the timestamp, acting user account, store location, project reference, and resulting quantity variance for full enterprise auditing.
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
