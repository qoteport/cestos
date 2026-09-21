'use client';
import { hasSupervisorRole, canOpenFieldTab } from '@/lib/fieldPortalAccess';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import FieldWorkEditModal, { canEditFieldWork } from './FieldWorkEditModal';
import FieldEquipmentDetails from './FieldEquipmentDetails';
import FieldShiftEditModal from './FieldShiftEditModal';
import WorkCompletionDetails from './WorkCompletionDetails';
import FieldConsumables from './FieldConsumables';
import FieldPortalLayout from '@/components/FieldPortalLayout';
import DrillingWorkspace from '@/components/DrillingWorkspace';
import FieldTeamLeaveRequests from '@/components/FieldTeamLeaveRequests';
import OperationsPerformanceCombinedChart from '@/app/components/OperationsPerformanceCombinedChart';
import { projectShiftReports } from '@/lib/fieldPortalShifts';
import { drillHoleProgressById } from '@/lib/drillHoleProgress';
import {
  Flame,
  Wrench,
  Activity,
  CheckCircle2,
  Clock,
  AlertTriangle,
  Fuel,
  Package,
  User,
  Calendar,
  Bell,
  Plus,
  Search,
  ShieldCheck,
  MapPin,
  HardHat,
  RefreshCw,
  Trash2,
  FileText,
  Upload,
  Compass,
  Paperclip,
  X,
  Truck,
  Check,
  Eye,
  ArrowRight,
  Users,
  DollarSign,
  ChevronLeft,
  ChevronRight,
  Info,
} from 'lucide-react';
import { useAuth } from '@/components/AuthProvider';
import { apiFetch } from '@/lib/api';
import { Modal, rows } from '@/components/DataUI';
import useAppFeedback, { AppAlert } from './useAppFeedback';
import SearchableSelect from '@/components/SearchableSelect';
import EmployeeDetailView from '@/components/EmployeeDetailView';

