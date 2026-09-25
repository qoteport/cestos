'use client';

import { useEffect, useMemo, useState } from 'react';
import { apiFetch } from '@/lib/api';
import { Modal } from './DataUI';
import SearchableSelect from './SearchableSelect';

const systems = [
  ['ENGINE', 'Oil level, leaks, filters, belts, mounts'],
  ['COOLING SYSTEM', 'Coolant level, radiator, hoses, fan, temperature'],
  ['FUEL SYSTEM', 'Leaks, filters, water separator, fuel lines'],
  ['HYDRAULIC SYSTEM', 'Oil level, leaks, hoses, fittings, pressure'],
  ['ELECTRICAL', 'Battery, terminals, charging, lights, wiring'],
  ['DRILLING / WORKING SYSTEM', 'Feed, rotation, percussion, controls, cylinders'],
  ['AIR / PNEUMATIC', 'Compressor, receiver, hoses, drains, pressure'],
  ['UNDERCARRIAGE / CHASSIS', 'Fasteners, wear, cracks, pins, bushes'],
  ['SAFETY SYSTEMS', 'Emergency stops, alarms, guards, fire equipment'],
  ['LUBRICATION', 'Grease points, specified lubricant, contamination'],
  ['TYRES / WHEELS / BRAKES', 'Condition, pressure, wheel nuts, braking'],
  ['FINAL FUNCTIONAL TEST', 'Run/test machine and verify abnormal noise/leaks'],
];

const cardStatuses = [
  ['DRAFT', 'Draft'],
  ['IN_PROGRESS', 'In progress'],
  ['PENDING_SIGNOFF', 'Pending sign-off'],
  ['COMPLETED', 'Completed'],
  ['CANCELLED', 'Cancelled'],
];

const intervals = ['Weekly', '250 Hours', '500 Hours', '1000 Hours', 'Monthly', 'Other'];
const nameOf = (row: any) => [row.first_name, row.last_name].filter(Boolean).join(' ') || row.name || row.employee_number || '';
const generatePmNumber = () => `PM-${new Date().toISOString().slice(0, 10).replaceAll('-', '')}-${globalThis.crypto?.randomUUID?.().slice(0, 6).toUpperCase() || Math.random().toString(36).slice(2, 8).toUpperCase()}`;
const signatureStorageKey = 'cestos.pm-job-card.signatures.v1';

function pdfBlob(canvas: HTMLCanvasElement) {
  const bytes = atob(canvas.toDataURL('image/jpeg', 0.94).split(',')[1]);
  const image = new Uint8Array(bytes.length); for (let i = 0; i < bytes.length; i += 1) image[i] = bytes.charCodeAt(i);
  const chunks: Uint8Array[] = []; let length = 0; const enc = new TextEncoder(); const push = (v: Uint8Array) => { chunks.push(v); length += v.length; }; const ascii = (v: string) => enc.encode(v); const offsets = [0];
  push(ascii('%PDF-1.4\n% PM job card\n'));
  const object = (n: number, parts: Uint8Array[]) => { offsets[n] = length; push(ascii(`${n} 0 obj\n`)); parts.forEach(push); push(ascii('\nendobj\n')); };
  object(1, [ascii('<< /Type /Catalog /Pages 2 0 R >>')]); object(2, [ascii('<< /Type /Pages /Kids [3 0 R] /Count 1 >>')]);
  object(3, [ascii('<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595.28 841.89] /Resources << /XObject << /Card 4 0 R >> >> /Contents 5 0 R >>')]);
  object(4, [ascii(`<< /Type /XObject /Subtype /Image /Width ${canvas.width} /Height ${canvas.height} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${image.length} >>\nstream\n`), image, ascii('\nendstream')]);
  const content = 'q\n595.28 0 0 841.89 0 0 cm\n/Card Do\nQ'; object(5, [ascii(`<< /Length ${ascii(content).length} >>\nstream\n${content}\nendstream`)]);
  const start = length; push(ascii(`xref\n0 ${offsets.length}\n0000000000 65535 f \n`)); for (let i = 1; i < offsets.length; i += 1) push(ascii(`${String(offsets[i]).padStart(10, '0')} 00000 n \n`)); push(ascii(`trailer\n<< /Size ${offsets.length} /Root 1 0 R >>\nstartxref\n${start}\n%%EOF`));
  const out = new Uint8Array(length); let at = 0; chunks.forEach((chunk) => { out.set(chunk, at); at += chunk.length; }); return new Blob([out.buffer as ArrayBuffer], { type: 'application/pdf' });
}

