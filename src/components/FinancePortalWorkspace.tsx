'use client';

import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useRouter } from 'next/navigation';
import {
  DollarSign,
  User,
  FileText,
  ShoppingCart,
  Briefcase,
  RefreshCw,
  LogOut,
  Menu,
  X,
  AlertTriangle,
  Fuel,
  TrendingUp,
  Paperclip,
  Download,
  Pencil,
  Plus,
  Clock,
  Calendar,
  ChevronRight,
  Package,
  Building2,
  Search,
  Eye,
  CheckCircle2,
  Trash2,
  ShoppingBag,
  Truck,
  PackageCheck,
  Mail,
  Bell,
  BarChart2,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import {
  ResponsiveContainer,
  ComposedChart,
  BarChart,
  Bar,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Legend,
} from 'recharts';
import { useAuth } from '@/components/AuthProvider';
import { apiFetch, apiFetchBlob, downloadBlob, receivePurchaseOrderGoods } from '@/lib/api';
import { openUniversalFileViewer } from '@/lib/fileViewer';
import OperationalExpensesWorkspace, { FALLBACK_CLAIMS } from './OperationalExpensesWorkspace';
import OperationalExpenseSubmissionModal from './OperationalExpenseSubmissionModal';
import NotificationWorkspace from './NotificationWorkspace';
import useNotificationCount from './useNotificationCount';
import UniversalFileViewerModal from './UniversalFileViewerModal';
import { PurchaseOrderCategoryField, purchaseOrderCategoryLabel } from './PurchaseOrderCategoryField';
import PurchaseOrderCategoryChart from './PurchaseOrderCategoryChart';
import { useOperationalDataSync } from '@/lib/operationalDataSync';

// ─── Types ────────────────────────────────────────────────────────────────────

type FinanceTab = 'EXPENSES' | 'OPERATIONAL_EXPENSES' | 'INVOICES' | 'PURCHASE_ORDERS' | 'VENDORS' | 'FUEL' | 'PROJECTS' | 'NOTIFICATIONS';

interface ProjectOption {
  id: string;
  name: string;
  code?: string;
  status?: string;
  budget?: number;
  currency?: string;
}

interface PurchaseOrderItem {
  id?: string;
  item_name?: string;
  description: string;
  quantity_ordered: number;
  unit_price: number;
  quantity_received?: number;
}

interface VendorLedgerEntry {
  id: string;
  date: string;
  invoiceNumber: string;
  description: string;
  amountPaid: number;
  balance: number;
  currency: string;
  expense?: any;
  purchaseOrder?: any;
  payment?: any;
}

interface VendorAccount {
  key: string;
  name: string;
  currency: string;
  amountOwed: number;
  amountPaid: number;
  balance: number;
  entries: VendorLedgerEntry[];
}

// ─── Inline Banner ────────────────────────────────────────────────────────────

function Banner({ message, type, onClose }: { message: string; type: 'error' | 'success' | 'info'; onClose: () => void }) {
  const colors =
    type === 'error'
      ? 'bg-red-50 border-red-300 text-red-800 dark:bg-red-950/40 dark:border-red-800 dark:text-red-300'
      : type === 'success'
      ? 'bg-violet-50 border-violet-300 text-violet-800 dark:bg-violet-950/40 dark:border-violet-800 dark:text-violet-300'
      : 'bg-blue-50 border-blue-300 text-blue-800 dark:bg-blue-950/40 dark:border-blue-800 dark:text-blue-300';
  return (
    <div role="alert" className={`flex items-start gap-3 px-4 py-3 rounded-lg border text-sm font-medium ${colors}`}>
      <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
      <span className="flex-1">{message}</span>
      <button onClick={onClose} className="shrink-0 hover:opacity-70"><X className="h-4 w-4" /></button>
    </div>
  );
}

// ─── Status Badge ─────────────────────────────────────────────────────────────

function StatusBadge({ status }: { status: string }) {
  const s = (status || '').toUpperCase();
  const map: Record<string, string> = {
    PAID: 'bg-violet-100 text-violet-800 dark:bg-violet-950/50 dark:text-violet-300',
    APPROVED: 'bg-violet-100 text-violet-800 dark:bg-violet-950/50 dark:text-violet-300',
    WAITING_APPROVAL: 'bg-amber-100 text-amber-800 dark:bg-amber-950/50 dark:text-amber-300',
    ACTIVE: 'bg-violet-100 text-violet-800 dark:bg-violet-950/50 dark:text-violet-300',
    PENDING: 'bg-amber-100 text-amber-800 dark:bg-amber-950/50 dark:text-amber-300',
    DRAFT: 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-300',
    OVERDUE: 'bg-red-100 text-red-800 dark:bg-red-950/50 dark:text-red-300',
    CANCELLED: 'bg-red-100 text-red-800 dark:bg-red-950/50 dark:text-red-300',
    COMPLETED: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-300',
    RECEIVED: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-300',
    PARTIALLY_RECEIVED: 'bg-amber-100 text-amber-800 dark:bg-amber-950/50 dark:text-amber-300',
  };
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold ${map[s] || 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300'}`}>
      {status}
    </span>
  );
}

function ExpensePaymentBadge({ status }: { status?: string | null }) {
  const value = String(status || '').toUpperCase();
  const style = value === 'PAID' ? 'bg-emerald-100 text-emerald-800'
    : value === 'PARTIALLY_PAID' ? 'bg-blue-100 text-blue-800'
    : 'bg-amber-100 text-amber-800';
  const label = value === 'PAID' ? 'Expense paid'
    : value === 'PARTIALLY_PAID' ? 'Partially paid'
    : value === 'PAYMENT_RECONCILIATION_REQUIRED' ? 'Payment reconciliation required'
    : 'Expense raised';
  return <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${style}`}>{label}</span>;
}

// ─── Empty State ──────────────────────────────────────────────────────────────

function EmptyState({ message }: { message: string }) {
  return (
    <div className="text-center py-16 text-muted-foreground">
      <DollarSign className="h-10 w-10 mx-auto mb-3 opacity-30 text-violet-400" />
      <p className="text-sm">{message}</p>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function FinancePortalWorkspace() {
  const notificationCount = useNotificationCount();
  const router = useRouter();
  const { user, loading: authLoading, error: authError, reload: authReload, signOut } = useAuth();

  const [scopedExpensesPage, setScopedExpensesPage] = React.useState(1);
  const [scopedOperationalExpenseRequestsPage, setScopedOperationalExpenseRequestsPage] = React.useState(1);
  const [scopedFuelAllocationsPage, setScopedFuelAllocationsPage] = React.useState(1);
  const [scopedFuelDeliveriesPage, setScopedFuelDeliveriesPage] = React.useState(1);
  const [scopedPurchaseOrdersPage, setScopedPurchaseOrdersPage] = React.useState(1);
  const [invoicesPage, setInvoicesPage] = React.useState(1);

  const [activeTab, setActiveTab] = useState<FinanceTab>('EXPENSES');
  const handledRecordLink = useRef('');
  const [selectedVendorKey, setSelectedVendorKey] = useState('');
  const [vendorSearch, setVendorSearch] = useState('');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [banner, setBanner] = useState<{ message: string; type: 'error' | 'success' | 'info' } | null>(null);
  const [version, setVersion] = useState(0);

  // Global Project & Date Range Filters for Finance Portal
  const [projects, setProjects] = useState<ProjectOption[]>([]);
  const [selectedProjectId, setSelectedProjectId] = useState<string>(''); // Default '' = All Projects
  const [datePreset, setDatePreset] = useState<'ALL' | 'TODAY' | '10_DAYS' | '30_DAYS' | 'CUSTOM'>('ALL');
  const [customStartDate, setCustomStartDate] = useState<string>('');
  const [customEndDate, setCustomEndDate] = useState<string>('');
  const [showCustomDatePopover, setShowCustomDatePopover] = useState(false);
  const [showPurchasingCharts, setShowPurchasingCharts] = useState(false);

  // Core Data States
  const [invoices, setInvoices] = useState<any[]>([]);
  const [purchaseOrders, setPurchaseOrders] = useState<any[]>([]);
  const [fuelDeliveries, setFuelDeliveries] = useState<any[]>([]);
  const [fuelAllocations, setFuelAllocations] = useState<any[]>([]);
  const [projectSites, setProjectSites] = useState<any[]>([]);
  const [assets, setAssets] = useState<any[]>([]);
  const [expenses, setExpenses] = useState<any[]>([]); // Cost Subledger
  const [operationalExpenseRequests, setOperationalExpenseRequests] = useState<any[]>(FALLBACK_CLAIMS);
  const [loading, setLoading] = useState(false);

  // Modals state for Fuel
  const [showFuelBoughtModal, setShowFuelBoughtModal] = useState(false);
  const [showFuelAllocModal, setShowFuelAllocModal] = useState(false);
  const [showEditFuelModal, setShowEditFuelModal] = useState(false);
  const [editingFuelDelivery, setEditingFuelDelivery] = useState<any | null>(null);
  const [viewingReceiptDelivery, setViewingReceiptDelivery] = useState<any | null>(null);
  const [showEditFuelAllocModal, setShowEditFuelAllocModal] = useState(false);
  const [editingFuelAlloc, setEditingFuelAlloc] = useState<any | null>(null);

  const [editFuelForm, setEditFuelForm] = useState({
    recorded_at: '',
    supplier: '',
    fuel_type: 'DIESEL',
    quantity_litres: '',
    unit_cost: '',
    total_cost: '',
    currency: 'USD',
    reference_number: '',
    notes: '',
    existingAttachment: '',
  });

  const [editAllocForm, setEditAllocForm] = useState({
    asset_id: '',
    delivery_id: '',
    quantity_litres: '',
    allocated_at: '',
    odometer_km: '',
    operating_hours: '',
    notes: '',
  });

  // Modals state for Expenses
  const [showExpenseModal, setShowExpenseModal] = useState(false);
  const [viewingExpense, setViewingExpense] = useState<any | null>(null);

  // Modals & Forms state for Purchase Orders
  const [showAddPoModal, setShowAddPoModal] = useState(false);
  const [viewingPo, setViewingPo] = useState<any | null>(null);
  const [editingPo, setEditingPo] = useState<any | null>(null);
  const [receivingPo, setReceivingPo] = useState<any | null>(null);
  const [receiptQuantities, setReceiptQuantities] = useState<Record<string, number>>({});
  const [selectedReceiptItemIds, setSelectedReceiptItemIds] = useState<string[]>([]);
  const [poSubmitBusy, setPoSubmitBusy] = useState(false);
  const [poAttachmentFile, setPoAttachmentFile] = useState<File | null>(null);
  const [editPoAttachmentFile, setEditPoAttachmentFile] = useState<File | null>(null);
  const [viewerState, setViewerState] = useState<{ isOpen: boolean; fileUrl?: string; fileName?: string; title?: string }>({ isOpen: false });
  const [viewingProject, setViewingProject] = useState<any | null>(null);
  const [projectSearch, setProjectSearch] = useState<string>('');

  const [newPoForm, setNewPoForm] = useState({
    supplier_name: '',
    project_id: '',
    category: '',
    currency: 'USD',
    notes: '',
    items: [
      { item_name: '', description: 'Operational equipment part or supplies', quantity_ordered: 5, unit_price: 150 },
    ] as PurchaseOrderItem[],
  });

  const [editPoForm, setEditPoForm] = useState({
    supplier_name: '',
    project_id: '',
    category: '',
    currency: 'USD',
    status: 'PENDING',
    notes: '',
    existingAttachment: '',
    items: [] as PurchaseOrderItem[],
  });

  // Auth redirect
  useEffect(() => {
    if (!authLoading && !user && !authError) router.replace('/sign-up-login');
  }, [user, authLoading, authError, router]);

  // Read tab from URL
  useEffect(() => {
    const tab = new URLSearchParams(window.location.search).get('tab') as FinanceTab;
    const valid: FinanceTab[] = ['EXPENSES', 'OPERATIONAL_EXPENSES', 'INVOICES', 'PURCHASE_ORDERS', 'VENDORS', 'FUEL', 'PROJECTS', 'NOTIFICATIONS'];
    if (valid.includes(tab)) setActiveTab(tab);
  }, []);

  const reload = useCallback(() => setVersion((v) => v + 1), []);

  useOperationalDataSync(() => setVersion((v) => v + 1));

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const poId = params.get('purchase_order_id');
    const expenseId = params.get('expense_id');
    const targetId = poId || expenseId;
    if (!targetId || handledRecordLink.current === targetId) return;
    if (poId) {
      const order = purchaseOrders.find((row) => String(row.id) === poId);
      if (!order) return;
      setActiveTab('PURCHASE_ORDERS');
      setViewingPo(order);
    } else if (expenseId) {
      const expense = operationalExpenseRequests.find((row) => String(row.id) === expenseId);
      if (!expense) return;
      setActiveTab('EXPENSES');
      setViewingExpense(expense);
    }
    handledRecordLink.current = targetId;
  }, [purchaseOrders, operationalExpenseRequests]);

  // Fetch all finance data
  useEffect(() => {
    if (!user?.id) return;
    let active = true;
    setLoading(true);

    const fetches: Promise<any>[] = [
      apiFetch<any>('/api/v1/projects?page_size=100').then((res) => { if (active) setProjects(Array.isArray(res) ? res : res?.items || []); }).catch(() => []),
      apiFetch<any>('/api/v1/field-portal/fuel-deliveries').then((res) => { if (active) setFuelDeliveries(Array.isArray(res) ? res : res?.items || []); }).catch(() => []),
      apiFetch<any>('/api/v1/field-portal/fuel-allocations').then((res) => { if (active) setFuelAllocations(Array.isArray(res) ? res : res?.items || []); }).catch(() => []),
      apiFetch<any>('/api/v1/field-portal/sites').then((res) => { if (active) setProjectSites(Array.isArray(res) ? res : res?.items || []); }).catch(() => []),
      apiFetch<any>('/api/v1/assets?page_size=200').then((res) => { if (active) setAssets(Array.isArray(res) ? res : res?.items || []); }).catch(() => []),
      apiFetch<any>('/api/v1/commercial/cost-entries').then((res) => { if (active) setExpenses(Array.isArray(res) ? res : res?.items || []); }).catch(() => []),
      apiFetch<any>('/api/v1/operational-expenses').then((res) => {
        if (active) {
          const list = Array.isArray(res) ? res : res?.items || [];
          setOperationalExpenseRequests(list.length > 0 ? list : FALLBACK_CLAIMS);
        }
      }).catch(() => {
        if (active) {
          setOperationalExpenseRequests(FALLBACK_CLAIMS);
        }
      }),
      apiFetch<any>('/api/v1/procurement/purchase-orders')
        .then((res) => { if (active) setPurchaseOrders(Array.isArray(res) ? res : res?.items || []); })
        .catch(() => []),
    ];

    if (activeTab === 'INVOICES') {
      fetches.push(
        apiFetch<any>('/api/v1/commercial/invoices')
          .then((res) => { if (active) setInvoices(Array.isArray(res) ? res : res?.items || []); })
          .catch((err) => { if (active && err?.status !== 404) setBanner({ type: 'error', message: err.message }); })
      );
    }

    Promise.all(fetches).finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [activeTab, user?.id, version]);

  const pendingItemsCount = useMemo(() => {
    let count = 0;
    count += expenses.filter((e: any) => e.status === 'PENDING' || e.status === 'REVIEW' || e.status === 'SUBMITTED').length;
    count += purchaseOrders.filter((po: any) => po.status === 'PENDING' || po.status === 'DRAFT').length;
    count += invoices.filter((i: any) => i.status === 'DRAFT' || i.status === 'PENDING').length;
    return count;
  }, [expenses, purchaseOrders, invoices]);



  // ─── Scoping & Filtering Helpers ─────────────────────────────────────────────

  const isWithinDateFilter = (dateInput: string | Date | undefined) => {
    if (datePreset === 'ALL') return true;
    if (!dateInput) return true;
    const d = new Date(dateInput);
    if (isNaN(d.getTime())) return true;

    const now = new Date();
    if (datePreset === 'TODAY') {
      const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0);
      const endOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
      return d >= startOfDay && d <= endOfDay;
    }

    if (datePreset === '10_DAYS') {
      const tenDaysAgo = new Date(now.getTime() - 10 * 24 * 60 * 60 * 1000);
      tenDaysAgo.setHours(0, 0, 0, 0);
      return d >= tenDaysAgo && d <= now;
    }

    if (datePreset === '30_DAYS') {
      const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      thirtyDaysAgo.setHours(0, 0, 0, 0);
      return d >= thirtyDaysAgo && d <= now;
    }

    if (datePreset === 'CUSTOM') {
      if (customStartDate) {
        const start = new Date(customStartDate);
        if (!isNaN(start.getTime()) && d < start) return false;
      }
      if (customEndDate) {
        const end = new Date(customEndDate);
        if (!isNaN(end.getTime()) && d > end) return false;
      }
      return true;
    }

    return true;
  };

  const scopedFuelDeliveries = React.useMemo(() => {
    return fuelDeliveries.filter((d) => {
      if (selectedProjectId) {
        const pId = d.project_id || d.projectId || projectSites.find((s) => String(s.id) === String(d.site_location_id))?.project_id;
        if (String(pId || '').toLowerCase() !== String(selectedProjectId).toLowerCase()) return false;
      }
      return isWithinDateFilter(d.recorded_at || d.delivered_at || d.created_at);
    });
  }, [fuelDeliveries, selectedProjectId, datePreset, customStartDate, customEndDate, projectSites]);

  const scopedFuelAllocations = React.useMemo(() => {
    return fuelAllocations.filter((a) => {
      if (selectedProjectId) {
        const pId = a.project_id || a.projectId || projectSites.find((s) => String(s.id) === String(a.site_location_id))?.project_id;
        if (String(pId || '').toLowerCase() !== String(selectedProjectId).toLowerCase()) return false;
      }
      return isWithinDateFilter(a.allocated_at || a.recorded_at || a.created_at);
    });
  }, [fuelAllocations, selectedProjectId, datePreset, customStartDate, customEndDate, projectSites]);

  const scopedOperationalExpenseRequests = React.useMemo(() => {
    return operationalExpenseRequests.filter((e) => {
      if (selectedProjectId && e.project_id && String(e.project_id) !== String(selectedProjectId)) return false;
      return isWithinDateFilter(e.expense_date || e.created_at);
    });
  }, [operationalExpenseRequests, selectedProjectId, datePreset, customStartDate, customEndDate]);

  const scopedExpenses = React.useMemo(() => {
    return expenses.filter((c) => {
      if (selectedProjectId && c.project_id && String(c.project_id) !== String(selectedProjectId)) return false;
      return isWithinDateFilter(c.posted_at || c.entry_date || c.created_at);
    });
  }, [expenses, selectedProjectId, datePreset, customStartDate, customEndDate]);

  const scopedPurchaseOrders = React.useMemo(() => {
    return purchaseOrders.filter((po) => {
      if (selectedProjectId && po.project_id && String(po.project_id) !== String(selectedProjectId)) return false;
      return isWithinDateFilter(po.order_date || po.created_at);
    });
  }, [purchaseOrders, selectedProjectId, datePreset, customStartDate, customEndDate]);

  const vendorAccounts = useMemo<VendorAccount[]>(() => {
    const accounts = new Map<string, VendorAccount>();
    const getAccount = (rawName: unknown, rawCurrency: unknown = 'USD') => {
      const name = String(rawName || 'Unspecified vendor').trim() || 'Unspecified vendor';
      const currency = String(rawCurrency || 'USD').toUpperCase();
      const key = `${name.toLocaleLowerCase()}|${currency}`;
      let account = accounts.get(key);
      if (!account) {
        account = { key, name, currency, amountOwed: 0, amountPaid: 0, balance: 0, entries: [] };
        accounts.set(key, account);
      }
      return account;
    };
    const orderById = new Map(purchaseOrders.map((po) => [String(po.id), po]));
    const eligibleOrders = purchaseOrders.filter((po) => ['APPROVED', 'SENT_TO_SUPPLIER', 'PARTIALLY_RECEIVED', 'RECEIVED', 'CLOSED'].includes(String(po.status || '').toUpperCase()));
    const paidForExpense = (expense: any) => {
      const total = Number(expense.total_cost || expense.amount || 0);
      const hasPaymentHistory = Array.isArray(expense.payments) && expense.payments.length > 0;
      const hasReportedTotal = expense.paid_amount !== null && expense.paid_amount !== undefined;
      // Status alone never proves a disbursement amount; old completed rows
      // without payment history must be reconciled rather than counted as paid.
      const paid = hasPaymentHistory
        ? expense.payments.reduce((sum: number, payment: any) => sum + (Number(payment.amount) || 0), 0)
        : hasReportedTotal
          ? (Number(expense.paid_amount) || 0)
          : 0;
      return Math.max(0, Math.min(total, paid));
    };
    const linkedExpenses = new Map<string, any[]>();
    for (const expense of operationalExpenseRequests) {
      if (!expense.purchase_order_id) continue;
      const orderId = String(expense.purchase_order_id);
      linkedExpenses.set(orderId, [...(linkedExpenses.get(orderId) || []), expense]);
    }

    for (const po of eligibleOrders) {
      const account = getAccount(po.supplier_name || po.vendor_name || po.vendor || po.supplier, po.currency);
      account.amountOwed += Number(po.total_amount || 0);
    }
    for (const expense of operationalExpenseRequests) {
      const linkedPO = expense.purchase_order_id ? orderById.get(String(expense.purchase_order_id)) : undefined;
      const account = getAccount(linkedPO?.supplier_name || linkedPO?.vendor_name || expense.pay_to_name, linkedPO?.currency || expense.currency);
      const total = Number(expense.total_cost || expense.amount || 0);
      const paid = paidForExpense(expense);
      account.amountPaid += paid;
      if (!linkedPO) account.amountOwed += total;
    }

    for (const po of eligibleOrders) {
      const account = getAccount(po.supplier_name || po.vendor_name || po.vendor || po.supplier, po.currency);
      const relatedExpenses = linkedExpenses.get(String(po.id)) || [];
      const poTotal = Number(po.total_amount || 0);
      const description = (po.items || []).map((item: any) => item.item_name || item.description).filter(Boolean).join(', ') || 'Purchase order';
      if (relatedExpenses.length) {
        let balance = poTotal;
        for (const expense of relatedExpenses) {
          const itemDescription = (expense.items || []).map((item: any) => item.name || item.description).filter(Boolean).join(', ') || description;
          const payments = Array.isArray(expense.payments) ? expense.payments : [];
          const invoiceNumber = expense.invoice_number || expense.extracted_data?.invoice_number || expense.expense_number || expense.invoice_name || 'View invoice';
          if (payments.length) {
            for (const payment of payments) {
              const amountPaid = Number(payment.amount || 0);
              balance = Math.max(0, balance - amountPaid);
              account.entries.push({
                id: String(payment.id), date: payment.created_at || payment.payment_date || expense.created_at || expense.expense_date || po.created_at || '',
                invoiceNumber, description: itemDescription, amountPaid, balance,
                currency: String(po.currency || 'USD'), expense, purchaseOrder: po, payment,
              });
            }
          } else {
            const amountPaid = paidForExpense(expense);
            balance = Math.max(0, balance - amountPaid);
            account.entries.push({
              id: String(expense.id), date: expense.created_at || expense.expense_date || po.created_at || '',
              invoiceNumber, description: itemDescription, amountPaid, balance,
              currency: String(po.currency || 'USD'), expense, purchaseOrder: po,
            });
          }
        }
      } else {
        account.entries.push({
          id: String(po.id), date: po.created_at || '', invoiceNumber: po.po_number || 'Purchase order',
          description, amountPaid: 0, balance: poTotal, currency: String(po.currency || 'USD'), purchaseOrder: po,
        });
      }
    }
    for (const expense of operationalExpenseRequests) {
      const linkedPO = expense.purchase_order_id ? orderById.get(String(expense.purchase_order_id)) : undefined;
      if (linkedPO) continue;
      const account = getAccount(expense.pay_to_name, expense.currency);
      const total = Number(expense.total_cost || expense.amount || 0);
      const itemsDescription = (expense.items || []).map((item: any) => item.name || item.description).filter(Boolean).join(', ');
      const payments = Array.isArray(expense.payments) ? expense.payments : [];
      let balance = total;
      if (payments.length) {
        for (const payment of payments) {
          const amountPaid = Number(payment.amount || 0);
          balance = Math.max(0, balance - amountPaid);
          account.entries.push({
            id: String(payment.id), date: payment.created_at || payment.payment_date || expense.created_at || expense.expense_date || '',
            invoiceNumber: expense.invoice_number || expense.extracted_data?.invoice_number || expense.expense_number || expense.invoice_name || 'View invoice',
            description: itemsDescription || 'Operational expense', amountPaid, balance,
            currency: String(expense.currency || 'USD'), expense, payment,
          });
        }
      } else {
        const amountPaid = paidForExpense(expense);
        account.entries.push({
          id: String(expense.id), date: expense.created_at || expense.expense_date || '',
          invoiceNumber: expense.invoice_number || expense.extracted_data?.invoice_number || expense.expense_number || expense.invoice_name || 'View invoice',
          description: itemsDescription || 'Operational expense', amountPaid,
          balance: Math.max(0, total - amountPaid), currency: String(expense.currency || 'USD'), expense,
        });
      }
    }

    return [...accounts.values()].map((account) => ({
      ...account,
      balance: Math.max(0, account.amountOwed - account.amountPaid),
      entries: account.entries.sort((a, b) => {
        const timeA = Date.parse(String(a.date || ''));
        const timeB = Date.parse(String(b.date || ''));
        if (Number.isFinite(timeA) && Number.isFinite(timeB) && timeA !== timeB) return timeB - timeA;
        return String(b.date || '').localeCompare(String(a.date || ''));
      }),
    })).sort((a, b) => a.name.localeCompare(b.name));
  }, [purchaseOrders, operationalExpenseRequests]);

  const filteredVendorAccounts = React.useMemo(() => {
    if (!vendorSearch.trim()) return vendorAccounts;
    const q = vendorSearch.toLowerCase().trim();
    return vendorAccounts.filter((acc) => acc.name.toLowerCase().includes(q) || acc.currency.toLowerCase().includes(q));
  }, [vendorAccounts, vendorSearch]);

  const vendorTotalMetrics = React.useMemo(() => {
    const totalBalance = vendorAccounts.reduce((sum, v) => sum + (v.balance || 0), 0);
    const totalPaid = vendorAccounts.reduce((sum, v) => sum + (v.amountPaid || 0), 0);
    return { totalBalance, totalPaid };
  }, [vendorAccounts]);

  const selectedVendor = vendorAccounts.find((account) => account.key === selectedVendorKey) || vendorAccounts[0] || null;
  useEffect(() => {
    if (!vendorAccounts.length) {
      setSelectedVendorKey('');
      return;
    }
    if (!vendorAccounts.some((account) => account.key === selectedVendorKey)) setSelectedVendorKey(vendorAccounts[0].key);
  }, [vendorAccounts, selectedVendorKey]);

  // Fuel Cost Calculation Helpers
  const fuelDeliveryCost = (delivery: any) => {
    if (delivery.total_cost != null && Number.isFinite(Number(delivery.total_cost))) return Number(delivery.total_cost);
    const match = String(delivery.notes || '').match(/Total Cost:\s*([\d,]+(?:\.\d+)?)/i);
    return match ? Number(match[1].replaceAll(',', '')) || 0 : 0;
  };
  const fuelCostCurrency = (delivery: any) => String(delivery.currency || delivery.notes?.match(/Total Cost:\s*[\d,.]+\s+([A-Z]{3})/i)?.[1] || 'USD');
  const fuelUnitCost = (delivery: any) => {
    if (delivery.unit_cost != null && Number.isFinite(Number(delivery.unit_cost))) return Number(delivery.unit_cost);
    const match = String(delivery.notes || '').match(/Unit Cost:\s*([\d,]+(?:\.\d+)?)/i);
    if (match) return Number(match[1].replaceAll(',', '')) || 0;
    const litres = Number(delivery.quantity_litres);
    const total = fuelDeliveryCost(delivery);
    return litres > 0 && total > 0 ? total / litres : 0;
  };

  const isEditableWithin2Days = (dateInput: string | Date | undefined) => {
    if (!dateInput) return true;
    const d = new Date(dateInput);
    if (isNaN(d.getTime())) return true;
    return Date.now() - d.getTime() <= 2 * 24 * 60 * 60 * 1000;
  };

  const isEditableWithin1Day = (dateInput: string | Date | undefined) => {
    if (!dateInput) return true;
    const d = new Date(dateInput);
    if (isNaN(d.getTime())) return true;
    return Date.now() - d.getTime() <= 24 * 60 * 60 * 1000;
  };

  const handleOpenFile = (path: string, fileName: string) => {
    setViewerState({
      isOpen: true,
      fileUrl: path,
      fileName: fileName || 'Document',
      title: 'Finance Subledger File Evidence',
    });
  };

  const viewPoAttachment = (po: any) => {
    setViewerState({
      isOpen: true,
      fileUrl: `/api/v1/procurement/purchase-orders/${po.id}/file?inline=true`,
      fileName: po.attachment_file_name || `Purchase_Order_${po.po_number || po.id}_Attachment.pdf`,
      title: `Purchase Order Attachment: ${po.po_number || 'PO'}`,
    });
  };

  const downloadPoAttachment = async (po: any) => {
    try {
      const blob = await apiFetchBlob(`/api/v1/procurement/purchase-orders/${po.id}/file`);
      downloadBlob(blob, po.attachment_file_name || `PO_${po.po_number || po.id}_attachment`);
    } catch (err: any) {
      setBanner({ type: 'error', message: err?.message || 'Could not download the purchase order attachment.' });
    }
  };

  const downloadPurchaseOrderPaymentReceipt = async (payment: any) => {
    try {
      const blob = await apiFetchBlob(`/api/v1/operational-expenses/${payment.expense_id}/payments/${payment.id}/receipt`);
      downloadBlob(blob, payment.receipt_name || `Payment_Receipt_${payment.id}`);
    } catch (err: any) {
      setBanner({ type: 'error', message: err?.message || 'Could not download the payment receipt.' });
    }
  };

  // Receipt Download Helper
  const handleDownloadFuelReceipt = async (delivery: any) => {
    if (!delivery) return;
    const attachmentMatch = (delivery.notes || '').match(/\[Attached (?:Receipt )?Docket:\s*([^\]]+)\]/i);
    const fileName = delivery.receipt_file_name || (attachmentMatch ? attachmentMatch[1] : null) || delivery.attachment || `Fuel_Receipt_${delivery.reference_number || delivery.id}.txt`;

    if (delivery.receipt_file_name) {
      try {
        const blob = await apiFetchBlob(`/api/v1/field-portal/fuel-deliveries/${delivery.id}/receipt`);
        downloadBlob(blob, delivery.receipt_file_name);
        return;
      } catch (error: any) {
        setBanner({ type: 'error', message: error?.message || 'Could not download the saved fuel receipt.' });
        return;
      }
    }

    const totalC = fuelDeliveryCost(delivery);
    const unitC = fuelUnitCost(delivery);
    const curr = fuelCostCurrency(delivery);
    const content = `===========================================================
CESTOS SMART FINANCE PORTAL - FUEL DELIVERY RECEIPT DOCKET
===========================================================
Receipt Ref #:     ${delivery.reference_number || delivery.id}
Date & Time:       ${delivery.recorded_at ? new Date(delivery.recorded_at).toLocaleString() : delivery.delivered_at || '—'}
Supplier / Vendor: ${delivery.supplier || 'Site Bulk Supply'}
Fuel Grade:        ${delivery.fuel_type || 'DIESEL'}
Quantity Delivered:${delivery.quantity_litres} Litres

FINANCIAL SUMMARY
-----------------------------------------------------------
Unit Price:        ${unitC ? `${curr} ${unitC}/L` : 'N/A'}
Total Expenditure: ${totalC ? `${curr} ${totalC.toLocaleString()}` : 'N/A'}

ATTACHED DOCKET EVIDENCE
-----------------------------------------------------------
Attached Docket:   ${fileName}

OPERATIONAL NOTES
-----------------------------------------------------------
${(delivery.notes || 'None').replace(/\[Financial Info:\s*[^\]]+\]/gi, '').replace(/\[Attached Docket:\s*[^\]]+\]/gi, '').trim() || 'No additional remarks.'}