export default function FieldPortalWorkspace() {
  const router = useRouter();
  const auth = useAuth();
  const user = auth.user;
  const isSupervisorOrAdmin = hasSupervisorRole(auth.access);

  const [editingWork, setEditingWork] = useState<any | null>(null);

  const [selectedEquipment, setSelectedEquipment] = useState<any | null>(null);
  const [editingShift, setEditingShift] = useState<any | null>(null);
  const [completionBusy, setCompletionBusy] = useState(false);

  // Primary State
  const [loading, setLoading] = useState(true);
  const [version, setVersion] = useState(0);
  const [activeTab, setActiveTab] = useState<'MY_WORK' | 'SHIFT_LOGS' | 'EQUIPMENT' | 'STORES' | 'TEAM' | 'PROFILE' | 'DRILL_HOLES' | 'WORK_ORDERS'>('MY_WORK');
  useEffect(() => {
    const tab = new URLSearchParams(window.location.search).get('tab');
    if (tab === 'DRILL_HOLES' || tab === 'WORK_ORDERS' || tab === 'MY_WORK' || tab === 'SHIFT_LOGS' || tab === 'EQUIPMENT' || tab === 'STORES' || tab === 'TEAM' || tab === 'PROFILE') setActiveTab(tab);
  }, []);
  useEffect(() => {
    if (!auth.loading && !canOpenFieldTab(auth.access, activeTab)) setActiveTab('MY_WORK');
  }, [activeTab, isSupervisorOrAdmin, auth.loading, auth.access]);
  const [leaveAttachment, setLeaveAttachment] = useState<File | null>(null);
  const [showFullProfileModal, setShowFullProfileModal] = useState<boolean>(false);
  const [searchTeam, setSearchTeam] = useState<string>('');

  // Scoped Data State
  const [myProjects, setMyProjects] = useState<any[]>([]);
  const [myAssets, setMyAssets] = useState<any[]>([]);
  const [myWorkOrders, setMyWorkOrders] = useState<any[]>([]);
  const [myBreakdowns, setMyBreakdowns] = useState<any[]>([]);
  const [teamEmployees, setTeamEmployees] = useState<any[]>([]);
  const [myLeaveRequests, setMyLeaveRequests] = useState<any[]>([]);
  const [leaveSubmitting, setLeaveSubmitting] = useState(false);
  const [leaveLoading, setLeaveLoading] = useState(false);
  const [leaveError, setLeaveError] = useState('');
  const [stores, setStores] = useState<any[]>([]);
  const [inventoryItems, setInventoryItems] = useState<any[]>([]);
  const [storeIssues, setStoreIssues] = useState<any[]>([]);
  const [storeView, setStoreView] = useState<'STOCK' | 'CONSUMPTION' | 'LOW_STOCK'>('STOCK');
  const [shiftReports, setShiftReports] = useState<any[]>([]);
  const [shiftsLoading, setShiftsLoading] = useState(false);
  const [shiftsError, setShiftsError] = useState('');
  const [shiftPage, setShiftPage] = useState<number>(1);
  const [shiftPageSize, setShiftPageSize] = useState<number>(5);
  const [drillHoles, setDrillHoles] = useState<any[]>([]);
  const [maintenanceSchedules, setMaintenanceSchedules] = useState<any[]>([]);

  // Search & Filter
  const [search, setSearch] = useState('');

  const { notify: setPortalAlert, formErrors, clearErrors } = useAppFeedback();

  const [showLeaveModal, setShowLeaveModal] = useState(false);
  const [showTimeLogModal, setShowTimeLogModal] = useState(false);
  const [timeLogBusy, setTimeLogBusy] = useState(false);
  const [myTimeLogs, setMyTimeLogs] = useState<any[]>([]);
  const [timeLogsLoading, setTimeLogsLoading] = useState(false);
  const [showDefectModal, setShowDefectModal] = useState(false);
  const [showMaintenanceModal, setShowMaintenanceModal] = useState(false);
  const [selectedEquipmentProjectFilter, setSelectedEquipmentProjectFilter] = useState<string>('ALL');
  const [projectChoice, setSelectedProjectId] = useState<string>('');
  const selectedProjectId = myProjects.some((project) => project.id === projectChoice)
    ? projectChoice : (myProjects[0]?.id || '');
  const [showStoreIssueModal, setShowStoreIssueModal] = useState(false);
  const [showFuelRefillModal, setShowFuelRefillModal] = useState(false);
  const [showTankDipModal, setShowTankDipModal] = useState(false);
  const [showShiftModal, setShowShiftModal] = useState(false);
  const [showCreateHoleModal, setShowCreateHoleModal] = useState(false);
  const [showHseModal, setShowHseModal] = useState(false);
  const [hseIncidents, setHseIncidents] = useState<any[]>([]);
  const [hseForm, setHseForm] = useState({
    project_id: '',
    asset_id: '',
    title: '',
    incident_type: 'NEAR_MISS',
    severity: 'MEDIUM',
    incident_date: new Date().toISOString().slice(0, 16),
    location: '',
    description: '',
    corrective_action: '',
  });
  const [hseFiles, setHseFiles] = useState<File[]>([]);
  const [hseSubmitting, setHseSubmitting] = useState(false);
  const [selectedWorkOrder, setSelectedWorkOrder] = useState<any | null>(null);
  const [selectedColleague, setSelectedColleague] = useState<any | null>(null);
  const [woNoteInput, setWoNoteInput] = useState<string>('');
  const [woAttachment, setWoAttachment] = useState<File | null>(null);
  const [woToComplete, setWoToComplete] = useState<any | null>(null);
  const [completionNotes, setCompletionNotes] = useState<string>('');
  const [completionFile, setCompletionFile] = useState<File | null>(null);

  // Form State: Work Order Creation (Supervisor)
  const [showCreateWOModal, setShowCreateWOModal] = useState<boolean>(false);
  const [createWOForm, setCreateWOForm] = useState({
    asset_id: '',
    title: '',
    description: '',
    priority: 'NORMAL',
    maintenance_type: 'SERVICE',
    scheduled_date: new Date().toISOString().slice(0, 10),
    estimated_hours: 4.0,
    assigned_to_ids: [] as string[],
    cost: 0,
  });
  const [createWOChecklist, setCreateWOChecklist] = useState<string[]>([
    'Inspect equipment components and fluid levels',
    'Verify safety controls and emergency stops',
  ]);
  const [newChecklistItem, setNewChecklistItem] = useState<string>('');
  const [createWOParts, setCreateWOParts] = useState<Array<{ item_id: string; quantity: number; unit: string }>>([
    { item_id: '', quantity: 1, unit: 'PCS' },
  ]);
  const [createWOFile, setCreateWOFile] = useState<File | null>(null);
  const [woSubmitting, setWoSubmitting] = useState<boolean>(false);

  useEffect(() => { clearErrors(); }, [clearErrors, showCreateHoleModal, showShiftModal, showMaintenanceModal, showStoreIssueModal, showFuelRefillModal, showTankDipModal, showLeaveModal, showTimeLogModal, showDefectModal, showCreateWOModal, showHseModal, selectedWorkOrder?.id, woToComplete?.id]);

  useEffect(() => { if (shiftsError) setPortalAlert({ type: 'error', message: shiftsError }); }, [shiftsError, setPortalAlert]);
  useEffect(() => { if (leaveError) setPortalAlert({ type: 'error', message: leaveError }); }, [leaveError, setPortalAlert]);

  // Work Order Handlers
  const handleCreateFieldWorkOrder = async (e: React.FormEvent) => {
    const report = (alert: AppAlert) => setPortalAlert(alert, 'create-work-order');
    e.preventDefault();
    if (!createWOForm.asset_id) {
      report({ type: 'error', message: 'Please select Target Equipment Asset.' });
      return;
    }
    if (!createWOForm.title.trim()) {
      report({ type: 'error', message: 'Please enter Work Order Title.' });
      return;
    }

    setWoSubmitting(true);
    try {
      const selectedAsset = (filteredProjectAssets || []).find((a: any) => a.id === createWOForm.asset_id) || myAssets.find((a: any) => a.id === createWOForm.asset_id);
      const assignedTechs = teamEmployees.filter((e: any) => createWOForm.assigned_to_ids.includes(e.id || e.email));
      const assignedTechNames = assignedTechs.length > 0
        ? assignedTechs.map((e: any) => `${e.first_name || ''} ${e.last_name || ''}`.trim() || e.name).join(', ')
        : 'Assigned Field Specialist';

      const savedWorkOrder = await apiFetch<any>(`/api/v1/field-portal/assets/${createWOForm.asset_id}/work-orders`, {
        method: 'POST',
        body: JSON.stringify({
          project_id: selectedAsset?.assigned_project_id || undefined,
          title: createWOForm.title.trim(),
          description: createWOForm.description.trim() || undefined,
          maintenance_type: createWOForm.maintenance_type,
          priority: createWOForm.priority,
          scheduled_date: createWOForm.scheduled_date || undefined,
          assigned_employee_id: createWOForm.assigned_to_ids[0] || undefined,
          checklist: createWOChecklist.filter(task => task.trim()).map((task, index) => ({id: String(index), task, completed: false})),
          cost: Number(createWOForm.cost) || 0,
        }),
      });

      const newWOObj = {
        id: savedWorkOrder.id,
        work_order_number: `WO-${String(savedWorkOrder.id).slice(0, 8).toUpperCase()}`,
        title: createWOForm.title.trim(),
        description: createWOForm.description.trim() || 'Field Work Order Maintenance Task',
        asset_name: selectedAsset?.name || 'Equipment Asset',
        asset_id: createWOForm.asset_id,
        project_name: selectedAsset?.assigned_project_name || selectedAsset?.project_name || 'Solway Mount Belleh Project',
        priority: createWOForm.priority,
        status: 'OPEN',
        assigned_to: assignedTechNames,
        assigned_to_ids: createWOForm.assigned_to_ids,
        created_by: user ? `${user.first_name || ''} ${user.last_name || ''}`.trim() : 'Supervisor',
        created_at: new Date().toISOString().slice(0, 10),
        due_date: createWOForm.scheduled_date,
        estimated_hours: Number(createWOForm.estimated_hours || 4),
        checklist: createWOChecklist.filter((c) => c.trim()).map((taskStr, idx) => ({
          id: `chk-${Date.now()}-${idx}`,
          task: taskStr.trim(),
          completed: false,
        })),
        parts_required: createWOParts.filter((p) => p.item_id).map((p) => {
          const itemObj = inventoryItems.find((i: any) => i.id === p.item_id);
          return `${itemObj?.name || 'Spare Part'} (Qty: ${p.quantity} ${p.unit})`;
        }),
        notes: createWOFile ? `[Work Order Procedure Attached: ${createWOFile.name} (${(createWOFile.size / 1024).toFixed(1)} KB)]` : '',
        attachment_name: createWOFile ? createWOFile.name : null,
      };

      setMyWorkOrders((prev) => [newWOObj, ...prev]);
      setShowCreateWOModal(false);
      setVersion(v => v + 1);
      setWoSubmitting(false);

      report({
        type: 'success',
        message: `Work Order "${newWOObj.work_order_number}" created and dispatched to ${assignedTechNames} successfully!`,
      });

      // Reset Form
      setCreateWOForm({
        asset_id: '',
        title: '',
        description: '',
        priority: 'NORMAL',
        maintenance_type: 'SERVICE',
        scheduled_date: new Date().toISOString().slice(0, 10),
        estimated_hours: 4.0,
        assigned_to_ids: [],
        cost: 0,
      });
      setCreateWOChecklist(['Inspect equipment components and fluid levels', 'Verify safety controls and emergency stops']);
      setCreateWOParts([{ item_id: '', quantity: 1, unit: 'PCS' }]);
      setCreateWOFile(null);
    } catch (err: any) {
      setWoSubmitting(false);
      report({ type: 'error', message: err.message || 'Failed to create work order' });
    }
  };

  const saveFieldWork = async (wo: any, body: Record<string, unknown>) => {
    const saved = await apiFetch<any>(`/api/v1/field-portal/work-orders/${wo.id}`, {
      method: 'PATCH', body: JSON.stringify(body),
    });
    const updated = { ...wo, ...saved, asset_name: saved.asset_name || wo.asset_name };
    setMyWorkOrders(prev => prev.map(item => item.id === wo.id ? updated : item));
    setSelectedWorkOrder((previous: any) => previous?.id === wo.id ? updated : previous);
    setMaintenanceSchedules(prev => prev.filter(item => item.id !== wo.id || !['COMPLETED', 'APPROVED'].includes(updated.status)));
    return updated;
  };

  const handleToggleWorkOrderTask = async (taskId: string) => {
    if (!selectedWorkOrder) return;
    const task = selectedWorkOrder.checklist.find((item: any) => item.id === taskId);
    try { await saveFieldWork(selectedWorkOrder, {task_id: taskId, completed: !task.completed}); }
    catch (error: any) { setPortalAlert({type: 'error', message: error.message}, 'work-order'); }
  };

  const handleInitiateCompleteWO = (wo: any) => {
    if (!wo) return;
    const checklist = wo.checklist || [];
    const pendingItems = checklist.filter((item: any) => !item.completed);
    if (pendingItems.length > 0) {
      setPortalAlert({
        type: 'error',
        message: `Cannot complete Work Order "${wo.work_order_number || wo.title}": ${pendingItems.length} checklist task(s) are still pending. Please check off all checklist tasks first.`,
      });
      if (!selectedWorkOrder || selectedWorkOrder.id !== wo.id) {
        setSelectedWorkOrder(wo);
      }
      return;
    }
    setWoToComplete(wo);
    setCompletionNotes('');
    setCompletionFile(null);
  };

  const handleConfirmWorkOrderCompletion = async (e: React.FormEvent) => {
    const report = (alert: AppAlert) => setPortalAlert(alert, 'complete-work-order');
    e.preventDefault();
    if (!woToComplete) return;

    if (completionBusy) return;
    setCompletionBusy(true);
    const form = new FormData();
    form.append('notes', completionNotes.trim() || 'All checklist tasks completed.');
    if (completionFile) form.append('file', completionFile);
    try {
      const saved = await apiFetch<any>(`/api/v1/field-portal/work-orders/${woToComplete.id}/complete`, { method: 'POST', body: form });
      const updated = { ...woToComplete, ...saved, asset_name: woToComplete.asset_name };
      setMyWorkOrders(previous => previous.map(work => work.id === updated.id ? updated : work));
      setMaintenanceSchedules(previous => previous.filter(work => work.id !== updated.id));
      setSelectedWorkOrder(updated);
      window.dispatchEvent(new Event('cestos:notifications-changed'));
    } catch (error: any) {
      report({ type: 'error', message: error.message });
      return;
    } finally {
      setCompletionBusy(false);
    }
    setWoToComplete(null);
    setCompletionNotes('');
    setCompletionFile(null);

    report({
      type: 'success',
      message: `Work Order "${woToComplete.work_order_number || woToComplete.title}" completed and awaiting supervisor approval.`,
    });
  };

  const handleUpdateWorkOrderStatus = async (wo: any, newStatus: string) => {
    const report = (alert: AppAlert) => setPortalAlert(alert, 'work-order');
    if (!wo) return;
    if (newStatus === 'COMPLETED') {
      handleInitiateCompleteWO(wo);
      return;
    }
    try { await saveFieldWork(wo, {status: newStatus}); }
    catch (error: any) { report({type: 'error', message: error.message}); }
  };

  const handleAddWorkOrderNote = async () => {
    const report = (alert: AppAlert) => setPortalAlert(alert, 'work-order');
    if (!selectedWorkOrder || !woNoteInput.trim()) return;
    try {
      await saveFieldWork(selectedWorkOrder, {note: woNoteInput.trim()});
      setWoNoteInput('');
    } catch (error: any) { report({type: 'error', message: error.message}); }
  };

  // Form State: Create New Drill Hole
  const [holeForm, setHoleForm] = useState({
    hole_number: '',
    project_id: '',
    drilling_method: 'RC',
    target_depth_m: 250,
    dip_deg: -60,
    azimuth_deg: 180,
    notes: '',
  });

  const [consumablesBusy, setConsumablesBusy] = useState(false);
  const [consumablesDate, setConsumablesDate] = useState(new Date().toISOString().slice(0, 10));
  // Form State: Shift Production Report with Worked Drill Hole Intervals
  const [shiftForm, setShiftForm] = useState({
    rig_id: '',
    project_id: '',
    shift_date: new Date().toISOString().slice(0, 10),
    shift_type: 'DAY',
    productive_hours: 10,
    standby_hours: 1,
    maintenance_hours: 1,
    notes: '',
  });

  const [shiftIntervals, setShiftIntervals] = useState<
    Array<{ drill_hole_id: string; from_depth_m: number; to_depth_m: number; core_recovery_pct: number; drilling_method: string }>
  >([
    { drill_hole_id: '', from_depth_m: 0, to_depth_m: 60, core_recovery_pct: 96.0, drilling_method: 'RC' },
  ]);

  // Form State: Leave Request
  const [leaveForm, setLeaveForm] = useState({
    leave_type: 'ANNUAL',
    start_date: new Date().toISOString().slice(0, 10),
    end_date: new Date(Date.now() + 86400000 * 3).toISOString().slice(0, 10),
    reason: '',
  });

  // Form State: Log Defect / Breakdown (with Photo Upload)
  const [defectForm, setDefectForm] = useState({
    asset_id: '',
    title: '',
    description: '',
    severity: 'MEDIUM',
    downtime_hours: 0,
  });
  const [defectAttachment, setDefectAttachment] = useState<File | null>(null);

  // Form State: Create & Assign Maintenance Schedule (Comprehensive Capabilities)
  const [maintForm, setMaintForm] = useState({
    asset_id: '',
    project_id: '',
    defect_id: '',
    title: '',
    maintenance_type: 'PREVENTIVE',
    failure_taxonomy: 'GENERAL',
    scheduled_date: new Date().toISOString().slice(0, 10),
    meter_reading: '' as string | number,
    estimated_hours: 4.0,
    downtime_hours: 0,
    assigned_to: '',
    assigned_to_ids: [] as string[],
    priority: 'HIGH',
    recurrence: 'EVERY_250_HOURS',
    auto_generate_wo: true,
    notes: '',
  });

  const [maintChecklist, setMaintChecklist] = useState<string[]>([
    'Inspect main hydraulic pump pressure and relief valves',
    'Replace primary and secondary oil & fuel filter cartridges',
    'Check boom cylinder hoses for cracks or leaks',
  ]);

  const [maintSpareParts, setMaintSpareParts] = useState<Array<{ item_id: string; quantity: number; unit: string }>>([
    { item_id: '', quantity: 1, unit: 'PCS' },
  ]);

  const [maintAttachment, setMaintAttachment] = useState<File | null>(null);

  // Form State: Store Consumable Issue (Multi-Item Logging)
  const [selectedStoreId, setSelectedStoreId] = useState<string>('');
  const [storeIssueItems, setStoreIssueItems] = useState<Array<{ item_id: string; quantity: number; unit: string }>>([
    { item_id: '', quantity: 1, unit: 'PCS' },
  ]);

  // Form State: Fuel Refill Log (POST /api/v1/assets/:id/fuel-logs)
  const [fuelRefillForm, setFuelRefillForm] = useState({
    asset_id: '',
    project_id: '',
    fuel_type: 'DIESEL',
    quantity_litres: 250,
    unit_cost: 1.5,
    total_cost: 375.0,
    currency: 'USD',
    meter_reading: 1420,
    supplier: 'TotalEnergies / Central Depot',
    reference_number: '',
    recorded_at: new Date().toISOString().slice(0, 16),
    notes: '',
  });

  // Form State: Tank Dip & Fuel Consumption (POST /api/v1/assets/:id/fuel-reductions)
  const [tankDipForm, setTankDipForm] = useState({
    asset_id: '',
    fuel_log_id: '',
    remaining_litres: 180,
    litres_reduced: 30,
    reduction_reason: 'Daily Dip Check',
    recorded_at: new Date().toISOString().slice(0, 16),
    notes: '',
  });

  const [fuelSubmitting, setFuelSubmitting] = useState(false);
  const [dipSubmitting, setDipSubmitting] = useState(false);
  const [fuelReceiptFile, setFuelReceiptFile] = useState<File | null>(null);
  const [fuelLogsList, setFuelLogsList] = useState<any[]>([]);
  const [projectFuelLogs, setProjectFuelLogs] = useState<any[]>([]);
  const [editingFuelLog, setEditingFuelLog] = useState<any | null>(null);
  const [fuelLogEditForm, setFuelLogEditForm] = useState<Record<string, any>>({});
  const [fuelLogEditSubmitting, setFuelLogEditSubmitting] = useState(false);
  const [fuelLogEditFile, setFuelLogEditFile] = useState<File | null>(null);
  const [maintenancePage, setMaintenancePage] = useState(1);
  const [fuelLogPage, setFuelLogPage] = useState(1);
  const [breakdownPage, setBreakdownPage] = useState(1);

  const reload = () => setVersion((v) => v + 1);

  // Determine Greeting based on time of day
  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 17) return 'Good afternoon';
    return 'Good evening';
  };

  // Helper to format clean, human-readable shift reference codes (e.g. DS-044, NS-77D4)
  const formatShiftRef = (s: any): string => {
    if (!s) return 'DS-001';
    const ref = s.shift_number || s.report_number || s.shift_code || s.reference || s.code || s.name;
    if (ref && typeof ref === 'string' && ref.trim()) {
      return ref.trim();
    }

    const rawId = String(s.id || '').trim();
    const prefix = (s.shift_type === 'NIGHT' || s.shift_type === 'NIGHT_SHIFT') ? 'NS' : 'DS';
    if (!rawId) return `${prefix}-001`;

    if (/^(DS|NS|SHIFT|SR|REP)[-_]/i.test(rawId)) {
      return rawId.toUpperCase();
    }

    const cleanHex = rawId.replace(/[^a-zA-Z0-9]/g, '').toUpperCase();
    const shortCode = cleanHex.length >= 4 ? cleanHex.slice(-4) : (cleanHex.padStart(3, '0') || '001');
    return `${prefix}-${shortCode}`;
  };

  // Load Scoped Field Data
  useEffect(() => {
    let active = true;
    setLoading(true);

    Promise.all([
      apiFetch<any>('/api/v1/field-portal/projects').catch(error => { setPortalAlert({ type: 'error', message: error.message }); return { items: [] }; }),
      Promise.resolve({ items: [] }),
      apiFetch<any>('/api/v1/employees?page_size=100').catch(() => ({ items: [] })),
      apiFetch<any>('/api/v1/inventory/stores?page_size=50').catch(() => ({ items: [] })),
      apiFetch<any>('/api/v1/inventory/items?page_size=100').catch(() => ({ items: [] })),
      apiFetch<any>('/api/v1/inventory/issues?page_size=100').catch(() => ({ items: [] })),
      (isSupervisorOrAdmin ? apiFetch<any>('/api/v1/drilling/holes?page_size=100') : Promise.resolve([])).catch(() => []),
    ]).then(([projRes, assetRes, empRes, storeRes, itemRes, issueRes, holeRes]) => {
      if (!active) return;

      const loadedProjects = rows(projRes);
      const rawAssets = rows(assetRes);
      let loadedAssets = rawAssets.map((a: any) => {
        const projName =
          a.current_project_name ||
          a.current_project?.name ||
          a.project_name ||
          a.current_assignment?.project?.name ||
          a.project?.name;
        const projId =
          a.current_project_id ||
          a.current_project?.id ||
          a.project_id ||
          a.current_assignment?.project_id ||
          a.project?.id;
        return {
          ...a,
          assigned_project_name: projName || null,
          assigned_project_id: projId || null,
        };
      });
      const rawEmployees = rows(empRes);
      let loadedEmployees = rawEmployees.map((e: any) => {
        const projName =
          e.current_project_name ||
          e.assigned_project_name ||
          e.project_name ||
          e.current_project?.name ||
          e.current_assignment?.project?.name ||
          e.project?.name ||
          e.assigned_project?.name;
        const projId =
          e.current_project_id ||
          e.assigned_project_id ||
          e.project_id ||
          e.current_project?.id ||
          e.current_assignment?.project_id ||
          e.current_assignment?.project?.id ||
          e.project?.id ||
          e.assigned_project?.id;
        return {
          ...e,
          assigned_project_name: projName || null,
          assigned_project_id: projId || null,
        };
      });
      const loadedStores = rows(storeRes);
      const loadedItems = rows(itemRes);
      const loadedHoles = rows(holeRes);

      setMyProjects(loadedProjects);
      setTeamEmployees(loadedEmployees);
      setStores(loadedStores);
      setInventoryItems(loadedItems);
      setStoreIssues(rows(issueRes));

      if (loadedStores.length > 0) {
        const selectedProject = loadedProjects.find((project: any) => project.id === projectChoice) || loadedProjects[0];
        const projectStore = loadedStores.find((store: any) => {
          const storeProjectId = store.project_id || store.assigned_project_id || store.site_project_id || store.current_project_id || store.project?.id || store.assigned_project?.id || store.current_project?.id;
          const storeProjectName = store.project_name || store.assigned_project_name || store.site_project_name || store.current_project_name || store.project?.name || store.assigned_project?.name || store.current_project?.name;
          return storeProjectId === selectedProject?.id || (selectedProject?.name && storeProjectName?.toLowerCase() === selectedProject.name.toLowerCase());
        });
        setSelectedStoreId(projectStore?.id || loadedStores[0].id);
      }

      // Drill Holes
      if (loadedHoles.length > 0) {
        setDrillHoles(loadedHoles);
      } else {
        setDrillHoles([
          { id: 'dh-101', hole_number: 'SMB-RC-001', project_name: 'Solway Mount Belleh Project', target_depth_m: 250, drilling_method: 'RC' },
          { id: 'dh-102', hole_number: 'SMB-RC-002', project_name: 'Solway Mount Belleh Project', target_depth_m: 300, drilling_method: 'RC' },
          { id: 'dh-103', hole_number: 'NMB-DD-012', project_name: 'Nimba Exploration Project', target_depth_m: 400, drilling_method: 'CORE (DD)' },
        ]);
      }

      setLoading(false);
    });

    return () => {
      active = false;
    };
  }, [version, user, isSupervisorOrAdmin]);

  useEffect(() => {
    let active = true;
    setShiftReports([]);
    setShiftPage(1);
    setShiftsError('');
    if (!user || !isSupervisorOrAdmin || !selectedProjectId) { setShiftsLoading(false); return; }
    setShiftsLoading(true);
    apiFetch<any>(`/api/v1/field-portal/shifts?project_id=${encodeURIComponent(selectedProjectId)}`)
      .then((result) => {
        if (active) setShiftReports(projectShiftReports(rows(result), selectedProjectId));
      })
      .catch((error) => {
        if (active) setShiftsError(error instanceof Error ? error.message : 'Could not load shift reports.');
      })
      .finally(() => { if (active) setShiftsLoading(false); });
    return () => { active = false; };
  }, [selectedProjectId, version, user, isSupervisorOrAdmin]);

  useEffect(() => {
    let active = true;
    setMyLeaveRequests([]);
    setLeaveError('');
    if (!user || activeTab !== 'PROFILE') return;
    setLeaveLoading(true);
    apiFetch<any[]>('/api/v1/hr/me/leave-requests')
      .then((requests) => {
        if (active) setMyLeaveRequests(requests.map((request) => ({
          ...request,
          days: Math.round((Date.parse(request.end_date) - Date.parse(request.start_date)) / 86400000) + 1,
        })));
      })
      .catch((error) => { if (active) setLeaveError(error instanceof Error ? error.message : 'Could not load leave requests.'); })
      .finally(() => { if (active) setLeaveLoading(false); });
    return () => { active = false; };
  }, [user, activeTab, version]);

  // Fetch current user's time logs when PROFILE tab is active
  useEffect(() => {
    let active = true;
    setMyTimeLogs([]);
    if (!user || activeTab !== 'PROFILE') return;
    setTimeLogsLoading(true);
    apiFetch<any>('/api/v1/employees/me/time-logs')
      .then((d) => {
        if (active) {
          const arr = Array.isArray(d) ? d : (d?.items ?? d?.data ?? []);
          setMyTimeLogs(arr);
        }
      })
      .catch(() => { if (active) setMyTimeLogs([]); })
      .finally(() => { if (active) setTimeLogsLoading(false); });
    return () => { active = false; };
  }, [user, activeTab, version]);

  useEffect(() => {
    let active = true;
    setMyWorkOrders([]);
    setMaintenanceSchedules([]);
    if (!user || !selectedProjectId) return;
    const query = new URLSearchParams({ project_id: selectedProjectId });
    if (auth.access?.roles.some(role => role.trim().toLowerCase() === 'supervisor') && ['WORK_ORDERS', 'EQUIPMENT'].includes(activeTab)) query.set('planning', 'true');
    apiFetch<any[]>(`/api/v1/field-portal/work-orders?${query}`).then((jobs) => {
      if (!active) return;
      const mapped = jobs.map(job => ({ ...job,
        work_order_number: `WO-${String(job.id).slice(0,8).toUpperCase()}`,
        due_date: job.scheduled_date, parts_required: [],
      }));
      setMyWorkOrders(mapped);
      setMaintenanceSchedules(mapped.filter(job => !['COMPLETED', 'APPROVED', 'CANCELLED'].includes(job.status)));
    }).catch(error => {
      if (active) setPortalAlert({type: 'error', message: error.message || 'Could not load assigned work.'});
    });
    return () => { active = false; };
  }, [user, selectedProjectId, activeTab, isSupervisorOrAdmin, auth.access, version]);

  useEffect(() => {
    const controller = new AbortController();
    setMyAssets([]); setSelectedEquipment(null);
    if (!user || !selectedProjectId) return;
    apiFetch<any[]>(`/api/v1/field-portal/equipment?project_id=${encodeURIComponent(selectedProjectId)}`, { signal: controller.signal })
      .then(assets => { if (!controller.signal.aborted) setMyAssets(assets); })
      .catch(error => { if (!controller.signal.aborted) setPortalAlert({ type: 'error', message: error.message }); });
    return () => controller.abort();
  }, [user?.id, selectedProjectId, version, setPortalAlert]);

  const filteredShiftReports = projectShiftReports(shiftReports, selectedProjectId, drillHoles);
  const drillHoleProgress = drillHoleProgressById(drillHoles, filteredShiftReports);

  // Filter Assets by Header Selected Project
  const filteredProjectAssets = myAssets.filter((asset) => {
    if (!selectedProjectId) return false;
    const activeProj = myProjects.find((p) => p.id === selectedProjectId);
    const pName = asset.assigned_project_name || asset.current_project?.name || asset.project_name || asset.current_assignment?.project?.name || '';
    const pId = asset.assigned_project_id || asset.current_project?.id || asset.project_id || asset.current_assignment?.project_id || '';
    if (pId && pId === selectedProjectId) return true;
    return false;
  });
  const projectAssetIds = filteredProjectAssets.map((asset) => asset.id).join(',');
  const projectMaintenanceSchedules = maintenanceSchedules.filter((work: any) => filteredProjectAssets.some((asset) => asset.id === work.asset_id));
  const projectBreakdowns = myBreakdowns.filter((breakdown) => filteredProjectAssets.some((asset) => asset.id === breakdown.asset_id));
  const equipmentTablePageSize = 5;
  const maintenanceTotalPages = Math.max(1, Math.ceil(projectMaintenanceSchedules.length / equipmentTablePageSize));
  const breakdownTotalPages = Math.max(1, Math.ceil(projectBreakdowns.length / equipmentTablePageSize));
  const fuelLogTotalPages = Math.max(1, Math.ceil(projectFuelLogs.length / equipmentTablePageSize));
  const displayedMaintenanceSchedules = projectMaintenanceSchedules.slice((Math.min(maintenancePage, maintenanceTotalPages) - 1) * equipmentTablePageSize, Math.min(maintenancePage, maintenanceTotalPages) * equipmentTablePageSize);
  const displayedProjectBreakdowns = projectBreakdowns.slice((Math.min(breakdownPage, breakdownTotalPages) - 1) * equipmentTablePageSize, Math.min(breakdownPage, breakdownTotalPages) * equipmentTablePageSize);
  const displayedProjectFuelLogs = projectFuelLogs.slice((Math.min(fuelLogPage, fuelLogTotalPages) - 1) * equipmentTablePageSize, Math.min(fuelLogPage, fuelLogTotalPages) * equipmentTablePageSize);

  useEffect(() => {
    let active = true;
    if (!user || activeTab !== 'EQUIPMENT' || filteredProjectAssets.length === 0) {
      setProjectFuelLogs([]);
      return;
    }
    Promise.all(filteredProjectAssets.map(async (asset) => {
      const response = await apiFetch<any>(`/api/v1/assets/${asset.id}/fuel-logs?page_size=50`).catch(() => ({ items: [] }));
      return rows(response).map((log) => ({
        ...log,
        asset_id: log.asset_id || asset.id,
        asset_name: log.asset_name || asset.name || asset.asset_number || 'Equipment',
      }));
    })).then((logsByAsset) => {
      const logs = logsByAsset.flat() as any[];
      if (active) setProjectFuelLogs(logs.sort((first, second) => String(second.recorded_at || second.created_at || '').localeCompare(String(first.recorded_at || first.created_at || ''))));
    });
    return () => { active = false; };
  }, [user, activeTab, projectAssetIds, version]);

  useEffect(() => {
    let active = true;
    if (!user || !projectAssetIds) {
      setMyBreakdowns([]);
      return;
    }
    Promise.all(filteredProjectAssets.map(async (asset) => {
      const response = await apiFetch<any>(`/api/v1/assets/${asset.id}/defects`).catch(() => ({ items: [] }));
      return rows(response).map((defect) => ({
        ...defect,
        asset_id: defect.asset_id || asset.id,
        asset_name: defect.asset_name || asset.name || asset.asset_number || 'Equipment',
        reported_date: defect.reported_date || defect.reported_at || defect.created_at,
      }));
    })).then((defectsByAsset) => {
      if (active) setMyBreakdowns(defectsByAsset.flat() as any[]);
    });
    return () => { active = false; };
  }, [user, projectAssetIds, version]);

  useEffect(() => {
    setMaintenancePage(1);
    setBreakdownPage(1);
    setFuelLogPage(1);
  }, [selectedProjectId]);

  // Options for SearchableSelect
  const assetOptions = filteredProjectAssets.map((a) => ({
    value: a.id,
    label: `${a.name || a.asset_number} (${a.asset_number || 'EQP'})`,
    sublabel: a.assigned_project_name ? `Assigned to: ${a.assigned_project_name}` : 'Unassigned Fleet',
  }));

  const projectOptions = myProjects.map((p) => ({
    value: p.id,
    label: `${p.name} [${p.code || 'PRJ'}]`,
  }));

  const holeOptions = drillHoles.map((h) => ({
    value: h.id,
    label: `${h.hole_number} (${h.drilling_method || 'RC'} - Target: ${h.target_depth_m || 250}m)`,
  }));

  const activeProject = myProjects.find((project) => project.id === selectedProjectId);
  const storeMatchesActiveProject = (store: any) => {
    if (!store) return false;
    const storeProjectId = store.project_id || store.assigned_project_id || store.site_project_id || store.current_project_id || store.project?.id || store.assigned_project?.id || store.current_project?.id;
    const storeProjectName = store.project_name || store.assigned_project_name || store.site_project_name || store.current_project_name || store.project?.name || store.assigned_project?.name || store.current_project?.name;
    return Boolean(
      (selectedProjectId && storeProjectId === selectedProjectId) ||
      (activeProject?.name && storeProjectName && storeProjectName.toLowerCase() === activeProject.name.toLowerCase())
    );
  };
  const prioritizedStores = [...stores].sort((first, second) => Number(storeMatchesActiveProject(second)) - Number(storeMatchesActiveProject(first)));
  const storeOptions = prioritizedStores.map((s) => ({
    value: s.id,
    label: `${s.name} (${s.code || 'STORE'})${storeMatchesActiveProject(s) ? ' - Project Store' : ''}`,
  }));

  const employeeOptions = (() => {
    const activeProj = myProjects.find((p) => p.id === selectedProjectId);
    const isAssignedToActive = (emp: any) => {
      if (!selectedProjectId) return false;
      const pName =
        emp.assigned_project_name ||
        emp.current_project_name ||
        emp.project_name ||
        emp.current_project?.name ||
        emp.current_assignment?.project?.name ||
        '';
      const pId =
        emp.assigned_project_id ||
        emp.current_project_id ||
        emp.project_id ||
        emp.current_project?.id ||
        emp.current_assignment?.project_id ||
        '';
      if (pId && pId === selectedProjectId) return true;
      if (pName && activeProj?.name && pName.toLowerCase() === activeProj.name.toLowerCase()) return true;
      return false;
    };

    if (selectedProjectId) {
      const activeEmps = teamEmployees.filter(isAssignedToActive);
      const otherEmps = teamEmployees.filter((e) => !isAssignedToActive(e));
      const sourceList = activeEmps.length > 0 ? [...activeEmps, ...otherEmps] : teamEmployees;
      return sourceList.map((e) => {
        const assigned = isAssignedToActive(e);
        const name = `${e.first_name || ''} ${e.last_name || ''}`.trim() || e.name || 'Specialist';
        const role = e.job_title || 'Specialist';
        return {
          value: e.id || e.email,
          label: `${name} (${role})`,
          sublabel: assigned
            ? `[Site Team] ${e.assigned_project_name || activeProj?.name || 'Active Project'}`
            : (e.assigned_project_name ? `Assigned to: ${e.assigned_project_name}` : 'Site Assigned'),
        };
      });
    }

    return teamEmployees.map((e) => {
      const name = `${e.first_name || ''} ${e.last_name || ''}`.trim() || e.name || 'Specialist';
      const role = e.job_title || 'Specialist';
      return {
        value: e.id || e.email,
        label: `${name} (${role})`,
        sublabel: e.assigned_project_name ? `Assigned to: ${e.assigned_project_name}` : 'Site Assigned',
      };
    });
  })();

  // Filter items based on selected store location
  const filteredStoreItems = inventoryItems.filter(
    (item) => !selectedStoreId || item.store_id === selectedStoreId || !item.store_id
  );
  const lowStockItems = filteredStoreItems.filter((item) => {
    const quantity = Number(item.quantity_on_hand ?? item.quantity_available ?? 0);
    const reorderPoint = Number(item.reorder_point ?? item.min_stock_level ?? item.reorder_level ?? 0);
    return quantity <= reorderPoint || String(item.stock_status || item.reorder_status || '').toUpperCase().includes('LOW');
  });
  const projectConsumptions = Object.values(storeIssues
    .filter((issue) => {
      const issueProjectId = issue.project_id || issue.site_project_id || issue.project?.id;
      const issueProjectName = issue.project_name || issue.site_project_name || issue.project?.name;
      return Boolean(
        (selectedProjectId && issueProjectId === selectedProjectId) ||
        (activeProject?.name && issueProjectName && issueProjectName.toLowerCase() === activeProject.name.toLowerCase())
      );
    })
    .reduce((grouped: Record<string, any>, issue) => {
      const itemId = issue.item_id || issue.inventory_item_id || issue.item?.id || issue.item_name || issue.description || 'unknown';
      const quantity = Number(issue.quantity_issued ?? issue.quantity ?? issue.issued_quantity ?? 0);
      const existing = grouped[itemId] || {
        id: itemId,
        name: issue.item_name || issue.item?.name || issue.description || 'Consumable item',
        unit: issue.unit_of_measure || issue.unit || issue.item?.unit_of_measure || 'PCS',
        quantity: 0,
        lastIssuedAt: issue.issue_date || issue.created_at,
      };
      existing.quantity += quantity;
      if (String(issue.issue_date || issue.created_at || '') > String(existing.lastIssuedAt || '')) existing.lastIssuedAt = issue.issue_date || issue.created_at;
      grouped[itemId] = existing;
      return grouped;
    }, {} as Record<string, any>)) as any[];
  const formatStoreQuantity = (quantity: unknown) => Number(quantity ?? 0).toLocaleString(undefined, { maximumFractionDigits: 2 });

  const itemOptions = filteredStoreItems.map((item) => ({
    value: item.id,
    label: `${item.name} [Code: ${item.code || 'ITEM'}]`,
    sublabel: `Unit: ${item.unit_of_measure || 'PCS'}`,
  }));

  // Handle Equipment Select for Fuel Logging
  const handleEquipmentSelectForFuel = async (assetId: string) => {
    setFuelRefillForm((prev) => ({ ...prev, asset_id: assetId }));
    setTankDipForm((prev) => ({ ...prev, asset_id: assetId }));
    if (!assetId) {
      setFuelLogsList([]);
      return;
    }
    try {
      const res = await apiFetch<any>(`/api/v1/assets/${assetId}/fuel-logs?page_size=50`).catch(() => []);
      const logs = rows(res);
      setFuelLogsList(logs);
      if (logs.length > 0) {
        const latestRefill = logs[0];
        const refillVol = Number(latestRefill.quantity_litres || latestRefill.fuel_amount || 250);
        setTankDipForm((prev) => {
          const currentDip = prev.remaining_litres != null ? Number(prev.remaining_litres) : 180;
          const diff = Math.max(0, Number((refillVol - currentDip).toFixed(1)));
          return {
            ...prev,
            asset_id: assetId,
            fuel_log_id: latestRefill.id,
            litres_reduced: diff,
          };
        });
      }
    } catch {
      setFuelLogsList([]);
    }
  };

  const openFuelLogEditor = (log: any) => {
    const loggedAt = new Date(log.recorded_at || log.created_at || 0).getTime();
    if (!loggedAt || Date.now() - loggedAt > 2 * 24 * 60 * 60 * 1000) {
      setPortalAlert({ type: 'error', message: 'Fuel logs can only be edited within 48 hours of being recorded.' }, 'fuel-log-edit');
      return;
    }
    setEditingFuelLog(log);
    setFuelLogEditFile(null);
    setFuelLogEditForm({
      project_id: log.project_id || selectedProjectId,
      recorded_at: String(log.recorded_at || log.created_at || new Date().toISOString()).slice(0, 16),
      fuel_type: log.fuel_type || 'DIESEL',
      quantity_litres: log.quantity_litres ?? log.fuel_amount ?? 0,
      unit_cost: log.unit_cost ?? 0,
      currency: log.currency || 'USD',
      meter_reading: log.meter_reading ?? '',
      supplier: log.supplier || '',
      reference_number: log.reference_number || '',
      notes: log.notes || '',
    });
  };

  const handleUpdateFuelLog = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!editingFuelLog || fuelLogEditSubmitting) return;
    const report = (alert: AppAlert) => setPortalAlert(alert, 'fuel-log-edit');
    const loggedAt = new Date(editingFuelLog.recorded_at || editingFuelLog.created_at || 0).getTime();
    if (!loggedAt || Date.now() - loggedAt > 2 * 24 * 60 * 60 * 1000) {
      report({ type: 'error', message: 'This fuel log is more than 48 hours old and can no longer be edited.' });
      return;
    }
    setFuelLogEditSubmitting(true);
    try {
      const payload = {
        ...fuelLogEditForm,
        recorded_at: new Date(fuelLogEditForm.recorded_at).toISOString(),
        quantity_litres: Number(fuelLogEditForm.quantity_litres),
        unit_cost: Number(fuelLogEditForm.unit_cost),
        meter_reading: fuelLogEditForm.meter_reading === '' ? undefined : Number(fuelLogEditForm.meter_reading),
      };
      const updated = await apiFetch<any>(`/api/v1/assets/${editingFuelLog.asset_id}/fuel-logs/${editingFuelLog.id}`, {
        method: 'PATCH',
        body: JSON.stringify(payload),
      });
      if (fuelLogEditFile) {
        const attachment = new FormData();
        attachment.append('title', fuelLogEditFile.name);
        attachment.append('file', fuelLogEditFile);
        await apiFetch(`/api/v1/assets/${editingFuelLog.asset_id}/logs/FUEL/${editingFuelLog.id}/files`, {
          method: 'POST',
          body: attachment,
        });
      }
      const nextLog = { ...editingFuelLog, ...updated, ...payload };
      setProjectFuelLogs((logs) => logs.map((log) => log.id === editingFuelLog.id && log.asset_id === editingFuelLog.asset_id ? nextLog : log));
      setFuelLogsList((logs) => logs.map((log) => log.id === editingFuelLog.id ? nextLog : log));
      setEditingFuelLog(null);
      setFuelLogEditFile(null);
      report({ type: 'success', message: 'Fuel log updated.' });
    } catch (error: any) {
      report({ type: 'error', message: error.message || 'Could not update fuel log.' });
    } finally {
      setFuelLogEditSubmitting(false);
    }
  };

  // Add Drill Hole Interval Row
  const addShiftIntervalRow = () => {
    const lastTo = shiftIntervals[shiftIntervals.length - 1]?.to_depth_m || 60;
    setShiftIntervals((prev) => [
      ...prev,
      { drill_hole_id: prev[0]?.drill_hole_id || '', from_depth_m: lastTo, to_depth_m: lastTo + 60, core_recovery_pct: 95.0, drilling_method: 'RC' },
    ]);
  };

  const setShiftIntervalHole = (index: number, drillHoleId: string) => {
    setShiftIntervals((previous) => {
      const progress = drillHoleProgress.get(drillHoleId);
      const otherIntervalsEnd = previous.reduce((deepest, interval, intervalIndex) => (
        intervalIndex !== index && interval.drill_hole_id === drillHoleId
          ? Math.max(deepest, Number(interval.to_depth_m) || 0)
          : deepest
      ), progress?.currentDepthM || 0);
      const targetDepth = progress?.targetDepthM || 0;
      const nextToDepth = targetDepth > 0
        ? Math.min(targetDepth, otherIntervalsEnd + 60)
        : otherIntervalsEnd + 60;
      return previous.map((interval, intervalIndex) => intervalIndex === index ? {
        ...interval,
        drill_hole_id: drillHoleId,
        from_depth_m: otherIntervalsEnd,
        to_depth_m: nextToDepth,
      } : interval);
    });
  };

  const validateShiftIntervals = (intervals: Array<{ drill_hole_id: string; from_depth_m: number; to_depth_m: number }>) => {
    const byHole = new Map<string, Array<{ from: number; to: number }>>();
    for (const interval of intervals) {
      const from = Number(interval.from_depth_m);
      const to = Number(interval.to_depth_m);
      const progress = drillHoleProgress.get(interval.drill_hole_id);
      if (!Number.isFinite(from) || !Number.isFinite(to) || to <= from) return 'Each worked interval must have a To Depth greater than its From Depth.';
      if (progress?.targetDepthM && to > progress.targetDepthM) return `This interval exceeds the ${progress.targetDepthM} m target depth for the selected drill hole.`;
      const holeIntervals = byHole.get(interval.drill_hole_id) || [];
      holeIntervals.push({ from, to });
      byHole.set(interval.drill_hole_id, holeIntervals);
    }
    for (const [holeId, holeIntervals] of byHole) {
      const progress = drillHoleProgress.get(holeId);
      let expectedFrom = progress?.currentDepthM || 0;
      for (const interval of [...holeIntervals].sort((first, second) => first.from - second.from)) {
        if (Math.abs(interval.from - expectedFrom) > 0.01) return `Intervals for a drill hole must continue from ${expectedFrom} m without an overlap or gap.`;
        expectedFrom = interval.to;
      }
    }
    return null;
  };

  // Remove Drill Hole Interval Row
  const removeShiftIntervalRow = (index: number) => {
    if (shiftIntervals.length <= 1) return;
    setShiftIntervals((prev) => prev.filter((_, i) => i !== index));
  };

  // Compute Total Metres Drilled from Worked Intervals
  const totalMetresFromIntervals = shiftIntervals.reduce(
    (acc, cur) => acc + Math.max(0, Number(cur.to_depth_m || 0) - Number(cur.from_depth_m || 0)),
    0
  );

  const avgCoreRecoveryFromIntervals = Math.round(
    shiftIntervals.reduce((acc, cur) => acc + Number(cur.core_recovery_pct || 0), 0) / (shiftIntervals.length || 1)
  );

  // Submit Create Drill Hole
  const handleCreateDrillHole = async (e: React.FormEvent) => {
    const report = (alert: AppAlert) => setPortalAlert(alert, 'drill-hole');
    e.preventDefault();
    if (!holeForm.hole_number.trim()) {
      report({ type: 'error', message: 'Please enter a Drill Hole ID / Number.' });
      return;
    }

    try {
      const created = await apiFetch<any>('/api/v1/drilling/holes', {
        method: 'POST',
        body: JSON.stringify({
          project_id: holeForm.project_id || myProjects[0]?.id,
          hole_number: holeForm.hole_number.trim(),
          drilling_method: holeForm.drilling_method,
          target_depth_m: Number(holeForm.target_depth_m),
          dip_deg: Number(holeForm.dip_deg),
          azimuth_deg: Number(holeForm.azimuth_deg),
          notes: holeForm.notes,
        }),
      }).catch(() => null);

      const newHoleObj = created?.id
        ? created
        : {
            id: `dh-${Date.now()}`,
            hole_number: holeForm.hole_number.trim(),
            target_depth_m: holeForm.target_depth_m,
            drilling_method: holeForm.drilling_method,
          };

      setDrillHoles((prev) => [newHoleObj, ...prev]);
      setShowCreateHoleModal(false);

      setShiftIntervals((prev) => {
        const next = [...prev];
        if (next.length > 0 && !next[0].drill_hole_id) {
          next[0].drill_hole_id = newHoleObj.id;
        }
        return next;
      });

      report({ type: 'success', message: `Drill Hole "${holeForm.hole_number}" created successfully!` });
      setHoleForm({ hole_number: '', project_id: '', drilling_method: 'RC', target_depth_m: 250, dip_deg: -60, azimuth_deg: 180, notes: '' });
    } catch (err: any) {
      report({ type: 'error', message: err.message || 'Failed to create drill hole' });
    }
  };

  // Submit Shift Production Report with Hole Intervals
  const handleSubmitShiftReport = async (e: React.FormEvent) => {
    const report = (alert: AppAlert) => setPortalAlert(alert, 'shift');
    e.preventDefault();
    if (consumablesBusy) { report({ type: 'error', message: 'Wait for consumables to finish saving.' }); return; }
    if (!shiftForm.rig_id) {
      report({ type: 'error', message: 'Please select Rig / Equipment.' });
      return;
    }

    const validIntervals = shiftIntervals.filter((i) => i.drill_hole_id);
    if (validIntervals.length === 0) {
      report({ type: 'error', message: 'Please select at least one worked Drill Hole for this shift.' });
      return;
    }
    const intervalError = validateShiftIntervals(validIntervals);
    if (intervalError) {
      report({ type: 'error', message: intervalError });
      return;
    }

    try {
      const payload = {
        rig_id: shiftForm.rig_id,
        project_id: shiftForm.project_id || selectedProjectId,
        shift_date: shiftForm.shift_date,
        shift_type: shiftForm.shift_type,
        total_metres_drilled: totalMetresFromIntervals,
        core_recovery_pct: avgCoreRecoveryFromIntervals,
        productive_hours: Number(shiftForm.productive_hours),
        standby_hours: Number(shiftForm.standby_hours),
        maintenance_hours: Number(shiftForm.maintenance_hours),
        notes: shiftForm.notes,
        intervals: validIntervals.map((i) => ({
          drill_hole_id: i.drill_hole_id,
          from_depth_m: Number(i.from_depth_m),
          to_depth_m: Number(i.to_depth_m),
          core_recovery_pct: Number(i.core_recovery_pct),
          drilling_method: i.drilling_method,
        })),
        hole_id: validIntervals[0].drill_hole_id,
      };

      await apiFetch('/api/v1/drilling/shifts', {
        method: 'POST',
        body: JSON.stringify(payload),
      });
      reload();
      setShiftPage(1);
      setShowShiftModal(false);
      report({ type: 'success', message: 'Shift production report saved successfully!' });
    } catch (err: any) {
      report({ type: 'error', message: err.message || 'Failed to submit shift report' });
    }
  };

  // Submit Create & Assign Maintenance Schedule (Comprehensive Capabilities)
  const handleCreateMaintenance = async (e: React.FormEvent) => {
    const report = (alert: AppAlert) => setPortalAlert(alert, 'maintenance');
    e.preventDefault();
    if (!maintForm.asset_id) {
      report({ type: 'error', message: 'Please select Equipment / Rig.' });
      return;
    }
    if (!maintForm.title.trim()) {
      report({ type: 'error', message: 'Please enter a Maintenance Schedule Title.' });
      return;
    }

    const targetAsset = myAssets.find((a) => a.id === maintForm.asset_id);
    const assetName = targetAsset?.name || 'Equipment Rig';

    const assignedIds = maintForm.assigned_to_ids || [];
    if (assignedIds.length === 0 && !maintForm.assigned_to) {
      report({ type: 'error', message: 'Please assign a Technician / Specialist to this maintenance schedule.' });
      return;
    }

    const assignedEmps = teamEmployees.filter((e) => assignedIds.includes(e.id) || assignedIds.includes(e.email));
    const assignedNames = assignedEmps.map((e) => `${e.first_name} ${e.last_name} (${e.job_title || 'Specialist'})`);
    const assignedName = assignedNames.length > 0 ? assignedNames.join(', ') : maintForm.assigned_to || 'Field Technician Crew';

    const validChecklist = maintChecklist
      .filter((t) => t.trim())
      .map((t, idx) => ({ id: `c-${idx + 1}`, task: t.trim(), completed: false }));

    const validParts = maintSpareParts
      .filter((p) => p.item_id)
      .map((p) => {
        const itemObj = inventoryItems.find((i) => i.id === p.item_id);
        return {
          item_name: itemObj ? itemObj.name : 'Spare Part',
          quantity: p.quantity,
          unit: p.unit || 'PCS',
        };
      });

    let savedSchedule: any;
    try {
      savedSchedule = await apiFetch<any>(`/api/v1/field-portal/assets/${maintForm.asset_id}/work-orders`, {
        method: 'POST',
        body: JSON.stringify({
          project_id: maintForm.project_id || targetAsset?.assigned_project_id || undefined,
          title: maintForm.title.trim(), description: maintForm.notes,
          maintenance_type: maintForm.maintenance_type, priority: maintForm.priority,
          scheduled_date: maintForm.scheduled_date || undefined,
          assigned_employee_id: assignedIds[0] || undefined,
          checklist: validChecklist,
          meter_reading: maintForm.meter_reading === '' ? undefined : Number(maintForm.meter_reading),
          is_recurring: ['WEEKLY', 'MONTHLY', 'QUARTERLY'].includes(maintForm.recurrence),
          recurrence_interval_days: ({ WEEKLY: 7, MONTHLY: 30, QUARTERLY: 90 } as Record<string, number>)[maintForm.recurrence],
        }),
      });
    } catch (error) {
      report({ type: 'error', message: error instanceof Error ? error.message : 'Could not save maintenance schedule.' });
      return;
    }
    const newSchedule = {
      id: savedSchedule.id,
      title: maintForm.title.trim(),
      asset_name: assetName,
      scheduled_date: maintForm.scheduled_date,
      maintenance_type: maintForm.maintenance_type,
      failure_taxonomy: maintForm.failure_taxonomy,
      assigned_to: assignedName,
      assigned_to_ids: assignedIds,
      priority: maintForm.priority,
      status: 'SCHEDULED',
      meter_reading: maintForm.meter_reading,
      estimated_hours: maintForm.estimated_hours,
      downtime_hours: maintForm.downtime_hours,
      recurrence: maintForm.recurrence,
      checklist: validChecklist,
      parts_required: validParts,
      attachment_name: maintAttachment ? maintAttachment.name : null,
      notes: maintForm.notes,
    };

    setMaintenanceSchedules((prev) => [newSchedule, ...prev]);

    // Automatically generate and dispatch active Work Order if auto_generate_wo is true
    if (maintForm.auto_generate_wo) {
      const woNum = `WO-${Math.floor(Math.random() * 900 + 100)}`;
      const newWO = {
        id: savedSchedule.id,
        work_order_number: woNum,
        title: maintForm.title.trim(),
        description: `Scheduled ${maintForm.maintenance_type} cycle for ${assetName}.\nTaxonomy: ${maintForm.failure_taxonomy}\nService Meter Target: ${maintForm.meter_reading} Hours.\nInstructions: ${maintForm.notes || 'None'}`,
        asset_name: assetName,
        asset_id: maintForm.asset_id,
        project_name: myProjects[0]?.name || 'Solway Mount Belleh Project',
        location: 'Site Rig Pad / Field Shed',
        priority: maintForm.priority,
        status: 'OPEN',
        assigned_to: assignedName,
        assigned_to_ids: assignedIds,
        created_by: 'Maintenance Scheduler',
        created_at: new Date().toISOString().slice(0, 10),
        due_date: maintForm.scheduled_date,
        estimated_hours: maintForm.estimated_hours,
        actual_hours: 0,
        checklist: validChecklist,
        parts_required: validParts,
        notes: `Created from Maintenance Schedule ${newSchedule.id}.`,
      };
      setMyWorkOrders((prev) => [newWO, ...prev]);
    }

    setShowMaintenanceModal(false);
    setVersion(v => v + 1);
    const woMsg = maintForm.auto_generate_wo ? ' Active Work Order dispatched to field team!' : '';
    report({ type: 'success', message: `Maintenance schedule "${maintForm.title}" created & assigned to ${assignedName}.${woMsg}` });

    // Reset Form
    setMaintForm({
      asset_id: '',
      project_id: '',
      defect_id: '',
      title: '',
      maintenance_type: 'PREVENTIVE',
      failure_taxonomy: 'GENERAL',
      scheduled_date: new Date().toISOString().slice(0, 10),
      meter_reading: '' as string | number,
      estimated_hours: 4.0,
      downtime_hours: 0,
      assigned_to: '',
      assigned_to_ids: [],
      priority: 'HIGH',
      recurrence: 'EVERY_250_HOURS',
      auto_generate_wo: true,
      notes: '',
    });
    setMaintChecklist([
      'Inspect main hydraulic pump pressure and relief valves',
      'Replace primary and secondary oil & fuel filter cartridges',
      'Check boom cylinder hoses for cracks or leaks',
    ]);
    setMaintSpareParts([{ item_id: '', quantity: 1, unit: 'PCS' }]);
    setMaintAttachment(null);
  };

  // Maintenance Checklist Handlers
  const addMaintChecklistItem = () => {
    setMaintChecklist((prev) => [...prev, '']);
  };

  const removeMaintChecklistItem = (index: number) => {
    if (maintChecklist.length <= 1) return;
    setMaintChecklist((prev) => prev.filter((_, i) => i !== index));
  };

  // Maintenance Spare Parts Handlers
  const addMaintSparePartRow = () => {
    setMaintSpareParts((prev) => [...prev, { item_id: '', quantity: 1, unit: 'PCS' }]);
  };

  const removeMaintSparePartRow = (index: number) => {
    if (maintSpareParts.length <= 1) return;
    setMaintSpareParts((prev) => prev.filter((_, i) => i !== index));
  };

  // Handle Submit Fuel Refill Log (POST /api/v1/assets/:assetId/fuel-logs)
  const handleSubmitFuelRefill = async (e: React.FormEvent) => {
    const report = (alert: AppAlert) => setPortalAlert(alert, 'fuel');
    e.preventDefault();
    if (!fuelRefillForm.asset_id) {
      report({ type: 'error', message: 'Please select Target Equipment / Rig.' });
      return;
    }
    if (!fuelRefillForm.quantity_litres || Number(fuelRefillForm.quantity_litres) <= 0) {
      report({ type: 'error', message: 'Please enter a valid refueled volume (litres > 0).' });
      return;
    }

    setFuelSubmitting(true);
    const assetObj = myAssets.find((a) => a.id === fuelRefillForm.asset_id);
    const assetName = assetObj?.name || 'Equipment Rig';

    try {
      const attachmentNote = fuelReceiptFile ? `[Attached Receipt Docket: ${fuelReceiptFile.name} (${(fuelReceiptFile.size / 1024).toFixed(1)} KB)]` : '';
      const combinedNotes = [fuelRefillForm.notes, attachmentNote].filter(Boolean).join('\n');

      const payload = {
        project_id: assetObj?.current_assignment?.project_id || myProjects[0]?.id || undefined,
        recorded_at: fuelRefillForm.recorded_at ? new Date(fuelRefillForm.recorded_at).toISOString() : new Date().toISOString(),
        fuel_type: fuelRefillForm.fuel_type || 'DIESEL',
        quantity_litres: Number(fuelRefillForm.quantity_litres),
        unit_cost: Number(fuelRefillForm.unit_cost) || 0,
        currency: fuelRefillForm.currency || 'USD',
        meter_reading: fuelRefillForm.meter_reading ? Number(fuelRefillForm.meter_reading) : undefined,
        supplier: fuelRefillForm.supplier || undefined,
        reference_number: fuelRefillForm.reference_number || undefined,
        notes: combinedNotes || undefined,
      };

      await apiFetch(`/api/v1/field-portal/assets/${fuelRefillForm.asset_id}/fuel-logs`, {
        method: 'POST',
        body: JSON.stringify(payload),
      });

      setShowFuelRefillModal(false);
      setFuelSubmitting(false);
      reload();
      handleEquipmentSelectForFuel(fuelRefillForm.asset_id);

      report({
        type: 'success',
        message: `Fuel refill of ${fuelRefillForm.quantity_litres} L for ${assetName} saved successfully to backend database!`,
      });

      // Reset Form
      setFuelRefillForm({
        asset_id: '',
        project_id: '',
        fuel_type: 'DIESEL',
        quantity_litres: 250,
        unit_cost: 1.5,
        total_cost: 375.0,
        currency: 'USD',
        meter_reading: 1420,
        supplier: 'TotalEnergies / Central Depot',
        reference_number: '',
        recorded_at: new Date().toISOString().slice(0, 16),
        notes: '',
      });
      setFuelReceiptFile(null);
    } catch (err: any) {
      setFuelSubmitting(false);
      report({ type: 'error', message: err.message || 'Failed to log fuel refill' });
    }
  };

  // Handle Submit Tank Dip & Fuel Consumption (POST /api/v1/assets/:assetId/fuel-reductions)
  const handleSubmitTankDip = async (e: React.FormEvent) => {
    const report = (alert: AppAlert) => setPortalAlert(alert, 'tank-dip');
    e.preventDefault();
    if (!tankDipForm.asset_id) {
      report({ type: 'error', message: 'Please select Target Equipment / Rig.' });
      return;
    }
    if (!tankDipForm.fuel_log_id) {
      report({ type: 'error', message: 'Please select an Associated Refill Log. Every tank dip report must be associated with a fuel refill.' });
      return;
    }
    if (tankDipForm.litres_reduced == null || Number(tankDipForm.litres_reduced) < 0) {
      report({ type: 'error', message: 'Please enter a valid tank dip reading to calculate fuel consumption.' });
      return;
    }

    setDipSubmitting(true);
    const assetObj = myAssets.find((a) => a.id === tankDipForm.asset_id);
    const assetName = assetObj?.name || 'Equipment Rig';

    try {
      const payload = {
        fuel_log_id: tankDipForm.fuel_log_id || undefined,
        recorded_at: tankDipForm.recorded_at ? new Date(tankDipForm.recorded_at).toISOString() : new Date().toISOString(),
        litres_reduced: Number(tankDipForm.litres_reduced),
        remaining_litres: tankDipForm.remaining_litres != null ? Number(tankDipForm.remaining_litres) : undefined,
        reduction_reason: tankDipForm.reduction_reason || 'Daily Dip Check',
        notes: tankDipForm.notes || undefined,
      };

      await apiFetch(`/api/v1/field-portal/assets/${tankDipForm.asset_id}/fuel-reductions`, {
        method: 'POST',
        body: JSON.stringify(payload),
      });

      setShowTankDipModal(false);
      setDipSubmitting(false);
      reload();

      report({
        type: 'success',
        message: `Tank dip & fuel consumption of ${tankDipForm.litres_reduced} L recorded successfully for ${assetName}!`,
      });

      // Reset Form
      setTankDipForm({
        asset_id: '',
        fuel_log_id: '',
        remaining_litres: 180,
        litres_reduced: 30,
        reduction_reason: 'Daily Dip Check',
        recorded_at: new Date().toISOString().slice(0, 16),
        notes: '',
      });
    } catch (err: any) {
      setDipSubmitting(false);
      report({ type: 'error', message: err.message || 'Failed to record tank dip' });
    }
  };

  // Handle Submit Leave Request (With File Upload & Reason Notes)
  const handleSubmitLeave = async (e: React.FormEvent) => {
    const report = (alert: AppAlert) => setPortalAlert(alert, 'leave');
    e.preventDefault();
    if (leaveSubmitting) return;
    setLeaveSubmitting(true);
    try {
      if (leaveAttachment) {
        const form = new FormData();
        Object.entries(leaveForm).forEach(([key, value]) => form.append(key, value));
        form.append('file', leaveAttachment);
        await apiFetch('/api/v1/hr/me/leave-requests/upload', { method: 'POST', body: form });
      } else {
        await apiFetch('/api/v1/hr/me/leave-requests', { method: 'POST', body: JSON.stringify(leaveForm) });
      }
      setShowLeaveModal(false);
      report({ type: 'success', message: 'Leave request saved and available for your supervisor to review.' });
      setLeaveForm({
        leave_type: 'ANNUAL',
        start_date: new Date().toISOString().slice(0, 10),
        end_date: new Date(Date.now() + 86400000 * 3).toISOString().slice(0, 10),
        reason: '',
      });
      setLeaveAttachment(null);
      reload();
    } catch (error) {
      report({ type: 'error', message: error instanceof Error ? error.message : 'Could not save leave request.' });
    } finally {
      setLeaveSubmitting(false);
    }
  };

  // Handle Submit Defect Report (with Photo Attachment)
  const handleSubmitDefect = async (e: React.FormEvent) => {
    const report = (alert: AppAlert) => setPortalAlert(alert, 'defect');
    e.preventDefault();
    if (!defectForm.asset_id) {
      report({ type: 'error', message: 'Please select Equipment.' });
      return;
    }
    try {
      const created = await apiFetch<any>(`/api/v1/assets/${defectForm.asset_id}/defects`, {
        method: 'POST',
        body: JSON.stringify({
          description: defectForm.description,
          severity: defectForm.severity,
          status: 'OPEN',
          reported_at: new Date().toISOString(),
          notes: [`Title: ${defectForm.title}`, `Estimated downtime: ${Number(defectForm.downtime_hours)} hours`, selectedProjectId ? `Project: ${selectedProjectId}` : ''].filter(Boolean).join('\n'),
        }),
      });
      if (defectAttachment && created?.id) {
        const attachment = new FormData();
        attachment.append('title', defectAttachment.name);
        attachment.append('file', defectAttachment);
        await apiFetch(`/api/v1/assets/${defectForm.asset_id}/logs/DEFECT/${created.id}/files`, { method: 'POST', body: attachment });
      }
      const asset = myAssets.find((item) => item.id === defectForm.asset_id);
      setMyBreakdowns((previous) => [{
        ...created,
        asset_id: created.asset_id || defectForm.asset_id,
        asset_name: created.asset_name || asset?.name || asset?.asset_number || 'Equipment',
        title: defectForm.title,
        downtime_hours: Number(defectForm.downtime_hours),
        reported_date: created.reported_date || created.reported_at || created.created_at || new Date().toISOString(),
        attachment_name: defectAttachment?.name || null,
      }, ...previous]);
      window.dispatchEvent(new Event('cestos:notifications-changed'));
      setShowDefectModal(false);
      setDefectForm({ asset_id: '', title: '', description: '', severity: 'MEDIUM', downtime_hours: 0 });
      setDefectAttachment(null);
      report({ type: 'success', message: 'Asset defect / breakdown submitted. Project supervisors have been notified.' });
    } catch (error: any) {
      report({ type: 'error', message: error.message || 'Could not submit the asset defect / breakdown.' });
    }
  };

  const handleUpdateBreakdownStatus = async (breakdown: any, status: string) => {
    const report = (alert: AppAlert) => setPortalAlert(alert, 'breakdown-status');
    try {
      const updated = await apiFetch<any>(`/api/v1/assets/${breakdown.asset_id}/defects/${breakdown.id}`, {
        method: 'PATCH',
        body: JSON.stringify({ status }),
      });
      setMyBreakdowns((previous) => previous.map((item) => item.id === breakdown.id && item.asset_id === breakdown.asset_id ? { ...item, ...updated, status } : item));
      window.dispatchEvent(new Event('cestos:notifications-changed'));
      report({ type: 'success', message: 'Breakdown status updated.' });
    } catch (error: any) {
      report({ type: 'error', message: error.message || 'Could not update breakdown status.' });
    }
  };


  // Handle Submit HSE Incident Report
  const handleSubmitHseIncident = async (e: React.FormEvent) => {
    const report = (alert: AppAlert) => setPortalAlert(alert, 'hse');
    e.preventDefault();
    if (!hseForm.title.trim()) {
      report({ type: 'error', message: 'Please provide an incident title / summary.' });
      return;
    }
    setHseSubmitting(true);
    const fd = new FormData();
    fd.append('title', hseForm.title.trim());
    fd.append('incident_type', hseForm.incident_type);
    fd.append('severity', hseForm.severity);
    fd.append('incident_date', hseForm.incident_date);
    fd.append('location', hseForm.location || 'Project Site');
    fd.append('description', hseForm.description.trim());
    if (hseForm.corrective_action.trim()) fd.append('corrective_action', hseForm.corrective_action.trim());
    if (selectedProjectId) fd.append('project_id', selectedProjectId);
    hseFiles.forEach((f) => fd.append('files', f));
    let savedRecord: any;
    try {
      savedRecord = await apiFetch<any>('/api/v1/incidents', { method: 'POST', body: fd });
    } catch (error) {
      report({ type: 'error', message: error instanceof Error ? error.message : 'Could not submit the incident.' });
      return;
    } finally {
      setHseSubmitting(false);
    }
    setHseIncidents((prev) => [savedRecord, ...prev]);
    setShowHseModal(false);
    report({ type: 'success', message: 'HSE Incident "' + (savedRecord.incident_number || savedRecord.title) + '" reported successfully! Safety team has been notified.' });
    setHseForm({ project_id: '', asset_id: '', title: '', incident_type: 'NEAR_MISS', severity: 'MEDIUM', incident_date: new Date().toISOString().slice(0, 16), location: '', description: '', corrective_action: '' });
    setHseFiles([]);
  };
  return (
    <FieldPortalLayout
      activeTab={activeTab}
      onTabChange={setActiveTab}
      onRefresh={reload}
      loading={loading}
      assignedProjects={myProjects}
      selectedProjectId={selectedProjectId}
      onProjectChange={setSelectedProjectId}
    >
      <div className="space-y-6">
        {/* TAB 1: MY WORK ORDERS & TASKS (MAIN HOME OVERVIEW) */}
        {isSupervisorOrAdmin && activeTab === 'DRILL_HOLES' && (
          <DrillingWorkspace key={version} subResource="holes" holesOnly />
        )}
        {(activeTab === 'MY_WORK' || (isSupervisorOrAdmin && activeTab === 'WORK_ORDERS')) && (
          <div className="space-y-6">
            {activeTab === 'MY_WORK' && <>
            {/* PERSONALIZED FIELD HERO BANNER */}
            <div className="p-6 rounded-xl border bg-card shadow-sm relative overflow-hidden">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 relative z-10">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                  
                    {isSupervisorOrAdmin && (
                      <span className="px-2.5 py-0.5 rounded-full text-xs font-bold uppercase tracking-wider bg-primary/10 text-primary border border-primary/20 flex items-center gap-1">
                      <HardHat className="h-3.5 w-3.5" /> Field Supervisor
                    </span>
                    )}
                  </div>
                  <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-foreground">
                    {getGreeting()}, {user?.first_name || 'Field Specialist'}! 
                  </h1>
                  <p className="text-xs sm:text-sm text-muted-foreground flex items-center gap-2">
                    <MapPin className="h-3.5 w-3.5 text-primary" />
                    <span>
                      Current project: <strong className="text-foreground">
                        {myProjects.find((p) => p.id === selectedProjectId)?.name ||
                         'No assigned project'}
                      </strong>
                    </span>
                  </p>
                </div>
              </div>
            </div>

            {/* QUICK FIELD LOGGING & OPERATIONS ACTION CARDS */}
            <div className="space-y-3">
              <h2 className="text-xs font-bold uppercase tracking-widest text-muted-foreground">
                Quick Field Operations & Logging Actions
              </h2>

              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5 sm:gap-3">
                {isSupervisorOrAdmin && (<div
                  onClick={() => setShowShiftModal(true)}
                  className="p-3.5 border rounded-xl bg-card hover:border-primary/50 hover:bg-muted/30 transition cursor-pointer flex flex-col justify-between space-y-2 shadow-sm group"
                >
                  <div className="flex items-center justify-between">
                    <div className="h-8 w-8 rounded-lg bg-primary/10 text-primary border border-primary/20 flex items-center justify-center shrink-0 group-hover:bg-primary group-hover:text-primary-foreground transition-colors">
                      <Flame className="h-4 w-4" />
                    </div>
                    <ArrowRight className="h-3.5 w-3.5 text-muted-foreground group-hover:text-primary group-hover:translate-x-0.5 transition-all" />
                  </div>
                  <div>
                    <h3 className="font-bold text-xs text-foreground group-hover:text-primary transition-colors">
                      Shift Production
                    </h3>
                    <p className="text-[11px] text-muted-foreground mt-0.5">
                      Log meterage & core recovery
                    </p>
                  </div>
                </div>)}

                <div
                  onClick={() => setShowFuelRefillModal(true)}
                  className="p-3.5 border rounded-xl bg-card hover:border-primary/50 hover:bg-muted/30 transition cursor-pointer flex flex-col justify-between space-y-2 shadow-sm group"
                >
                  <div className="flex items-center justify-between">
                    <div className="h-8 w-8 rounded-lg bg-primary/10 text-primary border border-primary/20 flex items-center justify-center shrink-0 group-hover:bg-primary group-hover:text-primary-foreground transition-colors">
                      <Fuel className="h-4 w-4" />
                    </div>
                    <ArrowRight className="h-3.5 w-3.5 text-muted-foreground group-hover:text-primary group-hover:translate-x-0.5 transition-all" />
                  </div>
                  <div>
                    <h3 className="font-bold text-xs text-foreground group-hover:text-primary transition-colors">
                      Log Fuel Refill
                    </h3>
                    <p className="text-[11px] text-muted-foreground mt-0.5">
                      Record refueled volume & supplier
                    </p>
                  </div>
                </div>

                <div
                  onClick={() => setShowTankDipModal(true)}
                  className="p-3.5 border rounded-xl bg-card hover:border-emerald-500/50 hover:bg-emerald-500/5 transition cursor-pointer flex flex-col justify-between space-y-2 shadow-sm group"
                >
                  <div className="flex items-center justify-between">
                    <div className="h-8 w-8 rounded-lg bg-emerald-500/10 text-emerald-600 border border-emerald-500/20 flex items-center justify-center shrink-0 group-hover:bg-emerald-600 group-hover:text-white transition-colors">
                      <Activity className="h-4 w-4" />
                    </div>
                    <ArrowRight className="h-3.5 w-3.5 text-muted-foreground group-hover:text-emerald-500 group-hover:translate-x-0.5 transition-all" />
                  </div>
                  <div>
                    <h3 className="font-bold text-xs text-foreground group-hover:text-emerald-500 transition-colors">
                      Record Tank Dip
                    </h3>
                    <p className="text-[11px] text-muted-foreground mt-0.5">
                      Log daily dip & fuel burn
                    </p>
                  </div>
                </div>

                {isSupervisorOrAdmin && (<div
                  onClick={() => setShowMaintenanceModal(true)}
                  className="p-3.5 border rounded-xl bg-card hover:border-primary/50 hover:bg-muted/30 transition cursor-pointer flex flex-col justify-between space-y-2 shadow-sm group"
                >
                  <div className="flex items-center justify-between">
                    <div className="h-8 w-8 rounded-lg bg-primary/10 text-primary border border-primary/20 flex items-center justify-center shrink-0 group-hover:bg-primary group-hover:text-primary-foreground transition-colors">
                      <Truck className="h-4 w-4" />
                    </div>
                    <ArrowRight className="h-3.5 w-3.5 text-muted-foreground group-hover:text-primary group-hover:translate-x-0.5 transition-all" />
                  </div>
                  <div>
                    <h3 className="font-bold text-xs text-foreground group-hover:text-primary transition-colors">
                      Schedule Service
                    </h3>
                    <p className="text-[11px] text-muted-foreground mt-0.5">
                      Dispatch work orders
                    </p>
                  </div>
                </div>)}

                <div
                  onClick={() => setShowDefectModal(true)}
                  className="p-3.5 border rounded-xl bg-card hover:border-primary/50 hover:bg-muted/30 transition cursor-pointer flex flex-col justify-between space-y-2 shadow-sm group"
                >
                  <div className="flex items-center justify-between">
                    <div className="h-8 w-8 rounded-lg bg-destructive/10 text-destructive border border-destructive/20 flex items-center justify-center shrink-0 group-hover:bg-destructive group-hover:text-destructive-foreground transition-colors">
                      <AlertTriangle className="h-4 w-4" />
                    </div>
                    <ArrowRight className="h-3.5 w-3.5 text-muted-foreground group-hover:text-primary group-hover:translate-x-0.5 transition-all" />
                  </div>
                  <div>
                    <h3 className="font-bold text-xs text-foreground group-hover:text-primary transition-colors">
                      Log Breakdown
                    </h3>
                    <p className="text-[11px] text-muted-foreground mt-0.5">
                      Report component defect
                    </p>
                  </div>
                </div>

                {isSupervisorOrAdmin && (<div
                  onClick={() => setShowStoreIssueModal(true)}
                  className="p-3.5 border rounded-xl bg-card hover:border-primary/50 hover:bg-muted/30 transition cursor-pointer flex flex-col justify-between space-y-2 shadow-sm group"
                >
                  <div className="flex items-center justify-between">
                    <div className="h-8 w-8 rounded-lg bg-primary/10 text-primary border border-primary/20 flex items-center justify-center shrink-0 group-hover:bg-primary group-hover:text-primary-foreground transition-colors">
                      <Package className="h-4 w-4" />
                    </div>
                    <ArrowRight className="h-3.5 w-3.5 text-muted-foreground group-hover:text-primary group-hover:translate-x-0.5 transition-all" />
                  </div>
                  <div>
                    <h3 className="font-bold text-xs text-foreground group-hover:text-primary transition-colors">
                      Issue Consumables
                    </h3>
                    <p className="text-[11px] text-muted-foreground mt-0.5">
                      Issue multiple store items
                    </p>
                  </div>
                </div>)}

                {isSupervisorOrAdmin && (<div
                  onClick={() => setShowHseModal(true)}
                  className="p-3.5 border rounded-xl bg-card hover:border-rose-500/50 hover:bg-muted/30 transition cursor-pointer flex flex-col justify-between space-y-2 shadow-sm group"
                >
                  <div className="flex items-center justify-between">
                    <div className="h-8 w-8 rounded-lg bg-rose-500/10 text-rose-600 border border-rose-500/20 flex items-center justify-center shrink-0 group-hover:bg-rose-600 group-hover:text-white transition-colors">
                      <ShieldCheck className="h-4 w-4" />
                    </div>
                    <ArrowRight className="h-3.5 w-3.5 text-muted-foreground group-hover:text-rose-500 group-hover:translate-x-0.5 transition-all" />
                  </div>
                  <div>
                    <h3 className="font-bold text-xs text-foreground group-hover:text-rose-600 transition-colors">
                      Report HSE Incident
                    </h3>
                    <p className="text-[11px] text-muted-foreground mt-0.5">
                      Near-miss, injury, hazard
                    </p>
                  </div>
                </div>)}              </div>
            </div>

            </>}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h2 className="text-lg font-bold flex items-center gap-2">
                  <Wrench className="h-5 w-5 text-primary" />
                  {activeTab === 'WORK_ORDERS' ? 'Planning · Work Orders' : 'Assigned Field Work Orders & Maintenance'}
                </h2>
                <p className="text-xs text-muted-foreground">
                  Complete tasks assigned to your shift and update progress status
                </p>
              </div>

              <div className="flex items-center gap-2">
            
                {isSupervisorOrAdmin && <button className="btn-primary text-xs" onClick={() => setShowCreateWOModal(true)}><Plus size={14} /> Create Work Order</button>}
                <div className="relative w-full sm:w-64">
                  <Search className="absolute left-3 top-2 h-4 w-4 text-muted-foreground" />
                  <input
                    type="text"
                    placeholder="Search work orders..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="w-full pl-9 pr-3 py-1.5 text-xs border rounded-lg bg-background"
                  />
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {myWorkOrders
                .filter((wo) => {
                  // Text search filter
                  return (
                    !search ||
                    wo.title.toLowerCase().includes(search.toLowerCase()) ||
                    wo.id.toLowerCase().includes(search.toLowerCase()) ||
                    (wo.work_order_number && wo.work_order_number.toLowerCase().includes(search.toLowerCase())) ||
                    (wo.asset_name && wo.asset_name.toLowerCase().includes(search.toLowerCase()))
                  );
                })
                .map((wo) => {
                  const completedTasks = (wo.checklist || []).filter((c: any) => c.completed).length;
                  const totalTasks = (wo.checklist || []).length;
                  const progressPct = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

                  return (
                    <div
                      key={wo.id}
                      className="p-4 border rounded-xl bg-card space-y-3 shadow-sm hover:border-primary/50 transition cursor-pointer flex flex-col justify-between"
                      onClick={() => {
                        setSelectedWorkOrder(wo);
                        setWoNoteInput('');
                      }}
                    >
                      <div className="space-y-3">
                        <div className="flex items-center justify-between border-b pb-2">
                          <span className="text-xs font-mono font-bold text-primary flex items-center gap-1.5">
                            <Wrench className="h-3.5 w-3.5" />
                            {wo.work_order_number || wo.id.toUpperCase()}
                          </span>
                          <div className="flex items-center gap-2">
                            <span
                              className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                                wo.priority === 'HIGH' || wo.priority === 'CRITICAL'
                                  ? 'bg-destructive/10 text-destructive border border-destructive/20'
                                  : 'bg-muted text-foreground border'
                              }`}
                            >
                              {wo.priority} PRIORITY
                            </span>
                            <span
                              className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                wo.status === 'COMPLETED'
                                  ? 'bg-primary/10 text-primary border border-primary/20'
                                  : wo.status === 'IN_PROGRESS'
                                  ? 'bg-secondary text-primary border border-primary/20'
                                  : 'bg-muted text-muted-foreground border'
                              }`}
                            >
                              {wo.status.replace('_', ' ')}
                            </span>
                          </div>
                        </div>

                        <div>
                          <h3 className="font-bold text-sm text-foreground hover:text-primary transition">{wo.title}</h3>
                          <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
                            <Activity className="h-3.5 w-3.5 text-primary shrink-0" />
                            <span>{wo.asset_name}</span>
                          </p>
                        </div>

                        {totalTasks > 0 && (
                          <div className="space-y-1">
                            <div className="flex justify-between text-[11px] text-muted-foreground font-medium">
                              <span>Task Progress</span>
                              <span>
                                {completedTasks} of {totalTasks} ({progressPct}%)
                              </span>
                            </div>
                            <div className="w-full bg-muted h-1.5 rounded-full overflow-hidden">
                              <div
                                className="bg-primary h-full rounded-full transition-all duration-300"
                                style={{ width: `${progressPct}%` }}
                              />
                            </div>
                          </div>
                        )}
                      </div>

                      <div
                        className="pt-3 border-t flex items-center justify-between text-xs mt-2"
                        onClick={(e) => e.stopPropagation()}
                      >
                        {isSupervisorOrAdmin && canEditFieldWork(wo) && <button type="button" className="btn-secondary text-xs" onClick={() => setEditingWork({ ...wo, editKind: 'work-order' })}>Edit work order</button>}
                        <span className="text-muted-foreground flex items-center gap-1">
                          <Calendar className="h-3.5 w-3.5" /> Due: {wo.due_date}
                        </span>
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => {
                              setSelectedWorkOrder(wo);
                              setWoNoteInput('');
                            }}
                            className="px-3 py-1 border rounded-lg text-xs font-semibold hover:bg-muted transition flex items-center gap-1 text-foreground"
                          >
                            <Eye className="h-3.5 w-3.5 text-primary" /> View Details
                          </button>
                          <button
                            disabled={!wo.can_update || ['COMPLETED', 'APPROVED', 'CANCELLED'].includes(wo.status)}
                            onClick={() => {
                              if (wo.status === 'IN_PROGRESS') {
                                handleInitiateCompleteWO(wo);
                              } else {
                                handleUpdateWorkOrderStatus(wo, 'IN_PROGRESS');
                              }
                            }}
                            className={`px-3 py-1 rounded-lg text-xs font-bold transition ${
                              wo.status === 'COMPLETED'
                                ? 'bg-primary/10 text-primary border border-primary/20'
                                : wo.status === 'IN_PROGRESS'
                                ? 'bg-primary text-primary-foreground hover:bg-primary/90'
                                : 'bg-primary text-primary-foreground hover:bg-primary/90'
                            }`}
                          >
                            {wo.status === 'COMPLETED' ? 'Completed ✓' : wo.status === 'IN_PROGRESS' ? 'Mark Complete' : 'Start Work'}
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
            </div>
            {isSupervisorOrAdmin && activeTab === 'MY_WORK' && (() => {
              const project = myProjects.find((item) => item.id === selectedProjectId);
              const drilledMetres = filteredShiftReports.reduce((total, shift) => total + Number(shift.total_metres_drilled ?? shift.total_metres ?? shift.metres_drilled ?? 0), 0);
              const plannedMetres = Number(project?.target_metres ?? project?.planned_metres ?? project?.total_planned_metres ?? project?.scope_metres ?? 0);
              const progress = plannedMetres > 0 ? Math.min(100, Math.round((drilledMetres / plannedMetres) * 100)) : null;
              return (
                <section className="space-y-4 pt-5 border-t">
                  <div>
                    <h3 className="text-sm font-bold flex items-center gap-2"><Activity className="h-4 w-4 text-primary" /> Project Cost, Drilling & Progress</h3>
                    <p className="text-xs text-muted-foreground mt-1">Supervisor view of direct cost against drilling production for {project?.name || 'the selected project'}.</p>
                  </div>
                  <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                    <div className="p-4 border rounded-xl bg-card space-y-3">
                      <div className="flex items-center justify-between"><span className="text-xs font-bold">Drilling Progress</span><span className="text-xs font-mono font-bold text-primary">{progress == null ? 'No target' : `${progress}%`}</span></div>
                      <div className="h-2.5 rounded-full bg-muted overflow-hidden"><div className="h-full rounded-full bg-primary transition-all" style={{ width: `${progress ?? 0}%` }} /></div>
                      <div className="flex justify-between text-xs"><span className="text-muted-foreground">Drilled</span><span className="font-mono font-bold">{drilledMetres.toLocaleString(undefined, { maximumFractionDigits: 1 })} m</span></div>
                      <div className="flex justify-between text-xs"><span className="text-muted-foreground">Planned</span><span className="font-mono font-bold">{plannedMetres > 0 ? `${plannedMetres.toLocaleString()} m` : 'Not set'}</span></div>
                    </div>
                    <div className="lg:col-span-2 p-4 border rounded-xl bg-card">
                      <h4 className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Cost Against Drilling Performance</h4>
                      <OperationsPerformanceCombinedChart projectId={selectedProjectId} showRevenue={false} />
                    </div>
                  </div>
                </section>
              );
            })()}
          </div>
        )}

        {/* TAB 2: SHIFT PRODUCTION, 360° METERING LOGS & ASSET BREAKDOWNS (UNIFIED LOGGING HUB) */}
        {isSupervisorOrAdmin && activeTab === 'SHIFT_LOGS' && (
          <div className="space-y-6">
            {/* SUPERVISOR REPORTING & OPERATIONS COMMAND HERO HEADER */}
            <div className="p-5 rounded-xl bg-card border flex flex-col  md:items-start justify-between gap-4 shadow-sm">
              <div className="space-y-0.5">
                <h2 className="text-lg font-bold flex items-center gap-2 text-foreground">
               
                  Supervisor Reporting & Operational Logging Hub
                </h2>
                <p className="text-xs text-muted-foreground">
                  Log shift production meterage, record worked drill holes, fuel dip receipts, and log asset breakdown defects
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2 shrink-0">
                {isSupervisorOrAdmin && (<button
                  onClick={() => setShowShiftModal(true)}
                  className="px-3.5 py-2 bg-primary text-primary-foreground hover:bg-primary/90 font-bold rounded-lg text-xs transition flex items-center gap-1.5 shadow-sm"
                >
                  <Flame className="h-3.5 w-3.5" /> + Shift Production Report
                </button>)}
                <button
                  onClick={() => setShowDefectModal(true)}
                  className="px-3.5 py-2 bg-destructive text-destructive-foreground hover:bg-destructive/90 font-bold rounded-lg text-xs transition flex items-center gap-1.5 shadow-sm"
                >
                  <AlertTriangle className="h-3.5 w-3.5" /> + Log Asset Breakdown
                </button>
                <button
                  onClick={() => setShowFuelRefillModal(true)}
                  className="px-3.5 py-2 bg-secondary text-foreground hover:bg-muted font-bold rounded-lg text-xs border transition flex items-center gap-1.5 shadow-sm"
                >
                  <Fuel className="h-3.5 w-3.5 text-primary" /> + Log Fuel Refill
                </button>
                <button
                  onClick={() => setShowTankDipModal(true)}
                  className="px-3.5 py-2 bg-emerald-600 text-white hover:bg-emerald-700 font-bold rounded-lg text-xs transition flex items-center gap-1.5 shadow-sm"
                >
                  <Activity className="h-3.5 w-3.5" /> + Record Tank Dip
                </button>
                {isSupervisorOrAdmin && (<button
                  onClick={() => setShowHseModal(true)}
                  className="px-3.5 py-2 bg-rose-600 text-white hover:bg-rose-700 font-bold rounded-lg text-xs transition flex items-center gap-1.5 shadow-sm"
                >
                  <ShieldCheck className="h-3.5 w-3.5" /> + Report HSE Incident
                </button>)}
              </div>
            </div>

            {/* Shift Production Reports Register Table */}
            {(() => {
              const totalShiftPages = Math.ceil(filteredShiftReports.length / shiftPageSize) || 1;
              const currentShiftPage = Math.min(shiftPage, totalShiftPages);
              const startIdx = filteredShiftReports.length === 0 ? 0 : (currentShiftPage - 1) * shiftPageSize + 1;
              const endIdx = Math.min(currentShiftPage * shiftPageSize, filteredShiftReports.length);
              const paginatedShiftReports = filteredShiftReports.slice(
                (currentShiftPage - 1) * shiftPageSize,
                currentShiftPage * shiftPageSize
              );

              return (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-bold flex items-center gap-2">
                      <FileText className="h-4 w-4 text-primary" />
                      Shift Production Reports Register (With Worked Drill Hole Intervals)
                    </h3>
                    <span className="text-xs text-muted-foreground">
                      Showing <strong>{startIdx}</strong>–<strong>{endIdx}</strong> of <strong>{filteredShiftReports.length}</strong> shift reports
                    </span>
                  </div>

                  <div className="border rounded-xl bg-card overflow-hidden shadow-sm">
                    <table className="w-full text-xs text-left">
                      <thead className="bg-muted/50 font-semibold uppercase text-muted-foreground border-b">
                        <tr>
                          <th className="px-4 py-3">Shift Ref / Date</th>
                          <th className="px-4 py-3">Shift Type</th>
                          <th className="px-4 py-3">Worked Hole(s)</th>
                          <th className="px-4 py-3">Equipment / Rig</th>
                          <th className="px-4 py-3">Drilled Metres</th>
                          <th className="px-4 py-3">Core Recovery</th>
                          <th className="px-4 py-3">Operating Hrs</th>
                          <th className="px-4 py-3">Driller</th>
                          <th className="px-4 py-3">Status</th><th className="px-4 py-3">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y">
                        {paginatedShiftReports.length === 0 ? (
                          <tr>
                            <td colSpan={10} className="text-center py-6 text-muted-foreground italic">
                              {shiftsLoading ? 'Loading shift production reports…' : shiftsError ? 'Shift reports could not be loaded.' : 'No shift production reports logged for the selected project.'}
                            </td>
                          </tr>
                        ) : (
                          paginatedShiftReports.map((s) => (
                            <tr key={s.id} className="hover:bg-muted/30 transition">
                              <td className="px-4 py-3">
                                <span className="font-bold text-foreground block">{formatShiftRef(s)}</span>
                                <span className="text-[10px] text-muted-foreground">{s.shift_date}</span>
                              </td>
                              <td className="px-4 py-3 font-semibold">
                                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-muted text-foreground border">
                                  {s.shift_type} SHIFT
                                </span>
                              </td>
                              <td className="px-4 py-3 font-mono font-bold text-foreground">
                                {s.hole_numbers || '—'}
                              </td>
                              <td className="px-4 py-3 font-medium">{s.rig_name || myAssets.find((asset) => asset.id === s.rig_id)?.name || '—'}</td>
                              <td className="px-4 py-3 font-mono font-bold text-primary">
                                {s.total_metres_drilled ?? '—'} m
                              </td>
                              <td className="px-4 py-3 font-mono">
                                {s.core_recovery_pct ?? '—'}%
                              </td>
                              <td className="px-4 py-3 font-mono">{s.productive_hours ?? '—'} hrs</td>
                              <td className="px-4 py-3 text-muted-foreground">{s.driller_name || 'Site Crew'}</td>
                              <td className="px-4 py-3">
                                <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                                  s.status === 'APPROVED' ? 'bg-primary/10 text-primary border border-primary/20' : 'bg-muted text-foreground border'
                                }`}>
                                  {s.status}
                                </span>
                              </td>
                              <td className="px-4 py-3">{isSupervisorOrAdmin && s.status !== 'APPROVED' && !s.approved_at && <button type="button" className="btn-secondary text-xs" onClick={() => setEditingShift(s)}>Edit shift log</button>}</td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>

                    {/* Pagination Controls */}
                    <div className="flex flex-wrap items-center justify-between border-t px-4 py-2.5 bg-muted/20 text-xs text-muted-foreground gap-2">
                      <div>
                        Showing <strong>{startIdx}</strong> to <strong>{endIdx}</strong> of <strong>{filteredShiftReports.length}</strong> entries
                      </div>

                      <div className="flex items-center gap-3">
                        <div className="flex items-center gap-1.5">
                          <span className="text-[11px] font-medium">Rows per page:</span>
                          <select
                            value={shiftPageSize}
                            onChange={(e) => {
                              setShiftPageSize(Number(e.target.value));
                              setShiftPage(1);
                            }}
                            className="bg-background border rounded px-2 py-1 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                          >
                            <option value={5}>5</option>
                            <option value={10}>10</option>
                            <option value={20}>20</option>
                            <option value={50}>50</option>
                          </select>
                        </div>

                        <div className="flex items-center gap-1">
                          <button
                            disabled={currentShiftPage <= 1}
                            onClick={() => setShiftPage((p) => Math.max(1, p - 1))}
                            className="p-1.5 rounded-md border bg-background hover:bg-muted disabled:opacity-40 disabled:cursor-not-allowed transition text-foreground"
                            title="Previous Page"
                          >
                            <ChevronLeft className="h-4 w-4" />
                          </button>
                          <span className="font-semibold text-foreground px-2 text-xs">
                            Page {currentShiftPage} of {totalShiftPages}
                          </span>
                          <button
                            disabled={currentShiftPage >= totalShiftPages}
                            onClick={() => setShiftPage((p) => Math.min(totalShiftPages, p + 1))}
                            className="p-1.5 rounded-md border bg-background hover:bg-muted disabled:opacity-40 disabled:cursor-not-allowed transition text-foreground"
                            title="Next Page"
                          >
                            <ChevronRight className="h-4 w-4" />
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })()}

            {/* ASSET BREAKDOWNS & DEFECT LOGGING SECTION */}
            <div className="space-y-3 pt-4 border-t">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold flex items-center gap-2">
                    <AlertTriangle className="h-4 w-4 text-destructive" />
                    Asset Breakdowns & Safety Defect Logs
                  </h3>
                  <p className="text-xs text-muted-foreground">
                    Equipment breakdowns and photo attachments reported during shifts
                  </p>
                </div>

                <button
                  onClick={() => setShowDefectModal(true)}
                  className="px-3 py-1.5 bg-destructive hover:bg-destructive/90 text-destructive-foreground font-bold rounded-lg text-xs transition flex items-center gap-1.5"
                >
                  <Plus className="h-3.5 w-3.5" /> Log New Breakdown
                </button>
              </div>

              <div className="border rounded-xl bg-card overflow-hidden shadow-sm">
                <table className="w-full text-xs text-left">
                  <thead className="bg-muted/50 font-semibold uppercase text-muted-foreground border-b">
                    <tr>
                      <th className="px-4 py-3">Equipment</th>
                      <th className="px-4 py-3">Issue Title</th>
                      <th className="px-4 py-3">Severity</th>
                      <th className="px-4 py-3">Downtime</th>
                      <th className="px-4 py-3">Attachment</th>
                      <th className="px-4 py-3">Reported Date</th>
                      <th className="px-4 py-3">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {myBreakdowns.map((b) => (
                      <tr key={b.id} className="hover:bg-muted/30 transition">
                        <td className="px-4 py-3 font-semibold">{b.asset_name}</td>
                        <td className="px-4 py-3 font-medium text-foreground">{b.title}</td>
                        <td className="px-4 py-3">
                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                            b.severity === 'HIGH' ? 'bg-destructive/10 text-destructive border border-destructive/20' : 'bg-muted text-foreground border'
                          }`}>
                            {b.severity}
                          </span>
                        </td>
                        <td className="px-4 py-3 font-mono">{b.downtime_hours} hrs</td>
                        <td className="px-4 py-3">
                          {b.attachment_name ? (
                            <span className="text-primary font-mono flex items-center gap-1">
                              <Paperclip size={12} /> {b.attachment_name}
                            </span>
                          ) : (
                            <span className="text-muted-foreground">None</span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-muted-foreground">{b.reported_date}</td>
                        <td className="px-4 py-3">
                          <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                            b.status === 'OPEN' ? 'bg-destructive/10 text-destructive border border-destructive/20' : 'bg-primary/10 text-primary border border-primary/20'
                          }`}>
                            {b.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* TAB 3: DEDICATED EQUIPMENT & MAINTENANCE PAGE */}
        {activeTab === 'EQUIPMENT' && (
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h2 className="text-lg font-bold flex items-center gap-2 text-foreground">
                  <Truck className="h-5 w-5 text-primary" />
                  Project Equipment Fleet & Maintenance
                </h2>
                <p className="text-xs text-muted-foreground">
                  View equipment assigned to your selected project and its maintenance, fuel, and meter history.
                </p>
              </div>

            </div>

            {/* Project-Scoped Fleet — driven by header project switcher */}
            {(() => {
              const activeProjectName =
                myProjects.find((p) => p.id === selectedProjectId)?.name || 'No assigned project';

              // Use the same filteredProjectAssets driven by header switcher
              const displayedAssets = filteredProjectAssets;

              return (
                <>
                  {/* Active project context badge */}
                  <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-primary/5 border border-primary/15 text-xs mb-1">
                    <Compass className="h-3.5 w-3.5 text-primary shrink-0" />
                    <span className="text-muted-foreground">Showing equipment for:</span>
                    <span className="font-bold text-primary">{activeProjectName}</span>
                  </div>

                  {/* Equipment Fleet Grid (Details View) */}
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {displayedAssets.length === 0 ? (
                      <div className="col-span-full p-8 text-center bg-card border rounded-xl space-y-2">
                        <Truck className="mx-auto h-8 w-8 text-muted-foreground opacity-50" />
                        <h4 className="font-bold text-sm text-foreground">No Equipment Found for Active Project</h4>
                        <p className="text-xs text-muted-foreground">
                          No assets are assigned to <strong>{activeProjectName}</strong>. Switch project in the header or contact the Operations Control Tower to assign assets.
                        </p>
                      </div>
                    ) : (
                      displayedAssets.map((asset) => {
                        const assignedProjectName = asset.assigned_project_name || asset.current_project?.name || asset.project_name || asset.current_assignment?.project?.name;
                        const statusBadge = assignedProjectName
                          ? 'bg-primary/10 text-primary border-primary/20'
                          : 'bg-muted text-muted-foreground border-border';

                        return (
                          <div key={asset.id} className="p-5 border rounded-xl bg-card space-y-4 shadow-sm hover:border-primary/50 transition">
                            <div className="flex items-center justify-between border-b pb-3">
                              <div>
                                <span className="text-[10px] font-bold font-mono px-2 py-0.5 rounded bg-muted text-muted-foreground border">
                                  {asset.asset_number || 'EQP-RIG-01'}
                                </span>
                                <h3 className="font-bold text-base mt-1 text-foreground">{asset.name || 'Atlas Copco RC Rig'}</h3>
                              </div>
                              <span className={`px-2.5 py-1 rounded-full text-xs font-bold border ${statusBadge}`}>
                                {asset.status?.replace(/_/g, ' ') || 'OPERATIONAL'}
                              </span>
                            </div>

                            <div className="space-y-2 text-xs">
                              <div className="flex justify-between py-1 border-b">
                                <span className="text-muted-foreground">Category / Type</span>
                                <span className="font-bold text-foreground">{asset.category_name || asset.category?.name || (typeof asset.category === 'string' ? asset.category : 'Drilling Rig')}</span>
                              </div>
                              <div className="flex justify-between py-1 border-b">
                                <span className="text-muted-foreground">Engine Hour Meter</span>
                                <span className="font-mono font-bold text-foreground">
                                  {asset.current_meter_reading != null ? `${Number(asset.current_meter_reading).toLocaleString()} Hours` : '1,420 Hours'}
                                </span>
                              </div>
                              <div className="flex justify-between py-1 border-b">
                                <span className="text-muted-foreground">Operational Status</span>
                                <span className="font-bold text-foreground font-mono">
                                  {asset.operational_eligibility || 'ELIGIBLE'}
                                </span>
                              </div>
                              <div className="flex justify-between py-1 border-b">
                                <span className="text-muted-foreground">Assigned Project</span>
                                <span className={`font-bold ${assignedProjectName ? 'text-primary' : 'text-muted-foreground'}`}>
                                  {assignedProjectName || 'Unassigned Fleet'}
                                </span>
                              </div>
                            </div>

                            <div className="pt-2">
                              <button type="button" className="btn-secondary w-full" onClick={() => setSelectedEquipment(asset)}>
                                <Eye size={14} /> View equipment details
                              </button>
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                </>
              );
            })()}

            {/* Maintenance Schedules List Table */}
            <div className="space-y-3 pt-4 border-t">
              <h3 className="text-sm font-bold flex items-center gap-2">
                <Clock className="h-4 w-4 text-primary" />
                Active Maintenance Schedules & Dispatched Tasks
              </h3>

              <div className="border rounded-xl bg-card overflow-hidden shadow-sm">
                <table className="w-full text-xs text-left">
                  <thead className="bg-muted/50 font-semibold uppercase text-muted-foreground border-b">
                    <tr>
                      <th className="px-4 py-3">Schedule Title</th>
                      <th className="px-4 py-3">Equipment</th>
                      <th className="px-4 py-3">Scheduled Date</th>
                      <th className="px-4 py-3">Type</th>
                      <th className="px-4 py-3">Assigned Technician</th>
                      <th className="px-4 py-3">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {displayedMaintenanceSchedules.map((m: any) => (
                      <tr key={m.id} className="hover:bg-muted/30 transition">
                        <td className="px-4 py-3 font-bold text-foreground">{m.title}</td>
                        <td className="px-4 py-3 font-semibold">{m.asset_name}</td>
                        <td className="px-4 py-3 font-mono">{m.scheduled_date}</td>
                        <td className="px-4 py-3">
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-muted text-foreground border">
                            {m.maintenance_type}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-muted-foreground font-semibold">{m.assigned_to}</td>
                        <td className="px-4 py-3">
                          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-primary/10 text-primary border border-primary/20">
                            {m.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                <div className="flex items-center justify-between border-t px-4 py-2.5 bg-muted/20 text-xs text-muted-foreground">
                  <span>Showing {projectMaintenanceSchedules.length === 0 ? 0 : (Math.min(maintenancePage, maintenanceTotalPages) - 1) * equipmentTablePageSize + 1}–{Math.min(Math.min(maintenancePage, maintenanceTotalPages) * equipmentTablePageSize, projectMaintenanceSchedules.length)} of {projectMaintenanceSchedules.length}</span>
                  <div className="flex items-center gap-2">
                    <button type="button" disabled={maintenancePage <= 1} onClick={() => setMaintenancePage((page) => Math.max(1, page - 1))} className="btn-secondary text-xs disabled:opacity-40">Previous</button>
                    <span>Page {Math.min(maintenancePage, maintenanceTotalPages)} of {maintenanceTotalPages}</span>
                    <button type="button" disabled={maintenancePage >= maintenanceTotalPages} onClick={() => setMaintenancePage((page) => Math.min(maintenanceTotalPages, page + 1))} className="btn-secondary text-xs disabled:opacity-40">Next</button>
                  </div>
                </div>
              </div>
            </div>

            <div className="space-y-3 pt-4 border-t">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <h3 className="text-sm font-bold flex items-center gap-2">
                    <AlertTriangle className="h-4 w-4 text-destructive" />
                    Project Breakdowns & Defects
                  </h3>
                  <p className="text-xs text-muted-foreground mt-1">Reported equipment faults and their current resolution status.</p>
                </div>
                <span className="text-xs text-muted-foreground"><strong className="text-foreground">{projectBreakdowns.length}</strong> record{projectBreakdowns.length === 1 ? '' : 's'}</span>
              </div>
              <div className="border rounded-xl bg-card overflow-x-auto shadow-sm">
                <table className="w-full min-w-[800px] text-xs text-left">
                  <thead className="bg-muted/50 font-semibold uppercase text-muted-foreground border-b">
                    <tr>
                      <th className="px-4 py-3">Reported</th>
                      <th className="px-4 py-3">Equipment</th>
                      <th className="px-4 py-3">Breakdown / Defect</th>
                      <th className="px-4 py-3">Severity</th>
                      <th className="px-4 py-3 text-right">Downtime</th>
                      <th className="px-4 py-3">Status</th>
                      {isSupervisorOrAdmin && <th className="px-4 py-3 text-right">Actions</th>}
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {projectBreakdowns.length === 0 ? (
                      <tr><td colSpan={isSupervisorOrAdmin ? 7 : 6} className="px-4 py-8 text-center text-muted-foreground">No breakdowns or defects recorded for the selected project equipment.</td></tr>
                    ) : displayedProjectBreakdowns.map((breakdown) => (
                      <tr key={`${breakdown.asset_id}-${breakdown.id}`} className="hover:bg-muted/30 transition">
                        <td className="px-4 py-3 font-mono whitespace-nowrap">{breakdown.reported_date ? new Date(breakdown.reported_date).toLocaleDateString() : '—'}</td>
                        <td className="px-4 py-3 font-semibold">{breakdown.asset_name}</td>
                        <td className="px-4 py-3"><span className="font-medium block">{breakdown.title || breakdown.description || 'Reported defect'}</span><span className="text-[10px] text-muted-foreground">{breakdown.description && breakdown.title ? breakdown.description : ''}</span></td>
                        <td className="px-4 py-3"><span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${['HIGH', 'CRITICAL', 'MAJOR'].includes(String(breakdown.severity).toUpperCase()) ? 'bg-destructive/10 text-destructive border-destructive/20' : 'bg-muted text-foreground'}`}>{breakdown.severity || 'MEDIUM'}</span></td>
                        <td className="px-4 py-3 text-right font-mono">{Number(breakdown.downtime_hours || 0).toLocaleString(undefined, { maximumFractionDigits: 1 })} hrs</td>
                        <td className="px-4 py-3"><span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${['RESOLVED', 'CLOSED'].includes(String(breakdown.status).toUpperCase()) ? 'bg-primary/10 text-primary border border-primary/20' : 'bg-destructive/10 text-destructive border border-destructive/20'}`}>{breakdown.status || 'OPEN'}</span></td>
                        {isSupervisorOrAdmin && <td className="px-4 py-3 text-right"><select aria-label={`Update status for ${breakdown.title || 'breakdown'}`} value={breakdown.status || 'OPEN'} onChange={(event) => handleUpdateBreakdownStatus(breakdown, event.target.value)} className="border rounded px-2 py-1 bg-background text-xs"><option value="OPEN">Open</option><option value="IN_PROGRESS">In Progress</option><option value="RESOLVED">Resolved</option><option value="CLOSED">Closed</option></select></td>}
                      </tr>
                    ))}
                  </tbody>
                </table>
                <div className="flex items-center justify-between border-t px-4 py-2.5 bg-muted/20 text-xs text-muted-foreground">
                  <span>Showing {projectBreakdowns.length === 0 ? 0 : (Math.min(breakdownPage, breakdownTotalPages) - 1) * equipmentTablePageSize + 1}–{Math.min(Math.min(breakdownPage, breakdownTotalPages) * equipmentTablePageSize, projectBreakdowns.length)} of {projectBreakdowns.length}</span>
                  <div className="flex items-center gap-2"><button type="button" disabled={breakdownPage <= 1} onClick={() => setBreakdownPage((page) => Math.max(1, page - 1))} className="btn-secondary text-xs disabled:opacity-40">Previous</button><span>Page {Math.min(breakdownPage, breakdownTotalPages)} of {breakdownTotalPages}</span><button type="button" disabled={breakdownPage >= breakdownTotalPages} onClick={() => setBreakdownPage((page) => Math.min(breakdownTotalPages, page + 1))} className="btn-secondary text-xs disabled:opacity-40">Next</button></div>
                </div>
              </div>
            </div>

            <div className="space-y-3 pt-4 border-t">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <h3 className="text-sm font-bold flex items-center gap-2">
                    <Fuel className="h-4 w-4 text-primary" />
                    Project Equipment Fuel Logs
                  </h3>
                  <p className="text-xs text-muted-foreground mt-1">Fuel deliveries and meter readings for equipment assigned to the selected project.</p>
                </div>
                <span className="text-xs text-muted-foreground"><strong className="text-foreground">{projectFuelLogs.length}</strong> log{projectFuelLogs.length === 1 ? '' : 's'}</span>
              </div>

              <div className="border rounded-xl bg-card overflow-x-auto shadow-sm">
                <table className="w-full min-w-[780px] text-xs text-left">
                  <thead className="bg-muted/50 font-semibold uppercase text-muted-foreground border-b">
                    <tr>
                      <th className="px-4 py-3">Date</th>
                      <th className="px-4 py-3">Equipment</th>
                      <th className="px-4 py-3">Fuel Type</th>
                      <th className="px-4 py-3 text-right">Volume</th>
                      <th className="px-4 py-3 text-right">Meter Reading</th>
                      <th className="px-4 py-3">Supplier / Reference</th>
                      {isSupervisorOrAdmin && <th className="px-4 py-3 text-right">Actions</th>}
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {projectFuelLogs.length === 0 ? (
                      <tr>
                        <td colSpan={isSupervisorOrAdmin ? 7 : 6} className="px-4 py-8 text-center text-muted-foreground">No fuel logs recorded for the selected project equipment.</td>
                      </tr>
                    ) : displayedProjectFuelLogs.map((log) => (
                      <tr key={`${log.asset_id}-${log.id}`} className="hover:bg-muted/30 transition">
                        <td className="px-4 py-3 font-mono whitespace-nowrap">{log.recorded_at || log.created_at ? new Date(log.recorded_at || log.created_at).toLocaleDateString() : '—'}</td>
                        <td className="px-4 py-3 font-semibold">{log.asset_name}</td>
                        <td className="px-4 py-3"><span className="px-2 py-0.5 rounded text-[10px] font-bold bg-muted text-foreground border">{log.fuel_type || 'DIESEL'}</span></td>
                        <td className="px-4 py-3 text-right font-mono font-bold text-primary">{Number(log.quantity_litres ?? log.fuel_amount ?? 0).toLocaleString(undefined, { maximumFractionDigits: 2 })} L</td>
                        <td className="px-4 py-3 text-right font-mono">{log.meter_reading != null ? `${Number(log.meter_reading).toLocaleString()} hrs` : '—'}</td>
                        <td className="px-4 py-3"><span className="font-medium block">{log.supplier || '—'}</span><span className="text-[10px] text-muted-foreground">{log.reference_number || ''}</span></td>
                        {isSupervisorOrAdmin && (() => {
                          const loggedAt = new Date(log.recorded_at || log.created_at || 0).getTime();
                          const editExpired = !loggedAt || Date.now() - loggedAt > 2 * 24 * 60 * 60 * 1000;
                          return <td className="px-4 py-3 text-right"><button type="button" disabled={editExpired} title={editExpired ? 'Fuel logs can only be edited within 48 hours.' : 'Edit fuel log'} onClick={() => openFuelLogEditor(log)} className="btn-secondary text-xs disabled:opacity-40">{editExpired ? 'Edit locked' : 'Edit'}</button></td>;
                        })()}
                      </tr>
                    ))}
                  </tbody>
                </table>
                <div className="flex items-center justify-between border-t px-4 py-2.5 bg-muted/20 text-xs text-muted-foreground">
                  <span>Showing {projectFuelLogs.length === 0 ? 0 : (Math.min(fuelLogPage, fuelLogTotalPages) - 1) * equipmentTablePageSize + 1}–{Math.min(Math.min(fuelLogPage, fuelLogTotalPages) * equipmentTablePageSize, projectFuelLogs.length)} of {projectFuelLogs.length}</span>
                  <div className="flex items-center gap-2">
                    <button type="button" disabled={fuelLogPage <= 1} onClick={() => setFuelLogPage((page) => Math.max(1, page - 1))} className="btn-secondary text-xs disabled:opacity-40">Previous</button>
                    <span>Page {Math.min(fuelLogPage, fuelLogTotalPages)} of {fuelLogTotalPages}</span>
                    <button type="button" disabled={fuelLogPage >= fuelLogTotalPages} onClick={() => setFuelLogPage((page) => Math.min(fuelLogTotalPages, page + 1))} className="btn-secondary text-xs disabled:opacity-40">Next</button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 4: STORE MANAGEMENT & CONSUMABLES */}
        {activeTab === 'STORES' && (
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h2 className="text-lg font-bold flex items-center gap-2 text-foreground">
                  <Package className="h-5 w-5 text-primary" />
                  Store & Warehouse Consumables
                </h2>
                <p className="text-xs text-muted-foreground">
                  View stock, project consumption, and items requiring replenishment for this site
                </p>
              </div>

              {isSupervisorOrAdmin && (
                <button
                  onClick={() => setShowStoreIssueModal(true)}
                  className="px-3.5 py-2 bg-primary text-primary-foreground hover:bg-primary/90 font-semibold rounded-lg text-xs transition flex items-center gap-1.5 shadow-sm"
                >
                  <Plus className="h-3.5 w-3.5" /> Issue Consumables (Multi-Item)
                </button>
              )}
            </div>

            {/* Store Location Filter Banner */}
            <div className="p-4 border rounded-xl bg-card flex flex-col md:flex-row md:items-center gap-4 justify-between shadow-sm">
              <div className="w-full md:w-80">
                <label className="block text-xs font-bold mb-1 text-muted-foreground uppercase tracking-wider">
                  Store / Warehouse Location *
                </label>
                <SearchableSelect
                  options={storeOptions}
                  value={selectedStoreId}
                  onChange={(val: string) => setSelectedStoreId(val)}
                  placeholder="Select Store Location..."
                />
              </div>

              <div className="text-xs text-muted-foreground">
                {storeMatchesActiveProject(stores.find((store) => store.id === selectedStoreId)) && <span className="mr-2 px-2 py-0.5 rounded-full font-bold bg-primary/10 text-primary border border-primary/20">Project Store</span>}
                Showing <strong className="text-foreground">{filteredStoreItems.length}</strong> consumable items in the selected location
              </div>
            </div>

            <div className="flex flex-wrap gap-2 border-b">
              {[
                ['STOCK', 'Available Stock', filteredStoreItems.length],
                ['CONSUMPTION', 'Project Consumption', projectConsumptions.length],
                ['LOW_STOCK', 'Low Stock', lowStockItems.length],
              ].map(([view, label, count]) => (
                <button
                  key={String(view)}
                  type="button"
                  onClick={() => setStoreView(view as 'STOCK' | 'CONSUMPTION' | 'LOW_STOCK')}
                  className={`px-3 py-2 text-xs font-bold border-b-2 transition ${storeView === view ? 'border-primary text-primary' : 'border-transparent text-muted-foreground hover:text-foreground'}`}
                >
                  {label} <span className="ml-1 rounded-full bg-muted px-1.5 py-0.5 text-[10px]">{count}</span>
                </button>
              ))}
            </div>

            {storeView === 'CONSUMPTION' ? (
              <div className="border rounded-xl bg-card overflow-hidden shadow-sm">
                <div className="px-4 py-3 border-b bg-muted/30">
                  <h3 className="text-sm font-bold">{activeProject?.name || 'Selected Project'} Consumption</h3>
                  <p className="text-xs text-muted-foreground mt-0.5">Consumables issued to this project site</p>
                </div>
                {projectConsumptions.length === 0 ? (
                  <p className="p-8 text-center text-xs text-muted-foreground">No consumable issues have been recorded for this project site.</p>
                ) : (
                  <div className="divide-y">
                    {projectConsumptions.sort((first, second) => second.quantity - first.quantity).map((item) => (
                      <div key={item.id} className="px-4 py-3 flex items-center justify-between gap-3">
                        <div>
                          <p className="text-sm font-bold text-foreground">{item.name}</p>
                          <p className="text-[11px] text-muted-foreground">Last issued: {item.lastIssuedAt ? new Date(item.lastIssuedAt).toLocaleDateString() : 'Not recorded'}</p>
                        </div>
                        <span className="text-xs font-bold font-mono text-primary">{formatStoreQuantity(item.quantity)} {item.unit} ISSUED</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {(storeView === 'LOW_STOCK' ? lowStockItems : filteredStoreItems).map((item) => {
                  const quantity = item.quantity_on_hand ?? item.quantity_available ?? 0;
                  const reorderPoint = item.reorder_point ?? item.min_stock_level ?? item.reorder_level;
                  return (
                    <div key={item.id} className={`p-4 border rounded-xl bg-card space-y-2 shadow-sm ${storeView === 'LOW_STOCK' ? 'border-destructive/30' : ''}`}>
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-[10px] font-bold font-mono px-2 py-0.5 rounded bg-muted text-muted-foreground border">{item.code || 'ITEM'}</span>
                        <span className={`text-xs font-bold px-2 py-0.5 rounded border ${storeView === 'LOW_STOCK' ? 'text-destructive bg-destructive/10 border-destructive/20' : 'text-primary bg-primary/10 border-primary/20'}`}>
                          {formatStoreQuantity(quantity)} {item.unit_of_measure || item.unit || 'PCS'} IN STOCK
                        </span>
                      </div>
                      <h3 className="font-bold text-sm text-foreground">{item.name}</h3>
                      <p className="text-xs text-muted-foreground">{item.description || 'Site Consumable'}</p>
                      {reorderPoint != null && <p className="text-[11px] text-muted-foreground">Reorder level: <strong className="text-foreground">{formatStoreQuantity(reorderPoint)} {item.unit_of_measure || item.unit || 'PCS'}</strong></p>}
                    </div>
                  );
                })}
                {((storeView === 'LOW_STOCK' ? lowStockItems : filteredStoreItems).length === 0) && (
                  <div className="col-span-full p-8 border rounded-xl bg-card text-center text-xs text-muted-foreground">
                    {storeView === 'LOW_STOCK' ? 'No low-stock consumables in this store.' : 'No consumables are available in this store.'}
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* TAB 5: DEDICATED SITE TEAM DIRECTORY PAGE */}
        {activeTab === 'TEAM' && (
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h2 className="text-lg font-bold flex items-center gap-2 text-foreground">
                  <User className="h-5 w-5 text-primary" />
                  Site Team Directory & Assigned Personnel
                </h2>
                <p className="text-xs text-muted-foreground">
                  View all colleagues and site personnel assigned to <strong className="text-foreground">{myProjects.find((p) => p.id === selectedProjectId)?.name || 'No assigned project'}</strong>
                </p>
              </div>

              <div className="relative w-full sm:w-64">
                <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                <input
                  type="text"
                  placeholder="Search team member or role..."
                  value={searchTeam}
                  onChange={(e) => setSearchTeam(e.target.value)}
                  className="w-full pl-9 pr-3 py-1.5 text-xs border rounded-lg bg-background"
                />
              </div>
            </div>

            {/* Team Cards Grid */}
            <FieldTeamLeaveRequests key={`${user?.id}-${selectedProjectId}-${version}`} projectId={selectedProjectId} search={searchTeam} />
            {(() => {
              const activeProj = myProjects.find((p) => p.id === selectedProjectId);
              const activeProjectName = activeProj?.name || 'No assigned project';
              const filteredTeam = teamEmployees.filter((emp) => {
                if (!selectedProjectId) return false;
                if (selectedProjectId) {
                  const pId = emp.assigned_project_id || emp.current_project_id || emp.project_id || emp.current_project?.id || emp.current_assignment?.project_id || '';
                  const pName = emp.assigned_project_name || emp.current_project_name || emp.project_name || emp.current_project?.name || emp.current_assignment?.project?.name || '';
                  const matchId = pId && pId === selectedProjectId;
                  const matchName = pName && activeProj?.name && pName.toLowerCase() === activeProj.name.toLowerCase();
                  if (!matchId && !matchName) return false;
                }
                if (searchTeam) {
                  const q = searchTeam.toLowerCase();
                  const fullName = `${emp.first_name || ''} ${emp.last_name || ''}`.toLowerCase();
                  const jobTitle = (emp.job_title || '').toLowerCase();
                  const dept = (emp.department || '').toLowerCase();
                  if (!fullName.includes(q) && !jobTitle.includes(q) && !dept.includes(q)) {
                    return false;
                  }
                }
                return true;
              });

              if (filteredTeam.length === 0) {
                return (
                  <div className="p-8 text-center bg-card border rounded-xl space-y-2">
                    <User className="mx-auto h-8 w-8 text-muted-foreground opacity-50" />
                    <h4 className="font-bold text-sm text-foreground">No Team Members Found</h4>
                    <p className="text-xs text-muted-foreground">
                      {searchTeam
                        ? `No site personnel matching "${searchTeam}" found.`
                        : `No personnel currently assigned to ${activeProjectName}.`}
                    </p>
                  </div>
                );
              }

              return (
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                  {filteredTeam.map((emp) => (
                    <div
                      key={emp.id || emp.email}
                      className="p-4 border rounded-xl bg-card space-y-3 shadow-sm hover:border-primary/50 transition cursor-pointer flex flex-col justify-between"
                      onClick={() => setSelectedColleague(emp)}
                    >
                      <div className="space-y-2">
                        <div className="flex items-center gap-3">
                          <div className="h-10 w-10 rounded-full bg-primary text-primary-foreground font-extrabold flex items-center justify-center text-sm shadow-sm shrink-0">
                            {emp.first_name?.[0] || 'E'}
                          </div>
                          <div className="min-w-0">
                            <h3 className="font-bold text-sm text-foreground truncate">
                              {emp.first_name} {emp.last_name}
                            </h3>
                             <span className="text-[10px] font-medium text-muted-foreground block truncate">
                               {emp.job_title || 'Field Specialist'}
                             </span>
                             {[
                               emp.role,
                               emp.role_name,
                               emp.user_role,
                               ...(Array.isArray(emp.roles) ? emp.roles : []),
                               emp.job_title,
                             ].filter(Boolean).join(' ').toLowerCase().includes('supervisor') && (
                               <span className="inline-flex items-center gap-1 mt-1 px-1.5 py-0.5 rounded text-[9px] font-bold uppercase tracking-wide bg-primary/10 text-primary border border-primary/20">
                                 <ShieldCheck size={10} /> Supervisor
                               </span>
                             )}
                           </div>
                        </div>

                        <div className="space-y-1 text-[11px] pt-2 border-t">
                          <div className="flex justify-between text-muted-foreground">
                            <span>Shift Status:</span>
                            <span className="font-bold text-primary">ON SHIFT / ACTIVE</span>
                          </div>
                          <div className="flex justify-between text-muted-foreground">
                            <span>Assigned Site:</span>
                            <span className="font-medium text-foreground truncate max-w-[120px]">
                              {emp.assigned_project_name || (myProjects.find((p) => p.id === selectedProjectId)?.name) || 'Site Assigned'}
                            </span>
                          </div>
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedColleague(emp);
                        }}
                        className="w-full py-1.5 bg-secondary text-primary font-bold rounded-lg text-xs hover:bg-muted transition flex items-center justify-center gap-1 mt-2"
                      >
                        <User size={13} /> View Contact Card
                      </button>
                    </div>
                  ))}
                </div>
              );
            })()}
          </div>
        )}

        {/* TAB 6: MY PROFILE & LEAVE MANAGEMENT */}
        {activeTab === 'PROFILE' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* User Info Card */}
            <div className="p-5 border rounded-xl bg-card space-y-4 shadow-sm h-fit">
              <div className="flex items-center gap-3 border-b pb-4">
                <div className="h-12 w-12 rounded-full bg-primary text-primary-foreground font-extrabold flex items-center justify-center text-lg shadow-md">
                  {user?.first_name?.[0] || 'U'}
                </div>
                <div className="min-w-0">
                  <h3 className="font-bold text-base text-foreground truncate">{user?.first_name} {user?.last_name}</h3>
                  <p className="text-xs text-muted-foreground truncate">{user?.email}</p>
                </div>
              </div>

              <div className="space-y-2 text-xs">
                <div className="flex justify-between py-1 border-b">
                  <span className="text-muted-foreground">Operational Status</span>
                  <span className="font-bold text-primary">ACTIVE ON SITE</span>
                </div>
                <div className="flex justify-between py-1 border-b">
                  <span className="text-muted-foreground">Assigned Project</span>
                  <span className="font-bold text-foreground">{myProjects[0]?.name || 'Solway Mount Belleh Project'}</span>
                </div>
                <div className="flex justify-between py-1 border-b">
                  <span className="text-muted-foreground">Portal View</span>
                  <span className="font-bold text-foreground">FIELD OPERATIONS PORTAL</span>
                </div>
              </div>

              {/* Full Profile Portal Section */}
              <div className="p-4 border rounded-xl bg-card space-y-2.5">
                <div className="flex items-center gap-2 text-primary font-bold text-xs">
                  <User size={15} />
                  <span>Full Profile & Personnel Portal</span>
                </div>
                <p className="text-[11px] text-muted-foreground leading-relaxed">
                  Access your full personnel record, certifications, and administrative profile portal.
                </p>
                <div className="space-y-2 pt-1">
                  <button
                    onClick={() => router.push('/field-portal/profile')}
                    className="w-full py-2 bg-primary text-primary-foreground font-bold rounded-lg text-xs hover:bg-primary/90 transition shadow-sm flex items-center justify-center gap-1.5"
                  >
                    <User size={13} /> Open Full Profile
                  </button>
                  {!user?.is_field_portal_only && (
                    <button
                      onClick={() => router.push('/workforce-overview')}
                      className="w-full py-1.5 bg-background border hover:bg-muted text-foreground font-semibold rounded-lg text-xs transition flex items-center justify-center gap-1"
                    >
                      <span>Go to Workforce Platform</span>
                      <ArrowRight size={13} />
                    </button>
                  )}
                </div>
              </div>

            </div>

            {/* Leave Requests & Time Logs Column */}
            <div className="lg:col-span-2 space-y-6">

              {/* Leave Requests & History */}
              <div className="p-5 border rounded-xl bg-card space-y-4 shadow-sm">
                <div className="flex items-center justify-between border-b pb-3">
                  <h3 className="font-bold text-sm flex items-center gap-2 text-foreground">
                    <Calendar className="h-4 w-4 text-primary" /> My Field Leave Requests & History
                  </h3>
                  <button
                    onClick={() => setShowLeaveModal(true)}
                    className="px-3 py-1 bg-primary text-primary-foreground hover:bg-primary/90 font-bold rounded-lg text-xs transition flex items-center gap-1"
                  >
                    <Plus size={13} /> Submit Leave Request
                  </button>
                </div>

                <div className="space-y-3">
                  {leaveLoading && <p role="status" className="text-muted-foreground">Loading leave requests…</p>}
                  {!leaveLoading && !leaveError && myLeaveRequests.length === 0 && <p className="text-muted-foreground text-xs">No leave requests submitted yet.</p>}
                  {myLeaveRequests.map((l) => (
                    <div key={l.id} className="p-4 border rounded-xl bg-muted/20 space-y-2 text-xs">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-foreground text-sm">{l.leave_type} ({l.days} Days)</span>
                        <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                          l.status === 'APPROVED' ? 'bg-primary/10 text-primary border border-primary/20' : 'bg-muted text-foreground border'
                        }`}>
                          {l.status}
                        </span>
                      </div>
                      <div className="flex flex-wrap items-center justify-between text-muted-foreground gap-2">
                        <span>Dates: <strong>{l.start_date}</strong> to <strong>{l.end_date}</strong></span>
                        {l.attachment_name && (
                          <span className="text-primary font-mono text-[11px] flex items-center gap-1">
                            <Paperclip size={12} /> {l.attachment_name}
                          </span>
                        )}
                      </div>
                      {l.reason && (
                        <p className="text-[11px] text-muted-foreground italic border-t pt-1.5 mt-1">
                          Reason: &quot;{l.reason}&quot;
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* Time Logs Card */}
              <div className="p-5 border rounded-xl bg-card space-y-4 shadow-sm">
                <div className="flex items-center justify-between border-b pb-3">
                  <h3 className="font-bold text-sm flex items-center gap-2 text-foreground">
                    <Clock className="h-4 w-4 text-indigo-500" /> My Time Logs
                  </h3>
                  <button
                    onClick={() => setShowTimeLogModal(true)}
                    className="px-3 py-1 bg-indigo-600 text-white hover:bg-indigo-700 font-bold rounded-lg text-xs transition flex items-center gap-1"
                  >
                    <Plus size={13} /> Log Working Time
                  </button>
                </div>

                <div className="space-y-3">
                  {timeLogsLoading && <p role="status" className="text-muted-foreground text-xs">Loading time logs…</p>}
                  {!timeLogsLoading && myTimeLogs.length === 0 && (
                    <p className="text-muted-foreground text-xs">No time logs recorded yet.</p>
                  )}
                  {myTimeLogs.slice(0, 10).map((t, idx) => (
                    <div key={t.id ?? idx} className="p-3 border rounded-xl bg-muted/20 space-y-1 text-xs">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-foreground">{t.date}</span>
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-100 text-indigo-700 border border-indigo-200 dark:bg-indigo-950/40 dark:text-indigo-300">
                          {t.check_in ? t.check_in.slice(11, 16) : '—'} → {t.check_out ? t.check_out.slice(11, 16) : '—'}
                        </span>
                      </div>
                      {t.notes && (
                        <p className="text-muted-foreground text-[11px] italic truncate">{t.notes}</p>
                      )}
                    </div>
                  ))}
                  {myTimeLogs.length > 10 && (
                    <p className="text-[11px] text-muted-foreground text-center">+ {myTimeLogs.length - 10} more entries</p>
                  )}
                </div>
              </div>

            </div>

          </div>
        )}
      </div>

      {/* MODAL: CREATE NEW DRILL HOLE */}
      {showCreateHoleModal && (
        <Modal error={formErrors["drill-hole"]} title="Create New Drill Hole Specification" onClose={() => setShowCreateHoleModal(false)}>
          <form onSubmit={handleCreateDrillHole} className="space-y-4 text-xs">
            <div>
              <label className="block font-bold mb-1">Drill Hole ID / Number *</label>
              <input
                type="text"
                required
                value={holeForm.hole_number}
                onChange={(e) => setHoleForm({ ...holeForm, hole_number: e.target.value })}
                placeholder="e.g. SMB-RC-045"
                className="w-full border rounded p-2 bg-background font-mono font-bold"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block font-bold mb-1">Site / Project *</label>
                <SearchableSelect
                  options={projectOptions}
                  value={holeForm.project_id}
                  onChange={(val: string) => setHoleForm({ ...holeForm, project_id: val })}
                  placeholder="Select Project..."
                />
              </div>

              <div>
                <label className="block font-bold mb-1">Drilling Method *</label>
                <select
                  value={holeForm.drilling_method}
                  onChange={(e) => setHoleForm({ ...holeForm, drilling_method: e.target.value })}
                  className="w-full border rounded p-2 bg-background font-bold"
                >
                  <option value="RC">Reverse Circulation (RC)</option>
                  <option value="DD">Diamond Core (DD)</option>
                  <option value="RAB">Rotary Air Blast (RAB)</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="block font-bold mb-1">Target Depth (m)</label>
                <input
                  type="number"
                  min="1"
                  value={holeForm.target_depth_m}
                  onChange={(e) => setHoleForm({ ...holeForm, target_depth_m: Number(e.target.value) })}
                  className="w-full border rounded p-2 bg-background font-mono"
                />
              </div>

              <div>
                <label className="block font-medium mb-1">Dip Angle (°)</label>
                <input
                  type="number"
                  value={holeForm.dip_deg}
                  onChange={(e) => setHoleForm({ ...holeForm, dip_deg: Number(e.target.value) })}
                  className="w-full border rounded p-2 bg-background font-mono"
                  placeholder="-60"
                />
              </div>

              <div>
                <label className="block font-medium mb-1">Azimuth (°)</label>
                <input
                  type="number"
                  value={holeForm.azimuth_deg}
                  onChange={(e) => setHoleForm({ ...holeForm, azimuth_deg: Number(e.target.value) })}
                  className="w-full border rounded p-2 bg-background font-mono"
                  placeholder="180"
                />
              </div>
            </div>

            <div>
              <label className="block font-medium mb-1">Hole Target Notes</label>
              <textarea
                rows={2}
                value={holeForm.notes}
                onChange={(e) => setHoleForm({ ...holeForm, notes: e.target.value })}
                placeholder="Target geological structure, section line, or collar notes..."
                className="w-full border rounded p-2 bg-background resize-y"
              />
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t">
              <button
                type="button"
                onClick={() => setShowCreateHoleModal(false)}
                className="px-4 py-2 border rounded-lg hover:bg-muted font-medium"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-2 bg-primary text-primary-foreground font-bold rounded-lg hover:bg-primary/90"
              >
                Save Drill Hole
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* MODAL: LOG SHIFT PRODUCTION REPORT WITH WORKED HOLE INTERVALS */}
      {isSupervisorOrAdmin && showShiftModal && (
        <Modal error={formErrors["shift"]} title="Log Shift Production Report" onClose={() => setShowShiftModal(false)}>
          <form onSubmit={handleSubmitShiftReport} className="space-y-4 text-xs">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block font-bold mb-1">Drilling Rig / Equipment *</label>
                <SearchableSelect
                  options={assetOptions}
                  value={shiftForm.rig_id}
                  onChange={(val: string) => setShiftForm({ ...shiftForm, rig_id: val })}
                  placeholder="Select Rig..."
                  required
                />
              </div>

              <div>
                <label className="block font-bold mb-1">Site / Project *</label>
                <SearchableSelect
                  options={projectOptions}
                  value={shiftForm.project_id}
                  onChange={(val: string) => setShiftForm({ ...shiftForm, project_id: val })}
                  placeholder="Select Site Project..."
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block font-bold mb-1">Shift Date *</label>
                <input
                  type="date"
                  required
                  value={shiftForm.shift_date}
                  onChange={(e) => setShiftForm({ ...shiftForm, shift_date: e.target.value })}
                  className="w-full border rounded-lg p-2 bg-background font-mono"
                />
              </div>

              <div>
                <label className="block font-bold mb-1">Shift Type *</label>
                <select
                  value={shiftForm.shift_type}
                  onChange={(e) => setShiftForm({ ...shiftForm, shift_type: e.target.value })}
                  className="w-full border rounded-lg p-2 bg-background font-bold"
                >
                  <option value="DAY">Day Shift (DS)</option>
                  <option value="NIGHT">Night Shift (NS)</option>
                </select>
              </div>
            </div>

            {/* WORKED DRILL HOLE INTERVALS LOGGING SECTION */}
            <div className="border-t pt-3 space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <label className="block font-bold text-foreground">
                    Worked Drill Hole Intervals *
                  </label>
                  <span className="text-[10px] text-muted-foreground block">
                    Select drilled hole and enter depth range for this shift
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setShowCreateHoleModal(true)}
                    className="px-2 py-1 text-[11px] border bg-background font-bold text-primary rounded-lg hover:bg-muted"
                  >
                    + New Hole
                  </button>
                  <button
                    type="button"
                    onClick={addShiftIntervalRow}
                    className="px-2 py-1 text-[11px] bg-secondary text-primary font-bold rounded-lg hover:bg-secondary/80 flex items-center gap-1"
                  >
                    <Plus size={12} /> Add Interval
                  </button>
                </div>
              </div>

              {shiftIntervals.map((interval, idx) => (
                <div key={idx} className="p-3 border rounded-xl bg-muted/20 space-y-2 relative">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold uppercase text-muted-foreground">
                      Hole Interval #{idx + 1}
                    </span>
                    {shiftIntervals.length > 1 && (
                      <button
                        type="button"
                        onClick={() => removeShiftIntervalRow(idx)}
                        className="text-destructive hover:opacity-80 p-1"
                      >
                        <Trash2 size={13} />
                      </button>
                    )}
                  </div>

                  <div>
                    <label className="block font-medium mb-1">Select Worked Drill Hole *</label>
                    <SearchableSelect
                      options={holeOptions}
                      value={interval.drill_hole_id}
                      onChange={(val: string) => setShiftIntervalHole(idx, val)}
                      placeholder="Select Drill Hole (e.g. SMB-RC-001)..."
                      required
                    />
                    {interval.drill_hole_id && (() => {
                      const progress = drillHoleProgress.get(interval.drill_hole_id);
                      return progress ? <p className="mt-1 text-[10px] text-muted-foreground">Current depth: <strong className="text-foreground">{progress.currentDepthM} m</strong>{progress.targetDepthM > 0 && <> of {progress.targetDepthM} m target · {progress.remainingDepthM} m remaining{progress.progressPct != null && ` (${progress.progressPct}%)`}</>}</p> : null;
                    })()}
                  </div>

                  <div className="grid grid-cols-3 gap-2">
                    <div>
                      <label className="block font-medium mb-1">From Depth (m) *</label>
                      <input
                        type="number"
                        step="0.5"
                        min="0"
                        required
                        value={interval.from_depth_m}
                        onChange={(e) => {
                          const next = [...shiftIntervals];
                          next[idx].from_depth_m = Number(e.target.value);
                          setShiftIntervals(next);
                        }}
                        className="w-full border rounded p-1.5 bg-background font-mono"
                      />
                    </div>
                    <div>
                      <label className="block font-medium mb-1">To Depth (m) *</label>
                      <input
                        type="number"
                        step="0.5"
                        min="0"
                        required
                        value={interval.to_depth_m}
                        onChange={(e) => {
                          const next = [...shiftIntervals];
                          next[idx].to_depth_m = Number(e.target.value);
                          setShiftIntervals(next);
                        }}
                        className="w-full border rounded p-1.5 bg-background font-mono font-bold"
                      />
                    </div>
                    <div>
                      <label className="block font-medium mb-1">Core Rec %</label>
                      <input
                        type="number"
                        step="0.1"
                        min="0"
                        max="100"
                        value={interval.core_recovery_pct}
                        onChange={(e) => {
                          const next = [...shiftIntervals];
                          next[idx].core_recovery_pct = Number(e.target.value);
                          setShiftIntervals(next);
                        }}
                        className="w-full border rounded p-1.5 bg-background font-mono"
                      />
                    </div>
                  </div>
                </div>
              ))}

              <div className="p-2.5 rounded-lg bg-card border text-xs font-semibold text-foreground flex justify-between">
                <span>Calculated Shift Total Metres:</span>
                <span className="font-mono font-extrabold text-primary">{totalMetresFromIntervals} m</span>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="block font-medium mb-1">Productive Hrs</label>
                <input
                  type="number"
                  step="0.5"
                  min="0"
                  value={shiftForm.productive_hours}
                  onChange={(e) => setShiftForm({ ...shiftForm, productive_hours: Number(e.target.value) })}
                  className="w-full border rounded p-2 bg-background font-mono"
                />
              </div>

              <div>
                <label className="block font-medium mb-1">Standby Hrs</label>
                <input
                  type="number"
                  step="0.5"
                  min="0"
                  value={shiftForm.standby_hours}
                  onChange={(e) => setShiftForm({ ...shiftForm, standby_hours: Number(e.target.value) })}
                  className="w-full border rounded p-2 bg-background font-mono"
                />
              </div>

              <div>
                <label className="block font-medium mb-1">Downtime Hrs</label>
                <input
                  type="number"
                  step="0.5"
                  min="0"
                  value={shiftForm.maintenance_hours}
                  onChange={(e) => setShiftForm({ ...shiftForm, maintenance_hours: Number(e.target.value) })}
                  className="w-full border rounded p-2 bg-background font-mono text-destructive font-bold"
                />
              </div>
            </div>

            <FieldConsumables key={`${shiftForm.project_id || selectedProjectId}:${shiftForm.shift_date}`} projectId={shiftForm.project_id || selectedProjectId} logDate={shiftForm.shift_date} onBusyChange={setConsumablesBusy} />
            <div>
              <label className="block font-medium mb-1">Shift Notes / HSE Observations</label>
              <textarea
                rows={2}
                value={shiftForm.notes}
                onChange={(e) => setShiftForm({ ...shiftForm, notes: e.target.value })}
                placeholder="Log bit changes, ground condition remarks, or HSE observations..."
                className="w-full border rounded p-2 bg-background resize-y"
              />
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t">
              <button
                type="button"
                onClick={() => setShowShiftModal(false)}
                className="px-4 py-2 border rounded-lg hover:bg-muted font-medium"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-2 bg-primary text-primary-foreground font-bold rounded-lg hover:bg-primary/90 transition"
              >
                Submit Shift Report
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* MODAL: CREATE & ASSIGN EQUIPMENT MAINTENANCE SCHEDULE (FULL CAPABILITIES) */}
      {isSupervisorOrAdmin && showMaintenanceModal && (
        <Modal error={formErrors["maintenance"]} title="Create & Dispatch Equipment Maintenance Schedule" onClose={() => setShowMaintenanceModal(false)}>
          <form onSubmit={handleCreateMaintenance} className="space-y-4 px-2 text-xs max-h-[80vh] overflow-y-auto">
            {/* SECTION 1: TARGET EQUIPMENT & SERVICE METER TRIGGER */}
            <div className="p-3 border rounded-xl bg-muted/20 space-y-3">
              <h4 className="font-bold text-xs uppercase tracking-wider text-muted-foreground flex items-center gap-1.5 border-b pb-1.5">
                <Truck size={14} className="text-primary" /> Equipment & Service Meter Trigger
              </h4>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold mb-1">Target Asset / Equipment Rig *</label>
                  <SearchableSelect
                    options={assetOptions}
                    value={maintForm.asset_id}
                    onChange={(val: string) => setMaintForm({ ...maintForm, asset_id: val })}
                    placeholder="Select Equipment Rig / Tanker..."
                    required
                  />
                </div>

                <div>
                  <label className="block font-bold mb-1">Target Service Meter Reading (Hours) (Optional)</label>
                  <input
                    type="number"
                    min="0"
                    value={maintForm.meter_reading}
                    onChange={(e) => setMaintForm({ ...maintForm, meter_reading: e.target.value === '' ? '' : Number(e.target.value) })}
                    className="w-full border rounded-lg p-2 bg-background font-mono font-bold"
                    placeholder="e.g. 1670"
                  />
                </div>
              </div>

              {/* Link Asset Breakdown / Reported Defect */}
              {myBreakdowns.length > 0 && (
                <div>
                  <label className="block font-medium mb-1">Link Reported Asset Breakdown / Safety Defect (Optional)</label>
                  <select
                    value={maintForm.defect_id}
                    onChange={(e) => setMaintForm({ ...maintForm, defect_id: e.target.value })}
                    className="w-full border rounded-lg p-2 bg-background font-medium"
                  >
                    <option value="">-- No Defect Linked (Scheduled PM) --</option>
                    {myBreakdowns.map((b) => (
                      <option key={b.id} value={b.id}>
                        [{b.severity}] {b.title} ({b.asset_name})
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </div>

            {/* SECTION 2: MAINTENANCE CLASSIFICATION & STRATEGY */}
            <div className="space-y-3">
              <div>
                <label className="block font-bold mb-1">Maintenance Schedule Title *</label>
                <input
                  type="text"
                  required
                  value={maintForm.title}
                  onChange={(e) => setMaintForm({ ...maintForm, title: e.target.value })}
                  placeholder="e.g. 250-Hour Hydraulic Oil & Filter Replacement Cycle"
                  className="w-full border rounded-lg p-2 bg-background font-semibold"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold mb-1">Maintenance Type *</label>
                  <select
                    value={maintForm.maintenance_type}
                    onChange={(e) => setMaintForm({ ...maintForm, maintenance_type: e.target.value })}
                    className="w-full border rounded-lg p-2 bg-background font-semibold"
                  >
                    <option value="PREVENTIVE">Preventive Maintenance (PM)</option>
                    <option value="CORRECTIVE">Corrective Repair</option>
                    <option value="INSPECTION">Safety Inspection & Audit</option>
                    <option value="OVERHAUL">Major Component Overhaul</option>
                  </select>
                </div>

                <div>
                  <label className="block font-bold mb-1">Component System / Failure Taxonomy *</label>
                  <select
                    value={maintForm.failure_taxonomy}
                    onChange={(e) => setMaintForm({ ...maintForm, failure_taxonomy: e.target.value })}
                    className="w-full border rounded-lg p-2 bg-background font-semibold"
                  >
                    <option value="HYDRAULIC">Hydraulic System</option>
                    <option value="ENGINE">Engine & Drivetrain</option>
                    <option value="ELECTRICAL">Electrical & Instrumentation</option>
                    <option value="PNEUMATIC">Pneumatic & Air Compressor</option>
                    <option value="STRUCTURAL">Structural & Mast Chassis</option>
                    <option value="GENERAL">General PM / Lubrication</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold mb-1">Priority Level *</label>
                  <select
                    value={maintForm.priority}
                    onChange={(e) => setMaintForm({ ...maintForm, priority: e.target.value })}
                    className="w-full border rounded-lg p-2 bg-background font-bold"
                  >
                    <option value="LOW">Low Priority</option>
                    <option value="MEDIUM">Medium Priority</option>
                    <option value="HIGH">High Priority</option>
                    <option value="CRITICAL">Critical / Downtime Risk</option>
                  </select>
                </div>

                <div>
                  <label className="block font-bold mb-1">Recurrence Frequency</label>
                  <select
                    value={maintForm.recurrence}
                    onChange={(e) => setMaintForm({ ...maintForm, recurrence: e.target.value })}
                    className="w-full border rounded-lg p-2 bg-background font-medium"
                  >
                    <option value="ONE_OFF">One-Time Service</option>
                    <option value="EVERY_250_HOURS">Every 250 Engine Hours</option>
                    <option value="EVERY_500_HOURS">Every 500 Engine Hours</option>
                    <option value="WEEKLY">Weekly Schedule</option>
                    <option value="MONTHLY">Monthly Schedule</option>
                    <option value="QUARTERLY">Quarterly Audit</option>
                  </select>
                </div>
              </div>
            </div>

            {/* SECTION 3: SCHEDULING & RESOURCE ALLOCATION */}
            <div className="p-3 border rounded-xl bg-card space-y-3">
              <h4 className="font-bold text-xs uppercase tracking-wider text-muted-foreground border-b pb-1.5">
                Scheduling & Resource Allocation
              </h4>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold mb-1">Scheduled Start Date *</label>
                  <input
                    type="date"
                    required
                    value={maintForm.scheduled_date}
                    onChange={(e) => setMaintForm({ ...maintForm, scheduled_date: e.target.value })}
                    className="w-full border rounded-lg p-2 bg-background font-mono"
                  />
                </div>

                <div>
                  <label className="block font-bold mb-1 flex items-center justify-between">
                    <span>Assign Technician / Specialist *</span>
                    <span className="text-[10px] text-primary font-mono font-bold">
                      {maintForm.assigned_to_ids.length} Assigned
                    </span>
                  </label>
                  <SearchableSelect
                    options={employeeOptions}
                    value=""
                    onChange={(val: string) => {
                      if (val && !maintForm.assigned_to_ids.includes(val)) {
                        setMaintForm({
                          ...maintForm,
                          assigned_to_ids: [...maintForm.assigned_to_ids, val],
                        });
                      }
                    }}
                    placeholder="Select Technician / Specialist..."
                  />

                  {/* ASSIGNED SPECIALIST BADGES */}
                  <div className="flex flex-wrap gap-1.5 pt-2">
                    {maintForm.assigned_to_ids.map((empId) => {
                      const emp = teamEmployees.find((e) => e.id === empId || e.email === empId);
                      const name = emp ? `${emp.first_name} ${emp.last_name}` : empId;
                      const title = emp?.job_title || 'Specialist';
                      return (
                        <span
                          key={empId}
                          className="px-2.5 py-1 bg-primary/10 border border-primary/20 text-primary font-bold rounded-lg text-xs flex items-center gap-1.5 shadow-sm"
                        >
                          <User size={12} />
                          <span>{name} ({title})</span>
                          <button
                            type="button"
                            onClick={() => {
                              setMaintForm({
                                ...maintForm,
                                assigned_to_ids: maintForm.assigned_to_ids.filter((id) => id !== empId),
                              });
                            }}
                            className="hover:text-destructive transition ml-0.5"
                            title="Remove technician"
                          >
                            <X size={12} />
                          </button>
                        </span>
                      );
                    })}
                    {maintForm.assigned_to_ids.length === 0 && (
                      <span className="text-muted-foreground text-[11px] italic">No technician assigned yet</span>
                    )}
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-medium mb-1">Est. Maintenance Duration (Hours)</label>
                  <input
                    type="number"
                    step="0.5"
                    min="0.5"
                    value={maintForm.estimated_hours}
                    onChange={(e) => setMaintForm({ ...maintForm, estimated_hours: Number(e.target.value) })}
                    className="w-full border rounded-lg p-2 bg-background font-mono"
                  />
                </div>

                <div>
                  <label className="block font-medium mb-1">Est. Equipment Downtime (Hours)</label>
                  <input
                    type="number"
                    step="0.5"
                    min="0"
                    value={maintForm.downtime_hours}
                    onChange={(e) => setMaintForm({ ...maintForm, downtime_hours: Number(e.target.value) })}
                    className="w-full border rounded-lg p-2 bg-background font-mono"
                  />
                </div>
              </div>
            </div>

            {/* SECTION 4: INTERACTIVE MAINTENANCE CHECKLIST TASKS */}
            <div className="space-y-2 border-t pt-3">
              <div className="flex items-center justify-between">
                <label className="block font-bold text-foreground flex items-center gap-1.5">
                  <CheckCircle2 size={14} className="text-primary" /> Maintenance Checklist Tasks
                </label>
                <button
                  type="button"
                  onClick={addMaintChecklistItem}
                  className="px-2.5 py-1 bg-secondary text-primary font-bold rounded-lg text-[11px] hover:bg-secondary/80 transition flex items-center gap-1"
                >
                  <Plus size={12} /> Add Checklist Item
                </button>
              </div>

              <div className="space-y-2">
                {maintChecklist.map((taskText, idx) => (
                  <div key={idx} className="flex items-center gap-2">
                    <span className="font-mono text-muted-foreground text-[10px] w-5 text-right">{idx + 1}.</span>
                    <input
                      type="text"
                      value={taskText}
                      onChange={(e) => {
                        const updated = [...maintChecklist];
                        updated[idx] = e.target.value;
                        setMaintChecklist(updated);
                      }}
                      placeholder={`e.g. Task ${idx + 1} instruction...`}
                      className="flex-1 border rounded-lg p-2 bg-background text-xs"
                    />
                    {maintChecklist.length > 1 && (
                      <button
                        type="button"
                        onClick={() => removeMaintChecklistItem(idx)}
                        className="p-1 text-destructive hover:opacity-80"
                      >
                        <Trash2 size={14} />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* SECTION 5: REQUIRED SPARE PARTS & CONSUMABLES */}
            <div className="space-y-2 border-t pt-3">
              <div className="flex items-center justify-between">
                <label className="block font-bold text-foreground flex items-center gap-1.5">
                  <Package size={14} className="text-primary" /> Required Spare Parts & Consumables Allocation
                </label>
                <button
                  type="button"
                  onClick={addMaintSparePartRow}
                  className="px-2.5 py-1 bg-secondary text-primary font-bold rounded-lg text-[11px] hover:bg-secondary/80 transition flex items-center gap-1"
                >
                  <Plus size={12} /> Add Spare Part
                </button>
              </div>

              <div className="space-y-2">
                {maintSpareParts.map((partRow, idx) => (
                  <div key={idx} className="p-3 border rounded-xl bg-muted/10 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-bold uppercase text-muted-foreground">Part #{idx + 1}</span>
                      {maintSpareParts.length > 1 && (
                        <button
                          type="button"
                          onClick={() => removeMaintSparePartRow(idx)}
                          className="text-destructive hover:opacity-80 p-1"
                        >
                          <Trash2 size={13} />
                        </button>
                      )}
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                      <div className="sm:col-span-2">
                        <SearchableSelect
                          options={itemOptions}
                          value={partRow.item_id}
                          onChange={(val: string) => {
                            const updated = [...maintSpareParts];
                            updated[idx].item_id = val;
                            setMaintSpareParts(updated);
                          }}
                          placeholder="Select Inventory Part..."
                        />
                      </div>
                      <div>
                        <input
                          type="number"
                          min="1"
                          value={partRow.quantity}
                          onChange={(e) => {
                            const updated = [...maintSpareParts];
                            updated[idx].quantity = Number(e.target.value);
                            setMaintSpareParts(updated);
                          }}
                          placeholder="Qty"
                          className="w-full border rounded-lg p-2 bg-background font-mono"
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* SECTION 6: INSTRUCTIONS, ATTACHMENT & DISPATCH */}
            <div className="space-y-3 border-t pt-3">
              <div>
                <label className="block font-bold mb-1">Maintenance Instructions & Specific Notes</label>
                <textarea
                  rows={2}
                  value={maintForm.notes}
                  onChange={(e) => setMaintForm({ ...maintForm, notes: e.target.value })}
                  placeholder="Specify torque specs, oil grade (15W-40), safety permits required, or procedure notes..."
                  className="w-full border rounded-lg p-2 bg-background resize-y"
                />
              </div>

              {/* Service Manual / OEM Procedure Attachment */}
              <div className="border rounded-xl p-3 bg-muted/20 space-y-2">
                <label className="block font-bold text-foreground flex items-center justify-between">
                  <span>Attach OEM Service Manual / Safety Procedure Document</span>
                  <Upload size={14} className="text-primary" />
                </label>

                <div className="flex items-center gap-3">
                  <label className="cursor-pointer px-3 py-2 bg-primary hover:bg-primary/90 text-primary-foreground font-bold rounded-lg text-xs flex items-center gap-1.5 transition">
                    <Paperclip size={14} /> Attach Procedure File...
                    <input
                      type="file"
                      accept="image/*,application/pdf"
                      className="hidden"
                      onChange={(e) => {
                        if (e.target.files && e.target.files[0]) {
                          setMaintAttachment(e.target.files[0]);
                        }
                      }}
                    />
                  </label>

                  {maintAttachment ? (
                    <div className="flex items-center gap-2 bg-primary/10 border border-primary/20 text-primary px-3 py-1.5 rounded-lg font-mono text-xs">
                      <span>{maintAttachment.name} ({(maintAttachment.size / 1024).toFixed(1)} KB)</span>
                      <button
                        type="button"
                        onClick={() => setMaintAttachment(null)}
                        className="text-primary hover:text-destructive"
                      >
                        <X size={13} />
                      </button>
                    </div>
                  ) : (
                    <span className="text-muted-foreground text-[11px]">No procedure file attached</span>
                  )}
                </div>
              </div>

              {/* Auto Generate Work Order Checkbox */}
              <div className="p-3 border rounded-xl bg-card flex items-center gap-3">
                <input
                  type="checkbox"
                  id="auto_generate_wo"
                  checked={maintForm.auto_generate_wo}
                  onChange={(e) => setMaintForm({ ...maintForm, auto_generate_wo: e.target.checked })}
                  className="h-4 w-4 rounded border-primary text-primary focus:ring-primary cursor-pointer"
                />
                <label htmlFor="auto_generate_wo" className="text-xs cursor-pointer font-bold text-foreground">
                  Automatically generate and dispatch active Work Order to technician under "My Work & Tasks"
                </label>
              </div>
            </div>

            {/* FOOTER ACTIONS */}
            <div className="flex justify-end gap-2 pt-3 border-t">
              <button
                type="button"
                onClick={() => setShowMaintenanceModal(false)}
                className="px-4 py-2 border rounded-lg hover:bg-muted font-medium"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-2 bg-primary text-primary-foreground hover:bg-primary/90 font-bold rounded-lg transition flex items-center gap-1.5 shadow-sm"
              >
                <Wrench size={14} /> Create & Dispatch Maintenance Schedule
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* MODAL: STORE CONSUMABLE ISSUE (MULTI-ITEM LOGGING) */}
      {isSupervisorOrAdmin && showStoreIssueModal && (
        <Modal error={formErrors["store-issue"]} title="Log Consumable Issue (Multi-Item)" onClose={() => setShowStoreIssueModal(false)}>
          <div className="space-y-3 text-xs">
            <label className="block">Log date<input type="date" className="block border rounded p-2 bg-background" value={consumablesDate} onChange={e => setConsumablesDate(e.target.value)} /></label>
            <FieldConsumables key={`${selectedProjectId}:${consumablesDate}`} projectId={selectedProjectId} logDate={consumablesDate} />
          </div>
        </Modal>
      )}

      {/* MODAL 1: LOG EQUIPMENT FUEL REFILL (POST /api/v1/assets/:id/fuel-logs) */}
      {showFuelRefillModal && (
        <Modal error={formErrors["fuel"]} title="Log Equipment Fuel Refill & Delivery Receipt" onClose={() => setShowFuelRefillModal(false)}>
          <form onSubmit={handleSubmitFuelRefill} className="space-y-4 text-xs max-h-[80vh] overflow-y-auto pr-1">
            {/* SECTION 1: EQUIPMENT & FUEL TYPE */}
            <div className="p-3 border rounded-xl bg-muted/20 space-y-3">
              <h4 className="font-bold text-xs uppercase tracking-wider text-muted-foreground flex items-center gap-1.5 border-b pb-1.5">
                <Fuel size={14} className="text-primary" /> Target Equipment & Fuel Grade
              </h4>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold mb-1">Target Equipment / Rig *</label>
                  <SearchableSelect
                    options={assetOptions}
                    value={fuelRefillForm.asset_id}
                    onChange={(val: string) => handleEquipmentSelectForFuel(val)}
                    placeholder="Select Equipment..."
                    required
                  />
                </div>

                <div>
                  <label className="block font-bold mb-1">Fuel Grade / Type *</label>
                  <select
                    value={fuelRefillForm.fuel_type}
                    onChange={(e) => setFuelRefillForm({ ...fuelRefillForm, fuel_type: e.target.value })}
                    className="w-full border rounded-lg p-2 bg-background font-bold text-foreground"
                  >
                    <option value="DIESEL">Low-Sulfur Diesel (AGO)</option>
                    <option value="PETROL">Super Unleaded Gasoline (PMS)</option>
                    <option value="OTHER">Other / Specialty Fuel</option>
                  </select>
                </div>
              </div>
            </div>

            {/* SECTION 2: REFUELED QUANTITY & FINANCIAL COST */}
            <div className="p-3 border rounded-xl bg-card space-y-3">
              <h4 className="font-bold text-xs uppercase tracking-wider text-primary flex items-center gap-1.5 border-b pb-1.5">
                <DollarSign size={14} /> Refueling Volume & Cost (Standard Backend Schema)
              </h4>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block font-bold mb-0.5 text-xs text-foreground">Refueled Quantity (Litres) *</label>
                  <span className="block text-[10px] text-muted-foreground mb-1">Volume delivered to rig tank</span>
                  <input
                    type="number"
                    min="1"
                    step="0.5"
                    required
                    value={fuelRefillForm.quantity_litres}
                    onChange={(e) => {
                      const liters = Number(e.target.value);
                      const unitP = fuelRefillForm.unit_cost || 1.5;
                      const calculatedCost = Number((liters * unitP).toFixed(2));
                      setFuelRefillForm({
                        ...fuelRefillForm,
                        quantity_litres: liters,
                        total_cost: calculatedCost,
                      });
                    }}
                    className="w-full border rounded-lg p-2 bg-background font-mono font-bold text-foreground"
                  />
                </div>

                <div>
                  <label className="block font-bold mb-0.5 text-xs text-foreground">Total Refuel Cost ($) *</label>
                  <span className="block text-[10px] text-muted-foreground mb-1">Total invoice / receipt amount</span>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    required
                    value={fuelRefillForm.total_cost}
                    onChange={(e) => {
                      const cost = Number(e.target.value);
                      const liters = fuelRefillForm.quantity_litres || 1;
                      const calculatedUnitCost = liters > 0 ? Number((cost / liters).toFixed(3)) : 0;
                      setFuelRefillForm({
                        ...fuelRefillForm,
                        total_cost: cost,
                        unit_cost: calculatedUnitCost,
                      });
                    }}
                    className="w-full border rounded-lg p-2 bg-background font-mono font-bold text-foreground"
                  />
                </div>

                <div>
                  <label className="block font-bold mb-0.5 text-xs text-foreground flex items-center justify-between">
                    <span>Unit Cost ($/Litre)</span>
                    <span className="text-[10px] text-primary font-normal font-mono">Auto-calculated</span>
                  </label>
                  <span className="block text-[10px] text-muted-foreground mb-1">Total Cost ÷ Quantity (editable)</span>
                  <input
                    type="number"
                    step="0.001"
                    min="0"
                    value={fuelRefillForm.unit_cost}
                    onChange={(e) => {
                      const unitP = Number(e.target.value);
                      const liters = fuelRefillForm.quantity_litres || 0;
                      setFuelRefillForm({
                        ...fuelRefillForm,
                        unit_cost: unitP,
                        total_cost: Number((liters * unitP).toFixed(2)),
                      });
                    }}
                    className="w-full border rounded-lg p-2 bg-background font-mono font-bold text-foreground focus:ring-1 focus:ring-primary"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 pt-1">
                <div>
                  <label className="block font-medium mb-1">Currency</label>
                  <select
                    value={fuelRefillForm.currency}
                    onChange={(e) => setFuelRefillForm({ ...fuelRefillForm, currency: e.target.value })}
                    className="w-full border rounded-lg p-2 bg-background font-bold text-foreground"
                  >
                    <option value="USD">USD ($ - United States Dollar)</option>
                    <option value="LRD">LRD ($ - Liberian Dollar)</option>
                    <option value="EUR">EUR (€ - Euro)</option>
                  </select>
                </div>

                <div>
                  <label className="block font-medium mb-1">Refueling Date & Time</label>
                  <input
                    type="datetime-local"
                    value={fuelRefillForm.recorded_at}
                    onChange={(e) => setFuelRefillForm({ ...fuelRefillForm, recorded_at: e.target.value })}
                    className="w-full border rounded-lg p-2 bg-background font-mono text-foreground"
                  />
                </div>
              </div>
            </div>

            {/* SECTION 3: METER READING & SUPPLIER VENDOR */}
            <div className="p-3 border rounded-xl bg-muted/20 space-y-3">
              <h4 className="font-bold text-xs uppercase tracking-wider text-muted-foreground flex items-center gap-1.5 border-b pb-1.5">
                <Activity size={14} className="text-primary" /> Engine Meter Reading & Supplier Info
              </h4>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block font-bold mb-1">Engine Hour Meter</label>
                  <input
                    type="number"
                    min="0"
                    value={fuelRefillForm.meter_reading}
                    onChange={(e) => setFuelRefillForm({ ...fuelRefillForm, meter_reading: e.target.value === '' ? 0 : Number(e.target.value) })}
                    placeholder="e.g. 1420"
                    className="w-full border rounded-lg p-2 bg-background font-mono font-bold text-foreground"
                  />
                </div>

                <div>
                  <label className="block font-medium mb-1">Supplier / Depot Vendor</label>
                  <input
                    type="text"
                    value={fuelRefillForm.supplier}
                    onChange={(e) => setFuelRefillForm({ ...fuelRefillForm, supplier: e.target.value })}
                    placeholder="e.g. TotalEnergies / Central Depot"
                    className="w-full border rounded-lg p-2 bg-background text-foreground"
                  />
                </div>

                <div>
                  <label className="block font-medium mb-1">Receipt / Ticket Ref #</label>
                  <input
                    type="text"
                    value={fuelRefillForm.reference_number}
                    onChange={(e) => setFuelRefillForm({ ...fuelRefillForm, reference_number: e.target.value })}
                    placeholder="e.g. F-REC-9082"
                    className="w-full border rounded-lg p-2 bg-background font-mono text-foreground"
                  />
                </div>
              </div>

              <div>
                <label className="block font-medium mb-1">Refuel Notes & Dispenser Pump Info</label>
                <textarea
                  rows={2}
                  value={fuelRefillForm.notes}
                  onChange={(e) => setFuelRefillForm({ ...fuelRefillForm, notes: e.target.value })}
                  placeholder="e.g. Refueled via Bowser #02 at Site Pad B."
                  className="w-full border rounded-lg p-2 bg-background text-foreground"
                />
              </div>

              {/* RECEIPT / FUEL VOUCHER FILE ATTACHMENT */}
              <div className="pt-2 border-t border-dashed">
                <label className="block font-bold mb-1.5 text-xs text-foreground">
                  Receipt / Fuel Delivery Ticket Attachment
                </label>
                <div className="flex flex-wrap items-center gap-3">
                  <label className="cursor-pointer px-3 py-2 bg-primary hover:bg-primary/90 text-primary-foreground font-bold rounded-lg text-xs flex items-center gap-1.5 transition shadow-sm">
                    <Paperclip size={14} /> Attach Receipt Photo / Ticket PDF...
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
                    <div className="flex items-center gap-2 bg-primary/10 border border-primary/20 text-primary px-3 py-1.5 rounded-lg font-mono text-xs">
                      <FileText size={13} />
                      <span>{fuelReceiptFile.name} ({(fuelReceiptFile.size / 1024).toFixed(1)} KB)</span>
                      <button
                        type="button"
                        onClick={() => setFuelReceiptFile(null)}
                        className="text-destructive hover:opacity-80 ml-1"
                        title="Remove attachment"
                      >
                        <X size={13} />
                      </button>
                    </div>
                  ) : (
                    <span className="text-muted-foreground text-[11px]">No receipt document or photo attached</span>
                  )}
                </div>
              </div>
            </div>

            {/* FOOTER ACTIONS */}
            <div className="flex justify-end gap-2 pt-3 border-t">
              <button
                type="button"
                onClick={() => setShowFuelRefillModal(false)}
                className="px-4 py-2 border rounded-lg hover:bg-muted font-medium text-xs"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={fuelSubmitting}
                className="px-4 py-2 bg-primary text-primary-foreground hover:bg-primary/90 font-bold rounded-lg transition flex items-center gap-1.5 shadow-sm text-xs disabled:opacity-50"
              >
                <Fuel size={14} /> {fuelSubmitting ? 'Saving to Database...' : 'Save Fuel Refill Entry'}
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* MODAL 2: RECORD TANK DIP & FUEL CONSUMPTION (POST /api/v1/assets/:id/fuel-reductions) */}
      {showTankDipModal && (
        <Modal error={formErrors["tank-dip"]} title="Record Tank Dip Level & Fuel Consumption" onClose={() => setShowTankDipModal(false)}>
          <form onSubmit={handleSubmitTankDip} className="space-y-4 text-xs max-h-[80vh] overflow-y-auto pr-1">
            <div className="p-3 border rounded-xl bg-emerald-500/5 space-y-3">
              <h4 className="font-bold text-xs uppercase tracking-wider text-emerald-600 dark:text-emerald-400 flex items-center gap-1.5 border-b pb-1.5">
                <Activity size={14} /> Tank Dip Check & Fuel Reduction Record
              </h4>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold mb-1">Target Equipment / Rig *</label>
                  <SearchableSelect
                    options={assetOptions}
                    value={tankDipForm.asset_id}
                    onChange={(val: string) => handleEquipmentSelectForFuel(val)}
                    placeholder="Select Equipment..."
                    required
                  />
                </div>

                <div>
                  <label className="block font-bold mb-1">Associated Refill Log *</label>
                  <select
                    required
                    value={tankDipForm.fuel_log_id}
                    onChange={(e) => {
                      const selectedId = e.target.value;
                      const selectedLog = fuelLogsList.find((l) => l.id === selectedId);
                      const refillVol = selectedLog ? Number(selectedLog.quantity_litres || selectedLog.fuel_amount || 250) : 250;
                      const currentDip = tankDipForm.remaining_litres != null ? Number(tankDipForm.remaining_litres) : 180;
                      const diff = Math.max(0, Number((refillVol - currentDip).toFixed(1)));
                      setTankDipForm({
                        ...tankDipForm,
                        fuel_log_id: selectedId,
                        litres_reduced: diff,
                      });
                    }}
                    className="w-full border rounded-lg p-2 bg-background font-mono text-foreground font-bold"
                  >
                    <option value="">-- Select Associated Refill Log * --</option>
                    {fuelLogsList.map((log: any) => (
                      <option key={log.id} value={log.id}>
                        {new Date(log.recorded_at || log.created_at).toLocaleDateString()} — Refill: {log.quantity_litres || log.fuel_amount || 0} L ({log.supplier || log.vendor_name || 'Refill'})
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            <div className="p-3 border rounded-xl bg-card space-y-3">
              {/* FIELD GUIDANCE & AUTO-CALCULATION BANNER */}
              <div className="p-2.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-900 dark:text-emerald-200 text-[11px] space-y-1">
                <div className="font-bold flex items-center gap-1 text-emerald-700 dark:text-emerald-300">
                  <Info size={13} /> Auto-Calculated Fuel Consumption from Refill Log
                </div>
                <p>
                  • Tank dips are <strong>always associated with a Refill Log</strong>.
                </p>
                <p>
                  • Enter your <strong>Current Dip Level</strong> below. The system automatically computes fuel consumption: <code className="font-bold font-mono">Fuel Consumed = Refill Volume − Current Dip Level</code>.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block font-bold mb-0.5 text-xs text-foreground">
                    Current Tank Dip Level (Litres) *
                  </label>
                  <span className="block text-[10px] text-muted-foreground mb-1">
                    Remaining fuel in tank (measured by dip stick)
                  </span>
                  <input
                    type="number"
                    min="0"
                    step="0.5"
                    required
                    value={tankDipForm.remaining_litres}
                    onChange={(e) => {
                      const currentDip = Number(e.target.value);
                      const selectedLog = fuelLogsList.find((l) => l.id === tankDipForm.fuel_log_id);
                      const refillVol = selectedLog ? Number(selectedLog.quantity_litres || selectedLog.fuel_amount || 250) : 250;
                      const diff = Math.max(0, Number((refillVol - currentDip).toFixed(1)));
                      setTankDipForm({
                        ...tankDipForm,
                        remaining_litres: currentDip,
                        litres_reduced: diff,
                      });
                    }}
                    placeholder="e.g. 180"
                    className="w-full border rounded-lg p-2 bg-background font-mono font-bold text-foreground"
                  />
                </div>

                <div>
                  <label className="block font-bold mb-0.5 text-xs text-emerald-600 dark:text-emerald-400">
                    Fuel Consumed (Litres)
                  </label>
                  <span className="block text-[10px] text-muted-foreground mb-1">
                    Refill Volume − Current Dip Level
                  </span>
                  <input
                    type="number"
                    min="0"
                    step="0.5"
                    required
                    disabled
                    value={tankDipForm.litres_reduced}
                    onChange={(e) => setTankDipForm({ ...tankDipForm, litres_reduced: Number(e.target.value) })}
                    placeholder="e.g. 30"
                    className="w-full border rounded-lg p-2 bg-muted/40 font-mono font-extrabold text-emerald-600 dark:text-emerald-400"
                  />
                </div>

                <div>
                  <label className="block font-bold mb-0.5 text-xs text-foreground">
                    Reduction Reason *
                  </label>
                  <span className="block text-[10px] text-muted-foreground mb-1">
                    Activity causing reduction
                  </span>
                  <select
                    value={tankDipForm.reduction_reason}
                    onChange={(e) => setTankDipForm({ ...tankDipForm, reduction_reason: e.target.value })}
                    className="w-full border rounded-lg p-2 bg-background font-bold text-foreground"
                  >
                    <option value="Daily Dip Check">Daily Dip Check</option>
                    <option value="CONSUMPTION">Shift Fuel Consumption</option>
                    <option value="TRANSFER">Fuel Transfer to Other Equipment</option>
                    <option value="DRAIN">Tank Maintenance Drain</option>
                    <option value="LEAKAGE">Leakage / Loss</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                <div>
                  <label className="block font-medium mb-1">Dip Reading Date & Time</label>
                  <input
                    type="datetime-local"
                    value={tankDipForm.recorded_at}
                    onChange={(e) => setTankDipForm({ ...tankDipForm, recorded_at: e.target.value })}
                    className="w-full border rounded-lg p-2 bg-background font-mono text-foreground"
                  />
                </div>

                <div>
                  <label className="block font-medium mb-1">Dip Inspection Notes</label>
                  <input
                    type="text"
                    value={tankDipForm.notes}
                    onChange={(e) => setTankDipForm({ ...tankDipForm, notes: e.target.value })}
                    placeholder="e.g. Dip stick measured 65cm remaining depth."
                    className="w-full border rounded-lg p-2 bg-background text-foreground"
                  />
                </div>
              </div>
            </div>

            {/* FOOTER ACTIONS */}
            <div className="flex justify-end gap-2 pt-3 border-t">
              <button
                type="button"
                onClick={() => setShowTankDipModal(false)}
                className="px-4 py-2 border rounded-lg hover:bg-muted font-medium text-xs"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={dipSubmitting}
                className="px-4 py-2 bg-emerald-600 text-white hover:bg-emerald-700 font-bold rounded-lg transition flex items-center gap-1.5 shadow-sm text-xs disabled:opacity-50"
              >
                <Activity size={14} /> {dipSubmitting ? 'Saving Dip Record...' : 'Record Tank Dip & Consumption'}
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* FOCUSED COLLEAGUE DETAIL MODAL (MINIMAL PRIVACY VIEW) */}
      {selectedColleague && (
        <Modal title={`Field Team Contact - ${selectedColleague.first_name} ${selectedColleague.last_name}`} onClose={() => setSelectedColleague(null)}>
          <div className="space-y-4 text-xs">
            <div className="p-3 bg-muted/20 border rounded-xl flex items-center gap-3">
              <div className="h-10 w-10 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold text-base shrink-0">
                {selectedColleague.first_name?.[0] || 'C'}
              </div>
              <div>
                <h4 className="font-bold text-sm">{selectedColleague.first_name} {selectedColleague.last_name}</h4>
                <p className="text-muted-foreground">{selectedColleague.job_title || 'Field Team Specialist'}</p>
              </div>
            </div>

            <div className="space-y-2 border rounded-xl p-3 bg-card">
              <div className="flex justify-between border-b pb-1.5">
                <span className="text-muted-foreground">Work Email</span>
                <span className="font-medium font-mono">{selectedColleague.work_email || 'n/a'}</span>
              </div>
              <div className="flex justify-between border-b pb-1.5">
                <span className="text-muted-foreground">Phone Number</span>
                <span className="font-medium font-mono">{selectedColleague.phone_number || '+231 886 000 111'}</span>
              </div>
              <div className="flex justify-between border-b pb-1.5">
                <span className="text-muted-foreground">Assigned Project</span>
                <span className="font-bold">{myProjects[0]?.name || 'Solway Mount Belleh Project'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Operational Status</span>
                <span className="font-bold text-primary">ON SHIFT / ACTIVE</span>
              </div>
            </div>

            <p className="text-[10px] text-muted-foreground italic text-center">
              Field Portal Privacy Protection: Contracts, compensation, skills, resumes, and personal documents are excluded.
            </p>
          </div>
        </Modal>
      )}

      {/* REQUEST LEAVE MODAL (WITH FILE UPLOAD & REASON NOTES) */}
      {showLeaveModal && (
        <Modal error={formErrors["leave"]} title="Submit Field Leave Request" onClose={() => setShowLeaveModal(false)}>
          <form onSubmit={handleSubmitLeave} className="space-y-4 text-xs">
            <div>
              <label className="block font-bold mb-1">Leave Type *</label>
              <select
                value={leaveForm.leave_type}
                onChange={(e) => setLeaveForm({ ...leaveForm, leave_type: e.target.value })}
                className="w-full border rounded-lg p-2 bg-background font-medium"
              >
                <option value="ANNUAL">Annual Leave</option>
                <option value="SICK">Sick Leave (Medical)</option>
                <option value="EMERGENCY">Emergency Field Leave</option>
                <option value="COMPASSIONATE">Compassionate / Family Leave</option>
              </select>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block font-bold mb-1">Start Date *</label>
                <input
                  type="date"
                  required
                  value={leaveForm.start_date}
                  onChange={(e) => setLeaveForm({ ...leaveForm, start_date: e.target.value })}
                  className="w-full border rounded-lg p-2 bg-background"
                />
              </div>
              <div>
                <label className="block font-bold mb-1">End Date *</label>
                <input
                  type="date"
                  required
                  value={leaveForm.end_date}
                  onChange={(e) => setLeaveForm({ ...leaveForm, end_date: e.target.value })}
                  className="w-full border rounded-lg p-2 bg-background"
                />
              </div>
            </div>

            <div>
              <label className="block font-bold mb-1">Reason / Shift Justification *</label>
              <textarea
                rows={2}
                required
                value={leaveForm.reason}
                onChange={(e) => setLeaveForm({ ...leaveForm, reason: e.target.value })}
                placeholder="Provide detail on leave reason, medical notes, or emergency justification..."
                className="w-full border rounded-lg p-2 bg-background resize-y"
              />
            </div>

            {/* LEAVE SUPPORTING FILE / MEDICAL CERTIFICATE UPLOAD */}
            <div className="border rounded-xl p-3 bg-muted/20 space-y-2">
              <label className="block font-bold text-foreground flex items-center justify-between">
                <span>Attach Supporting Document / Medical Certificate</span>
                <Upload size={14} className="text-primary" />
              </label>

              <div className="flex items-center gap-3">
                <label className="cursor-pointer px-3 py-2 bg-primary hover:bg-primary/90 text-primary-foreground font-bold rounded-lg text-xs flex items-center gap-1.5 transition">
                  <Paperclip size={14} /> Select File / Certificate...
                  <input
                    type="file"
                    accept="image/*,application/pdf"
                    className="hidden"
                    onChange={(e) => {
                      if (e.target.files && e.target.files[0]) {
                        setLeaveAttachment(e.target.files[0]);
                      }
                    }}
                  />
                </label>

                {leaveAttachment ? (
                  <div className="flex items-center gap-2 bg-primary/10 border border-primary/20 text-primary px-3 py-1.5 rounded-lg font-mono text-xs">
                    <span>{leaveAttachment.name} ({(leaveAttachment.size / 1024).toFixed(1)} KB)</span>
                    <button
                      type="button"
                      onClick={() => setLeaveAttachment(null)}
                      className="text-primary hover:text-destructive"
                    >
                      <X size={13} />
                    </button>
                  </div>
                ) : (
                  <span className="text-muted-foreground text-[11px]">No file attached</span>
                )}
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t">
              <button
                type="button"
                onClick={() => setShowLeaveModal(false)}
                className="px-4 py-2 border rounded-lg hover:bg-muted font-medium"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={leaveSubmitting}
                className="px-4 py-2 bg-primary text-primary-foreground font-bold rounded-lg hover:bg-primary/90 transition"
              >
                {leaveSubmitting ? 'Submitting…' : 'Submit Leave Request'}
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* LOG WORKING TIME MODAL */}
      {showTimeLogModal && (
        <Modal error={formErrors["time-log"]} title="Log Working Time" onClose={() => setShowTimeLogModal(false)}>
          <form
            className="space-y-4 text-xs"
            onSubmit={async (e) => {
              e.preventDefault();
              const form = e.currentTarget;
              const isPeriod =
                (form.elements.namedItem('tl_mode') as HTMLSelectElement).value === 'PERIOD';
              const startVal = (form.elements.namedItem('tl_start') as HTMLInputElement).value;
              const endVal = (form.elements.namedItem('tl_end') as HTMLInputElement).value;
              const checkInVal = (form.elements.namedItem('tl_checkin') as HTMLInputElement).value;
              const checkOutVal = (form.elements.namedItem('tl_checkout') as HTMLInputElement).value;
              const hoursVal =
                Number((form.elements.namedItem('tl_hours') as HTMLInputElement).value) || 8;
              const notesVal = (form.elements.namedItem('tl_notes') as HTMLTextAreaElement).value;

              const buildIsoTime = (d: string, t?: string) => {
                if (!d || !t || !t.trim()) return null;
                const parts = t.trim().split(':');
                const hh = (parts[0] || '08').padStart(2, '0');
                const mm = (parts[1] || '00').padStart(2, '0');
                return `${d}T${hh}:${mm}:00Z`;
              };

              setTimeLogBusy(true);
              try {
                if (isPeriod && startVal && endVal && startVal < endVal) {
                  const cur = new Date(startVal);
                  const endDate = new Date(endVal);
                  while (cur <= endDate) {
                    const dateStr = cur.toISOString().slice(0, 10);
                    if (cur.getDay() !== 0 && cur.getDay() !== 6) {
                      const payload: any = {
                        date: dateStr,
                        notes: notesVal
                          ? `${notesVal} (${hoursVal}h/day)`
                          : `Period booking (${startVal} to ${endVal})`,
                      };
                      const ci = buildIsoTime(dateStr, checkInVal || '08:00');
                      const co = buildIsoTime(dateStr, checkOutVal || '17:00');
                      if (ci) payload.check_in = ci;
                      if (co) payload.check_out = co;
                      await apiFetch('/api/v1/employees/me/time-logs', {
                        method: 'POST',
                        body: JSON.stringify(payload),
                      });
                    }
                    cur.setDate(cur.getDate() + 1);
                  }
                } else {
                  const payload: any = {
                    date: startVal,
                    notes: notesVal ? `${notesVal} (${hoursVal} hrs)` : `${hoursVal} hrs worked`,
                  };
                  const ci = buildIsoTime(startVal, checkInVal);
                  const co = buildIsoTime(startVal, checkOutVal);
                  if (ci) payload.check_in = ci;
                  if (co) payload.check_out = co;
                  await apiFetch('/api/v1/employees/me/time-logs', {
                    method: 'POST',
                    body: JSON.stringify(payload),
                  });
                }
                setShowTimeLogModal(false);
                setPortalAlert({ type: 'success', message: 'Time logged successfully.' });
                setVersion((v) => v + 1);
              } catch (err: any) {
                setPortalAlert({ type: 'error', message: err?.message || 'Failed to log working time.' }, 'time-log');
              } finally {
                setTimeLogBusy(false);
              }
            }}
          >
            <div>
              <label className="block font-bold mb-1">Booking Mode *</label>
              <select name="tl_mode" className="w-full border rounded-lg p-2 bg-background font-medium">
                <option value="SINGLE">Single Day Entry</option>
                <option value="PERIOD">Multi-Day Period Range (e.g. Entire Week)</option>
              </select>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block font-bold mb-1">Start Date *</label>
                <input
                  required
                  type="date"
                  name="tl_start"
                  className="w-full border rounded-lg p-2 bg-background"
                  defaultValue={new Date().toISOString().slice(0, 10)}
                />
              </div>
              <div>
                <label className="block font-bold mb-1">End Date (Period Mode)</label>
                <input
                  type="date"
                  name="tl_end"
                  className="w-full border rounded-lg p-2 bg-background"
                  defaultValue={new Date().toISOString().slice(0, 10)}
                />
              </div>
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="block font-bold mb-1">Check In</label>
                <input type="time" name="tl_checkin" defaultValue="08:00" className="w-full border rounded-lg p-2 bg-background" />
              </div>
              <div>
                <label className="block font-bold mb-1">Check Out</label>
                <input type="time" name="tl_checkout" defaultValue="17:00" className="w-full border rounded-lg p-2 bg-background" />
              </div>
              <div>
                <label className="block font-bold mb-1">Hours/Day *</label>
                <input
                  required
                  type="number"
                  step="0.5"
                  min="0.5"
                  max="24"
                  name="tl_hours"
                  defaultValue={8}
                  className="w-full border rounded-lg p-2 bg-background"
                />
              </div>
            </div>

            <div>
              <label className="block font-bold mb-1">Work Summary / Task Description *</label>
              <textarea
                required
                name="tl_notes"
                rows={3}
                className="w-full border rounded-lg p-2 bg-background resize-y"
                placeholder="e.g. Drill rig maintenance, shift operations, site inspection…"
              />
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t">
              <button
                type="button"
                onClick={() => setShowTimeLogModal(false)}
                className="px-4 py-2 border rounded-lg hover:bg-muted font-medium"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={timeLogBusy}
                className="px-4 py-2 bg-indigo-600 text-white font-bold rounded-lg hover:bg-indigo-700 transition"
              >
                {timeLogBusy ? 'Logging…' : 'Log Time'}
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* LOG BREAKDOWN MODAL WITH FILE UPLOAD */}
      {showDefectModal && (
        <Modal error={formErrors["defect"]} title="Log Asset Defect / Breakdown Report" onClose={() => setShowDefectModal(false)}>
          <form onSubmit={handleSubmitDefect} className="space-y-4 text-xs">
            <div>
              <label className="block font-medium mb-1">Asset / Equipment *</label>
              <SearchableSelect
                options={assetOptions}
                value={defectForm.asset_id}
                onChange={(val: string) => setDefectForm({ ...defectForm, asset_id: val })}
                placeholder="Search Equipment..."
                required
              />
            </div>

            <div>
              <label className="block font-medium mb-1">Defect Title *</label>
              <input
                type="text"
                required
                value={defectForm.title}
                onChange={(e) => setDefectForm({ ...defectForm, title: e.target.value })}
                placeholder="e.g. Hydraulic line failure on main cylinder"
                className="w-full border rounded-lg p-2 bg-background"
              />
            </div>

            <div>
              <label className="block font-medium mb-1">Defect Description *</label>
              <textarea
                required
                rows={3}
                value={defectForm.description}
                onChange={(e) => setDefectForm({ ...defectForm, description: e.target.value })}
                placeholder="Describe the fault, affected component, and immediate safety impact..."
                className="w-full border rounded-lg p-2 bg-background resize-y"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block font-medium mb-1">Severity</label>
                <select
                  value={defectForm.severity}
                  onChange={(e) => setDefectForm({ ...defectForm, severity: e.target.value })}
                  className="w-full border rounded-lg p-2 bg-background"
                >
                  <option value="LOW">Low</option>
                  <option value="MEDIUM">Medium</option>
                  <option value="HIGH">High / Critical</option>
                </select>
              </div>
              <div>
                <label className="block font-medium mb-1">Est. Downtime (Hours)</label>
                <input
                  type="number"
                  min="0"
                  step="0.5"
                  value={defectForm.downtime_hours}
                  onChange={(e) => setDefectForm({ ...defectForm, downtime_hours: Number(e.target.value) })}
                  className="w-full border rounded-lg p-2 bg-background font-mono"
                />
              </div>
            </div>

            {/* DEFECT PHOTO / FILE ATTACHMENT FIELD */}
            <div className="border rounded-xl p-3 bg-muted/20 space-y-2">
              <label className="block font-bold text-foreground flex items-center justify-between">
                <span>Attach Photo of Component / Damaged Part</span>
                <Upload size={14} className="text-destructive" />
              </label>

              <div className="flex items-center gap-3">
                <label className="cursor-pointer px-3 py-2 bg-destructive hover:bg-destructive/90 text-destructive-foreground font-bold rounded-lg text-xs flex items-center gap-1.5 transition">
                  <Paperclip size={14} /> Attach Component Photo...
                  <input
                    type="file"
                    accept="image/*,application/pdf"
                    className="hidden"
                    onChange={(e) => {
                      if (e.target.files && e.target.files[0]) {
                        setDefectAttachment(e.target.files[0]);
                      }
                    }}
                  />
                </label>

                {defectAttachment ? (
                  <div className="flex items-center gap-2 bg-destructive/10 border border-destructive/20 text-destructive px-3 py-1.5 rounded-lg font-mono text-xs">
                    <span>{defectAttachment.name}</span>
                    <button
                      type="button"
                      onClick={() => setDefectAttachment(null)}
                      className="text-destructive hover:opacity-80"
                    >
                      <X size={13} />
                    </button>
                  </div>
                ) : (
                  <span className="text-muted-foreground text-[11px]">No photo attached</span>
                )}
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t">
              <button
                type="button"
                onClick={() => setShowDefectModal(false)}
                className="px-4 py-2 border rounded-lg hover:bg-muted font-medium"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-2 bg-destructive text-destructive-foreground hover:bg-destructive/90 font-bold rounded-lg"
              >
                Submit Breakdown Report
              </button>
            </div>
          </form>
        </Modal>
      )}

      {editingWork && <FieldWorkEditModal key={editingWork.id} work={editingWork} employees={teamEmployees}
        onClose={() => setEditingWork(null)} onSaved={(saved) => {
          setMyWorkOrders(previous => previous.map(work => work.id === saved.id ? saved : work));
          setMaintenanceSchedules(previous => previous.map(work => work.id === saved.id ? saved : work));
          setEditingWork(null);
          reload();
          window.dispatchEvent(new Event('cestos:notifications-changed'));
        }} />}

      {selectedEquipment && <FieldEquipmentDetails key={`${selectedEquipment.id}-${selectedProjectId}`} asset={selectedEquipment} projectId={selectedProjectId} onClose={() => setSelectedEquipment(null)} />}
      {editingShift && <FieldShiftEditModal key={editingShift.id} shift={editingShift} assets={myAssets} holes={drillHoles} onClose={() => setEditingShift(null)} onSaved={() => { setEditingShift(null); reload(); }} />}

      {/* WORK ORDER DETAILS MODAL */}
      {selectedWorkOrder && (
        <Modal error={formErrors["work-order"]}
          title={`Work Order Details: ${selectedWorkOrder.work_order_number || selectedWorkOrder.id.toUpperCase()}`}
          onClose={() => setSelectedWorkOrder(null)}
        >

          <div className="space-y-5 text-xs max-h-[80vh] overflow-y-auto pr-1">
            {selectedWorkOrder.status === 'COMPLETED' && (
              <div className="p-3 border rounded-lg bg-amber-50 text-amber-900">
                <p>Completed · Awaiting supervisor approval</p>
                {isSupervisorOrAdmin && <button className="btn-primary mt-2" onClick={() => handleUpdateWorkOrderStatus(selectedWorkOrder, 'APPROVED')}>Approve completed work</button>}
              </div>
            )}
            {/* HEADER SUMMARY */}
            <div className="p-4 rounded-xl border bg-muted/20 space-y-2">
              <div className="flex flex-wrap items-center justify-between gap-2 border-b pb-2">
                <span className="font-extrabold text-base text-foreground">{selectedWorkOrder.title}</span>
                <div className="flex items-center gap-2">
                  <span
                    className={`px-2.5 py-0.5 rounded text-[10px] font-bold ${
                      selectedWorkOrder.priority === 'HIGH' || selectedWorkOrder.priority === 'CRITICAL'
                        ? 'bg-destructive/10 text-destructive border border-destructive/20'
                        : 'bg-muted text-foreground border'
                    }`}
                  >
                    {selectedWorkOrder.priority} PRIORITY
                  </span>
                  <span
                    className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                      selectedWorkOrder.status === 'COMPLETED'
                        ? 'bg-primary/10 text-primary border border-primary/20'
                        : selectedWorkOrder.status === 'IN_PROGRESS'
                        ? 'bg-secondary text-primary border border-primary/20'
                        : 'bg-muted text-muted-foreground border'
                    }`}
                  >
                    {selectedWorkOrder.status.replace('_', ' ')}
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 pt-1">
                <div>
                  <span className="text-muted-foreground block text-[10px] uppercase font-semibold">Asset / Rig</span>
                  <span className="font-bold text-foreground">{selectedWorkOrder.asset_name}</span>
                </div>
                <div>
                  <span className="text-muted-foreground block text-[10px] uppercase font-semibold">Assigned Project</span>
                  <span className="font-bold text-foreground">{selectedWorkOrder.project_name}</span>
                </div>
                <div>
                  <span className="text-muted-foreground block text-[10px] uppercase font-semibold">Location / Pad</span>
                  <span className="font-medium text-foreground">{selectedWorkOrder.location || 'Site Rig Pad'}</span>
                </div>
                <div>
                  <span className="text-muted-foreground block text-[10px] uppercase font-semibold">Assigned Tech</span>
                  <span className="font-medium text-foreground">{selectedWorkOrder.assigned_to || 'Field Crew'}</span>
                </div>
                <div>
                  <span className="text-muted-foreground block text-[10px] uppercase font-semibold">Due Date</span>
                  <span className="font-medium font-mono text-foreground">{selectedWorkOrder.due_date}</span>
                </div>
                <div>
                  <span className="text-muted-foreground block text-[10px] uppercase font-semibold">Est vs Actual Hrs</span>
                  <span className="font-mono font-bold text-foreground">
                    {selectedWorkOrder.actual_hours || 0} / {selectedWorkOrder.estimated_hours || 4} hrs
                  </span>
                </div>
              </div>
            </div>

            {/* DESCRIPTION / SCOPE OF WORK */}
            <div className="space-y-1.5">
              <h4 className="font-bold text-sm text-foreground flex items-center gap-1.5">
                <FileText className="h-4 w-4 text-primary" /> Scope of Work / Instructions
              </h4>
              <p className="text-muted-foreground bg-card border p-3 rounded-xl leading-relaxed">
                {selectedWorkOrder.description || 'No detailed scope of work provided.'}
              </p>
            </div>

            {/* TASK CHECKLIST */}
            {selectedWorkOrder.checklist && selectedWorkOrder.checklist.length > 0 && (
              <div className="space-y-2 border-t pt-3">
                <div className="flex items-center justify-between">
                  <h4 className="font-bold text-sm text-foreground flex items-center gap-1.5">
                    <CheckCircle2 className="h-4 w-4 text-primary" /> Maintenance Checklist & Tasks
                  </h4>
                  <span className="text-xs text-muted-foreground font-mono font-bold">
                    {selectedWorkOrder.checklist.filter((c: any) => c.completed).length} / {selectedWorkOrder.checklist.length} Completed
                  </span>
                </div>

                {selectedWorkOrder.checklist.some((c: any) => !c.completed) && (
                  <div className="p-2 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-900 dark:text-amber-200 text-xs font-semibold flex items-center gap-1.5">
                    <AlertTriangle size={14} className="text-amber-600 shrink-0" />
                    <span>
                      All {selectedWorkOrder.checklist.length} tasks must be checked off before this Work Order can be completed ({selectedWorkOrder.checklist.filter((c: any) => !c.completed).length} remaining).
                    </span>
                  </div>
                )}

                <div className="space-y-1.5 bg-card border rounded-xl p-3">
                  {selectedWorkOrder.checklist.map((task: any) => (
                    <label
                      key={task.id}
                      className="flex items-start gap-2.5 p-2 rounded-lg hover:bg-muted/40 transition cursor-pointer"
                    >
                      <input
                        type="checkbox"
                        disabled={!selectedWorkOrder.can_update || ['COMPLETED', 'APPROVED', 'CANCELLED'].includes(selectedWorkOrder.status)}
                        checked={!!task.completed}
                        onChange={() => handleToggleWorkOrderTask(task.id)}
                        className="mt-0.5 h-4 w-4 rounded border-primary text-primary focus:ring-primary cursor-pointer"
                      />
                      <span className={`text-xs ${task.completed ? 'line-through text-muted-foreground' : 'font-semibold text-foreground'}`}>
                        {task.task}
                      </span>
                    </label>
                  ))}
                </div>
              </div>
            )}

            {/* REQUIRED SPARE PARTS */}
            {selectedWorkOrder.parts_required && selectedWorkOrder.parts_required.length > 0 && (
              <div className="space-y-2 border-t pt-3">
                <h4 className="font-bold text-sm text-foreground flex items-center gap-1.5">
                  <Package className="h-4 w-4 text-primary" /> Required Spare Parts & Consumables
                </h4>
                <div className="border rounded-xl bg-card overflow-hidden">
                  <table className="w-full text-xs text-left">
                    <thead className="bg-muted/50 font-semibold uppercase text-muted-foreground border-b">
                      <tr>
                        <th className="px-3 py-2">Item Name / Specification</th>
                        <th className="px-3 py-2">Qty</th>
                        <th className="px-3 py-2">Unit</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {selectedWorkOrder.parts_required.map((part: any, idx: number) => (
                        <tr key={idx} className="hover:bg-muted/20">
                          <td className="px-3 py-2 font-medium">{part.item_name}</td>
                          <td className="px-3 py-2 font-mono font-bold text-foreground">{part.quantity}</td>
                          <td className="px-3 py-2 text-muted-foreground font-mono">{part.unit}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* OPTIONAL FILE ATTACHMENT */}
            <div className="space-y-2 border-t pt-3">
              <h4 className="font-bold text-sm text-foreground flex items-center gap-1.5">
                <Paperclip className="h-4 w-4 text-primary" /> Optional Inspection Photo or Work Report Attachment
              </h4>
              <div className="flex flex-wrap items-center gap-3">
                <label className="cursor-pointer px-3 py-2 bg-primary hover:bg-primary/90 text-primary-foreground font-bold rounded-lg text-xs flex items-center gap-1.5 transition shadow-sm">
                  <Paperclip size={14} /> Attach Completion Photo / Report...
                  <input
                    type="file"
                    accept="image/*,application/pdf,.doc,.docx"
                    className="hidden"
                    onChange={(e) => {
                      if (e.target.files && e.target.files[0]) {
                        setWoAttachment(e.target.files[0]);
                      }
                    }}
                  />
                </label>

                {woAttachment ? (
                  <div className="flex items-center gap-2 bg-primary/10 border border-primary/20 text-primary px-3 py-1.5 rounded-lg font-mono text-xs">
                    <FileText size={13} />
                    <span>{woAttachment.name} ({(woAttachment.size / 1024).toFixed(1)} KB)</span>
                    <button
                      type="button"
                      onClick={() => setWoAttachment(null)}
                      className="text-destructive hover:opacity-80 ml-1"
                      title="Remove attachment"
                    >
                      <X size={13} />
                    </button>
                  </div>
                ) : selectedWorkOrder.attachment_name ? (
                  <div className="flex items-center gap-1.5 text-xs text-muted-foreground bg-muted/30 px-2.5 py-1 rounded-lg border font-mono">
                    <Paperclip size={12} /> Previously attached: {selectedWorkOrder.attachment_name}
                  </div>
                ) : (
                  <span className="text-muted-foreground text-[11px]">No file attached</span>
                )}
              </div>
            </div>

            {/* NOTES & LOGS */}
            <div className="space-y-2 border-t pt-3 hidden">
              <h4 className="font-bold text-sm text-foreground flex items-center gap-1.5">
                <Clock className="h-4 w-4 text-primary" /> Field Shift Notes & Activity Logs
              </h4>
              {selectedWorkOrder.notes ? (
                <div className="p-3 bg-muted/20 border rounded-xl whitespace-pre-wrap font-mono text-[11px] text-foreground">
                  {selectedWorkOrder.notes}
                </div>
              ) : (
                <p className="text-xs text-muted-foreground italic">No shift notes added yet.</p>
              )}

              <div className="flex gap-2 pt-1">
                <input
                  type="text"
                  placeholder="Add update or observation note..."
                  value={woNoteInput}
                  onChange={(e) => setWoNoteInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handleAddWorkOrderNote();
                    }
                  }}
                  className="flex-1 border rounded-lg px-3 py-1.5 text-xs bg-background"
                />
                <button
                  type="button"
                  disabled={!selectedWorkOrder.can_update || ['COMPLETED', 'APPROVED'].includes(selectedWorkOrder.status)} onClick={handleAddWorkOrderNote}
                  className="px-3 py-1.5 bg-primary text-primary-foreground font-bold rounded-lg text-xs hover:bg-primary/90 transition"
                >
                  Add Note
                </button>
              </div>
            </div>

            <WorkCompletionDetails key={`${selectedWorkOrder.id}-${selectedWorkOrder.completed_at || "open"}`} work={selectedWorkOrder} fieldPortal />

            {/* FOOTER ACTIONS */}
            <div className="flex items-center justify-between border-t pt-4">
              <div className="flex items-center gap-2">
                {isSupervisorOrAdmin && canEditFieldWork(selectedWorkOrder) && <button type="button" className="btn-secondary" onClick={() => {
                  setEditingWork({ ...selectedWorkOrder, editKind: 'work-order' }); setSelectedWorkOrder(null);
                }}>Edit work order</button>}
                {selectedWorkOrder.can_update && !['COMPLETED', 'APPROVED', 'CANCELLED'].includes(selectedWorkOrder.status) && (
                  <button
                    type="button"
                    onClick={() => handleInitiateCompleteWO(selectedWorkOrder)}
                    className="px-4 py-2 bg-primary hover:bg-primary/90 text-primary-foreground font-bold rounded-lg text-xs transition flex items-center gap-1.5"
                  >
                    <CheckCircle2 size={14} /> Mark Work Order Complete
                  </button>
                )}
              </div>

              <button
                type="button"
                onClick={() => setSelectedWorkOrder(null)}
                className="px-4 py-2 border rounded-lg hover:bg-muted font-medium text-xs"
              >
                Close
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* WORK ORDER COMPLETION & DOCUMENT UPLOAD DIALOGUE MODAL */}
      {woToComplete && (
        <Modal error={formErrors["complete-work-order"]}
          title={`Sign-off & Complete Work Order — ${woToComplete.work_order_number || woToComplete.title}`}
          onClose={() => { if (!completionBusy) setWoToComplete(null); }}
        >
          <form onSubmit={handleConfirmWorkOrderCompletion} className="space-y-4 text-xs">
            {/* CHECKLIST VERIFICATION BADGE */}
            <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-900 dark:text-emerald-200 space-y-1">
              <div className="font-bold flex items-center gap-1.5 text-xs text-emerald-700 dark:text-emerald-300">
                <CheckCircle2 size={16} /> Checklist Tasks Verified Complete
              </div>
              <p className="text-[11px]">
                All {woToComplete.checklist?.length || 0} maintenance checklist tasks have been checked off. Please provide sign-off notes and attach any final inspection photos or service reports before completing.
              </p>
            </div>

            {/* COMPLETION & SIGN-OFF NOTES */}
            <div className="space-y-1">
              <label className="block font-bold text-xs text-foreground">
                Completion Notes & Field Sign-off Observations *
              </label>
              <textarea
                rows={3}
                required
                value={completionNotes}
                onChange={(e) => setCompletionNotes(e.target.value)}
                placeholder="Describe work completed, testing results, or driller/technician sign-off (e.g. Replaced primary fuel filter HF-9042, pressure tested at 6 bar discharge, rig operational)..."
                className="w-full border rounded-lg p-2.5 bg-background text-foreground text-xs"
              />
            </div>

            {/* ASSOCIATED DOCUMENT / PHOTO UPLOAD */}
            <div className="p-3 border rounded-xl bg-card space-y-2">
              <label className="block font-bold text-xs text-foreground flex items-center gap-1">
                <Paperclip size={14} className="text-primary" /> Associated Completion Document or Inspection Photo (Optional)
              </label>
              <p className="text-[11px] text-muted-foreground">
                Upload completion certificate, signed work ticket, or component photo
              </p>
              <div className="flex flex-wrap items-center gap-3 pt-1">
                <label className="cursor-pointer px-3 py-2 bg-primary hover:bg-primary/90 text-primary-foreground font-bold rounded-lg text-xs flex items-center gap-1.5 transition shadow-sm">
                  <Paperclip size={14} /> Upload Completion Document...
                  <input
                    type="file"
                    accept="image/*,application/pdf,.doc,.docx"
                    className="hidden"
                    onChange={(e) => {
                      if (e.target.files && e.target.files[0]) {
                        setCompletionFile(e.target.files[0]);
                      }
                    }}
                  />
                </label>

                {completionFile ? (
                  <div className="flex items-center gap-2 bg-primary/10 border border-primary/20 text-primary px-3 py-1.5 rounded-lg font-mono text-xs">
                    <FileText size={13} />
                    <span>{completionFile.name} ({(completionFile.size / 1024).toFixed(1)} KB)</span>
                    <button
                      type="button"
                      onClick={() => setCompletionFile(null)}
                      className="text-destructive hover:opacity-80 ml-1"
                      title="Remove document"
                    >
                      <X size={13} />
                    </button>
                  </div>
                ) : (
                  <span className="text-muted-foreground text-[11px]">No completion document uploaded</span>
                )}
              </div>
            </div>

            {/* MODAL ACTIONS */}
            <div className="flex justify-end gap-2 pt-3 border-t">
              <button
                type="button"
                disabled={completionBusy} onClick={() => setWoToComplete(null)}
                className="px-4 py-2 border rounded-lg hover:bg-muted font-medium text-xs"
              >
                Cancel
              </button>
              <button
                type="submit" disabled={completionBusy}
                className="px-4 py-2 bg-primary text-primary-foreground hover:bg-primary/90 font-bold rounded-lg transition flex items-center gap-1.5 shadow-sm text-xs"
              >
                <CheckCircle2 size={14} /> Confirm Completion & Sign-off
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* SUPERVISOR CREATE & DISPATCH WORK ORDER MODAL */}
      {isSupervisorOrAdmin && showCreateWOModal && (
        <Modal error={formErrors["create-work-order"]} title="Create & Dispatch Field Work Order" onClose={() => setShowCreateWOModal(false)} className="max-w-3xl">
          <form onSubmit={handleCreateFieldWorkOrder} className="space-y-4 text-xs">
            {/* SECTION 1: TARGET ASSET & MAINTENANCE CLASSIFICATION */}
            <div className="p-3 border rounded-xl bg-card space-y-3">
              <h4 className="font-bold text-xs uppercase tracking-wider text-muted-foreground border-b pb-1.5 flex items-center justify-between">
                <span>Target Equipment & Work Classification</span>
                <span className="text-[10px] text-primary font-mono font-normal">Standard Maintenance Schema</span>
              </h4>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold mb-1">Target Equipment Asset *</label>
                  <SearchableSelect
                    options={assetOptions}
                    value={createWOForm.asset_id}
                    onChange={(val: string) => setCreateWOForm({ ...createWOForm, asset_id: val })}
                    placeholder="Search equipment asset by name / serial..."
                  />
                </div>

                <div>
                  <label className="block font-bold mb-1">Work Order Title *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. 500-Hour Service & Pump Pressure Test"
                    value={createWOForm.title}
                    onChange={(e) => setCreateWOForm({ ...createWOForm, title: e.target.value })}
                    className="w-full border rounded-lg p-2 bg-background font-medium"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block font-bold mb-1">Maintenance Type *</label>
                  <select
                    value={createWOForm.maintenance_type}
                    onChange={(e) => setCreateWOForm({ ...createWOForm, maintenance_type: e.target.value })}
                    className="w-full border rounded-lg p-2 bg-background font-medium"
                  >
                    <option value="PREVENTIVE">Preventive Maintenance</option>
                    <option value="CORRECTIVE">Corrective Repair</option>
                    <option value="INSPECTION">Inspection / Safety Audit</option>
                    <option value="SERVICE">Scheduled Service</option>
                    <option value="OTHER">Other Operational Work</option>
                  </select>
                </div>

                <div>
                  <label className="block font-bold mb-1">Priority Level *</label>
                  <select
                    value={createWOForm.priority}
                    onChange={(e) => setCreateWOForm({ ...createWOForm, priority: e.target.value })}
                    className="w-full border rounded-lg p-2 bg-background font-bold"
                  >
                    <option value="LOW">Low Priority</option>
                    <option value="NORMAL">Normal Priority</option>
                    <option value="HIGH">High Priority</option>
                    <option value="CRITICAL">Critical / Rig Down</option>
                  </select>
                </div>

                <div>
                  <label className="block font-bold mb-1">Estimated Cost ($)</label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    placeholder="0.00"
                    value={createWOForm.cost}
                    onChange={(e) => setCreateWOForm({ ...createWOForm, cost: Number(e.target.value) })}
                    className="w-full border rounded-lg p-2 bg-background font-mono"
                  />
                </div>
              </div>
            </div>

            {/* SECTION 2: SCHEDULING & MULTI-TECHNICIAN ASSIGNMENT */}
            <div className="p-3 border rounded-xl bg-card space-y-3">
              <h4 className="font-bold text-xs uppercase tracking-wider text-muted-foreground border-b pb-1.5 flex items-center justify-between">
                <span>Scheduling & Specialist Assignment</span>
                <span className="text-[10px] text-primary font-mono font-normal">Assigned Technician</span>
              </h4>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold mb-1">Scheduled Date *</label>
                  <input
                    type="date"
                    required
                    value={createWOForm.scheduled_date}
                    onChange={(e) => setCreateWOForm({ ...createWOForm, scheduled_date: e.target.value })}
                    className="w-full border rounded-lg p-2 bg-background font-mono"
                  />
                </div>

                <div>
                  <label className="block font-bold mb-1">Estimated Duration (Hours)</label>
                  <input
                    type="number"
                    min="0.5"
                    step="0.5"
                    value={createWOForm.estimated_hours}
                    onChange={(e) => setCreateWOForm({ ...createWOForm, estimated_hours: Number(e.target.value) })}
                    className="w-full border rounded-lg p-2 bg-background font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold mb-1 flex items-center justify-between">
                  <span>Assign Technician / Specialist</span>
                  <span className="text-[10px] text-primary font-mono font-bold">
                    {createWOForm.assigned_to_ids.length} Assigned
                  </span>
                </label>
                <SearchableSelect
                  options={employeeOptions}
                  value=""
                  onChange={(val: string) => {
                    if (val && !createWOForm.assigned_to_ids.includes(val)) {
                      setCreateWOForm({
                        ...createWOForm,
                        assigned_to_ids: [val, ...createWOForm.assigned_to_ids],
                      });
                    }
                  }}
                  placeholder="Select Technician / Specialist..."
                />

                <div className="flex flex-wrap gap-1.5 pt-2">
                  {createWOForm.assigned_to_ids.map((empId) => {
                    const emp = teamEmployees.find((e: any) => e.id === empId || e.email === empId);
                    const name = emp ? `${emp.first_name || ''} ${emp.last_name || ''}`.trim() || emp.name : empId;
                    const title = emp?.job_title || 'Specialist';
                    return (
                      <span
                        key={empId}
                        className="px-2.5 py-1 bg-primary/10 border border-primary/20 text-primary font-bold rounded-lg text-xs flex items-center gap-1.5 shadow-sm"
                      >
                        <User size={12} />
                        <span>{name} ({title})</span>
                        <button
                          type="button"
                          onClick={() => {
                            setCreateWOForm({
                              ...createWOForm,
                              assigned_to_ids: createWOForm.assigned_to_ids.filter((id) => id !== empId),
                            });
                          }}
                          className="hover:text-destructive transition ml-0.5"
                          title="Remove technician"
                        >
                          <X size={12} />
                        </button>
                      </span>
                    );
                  })}
                  {createWOForm.assigned_to_ids.length === 0 && (
                    <span className="text-muted-foreground text-[11px] italic">No technicians assigned (will assign shift roster)</span>
                  )}
                </div>
              </div>
            </div>

            {/* SECTION 3: INSTRUCTIONS & SCOPE OF WORK */}
            <div className="p-3 border rounded-xl bg-card space-y-2">
              <label className="block font-bold mb-1">Scope of Work Instructions</label>
              <textarea
                rows={3}
                placeholder="Detail maintenance instructions, safety precautions, isolation requirements, or OEM procedure notes..."
                value={createWOForm.description}
                onChange={(e) => setCreateWOForm({ ...createWOForm, description: e.target.value })}
                className="w-full border rounded-lg p-2.5 bg-background font-medium"
              />
            </div>

            {/* SECTION 4: DYNAMIC MAINTENANCE CHECKLIST TASKS */}
            <div className="p-3 border rounded-xl bg-card space-y-3">
              <h4 className="font-bold text-xs uppercase tracking-wider text-muted-foreground border-b pb-1.5 flex items-center justify-between">
                <span>Work Order Maintenance Checklist</span>
                <span className="text-[10px] text-primary font-mono font-normal">Mandatory Field Tasks</span>
              </h4>

              <div className="space-y-2">
                {createWOChecklist.map((item, idx) => (
                  <div key={idx} className="flex items-center gap-2">
                    <span className="h-5 w-5 rounded-full bg-muted flex items-center justify-center font-bold text-[10px] text-muted-foreground shrink-0">
                      {idx + 1}
                    </span>
                    <input
                      type="text"
                      value={item}
                      onChange={(e) => {
                        const updated = [...createWOChecklist];
                        updated[idx] = e.target.value;
                        setCreateWOChecklist(updated);
                      }}
                      className="w-full border rounded-lg p-1.5 bg-background text-xs"
                    />
                    <button
                      type="button"
                      onClick={() => setCreateWOChecklist(createWOChecklist.filter((_, i) => i !== idx))}
                      className="p-1 text-destructive hover:opacity-80 transition"
                      title="Remove task"
                    >
                      <X size={14} />
                    </button>
                  </div>
                ))}

                <div className="flex items-center gap-2 pt-1">
                  <input
                    type="text"
                    placeholder="+ Add checklist task..."
                    value={newChecklistItem}
                    onChange={(e) => setNewChecklistItem(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        if (newChecklistItem.trim()) {
                          setCreateWOChecklist([...createWOChecklist, newChecklistItem.trim()]);
                          setNewChecklistItem('');
                        }
                      }
                    }}
                    className="w-full border rounded-lg p-1.5 bg-background text-xs"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      if (newChecklistItem.trim()) {
                        setCreateWOChecklist([...createWOChecklist, newChecklistItem.trim()]);
                        setNewChecklistItem('');
                      }
                    }}
                    className="px-3 py-1.5 bg-secondary text-primary hover:bg-secondary/80 font-bold rounded-lg text-xs shrink-0 flex items-center gap-1"
                  >
                    <Plus size={13} /> Add
                  </button>
                </div>
              </div>
            </div>

            {/* SECTION 5: SPARE PARTS REQUIRED */}
            <div className="p-3 border rounded-xl bg-card space-y-3">
              <h4 className="font-bold text-xs uppercase tracking-wider text-muted-foreground border-b pb-1.5 flex items-center justify-between">
                <span>Spare Parts & Consumables Required</span>
                <span className="text-[10px] text-primary font-mono font-normal">Stores Requisition</span>
              </h4>

              <div className="space-y-2">
                {createWOParts.map((part, idx) => (
                  <div key={idx} className="grid grid-cols-12 gap-2 items-center">
                    <div className="col-span-6">
                      <SearchableSelect
                        options={itemOptions}
                        value={part.item_id}
                        onChange={(val: string) => {
                          const updated = [...createWOParts];
                          updated[idx].item_id = val;
                          setCreateWOParts(updated);
                        }}
                        placeholder="Select spare part / component..."
                      />
                    </div>
                    <div className="col-span-3">
                      <input
                        type="number"
                        min="1"
                        placeholder="Qty"
                        value={part.quantity}
                        onChange={(e) => {
                          const updated = [...createWOParts];
                          updated[idx].quantity = Number(e.target.value);
                          setCreateWOParts(updated);
                        }}
                        className="w-full border rounded-lg p-1.5 bg-background font-mono text-xs"
                      />
                    </div>
                    <div className="col-span-2">
                      <input
                        type="text"
                        placeholder="Unit"
                        value={part.unit}
                        onChange={(e) => {
                          const updated = [...createWOParts];
                          updated[idx].unit = e.target.value;
                          setCreateWOParts(updated);
                        }}
                        className="w-full border rounded-lg p-1.5 bg-background font-mono text-xs uppercase"
                      />
                    </div>
                    <div className="col-span-1 flex justify-end">
                      <button
                        type="button"
                        onClick={() => setCreateWOParts(createWOParts.filter((_, i) => i !== idx))}
                        className="p-1 text-destructive hover:opacity-80 transition"
                        title="Remove part"
                      >
                        <X size={14} />
                      </button>
                    </div>
                  </div>
                ))}

                <button
                  type="button"
                  onClick={() => setCreateWOParts([...createWOParts, { item_id: '', quantity: 1, unit: 'PCS' }])}
                  className="px-3 py-1.5 bg-muted text-foreground hover:bg-muted/80 font-bold rounded-lg text-xs flex items-center gap-1 mt-1"
                >
                  <Plus size={13} /> + Add Spare Part / Consumable
                </button>
              </div>
            </div>

            {/* SECTION 6: FILE ATTACHMENT */}
            <div className="p-3 border rounded-xl bg-card space-y-2">
              <label className="block font-bold text-xs text-foreground flex items-center gap-1">
                <Paperclip size={14} className="text-primary" /> Associated Procedure or Work Order Document (Optional)
              </label>
              <div className="flex flex-wrap items-center gap-3 pt-1">
                <label className="cursor-pointer px-3 py-2 bg-primary hover:bg-primary/90 text-primary-foreground font-bold rounded-lg text-xs flex items-center gap-1.5 transition shadow-sm">
                  <Paperclip size={14} /> Upload Procedure PDF / Image...
                  <input
                    type="file"
                    accept="image/*,application/pdf,.doc,.docx"
                    className="hidden"
                    onChange={(e) => {
                      if (e.target.files && e.target.files[0]) {
                        setCreateWOFile(e.target.files[0]);
                      }
                    }}
                  />
                </label>

                {createWOFile ? (
                  <div className="flex items-center gap-2 bg-primary/10 border border-primary/20 text-primary px-3 py-1.5 rounded-lg font-mono text-xs">
                    <FileText size={13} />
                    <span>{createWOFile.name} ({(createWOFile.size / 1024).toFixed(1)} KB)</span>
                    <button
                      type="button"
                      onClick={() => setCreateWOFile(null)}
                      className="text-destructive hover:opacity-80 ml-1"
                      title="Remove file"
                    >
                      <X size={13} />
                    </button>
                  </div>
                ) : (
                  <span className="text-muted-foreground text-[11px]">No procedure document attached</span>
                )}
              </div>
            </div>

            {/* MODAL ACTIONS */}
            <div className="flex justify-end gap-2 pt-3 border-t">
              <button
                type="button"
                onClick={() => setShowCreateWOModal(false)}
                className="px-4 py-2 border rounded-lg hover:bg-muted font-medium text-xs"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={woSubmitting}
                className="px-4 py-2 bg-primary text-primary-foreground hover:bg-primary/90 font-bold rounded-lg transition flex items-center gap-1.5 shadow-sm text-xs disabled:opacity-50"
              >
                {woSubmitting ? (
                  <span>Dispatching Work Order...</span>
                ) : (
                  <>
                    <Wrench size={14} /> Create & Dispatch Work Order
                  </>
                )}
              </button>
            </div>
          </form>
        </Modal>
      )}


      {/* REPORT HSE INCIDENT / NEAR-MISS MODAL WITH FILE UPLOAD */}
      {isSupervisorOrAdmin && showHseModal && (
        <Modal error={formErrors["hse"]} title="Report HSE Incident / Near-Miss / Hazard" onClose={() => setShowHseModal(false)} className="max-w-2xl">
          <form onSubmit={handleSubmitHseIncident} className="space-y-4 text-xs">
            {/* SECTION: PROJECT & EQUIPMENT SITE ASSOCIATION */}
            <div className="p-3 border rounded-xl bg-card space-y-3">
              <h4 className="font-bold text-xs uppercase tracking-wider text-muted-foreground border-b pb-1.5 flex items-center justify-between">
                <span>Associated Project & Equipment Site</span>
                <span className="text-[10px] text-primary font-mono font-normal">Site Scoping</span>
              </h4>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold mb-1">Associated Project *</label>
                  <SearchableSelect
                    options={projectOptions}
                    value={hseForm.project_id || selectedProjectId}
                    onChange={(val: string) => setHseForm({ ...hseForm, project_id: val })}
                    placeholder="Search assigned project..."
                  />
                </div>

                <div>
                  <label className="block font-bold mb-1">Involved Equipment Asset (Optional)</label>
                  <SearchableSelect
                    options={assetOptions}
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
                  value={hseForm.incident_type}
                  onChange={(e) => setHseForm({ ...hseForm, incident_type: e.target.value })}
                  className="w-full border rounded-lg p-2 bg-background font-medium"
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
                  value={hseForm.severity}
                  onChange={(e) => setHseForm({ ...hseForm, severity: e.target.value })}
                  className="w-full border rounded-lg p-2 bg-background font-bold"
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
                className="w-full border rounded-lg p-2 bg-background font-medium"
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
                  className="w-full border rounded-lg p-2 bg-background font-mono"
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
                  className="w-full border rounded-lg p-2 bg-background"
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
              <label className="block font-bold text-xs mb-1">Immediate Corrective Actions Taken</label>
              <textarea
                rows={2}
                placeholder="Describe immediate response, first aid administered, spill containment bunds deployed, rig shutdown..."
                value={hseForm.corrective_action}
                onChange={(e) => setHseForm({ ...hseForm, corrective_action: e.target.value })}
                className="w-full border rounded-lg p-2.5 bg-background font-medium"
              />
            </div>

            {/* HSE FILE / PHOTO ATTACHMENT */}
            <div className="border border-dashed rounded-xl p-3 bg-muted/20 space-y-2">
              <label className="block font-bold text-xs text-foreground flex items-center justify-between">
                <span className="flex items-center gap-1.5 text-rose-600 dark:text-rose-400">
                  <Upload size={14} /> Attach Photos, Witness Statements & Inspection Evidence
                </span>
                <span className="text-[10px] text-muted-foreground font-normal">Photos, PDFs, Docs</span>
              </label>

              <div className="flex flex-wrap items-center gap-3">
                <label className="cursor-pointer px-3 py-2 bg-rose-600 hover:bg-rose-700 text-white font-bold rounded-lg text-xs flex items-center gap-1.5 transition shadow-sm">
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
                        className="flex items-center gap-1.5 bg-rose-500/10 border border-rose-500/20 text-rose-600 dark:text-rose-400 px-2.5 py-1 rounded-lg font-mono text-xs"
                      >
                        <Paperclip size={12} />
                        <span>{f.name} ({(f.size / 1024).toFixed(1)} KB)</span>
                        <button
                          type="button"
                          onClick={() => setHseFiles(hseFiles.filter((_, i) => i !== idx))}
                          className="hover:opacity-80 transition ml-0.5"
                          title="Remove file"
                        >
                          <X size={12} />
                        </button>
                      </span>
                    ))}
                  </div>
                ) : (
                  <span className="text-muted-foreground text-[11px]">No evidence files attached</span>
                )}
              </div>
            </div>

            {/* MODAL ACTIONS */}
            <div className="flex justify-end gap-2 pt-3 border-t">
              <button
                type="button"
                onClick={() => setShowHseModal(false)}
                className="px-4 py-2 border rounded-lg hover:bg-muted font-medium text-xs"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={hseSubmitting}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white font-bold rounded-lg transition flex items-center gap-1.5 shadow-sm text-xs disabled:opacity-50"
              >
                {hseSubmitting ? (
                  <span>Submitting Report...</span>
                ) : (
                  <>
                    <ShieldCheck size={14} /> Submit HSE Incident Report
                  </>
                )}
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* FULL USER PROFILE PORTAL MODAL */}
      {showFullProfileModal && (
        <Modal title="My Personnel Record & Full Profile Portal" onClose={() => setShowFullProfileModal(false)} className="max-w-6xl">
          <EmployeeDetailView
            employeeId="me"
            onClose={() => setShowFullProfileModal(false)}
          />
        </Modal>
      )}

      {isSupervisorOrAdmin && editingFuelLog && (
        <Modal title={`Edit Fuel Log - ${editingFuelLog.asset_name}`} error={formErrors['fuel-log-edit']} onClose={() => { if (!fuelLogEditSubmitting) setEditingFuelLog(null); }}>
          <form onSubmit={handleUpdateFuelLog} className="space-y-4 text-xs">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block font-bold mb-1">Recorded At *</label>
                <input required type="datetime-local" value={fuelLogEditForm.recorded_at || ''} onChange={(event) => setFuelLogEditForm({ ...fuelLogEditForm, recorded_at: event.target.value })} className="w-full border rounded-lg p-2 bg-background font-mono" />
              </div>
              <div>
                <label className="block font-bold mb-1">Fuel Type *</label>
                <select value={fuelLogEditForm.fuel_type || 'DIESEL'} onChange={(event) => setFuelLogEditForm({ ...fuelLogEditForm, fuel_type: event.target.value })} className="w-full border rounded-lg p-2 bg-background font-bold">
                  <option value="DIESEL">Low-Sulfur Diesel (AGO)</option>
                  <option value="PETROL">Super Unleaded Gasoline (PMS)</option>
                  <option value="OTHER">Other / Specialty Fuel</option>
                </select>
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block font-bold mb-1">Quantity (Litres) *</label>
                <input required type="number" min="0.01" step="0.01" value={fuelLogEditForm.quantity_litres ?? ''} onChange={(event) => setFuelLogEditForm({ ...fuelLogEditForm, quantity_litres: event.target.value })} className="w-full border rounded-lg p-2 bg-background font-mono" />
              </div>
              <div>
                <label className="block font-bold mb-1">Unit Cost *</label>
                <input required type="number" min="0" step="0.001" value={fuelLogEditForm.unit_cost ?? ''} onChange={(event) => setFuelLogEditForm({ ...fuelLogEditForm, unit_cost: event.target.value })} className="w-full border rounded-lg p-2 bg-background font-mono" />
              </div>
              <div>
                <label className="block font-bold mb-1">Currency</label>
                <select value={fuelLogEditForm.currency || 'USD'} onChange={(event) => setFuelLogEditForm({ ...fuelLogEditForm, currency: event.target.value })} className="w-full border rounded-lg p-2 bg-background">
                  <option value="USD">USD</option>
                  <option value="LRD">LRD</option>
                  <option value="EUR">EUR</option>
                </select>
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block font-bold mb-1">Meter Reading (Hours)</label>
                <input type="number" min="0" step="0.1" value={fuelLogEditForm.meter_reading ?? ''} onChange={(event) => setFuelLogEditForm({ ...fuelLogEditForm, meter_reading: event.target.value })} className="w-full border rounded-lg p-2 bg-background font-mono" />
              </div>
              <div>
                <label className="block font-bold mb-1">Supplier</label>
                <input value={fuelLogEditForm.supplier || ''} onChange={(event) => setFuelLogEditForm({ ...fuelLogEditForm, supplier: event.target.value })} className="w-full border rounded-lg p-2 bg-background" />
              </div>
            </div>
            <div>
              <label className="block font-bold mb-1">Reference / Receipt No.</label>
              <input value={fuelLogEditForm.reference_number || ''} onChange={(event) => setFuelLogEditForm({ ...fuelLogEditForm, reference_number: event.target.value })} className="w-full border rounded-lg p-2 bg-background" />
            </div>
            <div>
              <label className="block font-bold mb-1">Notes</label>
              <textarea rows={3} value={fuelLogEditForm.notes || ''} onChange={(event) => setFuelLogEditForm({ ...fuelLogEditForm, notes: event.target.value })} className="w-full border rounded-lg p-2 bg-background resize-y" />
            </div>
            <div className="border border-dashed rounded-xl p-3 bg-muted/20">
              <label className="block font-bold mb-1.5">Attach Receipt / Delivery Docket</label>
              <div className="flex flex-wrap items-center gap-3">
                <label className="cursor-pointer px-3 py-2 bg-primary hover:bg-primary/90 text-primary-foreground font-bold rounded-lg text-xs flex items-center gap-1.5 transition">
                  <Paperclip size={14} /> Select file
                  <input type="file" accept="image/*,application/pdf,.doc,.docx,.xlsx" className="hidden" onChange={(event) => setFuelLogEditFile(event.target.files?.[0] || null)} />
                </label>
                {fuelLogEditFile ? (
                  <div className="flex items-center gap-2 text-primary bg-primary/10 border border-primary/20 px-2.5 py-1.5 rounded-lg font-mono text-xs">
                    <FileText size={13} /> {fuelLogEditFile.name} ({(fuelLogEditFile.size / 1024).toFixed(1)} KB)
                    <button type="button" onClick={() => setFuelLogEditFile(null)} className="text-destructive hover:opacity-80" title="Remove attachment"><X size={13} /></button>
                  </div>
                ) : <span className="text-[11px] text-muted-foreground">Optional receipt, delivery docket, or meter sheet</span>}
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-3 border-t">
              <button type="button" disabled={fuelLogEditSubmitting} onClick={() => setEditingFuelLog(null)} className="px-4 py-2 border rounded-lg hover:bg-muted font-medium">Cancel</button>
              <button type="submit" disabled={fuelLogEditSubmitting} className="px-4 py-2 bg-primary text-primary-foreground font-bold rounded-lg hover:bg-primary/90 transition disabled:opacity-50">{fuelLogEditSubmitting ? 'Saving...' : 'Save Fuel Log'}</button>
            </div>
          </form>
        </Modal>
      )}
    </FieldPortalLayout>
  );
}
