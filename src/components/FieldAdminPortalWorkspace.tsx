'use client';
import IncidentDetailModal from './IncidentDetailModal';
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { createPortal } from 'react-dom';
import Link from 'next/link';
import {
  HardHat, Bell, User, Wrench, ShieldCheck, Clock, Truck, RefreshCw, LogOut, Menu, X, Pencil,
  AlertTriangle, Plus, CheckCircle2, DollarSign, Fuel, Users, FileText, Download, Eye,
  Building2, Calendar, FilePlus, ChevronRight, Check, Ban, AlertCircle, Sparkles, Filter,
  Activity, Paperclip, Upload, Package, Trash2, TrendingUp, File, ArrowLeft, BarChart2, ChevronDown, ChevronUp
} from 'lucide-react';
import { ResponsiveContainer, ComposedChart, BarChart, Bar, Line, XAxis, YAxis, Tooltip, CartesianGrid, Legend } from 'recharts';
import { useAuth } from '@/components/AuthProvider';
import { apiFetch, apiFetchBlob, downloadBlob } from '@/lib/api';
import BreakdownJobCardWizard from './BreakdownJobCardWizard';
import PreventiveMaintenanceWizard from './PreventiveMaintenanceWizard';
import EquipmentMaintenanceScheduleModal from './EquipmentMaintenanceScheduleModal';
import OperationalExpenseSubmissionModal from './OperationalExpenseSubmissionModal';
import SearchableSelect from './SearchableSelect';
import NotificationWorkspace from './NotificationWorkspace';
import useNotificationCount from './useNotificationCount';
import MaintenanceJobCardDetailsModal from './MaintenanceJobCardDetailsModal';
import FieldPurchaseOrdersPanel from './FieldPurchaseOrdersPanel';
import UniversalFileViewerModal from './UniversalFileViewerModal';
import { openUniversalFileViewer } from '@/lib/fileViewer';
import PurchaseOrderCategoryChart from './PurchaseOrderCategoryChart';
import { useOperationalDataSync } from '@/lib/operationalDataSync';
import EmployeeDetailView from './EmployeeDetailView';

// ─── Types ────────────────────────────────────────────────────────────────────

type AdminTab = 'PROJECTS' | 'FUEL' | 'MAINTENANCE' | 'PEOPLE' | 'EXPENSES' | 'PURCHASE_ORDERS' | 'HSE' | 'NOTIFICATIONS';

interface ProjectOption {
  id: string;
  name: string;
  code?: string;
  status?: string;
  location?: string;
}

// ─── Inline Banner Component ──────────────────────────────────────────────────

function Banner({ message, type, onClose }: { message: string; type: 'error' | 'success' | 'info'; onClose: () => void }) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  useEffect(() => {
    const timeout = window.setTimeout(onClose, 30_000);
    return () => window.clearTimeout(timeout);
  }, [message, onClose]);
  const colors =
    type === 'error'
      ? 'bg-red-50 border-red-200 text-red-800 dark:bg-red-950/40 dark:border-red-800 dark:text-red-300'
      : type === 'success'
      ? 'bg-orange-50 border-orange-200 text-orange-800 dark:bg-orange-950/40 dark:border-orange-800 dark:text-orange-300'
      : 'bg-blue-50 border-blue-200 text-blue-800 dark:bg-blue-950/40 dark:border-blue-800 dark:text-blue-300';
  if (!mounted) return null;
  return createPortal(
    <div role="alert" aria-live={type === 'error' ? 'assertive' : 'polite'} className={`fixed top-4 left-1/2 -translate-x-1/2 z-[2147483647] flex w-[calc(100%-2rem)] max-w-2xl items-start gap-3 px-4 py-3 rounded-lg border text-sm font-medium shadow-xl ${colors}`}>
      <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
      <span className="flex-1">{message}</span>
      <button onClick={onClose} className="shrink-0 hover:opacity-70"><X className="h-4 w-4" /></button>
    </div>, document.body
  );
}

// ─── Status Badge Component ───────────────────────────────────────────────────

function StatusBadge({ status }: { status: string }) {
  const s = (status || '').toUpperCase();
  const map: Record<string, string> = {
    OPEN: 'bg-orange-100 text-orange-800 dark:bg-orange-950/50 dark:text-orange-300',
    IN_PROGRESS: 'bg-amber-100 text-amber-800 dark:bg-amber-950/50 dark:text-amber-300',
    COMPLETED: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-300',
    APPROVED: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-300',
    ACTIVE: 'bg-orange-100 text-orange-800 dark:bg-orange-950/50 dark:text-orange-300',
    PENDING: 'bg-amber-100 text-amber-800 dark:bg-amber-950/50 dark:text-amber-300',
    REJECTED: 'bg-red-100 text-red-800 dark:bg-red-950/50 dark:text-red-300',
    CANCELLED: 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300',
    CRITICAL: 'bg-red-100 text-red-800 dark:bg-red-950/50 dark:text-red-300',
    HIGH: 'bg-red-100 text-red-700 dark:bg-red-950/50 dark:text-red-300',
    MEDIUM: 'bg-amber-100 text-amber-800 dark:bg-amber-950/50 dark:text-amber-300',
    LOW: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300',
  };
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold ${map[s] || 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300'}`}>
      {status}
    </span>
  );
}

// ─── MAIN WORKSPACE ───────────────────────────────────────────────────────────