async function createPmPdf(data: any) {
  const canvas = document.createElement('canvas'); canvas.width = 1275; canvas.height = 1800; const ctx = canvas.getContext('2d'); if (!ctx) throw new Error('Could not prepare the PM job card PDF.');
  ctx.scale(1.5, 1.5); ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, 850, 1200); const left = 34; const width = 782; let y = 26;
  const text = (value: any) => value == null || value === '' ? '—' : Array.isArray(value) ? value.join(', ') : String(value);
  const section = (title: string) => { ctx.fillStyle = '#184877'; ctx.fillRect(left, y, width, 20); ctx.fillStyle = '#fff'; ctx.font = 'bold 10px Arial'; ctx.textAlign = 'center'; ctx.fillText(title, left + width / 2, y + 14); y += 20; };
  const line = (label: string, value: any, height = 20) => { ctx.fillStyle = '#dbe7f4'; ctx.fillRect(left, y, 190, height); ctx.strokeStyle = '#777'; ctx.strokeRect(left, y, 190, height); ctx.fillStyle = '#111'; ctx.font = 'bold 8px Arial'; ctx.textAlign = 'left'; ctx.fillText(label, left + 4, y + 13); ctx.fillStyle = '#fff'; ctx.fillRect(left + 190, y, width - 190, height); ctx.strokeRect(left + 190, y, width - 190, height); ctx.font = '8px Arial'; const v = text(value); ctx.fillText(v.length > 115 ? `${v.slice(0, 112)}…` : v, left + 194, y + 13); y += height; };
  const box = (label: string, value: any, height = 42) => { line(label, '', 18); ctx.strokeRect(left, y, width, height); ctx.font = '8px Arial'; ctx.fillStyle = '#111'; const words = text(value).split(/\s+/); let current = ''; let top = y + 12; for (const word of words) { const next = current ? `${current} ${word}` : word; if (ctx.measureText(next).width > width - 12) { ctx.fillText(current, left + 5, top); current = word; top += 11; if (top > y + height - 3) break; } else current = next; } if (current && top <= y + height - 3) ctx.fillText(current, left + 5, top); y += height; };
  ctx.fillStyle = '#111'; ctx.font = 'bold 14px Arial'; ctx.textAlign = 'center'; ctx.fillText('MAINTENANCE CONTROL — PREVENTIVE MAINTENANCE JOB CARD', 425, y); y += 22;
  ctx.font = 'italic 8px Arial'; ctx.fillText('Controlled PM record • Inspect → Service → Measure → Verify → Release', 425, y); y += 12;
  section('A. PM CONTROL'); for (const [k, v] of [['PM Job Card No.', data.control.job_card_number], ['Date', data.control.date], ['PM Interval', data.control.pm_interval], ['Status', data.control.status], ['Equipment', data.control.equipment], ['Fleet / Unit ID', data.control.fleet_unit_id], ['Location', data.control.location], ['Hour Meter / KM', data.control.hour_meter_km], ['Technician / Team', data.control.technician_team], ['Work Order No.', data.control.work_order_no], ['Start Time', data.control.start_time], ['Finish Time', data.control.finish_time]]) line(k, v);
  section('B. PM CHECKLIST & MEASUREMENTS');
  const rows = data.items || []; rows.forEach((item: any) => { if (y > 1080) return; line(item.system_component, [item.service_tasks, item.condition, item.condition_reading, item.action_taken, item.parts_text || item.parts_used, item.technician_initial, item.supervisor_check, item.remarks].map(text).filter((v: string) => v !== '—').join(' | '), 30); });
  section('C. SERVICE INTERVAL & PM COMPLETION'); for (const [k, v] of Object.entries(data.service || {})) line(k.replaceAll('_', ' '), v); box('Defects / recommendations', data.service?.defects_recommendations, 36);
  section('D. RELEASE & SIGN-OFF'); line('Machine Status', data.release.machine_status); box('Supervisor comments / inspection focus', data.release.comments, 34);
  for (const role of ['technician', 'supervisor', 'operator']) { const sig = data.signatures[role] || {}; line(`${role} sign-off`, sig.signer_name || (typeof sig === 'string' ? sig : '')); if (sig.image_data && y < 1150) { const image = await new Promise<HTMLImageElement | null>((resolve) => { const img = new Image(); img.onload = () => resolve(img); img.onerror = () => resolve(null); img.src = sig.image_data; }); if (image) { ctx.drawImage(image, left + 195, y - 18, 130, 30); } } }
  return pdfBlob(canvas);
}