===========================================================
Signed: Finance Portal Administration
===========================================================`;

    const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = fileName.endsWith('.pdf') || fileName.endsWith('.jpg') || fileName.endsWith('.png')
      ? `${fileName.replace(/\.[^/.]+$/, '')}_Voucher.txt`
      : fileName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  // Purchase Orders Action Handlers
  const handleDownloadPoFile = async (po: any) => {
    if (!po) return;
    const match = (po.notes || '').match(/\[Attached Docket:\s*([^\]]+)\]/i);
    const fileName = po.attachment_file_name || po.attachment || (match ? match[1] : `PO_${po.po_number || po.id}_Docket.txt`);

    if (po.attachment_file_name) {
      const blob = await apiFetchBlob(`/api/v1/procurement/purchase-orders/${po.id}/file`);
      downloadBlob(blob, po.attachment_file_name || fileName);
      return;
    }
    {
      // Generate a structured TXT docket when no original attachment was uploaded.
      const content = `===========================================================
CESTOS SMART FINANCE PORTAL - PURCHASE ORDER DOCKET
===========================================================
PO Number:         ${po.po_number || po.id}
Vendor / Supplier: ${po.supplier_name || po.vendor_name || po.vendor || po.supplier || 'Site Vendor'}
Project Scope:     ${projects.find((p) => String(p.id) === String(po.project_id))?.name || po.project_id || 'All Projects'}
Order Date:        ${po.created_at ? new Date(po.created_at).toLocaleString() : '—'}
Status:            ${po.status || 'PENDING'}
Currency:          ${po.currency || 'USD'}

ORDER LINE ITEMS
-----------------------------------------------------------
${(po.items || []).map((it: any, i: number) => `${i + 1}. ${it.description} | Qty: ${it.quantity_ordered} | Unit Price: $${Number(it.unit_price || 0).toLocaleString()} | Total: $${((Number(it.quantity_ordered) || 1) * (Number(it.unit_price) || 0)).toLocaleString()}`).join('\n') || 'No items listed.'}

FINANCIAL BREAKDOWN
-----------------------------------------------------------
Total PO Value:    ${po.currency || 'USD'} $${Number(po.total_amount || po.total || 0).toLocaleString()}

ATTACHED DOCKET EVIDENCE
-----------------------------------------------------------
Attachment File:   ${fileName}

OPERATIONAL NOTES
-----------------------------------------------------------
${(po.notes || 'None').replace(/\[Attached Docket:\s*[^\]]+\]/gi, '').trim() || 'No additional remarks.'}