export default function FieldAdminPortalWorkspace() {
  const notificationCount = useNotificationCount();
  const router = useRouter();
  const { user, signOut } = useAuth();

  const [filteredIncidentsPage, setFilteredIncidentsPage] = React.useState(1);
  const [filteredExpensesPage, setFilteredExpensesPage] = React.useState(1);
  const [filteredOperationalExpenseRequestsPage, setFilteredOperationalExpenseRequestsPage] = React.useState(1);
  const [filteredFuelAllocationsPage, setFilteredFuelAllocationsPage] = React.useState(1);
  const [filteredFuelDeliveriesPage, setFilteredFuelDeliveriesPage] = React.useState(1);
  const [filteredLeaveRequestsPage, setFilteredLeaveRequestsPage] = React.useState(1);
  const [showPurchasingCharts, setShowPurchasingCharts] = React.useState(false);
  const [activeTab, setActiveTab] = useState<AdminTab>('PROJECTS');
  const handledRecordLink = useRef('');
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const tab = params.get('tab');
    if (tab === 'NOTIFICATIONS' || tab === 'PURCHASE_ORDERS' || tab === 'EXPENSES') setActiveTab(tab);
  }, []);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [banner, setBanner] = useState<{ message: string; type: 'error' | 'success' | 'info' } | null>(null);

  // Data states
  const [projects, setProjects] = useState<ProjectOption[]>([]);
  const [projectMetrics, setProjectMetrics] = useState<Record<string, { asset_count: number; crew_count: number; open_work_order_count: number }>>({});
  const [selectedProjectId, setSelectedProjectId] = useState<string>('');
  const [assets, setAssets] = useState<any[]>([]);
  const [employees, setEmployees] = useState<any[]>([]);
  const [workOrders, setWorkOrders] = useState<any[]>([]);
  const [preventiveJobCards, setPreventiveJobCards] = useState<any[]>([]);
  const [breakdownJobCards, setBreakdownJobCards] = useState<any[]>([]);
  const [fuelDeliveries, setFuelDeliveries] = useState<any[]>([]);
  const [fuelAllocations, setFuelAllocations] = useState<any[]>([]);
  const [projectSites, setProjectSites] = useState<any[]>([]);
  const [incidents, setIncidents] = useState<any[]>([]);
  const [notifications, setNotifications] = useState<any[]>([]);
  const [downloadRequests, setDownloadRequests] = useState<any[]>([]);
  const [expenses, setExpenses] = useState<any[]>([]);
  const [operationalExpenseRequests, setOperationalExpenseRequests] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Modals state
  const [showFuelBoughtModal, setShowFuelBoughtModal] = useState(false);
  const [showFuelAllocModal, setShowFuelAllocModal] = useState(false);
  const [showWOModal, setShowWOModal] = useState(false);
  const [editingBreakdown, setEditingBreakdown] = useState<any | null>(null);
  const [editingPreventive, setEditingPreventive] = useState<any | null>(null);
  const [showPmModal, setShowPmModal] = useState(false);
  const [showScheduleModal, setShowScheduleModal] = useState(false);
  const [showHseModal, setShowHseModal] = useState(false);
  const [showExpenseModal, setShowExpenseModal] = useState(false);
  const [selectedMaintenanceRecord, setSelectedMaintenanceRecord] = useState<{ record: any; kind: 'work_order' | 'preventive' | 'breakdown'; startEditing: boolean } | null>(null);
  const [maintFilter, setMaintFilter] = useState<'ALL' | 'SCHEDULES' | 'BREAKDOWN' | 'PREVENTIVE'>('ALL');

  // Employee detail view state
  const [selectedEmployee, setSelectedEmployee] = useState<any | null>(null);
  const [viewingEmployeeDetailId, setViewingEmployeeDetailId] = useState<string | null>(null);

  // Leave Requests & Leave Booking State
  const [leaveRequests, setLeaveRequests] = useState<any[]>([]);
  const [leaveLoading, setLeaveLoading] = useState(false);
  const [showBookLeaveModal, setShowBookLeaveModal] = useState(false);
  const [bookLeaveEmp, setBookLeaveEmp] = useState<any | null>(null);
  const [bookLeaveForm, setBookLeaveForm] = useState({
    employee_id: '',
    leave_type: 'ANNUAL',
    start_date: new Date().toISOString().slice(0, 10),
    end_date: new Date(Date.now() + 7 * 86400000).toISOString().slice(0, 10),
    reason: '',
  });
  const [bookLeaveSubmitting, setBookLeaveSubmitting] = useState(false);

  const loadLeaveRequests = useCallback(async () => {
    setLeaveLoading(true);
    try {
      const res = await apiFetch<any>('/api/v1/employees/leave-requests/all').catch(() =>
        apiFetch<any>('/api/v1/hr/leave-requests')
      );
      const items = Array.isArray(res) ? res : res?.items || [];
      setLeaveRequests(items);
    } catch {
      setLeaveRequests([]);
    } finally {
      setLeaveLoading(false);
    }
  }, []);

  useEffect(() => {
    loadLeaveRequests();
  }, [loadLeaveRequests]);

  async function handleBookLeaveSubmit(e: React.FormEvent) {
    e.preventDefault();
    const empId = bookLeaveForm.employee_id || bookLeaveEmp?.id;
    if (!empId) {
      setBanner({ type: 'error', message: 'Please select an employee.' });
      return;
    }
    setBookLeaveSubmitting(true);
    try {
      await apiFetch(`/api/v1/employees/${empId}/leave-requests`, {
        method: 'POST',
        body: JSON.stringify({
          leave_type: bookLeaveForm.leave_type,
          start_date: bookLeaveForm.start_date,
          end_date: bookLeaveForm.end_date,
          reason: bookLeaveForm.reason,
        }),
      });
      setBanner({ type: 'success', message: 'Leave request submitted successfully for approval.' });
      setShowBookLeaveModal(false);
      setBookLeaveEmp(null);
      await loadLeaveRequests();
    } catch (err: any) {
      setBanner({ type: 'error', message: err.message || 'Failed to submit leave request.' });
    } finally {
      setBookLeaveSubmitting(false);
    }
  }
  const [requestDownloadDoc, setRequestDownloadDoc] = useState<any | null>(null);
  const [downloadReason, setDownloadReason] = useState('');
  const [requestBusy, setRequestBusy] = useState(false);

  // Employee Contract Upload Form State
  const [showContractModal, setShowContractModal] = useState(false);
  const [contractEmp, setContractEmp] = useState<any | null>(null);
  const [contractForm, setContractForm] = useState({
    title: '',
    start_date: new Date().toISOString().slice(0, 10),
    end_date: '',
    notes: '',
  });
  const [contractFile, setContractFile] = useState<File | null>(null);

  // Date Range Filter State
  const [datePreset, setDatePreset] = useState<'ALL' | 'TODAY' | '10_DAYS' | '30_DAYS' | 'CUSTOM'>('ALL');
  const [customStartDate, setCustomStartDate] = useState<string>('');
  const [customEndDate, setCustomEndDate] = useState<string>('');
  const [showCustomDatePopover, setShowCustomDatePopover] = useState(false);

  // Expanded Fuel Refill / Purchase Form State
  const [fuelBoughtForm, setFuelBoughtForm] = useState({
    project_id: '',
    site_location_id: '',
    fuel_type: 'DIESEL',
    quantity_litres: '',
    unit_cost: '',
    total_cost: '',
    currency: 'USD',
    supplier: '',
    reference_number: '',
    recorded_at: new Date().toISOString().slice(0, 16),
    notes: '',
  });
  const [fuelReceiptFile, setFuelReceiptFile] = useState<File | null>(null);

  // Edit Fuel Delivery State (2-Day Edit Rule)
  const [showEditFuelModal, setShowEditFuelModal] = useState(false);
  const [editingFuelDelivery, setEditingFuelDelivery] = useState<any | null>(null);
  const [viewingReceiptDelivery, setViewingReceiptDelivery] = useState<any | null>(null);
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
  const [editFuelReceiptFile, setEditFuelReceiptFile] = useState<File | null>(null);
  const [editFuelBusy, setEditFuelBusy] = useState(false);

  // Fuel Allocation Form State
  const [fuelAllocForm, setFuelAllocForm] = useState({
    project_id: '',
    site_location_id: '',
    delivery_id: '',
    asset_id: '',
    quantity_litres: '',
    odometer_km: '',
    operating_hours: '',
    allocated_at: new Date().toISOString().slice(0, 16),
    notes: '',
  });

  // Edit Fuel Allocation State (within 1 day)
  const [showEditFuelAllocModal, setShowEditFuelAllocModal] = useState(false);
  const [editingFuelAlloc, setEditingFuelAlloc] = useState<any>(null);
  const [editAllocForm, setEditAllocForm] = useState({
    asset_id: '',
    delivery_id: '',
    quantity_litres: '',
    allocated_at: '',
    odometer_km: '',
    operating_hours: '',
    notes: '',
  });
  const [editAllocBusy, setEditAllocBusy] = useState(false);

  // Operational Expense Viewing & Editing State
  const [viewingExpense, setViewingExpense] = useState<any | null>(null);
  const [showEditExpenseModal, setShowEditExpenseModal] = useState(false);
  const [editingExpense, setEditingExpense] = useState<any | null>(null);
  const [editExpenseForm, setEditExpenseForm] = useState({
    pay_to_name: '',
    expense_date: '',
    total_cost: '',
    payment_method: 'MOBILE_MONEY',
    notes: '',
  });
  const [editExpenseReceiptFile, setEditExpenseReceiptFile] = useState<File | null>(null);
  const [editExpenseBusy, setEditExpenseBusy] = useState(false);
  // Universal File Viewer State
  const [fieldAdminViewerState, setFieldAdminViewerState] = useState<{ isOpen: boolean; fileUrl?: string; blob?: Blob; fileName?: string; title?: string; fileType?: string }>({ isOpen: false });

  // HSE Incident Viewing State
  const [viewingIncident, setViewingIncident] = useState<any | null>(null);

  // Expanded Maintenance / Breakdown Form State
  const [woForm, setWoForm] = useState({
    project_id: '',
    asset_id: '',
    title: '',
    work_type: 'CORRECTIVE',
    failure_taxonomy: 'HYDRAULIC',
    priority: 'MEDIUM',
    recurrence: 'ONE_OFF',
    scheduled_date: new Date().toISOString().slice(0, 10),
    estimated_hours: 2,
    downtime_hours: 1,
    assigned_technician_name: '',
    description: '',
    notes: '',
  });

  // Checklist & Spare Parts arrays for WO Form
  const [woChecklist, setWoChecklist] = useState<string[]>([
    'Inspect hydraulic lines & fluid level',
    'Verify engine oil & coolant levels',
    'Test safety kill-switch & emergency stop',
  ]);
  const [woSpareParts, setWoSpareParts] = useState<{ part_name: string; quantity: number }[]>([
    { part_name: 'Hydraulic Filter Element', quantity: 1 },
  ]);

  // PM Form State
  const [pmForm, setPmForm] = useState({
    project_id: '',
    asset_id: '',
    service_interval: '250_HOURS',
    engine_hours: '',
    notes: '',
    checklist: [
      { item: 'Engine Oil & Filter Change', status: 'PASS' },
      { item: 'Air Filter Element Inspection', status: 'PASS' },
      { item: 'Hydraulic Hoses & Fittings Check', status: 'PASS' },
      { item: 'Coolant & Fan Belt Tension', status: 'PASS' },
      { item: 'Brake & Steering Safety Check', status: 'PASS' },
    ],
  });

  // HSE Form State
  const [hseForm, setHseForm] = useState({
    project_id: '',
    site_location_id: '',
    asset_id: '',
    incident_type: 'NEAR_MISS',
    severity: 'MEDIUM',
    title: '',
    location: '',
    description: '',
    corrective_action: '',
    incident_date: new Date().toISOString().slice(0, 16),
  });
  const [hseFiles, setHseFiles] = useState<File[]>([]);

  const [busySubmit, setBusySubmit] = useState(false);

  // ─── Data Reload ─────────────────────────────────────────────────────────────

  const reloadData = useCallback(async () => {
    setLoading(true);
    try {
      const projUrl = '/api/v1/projects?page_size=100';
      const pRes = await apiFetch<any>(projUrl);
      const pItems = Array.isArray(pRes) ? pRes : pRes?.items || [];
      setProjects(pItems);
      const activeProject = pItems.find((p: ProjectOption) => String(p.id) === selectedProjectId);
      if (!activeProject) {
        const firstProjectId = pItems[0]?.id ? String(pItems[0].id) : '';
        setSelectedProjectId(firstProjectId);
        setAssets([]); setEmployees([]); setWorkOrders([]); setPreventiveJobCards([]); setBreakdownJobCards([]); setFuelDeliveries([]); setFuelAllocations([]);
        setProjectSites([]);
        setIncidents([]); setNotifications([]); setDownloadRequests([]); setExpenses([]); setProjectMetrics({});
        if (!firstProjectId) setBanner({ type: 'info', message: 'No assigned project sites are available for this account.' });
        return;
      }
      const assetUrl = `/api/v1/projects/${activeProject.id}/assets`;
      const empUrl = `/api/v1/projects/${activeProject.id}/employees`;
      const woUrl = `/api/v1/maintenance/work-orders?project_id=${activeProject.id}`;
      const fuelDelivUrl = '/api/v1/field-portal/fuel-deliveries';
      const fuelAllocUrl = '/api/v1/field-portal/fuel-allocations';
      const sitesUrl = '/api/v1/field-portal/sites';
      const incidentUrl = '/api/v1/incidents?page_size=50';
      const notifUrl = '/api/v1/hr/notifications?page_size=50';
      const downloadReqUrl = '/api/v1/hr/document-download-requests';
      const costUrl = '/api/v1/commercial/cost-entries';
      const projectMetricsUrl = '/api/v1/projects/field-admin-metrics';

      const fpAssetUrl = `/api/v1/field-portal/equipment?project_id=${activeProject.id}`;
      const allAssetsUrl = '/api/v1/assets?page_size=200';
      const allEmpUrl = '/api/v1/employees?page_size=100';

      const [aRes, fpARes, allARes, eRes, allERes, wRes, fdRes, faRes, sitesRes, iRes, nRes, drRes, cRes, metricsRes, pmCardsRes, breakdownCardsRes] = await Promise.all([
        apiFetch<any>(assetUrl).catch(() => ({ items: [] })),
        apiFetch<any>(fpAssetUrl).catch(() => []),
        apiFetch<any>(allAssetsUrl).catch(() => ({ items: [] })),
        apiFetch<any>(empUrl).catch(() => ({ items: [] })),
        apiFetch<any>(allEmpUrl).catch(() => ({ items: [] })),
        apiFetch<any>(woUrl).catch(() => ({ items: [] })),
        apiFetch<any>(fuelDelivUrl).catch((err: any) => { setBanner({ type: 'error', message: err?.message || 'Could not load fuel deliveries.' }); return []; }),
        apiFetch<any>(fuelAllocUrl).catch((err: any) => { setBanner({ type: 'error', message: err?.message || 'Could not load fuel allocations.' }); return []; }),
        apiFetch<any>(sitesUrl).catch(() => []),
        apiFetch<any>(incidentUrl).catch(() => ({ items: [] })),
        apiFetch<any>(notifUrl).catch(() => []),
        apiFetch<any>(downloadReqUrl).catch(() => []),
        apiFetch<any>(costUrl).catch(() => ({ items: [] })),
        apiFetch<any>(projectMetricsUrl).catch((err: any) => {
          setBanner({ type: 'error', message: err?.message || 'Could not load assigned project counts.' });
          return [];
        }),
        apiFetch<any>('/api/v1/pm-job-cards').catch((err: any) => {
          setBanner({ type: 'error', message: err?.message || 'Could not load preventive maintenance job cards.' });
          return [];
        }),
        apiFetch<any>('/api/v1/pm-job-cards/breakdown').catch((err: any) => {
          setBanner({ type: 'error', message: err?.message || 'Could not load breakdown job cards.' });
          return [];
        }),
      ]);

      const projAssetItems = Array.isArray(aRes) ? aRes : aRes?.items || [];
      const fpAssetItems = Array.isArray(fpARes) ? fpARes : fpARes?.items || [];
      const allAssetItems = Array.isArray(allARes) ? allARes : allARes?.items || [];
      const aItems = projAssetItems.length > 0 ? projAssetItems : (fpAssetItems.length > 0 ? fpAssetItems : allAssetItems);

      const projEmpItems = Array.isArray(eRes) ? eRes : eRes?.items || [];
      const allEmpItems = Array.isArray(allERes) ? allERes : allERes?.items || [];
      const eItems = projEmpItems.length > 0 ? projEmpItems : allEmpItems;

      const wItems = Array.isArray(wRes) ? wRes : wRes?.items || [];
      const fdItems = Array.isArray(fdRes) ? fdRes : fdRes?.items || [];
      const faItems = Array.isArray(faRes) ? faRes : faRes?.items || [];
      const siteItems = Array.isArray(sitesRes) ? sitesRes : sitesRes?.items || [];
      const iItems = Array.isArray(iRes) ? iRes : iRes?.items || [];
      const nItems = Array.isArray(nRes) ? nRes : nRes?.items || [];
      const drItems = Array.isArray(drRes) ? drRes : drRes?.items || [];
      const cItems = Array.isArray(cRes) ? cRes : cRes?.items || [];
      const metricItems = Array.isArray(metricsRes) ? metricsRes : metricsRes?.items || [];
      const pmItems = Array.isArray(pmCardsRes) ? pmCardsRes : pmCardsRes?.items || [];
      const breakdownItems = Array.isArray(breakdownCardsRes) ? breakdownCardsRes : breakdownCardsRes?.items || [];

      setAssets(aItems);
      setEmployees(eItems);
      setWorkOrders(wItems);
      setPreventiveJobCards(pmItems);
      setBreakdownJobCards(breakdownItems);
      setFuelDeliveries(fdItems);
      setFuelAllocations(faItems);
      setProjectSites(siteItems);
      setIncidents(iItems);
      setNotifications(nItems);
      setDownloadRequests(drItems);
      setExpenses(cItems);
      setProjectMetrics(Object.fromEntries(metricItems.map((row: any) => [String(row.project_id), {
        asset_count: Number(row.asset_count) || 0,
        crew_count: Number(row.crew_count) || 0,
        open_work_order_count: Number(row.open_work_order_count) || 0,
      }])));
    } catch (err: any) {
      setBanner({ type: 'error', message: err.message || 'Failed to refresh portal data.' });
    } finally {
      setLoading(false);
    }
  }, [selectedProjectId]);

  useEffect(() => {
    void reloadData();
  }, [reloadData]);

  useOperationalDataSync(() => {
    void reloadData();
    apiFetch<any>('/api/v1/operational-expenses').then((response) => {
      setOperationalExpenseRequests(Array.isArray(response) ? response : response?.items || []);
    }).catch(() => {});
  });

  useEffect(() => {
    const expenseId = new URLSearchParams(window.location.search).get('expense_id');
    if (!expenseId || handledRecordLink.current === expenseId) return;
    const expense = operationalExpenseRequests.find((row) => String(row.id) === expenseId);
    if (!expense) return;
    setActiveTab('EXPENSES');
    setViewingExpense(expense);
    handledRecordLink.current = expenseId;
  }, [operationalExpenseRequests]);

  useEffect(() => {
    let active = true;
    apiFetch<any>('/api/v1/operational-expenses').then((response) => {
      if (active) setOperationalExpenseRequests(Array.isArray(response) ? response : response?.items || []);
    }).catch((err: any) => {
      if (active) setBanner({ type: 'error', message: err?.message || 'Could not load operational expense statuses.' });
    });
    return () => { active = false; };
  }, []);

  // ─── Filtered Data By Project ────────────────────────────────────────────────

  const filterByProj = <T extends Record<string, any>>(items: T[]): T[] => {
    if (!selectedProjectId) return [];
    return items.filter((item) => String(item.project_id) === selectedProjectId || String(item.projectId) === selectedProjectId);
  };

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

  const filteredAssets = assets;
  const filteredEmployees = employees;
  const filteredWorkOrders = filterByProj(workOrders).filter((w) =>
    isWithinDateFilter(w.scheduled_date || w.created_at)
  );
  const filteredMaintenanceRecords = [
    ...filteredWorkOrders.map((row) => ({ ...row, record_kind: 'Work order', record_category: 'work_order' as const, display_title: row.title, display_type: row.work_type || 'CORRECTIVE' })),
    ...filterByProj(preventiveJobCards).filter((row) => isWithinDateFilter(row.created_at)).map((row) => ({
      ...row,
      record_kind: 'Preventive job card',
      record_category: 'preventive' as const,
      display_title: row.pm_control?.equipment || row.job_card_number,
      display_type: 'PREVENTIVE',
      description: row.pm_control?.pm_interval ? `PM interval: ${row.pm_control.pm_interval}` : 'Preventive maintenance job card',
    })),
    ...filterByProj(breakdownJobCards).filter((row) => isWithinDateFilter(row.created_at)).map((row) => ({
      ...row,
      record_kind: 'Breakdown job card',
      record_category: 'breakdown' as const,
      display_title: row.job_control?.equipment || row.job_card_number,
      display_type: 'CORRECTIVE',
      description: row.reported_failure || row.corrective_action || 'Breakdown maintenance job card',
    })),
  ];
  const scopedFuelDeliveries = (rows: any[]) => rows.filter((row) => {
    const rowProjectId = row.project_id || row.projectId || projectSites.find((site) => String(site.id) === String(row.site_location_id))?.project_id;
    return String(rowProjectId || '').toLowerCase() === String(selectedProjectId).toLowerCase();
  });
  const filteredFuelDeliveries = scopedFuelDeliveries(fuelDeliveries).filter((d) =>
    isWithinDateFilter(d.recorded_at || d.delivered_at || d.created_at)
  );
  const scopedFuelAllocations = (rows: any[]) => rows.filter((row) => {
    const rowProjectId = row.project_id || row.projectId || projectSites.find((site) => String(site.id) === String(row.site_location_id))?.project_id;
    return !selectedProjectId || String(rowProjectId || '').toLowerCase() === String(selectedProjectId).toLowerCase();
  });
  const filteredFuelAllocations = scopedFuelAllocations(fuelAllocations).filter((a) =>
    isWithinDateFilter(a.allocated_at || a.recorded_at || a.created_at)
  );
  const filteredIncidents = filterByProj(incidents).filter((inc) =>
    isWithinDateFilter(inc.incident_date || inc.created_at)
  );
  const filteredExpenses = filterByProj(expenses).filter((c) =>
    isWithinDateFilter(c.posted_at || c.entry_date || c.created_at)
  );
  const filteredOperationalExpenseRequests = operationalExpenseRequests.filter((e) =>
    isWithinDateFilter(e.expense_date || e.created_at)
  );
  const fuelDeliveryCost = (delivery: any) => {
    if (delivery.total_cost != null && Number.isFinite(Number(delivery.total_cost))) return Number(delivery.total_cost);
    const match = String(delivery.notes || '').match(/Total Cost:\s*([\d,]+(?:\.\d+)?)/i);
    return match ? Number(match[1].replaceAll(',', '')) || 0 : 0;
  };
  const fuelCostCurrency = (delivery: any) => String(delivery.currency || delivery.notes?.match(/Total Cost:\s*[\d,.]+\s+([A-Z]{3})/i)?.[1] || 'USD');
  const fuelUnitCost = (delivery: any) => {
    if (delivery.unit_cost != null && Number.isFinite(Number(delivery.unit_cost))) return Number(delivery.unit_cost);
    const match = String(delivery.notes || '').match(/Unit Cost:\s*([\d,]+(?:\.\d+)?)/i);
    return match ? Number(match[1].replaceAll(',', '')) || 0 : 0;
  };

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

    if (fuelReceiptFile && fuelReceiptFile.name === fileName) {
      const url = URL.createObjectURL(fuelReceiptFile);
      const a = document.createElement('a');
      a.href = url;
      a.download = fuelReceiptFile.name;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      return;
    }

    if (editFuelReceiptFile && editFuelReceiptFile.name === fileName) {
      const url = URL.createObjectURL(editFuelReceiptFile);
      const a = document.createElement('a');
      a.href = url;
      a.download = editFuelReceiptFile.name;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      return;
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
Signed: Field Operations Administration
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

  const handleViewFuelReceipt = (delivery: any) => {
    if (!delivery) return;
    if (delivery.receipt_file_name) {
      setFieldAdminViewerState({
        isOpen: true,
        fileUrl: `/api/v1/field-portal/fuel-deliveries/${delivery.id}/receipt`,
        fileName: delivery.receipt_file_name,
        title: 'Fuel delivery receipt and docket',
      });
      return;
    }

    // Earlier forms saved the selected filename in notes but never uploaded
    // the file bytes. Show a generated docket instead of sending users to an
    // endpoint that cannot serve a file for those legacy records.
    const legacyName = (delivery.notes || '').match(/\[Attached (?:Receipt )?Docket:\s*([^\]]+)\]/i)?.[1];
    const notes = String(delivery.notes || '')
      .replace(/\[Financial Info:\s*[^\]]+\]/gi, '')
      .replace(/\[Attached (?:Receipt )?Docket:\s*[^\]]+\]/gi, '')
      .trim();
    const docket = [
      'CESTOS FIELD OPERATIONS — FUEL DELIVERY DOCKET',
      `Receipt reference: ${delivery.reference_number || delivery.id}`,
      `Recorded: ${delivery.recorded_at ? new Date(delivery.recorded_at).toLocaleString() : '—'}`,
      `Supplier: ${delivery.supplier || 'Site Bulk Fuel Supplier'}`,
      `Fuel grade: ${delivery.fuel_type || 'DIESEL'}`,
      `Quantity delivered: ${delivery.quantity_litres || 0} L`,
      `Unit cost: ${fuelUnitCost(delivery) ? `${fuelCostCurrency(delivery)} ${fuelUnitCost(delivery)}/L` : '—'}`,
      `Total cost: ${fuelDeliveryCost(delivery) ? `${fuelCostCurrency(delivery)} ${fuelDeliveryCost(delivery)}` : '—'}`,
      `Previously listed attachment: ${legacyName || 'None'}`,
      '',
      `Notes: ${notes || '—'}`,
      '',
      'This is a generated docket. The original file was not stored with this older record.',
    ].join('\n');
    setFieldAdminViewerState({
      isOpen: true,
      blob: new Blob([docket], { type: 'text/plain;charset=utf-8' }),
      fileName: `Fuel_Delivery_Docket_${delivery.reference_number || delivery.id}.txt`,
      title: 'Generated fuel delivery docket',
    });
  };

  const isEditableWithin2Days = (dateInput: string | Date | undefined) => {
    if (!dateInput) return true;
    const d = new Date(dateInput);
    if (isNaN(d.getTime())) return true;
    const diffMs = Date.now() - d.getTime();
    const twoDaysMs = 2 * 24 * 60 * 60 * 1000;
    return diffMs <= twoDaysMs;
  };

  const isEditableWithin1Day = (dateInput: string | Date | undefined) => {
    if (!dateInput) return true;
    const d = new Date(dateInput);
    if (isNaN(d.getTime())) return true;
    const diffMs = Date.now() - d.getTime();
    const oneDayMs = 24 * 60 * 60 * 1000;
    return diffMs <= oneDayMs;
  };

  const isEditableWithin10Days = (dateInput: string | Date | undefined) => {
    if (!dateInput) return true;
    const date = new Date(dateInput);
    return !Number.isNaN(date.getTime()) && Date.now() - date.getTime() <= 10 * 24 * 60 * 60 * 1000;
  };

  const fuelTimeSeriesData = React.useMemo(() => {
    const dateMap: Record<string, { date: string; fullDate: string; litresPurchased: number; litresAllocated: number; totalCost: number }> = {};

    filteredFuelDeliveries.forEach((d: any) => {
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

    filteredFuelAllocations.forEach((a: any) => {
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
  }, [filteredFuelDeliveries, filteredFuelAllocations]);

  const expenseTimeSeriesData = React.useMemo(() => {
    const dateMap: Record<string, { date: string; fullDate: string; totalCost: number; approvedCost: number }> = {};

    filteredOperationalExpenseRequests.forEach((e: any) => {
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
  }, [filteredOperationalExpenseRequests]);

  // Top Purchased Items by Cost ($)
  const topItemsByCostData = React.useMemo(() => {
    const itemMap: Record<string, { name: string; totalCost: number; count: number }> = {};

    filteredOperationalExpenseRequests.forEach((e: any) => {
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

    filteredExpenses.forEach((c: any) => {
      const name = (c.description || c.cost_category || 'Subledger Expense').trim();
      if (!itemMap[name]) itemMap[name] = { name, totalCost: 0, count: 0 };
      itemMap[name].totalCost += Number(c.amount || 0);
      itemMap[name].count += 1;
    });

    return Object.values(itemMap)
      .sort((a, b) => b.totalCost - a.totalCost)
      .slice(0, 10);
  }, [filteredOperationalExpenseRequests, filteredExpenses]);

  // Top Purchased Items by Purchase Frequency (Order Count)
  const topItemsByFrequencyData = React.useMemo(() => {
    const itemMap: Record<string, { name: string; frequency: number; totalCost: number }> = {};

    filteredOperationalExpenseRequests.forEach((e: any) => {
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

    return Object.values(itemMap)
      .sort((a, b) => b.frequency - a.frequency)
      .slice(0, 10);
  }, [filteredOperationalExpenseRequests]);

  // Top Payees / Vendors by Total Expenditure ($)
  const topVendorData = React.useMemo(() => {
    const vendorMap: Record<string, { vendor: string; totalCost: number; count: number }> = {};

    filteredOperationalExpenseRequests.forEach((e: any) => {
      const vendor = (e.pay_to_name || 'Unspecified Payee').trim();
      if (!vendorMap[vendor]) vendorMap[vendor] = { vendor, totalCost: 0, count: 0 };
      vendorMap[vendor].totalCost += Number(e.total_cost || e.amount || 0);
      vendorMap[vendor].count += 1;
    });

    return Object.values(vendorMap)
      .sort((a, b) => b.totalCost - a.totalCost)
      .slice(0, 10);
  }, [filteredOperationalExpenseRequests]);

  // Expense Intelligence Metrics
  const expenseIntelligenceMetrics = React.useMemo(() => {
    const totalExp = filteredOperationalExpenseRequests.reduce((sum, e) => sum + Number(e.total_cost || e.amount || 0), 0);
    const count = filteredOperationalExpenseRequests.length;
    const avgClaim = count > 0 ? totalExp / count : 0;
    const maxClaim = filteredOperationalExpenseRequests.reduce((max, e) => Math.max(max, Number(e.total_cost || e.amount || 0)), 0);
    const totalItemsCount = filteredOperationalExpenseRequests.reduce((sum, e) => sum + (Array.isArray(e.items) ? e.items.length : 1), 0);

    return { totalExp, count, avgClaim, maxClaim, totalItemsCount };
  }, [filteredOperationalExpenseRequests]);

  const hseTimeSeriesData = React.useMemo(() => {
    const dateMap: Record<string, { date: string; fullDate: string; totalIncidents: number; criticalCount: number; nearMissCount: number }> = {};

    filteredIncidents.forEach((inc: any) => {
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
  }, [filteredIncidents]);

  const hseCategoryBarData = React.useMemo(() => {
    const categoryCounts: Record<string, number> = {
      'Near Miss': 0,
      'Injury / Illness': 0,
      'Property Damage': 0,
      'Environmental Spill': 0,
      'Hazard Observation': 0,
      'Security Incident': 0,
      'Other': 0,
    };

    filteredIncidents.forEach((inc: any) => {
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
  }, [filteredIncidents]);

  // ─── Form Handlers ───────────────────────────────────────────────────────────

  const handleCreateFuelBought = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fuelBoughtForm.quantity_litres || Number(fuelBoughtForm.quantity_litres) <= 0) {
      setBanner({ type: 'error', message: 'Quantity of fuel bought must be greater than 0.' });
      return;
    }

    const projId = fuelBoughtForm.project_id || selectedProjectId || projects[0]?.id || '';
    const availableSites = projectSites.filter((site) => String(site.project_id) === String(projId));
    const siteLocationId = fuelBoughtForm.site_location_id || availableSites[0]?.id || projectSites[0]?.id;
    if (!siteLocationId) {
      setBanner({ type: 'error', message: 'Please select a valid Project Site location.' });
      return;
    }

    setBusySubmit(true);
    try {
      const costInfo = [
        fuelBoughtForm.total_cost ? `Total Cost: ${fuelBoughtForm.total_cost} ${fuelBoughtForm.currency}` : '',
        fuelBoughtForm.unit_cost ? `Unit Cost: ${fuelBoughtForm.unit_cost} ${fuelBoughtForm.currency}/L` : '',
      ].filter(Boolean).join(' | ');
      const costNote = costInfo ? `[Financial Info: ${costInfo}]` : '';
      const attachmentNote = fuelReceiptFile ? `[Attached Docket: ${fuelReceiptFile.name} (${(fuelReceiptFile.size / 1024).toFixed(1)} KB)]` : '';
      const combinedNotes = [fuelBoughtForm.notes, costNote, attachmentNote].filter(Boolean).join('\n');

      const payload = {
        project_id: projId,
        site_location_id: siteLocationId,
        recorded_at: fuelBoughtForm.recorded_at ? new Date(fuelBoughtForm.recorded_at).toISOString() : new Date().toISOString(),
        fuel_type: fuelBoughtForm.fuel_type || 'DIESEL',
        quantity_litres: Number(fuelBoughtForm.quantity_litres),
        supplier: fuelBoughtForm.supplier || undefined,
        reference_number: fuelBoughtForm.reference_number || undefined,
        notes: combinedNotes || undefined,
      };

      const createdDelivery = await apiFetch<any>('/api/v1/field-portal/fuel-deliveries', {
        method: 'POST',
        body: JSON.stringify(payload),
      });
      let uploadedReceipt: any = null;
      let receiptWarning = '';
      if (fuelReceiptFile) {
        const receiptForm = new FormData();
        receiptForm.append('receipt', fuelReceiptFile);
        try {
          uploadedReceipt = await apiFetch<any>(`/api/v1/field-portal/fuel-deliveries/${createdDelivery.id}/receipt`, { method: 'POST', body: receiptForm });
        } catch (uploadError: any) {
          receiptWarning = ` Fuel delivery was saved, but its receipt upload failed: ${uploadError?.message || 'please edit the delivery and retry.'}`;
        }
      }
      const visibleDelivery = { ...createdDelivery, ...uploadedReceipt, project_id: createdDelivery?.project_id || projId, site_location_id: createdDelivery?.site_location_id || siteLocationId };
      setFuelDeliveries((current) => [visibleDelivery, ...current.filter((row) => String(row.id) !== String(visibleDelivery.id))]);
      setBanner({ type: receiptWarning ? 'error' : 'success', message: `Fuel delivery of ${fuelBoughtForm.quantity_litres} L logged successfully.${receiptWarning}` });
      setShowFuelBoughtModal(false);
      setFuelBoughtForm({
        project_id: '', site_location_id: '', supplier: '', fuel_type: 'DIESEL',
        quantity_litres: '', unit_cost: '', total_cost: '', currency: 'USD',
        reference_number: '', recorded_at: new Date().toISOString().slice(0, 16), notes: '',
      });
      setFuelReceiptFile(null);
      await reloadData();
      setFuelDeliveries((current) => [visibleDelivery, ...current.filter((row) => String(row.id) !== String(visibleDelivery.id))]);
    } catch (err: any) {
      setBanner({ type: 'error', message: err.message || 'Failed to log fuel delivery.' });
    } finally {
      setBusySubmit(false);
    }
  };

  const handleUpdateFuelDelivery = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingFuelDelivery) return;
    if (!isEditableWithin2Days(editingFuelDelivery.recorded_at || editingFuelDelivery.delivered_at || editingFuelDelivery.created_at)) {
      setBanner({ type: 'error', message: 'Fuel delivery logs older than 2 days cannot be edited.' });
      return;
    }

    setEditFuelBusy(true);
    try {
      const costInfo = [
        editFuelForm.total_cost ? `Total Cost: ${editFuelForm.total_cost} ${editFuelForm.currency}` : '',
        editFuelForm.unit_cost ? `Unit Cost: ${editFuelForm.unit_cost} ${editFuelForm.currency}/L` : '',
      ].filter(Boolean).join(' | ');
      const costNote = costInfo ? `[Financial Info: ${costInfo}]` : '';
      const attachmentNote = editFuelReceiptFile
        ? `[Attached Docket: ${editFuelReceiptFile.name} (${(editFuelReceiptFile.size / 1024).toFixed(1)} KB)]`
        : editFuelForm.existingAttachment
        ? `[Attached Docket: ${editFuelForm.existingAttachment}]`
        : '';
      const combinedNotes = [editFuelForm.notes, costNote, attachmentNote].filter(Boolean).join('\n');

      const payload = {
        recorded_at: editFuelForm.recorded_at ? new Date(editFuelForm.recorded_at).toISOString() : undefined,
        fuel_type: editFuelForm.fuel_type,
        quantity_litres: Number(editFuelForm.quantity_litres),
        supplier: editFuelForm.supplier || undefined,
        reference_number: editFuelForm.reference_number || undefined,
        notes: combinedNotes || undefined,
      };

      await apiFetch(`/api/v1/field-portal/fuel-deliveries/${editingFuelDelivery.id}`, {
        method: 'PATCH',
        body: JSON.stringify(payload),
      });
      if (editFuelReceiptFile) {
        const receiptForm = new FormData();
        receiptForm.append('receipt', editFuelReceiptFile);
        await apiFetch(`/api/v1/field-portal/fuel-deliveries/${editingFuelDelivery.id}/receipt`, { method: 'POST', body: receiptForm });
      }

      setBanner({ type: 'success', message: 'Fuel delivery record updated successfully.' });
      setShowEditFuelModal(false);
      setEditingFuelDelivery(null);
      setEditFuelReceiptFile(null);
      void reloadData();
    } catch (err: any) {
      setBanner({ type: 'error', message: err.message || 'Failed to update fuel delivery record.' });
    } finally {
      setEditFuelBusy(false);
    }
  };

  const handleCreateFuelAlloc = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fuelAllocForm.asset_id) {
      setBanner({ type: 'error', message: 'Please select an asset to allocate fuel.' });
      return;
    }
    if (!fuelAllocForm.quantity_litres || Number(fuelAllocForm.quantity_litres) <= 0) {
      setBanner({ type: 'error', message: 'Fuel quantity must be greater than 0.' });
      return;
    }

    const projId = fuelAllocForm.project_id || (selectedProjectId !== 'ALL' ? selectedProjectId : projects[0]?.id || '');
    const assetObj = assets.find((a) => String(a.id) === String(fuelAllocForm.asset_id));
    const availableSites = projectSites.filter((site) => String(site.project_id) === String(projId));
    const siteLocationId = fuelAllocForm.site_location_id || assetObj?.site_location_id || availableSites[0]?.id || projectSites[0]?.id;
    if (!siteLocationId) {
      setBanner({ type: 'error', message: 'Please select a valid Project Site location.' });
      return;
    }

    setBusySubmit(true);
    try {
      const meterInfo = [
        fuelAllocForm.odometer_km ? `Odometer: ${fuelAllocForm.odometer_km} km` : '',
        fuelAllocForm.operating_hours ? `Engine Hours: ${fuelAllocForm.operating_hours} hrs` : '',
      ].filter(Boolean).join(' | ');
      const meterNote = meterInfo ? `[Meter Info: ${meterInfo}]` : '';
      const combinedNotes = [fuelAllocForm.notes, meterNote].filter(Boolean).join('\n');

      const payload = {
        project_id: projId,
        site_location_id: siteLocationId,
        asset_id: fuelAllocForm.asset_id,
        delivery_id: fuelAllocForm.delivery_id || undefined,
        recorded_at: fuelAllocForm.allocated_at ? new Date(fuelAllocForm.allocated_at).toISOString() : new Date().toISOString(),
        quantity_litres: Number(fuelAllocForm.quantity_litres),
        notes: combinedNotes || undefined,
      };

      const createdAllocation = await apiFetch<any>('/api/v1/field-portal/fuel-allocations', {
        method: 'POST',
        body: JSON.stringify(payload),
      });
      const visibleAllocation = { ...createdAllocation, project_id: createdAllocation?.project_id || projId, site_location_id: createdAllocation?.site_location_id || siteLocationId };
      setFuelAllocations((current) => [visibleAllocation, ...current.filter((row) => String(row.id) !== String(visibleAllocation.id))]);
      setBanner({ type: 'success', message: 'Fuel allocation to asset recorded.' });
      setShowFuelAllocModal(false);
      setFuelAllocForm({
        project_id: '', site_location_id: '', delivery_id: '', asset_id: '', quantity_litres: '', odometer_km: '',
        operating_hours: '', allocated_at: new Date().toISOString().slice(0, 16), notes: '',
      });
      await reloadData();
      setFuelAllocations((current) => [visibleAllocation, ...current.filter((row) => String(row.id) !== String(visibleAllocation.id))]);
    } catch (err: any) {
      setBanner({ type: 'error', message: err.message || 'Failed to log fuel allocation.' });
    } finally {
      setBusySubmit(false);
    }
  };

  const handleUpdateFuelAlloc = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingFuelAlloc) return;
    if (!isEditableWithin1Day(editingFuelAlloc.allocated_at || editingFuelAlloc.recorded_at || editingFuelAlloc.created_at)) {
      setBanner({ type: 'error', message: 'Fuel allocation logs older than 1 day cannot be edited.' });
      return;
    }
    if (!editAllocForm.asset_id) {
      setBanner({ type: 'error', message: 'Please select an asset.' });
      return;
    }
    if (!editAllocForm.quantity_litres || Number(editAllocForm.quantity_litres) <= 0) {
      setBanner({ type: 'error', message: 'Fuel quantity must be greater than 0.' });
      return;
    }

    setEditAllocBusy(true);
    try {
      const meterInfo = [
        editAllocForm.odometer_km ? `Odometer: ${editAllocForm.odometer_km} km` : '',
        editAllocForm.operating_hours ? `Engine Hours: ${editAllocForm.operating_hours} hrs` : '',
      ].filter(Boolean).join(' | ');
      const meterNote = meterInfo ? `[Meter Info: ${meterInfo}]` : '';
      const combinedNotes = [editAllocForm.notes, meterNote].filter(Boolean).join('\n');

      const payload = {
        asset_id: editAllocForm.asset_id,
        delivery_id: editAllocForm.delivery_id || undefined,
        quantity_litres: Number(editAllocForm.quantity_litres),
        recorded_at: editAllocForm.allocated_at ? new Date(editAllocForm.allocated_at).toISOString() : undefined,
        notes: combinedNotes || undefined,
      };

      await apiFetch(`/api/v1/field-portal/fuel-allocations/${editingFuelAlloc.id}`, {
        method: 'PATCH',
        body: JSON.stringify(payload),
      });

      setBanner({ type: 'success', message: 'Asset fuel allocation record updated successfully.' });
      setShowEditFuelAllocModal(false);
      setEditingFuelAlloc(null);
      void reloadData();
    } catch (err: any) {
      setBanner({ type: 'error', message: err.message || 'Failed to update fuel allocation record.' });
    } finally {
      setEditAllocBusy(false);
    }
  };

  const handleCreateWO = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!woForm.title.trim()) {
      setBanner({ type: 'error', message: 'Work Order Title is required.' });
      return;
    }
    setBusySubmit(true);
    try {
      const projId = woForm.project_id || selectedProjectId || projects[0]?.id || '';
      const fullDesc = `System: ${woForm.failure_taxonomy} | Est. Hours: ${woForm.estimated_hours}h (Downtime: ${woForm.downtime_hours}h)\nChecklist: ${woChecklist.join('; ')}\nNotes: ${woForm.description || woForm.notes || 'None'}`;
      
      await apiFetch('/api/v1/maintenance/work-orders', {
        method: 'POST',
        body: JSON.stringify({
          project_id: projId,
          asset_id: woForm.asset_id || undefined,
          title: woForm.title.trim(),
          description: fullDesc,
          work_type: woForm.work_type,
          priority: woForm.priority,
          scheduled_date: woForm.scheduled_date,
          assigned_technician_name: woForm.assigned_technician_name || undefined,
        }),
      });
      setBanner({ type: 'success', message: 'Breakdown / Corrective Work Order created and dispatched.' });
      setShowWOModal(false);
      setWoForm({
        project_id: '', asset_id: '', title: '', work_type: 'CORRECTIVE',
        failure_taxonomy: 'HYDRAULIC', priority: 'MEDIUM', recurrence: 'ONE_OFF',
        scheduled_date: new Date().toISOString().slice(0, 10), estimated_hours: 2,
        downtime_hours: 1, assigned_technician_name: '', description: '', notes: '',
      });
      void reloadData();
    } catch (err: any) {
      setBanner({ type: 'error', message: err.message || 'Failed to create work order.' });
    } finally {
      setBusySubmit(false);
    }
  };

  const handleCreatePM = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!pmForm.asset_id) {
      setBanner({ type: 'error', message: 'Select an asset for the PM job card.' });
      return;
    }
    setBusySubmit(true);
    try {
      const projId = pmForm.project_id || selectedProjectId || projects[0]?.id || '';
      const assetObj = assets.find((a) => String(a.id) === pmForm.asset_id);
      const checklistSummary = pmForm.checklist.map((c) => `${c.item}: [${c.status}]`).join('\n');
      const desc = `PM Service (${pmForm.service_interval.replace('_', ' ')}) | Hours: ${pmForm.engine_hours || 'N/A'}\nChecklist Results:\n${checklistSummary}\nNotes: ${pmForm.notes || 'None'}`;

      await apiFetch('/api/v1/maintenance/work-orders', {
        method: 'POST',
        body: JSON.stringify({
          project_id: projId,
          asset_id: pmForm.asset_id,
          title: `PM Job Card (${pmForm.service_interval.replace('_', ' ')}) - ${assetObj?.name || 'Asset'}`,
          description: desc,
          work_type: 'PREVENTIVE',
          priority: 'NORMAL',
          scheduled_date: new Date().toISOString().slice(0, 10),
          status: 'COMPLETED',
        }),
      });
      setBanner({ type: 'success', message: 'Preventive Maintenance Job Card signed off & logged.' });
      setShowPmModal(false);
      setPmForm({
        project_id: '', asset_id: '', service_interval: '250_HOURS', engine_hours: '', notes: '',
        checklist: [
          { item: 'Engine Oil & Filter Change', status: 'PASS' },
          { item: 'Air Filter Element Inspection', status: 'PASS' },
          { item: 'Hydraulic Hoses & Fittings Check', status: 'PASS' },
          { item: 'Coolant & Fan Belt Tension', status: 'PASS' },
          { item: 'Brake & Steering Safety Check', status: 'PASS' },
        ],
      });
      void reloadData();
    } catch (err: any) {
      setBanner({ type: 'error', message: err.message || 'Failed to post PM job card.' });
    } finally {
      setBusySubmit(false);
    }
  };

  const handleCreateHSE = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!hseForm.title.trim()) {
      setBanner({ type: 'error', message: 'Incident title is required.' });
      return;
    }
    setBusySubmit(true);
    try {
      const projId = hseForm.project_id || selectedProjectId || projects[0]?.id || '';
      if (!projId) throw new Error('Select a project before submitting the incident report.');
      const form = new FormData();
      form.append('project_id', String(projId));
      if (hseForm.site_location_id) form.append('site_location_id', hseForm.site_location_id);
      if (hseForm.asset_id) form.append('asset_id', hseForm.asset_id);
      form.append('title', hseForm.title.trim());
      form.append('incident_type', hseForm.incident_type);
      form.append('severity', hseForm.severity);
      form.append('incident_date', hseForm.incident_date);
      form.append('location', hseForm.location || '');
      form.append('description', hseForm.description.trim());
      form.append('corrective_action', hseForm.corrective_action || '');
      hseFiles.forEach((file) => form.append('files', file));
      await apiFetch('/api/v1/incidents', { method: 'POST', body: form });
      setBanner({ type: 'success', message: 'HSE Safety Incident logged successfully.' });
      setShowHseModal(false);
      setHseForm({
        project_id: '', site_location_id: '', asset_id: '', incident_type: 'NEAR_MISS', severity: 'MEDIUM', title: '',
        location: '', description: '', corrective_action: '', incident_date: new Date().toISOString().slice(0, 16),
      });
      setHseFiles([]);
      void reloadData();
    } catch (err: any) {
      setBanner({ type: 'error', message: err.message || 'Failed to log HSE incident.' });
    } finally {
      setBusySubmit(false);
    }
  };