export default function PreventiveMaintenanceWizard({
  assets,
  projectId,
  onClose,
  onSaved,
  record,
}: {
  assets: any[];
  projectId: string;
  onClose: () => void;
  onSaved?: () => void;
  record?: any;
}) {
  const [step, setStep] = useState(0);
  const [view, setView] = useState<'ASSISTED' | 'FREE_FLOW'>('ASSISTED');
  const [savedSignatures, setSavedSignatures] = useState<any[]>([]);
  const [savedRecord, setSavedRecord] = useState<any>(null);
  const [saving, setSaving] = useState(false);
  const [assetId, setAssetId] = useState(record?.asset_id || '');
  const [attachment, setAttachment] = useState<File | null>(null);
  const [customEquipment, setCustomEquipment] = useState(record?.pm_control?.equipment && !record?.asset_id ? record.pm_control.equipment : '');
  const [isCustomEquipment, setIsCustomEquipment] = useState(Boolean(record?.pm_control?.equipment && !record?.asset_id));
  const [sites, setSites] = useState<any[]>([]);
  const [employees, setEmployees] = useState<any[]>([]);
  const [inventoryItems, setInventoryItems] = useState<any[]>([]);
  const [workOrders, setWorkOrders] = useState<any[]>([]);
  const [error, setError] = useState('');
  const [customLocation, setCustomLocation] = useState('');
  const [customTechnician, setCustomTechnician] = useState('');
  const [customWorkOrder, setCustomWorkOrder] = useState('');
  const [customInterval, setCustomInterval] = useState('');
  const [showCreateWorkOrder, setShowCreateWorkOrder] = useState(false);
  const [creatingWorkOrder, setCreatingWorkOrder] = useState(false);
  const [workOrderError, setWorkOrderError] = useState('');
  const [woForm, setWoForm] = useState<any>({ title: '', maintenance_type: 'PREVENTIVE', priority: 'NORMAL', cost: 0, scheduled_date: new Date().toISOString().slice(0, 10), estimated_hours: 4, assigned_to_ids: [], description: '' });
  const [woChecklist, setWoChecklist] = useState(['Inspect equipment components and fluid levels', 'Verify safety controls and emergency stops']);
  const [woNewTask, setWoNewTask] = useState('');
  const [woParts, setWoParts] = useState<any[]>([{ item_id: '', quantity: 1, unit: 'PCS' }]);
  const [woFile, setWoFile] = useState<File | null>(null);
  const [control, setControl] = useState<any>({
    ...(record?.pm_control || {}),
    pm_interval: '250 Hours',
    date: new Date().toISOString().slice(0, 10),
    start_time: '',
    finish_time: '',
    hour_meter_km: '',
    technician_team: '',
    technician_employee_id: '',
    location: '',
    site_location_id: '',
    work_order_no: '',
    status: record?.status || 'DRAFT',
    job_card_number: record?.job_card_number || '',
  });
  const [items, setItems] = useState<any[]>(record?.inspection_items?.length ? record.inspection_items : systems.map(([system_component, service_tasks], i) => ({
    sequence: i + 1,
    system_component,
    service_tasks,
    condition: '',
    condition_reading: '',
    action_taken: '',
    parts_used: [],
    technician_initial: '',
    supervisor_check: '',
    remarks: '',
  })));
  const [service, setService] = useState<any>({ pm_level: '', next_pm_due: '', total_labour_hours: '', machine_down_hours: '', pm_result: '', defects_recommendations: '', ...(record?.service_defect_control || {}) });
  const [release, setRelease] = useState<any>({ machine_status: '', ...(record?.machine_release || {}), comments: record?.supervisor_comments || record?.machine_release?.comments || '' });
  const [signatures, setSignatures] = useState<any>(() => Object.fromEntries(['technician', 'supervisor', 'operator'].map((role) => { const value = record?.signatures?.[role]; return [role, typeof value === 'string' ? { signer_name: value } : value || {}]; })));
  const [equipmentList, setEquipmentList] = useState<any[]>(assets || []);

  useEffect(() => { try { const values = JSON.parse(localStorage.getItem(signatureStorageKey) || '[]'); if (Array.isArray(values)) setSavedSignatures(values); } catch {} }, []);

  useEffect(() => {
    let active = true;
    if (assets && assets.length > 0) {
      setEquipmentList(assets);
      return;
    }
    const fetchEquipment = async () => {
      try {
        let list: any[] = [];
        if (projectId) {
          try {
            const fpRes = await apiFetch<any>(`/api/v1/field-portal/equipment?project_id=${encodeURIComponent(projectId)}`);
            list = Array.isArray(fpRes) ? fpRes : fpRes?.items || [];
          } catch {}
        }
        if (list.length === 0) {
          const allRes = await apiFetch<any>('/api/v1/assets?page_size=200');
          list = Array.isArray(allRes) ? allRes : allRes?.items || [];
        }
        if (active && list.length > 0) setEquipmentList(list);
      } catch {}
    };
    void fetchEquipment();
    return () => { active = false; };
  }, [assets, projectId]);

  const selected = equipmentList.find((asset) => String(asset.id) === assetId);

  useEffect(() => {
    setControl((old: any) => old.job_card_number ? old : { ...old, job_card_number: generatePmNumber() });
  }, []);

  useEffect(() => {
    let active = true;
    if (!projectId) return () => { active = false; };
    Promise.all([
      apiFetch<any>(`/api/v1/projects/${projectId}/sites`).catch(() => []),
      apiFetch<any>('/api/v1/employees?page_size=100').catch(() => ({ items: [] })),
      apiFetch<any>('/api/v1/inventory/items?page_size=100').catch(() => ({ items: [] })),
    ]).then(([siteResponse, employeeResponse, inventoryResponse]) => {
      if (!active) return;
      const siteRows = Array.isArray(siteResponse) ? siteResponse : siteResponse?.items || [];
      const employeeRows = Array.isArray(employeeResponse) ? employeeResponse : employeeResponse?.items || [];
      const inventoryRows = Array.isArray(inventoryResponse) ? inventoryResponse : inventoryResponse?.items || [];
      setSites(siteRows);
      setEmployees(employeeRows);
      setInventoryItems(inventoryRows);
      setControl((old: any) => {
        if (old.site_location_id && siteRows.some((site: any) => String(site.id) === String(old.site_location_id))) return old;
        if (record?.site_location_id && siteRows.some((site: any) => String(site.id) === String(record.site_location_id))) return { ...old, site_location_id: record.site_location_id };
        return { ...old, site_location_id: siteRows[0]?.id || '' };
      });
    });
    return () => { active = false; };
  }, [projectId, record?.site_location_id]);

  useEffect(() => {
    let active = true;
    if (!projectId || !assetId) { setWorkOrders([]); return () => { active = false; }; }
    apiFetch<any>(`/api/v1/maintenance/work-orders?project_id=${encodeURIComponent(projectId)}`)
      .then((response) => {
        if (!active) return;
        const rows = Array.isArray(response) ? response : response?.items || [];
        setWorkOrders(rows.filter((row: any) => String(row.asset_id) === assetId));
      })
      .catch(() => { if (active) setWorkOrders([]); });
    return () => { active = false; };
  }, [projectId, assetId]);

  const technicianOptions = useMemo(() => employees.filter((employee) => {
    const department = String(employee.department_name || employee.department?.name || employee.department || '').toLowerCase();
    const title = String(employee.position_name || employee.job_title || '').toLowerCase();
    return department.includes('maint') || department.includes('mech') || title.includes('tech') || title.includes('mech');
  }).map((employee) => ({
    value: String(employee.id),
    label: nameOf(employee),
    sublabel: [employee.employee_number, employee.position_name || employee.job_title].filter(Boolean).join(' · '),
  })), [employees]);

  const updateItem = (index: number, key: string, value: any) => setItems((rows) => rows.map((row, i) => i === index ? { ...row, [key]: value } : row));

  async function save() {
    if (!assetId && (!isCustomEquipment || !customEquipment.trim())) {
      setError('Select project equipment or enter a custom equipment name.');
      setStep(0);
      return;
    }
    if (!String(control.job_card_number || '').trim()) {
      setError('Enter a PM Job Card No. or generate one before saving.');
      setStep(0);
      return;
    }
    setSaving(true);
    setError('');
    try {
      const existing = record || savedRecord;
      const payload = {
          status: control.status || 'DRAFT',
          job_card_number: String(control.job_card_number).trim(),
          asset_id: assetId || (existing ? null : undefined),
          project_id: projectId || existing?.project_id || undefined,
          site_location_id: control.site_location_id || (existing ? null : undefined),
          work_order_id: control.work_order_id || (existing ? null : undefined),
          pm_control: {
            ...control,
            pm_interval: control.pm_interval === 'Other' ? customInterval : control.pm_interval,
            equipment: customEquipment.trim() || selected?.name || selected?.asset_number || '',
            fleet_unit_id: control.fleet_unit_id || selected?.asset_number || selected?.fleet_number || '',
            work_order_no: customWorkOrder || (control.work_order_no === '__CUSTOM__' ? '' : control.work_order_no),
            location: control.location === '__CUSTOM__' ? customLocation : (sites.find((site) => String(site.id) === String(control.site_location_id))?.name || control.location || ''),
          },
          inspection_items: items,
          service_defect_control: service,
          machine_release: release,
          signatures,
          supervisor_comments: release.comments || null,
          technicians: control.technician_team ? [{ employee_id: control.technician_employee_id || null, name: control.technician_team }] : [],
        };
      let created: any;
      if (existing) {
        created = await apiFetch<any>(`/api/v1/pm-job-cards/${existing.id}`, { method: 'PATCH', body: JSON.stringify(payload) });
      } else {
        created = await apiFetch<any>('/api/v1/pm-job-cards', { method: 'POST', body: JSON.stringify(payload) });
        setSavedRecord(created);
        created = await apiFetch<any>(`/api/v1/pm-job-cards/${created.id}`, { method: 'PATCH', body: JSON.stringify({ status: payload.status, pm_control: payload.pm_control, inspection_items: payload.inspection_items, service_defect_control: payload.service_defect_control, machine_release: payload.machine_release, signatures: payload.signatures, supervisor_comments: payload.supervisor_comments, technicians: payload.technicians, work_order_id: payload.work_order_id }) });
      }
      setSavedRecord(created);
      if (attachment) {
        const form = new FormData();
        form.append('file', attachment);
        form.append('title', `PM Job Card ${created.job_card_number}`);
        form.append('category', 'Equipment');
        form.append('source_type', 'pm_job_card');
        form.append('source_id', created.id);
        form.append('visibility', 'PUBLIC');
        await apiFetch('/api/v1/documents', { method: 'POST', body: form });
      }
      if (view === 'FREE_FLOW') {
        const pdf = await createPmPdf({ control: payload.pm_control, items, service, release, signatures });
        const form = new FormData(); form.append('file', pdf, `${created.job_card_number || 'preventive-maintenance-job-card'}.pdf`); form.append('title', `PM Job Card ${created.job_card_number}`); form.append('category', 'Equipment'); form.append('source_type', 'pm_job_card'); form.append('source_id', created.id); form.append('visibility', 'PUBLIC');
        await apiFetch('/api/v1/documents', { method: 'POST', body: form });
      }
      onSaved?.();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not save preventive maintenance job card.');
    } finally {
      setSaving(false);
    }
  }

  const titles = ['PM Control', 'Checklist & Measurements', 'Service Completion', 'Release & Sign-off'];
  const assetOptions = [...equipmentList.map((asset) => ({
    value: String(asset.id),
    label: asset.name || asset.asset_number || asset.id,
    sublabel: [asset.asset_number, asset.make, asset.model].filter(Boolean).join(' · '),
  })), { value: '__CUSTOM__', label: 'Enter custom equipment…', sublabel: '' }];
  const siteOptions = [
    ...sites.map((site) => ({ value: String(site.id), label: site.name || site.site_name || site.code })),
    { value: '__CUSTOM__', label: 'Enter a custom location…' },
  ];
  const workOrderOptions = [
    ...workOrders.map((order) => ({ value: String(order.id), label: `${order.wo_number || order.title || 'Work order'}${order.status ? ` · ${order.status}` : ''}` })),
    { value: '__CUSTOM__', label: 'Enter a work order number…' },
  ];
  const workOrderItemOptions = inventoryItems.map((item) => ({ value: String(item.id), label: `${item.name} [Code: ${item.code || 'ITEM'}]`, sublabel: `Unit: ${item.unit_of_measure || 'PCS'}` }));
  async function createWorkOrder() {
    if (!assetId) { setWorkOrderError('Select registered equipment before creating a linked work order.'); return; }
    if (!woForm.title.trim()) { setWorkOrderError('Enter a work order title.'); return; }
    setCreatingWorkOrder(true); setWorkOrderError('');
    try {
      const typeMap: Record<string, string> = { PREVENTIVE: 'PREVENTIVE', CORRECTIVE: 'CORRECTIVE', INSPECTION: 'PREVENTIVE', SERVICE: 'PREVENTIVE', OTHER: 'CORRECTIVE' };
      const priorityMap: Record<string, string> = { LOW: 'LOW', NORMAL: 'MEDIUM', HIGH: 'HIGH', CRITICAL: 'CRITICAL' };
      const order = await apiFetch<any>('/api/v1/maintenance/work-orders', { method: 'POST', body: JSON.stringify({ asset_id: assetId, project_id: projectId, title: woForm.title.trim(), description: woForm.description || undefined, work_type: typeMap[woForm.maintenance_type], priority: priorityMap[woForm.priority], scheduled_date: woForm.scheduled_date || undefined, assigned_technician_id: woForm.assigned_to_ids[0] || undefined, notes: JSON.stringify({ estimated_hours: woForm.estimated_hours, checklist: woChecklist.filter(Boolean), requested_parts: woParts.filter((part) => part.item_id) }), cost_lines: Number(woForm.cost) > 0 ? [{ cost_type: 'OTHER', description: 'Estimated work order cost', quantity: 1, unit_cost: Number(woForm.cost), currency: 'USD' }] : [] }) });
      setWorkOrders((rows) => [order, ...rows.filter((row) => row.id !== order.id)]);
      setControl((old: any) => ({ ...old, work_order_id: String(order.id), work_order_no: order.wo_number }));
      setCustomWorkOrder('');
      if (woFile) { const form = new FormData(); form.append('file', woFile); form.append('title', `Work Order ${order.wo_number}`); form.append('document_type', 'OTHER'); await apiFetch('/api/v1/documents', { method: 'POST', body: form }); }
      setShowCreateWorkOrder(false);
    } catch (err) { setWorkOrderError(err instanceof Error ? err.message : 'Could not create work order.'); }
    finally { setCreatingWorkOrder(false); }
  }
  const pmIntervalOptions = intervals.map((value) => ({ value, label: value }));
  const statusOptions = cardStatuses.map(([value, label]) => ({ value, label }));
  const controlInput = (key: string, label: string, type = 'text') => (
    <label className="block space-y-1 font-medium" key={key}>
      <span className="block">{label}</span>
      <input type={type} value={control[key] || ''} onChange={(event) => setControl({ ...control, [key]: event.target.value })} className="w-full border rounded-lg p-2 bg-background" />
    </label>
  );

  const addSignature = async (role: string, file: File) => {
    if (!file.type.startsWith('image/')) { setError('Choose an image file for a signature.'); return; }
    const source = await new Promise<string>((resolve, reject) => { const reader = new FileReader(); reader.onload = () => typeof reader.result === 'string' ? resolve(reader.result) : reject(new Error('Could not read signature.')); reader.onerror = () => reject(new Error('Could not read signature.')); reader.readAsDataURL(file); });
    const imageData = await new Promise<string>((resolve, reject) => { const image = new Image(); image.onload = () => { const canvas = document.createElement('canvas'); const scale = Math.min(1, 600 / image.width, 180 / image.height); canvas.width = Math.max(1, Math.round(image.width * scale)); canvas.height = Math.max(1, Math.round(image.height * scale)); const ctx = canvas.getContext('2d'); if (!ctx) { reject(new Error('Could not process signature.')); return; } ctx.drawImage(image, 0, 0, canvas.width, canvas.height); resolve(canvas.toDataURL('image/png')); }; image.onerror = () => reject(new Error('The selected file is not a readable image.')); image.src = source; });
    const name = window.prompt('Name this signature so you can select it again next time:')?.trim() || '';
    setSignatures((current: any) => ({ ...current, [role]: { signer_name: name, image_data: imageData } }));
    if (name) { const next = [{ id: `${Date.now()}`, name, image_data: imageData }, ...savedSignatures.filter((entry) => entry.name.toLowerCase() !== name.toLowerCase())].slice(0, 20); setSavedSignatures(next); try { localStorage.setItem(signatureStorageKey, JSON.stringify(next)); } catch { setError('Signature added to this card, but this browser could not save it for reuse.'); } }
  };
  const signatureField = (role: 'technician' | 'supervisor' | 'operator', label: string) => <div className="space-y-2 rounded-lg border p-3"><div className="font-semibold">{label}</div><input className="w-full border rounded-lg p-2 bg-background" placeholder="Signer name" value={signatures[role]?.signer_name || ''} onChange={(event) => setSignatures({ ...signatures, [role]: { ...signatures[role], signer_name: event.target.value } })} /><label className="block cursor-pointer border border-dashed p-2 text-center text-xs">Upload signature<input className="hidden" type="file" accept="image/png,image/jpeg,image/webp" onChange={(event) => { const file = event.target.files?.[0]; if (file) void addSignature(role, file).catch((err: any) => setError(err?.message || 'Could not add signature.')); event.currentTarget.value = ''; }} /></label>{signatures[role]?.image_data && <img src={signatures[role].image_data} alt={`${label} preview`} className="h-10 max-w-full object-contain" />}</div>;

  return <Modal title={`${record ? 'Edit' : 'Preventive'} Maintenance Job Card`} onClose={onClose} className="sm:!h-[94vh] sm:!max-h-[94vh] sm:!w-[92vw] sm:!max-w-[1440px]">
    <div className="space-y-4 text-xs">
      <div className="flex border-b" role="tablist" aria-label="Preventive maintenance entry mode">{(['ASSISTED', 'FREE_FLOW'] as const).map((mode) => <button type="button" key={mode} role="tab" aria-selected={view === mode} onClick={() => setView(mode)} className={`border-b-2 px-4 py-2 font-bold ${view === mode ? 'border-primary text-primary' : 'border-transparent text-muted-foreground'}`}>{mode === 'ASSISTED' ? 'Assisted' : 'Free flow'}</button>)}</div>
      {view === 'FREE_FLOW' && <div className="max-h-[72vh] overflow-y-auto bg-slate-100 p-2 sm:p-4"><div className="freeflow-job-card mx-auto max-w-[1400px] space-y-3 bg-white p-3 shadow sm:p-6 text-slate-900">
        <header className="border-b-2 border-slate-800 pb-3 text-center"><h2 className="text-base font-black tracking-wide">MAINTENANCE CONTROL — PREVENTIVE MAINTENANCE JOB CARD</h2><p className="mt-1 text-[10px] italic">Controlled PM record • Inspect → Service → Measure → Verify → Release</p></header>
        <section className="space-y-3"><h3 className="border-b bg-slate-100 p-2 font-black">A. PM CONTROL</h3><div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <label className="space-y-1 font-semibold">PM Job Card No.<input className="w-full border p-2" value={control.job_card_number} onChange={(e) => setControl({ ...control, job_card_number: e.target.value })} /></label>
          <label className="space-y-1 font-semibold">Date<input type="date" className="w-full border p-2" value={control.date || ''} onChange={(e) => setControl({ ...control, date: e.target.value })} /></label>
          <label className="space-y-1 font-semibold">PM Interval<input className="w-full border p-2" value={control.pm_interval || ''} onChange={(e) => setControl({ ...control, pm_interval: e.target.value })} /></label>
          <label className="space-y-1 font-semibold">Status<input className="w-full border p-2" value={control.status || ''} onChange={(e) => setControl({ ...control, status: e.target.value })} /></label>
          <label className="space-y-1 font-semibold">Equipment<input className="w-full border p-2" value={customEquipment || control.equipment || selected?.name || selected?.asset_number || ''} onChange={(e) => { setCustomEquipment(e.target.value); setIsCustomEquipment(true); const match = equipmentList.find((asset) => [asset.name, asset.asset_name, asset.description, asset.asset_number, asset.fleet_number].some((name) => String(name || '').trim().toLowerCase() === e.target.value.trim().toLowerCase())); setAssetId(match ? String(match.id) : ''); }} /></label>
          <label className="space-y-1 font-semibold">Fleet / Unit ID<input className="w-full border p-2" value={control.fleet_unit_id || ''} onChange={(e) => setControl({ ...control, fleet_unit_id: e.target.value })} /></label>
          <label className="space-y-1 font-semibold">Location<input className="w-full border p-2" value={customLocation || control.location || sites.find((s) => String(s.id) === String(control.site_location_id))?.name || ''} onChange={(e) => { setCustomLocation(e.target.value); setControl({ ...control, location: '__CUSTOM__', site_location_id: '' }); }} /></label>
          <label className="space-y-1 font-semibold">Hour Meter / KM<input className="w-full border p-2" value={control.hour_meter_km || ''} onChange={(e) => setControl({ ...control, hour_meter_km: e.target.value })} /></label>
          <label className="space-y-1 font-semibold">Technician / Team<input className="w-full border p-2" value={customTechnician || control.technician_team || ''} onChange={(e) => { setCustomTechnician(e.target.value); setControl({ ...control, technician_team: e.target.value, technician_employee_id: '' }); }} /></label>
          <label className="space-y-1 font-semibold">Work Order No.<input className="w-full border p-2" value={customWorkOrder || control.work_order_no || ''} onChange={(e) => { setCustomWorkOrder(e.target.value); setControl({ ...control, work_order_no: e.target.value, work_order_id: '' }); }} /></label>
          <label className="space-y-1 font-semibold">Start Time<input type="time" className="w-full border p-2" value={control.start_time || ''} onChange={(e) => setControl({ ...control, start_time: e.target.value })} /></label>
          <label className="space-y-1 font-semibold">Finish Time<input type="time" className="w-full border p-2" value={control.finish_time || ''} onChange={(e) => setControl({ ...control, finish_time: e.target.value })} /></label>
        </div></section>
        <section className="space-y-3"><h3 className="border-b bg-slate-100 p-2 font-black">B. PM CHECKLIST & MEASUREMENTS</h3><div className="space-y-3">{items.map((item, index) => <div key={index} className="rounded border p-3"><div className="mb-2 font-bold">{item.system_component}</div><div className="grid gap-2 sm:grid-cols-2"><label className="space-y-1">Inspection / Service Task<textarea className="w-full border p-2" value={Array.isArray(item.service_tasks) ? item.service_tasks.join(', ') : item.service_tasks || ''} onChange={(e) => updateItem(index, 'service_tasks', e.target.value)} /></label><label className="space-y-1">Condition / Reading<input className="w-full border p-2" value={[item.condition, item.condition_reading].filter(Boolean).join(' — ')} onChange={(e) => { const [condition, ...reading] = e.target.value.split(' — '); updateItem(index, 'condition', condition); updateItem(index, 'condition_reading', reading.join(' — ')); }} /></label><label className="space-y-1">Action Taken<textarea className="w-full border p-2" value={item.action_taken || ''} onChange={(e) => updateItem(index, 'action_taken', e.target.value)} /></label><label className="space-y-1">Parts / Qty<textarea className="w-full border p-2" value={item.parts_text || ''} onChange={(e) => updateItem(index, 'parts_text', e.target.value)} /></label><label className="space-y-1">Technician Initial<input className="w-full border p-2" value={item.technician_initial || ''} onChange={(e) => updateItem(index, 'technician_initial', e.target.value)} /></label><label className="space-y-1">Supervisor Check<input className="w-full border p-2" value={item.supervisor_check || ''} onChange={(e) => updateItem(index, 'supervisor_check', e.target.value)} /></label><label className="space-y-1 sm:col-span-2">Remarks<textarea className="w-full border p-2" value={item.remarks || ''} onChange={(e) => updateItem(index, 'remarks', e.target.value)} /></label></div></div>)}</div></section>
        <section className="space-y-3"><h3 className="border-b bg-slate-100 p-2 font-black">C. SERVICE INTERVAL & PM COMPLETION</h3><div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">{[['pm_level','PM Level'],['next_pm_due','Next Due'],['total_labour_hours','Total Labour Hrs'],['machine_down_hours','Machine Down Hrs']].map(([key,label]) => <label key={key} className="space-y-1 font-semibold">{label}<input type={key === 'next_pm_due' ? 'date' : 'text'} className="w-full border p-2" value={service[key] || ''} onChange={(e) => setService({ ...service, [key]: e.target.value })} /></label>)}</div><label className="block space-y-1 font-semibold">Defects found / corrective actions required / parts to order / recommendations<textarea className="w-full border p-2" rows={3} value={service.defects_recommendations || ''} onChange={(e) => setService({ ...service, defects_recommendations: e.target.value })} /></label><label className="block space-y-1 font-semibold">PM Result<input className="w-full border p-2" value={service.pm_result || ''} onChange={(e) => setService({ ...service, pm_result: e.target.value })} /></label></section>
        <section className="space-y-3"><h3 className="border-b bg-slate-100 p-2 font-black">D. RELEASE & SIGN-OFF</h3><label className="block space-y-1 font-semibold">Machine Status<input className="w-full border p-2" value={release.machine_status || ''} onChange={(e) => setRelease({ ...release, machine_status: e.target.value })} /></label><label className="block space-y-1 font-semibold">Supervisor comments / outstanding defects / next inspection focus<textarea className="w-full border p-2" rows={3} value={release.comments || ''} onChange={(e) => setRelease({ ...release, comments: e.target.value })} /></label><div className="grid gap-3 sm:grid-cols-3">{signatureField('technician', 'Technician Sign')}{signatureField('supervisor', 'Supervisor Sign')}{signatureField('operator', 'Operator Sign')}</div></section>
        <p className="text-[10px] text-slate-500">Saving creates a PDF copy linked to this card. Existing attachments are kept.</p>
      </div></div>}
      {view === 'ASSISTED' && <>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-1">
        {titles.map((title, index) => <button type="button" key={title} onClick={() => setStep(index)} className={`rounded-lg px-2 py-2 text-[11px] font-bold ${step === index ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'}`}><span className="block text-[10px]">Step {index + 1}</span>{title}</button>)}
      </div>
      {error && <p role="alert" className="rounded-lg border border-destructive/40 bg-destructive/5 p-3 text-destructive">{error}</p>}
      {step === 0 && <div className="space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <label className="block space-y-1 font-medium" htmlFor="pm-job-card-number"><span className="block">PM Job Card No.</span><input id="pm-job-card-number" required value={control.job_card_number} onChange={(event) => setControl({ ...control, job_card_number: event.target.value })} className="w-full border rounded-lg p-2 bg-background" placeholder="PM job card number" /></label>
          {controlInput('date', 'Date', 'date')}
          <div className="space-y-1"><label className="block font-medium">PM Interval *</label><SearchableSelect value={control.pm_interval} onChange={(value) => setControl({ ...control, pm_interval: value })} options={pmIntervalOptions} placeholder="Search PM intervals..." required />{control.pm_interval === 'Other' && <input required value={customInterval} onChange={(event) => setCustomInterval(event.target.value)} placeholder="Enter PM interval" className="w-full border rounded-lg p-2 bg-background" />}</div>
          <label className="block space-y-1 font-medium"><span className="block">Status</span><SearchableSelect value={control.status} onChange={(value) => setControl({ ...control, status: value })} options={statusOptions} placeholder="Select status..." /></label>

          <div className="space-y-1"><label className="block font-medium">Equipment *</label>{isCustomEquipment ? <><input autoFocus required value={customEquipment} onChange={(event) => setCustomEquipment(event.target.value)} placeholder="Enter equipment name" className="w-full border rounded-lg p-2 bg-background" /><button type="button" className="text-primary underline" onClick={() => { setIsCustomEquipment(false); setCustomEquipment(''); }}>Choose registered equipment</button></> : <SearchableSelect value={assetId} onChange={(value) => { if (value === '__CUSTOM__') { setIsCustomEquipment(true); setAssetId(''); setControl((old: any) => ({ ...old, fleet_unit_id: '' })); return; } const asset = assets.find((row) => String(row.id) === value); setIsCustomEquipment(false); setCustomEquipment(''); setAssetId(value); setControl((old: any) => ({ ...old, fleet_unit_id: asset?.asset_number || asset?.fleet_number || '' })); }} options={assetOptions} placeholder="Search project equipment..." required />}</div>
          <label className="block space-y-1 font-medium"><span className="block">Fleet / Unit ID</span><input value={control.fleet_unit_id || selected?.asset_number || selected?.fleet_number || ''} onChange={(event) => setControl({ ...control, fleet_unit_id: event.target.value })} className="w-full border rounded-lg p-2 bg-background" placeholder="Enter fleet / unit ID" /></label>
          <div className="space-y-1"><label className="block font-medium">Location</label>{control.location === '__CUSTOM__' ? <><input autoFocus value={customLocation} onChange={(event) => setCustomLocation(event.target.value)} placeholder="Enter location" className="w-full border rounded-lg p-2 bg-background" /><button type="button" className="text-primary underline" onClick={() => { setCustomLocation(''); setControl({ ...control, location: '', site_location_id: '' }); }}>Choose a project location</button></> : <SearchableSelect value={control.site_location_id} onChange={(value) => { if (value === '__CUSTOM__') { setCustomLocation(''); setControl({ ...control, site_location_id: '', location: '__CUSTOM__' }); return; } setControl({ ...control, site_location_id: value, location: '' }); }} options={siteOptions} placeholder="Search project locations..." />}</div>
          {controlInput('hour_meter_km', 'Hour Meter / KM')}

          <div className="space-y-1"><label className="block font-medium">Technician / Team</label>{control.technician_team === '__CUSTOM__' ? <><input autoFocus value={customTechnician} onChange={(event) => setCustomTechnician(event.target.value)} placeholder="Enter technician or team" className="w-full border rounded-lg p-2 bg-background" /><button type="button" className="text-primary underline" onClick={() => { setCustomTechnician(''); setControl({ ...control, technician_team: '', technician_employee_id: '' }); }}>Choose an employee</button></> : <SearchableSelect value={control.technician_employee_id} onChange={(value) => { if (value === '__CUSTOM__') { setCustomTechnician(''); setControl({ ...control, technician_employee_id: '', technician_team: '__CUSTOM__' }); return; } const employee = employees.find((row) => String(row.id) === value); setControl({ ...control, technician_employee_id: value, technician_team: nameOf(employee || {}) }); }} options={[{ value: '__CUSTOM__', label: 'Enter a custom technician…' }, ...technicianOptions]} placeholder="Search Operations mechanics and electricians..." />}</div>
          <div className="space-y-1"><label className="block font-medium">Work Order No.</label>{control.work_order_no === '__CUSTOM__' ? <><input autoFocus value={customWorkOrder} onChange={(event) => setCustomWorkOrder(event.target.value)} placeholder="Enter a custom work order number" className="w-full border rounded-lg p-2 bg-background" /><button type="button" className="text-primary underline" onClick={() => { setCustomWorkOrder(''); setControl({ ...control, work_order_id: '', work_order_no: '' }); }}>Choose an existing work order</button></> : <SearchableSelect value={control.work_order_id || ''} onChange={(value) => { if (value === '__CUSTOM__') { setCustomWorkOrder(''); setControl({ ...control, work_order_id: '', work_order_no: '__CUSTOM__' }); return; } const order = workOrders.find((row) => String(row.id) === value); setCustomWorkOrder(''); setControl({ ...control, work_order_id: value, work_order_no: order?.wo_number || order?.title || '' }); }} options={assetId ? workOrderOptions : [{ value: '__CUSTOM__', label: 'Enter a custom work order number…' }]} placeholder={assetId ? 'Search work orders for this equipment...' : 'Select or enter a work order number...'} />}{assetId && <button type="button" onClick={() => { setWorkOrderError(''); setShowCreateWorkOrder(true); }} className="btn-secondary w-full">Create Work Order</button>}{!assetId && <small className="text-muted-foreground">Select equipment to choose an existing order or create a linked one.</small>}{assetId && <small className="text-muted-foreground">You can enter a custom number or create a linked work order.</small>}</div>
          {controlInput('start_time', 'Start Time', 'time')}
          {controlInput('finish_time', 'Finish Time', 'time')}
        </div>
        <label className="block space-y-1 font-medium"><span className="block">Maintenance file / delivery receipt / inspection photo</span><input type="file" accept="image/*,.pdf,.doc,.docx" onChange={(event) => setAttachment(event.target.files?.[0] || null)} className="w-full border rounded-lg p-2 bg-background" /><small className="text-muted-foreground">The file is linked to this job card after saving.</small></label>
      </div>}
      {step === 1 && <div className="space-y-3 max-h-[55vh] overflow-y-auto">{items.map((item, index) => <div key={item.system_component} className="rounded-xl border p-3 space-y-3"><div><strong>{item.system_component}</strong><p className="text-muted-foreground">{item.service_tasks}</p></div><div className="grid grid-cols-2 gap-2"><label className="block space-y-1 font-medium"><span className="block">Condition / Reading</span><SearchableSelect value={item.condition} onChange={(value) => updateItem(index, 'condition', value)} options={['GOOD', 'SATISFACTORY', 'MONITOR', 'NEEDS_ATTENTION', 'DEFECTIVE', 'NOT_APPLICABLE'].map((value) => ({ value, label: value.replaceAll('_', ' ') }))} placeholder="Select condition..." /></label><label className="block space-y-1 font-medium"><span className="block">Technician Initial</span><input value={item.technician_initial} onChange={(event) => updateItem(index, 'technician_initial', event.target.value)} className="w-full border rounded-lg p-2 bg-background" /></label></div><label className="block space-y-1 font-medium"><span className="block">Action Taken</span><textarea value={item.action_taken} onChange={(event) => updateItem(index, 'action_taken', event.target.value)} className="w-full border rounded-lg p-2 bg-background" /></label><label className="block space-y-1 font-medium"><span className="block">Parts / Qty</span><textarea value={item.parts_text || ''} onChange={(event) => updateItem(index, 'parts_text', event.target.value)} className="w-full border rounded-lg p-2 bg-background" placeholder="Part number × quantity" /></label><label className="block space-y-1 font-medium"><span className="block">Remarks</span><textarea value={item.remarks} onChange={(event) => updateItem(index, 'remarks', event.target.value)} className="w-full border rounded-lg p-2 bg-background" /></label></div>)}</div>}
      {step === 2 && <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">{[['pm_level', 'PM Level'], ['next_pm_due', 'Next Due'], ['total_labour_hours', 'Total Labour Hrs'], ['machine_down_hours', 'Machine Down Hrs']].map(([key, label]) => <label className="block space-y-1 font-medium" key={key}><span className="block">{label}</span><input type={key === 'next_pm_due' ? 'date' : 'text'} value={service[key]} onChange={(event) => setService({ ...service, [key]: event.target.value })} className="w-full border rounded-lg p-2 bg-background" /></label>)}<label className="block space-y-1 font-medium sm:col-span-2"><span className="block">PM Result</span><SearchableSelect value={service.pm_result} onChange={(value) => setService({ ...service, pm_result: value })} options={['Passed', 'Passed with Observations', 'Further Maintenance Required', 'Machine Not Released'].map((value) => ({ value, label: value }))} placeholder="Select result..." /></label><label className="block space-y-1 font-medium sm:col-span-2"><span className="block">Defects / corrective actions / parts to order</span><textarea value={service.defects_recommendations} onChange={(event) => setService({ ...service, defects_recommendations: event.target.value })} className="w-full border rounded-lg p-2 bg-background min-h-24" /></label></div>}
      {step === 3 && <div className="space-y-3"><label className="block space-y-1 font-medium"><span className="block">Machine Status</span><SearchableSelect value={release.machine_status} onChange={(value) => setRelease({ ...release, machine_status: value })} options={['Released for Service', 'Released with Restrictions', 'Awaiting Repair', 'Out of Service'].map((value) => ({ value, label: value }))} placeholder="Select machine status..." /></label><label className="block space-y-1 font-medium"><span className="block">Supervisor comments / outstanding defects / next inspection focus</span><textarea value={release.comments} onChange={(event) => setRelease({ ...release, comments: event.target.value })} className="w-full border rounded-lg p-2 bg-background min-h-32" /></label><div className="grid grid-cols-1 sm:grid-cols-3 gap-2">{[['technician', 'Technician Sign'], ['supervisor', 'Supervisor Sign'], ['operator', 'Operator Sign']].map(([key, name]) => <label className="block space-y-1 font-medium" key={key}><span className="block">{name}</span><input className="w-full border rounded-lg p-2 bg-background" placeholder="Name / initials" value={signatures[key]} onChange={(event) => setSignatures({ ...signatures, [key]: event.target.value })} /></label>)}</div></div>}
      </>}
    </div>
    {showCreateWorkOrder && <Modal title="Create & Dispatch Field Work Order" onClose={() => setShowCreateWorkOrder(false)} className="max-w-3xl"><div className="space-y-4 text-xs max-h-[75vh] overflow-y-auto pr-1">{workOrderError && <p role="alert" className="rounded-lg border border-destructive/40 p-3 text-destructive">{workOrderError}</p>}<section className="p-3 border rounded-xl space-y-3"><h4 className="font-bold uppercase tracking-wide">Target Equipment & Work Classification</h4><div className="grid sm:grid-cols-2 gap-3"><label className="space-y-1">Target Equipment Asset *<SearchableSelect value={assetId} onChange={() => {}} options={assetOptions.filter((option) => option.value !== '__CUSTOM__')} placeholder={selected?.name || selected?.asset_number || 'Selected equipment'} disabled /></label><label className="space-y-1">Work Order Title *<input required value={woForm.title} onChange={(e) => setWoForm({ ...woForm, title: e.target.value })} className="w-full border rounded-lg p-2 bg-background" /></label></div><div className="grid sm:grid-cols-3 gap-3"><label className="space-y-1">Maintenance Type *<select value={woForm.maintenance_type} onChange={(e) => setWoForm({ ...woForm, maintenance_type: e.target.value })} className="w-full border rounded-lg p-2 bg-background">{['PREVENTIVE','CORRECTIVE','INSPECTION','SERVICE','OTHER'].map((v) => <option key={v} value={v}>{v}</option>)}</select></label><label className="space-y-1">Priority Level *<select value={woForm.priority} onChange={(e) => setWoForm({ ...woForm, priority: e.target.value })} className="w-full border rounded-lg p-2 bg-background">{['LOW','NORMAL','HIGH','CRITICAL'].map((v) => <option key={v} value={v}>{v}</option>)}</select></label><label className="space-y-1">Estimated Cost ($)<input type="number" min="0" step="0.01" value={woForm.cost} onChange={(e) => setWoForm({ ...woForm, cost: Number(e.target.value) })} className="w-full border rounded-lg p-2 bg-background" /></label></div></section><section className="p-3 border rounded-xl space-y-3"><h4 className="font-bold uppercase tracking-wide">Scheduling & Specialist Assignment</h4><div className="grid sm:grid-cols-2 gap-3"><label className="space-y-1">Scheduled Date *<input type="date" required value={woForm.scheduled_date} onChange={(e) => setWoForm({ ...woForm, scheduled_date: e.target.value })} className="w-full border rounded-lg p-2 bg-background" /></label><label className="space-y-1">Estimated Duration (Hours)<input type="number" min="0.5" step="0.5" value={woForm.estimated_hours} onChange={(e) => setWoForm({ ...woForm, estimated_hours: Number(e.target.value) })} className="w-full border rounded-lg p-2 bg-background" /></label></div><label className="block space-y-1">Assign Technician / Specialist<SearchableSelect options={technicianOptions} value="" onChange={(value) => value && !woForm.assigned_to_ids.includes(value) && setWoForm({ ...woForm, assigned_to_ids: [...woForm.assigned_to_ids, value] })} placeholder="Search technicians..." /></label><div className="flex flex-wrap gap-1">{woForm.assigned_to_ids.map((id: string) => <button type="button" key={id} onClick={() => setWoForm({ ...woForm, assigned_to_ids: woForm.assigned_to_ids.filter((v: string) => v !== id) })} className="rounded bg-primary/10 px-2 py-1">{nameOf(employees.find((e) => String(e.id) === id) || {})} ×</button>)}</div></section><section className="p-3 border rounded-xl space-y-2"><label className="block space-y-1">Scope of Work Instructions<textarea rows={3} value={woForm.description} onChange={(e) => setWoForm({ ...woForm, description: e.target.value })} className="w-full border rounded-lg p-2 bg-background" /></label></section><section className="p-3 border rounded-xl space-y-3"><h4 className="font-bold uppercase tracking-wide">Work Order Maintenance Checklist</h4>{woChecklist.map((task, index) => <div key={index} className="flex gap-2"><span>{index + 1}.</span><input value={task} onChange={(e) => setWoChecklist(woChecklist.map((v, i) => i === index ? e.target.value : v))} className="flex-1 border rounded p-1 bg-background" /><button type="button" onClick={() => setWoChecklist(woChecklist.filter((_, i) => i !== index))}>×</button></div>)}<div className="flex gap-2"><input value={woNewTask} onChange={(e) => setWoNewTask(e.target.value)} placeholder="+ Add checklist task" className="flex-1 border rounded p-1 bg-background" /><button type="button" onClick={() => { if (woNewTask.trim()) setWoChecklist([...woChecklist, woNewTask.trim()]); setWoNewTask(''); }}>Add</button></div></section><section className="p-3 border rounded-xl space-y-3"><h4 className="font-bold uppercase tracking-wide">Spare Parts & Consumables Required</h4>{woParts.map((part, index) => <div className="grid grid-cols-12 gap-2" key={index}><div className="col-span-6"><SearchableSelect options={workOrderItemOptions} value={part.item_id} onChange={(value) => setWoParts(woParts.map((v, i) => i === index ? { ...v, item_id: value } : v))} placeholder="Select spare part / component..." /></div><input type="number" min="1" value={part.quantity} onChange={(e) => setWoParts(woParts.map((v, i) => i === index ? { ...v, quantity: Number(e.target.value) } : v))} className="col-span-3 border rounded p-1 bg-background" /><input value={part.unit} onChange={(e) => setWoParts(woParts.map((v, i) => i === index ? { ...v, unit: e.target.value } : v))} className="col-span-2 border rounded p-1 bg-background" /><button type="button" onClick={() => setWoParts(woParts.filter((_, i) => i !== index))}>×</button></div>)}<button type="button" onClick={() => setWoParts([...woParts, { item_id: '', quantity: 1, unit: 'PCS' }])}>+ Add Spare Part / Consumable</button></section><section className="p-3 border rounded-xl"><label className="block font-bold">Associated Procedure or Work Order Document (Optional)<input type="file" accept="image/*,application/pdf,.doc,.docx" onChange={(e) => setWoFile(e.target.files?.[0] || null)} className="block mt-2" /></label>{woFile && <span>{woFile.name}</span>}</section><div className="flex justify-end gap-2 border-t pt-3"><button type="button" className="btn-secondary" onClick={() => setShowCreateWorkOrder(false)}>Cancel</button><button type="button" className="btn-primary" disabled={creatingWorkOrder} onClick={createWorkOrder}>{creatingWorkOrder ? 'Dispatching Work Order…' : 'Create & Dispatch Work Order'}</button></div></div></Modal>}
  </Modal>;
}
