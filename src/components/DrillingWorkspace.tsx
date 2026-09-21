'use client';
import useAppFeedback from './useAppFeedback';

import React, { useState, useEffect } from 'react';
import {
  Flame, Plus, RefreshCw, Layers, Compass, CheckCircle2, AlertCircle, Clock, Users, ArrowRight, Search, Eye, Pencil, Trash2, Upload, FileText, X
} from 'lucide-react';
import {
  apiFetch, DrillingProgramRead, DrillHoleRead, DrillingShiftReportRead, updateDrillingShift, deleteDrillingShift
} from '@/lib/api';
import { Modal, SearchableProjectSelect, rows } from './DataUI';
import SearchableSelect, { SearchableSelectOption } from './SearchableSelect';
import { useAuth } from './AuthProvider';

export interface ShiftIntervalForm {
  drill_hole_id: string;
  from_depth_m: number;
  to_depth_m: number;
  core_recovery_pct: number;
  drilling_method?: string;
}

export interface DrillHoleFormItem {
  hole_number: string;
  drilling_method: string;
  target_depth_m: number;
  dip_deg?: number;
  azimuth_deg?: number;
  collar_easting?: string;
  collar_northing?: string;
  collar_elevation?: string;
  notes?: string;
}

export const generateNextHoleNum = (
  existingHoles: DrillHoleRead[] = [],
  currentBatch: DrillHoleFormItem[] = [],
  projectId?: string,
  prefix = 'HOLE-RC'
) => {
  const filteredExisting = Array.isArray(existingHoles)
    ? (projectId ? existingHoles.filter((h) => h.project_id === projectId) : existingHoles)
    : [];

  const usedNumbers = new Set<string>([
    ...filteredExisting.map((h) => (h.hole_number || '').toUpperCase().trim()),
    ...currentBatch.map((b) => (b.hole_number || '').toUpperCase().trim()),
  ]);

  let highestNum = 0;
  usedNumbers.forEach((numStr) => {
    const match = numStr.match(/(\d+)$/);
    if (match) {
      const val = parseInt(match[1], 10);
      if (!isNaN(val) && val > highestNum) highestNum = val;
    }
  });

  let candidate = Math.max(1, highestNum + 1);
  while (true) {
    const padded = String(candidate).padStart(3, '0');
    const holeNum = `${prefix}-${padded}`;
    if (!usedNumbers.has(holeNum.toUpperCase())) {
      return holeNum;
    }
    candidate++;
  }
};

const defaultInterval: ShiftIntervalForm = {
  drill_hole_id: '',
  from_depth_m: 0,
  to_depth_m: 60,
  core_recovery_pct: 95.0,
  drilling_method: 'RC',
};