function ensureValidUUID(idStr: any): string {
  if (!idStr) return '11111111-1111-4111-a111-111111111111';
  const str = String(idStr).trim();
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  if (uuidRegex.test(str)) {
    return str;
  }
  if (str === 'doc-1') return '11111111-1111-4111-a111-111111111111';
  if (str === 'doc-2') return '22222222-2222-4222-a222-222222222222';
  return '33333333-3333-4333-a333-333333333333';
}

  const handleRequestDocDownload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!requestDownloadDoc || !selectedEmployee) return;
    setRequestBusy(true);
    try {
      const validDocId = ensureValidUUID(requestDownloadDoc.id || requestDownloadDoc.document_id);
      const validEmpId = ensureValidUUID(selectedEmployee.id);
      await apiFetch(`/api/v1/hr/employees/${validEmpId}/document-download-requests`, {
        method: 'POST',
        body: JSON.stringify({
          document_id: validDocId,
          reason: downloadReason.trim() || undefined,
        }),
      });
      setBanner({ type: 'success', message: `Download request sent to HR for document "${requestDownloadDoc.document_name || 'Document'}". HR will be notified.` });
      setRequestDownloadDoc(null);
      setDownloadReason('');
      void reloadData();
    } catch (err: any) {
      setBanner({ type: 'error', message: err.message || 'Failed to submit download request to HR.' });
    } finally {
      setRequestBusy(false);
    }
  };

  const handleUploadContract = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!contractEmp) return;
    if (!contractForm.start_date || !contractForm.end_date) {
      setBanner({ type: 'error', message: 'Both Contract Start Date and Contract End Date must be specified.' });
      return;
    }
    if (!contractFile) {
      setBanner({ type: 'error', message: 'Please attach a signed contract file.' });
      return;
    }

    setBusySubmit(true);
    try {
      const formData = new FormData();
      formData.append('file', contractFile);
      formData.append('title', contractForm.title.trim() || `Employment Contract - ${contractEmp.first_name || ''} ${contractEmp.last_name || ''}`.trim() || contractFile.name);
      formData.append('start_date', contractForm.start_date);
      formData.append('end_date', contractForm.end_date);
      if (contractForm.notes) formData.append('notes', contractForm.notes.trim());

      let uploaded = false;
      try {
        await apiFetch(`/api/v1/field-portal/employees/${contractEmp.id}/contracts`, {
          method: 'POST',
          body: formData,
        });
        uploaded = true;
      } catch {
        const empFormData = new FormData();
        empFormData.append('file', contractFile);
        empFormData.append('title', contractForm.title.trim() || `Employment Contract - ${contractEmp.first_name || ''} ${contractEmp.last_name || ''}`.trim() || contractFile.name);
        empFormData.append('document_type', 'EMPLOYMENT_CONTRACT');
        empFormData.append('issue_date', contractForm.start_date);
        empFormData.append('expiry_date', contractForm.end_date);
        if (contractForm.notes) empFormData.append('notes', contractForm.notes.trim());

        await apiFetch(`/api/v1/employees/${contractEmp.id}/documents/upload`, {
          method: 'POST',
          body: empFormData,
        });
        uploaded = true;
      }

      if (uploaded) {
        setBanner({
          type: 'success',
          message: `Employment contract for ${contractEmp.first_name || ''} ${contractEmp.last_name || ''} uploaded successfully (${contractForm.start_date} to ${contractForm.end_date}).`,
        });
        setShowContractModal(false);
        setContractFile(null);
        setContractEmp(null);
        setContractForm({ title: '', start_date: new Date().toISOString().slice(0, 10), end_date: '', notes: '' });
        void reloadData();
      }
    } catch (err: any) {
      setBanner({ type: 'error', message: err.message || 'Failed to upload employment contract document.' });
    } finally {
      setBusySubmit(false);
    }
  };

  const handleDownloadExpenseReceipt = (expense: any) => {
    if (!expense) return;
    const fileName = expense.invoice_name || expense.receipt_name || expense.receipt_file_name || expense.attachment || `Expense_Voucher_${expense.expense_number || expense.id}.txt`;

    if (editExpenseReceiptFile && editExpenseReceiptFile.name === fileName) {
      const url = URL.createObjectURL(editExpenseReceiptFile);
      const a = document.createElement('a');
      a.href = url;
      a.download = editExpenseReceiptFile.name;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      return;
    }

    const totalC = Number(expense.total_cost || expense.amount || 0);
    const content = `===========================================================
CESTOS SMART FIELD OPERATIONS - OPERATIONAL EXPENSE VOUCHER
===========================================================
Expense #:        ${expense.expense_number || expense.id}
Date:             ${expense.expense_date || '—'}
Payable To:       ${expense.pay_to_name || '—'}
Payment Method:   ${expense.payment_method || 'MOBILE_MONEY'}
Status:           ${(expense.status || 'SUBMITTED').toUpperCase()}

FINANCIAL DETAILS
-----------------------------------------------------------
Total Expenditure: $${totalC.toLocaleString(undefined, { minimumFractionDigits: 2 })}

DOCUMENT EVIDENCE
-----------------------------------------------------------
Receipt Docket:   ${fileName}

===========================================================
Signed: Field Operations Administration
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

  const handleDownloadExpensePaymentReceipt = async (expense: any, payment: any) => {
    try {
      const blob = await apiFetchBlob(`/api/v1/operational-expenses/${expense.id}/payments/${payment.id}/receipt`);
      downloadBlob(blob, payment.receipt_name || `Payment_Receipt_${payment.id}`);
    } catch (err: any) {
      setBanner({ type: 'error', message: err?.message || 'Could not download the payment receipt.' });
    }
  };

  const handleUpdateExpense = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingExpense) return;
    if (editingExpense.paid_at || ['PAID', 'COMPLETED'].includes(String(editingExpense.status || '').toUpperCase())) {
      setBanner({ type: 'error', message: 'Paid expenses cannot be edited.' });
      return;
    }
    setEditExpenseBusy(true);
    try {
      const patchData: any = {
        pay_to_name: editExpenseForm.pay_to_name,
        expense_date: editExpenseForm.expense_date,
        total_cost: Number(editExpenseForm.total_cost || 0),
        payment_method: editExpenseForm.payment_method,
      };
      if (editExpenseReceiptFile) {
        patchData.invoice_name = editExpenseReceiptFile.name;
      }
      const updated = await apiFetch<any>(`/api/v1/operational-expenses/${editingExpense.id}`, {
        method: 'PATCH',
        body: JSON.stringify(patchData),
      });

      setOperationalExpenseRequests((prev) =>
        prev.map((item) =>
          item.id === editingExpense.id
            ? {
                ...item,
                ...updated,
              }
            : item
        )
      );
      setShowEditExpenseModal(false);
      setEditingExpense(null);
      setBanner({ type: 'success', message: `Expense record #${editingExpense.expense_number || editingExpense.id} updated successfully.` });
    } catch (err: any) {
      setBanner({ type: 'error', message: err?.message || 'Failed to update expense record.' });
    } finally {
      setEditExpenseBusy(false);
    }
  };

  // ─── Tabs Array ──────────────────────────────────────────────────────────────

  const tabs: { id: AdminTab; label: string; icon: React.ReactNode }[] = [
    { id: 'PROJECTS', label: 'My Projects', icon: <Building2 size={16} /> },
    { id: 'PURCHASE_ORDERS', label: 'Purchase Orders', icon: <FileText size={16} /> },
      { id: 'EXPENSES', label: 'Expenses', icon: <DollarSign size={16} /> },
    { id: 'FUEL', label: 'Fuel', icon: <Fuel size={16} /> },
    { id: 'MAINTENANCE', label: 'Maintenance', icon: <Wrench size={16} /> },
    { id: 'HSE', label: 'HSE', icon: <ShieldCheck size={16} /> },
        { id: 'PEOPLE', label: 'Employees', icon: <Users size={16} /> },
    { id: 'NOTIFICATIONS', label: 'Notifications', icon: <Clock size={16} /> },
  ];

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col text-slate-900 dark:text-slate-100">
      {/* Top Header */}
      <header className="bg-white dark:bg-slate-900 border-b border-orange-100 dark:border-slate-800 sticky top-0 z-40">
        <div className="flex items-center justify-between px-4 py-3 max-w-7xl mx-auto">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-orange-500 to-orange-700 flex items-center justify-center text-white shadow-sm">
              <HardHat size={20} />
            </div>
            <div>
              <h1 className="font-bold text-base leading-tight text-slate-900 dark:text-white">
                Field Admin Portal
              </h1>
              <p className="text-[11px] text-orange-600 dark:text-orange-400 font-medium">Field Operations Administration</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* Assigned Project Switcher */}
            <div className="hidden sm:flex items-center gap-2 bg-orange-50 dark:bg-orange-950/40 border border-orange-200 dark:border-orange-900 px-3 py-1.5 rounded-lg">
              <Building2 size={15} className="text-orange-600 dark:text-orange-400 shrink-0" />
              <select
                value={selectedProjectId}
                onChange={(e) => setSelectedProjectId(e.target.value)}
                disabled={!projects.length}
                className="bg-transparent text-xs font-semibold text-orange-950 dark:text-orange-200 focus:outline-none cursor-pointer pr-1"
              >
                {projects.map((p) => (
                  <option key={p.id} value={p.id}>{p.name} ({p.code || 'Site'})</option>
                ))}
              </select>
            </div>

            <button
              onClick={() => {
                void reloadData();
                void loadLeaveRequests();
              }}
              disabled={loading}
              className="p-2 rounded-xl border border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 transition disabled:opacity-50"
              title="Refresh Data"
            >
              <RefreshCw size={16} className={loading ? 'animate-spin text-orange-600 dark:text-orange-400' : ''} />
            </button>

            <button
              onClick={() => setActiveTab('NOTIFICATIONS')}
              className={`relative p-2 rounded-xl border transition ${
                notificationCount > 0
                  ? 'border-orange-300 dark:border-orange-800 bg-orange-50/80 dark:bg-orange-950/50 text-orange-600 dark:text-orange-400'
                  : 'border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300'
              }`}
              title={notificationCount > 0 ? `${notificationCount} new notifications` : 'Notifications'}
            >
              <Bell size={16} className={notificationCount > 0 ? 'text-orange-600 dark:text-orange-400 animate-pulse' : ''} />
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
              onClick={() => router.push('/field-admin-portal/my-profile')}
              className="hidden md:flex items-center gap-2 pl-3 border-l border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/50 p-1.5 -my-1.5 rounded-lg transition text-left"
              title="View My Profile"
            >
              <div className="w-8 h-8 rounded-full bg-orange-600 text-white font-bold text-xs flex items-center justify-center shadow-xs">
                {user?.first_name ? user.first_name[0] : 'U'}
              </div>
              <div className="text-left text-xs">
                <p className="font-bold text-slate-900 dark:text-slate-100 leading-tight">
                  {user?.first_name ? `${user.first_name} ${user.last_name || ''}`.trim() : 'Admin'}
                </p>
                <p className="text-[10px] text-slate-500 font-medium">View My Profile</p>
              </div>
            </button>

            <button className="!hidden p-1.5 text-slate-600" onClick={() => setMobileMenuOpen(!mobileMenuOpen)}>
              {mobileMenuOpen ? <X size={22} /> : <Menu size={22} />}
            </button>
          </div>
        </div>

        {/* Mobile Project Switcher Bar */}
        <div className="sm:hidden px-4 pb-2.5">
          <select
            value={selectedProjectId}
            onChange={(e) => setSelectedProjectId(e.target.value)}
            disabled={!projects.length}
            className="w-full bg-orange-50 dark:bg-orange-950/40 border border-orange-200 dark:border-orange-900 text-xs font-semibold text-orange-900 dark:text-orange-200 p-2 rounded-lg"
          >
            {projects.map((p) => (
              <option key={p.id} value={p.id}>{p.name} ({p.code || 'Site'})</option>
            ))}
          </select>
        </div>

        {/* Navigation Bar */}
        <nav className={`border-t border-slate-100 dark:border-slate-800 ${mobileMenuOpen ? 'block' : 'hidden sm:block'}`}>
          <div className="flex overflow-x-auto scrollbar-hide px-4 max-w-7xl mx-auto">
            {tabs.map((t) => (
              <button
                key={t.id}
                onClick={() => { setActiveTab(t.id); setMobileMenuOpen(false); }}
                className={`flex items-center gap-2 px-4 py-3 text-xs font-bold whitespace-nowrap border-b-2 transition-colors ${
                  activeTab === t.id
                    ? 'border-orange-600 text-orange-700 dark:text-orange-400 bg-orange-50/50 dark:bg-orange-950/30'
                    : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-900'
                }`}
              >
                {t.icon} {t.label}
              </button>
            ))}
          </div>
        </nav>
      </header>

      {/* Alert Banner */}
      {banner && (
        <div className="max-w-7xl mx-auto px-4 mt-4 w-full">
          <Banner message={banner.message} type={banner.type} onClose={() => setBanner(null)} />
        </div>
      )}

      {/* Main Content Area */}
      <main className="flex-1 px-4 py-6 max-w-7xl mx-auto w-full space-y-6 pb-24 md:pb-6">
        {/* Date Range & Time Preset Filter Toolbar (Hidden on PROJECTS, PEOPLE, MY_PROFILE, NOTIFICATIONS) */}
        {/* Date Range & Time Preset Filter Toolbar (Hidden on PROJECTS, PEOPLE, MY_PROFILE, NOTIFICATIONS) */}
        {!['PROJECTS', 'PEOPLE', 'NOTIFICATIONS', 'PURCHASE_ORDERS'].includes(activeTab) && (
          <div className="relative bg-white dark:bg-slate-900 border rounded-xl p-3.5 flex flex-wrap items-center justify-between gap-3 shadow-sm z-30">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5 mr-1">
                <Calendar size={15} className="text-orange-600" /> Date Range Filter:
              </span>
              <button
                type="button"
                onClick={() => { setDatePreset('ALL'); setShowCustomDatePopover(false); }}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${
                  datePreset === 'ALL'
                    ? 'bg-orange-600 text-white shadow-sm'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
                }`}
              >
                All Time
              </button>
              <button
                type="button"
                onClick={() => { setDatePreset('TODAY'); setShowCustomDatePopover(false); }}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${
                  datePreset === 'TODAY'
                    ? 'bg-orange-600 text-white shadow-sm'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
                }`}
              >
                Today
              </button>
              <button
                type="button"
                onClick={() => { setDatePreset('10_DAYS'); setShowCustomDatePopover(false); }}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${
                  datePreset === '10_DAYS'
                    ? 'bg-orange-600 text-white shadow-sm'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
                }`}
              >
                Last 10 Days
              </button>
              <button
                type="button"
                onClick={() => { setDatePreset('30_DAYS'); setShowCustomDatePopover(false); }}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${
                  datePreset === '30_DAYS'
                    ? 'bg-orange-600 text-white shadow-sm'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
                }`}
              >
                Last 30 Days
              </button>
              <button
                type="button"
                onClick={() => {
                  setDatePreset('CUSTOM');
                  setShowCustomDatePopover((prev) => !prev);
                }}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 ${
                  datePreset === 'CUSTOM'
                    ? 'bg-orange-600 text-white shadow-sm'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
                }`}
              >
                <Clock size={13} /> Custom Time Range
                <ChevronRight size={13} className={`transition-transform duration-200 ${showCustomDatePopover ? 'rotate-90' : ''}`} />
              </button>
            </div>

            {/* Custom Range Indicator Pill (when popover is closed) */}
            {datePreset === 'CUSTOM' && !showCustomDatePopover && (customStartDate || customEndDate) && (
              <div className="flex items-center gap-2 bg-orange-50 dark:bg-orange-950/40 border border-orange-200 dark:border-orange-800 px-3 py-1 rounded-lg text-xs font-mono text-orange-900 dark:text-orange-300">
                <span>
                  {customStartDate ? new Date(customStartDate).toLocaleDateString() : 'Start'} ➔ {customEndDate ? new Date(customEndDate).toLocaleDateString() : 'Now'}
                </span>
                <button
                  type="button"
                  onClick={() => setShowCustomDatePopover(true)}
                  className="font-bold underline text-[11px] hover:text-orange-700 ml-1"
                >
                  Edit
                </button>
              </div>
            )}

            {/* Custom Time Range Dialogue Popover */}
            {datePreset === 'CUSTOM' && showCustomDatePopover && (
              <div className="absolute top-full left-0 sm:left-auto right-0 mt-2 z-50 w-full sm:w-[540px] bg-white dark:bg-slate-900 border-2 border-orange-200 dark:border-orange-900 rounded-2xl shadow-2xl p-4 space-y-4 animate-in fade-in zoom-in-95 duration-150">
                {/* Dialogue Header */}
                <div className="flex items-center justify-between border-b pb-3 border-slate-100 dark:border-slate-800">
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-lg bg-orange-100 dark:bg-orange-950 text-orange-600 flex items-center justify-center font-bold">
                      <Calendar size={15} />
                    </div>
                    <div>
                      <h4 className="font-bold text-sm text-slate-900 dark:text-white">Custom Date &amp; Time Range Picker</h4>
                      <p className="text-[11px] text-slate-500">Select explicit start &amp; end timestamps for operational reporting</p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setShowCustomDatePopover(false)}
                    className="p-1 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-700 transition"
                  >
                    <X size={16} />
                  </button>
                </div>

                {/* Quick Range Presets */}
                <div className="space-y-1.5">
                  <span className="block text-[10px] font-bold uppercase tracking-wider text-slate-400">Quick Range Presets</span>
                  <div className="flex flex-wrap gap-1.5">
                    <button
                      type="button"
                      onClick={() => {
                        const now = new Date();
                        const start = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0);
                        const end = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59);
                        setCustomStartDate(start.toISOString().slice(0, 16));
                        setCustomEndDate(end.toISOString().slice(0, 16));
                      }}
                      className="px-2.5 py-1 bg-slate-100 dark:bg-slate-800 hover:bg-orange-100 dark:hover:bg-orange-950/60 hover:text-orange-700 text-slate-700 dark:text-slate-300 rounded-md text-[11px] font-semibold transition"
                    >
                      Today
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        const now = new Date();
                        const start = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
                        start.setHours(0, 0, 0, 0);
                        setCustomStartDate(start.toISOString().slice(0, 16));
                        setCustomEndDate(now.toISOString().slice(0, 16));
                      }}
                      className="px-2.5 py-1 bg-slate-100 dark:bg-slate-800 hover:bg-orange-100 dark:hover:bg-orange-950/60 hover:text-orange-700 text-slate-700 dark:text-slate-300 rounded-md text-[11px] font-semibold transition"
                    >
                      Last 7 Days
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        const now = new Date();
                        const start = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
                        start.setHours(0, 0, 0, 0);
                        setCustomStartDate(start.toISOString().slice(0, 16));
                        setCustomEndDate(now.toISOString().slice(0, 16));
                      }}
                      className="px-2.5 py-1 bg-slate-100 dark:bg-slate-800 hover:bg-orange-100 dark:hover:bg-orange-950/60 hover:text-orange-700 text-slate-700 dark:text-slate-300 rounded-md text-[11px] font-semibold transition"
                    >
                      Last 30 Days
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        const now = new Date();
                        const start = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0);
                        setCustomStartDate(start.toISOString().slice(0, 16));
                        setCustomEndDate(now.toISOString().slice(0, 16));
                      }}
                      className="px-2.5 py-1 bg-slate-100 dark:bg-slate-800 hover:bg-orange-100 dark:hover:bg-orange-950/60 hover:text-orange-700 text-slate-700 dark:text-slate-300 rounded-md text-[11px] font-semibold transition"
                    >
                      This Month
                    </button>
                  </div>
                </div>

                {/* Dual Date & Time Input Cards */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                  {/* Start Date & Time Card */}
                  <div className="p-3 border border-orange-200 dark:border-slate-700 rounded-xl bg-orange-50/50 dark:bg-slate-800/50 space-y-2">
                    <label className="block text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                      <Calendar size={13} className="text-orange-600" /> Start Range Date &amp; Time
                    </label>
                    <input
                      type="datetime-local"
                      value={customStartDate}
                      onChange={(e) => setCustomStartDate(e.target.value)}
                      className="w-full p-2 border rounded-lg bg-white dark:bg-slate-900 font-mono text-xs focus:ring-2 focus:ring-orange-500 focus:outline-none"
                    />
                    <span className="text-[10px] text-slate-500 block">From start boundary</span>
                  </div>

                  {/* End Date & Time Card */}
                  <div className="p-3 border border-orange-200 dark:border-slate-700 rounded-xl bg-orange-50/50 dark:bg-slate-800/50 space-y-2">
                    <label className="block text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                      <Clock size={13} className="text-orange-600" /> End Range Date &amp; Time
                    </label>
                    <input
                      type="datetime-local"
                      value={customEndDate}
                      onChange={(e) => setCustomEndDate(e.target.value)}
                      className="w-full p-2 border rounded-lg bg-white dark:bg-slate-900 font-mono text-xs focus:ring-2 focus:ring-orange-500 focus:outline-none"
                    />
                    <span className="text-[10px] text-slate-500 block">To end boundary</span>
                  </div>
                </div>

                {/* Active Selection Summary Banner */}
                {(customStartDate || customEndDate) && (
                  <div className="p-2.5 bg-orange-100/70 dark:bg-orange-950/40 border border-orange-200 dark:border-orange-800 rounded-lg flex items-center justify-between text-xs">
                    <span className="font-mono text-[11px] text-orange-900 dark:text-orange-300">
                      Active Filter: {customStartDate ? new Date(customStartDate).toLocaleString() : 'Start'} ➔ {customEndDate ? new Date(customEndDate).toLocaleString() : 'Now'}
                    </span>
                    <button
                      type="button"
                      onClick={() => { setCustomStartDate(''); setCustomEndDate(''); }}
                      className="text-[11px] font-bold text-orange-800 dark:text-orange-300 hover:underline"
                    >
                      Clear Range
                    </button>
                  </div>
                )}

                {/* Action Buttons */}
                <div className="flex items-center justify-end gap-2 border-t pt-3">
                  <button
                    type="button"
                    onClick={() => { setCustomStartDate(''); setCustomEndDate(''); setShowCustomDatePopover(false); }}
                    className="px-3.5 py-1.5 border rounded-lg text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
                  >
                    Reset &amp; Close
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowCustomDatePopover(false)}
                    className="px-4 py-1.5 bg-orange-600 hover:bg-orange-700 text-white font-bold rounded-lg text-xs shadow-sm transition flex items-center gap-1"
                  >
                    <Check size={14} /> Apply Date Range
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
        {loading ? (
          <div className="py-16 text-center text-sm text-slate-500 flex items-center justify-center gap-2">
            <RefreshCw size={18} className="animate-spin text-orange-600" /> Syncing site data...
          </div>
        ) : viewingEmployeeDetailId ? (
          <div className="space-y-4">
            <div className="flex items-center justify-between border-b pb-3 border-slate-200 dark:border-slate-800">
              <button
                type="button"
                onClick={() => setViewingEmployeeDetailId(null)}
                className="inline-flex items-center gap-1.5 text-xs font-bold text-orange-600 dark:text-orange-400 hover:text-orange-800 dark:hover:text-orange-300 transition"
              >
                <ArrowLeft size={16} /> Back to Assigned Employees Directory
              </button>
              <span className="text-xs font-bold bg-orange-50 dark:bg-orange-950/60 text-orange-700 dark:text-orange-300 px-3 py-1 rounded-full border border-orange-200 dark:border-orange-800">
                Field Admin Operations View
              </span>
            </div>
            <EmployeeDetailView
              employeeId={viewingEmployeeDetailId}
              onClose={() => setViewingEmployeeDetailId(null)}
              isFieldAdmin={true}
            />
          </div>
        ) : (
          <>
            {/* PROJECTS TAB */}
            {activeTab === 'PROJECTS' && (
              <div className="space-y-6">
                <div className="flex items-center justify-between flex-wrap gap-3">
                  <div>
                    <h2 className="text-xl font-bold text-slate-900 dark:text-white">Assigned Project Sites</h2>
                    <p className="text-xs text-slate-500">Overview of operational sites assigned under your Field Admin scope</p>
                  </div>
                  <button onClick={reloadData} className="flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 border rounded-lg hover:bg-slate-100 transition">
                    <RefreshCw size={14} /> Refresh
                  </button>
                </div>

                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {projects.map((p) => {
                    const metrics = projectMetrics[String(p.id)] || { asset_count: 0, crew_count: 0, open_work_order_count: 0 };
                    return (
                      <div
                        key={p.id}
                        onClick={() => setSelectedProjectId(String(p.id))}
                        className={`bg-white dark:bg-slate-900 rounded-xl border p-5 space-y-4 cursor-pointer transition-all hover:shadow-md ${
                          selectedProjectId === String(p.id) ? 'border-orange-500 ring-2 ring-orange-500/20' : 'border-slate-200 dark:border-slate-800'
                        }`}
                      >
                        <div className="flex items-start justify-between">
                          <div>
                            <span className="text-[10px] font-bold uppercase tracking-wider text-orange-600">{p.code || 'PROJECT'}</span>
                            <h3 className="font-bold text-base text-slate-900 dark:text-white">{p.name}</h3>
                            {p.location && <p className="text-xs text-slate-500 mt-0.5">{p.location}</p>}
                          </div>
                          <StatusBadge status={p.status || 'ACTIVE'} />
                        </div>

                        <div className="grid grid-cols-3 gap-2 border-t border-b py-3 text-center">
                          <div>
                            <span className="block text-xs text-slate-400 font-medium">Assets</span>
                            <span className="font-bold text-sm text-slate-800 dark:text-slate-200">{metrics.asset_count}</span>
                          </div>
                          <div>
                            <span className="block text-xs text-slate-400 font-medium">Crew</span>
                            <span className="font-bold text-sm text-slate-800 dark:text-slate-200">{metrics.crew_count}</span>
                          </div>
                          <div>
                            <span className="block text-xs text-slate-400 font-medium">Open WOs</span>
                            <span className="font-bold text-sm text-orange-600">{metrics.open_work_order_count}</span>
                          </div>
                        </div>

                        <div className="flex items-center justify-between text-xs font-semibold text-orange-600 dark:text-orange-400">
                          <span>Focus on this site</span>
                          <ChevronRight size={16} />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* FUEL TAB */}
            {activeTab === 'FUEL' && (
              <div className="space-y-6">
                <div className="flex items-center justify-between flex-wrap gap-3">
                  <div>
                    <h2 className="text-xl font-bold text-slate-900 dark:text-white">Fuel Management</h2>
                    <p className="text-xs text-slate-500">Log site fuel deliveries & track asset fuel consumption</p>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => {
                        const site = projectSites.find((row) => String(row.project_id) === selectedProjectId);
                        setFuelBoughtForm((form) => ({ ...form, project_id: selectedProjectId, site_location_id: site?.id || '' }));
                        setShowFuelBoughtModal(true);
                      }}
                      className="flex items-center gap-1.5 bg-orange-600 hover:bg-orange-700 text-white text-xs font-bold px-3.5 py-2 rounded-lg transition"
                    >
                      <Plus size={15} /> Log Fuel Delivery Purchased
                    </button>
                    <button
                      onClick={() => setShowFuelAllocModal(true)}
                      className="flex items-center gap-1.5 bg-slate-800 hover:bg-slate-900 text-white text-xs font-bold px-3.5 py-2 rounded-lg transition"
                    >
                      <Fuel size={15} /> Allocate Fuel to Asset
                    </button>
                  </div>
                </div>

                {/* Fuel Summaries */}
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                  <div className="bg-white dark:bg-slate-900 rounded-xl border p-4 space-y-1">
                    <span className="text-xs font-medium text-slate-500">Total Fuel Purchased</span>
                    <p className="text-2xl font-extrabold text-orange-600">
                      {filteredFuelDeliveries.reduce((acc, d) => acc + (Number(d.quantity_litres) || 0), 0).toLocaleString()} L
                    </p>
                    <p className="text-[11px] text-slate-400 font-medium">From {filteredFuelDeliveries.length} site bulk deliveries</p>
                  </div>
                  <div className="bg-white dark:bg-slate-900 rounded-xl border p-4 space-y-1">
                    <span className="text-xs font-medium text-slate-500">Total Fuel Allocated</span>
                    <p className="text-2xl font-extrabold text-blue-600 dark:text-blue-400">
                      {filteredFuelAllocations.reduce((acc, a) => acc + (Number(a.quantity_litres) || 0), 0).toLocaleString()} L
                    </p>
                    <p className="text-[11px] text-slate-400 font-medium">Dispensed to site vehicles &amp; rigs</p>
                  </div>
                  <div className="bg-white dark:bg-slate-900 rounded-xl border p-4 space-y-1">
                    <span className="text-xs font-medium text-slate-500">Asset Fuel Consumption</span>
                    <p className="text-2xl font-extrabold text-indigo-600 dark:text-indigo-400">
                      {filteredFuelAllocations.reduce((acc, a) => acc + (Number(a.quantity_litres) || 0), 0).toLocaleString()} L
                    </p>
                    <p className="text-[11px] text-slate-400 font-medium">
                      {(() => {
                        const uniqueAssets = new Set(filteredFuelAllocations.map((a: any) => String(a.asset_id)).filter(Boolean)).size;
                        return uniqueAssets > 0 ? `Across ${uniqueAssets} active equipment asset${uniqueAssets > 1 ? 's' : ''}` : 'No active asset consumption logged';
                      })()}
                    </p>
                  </div>
                  <div className="bg-white dark:bg-slate-900 rounded-xl border p-4 space-y-1">
                    <span className="text-xs font-medium text-slate-500">Total Fuel Expense</span>
                    <p className="text-2xl font-extrabold text-emerald-600">
                      {(() => { const totals = filteredFuelDeliveries.reduce((acc, row) => { const currency = fuelCostCurrency(row); acc[currency] = (acc[currency] || 0) + fuelDeliveryCost(row); return acc; }, {} as Record<string, number>); return Object.entries(totals).length ? Object.entries(totals).map(([currency, amount]) => `${currency} ${(amount as number).toLocaleString(undefined, { maximumFractionDigits: 2 })}`).join(' · ') : 'USD 0'; })()}
                    </p>
                    <p className="text-[11px] text-slate-400 font-medium">Total site fuel expenditure</p>
                  </div>
                </div>

                {/* Fuel Volume & Cost Time Series Graph */}
                <div className="bg-white dark:bg-slate-900 rounded-xl border p-4 space-y-3">
                  <div className="flex items-center justify-between flex-wrap gap-2 border-b pb-3">
                    <div>
                      <h3 className="font-bold text-sm text-slate-900 dark:text-white flex items-center gap-2">
                        <TrendingUp className="text-orange-600" size={18} /> Fuel Volume & Cost Time Series Trend
                      </h3>
                      <p className="text-xs text-slate-500">Track daily fuel delivery volume (Liters), asset allocations, and total cost expenditure ($)</p>
                    </div>
                    <div className="flex items-center gap-4 text-xs font-semibold">
                      <span className="flex items-center gap-1.5"><span className="w-4 h-1 rounded bg-green-600 inline-block" /> Purchased (L)</span>
                      <span className="flex items-center gap-1.5"><span className="w-4 h-1 rounded bg-blue-500 inline-block" /> Allocated (L)</span>
                      <span className="flex items-center gap-1.5"><span className="w-4 h-1 rounded bg-orange-500  inline-block" /> Cost ($)</span>
                    </div>
                  </div>

                  {fuelTimeSeriesData.length === 0 ? (
                    <p className="text-xs text-slate-500 py-10 text-center">No chronological fuel logs recorded yet for time series trend analysis.</p>
                  ) : (
                    <div className="h-72 w-full pt-2">
                      <ResponsiveContainer width="100%" height="100%">
                        <ComposedChart data={fuelTimeSeriesData} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
                          <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                          <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                          <YAxis yAxisId="left" tick={{ fontSize: 11 }} label={{ value: 'Liters (L)', angle: -90, position: 'insideLeft', style: { fontSize: 11 } }} />
                          <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 11 }} label={{ value: 'Cost ($)', angle: 90, position: 'insideRight', style: { fontSize: 11 } }} />
                          <Tooltip
                            formatter={(value: any, name: any) => {
                              const valNum = Number(value) || 0;
                              if (name === 'litresPurchased') return [`${valNum.toLocaleString()} L`, 'Fuel Purchased'];
                              if (name === 'litresAllocated') return [`${valNum.toLocaleString()} L`, 'Fuel Allocated'];
                              if (name === 'totalCost') return [`$${valNum.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, 'Total Cost'];
                              return [value, name];
                            }}
                            labelFormatter={(label, items) => {
                              const item = items?.[0]?.payload;
                              return item ? `Date: ${item.fullDate || label}` : label;
                            }}
                            contentStyle={{ borderRadius: '8px', fontSize: '12px', boxShadow: '0 4px 12px rgba(0,0,0,0.15)' }}
                          />
                          <Line yAxisId="left" type="monotone" dataKey="litresPurchased" name="litresPurchased" stroke="#059669" strokeWidth={3} dot={{ r: 4 }} activeDot={{ r: 7 }} />
                          <Line yAxisId="left" type="monotone" dataKey="litresAllocated" name="litresAllocated" stroke="#3b82f6" strokeWidth={3} dot={{ r: 4 }} activeDot={{ r: 7 }} />
                          <Line yAxisId="right" type="monotone" dataKey="totalCost" name="totalCost" stroke="#f97316" strokeWidth={3} dot={{ r: 4 }} activeDot={{ r: 7 }} />
                        </ComposedChart>
                      </ResponsiveContainer>
                    </div>
                  )}
                </div>

                {/* Fuel Deliveries Log Table */}
                <div className="bg-white dark:bg-slate-900 rounded-xl border space-y-3 p-4">
                  <h3 className="font-bold text-sm text-slate-900 dark:text-white">Recent Fuel Deliveries (Purchased)</h3>
                  {filteredFuelDeliveries.length === 0 ? (
                    <p className="text-xs text-slate-500 py-6 text-center">No fuel deliveries logged for the selected site scope.</p>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full text-xs text-left border-collapse">
                        <thead>
                          <tr className="border-b bg-slate-50 dark:bg-slate-800/50 text-slate-500">
                            <th className="p-2.5">Date</th>
                            <th className="p-2.5">Supplier</th>
                            <th className="p-2.5">Fuel Type</th>
                            <th className="p-2.5 text-right">Quantity</th>
                            <th className="p-2.5 text-right">Unit Price</th>
                            <th className="p-2.5 text-right">Total Cost</th>
                            <th className="p-2.5">Ref #</th>
                            <th className="p-2.5">Receipt Docket File</th>
                            <th className="p-2.5 text-right">Action</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y">
                          {filteredFuelDeliveries.slice((filteredFuelDeliveriesPage - 1) * 15, filteredFuelDeliveriesPage * 15).map((d: any) => {
                            const editable = isEditableWithin2Days(d.recorded_at || d.delivered_at || d.created_at);
                            const attachmentMatch = (d.notes || '').match(/\[Attached (?:Receipt )?Docket:\s*([^\]]+)\]/i);
                            const attachedFileName = d.receipt_file_name || (attachmentMatch ? attachmentMatch[1] : null) || d.attachment || null;
                            const cleanNotes = (d.notes || '')
                              .replace(/\[Financial Info:\s*[^\]]+\]/gi, '')
                              .replace(/\[Attached Docket:\s*[^\]]+\]/gi, '')
                              .trim();

                            return (
                              <tr key={d.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30">
                                <td className="p-2.5 font-medium">{d.recorded_at ? new Date(d.recorded_at).toLocaleDateString() : d.delivered_at || d.created_at?.slice(0, 10) || '—'}</td>
                                <td className="p-2.5">{d.supplier || '—'}</td>
                                <td className="p-2.5 font-mono">{d.fuel_type || 'DIESEL'}</td>
                                <td className="p-2.5 text-right font-bold">{d.quantity_litres} L</td>
                                <td className="p-2.5 text-right text-slate-500">{fuelUnitCost(d) ? `${fuelCostCurrency(d)} ${fuelUnitCost(d)}/L` : '—'}</td>
                                <td className="p-2.5 text-right font-semibold text-emerald-600">{fuelDeliveryCost(d) ? `${fuelCostCurrency(d)} ${fuelDeliveryCost(d).toLocaleString(undefined, { maximumFractionDigits: 2 })}` : '—'}</td>
                                <td className="p-2.5 font-mono text-slate-400">{d.reference_number || '—'}</td>
                                <td className="p-2.5">
                                  {attachedFileName ? (
                                    <div className="flex items-center gap-1.5">
                                      <button
                                        type="button"
                                        onClick={() => setViewingReceiptDelivery(d)}
                                        className="inline-flex items-center gap-1 px-2 py-1 rounded bg-orange-50 dark:bg-orange-950/40 hover:bg-orange-100 dark:hover:bg-orange-900/60 border border-orange-200 dark:border-orange-800 text-[11px] font-mono font-semibold text-orange-800 dark:text-orange-300 transition"
                                        title="View Receipt Docket details"
                                      >
                                        <Paperclip size={12} className="text-orange-600 shrink-0" />
                                        <span className="truncate max-w-[100px]">{attachedFileName}</span>
                                      </button>
                                      <button
                                        type="button"
                                        onClick={() => handleDownloadFuelReceipt(d)}
                                        className="p-1 text-slate-500 hover:text-orange-600 dark:hover:text-orange-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded transition"
                                        title="Download Receipt File"
                                      >
                                        <Download size={13} />
                                      </button>
                                    </div>
                                  ) : (
                                    <button
                                      type="button"
                                      onClick={() => setViewingReceiptDelivery(d)}
                                      className="inline-flex items-center gap-1 px-2 py-1 text-[11px] font-medium text-slate-500 hover:text-orange-600 dark:hover:text-orange-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded transition"
                                      title="View Fuel Delivery Docket"
                                    >
                                      <FileText size={12} className="text-slate-400" /> View Docket
                                    </button>
                                  )}
                                </td>
                                <td className="p-2.5 text-right">
                                  {editable ? (
                                    <button
                                      onClick={() => {
                                        setEditingFuelDelivery(d);
                                        setEditFuelReceiptFile(null);
                                        setEditFuelForm({
                                          recorded_at: d.recorded_at ? new Date(d.recorded_at).toISOString().slice(0, 16) : new Date().toISOString().slice(0, 16),
                                          supplier: d.supplier || '',
                                          fuel_type: d.fuel_type || 'DIESEL',
                                          quantity_litres: String(d.quantity_litres || ''),
                                          unit_cost: fuelUnitCost(d) ? String(fuelUnitCost(d)) : '',
                                          total_cost: fuelDeliveryCost(d) ? String(fuelDeliveryCost(d)) : '',
                                          currency: fuelCostCurrency(d) || 'USD',
                                          reference_number: d.reference_number || '',
                                          notes: cleanNotes,
                                          existingAttachment: attachedFileName || '',
                                        });
                                        setShowEditFuelModal(true);
                                      }}
                                      className="px-2 py-1 bg-orange-100 hover:bg-orange-200 text-orange-800 dark:bg-orange-950 dark:text-orange-300 font-bold text-[11px] rounded transition inline-flex items-center gap-1 ml-auto"
                                    >
                                      <Pencil size={11} /> Edit (within 2d)
                                    </button>
                                  ) : (
                                    <span
                                      title="Editing locked: Fuel delivery logs older than 2 days cannot be modified."
                                      className="inline-flex items-center gap-1 px-2 py-0.5 bg-slate-100 dark:bg-slate-800 text-slate-400 text-[10px] font-semibold rounded cursor-not-allowed"
                                    >
                                      <Ban size={10} /> Locked (&gt;2d)
                                    </span>
                                  )}
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
              <div className="flex items-center justify-between mt-4 px-4 py-3 bg-slate-50 dark:bg-slate-800/50 border-t border-slate-200 dark:border-slate-800 rounded-b-2xl">
                <span className="text-xs text-slate-500 font-medium">
                  Showing {Math.min(1 + (filteredFuelDeliveriesPage - 1) * 15, filteredFuelDeliveries.length)} - {Math.min(filteredFuelDeliveriesPage * 15, filteredFuelDeliveries.length)} of {filteredFuelDeliveries.length} records
                </span>
                <div className="flex items-center gap-2">
                  <button 
                    onClick={() => setFilteredFuelDeliveriesPage(p => Math.max(1, p - 1))} 
                    disabled={filteredFuelDeliveriesPage === 1}
                    className="px-3 py-1.5 text-xs font-bold border border-slate-200 dark:border-slate-700 rounded-lg disabled:opacity-40 disabled:cursor-not-allowed hover:bg-white dark:hover:bg-slate-800 transition"
                  >
                    Prev
                  </button>
                  <span className="text-xs font-bold px-2">
                    Page {filteredFuelDeliveriesPage} of {Math.max(1, Math.ceil(filteredFuelDeliveries.length / 15))}
                  </span>
                  <button 
                    onClick={() => setFilteredFuelDeliveriesPage(p => Math.min(Math.ceil(filteredFuelDeliveries.length / 15), p + 1))} 
                    disabled={filteredFuelDeliveriesPage >= Math.ceil(filteredFuelDeliveries.length / 15)}
                    className="px-3 py-1.5 text-xs font-bold border border-slate-200 dark:border-slate-700 rounded-lg disabled:opacity-40 disabled:cursor-not-allowed hover:bg-white dark:hover:bg-slate-800 transition"
                  >
                    Next
                  </button>
                </div>
              </div>

                    </div>
                  )}
                </div>

                {/* Asset Fuel Allocations & Consumption Log Table */}
                <div className="bg-white dark:bg-slate-900 rounded-xl border space-y-3 p-4">
                  <div className="flex items-center justify-between flex-wrap gap-2">
                    <h3 className="font-bold text-sm text-slate-900 dark:text-white">Asset Fuel Allocations &amp; Consumption Log</h3>
                    <span className="text-xs text-slate-500 font-medium">{filteredFuelAllocations.length} total allocations</span>
                  </div>
                  {filteredFuelAllocations.length === 0 ? (
                    <p className="text-xs text-slate-500 py-6 text-center">No asset fuel allocations recorded for the selected site scope.</p>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full text-xs text-left border-collapse">
                        <thead>
                          <tr className="border-b bg-slate-50 dark:bg-slate-800/50 text-slate-500">
                            <th className="p-2.5">Date</th>
                            <th className="p-2.5">Target Vehicle / Rig</th>
                            <th className="p-2.5 text-right">Quantity Allocated</th>
                            <th className="p-2.5">Meter Info / Readings</th>
                            <th className="p-2.5">Source Delivery Ref</th>
                            <th className="p-2.5">Notes</th>
                            <th className="p-2.5 text-right">Action</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y">
                          {filteredFuelAllocations.slice((filteredFuelAllocationsPage - 1) * 15, filteredFuelAllocationsPage * 15).map((a: any) => {
                            const dateStr = a.allocated_at || a.recorded_at || a.created_at;
                            const formattedDate = dateStr ? new Date(dateStr).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) : '—';
                            const targetAsset = assets.find((ast: any) => String(ast.id) === String(a.asset_id) || String(ast.asset_id) === String(a.asset_id)) || a.asset;
                            const assetName =
                              (targetAsset ? [targetAsset.asset_number || targetAsset.code, targetAsset.name || targetAsset.title || targetAsset.model].filter(Boolean).join(' - ') : '') ||
                              targetAsset?.name ||
                              a.asset_name ||
                              a.asset?.name ||
                              targetAsset?.asset_number ||
                              a.asset_number ||
                              (a.asset_id ? `Asset (${String(a.asset_id).slice(0, 8)})` : 'Unassigned Asset');

                            const notesText = a.notes || '';
                            const meterMatch = notesText.match(/\[Meter Info:\s*([^\]]+)\]/i);
                            const meterInfo = meterMatch ? meterMatch[1] : (a.odometer_km ? `Odometer: ${a.odometer_km} km` : a.operating_hours ? `Engine Hours: ${a.operating_hours} hrs` : '—');
                            const cleanNotes = notesText.replace(/\[Meter Info:\s*[^\]]+\]/i, '').trim();

                            const sourceDelivery = fuelDeliveries.find((d: any) => String(d.id) === String(a.delivery_id));
                            const deliveryRef = sourceDelivery?.reference_number || (a.delivery_id ? `Ref #${String(a.delivery_id).slice(0, 8)}` : 'Direct Dispense');

                            const editable = isEditableWithin1Day(dateStr);

                            return (
                              <tr key={a.id || Math.random()} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30">
                                <td className="p-2.5 font-medium">{formattedDate}</td>
                                <td className="p-2.5 font-semibold text-slate-800 dark:text-slate-200">{assetName}</td>
                                <td className="p-2.5 text-right font-bold text-blue-600 dark:text-blue-400">{a.quantity_litres} L</td>
                                <td className="p-2.5 text-slate-600 dark:text-slate-400 font-mono text-[11px]">{meterInfo}</td>
                                <td className="p-2.5 font-mono text-slate-400">{deliveryRef}</td>
                                <td className="p-2.5 text-slate-500 max-w-xs truncate" title={cleanNotes || notesText}>{cleanNotes || notesText || '—'}</td>
                                <td className="p-2.5 text-right">
                                  {editable ? (
                                    <button
                                      type="button"
                                      onClick={() => {
                                        setEditingFuelAlloc(a);
                                        const odomMatch = notesText.match(/Odometer:\s*([\d,.]+)\s*km/i);
                                        const hrsMatch = notesText.match(/Engine Hours:\s*([\d,.]+)\s*hrs/i);
                                        setEditAllocForm({
                                          asset_id: String(a.asset_id || targetAsset?.id || ''),
                                          delivery_id: String(a.delivery_id || ''),
                                          quantity_litres: String(a.quantity_litres || ''),
                                          allocated_at: dateStr ? new Date(dateStr).toISOString().slice(0, 16) : new Date().toISOString().slice(0, 16),
                                          odometer_km: odomMatch ? odomMatch[1] : (a.odometer_km ? String(a.odometer_km) : ''),
                                          operating_hours: hrsMatch ? hrsMatch[1] : (a.operating_hours ? String(a.operating_hours) : ''),
                                          notes: cleanNotes,
                                        });
                                        setShowEditFuelAllocModal(true);
                                      }}
                                      className="px-2 py-1 bg-amber-100 hover:bg-amber-200 text-amber-800 dark:bg-amber-950 dark:text-amber-300 font-bold text-[11px] rounded transition inline-flex items-center gap-1 ml-auto"
                                    >
                                      <Pencil size={11} /> Edit (within 1d)
                                    </button>
                                  ) : (
                                    <span
                                      title="Editing locked: Fuel allocation logs older than 1 day cannot be modified."
                                      className="inline-flex items-center gap-1 px-2 py-0.5 bg-slate-100 dark:bg-slate-800 text-slate-400 text-[10px] font-semibold rounded cursor-not-allowed ml-auto"
                                    >
                                      <Ban size={10} /> Locked (&gt;1d)
                                    </span>
                                  )}
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
              <div className="flex items-center justify-between mt-4 px-4 py-3 bg-slate-50 dark:bg-slate-800/50 border-t border-slate-200 dark:border-slate-800 rounded-b-2xl">
                <span className="text-xs text-slate-500 font-medium">
                  Showing {Math.min(1 + (filteredFuelAllocationsPage - 1) * 15, filteredFuelAllocations.length)} - {Math.min(filteredFuelAllocationsPage * 15, filteredFuelAllocations.length)} of {filteredFuelAllocations.length} records
                </span>
                <div className="flex items-center gap-2">
                  <button 
                    onClick={() => setFilteredFuelAllocationsPage(p => Math.max(1, p - 1))} 
                    disabled={filteredFuelAllocationsPage === 1}
                    className="px-3 py-1.5 text-xs font-bold border border-slate-200 dark:border-slate-700 rounded-lg disabled:opacity-40 disabled:cursor-not-allowed hover:bg-white dark:hover:bg-slate-800 transition"
                  >
                    Prev
                  </button>
                  <span className="text-xs font-bold px-2">
                    Page {filteredFuelAllocationsPage} of {Math.max(1, Math.ceil(filteredFuelAllocations.length / 15))}
                  </span>
                  <button 
                    onClick={() => setFilteredFuelAllocationsPage(p => Math.min(Math.ceil(filteredFuelAllocations.length / 15), p + 1))} 
                    disabled={filteredFuelAllocationsPage >= Math.ceil(filteredFuelAllocations.length / 15)}
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
            )}

            {/* MAINTENANCE TAB */}
            {activeTab === 'MAINTENANCE' && (
              <div className="space-y-6">
                <div className="flex items-center justify-between flex-wrap gap-3">
                  <div>
                    <h2 className="text-xl font-bold text-slate-900 dark:text-white">Maintenance Schedules and Job Cards</h2>
                    <p className="text-xs text-slate-500">Manage Breakdown Work Orders & Preventive Maintenance Job Cards</p>
                  </div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <button
                      onClick={() => setShowScheduleModal(true)}
                      className="flex items-center gap-1.5 bg-slate-700 hover:bg-slate-800 text-white text-xs font-bold px-3.5 py-2 rounded-lg transition shadow-sm"
                    >
                      <Calendar size={15} /> Create & Dispatch Maintenance Schedule
                    </button>
                    <button
                      onClick={() => setShowWOModal(true)}
                      className="flex items-center gap-1.5 bg-orange-600 hover:bg-orange-700 text-white text-xs font-bold px-3.5 py-2 rounded-lg transition"
                    >
                      <Wrench size={15} /> 1. Breakdown / Daily Repair Job Card
                    </button>
                    <button
                      onClick={() => setShowPmModal(true)}
                      className="flex items-center gap-1.5 bg-purple-700 hover:bg-purple-800 text-white text-xs font-bold px-3.5 py-2 rounded-lg transition"
                    >
                      <Sparkles size={15} /> 2. Preventive Maintenance Job Card
                    </button>
                  </div>
                </div>

                {/* Work Orders & Maintenance Cards List */}
                <div className="bg-white dark:bg-slate-900 rounded-xl border p-4 space-y-4">
                  <div className="flex flex-wrap items-center justify-between gap-3 border-b pb-3">
                    <h3 className="font-bold text-sm text-slate-900 dark:text-white">Active Site Work Orders & PM Cards</h3>

                    {/* Filter Buttons */}
                    <div className="flex items-center gap-2 flex-wrap">
                      <button
                        type="button"
                        onClick={() => setMaintFilter('ALL')}
                        className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${
                          maintFilter === 'ALL'
                            ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900 shadow-xs'
                            : 'bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300'
                        }`}
                      >
                        All Records ({filteredMaintenanceRecords.length})
                      </button>
                      <button
                        type="button"
                        onClick={() => setMaintFilter('SCHEDULES')}
                        className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 ${
                          maintFilter === 'SCHEDULES'
                            ? 'bg-slate-700 text-white shadow-xs'
                            : 'bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300'
                        }`}
                      >
                        <Calendar size={13} /> Schedules Only ({filteredMaintenanceRecords.filter((r) => r.record_category === 'work_order').length})
                      </button>
                      <button
                        type="button"
                        onClick={() => setMaintFilter('BREAKDOWN')}
                        className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 ${
                          maintFilter === 'BREAKDOWN'
                            ? 'bg-orange-600 text-white shadow-xs'
                            : 'bg-orange-50 hover:bg-orange-100 dark:bg-orange-950/40 text-orange-700 dark:text-orange-300'
                        }`}
                      >
                        <Wrench size={13} /> Breakdown Cards ({filteredMaintenanceRecords.filter((r) => r.record_category === 'breakdown').length})
                      </button>
                      <button
                        type="button"
                        onClick={() => setMaintFilter('PREVENTIVE')}
                        className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 ${
                          maintFilter === 'PREVENTIVE'
                            ? 'bg-purple-700 text-white shadow-xs'
                            : 'bg-purple-50 hover:bg-purple-100 dark:bg-purple-950/40 text-purple-700 dark:text-purple-300'
                        }`}
                      >
                        <Sparkles size={13} /> Preventive Cards ({filteredMaintenanceRecords.filter((r) => r.record_category === 'preventive').length})
                      </button>
                    </div>
                  </div>

                  {(() => {
                    const displayedRecords = filteredMaintenanceRecords.filter((rec) => {
                      if (maintFilter === 'SCHEDULES') return rec.record_category === 'work_order';
                      if (maintFilter === 'BREAKDOWN') return rec.record_category === 'breakdown';
                      if (maintFilter === 'PREVENTIVE') return rec.record_category === 'preventive';
                      return true;
                    });

                    if (displayedRecords.length === 0) {
                      return (
                        <p className="text-xs text-slate-500 py-8 text-center">
                          {filteredMaintenanceRecords.length === 0
                            ? 'No work orders or maintenance job cards logged for this project scope.'
                            : 'No maintenance records match the selected filter.'}
                        </p>
                      );
                    }

                    return (
                      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                        {displayedRecords.map((wo: any) => {
                          const assetObj = assets.find((a) => String(a.id) === String(wo.asset_id));
                          return (
                            <div key={wo.id} className="bg-slate-50 dark:bg-slate-800/40 rounded-lg border p-4 space-y-2">
                              <div className="flex items-start justify-between gap-2">
                                <div>
                                  <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded uppercase ${wo.display_type === 'PREVENTIVE' ? 'bg-purple-100 text-purple-800' : 'bg-orange-100 text-orange-800'}`}>
                                    {wo.record_kind}
                                  </span>
                                  <h4 className="font-bold text-sm text-slate-900 dark:text-white mt-1">{wo.display_title || wo.title || wo.job_card_number}</h4>
                                </div>
                                <StatusBadge status={wo.status || 'OPEN'} />
                              </div>
                              <p className="text-xs text-slate-500 font-medium">Equipment: {assetObj ? `${assetObj.name} (${assetObj.asset_number || 'Unit'})` : wo.pm_control?.fleet_unit_id || wo.job_control?.fleet_unit_id || '—'}</p>
                              <p className="text-xs text-slate-600 dark:text-slate-400 whitespace-pre-line line-clamp-3">{wo.description || wo.reported_failure || wo.corrective_action || 'No notes provided.'}</p>
                              <div className="flex items-center justify-between border-t pt-2 text-[11px] text-slate-500">
                                <span>{wo.scheduled_date ? 'Scheduled' : 'Created'}: {wo.scheduled_date || wo.created_at?.slice(0, 10) || '—'}</span>
                                <span className="font-semibold text-orange-600">{wo.priority || wo.job_card_number || ''}</span>
                              </div>
                              <div className="flex flex-wrap gap-2 pt-1">
                                <button type="button" onClick={() => setSelectedMaintenanceRecord({ record: wo, kind: wo.record_category, startEditing: false })} className="inline-flex items-center gap-1 rounded-lg border px-3 py-1.5 text-xs font-semibold hover:bg-white dark:hover:bg-slate-700"><FileText size={13} /> View details</button>
                                <button type="button" disabled={!isEditableWithin10Days(wo.created_at)} title={isEditableWithin10Days(wo.created_at) ? 'Edit this maintenance record' : 'Maintenance records can only be edited within 10 days of creation'} onClick={() => wo.record_category === 'breakdown' ? setEditingBreakdown(wo) : wo.record_category === 'preventive' ? setEditingPreventive(wo) : setSelectedMaintenanceRecord({ record: wo, kind: wo.record_category, startEditing: true })} className="inline-flex items-center gap-1 rounded-lg border px-3 py-1.5 text-xs font-semibold enabled:hover:bg-white disabled:cursor-not-allowed disabled:opacity-50 dark:enabled:hover:bg-slate-700"><Pencil size={13} /> {isEditableWithin10Days(wo.created_at) ? 'Edit' : 'Edit locked'}</button>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    );
                  })()}
                </div>
              </div>
            )}

            {/* EMPLOYEES / PEOPLE TAB */}
            {activeTab === 'PEOPLE' && (
              <div className="space-y-6">
                <div className="flex items-center justify-between flex-wrap gap-3">
                  <div>
                    <h2 className="text-xl font-bold text-slate-900 dark:text-white">Employees &amp; Workforce Leave</h2>
                    <p className="text-xs text-slate-500">Track employee leave requests, date ranges, and view workforce employee profiles</p>
                  </div>
                </div>

                {/* 1. WORKFORCE LEAVE REQUESTS & APPROVAL STATUS TABLE (FIRST) */}
                <div className="bg-white dark:bg-slate-900 rounded-xl border p-5 space-y-4 shadow-xs">
                  <div className="flex items-center justify-between flex-wrap gap-3 border-b pb-3 dark:border-slate-800">
                    <div>
                      <h3 className="font-bold text-sm text-slate-900 dark:text-white flex items-center gap-2">
                        <Calendar className="text-orange-600" size={16} /> Workforce Leave Bookings &amp; Approval Status
                      </h3>
                      <p className="text-xs text-slate-500 mt-0.5">Track employee leave requests, date ranges, and HR approval statuses</p>
                    </div>
                    <button
                      onClick={() => {
                        setBookLeaveEmp(null);
                        setBookLeaveForm((prev) => ({
                          ...prev,
                          employee_id: filteredEmployees[0]?.id ? String(filteredEmployees[0].id) : '',
                          leave_type: 'ANNUAL',
                          start_date: new Date().toISOString().slice(0, 10),
                          end_date: new Date(Date.now() + 7 * 86400000).toISOString().slice(0, 10),
                          reason: '',
                        }));
                        setShowBookLeaveModal(true);
                      }}
                      className="px-3 py-1.5 bg-orange-600 hover:bg-orange-700 text-white text-xs font-bold rounded-lg transition flex items-center gap-1.5"
                    >
                      <Plus size={14} /> Book Leave for Employee
                    </button>
                  </div>

                  {leaveLoading ? (
                    <p className="text-xs text-slate-500 py-6 text-center">Loading workforce leave records...</p>
                  ) : leaveRequests.length === 0 ? (
                    <p className="text-xs text-slate-500 py-6 text-center">No leave requests recorded for this workforce scope.</p>
                  ) : (
                    <div>
                      <div className="overflow-x-auto">
                        <table className="w-full text-xs">
                          <thead className="bg-slate-50 dark:bg-slate-800/50 border-b dark:border-slate-800 text-slate-500">
                            <tr>
                              <th className="px-4 py-2.5 text-left font-bold uppercase">Employee</th>
                              <th className="px-4 py-2.5 text-left font-bold uppercase">Leave Type</th>
                              <th className="px-4 py-2.5 text-left font-bold uppercase">Start Date</th>
                              <th className="px-4 py-2.5 text-left font-bold uppercase">End Date</th>
                              <th className="px-4 py-2.5 text-left font-bold uppercase">Reason</th>
                              <th className="px-4 py-2.5 text-left font-bold uppercase">Approval Status</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y dark:divide-slate-800">
                            {leaveRequests.slice((filteredLeaveRequestsPage - 1) * 10, filteredLeaveRequestsPage * 10).map((req: any) => {
                              const empName = req.employee_name || req.employee?.full_name || (req.employee?.first_name ? `${req.employee.first_name} ${req.employee.last_name || ''}` : null) || 'Employee';
                              const status = String(req.status || 'PENDING').toUpperCase();
                              return (
                                <tr key={req.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30">
                                  <td className="px-4 py-3 font-semibold text-slate-900 dark:text-white">{empName}</td>
                                  <td className="px-4 py-3 font-medium">
                                    <span className="inline-flex px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-semibold text-[11px]">
                                      {String(req.leave_type || req.type || 'ANNUAL').replaceAll('_', ' ')}
                                    </span>
                                  </td>
                                  <td className="px-4 py-3 font-mono text-slate-600 dark:text-slate-400">{req.start_date ? String(req.start_date).slice(0, 10) : '-'}</td>
                                  <td className="px-4 py-3 font-mono text-slate-600 dark:text-slate-400">{req.end_date ? String(req.end_date).slice(0, 10) : '-'}</td>
                                  <td className="px-4 py-3 text-slate-600 dark:text-slate-400 max-w-xs truncate">{req.reason || 'Leave booking request'}</td>
                                  <td className="px-4 py-3">
                                    <StatusBadge status={status} />
                                    {status === 'APPROVED' && (
                                      <span className="block text-[10px] text-emerald-600 dark:text-emerald-400 font-bold mt-1">
                                        Approved: {req.approved_at ? new Date(req.approved_at).toLocaleDateString() : req.reviewed_at ? new Date(req.reviewed_at).toLocaleDateString() : req.updated_at ? new Date(req.updated_at).toLocaleDateString() : req.created_at ? new Date(req.created_at).toLocaleDateString() : 'Sep 11, 2026'}
                                      </span>
                                    )}
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>

                      {/* Pagination Controls */}
                      <div className="flex items-center justify-between mt-4 px-4 py-3 bg-slate-50 dark:bg-slate-800/50 border-t border-slate-200 dark:border-slate-800 rounded-b-xl">
                        <span className="text-xs text-slate-500 font-medium">
                          Showing {Math.min(1 + (filteredLeaveRequestsPage - 1) * 10, leaveRequests.length)} - {Math.min(filteredLeaveRequestsPage * 10, leaveRequests.length)} of {leaveRequests.length} leave requests
                        </span>
                        <div className="flex items-center gap-2">
                          <button 
                            onClick={() => setFilteredLeaveRequestsPage(p => Math.max(1, p - 1))} 
                            disabled={filteredLeaveRequestsPage === 1}
                            className="px-3 py-1.5 text-xs font-bold border border-slate-200 dark:border-slate-700 rounded-lg disabled:opacity-40 disabled:cursor-not-allowed hover:bg-white dark:hover:bg-slate-800 transition"
                          >
                            Prev
                          </button>
                          <span className="text-xs font-bold px-2">
                            Page {filteredLeaveRequestsPage} of {Math.max(1, Math.ceil(leaveRequests.length / 10))}
                          </span>
                          <button 
                            onClick={() => setFilteredLeaveRequestsPage(p => Math.min(Math.ceil(leaveRequests.length / 10), p + 1))} 
                            disabled={filteredLeaveRequestsPage >= Math.ceil(leaveRequests.length / 10)}
                            className="px-3 py-1.5 text-xs font-bold border border-slate-200 dark:border-slate-700 rounded-lg disabled:opacity-40 disabled:cursor-not-allowed hover:bg-white dark:hover:bg-slate-800 transition"
                          >
                            Next
                          </button>
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {/* 2. ASSIGNED EMPLOYEES DIRECTORY (SECOND) */}
                <div className="space-y-3 pt-2">
                  <h3 className="font-bold text-sm text-slate-900 dark:text-white flex items-center gap-2">
                    <Users className="text-orange-600" size={16} /> Assigned Employees Directory
                  </h3>
                  <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                    {filteredEmployees.length === 0 ? (
                      <p className="text-xs text-slate-500 col-span-full py-8 text-center">No assigned personnel found for this site scope.</p>
                    ) : (
                      filteredEmployees.map((emp: any) => (
                        <div key={emp.id} className="bg-white dark:bg-slate-900 rounded-xl border p-4 space-y-3 hover:shadow-sm transition">
                          <div className="flex items-center gap-3">
                            <div className="w-11 h-11 rounded-full bg-orange-100 dark:bg-orange-950 flex items-center justify-center font-extrabold text-orange-700 dark:text-orange-300 text-base">
                              {(emp.first_name?.[0] || '?')}{(emp.last_name?.[0] || '')}
                            </div>
                            <div className="min-w-0">
                              <h3 className="font-bold text-sm text-slate-900 dark:text-white truncate">{emp.first_name} {emp.last_name}</h3>
                              <p className="text-xs text-slate-500 truncate">{emp.job_title || emp.position_name || 'Staff'}</p>
                            </div>
                          </div>
                          <div className="flex items-center justify-between text-xs border-t pt-2">
                            <span className="text-slate-400">Status</span>
                            <StatusBadge status={emp.employment_status || 'ACTIVE'} />
                          </div>
                          {emp.contract_end_date && (
                            <div className="flex items-center justify-between text-xs text-slate-500">
                              <span>Contract End</span>
                              <span className="font-semibold text-slate-700 dark:text-slate-300">{String(emp.contract_end_date).slice(0, 10)}</span>
                            </div>
                          )}
                          <div className="flex gap-2 pt-1">
                            <button
                              onClick={() => setViewingEmployeeDetailId(String(emp.id))}
                              className="flex-1 text-center py-1.5 bg-orange-50 dark:bg-orange-950/60 hover:bg-orange-100 dark:hover:bg-orange-900/60 text-orange-800 dark:text-orange-300 border border-orange-200 dark:border-orange-800 text-xs font-bold rounded-lg transition truncate"
                            >
                              Profile & Docs
                            </button>
                            <button
                              onClick={() => {
                                setBookLeaveEmp(emp);
                                setBookLeaveForm((prev) => ({
                                  ...prev,
                                  employee_id: String(emp.id),
                                  leave_type: 'ANNUAL',
                                  start_date: new Date().toISOString().slice(0, 10),
                                  end_date: new Date(Date.now() + 7 * 86400000).toISOString().slice(0, 10),
                                  reason: '',
                                }));
                                setShowBookLeaveModal(true);
                              }}
                              className="flex items-center justify-center gap-1 py-1.5 px-3 bg-orange-600 hover:bg-orange-700 text-white text-xs font-bold rounded-lg transition truncate"
                            >
                              <Calendar size={13} /> Book Leave
                            </button>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* EXPENSES TAB */}
            {activeTab === 'PURCHASE_ORDERS' && (
              <FieldPurchaseOrdersPanel projectId={selectedProjectId} projectName={projects.find((project) => project.id === selectedProjectId)?.name} />
            )}
            {activeTab === 'EXPENSES' && (
              <div className="space-y-6">
                <div className="flex items-center justify-between flex-wrap gap-3">
                  <div>
                    <h2 className="text-xl font-bold text-slate-900 dark:text-white">Operational Expenses</h2>
                    <p className="text-xs text-slate-500">Record & categorise field operational expenditure</p>
                  </div>
                  <button
                    onClick={() => setShowExpenseModal(true)}
                    className="flex items-center gap-1.5 bg-orange-600 hover:bg-orange-700 text-white text-xs font-bold px-3.5 py-2 rounded-lg transition"
                  >
                    <Plus size={15} /> Submit Operational Expense Claim
                  </button>
                </div>

                {/* Expense KPI & Intelligence Summary Cards */}
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5">
                  <div className="bg-white dark:bg-slate-900 border rounded-xl p-4 space-y-1">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Total Expenditure</span>
                    <p className="text-xl font-black text-orange-600">
                      ${expenseIntelligenceMetrics.totalExp.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </p>
                    <span className="text-[11px] text-slate-500 font-medium">All recorded vouchers</span>
                  </div>

                  <div className="bg-white dark:bg-slate-900 border rounded-xl p-4 space-y-1">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Total Claims</span>
                    <p className="text-xl font-black text-slate-900 dark:text-white">
                      {expenseIntelligenceMetrics.count}
                    </p>
                    <span className="text-[11px] text-slate-500 font-medium">Operational Expense Claims</span>
                  </div>

                  <div className="bg-white dark:bg-slate-900 border rounded-xl p-4 space-y-1">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Average Claim Value</span>
                    <p className="text-xl font-black text-emerald-600">
                      ${expenseIntelligenceMetrics.avgClaim.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </p>
                    <span className="text-[11px] text-slate-500 font-medium">Mean expenditure per claim</span>
                  </div>

                  <div className="bg-white dark:bg-slate-900 border rounded-xl p-4 space-y-1">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Total Purchased Line Items</span>
                    <p className="text-xl font-black text-amber-600">
                      {expenseIntelligenceMetrics.totalItemsCount}
                    </p>
                    <span className="text-[11px] text-slate-500 font-medium">Purchased items count</span>
                  </div>
                </div>

                {/* 1. Operational Expenditure & Expense Trend Line Chart (FULL-WIDTH ROW FIRST) */}
                <div className="bg-white dark:bg-slate-900 rounded-xl border p-4 space-y-3">
                  <div className="flex items-center justify-between flex-wrap gap-2">
                    <div>
                      <h3 className="font-bold text-sm text-slate-900 dark:text-white flex items-center gap-2">
                        <TrendingUp size={16} className="text-orange-600" /> Operational Expenditure &amp; Expense Trend
                      </h3>
                      <p className="text-xs text-slate-500">Daily breakdown of total operational expenses ($) and approved expenditure</p>
                    </div>
                  </div>

                  {expenseTimeSeriesData.length === 0 ? (
                    <div className="h-44 flex items-center justify-center border border-dashed rounded-lg text-xs text-slate-500">
                      No daily expense trend data available for the selected range.
                    </div>
                  ) : (
                    <div className="h-64 w-full pt-2">
                      <ResponsiveContainer width="100%" height="100%">
                        <ComposedChart data={expenseTimeSeriesData} margin={{ top: 10, right: 20, left: 0, bottom: 5 }}>
                          <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                          <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                          <YAxis yAxisId="cost" orientation="left" stroke="#ea580c" tick={{ fontSize: 11 }} tickFormatter={(val) => `$${val}`} />
                          <Tooltip
                            contentStyle={{ backgroundColor: 'rgba(15, 23, 42, 0.9)', borderRadius: '8px', border: 'none', color: '#fff', fontSize: '12px' }}
                            formatter={(value: any, name: any) => [`$${Number(value || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}`, name]}
                          />
                          <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '8px' }} />
                          <Line yAxisId="cost" type="monotone" dataKey="totalCost" name="Total Operational Expenditure ($)" stroke="#ea580c" strokeWidth={2.5} dot={{ r: 4 }} />
                          <Line yAxisId="cost" type="monotone" dataKey="approvedCost" name="Approved Expenses ($)" stroke="#10b981" strokeWidth={2.5} dot={{ r: 4 }} />
                        </ComposedChart>
                      </ResponsiveContainer>
                    </div>
                  )}
                </div>

                {/* 2. Expense Purchasing Intelligence Bar Charts Grid (Collapsible, Collapsed by Default) */}
                <div className="mb-6 space-y-3">
                  <button
                    type="button"
                    onClick={() => setShowPurchasingCharts((prev) => !prev)}
                    className="w-full flex items-center justify-between p-3.5 bg-slate-50 dark:bg-slate-800/80 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 transition-colors text-left"
                  >
                    <div className="flex items-center gap-2.5">
                      <BarChart2 size={18} className="text-orange-600" />
                      <div>
                        <h3 className="font-bold text-sm text-slate-900 dark:text-white flex items-center gap-2">
                          Analytics &amp; Purchasing Intelligence Charts
                          <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-orange-100 text-orange-700 dark:bg-orange-950/60 dark:text-orange-300">
                            {showPurchasingCharts ? 'Expanded' : 'Collapsed'}
                          </span>
                        </h3>
                        <p className="text-xs text-slate-500 dark:text-slate-400">Click to {showPurchasingCharts ? 'hide' : 'view'} expenditure, frequency, category, and vendor bar graphs</p>
                      </div>
                    </div>
                    {showPurchasingCharts ? <ChevronUp size={18} className="text-slate-500" /> : <ChevronDown size={18} className="text-slate-500" />}
                  </button>

                  {showPurchasingCharts && (() => {
                    const renderFieldCostCard = (items: any[], titleText: string) => (
                      <div className="bg-white dark:bg-slate-900 rounded-xl border p-4 space-y-3">
                        <div className="flex items-center justify-between flex-wrap gap-2">
                          <div>
                            <h3 className="font-bold text-sm text-slate-900 dark:text-white flex items-center gap-2">
                              <DollarSign size={16} className="text-orange-600" /> {titleText}
                            </h3>
                            <p className="text-xs text-slate-500">Highest expenditure items and procurement cost drivers</p>
                          </div>
                        </div>
                        {items.length === 0 ? (
                          <div className="h-48 flex items-center justify-center border border-dashed rounded-lg text-xs text-slate-500">
                            No item cost data available for the selected range.
                          </div>
                        ) : (
                          <div className="h-72 w-full pt-2">
                            <ResponsiveContainer width="100%" height="100%">
                              <BarChart data={items} layout="vertical" margin={{ top: 5, right: 15, left: 5, bottom: 5 }}>
                                <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                                <XAxis type="number" tick={{ fontSize: 9 }} tickFormatter={(v) => `$${v}`} />
                                <YAxis
                                  type="category"
                                  dataKey="name"
                                  tick={{ fontSize: 10 }}
                                  width={110}
                                  tickFormatter={(v) => (String(v).length > 18 ? String(v).slice(0, 16) + '…' : String(v))}
                                />
                                <Tooltip
                                  contentStyle={{ backgroundColor: 'rgba(15, 23, 42, 0.9)', borderRadius: '8px', border: 'none', color: '#fff', fontSize: '12px' }}
                                  formatter={(val: any) => [`$${Number(val || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}`, 'Total Expenditure']}
                                />
                                <Bar dataKey="totalCost" name="Total Expenditure ($)" fill="#ea580c" radius={[0, 4, 4, 0]} />
                              </BarChart>
                            </ResponsiveContainer>
                          </div>
                        )}
                      </div>
                    );

                    const renderFieldFreqCard = (items: any[], titleText: string) => (
                      <div className="bg-white dark:bg-slate-900 rounded-xl border p-4 space-y-3">
                        <div className="flex items-center justify-between flex-wrap gap-2">
                          <div>
                            <h3 className="font-bold text-sm text-slate-900 dark:text-white flex items-center gap-2">
                              <Package size={16} className="text-blue-600" /> {titleText}
                            </h3>
                            <p className="text-xs text-slate-500">Top items by purchase order frequency &amp; volume count</p>
                          </div>
                        </div>
                        {items.length === 0 ? (
                          <div className="h-48 flex items-center justify-center border border-dashed rounded-lg text-xs text-slate-500">
                            No purchase frequency data available for the selected range.
                          </div>
                        ) : (
                          <div className="h-72 w-full pt-2">
                            <ResponsiveContainer width="100%" height="100%">
                              <BarChart data={items} layout="vertical" margin={{ top: 5, right: 15, left: 5, bottom: 5 }}>
                                <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                                <XAxis type="number" allowDecimals={false} tick={{ fontSize: 9 }} />
                                <YAxis
                                  type="category"
                                  dataKey="name"
                                  tick={{ fontSize: 10 }}
                                  width={110}
                                  tickFormatter={(v) => (String(v).length > 18 ? String(v).slice(0, 16) + '…' : String(v))}
                                />
                                <Tooltip
                                  contentStyle={{ backgroundColor: 'rgba(15, 23, 42, 0.9)', borderRadius: '8px', border: 'none', color: '#fff', fontSize: '12px' }}
                                  formatter={(val: any) => [`${val} Purchase Orders`, 'Frequency']}
                                />
                                <Bar dataKey="frequency" name="Purchase Orders" fill="#3b82f6" radius={[0, 4, 4, 0]} />
                              </BarChart>
                            </ResponsiveContainer>
                          </div>
                        )}
                      </div>
                    );

                    const renderFieldVendorCard = (items: any[], titleText: string) => (
                      <div className="bg-white dark:bg-slate-900 rounded-xl border p-4 space-y-3">
                        <div className="flex items-center justify-between flex-wrap gap-2">
                          <div>
                            <h3 className="font-bold text-sm text-slate-900 dark:text-white flex items-center gap-2">
                              <Building2 size={16} className="text-purple-600" /> {titleText}
                            </h3>
                            <p className="text-xs text-slate-500">Highest operational expenditure paid out by vendor</p>
                          </div>
                        </div>
                        {items.length === 0 ? (
                          <div className="h-48 flex items-center justify-center border border-dashed rounded-lg text-xs text-slate-500">
                            No vendor expenditure data available for the selected range.
                          </div>
                        ) : (
                          <div className="h-72 w-full pt-2">
                            <ResponsiveContainer width="100%" height="100%">
                              <BarChart data={items} layout="vertical" margin={{ top: 5, right: 15, left: 5, bottom: 5 }}>
                                <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                                <XAxis type="number" tick={{ fontSize: 9 }} tickFormatter={(v) => `$${v}`} />
                                <YAxis
                                  type="category"
                                  dataKey="vendor"
                                  tick={{ fontSize: 10 }}
                                  width={110}
                                  tickFormatter={(v) => (String(v).length > 18 ? String(v).slice(0, 16) + '…' : String(v))}
                                />
                                <Tooltip
                                  contentStyle={{ backgroundColor: 'rgba(15, 23, 42, 0.9)', borderRadius: '8px', border: 'none', color: '#fff', fontSize: '12px' }}
                                  formatter={(val: any) => [`$${Number(val || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}`, 'Paid Out']}
                                />
                                <Bar dataKey="totalCost" name="Total Expenditure ($)" fill="#a855f7" radius={[0, 4, 4, 0]} />
                              </BarChart>
                            </ResponsiveContainer>
                          </div>
                        )}
                      </div>
                    );

                    return (
                      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mt-3">
                        {/* Chart 1: Top Purchased Items by Total Cost ($) */}
                        {renderFieldCostCard(topItemsByCostData, "Top Purchased Items by Cost ($)")}

                        {/* Chart 2: Most Frequently Purchased Items */}
                        {renderFieldFreqCard(topItemsByFrequencyData, "Most Frequently Purchased")}

                        {/* Chart 3: Purchase orders by category */}
                        <PurchaseOrderCategoryChart orders={operationalExpenseRequests?.length ? operationalExpenseRequests : expenses} color="#ea580c" />

                        {/* Chart 4: Top Vendor / Payee Expenditure Breakdown */}
                        {renderFieldVendorCard(topVendorData, "Vendor Expenditure ($)")}
                      </div>
                    );
                  })()}
                </div>

                {/* FIRST TABLE: Submitted Expenses & Finance Status */}
                <div className="bg-white dark:bg-slate-900 rounded-xl border p-4 space-y-3">
                  <div className="flex items-center justify-between flex-wrap gap-2">
                    <div>
                      <h3 className="font-bold text-sm text-slate-900 dark:text-white flex items-center gap-2">
                        <DollarSign className="text-orange-600" size={16} /> Submitted Expenses &amp; Finance Status
                      </h3>
                      <p className="text-xs text-slate-500">View, audit, edit and track operational expense claims submitted to Finance</p>
                    </div>
                  </div>

                  {filteredOperationalExpenseRequests.length === 0 ? (
                    <p className="py-8 text-center text-xs text-slate-500">No operational expense submissions yet for this date range.</p>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full text-xs text-left border-collapse">
                        <thead>
                          <tr className="border-b bg-slate-50 dark:bg-slate-800/50 text-slate-500">
                            <th className="p-2.5 font-bold">Expense #</th>
                            <th className="p-2.5 font-bold">Pay To / Vendor</th>
                            <th className="p-2.5 font-bold">Date</th>
                            <th className="p-2.5 text-right font-bold">Total Cost ($)</th>
                            <th className="p-2.5 text-right font-bold">Paid / Balance</th>
                            <th className="p-2.5 font-bold">Status</th>
                            <th className="p-2.5 font-bold">Receipt Docket File</th>
                            <th className="p-2.5 text-right font-bold">Actions</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y">
                          {filteredOperationalExpenseRequests.slice((filteredOperationalExpenseRequestsPage - 1) * 15, filteredOperationalExpenseRequestsPage * 15).map((expense: any) => {
                            const receiptFile = expense.invoice_name || expense.receipt_name || expense.receipt_file_name || expense.attachment || null;

                            return (
                              <tr key={expense.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30">
                                <td className="p-2.5 font-mono font-bold text-slate-900 dark:text-white">
                                  {expense.expense_number || `EXP-${String(expense.id).slice(0, 6)}`}
                                </td>
                                <td className="p-2.5 font-medium">{expense.pay_to_name || '—'}</td>
                                <td className="p-2.5">{expense.expense_date || expense.created_at?.slice(0, 10) || '—'}</td>
                                <td className="p-2.5 text-right font-black text-emerald-600">
                                  ${Number(expense.total_cost || expense.amount || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                </td>
                                <td className="p-2.5 text-right">
                                  <div className="whitespace-nowrap font-semibold text-blue-700">Paid: ${Number(expense.paid_amount || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
                                  <div className="whitespace-nowrap text-[10px] text-slate-500">Balance: ${Number(expense.balance_due ?? Math.max(0, Number(expense.total_cost || expense.amount || 0) - Number(expense.paid_amount || 0))).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
                                  {Array.isArray(expense.payments) && expense.payments.length > 0 && <div className="text-[10px] text-slate-500">{expense.payments.length} installment{expense.payments.length === 1 ? '' : 's'}</div>}
                                </td>
                                <td className="p-2.5">
                                  <StatusBadge status={expense.status || 'SUBMITTED'} />
                                </td>
                                <td className="p-2.5">
                                  {receiptFile ? (
                                    <button
                                      type="button"
                                      onClick={async () => {
                                        const kind = expense.invoice_name || expense.invoice_path ? 'invoice' : 'receipt';
                                        const fileUrl = `/api/v1/operational-expenses/${expense.id}/files/${kind}`;
                                        try {
                                          const blob = await apiFetchBlob(fileUrl);
                                          openUniversalFileViewer({ blob, fileName: receiptFile, title: `Receipt Docket: ${receiptFile}` });
                                        } catch (err: any) {
                                          setBanner({ type: 'error', message: err?.message || 'Failed to open receipt file. Check user permissions.' });
                                        }
                                      }}
                                      className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-orange-50 dark:bg-orange-950/40 hover:bg-orange-100 dark:hover:bg-orange-900/60 border border-orange-200 dark:border-orange-800 rounded-md text-orange-800 dark:text-orange-300 font-mono text-[11px] max-w-[200px] truncate transition cursor-pointer font-bold underline"
                                      title={`Click to view docket file: ${receiptFile}`}
                                    >
                                      <Paperclip size={12} className="shrink-0 text-orange-600" />
                                      <span className="truncate">{receiptFile}</span>
                                    </button>
                                  ) : (
                                    <span className="text-slate-400 italic">No file attached</span>
                                  )}
                                </td>
                                <td className="p-2.5 text-right space-x-1.5 whitespace-nowrap">
                                  <button
                                    type="button"
                                    onClick={() => setViewingExpense(expense)}
                                    className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 rounded font-semibold text-[11px] inline-flex items-center gap-1 transition"
                                  >
                                    <FileText size={12} /> View Details
                                  </button>
                                  <button
                                    type="button"
                                    disabled={Boolean(expense.paid_at) || ['PAID', 'COMPLETED'].includes(String(expense.status || '').toUpperCase())}
                                    onClick={() => {
                                      setEditingExpense(expense);
                                      setEditExpenseForm({
                                        pay_to_name: expense.pay_to_name || '',
                                        expense_date: expense.expense_date || new Date().toISOString().slice(0, 10),
                                        total_cost: String(expense.total_cost || expense.amount || ''),
                                        payment_method: expense.payment_method || 'MOBILE_MONEY',
                                        notes: expense.notes || '',
                                      });
                                      setEditExpenseReceiptFile(null);
                                      setShowEditExpenseModal(true);
                                    }}
                                    title={expense.paid_at || ['PAID', 'COMPLETED'].includes(String(expense.status || '').toUpperCase()) ? 'Paid expenses cannot be edited' : 'Edit expense'}
                                    className="px-2.5 py-1 bg-orange-50 hover:bg-orange-100 dark:bg-orange-950/50 dark:hover:bg-orange-900/60 text-orange-700 dark:text-orange-300 rounded font-semibold text-[11px] inline-flex items-center gap-1 transition disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-orange-50"
                                  >
                                    <Pencil size={12} /> Edit
                                  </button>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
              <div className="flex items-center justify-between mt-4 px-4 py-3 bg-slate-50 dark:bg-slate-800/50 border-t border-slate-200 dark:border-slate-800 rounded-b-2xl">
                <span className="text-xs text-slate-500 font-medium">
                  Showing {Math.min(1 + (filteredOperationalExpenseRequestsPage - 1) * 15, filteredOperationalExpenseRequests.length)} - {Math.min(filteredOperationalExpenseRequestsPage * 15, filteredOperationalExpenseRequests.length)} of {filteredOperationalExpenseRequests.length} records
                </span>
                <div className="flex items-center gap-2">
                  <button 
                    onClick={() => setFilteredOperationalExpenseRequestsPage(p => Math.max(1, p - 1))} 
                    disabled={filteredOperationalExpenseRequestsPage === 1}
                    className="px-3 py-1.5 text-xs font-bold border border-slate-200 dark:border-slate-700 rounded-lg disabled:opacity-40 disabled:cursor-not-allowed hover:bg-white dark:hover:bg-slate-800 transition"
                  >
                    Prev
                  </button>
                  <span className="text-xs font-bold px-2">
                    Page {filteredOperationalExpenseRequestsPage} of {Math.max(1, Math.ceil(filteredOperationalExpenseRequests.length / 15))}
                  </span>
                  <button 
                    onClick={() => setFilteredOperationalExpenseRequestsPage(p => Math.min(Math.ceil(filteredOperationalExpenseRequests.length / 15), p + 1))} 
                    disabled={filteredOperationalExpenseRequestsPage >= Math.ceil(filteredOperationalExpenseRequests.length / 15)}
                    className="px-3 py-1.5 text-xs font-bold border border-slate-200 dark:border-slate-700 rounded-lg disabled:opacity-40 disabled:cursor-not-allowed hover:bg-white dark:hover:bg-slate-800 transition"
                  >
                    Next
                  </button>
                </div>
              </div>

                    </div>
                  )}
                </div>

                {/* SECOND TABLE: Site Operational Cost Subledger Log */}
                <div className="bg-white dark:bg-slate-900 rounded-xl border p-4 space-y-3">
                  <h3 className="font-bold text-sm text-slate-900 dark:text-white">Site Operational Cost Subledger Log</h3>
                  {filteredExpenses.length === 0 ? (
                    <p className="text-xs text-slate-500 py-8 text-center">No cost subledger entries logged for this site scope.</p>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full text-xs text-left border-collapse">
                        <thead>
                          <tr className="border-b bg-slate-50 dark:bg-slate-800/50 text-slate-500">
                            <th className="p-2.5 font-bold">Date</th>
                            <th className="p-2.5 font-bold">Category</th>
                            <th className="p-2.5 font-bold">Description</th>
                            <th className="p-2.5 text-right font-bold">Amount</th>
                            <th className="p-2.5 font-bold">Ref #</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y">
                          {filteredExpenses.slice((filteredExpensesPage - 1) * 15, filteredExpensesPage * 15).map((c: any) => (
                            <tr key={c.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30">
                              <td className="p-2.5 font-medium">{c.posted_at ? new Date(c.posted_at).toLocaleDateString() : c.entry_date || c.created_at?.slice(0, 10) || '—'}</td>
                              <td className="p-2.5 font-mono font-bold text-orange-600">{c.cost_category || 'OPERATIONAL'}</td>
                              <td className="p-2.5">{c.description || '—'}</td>
                              <td className="p-2.5 text-right font-bold text-emerald-600">{c.currency || 'USD'} {Number(c.total_cost ?? c.amount ?? 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                              <td className="p-2.5 font-mono text-slate-400" title={String(c.source_entity_id || c.id || '')}>{c.reference_number || (c.source_entity_id || c.id ? String(c.source_entity_id || c.id).slice(0, 8).toUpperCase() : '—')}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
              <div className="flex items-center justify-between mt-4 px-4 py-3 bg-slate-50 dark:bg-slate-800/50 border-t border-slate-200 dark:border-slate-800 rounded-b-2xl">
                <span className="text-xs text-slate-500 font-medium">
                  Showing {Math.min(1 + (filteredExpensesPage - 1) * 15, filteredExpenses.length)} - {Math.min(filteredExpensesPage * 15, filteredExpenses.length)} of {filteredExpenses.length} records
                </span>
                <div className="flex items-center gap-2">
                  <button 
                    onClick={() => setFilteredExpensesPage(p => Math.max(1, p - 1))} 
                    disabled={filteredExpensesPage === 1}
                    className="px-3 py-1.5 text-xs font-bold border border-slate-200 dark:border-slate-700 rounded-lg disabled:opacity-40 disabled:cursor-not-allowed hover:bg-white dark:hover:bg-slate-800 transition"
                  >
                    Prev
                  </button>
                  <span className="text-xs font-bold px-2">
                    Page {filteredExpensesPage} of {Math.max(1, Math.ceil(filteredExpenses.length / 15))}
                  </span>
                  <button 
                    onClick={() => setFilteredExpensesPage(p => Math.min(Math.ceil(filteredExpenses.length / 15), p + 1))} 
                    disabled={filteredExpensesPage >= Math.ceil(filteredExpenses.length / 15)}
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
            )}

            {/* HSE TAB */}
            {activeTab === 'HSE' && (
              <div className="space-y-6">
                <div className="flex items-center justify-between flex-wrap gap-3">
                  <div>
                    <h2 className="text-xl font-bold text-slate-900 dark:text-white">HSE Incidents &amp; Safety Analytics</h2>
                    <p className="text-xs text-slate-500">Report &amp; track health, safety &amp; environmental incidents, hazards and near-miss trends</p>
                  </div>
                  <button
                    onClick={() => setShowHseModal(true)}
                    className="flex items-center gap-1.5 bg-red-600 hover:bg-red-700 text-white text-xs font-bold px-3.5 py-2 rounded-lg transition shadow-sm"
                  >
                    <Plus size={15} /> Log HSE Incident
                  </button>
                </div>

                {/* HSE KPI Analytics Summary Cards */}
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5">
                  <div className="bg-white dark:bg-slate-900 border rounded-xl p-4 space-y-1">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Total Safety Incidents</span>
                    <p className="text-xl font-black text-slate-900 dark:text-white">
                      {filteredIncidents.length}
                    </p>
                    <span className="text-[11px] text-slate-500 font-medium">Logged in date range</span>
                  </div>

                  <div className="bg-white dark:bg-slate-900 border rounded-xl p-4 space-y-1">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Critical / High Severity</span>
                    <p className="text-xl font-black text-red-600">
                      {filteredIncidents.filter((i) => ['CRITICAL', 'HIGH'].includes(String(i.severity || '').toUpperCase())).length}
                    </p>
                    <span className="text-[11px] text-slate-500 font-medium">High-risk safety events</span>
                  </div>

                  <div className="bg-white dark:bg-slate-900 border rounded-xl p-4 space-y-1">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Near Misses &amp; Hazards</span>
                    <p className="text-xl font-black text-amber-600">
                      {filteredIncidents.filter((i) => ['NEAR_MISS', 'HAZARD_OBSERVATION', 'HAZARD'].includes(String(i.incident_type || '').toUpperCase())).length}
                    </p>
                    <span className="text-[11px] text-slate-500 font-medium">Proactive hazard logs</span>
                  </div>

                  <div className="bg-white dark:bg-slate-900 border rounded-xl p-4 space-y-1">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Environmental &amp; Property</span>
                    <p className="text-xl font-black text-blue-600">
                      {filteredIncidents.filter((i) => ['ENVIRONMENTAL_SPILL', 'PROPERTY_DAMAGE', 'ENVIRONMENTAL'].includes(String(i.incident_type || '').toUpperCase())).length}
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

                    {filteredIncidents.length === 0 ? (
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

                  {filteredIncidents.length === 0 ? (
                    <p className="text-xs text-slate-500 py-12 text-center">No safety incidents reported for this site scope.</p>
                  ) : (
                    <div className="overflow-x-auto">
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
                          {filteredIncidents.slice((filteredIncidentsPage - 1) * 15, filteredIncidentsPage * 15).map((inc: any) => (
                            <tr key={inc.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30">
                              <td className="p-2.5 font-medium whitespace-nowrap">
                                {inc.incident_date ? new Date(inc.incident_date).toLocaleString() : inc.created_at?.slice(0, 10) || '—'}
                              </td>
                              <td className="p-2.5 font-bold text-slate-900 dark:text-white max-w-[220px] truncate">
                                {inc.title || 'Safety Incident'}
                              </td>
                              <td className="p-2.5">
                                <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                                  {inc.incident_type || 'HAZARD'}
                                </span>
                              </td>
                              <td className="p-2.5">
                                <StatusBadge status={inc.severity || 'MEDIUM'} />
                              </td>
                              <td className="p-2.5 text-slate-600 dark:text-slate-400 max-w-[180px] truncate">
                                {inc.location || projectSites.find((s) => String(s.id) === String(inc.site_location_id))?.name || 'Site Field Area'}
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
              <div className="flex items-center justify-between mt-4 px-4 py-3 bg-slate-50 dark:bg-slate-800/50 border-t border-slate-200 dark:border-slate-800 rounded-b-2xl">
                <span className="text-xs text-slate-500 font-medium">
                  Showing {Math.min(1 + (filteredIncidentsPage - 1) * 15, filteredIncidents.length)} - {Math.min(filteredIncidentsPage * 15, filteredIncidents.length)} of {filteredIncidents.length} records
                </span>
                <div className="flex items-center gap-2">
                  <button 
                    onClick={() => setFilteredIncidentsPage(p => Math.max(1, p - 1))} 
                    disabled={filteredIncidentsPage === 1}
                    className="px-3 py-1.5 text-xs font-bold border border-slate-200 dark:border-slate-700 rounded-lg disabled:opacity-40 disabled:cursor-not-allowed hover:bg-white dark:hover:bg-slate-800 transition"
                  >
                    Prev
                  </button>
                  <span className="text-xs font-bold px-2">
                    Page {filteredIncidentsPage} of {Math.max(1, Math.ceil(filteredIncidents.length / 15))}
                  </span>
                  <button 
                    onClick={() => setFilteredIncidentsPage(p => Math.min(Math.ceil(filteredIncidents.length / 15), p + 1))} 
                    disabled={filteredIncidentsPage >= Math.ceil(filteredIncidents.length / 15)}
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
            )}

            {/* NOTIFICATIONS TAB */}
            {activeTab === 'NOTIFICATIONS' && (
              <div className="space-y-6">
                {downloadRequests.length > 0 && (
                  <div className="bg-white dark:bg-slate-900 rounded-xl border p-4 space-y-3">
                    <h3 className="font-bold text-sm text-slate-900 dark:text-white flex items-center gap-2">
                      <Download className="text-orange-600" size={16} /> HR Document Access Requests Status
                    </h3>
                    <div className="divide-y border rounded-lg overflow-hidden">
                      {downloadRequests.map((req: any) => (
                        <div key={req.id} className="p-3 flex items-center justify-between gap-3 bg-slate-50/50 dark:bg-slate-800/30 text-xs">
                          <div>
                            <span className="text-[10px] font-bold uppercase tracking-wider text-orange-600">Document Download Request</span>
                            <p className="font-semibold text-slate-900 dark:text-white mt-0.5">
                              Request for "{req.document_title || 'Document'}" ({req.employee_name})
                            </p>
                            {req.review_notes && <p className="text-slate-500 italic mt-0.5">HR Note: "{req.review_notes}"</p>}
                          </div>
                          <StatusBadge status={req.status} />
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                <NotificationWorkspace fieldPortal={true} hideSchedules={true} />
              </div>
            )}

            {/* MY PROFILE TAB */}
            </>
        )}
      
      {/* BOOK LEAVE MODAL */}
      {showBookLeaveModal && (
        <div className="fixed inset-0 bg-slate-950/70 z-[9999] flex items-center justify-center p-4 overflow-hidden">
          <div className="bg-white dark:bg-slate-900 w-full max-w-lg border rounded-2xl shadow-2xl flex flex-col overflow-hidden">
            <div className="flex items-center justify-between border-b px-6 py-4 bg-white dark:bg-slate-900">
              <h3 className="font-bold text-base text-slate-900 dark:text-white flex items-center gap-2">
                <Calendar className="text-orange-600" size={20} /> Book Leave for Employee
              </h3>
              <button
                type="button"
                onClick={() => setShowBookLeaveModal(false)}
                className="p-1.5 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 hover:text-slate-900 dark:hover:text-white transition"
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleBookLeaveSubmit} className="p-6 space-y-4 text-xs">
              <div>
                <label className="block font-bold mb-1">Select Employee *</label>
                <SearchableSelect
                  required
                  value={bookLeaveForm.employee_id}
                  onChange={(val) => setBookLeaveForm({ ...bookLeaveForm, employee_id: val })}
                  options={employees.map((emp: any) => ({
                    value: String(emp.id),
                    label: [emp.first_name, emp.last_name].filter(Boolean).join(' ') || emp.name || String(emp.id),
                    sublabel: emp.job_title || emp.employee_number || emp.department || 'Staff',
                  }))}
                  placeholder="-- Search or Choose Employee --"
                />
              </div>

              <div>
                <label className="block font-bold mb-1">Leave Category / Type *</label>
                <select
                  required
                  value={bookLeaveForm.leave_type}
                  onChange={(e) => setBookLeaveForm({ ...bookLeaveForm, leave_type: e.target.value })}
                  className="w-full border rounded-xl p-2.5 bg-slate-50 dark:bg-slate-800 font-medium text-xs focus:ring-2 focus:ring-orange-500 focus:outline-none"
                >
                  <option value="ANNUAL">Annual Leave</option>
                  <option value="SICK">Sick Leave</option>
                  <option value="EMERGENCY">Emergency Leave</option>
                  <option value="MATERNITY">Maternity / Paternity Leave</option>
                  <option value="UNPAID">Unpaid Leave</option>
                  <option value="STUDY">Study / Training Leave</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold mb-1">Start Date *</label>
                  <input
                    type="date"
                    required
                    value={bookLeaveForm.start_date}
                    onChange={(e) => setBookLeaveForm({ ...bookLeaveForm, start_date: e.target.value })}
                    className="w-full border rounded-xl p-2.5 bg-slate-50 dark:bg-slate-800 font-medium text-xs focus:ring-2 focus:ring-orange-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block font-bold mb-1">End Date *</label>
                  <input
                    type="date"
                    required
                    value={bookLeaveForm.end_date}
                    onChange={(e) => setBookLeaveForm({ ...bookLeaveForm, end_date: e.target.value })}
                    className="w-full border rounded-xl p-2.5 bg-slate-50 dark:bg-slate-800 font-medium text-xs focus:ring-2 focus:ring-orange-500 focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold mb-1">Reason / Leave Details *</label>
                <textarea
                  rows={3}
                  required
                  placeholder="State the reason or details for this leave request..."
                  value={bookLeaveForm.reason}
                  onChange={(e) => setBookLeaveForm({ ...bookLeaveForm, reason: e.target.value })}
                  className="w-full border rounded-xl p-2.5 bg-slate-50 dark:bg-slate-800 font-medium text-xs focus:ring-2 focus:ring-orange-500 focus:outline-none"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowBookLeaveModal(false)}
                  className="px-4 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-800 dark:text-slate-200 font-bold rounded-xl text-xs transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={bookLeaveSubmitting}
                  className="px-5 py-2 bg-orange-600 hover:bg-orange-700 text-white font-bold rounded-xl text-xs transition flex items-center gap-1.5 shadow-sm disabled:opacity-50"
                >
                  {bookLeaveSubmitting ? <RefreshCw className="animate-spin h-3.5 w-3.5" /> : <Calendar size={14} />}
                  Submit Leave Request
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </main>

      {/* ─── ENLARGED MODALS (MATCHING FIELD PORTAL FORM DESIGN & FIELDS) ─────────────────────────────── */}

      {/* 1. Log Fuel Delivery Purchased Modal (ENLARGED & MATCHING FIELD PORTAL FIELDS) */}
      {showFuelBoughtModal && (
        <div className="fixed inset-0 bg-slate-950/70 z-[9999] flex items-center justify-center p-0 sm:p-4 overflow-hidden">
          <div className="bg-white dark:bg-slate-900 w-full h-full sm:h-auto sm:max-h-[90vh] max-w-full sm:max-w-2xl border-0 sm:border rounded-none sm:rounded-2xl shadow-2xl flex flex-col overflow-hidden">
            <div className="flex items-center justify-between border-b px-4 py-3.5 sm:px-6 sm:py-4 bg-white dark:bg-slate-900 shrink-0 sticky top-0 z-10">
              <h3 className="font-bold text-base text-slate-900 dark:text-white flex items-center gap-2">
                <Fuel className="text-orange-600" size={20} /> Log Equipment Fuel Refill & Delivery Receipt
              </h3>
              <button type="button" onClick={() => setShowFuelBoughtModal(false)} className="p-1.5 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 hover:text-slate-900 dark:hover:text-white transition"><X size={20} /></button>
            </div>

            <form onSubmit={handleCreateFuelBought} className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4 text-xs">
              {/* SECTION 1: SITE & FUEL TYPE */}
              <div className="p-3.5 border rounded-xl bg-orange-50/40 dark:bg-orange-950/20 border-orange-200 dark:border-orange-900 space-y-3">
                <h4 className="font-bold text-xs uppercase tracking-wider text-orange-900 dark:text-orange-300 flex items-center gap-1.5 border-b pb-1.5">
                  <Fuel size={14} className="text-orange-600" /> Target Site & Fuel Grade
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block font-bold mb-1">Project Site *</label>
                    <select
                      required
                      value={fuelBoughtForm.site_location_id}
                      onChange={(e) => {
                        const site = projectSites.find((row) => String(row.id) === e.target.value);
                        setFuelBoughtForm({ ...fuelBoughtForm, site_location_id: e.target.value, project_id: site?.project_id || selectedProjectId });
                      }}
                      className="w-full p-2.5 border rounded-lg bg-background font-medium"
                    >
                      <option value="">-- Select Project Site --</option>
                      {projectSites.filter((site) => String(site.project_id) === (fuelBoughtForm.project_id || selectedProjectId)).map((site) => (
                        <option key={site.id} value={site.id}>{site.name}{site.project_name ? ` | ${site.project_name}` : ''}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block font-bold mb-1">Fuel Grade / Type *</label>
                    <select
                      value={fuelBoughtForm.fuel_type}
                      onChange={(e) => setFuelBoughtForm({ ...fuelBoughtForm, fuel_type: e.target.value })}
                      className="w-full p-2.5 border rounded-lg bg-background font-bold"
                    >
                      <option value="DIESEL">Low-Sulfur Diesel (AGO)</option>
                      <option value="PETROL">Super Unleaded Gasoline (PMS)</option>
                      <option value="OTHER">Other / Specialty Fuel</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* SECTION 2: VOLUME & COST (WITH AUTO-CALCULATION) */}
              <div className="p-3.5 border rounded-xl bg-slate-50/50 dark:bg-slate-800/30 space-y-3">
                <h4 className="font-bold text-xs uppercase tracking-wider text-slate-800 dark:text-slate-200 flex items-center gap-1.5 border-b pb-1.5">
                  <DollarSign size={14} className="text-emerald-600" /> Refueling Volume & Cost Calculation
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block font-bold mb-0.5">Refueled Quantity (Litres) *</label>
                    <span className="block text-[10px] text-slate-400 mb-1">Volume delivered</span>
                    <input
                      type="number"
                      min="1"
                      step="0.5"
                      required
                      placeholder="e.g. 5000"
                      value={fuelBoughtForm.quantity_litres}
                      onChange={(e) => {
                        const liters = Number(e.target.value);
                        const unitP = Number(fuelBoughtForm.unit_cost) || 1.5;
                        const calculatedCost = Number((liters * unitP).toFixed(2));
                        setFuelBoughtForm({
                          ...fuelBoughtForm,
                          quantity_litres: e.target.value,
                          total_cost: String(calculatedCost),
                        });
                      }}
                      className="w-full p-2.5 border rounded-lg bg-background font-mono font-bold text-sm"
                    />
                  </div>

                  <div>
                    <label className="block font-bold mb-0.5">Total Refuel Cost ($) *</label>
                    <span className="block text-[10px] text-slate-400 mb-1">Total invoice receipt</span>
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      required
                      placeholder="e.g. 7500"
                      value={fuelBoughtForm.total_cost}
                      onChange={(e) => {
                        const cost = Number(e.target.value);
                        const liters = Number(fuelBoughtForm.quantity_litres) || 1;
                        const calculatedUnitCost = liters > 0 ? Number((cost / liters).toFixed(3)) : 0;
                        setFuelBoughtForm({
                          ...fuelBoughtForm,
                          total_cost: e.target.value,
                          unit_cost: String(calculatedUnitCost),
                        });
                      }}
                      className="w-full p-2.5 border rounded-lg bg-background font-mono font-bold text-sm text-emerald-600"
                    />
                  </div>

                  <div>
                    <label className="block font-bold mb-0.5 flex items-center justify-between">
                      <span>Unit Cost ($/Litre)</span>
                      <span className="text-[10px] text-orange-600 font-normal">Auto-calc</span>
                    </label>
                    <span className="block text-[10px] text-slate-400 mb-1">Total ÷ Quantity</span>
                    <input
                      type="number"
                      step="0.001"
                      min="0"
                      placeholder="1.50"
                      value={fuelBoughtForm.unit_cost}
                      onChange={(e) => {
                        const unitP = Number(e.target.value);
                        const liters = Number(fuelBoughtForm.quantity_litres) || 0;
                        setFuelBoughtForm({
                          ...fuelBoughtForm,
                          unit_cost: e.target.value,
                          total_cost: String(Number((liters * unitP).toFixed(2))),
                        });
                      }}
                      className="w-full p-2.5 border rounded-lg bg-background font-mono font-bold"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3 pt-1">
                  <div>
                    <label className="block font-bold mb-1">Currency</label>
                    <select
                      value={fuelBoughtForm.currency}
                      onChange={(e) => setFuelBoughtForm({ ...fuelBoughtForm, currency: e.target.value })}
                      className="w-full p-2.5 border rounded-lg bg-background font-bold"
                    >
                      <option value="USD">USD ($ - United States Dollar)</option>
                      <option value="LRD">LRD ($ - Liberian Dollar)</option>
                      <option value="EUR">EUR (€ - Euro)</option>
                    </select>
                  </div>
                  <div>
                    <label className="block font-bold mb-1">Refueling Date & Time</label>
                    <input
                      type="datetime-local"
                      value={fuelBoughtForm.recorded_at}
                      onChange={(e) => setFuelBoughtForm({ ...fuelBoughtForm, recorded_at: e.target.value })}
                      className="w-full p-2.5 border rounded-lg bg-background font-mono"
                    />
                  </div>
                </div>
              </div>

              {/* SECTION 3: SUPPLIER VENDOR & RECEIPT DOCKET */}
              <div className="p-3.5 border rounded-xl bg-slate-50/50 dark:bg-slate-800/30 space-y-3">
                <h4 className="font-bold text-xs uppercase tracking-wider text-slate-800 dark:text-slate-200 flex items-center gap-1.5 border-b pb-1.5">
                  <Activity size={14} className="text-orange-600" /> Supplier & Ticket Info
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block font-bold mb-1">Supplier / Depot Vendor</label>
                    <input
                      type="text"
                      placeholder="TotalEnergies / Central Depot"
                      value={fuelBoughtForm.supplier}
                      onChange={(e) => setFuelBoughtForm({ ...fuelBoughtForm, supplier: e.target.value })}
                      className="w-full p-2.5 border rounded-lg bg-background"
                    />
                  </div>
                  <div>
                    <label className="block font-bold mb-1">Receipt / Ticket Ref #</label>
                    <input
                      type="text"
                      placeholder="e.g. REC-99201"
                      value={fuelBoughtForm.reference_number}
                      onChange={(e) => setFuelBoughtForm({ ...fuelBoughtForm, reference_number: e.target.value })}
                      className="w-full p-2.5 border rounded-lg bg-background font-mono"
                    />
                  </div>
                </div>

                {/* File Upload Attachment */}
                <div className="border border-dashed rounded-xl p-3 bg-background space-y-2">
                  <label className="block font-bold text-xs flex items-center justify-between">
                    <span>Attach Fuel Receipt Docket / Delivery Note</span>
                    <Upload size={14} className="text-orange-600" />
                  </label>
                  <div className="flex items-center gap-3">
                    <label className="cursor-pointer px-3 py-2 bg-orange-600 hover:bg-orange-700 text-white font-bold rounded-lg text-xs flex items-center gap-1.5 transition">
                      <Paperclip size={14} /> Attach File...
                      <input
                        type="file"
                        accept="image/*,application/pdf"
                        className="hidden"
                        onChange={(e) => {
                          if (e.target.files && e.target.files[0]) {
                            setFuelReceiptFile(e.target.files[0]);
                          }
                        }}
                      />
                    </label>
                    {fuelReceiptFile ? (
                      <span className="text-xs font-mono font-bold text-orange-600">
                        {fuelReceiptFile.name} ({(fuelReceiptFile.size / 1024).toFixed(1)} KB)
                      </span>
                    ) : (
                      <span className="text-[11px] text-slate-400">No ticket file attached</span>
                    )}
                  </div>
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t">
                <button type="button" onClick={() => setShowFuelBoughtModal(false)} className="px-4 py-2 border rounded-lg font-semibold">Cancel</button>
                <button type="submit" disabled={busySubmit} className="px-5 py-2 bg-orange-600 text-white font-bold rounded-lg hover:bg-orange-700 transition">
                  {busySubmit ? 'Saving...' : 'Log Fuel Purchase'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 2. Allocate Fuel to Asset Modal (ENLARGED & RICH FORM) */}
      {showFuelAllocModal && (
        <div className="fixed inset-0 bg-slate-950/70 z-[9999] flex items-center justify-center p-0 sm:p-4 overflow-hidden">
          <div className="bg-white dark:bg-slate-900 w-full h-full sm:h-auto sm:max-h-[90vh] max-w-full sm:max-w-xl border-0 sm:border rounded-none sm:rounded-2xl shadow-2xl flex flex-col overflow-hidden">
            <div className="flex items-center justify-between border-b px-4 py-3.5 sm:px-6 sm:py-4 bg-white dark:bg-slate-900 shrink-0 sticky top-0 z-10">
              <h3 className="font-bold text-base text-slate-900 dark:text-white flex items-center gap-2">
                <Truck className="text-orange-600" size={20} /> Allocate Fuel to Asset / Rig
              </h3>
              <button type="button" onClick={() => setShowFuelAllocModal(false)} className="p-1.5 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 hover:text-slate-900 dark:hover:text-white transition"><X size={20} /></button>
            </div>
            <form onSubmit={handleCreateFuelAlloc} className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4 text-xs">
              {/* Linked Bulk Fuel Delivery Purchase for this Project */}
              <div>
                <label className="block font-bold mb-1">Source Fuel Delivery / Bulk Supply Purchase (Project Logs)</label>
                <SearchableSelect
                  options={filteredFuelDeliveries.map((d: any) => ({
                    value: String(d.id),
                    label: `${d.supplier || 'Bulk Fuel Delivery'} | ${d.quantity_litres} L (${d.fuel_type || 'DIESEL'})`,
                    sublabel: `Date: ${d.delivered_at?.slice(0, 10) || d.created_at?.slice(0, 10) || '—'} · Ref #: ${d.reference_number || 'None'}`,
                  }))}
                  value={fuelAllocForm.delivery_id}
                  onChange={(val: string) => setFuelAllocForm({ ...fuelAllocForm, delivery_id: val })}
                  placeholder="Select source fuel delivery log..."
                />
              </div>

              {/* Target Asset Searchable Select & Litres */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold mb-1">Target Asset / Equipment *</label>
                  <SearchableSelect
                    options={filteredAssets.map((a: any) => ({
                      value: String(a.id),
                      label: `${a.name || 'Asset'} (${a.asset_number || a.code || 'Unit'})`,
                      sublabel: `Type: ${a.asset_type || a.category || 'Equipment'}`,
                    }))}
                    value={fuelAllocForm.asset_id}
                    onChange={(val: string) => setFuelAllocForm({ ...fuelAllocForm, asset_id: val })}
                    placeholder="Search equipment by name or unit #..."
                    required
                  />
                </div>
                <div>
                  <label className="block font-bold mb-1">Allocated Quantity (Litres) *</label>
                  <input
                    type="number"
                    required
                    min="1"
                    placeholder="e.g. 350"
                    value={fuelAllocForm.quantity_litres}
                    onChange={(e) => setFuelAllocForm({ ...fuelAllocForm, quantity_litres: e.target.value })}
                    className="w-full p-2.5 border rounded-lg bg-background font-mono font-bold text-sm"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold mb-1">Odometer Reading (km)</label>
                  <input
                    type="number"
                    placeholder="e.g. 45200"
                    value={fuelAllocForm.odometer_km}
                    onChange={(e) => setFuelAllocForm({ ...fuelAllocForm, odometer_km: e.target.value })}
                    className="w-full p-2.5 border rounded-lg bg-background font-mono"
                  />
                </div>
                <div>
                  <label className="block font-bold mb-1">Engine Operating Hours</label>
                  <input
                    type="number"
                    placeholder="e.g. 1250"
                    value={fuelAllocForm.operating_hours}
                    onChange={(e) => setFuelAllocForm({ ...fuelAllocForm, operating_hours: e.target.value })}
                    className="w-full p-2.5 border rounded-lg bg-background font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold mb-1">Notes / Operational Remarks</label>
                <textarea
                  rows={2}
                  placeholder="Specify refueling details or notes..."
                  value={fuelAllocForm.notes}
                  onChange={(e) => setFuelAllocForm({ ...fuelAllocForm, notes: e.target.value })}
                  className="w-full p-2.5 border rounded-lg bg-background"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t">
                <button type="button" onClick={() => setShowFuelAllocModal(false)} className="px-4 py-2 border rounded-lg font-semibold">Cancel</button>
                <button type="submit" disabled={busySubmit} className="px-5 py-2 bg-slate-900 text-white font-bold rounded-lg hover:bg-slate-800 transition">
                  {busySubmit ? 'Allocating...' : 'Allocate Fuel'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 3. Daily Maintenance / Breakdown Repair Job Card Wizard */}
      {(showWOModal || editingBreakdown) && (
        <BreakdownJobCardWizard
          assets={filteredAssets}
          projectId={selectedProjectId}
          onClose={() => { setShowWOModal(false); setEditingBreakdown(null); }}
          onSaved={reloadData}
          record={editingBreakdown || undefined}
        />
      )}

      {/* 4. Preventive Maintenance (PM) Job Card Sign-Off Wizard */}
      {(showPmModal || editingPreventive) && (
        <PreventiveMaintenanceWizard
          assets={filteredAssets}
          projectId={selectedProjectId}
          onClose={() => { setShowPmModal(false); setEditingPreventive(null); }}
          onSaved={reloadData}
          record={editingPreventive || undefined}
        />
      )}

      {selectedMaintenanceRecord && (
        <MaintenanceJobCardDetailsModal
          record={selectedMaintenanceRecord.record}
          kind={selectedMaintenanceRecord.kind}
          startEditing={selectedMaintenanceRecord.startEditing}
          editable={selectedMaintenanceRecord.kind !== 'work_order' && isEditableWithin10Days(selectedMaintenanceRecord.record.created_at)}
          onClose={() => setSelectedMaintenanceRecord(null)}
          onSaved={reloadData}
          onEdit={selectedMaintenanceRecord.kind === 'breakdown' ? () => { setEditingBreakdown(selectedMaintenanceRecord.record); setSelectedMaintenanceRecord(null); } : selectedMaintenanceRecord.kind === 'preventive' ? () => { setEditingPreventive(selectedMaintenanceRecord.record); setSelectedMaintenanceRecord(null); } : undefined}
        />
      )}

      {showExpenseModal && <OperationalExpenseSubmissionModal projectId={selectedProjectId} onClose={() => setShowExpenseModal(false)} onSubmitted={(expense) => { setShowExpenseModal(false); setOperationalExpenseRequests((rows) => [expense, ...rows.filter((row) => row.id !== expense.id)]); setBanner({ type: 'success', message: `${expense.expense_number || 'Operational expense'} submitted to Finance for payment.` }); }} />}

      {showScheduleModal && (
        <EquipmentMaintenanceScheduleModal
          assets={filteredAssets}
          employees={filteredEmployees}
          projectId={selectedProjectId}
          onClose={() => setShowScheduleModal(false)}
          onSaved={() => { setShowScheduleModal(false); void reloadData(); setBanner({ type: 'success', message: 'Maintenance schedule created and dispatched.' }); }}
        />
      )}

      {/* 5. HSE Incident Modal */}
      {showHseModal && (
        <div className="fixed inset-0 bg-slate-950/70 z-[9999] flex items-center justify-center p-0 sm:p-4 overflow-hidden">
          <div className="bg-white dark:bg-slate-900 w-full h-full sm:h-auto sm:max-h-[90vh] max-w-full sm:max-w-3xl border-0 sm:border rounded-none sm:rounded-2xl shadow-2xl flex flex-col overflow-hidden">
            <div className="flex items-center justify-between border-b px-4 py-3.5 sm:px-6 sm:py-4 bg-white dark:bg-slate-900 shrink-0 sticky top-0 z-10">
              <h3 className="font-bold text-base text-slate-900 dark:text-white flex items-center gap-2">
                <ShieldCheck className="text-red-600" size={20} /> Report HSE Incident / Near-Miss / Hazard
              </h3>
              <button type="button" onClick={() => setShowHseModal(false)} className="p-1.5 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 hover:text-slate-900 dark:hover:text-white transition"><X size={20} /></button>
            </div>

            <form onSubmit={handleCreateHSE} className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4 text-xs">
              {/* SECTION: PROJECT & EQUIPMENT SITE ASSOCIATION */}
              <div className="p-3 border rounded-xl bg-slate-50 dark:bg-slate-800/50 space-y-3">
                <h4 className="font-bold text-xs uppercase tracking-wider text-slate-500 border-b pb-1.5 flex items-center justify-between">
                  <span>Associated Project & Equipment Site</span>
                </h4>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block font-bold mb-1">Site / Location *</label>
                    <SearchableSelect
                      options={projectSites.filter(s => !selectedProjectId || String(s.project_id) === String(selectedProjectId)).map(s => ({
                        value: s.id,
                        label: `${s.name} | ${s.project_name || 'Project'}`
                      }))}
                      value={hseForm.site_location_id}
                      onChange={(val: string) => {
                        const site = projectSites.find(s => String(s.id) === String(val));
                        setHseForm({ ...hseForm, site_location_id: val, project_id: site?.project_id || selectedProjectId });
                      }}
                      placeholder="Select project site / location..."
                    />
                  </div>

                  <div>
                    <label className="block font-bold mb-1">
                      Involved Equipment Asset (Optional)
                    </label>
                    <SearchableSelect
                      options={filteredAssets.map(a => ({
                        value: String(a.id),
                        label: a.name || a.asset_number || a.id,
                        sublabel: a.asset_number || a.asset_type || ''
                      }))}
                      value={hseForm.asset_id}
                      onChange={(val: string) => setHseForm({ ...hseForm, asset_id: val })}
                      placeholder="Search equipment asset / rig..."
                    />
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-xs mb-1">Incident Type / Category *</label>
                  <select
                    required
                    value={String(hseForm.incident_type || '').replaceAll('_', ' ')}
                    onChange={(e) => setHseForm({ ...hseForm, incident_type: e.target.value })}
                    className="w-full border rounded-lg p-2.5 bg-background font-medium"
                  >
                    <option value="NEAR_MISS">Near Miss</option>
                    <option value="INJURY_ILLNESS">Injury / Illness</option>
                    <option value="PROPERTY_DAMAGE">Property Damage</option>
                    <option value="ENVIRONMENTAL">Environmental Spill / Impact</option>
                    <option value="HAZARD_OBSERVATION">Hazard Observation</option>
                    <option value="SECURITY">Security Incident</option>
                    <option value="OTHER">Other Safety Event</option>
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-xs mb-1">Severity Level *</label>
                  <select
                    required
                    value={String(hseForm.severity || '').replaceAll('_', ' ')}
                    onChange={(e) => setHseForm({ ...hseForm, severity: e.target.value })}
                    className="w-full border rounded-lg p-2.5 bg-background font-bold text-red-600 dark:text-red-400"
                  >
                    <option value="LOW">Low (Minor First Aid / Observation)</option>
                    <option value="MEDIUM">Medium (Moderate Damage / Treatment)</option>
                    <option value="HIGH">High (Major Damage / Lost Time)</option>
                    <option value="CRITICAL">Critical (Severe Emergency / Fatality Risk)</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-bold text-xs mb-1">Incident Summary / Title *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Hydraulic line burst on Drill Rig DR-04 at Bench Pit 3"
                  value={hseForm.title}
                  onChange={(e) => setHseForm({ ...hseForm, title: e.target.value })}
                  className="w-full border rounded-lg p-2.5 bg-background font-medium"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-xs mb-1">Date & Time *</label>
                  <input
                    type="datetime-local"
                    required
                    value={hseForm.incident_date}
                    onChange={(e) => setHseForm({ ...hseForm, incident_date: e.target.value })}
                    className="w-full border rounded-lg p-2.5 bg-background font-mono"
                  />
                </div>

                <div>
                  <label className="block font-bold text-xs mb-1">Site / Specific Location *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Pit 3 South Bench, Drill Pad B-14"
                    value={hseForm.location}
                    onChange={(e) => setHseForm({ ...hseForm, location: e.target.value })}
                    className="w-full border rounded-lg p-2.5 bg-background"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-xs mb-1">Detailed Incident Narrative *</label>
                <textarea
                  rows={3}
                  required
                  placeholder="Provide full description of what happened, equipment/people involved, weather or pad conditions..."
                  value={hseForm.description}
                  onChange={(e) => setHseForm({ ...hseForm, description: e.target.value })}
                  className="w-full border rounded-lg p-2.5 bg-background font-medium"
                />
              </div>

              <div>
                <label className="block font-bold text-xs mb-1">
                  Immediate Corrective Actions Taken
                </label>
                <textarea
                  rows={2}
                  placeholder="Describe immediate response, first aid administered, spill containment bunds deployed, rig shutdown..."
                  value={hseForm.corrective_action}
                  onChange={(e) => setHseForm({ ...hseForm, corrective_action: e.target.value })}
                  className="w-full border rounded-lg p-2.5 bg-background font-medium"
                />
              </div>

              {/* HSE FILE / PHOTO ATTACHMENT */}
              <div className="border border-dashed rounded-xl p-3 bg-red-50/50 dark:bg-red-950/20 space-y-2">
                <label className="block font-bold text-xs flex items-center justify-between">
                  <span className="flex items-center gap-1.5 text-red-600 dark:text-red-400">
                    <Upload size={14} /> Attach Photos, Witness Statements & Inspection Evidence
                  </span>
                  <span className="text-[10px] text-slate-500 font-normal">
                    Photos, PDFs, Docs
                  </span>
                </label>

                <div className="flex flex-wrap items-center gap-3">
                  <label className="cursor-pointer px-3 py-2 bg-red-600 hover:bg-red-700 text-white font-bold rounded-lg text-xs flex items-center gap-1.5 transition shadow-sm">
                    <Paperclip size={14} /> Select Evidence Files...
                    <input
                      type="file"
                      multiple
                      accept="image/*,application/pdf,.doc,.docx"
                      className="hidden"
                      onChange={(e) => {
                        if (e.target.files) {
                          setHseFiles(Array.from(e.target.files));
                        }
                      }}
                    />
                  </label>

                  {hseFiles.length > 0 ? (
                    <div className="flex flex-wrap items-center gap-2">
                      {hseFiles.map((f, idx) => (
                        <span
                          key={idx}
                          className="flex items-center gap-1.5 bg-red-100 dark:bg-red-900/40 text-red-800 dark:text-red-300 px-2.5 py-1 rounded-lg font-mono text-xs"
                        >
                          <Paperclip size={12} />
                          <span>
                            {f.name} ({(f.size / 1024).toFixed(1)} KB)
                          </span>
                          <button
                            type="button"
                            onClick={() => setHseFiles(hseFiles.filter((_, i) => i !== idx))}
                            className="text-red-600 hover:text-red-800 ml-1 font-bold"
                          >
                            ×
                          </button>
                        </span>
                      ))}
                    </div>
                  ) : (
                    <span className="text-slate-500 text-[11px]">
                      No evidence files attached
                    </span>
                  )}
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t">
                <button
                  type="button"
                  onClick={() => setShowHseModal(false)}
                  className="px-4 py-2 border rounded-lg font-semibold text-xs"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={busySubmit}
                  className="px-5 py-2 bg-red-600 text-white font-bold rounded-lg hover:bg-red-700 transition flex items-center gap-1.5 text-xs"
                >
                  <ShieldCheck size={14} /> {busySubmit ? 'Submitting...' : 'Report Incident'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Employee Profile & Document Request Modal */}
      {selectedEmployee && (
        <div className="fixed inset-0 bg-slate-950/70 z-[9999] flex items-center justify-center p-0 sm:p-4 overflow-hidden">
          <div className="bg-white dark:bg-slate-900 w-full h-full sm:h-auto sm:max-h-[90vh] max-w-full sm:max-w-lg border-0 sm:border rounded-none sm:rounded-2xl shadow-2xl flex flex-col overflow-hidden">
            <div className="flex items-center justify-between border-b px-4 py-3.5 sm:px-6 sm:py-4 bg-white dark:bg-slate-900 shrink-0 sticky top-0 z-10">
              <div>
                <h3 className="font-bold text-base text-slate-900 dark:text-white">
                  {selectedEmployee.first_name} {selectedEmployee.last_name}
                </h3>
                <p className="text-xs text-slate-500">{selectedEmployee.job_title || 'Employee Profile'}</p>
              </div>
              <button type="button" onClick={() => setSelectedEmployee(null)} className="p-1.5 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 hover:text-slate-900 dark:hover:text-white transition"><X size={20} /></button>
            </div>

            <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-2 bg-slate-50 dark:bg-slate-800/50 p-3 rounded-lg border">
                <div>
                  <span className="text-slate-400 block">Work Email</span>
                  <span className="font-semibold">{selectedEmployee.work_email || '—'}</span>
                </div>
                <div>
                  <span className="text-slate-400 block">Phone</span>
                  <span className="font-semibold">{selectedEmployee.primary_phone || '—'}</span>
                </div>
                <div>
                  <span className="text-slate-400 block">Contract Start Date</span>
                  <span className="font-semibold text-orange-700 dark:text-orange-400">
                    {selectedEmployee.contract_start_date ? String(selectedEmployee.contract_start_date).slice(0, 10) : '—'}
                  </span>
                </div>
                <div>
                  <span className="text-slate-400 block">Contract End Date</span>
                  <span className="font-semibold text-orange-700 dark:text-orange-400">
                    {selectedEmployee.contract_end_date ? String(selectedEmployee.contract_end_date).slice(0, 10) : '—'}
                  </span>
                </div>
              </div>

              {/* HR Documents Section with Gated Download Request */}
              <div className="border-t pt-3 space-y-2">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="font-bold text-xs text-slate-800 dark:text-slate-200">Employee Documents & Contracts</h4>
                    <p className="text-[11px] text-slate-500">Field Admins can upload contract files. Downloading sensitive HR files requires HR approval.</p>
                  </div>
                  <button
                    onClick={() => {
                      setContractEmp(selectedEmployee);
                      setContractForm({
                        title: `Employment Contract - ${selectedEmployee.first_name || ''} ${selectedEmployee.last_name || ''}`.trim(),
                        start_date: selectedEmployee.contract_start_date ? String(selectedEmployee.contract_start_date).slice(0, 10) : new Date().toISOString().slice(0, 10),
                        end_date: selectedEmployee.contract_end_date ? String(selectedEmployee.contract_end_date).slice(0, 10) : '',
                        notes: '',
                      });
                      setContractFile(null);
                      setShowContractModal(true);
                    }}
                    className="flex items-center gap-1 text-[11px] font-bold px-2.5 py-1 bg-orange-600 hover:bg-orange-700 text-white rounded transition"
                  >
                    <Upload size={12} /> Upload Contract
                  </button>
                </div>

                <div className="space-y-2 max-h-40 overflow-y-auto">
                  {(selectedEmployee.documents || [
                    { id: '11111111-1111-4111-a111-111111111111', document_name: 'Employment Contract.pdf', document_type: 'EMPLOYMENT_CONTRACT' },
                    { id: '22222222-2222-4222-a222-222222222222', document_name: 'Safety Induction Cert.pdf', document_type: 'CERTIFICATE' },
                  ]).map((doc: any) => (
                    <div key={doc.id} className="flex items-center justify-between p-2 rounded border bg-background text-xs">
                      <div className="flex items-center gap-2">
                        <FileText size={14} className="text-orange-600" />
                        <span className="font-medium">{doc.document_name}</span>
                      </div>
                      <button
                        onClick={() => setRequestDownloadDoc(doc)}
                        className="flex items-center gap-1 px-2.5 py-1 bg-orange-100 text-orange-800 hover:bg-orange-200 font-bold rounded transition text-[11px]"
                      >
                        <Download size={12} /> Request Download
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Download Request Confirmation Modal */}
      {requestDownloadDoc && (
        <div className="fixed inset-0 bg-slate-950/70 z-[9999] flex items-center justify-center p-0 sm:p-4 overflow-hidden">
          <div className="bg-white dark:bg-slate-900 w-full h-full sm:h-auto sm:max-h-[90vh] max-w-full sm:max-w-md border-0 sm:border rounded-none sm:rounded-2xl shadow-xl flex flex-col overflow-hidden">
            <div className="flex items-center justify-between border-b px-4 py-3.5 sm:px-6 sm:py-4 bg-white dark:bg-slate-900 shrink-0 sticky top-0 z-10">
              <h4 className="font-bold text-sm text-slate-900 dark:text-white flex items-center gap-2">
                <Download className="text-orange-600" size={16} /> Submit HR Download Request
              </h4>
              <button type="button" onClick={() => setRequestDownloadDoc(null)} className="p-1.5 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 hover:text-slate-900 dark:hover:text-white transition"><X size={18} /></button>
            </div>
            <div className="p-4 sm:p-6 space-y-3 flex-1 overflow-y-auto">
              <p className="text-xs text-slate-500">
                Requesting download approval for <strong className="text-slate-800 dark:text-slate-200">{requestDownloadDoc.document_name}</strong>. HR will be notified immediately.
              </p>
              <textarea
                rows={3}
                placeholder="Reason for download request (optional)..."
                value={downloadReason}
                onChange={(e) => setDownloadReason(e.target.value)}
                className="w-full p-2.5 border rounded-lg bg-background text-xs"
              />
              <div className="flex justify-end gap-2 pt-2 border-t">
                <button onClick={() => setRequestDownloadDoc(null)} className="px-3 py-1.5 border text-xs rounded-lg font-semibold">Cancel</button>
                <button
                  onClick={handleRequestDocDownload}
                  disabled={requestBusy}
                  className="px-4 py-1.5 bg-orange-600 text-white text-xs font-bold rounded-lg hover:bg-orange-700 transition"
                >
                  {requestBusy ? 'Sending...' : 'Send Request to HR'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Upload Employment Contract Modal */}
      {showContractModal && contractEmp && (
        <div className="fixed inset-0 bg-slate-950/70 z-[9999] flex items-center justify-center p-0 sm:p-4 overflow-hidden">
          <div className="bg-white dark:bg-slate-900 w-full h-full sm:h-auto sm:max-h-[90vh] max-w-full sm:max-w-xl border-0 sm:border rounded-none sm:rounded-2xl shadow-2xl flex flex-col overflow-hidden">
            <div className="flex items-center justify-between border-b px-4 py-3.5 sm:px-6 sm:py-4 bg-white dark:bg-slate-900 shrink-0 sticky top-0 z-10">
              <div>
                <h3 className="font-bold text-base text-slate-900 dark:text-white flex items-center gap-2">
                  <FileText className="text-orange-600" size={18} /> Upload Employment Contract
                </h3>
                <p className="text-xs text-slate-500">
                  Target Employee: <span className="font-semibold text-slate-700 dark:text-slate-300">{contractEmp.first_name} {contractEmp.last_name}</span> ({contractEmp.job_title || 'Staff'})
                </p>
              </div>
              <button type="button" onClick={() => { setShowContractModal(false); setContractEmp(null); }} className="p-1.5 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 hover:text-slate-900 dark:hover:text-white transition"><X size={20} /></button>
            </div>

            <form onSubmit={handleUploadContract} className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4 text-xs">
              <div>
                <label className="block font-bold mb-1 text-slate-700 dark:text-slate-300">Contract Title / Ref</label>
                <input
                  type="text"
                  placeholder="e.g. 2026 Employment Contract Agreement"
                  value={contractForm.title}
                  onChange={(e) => setContractForm({ ...contractForm, title: e.target.value })}
                  className="w-full p-2.5 border rounded-lg bg-background"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold mb-1 text-slate-700 dark:text-slate-300">Contract Start Date *</label>
                  <input
                    type="date"
                    required
                    value={contractForm.start_date}
                    onChange={(e) => setContractForm({ ...contractForm, start_date: e.target.value })}
                    className="w-full p-2.5 border rounded-lg bg-background"
                  />
                </div>
                <div>
                  <label className="block font-bold mb-1 text-slate-700 dark:text-slate-300">Contract End Date *</label>
                  <input
                    type="date"
                    required
                    value={contractForm.end_date}
                    onChange={(e) => setContractForm({ ...contractForm, end_date: e.target.value })}
                    className="w-full p-2.5 border rounded-lg bg-background"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold mb-1 text-slate-700 dark:text-slate-300">Contract File (.pdf, .doc, .docx, .png, .jpg) *</label>
                <input
                  type="file"
                  required
                  accept=".pdf,.doc,.docx,.png,.jpg,.jpeg"
                  onChange={(e) => setContractFile(e.target.files?.[0] || null)}
                  className="w-full p-2 border rounded-lg bg-background text-xs"
                />
                {contractFile && (
                  <p className="text-[11px] text-emerald-600 font-medium mt-1">
                    Selected: {contractFile.name} ({(contractFile.size / 1024).toFixed(1)} KB)
                  </p>
                )}
              </div>

              <div>
                <label className="block font-bold mb-1 text-slate-700 dark:text-slate-300">Notes / Scope (Optional)</label>
                <textarea
                  rows={2}
                  placeholder="Specific contract details, position scope or comments..."
                  value={contractForm.notes}
                  onChange={(e) => setContractForm({ ...contractForm, notes: e.target.value })}
                  className="w-full p-2.5 border rounded-lg bg-background"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t">
                <button
                  type="button"
                  onClick={() => { setShowContractModal(false); setContractEmp(null); }}
                  className="px-4 py-2 border rounded-lg font-semibold text-xs"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={busySubmit}
                  className="px-5 py-2 bg-orange-600 text-white font-bold rounded-lg hover:bg-orange-700 transition flex items-center gap-1.5 text-xs"
                >
                  <Upload size={14} /> {busySubmit ? 'Uploading...' : 'Upload Contract'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      {/* Edit Fuel Delivery Modal (Enforces 2-Day Edit Rule) */}
      {showEditFuelModal && editingFuelDelivery && (
        <div className="fixed inset-0 bg-slate-950/70 z-[9999] flex items-center justify-center p-0 sm:p-4 overflow-hidden">
          <div className="bg-white dark:bg-slate-900 w-full h-full sm:h-auto sm:max-h-[90vh] max-w-full sm:max-w-xl border-0 sm:border rounded-none sm:rounded-2xl shadow-2xl flex flex-col overflow-hidden">
            <div className="flex items-center justify-between border-b px-4 py-3.5 sm:px-6 sm:py-4 bg-white dark:bg-slate-900 shrink-0 sticky top-0 z-10">
              <div>
                <h3 className="font-bold text-base text-slate-900 dark:text-white flex items-center gap-2">
                  <Pencil className="text-orange-600" size={18} /> Edit Fuel Delivery Record
                </h3>
                <p className="text-xs text-slate-500">
                  Modifying recent fuel delivery (restricted to logs within 2 days)
                </p>
              </div>
              <button type="button" onClick={() => { setShowEditFuelModal(false); setEditingFuelDelivery(null); }} className="p-1.5 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 hover:text-slate-900 dark:hover:text-white transition"><X size={20} /></button>
            </div>

            <form onSubmit={handleUpdateFuelDelivery} className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4 text-xs">
              <div className="p-2.5 bg-orange-50 border border-orange-200 text-orange-900 dark:bg-orange-950/30 dark:border-orange-800 dark:text-orange-200 rounded-lg text-[11px] font-medium flex items-center gap-2">
                <Clock size={14} className="text-orange-600 shrink-0" />
                <span>Editing is active because this record was logged within the past 48 hours (2-day grace period).</span>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold mb-1">Recorded Date & Time *</label>
                  <input
                    type="datetime-local"
                    required
                    value={editFuelForm.recorded_at}
                    onChange={(e) => setEditFuelForm({ ...editFuelForm, recorded_at: e.target.value })}
                    className="w-full p-2.5 border rounded-lg bg-background font-mono"
                  />
                </div>
                <div>
                  <label className="block font-bold mb-1">Fuel Type *</label>
                  <select
                    value={editFuelForm.fuel_type}
                    onChange={(e) => setEditFuelForm({ ...editFuelForm, fuel_type: e.target.value })}
                    className="w-full p-2.5 border rounded-lg bg-background font-bold"
                  >
                    <option value="DIESEL">DIESEL</option>
                    <option value="PETROL">PETROL</option>
                    <option value="OTHER">OTHER</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold mb-1">Supplier / Depot Name</label>
                  <input
                    type="text"
                    placeholder="e.g. TotalEnergies Central"
                    value={editFuelForm.supplier}
                    onChange={(e) => setEditFuelForm({ ...editFuelForm, supplier: e.target.value })}
                    className="w-full p-2.5 border rounded-lg bg-background"
                  />
                </div>
                <div>
                  <label className="block font-bold mb-1">Reference / Ticket #</label>
                  <input
                    type="text"
                    placeholder="e.g. DEL-90412"
                    value={editFuelForm.reference_number}
                    onChange={(e) => setEditFuelForm({ ...editFuelForm, reference_number: e.target.value })}
                    className="w-full p-2.5 border rounded-lg bg-background font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block font-bold mb-1">Quantity (Litres) *</label>
                  <input
                    type="number"
                    step="0.001"
                    min="0.001"
                    required
                    value={editFuelForm.quantity_litres}
                    onChange={(e) => setEditFuelForm({ ...editFuelForm, quantity_litres: e.target.value })}
                    className="w-full p-2.5 border rounded-lg bg-background font-bold"
                  />
                </div>
                <div>
                  <label className="block font-bold mb-1">Unit Price ($/L)</label>
                  <input
                    type="number"
                    step="0.001"
                    min="0"
                    value={editFuelForm.unit_cost}
                    onChange={(e) => {
                      const unit = e.target.value;
                      const qty = Number(editFuelForm.quantity_litres) || 0;
                      const computedTotal = unit && qty ? (Number(unit) * qty).toFixed(2) : editFuelForm.total_cost;
                      setEditFuelForm({ ...editFuelForm, unit_cost: unit, total_cost: computedTotal });
                    }}
                    className="w-full p-2.5 border rounded-lg bg-background font-mono"
                  />
                </div>
                <div>
                  <label className="block font-bold mb-1">Total Cost ($)</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={editFuelForm.total_cost}
                    onChange={(e) => setEditFuelForm({ ...editFuelForm, total_cost: e.target.value })}
                    className="w-full p-2.5 border rounded-lg bg-background font-bold text-emerald-600"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold mb-1">Notes / Special Instructions</label>
                <textarea
                  rows={2}
                  placeholder="Notes..."
                  value={editFuelForm.notes}
                  onChange={(e) => setEditFuelForm({ ...editFuelForm, notes: e.target.value })}
                  className="w-full p-2.5 border rounded-lg bg-background"
                />
              </div>
              {/* Attachment File Section */}
              <div className="border border-dashed rounded-xl p-3 bg-background space-y-2">
                <label className="block font-bold text-xs flex items-center justify-between text-slate-700 dark:text-slate-300">
                  <span>Attach Fuel Receipt Docket / Delivery Note</span>
                  <Upload size={14} className="text-orange-600" />
                </label>

                {editFuelForm.existingAttachment && !editFuelReceiptFile && (
                  <div className="flex items-center justify-between p-2 bg-orange-50 dark:bg-orange-950/40 border border-orange-200 dark:border-orange-800 rounded-lg text-xs gap-2">
                    <div className="flex items-center gap-1.5 font-mono font-bold text-orange-800 dark:text-orange-200 min-w-0">
                      <Paperclip size={14} className="text-orange-600 shrink-0" />
                      <span className="truncate" title={editFuelForm.existingAttachment}>Current: {editFuelForm.existingAttachment}</span>
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        type="button"
                        onClick={() => setViewingReceiptDelivery(editingFuelDelivery)}
                        className="px-2 py-1 bg-white dark:bg-slate-900 border rounded text-[11px] font-bold text-orange-700 dark:text-orange-300 hover:bg-orange-100 transition"
                      >
                        View
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDownloadFuelReceipt(editingFuelDelivery)}
                        className="px-2 py-1 bg-orange-600 text-white rounded text-[11px] font-bold hover:bg-orange-700 flex items-center gap-1 transition"
                      >
                        <Download size={11} /> Download
                      </button>
                    </div>
                  </div>
                )}

                <div className="flex items-center gap-3 pt-1">
                  <label className="cursor-pointer px-3 py-2 bg-orange-600 hover:bg-orange-700 text-white font-bold rounded-lg text-xs flex items-center gap-1.5 transition">
                    <Paperclip size={14} /> {editFuelForm.existingAttachment ? 'Replace File...' : 'Attach File...'}
                    <input
                      type="file"
                      accept="image/*,application/pdf"
                      className="hidden"
                      onChange={(e) => {
                        if (e.target.files && e.target.files[0]) {
                          setEditFuelReceiptFile(e.target.files[0]);
                        }
                      }}
                    />
                  </label>
                  {editFuelReceiptFile ? (
                    <span className="text-xs font-mono font-bold text-orange-600">
                      New File: {editFuelReceiptFile.name} ({(editFuelReceiptFile.size / 1024).toFixed(1)} KB)
                    </span>
                  ) : (
                    !editFuelForm.existingAttachment && <span className="text-[11px] text-slate-400">No ticket file attached</span>
                  )}
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t">
                <button
                  type="button"
                  onClick={() => { setShowEditFuelModal(false); setEditingFuelDelivery(null); }}
                  className="px-4 py-2 border rounded-lg font-semibold text-xs"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={editFuelBusy}
                  className="px-5 py-2 bg-orange-600 text-white font-bold rounded-lg hover:bg-orange-700 transition flex items-center gap-1.5 text-xs"
                >
                  <Pencil size={14} /> {editFuelBusy ? 'Saving Changes...' : 'Save Updated Log'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Fuel Allocation Modal (Enforces 1-Day Edit Rule) */}
      {showEditFuelAllocModal && editingFuelAlloc && (
        <div className="fixed inset-0 bg-slate-950/70 z-[9999] flex items-center justify-center p-0 sm:p-4 overflow-hidden">
          <div className="bg-white dark:bg-slate-900 w-full h-full sm:h-auto sm:max-h-[90vh] max-w-full sm:max-w-xl border-0 sm:border rounded-none sm:rounded-2xl shadow-2xl flex flex-col overflow-hidden">
            <div className="flex items-center justify-between border-b px-4 py-3.5 sm:px-6 sm:py-4 bg-white dark:bg-slate-900 shrink-0 sticky top-0 z-10">
              <div>
                <h3 className="font-bold text-base text-slate-900 dark:text-white flex items-center gap-2">
                  <Pencil className="text-orange-600" size={18} /> Edit Asset Fuel Allocation
                </h3>
                <p className="text-xs text-slate-500">
                  Modifying recent fuel allocation (restricted to logs within 1 day / 24 hours)
                </p>
              </div>
              <button type="button" onClick={() => { setShowEditFuelAllocModal(false); setEditingFuelAlloc(null); }} className="p-1.5 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 hover:text-slate-900 dark:hover:text-white transition"><X size={20} /></button>
            </div>

            <form onSubmit={handleUpdateFuelAlloc} className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4 text-xs">
              <div className="p-2.5 bg-amber-50 border border-amber-200 text-amber-900 dark:bg-amber-950/30 dark:border-amber-800 dark:text-amber-200 rounded-lg text-[11px] font-medium flex items-center gap-2">
                <Clock size={14} className="text-amber-600 shrink-0" />
                <span>Editing is active because this record was logged within the past 24 hours (1-day grace period).</span>
              </div>

              <div>
                <label className="block font-bold mb-1">Source Fuel Delivery / Bulk Supply Purchase</label>
                <SearchableSelect
                  options={filteredFuelDeliveries.map((d: any) => ({
                    value: String(d.id),
                    label: `${d.supplier || 'Bulk Fuel Delivery'} | ${d.quantity_litres} L (${d.fuel_type || 'DIESEL'})`,
                    sublabel: `Date: ${d.delivered_at?.slice(0, 10) || d.created_at?.slice(0, 10) || '—'} · Ref #: ${d.reference_number || 'None'}`,
                  }))}
                  value={editAllocForm.delivery_id}
                  onChange={(val: string) => setEditAllocForm({ ...editAllocForm, delivery_id: val })}
                  placeholder="Select source fuel delivery log..."
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold mb-1">Target Asset / Equipment *</label>
                  <SearchableSelect
                    options={filteredAssets.map((a: any) => ({
                      value: String(a.id),
                      label: `${a.name || 'Asset'} (${a.asset_number || a.code || 'Unit'})`,
                      sublabel: `Type: ${a.asset_type || a.category || 'Equipment'}`,
                    }))}
                    value={editAllocForm.asset_id}
                    onChange={(val: string) => setEditAllocForm({ ...editAllocForm, asset_id: val })}
                    placeholder="Search equipment by name or unit #..."
                    required
                  />
                </div>
                <div>
                  <label className="block font-bold mb-1">Allocated Quantity (Litres) *</label>
                  <input
                    type="number"
                    required
                    step="0.1"
                    min="0.1"
                    placeholder="e.g. 350"
                    value={editAllocForm.quantity_litres}
                    onChange={(e) => setEditAllocForm({ ...editAllocForm, quantity_litres: e.target.value })}
                    className="w-full p-2.5 border rounded-lg bg-background font-mono font-bold text-sm"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold mb-1">Allocation Date &amp; Time *</label>
                  <input
                    type="datetime-local"
                    required
                    value={editAllocForm.allocated_at}
                    onChange={(e) => setEditAllocForm({ ...editAllocForm, allocated_at: e.target.value })}
                    className="w-full p-2.5 border rounded-lg bg-background font-mono"
                  />
                </div>
                <div>
                  <label className="block font-bold mb-1">Odometer Reading (km)</label>
                  <input
                    type="number"
                    placeholder="e.g. 45200"
                    value={editAllocForm.odometer_km}
                    onChange={(e) => setEditAllocForm({ ...editAllocForm, odometer_km: e.target.value })}
                    className="w-full p-2.5 border rounded-lg bg-background font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold mb-1">Engine Operating Hours</label>
                <input
                  type="number"
                  placeholder="e.g. 1250"
                  value={editAllocForm.operating_hours}
                  onChange={(e) => setEditAllocForm({ ...editAllocForm, operating_hours: e.target.value })}
                  className="w-full p-2.5 border rounded-lg bg-background font-mono"
                />
              </div>

              <div>
                <label className="block font-bold mb-1">Notes / Operational Remarks</label>
                <textarea
                  rows={2}
                  placeholder="Specify refueling details or notes..."
                  value={editAllocForm.notes}
                  onChange={(e) => setEditAllocForm({ ...editAllocForm, notes: e.target.value })}
                  className="w-full p-2.5 border rounded-lg bg-background"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t">
                <button type="button" onClick={() => { setShowEditFuelAllocModal(false); setEditingFuelAlloc(null); }} className="px-4 py-2 border rounded-lg font-semibold">Cancel</button>
                <button type="submit" disabled={editAllocBusy} className="px-5 py-2 bg-amber-600 text-white font-bold rounded-lg hover:bg-amber-700 transition flex items-center gap-1.5 text-xs">
                  <Pencil size={14} /> {editAllocBusy ? 'Updating...' : 'Update Fuel Allocation'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* View Fuel Delivery Receipt & Docket Modal */}
      {viewingReceiptDelivery && (
        <div className="fixed inset-0 bg-slate-950/75 z-[9999] flex items-center justify-center p-0 sm:p-4 overflow-hidden">
          <div className="bg-white dark:bg-slate-900 w-full h-full sm:h-auto sm:max-h-[90vh] max-w-full sm:max-w-4xl border-0 sm:border border-slate-200 dark:border-slate-800 rounded-none sm:rounded-2xl shadow-2xl flex flex-col overflow-hidden">
            {/* Sticky Header */}
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 px-4 py-3.5 sm:px-6 sm:py-4 bg-white dark:bg-slate-900 shrink-0 sticky top-0 z-10">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-orange-50 dark:bg-orange-950/40 text-orange-600 flex items-center justify-center font-bold">
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
                    <span className="text-[10px] font-extrabold uppercase tracking-widest text-orange-600">Official Refuel Voucher</span>
                    <h4 className="text-lg font-black text-slate-900 dark:text-white mt-1">
                      {viewingReceiptDelivery.supplier || 'Site Bulk Fuel Supplier'}
                    </h4>
                    <p className="text-xs text-slate-500 mt-1">
                      Site: {projectSites.find((s) => String(s.id) === String(viewingReceiptDelivery.site_location_id))?.name || 'Project Field Depot'}
                    </p>
                  </div>

                  <div className="flex items-center gap-3 pt-1">
                    <span className="px-2.5 py-1 bg-orange-50 dark:bg-orange-950/60 text-orange-800 dark:text-orange-300 rounded-full font-mono text-[11px] font-bold">
                      {viewingReceiptDelivery.fuel_type || 'DIESEL'}
                    </span>
                    <span className="text-xs text-slate-400 font-mono">
                      {viewingReceiptDelivery.recorded_at ? new Date(viewingReceiptDelivery.recorded_at).toLocaleString() : viewingReceiptDelivery.delivered_at || '—'}
                    </span>
                  </div>

                  <div className="grid grid-cols-3 gap-2 p-3.5 rounded-xl border border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 text-xs">
                    <div>
                      <span className="text-[10px] text-slate-400 font-bold uppercase block">Quantity</span>
                      <span className="font-extrabold text-orange-600 text-sm block mt-0.5">{viewingReceiptDelivery.quantity_litres} L</span>
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
                      onClick={() => handleViewFuelReceipt(viewingReceiptDelivery)}
                      className="px-4 py-2 bg-orange-600 hover:bg-orange-700 text-white font-bold rounded-lg text-xs flex items-center gap-1.5 transition"
                    >
                      <File size={14} /> View Receipt
                    </button>
                  );
                })()}
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

      {/* View Operational Expense Voucher Modal */}
      {viewingExpense && (
        <div className="fixed inset-0 bg-slate-950/75 z-[9999] flex items-center justify-center p-0 sm:p-4 overflow-hidden">
          <div className="bg-white dark:bg-slate-900 w-full h-full sm:h-auto sm:max-h-[90vh] max-w-full sm:max-w-4xl border-0 sm:border border-slate-200 dark:border-slate-800 rounded-none sm:rounded-2xl shadow-2xl flex flex-col overflow-hidden">
            {/* Sticky Header */}
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 px-4 py-3.5 sm:px-6 sm:py-4 bg-white dark:bg-slate-900 shrink-0 sticky top-0 z-10">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-orange-50 dark:bg-orange-950/40 text-orange-600 flex items-center justify-center font-bold">
                  <DollarSign size={18} />
                </div>
                <div>
                  <h3 className="font-bold text-base text-slate-900 dark:text-white">
                    Operational Expense Voucher
                  </h3>
                  <p className="text-xs text-slate-500 font-mono">
                    Ref #: {viewingExpense.expense_number || `EXP-${String(viewingExpense.id).slice(0, 8)}`}
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
                    <span className="text-[10px] font-extrabold uppercase tracking-widest text-orange-600">Official Expense Claim</span>
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
                              <button type="button" onClick={() => setFieldAdminViewerState({ isOpen: true, fileUrl: `/api/v1/operational-expenses/${viewingExpense.id}/payments/${payment.id}/receipt`, fileName: payment.receipt_name, title: `Payment receipt · Installment ${viewingExpense.payments.length - index}` })} className="inline-flex items-center gap-1 rounded border border-slate-200 dark:border-slate-700 px-2 py-1 text-[11px] font-semibold text-blue-700 hover:bg-slate-50"><Eye size={12} />View</button>
                              <button type="button" onClick={() => void handleDownloadExpensePaymentReceipt(viewingExpense, payment)} className="inline-flex items-center gap-1 rounded border border-slate-200 dark:border-slate-700 px-2 py-1 text-[11px] font-semibold text-slate-700 hover:bg-slate-50"><Download size={12} />Download</button>
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
                  return (
                    <button
                      type="button"
                      onClick={() => setFieldAdminViewerState({
                        isOpen: true,
                        fileUrl: `/api/v1/operational-expenses/${viewingExpense.id}/invoice`,
                        fileName: receiptFile,
                        title: 'Attached Receipt Docket File',
                      })}
                      className="px-4 py-2 bg-orange-600 hover:bg-orange-700 text-white font-bold rounded-lg text-xs flex items-center gap-1.5 transition"
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
      )}

      {/* Edit Operational Expense Modal */}
      {showEditExpenseModal && editingExpense && (
        <div className="fixed inset-0 bg-slate-950/75 z-[9999] flex items-center justify-center p-0 sm:p-4 overflow-hidden">
          <div className="bg-white dark:bg-slate-900 w-full h-full sm:h-auto sm:max-h-[90vh] max-w-full sm:max-w-xl border-0 sm:border rounded-none sm:rounded-2xl shadow-2xl flex flex-col overflow-hidden">
            {/* Sticky Header */}
            <div className="flex items-center justify-between border-b px-4 py-3.5 sm:px-6 sm:py-4 bg-slate-50 dark:bg-slate-900 shrink-0 sticky top-0 z-10">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-orange-100 dark:bg-orange-950/60 text-orange-600 flex items-center justify-center font-bold">
                  <Pencil size={18} />
                </div>
                <div>
                  <h3 className="font-bold text-base text-slate-900 dark:text-white">
                    Edit Operational Expense Submission
                  </h3>
                  <p className="text-xs text-slate-500 font-mono">
                    Ref #: {editingExpense.expense_number || `EXP-${String(editingExpense.id).slice(0, 8)}`}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => { setShowEditExpenseModal(false); setEditingExpense(null); }}
                className="p-1.5 rounded-full hover:bg-slate-200 dark:hover:bg-slate-800 text-slate-500 hover:text-slate-900 dark:hover:text-white transition"
              >
                <X size={20} />
              </button>
            </div>

            {/* Form */}
            <form onSubmit={handleUpdateExpense} className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4 text-xs">
              <div>
                <label className="block font-bold mb-1">Pay To / Vendor Name *</label>
                <input
                  type="text"
                  required
                  value={editExpenseForm.pay_to_name}
                  onChange={(e) => setEditExpenseForm({ ...editExpenseForm, pay_to_name: e.target.value })}
                  className="w-full p-2.5 border rounded-lg bg-background font-medium"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold mb-1">Expense Date *</label>
                  <input
                    type="date"
                    required
                    value={editExpenseForm.expense_date}
                    onChange={(e) => setEditExpenseForm({ ...editExpenseForm, expense_date: e.target.value })}
                    className="w-full p-2.5 border rounded-lg bg-background"
                  />
                </div>

                <div>
                  <label className="block font-bold mb-1">Total Cost ($) *</label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    min="0"
                    value={editExpenseForm.total_cost}
                    onChange={(e) => setEditExpenseForm({ ...editExpenseForm, total_cost: e.target.value })}
                    className="w-full p-2.5 border rounded-lg bg-background font-bold text-emerald-600"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold mb-1">Payment Method</label>
                <select
                  value={editExpenseForm.payment_method}
                  onChange={(e) => setEditExpenseForm({ ...editExpenseForm, payment_method: e.target.value })}
                  className="w-full p-2.5 border rounded-lg bg-background"
                >
                  <option value="MOBILE_MONEY">Phone / Mobile Money</option>
                  <option value="BANK_TRANSFER">Bank Transfer</option>
                  <option value="CASH">Cash</option>
                  <option value="CARD">Card</option>
                  <option value="OTHER">Other</option>
                </select>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t">
                <button
                  type="button"
                  onClick={() => { setShowEditExpenseModal(false); setEditingExpense(null); }}
                  className="px-4 py-2 border rounded-lg font-semibold hover:bg-slate-100 dark:hover:bg-slate-800 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={editExpenseBusy}
                  className="px-5 py-2 bg-orange-600 text-white font-bold rounded-lg hover:bg-orange-700 transition flex items-center gap-1.5 text-xs"
                >
                  <Pencil size={14} /> {editExpenseBusy ? 'Saving...' : 'Update Expense Submission'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* View HSE Safety Incident Details Modal */}
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
    
      {/* Mobile Bottom Navigation Tabbar */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-t border-slate-200 dark:border-slate-800 flex justify-around items-center h-14 px-1 shadow-[0_-4px_20px_-10px_rgba(0,0,0,0.1)] no-print">
        {tabs.map((t) => {
          const isActive = activeTab === t.id;
          return (
            <button
              key={t.id}
              onClick={() => setActiveTab(t.id)}
              className={`flex items-center justify-center w-full h-full transition relative ${
                isActive
                  ? 'text-orange-600 dark:text-orange-400'
                  : 'text-slate-500 hover:text-slate-900 dark:hover:text-slate-300'
              }`}
            >
              <div className={`relative ${isActive ? 'opacity-100' : 'opacity-70'}`}>
                {t.icon}
              </div>

                {isActive && (
                  <span className="absolute bottom-1 w-5 h-1 bg-orange-600 dark:bg-orange-400 rounded-full" />
                )}

            </button>
          );
        })}
      </nav>

      {/* Universal File Viewer Modal */}
      <UniversalFileViewerModal
        isOpen={fieldAdminViewerState.isOpen}
        onClose={() => setFieldAdminViewerState({ isOpen: false })}
        fileUrl={fieldAdminViewerState.fileUrl}
        blob={fieldAdminViewerState.blob}
        fileName={fieldAdminViewerState.fileName}
        title={fieldAdminViewerState.title}
        fileType={fieldAdminViewerState.fileType}
      />
    </div>
  );
}
