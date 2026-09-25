'use client';
import IncidentDetailModal from './IncidentDetailModal';
import React, { useState, useEffect, useMemo, useRef } from 'react';
import SearchableSelect from './SearchableSelect';
import AppDateTimePicker from './ui/AppDateTimePicker';
import AppLogo from './ui/AppLogo';
import NotificationWorkspace from './NotificationWorkspace';
import useNotificationCount from './useNotificationCount';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import OperationalExpenseSubmissionModal from './OperationalExpenseSubmissionModal';
import RegisterUserModal from './RegisterUserModal';
import {
  Zap,
  UserPlus,
  Droplet,
  Wrench,
  Users,
  DollarSign,
  FileText,
  ShoppingCart,
  Fuel,
  Shield,
  Bell,
  User,
  Search,
  RefreshCw,
  LogOut,
  Menu,
  X,
  AlertTriangle,
  TrendingUp,
  Paperclip,
  Download,
  Eye,
  Building2,
  Mail,
  Phone,
  MapPin,
  Calendar,
  Clock,
  CheckCircle2,
  Pencil,
  Plus,
  BarChart2,
  ChevronDown,
  ChevronUp,
  Trash2,
  ChevronRight,
  PackageCheck, Package,
  ShieldAlert,
  ShieldCheck,
  ArrowRight,
  Filter,
  Briefcase,
  Truck,
  ShoppingBag } from 'lucide-react';
import EmployeeDetailView from './EmployeeDetailView';
import ExecutiveEmployeeDetailView from './ExecutiveEmployeeDetailView';
import ExecutiveProjectDetailView from './ExecutiveProjectDetailView';
import { ProjectRegister } from './ProjectDashboard';
import ResourceWorkspace from './ResourceWorkspace';
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
import OperationalExpensesWorkspace from './OperationalExpensesWorkspace';
import ExpiringDocumentsWorkspace from './ExpiringDocumentsWorkspace';
import useNotificationData from './useNotificationData';
import MaintenanceJobCardDetailsModal from './MaintenanceJobCardDetailsModal';
import { PurchaseOrderCategoryField, purchaseOrderCategoryLabel } from './PurchaseOrderCategoryField';
import PurchaseOrderCategoryChart from './PurchaseOrderCategoryChart';
import { useOperationalDataSync } from '@/lib/operationalDataSync';

// ─── Types ────────────────────────────────────────────────────────────────────

type ExecutiveTab =
  | 'PEOPLE'
  | 'EXPENSES'
  | 'HSE'
  | 'PROJECTS'
  | 'EQUIPMENTS'
  | 'PURCHASE_ORDERS'
  | 'FUEL'
  | 'COMPLIANCE'
  | 'NOTIFICATIONS';

interface PurchaseOrderItem {
  id?: string;
  item_name?: string;
  description: string;
  quantity_ordered: number;
  unit_price: number;
  quantity_received?: number;
}

interface EmployeeRow {
  id: string;
  first_name?: string;
  last_name?: string;
  middle_name?: string;
  employee_number?: string;
  job_title?: string;
  department?: string;
  user_role?: string;
  is_active?: boolean;
  employment_status?: string;
  availability_status?: string;
  home_location_name?: string;
  home_location_id?: string;
  phone_number?: string;
  primary_phone?: string;
  email?: string;
  profile_photo_url?: string;
  current_project_name?: string;
  project_name?: string;
  project_id?: string;
  assigned_project_id?: string;
  current_project_id?: string;
  created_at?: string;
  hire_date?: string;
  date_joined?: string;
}

// ─── Status Badge ─────────────────────────────────────────────────────────────