export default function DrillingWorkspace({ subResource, holesOnly = false }: { subResource?: string; holesOnly?: boolean }) {
  const { notify, formErrors, clearErrors } = useAppFeedback();
  const auth = useAuth();
  const isSupervisor = Boolean(
    auth.access?.is_superuser ||
    (auth.access?.roles || []).some((r) => {
      const l = r.trim().toLowerCase();
      return l.includes('supervisor') || l.includes('manager') || l.includes('foreman') || l.includes('lead') || l.includes('superintendent') || l.includes('admin') || l.includes('driller');
    })
  );
  const canApproveShift = Boolean(
    auth.access?.is_superuser ||
    auth.can('drilling.shifts.approve') ||
    auth.can('reports.approve') ||
    auth.can('projects.manage') ||
    auth.can('projects.update') ||
    (auth.access?.roles || []).some((r) => {
      const l = r.trim().toLowerCase();
      return l.includes('manager') || l.includes('superintendent') || l.includes('director') || l.includes('lead') || l.includes('admin') || l.includes('client representative');
    })
  );
  const [activeTab, setActiveTab] = useState<'PROGRAMS' | 'HOLES' | 'SHIFTS'>(holesOnly || subResource === 'holes' ? 'HOLES' : 'SHIFTS');
  const [search, setSearch] = useState('');
  const [selectedShift, setSelectedShift] = useState<DrillingShiftReportRead | null>(null);
  const [editingShift, setEditingShift] = useState<DrillingShiftReportRead | null>(null);
  const [selectedProgram, setSelectedProgram] = useState<DrillingProgramRead | null>(null);
  const [selectedHole, setSelectedHole] = useState<DrillHoleRead | null>(null);
  const [editingHole, setEditingHole] = useState<DrillHoleRead | null>(null);
  const [editHoleCoords, setEditHoleCoords] = useState({
    collar_easting: '',
    collar_northing: '',
    collar_elevation: '',
  });

  // File Upload Attachments & Multi-Hole Intervals State
  const [shiftFile, setShiftFile] = useState<File | null>(null);
  const [editShiftFile, setEditShiftFile] = useState<File | null>(null);
  const [shiftIntervals, setShiftIntervals] = useState<ShiftIntervalForm[]>([{ ...defaultInterval }]);
  const [editShiftIntervals, setEditShiftIntervals] = useState<ShiftIntervalForm[]>([{ ...defaultInterval }]);

  // New Program Modal
  const [showAddProgram, setShowAddProgram] = useState(false);
  const [newProgram, setNewProgram] = useState({
    project_id: '',
    name: '',
    program_name: '',
    drilling_type: 'RC',
    target_metres: 5000,
    status: 'ACTIVE',
  });

  // New Hole Batch Modal State
  const [showAddHole, setShowAddHole] = useState(false);
  useEffect(() => { clearErrors(); }, [showAddHole, editingHole?.id, clearErrors]);
  const [newHoleBatch, setNewHoleBatch] = useState({
    project_id: '',
    program_id: '',
  });
  const [newHoleList, setNewHoleList] = useState<DrillHoleFormItem[]>([
    {
      hole_number: 'HOLE-RC-001',
      drilling_method: 'RC',
      target_depth_m: 250,
      dip_deg: -60,
      azimuth_deg: 180,
      collar_easting: '',
      collar_northing: '',
      collar_elevation: '',
      notes: '',
    },
  ]);
  const [newHole, setNewHole] = useState({
    project_id: '',
    program_id: '',
    hole_number: 'HOLE-RC-001',
    drilling_type: 'RC',
    drilling_method: 'RC',
    target_depth_m: 250,
    status: 'IN_PROGRESS',
  });

  useEffect(() => {
    if (subResource === 'programs') setActiveTab('PROGRAMS');
    else if (subResource === 'holes') setActiveTab('HOLES');
    else if (subResource === 'shifts') setActiveTab('SHIFTS');
  }, [subResource]);
  const [loading, setLoading] = useState(true);
  const [programs, setPrograms] = useState<DrillingProgramRead[]>([]);
  const [holes, setHoles] = useState<DrillHoleRead[]>([]);
  const [shifts, setShifts] = useState<DrillingShiftReportRead[]>([]);
  const [projects, setProjects] = useState<any[]>([]);
  const [assets, setAssets] = useState<any[]>([]);
  const [version, setVersion] = useState(0);

  // Same-Day Operational Context Telemetry State
  const [dailyContext, setDailyContext] = useState<any | null>(null);
  const [loadingContext, setLoadingContext] = useState(false);

  // New Shift Form State & 360 Operational Report State
  const [showAddShift, setShowAddShift] = useState(false);
  const [newShift, setNewShift] = useState({
    rig_id: '',
    project_id: '',
    program_id: '',
    hole_id: '',
    date: new Date().toISOString().slice(0, 10),
    shift_date: new Date().toISOString().slice(0, 10),
    shift_type: 'DAY',
    shift_number: 'DS-001',
    total_metres_drilled: 120.5,
    core_recovery_pct: 95.0,
    productive_hours: 10.0,
    standby_hours: 1.0,
    maintenance_hours: 1.0,
    notes: '',
  });

  // 360° Daily Operational Report Multi-Tab State
  const [show360Modal, setShow360Modal] = useState(false);
  const [tab360, setTab360] = useState<'SHIFT' | 'DEFECT' | 'FUEL' | 'HSE' | 'STORE'>('SHIFT');
  const [fuelMode, setFuelMode] = useState<'ENTRY' | 'REDUCTION'>('ENTRY');

  const [form360Defect, setForm360Defect] = useState({
    rig_id: '',
    title: '',
    description: '',
    severity: 'MEDIUM',
    downtime_hours: 0,
  });

  const [form360Fuel, setForm360Fuel] = useState({
    asset_id: '',
    fuel_quantity: 100,
    fuel_unit: 'LITRES',
    unit_cost: 0,
    vendor: '',
    date: new Date().toISOString().slice(0, 10),
  });

  const [form360FuelReduction, setForm360FuelReduction] = useState({
    asset_id: '',
    fuel_log_id: '',
    reduction_litres: 0,
    remaining_litres: 0,
    meter_reading: 0,
    project_id: '',
    notes: '',
  });

  const [projectFuelReceipts, setProjectFuelReceipts] = useState<any[]>([]);
  const [selectedReceiptDetails, setSelectedReceiptDetails] = useState<{
    originalLitres: number;
    baseLitres: number;
  } | null>(null);

  const [form360Hse, setForm360Hse] = useState({
    project_id: '',
    incident_type: 'NEAR_MISS',
    severity: 'LOW',
    title: '',
    description: '',
    location: '',
    incident_date: new Date().toISOString().slice(0, 10),
  });

  const [form360Store, setForm360Store] = useState({
    project_id: '',
    store_id: '',
    notes: '',
  });

  const [storeItemsList, setStoreItemsList] = useState<Array<{
    item_id: string;
    item_name: string;
    quantity: number;
    unit: string;
  }>>([
    { item_id: '', item_name: '', quantity: 1, unit: 'PCS' }
  ]);

  const [storeSpecificItems, setStoreSpecificItems] = useState<any[]>([]);

  useEffect(() => {
    if (!form360Store.store_id) {
      setStoreSpecificItems([]);
      return;
    }
    apiFetch<any>(`/api/v1/inventory/items?page_size=100&store_id=${form360Store.store_id}`)
      .then((res) => setStoreSpecificItems(rows(res)))
      .catch(() => setStoreSpecificItems([]));
  }, [form360Store.store_id]);

  useEffect(() => {
    let active = true;
    const targetAssetId = form360FuelReduction.asset_id || (assets && assets[0]?.id);
    if (!targetAssetId) {
      setProjectFuelReceipts([]);
      return;
    }
    apiFetch<any>(`/api/v1/assets/${targetAssetId}/fuel-logs?page_size=50`)
      .then((res) => {
        if (!active) return;
        const list = Array.isArray(res) ? res : res?.items || [];
        setProjectFuelReceipts(list);
        if (list.length > 0 && !form360FuelReduction.fuel_log_id) {
          setForm360FuelReduction((prev) => ({ ...prev, fuel_log_id: list[0].id }));
        }
      })
      .catch(() => {
        if (active) setProjectFuelReceipts([]);
      });
    return () => {
      active = false;
    };
  }, [form360FuelReduction.asset_id, assets]);

  useEffect(() => {
    let active = true;
    if (!form360FuelReduction.fuel_log_id || !form360FuelReduction.asset_id) {
      setSelectedReceiptDetails(null);
      return;
    }
    const receipt = projectFuelReceipts.find((r) => String(r.id) === String(form360FuelReduction.fuel_log_id));
    const origLitres = Number(receipt?.quantity_litres ?? receipt?.fuel_quantity ?? 0);

    apiFetch<any>(`/api/v1/assets/${form360FuelReduction.asset_id}/fuel-reductions`)
      .then((res) => {
        if (!active) return;
        const list = (Array.isArray(res) ? res : res?.items || []).filter(
          (r: any) => !r.fuel_log_id || String(r.fuel_log_id) === String(form360FuelReduction.fuel_log_id)
        );
        let baseLitres = origLitres;
        if (list.length > 0 && list[0].remaining_litres != null) {
          baseLitres = Number(list[0].remaining_litres);
        }
        setSelectedReceiptDetails({
          originalLitres: origLitres,
          baseLitres: baseLitres,
        });
      })
      .catch(() => {
        if (active) {
          setSelectedReceiptDetails({
            originalLitres: origLitres,
            baseLitres: origLitres,
          });
        }
      });
    return () => {
      active = false;
    };
  }, [form360FuelReduction.fuel_log_id, form360FuelReduction.asset_id, projectFuelReceipts]);

  const [inventoryStores, setInventoryStores] = useState<any[]>([]);
  const [inventoryItems, setInventoryItems] = useState<any[]>([]);

  // 360 Report File Attachments State
  const [defectFile, setDefectFile] = useState<File | null>(null);
  const [fuelFile, setFuelFile] = useState<File | null>(null);
  const [hseFile, setHseFile] = useState<File | null>(null);
  const [storeFile, setStoreFile] = useState<File | null>(null);

  const reload = () => setVersion((v) => v + 1);

  useEffect(() => {
    let active = true;
    setLoading(true);

    Promise.all([
      apiFetch<DrillingProgramRead[]>('/api/v1/drilling/programs').catch(() => []),
      apiFetch<DrillHoleRead[]>('/api/v1/drilling/holes').catch(() => []),
      apiFetch<DrillingShiftReportRead[]>('/api/v1/drilling/shifts').catch(() => []),
      apiFetch<any>('/api/v1/projects?page_size=100').catch(() => ({ items: [] })),
      apiFetch<any>('/api/v1/assets?page_size=100').catch(() => ({ items: [] })),
      apiFetch<any>('/api/v1/inventory/stores?page_size=100').catch(() => ({ items: [] })),
      apiFetch<any>('/api/v1/inventory/items?page_size=100').catch(() => ({ items: [] })),
      apiFetch<any>('/api/v1/locations?page_size=100').catch(() => ({ items: [] })),
    ]).then(([progRes, holeRes, shiftRes, projRes, assetRes, storeRes, itemRes, locRes]) => {
      if (!active) return;
      const loadedProjects = rows(projRes);
      setPrograms(rows(progRes) as DrillingProgramRead[]);
      setHoles(rows(holeRes) as DrillHoleRead[]);
      setShifts(rows(shiftRes) as DrillingShiftReportRead[]);
      setProjects(loadedProjects);
      setAssets(rows(assetRes));

      const storesList = rows(storeRes);
      const locationsList = rows(locRes);
      setInventoryStores(storesList.length > 0 ? storesList : locationsList);
      setInventoryItems(rows(itemRes));

      // Preselect Target Project based on creator's active assigned project
      const activeProj = loadedProjects.find((p: any) => p.is_active && p.status === 'ACTIVE') || loadedProjects[0];
      if (activeProj?.id) {
        setNewShift((prev) => (prev.project_id ? prev : { ...prev, project_id: activeProj.id }));
        setNewHoleBatch((prev) => (prev.project_id ? prev : { ...prev, project_id: activeProj.id }));
        setNewProgram((prev) => (prev.project_id ? prev : { ...prev, project_id: activeProj.id }));
      }
      setLoading(false);
    });

  }, [version]);

  const getProgramDrilledMetres = (p: DrillingProgramRead): number => {
    if (typeof p.drilled_metres === 'number' && p.drilled_metres > 0) {
      return p.drilled_metres;
    }
    const progShifts = (Array.isArray(shifts) ? shifts : []).filter(
      (s) => s.program_id === p.id || s.program_name === p.name || s.program_name === p.program_name
    );
    if (progShifts.length > 0) {
      return progShifts.reduce((acc, s) => acc + (Number(s.total_metres ?? (s as any).total_metres_drilled) || 0), 0);
    }
    return p.drilled_metres || 0;
  };

  // Fetch same-day operational context when a shift report is inspected
  useEffect(() => {
    if (!selectedShift || !selectedShift.id) {
      setDailyContext(null);
      return;
    }
    setLoadingContext(true);
    apiFetch<any>(`/api/v1/drilling/shifts/${selectedShift.id}/daily-context`)
      .then((res) => setDailyContext(res))
      .catch(() => setDailyContext(null))
      .finally(() => setLoadingContext(false));
  }, [selectedShift]);

  // Helper to sort programs so programs associated with selected project appear first
  const getSortedPrograms = (targetProjectId?: string) => {
    const list = Array.isArray(programs) ? programs : [];
    if (!targetProjectId) return list;
    return [...list].sort((a, b) => {
      const aMatch = a.project_id === targetProjectId ? -1 : 1;
      const bMatch = b.project_id === targetProjectId ? -1 : 1;
      return aMatch - bMatch;
    });
  };

  const calculateIntervalTotals = (intervalsList: ShiftIntervalForm[]) => {
    const valid = intervalsList.filter((i) => i.drill_hole_id);
    let totalMetres = 0;
    let totalCoreM = 0;
    valid.forEach((i) => {
      const m = Math.max(0, Number(i.to_depth_m) - Number(i.from_depth_m));
      totalMetres += m;
      totalCoreM += m * (Number(i.core_recovery_pct) / 100);
    });
    const avgCorePct = totalMetres > 0 ? Number(((totalCoreM / totalMetres) * 100).toFixed(1)) : 95.0;
    return { totalMetres: Number(totalMetres.toFixed(1)), avgCorePct };
  };

  const openEditShift = (s: DrillingShiftReportRead) => {
    setEditingShift(s);
    if (Array.isArray(s.intervals) && s.intervals.length > 0) {
      setEditShiftIntervals(
        s.intervals.map((i: any) => {
          const fromD = Number(i.from_depth_m ?? 0);
          const toD = Number(i.to_depth_m ?? 0);
          const diff = toD - fromD;
          const recPct = diff > 0 && i.core_recovered_m !== undefined
            ? Number(((Number(i.core_recovered_m) / diff) * 100).toFixed(1))
            : Number(s.core_recovery_pct ?? s.avg_core_recovery_pct ?? 95);
          return {
            drill_hole_id: i.drill_hole_id || (s as any).hole_id || '',
            from_depth_m: fromD,
            to_depth_m: toD,
            core_recovery_pct: recPct,
            drilling_method: i.drilling_method || 'RC',
          };
        })
      );
    } else {
      const m = Number(s.total_metres ?? s.total_metres_drilled ?? s.metres_drilled ?? 120.5);
      setEditShiftIntervals([
        {
          drill_hole_id: (s as any).hole_id || '',
          from_depth_m: 0,
          to_depth_m: m,
          core_recovery_pct: Number(s.core_recovery_pct ?? s.avg_core_recovery_pct ?? 95),
          drilling_method: 'RC',
        },
      ]);
    }
    setEditShiftFile(null);
  };

  const handleCreateShift = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const validIntervals = shiftIntervals.filter((i) => i.drill_hole_id);
      const { totalMetres, avgCorePct } = calculateIntervalTotals(shiftIntervals);
      const metresDrilled = validIntervals.length > 0 ? totalMetres : Number(newShift.total_metres_drilled);
      const corePct = validIntervals.length > 0 ? avgCorePct : Number(newShift.core_recovery_pct);

      const payload: any = {
        ...newShift,
        date: newShift.date || newShift.shift_date,
        total_metres_drilled: metresDrilled,
        total_metres: metresDrilled,
        core_recovery_pct: corePct,
        avg_core_recovery_pct: corePct,
        status: 'SUBMITTED',
      };
      if (shiftFile) {
        payload.notes = `[Attachment: ${shiftFile.name} (${(shiftFile.size / 1024).toFixed(1)} KB)] ${payload.notes || ''}`;
      }
      if (validIntervals.length > 0) {
        payload.intervals = validIntervals.map((i) => ({
          drill_hole_id: i.drill_hole_id,
          from_depth_m: Number(i.from_depth_m),
          to_depth_m: Number(i.to_depth_m),
          core_recovered_m: (Number(i.to_depth_m) - Number(i.from_depth_m)) * (Number(i.core_recovery_pct) / 100),
          drilling_method: i.drilling_method || 'RC',
        }));
        payload.hole_id = validIntervals[0].drill_hole_id;
      }
      await apiFetch('/api/v1/drilling/shifts', {
        method: 'POST',
        body: JSON.stringify(payload),
      });
      setShowAddShift(false);
      setShiftFile(null);
      setShiftIntervals([{ ...defaultInterval }]);
      setNewShift({
        rig_id: '',
        project_id: '',
        program_id: '',
        hole_id: '',
        date: new Date().toISOString().slice(0, 10),
        shift_date: new Date().toISOString().slice(0, 10),
        shift_type: 'DAY',
        shift_number: 'DS-001',
        total_metres_drilled: 120.5,
        core_recovery_pct: 95.0,
        productive_hours: 10.0,
        standby_hours: 1.0,
        maintenance_hours: 1.0,
        notes: '',
      });
      reload();
    } catch (err: any) {
      alert(err.message || 'Failed to create shift production report');
    }
  };

  const handleUpdateShift = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingShift) return;
    try {
      const validIntervals = editShiftIntervals.filter((i) => i.drill_hole_id);
      const { totalMetres, avgCorePct } = calculateIntervalTotals(editShiftIntervals);
      const metres = validIntervals.length > 0 ? totalMetres : Number(editingShift.total_metres_drilled ?? (editingShift as any).total_metres ?? (editingShift as any).metres_drilled ?? 0);
      const coreRec = validIntervals.length > 0 ? avgCorePct : Number(editingShift.core_recovery_pct ?? (editingShift as any).avg_core_recovery_pct ?? 0);
      const prodHrs = Number(editingShift.productive_hours ?? (editingShift as any).total_productive_hours ?? 0);
      const stbyHrs = Number(editingShift.standby_hours ?? 0);
      const maintHrs = Number(editingShift.maintenance_hours ?? 0);
      const nonProdHrs = Number((editingShift as any).total_nonproductive_hours ?? (stbyHrs + maintHrs));

      const payload: any = {
        project_id: editingShift.project_id,
        rig_id: editingShift.rig_id,
        program_id: (editingShift as any).program_id,
        date: (editingShift as any).date || editingShift.shift_date,
        shift_date: (editingShift as any).date || editingShift.shift_date,
        shift_type: editingShift.shift_type,
        status: 'SUBMITTED',
        total_metres: metres,
        total_metres_drilled: metres,
        avg_core_recovery_pct: coreRec,
        core_recovery_pct: coreRec,
        total_productive_hours: prodHrs,
        productive_hours: prodHrs,
        total_nonproductive_hours: nonProdHrs,
        standby_hours: stbyHrs,
        maintenance_hours: maintHrs,
      };

      if (validIntervals.length > 0) {
        payload.intervals = validIntervals.map((i) => ({
          drill_hole_id: i.drill_hole_id,
          from_depth_m: Number(i.from_depth_m),
          to_depth_m: Number(i.to_depth_m),
          core_recovered_m: (Number(i.to_depth_m) - Number(i.from_depth_m)) * (Number(i.core_recovery_pct) / 100),
          drilling_method: i.drilling_method || 'RC',
        }));
        payload.hole_id = validIntervals[0].drill_hole_id;
      }

      if (editShiftFile) {
        payload.notes = `[Attachment: ${editShiftFile.name} (${(editShiftFile.size / 1024).toFixed(1)} KB)] ${(editingShift.notes as string) || ''}`;
      }

      const updatedReport = await updateDrillingShift(editingShift.id, payload);
      setShifts((prev) =>
        prev.map((s) => (s.id === editingShift.id ? { ...s, ...updatedReport, ...payload } : s))
      );
      setEditingShift(null);
      setEditShiftFile(null);
      reload();
    } catch (err: any) {
      alert(err.message || 'Failed to update shift production report');
    }
  };

  const handleDeleteShift = async (shiftId: string) => {
    if (!confirm('Are you sure you want to delete this shift production report?')) return;
    try {
      await deleteDrillingShift(shiftId);
      if (selectedShift?.id === shiftId) setSelectedShift(null);
      reload();
    } catch (err: any) {
      alert(err.message || 'Failed to delete shift report');
    }
  };

  const handleCreateProgram = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const name = newProgram.program_name || newProgram.name || '';
      const payload = {
        ...newProgram,
        name: name,
        program_name: name,
      };
      await apiFetch('/api/v1/drilling/programs', {
        method: 'POST',
        body: JSON.stringify(payload),
      });
      setShowAddProgram(false);
      setNewProgram({
        project_id: '',
        name: '',
        program_name: '',
        drilling_type: 'RC',
        target_metres: 5000,
        status: 'ACTIVE',
      });
      reload();
    } catch (err: any) {
      alert(err.message || 'Failed to create drilling program');
    }
  };

  const openNewHoleModal = () => {
    const targetProject = newShift.project_id || (projects.length > 0 ? projects[0].id : '');
    const firstHoleNum = generateNextHoleNum(holes, [], targetProject);
    setNewHoleBatch({
      project_id: targetProject,
      program_id: newShift.program_id || '',
    });
    setNewHoleList([
      {
        hole_number: firstHoleNum,
        drilling_method: 'RC',
        target_depth_m: 250,
        dip_deg: -60,
        azimuth_deg: 180,
        collar_easting: '',
        collar_northing: '',
        collar_elevation: '',
        notes: '',
      },
    ]);
    setShowAddHole(true);
  };

  const openEditHole = (h: DrillHoleRead) => {
    setEditingHole(h);
    const notes = String(h.notes || '');
    const match = notes.match(/\[Collar Coords: E: ([^,]*), N: ([^,]*), Elev: ([^\]]*)m\]/);
    if (match) {
      setEditHoleCoords({
        collar_easting: match[1] !== '-' ? match[1].trim() : '',
        collar_northing: match[2] !== '-' ? match[2].trim() : '',
        collar_elevation: match[3] !== '-' ? match[3].trim() : '',
      });
    } else {
      setEditHoleCoords({ collar_easting: '', collar_northing: '', collar_elevation: '' });
    }
  };

  const handleCreateHole = async (e: React.FormEvent) => {
    const alert = (message: string) => notify({ type: 'error', message }, 'hole');
    e.preventDefault();
    if (!newHoleBatch.project_id) {
      alert('Please select a Target Project');
      return;
    }
    const validHoles = newHoleList.filter((h) => h.hole_number.trim());
    if (validHoles.length === 0) {
      alert('Please enter at least one drill hole specification with a valid Hole Number');
      return;
    }

    // Check for duplicate hole numbers in current batch
    const batchNums = validHoles.map((h) => h.hole_number.toUpperCase().trim());
    const dupBatchNum = batchNums.find((num, index) => batchNums.indexOf(num) !== index);
    if (dupBatchNum) {
      alert(`Duplicate hole number "${dupBatchNum}" found in current batch. Each drill hole must have a unique hole number.`);
      return;
    }

    // Check for conflicts with existing DB holes in this project
    for (const h of validHoles) {
      const numUpper = h.hole_number.toUpperCase().trim();
      const dbConflict = (Array.isArray(holes) ? holes : []).some(
        (ex) => ex.hole_number.toUpperCase().trim() === numUpper && ex.project_id === newHoleBatch.project_id
      );
      if (dbConflict) {
        alert(`Drill hole number "${h.hole_number}" already exists in this project. Please specify a unique hole number.`);
        return;
      }
    }

    try {
      const createdHoles: DrillHoleRead[] = [];
      for (const h of validHoles) {
        let notesText = h.notes || '';
        if (h.collar_easting || h.collar_northing || h.collar_elevation) {
          const coordsStr = `[Collar Coords: E: ${h.collar_easting || '-'}, N: ${h.collar_northing || '-'}, Elev: ${h.collar_elevation || '-'}m]`;
          notesText = notesText ? `${coordsStr} ${notesText}` : coordsStr;
        }

        const payload = {
          project_id: newHoleBatch.project_id,
          program_id: newHoleBatch.program_id || undefined,
          hole_number: h.hole_number.trim(),
          drilling_method: h.drilling_method || 'RC',
          target_depth_m: Number(h.target_depth_m || 250),
          dip_deg: h.dip_deg !== undefined ? Number(h.dip_deg) : -60,
          azimuth_deg: h.azimuth_deg !== undefined ? Number(h.azimuth_deg) : 180,
          notes: notesText || undefined,
        };

        const created = await apiFetch<DrillHoleRead>('/api/v1/drilling/holes', {
          method: 'POST',
          body: JSON.stringify(payload),
        });
        if (created && created.id) createdHoles.push(created);
      }

      setShowAddHole(false);
      if (createdHoles.length > 0) {
        const firstCreated = createdHoles[0];
        setShiftIntervals((prev) => {
          const emptyIdx = prev.findIndex((i) => !i.drill_hole_id);
          if (emptyIdx !== -1) {
            const next = [...prev];
            next[emptyIdx] = { ...next[emptyIdx], drill_hole_id: firstCreated.id };
            return next;
          }
          return prev;
        });
        setEditShiftIntervals((prev) => {
          const emptyIdx = prev.findIndex((i) => !i.drill_hole_id);
          if (emptyIdx !== -1) {
            const next = [...prev];
            next[emptyIdx] = { ...next[emptyIdx], drill_hole_id: firstCreated.id };
            return next;
          }
          return prev;
        });
        setNewShift((prev) => ({
          ...prev,
          hole_id: firstCreated.id,
          project_id: prev.project_id || (firstCreated.project_id as string) || '',
        }));
      }
      reload();
    } catch (err: any) {
      alert(err.message || 'Failed to create drill hole specification(s)');
    }
  };

  const handleUpdateHole = async (e: React.FormEvent) => {
    const alert = (message: string) => notify({ type: 'error', message }, 'edit-hole');
    e.preventDefault();
    if (!editingHole) return;
    try {
      let notesText = String(editingHole.notes || '');
      notesText = notesText.replace(/\[Collar Coords:[^\]]*\]\s*/g, '').trim();

      if (editHoleCoords.collar_easting || editHoleCoords.collar_northing || editHoleCoords.collar_elevation) {
        const coordsStr = `[Collar Coords: E: ${editHoleCoords.collar_easting || '-'}, N: ${editHoleCoords.collar_northing || '-'}, Elev: ${editHoleCoords.collar_elevation || '-'}m]`;
        notesText = notesText ? `${coordsStr} ${notesText}` : coordsStr;
      }

      const payload: any = {
        project_id: editingHole.project_id,
        program_id: (editingHole as any).program_id || undefined,
        hole_number: editingHole.hole_number,
        drilling_method: (editingHole as any).drilling_method || (editingHole as any).drilling_type || 'RC',
        target_depth_m: Number(editingHole.target_depth_m || 250),
        final_depth_m: editingHole.final_depth_m ? Number(editingHole.final_depth_m) : undefined,
        dip_deg: editingHole.dip_deg !== undefined ? Number(editingHole.dip_deg) : -60,
        azimuth_deg: editingHole.azimuth_deg !== undefined ? Number(editingHole.azimuth_deg) : 180,
        status: editingHole.status || 'PLANNED',
        notes: notesText || undefined,
      };

      await apiFetch(`/api/v1/drilling/holes/${editingHole.id}`, {
        method: 'PUT',
        body: JSON.stringify(payload),
      });

      setEditingHole(null);
      if (selectedHole?.id === editingHole.id) setSelectedHole(null);
      reload();
    } catch (err: any) {
      alert(err.message || 'Failed to update drill hole specification');
    }
  };

  const handleSubmitShift = async (shiftId: string) => {
    try {
      await apiFetch(`/api/v1/drilling/shifts/${shiftId}/submit`, { method: 'POST' });
      reload();
    } catch (err: any) {
      alert(err.message || 'Failed to submit shift report');
    }
  };

  const handleApproveShift = async (shiftId: string) => {
    try {
      await apiFetch(`/api/v1/drilling/shifts/${shiftId}/approve`, { method: 'POST' });
      reload();
    } catch (err: any) {
      alert(err.message || 'Failed to approve shift report');
    }
  };

  const handle360DefectSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form360Defect.rig_id) {
      alert('Please select a Rig / Asset');
      return;
    }
    try {
      await apiFetch(`/api/v1/assets/${form360Defect.rig_id}/defects`, {
        method: 'POST',
        body: JSON.stringify({
          title: form360Defect.title,
          description: form360Defect.description,
          severity: form360Defect.severity,
          downtime_hours: Number(form360Defect.downtime_hours),
          project_id: newShift.project_id || undefined,
        }),
      });
      alert('Defect / Maintenance breakdown logged successfully!');
      setForm360Defect({ rig_id: '', title: '', description: '', severity: 'MEDIUM', downtime_hours: 0 });
      setDefectFile(null);
      reload();
    } catch (err: any) {
      alert(err.message || 'Failed to log defect');
    }
  };

  const handle360FuelSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (fuelMode === 'ENTRY') {
        if (!form360Fuel.asset_id) { alert('Please select a Rig / Asset'); return; }
        await apiFetch(`/api/v1/assets/${form360Fuel.asset_id}/fuel-logs`, {
          method: 'POST',
          body: JSON.stringify(form360Fuel),
        });
        alert('Main fuel log entry recorded successfully!');
      } else {
        if (!form360FuelReduction.asset_id) { alert('Please select a Rig / Asset'); return; }

        const baseLitres = selectedReceiptDetails?.baseLitres ?? Number(form360FuelReduction.remaining_litres || 0);
        const remLitres = Number(form360FuelReduction.remaining_litres || 0);
        const calcReduced = Math.max(0, baseLitres - remLitres);
        const finalReduced = form360FuelReduction.reduction_litres > 0 ? form360FuelReduction.reduction_litres : calcReduced;

        await apiFetch(`/api/v1/assets/${form360FuelReduction.asset_id}/fuel-reductions`, {
          method: 'POST',
          body: JSON.stringify({
            fuel_log_id: form360FuelReduction.fuel_log_id || undefined,
            recorded_at: new Date().toISOString(),
            remaining_litres: remLitres,
            litres_reduced: finalReduced > 0 ? finalReduced : 1,
            reduction_reason: '360 Daily Operational Shift Log',
            notes: form360FuelReduction.notes || undefined,
          }),
        });

        if (form360FuelReduction.meter_reading > 0) {
          await apiFetch(`/api/v1/assets/${form360FuelReduction.asset_id}/meter-readings`, {
            method: 'POST',
            body: JSON.stringify({
              reading: Number(form360FuelReduction.meter_reading),
              reading_type: 'HOURS',
              source: '360 Daily Operational Shift Log',
              project_id: form360FuelReduction.project_id || newShift.project_id || undefined,
              notes: form360FuelReduction.notes || undefined,
            }),
          }).catch(() => {});
        }

        alert('Asset fuel consumption & meter reading recorded successfully!');
      }
      setFuelFile(null);
      reload();
    } catch (err: any) {
      alert(err.message || 'Failed to log fuel entry');
    }
  };

  const handle360HseSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await apiFetch('/api/v1/hse/incidents', {
        method: 'POST',
        body: JSON.stringify({
          ...form360Hse,
          project_id: form360Hse.project_id || newShift.project_id,
        }),
      });
      alert('HSE Incident / Safety Observation reported successfully!');
      setForm360Hse({
        project_id: newShift.project_id || '',
        incident_type: 'NEAR_MISS',
        severity: 'LOW',
        title: '',
        description: '',
        location: '',
        incident_date: new Date().toISOString().slice(0, 10),
      });
      setHseFile(null);
      reload();
    } catch (err: any) {
      alert(err.message || 'Failed to report HSE incident');
    }
  };

  const handle360StoreSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form360Store.store_id) {
      alert('Please select a Store / Warehouse Location.');
      return;
    }
    const validItems = storeItemsList.filter((i) => i.item_id || i.item_name);
    if (validItems.length === 0) {
      alert('Please select or specify at least one consumable item.');
      return;
    }
    try {
      await Promise.all(
        validItems.map((item) =>
          apiFetch('/api/v1/inventory/issues', {
            method: 'POST',
            body: JSON.stringify({
              project_id: form360Store.project_id || newShift.project_id,
              store_id: form360Store.store_id,
              item_id: item.item_id || undefined,
              item_name: item.item_name,
              quantity: item.quantity,
              unit: item.unit,
              notes: form360Store.notes,
            }),
          })
        )
      );
      alert(`${validItems.length} store consumable item(s) issued successfully!`);
      setForm360Store({
        project_id: newShift.project_id || '',
        store_id: '',
        notes: '',
      });
      setStoreItemsList([{ item_id: '', item_name: '', quantity: 1, unit: 'PCS' }]);
      setStoreFile(null);
      reload();
    } catch (err: any) {
      alert(err.message || 'Failed to record store consumption');
    }
  };

  const activeStoreItems = (form360Store.store_id && storeSpecificItems.length > 0)
    ? storeSpecificItems
    : inventoryItems;

  const storeItemsOptions: SearchableSelectOption[] = activeStoreItems.map((item: any) => ({
    value: item.id || item.name,
    label: item.name + (item.sku || item.item_number ? ` (${item.sku || item.item_number})` : ''),
    sublabel: `Category: ${item.category?.name || item.category || 'General'}${item.current_stock !== undefined ? ` • In Stock: ${item.current_stock}` : ''}`,
    badge: (item.unit_symbol || item.base_unit || item.unit || 'PCS').toUpperCase(),
    raw: item,
  }));

  const itemOptions: SearchableSelectOption[] = inventoryItems.map((item: any) => ({
    value: item.id || item.name,
    label: item.name + (item.sku || item.item_number ? ` (${item.sku || item.item_number})` : ''),
    sublabel: `Category: ${item.category?.name || item.category || 'General'} • Standard Cost: $${item.standard_unit_cost || item.unit_cost || 0}`,
    badge: (item.unit_symbol || item.base_unit || 'PCS').toUpperCase(),
    raw: item,
  }));

  const rigOptions: SearchableSelectOption[] = (Array.isArray(assets) ? assets : []).map((a: any) => ({
    value: a.id,
    label: a.name + (a.asset_number || a.code ? ` (${a.asset_number || a.code})` : ''),
    sublabel: `Make/Type: ${a.make || a.category || 'Rig Asset'}${a.model ? ' • Model: ' + a.model : ''}${a.serial_number ? ' • SN: ' + a.serial_number : ''}`,
    badge: (a.status || 'ACTIVE').toUpperCase(),
    raw: a,
  }));

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b pb-4">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            {holesOnly ? 'Planning · Drill Holes' : 'Rig & Shift Drilling Operations'}
          </h1>
          <p className="text-sm text-muted-foreground">
            {holesOnly ? 'Create drill holes in batches, review specifications, and manage hole details.' : 'Drilling programs, hole specifications, daily shift production logs, core recovery, and auto-revenue engine'}
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
        </div>
      </div>

      {/* Navigation Tabs */}
      {!holesOnly && <div className="flex border-b space-x-4">
        <button
          onClick={() => setActiveTab('SHIFTS')}
          className={`pb-2 text-sm font-medium border-b-2 flex items-center gap-2 ${
            activeTab === 'SHIFTS'
              ? 'border-primary text-primary font-semibold'
              : 'border-transparent text-muted-foreground hover:text-foreground'
          }`}
        >
          <Clock className="h-4 w-4" />
          Shift Production Reports ({shifts.length})
        </button>
        <button
          onClick={() => setActiveTab('PROGRAMS')}
          className={`pb-2 text-sm font-medium border-b-2 flex items-center gap-2 ${
            activeTab === 'PROGRAMS'
              ? 'border-primary text-primary font-semibold'
              : 'border-transparent text-muted-foreground hover:text-foreground'
          }`}
        >
          <Layers className="h-4 w-4" />
          Drilling Programs ({programs.length})
        </button>
        <button
          onClick={() => setActiveTab('HOLES')}
          className={`pb-2 text-sm font-medium border-b-2 flex items-center gap-2 ${
            activeTab === 'HOLES'
              ? 'border-primary text-primary font-semibold'
              : 'border-transparent text-muted-foreground hover:text-foreground'
          }`}
        >
          <Compass className="h-4 w-4" />
          Drill Holes ({holes.length})
        </button>
      </div>

      }
      {/* SHIFTS TAB */}
      {activeTab === 'SHIFTS' && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <h2 className="text-lg font-semibold">Daily Shift Production Reports</h2>
            <div className="flex items-center gap-2">
              <div className="relative w-64">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <input
                  type="text"
                  placeholder="Search shift reports..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-full text-sm border rounded-lg pl-9 pr-3 py-1.5 bg-background"
                />
              </div>
              <button
                onClick={() => {
                  if (!isSupervisor) {
                    alert('Only personnel with a supervisor or management role can create shift production reports.');
                    return;
                  }
                  setShowAddShift(true);
                }}
                className="flex items-center gap-2 px-3 py-1.5 bg-primary text-primary-foreground rounded text-sm font-medium hover:bg-primary/90 shrink-0"
              >
                <Plus className="h-4 w-4" />
                New Shift Report
              </button>
              <button
                onClick={() => {
                  if (!isSupervisor) {
                    alert('Only personnel with a supervisor or management role can create shift production reports.');
                    return;
                  }
                  setTab360('SHIFT');
                  setShow360Modal(true);
                }}
                className="flex items-center gap-2 px-3.5 py-1.5 bg-amber-600 text-white rounded text-sm font-bold hover:bg-amber-700 shrink-0 shadow-sm"
              >
                <Flame className="h-4 w-4" />
                ⚡ 360 Report
              </button>
            </div>
          </div>

          <div className="border rounded-xl bg-card overflow-hidden">
            <table className="w-full text-sm text-left">
              <thead className="bg-muted/50 text-xs font-semibold uppercase text-muted-foreground">
                <tr>
                  <th className="px-4 py-3">Shift #</th>
                  <th className="px-4 py-3">Date & Type</th>
                  <th className="px-4 py-3">Drilled Metres</th>
                  <th className="px-4 py-3">Core Recovery</th>
                  <th className="px-4 py-3">Hours (Prod / Standby / Maint)</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {(Array.isArray(shifts) ? shifts : [])
                  .filter((s) => {
                    if (!search.trim()) return true;
                    const q = search.toLowerCase();
                    const shiftNum = s.report_number || s.shift_number || s.id?.slice(0, 8) || '';
                    const shiftDate = s.date || s.shift_date || '';
                    const shiftStatus = s.status || '';
                    return (
                      shiftNum.toLowerCase().includes(q) ||
                      shiftDate.toLowerCase().includes(q) ||
                      shiftStatus.toLowerCase().includes(q)
                    );
                  })
                  .map((s) => {
                    const shiftNum = s.report_number || s.shift_number || (s.id ? `DR-${s.id.slice(0, 8).toUpperCase()}` : 'N/A');
                    const shiftDate = s.date || s.shift_date || (s.created_at ? s.created_at.slice(0, 10) : 'N/A');
                    const metres = s.total_metres ?? s.total_metres_drilled ?? s.metres_drilled ?? 0;
                    const coreRec = s.avg_core_recovery_pct ?? s.core_recovery_pct ?? 0;
                    const prodHrs = s.total_productive_hours ?? s.productive_hours ?? 0;
                    const stbyHrs = s.standby_hours ?? 0;
                    const maintHrs = s.maintenance_hours ?? 0;
                    const nonProdHrs = s.total_nonproductive_hours ?? (stbyHrs + maintHrs);

                    return (
                      <tr key={s.id} className="hover:bg-muted/30">
                        <td className="px-4 py-3 font-mono font-medium text-xs">{shiftNum}</td>
                        <td className="px-4 py-3 font-medium">
                          {shiftDate} <span className="text-xs text-muted-foreground">({s.shift_type || 'DAY'})</span>
                        </td>
                        <td className="px-4 py-3 font-bold text-emerald-600">{metres} m</td>
                        <td className="px-4 py-3 font-semibold">{coreRec}%</td>
                        <td className="px-4 py-3 text-xs text-muted-foreground">
                          {stbyHrs > 0 || maintHrs > 0
                            ? `${prodHrs}h / ${stbyHrs}h / ${maintHrs}h`
                            : `${prodHrs}h Prod / ${nonProdHrs}h Non-Prod`}
                        </td>
                        <td className="px-4 py-3">
                          <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${
                            s.status === 'APPROVED' ? 'bg-emerald-500/10 text-emerald-600' :
                            s.status === 'SUBMITTED' ? 'bg-blue-500/10 text-blue-600' : 'bg-amber-500/10 text-amber-600'
                          }`}>
                            {s.status}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-right flex items-center justify-end gap-1">
                          <button
                            onClick={() => setSelectedShift(s)}
                            className="px-2.5 py-1 text-xs border rounded font-medium hover:bg-muted inline-flex items-center gap-1"
                          >
                            <Eye className="h-3 w-3" /> Details
                          </button>
                          {s.status !== 'APPROVED' && canApproveShift && (
                            <button
                              onClick={() => handleApproveShift(s.id)}
                              className="px-2.5 py-1 text-xs bg-emerald-600 text-white rounded font-medium hover:bg-emerald-700"
                            >
                              Approve
                            </button>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                {shifts.length === 0 && (
                  <tr>
                    <td colSpan={7} className="px-4 py-8 text-center text-muted-foreground">
                      No shift production reports recorded yet. Click "New Shift Report" to record rig production.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* PROGRAMS TAB */}
      {activeTab === 'PROGRAMS' && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <h2 className="text-lg font-semibold">Drilling Programs</h2>
            <div className="flex items-center gap-2">
              <div className="relative w-64">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <input
                  type="text"
                  placeholder="Search programs..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-full text-sm border rounded-lg pl-9 pr-3 py-1.5 bg-background"
                />
              </div>
              <button
                onClick={() => setShowAddProgram(true)}
                className="flex items-center gap-2 px-3 py-1.5 bg-primary text-primary-foreground rounded text-sm font-medium hover:bg-primary/90 shrink-0"
              >
                <Plus className="h-4 w-4" />
                New Program
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {(Array.isArray(programs) ? programs : [])
              .filter((p) => {
                if (!search.trim()) return true;
                const q = search.toLowerCase();
                const progName = (p.name || p.program_name || '').toLowerCase();
                const progType = (p.drilling_type || '').toLowerCase();
                const progStatus = (p.status || '').toLowerCase();
                return progName.includes(q) || progType.includes(q) || progStatus.includes(q);
              })
              .map((p) => (
                <div
                  key={p.id}
                  onClick={() => setSelectedProgram(p)}
                  className="p-4 rounded-xl border bg-card space-y-2 shadow-sm hover:border-primary/50 cursor-pointer transition"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-muted-foreground">{p.drilling_type || 'RC'}</span>
                    <span className="px-2 py-0.5 rounded text-xs bg-secondary">{p.status}</span>
                  </div>
                  <h3 className="font-bold text-base">{p.name || p.program_name}</h3>
                  <div className="flex items-center justify-between text-sm pt-2">
                    <span className="text-muted-foreground">Progress:</span>
                    <span className="font-bold">{getProgramDrilledMetres(p)} / {p.target_metres} m</span>
                  </div>
                </div>
              ))}
            {programs.length === 0 && (
              <div className="col-span-full p-8 text-center border rounded-xl bg-card text-muted-foreground">
                No active drilling programs found.
              </div>
            )}
          </div>
        </div>
      )}

      {/* HOLES TAB */}
      {activeTab === 'HOLES' && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <h2 className="text-lg font-semibold">Drill Holes</h2>
            <div className="flex items-center gap-2">
              <div className="relative w-64">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <input
                  type="text"
                  placeholder="Search drill holes..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-full text-sm border rounded-lg pl-9 pr-3 py-1.5 bg-background"
                />
              </div>
              <button
                onClick={openNewHoleModal}
                className="flex items-center gap-2 px-3 py-1.5 bg-primary text-primary-foreground rounded text-sm font-medium hover:bg-primary/90 shrink-0"
              >
                <Plus className="h-4 w-4" />
                New Drill Hole
              </button>
            </div>
          </div>

          <div className="border rounded-xl bg-card overflow-hidden">
            <table className="w-full text-sm text-left">
              <thead className="bg-muted/50 text-xs font-semibold uppercase text-muted-foreground">
                <tr>
                  <th className="px-4 py-3">Hole # & Program</th>
                  <th className="px-4 py-3">Method</th>
                  <th className="px-4 py-3">Target Depth</th>
                  <th className="px-4 py-3">Dip / Azimuth</th>
                  <th className="px-4 py-3">Collar Coords (E / N / Elev)</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {(Array.isArray(holes) ? holes : [])
                  .filter((h) => {
                    if (!search.trim()) return true;
                    const q = search.toLowerCase();
                    return (
                      h.hole_number?.toLowerCase().includes(q) ||
                      h.status?.toLowerCase().includes(q) ||
                      String(h.notes || '').toLowerCase().includes(q)
                    );
                  })
                  .map((h) => {
                    const prog = programs.find((p) => p.id === h.program_id);
                    const coordsMatch = String(h.notes || '').match(/\[Collar Coords: E: ([^,]*), N: ([^,]*), Elev: ([^\]]*)m\]/);
                    const coordsDisplay = coordsMatch
                      ? `E: ${coordsMatch[1]} | N: ${coordsMatch[2]} | Elev: ${coordsMatch[3]}m`
                      : 'Not specified';

                    return (
                      <tr key={h.id} className="hover:bg-muted/30">
                        <td className="px-4 py-3 font-mono font-medium">
                          <span className="font-bold text-primary block">{h.hole_number}</span>
                          <span className="text-xs text-muted-foreground">{prog?.name || prog?.program_name || 'No Program'}</span>
                        </td>
                        <td className="px-4 py-3">
                          <span className="px-2 py-0.5 rounded text-xs bg-secondary font-medium">
                            {String((h as any).drilling_method || (h as any).drilling_type || 'RC')}
                          </span>
                        </td>
                        <td className="px-4 py-3 font-semibold">{h.target_depth_m} m</td>
                        <td className="px-4 py-3 text-xs text-muted-foreground">
                          {h.dip_deg !== undefined ? `${h.dip_deg}°` : '-60°'} / {h.azimuth_deg !== undefined ? `${h.azimuth_deg}°` : '180°'}
                        </td>
                        <td className="px-4 py-3 text-xs text-muted-foreground">
                          {coordsDisplay}
                        </td>
                        <td className="px-4 py-3">
                          <span className={`px-2 py-0.5 rounded text-xs font-semibold ${
                            h.status === 'COMPLETED' ? 'bg-emerald-500/10 text-emerald-600' :
                            h.status === 'IN_PROGRESS' ? 'bg-blue-500/10 text-blue-600' : 'bg-slate-500/10 text-slate-600'
                          }`}>
                            {h.status}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-right flex items-center justify-end gap-1">
                          <button
                            onClick={() => setSelectedHole(h)}
                            className="px-2.5 py-1 text-xs border rounded font-medium hover:bg-muted inline-flex items-center gap-1"
                          >
                            <Eye className="h-3 w-3" /> Details
                          </button>
                          <button
                            onClick={() => openEditHole(h)}
                            className="px-2.5 py-1 text-xs border border-amber-500/30 text-amber-700 dark:text-amber-400 bg-amber-500/10 rounded font-medium hover:bg-amber-500/20 inline-flex items-center gap-1"
                          >
                            <Pencil className="h-3 w-3" /> Edit
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                {holes.length === 0 && (
                  <tr>
                    <td colSpan={5} className="px-4 py-8 text-center text-muted-foreground">
                      No drill holes recorded.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* NEW SHIFT MODAL */}
      {showAddShift && (
        <Modal title="Create Daily Shift Production Report" onClose={() => setShowAddShift(false)}>
          <form onSubmit={handleCreateShift} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium mb-1">Rig / Asset *</label>
                <SearchableSelect
                  options={rigOptions}
                  value={newShift.rig_id}
                  onChange={(val) => setNewShift({ ...newShift, rig_id: val })}
                  placeholder="Search Rig / Asset by name, code, make..."
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-medium mb-1">Target Project</label>
                <SearchableProjectSelect
                  projects={projects}
                  value={newShift.project_id}
                  onChange={(val) => setNewShift({ ...newShift, project_id: val })}
                  placeholder="Select Project..."
                  required
                />
              </div>

              <div className="col-span-2">
                <label className="block text-xs font-medium mb-1">Drilling Program (Optional)</label>
                <select
                  value={newShift.program_id}
                  onChange={(e) => setNewShift({ ...newShift, program_id: e.target.value })}
                  className="w-full text-sm border rounded p-2 bg-background"
                >
                  <option value="">Select Drilling Program...</option>
                  {getSortedPrograms(newShift.project_id).map((p) => {
                    const isMatch = newShift.project_id && p.project_id === newShift.project_id;
                    return (
                      <option key={p.id} value={p.id}>
                        {isMatch ? '⭐ ' : ''}{String(p.name || p.program_name)} ({String(p.drilling_type || 'RC')}) — Target: {String(p.target_metres ?? 0)}m
                      </option>
                    );
                  })}
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium mb-1">Shift Date</label>
                <input
                  type="date"
                  required
                  value={newShift.date || newShift.shift_date}
                  onChange={(e) => setNewShift({ ...newShift, date: e.target.value, shift_date: e.target.value })}
                  className="w-full text-sm border rounded p-2 bg-background"
                />
              </div>

              <div>
                <label className="block text-xs font-medium mb-1">Shift Type</label>
                <select
                  value={newShift.shift_type}
                  onChange={(e) => setNewShift({ ...newShift, shift_type: e.target.value })}
                  className="w-full text-sm border rounded p-2 bg-background"
                >
                  <option value="DAY">DAY</option>
                  <option value="NIGHT">NIGHT</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium mb-1">Metres Drilled</label>
                <input
                  type="number"
                  step="0.1"
                  min="0"
                  required
                  value={newShift.total_metres_drilled}
                  onChange={(e) => setNewShift({ ...newShift, total_metres_drilled: Math.max(0, Number(e.target.value)) })}
                  className="w-full text-sm border rounded p-2 bg-background"
                />
              </div>

              <div>
                <label className="block text-xs font-medium mb-1">Core Recovery %</label>
                <input
                  type="number"
                  step="0.1"
                  min="0"
                  max="100"
                  required
                  value={newShift.core_recovery_pct}
                  onChange={(e) => setNewShift({ ...newShift, core_recovery_pct: Math.max(0, Number(e.target.value)) })}
                  className="w-full text-sm border rounded p-2 bg-background"
                />
              </div>

              <div>
                <label className="block text-xs font-medium mb-1">Productive Hours</label>
                <input
                  type="number"
                  step="0.5"
                  min="0"
                  required
                  value={newShift.productive_hours}
                  onChange={(e) => setNewShift({ ...newShift, productive_hours: Math.max(0, Number(e.target.value)) })}
                  className="w-full text-sm border rounded p-2 bg-background"
                />
              </div>

              <div>
                <label className="block text-xs font-medium mb-1">Standby Hours</label>
                <input
                  type="number"
                  step="0.5"
                  min="0"
                  required
                  value={newShift.standby_hours}
                  onChange={(e) => setNewShift({ ...newShift, standby_hours: Math.max(0, Number(e.target.value)) })}
                  className="w-full text-sm border rounded p-2 bg-background"
                />
              </div>

              <div className="col-span-2 p-3 border rounded-lg bg-muted/20 space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <label className="block text-xs font-semibold text-foreground">
                      Target Drill Hole Intervals (Multi-Hole Support)
                    </label>
                    <p className="text-[11px] text-muted-foreground">
                      A shift may work on multiple drill holes. Specify worked depth intervals for each hole below.
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        setNewHole((prev) => ({
                          ...prev,
                          project_id: newShift.project_id || prev.project_id,
                        }));
                        setShowAddHole(true);
                      }}
                      className="text-xs text-primary font-semibold hover:underline inline-flex items-center gap-1 bg-primary/10 px-2 py-1 rounded"
                    >
                      <Plus className="h-3 w-3" /> Quick Add Hole
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        const lastTo = shiftIntervals.length > 0 ? Number(shiftIntervals[shiftIntervals.length - 1].to_depth_m) : 0;
                        setShiftIntervals((prev) => [
                          ...prev,
                          { drill_hole_id: '', from_depth_m: lastTo, to_depth_m: lastTo + 60, core_recovery_pct: 95.0, drilling_method: 'RC' },
                        ]);
                      }}
                      className="text-xs text-emerald-700 dark:text-emerald-400 font-semibold hover:underline inline-flex items-center gap-1 bg-emerald-500/10 px-2 py-1 rounded"
                    >
                      <Plus className="h-3 w-3" /> Add Hole Interval
                    </button>
                  </div>
                </div>

                <div className="space-y-2.5">
                  {shiftIntervals.map((interval, idx) => (
                    <div key={idx} className="p-2.5 border rounded-md bg-background space-y-2">
                      <div className="flex items-center justify-between text-xs font-medium text-muted-foreground border-b pb-1">
                        <span>Hole Interval #{idx + 1}</span>
                        {shiftIntervals.length > 1 && (
                          <button
                            type="button"
                            onClick={() => setShiftIntervals((prev) => prev.filter((_, i) => i !== idx))}
                            className="text-destructive hover:underline text-[11px] flex items-center gap-1"
                          >
                            <Trash2 className="h-3 w-3" /> Remove
                          </button>
                        )}
                      </div>
                      <div className="grid grid-cols-12 gap-2 text-xs">
                        <div className="col-span-12 sm:col-span-4">
                          <label className="block text-[10px] text-muted-foreground font-medium mb-0.5">Drill Hole</label>
                          <select
                            value={interval.drill_hole_id}
                            onChange={(e) => {
                              const val = e.target.value;
                              setShiftIntervals((prev) => {
                                const next = [...prev];
                                next[idx] = { ...next[idx], drill_hole_id: val };
                                return next;
                              });
                            }}
                            className="w-full text-xs border rounded p-1.5 bg-background"
                          >
                            <option value="">Select Hole...</option>
                            {(Array.isArray(holes) ? holes : [])
                              .filter((h) => !newShift.project_id || h.project_id === newShift.project_id)
                              .map((h) => (
                                <option key={h.id} value={h.id}>
                                  {h.hole_number} ({String(h.drilling_method || 'RC')})
                                </option>
                              ))}
                          </select>
                        </div>
                        <div className="col-span-6 sm:col-span-2">
                          <label className="block text-[10px] text-muted-foreground font-medium mb-0.5">From (m)</label>
                          <input
                            type="number"
                            step="0.1"
                            min="0"
                            value={interval.from_depth_m}
                            onChange={(e) => {
                              const val = Math.max(0, Number(e.target.value));
                              setShiftIntervals((prev) => {
                                const next = [...prev];
                                next[idx] = { ...next[idx], from_depth_m: val };
                                return next;
                              });
                            }}
                            className="w-full text-xs border rounded p-1.5 bg-background"
                          />
                        </div>
                        <div className="col-span-6 sm:col-span-2">
                          <label className="block text-[10px] text-muted-foreground font-medium mb-0.5">To (m)</label>
                          <input
                            type="number"
                            step="0.1"
                            min="0"
                            value={interval.to_depth_m}
                            onChange={(e) => {
                              const val = Math.max(0, Number(e.target.value));
                              setShiftIntervals((prev) => {
                                const next = [...prev];
                                next[idx] = { ...next[idx], to_depth_m: val };
                                return next;
                              });
                            }}
                            className="w-full text-xs border rounded p-1.5 bg-background"
                          />
                        </div>
                        <div className="col-span-6 sm:col-span-2">
                          <label className="block text-[10px] text-muted-foreground font-medium mb-0.5">Core Rec %</label>
                          <input
                            type="number"
                            step="0.1"
                            min="0"
                            max="100"
                            value={interval.core_recovery_pct}
                            onChange={(e) => {
                              const val = Math.max(0, Math.min(100, Number(e.target.value)));
                              setShiftIntervals((prev) => {
                                const next = [...prev];
                                next[idx] = { ...next[idx], core_recovery_pct: val };
                                return next;
                              });
                            }}
                            className="w-full text-xs border rounded p-1.5 bg-background"
                          />
                        </div>
                        <div className="col-span-6 sm:col-span-2">
                          <label className="block text-[10px] text-muted-foreground font-medium mb-0.5">Method</label>
                          <select
                            value={interval.drilling_method || 'RC'}
                            onChange={(e) => {
                              const val = e.target.value;
                              setShiftIntervals((prev) => {
                                const next = [...prev];
                                next[idx] = { ...next[idx], drilling_method: val };
                                return next;
                              });
                            }}
                            className="w-full text-xs border rounded p-1.5 bg-background"
                          >
                            <option value="RC">RC</option>
                            <option value="DIAMOND_CORE">Diamond Core</option>
                            <option value="RAB">RAB</option>
                            <option value="AIR_CORE">Air Core</option>
                          </select>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                {shiftIntervals.some((i) => i.drill_hole_id) && (
                  <div className="flex items-center justify-between text-xs font-semibold bg-emerald-500/10 text-emerald-800 dark:text-emerald-300 p-2 rounded border border-emerald-500/20">
                    <span>Calculated Shift Totals ({shiftIntervals.filter((i) => i.drill_hole_id).length} Worked Hole{shiftIntervals.filter((i) => i.drill_hole_id).length > 1 ? 's' : ''}):</span>
                    <span className="font-bold">
                      {calculateIntervalTotals(shiftIntervals).totalMetres}m Drilled | Avg Core Rec: {calculateIntervalTotals(shiftIntervals).avgCorePct}%
                    </span>
                  </div>
                )}
              </div>

              <div className="col-span-2 space-y-1.5">
                <label className="block text-xs font-semibold">Attach Shift Log / Core Photo / Field Sheet</label>
                <div className="border-2 border-dashed rounded-lg p-3 text-center bg-muted/10 hover:bg-muted/20 transition cursor-pointer relative">
                  <input
                    type="file"
                    accept=".pdf,.png,.jpg,.jpeg,.csv,.xlsx,.doc,.docx"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) setShiftFile(file);
                    }}
                    className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                  />
                  {shiftFile ? (
                    <div className="flex items-center justify-between bg-card p-2 rounded border text-xs">
                      <div className="flex items-center gap-2 font-medium truncate">
                        <FileText className="h-4 w-4 text-primary shrink-0" />
                        <span className="truncate">{shiftFile.name}</span>
                        <span className="text-muted-foreground text-[10px]">({(shiftFile.size / 1024).toFixed(1)} KB)</span>
                      </div>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setShiftFile(null);
                        }}
                        className="text-muted-foreground hover:text-destructive p-1"
                      >
                        <X className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center gap-1 text-xs text-muted-foreground py-1">
                      <Upload className="h-4 w-4 text-primary" />
                      <span>Click or drag file to attach shift log, core photo, or field sheet</span>
                      <span className="text-[10px] text-muted-foreground/70">PDF, PNG, JPG, CSV, DOCX (Max 10MB)</span>
                    </div>
                  )}
                </div>
              </div>

              <div className="col-span-2">
                <label className="block text-xs font-semibold mb-1">Comments / Operational Remarks</label>
                <textarea
                  rows={2}
                  placeholder="Enter shift notes, operational remarks, weather conditions, or drilling delays..."
                  value={newShift.notes || ''}
                  onChange={(e) => setNewShift({ ...newShift, notes: e.target.value })}
                  className="w-full text-sm border rounded p-2 bg-background resize-y"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowAddShift(false)}
                className="px-4 py-2 text-sm border rounded hover:bg-muted"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-2 text-sm bg-primary text-primary-foreground rounded font-medium hover:bg-primary/90"
              >
                Save Shift Report
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* NEW PROGRAM MODAL */}
      {showAddProgram && (
        <Modal title="Create Drilling Program" onClose={() => setShowAddProgram(false)}>
          <form onSubmit={handleCreateProgram} className="space-y-4">
            <div>
              <label className="block text-xs font-medium mb-1">Target Project</label>
              <SearchableProjectSelect
                projects={projects}
                value={newProgram.project_id}
                onChange={(val) => setNewProgram({ ...newProgram, project_id: val })}
                placeholder="Select Project..."
                required
              />
            </div>

            <div>
              <label className="block text-xs font-medium mb-1">Program Name</label>
              <input
                type="text"
                required
                placeholder="e.g. Nimba Exploration RC Campaign"
                value={newProgram.program_name || newProgram.name}
                onChange={(e) => setNewProgram({ ...newProgram, program_name: e.target.value, name: e.target.value })}
                className="w-full text-sm border rounded p-2 bg-background"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium mb-1">Drilling Method</label>
                <select
                  value={newProgram.drilling_type}
                  onChange={(e) => setNewProgram({ ...newProgram, drilling_type: e.target.value })}
                  className="w-full text-sm border rounded p-2 bg-background"
                >
                  <option value="RC">Reverse Circulation (RC)</option>
                  <option value="DIAMOND_CORE">Diamond Core (DD)</option>
                  <option value="RAB">RAB</option>
                  <option value="AIR_CORE">Air Core</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium mb-1">Target Metres</label>
                <input
                  type="number"
                  required
                  min="1"
                  value={newProgram.target_metres}
                  onChange={(e) => setNewProgram({ ...newProgram, target_metres: Number(e.target.value) })}
                  className="w-full text-sm border rounded p-2 bg-background"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowAddProgram(false)}
                className="px-4 py-2 text-sm border rounded hover:bg-muted"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-2 text-sm bg-primary text-primary-foreground rounded font-medium hover:bg-primary/90"
              >
                Save Program
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* NEW HOLE MODAL */}
      {showAddHole && (
        <Modal error={formErrors.hole} title="Create Drill Hole Specification(s)" onClose={() => setShowAddHole(false)}>
          <form onSubmit={handleCreateHole} className="space-y-4">
            {/* Top Selection Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-3 border rounded-lg bg-muted/20">
              <div>
                <label className="block text-xs font-semibold mb-1">Target Project *</label>
                <SearchableProjectSelect
                  projects={projects}
                  value={newHoleBatch.project_id}
                  onChange={(val) => {
                    setNewHoleBatch({ ...newHoleBatch, project_id: val });
                    setNewHole((prev) => ({ ...prev, project_id: val }));
                    setNewHoleList((prev) => {
                      if (prev.length === 1) {
                        const nextNum = generateNextHoleNum(holes, [], val);
                        return [{ ...prev[0], hole_number: nextNum }];
                      }
                      return prev;
                    });
                  }}
                  placeholder="Select Project..."
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold mb-1">Drilling Program (Optional)</label>
                <select
                  value={newHoleBatch.program_id}
                  onChange={(e) => setNewHoleBatch({ ...newHoleBatch, program_id: e.target.value })}
                  className="w-full text-sm border rounded p-2 bg-background"
                >
                  <option value="">Select Drilling Program...</option>
                  {(Array.isArray(programs) ? programs : [])
                    .filter((p) => !newHoleBatch.project_id || p.project_id === newHoleBatch.project_id)
                    .map((p) => (
                      <option key={p.id} value={p.id}>
                        {String(p.name || p.program_name)} ({String(p.drilling_type || 'RC')}) — Target: {String(p.target_metres ?? 0)}m
                      </option>
                    ))}
                </select>
              </div>
            </div>

            {/* Batch Drill Holes List */}
            <div className="space-y-3">
              <div className="flex items-center justify-between border-b pb-2">
                <div>
                  <h3 className="font-semibold text-xs text-foreground flex items-center gap-1.5">
                    <Compass className="h-4 w-4 text-primary" />
                    Drill Hole Specification List ({newHoleList.length} Hole{newHoleList.length > 1 ? 's' : ''})
                  </h3>
                  <p className="text-[11px] text-muted-foreground">
                    Add single or multiple drill holes for this project & campaign program.
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      const nextNum = generateNextHoleNum(holes, newHoleList, newHoleBatch.project_id);
                      setNewHoleList((prev) => [
                        ...prev,
                        {
                          hole_number: nextNum,
                          drilling_method: 'RC',
                          target_depth_m: 250,
                          dip_deg: -60,
                          azimuth_deg: 180,
                          collar_easting: '',
                          collar_northing: '',
                          collar_elevation: '',
                          notes: '',
                        },
                      ]);
                    }}
                    className="text-xs text-primary font-semibold hover:underline inline-flex items-center gap-1 bg-primary/10 px-2.5 py-1 rounded"
                  >
                    <Plus className="h-3.5 w-3.5" /> Add Hole Row
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      const currentList = [...newHoleList];
                      for (let i = 0; i < 5; i++) {
                        const nextNum = generateNextHoleNum(holes, currentList, newHoleBatch.project_id);
                        currentList.push({
                          hole_number: nextNum,
                          drilling_method: 'RC',
                          target_depth_m: 250,
                          dip_deg: -60,
                          azimuth_deg: 180,
                          collar_easting: '',
                          collar_northing: '',
                          collar_elevation: '',
                          notes: '',
                        });
                      }
                      setNewHoleList(currentList);
                    }}
                    className="text-xs text-emerald-700 dark:text-emerald-400 font-semibold hover:underline inline-flex items-center gap-1 bg-emerald-500/10 px-2.5 py-1 rounded"
                  >
                    <Plus className="h-3.5 w-3.5" /> +5 Batch Rows
                  </button>
                </div>
              </div>

              {/* Rows List */}
              <div className="space-y-3 max-h-[50vh] overflow-y-auto pr-1">
                {newHoleList.map((item, idx) => (
                  <div key={idx} className="p-3 border rounded-lg bg-card space-y-2.5 relative">
                    <div className="flex items-center justify-between text-xs font-semibold text-muted-foreground border-b pb-1.5">
                      <span className="text-primary font-bold">Drill Hole #{idx + 1}</span>
                      {newHoleList.length > 1 && (
                        <button
                          type="button"
                          onClick={() => setNewHoleList((prev) => prev.filter((_, i) => i !== idx))}
                          className="text-destructive hover:underline text-xs flex items-center gap-1"
                        >
                          <Trash2 className="h-3.5 w-3.5" /> Remove Row
                        </button>
                      )}
                    </div>

                    <div className="grid grid-cols-12 gap-2 text-xs">
                      <div className="col-span-12 sm:col-span-4">
                        <label className="block text-[11px] font-medium mb-0.5">Hole Number / ID *</label>
                        <input
                          type="text"
                          required
                          placeholder="e.g. HOLE-RC-001"
                          value={item.hole_number}
                          onChange={(e) => {
                            const val = e.target.value;
                            setNewHoleList((prev) => {
                              const next = [...prev];
                              next[idx] = { ...next[idx], hole_number: val };
                              return next;
                            });
                          }}
                          className="w-full text-xs border rounded p-1.5 bg-background font-mono font-semibold"
                        />
                        {(() => {
                          const numUpper = item.hole_number.toUpperCase().trim();
                          if (!numUpper) return null;
                          const isConflictDB = (Array.isArray(holes) ? holes : []).some(
                            (ex) => ex.hole_number.toUpperCase().trim() === numUpper && (!newHoleBatch.project_id || ex.project_id === newHoleBatch.project_id)
                          );
                          const isDupBatch = newHoleList.filter((b) => b.hole_number.toUpperCase().trim() === numUpper).length > 1;

                          if (isConflictDB) {
                            return <p className="text-[10px] text-destructive font-semibold mt-0.5">⚠️ Already exists in project</p>;
                          }
                          if (isDupBatch) {
                            return <p className="text-[10px] text-amber-600 font-semibold mt-0.5">⚠️ Duplicate in batch</p>;
                          }
                          return null;
                        })()}
                      </div>

                      <div className="col-span-6 sm:col-span-3">
                        <label className="block text-[11px] font-medium mb-0.5">Method</label>
                        <select
                          value={item.drilling_method || 'RC'}
                          onChange={(e) => {
                            const val = e.target.value;
                            setNewHoleList((prev) => {
                              const next = [...prev];
                              next[idx] = { ...next[idx], drilling_method: val };
                              return next;
                            });
                          }}
                          className="w-full text-xs border rounded p-1.5 bg-background"
                        >
                          <option value="RC">RC</option>
                          <option value="DIAMOND_CORE">Diamond Core</option>
                          <option value="RAB">RAB</option>
                          <option value="AIR_CORE">Air Core</option>
                        </select>
                      </div>

                      <div className="col-span-6 sm:col-span-3">
                        <label className="block text-[11px] font-medium mb-0.5">Target Depth (m) *</label>
                        <input
                          type="number"
                          required
                          min="1"
                          value={item.target_depth_m}
                          onChange={(e) => {
                            const val = Number(e.target.value);
                            setNewHoleList((prev) => {
                              const next = [...prev];
                              next[idx] = { ...next[idx], target_depth_m: val };
                              return next;
                            });
                          }}
                          className="w-full text-xs border rounded p-1.5 bg-background font-semibold"
                        />
                      </div>

                      <div className="col-span-6 sm:col-span-1">
                        <label className="block text-[10px] text-muted-foreground font-medium mb-0.5">Dip (°)</label>
                        <input
                          type="number"
                          step="1"
                          min="-90"
                          max="90"
                          value={item.dip_deg ?? -60}
                          onChange={(e) => {
                            const val = Number(e.target.value);
                            setNewHoleList((prev) => {
                              const next = [...prev];
                              next[idx] = { ...next[idx], dip_deg: val };
                              return next;
                            });
                          }}
                          className="w-full text-xs border rounded p-1.5 bg-background"
                        />
                      </div>

                      <div className="col-span-6 sm:col-span-1">
                        <label className="block text-[10px] text-muted-foreground font-medium mb-0.5">Az (°)</label>
                        <input
                          type="number"
                          step="1"
                          min="0"
                          max="360"
                          value={item.azimuth_deg ?? 180}
                          onChange={(e) => {
                            const val = Number(e.target.value);
                            setNewHoleList((prev) => {
                              const next = [...prev];
                              next[idx] = { ...next[idx], azimuth_deg: val };
                              return next;
                            });
                          }}
                          className="w-full text-xs border rounded p-1.5 bg-background"
                        />
                      </div>
                    </div>

                    {/* Optional Collar Coordinates */}
                    <div className="p-2 border rounded bg-muted/20 space-y-1.5">
                      <span className="text-[11px] font-semibold text-muted-foreground block">
                        Collar Coordinates (Optional Georeference)
                      </span>
                      <div className="grid grid-cols-3 gap-2 text-xs">
                        <div>
                          <input
                            type="text"
                            placeholder="Easting (X) e.g. 524100.5"
                            value={item.collar_easting || ''}
                            onChange={(e) => {
                              const val = e.target.value;
                              setNewHoleList((prev) => {
                                const next = [...prev];
                                next[idx] = { ...next[idx], collar_easting: val };
                                return next;
                              });
                            }}
                            className="w-full text-xs border rounded p-1.5 bg-background font-mono"
                          />
                        </div>
                        <div>
                          <input
                            type="text"
                            placeholder="Northing (Y) e.g. 1084200.2"
                            value={item.collar_northing || ''}
                            onChange={(e) => {
                              const val = e.target.value;
                              setNewHoleList((prev) => {
                                const next = [...prev];
                                next[idx] = { ...next[idx], collar_northing: val };
                                return next;
                              });
                            }}
                            className="w-full text-xs border rounded p-1.5 bg-background font-mono"
                          />
                        </div>
                        <div>
                          <input
                            type="text"
                            placeholder="Elevation (Z) e.g. 350.0m"
                            value={item.collar_elevation || ''}
                            onChange={(e) => {
                              const val = e.target.value;
                              setNewHoleList((prev) => {
                                const next = [...prev];
                                next[idx] = { ...next[idx], collar_elevation: val };
                                return next;
                              });
                            }}
                            className="w-full text-xs border rounded p-1.5 bg-background font-mono"
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t">
              <button
                type="button"
                onClick={() => setShowAddHole(false)}
                className="px-4 py-2 text-sm border rounded hover:bg-muted"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-2 text-sm bg-primary text-primary-foreground rounded font-medium hover:bg-primary/90"
              >
                Save {newHoleList.length} Drill Hole Specification{newHoleList.length > 1 ? 's' : ''}
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* VIEW SHIFT DETAILS MODAL */}
      {selectedShift && (
        <Modal title={`Shift Report - ${selectedShift.report_number || selectedShift.shift_number || (selectedShift.id ? `DR-${selectedShift.id.slice(0, 8).toUpperCase()}` : 'N/A')}`} onClose={() => setSelectedShift(null)}>
          <div className="space-y-4 text-xs">
            {/* Header: Rig, Project, Program, Date, Status */}
            <div className="border-b pb-3 space-y-2">
              <div className="flex items-center justify-between text-sm">
                <div>
                  <span className="font-bold text-base text-foreground">
                    {selectedShift.date || selectedShift.shift_date || (selectedShift.created_at ? selectedShift.created_at.slice(0, 10) : 'N/A')} ({selectedShift.shift_type || 'DAY'} Shift)
                  </span>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    <strong className="text-foreground font-semibold">Rig / Asset:</strong>{' '}
                    {(selectedShift as any).rig_name || assets.find((a) => a.id === selectedShift.rig_id)?.name || selectedShift.rig_id || 'Primary Rig'}
                  </p>
                </div>
                <span
                  className={`px-3 py-1 rounded-full text-xs font-bold ${
                    selectedShift.status === 'APPROVED'
                      ? 'bg-emerald-500/10 text-emerald-600 border border-emerald-500/30'
                      : selectedShift.status === 'SUBMITTED'
                      ? 'bg-blue-500/10 text-blue-600 border border-blue-500/30'
                      : 'bg-amber-500/10 text-amber-600 border border-amber-500/30'
                  }`}
                >
                  {selectedShift.status}
                </span>
              </div>

              {/* Project & Program Sub-Header */}
              <div className="grid grid-cols-2 gap-2 text-xs bg-muted/20 p-2.5 rounded-lg border">
                <div>
                  <span className="text-muted-foreground block text-[10px] font-semibold uppercase">Target Project</span>
                  <span className="font-semibold text-foreground">
                    {(selectedShift as any).project_name || projects.find((p) => p.id === selectedShift.project_id)?.name || selectedShift.project_id || 'N/A'}
                  </span>
                </div>
                <div>
                  <span className="text-muted-foreground block text-[10px] font-semibold uppercase">Drilling Campaign Program</span>
                  <span className="font-semibold text-foreground">
                    {(selectedShift as any).program_name || programs.find((pr) => pr.id === (selectedShift as any).program_id)?.name || 'General Operations'}
                  </span>
                </div>
              </div>
            </div>

            {/* People Attributed: Supervisor, Submitted By, Approved By */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 text-xs">
              <div className="p-2.5 border rounded-lg bg-card">
                <span className="text-muted-foreground block text-[10px] font-semibold uppercase">Shift Supervisor</span>
                <span className="font-bold text-foreground block">
                  {(selectedShift as any).supervisor_name || 'Rig Supervisor'}
                </span>
                <span className="text-[10px] text-muted-foreground">
                  {(selectedShift as any).supervisor_role || 'Field Operations'}
                </span>
              </div>

              <div className="p-2.5 border rounded-lg bg-card">
                <span className="text-muted-foreground block text-[10px] font-semibold uppercase">Submitted By</span>
                <span className="font-bold text-foreground block">
                  {(selectedShift as any).submitted_by_name || 'Operations Staff'}
                </span>
                <span className="text-[10px] text-muted-foreground">
                  {(selectedShift as any).submitted_by_role || 'Field Operator'}
                </span>
              </div>

              <div className="p-2.5 border rounded-lg bg-card">
                <span className="text-muted-foreground block text-[10px] font-semibold uppercase">Approved By</span>
                <span className="font-bold text-foreground block">
                  {(selectedShift as any).approved_by_name || (selectedShift.status === 'APPROVED' ? 'Operations Manager' : 'Pending Approval')}
                </span>
                <span className="text-[10px] text-muted-foreground">
                  {(selectedShift as any).approved_by_role || (selectedShift.status === 'APPROVED' ? 'Operations Manager' : 'Awaiting Review')}
                </span>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div className="p-3 border rounded-lg bg-card">
                <span className="text-muted-foreground block">Metres Drilled</span>
                <strong className="text-base text-emerald-600 font-bold">{selectedShift.total_metres ?? selectedShift.total_metres_drilled ?? selectedShift.metres_drilled ?? 0} m</strong>
              </div>
              <div className="p-3 border rounded-lg bg-card">
                <span className="text-muted-foreground block">Core Recovery</span>
                <strong className="text-base font-bold">{selectedShift.avg_core_recovery_pct ?? selectedShift.core_recovery_pct ?? 0}%</strong>
              </div>
              <div className="p-3 border rounded-lg bg-card">
                <span className="text-muted-foreground block">Hours Breakdown</span>
                <span className="font-medium">
                  {(selectedShift.standby_hours ?? 0) > 0 || (selectedShift.maintenance_hours ?? 0) > 0
                    ? `${selectedShift.total_productive_hours ?? selectedShift.productive_hours ?? 0}h Prod / ${selectedShift.standby_hours ?? 0}h Stby / ${selectedShift.maintenance_hours ?? 0}h Maint`
                    : `${selectedShift.total_productive_hours ?? selectedShift.productive_hours ?? 0}h Prod / ${selectedShift.total_nonproductive_hours ?? 0}h Non-Prod`}
                </span>
              </div>
            </div>

            {/* Worked Drill Holes & Meterage Intervals Table */}
            <div className="border rounded-lg bg-card p-3 space-y-2">
              <div className="flex items-center justify-between border-b pb-1.5">
                <h3 className="font-semibold text-xs flex items-center gap-1.5 text-foreground">
                  <Compass className="h-4 w-4 text-primary" />
                  Worked Drill Holes & Meterage Telemetry
                </h3>
                <span className="text-[11px] text-muted-foreground font-medium">
                  {Array.isArray(selectedShift.intervals) && selectedShift.intervals.length > 0
                    ? `${selectedShift.intervals.length} Interval(s)`
                    : 'Single Hole Record'}
                </span>
              </div>

              {Array.isArray(selectedShift.intervals) && selectedShift.intervals.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="w-full text-xs text-left">
                    <thead className="bg-muted/40 text-[10px] font-semibold uppercase text-muted-foreground">
                      <tr>
                        <th className="px-2.5 py-1.5">Hole #</th>
                        <th className="px-2.5 py-1.5">Depth Interval</th>
                        <th className="px-2.5 py-1.5">Metres Drilled</th>
                        <th className="px-2.5 py-1.5">Core Recovered</th>
                        <th className="px-2.5 py-1.5">Core Rec %</th>
                        <th className="px-2.5 py-1.5">Method</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y text-xs">
                      {selectedShift.intervals.map((int: any, idx: number) => {
                        const h = holes.find((hole) => hole.id === int.drill_hole_id);
                        const holeName = h?.hole_number || (int.drill_hole_id ? `Hole ...${int.drill_hole_id.slice(-6)}` : 'Hole N/A');
                        const m = Math.max(0, Number(int.to_depth_m ?? 0) - Number(int.from_depth_m ?? 0));
                        const recM = Number(int.core_recovered_m ?? 0);
                        const recPct = m > 0 ? ((recM / m) * 100).toFixed(1) : '0.0';
                        return (
                          <tr key={idx} className="hover:bg-muted/30">
                            <td className="px-2.5 py-1.5 font-semibold text-primary">{holeName}</td>
                            <td className="px-2.5 py-1.5 font-medium">{int.from_depth_m}m — {int.to_depth_m}m</td>
                            <td className="px-2.5 py-1.5 font-semibold text-emerald-600">{m} m</td>
                            <td className="px-2.5 py-1.5">{recM.toFixed(1)} m</td>
                            <td className="px-2.5 py-1.5 font-semibold">{recPct}%</td>
                            <td className="px-2.5 py-1.5">
                              <span className="px-1.5 py-0.5 rounded bg-secondary text-[10px] font-medium">{int.drilling_method || 'RC'}</span>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="p-2 bg-muted/20 rounded text-xs text-muted-foreground flex items-center justify-between">
                  <span>Associated Hole: {holes.find((h) => h.id === (selectedShift as any).hole_id)?.hole_number || 'N/A'}</span>
                  <span>Total: {selectedShift.total_metres ?? selectedShift.total_metres_drilled ?? 0}m</span>
                </div>
              )}
            </div>

            {/* Daily Operational Context (Same Day Telemetry) */}
            <div className="border rounded-lg bg-card p-3 space-y-2.5">
              <div className="flex items-center justify-between border-b pb-1.5">
                <h3 className="font-semibold text-xs flex items-center gap-1.5 text-foreground">
                  <Flame className="h-4 w-4 text-amber-500" />
                  Daily 360° Operational Context (Same Day Project Telemetry)
                </h3>
                <span className="text-[10px] text-muted-foreground font-medium">
                  Date: {selectedShift.date || selectedShift.shift_date}
                </span>
              </div>

              {loadingContext ? (
                <div className="py-4 text-center text-xs text-muted-foreground animate-pulse">
                  Loading same-day operational telemetry (Store consumptions, fuel, defects, HSE)...
                </div>
              ) : dailyContext ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                  {/* Store Consumptions */}
                  <div className="p-2.5 border rounded-lg bg-muted/10 space-y-1.5">
                    <div className="flex items-center justify-between font-semibold text-foreground border-b pb-1">
                      <span className="flex items-center gap-1 text-[11px]">📦 Store Consumptions</span>
                      <span className="badge badge-neutral text-[10px]">{dailyContext.store_consumptions?.length || 0}</span>
                    </div>
                    {dailyContext.store_consumptions?.length > 0 ? (
                      <div className="space-y-1 text-[11px] max-h-28 overflow-y-auto pr-1">
                        {dailyContext.store_consumptions.map((c: any, i: number) => (
                          <div key={i} className="flex justify-between border-b border-border/40 pb-0.5">
                            <span className="font-medium text-foreground">{c.item_name} ({c.quantity} {c.unit})</span>
                            <span className="text-muted-foreground">${c.total_cost?.toLocaleString()}</span>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-[11px] text-muted-foreground">No store consumptions logged on this date.</p>
                    )}
                  </div>

                  {/* Fuel & Meter Readings */}
                  <div className="p-2.5 border rounded-lg bg-muted/10 space-y-1.5">
                    <div className="flex items-center justify-between font-semibold text-foreground border-b pb-1">
                      <span className="flex items-center gap-1 text-[11px]">⛽ Fuel & Meter Logs</span>
                      <span className="badge badge-neutral text-[10px]">{(dailyContext.fuel_reports?.length || 0) + (dailyContext.meter_readings?.length || 0)}</span>
                    </div>
                    {dailyContext.fuel_reports?.length > 0 || dailyContext.meter_readings?.length > 0 ? (
                      <div className="space-y-1 text-[11px] max-h-28 overflow-y-auto pr-1">
                        {dailyContext.fuel_reports?.map((f: any, i: number) => (
                          <div key={`f-${i}`} className="flex justify-between border-b border-border/40 pb-0.5">
                            <span className="font-medium text-foreground">{f.asset_name}: {f.fuel_quantity} {f.fuel_unit}</span>
                            <span className="text-muted-foreground">{f.meter_reading ? `${f.meter_reading}h` : ''}</span>
                          </div>
                        ))}
                        {dailyContext.meter_readings?.map((m: any, i: number) => (
                          <div key={`m-${i}`} className="flex justify-between border-b border-border/40 pb-0.5">
                            <span className="font-medium text-foreground">{m.asset_name}: {m.meter_type}</span>
                            <span className="text-muted-foreground">{m.value} {m.unit}</span>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-[11px] text-muted-foreground">No fuel logs or meter readings recorded on this date.</p>
                    )}
                  </div>

                  {/* Faults & Breakdowns */}
                  <div className="p-2.5 border rounded-lg bg-muted/10 space-y-1.5">
                    <div className="flex items-center justify-between font-semibold text-foreground border-b pb-1">
                      <span className="flex items-center gap-1 text-[11px]">🛠️ Faults & Breakdowns</span>
                      <span className="badge badge-neutral text-[10px]">{dailyContext.faults_breakdowns?.length || 0}</span>
                    </div>
                    {dailyContext.faults_breakdowns?.length > 0 ? (
                      <div className="space-y-1 text-[11px] max-h-28 overflow-y-auto pr-1">
                        {dailyContext.faults_breakdowns.map((d: any, i: number) => (
                          <div key={i} className="flex justify-between border-b border-border/40 pb-0.5">
                            <span className="font-medium text-destructive">{d.asset_name}: {d.title}</span>
                            <span className="text-muted-foreground font-semibold">{d.severity}</span>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-[11px] text-muted-foreground">No faults or breakdowns reported on this date.</p>
                    )}
                  </div>

                  {/* HSE Incidents */}
                  <div className="p-2.5 border rounded-lg bg-muted/10 space-y-1.5">
                    <div className="flex items-center justify-between font-semibold text-foreground border-b pb-1">
                      <span className="flex items-center gap-1 text-[11px]">⚠️ HSE Incidents</span>
                      <span className="badge badge-neutral text-[10px]">{dailyContext.hse_incidents?.length || 0}</span>
                    </div>
                    {dailyContext.hse_incidents?.length > 0 ? (
                      <div className="space-y-1 text-[11px] max-h-28 overflow-y-auto pr-1">
                        {dailyContext.hse_incidents.map((h: any, i: number) => (
                          <div key={i} className="flex justify-between border-b border-border/40 pb-0.5">
                            <span className="font-medium text-amber-700 dark:text-amber-400">{h.incident_number}: {h.title}</span>
                            <span className="text-muted-foreground font-semibold">{h.severity}</span>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-[11px] text-muted-foreground">Zero HSE incidents reported on this date. Clean safety record.</p>
                    )}
                  </div>
                </div>
              ) : (
                <p className="text-[11px] text-muted-foreground">Unable to load same-day context telemetry.</p>
              )}
            </div>

            {Boolean(selectedShift.notes) && (
              <div className="p-3 border rounded-lg bg-card space-y-1">
                <span className="font-semibold block text-[11px] text-muted-foreground uppercase">Comments / Operational Remarks</span>
                <p className="text-xs whitespace-pre-wrap text-foreground font-medium">{String(selectedShift.notes)}</p>
              </div>
            )}

            {selectedShift.status !== 'APPROVED' && (
              <div className="flex justify-end items-center gap-2 pt-3 border-t">
                <button
                  onClick={() => {
                    const s = selectedShift;
                    setSelectedShift(null);
                    openEditShift(s);
                  }}
                  className="px-3 py-1.5 text-xs border border-amber-500/30 text-amber-700 dark:text-amber-400 bg-amber-500/10 rounded font-semibold hover:bg-amber-500/20 inline-flex items-center gap-1"
                >
                  <Pencil className="h-3.5 w-3.5" /> Edit Report
                </button>
                <button
                  onClick={async () => {
                    const sId = selectedShift.id;
                    setSelectedShift(null);
                    await handleDeleteShift(sId);
                  }}
                  className="px-3 py-1.5 text-xs border border-rose-500/30 text-rose-700 dark:text-rose-400 bg-rose-500/10 rounded font-semibold hover:bg-rose-500/20 inline-flex items-center gap-1"
                >
                  <Trash2 className="h-3.5 w-3.5" /> Delete Report
                </button>
                {(selectedShift.status === 'DRAFT' || selectedShift.status === 'RETURNED') && (
                  <button
                    onClick={async () => {
                      const sId = selectedShift.id;
                      setSelectedShift(null);
                      await handleSubmitShift(sId);
                    }}
                    className="px-3 py-1.5 text-xs border border-blue-500/30 text-blue-700 dark:text-blue-400 bg-blue-500/10 rounded font-semibold hover:bg-blue-500/20 inline-flex items-center gap-1"
                  >
                    <CheckCircle2 className="h-3.5 w-3.5" /> Submit Report
                  </button>
                )}
                {selectedShift.status !== 'APPROVED' && canApproveShift && (
                  <button
                    onClick={async () => {
                      await handleApproveShift(selectedShift.id);
                      setSelectedShift(null);
                    }}
                    className="px-4 py-1.5 bg-emerald-600 text-white rounded text-xs font-semibold hover:bg-emerald-700"
                  >
                    Approve Shift Report
                  </button>
                )}
              </div>
            )}
          </div>
        </Modal>
      )}

      {/* EDIT SHIFT MODAL */}
      {editingShift && (
        <Modal title={`Edit Daily Shift Production Report - ${editingShift.report_number || editingShift.shift_number || (editingShift.id ? `DR-${editingShift.id.slice(0, 8).toUpperCase()}` : '')}`} onClose={() => setEditingShift(null)}>
          <form onSubmit={handleUpdateShift} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium mb-1">Rig / Asset *</label>
                <SearchableSelect
                  options={rigOptions}
                  value={editingShift.rig_id || ''}
                  onChange={(val) => setEditingShift({ ...editingShift, rig_id: val })}
                  placeholder="Search Rig / Asset by name, code, make..."
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-medium mb-1">Target Project</label>
                <SearchableProjectSelect
                  projects={projects}
                  value={editingShift.project_id || ''}
                  onChange={(val) => setEditingShift({ ...editingShift, project_id: val })}
                  placeholder="Select Project..."
                  required
                />
              </div>

              <div className="col-span-2">
                <label className="block text-xs font-medium mb-1">Drilling Program (Optional)</label>
                <select
                  value={(editingShift as any).program_id || ''}
                  onChange={(e) => setEditingShift({ ...editingShift, program_id: e.target.value } as any)}
                  className="w-full text-sm border rounded p-2 bg-background"
                >
                  <option value="">Select Drilling Program...</option>
                  {(Array.isArray(programs) ? programs : [])
                    .filter((p) => !editingShift.project_id || p.project_id === editingShift.project_id)
                    .map((p) => (
                      <option key={p.id} value={p.id}>
                        {String(p.name || p.program_name)} ({String(p.drilling_type || 'RC')}) — Target: {String(p.target_metres ?? 0)}m
                      </option>
                    ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium mb-1">Shift Date</label>
                <input
                  type="date"
                  required
                  value={(editingShift as any).date || editingShift.shift_date || ''}
                  onChange={(e) => setEditingShift({ ...editingShift, shift_date: e.target.value, date: e.target.value } as any)}
                  className="w-full text-sm border rounded p-2 bg-background"
                />
              </div>

              <div>
                <label className="block text-xs font-medium mb-1">Shift Type</label>
                <select
                  value={editingShift.shift_type || 'DAY'}
                  onChange={(e) => setEditingShift({ ...editingShift, shift_type: e.target.value as any })}
                  className="w-full text-sm border rounded p-2 bg-background"
                >
                  <option value="DAY">DAY</option>
                  <option value="NIGHT">NIGHT</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium mb-1">Metres Drilled</label>
                <input
                  type="number"
                  step="0.1"
                  required
                  value={editingShift.total_metres_drilled ?? editingShift.total_metres ?? editingShift.metres_drilled ?? 0}
                  onChange={(e) => setEditingShift({ ...editingShift, total_metres_drilled: Number(e.target.value), total_metres: Number(e.target.value) })}
                  className="w-full text-sm border rounded p-2 bg-background"
                />
              </div>

              <div>
                <label className="block text-xs font-medium mb-1">Core Recovery %</label>
                <input
                  type="number"
                  step="0.1"
                  required
                  value={editingShift.core_recovery_pct ?? editingShift.avg_core_recovery_pct ?? 0}
                  onChange={(e) => setEditingShift({ ...editingShift, core_recovery_pct: Number(e.target.value), avg_core_recovery_pct: Number(e.target.value) })}
                  className="w-full text-sm border rounded p-2 bg-background"
                />
              </div>

              <div>
                <label className="block text-xs font-medium mb-1">Productive Hours</label>
                <input
                  type="number"
                  step="0.5"
                  required
                  value={editingShift.productive_hours ?? editingShift.total_productive_hours ?? 0}
                  onChange={(e) => setEditingShift({ ...editingShift, productive_hours: Number(e.target.value), total_productive_hours: Number(e.target.value) })}
                  className="w-full text-sm border rounded p-2 bg-background"
                />
              </div>

              <div>
                <label className="block text-xs font-medium mb-1">Standby Hours</label>
                <input
                  type="number"
                  step="0.5"
                  required
                  value={editingShift.standby_hours ?? 0}
                  onChange={(e) => setEditingShift({ ...editingShift, standby_hours: Number(e.target.value) })}
                  className="w-full text-sm border rounded p-2 bg-background"
                />
              </div>

              <div>
                <label className="block text-xs font-medium mb-1">Maintenance Hours</label>
                <input
                  type="number"
                  step="0.5"
                  required
                  value={editingShift.maintenance_hours ?? 0}
                  onChange={(e) => setEditingShift({ ...editingShift, maintenance_hours: Number(e.target.value) })}
                  className="w-full text-sm border rounded p-2 bg-background"
                />
              </div>

              <div className="col-span-2 p-3 border rounded-lg bg-muted/20 space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <label className="block text-xs font-semibold text-foreground">
                      Target Drill Hole Intervals (Multi-Hole Support)
                    </label>
                    <p className="text-[11px] text-muted-foreground">
                      A shift may work on multiple drill holes. Specify worked depth intervals for each hole below.
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        setNewHole((prev) => ({
                          ...prev,
                          project_id: editingShift.project_id || prev.project_id,
                        }));
                        setShowAddHole(true);
                      }}
                      className="text-xs text-primary font-semibold hover:underline inline-flex items-center gap-1 bg-primary/10 px-2 py-1 rounded"
                    >
                      <Plus className="h-3 w-3" /> Quick Add Hole
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        const lastTo = editShiftIntervals.length > 0 ? Number(editShiftIntervals[editShiftIntervals.length - 1].to_depth_m) : 0;
                        setEditShiftIntervals((prev) => [
                          ...prev,
                          { drill_hole_id: '', from_depth_m: lastTo, to_depth_m: lastTo + 60, core_recovery_pct: 95.0, drilling_method: 'RC' },
                        ]);
                      }}
                      className="text-xs text-emerald-700 dark:text-emerald-400 font-semibold hover:underline inline-flex items-center gap-1 bg-emerald-500/10 px-2 py-1 rounded"
                    >
                      <Plus className="h-3 w-3" /> Add Hole Interval
                    </button>
                  </div>
                </div>

                <div className="space-y-2.5">
                  {editShiftIntervals.map((interval, idx) => (
                    <div key={idx} className="p-2.5 border rounded-md bg-background space-y-2">
                      <div className="flex items-center justify-between text-xs font-medium text-muted-foreground border-b pb-1">
                        <span>Hole Interval #{idx + 1}</span>
                        {editShiftIntervals.length > 1 && (
                          <button
                            type="button"
                            onClick={() => setEditShiftIntervals((prev) => prev.filter((_, i) => i !== idx))}
                            className="text-destructive hover:underline text-[11px] flex items-center gap-1"
                          >
                            <Trash2 className="h-3 w-3" /> Remove
                          </button>
                        )}
                      </div>
                      <div className="grid grid-cols-12 gap-2 text-xs">
                        <div className="col-span-12 sm:col-span-4">
                          <label className="block text-[10px] text-muted-foreground font-medium mb-0.5">Drill Hole</label>
                          <select
                            value={interval.drill_hole_id}
                            onChange={(e) => {
                              const val = e.target.value;
                              setEditShiftIntervals((prev) => {
                                const next = [...prev];
                                next[idx] = { ...next[idx], drill_hole_id: val };
                                return next;
                              });
                            }}
                            className="w-full text-xs border rounded p-1.5 bg-background"
                          >
                            <option value="">Select Hole...</option>
                            {(Array.isArray(holes) ? holes : [])
                              .filter((h) => !editingShift.project_id || h.project_id === editingShift.project_id)
                              .map((h) => (
                                <option key={h.id} value={h.id}>
                                  {h.hole_number} ({String(h.drilling_method || 'RC')})
                                </option>
                              ))}
                          </select>
                        </div>
                        <div className="col-span-6 sm:col-span-2">
                          <label className="block text-[10px] text-muted-foreground font-medium mb-0.5">From (m)</label>
                          <input
                            type="number"
                            step="0.1"
                            value={interval.from_depth_m}
                            onChange={(e) => {
                              const val = Number(e.target.value);
                              setEditShiftIntervals((prev) => {
                                const next = [...prev];
                                next[idx] = { ...next[idx], from_depth_m: val };
                                return next;
                              });
                            }}
                            className="w-full text-xs border rounded p-1.5 bg-background"
                          />
                        </div>
                        <div className="col-span-6 sm:col-span-2">
                          <label className="block text-[10px] text-muted-foreground font-medium mb-0.5">To (m)</label>
                          <input
                            type="number"
                            step="0.1"
                            value={interval.to_depth_m}
                            onChange={(e) => {
                              const val = Number(e.target.value);
                              setEditShiftIntervals((prev) => {
                                const next = [...prev];
                                next[idx] = { ...next[idx], to_depth_m: val };
                                return next;
                              });
                            }}
                            className="w-full text-xs border rounded p-1.5 bg-background"
                          />
                        </div>
                        <div className="col-span-6 sm:col-span-2">
                          <label className="block text-[10px] text-muted-foreground font-medium mb-0.5">Core Rec %</label>
                          <input
                            type="number"
                            step="0.1"
                            value={interval.core_recovery_pct}
                            onChange={(e) => {
                              const val = Number(e.target.value);
                              setEditShiftIntervals((prev) => {
                                const next = [...prev];
                                next[idx] = { ...next[idx], core_recovery_pct: val };
                                return next;
                              });
                            }}
                            className="w-full text-xs border rounded p-1.5 bg-background"
                          />
                        </div>
                        <div className="col-span-6 sm:col-span-2">
                          <label className="block text-[10px] text-muted-foreground font-medium mb-0.5">Method</label>
                          <select
                            value={interval.drilling_method || 'RC'}
                            onChange={(e) => {
                              const val = e.target.value;
                              setEditShiftIntervals((prev) => {
                                const next = [...prev];
                                next[idx] = { ...next[idx], drilling_method: val };
                                return next;
                              });
                            }}
                            className="w-full text-xs border rounded p-1.5 bg-background"
                          >
                            <option value="RC">RC</option>
                            <option value="DIAMOND_CORE">Diamond Core</option>
                            <option value="RAB">RAB</option>
                            <option value="AIR_CORE">Air Core</option>
                          </select>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                {editShiftIntervals.some((i) => i.drill_hole_id) && (
                  <div className="flex items-center justify-between text-xs font-semibold bg-emerald-500/10 text-emerald-800 dark:text-emerald-300 p-2 rounded border border-emerald-500/20">
                    <span>Calculated Shift Totals ({editShiftIntervals.filter((i) => i.drill_hole_id).length} Worked Hole{editShiftIntervals.filter((i) => i.drill_hole_id).length > 1 ? 's' : ''}):</span>
                    <span className="font-bold">
                      {calculateIntervalTotals(editShiftIntervals).totalMetres}m Drilled | Avg Core Rec: {calculateIntervalTotals(editShiftIntervals).avgCorePct}%
                    </span>
                  </div>
                )}
              </div>

              <div className="col-span-2 space-y-1.5">
                <label className="block text-xs font-semibold">Attach Shift Log / Core Photo / Field Sheet</label>
                <div className="border-2 border-dashed rounded-lg p-3 text-center bg-muted/10 hover:bg-muted/20 transition cursor-pointer relative">
                  <input
                    type="file"
                    accept=".pdf,.png,.jpg,.jpeg,.csv,.xlsx,.doc,.docx"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) setEditShiftFile(file);
                    }}
                    className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                  />
                  {editShiftFile ? (
                    <div className="flex items-center justify-between bg-card p-2 rounded border text-xs">
                      <div className="flex items-center gap-2 font-medium truncate">
                        <FileText className="h-4 w-4 text-primary shrink-0" />
                        <span className="truncate">{editShiftFile.name}</span>
                        <span className="text-muted-foreground text-[10px]">({(editShiftFile.size / 1024).toFixed(1)} KB)</span>
                      </div>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setEditShiftFile(null);
                        }}
                        className="text-muted-foreground hover:text-destructive p-1"
                      >
                        <X className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center gap-1 text-xs text-muted-foreground py-1">
                      <Upload className="h-4 w-4 text-primary" />
                      <span>Click or drag file to attach shift log, core photo, or field sheet</span>
                      <span className="text-[10px] text-muted-foreground/70">PDF, PNG, JPG, CSV, DOCX (Max 10MB)</span>
                    </div>
                  )}
                </div>
              </div>

              <div className="col-span-2">
                <label className="block text-xs font-semibold mb-1">Comments / Operational Remarks</label>
                <textarea
                  rows={2}
                  placeholder="Enter shift notes, operational remarks, weather conditions, or drilling delays..."
                  value={(editingShift.notes as string) || ''}
                  onChange={(e) => setEditingShift({ ...editingShift, notes: e.target.value })}
                  className="w-full text-sm border rounded p-2 bg-background resize-y"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t">
              <button
                type="button"
                onClick={() => setEditingShift(null)}
                className="px-4 py-2 text-sm border rounded hover:bg-muted"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-2 text-sm bg-primary text-primary-foreground rounded font-medium hover:bg-primary/90"
              >
                Save & Update Shift Report
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* VIEW PROGRAM DETAILS MODAL */}
      {selectedProgram && (
        <Modal title={`Drilling Program - ${selectedProgram.name || selectedProgram.program_name}`} onClose={() => setSelectedProgram(null)}>
          <div className="space-y-4 text-xs">
            <div className="flex items-center justify-between border-b pb-3">
              <div>
                <span className="text-muted-foreground">Method: {selectedProgram.drilling_type}</span>
              </div>
              <span className="px-2 py-0.5 rounded bg-secondary text-xs font-semibold">{selectedProgram.status}</span>
            </div>
            <div className="p-4 border rounded-lg bg-card space-y-2">
              <div className="flex justify-between font-semibold text-sm">
                <span>Total Metres Target</span>
                <span>{selectedProgram.target_metres} m</span>
              </div>
              <div className="flex justify-between font-semibold text-sm text-emerald-600">
                <span>Drilled Progress</span>
                <span>{getProgramDrilledMetres(selectedProgram)} m</span>
              </div>
            </div>
          </div>
        </Modal>
      )}

      {/* VIEW HOLE DETAILS MODAL */}
      {selectedHole && (
        <Modal title={`Drill Hole Specification - ${selectedHole.hole_number}`} onClose={() => setSelectedHole(null)}>
          <div className="space-y-4 text-xs">
            <div className="flex items-center justify-between border-b pb-3 text-sm">
              <div>
                <span className="font-bold text-base text-primary block">{selectedHole.hole_number}</span>
                <span className="text-xs text-muted-foreground">
                  Program: {programs.find((p) => p.id === selectedHole.program_id)?.name || 'Unassigned Program'}
                </span>
              </div>
              <span className="px-2.5 py-0.5 rounded-full font-semibold bg-secondary text-foreground">
                {selectedHole.status}
              </span>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="p-3 border rounded-lg bg-card">
                <span className="text-muted-foreground block text-[11px]">Drilling Method</span>
                <strong className="text-sm font-semibold">{String((selectedHole as any).drilling_method || (selectedHole as any).drilling_type || 'RC')}</strong>
              </div>
              <div className="p-3 border rounded-lg bg-card">
                <span className="text-muted-foreground block text-[11px]">Target Depth</span>
                <strong className="text-sm font-semibold text-emerald-600">{selectedHole.target_depth_m} m</strong>
              </div>
              <div className="p-3 border rounded-lg bg-card">
                <span className="text-muted-foreground block text-[11px]">Dip / Azimuth Inclination</span>
                <strong className="text-sm font-semibold">{selectedHole.dip_deg !== undefined ? `${selectedHole.dip_deg}°` : '-60°'} / {selectedHole.azimuth_deg !== undefined ? `${selectedHole.azimuth_deg}°` : '180°'}</strong>
              </div>
              <div className="p-3 border rounded-lg bg-card">
                <span className="text-muted-foreground block text-[11px]">Final Drilled Depth</span>
                <strong className="text-sm font-semibold">{selectedHole.final_depth_m || 0} m</strong>
              </div>
            </div>

            {/* Collar Coordinates Card */}
            <div className="p-3 border rounded-lg bg-muted/20 space-y-1.5">
              <span className="font-semibold block text-xs flex items-center gap-1">
                <Compass className="h-3.5 w-3.5 text-primary" /> Collar Coordinates & Georeference
              </span>
              {(() => {
                const match = String(selectedHole.notes || '').match(/\[Collar Coords: E: ([^,]*), N: ([^,]*), Elev: ([^\]]*)m\]/);
                if (match) {
                  return (
                    <div className="grid grid-cols-3 gap-2 pt-1 font-mono text-xs">
                      <div className="bg-background p-2 rounded border">
                        <span className="text-[10px] text-muted-foreground block">Easting (X)</span>
                        <span className="font-bold">{match[1]}</span>
                      </div>
                      <div className="bg-background p-2 rounded border">
                        <span className="text-[10px] text-muted-foreground block">Northing (Y)</span>
                        <span className="font-bold">{match[2]}</span>
                      </div>
                      <div className="bg-background p-2 rounded border">
                        <span className="text-[10px] text-muted-foreground block">Elevation (Z)</span>
                        <span className="font-bold">{match[3]} m</span>
                      </div>
                    </div>
                  );
                }
                return <span className="text-muted-foreground italic text-xs">No collar coordinates specified for this hole.</span>;
              })()}
            </div>

            {Boolean(selectedHole.notes) && (
              <div className="p-3 border rounded-lg bg-card space-y-1">
                <span className="font-semibold block text-[11px] text-muted-foreground">Notes / Comments</span>
                <p className="text-xs">{String(selectedHole.notes)}</p>
              </div>
            )}

            <div className="flex justify-end gap-2 pt-3 border-t">
              <button
                onClick={() => {
                  const h = selectedHole;
                  setSelectedHole(null);
                  openEditHole(h);
                }}
                className="px-3 py-1.5 text-xs border border-amber-500/30 text-amber-700 dark:text-amber-400 bg-amber-500/10 rounded font-semibold hover:bg-amber-500/20 inline-flex items-center gap-1"
              >
                <Pencil className="h-3.5 w-3.5" /> Edit Hole Specification
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* EDIT HOLE MODAL */}
      {editingHole && (
        <Modal error={formErrors["edit-hole"]} title={`Edit Drill Hole Specification - ${editingHole.hole_number}`} onClose={() => setEditingHole(null)}>
          <form onSubmit={handleUpdateHole} className="space-y-4 text-xs">
            <div>
              <label className="block text-xs font-medium mb-1">Target Project *</label>
              <SearchableProjectSelect
                projects={projects}
                value={String(editingHole.project_id || '')}
                onChange={(val) => setEditingHole({ ...editingHole, project_id: val })}
                placeholder="Select Project..."
                required
              />
            </div>

            <div>
              <label className="block text-xs font-medium mb-1">Drilling Program (Optional)</label>
              <select
                value={(editingHole as any).program_id || ''}
                onChange={(e) => setEditingHole({ ...editingHole, program_id: e.target.value } as any)}
                className="w-full text-sm border rounded p-2 bg-background"
              >
                <option value="">Select Drilling Program...</option>
                {(Array.isArray(programs) ? programs : [])
                  .filter((p) => !editingHole.project_id || p.project_id === editingHole.project_id)
                  .map((p) => (
                    <option key={p.id} value={p.id}>
                      {String(p.name || p.program_name)} ({String(p.drilling_type || 'RC')}) — Target: {String(p.target_metres ?? 0)}m
                    </option>
                  ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium mb-1">Hole Number / ID *</label>
              <input
                type="text"
                required
                value={editingHole.hole_number || ''}
                onChange={(e) => setEditingHole({ ...editingHole, hole_number: e.target.value })}
                className="w-full text-sm border rounded p-2 bg-background font-mono font-semibold"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium mb-1">Method</label>
                <select
                  value={(editingHole as any).drilling_method || (editingHole as any).drilling_type || 'RC'}
                  onChange={(e) => setEditingHole({ ...editingHole, drilling_method: e.target.value } as any)}
                  className="w-full text-sm border rounded p-2 bg-background"
                >
                  <option value="RC">RC</option>
                  <option value="DIAMOND_CORE">Diamond Core</option>
                  <option value="RAB">RAB</option>
                  <option value="AIR_CORE">Air Core</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium mb-1">Target Depth (m) *</label>
                <input
                  type="number"
                  required
                  min="1"
                  value={editingHole.target_depth_m ?? 250}
                  onChange={(e) => setEditingHole({ ...editingHole, target_depth_m: Number(e.target.value) })}
                  className="w-full text-sm border rounded p-2 bg-background font-semibold"
                />
              </div>

              <div>
                <label className="block text-xs font-medium mb-1">Dip Angle (°)</label>
                <input
                  type="number"
                  step="1"
                  min="-90"
                  max="90"
                  value={editingHole.dip_deg ?? -60}
                  onChange={(e) => setEditingHole({ ...editingHole, dip_deg: Number(e.target.value) })}
                  className="w-full text-sm border rounded p-2 bg-background"
                />
              </div>

              <div>
                <label className="block text-xs font-medium mb-1">Azimuth (°)</label>
                <input
                  type="number"
                  step="1"
                  min="0"
                  max="360"
                  value={editingHole.azimuth_deg ?? 180}
                  onChange={(e) => setEditingHole({ ...editingHole, azimuth_deg: Number(e.target.value) })}
                  className="w-full text-sm border rounded p-2 bg-background"
                />
              </div>

              <div>
                <label className="block text-xs font-medium mb-1">Final Depth (m)</label>
                <input
                  type="number"
                  step="0.1"
                  value={editingHole.final_depth_m ?? 0}
                  onChange={(e) => setEditingHole({ ...editingHole, final_depth_m: Number(e.target.value) })}
                  className="w-full text-sm border rounded p-2 bg-background font-semibold"
                />
              </div>

              <div>
                <label className="block text-xs font-medium mb-1">Status</label>
                <select
                  value={editingHole.status || 'PLANNED'}
                  onChange={(e) => setEditingHole({ ...editingHole, status: e.target.value as any })}
                  className="w-full text-sm border rounded p-2 bg-background font-semibold"
                >
                  <option value="PLANNED">PLANNED</option>
                  <option value="IN_PROGRESS">IN_PROGRESS</option>
                  <option value="COMPLETED">COMPLETED</option>
                  <option value="ABANDONED">ABANDONED</option>
                </select>
              </div>
            </div>

            {/* Collar Coordinates Optional Section */}
            <div className="p-3 border rounded-lg bg-muted/20 space-y-2">
              <span className="font-semibold block text-xs flex items-center gap-1">
                <Compass className="h-3.5 w-3.5 text-primary" /> Collar Coordinates (Optional Georeference)
              </span>
              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="block text-[10px] text-muted-foreground font-medium mb-0.5">Easting (X)</label>
                  <input
                    type="text"
                    placeholder="e.g. 524100.5"
                    value={editHoleCoords.collar_easting}
                    onChange={(e) => setEditHoleCoords({ ...editHoleCoords, collar_easting: e.target.value })}
                    className="w-full text-xs border rounded p-1.5 bg-background font-mono"
                  />
                </div>
                <div>
                  <label className="block text-[10px] text-muted-foreground font-medium mb-0.5">Northing (Y)</label>
                  <input
                    type="text"
                    placeholder="e.g. 1084200.2"
                    value={editHoleCoords.collar_northing}
                    onChange={(e) => setEditHoleCoords({ ...editHoleCoords, collar_northing: e.target.value })}
                    className="w-full text-xs border rounded p-1.5 bg-background font-mono"
                  />
                </div>
                <div>
                  <label className="block text-[10px] text-muted-foreground font-medium mb-0.5">Elevation (Z)</label>
                  <input
                    type="text"
                    placeholder="e.g. 350.0m"
                    value={editHoleCoords.collar_elevation}
                    onChange={(e) => setEditHoleCoords({ ...editHoleCoords, collar_elevation: e.target.value })}
                    className="w-full text-xs border rounded p-1.5 bg-background font-mono"
                  />
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t">
              <button
                type="button"
                onClick={() => setEditingHole(null)}
                className="px-4 py-2 text-sm border rounded hover:bg-muted"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-2 text-sm bg-primary text-primary-foreground rounded font-medium hover:bg-primary/90"
              >
                Save & Update Drill Hole Specification
              </button>
            </div>
          </form>
        </Modal>
      )}
      {/* 360° DAILY OPERATIONAL REPORT MODAL */}
      {show360Modal && (
        <Modal title="⚡ 360° Daily Operational Report Hub" onClose={() => setShow360Modal(false)}>
          <div className="space-y-4 text-xs">
            {/* 360 Operational Tabs Header */}
            <div className="flex border-b space-x-1.5 overflow-x-auto pb-1">
              <button
                type="button"
                onClick={() => setTab360('SHIFT')}
                className={`px-3 py-2 text-xs font-bold rounded-t-md flex items-center gap-1.5 whitespace-nowrap transition ${
                  tab360 === 'SHIFT'
                    ? 'bg-primary text-primary-foreground border-t-2 border-primary shadow-sm'
                    : 'bg-muted/40 text-muted-foreground hover:bg-muted hover:text-foreground'
                }`}
              >
                📋 1. Shift Production
              </button>
              <button
                type="button"
                onClick={() => setTab360('DEFECT')}
                className={`px-3 py-2 text-xs font-bold rounded-t-md flex items-center gap-1.5 whitespace-nowrap transition ${
                  tab360 === 'DEFECT'
                    ? 'bg-primary text-primary-foreground border-t-2 border-primary shadow-sm'
                    : 'bg-muted/40 text-muted-foreground hover:bg-muted hover:text-foreground'
                }`}
              >
                🛠️ 2. Breakdowns
              </button>
              <button
                type="button"
                onClick={() => setTab360('FUEL')}
                className={`px-3 py-2 text-xs font-bold rounded-t-md flex items-center gap-1.5 whitespace-nowrap transition ${
                  tab360 === 'FUEL'
                    ? 'bg-primary text-primary-foreground border-t-2 border-primary shadow-sm'
                    : 'bg-muted/40 text-muted-foreground hover:bg-muted hover:text-foreground'
                }`}
              >
                ⛽ 3. Fuel Logs
              </button>
              <button
                type="button"
                onClick={() => setTab360('HSE')}
                className={`px-3 py-2 text-xs font-bold rounded-t-md flex items-center gap-1.5 whitespace-nowrap transition ${
                  tab360 === 'HSE'
                    ? 'bg-primary text-primary-foreground border-t-2 border-primary shadow-sm'
                    : 'bg-muted/40 text-muted-foreground hover:bg-muted hover:text-foreground'
                }`}
              >
                ⚠️ 4. HSE Incidents
              </button>
              <button
                type="button"
                onClick={() => setTab360('STORE')}
                className={`px-3 py-2 text-xs font-bold rounded-t-md flex items-center gap-1.5 whitespace-nowrap transition ${
                  tab360 === 'STORE'
                    ? 'bg-primary text-primary-foreground border-t-2 border-primary shadow-sm'
                    : 'bg-muted/40 text-muted-foreground hover:bg-muted hover:text-foreground'
                }`}
              >
                📦 5. Store Issues
              </button>
            </div>

            {/* TAB 1: SHIFT PRODUCTION REPORT */}
            {tab360 === 'SHIFT' && (
              <form onSubmit={async (e) => { await handleCreateShift(e); setShow360Modal(false); }} className="space-y-4">
                <div className="p-2.5 bg-amber-500/10 border border-amber-500/20 rounded-lg text-xs text-amber-900 dark:text-amber-300 flex items-center justify-between">
                  <span>Log shift metres drilled, core recovery percentage, worked hole intervals, and hours.</span>
                  <span className="font-bold font-mono text-[10px]">TAB 1 OF 5</span>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-medium mb-1">Rig / Asset *</label>
                    <SearchableSelect
                      options={rigOptions}
                      value={newShift.rig_id}
                      onChange={(val) => setNewShift({ ...newShift, rig_id: val })}
                      placeholder="Search Rig / Asset by name, code, make..."
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium mb-1">Target Project *</label>
                    <SearchableProjectSelect
                      projects={projects}
                      value={newShift.project_id}
                      onChange={(val) => setNewShift({ ...newShift, project_id: val })}
                      placeholder="Select Project..."
                      required
                    />
                  </div>

                  <div className="col-span-2">
                    <label className="block text-xs font-medium mb-1">Drilling Program (Optional)</label>
                    <select
                      value={newShift.program_id}
                      onChange={(e) => setNewShift({ ...newShift, program_id: e.target.value })}
                      className="w-full text-sm border rounded p-2 bg-background"
                    >
                      <option value="">Select Drilling Program...</option>
                      {getSortedPrograms(newShift.project_id).map((p) => {
                        const isMatch = newShift.project_id && p.project_id === newShift.project_id;
                        return (
                          <option key={p.id} value={p.id}>
                            {isMatch ? '⭐ ' : ''}{String(p.name || p.program_name)} ({String(p.drilling_type || 'RC')}) — Target: {String(p.target_metres ?? 0)}m
                          </option>
                        );
                      })}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-medium mb-1">Shift Date</label>
                    <input
                      type="date"
                      required
                      value={newShift.date || newShift.shift_date}
                      onChange={(e) => setNewShift({ ...newShift, date: e.target.value, shift_date: e.target.value })}
                      className="w-full text-sm border rounded p-2 bg-background"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium mb-1">Shift Type</label>
                    <select
                      value={newShift.shift_type}
                      onChange={(e) => setNewShift({ ...newShift, shift_type: e.target.value })}
                      className="w-full text-sm border rounded p-2 bg-background"
                    >
                      <option value="DAY">DAY</option>
                      <option value="NIGHT">NIGHT</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-medium mb-1">Metres Drilled</label>
                    <input
                      type="number"
                      step="0.1"
                      min="0"
                      required
                      value={newShift.total_metres_drilled}
                      onChange={(e) => setNewShift({ ...newShift, total_metres_drilled: Math.max(0, Number(e.target.value)) })}
                      className="w-full text-sm border rounded p-2 bg-background"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium mb-1">Core Recovery %</label>
                    <input
                      type="number"
                      step="0.1"
                      min="0"
                      max="100"
                      required
                      value={newShift.core_recovery_pct}
                      onChange={(e) => setNewShift({ ...newShift, core_recovery_pct: Math.max(0, Number(e.target.value)) })}
                      className="w-full text-sm border rounded p-2 bg-background"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium mb-1">Productive Hours</label>
                    <input
                      type="number"
                      step="0.5"
                      min="0"
                      required
                      value={newShift.productive_hours}
                      onChange={(e) => setNewShift({ ...newShift, productive_hours: Math.max(0, Number(e.target.value)) })}
                      className="w-full text-sm border rounded p-2 bg-background"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium mb-1">Standby Hours</label>
                    <input
                      type="number"
                      step="0.5"
                      min="0"
                      required
                      value={newShift.standby_hours}
                      onChange={(e) => setNewShift({ ...newShift, standby_hours: Math.max(0, Number(e.target.value)) })}
                      className="w-full text-sm border rounded p-2 bg-background"
                    />
                  </div>

                  <div className="col-span-2 p-3 border rounded-lg bg-muted/20 space-y-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <label className="block text-xs font-semibold text-foreground">
                          Target Drill Hole Intervals (Multi-Hole Support)
                        </label>
                        <p className="text-[11px] text-muted-foreground">
                          Specify depth intervals worked for each hole during this shift.
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          const lastTo = shiftIntervals.length > 0 ? Number(shiftIntervals[shiftIntervals.length - 1].to_depth_m) : 0;
                          setShiftIntervals((prev) => [
                            ...prev,
                            { drill_hole_id: '', from_depth_m: lastTo, to_depth_m: lastTo + 60, core_recovery_pct: 95.0, drilling_method: 'RC' },
                          ]);
                        }}
                        className="text-xs text-emerald-700 dark:text-emerald-400 font-semibold hover:underline inline-flex items-center gap-1 bg-emerald-500/10 px-2 py-1 rounded"
                      >
                        <Plus className="h-3 w-3" /> Add Hole Interval
                      </button>
                    </div>

                    <div className="space-y-2">
                      {shiftIntervals.map((interval, idx) => (
                        <div key={idx} className="p-2 border rounded-md bg-background grid grid-cols-12 gap-2 text-xs">
                          <div className="col-span-12 sm:col-span-4">
                            <label className="block text-[10px] text-muted-foreground font-medium mb-0.5">Drill Hole</label>
                            <select
                              value={interval.drill_hole_id}
                              onChange={(e) => {
                                const val = e.target.value;
                                setShiftIntervals((prev) => {
                                  const next = [...prev];
                                  next[idx] = { ...next[idx], drill_hole_id: val };
                                  return next;
                                });
                              }}
                              className="w-full text-xs border rounded p-1 bg-background"
                            >
                              <option value="">Select Hole...</option>
                              {(Array.isArray(holes) ? holes : [])
                                .filter((h) => !newShift.project_id || h.project_id === newShift.project_id)
                                .map((h) => (
                                  <option key={h.id} value={h.id}>
                                    {h.hole_number} ({String(h.drilling_method || 'RC')})
                                  </option>
                                ))}
                            </select>
                          </div>
                          <div className="col-span-6 sm:col-span-2">
                            <label className="block text-[10px] text-muted-foreground font-medium mb-0.5">From (m)</label>
                            <input
                              type="number"
                              step="0.1"
                              min="0"
                              value={interval.from_depth_m}
                              onChange={(e) => {
                                const val = Math.max(0, Number(e.target.value));
                                setShiftIntervals((prev) => {
                                  const next = [...prev];
                                  next[idx] = { ...next[idx], from_depth_m: val };
                                  return next;
                                });
                              }}
                              className="w-full text-xs border rounded p-1 bg-background"
                            />
                          </div>
                          <div className="col-span-6 sm:col-span-2">
                            <label className="block text-[10px] text-muted-foreground font-medium mb-0.5">To (m)</label>
                            <input
                              type="number"
                              step="0.1"
                              min="0"
                              value={interval.to_depth_m}
                              onChange={(e) => {
                                const val = Math.max(0, Number(e.target.value));
                                setShiftIntervals((prev) => {
                                  const next = [...prev];
                                  next[idx] = { ...next[idx], to_depth_m: val };
                                  return next;
                                });
                              }}
                              className="w-full text-xs border rounded p-1 bg-background"
                            />
                          </div>
                          <div className="col-span-6 sm:col-span-2">
                            <label className="block text-[10px] text-muted-foreground font-medium mb-0.5">Core Rec %</label>
                            <input
                              type="number"
                              step="0.1"
                              min="0"
                              max="100"
                              value={interval.core_recovery_pct}
                              onChange={(e) => {
                                const val = Math.max(0, Math.min(100, Number(e.target.value)));
                                setShiftIntervals((prev) => {
                                  const next = [...prev];
                                  next[idx] = { ...next[idx], core_recovery_pct: val };
                                  return next;
                                });
                              }}
                              className="w-full text-xs border rounded p-1 bg-background"
                            />
                          </div>
                          <div className="col-span-6 sm:col-span-2">
                            <label className="block text-[10px] text-muted-foreground font-medium mb-0.5">Method</label>
                            <select
                              value={interval.drilling_method || 'RC'}
                              onChange={(e) => {
                                const val = e.target.value;
                                setShiftIntervals((prev) => {
                                  const next = [...prev];
                                  next[idx] = { ...next[idx], drilling_method: val };
                                  return next;
                                });
                              }}
                              className="w-full text-xs border rounded p-1 bg-background"
                            >
                              <option value="RC">RC</option>
                              <option value="DIAMOND_CORE">Diamond Core</option>
                              <option value="RAB">RAB</option>
                              <option value="AIR_CORE">Air Core</option>
                            </select>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="col-span-2 space-y-1">
                    <label className="block text-xs font-semibold">Comments / Operational Remarks</label>
                    <textarea
                      rows={2}
                      placeholder="Enter shift notes, operational remarks, weather conditions, or drilling delays..."
                      value={newShift.notes || ''}
                      onChange={(e) => setNewShift({ ...newShift, notes: e.target.value })}
                      className="w-full text-sm border rounded p-2 bg-background resize-y"
                    />
                  </div>
                </div>

                <div className="flex justify-end gap-2 pt-2 border-t">
                  <button
                    type="button"
                    onClick={() => setShow360Modal(false)}
                    className="px-4 py-2 text-sm border rounded hover:bg-muted"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 text-sm bg-primary text-primary-foreground rounded font-medium hover:bg-primary/90"
                  >
                    Submit Shift Production Report
                  </button>
                </div>
              </form>
            )}

            {/* TAB 2: BREAKDOWNS & MAINTENANCE */}
            {tab360 === 'DEFECT' && (
              <form onSubmit={handle360DefectSubmit} className="space-y-4">
                <div className="p-2.5 bg-rose-500/10 border border-rose-500/20 rounded-lg text-xs text-rose-900 dark:text-rose-300 flex items-center justify-between">
                  <span>Report asset breakdowns, mechanical defects, component failures, and downtime hours.</span>
                  <span className="font-bold font-mono text-[10px]">TAB 2 OF 5</span>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-medium mb-1">Rig / Asset Affected *</label>
                    <SearchableSelect
                      options={rigOptions}
                      value={form360Defect.rig_id}
                      onChange={(val) => setForm360Defect({ ...form360Defect, rig_id: val })}
                      placeholder="Search Rig / Asset affected by name, code, make..."
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium mb-1">Severity Level</label>
                    <select
                      value={form360Defect.severity}
                      onChange={(e) => setForm360Defect({ ...form360Defect, severity: e.target.value })}
                      className="w-full text-sm border rounded p-2 bg-background font-semibold"
                    >
                      <option value="LOW">LOW — Minor issue</option>
                      <option value="MEDIUM">MEDIUM — Moderate wear / fault</option>
                      <option value="HIGH">HIGH — Major breakdown</option>
                      <option value="CRITICAL">CRITICAL — Emergency rig stoppage</option>
                    </select>
                  </div>

                  <div className="col-span-2">
                    <label className="block text-xs font-medium mb-1">Breakdown / Defect Title *</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Hydraulic hose rupture on feed motor"
                      value={form360Defect.title}
                      onChange={(e) => setForm360Defect({ ...form360Defect, title: e.target.value })}
                      className="w-full text-sm border rounded p-2 bg-background"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium mb-1">Downtime Hours</label>
                    <input
                      type="number"
                      step="0.5"
                      min="0"
                      required
                      value={form360Defect.downtime_hours}
                      onChange={(e) => setForm360Defect({ ...form360Defect, downtime_hours: Math.max(0, Number(e.target.value)) })}
                      className="w-full text-sm border rounded p-2 bg-background"
                    />
                  </div>

                  <div className="col-span-2">
                    <label className="block text-xs font-medium mb-1">Detailed Defect Description</label>
                    <textarea
                      rows={3}
                      placeholder="Describe the failure, root cause, symptoms, parts required, and repair actions taken..."
                      value={form360Defect.description}
                      onChange={(e) => setForm360Defect({ ...form360Defect, description: e.target.value })}
                      className="w-full text-sm border rounded p-2 bg-background resize-y"
                    />
                  </div>

                  <div className="col-span-2 space-y-1.5">
                    <label className="block text-xs font-semibold">Attach Breakdown Photo / Field Repair Report / Work Order</label>
                    <div className="border-2 border-dashed rounded-lg p-3 text-center bg-muted/10 hover:bg-muted/20 transition cursor-pointer relative">
                      <input
                        type="file"
                        accept=".pdf,.png,.jpg,.jpeg,.csv,.xlsx,.doc,.docx"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) setDefectFile(file);
                        }}
                        className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                      />
                      {defectFile ? (
                        <div className="flex items-center justify-between bg-card p-2 rounded border text-xs">
                          <div className="flex items-center gap-2 font-medium truncate">
                            <FileText className="h-4 w-4 text-primary shrink-0" />
                            <span className="truncate">{defectFile.name}</span>
                            <span className="text-muted-foreground text-[10px]">({(defectFile.size / 1024).toFixed(1)} KB)</span>
                          </div>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setDefectFile(null);
                            }}
                            className="text-muted-foreground hover:text-destructive p-1"
                          >
                            <X className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      ) : (
                        <div className="flex flex-col items-center gap-1 text-xs text-muted-foreground py-1">
                          <Upload className="h-4 w-4 text-rose-500" />
                          <span>Click or drag file to attach breakdown photo, repair report, or work order</span>
                          <span className="text-[10px] text-muted-foreground/70">PDF, PNG, JPG, CSV, DOCX (Max 10MB)</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex justify-end gap-2 pt-2 border-t">
                  <button
                    type="button"
                    onClick={() => setShow360Modal(false)}
                    className="px-4 py-2 text-sm border rounded hover:bg-muted"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 text-sm bg-rose-600 text-white rounded font-medium hover:bg-rose-700"
                  >
                    Log Defect & Downtime
                  </button>
                </div>
              </form>
            )}

            {/* TAB 3: FUEL LOG & CONSUMPTION */}
            {tab360 === 'FUEL' && (
              <form onSubmit={handle360FuelSubmit} className="space-y-4">
                <div className="p-2.5 bg-blue-500/10 border border-blue-500/20 rounded-lg text-xs text-blue-900 dark:text-blue-300 flex items-center justify-between">
                  <span>Log main tanker fuel entry receipts OR record rig/asset daily diesel fuel consumption.</span>
                  <div className="flex items-center gap-1 font-mono text-[10px]">
                    <button
                      type="button"
                      onClick={() => setFuelMode('ENTRY')}
                      className={`px-2 py-0.5 rounded font-bold ${fuelMode === 'ENTRY' ? 'bg-blue-600 text-white' : 'bg-background text-foreground'}`}
                    >
                      Receipt Entry
                    </button>
                    <button
                      type="button"
                      onClick={() => setFuelMode('REDUCTION')}
                      className={`px-2 py-0.5 rounded font-bold ${fuelMode === 'REDUCTION' ? 'bg-blue-600 text-white' : 'bg-background text-foreground'}`}
                    >
                      Consumption
                    </button>
                  </div>
                </div>

                {fuelMode === 'ENTRY' ? (
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-medium mb-1">Asset / Tanker *</label>
                      <SearchableSelect
                        options={rigOptions}
                        value={form360Fuel.asset_id}
                        onChange={(val) => setForm360Fuel({ ...form360Fuel, asset_id: val })}
                        placeholder="Search Asset / Tanker by name, code, make..."
                        required
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-medium mb-1">Date</label>
                      <input
                        type="date"
                        required
                        value={form360Fuel.date}
                        onChange={(e) => setForm360Fuel({ ...form360Fuel, date: e.target.value })}
                        className="w-full text-sm border rounded p-2 bg-background"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-medium mb-1">Fuel Quantity (Litres) *</label>
                      <input
                        type="number"
                        min="0"
                        step="1"
                        required
                        value={form360Fuel.fuel_quantity}
                        onChange={(e) => setForm360Fuel({ ...form360Fuel, fuel_quantity: Math.max(0, Number(e.target.value)) })}
                        className="w-full text-sm border rounded p-2 bg-background"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-medium mb-1">Unit Cost ($ / Litre)</label>
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        value={form360Fuel.unit_cost}
                        onChange={(e) => setForm360Fuel({ ...form360Fuel, unit_cost: Math.max(0, Number(e.target.value)) })}
                        className="w-full text-sm border rounded p-2 bg-background"
                      />
                    </div>

                    <div className="col-span-2">
                      <label className="block text-xs font-medium mb-1">Vendor / Fuel Supplier</label>
                      <input
                        type="text"
                        placeholder="e.g. TotalEnergies Fuel Delivery Tanker"
                        value={form360Fuel.vendor}
                        onChange={(e) => setForm360Fuel({ ...form360Fuel, vendor: e.target.value })}
                        className="w-full text-sm border rounded p-2 bg-background"
                      />
                    </div>
                  </div>
                ) : (
                  <div className="grid grid-cols-2 gap-4">
                    <div className="col-span-2">
                      <label className="block text-xs font-medium mb-1">Rig / Equipment *</label>
                      <SearchableSelect
                        options={rigOptions}
                        value={form360FuelReduction.asset_id}
                        onChange={(val) => setForm360FuelReduction({ ...form360FuelReduction, asset_id: val, fuel_log_id: '' })}
                        placeholder="Search Rig / Equipment by name, code, make..."
                        required
                      />
                    </div>

                    <div className="col-span-2">
                      <label className="block text-xs font-medium mb-1">Select Fuel Receipt Entry / Delivery Batch *</label>
                      <select
                        value={form360FuelReduction.fuel_log_id}
                        onChange={(e) => {
                          const logId = e.target.value;
                          setForm360FuelReduction({ ...form360FuelReduction, fuel_log_id: logId });
                        }}
                        className="w-full text-sm border rounded p-2 bg-background font-mono"
                      >
                        <option value="">-- Choose Fuel Receipt / Tanker Refill Log --</option>
                        {projectFuelReceipts.map((r: any) => {
                          const rDate = r.date || (r.created_at ? String(r.created_at).slice(0, 10) : 'N/A');
                          const rVendor = r.supplier || r.vendor || 'Fuel Delivery';
                          const rLitres = r.quantity_litres ?? r.fuel_quantity ?? 0;
                          return (
                            <option key={r.id} value={r.id}>
                              {rDate} - {rVendor} - {rLitres} Litres (Log #{String(r.id).slice(0, 8)})
                            </option>
                          );
                        })}
                      </select>
                      {projectFuelReceipts.length === 0 && (
                        <p className="text-[11px] text-amber-600 mt-1">
                          No main fuel receipts logged for this equipment yet. You can log a receipt entry under &quot;Receipt Entry&quot; above.
                        </p>
                      )}
                    </div>

                    {selectedReceiptDetails && (
                      <div className="col-span-2 p-3 bg-muted/30 border rounded-lg flex items-center justify-between text-xs">
                        <div>
                          <span className="text-muted-foreground block text-[10px] uppercase font-semibold">Original Refill Batch</span>
                          <span className="font-mono font-bold text-sm">{selectedReceiptDetails.originalLitres} Litres</span>
                        </div>
                        <div className="text-right">
                          <span className="text-muted-foreground block text-[10px] uppercase font-semibold">Last Recorded Fuel Level (Base)</span>
                          <span className="font-mono font-bold text-sm text-blue-600">{selectedReceiptDetails.baseLitres} Litres</span>
                        </div>
                      </div>
                    )}

                    <div>
                      <label className="block text-xs font-medium mb-1">Remaining Fuel Level in Tank (Litres) *</label>
                      <input
                        type="number"
                        min="0"
                        step="1"
                        required
                        value={form360FuelReduction.remaining_litres || ''}
                        onChange={(e) => {
                          const rem = Math.max(0, Number(e.target.value));
                          const base = selectedReceiptDetails?.baseLitres ?? rem;
                          const consumed = Math.max(0, base - rem);
                          setForm360FuelReduction({
                            ...form360FuelReduction,
                            remaining_litres: rem,
                            reduction_litres: consumed,
                          });
                        }}
                        placeholder="e.g. 250"
                        className="w-full text-sm border rounded p-2 bg-background font-mono"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-medium mb-1">Fuel Consumed (Litres) *</label>
                      <input
                        type="number"
                        min="0"
                        step="1"
                        required
                        value={form360FuelReduction.reduction_litres || ''}
                        onChange={(e) =>
                          setForm360FuelReduction({
                            ...form360FuelReduction,
                            reduction_litres: Math.max(0, Number(e.target.value)),
                          })
                        }
                        placeholder="Auto-calculated from remaining"
                        className="w-full text-sm border rounded p-2 bg-background font-mono font-bold text-emerald-600"
                      />
                    </div>

                    <div className="col-span-2">
                      <label className="block text-xs font-medium mb-1">Hour Meter Reading (Hours)</label>
                      <input
                        type="number"
                        min="0"
                        step="0.1"
                        value={form360FuelReduction.meter_reading || ''}
                        onChange={(e) => setForm360FuelReduction({ ...form360FuelReduction, meter_reading: Math.max(0, Number(e.target.value)) })}
                        placeholder="e.g. 1450.5"
                        className="w-full text-sm border rounded p-2 bg-background font-mono"
                      />
                    </div>

                    <div className="col-span-2">
                      <label className="block text-xs font-medium mb-1">Notes / Remarks</label>
                      <textarea
                        rows={2}
                        placeholder="Additional details regarding fuel burn rate or rig engine hours..."
                        value={form360FuelReduction.notes}
                        onChange={(e) => setForm360FuelReduction({ ...form360FuelReduction, notes: e.target.value })}
                        className="w-full text-sm border rounded p-2 bg-background resize-y"
                      />
                    </div>
                  </div>
                )}

                <div className="space-y-1.5">
                  <label className="block text-xs font-semibold">Attach Fuel Receipt / Tanker Delivery Docket / Meter Sheet</label>
                  <div className="border-2 border-dashed rounded-lg p-3 text-center bg-muted/10 hover:bg-muted/20 transition cursor-pointer relative">
                    <input
                      type="file"
                      accept=".pdf,.png,.jpg,.jpeg,.csv,.xlsx,.doc,.docx"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) setFuelFile(file);
                      }}
                      className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                    />
                    {fuelFile ? (
                      <div className="flex items-center justify-between bg-card p-2 rounded border text-xs">
                        <div className="flex items-center gap-2 font-medium truncate">
                          <FileText className="h-4 w-4 text-primary shrink-0" />
                          <span className="truncate">{fuelFile.name}</span>
                          <span className="text-muted-foreground text-[10px]">({(fuelFile.size / 1024).toFixed(1)} KB)</span>
                        </div>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setFuelFile(null);
                          }}
                          className="text-muted-foreground hover:text-destructive p-1"
                        >
                          <X className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    ) : (
                      <div className="flex flex-col items-center gap-1 text-xs text-muted-foreground py-1">
                        <Upload className="h-4 w-4 text-blue-500" />
                        <span>Click or drag file to attach fuel receipt voucher, delivery docket, or meter sheet</span>
                        <span className="text-[10px] text-muted-foreground/70">PDF, PNG, JPG, CSV, DOCX (Max 10MB)</span>
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex justify-end gap-2 pt-2 border-t">
                  <button
                    type="button"
                    onClick={() => setShow360Modal(false)}
                    className="px-4 py-2 text-sm border rounded hover:bg-muted"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 text-sm bg-blue-600 text-white rounded font-medium hover:bg-blue-700"
                  >
                    Save Fuel Record
                  </button>
                </div>
              </form>
            )}

            {/* TAB 4: HSE INCIDENTS */}
            {tab360 === 'HSE' && (
              <form onSubmit={handle360HseSubmit} className="space-y-4">
                <div className="p-2.5 bg-emerald-500/10 border border-emerald-500/20 rounded-lg text-xs text-emerald-900 dark:text-emerald-300 flex items-center justify-between">
                  <span>Record safety observations, near-misses, first aid, or environmental incidents.</span>
                  <span className="font-bold font-mono text-[10px]">TAB 4 OF 5</span>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-medium mb-1">Target Project</label>
                    <SearchableProjectSelect
                      projects={projects}
                      value={form360Hse.project_id || newShift.project_id}
                      onChange={(val) => setForm360Hse({ ...form360Hse, project_id: val })}
                      placeholder="Select Project..."
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium mb-1">Incident Type *</label>
                    <select
                      value={form360Hse.incident_type}
                      onChange={(e) => setForm360Hse({ ...form360Hse, incident_type: e.target.value })}
                      className="w-full text-sm border rounded p-2 bg-background font-semibold"
                    >
                      <option value="NEAR_MISS">NEAR MISS — Safety hazard observed</option>
                      <option value="FIRST_AID">FIRST AID — Minor injury handled on site</option>
                      <option value="MEDICAL_TREATMENT">MEDICAL TREATMENT — Clinic visit required</option>
                      <option value="LOST_TIME">LOST TIME INCIDENT (LTI)</option>
                      <option value="PROPERTY_DAMAGE">PROPERTY DAMAGE — Equipment impact</option>
                      <option value="ENVIRONMENTAL">ENVIRONMENTAL — Oil / chemical spill</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-medium mb-1">Incident Title *</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Hydraulic fluid splash near drill mast"
                      value={form360Hse.title}
                      onChange={(e) => setForm360Hse({ ...form360Hse, title: e.target.value })}
                      className="w-full text-sm border rounded p-2 bg-background"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium mb-1">Incident Date</label>
                    <input
                      type="date"
                      required
                      value={form360Hse.incident_date}
                      onChange={(e) => setForm360Hse({ ...form360Hse, incident_date: e.target.value })}
                      className="w-full text-sm border rounded p-2 bg-background"
                    />
                  </div>

                  <div className="col-span-2">
                    <label className="block text-xs font-medium mb-1">Location / Site Details</label>
                    <input
                      type="text"
                      placeholder="e.g. Drill Pad #4, North Block Exploration Zone"
                      value={form360Hse.location}
                      onChange={(e) => setForm360Hse({ ...form360Hse, location: e.target.value })}
                      className="w-full text-sm border rounded p-2 bg-background"
                    />
                  </div>

                  <div className="col-span-2">
                    <label className="block text-xs font-medium mb-1">Detailed Narrative & Immediate Corrective Actions</label>
                    <textarea
                      rows={3}
                      placeholder="Describe what occurred, immediate corrective actions taken, and recommended preventative controls..."
                      value={form360Hse.description}
                      onChange={(e) => setForm360Hse({ ...form360Hse, description: e.target.value })}
                      className="w-full text-sm border rounded p-2 bg-background resize-y"
                    />
                  </div>

                  <div className="col-span-2 space-y-1.5">
                    <label className="block text-xs font-semibold">Attach Incident Photo / Witness Statement / Medical Report</label>
                    <div className="border-2 border-dashed rounded-lg p-3 text-center bg-muted/10 hover:bg-muted/20 transition cursor-pointer relative">
                      <input
                        type="file"
                        accept=".pdf,.png,.jpg,.jpeg,.csv,.xlsx,.doc,.docx"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) setHseFile(file);
                        }}
                        className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                      />
                      {hseFile ? (
                        <div className="flex items-center justify-between bg-card p-2 rounded border text-xs">
                          <div className="flex items-center gap-2 font-medium truncate">
                            <FileText className="h-4 w-4 text-primary shrink-0" />
                            <span className="truncate">{hseFile.name}</span>
                            <span className="text-muted-foreground text-[10px]">({(hseFile.size / 1024).toFixed(1)} KB)</span>
                          </div>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setHseFile(null);
                            }}
                            className="text-muted-foreground hover:text-destructive p-1"
                          >
                            <X className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      ) : (
                        <div className="flex flex-col items-center gap-1 text-xs text-muted-foreground py-1">
                          <Upload className="h-4 w-4 text-emerald-500" />
                          <span>Click or drag file to attach safety observation photo, witness statement, or report</span>
                          <span className="text-[10px] text-muted-foreground/70">PDF, PNG, JPG, CSV, DOCX (Max 10MB)</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex justify-end gap-2 pt-2 border-t">
                  <button
                    type="button"
                    onClick={() => setShow360Modal(false)}
                    className="px-4 py-2 text-sm border rounded hover:bg-muted"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 text-sm bg-emerald-600 text-white rounded font-medium hover:bg-emerald-700"
                  >
                    Report HSE Incident
                  </button>
                </div>
              </form>
            )}

            {/* TAB 5: STORE CONSUMPTIONS */}
            {tab360 === 'STORE' && (
              <form onSubmit={handle360StoreSubmit} className="space-y-4">
                <div className="p-2.5 bg-purple-500/10 border border-purple-500/20 rounded-lg text-xs text-purple-900 dark:text-purple-300 flex items-center justify-between">
                  <span>Log inventory & store consumables issued for drilling operations (e.g. drill bits, muds, polymers).</span>
                  <span className="font-bold font-mono text-[10px]">TAB 5 OF 5</span>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-medium mb-1">Target Project *</label>
                    <SearchableProjectSelect
                      projects={projects}
                      value={form360Store.project_id || newShift.project_id}
                      onChange={(val) => setForm360Store({ ...form360Store, project_id: val })}
                      placeholder="Select Project..."
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium mb-1">Store / Warehouse Location *</label>
                    <select
                      required
                      value={form360Store.store_id}
                      onChange={(e) => setForm360Store({ ...form360Store, store_id: e.target.value })}
                      className="w-full text-sm border rounded p-2 bg-background font-medium"
                    >
                      <option value="">Select Store / Warehouse...</option>
                      {inventoryStores.map((s: any) => (
                        <option key={s.id} value={s.id}>
                          {s.name || s.code || s.location_name} {s.code ? `(${s.code})` : ''}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Multi-Item Consumables Builder */}
                <div className="p-3 border rounded-lg bg-muted/20 space-y-3">
                  <div className="flex items-center justify-between border-b pb-2">
                    <div>
                      <label className="block text-xs font-semibold text-foreground">
                        Consumable Items Issued (Multi-Item Support)
                      </label>
                      <p className="text-[11px] text-muted-foreground">
                        {form360Store.store_id
                          ? `Showing items available in selected store (${storeItemsOptions.length} items loaded)`
                          : 'Select a Store / Warehouse Location above to filter items in that store'}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() =>
                        setStoreItemsList((prev) => [
                          ...prev,
                          { item_id: '', item_name: '', quantity: 1, unit: 'PCS' },
                        ])
                      }
                      className="px-2.5 py-1 text-xs bg-purple-600 text-white rounded font-medium hover:bg-purple-700 flex items-center gap-1"
                    >
                      <Plus className="h-3.5 w-3.5" /> Add Consumable Item
                    </button>
                  </div>

                  <div className="space-y-2.5">
                    {storeItemsList.map((itemRow, idx) => (
                      <div key={idx} className="p-2.5 border rounded-md bg-background space-y-2">
                        <div className="flex items-center justify-between text-xs font-medium text-muted-foreground border-b pb-1">
                          <span>Consumable Item #{idx + 1}</span>
                          {storeItemsList.length > 1 && (
                            <button
                              type="button"
                              onClick={() =>
                                setStoreItemsList((prev) => prev.filter((_, i) => i !== idx))
                              }
                              className="text-destructive hover:underline text-[11px] flex items-center gap-1"
                            >
                              <Trash2 className="h-3 w-3" /> Remove
                            </button>
                          )}
                        </div>

                        <div className="grid grid-cols-12 gap-2 text-xs">
                          <div className="col-span-12 sm:col-span-6">
                            <label className="block text-[10px] text-muted-foreground font-medium mb-0.5">
                              Consumable Item Name / Spec *
                            </label>
                            <SearchableSelect
                              options={storeItemsOptions}
                              value={itemRow.item_id || itemRow.item_name}
                              onChange={(selectedVal, opt) => {
                                setStoreItemsList((prev) => {
                                  const next = [...prev];
                                  if (opt && opt.raw) {
                                    const rawItem = opt.raw;
                                    const detectedUnit = (
                                      rawItem.unit_symbol ||
                                      rawItem.base_unit ||
                                      rawItem.unit ||
                                      'PCS'
                                    ).toUpperCase();
                                    const validUnits = ['PCS', 'BAGS', 'DRUMS', 'METRES', 'KG', 'LITRES'];
                                    const unitValue = validUnits.includes(detectedUnit) ? detectedUnit : 'PCS';

                                    next[idx] = {
                                      ...next[idx],
                                      item_id: rawItem.id || '',
                                      item_name: rawItem.name || selectedVal,
                                      unit: unitValue,
                                    };
                                  } else {
                                    next[idx] = {
                                      ...next[idx],
                                      item_id: '',
                                      item_name: selectedVal,
                                    };
                                  }
                                  return next;
                                });
                              }}
                              placeholder={
                                form360Store.store_id
                                  ? 'Search items in this store by name, SKU...'
                                  : 'Select store first or search all inventory items...'
                              }
                            />
                          </div>

                          <div className="col-span-6 sm:col-span-3">
                            <label className="block text-[10px] text-muted-foreground font-medium mb-0.5">
                              Quantity Issued *
                            </label>
                            <input
                              type="number"
                              min="1"
                              step="1"
                              required
                              value={itemRow.quantity}
                              onChange={(e) => {
                                const val = Math.max(1, Number(e.target.value));
                                setStoreItemsList((prev) => {
                                  const next = [...prev];
                                  next[idx] = { ...next[idx], quantity: val };
                                  return next;
                                });
                              }}
                              className="w-full text-xs border rounded p-1.5 bg-background font-semibold"
                            />
                          </div>

                          <div className="col-span-6 sm:col-span-3">
                            <label className="block text-[10px] text-muted-foreground font-medium mb-0.5">
                              Unit of Measure (Auto-Filled)
                            </label>
                            <select
                              value={itemRow.unit}
                              onChange={(e) => {
                                const val = e.target.value;
                                setStoreItemsList((prev) => {
                                  const next = [...prev];
                                  next[idx] = { ...next[idx], unit: val };
                                  return next;
                                });
                              }}
                              className="w-full text-xs border rounded p-1.5 bg-background font-semibold"
                            >
                              <option value="PCS">PCS — Pieces</option>
                              <option value="BAGS">BAGS — 25kg Bags</option>
                              <option value="DRUMS">DRUMS — 200L Drums</option>
                              <option value="METRES">METRES</option>
                              <option value="KG">KG — Kilograms</option>
                              <option value="LITRES">LITRES</option>
                            </select>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-medium mb-1">Purpose / Drilling Hole Notes</label>
                  <textarea
                    rows={2}
                    placeholder="Specify drill hole ID, rig requirement, or store requisition details..."
                    value={form360Store.notes}
                    onChange={(e) => setForm360Store({ ...form360Store, notes: e.target.value })}
                    className="w-full text-sm border rounded p-2 bg-background resize-y"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="block text-xs font-semibold">
                    Attach Store Requisition / Issue Voucher / Delivery Note
                  </label>
                  <div className="border-2 border-dashed rounded-lg p-3 text-center bg-muted/10 hover:bg-muted/20 transition cursor-pointer relative">
                    <input
                      type="file"
                      accept=".pdf,.png,.jpg,.jpeg,.csv,.xlsx,.doc,.docx"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) setStoreFile(file);
                      }}
                      className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                    />
                    {storeFile ? (
                      <div className="flex items-center justify-between bg-card p-2 rounded border text-xs">
                        <div className="flex items-center gap-2 font-medium truncate">
                          <FileText className="h-4 w-4 text-primary shrink-0" />
                          <span className="truncate">{storeFile.name}</span>
                          <span className="text-muted-foreground text-[10px]">
                            ({(storeFile.size / 1024).toFixed(1)} KB)
                          </span>
                        </div>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setStoreFile(null);
                          }}
                          className="text-muted-foreground hover:text-destructive p-1"
                        >
                          <X className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    ) : (
                      <div className="flex flex-col items-center gap-1 text-xs text-muted-foreground py-1">
                        <Upload className="h-4 w-4 text-purple-500" />
                        <span>Click or drag file to attach store issue voucher, requisition slip, or delivery note</span>
                        <span className="text-[10px] text-muted-foreground/70">
                          PDF, PNG, JPG, CSV, DOCX (Max 10MB)
                        </span>
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex justify-end gap-2 pt-2 border-t">
                  <button
                    type="button"
                    onClick={() => setShow360Modal(false)}
                    className="px-4 py-2 text-sm border rounded hover:bg-muted"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 text-sm bg-purple-600 text-white rounded font-medium hover:bg-purple-700"
                  >
                    Issue Store Consumables ({storeItemsList.filter((i) => i.item_id || i.item_name).length})
                  </button>
                </div>
              </form>
            )}
          </div>
        </Modal>
      )}
    </div>
  );
}