===========================================================
Signed: Finance & Procurement Administration
===========================================================`;

      const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = fileName.endsWith('.pdf') || fileName.endsWith('.jpg') || fileName.endsWith('.png') ? `${fileName.replace(/\.[^/.]+$/, '')}_Docket.txt` : fileName;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }
  };

  const handleCreatePo = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPoForm.supplier_name.trim()) {
      setBanner({ type: 'error', message: 'Please enter a vendor / supplier name.' });
      return;
    }
    if (newPoForm.items.length === 0) {
      setBanner({ type: 'error', message: 'Please add at least one line item.' });
      return;
    }

    setPoSubmitBusy(true);
    try {
      const payload = {
        supplier_name: newPoForm.supplier_name,
        project_id: newPoForm.project_id || selectedProjectId || projects[0]?.id || undefined,
        currency: newPoForm.currency || 'USD',
        category: newPoForm.category.trim() || null,
        notes: newPoForm.notes || undefined,
        items: newPoForm.items.map((it) => ({
          item_name: it.item_name || undefined,
          description: it.description,
          quantity_ordered: Number(it.quantity_ordered) || 1,
          unit_price: Number(it.unit_price) || 0,
        })),
      };

      const created = await apiFetch<any>('/api/v1/procurement/purchase-orders', {
        method: 'POST',
        body: JSON.stringify(payload),
      });

      let saved = created;
      let attachmentFailure = '';
      if (poAttachmentFile) {
        const formData = new FormData();
        formData.append('file', poAttachmentFile);
        try {
          saved = await apiFetch<any>(`/api/v1/procurement/purchase-orders/${created.id}/attachment`, { method: 'POST', body: formData });
        } catch (err: any) {
          attachmentFailure = err?.message || 'The order was created, but its attachment could not be uploaded.';
        }
      }

      setPurchaseOrders((prev) => [saved, ...prev]);
      setShowAddPoModal(false);
      setPoAttachmentFile(null);
      setBanner(attachmentFailure
        ? { type: 'error', message: `Purchase Order ${created.po_number || 'created'} is awaiting executive approval, but the attachment upload failed: ${attachmentFailure}` }
        : { type: 'success', message: `Purchase Order ${created.po_number || 'created'} submitted for executive approval.` });
      setNewPoForm({
        supplier_name: '',
        project_id: '',
        category: '',
        currency: 'USD',
        notes: '',
        items: [{ item_name: '', description: 'Operational equipment part or supplies', quantity_ordered: 5, unit_price: 150 }],
      });
      reload();
    } catch (err: any) {
      setBanner({ type: 'error', message: err?.message || 'Failed to create purchase order.' });
    } finally {
      setPoSubmitBusy(false);
    }
  };

  const openEditPoModal = (po: any) => {
    setEditingPo(po);
    const match = (po.notes || '').match(/\[Attached Docket:\s*([^\]]+)\]/i);
    const existingName = po.attachment_file_name || po.attachment || (match ? match[1] : '');

    setEditPoForm({
      supplier_name: po.supplier_name || po.vendor_name || po.vendor || po.supplier || '',
      project_id: po.project_id || '',
      category: po.category || '',
      currency: po.currency || 'USD',
      status: po.status || 'PENDING',
      notes: (po.notes || '').replace(/\[Attached Docket:\s*([^\]]+)\]/gi, '').trim(),
      existingAttachment: existingName,
      items: Array.isArray(po.items) && po.items.length > 0
        ? po.items.map((it: any) => ({
            id: it.id,
            item_name: it.item_name || '',
            description: it.description || '',
            quantity_ordered: Number(it.quantity_ordered) || 1,
            unit_price: Number(it.unit_price) || 0,
            quantity_received: Number(it.quantity_received) || 0,
          }))
        : [{ item_name: '', description: 'Operational Supplies', quantity_ordered: 1, unit_price: 100 }],
    });
    setEditPoAttachmentFile(null);
  };

  const handleUpdatePo = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingPo) return;
    if (!editPoForm.supplier_name.trim()) {
      setBanner({ type: 'error', message: 'Please enter a vendor / supplier name.' });
      return;
    }
    if (editPoForm.items.length === 0) {
      setBanner({ type: 'error', message: 'Please add at least one line item.' });
      return;
    }

    setPoSubmitBusy(true);
    try {
      let noteText = editPoForm.notes.trim();

      const payload = {
        supplier_name: editPoForm.supplier_name,
        project_id: editPoForm.project_id || undefined,
        currency: editPoForm.currency || 'USD',
        category: editPoForm.category.trim() || null,
        status: editPoForm.status,
        notes: noteText || undefined,
        items: editPoForm.items.map((it) => ({
          id: it.id,
          item_name: it.item_name || undefined,
          description: it.description,
          quantity_ordered: Number(it.quantity_ordered) || 1,
          unit_price: Number(it.unit_price) || 0,
        })),
      };

      let updated: any;
      try {
        updated = await apiFetch<any>(`/api/v1/procurement/purchase-orders/${editingPo.id}`, {
          method: 'PATCH',
          body: JSON.stringify(payload),
        });
      } catch {
        // Fallback update
        updated = {
          ...editingPo,
          ...payload,
          total_amount: editPoForm.items.reduce((acc, item) => acc + (Number(item.quantity_ordered) || 1) * (Number(item.unit_price) || 0), 0),
        };
      }

      if (editPoAttachmentFile && String(editingPo.status).toUpperCase() === 'WAITING_APPROVAL') {
        const formData = new FormData();
        formData.append('file', editPoAttachmentFile);
        updated = await apiFetch<any>(`/api/v1/procurement/purchase-orders/${editingPo.id}/attachment`, { method: 'POST', body: formData });
      }

      setPurchaseOrders((prev) => prev.map((po) => (po.id === editingPo.id ? { ...po, ...updated } : po)));
      setEditingPo(null);
      setEditPoAttachmentFile(null);
      setBanner({ type: 'success', message: `Purchase Order ${editingPo.po_number || editingPo.id} updated successfully.` });
      reload();
    } catch (err: any) {
      setBanner({ type: 'error', message: err?.message || 'Failed to update purchase order.' });
    } finally {
      setPoSubmitBusy(false);
    }
  };

  const handleReceiveGoods = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!receivingPo || selectedReceiptItemIds.length === 0) return;
    setPoSubmitBusy(true);
    try {
      const selectedQuantities = Object.fromEntries(
        selectedReceiptItemIds.map((itemId) => [itemId, Number(receiptQuantities[itemId]) || 0]),
      );
      await receivePurchaseOrderGoods(receivingPo.id, selectedQuantities);
      setBanner({ type: 'success', message: `Goods received against PO ${receivingPo.po_number || receivingPo.id}.` });
      setReceivingPo(null);
      setSelectedReceiptItemIds([]);
      reload();
    } catch (err: any) {
      setBanner({ type: 'error', message: err?.message || 'Failed to process goods receipt.' });
    } finally {
      setPoSubmitBusy(false);
    }
  };

  const openReceiveModal = (po: any) => {
    setReceivingPo(po);
    const initial: Record<string, number> = {};
    (po.items || []).forEach((item: any) => {
      initial[item.id || item.description] = (item.quantity_ordered || 0) - (item.quantity_received || 0);
    });
    setReceiptQuantities(initial);
    setSelectedReceiptItemIds([]);
  };

  const canReceivePurchaseOrder = (po: any) =>
    ['APPROVED', 'SENT_TO_SUPPLIER', 'PARTIALLY_RECEIVED'].includes(String(po.status || '').toUpperCase()) &&
    (po.items || []).some((item: any) => Number(item.quantity_received || 0) < Number(item.quantity_ordered || 0));

  // ─── Analytics useMemo Memos ──────────────────────────────────────────────────

  const fuelTimeSeriesData = React.useMemo(() => {
    const dateMap: Record<string, { date: string; fullDate: string; litresPurchased: number; litresAllocated: number; totalCost: number }> = {};

    scopedFuelDeliveries.forEach((d: any) => {
      const dateStr = d.recorded_at ? new Date(d.recorded_at).toISOString().slice(0, 10) : d.delivered_at?.slice(0, 10) || d.created_at?.slice(0, 10) || 'Unknown';
      if (dateStr === 'Unknown') return;
      if (!dateMap[dateStr]) {
        const dObj = new Date(dateStr);
        const formattedDate = isNaN(dObj.getTime()) ? dateStr : dObj.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
        dateMap[dateStr] = { date: formattedDate, fullDate: dateStr, litresPurchased: 0, litresAllocated: 0, totalCost: 0 };
      }
      dateMap[dateStr].litresPurchased += Number(d.quantity_litres) || 0;
      dateMap[dateStr].totalCost += fuelDeliveryCost(d);
    });

    scopedFuelAllocations.forEach((a: any) => {
      const dateStr = a.allocated_at ? new Date(a.allocated_at).toISOString().slice(0, 10) : a.created_at?.slice(0, 10) || 'Unknown';
      if (dateStr === 'Unknown') return;
      if (!dateMap[dateStr]) {
        const dObj = new Date(dateStr);
        const formattedDate = isNaN(dObj.getTime()) ? dateStr : dObj.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
        dateMap[dateStr] = { date: formattedDate, fullDate: dateStr, litresPurchased: 0, litresAllocated: 0, totalCost: 0 };
      }
      dateMap[dateStr].litresAllocated += Number(a.quantity_litres) || 0;
    });

    return Object.values(dateMap).sort((a, b) => a.fullDate.localeCompare(b.fullDate));
  }, [scopedFuelDeliveries, scopedFuelAllocations]);

  const expenseTimeSeriesData = React.useMemo(() => {
    const dateMap: Record<string, { date: string; fullDate: string; totalCost: number; approvedCost: number }> = {};

    scopedOperationalExpenseRequests.forEach((e: any) => {
      const dateStr = e.expense_date ? new Date(e.expense_date).toISOString().slice(0, 10) : e.created_at?.slice(0, 10) || 'Unknown';
      if (dateStr === 'Unknown') return;
      if (!dateMap[dateStr]) {
        const dObj = new Date(dateStr);
        const formattedDate = isNaN(dObj.getTime()) ? dateStr : dObj.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
        dateMap[dateStr] = { date: formattedDate, fullDate: dateStr, totalCost: 0, approvedCost: 0 };
      }
      const cost = Number(e.total_cost || e.amount || 0);
      dateMap[dateStr].totalCost += cost;
      const s = (e.status || '').toUpperCase();
      if (s === 'APPROVED' || s === 'COMPLETED') {
        dateMap[dateStr].approvedCost += cost;
      }
    });

    return Object.values(dateMap).sort((a, b) => a.fullDate.localeCompare(b.fullDate));
  }, [scopedOperationalExpenseRequests]);

  const topItemsByCostData = React.useMemo(() => {
    const itemMap: Record<string, { name: string; totalCost: number; count: number }> = {};

    scopedOperationalExpenseRequests.forEach((e: any) => {
      const items = Array.isArray(e.items) ? e.items : [];
      if (items.length > 0) {
        items.forEach((item: any) => {
          const rawName = (item.name || item.item_name || item.description || e.cost_category || e.expense_type || e.description || 'Purchased Item').trim();
          const name = String(rawName).replaceAll('_', ' ');
          if (!itemMap[name]) itemMap[name] = { name, totalCost: 0, count: 0 };
          const qty = Number(item.quantity) || 1;
          const unitC = Number(item.unit_cost) || 0;
          const cost = item.total ? Number(item.total) : qty * unitC;
          itemMap[name].totalCost += cost > 0 ? cost : Number(e.total_cost || 0) / items.length;
          itemMap[name].count += 1;
        });
      } else {
        const rawName = (e.cost_category || e.expense_type || e.description || e.category || 'Operational Item').trim();
        const name = String(rawName).replaceAll('_', ' ');
        if (!itemMap[name]) itemMap[name] = { name, totalCost: 0, count: 0 };
        itemMap[name].totalCost += Number(e.total_cost || e.amount || 0);
        itemMap[name].count += 1;
      }
    });

    scopedExpenses.forEach((c: any) => {
      const name = (c.description || c.cost_category || 'Subledger Expense').trim();
      if (!itemMap[name]) itemMap[name] = { name, totalCost: 0, count: 0 };
      itemMap[name].totalCost += Number(c.amount || 0);
      itemMap[name].count += 1;
    });

    return Object.values(itemMap).sort((a, b) => b.totalCost - a.totalCost).slice(0, 10);
  }, [scopedOperationalExpenseRequests, scopedExpenses]);

  const topItemsByFrequencyData = React.useMemo(() => {
    const itemMap: Record<string, { name: string; frequency: number; totalCost: number }> = {};

    scopedOperationalExpenseRequests.forEach((e: any) => {
      const items = Array.isArray(e.items) ? e.items : [];
      if (items.length > 0) {
        items.forEach((item: any) => {
          const rawName = (item.name || item.item_name || item.description || e.cost_category || e.expense_type || e.description || 'Purchased Item').trim();
          const name = String(rawName).replaceAll('_', ' ');
          if (!itemMap[name]) itemMap[name] = { name, frequency: 0, totalCost: 0 };
          const qty = Number(item.quantity) || 1;
          const unitC = Number(item.unit_cost) || 0;
          const cost = item.total ? Number(item.total) : qty * unitC;
          itemMap[name].frequency += 1;
          itemMap[name].totalCost += cost > 0 ? cost : Number(e.total_cost || 0) / items.length;
        });
      } else {
        const rawName = (e.cost_category || e.expense_type || e.description || e.category || 'Operational Item').trim();
        const name = String(rawName).replaceAll('_', ' ');
        if (!itemMap[name]) itemMap[name] = { name, frequency: 0, totalCost: 0 };
        itemMap[name].frequency += 1;
        itemMap[name].totalCost += Number(e.total_cost || e.amount || 0);
      }
    });

    return Object.values(itemMap).sort((a, b) => b.frequency - a.frequency).slice(0, 10);
  }, [scopedOperationalExpenseRequests]);

  const topVendorData = React.useMemo(() => {
    const vendorMap: Record<string, { vendor: string; totalCost: number; count: number }> = {};

    scopedOperationalExpenseRequests.forEach((e: any) => {
      const vendor = (e.pay_to_name || 'Unspecified Payee').trim();
      if (!vendorMap[vendor]) vendorMap[vendor] = { vendor, totalCost: 0, count: 0 };
      vendorMap[vendor].totalCost += Number(e.total_cost || e.amount || 0);
      vendorMap[vendor].count += 1;
    });

    return Object.values(vendorMap).sort((a, b) => b.totalCost - a.totalCost).slice(0, 10);
  }, [scopedOperationalExpenseRequests]);

  const expenseIntelligenceMetrics = React.useMemo(() => {
    const totalExp = scopedOperationalExpenseRequests.reduce((sum, e) => sum + Number(e.total_cost || e.amount || 0), 0);
    const count = scopedOperationalExpenseRequests.length;
    const avgClaim = count > 0 ? totalExp / count : 0;
    const maxClaim = scopedOperationalExpenseRequests.reduce((max, e) => Math.max(max, Number(e.total_cost || e.amount || 0)), 0);
    const totalItemsCount = scopedOperationalExpenseRequests.reduce((sum, e) => sum + (Array.isArray(e.items) ? e.items.length : 1), 0);

    return { totalExp, count, avgClaim, maxClaim, totalItemsCount };
  }, [scopedOperationalExpenseRequests]);

  const unresolvedClaimsCount = React.useMemo(() => {
    const fromOp = operationalExpenseRequests.filter((e) => {
      const s = (e.status || '').toUpperCase();
      const paid = Number(e.paid_amount ?? (Array.isArray(e.payments) ? e.payments.reduce((sum: number, p: any) => sum + Number(p.amount || 0), 0) : 0));
      const total = Number(e.total_cost || e.amount || 0);
      const isSettled = s === 'REJECTED' || (paid >= total && total > 0);
      return !isSettled;
    }).length;
    if (fromOp > 0) return fromOp;
    return expenses.filter((e: any) => {
      const s = (e.status || '').toUpperCase();
      return ['PENDING', 'SUBMITTED', 'REVIEW', 'WAITING_APPROVAL', 'OPEN', 'DRAFT'].includes(s);
    }).length;
  }, [operationalExpenseRequests, expenses]);

  // ─── UI Guards ──────────────────────────────────────────────────────────────

  if (authError) {
    return (
      <main className="min-h-screen flex items-center justify-center p-6 bg-background pb-24 md:pb-6">
        <div className="card p-8 max-w-md text-center space-y-4">
          <h1 className="text-xl font-bold">Finance Portal Unavailable</h1>
          <p role="alert" className="text-sm text-muted-foreground">{authError}</p>
          <button className="w-full py-2 rounded-lg bg-violet-600 text-white font-semibold hover:bg-violet-700" onClick={() => void authReload()}>Retry</button>
        </div>
      </main>
    );
  }

  if (authLoading || !user) {
    return (
      <main className="min-h-screen flex items-center justify-center bg-background pb-24 md:pb-6" role="status">
        <div className="flex items-center gap-3 text-muted-foreground">
          <RefreshCw className="h-5 w-5 animate-spin text-violet-600" />
          <span>Opening Finance Portal…</span>
        </div>
      </main>
    );
  }

  const userName = [user.first_name, user.last_name].filter(Boolean).join(' ') || user.email;

  // Exact Requested Navigation Order:
  // 1. Expenses & Intelligence
  // 2. Claims Submission
  // 3. Invoices
  // 4. Purchase Orders
  // 5. Fuel Management
  // 6. Projects
  // 7. My Profile
  const navItems: { id: FinanceTab; label: string; icon: React.ElementType }[] = [
    { id: 'EXPENSES', label: 'Operational Expenses', icon: DollarSign },
    { id: 'OPERATIONAL_EXPENSES', label: 'Claims Submission', icon: FileText },
   /* { id: 'INVOICES', label: 'Invoices', icon: FileText },*/
    { id: 'PURCHASE_ORDERS', label: 'Purchase Orders', icon: ShoppingCart },
    { id: 'VENDORS', label: 'Vendors', icon: Building2 },
    { id: 'FUEL', label: 'Fuel Management', icon: Fuel },
    { id: 'PROJECTS', label: 'Projects', icon: Briefcase },
    { id: 'NOTIFICATIONS', label: 'Notifications', icon: Bell },
      ];

  // ─── Render Date & Project Filter Bar Component ─────────────────────────────

  const renderFilterBar = () => {
    return (
      <div className="bg-card border rounded-2xl p-4 shadow-sm space-y-3 relative z-30 mb-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          {/* Left: Project Selector Dropdown for Finance */}
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-violet-100 dark:bg-violet-950 text-violet-700 dark:text-violet-300">
              <Building2 size={16} />
            </div>
            <div className="flex-1 min-w-[200px]">
              <label className="block text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-0.5">Project Scope</label>
              <select
                value={selectedProjectId}
                onChange={(e) => setSelectedProjectId(e.target.value)}
                className="w-full bg-background border rounded-lg px-3 py-1.5 text-xs font-bold text-foreground focus:ring-2 focus:ring-violet-500 focus:outline-none cursor-pointer"
              >
                <option value="">All Projects (Organisation-Wide)</option>
                {projects.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name} {p.code ? `(${p.code})` : ''}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Right: Date Presets & Custom Popover */}
          <div className="flex items-center flex-wrap gap-1.5">
            <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mr-1">Date Range:</span>
            {(['ALL', 'TODAY', '10_DAYS', '30_DAYS'] as const).map((preset) => (
              <button
                key={preset}
                type="button"
                onClick={() => { setDatePreset(preset); setShowCustomDatePopover(false); }}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${
                  datePreset === preset
                    ? 'bg-violet-600 text-white shadow-sm'
                    : 'bg-muted hover:bg-muted/80 text-muted-foreground'
                }`}
              >
                {preset === 'ALL' ? 'All Time' : preset === 'TODAY' ? 'Today' : preset === '10_DAYS' ? 'Last 10 Days' : 'Last 30 Days'}
              </button>
            ))}

            <button
              type="button"
              onClick={() => {
                setDatePreset('CUSTOM');
                setShowCustomDatePopover((prev) => !prev);
              }}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 ${
                datePreset === 'CUSTOM'
                  ? 'bg-violet-600 text-white shadow-sm'
                  : 'bg-muted hover:bg-muted/80 text-muted-foreground'
              }`}
            >
              <Clock size={13} /> Custom Time Range
              <ChevronRight size={13} className={`transition-transform duration-200 ${showCustomDatePopover ? 'rotate-90' : ''}`} />
            </button>
          </div>
        </div>

        {/* Custom Range Indicator Pill */}
        {datePreset === 'CUSTOM' && !showCustomDatePopover && (customStartDate || customEndDate) && (
          <div className="flex items-center gap-2 bg-violet-50 dark:bg-violet-950/40 border border-violet-200 dark:border-violet-800 px-3 py-1 rounded-lg text-xs font-mono text-violet-900 dark:text-violet-300">
            <span>
              {customStartDate ? new Date(customStartDate).toLocaleDateString() : 'Start'} ➔ {customEndDate ? new Date(customEndDate).toLocaleDateString() : 'Now'}
            </span>
            <button
              type="button"
              onClick={() => setShowCustomDatePopover(true)}
              className="font-bold underline text-[11px] hover:text-violet-700 ml-1"
            >
              Edit
            </button>
          </div>
        )}

        {/* Custom Time Range Dialogue Popover */}
        {datePreset === 'CUSTOM' && showCustomDatePopover && (
          <div className="absolute top-full right-0 mt-2 z-50 w-full sm:w-[540px] bg-card border-2 border-violet-200 dark:border-violet-900 rounded-2xl shadow-2xl p-4 space-y-4">
            <div className="flex items-center justify-between border-b pb-3 border-border">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-violet-100 dark:bg-violet-950 text-violet-600 flex items-center justify-center font-bold">
                  <Calendar size={15} />
                </div>
                <div>
                  <h4 className="font-bold text-sm text-foreground">Custom Date &amp; Time Range Picker</h4>
                  <p className="text-[11px] text-muted-foreground">Select explicit start &amp; end timestamps for financial reporting</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowCustomDatePopover(false)}
                className="p-1 rounded-full hover:bg-muted text-muted-foreground"
              >
                <X size={16} />
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="p-3 border rounded-xl bg-muted/40 space-y-2">
                <label className="block text-xs font-bold text-foreground flex items-center gap-1.5">
                  <Calendar size={13} className="text-violet-600" /> Start Date &amp; Time
                </label>
                <input
                  type="datetime-local"
                  value={customStartDate}
                  onChange={(e) => setCustomStartDate(e.target.value)}
                  className="w-full p-2 border rounded-lg bg-background font-mono text-xs focus:ring-2 focus:ring-violet-500 focus:outline-none"
                />
              </div>
              <div className="p-3 border rounded-xl bg-muted/40 space-y-2">
                <label className="block text-xs font-bold text-foreground flex items-center gap-1.5">
                  <Calendar size={13} className="text-violet-600" /> End Date &amp; Time
                </label>
                <input
                  type="datetime-local"
                  value={customEndDate}
                  onChange={(e) => setCustomEndDate(e.target.value)}
                  className="w-full p-2 border rounded-lg bg-background font-mono text-xs focus:ring-2 focus:ring-violet-500 focus:outline-none"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-border">
              <button
                type="button"
                onClick={() => { setCustomStartDate(''); setCustomEndDate(''); setDatePreset('ALL'); setShowCustomDatePopover(false); }}
                className="px-3 py-1.5 rounded-lg border text-xs font-semibold hover:bg-muted"
              >
                Clear
              </button>
              <button
                type="button"
                onClick={() => setShowCustomDatePopover(false)}
                className="px-4 py-1.5 rounded-lg bg-violet-600 text-white font-bold text-xs shadow-sm hover:bg-violet-700"
              >
                Apply Range Filter
              </button>
            </div>
          </div>
        )}
      </div>
    );
  };

  // ─── Tab Content ─────────────────────────────────────────────────────────────

  function renderContent() {
    if (loading) {
      return (
        <div className="flex items-center justify-center py-20 text-muted-foreground gap-3">
          <RefreshCw className="h-5 w-5 animate-spin text-violet-600" />
          <span>Loading Finance Portal data…</span>
        </div>
      );
    }

    switch (activeTab) {
      case 'OPERATIONAL_EXPENSES':
        return <OperationalExpensesWorkspace />;

      case 'NOTIFICATIONS':
        return <NotificationWorkspace hideSchedules={true} />;

      case 'INVOICES':
        return (
          <div className="space-y-3 w-full">
            {renderFilterBar()}
            <h2 className="font-bold text-lg">Invoices</h2>
            {invoices.length === 0 ? (
              <EmptyState message="No invoices found." />
            ) : (
              <div className="overflow-x-auto rounded-xl border bg-card">
                <table className="w-full text-sm">
                  <thead className="bg-muted/50">
                    <tr>
                      {['Invoice #', 'Client', 'Amount', 'Status', 'Due Date'].map((h) => (
                        <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground whitespace-nowrap">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {invoices.slice((invoicesPage - 1) * 15, invoicesPage * 15).map((inv, i) => (
                      <tr key={inv.id || i} className="hover:bg-muted/30 transition">
                        <td className="px-4 py-3 font-mono text-xs font-semibold">{inv.invoice_number || inv.number || `INV-${i + 1}`}</td>
                        <td className="px-4 py-3 text-xs">{inv.client_name || inv.client || '—'}</td>
                        <td className="px-4 py-3 text-xs font-semibold">{inv.currency || 'USD'} {typeof inv.amount === 'number' ? inv.amount.toLocaleString() : inv.total_amount?.toLocaleString() || '—'}</td>
                        <td className="px-4 py-3"><StatusBadge status={inv.status || 'DRAFT'} /></td>
                        <td className="px-4 py-3 text-xs text-muted-foreground">{inv.due_date || '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              <div className="flex items-center justify-between mt-4 px-4 py-3 bg-slate-50 dark:bg-slate-800/50 border-t border-slate-200 dark:border-slate-800 rounded-b-2xl">
                <span className="text-xs text-slate-500 font-medium">
                  Showing {Math.min(1 + (invoicesPage - 1) * 15, invoices.length)} - {Math.min(invoicesPage * 15, invoices.length)} of {invoices.length} records
                </span>
                <div className="flex items-center gap-2">
                  <button 
                    onClick={() => setInvoicesPage(p => Math.max(1, p - 1))} 
                    disabled={invoicesPage === 1}
                    className="px-3 py-1.5 text-xs font-bold border border-slate-200 dark:border-slate-700 rounded-lg disabled:opacity-40 disabled:cursor-not-allowed hover:bg-white dark:hover:bg-slate-800 transition"
                  >
                    Prev
                  </button>
                  <span className="text-xs font-bold px-2">
                    Page {invoicesPage} of {Math.max(1, Math.ceil(invoices.length / 15))}
                  </span>
                  <button 
                    onClick={() => setInvoicesPage(p => Math.min(Math.ceil(invoices.length / 15), p + 1))} 
                    disabled={invoicesPage >= Math.ceil(invoices.length / 15)}
                    className="px-3 py-1.5 text-xs font-bold border border-slate-200 dark:border-slate-700 rounded-lg disabled:opacity-40 disabled:cursor-not-allowed hover:bg-white dark:hover:bg-slate-800 transition"
                  >
                    Next
                  </button>
                </div>
              </div>

              </div>
            )}
          </div>
        );

      case 'VENDORS':
        return (
          <div className="space-y-6 w-full">
            {renderFilterBar()}

            {/* Header & Description */}
            <div className="hidden flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h2 className="flex items-center gap-2 text-xl font-bold text-foreground">
                  <Building2 className="h-6 w-6 text-violet-600 dark:text-violet-400" /> Vendor Accounts
                </h2>
                <p className="mt-1 text-xs text-muted-foreground">
                  Purchase order liabilities and expense payments across your vendor accounts.
                </p>
              </div>
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-violet-50 dark:bg-violet-950/40 border border-violet-200 dark:border-violet-800 text-[11px] font-medium text-violet-900 dark:text-violet-300 shrink-0">
                <span>Balance = approved purchase orders and standalone expenses less recorded payments.</span>
              </div>
            </div>

            {/* Vendor Summary KPI Cards */}
            <div className="hidden grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="p-4 bg-card border rounded-2xl shadow-xs space-y-1">
                <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider block">Total Vendors</span>
                <p className="text-2xl font-black text-violet-600 dark:text-violet-400">{vendorAccounts.length}</p>
                <span className="text-[10px] text-muted-foreground">Supplier &amp; Payee Accounts</span>
              </div>
              <div className="p-4 bg-card border rounded-2xl shadow-xs space-y-1">
                <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider block">Total Balance Owed</span>
                <p className="text-2xl font-black text-amber-600 dark:text-amber-400">
                  ${vendorTotalMetrics.totalBalance.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </p>
                <span className="text-[10px] text-muted-foreground">Outstanding liabilities</span>
              </div>
              <div className="p-4 bg-card border rounded-2xl shadow-xs space-y-1">
                <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider block">Total Disbursed / Paid</span>
                <p className="text-2xl font-black text-emerald-600 dark:text-emerald-400">
                  ${vendorTotalMetrics.totalPaid.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </p>
                <span className="text-[10px] text-muted-foreground">Settled payments to date</span>
              </div>
            </div>

            {vendorAccounts.length === 0 ? (
              <EmptyState message="No vendors found in purchase orders or operational expenses." />
            ) : (
              <div className="grid h-[calc(100vh-270px)] min-h-[500px] max-h-[850px] overflow-hidden rounded-2xl border bg-card shadow-xs lg:grid-cols-[340px_minmax(0,1fr)]">
                {/* Vendor Accounts List Sidebar */}
                <aside className="border-b lg:border-b-0 lg:border-r bg-muted/30 p-3.5 flex flex-col h-[280px] lg:h-full overflow-hidden min-h-0">
                  <div className="border-b pb-3 space-y-2 border-border shrink-0">
                    <div className="flex items-center justify-between">
                      <h3 className="text-sm font-bold text-foreground flex items-center gap-1.5">
                        <Building2 size={15} className="text-violet-600" /> Vendors List
                      </h3>
                      <span className="text-[11px] font-semibold text-muted-foreground">{filteredVendorAccounts.length} accounts</span>
                    </div>

                    {/* Search Input */}
                    <div className="relative">
                      <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
                      <input
                        type="text"
                        value={vendorSearch}
                        onChange={(e) => setVendorSearch(e.target.value)}
                        placeholder="Search vendor name or currency..."
                        className="w-full pl-8 pr-7 py-1.5 bg-background border rounded-xl text-xs placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-violet-500"
                      />
                      {vendorSearch && (
                        <button onClick={() => setVendorSearch('')} className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                          <X size={12} />
                        </button>
                      )}
                    </div>
                  </div>

                  <div className="flex-1 min-h-0 space-y-2 overflow-y-auto pr-1.5 pt-3">
                    {filteredVendorAccounts.length === 0 ? (
                      <p className="text-xs text-muted-foreground text-center py-6">No vendors match your search.</p>
                    ) : (
                      filteredVendorAccounts.map((account) => {
                        const isSelected = selectedVendor?.key === account.key;
                        return (
                          <button
                            key={account.key}
                            type="button"
                            onClick={() => setSelectedVendorKey(account.key)}
                            className={`w-full rounded-xl border p-3 text-left transition-all ${
                              isSelected
                                ? 'border-violet-500 bg-violet-500 text-white shadow-md'
                                : 'border-border bg-card hover:bg-muted/60 text-foreground'
                            }`}
                          >
                            <div className="flex items-center justify-between gap-2">
                              <span className="truncate text-xs font-bold">{account.name}</span>
                              <span className={`text-[10px] font-mono px-1.5 py-0.5 rounded font-bold shrink-0 ${
                                isSelected ? 'bg-white/20 text-white' : 'bg-muted text-muted-foreground'
                              }`}>
                                {account.currency}
                              </span>
                            </div>

                            <div className="mt-2.5 grid grid-cols-2 gap-2 text-[10px] border-t pt-2 border-current/15">
                              <div>
                                <span className={`block font-medium ${isSelected ? 'text-violet-100' : 'text-muted-foreground'}`}>
                                  BALANCE OWED
                                </span>
                                <strong className={`text-xs ${isSelected ? 'text-white' : account.balance > 0 ? 'text-amber-600 dark:text-amber-400 font-bold' : 'text-muted-foreground'}`}>
                                  {account.currency} {account.balance.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                </strong>
                              </div>
                              <div>
                                <span className={`block font-medium ${isSelected ? 'text-violet-100' : 'text-muted-foreground'}`}>
                                  TOTAL PAID
                                </span>
                                <strong className={`text-xs ${isSelected ? 'text-emerald-200' : 'text-emerald-600 dark:text-emerald-400'}`}>
                                  {account.currency} {account.amountPaid.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                </strong>
                              </div>
                            </div>
                          </button>
                        );
                      })
                    )}
                  </div>
                </aside>

                {/* Selected Vendor Detail Ledger Panel */}
                <section className="min-w-0 p-4 sm:p-6 bg-background space-y-5 flex-1 lg:h-full overflow-y-auto min-h-0">
                  {selectedVendor ? (
                    <>
                      {/* Vendor Header Summary Card */}
                      <div className="flex flex-wrap items-start justify-between gap-4 rounded-xl border border-violet-200 dark:border-violet-900/60 bg-violet-50/50 dark:bg-violet-950/20 p-4 shadow-xs">
                        <div>
                          <span className="text-[10px] font-bold uppercase tracking-wider text-violet-600 dark:text-violet-400 block">
                            Vendor Account Overview
                          </span>
                          <h3 className="mt-1 text-xl font-black text-foreground">{selectedVendor.name}</h3>
                          <p className="mt-1 text-xs text-muted-foreground font-medium">
                            {selectedVendor.entries.length} purchase and invoice records · {selectedVendor.currency}
                          </p>
                        </div>
                        <div className="grid grid-cols-2 gap-4 sm:gap-6 bg-card p-3 rounded-xl border">
                          <div>
                            <span className="block text-[10px] font-bold uppercase text-muted-foreground">Total Paid</span>
                            <strong className="text-sm font-black text-emerald-600 dark:text-emerald-400">
                              {selectedVendor.currency} {selectedVendor.amountPaid.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </strong>
                          </div>
                          <div>
                            <span className="block text-[10px] font-bold uppercase text-muted-foreground">Balance Owed</span>
                            <strong className="text-sm font-black text-amber-600 dark:text-amber-400">
                              {selectedVendor.currency} {selectedVendor.balance.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </strong>
                          </div>
                        </div>
                      </div>

                      {/* Ledger Transactions Table */}
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <h4 className="text-xs font-bold text-foreground uppercase tracking-wider">Account Ledger &amp; Invoices</h4>
                          <span className="text-[11px] text-muted-foreground">{selectedVendor.entries.length} entries</span>
                        </div>

                        <div className="overflow-hidden rounded-xl border bg-card shadow-xs">
                          <div className="overflow-x-auto">
                            <table className="w-full min-w-[680px] text-left text-xs">
                              <thead className="bg-muted/60 text-[10px] uppercase tracking-wider text-muted-foreground border-b">
                                <tr>
                                  <th className="px-4 py-3">Date</th>
                                  <th className="px-4 py-3">Invoice / PO Number</th>
                                  <th className="px-4 py-3">Description</th>
                                  <th className="px-4 py-3 text-right">Amount Paid</th>
                                  <th className="px-4 py-3 text-right">Balance Owed</th>
                                </tr>
                              </thead>
                              <tbody className="divide-y">
                                {selectedVendor.entries.map((entry) => (
                                  <tr key={entry.id} className="hover:bg-muted/40 transition">
                                    <td className="whitespace-nowrap px-4 py-3 text-muted-foreground font-mono">
                                      {entry.date
                                        ? /T\d{2}:\d{2}/.test(entry.date)
                                          ? new Date(entry.date).toLocaleString()
                                          : new Date(entry.date).toLocaleDateString()
                                        : '—'}
                                    </td>
                                    <td className="px-4 py-3 font-semibold">
                                      {entry.expense ? (
                                        <button
                                          type="button"
                                          onClick={() => setViewingExpense(entry.expense)}
                                          className="font-bold text-violet-600 dark:text-violet-400 hover:underline flex items-center gap-1 font-mono text-[11px]"
                                          title="View Operational Expense Claim"
                                        >
                                          <FileText size={12} className="text-violet-600 shrink-0" />
                                          {entry.invoiceNumber}
                                        </button>
                                      ) : (
                                        <button
                                          type="button"
                                          onClick={() => entry.purchaseOrder && setViewingPo(entry.purchaseOrder)}
                                          className="font-mono font-bold text-violet-600 dark:text-violet-400 hover:underline flex items-center gap-1 text-[11px]"
                                          title="View Purchase Order"
                                        >
                                          <ShoppingBag size={12} className="text-violet-600 shrink-0" />
                                          {entry.invoiceNumber}
                                        </button>
                                      )}
                                      {entry.payment && (
                                        <button
                                          type="button"
                                          onClick={async () => {
                                            try {
                                              const blob = await apiFetchBlob(`/api/v1/operational-expenses/${entry.expense.id}/payments/${entry.payment.id}/receipt`);
                                              openUniversalFileViewer({ blob, fileName: entry.payment.receipt_name || 'Payment receipt', title: 'Expense payment receipt' });
                                            } catch (error) {
                                              setBanner({ message: error instanceof Error ? error.message : 'Could not open payment receipt.', type: 'error' });
                                            }
                                          }}
                                          className="ml-2 inline-flex items-center gap-1 text-[10px] font-bold text-emerald-700 hover:underline"
                                          title="View receipt for this payment"
                                        >
                                          <Eye size={11} /> Receipt
                                        </button>
                                      )}
                                    </td>
                                    <td className="max-w-[320px] px-4 py-3 text-foreground">
                                      <span className="line-clamp-2">{entry.description}</span>
                                    </td>
                                    <td className="whitespace-nowrap px-4 py-3 text-right font-semibold text-emerald-600 dark:text-emerald-400 font-mono">
                                      {entry.currency} {entry.amountPaid.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                    </td>
                                    <td className="whitespace-nowrap px-4 py-3 text-right font-bold text-foreground font-mono">
                                      {entry.currency} {entry.balance.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                    </td>
                                  </tr>
                                ))}
                                {selectedVendor.entries.length === 0 && (
                                  <tr>
                                    <td colSpan={5} className="px-4 py-12 text-center text-muted-foreground">
                                      No purchase order or expense details recorded for this vendor.
                                    </td>
                                  </tr>
                                )}
                              </tbody>
                            </table>
                          </div>
                        </div>
                      </div>
                    </>
                  ) : (
                    <div className="flex flex-col items-center justify-center py-16 text-center space-y-2">
                      <Building2 className="h-10 w-10 text-muted-foreground/40" />
                      <p className="text-xs text-muted-foreground">Select a vendor from the list to view their ledger account.</p>
                    </div>
                  )}
                </section>
              </div>
            )}
          </div>
        );

      case 'PURCHASE_ORDERS': {
        const poCount = scopedPurchaseOrders.length;
        const totalPoSpend = scopedPurchaseOrders.reduce((sum, po) => sum + (Number(po.total_amount || po.total || 0)), 0);
        const receivedCount = scopedPurchaseOrders.filter((po) => String(po.status || '').toUpperCase() === 'RECEIVED' || String(po.status || '').toUpperCase() === 'COMPLETED').length;
        const pendingCount = scopedPurchaseOrders.filter((po) => ['WAITING_APPROVAL', 'PENDING', 'PARTIALLY_RECEIVED'].includes(String(po.status || '').toUpperCase())).length;

        return (
          <div className="space-y-6 w-full">
            {renderFilterBar()}

            {/* Header & New PO Action */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h2 className="font-bold text-xl text-foreground flex items-center gap-2">
                  <ShoppingBag className="h-6 w-6 text-violet-600" /> Purchase Orders &amp; Procurement Subledger
                </h2>
                <p className="text-xs text-muted-foreground">
                  Vendor purchase orders, line-item procurement commitments, and Goods Receipt Notes (GRN).
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowAddPoModal(true)}
                className="px-4 py-2 bg-violet-600 hover:bg-violet-700 text-white rounded-xl text-xs font-bold shadow-sm transition flex items-center gap-1.5 shrink-0"
              >
                <Plus size={15} /> Create Purchase Order
              </button>
            </div>

            {/* KPI Cards */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
              <div className="p-4 bg-card border rounded-2xl shadow-xs space-y-1">
                <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider block">Total POs Issued</span>
                <p className="text-2xl font-black text-violet-600">{poCount}</p>
                <span className="text-[10px] text-muted-foreground">Procurement vouchers</span>
              </div>
              <div className="p-4 bg-card border rounded-2xl shadow-xs space-y-1">
                <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider block">Total PO Spend</span>
                <p className="text-2xl font-black text-foreground">${totalPoSpend.toLocaleString()}</p>
                <span className="text-[10px] text-muted-foreground">Committed purchase total</span>
              </div>
              <div className="p-4 bg-card border rounded-2xl shadow-xs space-y-1">
                <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider block">Goods Received (GRN)</span>
                <p className="text-2xl font-black text-emerald-600">{receivedCount}</p>
                <span className="text-[10px] text-muted-foreground">Fulfilled orders</span>
              </div>
              <div className="p-4 bg-card border rounded-2xl shadow-xs space-y-1">
                <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider block">Pending Fulfillment</span>
                <p className="text-2xl font-black text-amber-600">{pendingCount}</p>
                <span className="text-[10px] text-muted-foreground">In transit / Open POs</span>
              </div>
            </div>

            {/* Purchase Orders Table */}
            <div className="space-y-3">
              <h3 className="font-bold text-base text-foreground flex items-center justify-between">
                <span>Issued Purchase Orders</span>
                <span className="text-xs text-muted-foreground font-normal">{scopedPurchaseOrders.length} orders</span>
              </h3>
              {scopedPurchaseOrders.length === 0 ? (
                <EmptyState message="No purchase orders found matching the filter scope. Click 'Create Purchase Order' to issue a new PO." />
              ) : (
                <div className="overflow-x-auto rounded-2xl border bg-card shadow-xs">
                  <table className="w-full text-xs">
                    <thead className="bg-muted/50 border-b">
                      <tr>
                        {['PO #', 'Order Date', 'Vendor / Supplier', 'Project Scope', 'Category', 'Items Count', 'Receipt', 'Total Amount', 'Finance Payments', 'Status', 'Actions'].map((h) => (
                          <th key={h} className="px-4 py-3 text-left font-bold text-muted-foreground uppercase tracking-wider">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {scopedPurchaseOrders.slice((scopedPurchaseOrdersPage - 1) * 15, scopedPurchaseOrdersPage * 15).map((po, i) => {
                        const poNum = po.po_number || po.number || `PO-${i + 1}`;
                        const vendor = po.supplier_name || po.vendor_name || po.vendor || po.supplier || 'Site Vendor';
                        const projName = projects.find((p) => String(p.id) === String(po.project_id))?.name || po.project_id || 'All Projects';
                        const amount = Number(po.total_amount || po.total || 0);
                        const curr = po.currency || 'USD';
                        const itemCount = Array.isArray(po.items) ? po.items.length : 1;

                        return (
                          <tr key={po.id || i} className="hover:bg-muted/30 transition">
                            <td className="px-4 py-3 font-mono font-bold text-foreground">{poNum}</td>
                            <td className="px-4 py-3 font-mono text-muted-foreground">{po.created_at ? new Date(po.created_at).toLocaleDateString() : '—'}</td>
                            <td className="px-4 py-3 font-medium text-foreground">{vendor}</td>
                            <td className="px-4 py-3 text-muted-foreground">{projName}</td>
                            <td className="px-4 py-3"><span className="rounded-full bg-violet-50 px-2 py-1 text-[10px] font-bold text-violet-700 dark:bg-violet-950/40 dark:text-violet-300">{purchaseOrderCategoryLabel(po.category)}</span></td>
                            <td className="px-4 py-3 font-mono text-muted-foreground">{itemCount} items</td>
                            <td className="px-4 py-3">
                              {po.attachment_file_name ? (
                                <div className="flex items-center gap-2">
                                  <button type="button" onClick={() => void viewPoAttachment(po)} className="text-violet-700 hover:underline font-bold text-[11px]" title={po.attachment_file_name}>{po.attachment_file_name}</button>
                                </div>
                              ) : (
                                <button
                                  type="button"
                                  onClick={() => handleDownloadPoFile(po)}
                                  className="inline-flex items-center gap-1 text-muted-foreground hover:text-foreground text-[11px] font-medium"
                                  title="View / Export PO Docket"
                                >
                                  <FileText size={12} /> Docket
                                </button>
                              )}
                            </td>
                            <td className="px-4 py-3 font-bold text-violet-600">{curr} ${amount.toLocaleString()}</td>
                            <td className="px-4 py-3"><div className="min-w-[210px] space-y-1.5"><div className="flex justify-between gap-2 rounded-md border border-violet-100 bg-violet-50 px-2 py-1.5 dark:border-violet-900 dark:bg-violet-950/30"><span className="text-muted-foreground">Paid to date</span><strong className="whitespace-nowrap">{curr} {Number(po.expense_paid_amount || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</strong></div>{(po.expense_payments || []).length ? po.expense_payments.map((payment: any, index: number) => <div key={payment.id} className="rounded-md border px-2 py-1.5"><div className="flex items-center justify-between gap-2"><span className="text-[10px] font-semibold text-muted-foreground">Installment {(po.expense_payments || []).length - index}</span><strong className="whitespace-nowrap">{curr} {Number(payment.amount || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</strong></div><div className="mt-0.5 flex items-center justify-between gap-2 text-[10px] text-muted-foreground"><span>{payment.payment_date ? new Date(`${payment.payment_date}T00:00:00`).toLocaleDateString() : 'Date unavailable'}</span>{payment.reference && <span className="max-w-24 truncate" title={payment.reference}>Ref: {payment.reference}</span>}</div>{payment.receipt_name ? <div className="mt-1 flex items-center gap-2 border-t pt-1"><span className="max-w-24 truncate text-[10px] text-muted-foreground" title={payment.receipt_name}>{payment.receipt_name}</span><button type="button" onClick={() => handleOpenFile(`/api/v1/operational-expenses/${payment.expense_id}/payments/${payment.id}/receipt`, payment.receipt_name || 'Payment receipt')} className="text-[10px] font-bold text-violet-700 hover:underline">View</button><button type="button" onClick={() => void downloadPurchaseOrderPaymentReceipt(payment)} className="text-[10px] font-bold text-violet-700 hover:underline">Download</button></div> : <span className="mt-1 block text-[10px] text-muted-foreground">No receipt attached</span>}</div>) : <span className="text-[10px] text-muted-foreground">No payments recorded</span>}</div></td>
                            <td className="px-4 py-3"><div className="flex flex-col items-start gap-1"><StatusBadge status={po.status || 'PENDING'} />{po.expense_raised && <ExpensePaymentBadge status={po.expense_status} />}</div></td>
                            <td className="px-4 py-3">
                              <div className="flex items-center gap-1.5">
                                <button
                                  type="button"
                                  onClick={() => setViewingPo(po)}
                                  className="p-1.5 rounded-lg bg-muted hover:bg-violet-100 text-violet-700 transition"
                                  title="View Detailed PO & Financial Breakdown"
                                >
                                  <Eye size={14} />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => openEditPoModal(po)}
                                  className="p-1.5 rounded-lg bg-muted hover:bg-violet-100 text-violet-700 transition"
                                  title="Edit Purchase Order Details"
                                >
                                  <Pencil size={14} />
                                </button>
                                {canReceivePurchaseOrder(po) && <button
                                  type="button"
                                  onClick={() => openReceiveModal(po)}
                                  className="p-1.5 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-700 transition"
                                  title="Receive Goods (GRN)"
                                >
                                  <Truck size={14} />
                                </button>}
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
              <div className="flex items-center justify-between mt-4 px-4 py-3 bg-slate-50 dark:bg-slate-800/50 border-t border-slate-200 dark:border-slate-800 rounded-b-2xl">
                <span className="text-xs text-slate-500 font-medium">
                  Showing {Math.min(1 + (scopedPurchaseOrdersPage - 1) * 15, scopedPurchaseOrders.length)} - {Math.min(scopedPurchaseOrdersPage * 15, scopedPurchaseOrders.length)} of {scopedPurchaseOrders.length} records
                </span>
                <div className="flex items-center gap-2">
                  <button 
                    onClick={() => setScopedPurchaseOrdersPage(p => Math.max(1, p - 1))} 
                    disabled={scopedPurchaseOrdersPage === 1}
                    className="px-3 py-1.5 text-xs font-bold border border-slate-200 dark:border-slate-700 rounded-lg disabled:opacity-40 disabled:cursor-not-allowed hover:bg-white dark:hover:bg-slate-800 transition"
                  >
                    Prev
                  </button>
                  <span className="text-xs font-bold px-2">
                    Page {scopedPurchaseOrdersPage} of {Math.max(1, Math.ceil(scopedPurchaseOrders.length / 15))}
                  </span>
                  <button 
                    onClick={() => setScopedPurchaseOrdersPage(p => Math.min(Math.ceil(scopedPurchaseOrders.length / 15), p + 1))} 
                    disabled={scopedPurchaseOrdersPage >= Math.ceil(scopedPurchaseOrders.length / 15)}
                    className="px-3 py-1.5 text-xs font-bold border border-slate-200 dark:border-slate-700 rounded-lg disabled:opacity-40 disabled:cursor-not-allowed hover:bg-white dark:hover:bg-slate-800 transition"
                  >
                    Next
                  </button>
                </div>
              </div>

                </div>
              )}
            </div>
          </div>
        );
      }

      case 'PROJECTS': {
        const filteredProjects = projects.filter((p) => {
          if (!projectSearch.trim()) return true;
          const q = projectSearch.toLowerCase().trim();
          return (
            (p.name && p.name.toLowerCase().includes(q)) ||
            (p.code && p.code.toLowerCase().includes(q)) ||
            (p.status && p.status.toLowerCase().includes(q)) ||
            ((p as any).client_name && String((p as any).client_name).toLowerCase().includes(q)) ||
            ((p as any).location && String((p as any).location).toLowerCase().includes(q))
          );
        });

        return (
          <div className="space-y-6 w-full">
            {renderFilterBar()}

            {/* Top Toolbar Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h2 className="font-bold text-xl text-foreground flex items-center gap-2">
                  <Briefcase className="h-6 w-6 text-violet-600" /> Project Sites &amp; Financial Allocations
                </h2>
                <p className="text-xs text-muted-foreground">
                  Overview of operational sites, allocated budgets, purchase order commitments, and subledger analytics.
                </p>
              </div>

              <div className="flex items-center gap-2 flex-wrap">
                <div className="relative">
                  <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                  <input
                    type="text"
                    placeholder="Search projects..."
                    value={projectSearch}
                    onChange={(e) => setProjectSearch(e.target.value)}
                    className="pl-8 pr-3 py-1.5 bg-card border rounded-lg text-xs w-44 sm:w-56 focus:outline-none focus:ring-2 focus:ring-violet-500"
                  />
                </div>
                {selectedProjectId && (
                  <button
                    onClick={() => setSelectedProjectId('')}
                    className="px-3 py-1.5 bg-violet-100 dark:bg-violet-950 text-violet-800 dark:text-violet-300 rounded-lg text-xs font-bold transition hover:bg-violet-200"
                  >
                    Clear Active Scope
                  </button>
                )}
              </div>
            </div>

            {/* Projects Grid matching Field Admin Portal card style */}
            {filteredProjects.length === 0 ? (
              <EmptyState message="No project sites found matching your search criteria." />
            ) : (
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {filteredProjects.map((p) => {
                  const pId = String(p.id);
                  const isFocused = String(selectedProjectId) === pId;

                  const linkedPOs = purchaseOrders.filter((po) => String(po.project_id) === pId);
                  const linkedInvoices = operationalExpenseRequests.filter((e) => String(e.project_id) === pId);
                  const linkedClaims = expenses.filter((c) => String(c.project_id) === pId);

                  return (
                    <div
                      key={p.id}
                      className={`bg-white dark:bg-slate-900 rounded-xl border p-5 space-y-4 transition-all hover:shadow-md ${
                        isFocused ? 'border-violet-500 ring-2 ring-violet-500/20' : 'border-slate-200 dark:border-slate-800'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <span className="text-[10px] font-bold uppercase tracking-wider text-violet-600 dark:text-violet-400">
                            {p.code || 'PROJECT'}
                          </span>
                          <h3 className="font-bold text-base text-slate-900 dark:text-white truncate mt-0.5">{p.name}</h3>
                          {((p as any).client_name || (p as any).location) && (
                            <p className="text-xs text-slate-500 truncate mt-0.5">
                              {(p as any).client_name ? `Client: ${(p as any).client_name}` : (p as any).location}
                            </p>
                          )}
                        </div>
                        <StatusBadge status={p.status || 'ACTIVE'} />
                      </div>

                      {/* 3-Column Metrics Row */}
                      <div className="grid grid-cols-3 gap-2 border-t border-b py-3 text-center dark:border-slate-800">
                        <div>
                          <span className="block text-[10px] text-slate-400 font-medium uppercase">Budget</span>
                          <span className="font-bold text-xs sm:text-sm text-slate-800 dark:text-slate-200 truncate block">
                            {p.budget != null ? `${p.currency || 'USD'} ${Number(p.budget).toLocaleString()}` : '—'}
                          </span>
                        </div>
                        <div>
                          <span className="block text-[10px] text-slate-400 font-medium uppercase">POs Logged</span>
                          <span className="font-bold text-xs sm:text-sm text-violet-600 dark:text-violet-400 block">
                            {linkedPOs.length}
                          </span>
                        </div>
                        <div>
                          <span className="block text-[10px] text-slate-400 font-medium uppercase">Invoices/Claims</span>
                          <span className="font-bold text-xs sm:text-sm text-slate-800 dark:text-slate-200 block">
                            {linkedInvoices.length + linkedClaims.length}
                          </span>
                        </div>
                      </div>

                      {/* Actions Footer */}
                      <div className="flex items-center justify-between gap-2 pt-1">
                        <button
                          type="button"
                          onClick={() => setViewingProject(p)}
                          className="px-3.5 py-1.5 bg-violet-600 hover:bg-violet-700 text-white text-xs font-bold rounded-lg transition inline-flex items-center gap-1.5 shadow-xs"
                        >
                          <Eye size={14} /> View Details
                        </button>

                        <button
                          type="button"
                          onClick={() => setSelectedProjectId(isFocused ? '' : pId)}
                          className={`px-3 py-1.5 text-xs font-bold rounded-lg transition inline-flex items-center gap-1 ${
                            isFocused
                              ? 'bg-emerald-600 text-white'
                              : 'border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300'
                          }`}
                        >
                          {isFocused ? (
                            <>
                              <CheckCircle2 size={13} /> Active Scope
                            </>
                          ) : (
                            <>
                              Filter Scope <ChevronRight size={13} />
                            </>
                          )}
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        );
      }

      case 'FUEL': {
        const totalFuelPurchasedL = scopedFuelDeliveries.reduce((sum, d) => sum + (Number(d.quantity_litres) || 0), 0);
        const totalFuelAllocatedL = scopedFuelAllocations.reduce((sum, a) => sum + (Number(a.quantity_litres) || 0), 0);
        const totalFuelCostUSD = scopedFuelDeliveries.reduce((sum, d) => sum + fuelDeliveryCost(d), 0);

        return (
          <div className="space-y-6 w-full">
            {renderFilterBar()}

            {/* Top Toolbar Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h2 className="font-bold text-xl text-foreground flex items-center gap-2">
                  <Fuel className="h-6 w-6 text-violet-600" /> Fuel Operations &amp; Accounting
                </h2>
                <p className="text-xs text-muted-foreground">
                  Bulk purchases, site allocations, receipt docket verification, and consumption analytics.
                </p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setShowFuelBoughtModal(true)}
                  className="px-3.5 py-2 bg-violet-600 hover:bg-violet-700 text-white rounded-xl text-xs font-bold shadow-sm transition flex items-center gap-1.5"
                >
                  <Plus size={15} /> Log Fuel Delivery
                </button>
                <button
                  onClick={() => setShowFuelAllocModal(true)}
                  className="px-3.5 py-2 bg-card hover:bg-muted text-foreground border rounded-xl text-xs font-bold shadow-sm transition flex items-center gap-1.5"
                >
                  <Plus size={15} /> Allocate Fuel to Asset
                </button>
              </div>
            </div>

            {/* KPI Cards */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
              <div className="p-4 bg-card border rounded-2xl shadow-xs space-y-1">
                <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider block">Total Fuel Purchased</span>
                <p className="text-2xl font-black text-violet-600">{totalFuelPurchasedL.toLocaleString()} <span className="text-xs font-bold text-muted-foreground">L</span></p>
                <span className="text-[10px] text-muted-foreground">Bulk supplier receipts</span>
              </div>
              <div className="p-4 bg-card border rounded-2xl shadow-xs space-y-1">
                <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider block">Total Fuel Allocated</span>
                <p className="text-2xl font-black text-emerald-600">{totalFuelAllocatedL.toLocaleString()} <span className="text-xs font-bold text-muted-foreground">L</span></p>
                <span className="text-[10px] text-muted-foreground">Issued to fleet assets</span>
              </div>
              <div className="p-4 bg-card border rounded-2xl shadow-xs space-y-1">
                <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider block">Total Fuel Expense</span>
                <p className="text-2xl font-black text-foreground">${totalFuelCostUSD.toLocaleString()}</p>
                <span className="text-[10px] text-muted-foreground">Financial subledger total</span>
              </div>
              <div className="p-4 bg-card border rounded-2xl shadow-xs space-y-1">
                <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider block">Unallocated Fuel Balance</span>
                <p className={`text-2xl font-black ${totalFuelPurchasedL - totalFuelAllocatedL < 0 ? 'text-red-600' : 'text-amber-600'}`}>
                  {(totalFuelPurchasedL - totalFuelAllocatedL).toLocaleString()} <span className="text-xs font-bold text-muted-foreground">L</span>
                </p>
                <span className="text-[10px] text-muted-foreground">Estimated site storage</span>
              </div>
            </div>

            {/* Fuel Volume & Cost Time Series Chart */}
            <div className="p-5 bg-card border rounded-2xl shadow-sm space-y-3">
              <div className="flex items-center justify-between border-b pb-3 border-border">
                <div className="flex items-center gap-2">
                  <div className="p-2 rounded-xl bg-violet-100 dark:bg-violet-950 text-violet-600">
                    <TrendingUp size={18} />
                  </div>
                  <div>
                    <h3 className="font-bold text-sm text-foreground">Fuel Purchased (L) &amp; Total Cost Trend ($)</h3>
                    <p className="text-[11px] text-muted-foreground">Daily breakdown of bulk fuel intake and cost accumulation</p>
                  </div>
                </div>
              </div>

              {fuelTimeSeriesData.length === 0 ? (
                <EmptyState message="No fuel deliveries or allocations found within the selected filter range." />
              ) : (
                <div className="h-72 w-full pt-2">
                  <ResponsiveContainer width="100%" height="100%">
                    <ComposedChart data={fuelTimeSeriesData} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="currentColor" className="text-border opacity-40" />
                      <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                      <YAxis yAxisId="left" orientation="left" stroke="#8b5cf6" tick={{ fontSize: 11 }} />
                      <YAxis yAxisId="right" orientation="right" stroke="#10b981" tick={{ fontSize: 11 }} />
                      <Tooltip
                        contentStyle={{ backgroundColor: 'var(--background)', borderRadius: '12px', border: '1px solid var(--border)' }}
                        formatter={(val: any, name: any) => [
                          name === 'totalCost' ? `$${Number(val).toLocaleString()}` : `${Number(val).toLocaleString()} L`,
                          name === 'litresPurchased' ? 'Litres Purchased' : name === 'litresAllocated' ? 'Litres Allocated' : 'Total Cost ($)'
                        ]}
                      />
                      <Legend />
                      <Bar yAxisId="left" dataKey="litresPurchased" fill="#8b5cf6" radius={[6, 6, 0, 0]} name="litresPurchased" />
                      <Bar yAxisId="left" dataKey="litresAllocated" fill="#10b981" radius={[6, 6, 0, 0]} name="litresAllocated" />
                      <Line yAxisId="right" type="monotone" dataKey="totalCost" stroke="#f59e0b" strokeWidth={3} dot={{ r: 4 }} name="totalCost" />
                    </ComposedChart>
                  </ResponsiveContainer>
                </div>
              )}
            </div>

            {/* Table 1: Recent Fuel Deliveries (Purchased) */}
            <div className="space-y-3">
              <h3 className="font-bold text-base text-foreground flex items-center justify-between">
                <span>Recent Bulk Fuel Deliveries (Purchased)</span>
                <span className="text-xs text-muted-foreground font-normal">{scopedFuelDeliveries.length} records</span>
              </h3>
              {scopedFuelDeliveries.length === 0 ? (
                <EmptyState message="No fuel deliveries logged." />
              ) : (
                <div className="overflow-x-auto rounded-2xl border bg-card shadow-xs">
                  <table className="w-full text-xs">
                    <thead className="bg-muted/50 border-b">
                      <tr>
                        {['Date', 'Ref #', 'Supplier', 'Litres', 'Unit Cost', 'Total Cost', 'Receipt Docket', 'Actions'].map((h) => (
                          <th key={h} className="px-4 py-3 text-left font-bold text-muted-foreground uppercase tracking-wider">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {scopedFuelDeliveries.slice((scopedFuelDeliveriesPage - 1) * 15, scopedFuelDeliveriesPage * 15).map((d) => {
                        const totalC = fuelDeliveryCost(d);
                        const unitC = fuelUnitCost(d);
                        const curr = fuelCostCurrency(d);
                        const attachmentMatch = (d.notes || '').match(/\[Attached Docket:\s*([^\]]+)\]/i);
                        const fileName = d.receipt_file_name || (attachmentMatch ? attachmentMatch[1] : d.attachment);
                        const canEdit = isEditableWithin2Days(d.recorded_at || d.delivered_at || d.created_at);

                        return (
                          <tr key={d.id} className="hover:bg-muted/30 transition">
                            <td className="px-4 py-3 font-mono">{d.recorded_at ? new Date(d.recorded_at).toLocaleDateString() : '—'}</td>
                            <td className="px-4 py-3 font-bold">{d.reference_number || d.id.slice(0, 8)}</td>
                            <td className="px-4 py-3">{d.supplier || 'Bulk Supply'}</td>
                            <td className="px-4 py-3 font-bold text-violet-600">{Number(d.quantity_litres).toLocaleString()} L</td>
                            <td className="px-4 py-3 font-mono">{unitC ? `${curr} ${unitC.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 4 })}` : '—'}</td>
                            <td className="px-4 py-3 font-bold text-foreground">{totalC ? `${curr} ${totalC.toLocaleString()}` : '—'}</td>
                            <td className="px-4 py-3">
                              {fileName ? (
                                <div className="flex items-center gap-1.5">
                                  <button
                                    type="button"
                                    onClick={() => setViewingReceiptDelivery(d)}
                                    className="inline-flex items-center gap-1 px-2 py-1 rounded bg-violet-50 dark:bg-violet-950/40 hover:bg-violet-100 dark:hover:bg-violet-900/60 border border-violet-200 dark:border-violet-800 text-[11px] font-mono font-semibold text-violet-800 dark:text-violet-300 transition"
                                    title="View Receipt Docket details"
                                  >
                                    <Paperclip size={12} className="text-violet-600 shrink-0" />
                                    <span className="truncate max-w-[110px]">{fileName}</span>
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => setViewingReceiptDelivery(d)}
                                    className="p-1 text-muted-foreground hover:text-violet-600 hover:bg-muted rounded transition"
                                    title="View Fuel Delivery Receipt & Docket"
                                  >
                                    <Download size={13} />
                                  </button>
                                </div>
                              ) : (
                                <button
                                  type="button"
                                  onClick={() => setViewingReceiptDelivery(d)}
                                  className="inline-flex items-center gap-1 px-2 py-1 text-[11px] font-medium text-muted-foreground hover:text-violet-600 hover:bg-muted rounded transition"
                                  title="View Fuel Delivery Docket"
                                >
                                  <FileText size={12} className="text-muted-foreground" /> View Docket
                                </button>
                              )}
                            </td>
                            <td className="px-4 py-3">
                              {canEdit ? (
                                <button
                                  type="button"
                                  onClick={() => {
                                    setEditingFuelDelivery(d);
                                    setEditFuelForm({
                                      recorded_at: d.recorded_at ? new Date(d.recorded_at).toISOString().slice(0, 16) : '',
                                      supplier: d.supplier || '',
                                      fuel_type: d.fuel_type || 'DIESEL',
                                      quantity_litres: String(d.quantity_litres || ''),
                                      unit_cost: unitC ? String(unitC) : '',
                                      total_cost: totalC ? String(totalC) : '',
                                      currency: curr,
                                      reference_number: d.reference_number || '',
                                      notes: (d.notes || '').replace(/\[Financial Info:\s*[^\]]+\]/gi, '').replace(/\[Attached Docket:\s*[^\]]+\]/gi, '').trim(),
                                      existingAttachment: fileName || '',
                                    });
                                    setShowEditFuelModal(true);
                                  }}
                                  className="p-1.5 rounded-lg bg-muted hover:bg-violet-100 text-violet-700 transition"
                                  title="Edit delivery (Within 2 days)"
                                >
                                  <Pencil size={14} />
                                </button>
                              ) : (
                                <span className="text-[10px] text-muted-foreground italic">Locked (&gt;2 days)</span>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
              <div className="flex items-center justify-between mt-4 px-4 py-3 bg-slate-50 dark:bg-slate-800/50 border-t border-slate-200 dark:border-slate-800 rounded-b-2xl">
                <span className="text-xs text-slate-500 font-medium">
                  Showing {Math.min(1 + (scopedFuelDeliveriesPage - 1) * 15, scopedFuelDeliveries.length)} - {Math.min(scopedFuelDeliveriesPage * 15, scopedFuelDeliveries.length)} of {scopedFuelDeliveries.length} records
                </span>
                <div className="flex items-center gap-2">
                  <button 
                    onClick={() => setScopedFuelDeliveriesPage(p => Math.max(1, p - 1))} 
                    disabled={scopedFuelDeliveriesPage === 1}
                    className="px-3 py-1.5 text-xs font-bold border border-slate-200 dark:border-slate-700 rounded-lg disabled:opacity-40 disabled:cursor-not-allowed hover:bg-white dark:hover:bg-slate-800 transition"
                  >
                    Prev
                  </button>
                  <span className="text-xs font-bold px-2">
                    Page {scopedFuelDeliveriesPage} of {Math.max(1, Math.ceil(scopedFuelDeliveries.length / 15))}
                  </span>
                  <button 
                    onClick={() => setScopedFuelDeliveriesPage(p => Math.min(Math.ceil(scopedFuelDeliveries.length / 15), p + 1))} 
                    disabled={scopedFuelDeliveriesPage >= Math.ceil(scopedFuelDeliveries.length / 15)}
                    className="px-3 py-1.5 text-xs font-bold border border-slate-200 dark:border-slate-700 rounded-lg disabled:opacity-40 disabled:cursor-not-allowed hover:bg-white dark:hover:bg-slate-800 transition"
                  >
                    Next
                  </button>
                </div>
              </div>

                </div>
              )}
            </div>

            {/* Table 2: Asset Fuel Allocations & Consumption Log */}
            <div className="space-y-3">
              <h3 className="font-bold text-base text-foreground flex items-center justify-between">
                <span>Asset Fuel Allocations &amp; Consumption Log</span>
                <span className="text-xs text-muted-foreground font-normal">{scopedFuelAllocations.length} records</span>
              </h3>
              {scopedFuelAllocations.length === 0 ? (
                <EmptyState message="No fuel allocations logged to equipment." />
              ) : (
                <div className="overflow-x-auto rounded-2xl border bg-card shadow-xs">
                  <table className="w-full text-xs">
                    <thead className="bg-muted/50 border-b">
                      <tr>
                        {['Date', 'Asset / Equipment', 'Litres Allocated', 'Odometer / Hours', 'Notes', 'Actions'].map((h) => (
                          <th key={h} className="px-4 py-3 text-left font-bold text-muted-foreground uppercase tracking-wider">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {scopedFuelAllocations.slice((scopedFuelAllocationsPage - 1) * 15, scopedFuelAllocationsPage * 15).map((a) => {
                        const assetMatch = assets.find((ast) => String(ast.id) === String(a.asset_id));
                        const assetName =
                          (assetMatch ? [assetMatch.asset_number || assetMatch.code, assetMatch.name || assetMatch.title || assetMatch.model].filter(Boolean).join(' - ') : '') ||
                          assetMatch?.name ||
                          a.asset_name ||
                          a.asset?.name ||
                          assetMatch?.asset_number ||
                          a.asset_number ||
                          (a.asset_id ? `Asset (${String(a.asset_id).slice(0, 8)})` : 'Unassigned Asset');
                        const dateStr = a.allocated_at || a.recorded_at || a.created_at;
                        const formattedDate = dateStr ? new Date(dateStr).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) : '—';
                        const canEditAlloc = isEditableWithin1Day(dateStr);

                        return (
                          <tr key={a.id} className="hover:bg-muted/30 transition">
                            <td className="px-4 py-3 font-mono">{formattedDate}</td>
                            <td className="px-4 py-3 font-bold text-foreground">{assetName}</td>
                            <td className="px-4 py-3 font-bold text-emerald-600">{Number(a.quantity_litres).toLocaleString()} L</td>
                            <td className="px-4 py-3 font-mono text-muted-foreground">
                              {a.odometer_km ? `${a.odometer_km} km` : a.operating_hours ? `${a.operating_hours} hrs` : '—'}
                            </td>
                            <td className="px-4 py-3 text-muted-foreground max-w-xs truncate">{a.notes || '—'}</td>
                            <td className="px-4 py-3">
                              {canEditAlloc ? (
                                <button
                                  type="button"
                                  onClick={() => {
                                    setEditingFuelAlloc(a);
                                    setEditAllocForm({
                                      asset_id: a.asset_id || '',
                                      delivery_id: a.delivery_id || '',
                                      quantity_litres: String(a.quantity_litres || ''),
                                      allocated_at: a.allocated_at ? new Date(a.allocated_at).toISOString().slice(0, 16) : '',
                                      odometer_km: String(a.odometer_km || ''),
                                      operating_hours: String(a.operating_hours || ''),
                                      notes: a.notes || '',
                                    });
                                    setShowEditFuelAllocModal(true);
                                  }}
                                  className="p-1.5 rounded-lg bg-muted hover:bg-violet-100 text-violet-700 transition"
                                  title="Edit allocation (Within 1 day)"
                                >
                                  <Pencil size={14} />
                                </button>
                              ) : (
                                <span className="text-[10px] text-muted-foreground italic">Locked (&gt;1 day)</span>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
              <div className="flex items-center justify-between mt-4 px-4 py-3 bg-slate-50 dark:bg-slate-800/50 border-t border-slate-200 dark:border-slate-800 rounded-b-2xl">
                <span className="text-xs text-slate-500 font-medium">
                  Showing {Math.min(1 + (scopedFuelAllocationsPage - 1) * 15, scopedFuelAllocations.length)} - {Math.min(scopedFuelAllocationsPage * 15, scopedFuelAllocations.length)} of {scopedFuelAllocations.length} records
                </span>
                <div className="flex items-center gap-2">
                  <button 
                    onClick={() => setScopedFuelAllocationsPage(p => Math.max(1, p - 1))} 
                    disabled={scopedFuelAllocationsPage === 1}
                    className="px-3 py-1.5 text-xs font-bold border border-slate-200 dark:border-slate-700 rounded-lg disabled:opacity-40 disabled:cursor-not-allowed hover:bg-white dark:hover:bg-slate-800 transition"
                  >
                    Prev
                  </button>
                  <span className="text-xs font-bold px-2">
                    Page {scopedFuelAllocationsPage} of {Math.max(1, Math.ceil(scopedFuelAllocations.length / 15))}
                  </span>
                  <button 
                    onClick={() => setScopedFuelAllocationsPage(p => Math.min(Math.ceil(scopedFuelAllocations.length / 15), p + 1))} 
                    disabled={scopedFuelAllocationsPage >= Math.ceil(scopedFuelAllocations.length / 15)}
                    className="px-3 py-1.5 text-xs font-bold border border-slate-200 dark:border-slate-700 rounded-lg disabled:opacity-40 disabled:cursor-not-allowed hover:bg-white dark:hover:bg-slate-800 transition"
                  >
                    Next
                  </button>
                </div>
              </div>

                </div>
              )}
            </div>
          </div>
        );
      }

      case 'EXPENSES': {
        const { totalExp, count, avgClaim, maxClaim, totalItemsCount } = expenseIntelligenceMetrics;

        return (
          <div className="space-y-6 w-full">
            {renderFilterBar()}

            {/* Header & Submit Button */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h2 className="font-bold text-xl text-foreground flex items-center gap-2">
                  <DollarSign className="h-6 w-6 text-violet-600" /> Operational Expenses
                </h2>
                <p className="text-xs text-muted-foreground">
                  Expenditure tracking, vendor analytics, frequency intelligence, and expense claim management.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowExpenseModal(true)}
                className="px-4 py-2 bg-violet-600 hover:bg-violet-700 text-white rounded-xl text-xs font-bold shadow-sm transition flex items-center gap-1.5 shrink-0"
              >
                <Plus size={15} /> Submit Operational Expense Claim
              </button>
            </div>

            {/* KPI Summary Cards */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
              <div className="p-4 bg-card border rounded-2xl shadow-xs space-y-1">
                <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider block">Total Expenditure</span>
                <p className="text-2xl font-black text-violet-600">${totalExp.toLocaleString()}</p>
                <span className="text-[10px] text-muted-foreground">All recorded vouchers</span>
              </div>
              <div className="p-4 bg-card border rounded-2xl shadow-xs space-y-1">
                <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider block">Total Claims</span>
                <p className="text-2xl font-black text-foreground">{count}</p>
                <span className="text-[10px] text-muted-foreground">Operational Expense Claims</span>
              </div>
              <div className="p-4 bg-card border rounded-2xl shadow-xs space-y-1">
                <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider block">Average Claim Value</span>
                <p className="text-2xl font-black text-emerald-600">${avgClaim.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
                <span className="text-[10px] text-muted-foreground">Mean expenditure per claim</span>
              </div>
              <div className="p-4 bg-card border rounded-2xl shadow-xs space-y-1">
                <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider block">Line Items Purchased</span>
                <p className="text-2xl font-black text-amber-600">{totalItemsCount}</p>
                <span className="text-[10px] text-muted-foreground">Purchased items count</span>
              </div>
            </div>

            {/* 1. Operational Expenditure & Expense Trend (Full Row FIRST) */}
            <div className="p-5 bg-card border rounded-2xl shadow-sm space-y-3">
              <div className="flex items-center justify-between border-b pb-3 border-border">
                <div className="flex items-center gap-2">
                  <div className="p-2 rounded-xl bg-violet-100 dark:bg-violet-950 text-violet-600">
                    <TrendingUp size={18} />
                  </div>
                  <div>
                    <h3 className="font-bold text-sm text-foreground">Operational Expenditure &amp; Expense Trend ($)</h3>
                    <p className="text-[11px] text-muted-foreground">Daily breakdown of total operational expenses ($) and approved expenditure</p>
                  </div>
                </div>
              </div>

              {expenseTimeSeriesData.length === 0 ? (
                <EmptyState message="No expense time-series data available for the selected range." />
              ) : (
                <div className="h-72 w-full pt-2">
                  <ResponsiveContainer width="100%" height="100%">
                    <ComposedChart data={expenseTimeSeriesData} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="currentColor" className="text-border opacity-40" />
                      <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                      <YAxis stroke="#8b5cf6" tick={{ fontSize: 11 }} />
                      <Tooltip
                        contentStyle={{ backgroundColor: 'var(--background)', borderRadius: '12px', border: '1px solid var(--border)' }}
                        formatter={(val: any) => [`$${Number(val).toLocaleString()}`]}
                      />
                      <Legend />
                      <Line type="monotone" dataKey="totalCost" stroke="#8b5cf6" strokeWidth={3} dot={{ r: 4 }} name="Total Expense Requested ($)" />
                      <Line type="monotone" dataKey="approvedCost" stroke="#10b981" strokeWidth={3} dot={{ r: 4 }} name="Approved Expenditure ($)" />
                    </ComposedChart>
                  </ResponsiveContainer>
                </div>
              )}
            </div>

            {/* 2. Purchasing Intelligence Bar Charts Grid (Collapsible, Collapsed by Default) */}
            <div className="mb-6 space-y-3">
              <button
                type="button"
                onClick={() => setShowPurchasingCharts((prev) => !prev)}
                className="w-full flex items-center justify-between p-3.5 bg-card hover:bg-muted/50 rounded-2xl border shadow-xs transition-colors text-left"
              >
                <div className="flex items-center gap-2.5">
                  <BarChart2 size={18} className="text-violet-600" />
                  <div>
                    <h4 className="font-bold text-xs uppercase tracking-wider text-foreground flex items-center gap-2">
                      Analytics &amp; Purchasing Intelligence Charts
                      <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-violet-100 text-violet-700 dark:bg-violet-950/60 dark:text-violet-300 normal-case">
                        {showPurchasingCharts ? 'Expanded' : 'Collapsed'}
                      </span>
                    </h4>
                    <p className="text-xs text-muted-foreground">Click to {showPurchasingCharts ? 'hide' : 'view'} expenditure, frequency, category, and vendor bar graphs</p>
                  </div>
                </div>
                {showPurchasingCharts ? <ChevronUp size={18} className="text-muted-foreground" /> : <ChevronDown size={18} className="text-muted-foreground" />}
              </button>

              {showPurchasingCharts && (() => {
                const renderFinCostCard = (items: any[], titleText: string) => (
                  <div className="p-4 bg-card border rounded-2xl shadow-xs space-y-3">
                    <h4 className="font-bold text-xs uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                      <DollarSign size={14} className="text-violet-600" /> {titleText}
                    </h4>
                    {items.length === 0 ? (
                      <p className="text-xs text-muted-foreground py-6 text-center">No cost item data</p>
                    ) : (
                      <div className="h-72 w-full">
                        <ResponsiveContainer width="100%" height="100%">
                          <BarChart data={items} layout="vertical" margin={{ top: 5, right: 15, left: 5, bottom: 5 }}>
                            <XAxis type="number" tick={{ fontSize: 9 }} tickFormatter={(v) => `$${v}`} />
                            <YAxis
                              type="category"
                              dataKey="name"
                              tick={{ fontSize: 10 }}
                              width={110}
                              tickFormatter={(v) => (String(v).length > 18 ? String(v).slice(0, 16) + '…' : String(v))}
                            />
                            <Tooltip formatter={(val: any) => [`$${Number(val).toLocaleString()}`, 'Total Cost']} />
                            <Bar dataKey="totalCost" fill="#8b5cf6" radius={[0, 4, 4, 0]} />
                          </BarChart>
                        </ResponsiveContainer>
                      </div>
                    )}
                  </div>
                );

                const renderFinFreqCard = (items: any[], titleText: string) => (
                  <div className="p-4 bg-card border rounded-2xl shadow-xs space-y-3">
                    <h4 className="font-bold text-xs uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                      <Package size={14} className="text-emerald-600" /> {titleText}
                    </h4>
                    {items.length === 0 ? (
                      <p className="text-xs text-muted-foreground py-6 text-center">No item frequency data</p>
                    ) : (
                      <div className="h-72 w-full">
                        <ResponsiveContainer width="100%" height="100%">
                          <BarChart data={items} layout="vertical" margin={{ top: 5, right: 15, left: 5, bottom: 5 }}>
                            <XAxis type="number" allowDecimals={false} tick={{ fontSize: 9 }} />
                            <YAxis
                              type="category"
                              dataKey="name"
                              tick={{ fontSize: 10 }}
                              width={110}
                              tickFormatter={(v) => (String(v).length > 18 ? String(v).slice(0, 16) + '…' : String(v))}
                            />
                            <Tooltip formatter={(val: any) => [`${Number(val)} times`, 'Purchase Frequency']} />
                            <Bar dataKey="frequency" fill="#10b981" radius={[0, 4, 4, 0]} />
                          </BarChart>
                        </ResponsiveContainer>
                      </div>
                    )}
                  </div>
                );

                const renderFinVendorCard = (items: any[], titleText: string) => (
                  <div className="p-4 bg-card border rounded-2xl shadow-xs space-y-3">
                    <h4 className="font-bold text-xs uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                      <Building2 size={14} className="text-amber-600" /> {titleText}
                    </h4>
                    {items.length === 0 ? (
                      <p className="text-xs text-muted-foreground py-6 text-center">No vendor data</p>
                    ) : (
                      <div className="h-72 w-full">
                        <ResponsiveContainer width="100%" height="100%">
                          <BarChart data={items} layout="vertical" margin={{ top: 5, right: 15, left: 5, bottom: 5 }}>
                            <XAxis type="number" tick={{ fontSize: 9 }} tickFormatter={(v) => `$${v}`} />
                            <YAxis
                              type="category"
                              dataKey="vendor"
                              tick={{ fontSize: 10 }}
                              width={110}
                              tickFormatter={(v) => (String(v).length > 18 ? String(v).slice(0, 16) + '…' : String(v))}
                            />
                            <Tooltip formatter={(val: any) => [`$${Number(val).toLocaleString()}`, 'Vendor Spend']} />
                            <Bar dataKey="totalCost" fill="#f59e0b" radius={[0, 4, 4, 0]} />
                          </BarChart>
                        </ResponsiveContainer>
                      </div>
                    )}
                  </div>
                );

                return (
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mt-3">
                    {/* Top Cost Items */}
                    {renderFinCostCard(topItemsByCostData, "Top Purchased Items by Cost ($)")}

                    {/* Most Frequently Purchased Items */}
                    {renderFinFreqCard(topItemsByFrequencyData, "Most Frequently Purchased Items")}

                    {/* Purchase orders by category */}
                    <PurchaseOrderCategoryChart orders={scopedPurchaseOrders?.length ? scopedPurchaseOrders : operationalExpenseRequests} color="#7c3aed" />

                    {/* Vendor Expenditure */}
                    {renderFinVendorCard(topVendorData, "Vendor Breakdown ($)")}
                  </div>
                );
              })()}
            </div>

            {/* 3. Submitted Expenses & Finance Status Table (FIRST Table) */}
            <div className="space-y-3">
              <h3 className="font-bold text-base text-foreground flex items-center justify-between">
                <span>Submitted Operational Expense Claims &amp; Status</span>
                <span className="text-xs text-muted-foreground font-normal">{scopedOperationalExpenseRequests.length} claims</span>
              </h3>
              {scopedOperationalExpenseRequests.length === 0 ? (
                <EmptyState message="No operational expense claims submitted yet." />
              ) : (
                <div className="overflow-x-auto rounded-2xl border bg-card shadow-xs">
                  <table className="w-full text-xs">
                    <thead className="bg-muted/50 border-b">
                      <tr>
                        {['Date', 'Submitted By', 'Ref # / Payee', 'Payment Method', 'Total Amount', 'Receipt Docket', 'Payments', 'Status', 'Actions'].map((h) => (
                          <th key={h} className="px-4 py-3 text-left font-bold text-muted-foreground uppercase tracking-wider">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {scopedOperationalExpenseRequests.slice((scopedOperationalExpenseRequestsPage - 1) * 15, scopedOperationalExpenseRequestsPage * 15).map((exp) => {
                        const cost = Number(exp.total_cost || exp.amount || 0);
                        const fileName = exp.invoice_name || exp.receipt_name || exp.receipt_file_name || exp.attachment || null;
                        const sName = exp.submitted_by_name || exp.submitted_by?.full_name || (exp.submitted_by?.first_name ? `${exp.submitted_by.first_name} ${exp.submitted_by.last_name || ''}`.trim() : null) || exp.created_by_name || (user?.first_name ? `${user.first_name} ${user.last_name || ''}`.trim() : 'Operations Supervisor');
                        const sPos = exp.submitted_by_position || exp.submitted_by_title || exp.submitted_by?.job_title || exp.submitted_by?.role || (user?.is_superuser ? 'Operations Director' : user?.portal_type ? `${user.portal_type.replace('_', ' ')} Admin` : 'Field Administrator');
                        const sEmail = exp.submitted_by_email || exp.submitted_by?.email || exp.email || user?.email || 'operations@cestos.com';

                        return (
                          <tr key={exp.id} className="hover:bg-muted/30 transition">
                            <td className="px-4 py-3 font-mono">{exp.expense_date ? new Date(exp.expense_date).toLocaleDateString() : '—'}</td>
                            <td className="px-4 py-3 space-y-0.5">
                              <div className="font-bold text-foreground flex items-center gap-1">
                                <User size={12} className="text-violet-600 shrink-0" />
                                <span>{sName}</span>
                              </div>
                              <div className="text-[11px] text-muted-foreground font-medium flex items-center gap-1">
                                <Briefcase size={11} className="text-slate-400 shrink-0" />
                                <span>{sPos}</span>
                              </div>
                              <div>
                                <a
                                  href={`mailto:${sEmail}`}
                                  onClick={(e) => e.stopPropagation()}
                                  className="inline-flex items-center gap-1 text-violet-600 dark:text-violet-400 hover:text-violet-800 dark:hover:text-violet-300 font-mono text-[11px] font-bold underline"
                                  title={`Send email to ${sName}`}
                                >
                                  <Mail size={11} className="shrink-0" />
                                  {sEmail}
                                </a>
                              </div>
                            </td>
                            <td className="px-4 py-3 font-bold text-foreground">{exp.pay_to_name || exp.reference_number || exp.id.slice(0, 8)}</td>
                            <td className="px-4 py-3 font-medium text-muted-foreground">{exp.payment_method || 'MOBILE_MONEY'}</td>
                            <td className="px-4 py-3 font-bold text-violet-600">${cost.toLocaleString()}</td>
                            <td className="px-4 py-3">
                              {fileName ? (
                                <button
                                  type="button"
                                  onClick={async () => {
                                    const kind = exp.invoice_name || exp.invoice_path ? 'invoice' : 'receipt';
                                    const fileUrl = `/api/v1/operational-expenses/${exp.id}/files/${kind}`;
                                    try {
                                      const blob = await apiFetchBlob(fileUrl);
                                      openUniversalFileViewer({ blob, fileName, title: `Receipt Docket: ${fileName}` });
                                    } catch (err: any) {
                                      setBanner({ type: 'error', message: err?.message || 'Failed to open docket file.' });
                                    }
                                  }}
                                  className="inline-flex items-center gap-1.5 text-violet-600 hover:text-violet-800 dark:text-violet-400 dark:hover:text-violet-300 font-bold underline text-xs cursor-pointer"
                                  title={`Click to view docket file: ${fileName}`}
                                >
                                  <Paperclip size={13} className="shrink-0" />
                                  <span className="max-w-[150px] truncate">{fileName}</span>
                                </button>
                              ) : (
                                <span className="text-muted-foreground text-[11px]">No docket</span>
                              )}
                            </td>
                            <td className="px-4 py-3"><div className="min-w-[205px] space-y-1.5"><div className="flex justify-between gap-2 rounded-md border border-violet-100 bg-violet-50 px-2 py-1.5 dark:border-violet-900 dark:bg-violet-950/30"><span className="text-muted-foreground">Paid to date</span><strong className="whitespace-nowrap">${Number(exp.paid_amount || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</strong></div><div className="flex justify-between gap-2 px-1 text-[10px] text-muted-foreground"><span>Balance</span><span className="whitespace-nowrap">${Number(exp.balance_due ?? Math.max(0, cost - Number(exp.paid_amount || 0))).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span></div>{Array.isArray(exp.payments) && exp.payments.length ? exp.payments.map((payment: any, index: number) => <div key={payment.id} className="rounded-md border px-2 py-1.5"><div className="flex justify-between gap-2"><span className="text-[10px] font-semibold text-muted-foreground">Installment {exp.payments.length - index}</span><strong className="whitespace-nowrap">${Number(payment.amount || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</strong></div><div className="mt-0.5 flex items-center justify-between gap-2 text-[10px] text-muted-foreground"><span>{payment.payment_date ? new Date(`${payment.payment_date}T00:00:00`).toLocaleDateString() : 'Date unavailable'}</span>{payment.reference && <span className="max-w-20 truncate" title={payment.reference}>Ref: {payment.reference}</span>}</div>{payment.receipt_name ? <div className="mt-1 flex items-center gap-2 border-t pt-1"><span className="max-w-20 truncate text-[10px] text-muted-foreground" title={payment.receipt_name}>{payment.receipt_name}</span><button type="button" onClick={() => handleOpenFile(`/api/v1/operational-expenses/${exp.id}/payments/${payment.id}/receipt`, payment.receipt_name || 'Payment receipt')} className="text-[10px] font-bold text-violet-700 hover:underline">View</button><button type="button" onClick={() => void downloadPurchaseOrderPaymentReceipt({ ...payment, expense_id: exp.id })} className="text-[10px] font-bold text-violet-700 hover:underline">Download</button></div> : <span className="mt-1 block text-[10px] text-muted-foreground">No receipt attached</span>}</div>) : <span className="text-[10px] text-muted-foreground">No payments recorded</span>}</div></td>
                            <td className="px-4 py-3"><StatusBadge status={exp.status || 'SUBMITTED'} /></td>
                            <td className="px-4 py-3">
                              <button
                                type="button"
                                onClick={() => {
                                  setViewingExpense(exp);
                                }}
                                className="p-1.5 rounded-lg bg-muted hover:bg-violet-100 text-violet-700 transition"
                                title="View Claim Details"
                              >
                                <Eye size={14} />
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
              <div className="flex items-center justify-between mt-4 px-4 py-3 bg-slate-50 dark:bg-slate-800/50 border-t border-slate-200 dark:border-slate-800 rounded-b-2xl">
                <span className="text-xs text-slate-500 font-medium">
                  Showing {Math.min(1 + (scopedOperationalExpenseRequestsPage - 1) * 15, scopedOperationalExpenseRequests.length)} - {Math.min(scopedOperationalExpenseRequestsPage * 15, scopedOperationalExpenseRequests.length)} of {scopedOperationalExpenseRequests.length} records
                </span>
                <div className="flex items-center gap-2">
                  <button 
                    onClick={() => setScopedOperationalExpenseRequestsPage(p => Math.max(1, p - 1))} 
                    disabled={scopedOperationalExpenseRequestsPage === 1}
                    className="px-3 py-1.5 text-xs font-bold border border-slate-200 dark:border-slate-700 rounded-lg disabled:opacity-40 disabled:cursor-not-allowed hover:bg-white dark:hover:bg-slate-800 transition"
                  >
                    Prev
                  </button>
                  <span className="text-xs font-bold px-2">
                    Page {scopedOperationalExpenseRequestsPage} of {Math.max(1, Math.ceil(scopedOperationalExpenseRequests.length / 15))}
                  </span>
                  <button 
                    onClick={() => setScopedOperationalExpenseRequestsPage(p => Math.min(Math.ceil(scopedOperationalExpenseRequests.length / 15), p + 1))} 
                    disabled={scopedOperationalExpenseRequestsPage >= Math.ceil(scopedOperationalExpenseRequests.length / 15)}
                    className="px-3 py-1.5 text-xs font-bold border border-slate-200 dark:border-slate-700 rounded-lg disabled:opacity-40 disabled:cursor-not-allowed hover:bg-white dark:hover:bg-slate-800 transition"
                  >
                    Next
                  </button>
                </div>
              </div>

                </div>
              )}
            </div>

            {/* 4. Site Operational Cost Subledger Log (SECOND Table) */}
            <div className="space-y-3">
              <h3 className="font-bold text-base text-foreground flex items-center justify-between">
                <span>Site Operational Cost Subledger Log</span>
                <span className="text-xs text-muted-foreground font-normal">{scopedExpenses.length} entries</span>
              </h3>
              {scopedExpenses.length === 0 ? (
                <EmptyState message="No cost subledger entries found." />
              ) : (
                <div className="overflow-x-auto rounded-2xl border bg-card shadow-xs">
                  <table className="w-full text-xs">
                    <thead className="bg-muted/50 border-b">
                      <tr>
                        {['Entry Date', 'Category', 'Description', 'Amount', 'Ref #'].map((h) => (
                          <th key={h} className="px-4 py-3 text-left font-bold text-muted-foreground uppercase tracking-wider">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {scopedExpenses.slice((scopedExpensesPage - 1) * 15, scopedExpensesPage * 15).map((c, i) => (
                        <tr key={c.id || i} className="hover:bg-muted/30 transition">
                          <td className="px-4 py-3 font-mono">{c.posted_at ? new Date(c.posted_at).toLocaleString() : c.entry_date || c.created_at?.slice(0, 10) || '—'}</td>
                          <td className="px-4 py-3 font-bold">{c.cost_category || 'OPERATIONAL'}</td>
                          <td className="px-4 py-3 text-muted-foreground">{c.description || '—'}</td>
                          <td className="px-4 py-3 font-bold text-foreground">{c.currency || 'USD'} {Number(c.total_cost ?? c.amount ?? 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                          <td className="px-4 py-3 font-mono text-muted-foreground" title={String(c.source_entity_id || c.id || '')}>{c.reference_number || (c.source_entity_id || c.id ? String(c.source_entity_id || c.id).slice(0, 8).toUpperCase() : '—')}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
              <div className="flex items-center justify-between mt-4 px-4 py-3 bg-slate-50 dark:bg-slate-800/50 border-t border-slate-200 dark:border-slate-800 rounded-b-2xl">
                <span className="text-xs text-slate-500 font-medium">
                  Showing {Math.min(1 + (scopedExpensesPage - 1) * 15, scopedExpenses.length)} - {Math.min(scopedExpensesPage * 15, scopedExpenses.length)} of {scopedExpenses.length} records
                </span>
                <div className="flex items-center gap-2">
                  <button 
                    onClick={() => setScopedExpensesPage(p => Math.max(1, p - 1))} 
                    disabled={scopedExpensesPage === 1}
                    className="px-3 py-1.5 text-xs font-bold border border-slate-200 dark:border-slate-700 rounded-lg disabled:opacity-40 disabled:cursor-not-allowed hover:bg-white dark:hover:bg-slate-800 transition"
                  >
                    Prev
                  </button>
                  <span className="text-xs font-bold px-2">
                    Page {scopedExpensesPage} of {Math.max(1, Math.ceil(scopedExpenses.length / 15))}
                  </span>
                  <button 
                    onClick={() => setScopedExpensesPage(p => Math.min(Math.ceil(scopedExpenses.length / 15), p + 1))} 
                    disabled={scopedExpensesPage >= Math.ceil(scopedExpenses.length / 15)}
                    className="px-3 py-1.5 text-xs font-bold border border-slate-200 dark:border-slate-700 rounded-lg disabled:opacity-40 disabled:cursor-not-allowed hover:bg-white dark:hover:bg-slate-800 transition"
                  >
                    Next
                  </button>
                </div>
              </div>

                </div>
              )}
            </div>
          </div>
        );
      }
    }
  }

  // ─── Layout (Matching Field Admin Top Navigation Header Layout) ─────────────

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col font-sans">
      {/* Top Header Bar */}
      <header className="bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 sticky top-0 z-40 shadow-xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3 flex items-center justify-between gap-4">
          {/* Logo & Portal Title */}
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-violet-600 flex items-center justify-center text-white shadow-sm shrink-0">
              <DollarSign size={20} />
            </div>
            <div>
              <h1 className="font-bold text-base leading-tight text-slate-900 dark:text-white">
                Finance Portal
              </h1>
              <p className="text-[11px] text-violet-600 dark:text-violet-400 font-medium">Financial Operations &amp; Intelligence</p>
            </div>
          </div>

          {/* Right Header Actions */}
          <div className="flex items-center gap-3">
            <button
              onClick={reload}
              className="p-2 text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition"
              title="Refresh Portal Data"
            >
              <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin text-violet-600' : ''}`} />
            </button>


            <button
              onClick={() => setActiveTab('NOTIFICATIONS')}
              className={`relative p-2 rounded-xl border transition ${
                notificationCount > 0
                  ? 'border-violet-300 dark:border-violet-800 bg-violet-50/80 dark:bg-violet-950/50 text-violet-600 dark:text-violet-400'
                  : 'border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300'
              }`}
              title={notificationCount > 0 ? `${notificationCount} new notifications` : 'Notifications'}
            >
              <Bell size={16} className={notificationCount > 0 ? 'text-violet-600 dark:text-violet-400 animate-pulse' : ''} />
              {notificationCount > 0 && (
                <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 bg-red-500 text-white text-[9px] font-bold rounded-full flex items-center justify-center border-2 border-white dark:border-slate-950 shadow-xs">
                  {notificationCount > 99 ? '99+' : notificationCount}
                </span>
              )}
            </button>

            <button
              onClick={() => void signOut()}
              className="p-2 rounded-xl border border-slate-200 dark:border-slate-800 hover:bg-red-50 dark:hover:bg-red-950/40 text-slate-600 dark:text-slate-300 hover:text-red-600 dark:hover:text-red-400 transition"
              title="Sign Out"
            >
              <LogOut size={16} />
            </button>

            
            <button
              onClick={() => router.push('/finance-portal/my-profile')}
              className="hidden md:flex items-center gap-2 pl-3 border-l border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/50 p-1.5 -my-1.5 rounded-lg transition text-left"
              title="View My Profile"
            >
              <div className="w-8 h-8 rounded-full bg-violet-600 text-white font-bold text-xs flex items-center justify-center shadow-xs">
                {user?.first_name ? user.first_name[0] : 'U'}
              </div>
              <div className="text-left text-xs">
                <p className="font-bold text-slate-900 dark:text-slate-100 leading-tight">
                  {user?.first_name ? `${user.first_name} ${user.last_name || ''}`.trim() : 'User'}
                </p>
                <p className="text-[10px] text-slate-500 font-medium">View My Profile</p>
              </div>
            </button>

            <button className="!hidden p-1.5 text-slate-600" onClick={() => setMobileMenuOpen(!mobileMenuOpen)}>
              {mobileMenuOpen ? <X size={22} /> : <Menu size={22} />}
            </button>
          </div>
        </div>

        {/* Top Horizontal Navigation Bar in Requested Order */}
        <nav className={`border-t border-slate-100 dark:border-slate-800 ${mobileMenuOpen ? 'block' : 'hidden sm:block'}`}>
          <div className="flex overflow-x-auto scrollbar-hide px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
            {navItems.map((t) => {
              const Icon = t.icon;
              const active = activeTab === t.id;
              return (
                <button
                  key={t.id}
                  onClick={() => { setActiveTab(t.id); setMobileMenuOpen(false); }}
                  className={`flex items-center gap-2 px-3 py-2.5 text-xs font-bold whitespace-nowrap border-b-2 transition-colors ${
                    active
                      ? 'border-violet-600 text-violet-700 dark:text-violet-400 bg-violet-50/50 dark:bg-violet-950/30'
                      : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-900'
                  }`}
                >
                  <Icon size={15} />
                  <span>{t.label}</span>
                  {(t.id === 'OPERATIONAL_EXPENSES' || t.id === 'EXPENSES') && unresolvedClaimsCount > 0 && (
                    <span className="ml-1 inline-flex items-center justify-center px-1.5 py-0.5 rounded-full text-[10px] font-extrabold bg-amber-500 text-white shadow-xs animate-pulse">
                      {unresolvedClaimsCount}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </nav>
      </header>

      {/* Alert Banner */}
      {banner && (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-4 w-full">
          <Banner message={banner.message} type={banner.type} onClose={() => setBanner(null)} />
        </div>
      )}

      {/* Main Content Area */}
      <main className="flex-1 px-4 sm:px-6 lg:px-8 py-4 max-w-7xl mx-auto w-full space-y-4 pb-24 md:pb-6">
        {renderContent()}
      </main>

      {/* MODALS */}
      {showExpenseModal && (
        <OperationalExpenseSubmissionModal
          onClose={() => setShowExpenseModal(false)}
          onSubmitted={() => { setShowExpenseModal(false); reload(); setBanner({ type: 'success', message: 'Operational Expense claim submitted successfully.' }); }}
        />
      )}

      {/* Create Purchase Order Modal */}
      {showAddPoModal && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs overflow-y-auto">
              <div className="bg-card border rounded-2xl p-6 max-w-6xl w-full max-h-[92vh] overflow-y-auto space-y-5 shadow-2xl my-8">
            <div className="flex items-center justify-between border-b pb-3 border-border">
              <h3 className="font-bold text-base flex items-center gap-2 text-foreground">
                <ShoppingBag className="h-5 w-5 text-violet-600" /> Create Purchase Order
              </h3>
              <button onClick={() => setShowAddPoModal(false)} className="p-1 rounded-lg hover:bg-muted text-muted-foreground"><X size={18} /></button>
            </div>

            <form onSubmit={handleCreatePo} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-foreground mb-1">Vendor / Supplier Name *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Caterpillar Machinery Corp"
                    value={newPoForm.supplier_name}
                    onChange={(e) => setNewPoForm({ ...newPoForm, supplier_name: e.target.value })}
                    className="w-full p-2.5 border rounded-xl bg-background text-xs"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-foreground mb-1">Project Assignment</label>
                  <select
                    value={newPoForm.project_id}
                    onChange={(e) => setNewPoForm({ ...newPoForm, project_id: e.target.value })}
                    className="w-full p-2.5 border rounded-xl bg-background text-xs"
                  >
                    <option value="">Organization-Wide (All Projects)</option>
                    {projects.map((p) => (
                      <option key={p.id} value={p.id}>{p.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-foreground mb-1">Category (Optional)</label>
                <PurchaseOrderCategoryField value={newPoForm.category} onChange={(category) => setNewPoForm({ ...newPoForm, category })} className="w-full p-2.5 border rounded-xl bg-background text-xs" />
              </div>
              <div>
                <label className="block text-xs font-bold text-foreground mb-1">Currency &amp; Notes</label>
                <div className="grid grid-cols-3 gap-2">
                  <select
                    value={newPoForm.currency}
                    onChange={(e) => setNewPoForm({ ...newPoForm, currency: e.target.value })}
                    className="p-2.5 border rounded-xl bg-background text-xs font-bold"
                  >
                    <option value="USD">USD ($)</option>
                    <option value="EUR">EUR (€)</option>
                    <option value="GBP">GBP (£)</option>
                    <option value="ZAR">ZAR (R)</option>
                  </select>
                  <input
                    type="text"
                    placeholder="Purchase Order Notes / Specifications"
                    value={newPoForm.notes}
                    onChange={(e) => setNewPoForm({ ...newPoForm, notes: e.target.value })}
                    className="col-span-2 p-2.5 border rounded-xl bg-background text-xs"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-foreground mb-1">Attachment / Quote Docket (Optional)</label>
                <input
                  type="file"
                  onChange={(e) => setPoAttachmentFile(e.target.files?.[0] || null)}
                  className="w-full p-2 border rounded-xl bg-background text-xs text-muted-foreground file:mr-3 file:py-1 file:px-2.5 file:rounded-lg file:border-0 file:text-xs file:font-bold file:bg-violet-50 file:text-violet-700 hover:file:bg-violet-100"
                />
                {poAttachmentFile && (
                  <p className="text-[11px] text-violet-600 font-medium mt-1 flex items-center gap-1">
                    <Paperclip size={12} /> {poAttachmentFile.name} ({(poAttachmentFile.size / 1024).toFixed(1)} KB)
                  </p>
                )}
              </div>

              {/* Line Items List */}
              <div className="space-y-2 border-t pt-3">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-foreground uppercase tracking-wider">Purchase Order Line Items</label>
                  <button
                    type="button"
                    onClick={() => setNewPoForm({
                      ...newPoForm,
                      items: [...newPoForm.items, { item_name: '', description: '', quantity_ordered: 1, unit_price: 0 }],
                    })}
                    className="text-xs font-bold text-violet-600 hover:underline flex items-center gap-1"
                  >
                    <Plus size={13} /> Add Item
                  </button>
                </div>

                {newPoForm.items.map((it, idx) => (
                  <div key={idx} className="grid grid-cols-1 md:grid-cols-12 gap-3 p-4 border rounded-xl bg-muted/30">
                    <label className="md:col-span-3 space-y-1.5 text-[11px] font-semibold text-muted-foreground">Item / Service
                      <input type="text" placeholder="e.g. Hydraulic filter" value={it.item_name || ''} onChange={(e) => {
                        const updated = [...newPoForm.items]; updated[idx].item_name = e.target.value; setNewPoForm({ ...newPoForm, items: updated });
                      }} className="w-full p-2.5 border rounded-lg bg-background text-xs text-foreground" />
                    </label>
                    <label className="md:col-span-5 space-y-1.5 text-[11px] font-semibold text-muted-foreground">Description *
                      <textarea required rows={1} maxLength={255} placeholder="Specification, purpose, or additional details" value={it.description} onChange={(e) => {
                        const updated = [...newPoForm.items]; updated[idx].description = e.target.value; setNewPoForm({ ...newPoForm, items: updated });
                      }} className="w-full p-2.5 border rounded-lg bg-background text-xs text-foreground resize-y" />
                    </label>
                    <label className="md:col-span-2 space-y-1.5 text-[11px] font-semibold text-muted-foreground">Quantity
                      <input type="number" min="1" value={it.quantity_ordered} onChange={(e) => {
                        const updated = [...newPoForm.items]; updated[idx].quantity_ordered = Number(e.target.value) || 1; setNewPoForm({ ...newPoForm, items: updated });
                      }} className="w-full p-2.5 border rounded-lg bg-background text-xs font-mono text-center text-foreground" />
                    </label>
                    <label className="md:col-span-2 space-y-1.5 text-[11px] font-semibold text-muted-foreground">Unit price
                      <input type="number" min="0" step="0.01" value={it.unit_price} onChange={(e) => {
                        const updated = [...newPoForm.items]; updated[idx].unit_price = Number(e.target.value) || 0; setNewPoForm({ ...newPoForm, items: updated });
                      }} className="w-full p-2.5 border rounded-lg bg-background text-xs font-mono text-right text-foreground" />
                    </label>
                    {newPoForm.items.length > 1 && (
                      <button
                        type="button"
                        onClick={() => {
                          const updated = newPoForm.items.filter((_, i) => i !== idx);
                          setNewPoForm({ ...newPoForm, items: updated });
                        }}
                        className="p-1 text-red-500 hover:text-red-700"
                      >
                        <Trash2 size={14} />
                      </button>
                    )}
                  </div>
                ))}
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t">
                <button
                  type="button"
                  onClick={() => { setShowAddPoModal(false); setPoAttachmentFile(null); }}
                  className="px-4 py-2 border rounded-xl text-xs font-bold hover:bg-muted"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={poSubmitBusy}
                  className="px-5 py-2 bg-violet-600 text-white font-bold rounded-xl text-xs hover:bg-violet-700 flex items-center gap-1.5"
                >
                  {poSubmitBusy ? <RefreshCw className="h-4 w-4 animate-spin" /> : <CheckCircle2 size={15} />}
                  Issue Purchase Order
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* View PO Details Modal */}
      {viewingPo && (() => {
        const poItems = Array.isArray(viewingPo.items) ? viewingPo.items : [];
        const totalOrdered = poItems.reduce((acc: number, it: any) => acc + (Number(it.quantity_ordered || 1) * Number(it.unit_price || 0)), 0) || Number(viewingPo.total_amount || viewingPo.total || 0);
        const totalReceived = poItems.reduce((acc: number, it: any) => acc + (Number(it.quantity_received || 0) * Number(it.unit_price || 0)), 0);
        const remaining = totalOrdered - totalReceived;
        const projectName = projects.find((p) => String(p.id) === String(viewingPo.project_id))?.name || viewingPo.project_id || 'Organization-Wide';
        const notes = (viewingPo.notes || '').replace(/\[Attached Docket:\s*([^\]]+)\]/gi, '').trim();

        return (
          <div className="fixed inset-0 bg-slate-950/75 z-[9999] flex items-center justify-center p-0 sm:p-4 overflow-hidden">
            <div className="bg-white dark:bg-slate-900 w-full h-full sm:h-auto sm:max-h-[90vh] max-w-full sm:max-w-4xl border-0 sm:border border-slate-200 dark:border-slate-800 rounded-none sm:rounded-2xl shadow-2xl flex flex-col overflow-hidden">
              {/* Sticky Header */}
              <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 px-4 py-3.5 sm:px-6 sm:py-4 bg-white dark:bg-slate-900 shrink-0 sticky top-0 z-10">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-lg bg-violet-50 dark:bg-violet-950/40 text-violet-600 flex items-center justify-center font-bold">
                    <ShoppingBag size={18} />
                  </div>
                  <div>
                    <h3 className="font-bold text-base text-slate-900 dark:text-white">
                      Purchase Order Details
                    </h3>
                    <p className="text-xs text-slate-500 font-mono">
                      PO #: {viewingPo.po_number || viewingPo.id}
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setViewingPo(null)}
                  className="p-1.5 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 hover:text-slate-900 dark:hover:text-white transition"
                >
                  <X size={20} />
                </button>
              </div>

              {/* Content Body */}
              <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6 bg-white dark:bg-slate-900">
                {/* Summary Header Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 p-5 rounded-xl border border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900">
                  {/* Left Column (User specified layout) */}
                  <div className="space-y-3.5">
                    <div>
                      <span className="text-[10px] font-extrabold uppercase tracking-widest text-slate-400 block">Supplier</span>
                      <h4 className="text-lg font-black text-slate-900 dark:text-white mt-0.5">
                        {viewingPo.supplier_name || viewingPo.vendor_name || viewingPo.vendor || viewingPo.supplier || 'Site Vendor'}
                      </h4>
                    </div>

                    <div>
                      <span className="text-[10px] font-extrabold uppercase tracking-widest text-slate-400 block">Project</span>
                      <span className="text-sm font-bold text-slate-800 dark:text-slate-200 mt-0.5 block">{projectName}</span>
                    </div>

                    <div>
                      <span className="text-[10px] font-extrabold uppercase tracking-widest text-slate-400 block">Category</span>
                      <span className="text-sm font-semibold text-slate-700 dark:text-slate-300 mt-0.5 block">{purchaseOrderCategoryLabel(viewingPo.category)}</span>
                    </div>

                    <div>
                      <span className="text-[10px] font-extrabold uppercase tracking-widest text-slate-400 block">Total Amount</span>
                      <span className="text-lg font-black text-emerald-600 mt-0.5 block">
                        USD {Number(totalOrdered).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </span>
                    </div>

                    <div>
                      <span className="text-[10px] font-extrabold uppercase tracking-widest text-slate-400 block mb-1">Status</span>
                      <StatusBadge status={viewingPo.status || 'PENDING'} />
                    </div>
                  </div>

                  {/* Right Column */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 p-4 rounded-xl border border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 text-sm">
                    <div>
                      <span className="block text-[10px] uppercase font-bold text-slate-400">PO Number</span>
                      <span className="font-mono font-medium text-slate-700 dark:text-slate-200">{viewingPo.po_number || viewingPo.id}</span>
                    </div>
                    <div>
                      <span className="block text-[10px] uppercase font-bold text-slate-400">Requested By</span>
                      <span className="font-medium text-slate-700 dark:text-slate-200">{viewingPo.created_by_name || '—'}</span>
                    </div>
                    <div>
                      <span className="block text-[10px] uppercase font-bold text-slate-400">Order Date</span>
                      <span className="font-medium text-slate-700 dark:text-slate-200">{viewingPo.created_at ? new Date(viewingPo.created_at).toLocaleString() : '—'}</span>
                    </div>
                    <div>
                      <span className="block text-[10px] uppercase font-bold text-slate-400">Goods Received</span>
                      <span className="font-bold text-emerald-600">USD {totalReceived.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                    </div>
                    <div className="sm:col-span-2">
                      <span className="block text-[10px] uppercase font-bold text-slate-400">Remaining Open</span>
                      <span className="font-bold text-amber-600">USD {(remaining > 0 ? remaining : 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                    </div>
                    {notes && (
                      <div className="sm:col-span-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                        <span className="block text-[10px] uppercase font-bold text-slate-400">Notes / Specifications</span>
                        <span className="font-medium text-slate-700 dark:text-slate-200 whitespace-pre-wrap">{notes}</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Line Items Breakdown Table */}
                <div className="rounded-xl border border-slate-100 dark:border-slate-800 overflow-hidden bg-white dark:bg-slate-900">
                  <div className="px-4 py-2.5 border-b border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 text-xs font-bold uppercase tracking-wide text-slate-700 dark:text-slate-300">
                    Order Line Items Breakdown
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs">
                      <thead className="border-b border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-400 font-extrabold text-[10px] uppercase">
                        <tr>
                          <th className="px-4 py-2.5">Item / Service</th>
                          <th className="px-4 py-2.5">Description</th>
                          <th className="px-4 py-2.5 text-center">Ordered</th>
                          <th className="px-4 py-2.5 text-center">Received</th>
                          <th className="px-4 py-2.5 text-right">Unit Price</th>
                          <th className="px-4 py-2.5 text-right">Line Total</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                        {poItems.map((it: any, idx: number) => {
                          const qtyOrd = Number(it.quantity_ordered) || 1;
                          const qtyRec = Number(it.quantity_received) || 0;
                          const price = Number(it.unit_price) || 0;
                          return (
                            <tr key={idx} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30">
                              <td className="px-4 py-3 font-semibold text-slate-800 dark:text-slate-200">{it.item_name || it.description || 'Line Item'}</td>
                              <td className="px-4 py-3 font-medium text-slate-600 dark:text-slate-400 whitespace-pre-wrap">{it.description || '—'}</td>
                              <td className="px-4 py-3 font-mono text-center text-slate-700 dark:text-slate-300">{qtyOrd}</td>
                              <td className="px-4 py-3 font-mono text-center text-emerald-600 font-bold">{qtyRec}</td>
                              <td className="px-4 py-3 font-mono text-right text-slate-700 dark:text-slate-300">${price.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                              <td className="px-4 py-3 font-mono text-right font-bold text-slate-900 dark:text-white">${(qtyOrd * price).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                            </tr>
                          );
                        })}
                        {poItems.length === 0 && (
                          <tr>
                            <td colSpan={6} className="px-4 py-6 text-center text-slate-400 italic">No line items recorded.</td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>

              {/* Sticky Footer */}
              <div className="flex items-center justify-between border-t border-slate-100 dark:border-slate-800 px-4 py-3 sm:px-6 bg-white dark:bg-slate-900 shrink-0">
                <span className="text-xs text-slate-400 font-mono">Status: {viewingPo.status || 'PENDING'}</span>
                <div className="flex items-center gap-2">
                  {viewingPo.attachment_file_name ? (
                    <button
                      type="button"
                      onClick={() => void viewPoAttachment(viewingPo)}
                      className="px-4 py-2 bg-violet-600 hover:bg-violet-700 text-white font-bold rounded-lg text-xs flex items-center gap-1.5 transition"
                    >
                      <Eye size={14} /> View Quotation / Supporting Document
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => void handleDownloadPoFile(viewingPo)}
                      className="px-4 py-2 bg-violet-600 hover:bg-violet-700 text-white font-bold rounded-lg text-xs flex items-center gap-1.5 transition"
                    >
                      <Eye size={14} /> View Generated PO Docket
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => { const targetPo = viewingPo; setViewingPo(null); openEditPoModal(targetPo); }}
                    className="px-3.5 py-2 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-bold hover:bg-slate-50 dark:hover:bg-slate-800 transition flex items-center gap-1"
                  >
                    <Pencil size={13} /> Edit PO
                  </button>
                  <button
                    type="button"
                    onClick={() => setViewingPo(null)}
                    className="px-4 py-2 border border-slate-200 dark:border-slate-700 rounded-lg font-semibold text-xs hover:bg-slate-50 dark:hover:bg-slate-800 transition"
                  >
                    Close
                  </button>
                </div>
              </div>
            </div>
          </div>
        );
      })()}

      {/* Edit Purchase Order Modal */}
      {editingPo && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs overflow-y-auto">
          <div className="bg-card border rounded-2xl p-6 max-w-5xl w-full max-h-[92vh] overflow-y-auto space-y-5 shadow-2xl my-8">
            <div className="flex items-center justify-between border-b pb-3 border-border">
              <h3 className="font-bold text-base flex items-center gap-2 text-foreground">
                <Pencil className="h-5 w-5 text-violet-600" /> Edit Purchase Order: {editingPo.po_number || editingPo.id}
              </h3>
              <button onClick={() => setEditingPo(null)} className="p-1 rounded-lg hover:bg-muted text-muted-foreground"><X size={18} /></button>
            </div>

            <form onSubmit={handleUpdatePo} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-foreground mb-1">Vendor / Supplier Name *</label>
                  <input
                    type="text"
                    required
                    placeholder="Vendor / Supplier Name"
                    value={editPoForm.supplier_name}
                    onChange={(e) => setEditPoForm({ ...editPoForm, supplier_name: e.target.value })}
                    className="w-full p-2.5 border rounded-xl bg-background text-xs"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-foreground mb-1">Project Assignment</label>
                  <select
                    value={editPoForm.project_id}
                    onChange={(e) => setEditPoForm({ ...editPoForm, project_id: e.target.value })}
                    className="w-full p-2.5 border rounded-xl bg-background text-xs"
                  >
                    <option value="">Organization-Wide (All Projects)</option>
                    {projects.map((p) => (
                      <option key={p.id} value={p.id}>{p.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-foreground mb-1">Status</label>
                  <select
                    value={String(editPoForm.status || '').replaceAll('_', ' ')}
                    onChange={(e) => setEditPoForm({ ...editPoForm, status: e.target.value })}
                    className="w-full p-2.5 border rounded-xl bg-background text-xs font-bold"
                  >
                    <option value="DRAFT">DRAFT</option>
                    <option value="PENDING">PENDING</option>
                    <option value="APPROVED">APPROVED</option>
                    <option value="COMPLETED">COMPLETED</option>
                    <option value="CANCELLED">CANCELLED</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-foreground mb-1">Currency</label>
                  <select
                    value={editPoForm.currency}
                    onChange={(e) => setEditPoForm({ ...editPoForm, currency: e.target.value })}
                    className="w-full p-2.5 border rounded-xl bg-background text-xs font-bold"
                  >
                    <option value="USD">USD ($)</option>
                    <option value="EUR">EUR (€)</option>
                    <option value="GBP">GBP (£)</option>
                    <option value="ZAR">ZAR (R)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-foreground mb-1">Category (Optional)</label>
                  <PurchaseOrderCategoryField value={editPoForm.category} onChange={(category) => setEditPoForm({ ...editPoForm, category })} className="w-full p-2.5 border rounded-xl bg-background text-xs" />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-foreground mb-1">Attachment Docket File</label>
                {editPoForm.existingAttachment && !editPoAttachmentFile && (
                  <p className="text-[11px] text-muted-foreground mb-1.5 flex items-center gap-1">
                    <Paperclip size={12} className="text-violet-600" /> Current attached file: <strong>{editPoForm.existingAttachment}</strong>
                  </p>
                )}
                <input
                  type="file"
                  onChange={(e) => setEditPoAttachmentFile(e.target.files?.[0] || null)}
                  className="w-full p-2 border rounded-xl bg-background text-xs text-muted-foreground file:mr-3 file:py-1 file:px-2.5 file:rounded-lg file:border-0 file:text-xs file:font-bold file:bg-violet-50 file:text-violet-700 hover:file:bg-violet-100"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-foreground mb-1">Operational Notes</label>
                <input
                  type="text"
                  placeholder="Purchase Order Notes / Specifications"
                  value={editPoForm.notes}
                  onChange={(e) => setEditPoForm({ ...editPoForm, notes: e.target.value })}
                  className="w-full p-2.5 border rounded-xl bg-background text-xs"
                />
              </div>

              {/* Line Items List */}
              <div className="space-y-2 border-t pt-3">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-foreground uppercase tracking-wider">Purchase Order Line Items</label>
                  <button
                    type="button"
                    onClick={() => setEditPoForm({
                      ...editPoForm,
                      items: [...editPoForm.items, { item_name: '', description: '', quantity_ordered: 1, unit_price: 0 }],
                    })}
                    className="text-xs font-bold text-violet-600 hover:underline flex items-center gap-1"
                  >
                    <Plus size={13} /> Add Item
                  </button>
                </div>

                {editPoForm.items.map((it, idx) => (
                  <div key={idx} className="grid grid-cols-1 md:grid-cols-12 gap-3 p-4 border rounded-xl bg-muted/30">
                    <label className="md:col-span-3 space-y-1.5 text-[11px] font-semibold text-muted-foreground">Item / Service
                      <input type="text" placeholder="e.g. Hydraulic filter" value={it.item_name || ''} onChange={(e) => {
                        const updated = [...editPoForm.items]; updated[idx].item_name = e.target.value; setEditPoForm({ ...editPoForm, items: updated });
                      }} className="w-full p-2.5 border rounded-lg bg-background text-xs text-foreground" />
                    </label>
                    <label className="md:col-span-5 space-y-1.5 text-[11px] font-semibold text-muted-foreground">Description *
                      <textarea required rows={1} maxLength={255} placeholder="Specification, purpose, or additional details" value={it.description} onChange={(e) => {
                        const updated = [...editPoForm.items]; updated[idx].description = e.target.value; setEditPoForm({ ...editPoForm, items: updated });
                      }} className="w-full p-2.5 border rounded-lg bg-background text-xs text-foreground resize-y" />
                    </label>
                    <label className="md:col-span-2 space-y-1.5 text-[11px] font-semibold text-muted-foreground">Quantity
                      <input type="number" min="1" value={it.quantity_ordered} onChange={(e) => {
                        const updated = [...editPoForm.items]; updated[idx].quantity_ordered = Number(e.target.value) || 1; setEditPoForm({ ...editPoForm, items: updated });
                      }} className="w-full p-2.5 border rounded-lg bg-background text-xs font-mono text-center text-foreground" />
                    </label>
                    <label className="md:col-span-2 space-y-1.5 text-[11px] font-semibold text-muted-foreground">Unit price
                      <input type="number" min="0" step="0.01" value={it.unit_price} onChange={(e) => {
                        const updated = [...editPoForm.items]; updated[idx].unit_price = Number(e.target.value) || 0; setEditPoForm({ ...editPoForm, items: updated });
                      }} className="w-full p-2.5 border rounded-lg bg-background text-xs font-mono text-right text-foreground" />
                    </label>
                    {editPoForm.items.length > 1 && (
                      <button
                        type="button"
                        onClick={() => {
                          const updated = editPoForm.items.filter((_, i) => i !== idx);
                          setEditPoForm({ ...editPoForm, items: updated });
                        }}
                        className="p-1 text-red-500 hover:text-red-700"
                      >
                        <Trash2 size={14} />
                      </button>
                    )}
                  </div>
                ))}
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t">
                <button
                  type="button"
                  onClick={() => setEditingPo(null)}
                  className="px-4 py-2 border rounded-xl text-xs font-bold hover:bg-muted"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={poSubmitBusy}
                  className="px-5 py-2 bg-violet-600 text-white font-bold rounded-xl text-xs hover:bg-violet-700 flex items-center gap-1.5"
                >
                  {poSubmitBusy ? <RefreshCw className="h-4 w-4 animate-spin" /> : <CheckCircle2 size={15} />}
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Goods Receipt (GRN) Modal */}
      {receivingPo && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs">
          <div className="bg-card border rounded-2xl p-6 max-w-3xl w-full max-h-[90vh] overflow-y-auto space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b pb-3">
              <h3 className="font-bold text-base flex items-center gap-2">
                <PackageCheck className="h-5 w-5 text-emerald-600" /> Receive Goods (GRN): {receivingPo.po_number || receivingPo.id}
              </h3>
              <button onClick={() => setReceivingPo(null)} className="p-1 rounded-lg hover:bg-muted text-muted-foreground"><X size={18} /></button>
            </div>

            <form onSubmit={handleReceiveGoods} className="space-y-4">
              {(() => {
                const outstandingItems = (receivingPo.items || []).filter((item: any) =>
                  Number(item.quantity_ordered || 0) > Number(item.quantity_received || 0),
                );
                const selectedItems = outstandingItems.filter((item: any) => selectedReceiptItemIds.includes(String(item.id)));
                const selectedQuantity = selectedItems.reduce((sum: number, item: any) => sum + Math.min(
                  Math.max(0, Number(receiptQuantities[item.id]) || 0),
                  Number(item.quantity_ordered || 0) - Number(item.quantity_received || 0),
                ), 0);
                const allSelected = outstandingItems.length > 0 && outstandingItems.every((item: any) => selectedReceiptItemIds.includes(String(item.id)));
                return <>
                  <div className="grid grid-cols-3 gap-2">
                    <div className="rounded-xl border p-3"><span className="block text-[10px] font-bold uppercase tracking-wide text-muted-foreground">Outstanding lines</span><strong className="text-lg">{outstandingItems.length}</strong></div>
                    <div className="rounded-xl border p-3"><span className="block text-[10px] font-bold uppercase tracking-wide text-muted-foreground">Selected lines</span><strong className="text-lg text-violet-600">{selectedItems.length}</strong></div>
                    <div className="rounded-xl border p-3"><span className="block text-[10px] font-bold uppercase tracking-wide text-muted-foreground">Quantity to receive</span><strong className="text-lg text-emerald-600">{selectedQuantity.toLocaleString()}</strong></div>
                  </div>
                  <p className="text-xs text-muted-foreground">Select the line items included in this delivery, then enter the quantity received for each. Unchecked items remain outstanding for a later receipt.</p>
                  <div className="border rounded-xl overflow-x-auto text-xs">
                    <table className="w-full">
                      <thead className="bg-muted/60 border-b">
                        <tr>
                          <th className="p-3 text-center"><input aria-label="Select all outstanding line items" type="checkbox" checked={allSelected} disabled={outstandingItems.length === 0} onChange={(event) => setSelectedReceiptItemIds(event.target.checked ? outstandingItems.map((item: any) => String(item.id)) : [])} className="h-4 w-4 accent-violet-600" /></th>
                          <th className="p-3 text-left">Line item</th>
                          <th className="p-3 text-center">Ordered</th>
                          <th className="p-3 text-center">Received</th>
                          <th className="p-3 text-center">Outstanding</th>
                          <th className="p-3 text-center">Receive now</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y">
                        {(receivingPo.items || []).map((item: any, idx: number) => {
                          const itemId = String(item.id || item.description || idx);
                          const outstanding = Math.max(0, Number(item.quantity_ordered || 0) - Number(item.quantity_received || 0));
                          const checked = selectedReceiptItemIds.includes(itemId);
                          const disabled = outstanding <= 0;
                          return <tr key={itemId} className={checked ? 'bg-violet-50/60 dark:bg-violet-950/20' : ''}>
                            <td className="p-3 text-center"><input aria-label={`Select ${item.item_name || item.description} for receipt`} type="checkbox" checked={checked} disabled={disabled} onChange={(event) => setSelectedReceiptItemIds((current) => event.target.checked ? [...current, itemId] : current.filter((id) => id !== itemId))} className="h-4 w-4 accent-violet-600 disabled:opacity-40" /></td>
                            <td className="p-3 min-w-48"><span className="font-semibold">{item.item_name || item.description}</span>{item.item_name && <span className="block text-muted-foreground">{item.description}</span>}{disabled && <span className="mt-1 inline-flex rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-bold text-emerald-700">Fully received</span>}</td>
                            <td className="p-3 text-center font-mono">{Number(item.quantity_ordered || 0).toLocaleString()}</td>
                            <td className="p-3 text-center font-mono">{Number(item.quantity_received || 0).toLocaleString()}</td>
                            <td className="p-3 text-center font-mono font-bold text-amber-600">{outstanding.toLocaleString()}</td>
                            <td className="p-3 text-center"><input aria-label={`Quantity received for ${item.item_name || item.description}`} type="number" min="0" max={outstanding} step="0.01" disabled={!checked || disabled} value={checked ? (receiptQuantities[itemId] ?? outstanding) : 0} onChange={(event) => setReceiptQuantities({ ...receiptQuantities, [itemId]: Math.min(outstanding, Math.max(0, Number(event.target.value) || 0)) })} className="w-24 p-2 border rounded-lg bg-background text-center font-mono disabled:opacity-40" /></td>
                          </tr>;
                        })}
                        {outstandingItems.length === 0 && <tr><td colSpan={6} className="p-6 text-center text-muted-foreground">All line items have been received.</td></tr>}
                      </tbody>
                    </table>
                  </div>
                </>;
              })()}

              <div className="flex justify-end gap-2 pt-2 border-t">
                <button
                  type="button"
                  onClick={() => setReceivingPo(null)}
                  className="px-4 py-2 border rounded-xl text-xs font-bold hover:bg-muted"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={poSubmitBusy || selectedReceiptItemIds.length === 0 || selectedReceiptItemIds.every((itemId) => !(Number(receiptQuantities[itemId]) > 0))}
                  className="px-4 py-2 bg-emerald-600 text-white font-bold rounded-xl text-xs hover:bg-emerald-700 flex items-center gap-1.5"
                >
                  {poSubmitBusy ? <RefreshCw className="h-4 w-4 animate-spin" /> : <PackageCheck size={15} />}
                  {selectedReceiptItemIds.length ? `Record receipt for ${selectedReceiptItemIds.length} line${selectedReceiptItemIds.length === 1 ? '' : 's'}` : 'Select items to receive'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Fuel Receipt View Modal */}
      {viewingReceiptDelivery && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs">
          <div className="bg-card border rounded-2xl p-6 max-w-lg w-full space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b pb-3">
              <h3 className="font-bold text-base flex items-center gap-2">
                <Paperclip className="h-5 w-5 text-violet-600" /> Fuel Receipt Docket
              </h3>
              <button onClick={() => setViewingReceiptDelivery(null)} className="p-1 rounded-lg hover:bg-muted text-muted-foreground"><X size={18} /></button>
            </div>
            <div className="p-4 bg-muted/40 rounded-xl space-y-2 text-xs font-mono">
              <p><strong>Ref #:</strong> {viewingReceiptDelivery.reference_number || viewingReceiptDelivery.id}</p>
              <p><strong>Supplier:</strong> {viewingReceiptDelivery.supplier || 'Site Bulk Supply'}</p>
              <p><strong>Litres:</strong> {viewingReceiptDelivery.quantity_litres} L</p>
              <p><strong>Total Cost:</strong> ${fuelDeliveryCost(viewingReceiptDelivery).toLocaleString()}</p>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              {viewingReceiptDelivery.receipt_file_name && (
                <button
                  type="button"
                  onClick={() => openUniversalFileViewer({
                    fileUrl: `/api/v1/field-portal/fuel-deliveries/${viewingReceiptDelivery.id}/receipt`,
                    fileName: viewingReceiptDelivery.receipt_file_name,
                    title: 'Fuel delivery receipt and docket',
                  })}
                  className="px-4 py-2 border border-violet-200 text-violet-700 font-bold rounded-xl text-xs hover:bg-violet-50 flex items-center gap-1.5"
                >
                  <Eye size={14} /> View Uploaded Receipt
                </button>
              )}
              <button
                type="button"
                onClick={() => handleDownloadFuelReceipt(viewingReceiptDelivery)}
                className="px-4 py-2 bg-violet-600 text-white font-bold rounded-xl text-xs hover:bg-violet-700 flex items-center gap-1.5"
              >
                <Download size={14} /> Download Receipt Docket
              </button>
            </div>
          </div>
        </div>
      )}

      {/* View Operational Expense Voucher Modal */}
      {viewingExpense && (() => {
        const vName = viewingExpense.submitted_by_name || viewingExpense.submitted_by?.full_name || (viewingExpense.submitted_by?.first_name ? `${viewingExpense.submitted_by.first_name} ${viewingExpense.submitted_by.last_name || ''}`.trim() : null) || viewingExpense.created_by_name || (user?.first_name ? `${user.first_name} ${user.last_name || ''}`.trim() : 'Operations Supervisor');
        const vPos = viewingExpense.submitted_by_position || viewingExpense.submitted_by_title || viewingExpense.submitted_by?.job_title || viewingExpense.submitted_by?.role || (user?.is_superuser ? 'Operations Director' : user?.portal_type ? `${user.portal_type.replace('_', ' ')} Admin` : 'Field Administrator');
        const vEmail = viewingExpense.submitted_by_email || viewingExpense.submitted_by?.email || viewingExpense.email || user?.email || 'operations@cestos.com';

        return (
          <div className="fixed inset-0 bg-slate-950/75 z-[9999] flex items-center justify-center p-0 sm:p-4 overflow-hidden">
            <div className="bg-white dark:bg-slate-900 w-full h-full sm:h-auto sm:max-h-[90vh] max-w-full sm:max-w-4xl border-0 sm:border border-slate-200 dark:border-slate-800 rounded-none sm:rounded-2xl shadow-2xl flex flex-col overflow-hidden">
              {/* Sticky Header */}
              <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 px-4 py-3.5 sm:px-6 sm:py-4 bg-white dark:bg-slate-900 shrink-0 sticky top-0 z-10">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-lg bg-violet-50 dark:bg-violet-950/40 text-violet-600 flex items-center justify-center font-bold">
                    <DollarSign size={18} />
                  </div>
                  <div>
                    <h3 className="font-bold text-base text-slate-900 dark:text-white">
                      Operational Expense Voucher
                    </h3>
                    <p className="text-xs text-slate-500 font-mono">
                      Ref #: {viewingExpense.expense_number || viewingExpense.reference_number || `EXP-${String(viewingExpense.id).slice(0, 8)}`}
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setViewingExpense(null)}
                  className="p-1.5 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 hover:text-slate-900 dark:hover:text-white transition"
                >
                  <X size={20} />
                </button>
              </div>

              {/* Content Body */}
              <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6 bg-white dark:bg-slate-900">
                {/* Summary Header Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 p-5 rounded-xl border border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900">
                  {/* Left Column */}
                  <div className="space-y-4">
                    <div>
                      <span className="text-[10px] font-extrabold uppercase tracking-widest text-violet-600">Official Expense Claim</span>
                      <h4 className="text-lg font-black text-slate-900 dark:text-white mt-1">
                        {viewingExpense.pay_to_name || 'Operational Vendor'}
                      </h4>
                      <p className="text-xs text-slate-500 mt-1">
                        Payment Method: {(viewingExpense.payment_method || 'MOBILE_MONEY').replace(/_/g, ' ').replace(/\b\w/g, (c: string) => c.toUpperCase())}
                      </p>
                    </div>

                    <div className="flex items-center gap-3 pt-1">
                      <StatusBadge status={viewingExpense.status || 'SUBMITTED'} />
                      <span className="text-xs text-slate-400 font-mono">
                        {viewingExpense.expense_date || '—'}
                      </span>
                    </div>

                    <div className="p-3 rounded-xl border border-violet-100 dark:border-violet-900/40 bg-violet-50/50 dark:bg-violet-950/20 text-xs space-y-1">
                      <span className="text-[10px] font-extrabold uppercase tracking-wider text-violet-600 dark:text-violet-400 block">Submitted By</span>
                      <p className="font-bold text-slate-900 dark:text-white flex items-center gap-1.5"><User size={13} className="text-violet-600 shrink-0" /> {vName}</p>
                      <p className="text-[11px] text-slate-500 font-medium">{vPos}</p>
                      <a href={`mailto:${vEmail}`} className="text-violet-600 dark:text-violet-400 hover:underline font-mono text-[11px] font-bold inline-flex items-center gap-1">
                        <Mail size={11} /> {vEmail}
                      </a>
                    </div>

                    <div className="grid grid-cols-2 gap-3 p-3.5 rounded-xl border border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900">
                      <div>
                        <span className="block text-[10px] uppercase font-bold text-slate-400">Payable To</span>
                        <span className="text-sm font-bold text-slate-800 dark:text-slate-200">{viewingExpense.pay_to_name || '—'}</span>
                      </div>
                      <div className="text-right">
                        <span className="block text-[10px] uppercase font-bold text-slate-400">Total Expenditure</span>
                        <span className="text-lg font-black text-emerald-600">
                          ${Number(viewingExpense.total_cost || viewingExpense.amount || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Right Column */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 p-4 rounded-xl border border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 text-sm">
                    <div>
                      <span className="block text-[10px] uppercase font-bold text-slate-400">Payee phone</span>
                      <span className="font-medium text-slate-700 dark:text-slate-200">{viewingExpense.pay_to_phone || '—'}</span>
                    </div>
                    <div>
                      <span className="block text-[10px] uppercase font-bold text-slate-400">Bank account details</span>
                      <span className="font-medium text-slate-700 dark:text-slate-200 whitespace-pre-wrap">{viewingExpense.bank_account_details || '—'}</span>
                    </div>
                    <div>
                      <span className="block text-[10px] uppercase font-bold text-slate-400">Payment method</span>
                      <span className="font-medium text-slate-700 dark:text-slate-200">
                        {(viewingExpense.payment_method || 'MOBILE_MONEY').replace(/_/g, ' ').replace(/\b\w/g, (c: string) => c.toUpperCase())}
                      </span>
                    </div>
                    <div>
                      <span className="block text-[10px] uppercase font-bold text-slate-400">Purchase order</span>
                      <span className="font-medium text-slate-700 dark:text-slate-200">
                        {viewingExpense.purchase_order_number || (viewingExpense.purchase_order_id ? String(viewingExpense.purchase_order_id).slice(0, 8) : 'Not linked')}
                      </span>
                    </div>
                    <div className="sm:col-span-2">
                      <span className="block text-[10px] uppercase font-bold text-slate-400">Paid at</span>
                      <span className="font-medium text-slate-700 dark:text-slate-200">
                        {viewingExpense.paid_at ? new Date(viewingExpense.paid_at).toLocaleString() : 'Not paid'}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Items Purchased Section */}
                {Array.isArray(viewingExpense.items) && viewingExpense.items.length > 0 && (
                  <div className="rounded-xl border border-slate-100 dark:border-slate-800 overflow-hidden bg-white dark:bg-slate-900">
                    <div className="px-4 py-2.5 border-b border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 text-xs font-bold uppercase tracking-wide text-slate-700 dark:text-slate-300">
                      Items purchased
                    </div>
                    <div className="divide-y divide-slate-100 dark:divide-slate-800">
                      {viewingExpense.items.map((item: any, index: number) => (
                        <div key={`${item.name || 'item'}-${index}`} className="px-4 py-3 flex justify-between gap-4 text-sm bg-white dark:bg-slate-900">
                          <span className="text-slate-800 dark:text-slate-200">
                            {item.name || 'Item'} <span className="text-slate-500 font-mono text-xs">× {item.quantity}</span>
                          </span>
                          <span className="font-semibold text-slate-900 dark:text-white">
                            ${Number(item.total ?? Number(item.quantity || 0) * Number(item.unit_cost || 0)).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Finance Payments Section */}
                <section className="rounded-xl border border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 space-y-3">
                  <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 dark:border-slate-800 pb-3">
                    <div>
                      <h5 className="text-xs font-bold uppercase tracking-wide text-slate-800 dark:text-slate-100">Finance payments</h5>
                      <p className="mt-1 text-[11px] text-slate-600 dark:text-slate-300">
                        Paid ${Number(viewingExpense.paid_amount || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} of ${Number(viewingExpense.total_cost || viewingExpense.amount || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} · Balance ${Number(viewingExpense.balance_due ?? Math.max(0, Number(viewingExpense.total_cost || viewingExpense.amount || 0) - Number(viewingExpense.paid_amount || 0))).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </p>
                    </div>
                    <StatusBadge status={viewingExpense.status || 'SUBMITTED'} />
                  </div>
                  {Array.isArray(viewingExpense.payments) && viewingExpense.payments.length > 0 ? (
                    <div className="space-y-2">
                      {viewingExpense.payments.map((payment: any, index: number) => (
                        <div key={payment.id || index} className="rounded-lg border border-slate-100 dark:border-slate-800 bg-white p-3 dark:bg-slate-900">
                          <div className="flex flex-wrap items-center justify-between gap-2">
                            <span className="text-xs font-bold text-slate-700 dark:text-slate-200">Installment {viewingExpense.payments.length - index}</span>
                            <strong className="text-sm text-emerald-700 dark:text-emerald-300">${Number(payment.amount || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</strong>
                          </div>
                          <div className="mt-1 flex flex-wrap justify-between gap-2 text-[11px] text-slate-500">
                            <span>{payment.payment_date ? new Date(`${payment.payment_date}T00:00:00`).toLocaleDateString() : 'Date unavailable'}</span>
                            {payment.reference && <span>Reference: {payment.reference}</span>}
                          </div>
                          {payment.receipt_name ? (
                            <div className="mt-2 flex flex-wrap items-center justify-between gap-2 border-t border-slate-100 dark:border-slate-800 pt-2">
                              <span className="max-w-[220px] truncate text-[11px] text-slate-500" title={payment.receipt_name}>{payment.receipt_name}</span>
                              <div className="flex gap-2">
                                <button type="button" onClick={() => openUniversalFileViewer({ fileUrl: `/api/v1/operational-expenses/${viewingExpense.id}/payments/${payment.id}/receipt`, fileName: payment.receipt_name, title: `Payment receipt · Installment ${viewingExpense.payments.length - index}` })} className="inline-flex items-center gap-1 rounded border border-slate-200 dark:border-slate-700 px-2 py-1 text-[11px] font-semibold text-violet-700 hover:bg-slate-50"><Eye size={12} />View</button>
                                <button type="button" onClick={() => void downloadPurchaseOrderPaymentReceipt({ ...payment, expense_id: viewingExpense.id })} className="inline-flex items-center gap-1 rounded border border-slate-200 dark:border-slate-700 px-2 py-1 text-[11px] font-semibold text-slate-700 hover:bg-slate-50"><Download size={12} />Download</button>
                              </div>
                            </div>
                          ) : <p className="mt-2 border-t border-slate-100 dark:border-slate-800 pt-2 text-[11px] text-slate-400">No receipt attached to this installment.</p>}
                        </div>
                      ))}
                    </div>
                  ) : <p className="rounded-lg border border-dashed border-slate-200 dark:border-slate-800 p-3 text-xs text-slate-500">No payments have been recorded by Finance yet.</p>}
                </section>
              </div>

              {/* Sticky Footer */}
              <div className="flex items-center justify-between border-t border-slate-100 dark:border-slate-800 px-4 py-3 sm:px-6 bg-white dark:bg-slate-900 shrink-0">
                <span className="text-xs text-slate-400 font-mono">Status: {viewingExpense.status || 'SUBMITTED'}</span>
                <div className="flex items-center gap-2">
                  {(() => {
                    const receiptFile = viewingExpense.invoice_name || viewingExpense.receipt_name || viewingExpense.receipt_file_name || viewingExpense.attachment || null;
                    if (!receiptFile) return null;
                    const kind = viewingExpense.invoice_name || viewingExpense.invoice_path ? 'invoice' : 'receipt';
                    return (
                      <button
                        type="button"
                        onClick={async () => {
                          const fileUrl = `/api/v1/operational-expenses/${viewingExpense.id}/files/${kind}`;
                          try {
                            const blob = await apiFetchBlob(fileUrl);
                            openUniversalFileViewer({ blob, fileName: receiptFile, title: `Attached Receipt Docket: ${receiptFile}` });
                          } catch (err: any) {
                            setBanner({ type: 'error', message: err?.message || 'Failed to open docket file.' });
                          }
                        }}
                        className="px-4 py-2 bg-violet-600 hover:bg-violet-700 text-white font-bold rounded-lg text-xs flex items-center gap-1.5 transition"
                      >
                        <Eye size={14} /> View File
                      </button>
                    );
                  })()}
                  <button
                    type="button"
                    onClick={() => setViewingExpense(null)}
                    className="px-4 py-2 border border-slate-200 dark:border-slate-700 rounded-lg font-semibold text-xs hover:bg-slate-50 dark:hover:bg-slate-800 transition"
                  >
                    Close
                  </button>
                </div>
              </div>
            </div>
          </div>
        );
      })()}

      {/* Floating Bubble Widget for Unresolved Claims */}
      {unresolvedClaimsCount > 0 && activeTab !== 'OPERATIONAL_EXPENSES' && (
        <button
          type="button"
          onClick={() => setActiveTab('OPERATIONAL_EXPENSES')}
          className="fixed bottom-20 md:bottom-6 right-4 sm:right-6 z-50 flex items-center gap-2.5 px-4 py-3 bg-violet-600 hover:bg-violet-700 text-white rounded-full shadow-2xl transition-all duration-300 transform hover:scale-105 border-2 border-white/20 active:scale-95 group"
          title="Click to review unresolved expense claims"
        >
          <div className="relative">
            <FileText size={18} />
            <span className="absolute -top-1.5 -right-1.5 w-4 h-4 bg-amber-400 text-slate-950 text-[9px] font-black rounded-full flex items-center justify-center border border-white">
              {unresolvedClaimsCount}
            </span>
          </div>
          <div className="text-left font-sans">
            <p className="text-xs font-black leading-none">{unresolvedClaimsCount} Unresolved Claims</p>
            <p className="text-[10px] text-violet-200 font-medium leading-tight group-hover:underline">Click to open &amp; review</p>
          </div>
          <ChevronRight size={14} className="text-violet-200 group-hover:translate-x-0.5 transition-transform" />
        </button>
      )}
    
      {/* Mobile Bottom Navigation Tabbar */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-t border-slate-200 dark:border-slate-800 flex justify-around items-center h-14 px-1 shadow-[0_-4px_20px_-10px_rgba(0,0,0,0.1)] no-print">
        {navItems.map((item) => {
          const IconComp = item.icon;
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={`flex items-center justify-center w-full h-full transition relative ${
                isActive
                  ? 'text-violet-600 dark:text-violet-400 font-bold'
                  : 'text-slate-500 hover:text-slate-900 dark:hover:text-slate-300'
              }`}
            >
              <div className="relative p-1">
                <IconComp size={22} className={isActive ? 'opacity-100 scale-110' : 'opacity-70'} />
                {item.id === 'OPERATIONAL_EXPENSES' && unresolvedClaimsCount > 0 && (
                  <span className="absolute -top-2 -right-2 min-w-[18px] h-[18px] px-1 bg-amber-500 text-white text-[9px] font-black rounded-full flex items-center justify-center border-2 border-white dark:border-slate-900 shadow-md animate-pulse">
                    {unresolvedClaimsCount > 99 ? '99+' : unresolvedClaimsCount}
                  </span>
                )}
                
              </div>
            </button>
          );
        })}
      </nav>
      {/* PROJECT FINANCIAL DETAIL MODAL */}
      {viewingProject && (() => {
        const pId = String(viewingProject.id);
        const linkedPOs = purchaseOrders.filter((po) => String(po.project_id) === pId);
        const linkedInvoices = operationalExpenseRequests.filter((e) => String(e.project_id) === pId);
        const linkedClaims = expenses.filter((c) => String(c.project_id) === pId);
        const linkedFuel = fuelDeliveries.filter((f) => String(f.project_id) === pId);

        const totalPoVal = linkedPOs.reduce((sum, po) => sum + (Number(po.total_amount) || 0), 0);
        const totalInvoiceVal = linkedInvoices.reduce((sum, inv) => sum + (Number(inv.total_cost || inv.amount) || 0), 0);
        const totalClaimVal = linkedClaims.reduce((sum, c) => sum + (Number(c.amount) || 0), 0);
        const totalFuelVal = linkedFuel.reduce((sum, f) => sum + fuelDeliveryCost(f), 0);

        const isCurrentlyFocused = String(selectedProjectId) === pId;

        return (
          <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs overflow-y-auto">
            <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-3xl w-full border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden max-h-[90vh] flex flex-col my-auto">
              {/* Modal Header */}
              <div className="p-5 border-b dark:border-slate-800 flex items-center justify-between bg-slate-50/50 dark:bg-slate-800/50">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 bg-violet-100 dark:bg-violet-950/60 text-violet-600 dark:text-violet-400 rounded-xl">
                    <Briefcase size={22} />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-violet-100 dark:bg-violet-950 text-violet-700 dark:text-violet-300">
                        {viewingProject.code || 'PROJECT'}
                      </span>
                      <h3 className="font-bold text-lg text-slate-900 dark:text-white">{viewingProject.name}</h3>
                      <StatusBadge status={viewingProject.status || 'ACTIVE'} />
                    </div>
                    {((viewingProject as any).client_name || (viewingProject as any).location) && (
                      <p className="text-xs text-slate-500 mt-0.5">
                        {(viewingProject as any).client_name ? `Client: ${(viewingProject as any).client_name}` : ''}
                        {(viewingProject as any).client_name && (viewingProject as any).location ? ' • ' : ''}
                        {(viewingProject as any).location ? `Location: ${(viewingProject as any).location}` : ''}
                      </p>
                    )}
                  </div>
                </div>
                <button
                  onClick={() => setViewingProject(null)}
                  className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition"
                >
                  <X size={18} />
                </button>
              </div>

              {/* Modal Body */}
              <div className="p-6 overflow-y-auto space-y-6 flex-1 text-xs">
                {/* 4 Financial KPI Summary Cards */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div className="p-3.5 bg-slate-50 dark:bg-slate-800/40 rounded-xl border border-slate-200 dark:border-slate-800 space-y-1">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Allocated Budget</span>
                    <p className="text-base font-bold text-slate-900 dark:text-white">
                      {viewingProject.budget != null ? `${viewingProject.currency || 'USD'} ${Number(viewingProject.budget).toLocaleString()}` : 'Unset'}
                    </p>
                    <span className="text-[10px] text-slate-400">Approved project cap</span>
                  </div>

                  <div className="p-3.5 bg-violet-50/50 dark:bg-violet-950/20 rounded-xl border border-violet-200 dark:border-violet-900/40 space-y-1">
                    <span className="text-[10px] font-bold text-violet-600 dark:text-violet-400 uppercase tracking-wider block">PO Commitments</span>
                    <p className="text-base font-bold text-violet-700 dark:text-violet-300">
                      USD {totalPoVal.toLocaleString()}
                    </p>
                    <span className="text-[10px] text-slate-500">{linkedPOs.length} Purchase Orders</span>
                  </div>

                  <div className="p-3.5 bg-slate-50 dark:bg-slate-800/40 rounded-xl border border-slate-200 dark:border-slate-800 space-y-1">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Invoiced Expenditure</span>
                    <p className="text-base font-bold text-slate-900 dark:text-white">
                      USD {totalInvoiceVal.toLocaleString()}
                    </p>
                    <span className="text-[10px] text-slate-400">{linkedInvoices.length} Invoices</span>
                  </div>

                  <div className="p-3.5 bg-slate-50 dark:bg-slate-800/40 rounded-xl border border-slate-200 dark:border-slate-800 space-y-1">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Claims &amp; Fuel Logged</span>
                    <p className="text-base font-bold text-slate-900 dark:text-white">
                      USD {(totalClaimVal + totalFuelVal).toLocaleString()}
                    </p>
                    <span className="text-[10px] text-slate-400">{linkedClaims.length} Claims • {linkedFuel.length} Fuel Logs</span>
                  </div>
                </div>

                {/* Linked Purchase Orders Table */}
                <div className="space-y-3">
                  <h4 className="font-bold text-sm text-slate-900 dark:text-white flex items-center justify-between">
                    <span>Linked Purchase Orders ({linkedPOs.length})</span>
                    <span className="text-xs font-normal text-slate-500">Total: USD {totalPoVal.toLocaleString()}</span>
                  </h4>
                  {linkedPOs.length === 0 ? (
                    <p className="text-xs text-slate-500 py-4 text-center border rounded-xl bg-slate-50/50 dark:bg-slate-800/20">
                      No purchase orders recorded for this project site.
                    </p>
                  ) : (
                    <div className="border rounded-xl overflow-hidden">
                      <table className="w-full text-xs">
                        <thead className="bg-slate-50 dark:bg-slate-800/50 border-b dark:border-slate-800 text-slate-500 font-bold uppercase">
                          <tr>
                            <th className="px-3.5 py-2 text-left">PO #</th>
                            <th className="px-3.5 py-2 text-left">Vendor / Supplier</th>
                            <th className="px-3.5 py-2 text-left">Total Amount</th>
                            <th className="px-3.5 py-2 text-left">Status</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y dark:divide-slate-800">
                          {linkedPOs.map((po) => (
                            <tr key={po.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30">
                              <td className="px-3.5 py-2.5 font-bold font-mono text-violet-700 dark:text-violet-300">{po.po_number || po.id}</td>
                              <td className="px-3.5 py-2.5 font-medium">{po.supplier_name || po.vendor_name || 'Vendor'}</td>
                              <td className="px-3.5 py-2.5 font-mono font-semibold">{po.currency || 'USD'} {Number(po.total_amount || 0).toLocaleString()}</td>
                              <td className="px-3.5 py-2.5"><StatusBadge status={po.status || 'APPROVED'} /></td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>

                {/* Linked Operational Invoices Table */}
                <div className="space-y-3">
                  <h4 className="font-bold text-sm text-slate-900 dark:text-white flex items-center justify-between">
                    <span>Linked Operational Invoices &amp; Expenses ({linkedInvoices.length})</span>
                    <span className="text-xs font-normal text-slate-500">Total: USD {totalInvoiceVal.toLocaleString()}</span>
                  </h4>
                  {linkedInvoices.length === 0 ? (
                    <p className="text-xs text-slate-500 py-4 text-center border rounded-xl bg-slate-50/50 dark:bg-slate-800/20">
                      No operational invoices logged for this project site.
                    </p>
                  ) : (
                    <div className="border rounded-xl overflow-hidden">
                      <table className="w-full text-xs">
                        <thead className="bg-slate-50 dark:bg-slate-800/50 border-b dark:border-slate-800 text-slate-500 font-bold uppercase">
                          <tr>
                            <th className="px-3.5 py-2 text-left">Ref / Invoice #</th>
                            <th className="px-3.5 py-2 text-left">Payee Name</th>
                            <th className="px-3.5 py-2 text-left">Amount</th>
                            <th className="px-3.5 py-2 text-left">Status</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y dark:divide-slate-800">
                          {linkedInvoices.map((inv) => (
                            <tr key={inv.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30">
                              <td className="px-3.5 py-2.5 font-bold font-mono text-slate-800 dark:text-slate-200">{inv.expense_number || inv.invoice_number || inv.id}</td>
                              <td className="px-3.5 py-2.5 font-medium">{inv.pay_to_name || inv.vendor_name || 'Payee'}</td>
                              <td className="px-3.5 py-2.5 font-mono font-semibold">{inv.currency || 'USD'} {Number(inv.total_cost || inv.amount || 0).toLocaleString()}</td>
                              <td className="px-3.5 py-2.5"><StatusBadge status={inv.status || 'SUBMITTED'} /></td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              </div>

              {/* Modal Footer */}
              <div className="p-4 border-t dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/50 flex items-center justify-between gap-3">
                <button
                  type="button"
                  onClick={() => {
                    setSelectedProjectId(isCurrentlyFocused ? '' : pId);
                    setViewingProject(null);
                  }}
                  className={`px-4 py-2 text-xs font-bold rounded-xl transition flex items-center gap-1.5 ${
                    isCurrentlyFocused
                      ? 'bg-slate-200 dark:bg-slate-700 text-slate-800 dark:text-slate-200'
                      : 'bg-violet-600 hover:bg-violet-700 text-white shadow-sm'
                  }`}
                >
                  {isCurrentlyFocused ? 'Clear Active Scope Filter' : 'Filter Entire Finance Workspace to this Project'}
                </button>
                <button
                  type="button"
                  onClick={() => setViewingProject(null)}
                  className="px-4 py-2 border rounded-xl text-xs font-bold hover:bg-slate-100 dark:hover:bg-slate-800 transition"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        );
      })()}

      {/* View Fuel Delivery Receipt & Docket Modal */}
      {viewingReceiptDelivery && (
        <div className="fixed inset-0 bg-slate-950/75 z-[9999] flex items-center justify-center p-0 sm:p-4 overflow-hidden">
          <div className="bg-white dark:bg-slate-900 w-full h-full sm:h-auto sm:max-h-[90vh] max-w-full sm:max-w-4xl border-0 sm:border border-slate-200 dark:border-slate-800 rounded-none sm:rounded-2xl shadow-2xl flex flex-col overflow-hidden">
            {/* Sticky Header */}
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 px-4 py-3.5 sm:px-6 sm:py-4 bg-white dark:bg-slate-900 shrink-0 sticky top-0 z-10">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-violet-50 dark:bg-violet-950/40 text-violet-600 flex items-center justify-center font-bold">
                  <Fuel size={18} />
                </div>
                <div>
                  <h3 className="font-bold text-base text-slate-900 dark:text-white">
                    Fuel Delivery Receipt &amp; Docket
                  </h3>
                  <p className="text-xs text-slate-500 font-mono">
                    Ref #: {viewingReceiptDelivery.reference_number || `REC-${String(viewingReceiptDelivery.id).slice(0, 8)}`}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setViewingReceiptDelivery(null)}
                className="p-1.5 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 hover:text-slate-900 dark:hover:text-white transition"
              >
                <X size={20} />
              </button>
            </div>

            {/* Content Body */}
            <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6 bg-white dark:bg-slate-900">
              {/* Summary Header Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 p-5 rounded-xl border border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900">
                {/* Left Column */}
                <div className="space-y-4">
                  <div>
                    <span className="text-[10px] font-extrabold uppercase tracking-widest text-violet-600">Official Refuel Voucher</span>
                    <h4 className="text-lg font-black text-slate-900 dark:text-white mt-1">
                      {viewingReceiptDelivery.supplier || 'Site Bulk Fuel Supplier'}
                    </h4>
                    <p className="text-xs text-slate-500 mt-1">
                      Site: {projectSites.find((s) => String(s.id) === String(viewingReceiptDelivery.site_location_id))?.name || 'Project Field Depot'}
                    </p>
                  </div>

                  <div className="flex items-center gap-3 pt-1">
                    <span className="px-2.5 py-1 bg-violet-50 dark:bg-violet-950/60 text-violet-800 dark:text-violet-300 rounded-full font-mono text-[11px] font-bold">
                      {viewingReceiptDelivery.fuel_type || 'DIESEL'}
                    </span>
                    <span className="text-xs text-slate-400 font-mono">
                      {viewingReceiptDelivery.recorded_at ? new Date(viewingReceiptDelivery.recorded_at).toLocaleString() : viewingReceiptDelivery.delivered_at || '—'}
                    </span>
                  </div>

                  <div className="grid grid-cols-3 gap-2 p-3.5 rounded-xl border border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 text-xs">
                    <div>
                      <span className="text-[10px] text-slate-400 font-bold uppercase block">Quantity</span>
                      <span className="font-extrabold text-violet-600 text-sm block mt-0.5">{viewingReceiptDelivery.quantity_litres} L</span>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-400 font-bold uppercase block">Unit Price</span>
                      <span className="font-bold text-slate-800 dark:text-slate-200 text-xs block mt-0.5">
                        {fuelUnitCost(viewingReceiptDelivery) ? `${fuelCostCurrency(viewingReceiptDelivery)} ${fuelUnitCost(viewingReceiptDelivery)}/L` : '—'}
                      </span>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-400 font-bold uppercase block">Total Expenditure</span>
                      <span className="font-extrabold text-emerald-600 text-sm block mt-0.5">
                        {fuelDeliveryCost(viewingReceiptDelivery) ? `${fuelCostCurrency(viewingReceiptDelivery)} ${fuelDeliveryCost(viewingReceiptDelivery).toLocaleString(undefined, { maximumFractionDigits: 2 })}` : '—'}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Right Column */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 p-4 rounded-xl border border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 text-sm">
                  <div>
                    <span className="block text-[10px] uppercase font-bold text-slate-400">Reference Number</span>
                    <span className="font-mono font-medium text-slate-700 dark:text-slate-200">{viewingReceiptDelivery.reference_number || `REC-${String(viewingReceiptDelivery.id).slice(0, 8)}`}</span>
                  </div>
                  <div>
                    <span className="block text-[10px] uppercase font-bold text-slate-400">Fuel Grade</span>
                    <span className="font-medium text-slate-700 dark:text-slate-200">{viewingReceiptDelivery.fuel_type || 'DIESEL'}</span>
                  </div>
                  <div className="sm:col-span-2">
                    <span className="block text-[10px] uppercase font-bold text-slate-400">Delivery Date &amp; Time</span>
                    <span className="font-medium text-slate-700 dark:text-slate-200">
                      {viewingReceiptDelivery.recorded_at ? new Date(viewingReceiptDelivery.recorded_at).toLocaleString() : viewingReceiptDelivery.delivered_at || '—'}
                    </span>
                  </div>
                  {(() => {
                    const cleanNotes = (viewingReceiptDelivery.notes || '')
                      .replace(/\[Financial Info:\s*[^\]]+\]/gi, '')
                      .replace(/\[Attached Docket:\s*[^\]]+\]/gi, '')
                      .trim();
                    if (!cleanNotes) return null;
                    return (
                      <div className="sm:col-span-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                        <span className="block text-[10px] uppercase font-bold text-slate-400">Operational Notes</span>
                        <p className="font-medium text-slate-700 dark:text-slate-300 whitespace-pre-wrap mt-0.5">{cleanNotes}</p>
                      </div>
                    );
                  })()}
                </div>
              </div>
            </div>

            {/* Sticky Footer */}
            <div className="flex items-center justify-between border-t border-slate-100 dark:border-slate-800 px-4 py-3 sm:px-6 bg-white dark:bg-slate-900 shrink-0">
              <span className="text-xs text-slate-400 font-mono">Status: LOGGED &amp; VERIFIED</span>
              <div className="flex items-center gap-2">
                {(() => {
                  const attachmentMatch = (viewingReceiptDelivery.notes || '').match(/\[Attached (?:Receipt )?Docket:\s*([^\]]+)\]/i);
                  const attachedFileName = viewingReceiptDelivery.receipt_file_name || (attachmentMatch ? attachmentMatch[1] : null) || viewingReceiptDelivery.attachment || null;
                  if (!attachedFileName) return null;
                  return (
                    <button
                      type="button"
                      onClick={() => openUniversalFileViewer({
                        fileUrl: `/api/v1/field-portal/fuel-deliveries/${viewingReceiptDelivery.id}/receipt`,
                        fileName: attachedFileName,
                        title: 'Fuel delivery receipt and docket',
                      })}
                      className="px-4 py-2 bg-violet-600 hover:bg-violet-700 text-white font-bold rounded-lg text-xs flex items-center gap-1.5 transition"
                    >
                      <Eye size={14} /> View Receipt File
                    </button>
                  );
                })()}
                <button
                  type="button"
                  onClick={() => handleDownloadFuelReceipt(viewingReceiptDelivery)}
                  className="px-4 py-2 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 font-bold rounded-lg text-xs hover:bg-slate-50 dark:hover:bg-slate-800 flex items-center gap-1.5 transition"
                >
                  <Download size={14} /> Download Docket
                </button>
                <button
                  type="button"
                  onClick={() => setViewingReceiptDelivery(null)}
                  className="px-4 py-2 border border-slate-200 dark:border-slate-700 rounded-lg font-semibold text-xs hover:bg-slate-50 dark:hover:bg-slate-800 transition"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      <UniversalFileViewerModal isOpen={viewerState.isOpen} onClose={() => setViewerState({ isOpen: false })} fileUrl={viewerState.fileUrl} fileName={viewerState.fileName} title={viewerState.title} />
    </div>
  );
}