function StatusBadge({ status }: { status: string }) {
  const s = (status || '').toUpperCase();
  const map: Record<string, string> = {
    PAID: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-300',
    APPROVED: 'bg-indigo-100 text-indigo-800 dark:bg-indigo-950/50 dark:text-indigo-300',
    WAITING_APPROVAL: 'bg-amber-100 text-amber-800 dark:bg-amber-950/50 dark:text-amber-300',
    ACTIVE: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-300',
    'ACTIVE / AVAILABLE': 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-300',
    PENDING: 'bg-amber-100 text-amber-800 dark:bg-amber-950/50 dark:text-amber-300',
    SUBMITTED: 'bg-amber-100 text-amber-800 dark:bg-amber-950/50 dark:text-amber-300',
    DRAFT: 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-300',
    OVERDUE: 'bg-red-100 text-red-800 dark:bg-red-950/50 dark:text-red-300',
    CANCELLED: 'bg-red-100 text-red-800 dark:bg-red-950/50 dark:text-red-300',
    COMPLETED: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-300',
    RECEIVED: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-300',
  };
  return (
    <span
      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${
        map[s] || 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300'
      }`}
    >
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

function EmptyState({ message }: { message: string }) {
  return <div className="p-8 text-center text-sm text-slate-500 dark:text-slate-400">{message}</div>;
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function ExecutivePortalWorkspace() {
  const notificationCount = useNotificationCount();
  const router = useRouter();
  const { user, loading: authLoading, error: authError, reload: authReload, signOut } = useAuth();
  const [scopedPurchaseOrdersPage, setScopedpurchaseorderspage] = React.useState(1);
  const [scopedFuelDeliveriesPage, setScopedfueldeliveriespage] = React.useState(1);
  const [scopedMaintenanceRecordsPage, setScopedmaintenancerecordspage] = React.useState(1);
  const [scopedFuelAllocationsPage, setScopedfuelallocationspage] = React.useState(1);
  const [filteredEmployeesPage, setFilteredemployeespage] = React.useState(1);
  const [scopedIncidentsPage, setScopedincidentspage] = React.useState(1);

  const [activeTab, setActiveTab] = useState<ExecutiveTab>('EXPENSES');
  const handledRecordLink = useRef('');
  const [equipmentTab, setEquipmentTab] = useState<'ASSETS' | 'MAINTENANCE'>('ASSETS');
  useEffect(() => {
    const tabParam = new URLSearchParams(window.location.search).get('tab') as ExecutiveTab;
    if (tabParam) {
      setActiveTab(tabParam);
    }
  }, []);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [banner, setBanner] = useState<{ message: string; type: 'error' | 'success' | 'info' } | null>(null);
  const [showPurchasingCharts, setShowPurchasingCharts] = useState(false);

  // Data States
  const [employees, setEmployees] = useState<EmployeeRow[]>([]);
  const [projects, setProjects] = useState<any[]>([]);
  const [expenses, setExpenses] = useState<any[]>([]);
  
  const [purchaseOrders, setPurchaseOrders] = useState<any[]>([]);
  const [fuelDeliveries, setFuelDeliveries] = useState<any[]>([]);
  const [fuelAllocations, setFuelAllocations] = useState<any[]>([]);
  const [assets, setAssets] = useState<any[]>([]);
  const notificationFeed = useNotificationData<any>('/api/v1/notifications?page=1&page_size=20');
  const notificationItems: any[] = Array.isArray(notificationFeed.data)
    ? notificationFeed.data
    : Array.isArray(notificationFeed.data?.items)
      ? notificationFeed.data.items
      : [];
  const unresolvedNotifications = notificationItems.filter((item) => !item.is_resolved);
  const [locations, setLocations] = useState<any[]>([]);
  const [incidents, setIncidents] = useState<any[]>([]);
  const [workOrders, setWorkOrders] = useState<any[]>([]);
  const [preventiveJobCards, setPreventiveJobCards] = useState<any[]>([]);
  const [breakdownJobCards, setBreakdownJobCards] = useState<any[]>([]);
  const [selectedMaintenanceRecord, setSelectedMaintenanceRecord] = useState<{ record: any; kind: 'work_order' | 'preventive' | 'breakdown' } | null>(null);
  const [viewingIncident, setViewingIncident] = useState<any>(null);
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
  
  

  const [showAddPoModal, setShowAddPoModal] = useState(false);
  const [showExpenseModal, setShowExpenseModal] = useState(false);
  const [showRegisterUserModal, setShowRegisterUserModal] = useState(false);
  const [viewingPo, setViewingPo] = useState<any | null>(null);
  const [viewingReceiptDelivery, setViewingReceiptDelivery] = useState<any | null>(null);
  const [editingPo, setEditingPo] = useState<any | null>(null);
  const [receivingPo, setReceivingPo] = useState<any | null>(null);
//   const [receiptQuantities, setReceiptQuantities] = useState<Record<string, number>>({});
//   const [selectedReceiptItemIds, setSelectedReceiptItemIds] = useState<string[]>([]);
  const [poSubmitBusy, setPoSubmitBusy] = useState(false);
  const [poAttachmentFile, setPoAttachmentFile] = useState<File | null>(null);
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
      // reload omitted
    } catch (err: any) {
      setBanner({ type: 'error', message: err?.message || 'Failed to create purchase order.' });
    } finally {
      setPoSubmitBusy(false);
    }
  };

  const [viewingProject, setViewingProject] = useState<string | null>(null);

  const [loading, setLoading] = useState(false);

  // Global Project & Date Range Filters
  const [selectedProjectId, setSelectedProjectId] = useState<string>('');
  const [datePreset, setDatePreset] = useState<'ALL' | 'TODAY' | '10_DAYS' | '30_DAYS' | 'CUSTOM'>('ALL');
  const [customStartDate, setCustomStartDate] = useState<string>('');
  const [customEndDate, setCustomEndDate] = useState<string>('');
  const [showCustomDatePopover, setShowCustomDatePopover] = useState(false);

  // Filtering States for People Tab
  const [peopleSearch, setPeopleSearch] = useState('');
  const [deptFilter, setDeptFilter] = useState('ALL');
  const [posFilter, setPosFilter] = useState('ALL');
  const [roleFilter, setRoleFilter] = useState('ALL');

  // Purchase Order Detail Modal State
  const [selectedPO, setSelectedPO] = useState<any | null>(null);
  const [approvingPoId, setApprovingPoId] = useState<string | null>(null);
  const [editingPO, setEditingPO] = useState<any | null>(null);
  const [editPoForm, setEditPoForm] = useState({ supplier_name: '', project_id: '', category: '', currency: 'USD', notes: '', items: [] as any[] });
  const [receivingPO, setReceivingPO] = useState<any | null>(null);
  const [receiptQuantities, setReceiptQuantities] = useState<Record<string, number>>({});
  const [selectedReceiptItemIds, setSelectedReceiptItemIds] = useState<string[]>([]);
  const [poActionBusy, setPoActionBusy] = useState(false);

  // Fetch Core Data
  const loadData = async () => {
    setLoading(true);
    try {
      const [empRes, expRes, poRes, fuelRes, allocRes, astRes, locRes, incRes, projRes, woRes, pmRes, breakdownRes] = await Promise.all([
        apiFetch<any>('/api/v1/employees?page_size=100').catch(() => []),
        apiFetch<any>('/api/v1/operational-expenses').catch(() => []),
        apiFetch<any>('/api/v1/procurement/purchase-orders').catch(() => []),
        apiFetch<any>('/api/v1/field-portal/fuel-deliveries').catch(() => []),
        apiFetch<any>('/api/v1/field-portal/fuel-allocations').catch(() => []),
        apiFetch<any>('/api/v1/assets?page_size=100').catch(() => []),
        apiFetch<any>('/api/v1/locations').catch(() => []),
        apiFetch<any>('/api/v1/incidents?page_size=100').catch(() => []),
        apiFetch<any>('/api/v1/projects?page_size=100').catch(() => []),
        apiFetch<any>('/api/v1/maintenance/work-orders?page_size=100').catch(() => []),
        apiFetch<any>('/api/v1/pm-job-cards?page_size=100').catch(() => []),
        apiFetch<any>('/api/v1/pm-job-cards/breakdown?page_size=100').catch(() => []),
      ]);

      const empList = Array.isArray(empRes) ? empRes : empRes?.items || [];
      const expList = Array.isArray(expRes) ? expRes : expRes?.items || [];
      const poList = Array.isArray(poRes) ? poRes : poRes?.items || [];
      const fuelList = Array.isArray(fuelRes) ? fuelRes : fuelRes?.items || [];
      const allocList = Array.isArray(allocRes) ? allocRes : allocRes?.items || [];
      const astList = Array.isArray(astRes) ? astRes : astRes?.items || [];
      const locList = Array.isArray(locRes) ? locRes : locRes?.items || [];
      const incList = Array.isArray(incRes) ? incRes : incRes?.items || [];
      const projList = Array.isArray(projRes) ? projRes : projRes?.items || [];
      const woList = Array.isArray(woRes) ? woRes : woRes?.items || [];
      const pmList = Array.isArray(pmRes) ? pmRes : pmRes?.items || [];
      const breakdownList = Array.isArray(breakdownRes) ? breakdownRes : breakdownRes?.items || [];

      setEmployees(empList);
      setExpenses(expList);
      setProjects(projList);
      
      setPurchaseOrders(poList);
      setFuelDeliveries(fuelList);
      setFuelAllocations(allocList);
      setAssets(astList);
      setLocations(locList);
      setIncidents(incList);
      setWorkOrders(woList);
      setPreventiveJobCards(pmList);
      setBreakdownJobCards(breakdownList);
    } catch (e: any) {
      setBanner({ message: e?.message || 'Failed to load executive portal data', type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadData();
  }, []);

  useOperationalDataSync(() => { void loadData(); });

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const poId = params.get('purchase_order_id');
    const expenseId = params.get('expense_id');
    const targetId = poId || expenseId;
    if (!targetId || handledRecordLink.current === targetId) return;
    if (poId) {
      const order = purchaseOrders.find((row: any) => String(row.id) === poId);
      if (!order) return;
      setActiveTab('PURCHASE_ORDERS');
      setSelectedPO(order);
    } else if (expenseId) {
      if (!expenses.some((row: any) => String(row.id) === expenseId)) return;
      setActiveTab('EXPENSES');
    }
    handledRecordLink.current = targetId;
  }, [purchaseOrders, expenses]);

  const isWithinDateFilter = (dateInput: string | Date | undefined) => {
    if (datePreset === 'ALL') return true;
    if (!dateInput) return true;
    const d = new Date(dateInput);
    if (isNaN(d.getTime())) return true;
    const now = new Date();
    if (datePreset === 'TODAY') {
      const s = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0);
      const e = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
      return d >= s && d <= e;
    }
    if (datePreset === '10_DAYS') {
      const ago = new Date(now.getTime() - 10 * 24 * 60 * 60 * 1000);
      ago.setHours(0, 0, 0, 0);
      return d >= ago && d <= now;
    }
    if (datePreset === '30_DAYS') {
      const ago = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      ago.setHours(0, 0, 0, 0);
      return d >= ago && d <= now;
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
    }
    return true;
  };

  // Scoped Expenses based on selected project & date range filter
  const scopedExpenses = useMemo(() => {
    return expenses.filter((e: any) => {
      if (selectedProjectId) {
        const pId = e.project_id || e.projectId;
        if (pId && String(pId) !== String(selectedProjectId)) return false;
      }
      return isWithinDateFilter(e.expense_date || e.created_at || e.entry_date);
    });
  }, [expenses, selectedProjectId, datePreset, customStartDate, customEndDate]);

  // Scoped Assets based on selected project & date range filter
  const scopedAssets = useMemo(() => {
    return assets.filter((ast: any) => {
      if (selectedProjectId) {
        const pId = ast.project_id || ast.assigned_project_id;
        if (pId && String(pId) !== String(selectedProjectId)) return false;
      }
      return isWithinDateFilter(ast.created_at || ast.updated_at);
    });
  }, [assets, selectedProjectId, datePreset, customStartDate, customEndDate]);

  // Scoped Projects based on selected project & date range filter
  const scopedProjects = useMemo(() => {
    return projects.filter((p: any) => {
      if (selectedProjectId && String(p.id) !== String(selectedProjectId)) return false;
      return isWithinDateFilter(p.created_at || p.start_date);
    });
  }, [projects, selectedProjectId, datePreset, customStartDate, customEndDate]);

  // Compute expense time series using scopedExpenses
  const expenseTimeSeriesData = React.useMemo(() => {
    const dateMap: Record<string, { date: string; fullDate: string; totalCost: number; approvedCost: number }> = {};

    scopedExpenses.forEach((e: any) => {
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
  }, [scopedExpenses]);

  const topItemsByCostData = React.useMemo(() => {
    const itemMap: Record<string, { name: string; totalCost: number; count: number }> = {};

    scopedExpenses.forEach((e: any) => {
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

    return Object.values(itemMap).sort((a, b) => b.totalCost - a.totalCost).slice(0, 10);
  }, [scopedExpenses]);

  const topItemsByFrequencyData = React.useMemo(() => {
    const itemMap: Record<string, { name: string; frequency: number; totalCost: number }> = {};

    scopedExpenses.forEach((e: any) => {
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
  }, [scopedExpenses]);

  const topVendorData = React.useMemo(() => {
    const vendorMap: Record<string, { vendor: string; totalCost: number; count: number }> = {};

    scopedExpenses.forEach((e: any) => {
      const vendor = (e.pay_to_name || 'Unspecified Payee').trim();
      if (!vendorMap[vendor]) vendorMap[vendor] = { vendor, totalCost: 0, count: 0 };
      vendorMap[vendor].totalCost += Number(e.total_cost || e.amount || 0);
      vendorMap[vendor].count += 1;
    });

    return Object.values(vendorMap).sort((a, b) => b.totalCost - a.totalCost).slice(0, 10);
  }, [scopedExpenses]);

  const expenseIntelligenceMetrics = React.useMemo(() => {
    const totalExp = scopedExpenses.reduce((sum, e) => sum + Number(e.total_cost || e.amount || 0), 0);
    const count = scopedExpenses.length;
    const avgClaim = count > 0 ? totalExp / count : 0;
    const maxClaim = scopedExpenses.reduce((max, e) => Math.max(max, Number(e.total_cost || e.amount || 0)), 0);
    const totalItemsCount = scopedExpenses.reduce((sum, e) => sum + (Array.isArray(e.items) ? e.items.length : 1), 0);

    return { totalExp, count, avgClaim, maxClaim, totalItemsCount };
  }, [scopedExpenses]);

  const scopedPurchaseOrders = useMemo(() => {
    return purchaseOrders.filter((po) => {
      if (selectedProjectId && po.project_id && String(po.project_id) !== String(selectedProjectId)) return false;
      return isWithinDateFilter(po.order_date || po.created_at);
    });
  }, [purchaseOrders, selectedProjectId, datePreset, customStartDate, customEndDate]);

  const scopedFuelDeliveries = useMemo(() => {
    return fuelDeliveries.filter((d) => {
      if (selectedProjectId) {
        const pId = d.project_id || d.projectId;
        if (pId && String(pId) !== String(selectedProjectId)) return false;
      }
      return isWithinDateFilter(d.recorded_at || d.delivered_at || d.created_at);
    });
  }, [fuelDeliveries, selectedProjectId, datePreset, customStartDate, customEndDate]);

  const scopedFuelAllocations = useMemo(() => {
    return fuelAllocations.filter((a) => {
      if (selectedProjectId) {
        const pId = a.project_id || a.projectId;
        if (pId && String(pId) !== String(selectedProjectId)) return false;
      }
      return isWithinDateFilter(a.allocated_at || a.recorded_at || a.created_at);
    });
  }, [fuelAllocations, selectedProjectId, datePreset, customStartDate, customEndDate]);

  const fuelDeliveryCost = (d: any): number => {
    if (d.total_cost != null && Number.isFinite(Number(d.total_cost))) return Number(d.total_cost);
    const match = String(d.notes || '').match(/Total Cost:\s*([\d,]+(?:\.\d+)?)/i);
    return match ? Number(match[1].replaceAll(',', '')) || 0 : 0;
  };
  const fuelUnitCost = (d: any): number => {
    if (d.unit_cost != null && Number.isFinite(Number(d.unit_cost))) return Number(d.unit_cost);
    const match = String(d.notes || '').match(/Unit Cost:\s*([\d,]+(?:\.\d+)?)/i);
    if (match) return Number(match[1].replaceAll(',', '')) || 0;
    const litres = Number(d.quantity_litres);
    const total = fuelDeliveryCost(d);
    return litres > 0 && total > 0 ? total / litres : 0;
  };
  const fuelCostCurrency = (d: any): string => String(d.currency || String(d.notes || '').match(/Total Cost:\s*[\d,.]+\s+([A-Z]{3})/i)?.[1] || 'USD');

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
CESTOS SMART FIELD OPERATIONS - FUEL DELIVERY RECEIPT DOCKET
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
Signed: Executive Operations Administration
===========================================================`;

    const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
    downloadBlob(blob, fileName.endsWith('.pdf') || fileName.endsWith('.jpg') || fileName.endsWith('.png') ? `${fileName.replace(/\.[^/.]+$/, '')}_Voucher.txt` : fileName);
  };

  const fuelTimeSeriesData = useMemo(() => {
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

  const unresolvedClaimsCount = useMemo(() => {
    return scopedExpenses.filter((e) => {
      const st = (e.status || '').toUpperCase();
      return st === 'SUBMITTED' || st === 'PENDING' || st === 'DRAFT';
    }).length;
  }, [scopedExpenses]);

  const scopedIncidents = useMemo(() => {
    return incidents.filter((inc) => {
      if (selectedProjectId && inc.project_id && String(inc.project_id) !== String(selectedProjectId)) return false;
      return isWithinDateFilter(inc.incident_date || inc.created_at);
    });
  }, [incidents, selectedProjectId, datePreset, customStartDate, customEndDate]);

  const scopedMaintenanceRecords = useMemo(() => {
    const inScope = (row: any) => {
      if (selectedProjectId && row.project_id && String(row.project_id) !== String(selectedProjectId)) return false;
      return isWithinDateFilter(row.scheduled_date || row.created_at);
    };
    return [
      ...workOrders.filter(inScope).map((row) => ({ ...row, record_kind: 'Work order', record_category: 'work_order' as const, display_title: row.title, display_type: row.work_type || 'CORRECTIVE' })),
      ...preventiveJobCards.filter(inScope).map((row) => ({ ...row, record_kind: 'Preventive job card', record_category: 'preventive' as const, display_title: row.pm_control?.equipment || row.job_card_number, display_type: 'PREVENTIVE', description: row.pm_control?.pm_interval ? `PM interval: ${row.pm_control.pm_interval}` : 'Preventive maintenance job card' })),
      ...breakdownJobCards.filter(inScope).map((row) => ({ ...row, record_kind: 'Breakdown job card', record_category: 'breakdown' as const, display_title: row.job_control?.equipment || row.job_card_number, display_type: 'CORRECTIVE', description: row.reported_failure || row.corrective_action || 'Breakdown maintenance job card' })),
    ].sort((a, b) => new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime());
  }, [workOrders, preventiveJobCards, breakdownJobCards, selectedProjectId, datePreset, customStartDate, customEndDate]);

  const hseTimeSeriesData = useMemo(() => {
    const dateMap: Record<string, { date: string; fullDate: string; totalIncidents: number; criticalCount: number; nearMissCount: number }> = {};

    scopedIncidents.forEach((inc: any) => {
      const dateStr = inc.incident_date ? new Date(inc.incident_date).toISOString().slice(0, 10) : inc.created_at?.slice(0, 10) || 'Unknown';
      if (dateStr === 'Unknown') return;
      if (!dateMap[dateStr]) {
        const dObj = new Date(dateStr);
        const formattedDate = isNaN(dObj.getTime()) ? dateStr : dObj.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
        dateMap[dateStr] = { date: formattedDate, fullDate: dateStr, totalIncidents: 0, criticalCount: 0, nearMissCount: 0 };
      }
      dateMap[dateStr].totalIncidents += 1;
      const sev = (inc.severity || '').toUpperCase();
      if (sev === 'CRITICAL' || sev === 'HIGH') {
        dateMap[dateStr].criticalCount += 1;
      }
      const typ = (inc.incident_type || '').toUpperCase();
      if (typ.includes('NEAR_MISS') || typ.includes('HAZARD')) {
        dateMap[dateStr].nearMissCount += 1;
      }
    });

    return Object.values(dateMap).sort((a, b) => a.fullDate.localeCompare(b.fullDate));
  }, [scopedIncidents]);

  const hseCategoryBarData = useMemo(() => {
    const categoryCounts: Record<string, number> = {
      'Near Miss': 0,
      'Injury / Illness': 0,
      'Property Damage': 0,
      'Environmental Spill': 0,
      'Hazard Observation': 0,
      'Security Incident': 0,
      'Other': 0,
    };

    scopedIncidents.forEach((inc: any) => {
      const t = (inc.incident_type || '').toUpperCase();
      if (t.includes('NEAR_MISS')) categoryCounts['Near Miss'] += 1;
      else if (t.includes('INJURY')) categoryCounts['Injury / Illness'] += 1;
      else if (t.includes('PROPERTY')) categoryCounts['Property Damage'] += 1;
      else if (t.includes('ENVIRONMENTAL') || t.includes('SPILL')) categoryCounts['Environmental Spill'] += 1;
      else if (t.includes('HAZARD')) categoryCounts['Hazard Observation'] += 1;
      else if (t.includes('SECURITY')) categoryCounts['Security Incident'] += 1;
      else categoryCounts['Other'] += 1;
    });

    return Object.entries(categoryCounts).map(([category, count]) => ({ category, count }));
  }, [scopedIncidents]);

  // Derived filter options for People Tab
  const departmentsList = useMemo(() => {
    const set = new Set<string>();
    employees.forEach((e) => {
      if (e.department) set.add(e.department);
    });
    return Array.from(set).sort();
  }, [employees]);

  const positionsList = useMemo(() => {
    const set = new Set<string>();
    employees.forEach((e) => {
      if (e.job_title) set.add(e.job_title);
    });
    return Array.from(set).sort();
  }, [employees]);

  const rolesList = useMemo(() => {
    const set = new Set<string>();
    employees.forEach((e) => {
      if (e.user_role) set.add(e.user_role);
    });
    return Array.from(set).sort();
  }, [employees]);

  // Filtered Employees respecting search, filters, project selection & date range
  const filteredEmployees = useMemo(() => {
    return employees.filter((emp) => {
      if (selectedProjectId) {
        const pId = emp.project_id || emp.assigned_project_id || emp.current_project_id;
        if (pId && String(pId) !== String(selectedProjectId)) return false;
      }
      if (!isWithinDateFilter(emp.created_at || emp.hire_date || emp.date_joined)) return false;

      const name = `${emp.first_name || ''} ${emp.last_name || ''}`.toLowerCase();
      const num = (emp.employee_number || '').toLowerCase();
      const email = (emp.email || '').toLowerCase();
      const q = peopleSearch.toLowerCase();

      if (peopleSearch && !name.includes(q) && !num.includes(q) && !email.includes(q)) {
        return false;
      }
      if (deptFilter !== 'ALL' && emp.department !== deptFilter) return false;
      if (posFilter !== 'ALL' && emp.job_title !== posFilter) return false;
      if (roleFilter !== 'ALL' && emp.user_role !== roleFilter) return false;
      return true;
    });
  }, [employees, peopleSearch, deptFilter, posFilter, roleFilter, selectedProjectId, datePreset, customStartDate, customEndDate]);

  // Handle PO File Downloads
  const handleDownloadPOFile = async (poId: string, filename: string) => {
    try {
      const po = purchaseOrders.find((item) => String(item.id) === String(poId));
      if (po && !po.attachment_file_name) {
        const projectName = projects.find((project: any) => String(project.id) === String(po.project_id))?.name || po.project_id || 'All Projects';
        const content = `CESTOS SMART EXECUTIVE PORTAL - PURCHASE ORDER DOCKET
===========================================================
PO Number:         ${po.po_number || po.id}
Vendor / Supplier: ${po.supplier_name || po.vendor_name || po.vendor || po.supplier || 'Site Vendor'}
Project Scope:     ${projectName}
Order Date:        ${po.created_at ? new Date(po.created_at).toLocaleString() : '—'}
Status:            ${po.status || 'PENDING'}
Currency:          ${po.currency || 'USD'}

ORDER LINE ITEMS
-----------------------------------------------------------
${(po.items || []).map((item: any, index: number) => `${index + 1}. ${item.item_name || 'Item'} — ${item.description || '—'} | Qty: ${item.quantity_ordered} | Unit Price: ${po.currency || 'USD'} ${Number(item.unit_price || 0).toLocaleString()} | Total: ${(Number(item.quantity_ordered || 0) * Number(item.unit_price || 0)).toLocaleString()}`).join('\\n') || 'No items listed.'}

Total PO Value: ${po.currency || 'USD'} ${Number(po.total_amount || 0).toLocaleString()}

NOTES
-----------------------------------------------------------
${String(po.notes || 'No additional remarks.').replace(/\\[Attached Docket:\\s*[^\\]]+\\]/gi, '').trim() || 'No additional remarks.'}
`;
        downloadBlob(new Blob([content], { type: 'text/plain;charset=utf-8' }), filename || `PO_${po.po_number || po.id}_Docket.txt`);
        return;
      }
      const blob = await apiFetchBlob(`/api/v1/procurement/purchase-orders/${poId}/file`);
      downloadBlob(blob, filename || `PO-${poId}.pdf`);
    } catch (e: any) {
      setBanner({ message: e?.message || 'Failed to download purchase order file.', type: 'error' });
    }
  };

  const handleViewPOFile = async (poId: string) => {
    try {
      const blob = await apiFetchBlob(`/api/v1/procurement/purchase-orders/${poId}/file?inline=true`);
      const po = purchaseOrders.find((order: any) => String(order.id) === String(poId));
      openUniversalFileViewer({ blob, fileName: po?.attachment_file_name || `PO-${po?.po_number || poId}.pdf`, title: `Purchase Order ${po?.po_number || ''}`.trim() });
    } catch (e: any) {
      setBanner({ message: e?.message || 'Could not view purchase order attachment.', type: 'error' });
    }
  };

  const handleViewPurchaseOrderPaymentReceipt = async (payment: any) => {
    try {
      const blob = await apiFetchBlob(`/api/v1/operational-expenses/${payment.expense_id}/payments/${payment.id}/receipt`);
      openUniversalFileViewer({ blob, fileName: payment.receipt_name || 'Payment receipt', title: 'Finance payment receipt' });
    } catch (e: any) {
      setBanner({ message: e?.message || 'Could not view the payment receipt.', type: 'error' });
    }
  };

  const handleDownloadPurchaseOrderPaymentReceipt = async (payment: any) => {
    try {
      const blob = await apiFetchBlob(`/api/v1/operational-expenses/${payment.expense_id}/payments/${payment.id}/receipt`);
      downloadBlob(blob, payment.receipt_name || `Payment_Receipt_${payment.id}`);
    } catch (e: any) {
      setBanner({ message: e?.message || 'Could not download the payment receipt.', type: 'error' });
    }
  };

  const poHasReceipts = (po: any) => (po?.items || []).some((item: any) => Number(item.quantity_received || 0) > 0)
    || ['PARTIALLY_RECEIVED', 'RECEIVED', 'CLOSED'].includes(String(po?.status || '').toUpperCase());
  const poCanReceive = (po: any) => ['APPROVED', 'SENT_TO_SUPPLIER', 'PARTIALLY_RECEIVED'].includes(String(po?.status || '').toUpperCase());

  const openEditPO = (po: any) => {
    if (poHasReceipts(po)) return;
    setEditingPO(po);
    setEditPoForm({
      supplier_name: po.supplier_name || po.vendor_name || po.vendor || po.supplier || '',
      project_id: po.project_id || '',
      category: po.category || '',
      currency: po.currency || 'USD',
      notes: String(po.notes || '').replace(/\[Attached Docket:\s*([^\]]+)\]/gi, '').trim(),
      items: (po.items || []).map((item: any) => ({
        id: item.id,
        item_name: item.item_name || '',
        description: item.description || '',
        quantity_ordered: Number(item.quantity_ordered) || 1,
        unit_price: Number(item.unit_price) || 0,
      })),
    });
  };

  const saveEditedPO = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!editingPO || poHasReceipts(editingPO)) return;
    setPoActionBusy(true);
    try {
      const updated = await apiFetch<any>(`/api/v1/procurement/purchase-orders/${editingPO.id}`, {
        method: 'PATCH',
        body: JSON.stringify({
          supplier_name: editPoForm.supplier_name.trim(),
          project_id: editPoForm.project_id || null,
          currency: editPoForm.currency,
          category: editPoForm.category.trim() || null,
          notes: editPoForm.notes.trim() || null,
          items: editPoForm.items.map((item) => ({
            item_name: item.item_name || undefined,
            description: item.description.trim(),
            quantity_ordered: Number(item.quantity_ordered),
            unit_price: Number(item.unit_price),
          })),
        }),
      });
      setPurchaseOrders((current) => current.map((item) => item.id === updated.id ? updated : item));
      setSelectedPO((current: any | null) => current?.id === updated.id ? updated : current);
      setEditingPO(null);
      setBanner({ message: `Purchase Order ${updated.po_number} updated.`, type: 'success' });
    } catch (error: any) {
      setBanner({ message: error?.message || 'Could not update the purchase order.', type: 'error' });
    } finally {
      setPoActionBusy(false);
    }
  };

  const openReceivePO = (po: any) => {
    setReceivingPO(po);
    const quantities: Record<string, number> = {};
    (po.items || []).forEach((item: any) => {
      quantities[item.id] = Math.max(0, Number(item.quantity_ordered || 0) - Number(item.quantity_received || 0));
    });
    setReceiptQuantities(quantities);
    setSelectedReceiptItemIds([]);
  };

  const savePOReceipt = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!receivingPO || selectedReceiptItemIds.length === 0) return;
    setPoActionBusy(true);
    try {
      const selectedQuantities = Object.fromEntries(
        selectedReceiptItemIds.map((itemId) => [itemId, Number(receiptQuantities[itemId]) || 0]),
      );
      const updated = await receivePurchaseOrderGoods(receivingPO.id, selectedQuantities);
      setPurchaseOrders((current) => current.map((item) => item.id === updated.id ? updated : item));
      setSelectedPO((current: any | null) => current?.id === updated.id ? updated : current);
      setReceivingPO(null);
      setSelectedReceiptItemIds([]);
      setBanner({ message: `Goods received against PO ${updated.po_number}.`, type: 'success' });
    } catch (error: any) {
      setBanner({ message: error?.message || 'Could not record goods receipt.', type: 'error' });
    } finally {
      setPoActionBusy(false);
    }
  };

  const approvePurchaseOrder = async (po: any) => {
    if (!po?.id || approvingPoId) return;
    setApprovingPoId(String(po.id));
    try {
      const approved = await apiFetch<any>(`/api/v1/procurement/purchase-orders/${po.id}/approve`, { method: 'POST' });
      setPurchaseOrders((current) => current.map((item) => item.id === approved.id ? approved : item));
      setSelectedPO((current: any | null) => current?.id === approved.id ? approved : current);
      setBanner({ message: `Purchase Order ${approved.po_number} approved.`, type: 'success' });
    } catch (e: any) {
      setBanner({ message: e?.message || 'Could not approve purchase order.', type: 'error' });
    } finally {
      setApprovingPoId(null);
    }
  };

  const renderFilterBar = () => (
    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-xs space-y-3 relative z-30 mb-4">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
        {/* Left: Project Selector */}
        <div className="flex items-center gap-2">
          <div className="p-2 rounded-xl bg-indigo-100 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300">
            <Building2 size={16} />
          </div>
          <div className="flex-1 min-w-[200px]">
            <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-0.5">Project Scope</label>
            <SearchableSelect
              value={selectedProjectId}
              onChange={(val) => setSelectedProjectId(val)}
              options={[
                { value: '', label: 'All Projects (Organisation-Wide)' },
                ...projects.map((p: any) => ({
                  value: p.id,
                  label: `${p.name}${p.code ? ` (${p.code})` : ''}`,
                })),
              ]}
              placeholder="All Projects (Organisation-Wide)"
              searchable={projects.length > 5}
            />
          </div>
        </div>
        {/* Right: Date Presets */}
        <div className="flex flex-col sm:flex-row sm:items-center gap-1.5 w-full sm:w-auto">
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 mr-1 mb-0.5 sm:mb-0 block">Date Range:</span>
          <div className="flex items-center flex-wrap gap-1.5">
          {(['ALL', 'TODAY', '10_DAYS', '30_DAYS'] as const).map((preset) => (
            <button
              key={preset}
              type="button"
              onClick={() => { setDatePreset(preset); setShowCustomDatePopover(false); }}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${
                datePreset === preset ? 'bg-indigo-600 text-white shadow-sm' : 'bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300'
              }`}
            >
              {preset === 'ALL' ? 'All Time' : preset === 'TODAY' ? 'Today' : preset === '10_DAYS' ? 'Last 10 Days' : 'Last 30 Days'}
            </button>
          ))}
          <button
            type="button"
            onClick={() => { setDatePreset('CUSTOM'); setShowCustomDatePopover((p) => !p); }}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 ${
              datePreset === 'CUSTOM' ? 'bg-indigo-600 text-white shadow-sm' : 'bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300'
            }`}
          >
            <Clock size={13} /> Custom Range <ChevronRight size={13} className={`transition-transform duration-200 ${showCustomDatePopover ? 'rotate-90' : ''}`} />
          </button>
          </div>
        </div>
      </div>

      {datePreset === 'CUSTOM' && !showCustomDatePopover && (customStartDate || customEndDate) && (
        <div className="flex items-center gap-2 bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-800 px-3 py-1 rounded-lg text-xs font-mono text-indigo-900 dark:text-indigo-300">
          <span>{customStartDate ? new Date(customStartDate).toLocaleDateString() : 'Start'} — {customEndDate ? new Date(customEndDate).toLocaleDateString() : 'Now'}</span>
          <button type="button" onClick={() => setShowCustomDatePopover(true)} className="font-bold underline text-[11px] hover:text-indigo-700 ml-1">Edit</button>
        </div>
      )}

      {datePreset === 'CUSTOM' && showCustomDatePopover && (
        <div className="absolute top-full right-0 mt-2 z-50 w-full sm:w-[540px] bg-white dark:bg-slate-900 border-2 border-indigo-200 dark:border-indigo-900 rounded-2xl shadow-2xl p-4 space-y-4">
          <div className="flex items-center justify-between border-b pb-3 border-slate-200 dark:border-slate-700">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-indigo-100 dark:bg-indigo-950 text-indigo-600 flex items-center justify-center"><Calendar size={15} /></div>
              <div>
                <h4 className="font-bold text-sm text-slate-900 dark:text-white">Custom Date &amp; Time Range</h4>
                <p className="text-[11px] text-slate-500">Select explicit start &amp; end timestamps for reporting</p>
              </div>
            </div>
            <button type="button" onClick={() => setShowCustomDatePopover(false)} className="p-1 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500"><X size={16} /></button>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="p-3 border border-slate-200 dark:border-slate-700 rounded-xl bg-slate-50 dark:bg-slate-800/50 space-y-2">
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5"><Calendar size={13} className="text-indigo-600" /> Start Date &amp; Time</label>
              <AppDateTimePicker
                mode="datetime"
                value={customStartDate}
                onChange={(val) => setCustomStartDate(val)}
                placeholder="Select start date & time"
              />
            </div>
            <div className="p-3 border border-slate-200 dark:border-slate-700 rounded-xl bg-slate-50 dark:bg-slate-800/50 space-y-2">
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5"><Calendar size={13} className="text-indigo-600" /> End Date &amp; Time</label>
              <AppDateTimePicker
                mode="datetime"
                value={customEndDate}
                onChange={(val) => setCustomEndDate(val)}
                placeholder="Select end date & time"
              />
            </div>
          </div>
          <div className="flex justify-end gap-2 pt-2 border-t border-slate-200 dark:border-slate-700">
            <button type="button" onClick={() => { setCustomStartDate(''); setCustomEndDate(''); setDatePreset('ALL'); setShowCustomDatePopover(false); }} className="px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 text-xs font-semibold hover:bg-slate-100 dark:hover:bg-slate-800">Clear</button>
            <button type="button" onClick={() => setShowCustomDatePopover(false)} className="px-4 py-1.5 rounded-lg bg-indigo-600 text-white font-bold text-xs shadow-sm hover:bg-indigo-700">Apply Range Filter</button>
          </div>
        </div>
      )}
    </div>
  );

  const unapprovedPurchaseOrdersCount = useMemo(() => {
    return scopedPurchaseOrders.filter((po) => {
      const st = String(po.status || '').toUpperCase();
      return st === 'WAITING_APPROVAL' || st === 'PENDING' || st === 'SUBMITTED' || st === 'DRAFT';
    }).length;
  }, [scopedPurchaseOrders]);

  const navItems: { id: ExecutiveTab; label: string; mobileLabel?: string; icon: React.ComponentType<{ size?: number; className?: string }>; badge?: number }[] = [
    { id: 'EXPENSES', label: 'Operational Expenses', mobileLabel: 'Expenses', icon: TrendingUp },
    { id: 'PURCHASE_ORDERS', label: 'Purchase Orders', mobileLabel: 'Purchases', icon: ShoppingCart, badge: unapprovedPurchaseOrdersCount },
    { id: 'FUEL', label: 'Fuel Management', mobileLabel: 'Fuel', icon: Fuel },
    { id: 'PEOPLE', label: 'Employees', mobileLabel: 'Workers', icon: Users },
    { id: 'HSE', label: 'HSE & Safety', mobileLabel: 'Safety', icon: ShieldAlert },
    { id: 'PROJECTS', label: 'Projects', mobileLabel: 'Projects', icon: Briefcase },
    { id: 'EQUIPMENTS', label: 'Equipments', mobileLabel: 'Fleet', icon: Truck },
    { id: 'COMPLIANCE', label: 'Compliance & Documents', mobileLabel: 'Compliance', icon: Shield },
  ];

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 flex flex-row selection:bg-indigo-500 selection:text-white">
      {/* ─── Thin Quick-Action Left Sidebar (Large Screens Only) ─────────────────── */}
      <aside
        aria-label="Priority Quick Action Forms Sidebar"
        className="hidden lg:flex flex-col items-center py-4 px-2 bg-white dark:bg-slate-950 text-slate-700 dark:text-slate-200 w-14 border-r border-slate-200 dark:border-slate-800 shrink-0 sticky top-0 z-40 h-screen select-none shadow-xs no-print"
      >
        <Link href="/" className="w-10 h-10 rounded-xl bg-slate-100 dark:bg-slate-800/80 hover:bg-slate-200 dark:hover:bg-slate-700 border border-slate-200/80 dark:border-slate-700/60 flex items-center justify-center shadow-xs mb-2 group relative shrink-0 transition-all duration-200" title="Cestos Operations">
          <AppLogo size={28} className="rounded-lg shrink-0" />
          <span className="absolute left-14 bg-slate-900 dark:bg-slate-800 text-white text-xs font-semibold px-2.5 py-1.5 rounded-lg shadow-2xl whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-[100000] border border-slate-700/80 flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-indigo-500" />
            Cestos Operations
          </span>
        </Link>
        <div className="w-8 h-px bg-slate-200 dark:bg-slate-800 shrink-0 my-1" />
        <div className="flex flex-col items-center space-y-3 flex-1 overflow-y-auto scrollbar-none w-full py-1">
          <button
            type="button"
            onClick={() => setShowAddPoModal(true)}
            className="relative group w-10 h-10 rounded-xl bg-slate-100 dark:bg-slate-800/80 hover:bg-indigo-600 hover:text-white text-slate-600 dark:text-slate-300 flex items-center justify-center transition-all duration-200 shadow-xs hover:shadow-md hover:scale-105 active:scale-95 border border-slate-200/80 dark:border-slate-700/60 hover:border-indigo-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
            aria-label="Issue Purchase Order Form"
          >
            <ShoppingCart size={18} />
            <span className="absolute left-14 bg-slate-900 dark:bg-slate-800 text-white text-xs font-semibold px-2.5 py-1.5 rounded-lg shadow-2xl whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-[100000] border border-slate-700/80 flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-indigo-500" />
              Issue Purchase Order Form
            </span>
          </button>
          <button
            type="button"
            onClick={() => setShowExpenseModal(true)}
            className="relative group w-10 h-10 rounded-xl bg-slate-100 dark:bg-slate-800/80 hover:bg-indigo-600 hover:text-white text-slate-600 dark:text-slate-300 flex items-center justify-center transition-all duration-200 shadow-xs hover:shadow-md hover:scale-105 active:scale-95 border border-slate-200/80 dark:border-slate-700/60 hover:border-indigo-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
            aria-label="Submit Expense Claim Form"
          >
            <DollarSign size={18} />
            <span className="absolute left-14 bg-slate-900 dark:bg-slate-800 text-white text-xs font-semibold px-2.5 py-1.5 rounded-lg shadow-2xl whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-[100000] border border-slate-700/80 flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-indigo-500" />
              Submit Expense Claim Form
            </span>
          </button>
          <button
            type="button"
            onClick={() => setShowRegisterUserModal(true)}
            className="relative group w-10 h-10 rounded-xl bg-slate-100 dark:bg-slate-800/80 hover:bg-indigo-600 hover:text-white text-slate-600 dark:text-slate-300 flex items-center justify-center transition-all duration-200 shadow-xs hover:shadow-md hover:scale-105 active:scale-95 border border-slate-200/80 dark:border-slate-700/60 hover:border-indigo-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
            aria-label="Register Personnel / User Form"
          >
            <UserPlus size={18} />
            <span className="absolute left-14 bg-slate-900 dark:bg-slate-800 text-white text-xs font-semibold px-2.5 py-1.5 rounded-lg shadow-2xl whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-[100000] border border-slate-700/80 flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-indigo-500" />
              Register Personnel / User Form
            </span>
          </button>
        </div>
        <div className="w-8 h-px bg-slate-200 dark:bg-slate-800 shrink-0 my-2" />
        <button
          type="button"
          onClick={() => void signOut()}
          className="relative group w-10 h-10 rounded-xl bg-slate-100 dark:bg-slate-800/80 hover:bg-red-600 dark:hover:bg-red-600 text-slate-600 dark:text-slate-400 hover:text-white dark:hover:text-white flex items-center justify-center transition-all duration-200 shadow-xs hover:shadow-md hover:scale-105 active:scale-95 border border-slate-200/80 dark:border-slate-700/60 hover:border-red-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500 shrink-0"
          aria-label="Sign Out"
        >
          <LogOut size={18} />
          <span className="absolute left-14 bg-slate-900 dark:bg-slate-800 text-white text-xs font-semibold px-2.5 py-1.5 rounded-lg shadow-2xl whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-[100000] border border-slate-700/80 flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-red-500" />
            Sign Out
          </span>
        </button>
      </aside>

      <div className="flex-1 min-w-0 flex flex-col">
      {/* ─── Top Header Navigation ─────────────────────────────────────────────── */}
      <header className="sticky top-0 z-40 bg-white/90 dark:bg-slate-900/90 backdrop-blur-md border-b border-slate-200 dark:border-slate-800 shadow-xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-indigo-600 text-white shadow-md shadow-indigo-200 dark:shadow-none">
              <Users size={20} />
            </div>
            <div>
              <h1 className="text-base font-bold tracking-tight text-slate-900 dark:text-white flex items-center gap-2">
                Executive Portal
               
              </h1>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 font-medium hidden sm:block">
                Cestos Operations Dashboard
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => void loadData()}
              disabled={loading}
              className="p-2 rounded-xl border border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 transition"
              title="Refresh Portal Data"
            >
              <RefreshCw size={16} className={loading ? 'animate-spin text-indigo-600' : ''} />
            </button>
            
            <button
              onClick={() => setActiveTab('NOTIFICATIONS')}
              className={`relative p-2 rounded-xl border transition ${
                notificationCount > 0
                  ? 'border-indigo-300 dark:border-indigo-800 bg-indigo-50/80 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400'
                  : 'border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300'
              }`}
              title={notificationCount > 0 ? `${notificationCount} new notifications` : 'Notifications'}
            >
              <Bell size={16} className={notificationCount > 0 ? 'text-indigo-600 dark:text-indigo-400 animate-pulse' : ''} />
              {notificationCount > 0 && (
                <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 bg-red-500 text-white text-[9px] font-bold rounded-full flex items-center justify-center border-2 border-white dark:border-slate-950 shadow-xs">
                  {notificationCount > 99 ? '99+' : notificationCount}
                </span>
              )}
            </button>

            <button
              onClick={() => void signOut()}
              className="lg:hidden p-2 rounded-xl border border-slate-200 dark:border-slate-800 hover:bg-red-50 dark:hover:bg-red-950/40 text-slate-600 dark:text-slate-300 hover:text-red-600 dark:hover:text-red-400 transition"
              title="Sign Out"
            >
              <LogOut size={16} />
            </button>

            <button 
              onClick={() => router.push('/executive-portal/my-profile')}
              className="hidden md:flex items-center gap-2 pl-3 border-l border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/50 p-1.5 -my-1.5 rounded-lg transition text-left"
              title="View My Profile"
            >
              <div className="w-8 h-8 rounded-full bg-indigo-600 text-white font-bold text-xs flex items-center justify-center shadow-xs">
                {user?.first_name ? user.first_name[0] : 'E'}
              </div>
              <div className="text-left text-xs">
                <p className="font-bold text-slate-900 dark:text-slate-100 leading-tight">
                  {user?.first_name ? `${user.first_name} ${user.last_name || ''}`.trim() : 'Executive'}
                </p>
                <p className="text-[10px] text-slate-500 font-medium">View My Profile</p>
              </div>
            </button>

            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="!hidden p-2 rounded-xl text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
            >
              {mobileMenuOpen ? <X size={20} /> : <Menu size={20} />}
            </button>
          </div>
        </div>

        {/* Desktop Tab Navigation Bar */}
        <div className="hidden md:block bg-slate-100/70 dark:bg-slate-900/60 border-t border-slate-200 dark:border-slate-800 overflow-x-auto max-w-full scrollbar-none">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex items-center gap-1 py-1.5">
            {navItems.map((item) => {
              const IconComp = item.icon;
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => setActiveTab(item.id)}
                  className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition whitespace-nowrap ${
                    isActive
                      ? 'bg-indigo-600 text-white shadow-xs'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-white/60 dark:hover:bg-slate-800'
                  }`}
                >
                  <IconComp size={15} />
                  <span>{item.label}</span>
                  {item.badge !== undefined && item.badge > 0 && (
                    <span
                      className={`px-1.5 py-0.2 rounded-full text-[10px] font-black ${
                        isActive ? 'bg-amber-400 text-slate-950' : 'bg-amber-500 text-white'
                      }`}
                    >
                      {item.badge}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      </header>

      {/* Mobile Drawer Navigation */}
      {mobileMenuOpen && (
        <div className="md:hidden bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 p-4 space-y-1">
          {navItems.map((item) => {
            const IconComp = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => {
                  setActiveTab(item.id);
                  setMobileMenuOpen(false);
                }}
                className={`w-full flex items-center justify-between px-4 py-2.5 rounded-xl text-xs font-bold transition ${
                  isActive
                    ? 'bg-indigo-600 text-white'
                    : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <IconComp size={16} />
                  <span>{item.label}</span>
                </div>
                {item.badge !== undefined && item.badge > 0 && (
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-amber-500 text-white">
                    {item.badge}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      )}

      {/* ─── Main Content Container ───────────────────────────────────────────── */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-3 sm:px-6 lg:px-8 py-4 sm:py-6 space-y-4 sm:space-y-6 pb-24 md:pb-6">
        {banner && (
          <div
            className={`flex items-center justify-between p-4 rounded-xl border text-xs font-semibold ${
              banner.type === 'error'
                ? 'bg-red-50 border-red-200 text-red-800 dark:bg-red-950/40 dark:border-red-800 dark:text-red-300'
                : 'bg-indigo-50 border-indigo-200 text-indigo-800 dark:bg-indigo-950/40 dark:border-indigo-800 dark:text-indigo-300'
            }`}
          >
            <div className="flex items-center gap-2">
              <AlertTriangle size={16} />
              <span>{banner.message}</span>
            </div>
            <button onClick={() => setBanner(null)} className="p-1 hover:opacity-70">
              <X size={15} />
            </button>
          </div>
        )}

        {/* ─── TAB 1: PEOPLE (Employees Table) ──────────────────────────────── */}
        {activeTab === 'PEOPLE' && (
          <div className="space-y-6">
            {/* Header Toolbar */}
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-xs space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 dark:border-slate-800 pb-4">
                <div>
                  <h2 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
                    Employees
                  </h2>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 font-medium">
                    {filteredEmployees.length} records · Cestos Operations
                  </p>
                </div>
              
              </div>

              {/* Search & Dropdown Filters */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                <div className="relative">
                  <Search size={15} className="absolute left-3 top-3 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Search employee name, number, email..."
                    value={peopleSearch}
                    onChange={(e) => setPeopleSearch(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-medium focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                  />
                </div>

                <div className="min-w-[150px]">
                  <SearchableSelect
                    value={deptFilter}
                    onChange={(val) => setDeptFilter(val)}
                    options={[
                      { value: 'ALL', label: 'All Departments' },
                      ...departmentsList.map((d) => ({ value: d, label: d })),
                    ]}
                    searchable={departmentsList.length > 5}
                  />
                </div>

                <div className="min-w-[150px]">
                  <SearchableSelect
                    value={posFilter}
                    onChange={(val) => setPosFilter(val)}
                    options={[
                      { value: 'ALL', label: 'All Positions' },
                      ...positionsList.map((p) => ({ value: p, label: p })),
                    ]}
                    searchable={positionsList.length > 5}
                  />
                </div>

                <div className="min-w-[150px]">
                  <SearchableSelect
                    value={roleFilter}
                    onChange={(val) => setRoleFilter(val)}
                    options={[
                      { value: 'ALL', label: 'All User Roles' },
                      ...rolesList.map((r) => ({ value: r, label: r })),
                    ]}
                    searchable={rolesList.length > 5}
                  />
                </div>
              </div>
            </div>

            {/* Employees Table */}
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden shadow-xs">
              <div className="overflow-x-auto max-w-full">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-800/60 text-[11px] font-extrabold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                      <th className="px-5 py-3.5">Employee Name</th>
                      <th className="px-5 py-3.5">Department &amp; Role</th>
                      <th className="px-5 py-3.5">Status</th>
                      <th className="px-5 py-3.5">Home Location</th>
                      <th className="px-5 py-3.5">Assigned Project</th>
                      <th className="px-5 py-3.5 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-xs font-medium">
                    {filteredEmployees.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="px-5 py-12 text-center text-slate-400">
                          <Users className="h-8 w-8 mx-auto mb-2 opacity-30 text-indigo-500" />
                          No employees found matching the specified filters.
                        </td>
                      </tr>
                    ) : (
                      filteredEmployees.slice((filteredEmployeesPage - 1) * 15, filteredEmployeesPage * 15).map((emp) => {
                        const fName = emp.first_name || '';
                        const lName = emp.last_name || '';
                        const nameStr = `${fName} ${lName}`.trim() || 'Employee Record';
                        const initial = fName ? fName[0].toUpperCase() : 'E';
                        const locName =
                          locations.find((l) => String(l.id) === String(emp.home_location_id))?.name ||
                          emp.home_location_name ||
                          'Headquarters';

                        return (
                          <tr key={emp.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition">
                            <td className="px-5 py-3.5">
                              <div className="flex items-center gap-3">
                                <div className="w-9 h-9 rounded-full bg-indigo-600 text-white font-bold flex items-center justify-center shrink-0 shadow-xs">
                                  {initial}
                                </div>
                                <div>
                                  <p className="font-bold text-slate-900 dark:text-white leading-tight">{nameStr}</p>
                                  <p className="text-[11px] font-mono text-slate-500 font-semibold mt-0.5">
                                    ID: {emp.employee_number || `EMP-${emp.id.slice(0, 6)}`}
                                  </p>
                                  <p className="text-[11px] text-slate-500 font-medium">{emp.job_title || 'Staff'}</p>
                                </div>
                              </div>
                            </td>
                            <td className="px-5 py-3.5">
                              <p className="font-bold text-slate-900 dark:text-white">{emp.department || 'Operations'}</p>
                              <p className="text-[11px] text-slate-500 font-medium">{emp.user_role || 'Staff'}</p>
                            </td>
                            <td className="px-5 py-3.5">
                              <StatusBadge status={emp.employment_status || (emp.is_active ? 'ACTIVE / AVAILABLE' : 'ARCHIVED')} />
                            </td>
                            <td className="px-5 py-3.5">
                              <span className="font-semibold text-slate-800 dark:text-slate-200 flex items-center gap-1">
                                <MapPin size={13} className="text-indigo-600" />
                                {locName}
                              </span>
                            </td>
                            <td className="px-5 py-3.5 space-y-0.5">
                              <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
                                {emp.current_project_name || emp.project_name || 'Unassigned / Available'}
                              </span>
                              {(emp.current_project_name || emp.project_name) && (
                                <span className="block text-[10px] text-slate-500 font-medium">Currently Deployed</span>
                              )}
                            </td>
                            <td className="px-5 py-3.5 text-right">
                              <Link
                                href={`/executive-portal/employees/${emp.id}`}
                                className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-indigo-50 dark:bg-indigo-950/80 hover:bg-indigo-100 text-indigo-700 dark:text-indigo-300 font-bold text-xs border border-indigo-200 dark:border-indigo-800 transition"
                              >
                                <Eye size={13} /> Profile
                              </Link>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
              <div className="flex items-center justify-between mt-4 px-4 py-3 bg-slate-50 dark:bg-slate-800/50 border-t border-slate-200 dark:border-slate-800 rounded-b-2xl">
                <span className="text-xs text-slate-500 font-medium">
                  Showing {Math.min(1 + (filteredEmployeesPage - 1) * 15, filteredEmployees.length)} - {Math.min(filteredEmployeesPage * 15, filteredEmployees.length)} of {filteredEmployees.length} records
                </span>
                <div className="flex items-center gap-2">
                  <button 
                    onClick={() => setFilteredemployeespage(p => Math.max(1, p - 1))} 
                    disabled={filteredEmployeesPage === 1}
                    className="px-3 py-1.5 text-xs font-bold border border-slate-200 dark:border-slate-700 rounded-lg disabled:opacity-40 disabled:cursor-not-allowed hover:bg-white dark:hover:bg-slate-800 transition"
                  >
                    Prev
                  </button>
                  <span className="text-xs font-bold px-2">
                    Page {filteredEmployeesPage} of {Math.max(1, Math.ceil(filteredEmployees.length / 15))}
                  </span>
                  <button 
                    onClick={() => setFilteredemployeespage(p => Math.min(Math.ceil(filteredEmployees.length / 15), p + 1))} 
                    disabled={filteredEmployeesPage >= Math.ceil(filteredEmployees.length / 15)}
                    className="px-3 py-1.5 text-xs font-bold border border-slate-200 dark:border-slate-700 rounded-lg disabled:opacity-40 disabled:cursor-not-allowed hover:bg-white dark:hover:bg-slate-800 transition"
                  >
                    Next
                  </button>
                </div>
              </div>

            </div>
          </div>
        )}

        {/* ─── TAB 2: EXPENSES (Financial Analytics & Vouchers) ─────────────── */}
        {activeTab === 'EXPENSES' && (
          <div className="space-y-6">
            {renderFilterBar()}
            <div>
              <h2 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
                Operational Expenses
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 font-medium">
                Expenditure tracking, vendor analytics, frequency intelligence, and expense claim management.
              </p>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-xs">
                <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Total Expenditure</p>
                <p className="text-2xl font-black text-slate-900 dark:text-white mt-1">
                  ${scopedExpenses.reduce((acc, e) => acc + Number(e.total_cost || e.amount || 0), 0).toLocaleString()}
                </p>
                <p className="text-[11px] text-indigo-600 font-bold mt-1">All Recorded Vouchers</p>
              </div>

              <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-xs">
                <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Total Claims</p>
                <p className="text-2xl font-black text-indigo-600 mt-1">{scopedExpenses.length}</p>
                <p className="text-[11px] text-indigo-600 font-bold mt-1">Operational Expense Claims</p>
              </div>

              <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-xs">
                <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Average Claim Value</p>
                <p className="text-2xl font-black text-emerald-600 mt-1">
                  ${(scopedExpenses.length > 0 ? scopedExpenses.reduce((acc, e) => acc + Number(e.total_cost || e.amount || 0), 0) / scopedExpenses.length : 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </p>
                <p className="text-[11px] text-emerald-600 font-bold mt-1">Mean expenditure per claim</p>
              </div>

              <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-xs">
                <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Pending Approvals</p>
                <p className="text-2xl font-black text-amber-600 mt-1">
                  $
                  {scopedExpenses
                    .filter((e) => (e.status || '').toUpperCase() === 'SUBMITTED' || (e.status || '').toUpperCase() === 'PENDING')
                    .reduce((acc, e) => acc + Number(e.total_cost || e.amount || 0), 0)
                    .toLocaleString()}
                </p>
                <p className="text-[11px] text-amber-600 font-bold mt-1">{unresolvedClaimsCount} Unresolved Claims</p>
              </div>
            </div>

            {/* Expenses Read Only Component */}
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-xs">
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
                <div className="p-8 text-center text-slate-500 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl my-4">No expense time-series data available for the selected range.</div>
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
                  <BarChart2 size={18} className="text-indigo-600" />
                  <div>
                    <h4 className="font-bold text-xs uppercase tracking-wider text-foreground flex items-center gap-2">
                      Analytics &amp; Purchasing Intelligence Charts
                      <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-300 normal-case">
                        {showPurchasingCharts ? 'Expanded' : 'Collapsed'}
                      </span>
                    </h4>
                    <p className="text-xs text-muted-foreground">Click to {showPurchasingCharts ? 'hide' : 'view'} expenditure, frequency, category, and vendor bar graphs</p>
                  </div>
                </div>
                {showPurchasingCharts ? <ChevronUp size={18} className="text-muted-foreground" /> : <ChevronDown size={18} className="text-muted-foreground" />}
              </button>

              {showPurchasingCharts && (() => {
                const renderExecCostCard = (items: any[], titleText: string) => (
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

                const renderExecFreqCard = (items: any[], titleText: string) => (
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

                const renderExecVendorCard = (items: any[], titleText: string) => (
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
                    {renderExecCostCard(topItemsByCostData, "Top Purchased Items by Cost ($)")}

                    {/* Most Frequently Purchased Items */}
                    {renderExecFreqCard(topItemsByFrequencyData, "Most Frequently Purchased Items")}

                    {/* Purchase orders by category */}
                    <PurchaseOrderCategoryChart orders={scopedPurchaseOrders?.length ? scopedPurchaseOrders : scopedExpenses} color="#4f46e5" />

                    {/* Vendor Expenditure */}
                    {renderExecVendorCard(topVendorData, "Vendor Breakdown ($)")}
                  </div>
                );
              })()}
            </div>

              <OperationalExpensesWorkspace readOnly={true} />
            </div>
          </div>
        )}

        {/* HSE TAB */}
            {activeTab === 'HSE' && (
              <div className="space-y-6">
                {renderFilterBar()}
                <div className="flex items-center justify-between flex-wrap gap-3">
                  <div>
                    <h2 className="text-xl font-bold text-slate-900 dark:text-white">HSE Incidents &amp; Safety Analytics</h2>
                    <p className="text-xs text-slate-500">Report &amp; track health, safety &amp; environmental incidents, hazards and near-miss trends</p>
                  </div>
                  
                </div>

                {/* HSE KPI Analytics Summary Cards */}
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5">
                  <div className="bg-white dark:bg-slate-900 border rounded-xl p-4 space-y-1">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Total Safety Incidents</span>
                    <p className="text-xl font-black text-slate-900 dark:text-white">
                      {scopedIncidents.length}
                    </p>
                    <span className="text-[11px] text-slate-500 font-medium">Logged in date range</span>
                  </div>

                  <div className="bg-white dark:bg-slate-900 border rounded-xl p-4 space-y-1">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Critical / High Severity</span>
                    <p className="text-xl font-black text-red-600">
                      {scopedIncidents.filter((i) => ['CRITICAL', 'HIGH'].includes(String(i.severity || '').toUpperCase())).length}
                    </p>
                    <span className="text-[11px] text-slate-500 font-medium">High-risk safety events</span>
                  </div>

                  <div className="bg-white dark:bg-slate-900 border rounded-xl p-4 space-y-1">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Near Misses &amp; Hazards</span>
                    <p className="text-xl font-black text-amber-600">
                      {scopedIncidents.filter((i) => ['NEAR_MISS', 'HAZARD_OBSERVATION', 'HAZARD'].includes(String(i.incident_type || '').toUpperCase())).length}
                    </p>
                    <span className="text-[11px] text-slate-500 font-medium">Proactive hazard logs</span>
                  </div>

                  <div className="bg-white dark:bg-slate-900 border rounded-xl p-4 space-y-1">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Environmental &amp; Property</span>
                    <p className="text-xl font-black text-blue-600">
                      {scopedIncidents.filter((i) => ['ENVIRONMENTAL_SPILL', 'PROPERTY_DAMAGE', 'ENVIRONMENTAL'].includes(String(i.incident_type || '').toUpperCase())).length}
                    </p>
                    <span className="text-[11px] text-slate-500 font-medium">Spill &amp; damage records</span>
                  </div>
                </div>

                {/* HSE Visualizations Grid: Line Chart & Bar Chart */}
                <div className="grid lg:grid-cols-2 gap-4">
                  {/* HSE Daily Time Series Line Chart */}
                  <div className="bg-white dark:bg-slate-900 rounded-xl border p-4 space-y-3">
                    <div className="flex items-center justify-between flex-wrap gap-2">
                      <div>
                        <h3 className="font-bold text-sm text-slate-900 dark:text-white flex items-center gap-2">
                          <TrendingUp size={16} className="text-red-600" /> Daily HSE Incident &amp; Hazard Trend
                        </h3>
                        <p className="text-xs text-slate-500">Chronological daily breakdown of total safety incidents and high-severity events</p>
                      </div>
                    </div>

                    {hseTimeSeriesData.length === 0 ? (
                      <div className="h-48 flex items-center justify-center border border-dashed rounded-lg text-xs text-slate-500">
                        No daily safety incident trend data available for the selected range.
                      </div>
                    ) : (
                      <div className="h-60 w-full pt-2">
                        <ResponsiveContainer width="100%" height="100%">
                          <ComposedChart data={hseTimeSeriesData} margin={{ top: 10, right: 20, left: -20, bottom: 5 }}>
                            <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                            <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                            <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
                            <Tooltip
                              contentStyle={{ backgroundColor: 'rgba(15, 23, 42, 0.9)', borderRadius: '8px', border: 'none', color: '#fff', fontSize: '12px' }}
                              formatter={(val: any, name: any) => [val, name]}
                            />
                            <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '8px' }} />
                            <Line type="monotone" dataKey="totalIncidents" name="Total Incidents" stroke="#ef4444" strokeWidth={2.5} dot={{ r: 4 }} />
                            <Line type="monotone" dataKey="criticalCount" name="Critical / High" stroke="#b91c1c" strokeWidth={2.5} dot={{ r: 4 }} />
                            <Line type="monotone" dataKey="nearMissCount" name="Near Misses / Hazards" stroke="#f59e0b" strokeWidth={2.5} dot={{ r: 4 }} />
                          </ComposedChart>
                        </ResponsiveContainer>
                      </div>
                    )}
                  </div>

                  {/* HSE Category Distribution Bar Chart */}
                  <div className="bg-white dark:bg-slate-900 rounded-xl border p-4 space-y-3">
                    <div className="flex items-center justify-between flex-wrap gap-2">
                      <div>
                        <h3 className="font-bold text-sm text-slate-900 dark:text-white flex items-center gap-2">
                          <ShieldCheck size={16} className="text-orange-600" /> Incident Distribution by Category
                        </h3>
                        <p className="text-xs text-slate-500">Breakdown of safety occurrences across categories</p>
                      </div>
                    </div>

                    {scopedIncidents.length === 0 ? (
                      <div className="h-48 flex items-center justify-center border border-dashed rounded-lg text-xs text-slate-500">
                        No incident category distribution data available for the selected range.
                      </div>
                    ) : (
                      <div className="h-60 w-full pt-2">
                        <ResponsiveContainer width="100%" height="100%">
                          <BarChart data={hseCategoryBarData} margin={{ top: 10, right: 20, left: -20, bottom: 5 }}>
                            <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                            <XAxis dataKey="category" tick={{ fontSize: 10 }} interval={0} angle={-15} textAnchor="end" height={45} />
                            <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
                            <Tooltip
                              contentStyle={{ backgroundColor: 'rgba(15, 23, 42, 0.9)', borderRadius: '8px', border: 'none', color: '#fff', fontSize: '12px' }}
                              formatter={(val: any) => [`${val} Record(s)`, 'Incidents']}
                            />
                            <Bar dataKey="count" name="Incidents Count" fill="#ef4444" radius={[4, 4, 0, 0]} />
                          </BarChart>
                        </ResponsiveContainer>
                      </div>
                    )}
                  </div>
                </div>

                {/* HSE Incident Log Table & Detailed Cards */}
                <div className="bg-white dark:bg-slate-900 rounded-xl border p-4 space-y-4">
                  <div className="flex items-center justify-between flex-wrap gap-2 border-b pb-3">
                    <div>
                      <h3 className="font-bold text-sm text-slate-900 dark:text-white flex items-center gap-2">
                        <ShieldCheck className="text-red-600" size={16} /> Reported HSE Safety Incidents &amp; Hazards Log
                      </h3>
                      <p className="text-xs text-slate-500">Official log of safety events, near-misses, environmental spills, and corrective actions</p>
                    </div>
                  </div>

                  {scopedIncidents.length === 0 ? (
                    <p className="text-xs text-slate-500 py-12 text-center">No safety incidents reported for this site scope.</p>
                  ) : (<>

<div className="overflow-x-auto max-w-full">
                      <table className="w-full text-xs text-left border-collapse">
                        <thead>
                          <tr className="border-b bg-slate-50 dark:bg-slate-800/50 text-slate-500">
                            <th className="p-2.5 font-bold">Date &amp; Time</th>
                            <th className="p-2.5 font-bold">Title / Incident Summary</th>
                            <th className="p-2.5 font-bold">Category</th>
                            <th className="p-2.5 font-bold">Severity</th>
                            <th className="p-2.5 font-bold">Location / Asset</th>
                            <th className="p-2.5 text-right font-bold">Actions</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y">
                          {scopedIncidents.slice((scopedIncidentsPage - 1) * 15, scopedIncidentsPage * 15).map((inc: any) => (
                            <tr key={inc.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30">
                              <td className="p-2.5 font-medium whitespace-nowrap">
                                {inc.incident_date ? new Date(inc.incident_date).toLocaleString() : inc.created_at?.slice(0, 10) || '—'}
                              </td>
                              <td className="p-2.5 font-bold text-slate-900 dark:text-white max-w-[220px] truncate">
                                {inc.title || 'Safety Incident'}
                              </td>
                              <td className="p-2.5">
                                <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                                  {String(inc.incident_type || 'HAZARD').replaceAll('_', ' ')}
                                </span>
                              </td>
                              <td className="p-2.5">
                                <StatusBadge status={String(inc.severity || 'MEDIUM').replaceAll('_', ' ')} />
                              </td>
                              <td className="p-2.5 text-slate-600 dark:text-slate-400 max-w-[180px] truncate">
                                {inc.location || locations.find((s) => String(s.id) === String(inc.site_location_id))?.name || 'Site Field Area'}
                              </td>
                              <td className="p-2.5 text-right">
                                <button
                                  type="button"
                                  onClick={() => setViewingIncident(inc)}
                                  className="px-2.5 py-1 bg-red-50 hover:bg-red-100 dark:bg-red-950/50 dark:hover:bg-red-900/60 text-red-700 dark:text-red-300 rounded font-semibold text-[11px] inline-flex items-center gap-1 transition"
                                >
                                  <FileText size={12} /> View Details
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
              <div className="flex items-center justify-between mt-4 px-4 py-3 bg-slate-50 dark:bg-slate-800/50 border-t border-slate-200 dark:border-slate-800 rounded-b-2xl">
                <span className="text-xs text-slate-500 font-medium">
                  Showing {Math.min(1 + (scopedIncidentsPage - 1) * 15, scopedIncidents.length)} - {Math.min(scopedIncidentsPage * 15, scopedIncidents.length)} of {scopedIncidents.length} records
                </span>
                <div className="flex items-center gap-2">
                  <button 
                    onClick={() => setScopedincidentspage(p => Math.max(1, p - 1))} 
                    disabled={scopedIncidentsPage === 1}
                    className="px-3 py-1.5 text-xs font-bold border border-slate-200 dark:border-slate-700 rounded-lg disabled:opacity-40 disabled:cursor-not-allowed hover:bg-white dark:hover:bg-slate-800 transition"
                  >
                    Prev
                  </button>
                  <span className="text-xs font-bold px-2">
                    Page {scopedIncidentsPage} of {Math.max(1, Math.ceil(scopedIncidents.length / 15))}
                  </span>
                  <button 
                    onClick={() => setScopedincidentspage(p => Math.min(Math.ceil(scopedIncidents.length / 15), p + 1))} 
                    disabled={scopedIncidentsPage >= Math.ceil(scopedIncidents.length / 15)}
                    className="px-3 py-1.5 text-xs font-bold border border-slate-200 dark:border-slate-700 rounded-lg disabled:opacity-40 disabled:cursor-not-allowed hover:bg-white dark:hover:bg-slate-800 transition"
                  >
                    Next
                  </button>
                </div>
              </div>


</>
)}
                </div>
              </div>
            )}

            

        {/* ─── TAB: PROJECTS ──────────────────────────────────────────────── */}
        {activeTab === 'PROJECTS' && (
          <div className="space-y-6 fade-in">
            {renderFilterBar()}
            <div className="border-b pb-4 border-slate-200 dark:border-slate-800">
              <h2 className="text-lg font-black text-slate-900 dark:text-white">Projects Overview ({scopedProjects.length})</h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                High-level view of active and completed projects for the selected scope.
              </p>
            </div>
            <ProjectRegister dashboard={false} readOnly={true} onSelectProject={(id) => router.push(`/executive-portal/projects/${id}`)} />
          </div>
        )}

        {/* ─── TAB: EQUIPMENTS ─────────────────────────────────────────────── */}
        {activeTab === 'EQUIPMENTS' && (
          <div className="space-y-6 fade-in">
            {renderFilterBar()}
            <div className="border-b pb-4 border-slate-200 dark:border-slate-800">
              <h2 className="text-lg font-black text-slate-900 dark:text-white flex items-center gap-2">
                <Truck size={18} className="text-indigo-600" /> Equipment &amp; Asset Management ({scopedAssets.length} Assets)
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                Overview of all fleet units, heavy machinery, and operational assets for the selected scope.
              </p>
            </div>
            <div className="flex gap-1 border-b border-slate-200 dark:border-slate-800" role="tablist" aria-label="Equipment sections">
              {([{ id: 'ASSETS', label: 'Assets', icon: Truck }, { id: 'MAINTENANCE', label: 'Maintenance', icon: Wrench }] as const).map((tab) => {
                const Icon = tab.icon;
                const selected = equipmentTab === tab.id;
                return <button key={tab.id} type="button" role="tab" aria-selected={selected} onClick={() => setEquipmentTab(tab.id)} className={`inline-flex items-center gap-2 border-b-2 px-4 py-3 text-sm font-semibold transition ${selected ? 'border-indigo-600 text-indigo-700 dark:text-indigo-300' : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'}`}><Icon size={16} />{tab.label}</button>;
              })}
            </div>
            {equipmentTab === 'ASSETS' ? (
              <div role="tabpanel" className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-xs">
                <ResourceWorkspace resource="assets" readOnly={true} />
              </div>
            ) : (
              <div role="tabpanel" className="space-y-6">
                {renderFilterBar()}
                <div className="flex flex-wrap items-end justify-between gap-3 border-b border-slate-200 pb-4 dark:border-slate-800">
                  <div>
                    <h3 className="flex items-center gap-2 text-xl font-bold text-slate-900 dark:text-white"><Wrench size={19} className="text-indigo-600" /> Maintenance Records</h3>
                    <p className="mt-1 text-xs text-slate-500">Read-only work orders, breakdown repair cards, preventive maintenance cards, and supporting files.</p>
                  </div>
                  <span className="text-xs font-semibold text-slate-500">{scopedMaintenanceRecords.length} records</span>
                </div>
                {scopedMaintenanceRecords.length === 0 ? (
                  <div className="rounded-xl border border-slate-200 bg-white p-10 text-center text-sm text-slate-500 dark:border-slate-800 dark:bg-slate-900">
                    No work orders or maintenance job cards are available for this project and date range.
                  </div>
                ) : (
                  <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                    {scopedMaintenanceRecords.slice((scopedMaintenanceRecordsPage - 1) * 15, scopedMaintenanceRecordsPage * 15).map((record: any) => {
                      const asset = assets.find((item: any) => String(item.id) === String(record.asset_id));
                      const equipment = asset
                        ? [asset.asset_number || asset.code, asset.name || asset.title || asset.model].filter(Boolean).join(' — ')
                        : record.pm_control?.equipment || record.job_control?.equipment || record.pm_control?.fleet_unit_id || record.job_control?.fleet_unit_id || '—';
                      const date = record.scheduled_date || record.created_at;
                      return (
                        <article key={`${record.record_category}-${record.id}`} className="space-y-3 rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
                          <div className="flex items-start justify-between gap-3">
                            <div className="min-w-0">
                              <span className={`inline-flex border px-2 py-0.5 text-[10px] font-bold uppercase ${record.display_type === 'PREVENTIVE' ? 'border-blue-200 bg-blue-50 text-blue-800 dark:border-blue-900 dark:bg-blue-950/40 dark:text-blue-300' : 'border-red-200 bg-red-50 text-red-800 dark:border-red-900 dark:bg-red-950/40 dark:text-red-300'}`}>{record.record_kind}</span>
                              <h4 className="mt-2 truncate text-sm font-bold text-slate-900 dark:text-white">{record.display_title || record.title || record.job_card_number || record.wo_number || 'Maintenance record'}</h4>
                            </div>
                            <StatusBadge status={record.status || 'OPEN'} />
                          </div>
                          <p className="text-xs text-slate-600 dark:text-slate-400">Equipment: <span className="font-semibold">{equipment}</span></p>
                          <p className="line-clamp-3 min-h-10 whitespace-pre-line text-xs text-slate-600 dark:text-slate-400">{record.description || record.reported_failure || record.corrective_action || record.notes || 'No notes provided.'}</p>
                          <div className="flex items-center justify-between border-t border-slate-100 pt-2 text-[11px] text-slate-500 dark:border-slate-800">
                            <span>{record.scheduled_date ? 'Scheduled' : 'Created'}: {date ? new Date(date).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' }) : '—'}</span>
                            <span>{record.priority || record.job_card_number || record.wo_number || ''}</span>
                          </div>
                          <button type="button" onClick={() => setSelectedMaintenanceRecord({ record, kind: record.record_category })} className="inline-flex items-center gap-1.5 border border-slate-300 px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800">
                            <Eye size={14} /> View details and files
                          </button>
                        </article>
                      );
                    })}
                  </div>
                )}
                {scopedMaintenanceRecords.length > 15 && <div className="flex items-center justify-between border-t border-slate-200 pt-3 dark:border-slate-800">
                  <span className="text-xs text-slate-500 font-medium">
                    Showing {Math.min(1 + (scopedMaintenanceRecordsPage - 1) * 15, scopedMaintenanceRecords.length)} - {Math.min(scopedMaintenanceRecordsPage * 15, scopedMaintenanceRecords.length)} of {scopedMaintenanceRecords.length} records
                  </span>
                  <div className="flex items-center gap-2">
                    <button type="button" onClick={() => setScopedmaintenancerecordspage((page) => Math.max(1, page - 1))} disabled={scopedMaintenanceRecordsPage === 1} className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-bold transition hover:bg-white disabled:cursor-not-allowed disabled:opacity-40 dark:border-slate-700 dark:hover:bg-slate-800">Prev</button>
                    <span className="px-2 text-xs font-bold">Page {scopedMaintenanceRecordsPage} of {Math.max(1, Math.ceil(scopedMaintenanceRecords.length / 15))}</span>
                    <button type="button" onClick={() => setScopedmaintenancerecordspage((page) => Math.min(Math.ceil(scopedMaintenanceRecords.length / 15), page + 1))} disabled={scopedMaintenanceRecordsPage >= Math.ceil(scopedMaintenanceRecords.length / 15)} className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-bold transition hover:bg-white disabled:cursor-not-allowed disabled:opacity-40 dark:border-slate-700 dark:hover:bg-slate-800">Next</button>
                  </div>
                </div>}
                {selectedMaintenanceRecord && (
                  <MaintenanceJobCardDetailsModal
                    record={selectedMaintenanceRecord.record}
                    kind={selectedMaintenanceRecord.kind}
                    editable={false}
                    onClose={() => setSelectedMaintenanceRecord(null)}
                    onSaved={() => undefined}
                  />
                )}
              </div>
            )}
          </div>
        )}

        {/* ─── TAB: PURCHASE_ORDERS ─────────────────────────────────────────── */}
        {activeTab === 'PURCHASE_ORDERS' && (() => {
          const poCount = scopedPurchaseOrders.length;
          const totalPoSpend = scopedPurchaseOrders.reduce((sum, po) => sum + (Number(po.total_amount || po.total || po.total_cost || 0)), 0);
          const receivedCount = scopedPurchaseOrders.filter((po) => ['RECEIVED', 'COMPLETED'].includes(String(po.status || '').toUpperCase())).length;
          const pendingCount = scopedPurchaseOrders.filter((po) => ['PENDING', 'PARTIALLY_RECEIVED'].includes(String(po.status || '').toUpperCase())).length;
          return (
            <div className="space-y-6">
              {renderFilterBar()}

              {/* Header */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <h2 className="font-bold text-xl text-slate-900 dark:text-white flex items-center gap-2">
                    <ShoppingCart className="h-6 w-6 text-indigo-600" /> Purchase Orders &amp; Procurement Subledger
                  </h2>
                  <p className="text-xs text-slate-500 mt-0.5">Vendor purchase orders, line-item procurement commitments, and Goods Receipt Notes (GRN).</p>
                </div>
              <button
                type="button"
                onClick={() => setShowAddPoModal(true)}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold shadow-sm transition flex items-center gap-1.5 shrink-0"
              >
                <Plus size={15} /> Create Purchase Order
              </button>
              </div>

              {/* KPI Cards */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                <div className="p-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xs space-y-1">
                  <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">Total POs Issued</span>
                  <p className="text-2xl font-black text-indigo-600">{poCount}</p>
                  <span className="text-[10px] text-slate-400">Procurement vouchers</span>
                </div>
                <div className="p-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xs space-y-1">
                  <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">Total PO Spend</span>
                  <p className="text-2xl font-black text-slate-900 dark:text-white">${totalPoSpend.toLocaleString()}</p>
                  <span className="text-[10px] text-slate-400">Committed purchase total</span>
                </div>
                <div className="p-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xs space-y-1">
                  <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">Goods Received (GRN)</span>
                  <p className="text-2xl font-black text-emerald-600">{receivedCount}</p>
                  <span className="text-[10px] text-slate-400">Fulfilled orders</span>
                </div>
                <div className="p-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xs space-y-1">
                  <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">Pending Fulfillment</span>
                  <p className="text-2xl font-black text-amber-600">{pendingCount}</p>
                  <span className="text-[10px] text-slate-400">In transit / Open POs</span>
                </div>
              </div>

              {/* Table */}
              <div className="space-y-3">
                <h3 className="font-bold text-base text-slate-900 dark:text-white flex items-center justify-between">
                  <span>Issued Purchase Orders</span>
                  <span className="text-xs text-slate-500 font-normal">{scopedPurchaseOrders.length} orders</span>
                </h3>
                {scopedPurchaseOrders.length === 0 ? (
                  <div className="p-8 text-center text-slate-500 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl">No purchase orders found matching the filter scope.</div>
                ) : (<>

<div className="overflow-x-auto max-w-full rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xs">
                    <table className="w-full text-xs">
                      <thead className="bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-700">
                        <tr>
                          {['PO #', 'Order Date', 'Vendor / Supplier', 'Project Scope', 'Category', 'Items Count', 'Quotation', 'Finance Payments', 'Status', 'Actions'].map((h) => (
                            <th key={h} className="px-4 py-3 text-left font-bold text-slate-500 uppercase tracking-wider">{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                        {scopedPurchaseOrders.slice((scopedPurchaseOrdersPage - 1) * 15, scopedPurchaseOrdersPage * 15).map((po, i) => {
                          const poNum = po.po_number || po.number || `PO-${i + 1}`;
                          const vendor = po.supplier_name || po.vendor_name || po.vendor || po.supplier || 'Site Vendor';
                          const projName = projects.find((p: any) => String(p.id) === String(po.project_id))?.name || po.project_id || 'All Projects';
                          const amount = Number(po.total_amount || po.total || po.total_cost || 0);
                          const curr = po.currency || 'USD';
                          const itemCount = Array.isArray(po.items) ? po.items.length : 1;
                          const fileName = po.attachment_file_name;
                          return (
                            <tr key={po.id || i} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition">
                              <td className="px-4 py-3 font-mono font-bold text-slate-900 dark:text-white">{poNum}</td>
                              <td className="px-4 py-3 font-mono text-slate-500">{po.created_at || po.order_date ? new Date(po.created_at || po.order_date).toLocaleDateString() : '—'}</td>
                              <td className="px-4 py-3 font-medium text-slate-700 dark:text-slate-300">{vendor}</td>
                              <td className="px-4 py-3 text-slate-500">{projName}</td>
                              <td className="px-4 py-3"><span className="rounded-full bg-indigo-50 px-2 py-1 text-[10px] font-bold text-indigo-700 dark:bg-indigo-950/40 dark:text-indigo-300">{purchaseOrderCategoryLabel(po.category)}</span></td>
                              <td className="px-4 py-3 font-mono text-slate-500">{itemCount} items</td>
                              <td className="px-4 py-3">
                                {fileName ? (
                                  <div className="flex items-center gap-2">
                                    <button type="button" onClick={() => void handleViewPOFile(po.id)} className="text-indigo-600 hover:underline font-bold text-[11px]" title={fileName}>{fileName}</button>
                                  </div>
                                ) : (
                                  <button type="button" onClick={() => void handleDownloadPOFile(po.id, 'docket.pdf')} className="inline-flex items-center gap-1 text-slate-400 hover:text-slate-600 text-[11px] font-medium">
                                    <FileText size={12} /> Docket
                                  </button>
                                )}
                              </td>
                              <td className="px-4 py-3"><div className="min-w-[210px] space-y-1.5"><div className="rounded-md border border-indigo-100 bg-indigo-50 px-2 py-1.5 dark:border-indigo-900 dark:bg-indigo-950/30"><div className="flex justify-between gap-2"><span className="text-slate-500">PO total</span><strong className="whitespace-nowrap">{curr} {amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</strong></div><div className="mt-0.5 flex justify-between gap-2 text-[10px] text-slate-500"><span>Paid</span><span className="whitespace-nowrap">{curr} {Number(po.expense_paid_amount || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span></div>{po.expense_raised && <div className="flex justify-between gap-2 text-[10px] text-slate-500"><span>Balance</span><span className="whitespace-nowrap">{curr} {Number(po.expense_balance_due || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span></div>}</div>{(po.expense_payments || []).length ? po.expense_payments.map((payment: any, index: number) => <div key={payment.id} className="rounded-md border px-2 py-1.5"><div className="flex items-center justify-between gap-2"><span className="text-[10px] font-semibold text-slate-500">Installment {(po.expense_payments || []).length - index}</span><strong className="whitespace-nowrap">{curr} {Number(payment.amount || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</strong></div><div className="mt-0.5 flex items-center justify-between gap-2 text-[10px] text-slate-500"><span>{payment.payment_date ? new Date(`${payment.payment_date}T00:00:00`).toLocaleDateString() : 'Date unavailable'}</span>{payment.reference && <span className="max-w-24 truncate" title={payment.reference}>Ref: {payment.reference}</span>}</div>{payment.receipt_name ? <div className="mt-1 flex items-center gap-2 border-t pt-1"><span className="max-w-24 truncate text-[10px] text-slate-500" title={payment.receipt_name}>{payment.receipt_name}</span><button type="button" onClick={() => void handleViewPurchaseOrderPaymentReceipt(payment)} className="text-[10px] font-bold text-indigo-700 hover:underline">View</button><button type="button" onClick={() => void handleDownloadPurchaseOrderPaymentReceipt(payment)} className="text-[10px] font-bold text-indigo-700 hover:underline">Download</button></div> : <span className="mt-1 block text-[10px] text-slate-500">No receipt attached</span>}</div>) : <span className="text-[10px] text-slate-500">No payments recorded</span>}</div></td>
                              <td className="px-4 py-3"><div className="flex flex-col items-start gap-1"><StatusBadge status={po.status || 'PENDING'} />{po.expense_raised && <ExpensePaymentBadge status={po.expense_status} />}</div></td>
                              <td className="px-4 py-3">
                                <div className="flex items-center gap-1.5">
                                <button type="button" onClick={() => setSelectedPO(po)} className="p-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-indigo-100 dark:hover:bg-indigo-900 text-indigo-700 transition" title="View PO Details">
                                  <Eye size={14} />
                                </button>
                                {!poHasReceipts(po) && <button type="button" onClick={() => openEditPO(po)} className="p-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-indigo-100 dark:hover:bg-indigo-900 text-indigo-700 transition" title="Edit Purchase Order">
                                  <Pencil size={14} />
                                </button>}
                                {poCanReceive(po) && <button type="button" onClick={() => openReceivePO(po)} className="p-1.5 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 hover:bg-emerald-100 text-emerald-700 transition" title="Receive Goods">
                                  <PackageCheck size={14} />
                                </button>}
                                {String(po.status).toUpperCase() === 'WAITING_APPROVAL' && <button type="button" disabled={!!approvingPoId} onClick={() => void approvePurchaseOrder(po)} className="px-2 py-1 rounded-lg bg-emerald-600 text-white font-bold text-[11px] hover:bg-emerald-700 disabled:opacity-50" title="Approve purchase order">
                                  <CheckCircle2 size={12} className="inline mr-1" />{approvingPoId === String(po.id) ? 'Approving…' : 'Approve'}
                                </button>}
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
              <div className="flex items-center justify-between mt-4 px-4 py-3 bg-slate-50 dark:bg-slate-800/50 border-t border-slate-200 dark:border-slate-800 rounded-b-2xl">
                <span className="text-xs text-slate-500 font-medium">
                  Showing {Math.min(1 + (scopedPurchaseOrdersPage - 1) * 15, scopedPurchaseOrders.length)} - {Math.min(scopedPurchaseOrdersPage * 15, scopedPurchaseOrders.length)} of {scopedPurchaseOrders.length} records
                </span>
                <div className="flex items-center gap-2">
                  <button 
                    onClick={() => setScopedpurchaseorderspage(p => Math.max(1, p - 1))} 
                    disabled={scopedPurchaseOrdersPage === 1}
                    className="px-3 py-1.5 text-xs font-bold border border-slate-200 dark:border-slate-700 rounded-lg disabled:opacity-40 disabled:cursor-not-allowed hover:bg-white dark:hover:bg-slate-800 transition"
                  >
                    Prev
                  </button>
                  <span className="text-xs font-bold px-2">
                    Page {scopedPurchaseOrdersPage} of {Math.max(1, Math.ceil(scopedPurchaseOrders.length / 15))}
                  </span>
                  <button 
                    onClick={() => setScopedpurchaseorderspage(p => Math.min(Math.ceil(scopedPurchaseOrders.length / 15), p + 1))} 
                    disabled={scopedPurchaseOrdersPage >= Math.ceil(scopedPurchaseOrders.length / 15)}
                    className="px-3 py-1.5 text-xs font-bold border border-slate-200 dark:border-slate-700 rounded-lg disabled:opacity-40 disabled:cursor-not-allowed hover:bg-white dark:hover:bg-slate-800 transition"
                  >
                    Next
                  </button>
                </div>
              </div>


</>
)}
              </div>
            </div>
          );
        })()}

        {/* ─── TAB: FUEL ─────────────────────────────────────────────────────── */}
        {activeTab === 'FUEL' && (() => {
          const totalFuelPurchasedL = scopedFuelDeliveries.reduce((sum, d) => sum + (Number(d.quantity_litres) || 0), 0);
          const totalFuelAllocatedL = scopedFuelAllocations.reduce((sum, a) => sum + (Number(a.quantity_litres) || 0), 0);
          const totalFuelCostUSD = scopedFuelDeliveries.reduce((sum, d) => sum + fuelDeliveryCost(d), 0);
          return (
            <div className="space-y-6">
              {renderFilterBar()}

              {/* Header */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <h2 className="font-bold text-xl text-slate-900 dark:text-white flex items-center gap-2">
                    <Fuel className="h-6 w-6 text-indigo-600" /> Fuel Operations &amp; Accounting
                  </h2>
                  <p className="text-xs text-slate-500 mt-0.5">Bulk purchases, site allocations, receipt docket verification, and consumption analytics.</p>
                </div>
              </div>

              {/* KPI Cards */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                <div className="p-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xs space-y-1">
                  <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">Total Fuel Purchased</span>
                  <p className="text-2xl font-black text-indigo-600">{totalFuelPurchasedL.toLocaleString()} <span className="text-xs font-bold text-slate-400">L</span></p>
                  <span className="text-[10px] text-slate-400">Bulk supplier receipts</span>
                </div>
                <div className="p-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xs space-y-1">
                  <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">Total Fuel Allocated</span>
                  <p className="text-2xl font-black text-emerald-600">{totalFuelAllocatedL.toLocaleString()} <span className="text-xs font-bold text-slate-400">L</span></p>
                  <span className="text-[10px] text-slate-400">Issued to fleet assets</span>
                </div>
                <div className="p-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xs space-y-1">
                  <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">Total Fuel Expense</span>
                  <p className="text-2xl font-black text-slate-900 dark:text-white">${totalFuelCostUSD.toLocaleString()}</p>
                  <span className="text-[10px] text-slate-400">Financial subledger total</span>
                </div>
                <div className="p-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xs space-y-1">
                  <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">Unallocated Balance</span>
                  <p className={`text-2xl font-black ${totalFuelPurchasedL - totalFuelAllocatedL < 0 ? 'text-red-600' : 'text-amber-600'}`}>
                    {(totalFuelPurchasedL - totalFuelAllocatedL).toLocaleString()} <span className="text-xs font-bold text-slate-400">L</span>
                  </p>
                  <span className="text-[10px] text-slate-400">Estimated site storage</span>
                </div>
              </div>

              {/* Fuel Volume & Cost Time Series Chart */}
              <div className="p-5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xs space-y-3">
                <div className="flex items-center gap-2 border-b pb-3 border-slate-200 dark:border-slate-700">
                  <div className="p-2 rounded-xl bg-indigo-100 dark:bg-indigo-950 text-indigo-600"><TrendingUp size={18} /></div>
                  <div>
                    <h3 className="font-bold text-sm text-slate-900 dark:text-white">Fuel Purchased (L) &amp; Total Cost Trend ($)</h3>
                    <p className="text-[11px] text-slate-500">Daily breakdown of bulk fuel intake and cost accumulation</p>
                  </div>
                </div>
                {fuelTimeSeriesData.length === 0 ? (
                  <div className="p-8 text-center text-slate-500 bg-slate-50 dark:bg-slate-800/40 rounded-xl">No fuel deliveries or allocations found within the selected filter range.</div>
                ) : (
                  <div className="h-72 w-full pt-2">
                    <ResponsiveContainer width="100%" height="100%">
                      <ComposedChart data={fuelTimeSeriesData} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="currentColor" className="text-slate-200 dark:text-slate-700 opacity-40" />
                        <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                        <YAxis yAxisId="left" orientation="left" stroke="#6366f1" tick={{ fontSize: 11 }} />
                        <YAxis yAxisId="right" orientation="right" stroke="#10b981" tick={{ fontSize: 11 }} />
                        <Tooltip
                          contentStyle={{ backgroundColor: 'var(--background)', borderRadius: '12px', border: '1px solid var(--border)' }}
                          formatter={(val: any, name: any) => [
                            name === 'totalCost' ? `$${Number(val).toLocaleString()}` : `${Number(val).toLocaleString()} L`,
                            name === 'litresPurchased' ? 'Litres Purchased' : name === 'litresAllocated' ? 'Litres Allocated' : 'Total Cost ($)'
                          ]}
                        />
                        <Legend />
                        <Bar yAxisId="left" dataKey="litresPurchased" fill="#6366f1" radius={[6, 6, 0, 0]} name="litresPurchased" />
                        <Bar yAxisId="left" dataKey="litresAllocated" fill="#10b981" radius={[6, 6, 0, 0]} name="litresAllocated" />
                        <Line yAxisId="right" type="monotone" dataKey="totalCost" stroke="#f59e0b" strokeWidth={3} dot={{ r: 4 }} name="totalCost" />
                      </ComposedChart>
                    </ResponsiveContainer>
                  </div>
                )}
              </div>

              {/* Table 1: Fuel Deliveries */}
              <div className="space-y-3">
                <h3 className="font-bold text-base text-slate-900 dark:text-white flex items-center justify-between">
                  <span>Recent Bulk Fuel Deliveries (Purchased)</span>
                  <span className="text-xs text-slate-500 font-normal">{scopedFuelDeliveries.length} records</span>
                </h3>
                {scopedFuelDeliveries.length === 0 ? (
                  <div className="p-8 text-center text-slate-500 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl">No fuel deliveries logged.</div>
                ) : (<>

<div className="overflow-x-auto max-w-full rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xs">
                    <table className="w-full text-xs">
                      <thead className="bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-700">
                        <tr>
                          {['Date', 'Ref #', 'Supplier', 'Litres', 'Unit Cost', 'Total Cost', 'Receipt Docket'].map((h) => (
                            <th key={h} className="px-4 py-3 text-left font-bold text-slate-500 uppercase tracking-wider">{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                        {scopedFuelDeliveries.slice((scopedFuelDeliveriesPage - 1) * 15, scopedFuelDeliveriesPage * 15).map((d) => {
                          const totalC = fuelDeliveryCost(d);
                          const curr = fuelCostCurrency(d);
                          const attachmentMatch = (d.notes || '').match(/\[Attached (?:Receipt )?Docket:\s*([^\]]+)\]/i);
                          const fileName = d.receipt_file_name || (attachmentMatch ? attachmentMatch[1] : d.attachment);
                          const unitCost = fuelUnitCost(d);
                          return (
                            <tr key={d.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition">
                              <td className="px-4 py-3 font-mono">{d.recorded_at ? new Date(d.recorded_at).toLocaleDateString() : '—'}</td>
                              <td className="px-4 py-3 font-bold">{d.reference_number || d.id?.slice(0, 8)}</td>
                              <td className="px-4 py-3">{d.supplier || 'Bulk Supply'}</td>
                              <td className="px-4 py-3 font-bold text-indigo-600">{Number(d.quantity_litres).toLocaleString()} L</td>
                              <td className="px-4 py-3 font-mono text-slate-500">{unitCost ? `${curr} ${unitCost.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 4 })}` : '—'}</td>
                              <td className="px-4 py-3 font-bold text-slate-900 dark:text-white">{totalC ? `${curr} ${totalC.toLocaleString()}` : '—'}</td>
                              <td className="px-4 py-3">
                                {fileName ? (
                                  <div className="flex items-center gap-1.5">
                                    <button
                                      type="button"
                                      onClick={() => setViewingReceiptDelivery(d)}
                                      className="inline-flex items-center gap-1 px-2 py-1 rounded bg-indigo-50 dark:bg-indigo-950/40 hover:bg-indigo-100 dark:hover:bg-indigo-900/60 border border-indigo-200 dark:border-indigo-800 text-[11px] font-mono font-semibold text-indigo-800 dark:text-indigo-300 transition"
                                      title="Click to view Fuel Delivery Receipt & Docket"
                                    >
                                      <Paperclip size={12} className="text-indigo-600 shrink-0" />
                                      <span className="truncate max-w-[110px]">{fileName}</span>
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => setViewingReceiptDelivery(d)}
                                      className="p-1 text-slate-500 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded transition"
                                      title="View Fuel Delivery Receipt & Docket"
                                    >
                                      <Download size={13} />
                                    </button>
                                  </div>
                                ) : (
                                  <button
                                    type="button"
                                    onClick={() => setViewingReceiptDelivery(d)}
                                    className="inline-flex items-center gap-1 px-2 py-1 text-[11px] font-medium text-slate-500 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded transition"
                                    title="View Fuel Delivery Docket"
                                  >
                                    <FileText size={12} className="text-slate-400" /> View Docket
                                  </button>
                                )}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
              <div className="flex items-center justify-between mt-4 px-4 py-3 bg-slate-50 dark:bg-slate-800/50 border-t border-slate-200 dark:border-slate-800 rounded-b-2xl">
                <span className="text-xs text-slate-500 font-medium">
                  Showing {Math.min(1 + (scopedFuelDeliveriesPage - 1) * 15, scopedFuelDeliveries.length)} - {Math.min(scopedFuelDeliveriesPage * 15, scopedFuelDeliveries.length)} of {scopedFuelDeliveries.length} records
                </span>
                <div className="flex items-center gap-2">
                  <button 
                    onClick={() => setScopedfueldeliveriespage(p => Math.max(1, p - 1))} 
                    disabled={scopedFuelDeliveriesPage === 1}
                    className="px-3 py-1.5 text-xs font-bold border border-slate-200 dark:border-slate-700 rounded-lg disabled:opacity-40 disabled:cursor-not-allowed hover:bg-white dark:hover:bg-slate-800 transition"
                  >
                    Prev
                  </button>
                  <span className="text-xs font-bold px-2">
                    Page {scopedFuelDeliveriesPage} of {Math.max(1, Math.ceil(scopedFuelDeliveries.length / 15))}
                  </span>
                  <button 
                    onClick={() => setScopedfueldeliveriespage(p => Math.min(Math.ceil(scopedFuelDeliveries.length / 15), p + 1))} 
                    disabled={scopedFuelDeliveriesPage >= Math.ceil(scopedFuelDeliveries.length / 15)}
                    className="px-3 py-1.5 text-xs font-bold border border-slate-200 dark:border-slate-700 rounded-lg disabled:opacity-40 disabled:cursor-not-allowed hover:bg-white dark:hover:bg-slate-800 transition"
                  >
                    Next
                  </button>
                </div>
              </div>


</>
)}
              </div>

              {/* Table 2: Asset Fuel Allocations */}
              <div className="space-y-3">
                <h3 className="font-bold text-base text-slate-900 dark:text-white flex items-center justify-between">
                  <span>Asset Fuel Allocations &amp; Consumption Log</span>
                  <span className="text-xs text-slate-500 font-normal">{scopedFuelAllocations.length} records</span>
                </h3>
                {scopedFuelAllocations.length === 0 ? (
                  <div className="p-8 text-center text-slate-500 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl">No fuel allocations logged to equipment.</div>
                ) : (<>

<div className="overflow-x-auto max-w-full rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xs">
                    <table className="w-full text-xs">
                      <thead className="bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-700">
                        <tr>
                          {['Date', 'Asset / Equipment', 'Litres Allocated', 'Odometer / Hours', 'Notes'].map((h) => (
                            <th key={h} className="px-4 py-3 text-left font-bold text-slate-500 uppercase tracking-wider">{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                        {scopedFuelAllocations.slice((scopedFuelAllocationsPage - 1) * 15, scopedFuelAllocationsPage * 15).map((a) => {
                          const targetAsset = assets.find((ast: any) => String(ast.id) === String(a.asset_id));
                          const assetName =
                            (targetAsset ? [targetAsset.asset_number || targetAsset.code, targetAsset.name || targetAsset.title || targetAsset.model].filter(Boolean).join(' - ') : '') ||
                            a.asset_name || a.asset?.name || a.asset_number ||
                            (a.asset_id ? `Asset (${String(a.asset_id).slice(0, 8)})` : 'Unassigned Asset');
                          const dateStr = a.allocated_at || a.recorded_at || a.created_at;
                          const formattedDate = dateStr ? new Date(dateStr).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) : '—';
                          return (
                            <tr key={a.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition">
                              <td className="px-4 py-3 font-mono">{formattedDate}</td>
                              <td className="px-4 py-3 font-bold text-slate-900 dark:text-white">{assetName}</td>
                              <td className="px-4 py-3 font-bold text-emerald-600">{Number(a.quantity_litres).toLocaleString()} L</td>
                              <td className="px-4 py-3 font-mono text-slate-500">
                                {a.odometer_km ? `${a.odometer_km} km` : a.operating_hours ? `${a.operating_hours} hrs` : '—'}
                              </td>
                              <td className="px-4 py-3 text-slate-500 max-w-xs truncate">{a.notes || '—'}</td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
              <div className="flex items-center justify-between mt-4 px-4 py-3 bg-slate-50 dark:bg-slate-800/50 border-t border-slate-200 dark:border-slate-800 rounded-b-2xl">
                <span className="text-xs text-slate-500 font-medium">
                  Showing {Math.min(1 + (scopedFuelAllocationsPage - 1) * 15, scopedFuelAllocations.length)} - {Math.min(scopedFuelAllocationsPage * 15, scopedFuelAllocations.length)} of {scopedFuelAllocations.length} records
                </span>
                <div className="flex items-center gap-2">
                  <button 
                    onClick={() => setScopedfuelallocationspage(p => Math.max(1, p - 1))} 
                    disabled={scopedFuelAllocationsPage === 1}
                    className="px-3 py-1.5 text-xs font-bold border border-slate-200 dark:border-slate-700 rounded-lg disabled:opacity-40 disabled:cursor-not-allowed hover:bg-white dark:hover:bg-slate-800 transition"
                  >
                    Prev
                  </button>
                  <span className="text-xs font-bold px-2">
                    Page {scopedFuelAllocationsPage} of {Math.max(1, Math.ceil(scopedFuelAllocations.length / 15))}
                  </span>
                  <button 
                    onClick={() => setScopedfuelallocationspage(p => Math.min(Math.ceil(scopedFuelAllocations.length / 15), p + 1))} 
                    disabled={scopedFuelAllocationsPage >= Math.ceil(scopedFuelAllocations.length / 15)}
                    className="px-3 py-1.5 text-xs font-bold border border-slate-200 dark:border-slate-700 rounded-lg disabled:opacity-40 disabled:cursor-not-allowed hover:bg-white dark:hover:bg-slate-800 transition"
                  >
                    Next
                  </button>
                </div>
              </div>


</>
)}
              </div>
            </div>
          );
        })()}

        {/* ─── TAB 7: COMPLIANCE ────────────────────────────────────────────── */}
        {activeTab === 'COMPLIANCE' && (
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-xs">
            <ExpiringDocumentsWorkspace baseRoute="/executive-portal" />
          </div>
        )}

        {/*  TAB 8: NOTIFICATIONS  */}
        {activeTab === 'NOTIFICATIONS' && (
          <NotificationWorkspace hideSchedules={true} />
        )}
      </main>

      {/* PURCHASE ORDER DETAILS MODAL */}
      {selectedPO && (
        <div className="fixed inset-0 bg-slate-950/75 z-[9999] flex items-center justify-center p-0 sm:p-4 overflow-hidden">
          <div className="bg-white dark:bg-slate-900 w-full h-full sm:h-auto sm:max-h-[90vh] max-w-full sm:max-w-4xl border-0 sm:border border-slate-200 dark:border-slate-800 rounded-none sm:rounded-2xl shadow-2xl flex flex-col overflow-hidden">
            {/* Sticky Header */}
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 px-4 py-3.5 sm:px-6 sm:py-4 bg-white dark:bg-slate-900 shrink-0 sticky top-0 z-10">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 flex items-center justify-center font-bold">
                  <ShoppingCart size={18} />
                </div>
                <div>
                  <h3 className="font-bold text-base text-slate-900 dark:text-white">
                    Purchase Order Details
                  </h3>
                  <p className="text-xs text-slate-500 font-mono">
                    PO #: {selectedPO.po_number || selectedPO.id}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setSelectedPO(null)}
                className="p-1.5 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 hover:text-slate-900 dark:hover:text-white transition"
              >
                <X size={20} />
              </button>
            </div>

            {/* Content Body */}
            {(() => {
              const poItems = Array.isArray(selectedPO.items) ? selectedPO.items : [];
              const totalOrdered = poItems.reduce((sum: number, item: any) => sum + (Number(item.quantity_ordered || 0) * Number(item.unit_price || 0)), 0) || Number(selectedPO.total_amount || 0);
              const totalReceived = poItems.reduce((sum: number, item: any) => sum + (Number(item.quantity_received || 0) * Number(item.unit_price || 0)), 0);
              const remaining = Math.max(0, totalOrdered - totalReceived);
              const projectName = projects.find((project: any) => String(project.id) === String(selectedPO.project_id))?.name || selectedPO.project_id || 'Organization-wide';
              const notes = String(selectedPO.notes || '').replace(/\[Attached Docket:\s*([^\]]+)\]/gi, '').trim();

              return (
                <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6 bg-white dark:bg-slate-900">
                  {/* Summary Header Grid */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 p-5 rounded-xl border border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900">
                    {/* Left Column (User specified) */}
                    <div className="space-y-3.5">
                      <div>
                        <span className="text-[10px] font-extrabold uppercase tracking-widest text-slate-400 block">Supplier</span>
                        <h4 className="text-lg font-black text-slate-900 dark:text-white mt-0.5">
                          {selectedPO.supplier_name || selectedPO.vendor_name || selectedPO.vendor || selectedPO.supplier || 'Site Vendor'}
                        </h4>
                      </div>

                      <div>
                        <span className="text-[10px] font-extrabold uppercase tracking-widest text-slate-400 block">Project</span>
                        <span className="text-sm font-bold text-slate-800 dark:text-slate-200 mt-0.5 block">{projectName}</span>
                      </div>

                      <div>
                        <span className="text-[10px] font-extrabold uppercase tracking-widest text-slate-400 block">Category</span>
                        <span className="text-sm font-semibold text-slate-700 dark:text-slate-300 mt-0.5 block">{purchaseOrderCategoryLabel(selectedPO.category)}</span>
                      </div>

                      <div>
                        <span className="text-[10px] font-extrabold uppercase tracking-widest text-slate-400 block">Total Amount</span>
                        <span className="text-lg font-black text-emerald-600 mt-0.5 block">
                          {selectedPO.currency || 'USD'} {Number(totalOrdered).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </span>
                      </div>

                      <div>
                        <span className="text-[10px] font-extrabold uppercase tracking-widest text-slate-400 block mb-1">Status</span>
                        <StatusBadge status={selectedPO.status || 'PENDING'} />
                      </div>
                    </div>

                    {/* Right Column */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 p-4 rounded-xl border border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 text-sm">
                      <div>
                        <span className="block text-[10px] uppercase font-bold text-slate-400">PO Number</span>
                        <span className="font-mono font-medium text-slate-700 dark:text-slate-200">{selectedPO.po_number || selectedPO.id}</span>
                      </div>
                      <div>
                        <span className="block text-[10px] uppercase font-bold text-slate-400">Requested By</span>
                        <span className="font-medium text-slate-700 dark:text-slate-200">{selectedPO.created_by_name || '—'}</span>
                      </div>
                      <div>
                        <span className="block text-[10px] uppercase font-bold text-slate-400">Order Date</span>
                        <span className="font-medium text-slate-700 dark:text-slate-200">{selectedPO.created_at ? new Date(selectedPO.created_at).toLocaleString() : '—'}</span>
                      </div>
                      <div>
                        <span className="block text-[10px] uppercase font-bold text-slate-400">Goods Received</span>
                        <span className="font-bold text-emerald-600">{selectedPO.currency || 'USD'} {totalReceived.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                      </div>
                      <div className="sm:col-span-2">
                        <span className="block text-[10px] uppercase font-bold text-slate-400">Remaining Open</span>
                        <span className="font-bold text-amber-600">{selectedPO.currency || 'USD'} {remaining.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
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
                          {poItems.map((item: any, index: number) => {
                            const quantity = Number(item.quantity_ordered) || 0;
                            const price = Number(item.unit_price) || 0;
                            return (
                              <tr key={item.id || index} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30">
                                <td className="px-4 py-3 font-semibold text-slate-800 dark:text-slate-200">{item.item_name || item.description || 'Line Item'}</td>
                                <td className="px-4 py-3 font-medium text-slate-600 dark:text-slate-400 whitespace-pre-wrap">{item.description || '—'}</td>
                                <td className="px-4 py-3 font-mono text-center text-slate-700 dark:text-slate-300">{quantity}</td>
                                <td className="px-4 py-3 font-mono text-center text-emerald-600 font-bold">{Number(item.quantity_received) || 0}</td>
                                <td className="px-4 py-3 font-mono text-right text-slate-700 dark:text-slate-300">${price.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                                <td className="px-4 py-3 font-mono text-right font-bold text-slate-900 dark:text-white">${(quantity * price).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
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
              );
            })()}

            {/* Sticky Footer */}
            <div className="flex items-center justify-between border-t border-slate-100 dark:border-slate-800 px-4 py-3 sm:px-6 bg-white dark:bg-slate-900 shrink-0">
              <span className="text-xs text-slate-400 font-mono">Status: {selectedPO.status || 'PENDING'}</span>
              <div className="flex items-center gap-2">
                {selectedPO.attachment_file_name ? (
                  <button
                    type="button"
                    onClick={() => void handleViewPOFile(selectedPO.id)}
                    className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-lg text-xs flex items-center gap-1.5 transition"
                  >
                    <Eye size={14} /> View Quotation / Supporting Document
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => void handleDownloadPOFile(selectedPO.id, 'docket.pdf')}
                    className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-lg text-xs flex items-center gap-1.5 transition"
                  >
                    <Eye size={14} /> View Generated PO Docket
                  </button>
                )}
                {!poHasReceipts(selectedPO) && (
                  <button type="button" onClick={() => openEditPO(selectedPO)} className="px-3.5 py-2 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-bold hover:bg-slate-50 dark:hover:bg-slate-800 transition flex items-center gap-1">
                    <Pencil size={13} /> Edit PO
                  </button>
                )}
                {poCanReceive(selectedPO) && (
                  <button type="button" onClick={() => openReceivePO(selectedPO)} className="px-3.5 py-2 bg-emerald-600 text-white rounded-lg text-xs font-bold hover:bg-emerald-700 transition flex items-center gap-1">
                    <PackageCheck size={13} /> Receive Goods
                  </button>
                )}
                {String(selectedPO.status).toUpperCase() === 'WAITING_APPROVAL' && (
                  <button type="button" disabled={!!approvingPoId} onClick={() => void approvePurchaseOrder(selectedPO)} className="px-4 py-2 rounded-lg bg-emerald-600 text-white font-bold text-xs hover:bg-emerald-700 disabled:opacity-50">
                    <CheckCircle2 size={14} className="inline mr-1.5" />{approvingPoId === String(selectedPO.id) ? 'Approving…' : 'Approve Purchase Order'}
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => setSelectedPO(null)}
                  className="px-4 py-2 border border-slate-200 dark:border-slate-700 rounded-lg font-semibold text-xs hover:bg-slate-50 dark:hover:bg-slate-800 transition"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {editingPO && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 max-w-6xl w-full max-h-[92vh] overflow-y-auto space-y-5 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <h3 className="font-bold text-base text-slate-900 dark:text-white flex items-center gap-2"><Pencil size={17} className="text-indigo-600" />Edit Purchase Order: {editingPO.po_number}</h3>
              <button type="button" onClick={() => setEditingPO(null)} className="p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500"><X size={18} /></button>
            </div>
            <form onSubmit={saveEditedPO} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <label className="space-y-1.5 text-xs font-semibold text-slate-600 dark:text-slate-300">Vendor / Supplier *
                  <input required maxLength={200} value={editPoForm.supplier_name} onChange={(event) => setEditPoForm({ ...editPoForm, supplier_name: event.target.value })} className="w-full p-2.5 border border-slate-200 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-950 text-sm" />
                </label>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">Project</label>
                  <SearchableSelect
                    value={editPoForm.project_id}
                    onChange={(val) => setEditPoForm({ ...editPoForm, project_id: val })}
                    options={[
                      { value: '', label: 'Organization-wide' },
                      ...projects.map((project: any) => ({ value: project.id, label: project.name })),
                    ]}
                    placeholder="Organization-wide"
                    searchable={projects.length > 5}
                  />
                </div>
                <label className="space-y-1.5 text-xs font-semibold text-slate-600 dark:text-slate-300">Category (Optional)
                  <PurchaseOrderCategoryField value={editPoForm.category} onChange={(category) => setEditPoForm({ ...editPoForm, category })} className="w-full p-2.5 border border-slate-200 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-950 text-sm" />
                </label>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">Currency</label>
                  <SearchableSelect
                    value={editPoForm.currency}
                    onChange={(val) => setEditPoForm({ ...editPoForm, currency: val })}
                    options={['USD', 'EUR', 'GBP', 'ZAR'].map((c) => ({ value: c, label: c }))}
                    searchable={false}
                  />
                </div>
                <label className="space-y-1.5 text-xs font-semibold text-slate-600 dark:text-slate-300">Notes
                  <textarea rows={2} value={editPoForm.notes} onChange={(event) => setEditPoForm({ ...editPoForm, notes: event.target.value })} className="w-full p-2.5 border border-slate-200 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-950 text-sm resize-y" />
                </label>
              </div>
              <div className="space-y-3 border-t border-slate-200 dark:border-slate-800 pt-4">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500">Purchase Order Line Items</h4>
                  <button type="button" onClick={() => setEditPoForm({ ...editPoForm, items: [...editPoForm.items, { item_name: '', description: '', quantity_ordered: 1, unit_price: 0 }] })} className="text-xs font-bold text-indigo-600 hover:underline flex items-center gap-1"><Plus size={13} />Add item</button>
                </div>
                {editPoForm.items.map((item, index) => (
                  <div key={item.id || index} className="grid grid-cols-1 md:grid-cols-12 gap-3 p-4 border border-slate-200 dark:border-slate-800 rounded-xl bg-slate-50/60 dark:bg-slate-800/30">
                    <label className="md:col-span-3 space-y-1.5 text-[11px] font-semibold text-slate-500">Item / Service
                      <input value={item.item_name} onChange={(event) => setEditPoForm({ ...editPoForm, items: editPoForm.items.map((row, i) => i === index ? { ...row, item_name: event.target.value } : row) })} className="w-full p-2.5 border rounded-lg bg-white dark:bg-slate-950 text-xs" />
                    </label>
                    <label className="md:col-span-5 space-y-1.5 text-[11px] font-semibold text-slate-500">Description *
                      <textarea required maxLength={255} rows={1} value={item.description} onChange={(event) => setEditPoForm({ ...editPoForm, items: editPoForm.items.map((row, i) => i === index ? { ...row, description: event.target.value } : row) })} className="w-full p-2.5 border rounded-lg bg-white dark:bg-slate-950 text-xs resize-y" />
                    </label>
                    <label className="md:col-span-2 space-y-1.5 text-[11px] font-semibold text-slate-500">Quantity
                      <input type="number" required min="0.01" step="0.01" value={item.quantity_ordered} onChange={(event) => setEditPoForm({ ...editPoForm, items: editPoForm.items.map((row, i) => i === index ? { ...row, quantity_ordered: Number(event.target.value) } : row) })} className="w-full p-2.5 border rounded-lg bg-white dark:bg-slate-950 text-xs" />
                    </label>
                    <label className="md:col-span-1 space-y-1.5 text-[11px] font-semibold text-slate-500">Unit price
                      <input type="number" required min="0" step="0.01" value={item.unit_price} onChange={(event) => setEditPoForm({ ...editPoForm, items: editPoForm.items.map((row, i) => i === index ? { ...row, unit_price: Number(event.target.value) } : row) })} className="w-full p-2.5 border rounded-lg bg-white dark:bg-slate-950 text-xs" />
                    </label>
                    {editPoForm.items.length > 1 && <button type="button" aria-label="Remove line item" onClick={() => setEditPoForm({ ...editPoForm, items: editPoForm.items.filter((_, i) => i !== index) })} className="self-end p-2 text-red-600 hover:bg-red-50 rounded-lg"><Trash2 size={14} /></button>}
                  </div>
                ))}
              </div>
              <div className="flex justify-end gap-2 border-t border-slate-200 dark:border-slate-800 pt-3">
                <button type="button" onClick={() => setEditingPO(null)} className="px-4 py-2 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold">Cancel</button>
                <button type="submit" disabled={poActionBusy} className="px-5 py-2 bg-indigo-600 text-white font-bold rounded-xl text-xs hover:bg-indigo-700 disabled:opacity-50">{poActionBusy ? 'Saving…' : 'Save changes'}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {receivingPO && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <h3 className="font-bold text-base text-slate-900 dark:text-white flex items-center gap-2"><PackageCheck size={17} className="text-emerald-600" />Receive Goods (GRN): {receivingPO.po_number}</h3>
              <button type="button" onClick={() => setReceivingPO(null)} className="p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500"><X size={18} /></button>
            </div>
            <form onSubmit={savePOReceipt} className="space-y-4">
              {(() => {
                const outstandingItems = (receivingPO.items || []).filter((item: any) =>
                  Number(item.quantity_ordered || 0) > Number(item.quantity_received || 0),
                );
                const selectedItems = outstandingItems.filter((item: any) => selectedReceiptItemIds.includes(String(item.id)));
                const selectedUnits = selectedItems.reduce((sum: number, item: any) => sum + Math.min(
                  Math.max(0, Number(receiptQuantities[item.id]) || 0),
                  Number(item.quantity_ordered || 0) - Number(item.quantity_received || 0),
                ), 0);
                const allSelected = outstandingItems.length > 0 && outstandingItems.every((item: any) => selectedReceiptItemIds.includes(String(item.id)));
                return <>
              <div className="grid grid-cols-3 gap-2">
                <div className="rounded-xl border border-slate-200 dark:border-slate-800 p-3"><span className="block text-[10px] font-bold uppercase tracking-wide text-slate-500">Outstanding lines</span><strong className="text-lg text-slate-900 dark:text-white">{outstandingItems.length}</strong></div>
                <div className="rounded-xl border border-slate-200 dark:border-slate-800 p-3"><span className="block text-[10px] font-bold uppercase tracking-wide text-slate-500">Selected lines</span><strong className="text-lg text-indigo-600">{selectedItems.length}</strong></div>
                <div className="rounded-xl border border-slate-200 dark:border-slate-800 p-3"><span className="block text-[10px] font-bold uppercase tracking-wide text-slate-500">Units receiving</span><strong className="text-lg text-emerald-600">{selectedUnits.toLocaleString()}</strong></div>
              </div>
              <p className="text-xs text-slate-500">Select the line items included in this delivery, then enter the quantity received for each. Leave unchecked items outstanding for a later receipt.</p>
              <div className="border border-slate-200 dark:border-slate-800 rounded-xl overflow-x-auto max-w-full">
                <table className="w-full text-xs">
                  <thead className="bg-slate-50 dark:bg-slate-800/60 text-slate-500">
                    <tr>
                      <th className="p-3 text-center">
                        <input aria-label="Select all outstanding line items" type="checkbox" checked={allSelected} disabled={outstandingItems.length === 0} onChange={(event) => setSelectedReceiptItemIds(event.target.checked ? outstandingItems.map((item: any) => String(item.id)) : [])} className="h-4 w-4 accent-indigo-600" />
                      </th>
                      <th className="p-3 text-left">Line item</th><th className="p-3 text-center">Ordered</th><th className="p-3 text-center">Received</th><th className="p-3 text-center">Outstanding</th><th className="p-3 text-center">Receive now</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {(receivingPO.items || []).map((item: any) => {
                      const outstanding = Math.max(0, Number(item.quantity_ordered || 0) - Number(item.quantity_received || 0));
                      const checked = selectedReceiptItemIds.includes(String(item.id));
                      const disabled = outstanding <= 0;
                      return <tr key={item.id} className={checked ? 'bg-indigo-50/60 dark:bg-indigo-950/20' : ''}>
                        <td className="p-3 text-center"><input aria-label={`Select ${item.item_name || item.description} for receipt`} type="checkbox" checked={checked} disabled={disabled} onChange={(event) => setSelectedReceiptItemIds((current) => event.target.checked ? [...current, String(item.id)] : current.filter((id) => id !== String(item.id)))} className="h-4 w-4 accent-indigo-600 disabled:opacity-40" /></td>
                        <td className="p-3 min-w-48"><span className="font-semibold">{item.item_name || item.description}</span><span className="block text-slate-500">{item.description}</span>{disabled && <span className="mt-1 inline-flex rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-bold text-emerald-700">Fully received</span>}</td>
                        <td className="p-3 text-center font-mono">{Number(item.quantity_ordered || 0).toLocaleString()}</td>
                        <td className="p-3 text-center font-mono">{Number(item.quantity_received || 0).toLocaleString()}</td>
                        <td className="p-3 text-center font-mono font-bold text-amber-600">{outstanding.toLocaleString()}</td>
                        <td className="p-3 text-center">
                          <input aria-label={`Quantity received for ${item.item_name || item.description}`} type="number" min="0" max={outstanding} step="0.01" disabled={!checked || disabled} value={checked ? (receiptQuantities[item.id] ?? outstanding) : 0} onChange={(event) => setReceiptQuantities({ ...receiptQuantities, [item.id]: Math.min(outstanding, Math.max(0, Number(event.target.value) || 0)) })} className="w-24 p-2 border rounded-lg bg-white dark:bg-slate-950 text-center font-mono disabled:opacity-40 disabled:bg-slate-100 dark:disabled:bg-slate-800" />
                        </td>
                      </tr>;
                    })}
                    {outstandingItems.length === 0 && <tr><td colSpan={6} className="p-6 text-center text-slate-500">All line items have been received.</td></tr>}
                  </tbody>
                </table>
              </div>
                </>;
              })()}
              <div className="flex justify-end gap-2 border-t border-slate-200 dark:border-slate-800 pt-3">
                <button type="button" onClick={() => setReceivingPO(null)} className="px-4 py-2 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold">Cancel</button>
                <button type="submit" disabled={poActionBusy || selectedReceiptItemIds.length === 0 || selectedReceiptItemIds.every((itemId) => !(Number(receiptQuantities[itemId]) > 0))} className="px-4 py-2 bg-emerald-600 text-white font-bold rounded-xl text-xs hover:bg-emerald-700 disabled:opacity-50">{poActionBusy ? 'Saving…' : selectedReceiptItemIds.length ? `Record receipt for ${selectedReceiptItemIds.length} line${selectedReceiptItemIds.length === 1 ? '' : 's'}` : 'Select items to receive'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    
      {viewingIncident && (
        <IncidentDetailModal
          incident={viewingIncident}
          onClose={() => setViewingIncident(null)}
          onUpdate={(updated) => {
            setIncidents((prev: any[]) =>
              prev.map((i) => (i.id === updated.id ? updated : i))
            );
            setViewingIncident(updated);
          }}
        />
      )}
    
    
      
    
      {showAddPoModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs overflow-y-auto">
              <div className="bg-card border rounded-2xl p-6 max-w-6xl w-full max-h-[92vh] overflow-y-auto space-y-5 shadow-2xl my-8">
            <div className="flex items-center justify-between border-b pb-3 border-border">
              <h3 className="font-bold text-base flex items-center gap-2 text-foreground">
                <ShoppingBag className="h-5 w-5 text-indigo-600" /> Create Purchase Order
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
                  <SearchableSelect
                    value={newPoForm.project_id}
                    onChange={(val) => setNewPoForm({ ...newPoForm, project_id: val })}
                    options={[
                      { value: '', label: 'Organization-Wide (All Projects)' },
                      ...projects.map((p: any) => ({ value: p.id, label: p.name })),
                    ]}
                    placeholder="Organization-Wide (All Projects)"
                    searchable={projects.length > 5}
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-foreground mb-1">Category (Optional)</label>
                <PurchaseOrderCategoryField value={newPoForm.category} onChange={(category) => setNewPoForm({ ...newPoForm, category })} className="w-full p-2.5 border rounded-xl bg-background text-xs" />
              </div>
              <div>
                <label className="block text-xs font-bold text-foreground mb-1">Currency &amp; Notes</label>
                <div className="grid grid-cols-3 gap-2">
                  <SearchableSelect
                    value={newPoForm.currency}
                    onChange={(val) => setNewPoForm({ ...newPoForm, currency: val })}
                    options={[
                      { value: 'USD', label: 'USD ($)' },
                      { value: 'EUR', label: 'EUR (€)' },
                      { value: 'GBP', label: 'GBP (£)' },
                      { value: 'ZAR', label: 'ZAR (R)' },
                    ]}
                    searchable={false}
                  />
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
                  className="w-full p-2 border rounded-xl bg-background text-xs text-muted-foreground file:mr-3 file:py-1 file:px-2.5 file:rounded-lg file:border-0 file:text-xs file:font-bold file:bg-indigo-50 file:text-violet-700 hover:file:bg-violet-100"
                />
                {poAttachmentFile && (
                  <p className="text-[11px] text-indigo-600 font-medium mt-1 flex items-center gap-1">
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
                    className="text-xs font-bold text-indigo-600 hover:underline flex items-center gap-1"
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
                  className="px-5 py-2 bg-indigo-600 text-white font-bold rounded-xl text-xs hover:bg-indigo-700 flex items-center gap-1.5"
                >
                  {poSubmitBusy ? <RefreshCw className="h-4 w-4 animate-spin" /> : <CheckCircle2 size={15} />}
                  Issue Purchase Order
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    
      {/* Mobile Bottom Navigation Tabbar */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-t border-slate-200 dark:border-slate-800 flex justify-around items-center h-[calc(3.75rem+env(safe-area-inset-bottom,0px))] pb-[env(safe-area-inset-bottom,0px)] px-1 shadow-[0_-4px_20px_-10px_rgba(0,0,0,0.1)] no-print">
        {navItems.map((item) => {
          const IconComp = item.icon;
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={`flex flex-col items-center justify-center w-full h-full py-1 transition relative active:scale-95 ${
                isActive
                  ? 'text-indigo-600 dark:text-indigo-400 font-bold'
                  : 'text-slate-500 hover:text-slate-900 dark:hover:text-slate-300 font-medium'
              }`}
            >
              <div className="relative">
                <IconComp size={20} className={isActive ? 'opacity-100 scale-110' : 'opacity-70'} />
                {item.badge !== undefined && item.badge > 0 && (
                  <span className="absolute -top-2 -right-2 px-1 py-0.5 rounded-full text-[8px] font-black bg-amber-500 text-white min-w-[16px] text-center border-2 border-white dark:border-slate-900 shadow-md">
                    {item.badge}
                  </span>
                )}
              </div>
              <span className="text-[10px] mt-0.5 tracking-tight truncate max-w-[64px]">{item.mobileLabel || item.label}</span>
              {isActive && (
                <span className="absolute top-0 w-8 h-0.5 bg-indigo-600 dark:bg-indigo-400 rounded-full shadow-sm" />
              )}
            </button>
          );
        })}
      </nav>

      {/* View Fuel Delivery Receipt & Docket Modal */}
      {viewingReceiptDelivery && (
        <div className="fixed inset-0 bg-slate-950/75 z-[9999] flex items-center justify-center p-0 sm:p-4 overflow-hidden">
          <div className="bg-white dark:bg-slate-900 w-full h-full sm:h-auto sm:max-h-[90vh] max-w-full sm:max-w-4xl border-0 sm:border border-slate-200 dark:border-slate-800 rounded-none sm:rounded-2xl shadow-2xl flex flex-col overflow-hidden">
            {/* Sticky Header */}
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 px-4 py-3.5 sm:px-6 sm:py-4 bg-white dark:bg-slate-900 shrink-0 sticky top-0 z-10">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 flex items-center justify-center font-bold">
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
                    <span className="text-[10px] font-extrabold uppercase tracking-widest text-indigo-600">Official Refuel Voucher</span>
                    <h4 className="text-lg font-black text-slate-900 dark:text-white mt-1">
                      {viewingReceiptDelivery.supplier || 'Site Bulk Fuel Supplier'}
                    </h4>
                    <p className="text-xs text-slate-500 mt-1">
                      Site: {locations.find((s: any) => String(s.id) === String(viewingReceiptDelivery.site_location_id))?.name || 'Project Field Depot'}
                    </p>
                  </div>

                  <div className="flex items-center gap-3 pt-1">
                    <span className="px-2.5 py-1 bg-indigo-50 dark:bg-indigo-950/60 text-indigo-800 dark:text-indigo-300 rounded-full font-mono text-[11px] font-bold">
                      {viewingReceiptDelivery.fuel_type || 'DIESEL'}
                    </span>
                    <span className="text-xs text-slate-400 font-mono">
                      {viewingReceiptDelivery.recorded_at ? new Date(viewingReceiptDelivery.recorded_at).toLocaleString() : viewingReceiptDelivery.delivered_at || '—'}
                    </span>
                  </div>

                  <div className="grid grid-cols-3 gap-2 p-3.5 rounded-xl border border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 text-xs">
                    <div>
                      <span className="text-[10px] text-slate-400 font-bold uppercase block">Quantity</span>
                      <span className="font-extrabold text-indigo-600 text-sm block mt-0.5">{viewingReceiptDelivery.quantity_litres} L</span>
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
                      className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-lg text-xs flex items-center gap-1.5 transition"
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

      {showExpenseModal && (
        <OperationalExpenseSubmissionModal
          onClose={() => setShowExpenseModal(false)}
          onSubmitted={() => {
            setShowExpenseModal(false);
            void loadData();
            setBanner({ type: 'success', message: 'Operational Expense claim submitted.' });
          }}
        />
      )}

      {showRegisterUserModal && (
        <RegisterUserModal
          onClose={() => setShowRegisterUserModal(false)}
          onSaved={() => {
            setShowRegisterUserModal(false);
            void loadData();
            setBanner({ type: 'success', message: 'User registered successfully.' });
          }}
        />
      )}
      </div>
    </div>
  );
}
