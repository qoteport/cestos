'use client';

import { useEffect, useMemo, useState } from 'react';
import { apiFetch } from '@/lib/api';
import { Modal } from './DataUI';
import SearchableSelect from './SearchableSelect';

const emptyPart = { description: '', part_no: '', qty: '', unit: '', source: '', condition: '', old_returned: '', remarks: '' };
const employeeName = (employee: any) => [employee?.first_name, employee?.last_name].filter(Boolean).join(' ') || employee?.name || '';
const signatureStorageKey = 'cestos.breakdown-job-card.signatures.v1';

function asText(value: any) { return value == null ? '' : String(value); }

function canvasPdf(canvas: HTMLCanvasElement): Blob {
  const encoded = canvas.toDataURL('image/jpeg', 0.94).split(',')[1];
  const raw = atob(encoded);
  const jpeg = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i += 1) jpeg[i] = raw.charCodeAt(i);
  const chunks: Uint8Array[] = [];
  const encoder = new TextEncoder();
  let length = 0;
  const push = (chunk: Uint8Array) => { chunks.push(chunk); length += chunk.length; };
  const ascii = (value: string) => encoder.encode(value);
  const offsets: number[] = [0];
  push(ascii('%PDF-1.4\n% Cestos job card\n'));
  const object = (number: number, parts: Uint8Array[]) => {
    offsets[number] = length;
    push(ascii(`${number} 0 obj\n`));
    parts.forEach(push);
    push(ascii('\nendobj\n'));
  };
  object(1, [ascii('<< /Type /Catalog /Pages 2 0 R >>')]);
  object(2, [ascii('<< /Type /Pages /Kids [3 0 R] /Count 1 >>')]);
  object(3, [ascii('<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595.28 841.89] /Resources << /XObject << /Card 4 0 R >> >> /Contents 5 0 R >>')]);
  object(4, [ascii(`<< /Type /XObject /Subtype /Image /Width ${canvas.width} /Height ${canvas.height} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${jpeg.length} >>\nstream\n`), jpeg, ascii('\nendstream')]);
  const content = 'q\n595.28 0 0 841.89 0 0 cm\n/Card Do\nQ';
  object(5, [ascii(`<< /Length ${ascii(content).length} >>\nstream\n${content}\nendstream`)]);
  const xrefOffset = length;
  push(ascii(`xref\n0 ${offsets.length}\n0000000000 65535 f \n`));
  for (let i = 1; i < offsets.length; i += 1) push(ascii(`${String(offsets[i]).padStart(10, '0')} 00000 n \n`));
  push(ascii(`trailer\n<< /Size ${offsets.length} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF`));
  const output = new Uint8Array(length);
  let cursor = 0;
  chunks.forEach((chunk) => { output.set(chunk, cursor); cursor += chunk.length; });
  return new Blob([output.buffer as ArrayBuffer], { type: 'application/pdf' });
}

async function makeBreakdownPdf(data: { control: any; failure: string; action: string; parts: any[]; labour: any[]; release: any; signatures: any; number: string }) {
  const canvas = document.createElement('canvas');
  canvas.width = 1275;
  canvas.height = 1800;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Could not prepare the job card PDF.');
  ctx.scale(1.5, 1.5);
  ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, 850, 1200);
  ctx.fillStyle = '#000'; ctx.font = 'bold 15px Arial'; ctx.textAlign = 'center';
  ctx.fillText('DAILY MAINTENANCE / BREAKDOWN REPAIR JOB CARD', 425, 30);
  let y = 45;
  const left = 40; const width = 770;
  const section = (name: string) => { ctx.fillStyle = '#184877'; ctx.fillRect(left, y, width, 19); ctx.fillStyle = '#fff'; ctx.font = 'bold 10px Arial'; ctx.textAlign = 'center'; ctx.fillText(name.toUpperCase(), left + width / 2, y + 13); y += 19; };
  const cell = (x: number, top: number, w: number, h: number, text: any, label = false) => {
    ctx.fillStyle = label ? '#dbe7f4' : '#fff'; ctx.fillRect(x, top, w, h); ctx.strokeStyle = '#000'; ctx.lineWidth = 0.6; ctx.strokeRect(x, top, w, h);
    ctx.fillStyle = '#111'; ctx.font = `${label ? 'bold ' : ''}8px Arial`; ctx.textAlign = 'left';
    const value = asText(text); const max = Math.max(3, Math.floor((w - 8) / 4.1));
    ctx.fillText(value.length > max ? `${value.slice(0, max - 1)}…` : value, x + 4, top + Math.min(h - 3, 14));
  };
  const fieldGrid = (fields: [string, any][], rowHeight = 24) => {
    const columns = 4; const cw = width / columns; const pairW = cw / 2;
    fields.forEach(([label, value], i) => { const row = Math.floor(i / columns); const x = left + (i % columns) * cw; const top = y + row * rowHeight; cell(x, top, pairW, rowHeight, label, true); cell(x + pairW, top, pairW, rowHeight, value); });
    y += Math.ceil(fields.length / columns) * rowHeight;
  };
  const box = (name: string, value: string, h: number) => { section(name); ctx.strokeStyle = '#000'; ctx.strokeRect(left, y, width, h); ctx.fillStyle = '#111'; ctx.font = '9px Arial'; ctx.textAlign = 'left'; const words = (value || '—').split(/\s+/); let line = ''; let top = y + 14; for (const word of words) { const next = line ? `${line} ${word}` : word; if (ctx.measureText(next).width > width - 14) { ctx.fillText(line, left + 7, top); line = word; top += 12; if (top > y + h - 6) break; } else line = next; } if (line && top <= y + h - 6) ctx.fillText(line, left + 7, top); y += h; };
  section('Job control & machine identification');
  fieldGrid([['Job card no.', data.number], ['Date', data.control.date], ['Equipment', data.control.equipment], ['Fleet / unit ID', data.control.fleet_unit_id], ['Location', data.control.location], ['Hour / KM', data.control.hour_km], ['Operator / Driver', data.control.operator_driver], ['Department', data.control.department], ['Time reported', data.control.time_reported], ['Time attended', data.control.time_attended]]);
  box('Reported failure / request', data.failure, 56);
  box('Corrective action / work completed', data.action, 104);
  section('Parts, consumables & materials');
  const partHeaders = ['Description', 'Part No.', 'Qty', 'Unit', 'Source', 'Condition', 'Old Part Returned', 'Remarks'];
  const partWidths = [125, 82, 48, 47, 90, 82, 102, 194];
  let x = left; partHeaders.forEach((name, i) => { cell(x, y, partWidths[i], 22, name, true); x += partWidths[i]; }); y += 22;
  const parts = data.parts.filter((p) => Object.values(p).some(Boolean));
  for (let i = 0; i < Math.max(4, Math.min(parts.length, 7)); i += 1) { x = left; const row = parts[i] || {}; ['description', 'part_no', 'qty', 'unit', 'source', 'condition', 'old_returned', 'remarks'].forEach((key, j) => { cell(x, y, partWidths[j], 22, row[key]); x += partWidths[j]; }); y += 22; }
  section('Labour & downtime');
  const labourHeaders = ['Technician', 'Start', 'Finish', 'Labour Hrs', 'Machine Down Hrs', 'Work Hrs', 'Remarks'];
  const labourWidths = [130, 75, 75, 83, 105, 75, 227]; x = left; labourHeaders.forEach((name, i) => { cell(x, y, labourWidths[i], 22, name, true); x += labourWidths[i]; }); y += 22;
  const labourRows = data.labour.filter((row) => Object.values(row).some(Boolean));
  for (let i = 0; i < Math.max(3, Math.min(labourRows.length, 5)); i += 1) { x = left; const row = labourRows[i] || {}; ['technician', 'start', 'finish', 'labour_hours', 'machine_down_hours', 'work_hours', 'remarks'].forEach((key, j) => { cell(x, y, labourWidths[j], 22, row[key]); x += labourWidths[j]; }); y += 22; }
  box('Test, release & remarks', data.release['Test, release & remarks'] || '', 62);
  const roles = [['technician', 'Technician Sign'], ['supervisor', 'Supervisor Sign'], ['operator', 'Operator Sign']] as const;
  const signatureImages = await Promise.all(roles.map(async ([role]) => {
    const source = data.signatures[role]?.image_data; if (!source) return null;
    return await new Promise<HTMLImageElement | null>((resolve) => { const img = new Image(); img.onload = () => resolve(img); img.onerror = () => resolve(null); img.src = source; });
  }));
  const signW = width / 4;
  roles.forEach(([role, label], index) => {
    const x0 = left + index * signW; cell(x0, y, signW, 24, label, true); ctx.strokeRect(x0, y + 24, signW, 48);
    const image = signatureImages[index]; if (image) ctx.drawImage(image, x0 + 5, y + 27, signW - 10, 38);
    else cell(x0, y + 24, signW, 48, data.signatures[role]?.signer_name || '');
    ctx.fillStyle = '#111'; ctx.font = '7px Arial'; ctx.textAlign = 'center'; ctx.fillText(data.signatures[role]?.signer_name || '', x0 + signW / 2, y + 69);
  });
  const dateX = left + signW * 3.75; cell(dateX, y, signW, 24, 'Date', true); cell(dateX, y + 24, signW, 48, data.control.date || '');
  return canvasPdf(canvas);
}

export default function BreakdownJobCardWizard({ assets, projectId, onClose, onSaved, record }: { assets: any[]; projectId: string; onClose: () => void; onSaved?: () => void; record?: any }) {
  const initialControl = record?.job_control || {};
  const [step, setStep] = useState(0);
  const [view, setView] = useState<'ASSISTED' | 'FREE_FLOW'>('ASSISTED');
  const [assetId, setAssetId] = useState(record?.asset_id || '');
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [signatures, setSignatures] = useState<any>(() => {
    const values = record?.signatures || {};
    return Object.fromEntries(['technician', 'supervisor', 'operator'].map((role) => {
      const value = values[role];
      return [role, typeof value === 'string' ? { signer_name: value } : value || {}];
    }));
  });
  const [savedSignatures, setSavedSignatures] = useState<any[]>([]);
  const [createdRecord, setCreatedRecord] = useState<any>(null);
  const [items, setItems] = useState<any[]>([]);
  const [employees, setEmployees] = useState<any[]>([]);
  const [stores, setStores] = useState<any[]>([]);
  const [sites, setSites] = useState<any[]>([]);
  const [storeId, setStoreId] = useState('');
  const [failure, setFailure] = useState(record?.reported_failure || '');
  const [action, setAction] = useState(record?.corrective_action || '');
  const [parts, setParts] = useState<any[]>(record?.parts_materials?.length ? record.parts_materials : [{ ...emptyPart }]);
  const [control, setControl] = useState<any>({ ...initialControl, date: initialControl.date || record?.created_at?.slice(0, 10) || new Date().toISOString().slice(0, 10), location_site_id: record?.site_location_id || initialControl.location_site_id || '' });
  const [labour, setLabour] = useState<any[]>(record?.labour_downtime?.length ? record.labour_downtime : [{ technician: '', technician_employee_id: '', start: '', finish: '', labour_hours: '', machine_down_hours: '', work_hours: '', remarks: '' }]);
  const [release, setRelease] = useState<any>(record?.test_release || {});

  const [equipmentList, setEquipmentList] = useState<any[]>(assets || []);

  useEffect(() => {
    try {
      const saved = JSON.parse(localStorage.getItem(signatureStorageKey) || '[]');
      if (Array.isArray(saved)) setSavedSignatures(saved);
    } catch { setSavedSignatures([]); }
  }, []);

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

  useEffect(() => {
    let active = true;
    apiFetch<any>('/api/v1/inventory/stores?page_size=200').then((r) => { if (active) setStores(Array.isArray(r) ? r : r.items || []); }).catch(() => {});
    apiFetch<any>('/api/v1/employees?page_size=100').then((r) => { if (active) setEmployees(Array.isArray(r) ? r : r.items || []); }).catch(() => {});
    if (projectId) apiFetch<any>(`/api/v1/projects/${projectId}/sites`).then((r) => { if (active) setSites(Array.isArray(r) ? r : r.items || []); }).catch(() => {});
    return () => { active = false; };
  }, [projectId]);

  useEffect(() => {
    let active = true;
    setItems([]);
    if (!storeId) return () => { active = false; };
    apiFetch<any>(`/api/v1/inventory/items?store_id=${encodeURIComponent(storeId)}&has_stock=true&page_size=200`).then((r) => { if (active) setItems(Array.isArray(r) ? r : r.items || []); }).catch(() => { if (active) setItems([]); });
    return () => { active = false; };
  }, [storeId]);

  const employeeOptions = useMemo(() => employees.map((employee) => ({
    value: String(employee.id),
    label: employeeName(employee) || employee.employee_number || employee.email || 'Employee',
    sublabel: [employee.employee_number, employee.position_name || employee.job_title, employee.department_name || employee.department?.name || employee.department].filter(Boolean).join(' · '),
  })), [employees]);
  const departmentOptions = useMemo(() => {
    const values = Array.from(new Set(employees.map((employee) => employee.department_name || employee.department?.name || employee.department).filter((value): value is string => typeof value === 'string' && Boolean(value.trim())).map((value) => value.trim())));
    return [...values.map((value) => ({ value, label: value })), { value: '__CUSTOM__', label: 'Enter a custom department…' }];
  }, [employees]);
  const siteOptions = [
    ...sites.map((site) => ({ value: String(site.id), label: site.name || site.site_name || site.code })),
    { value: '__CUSTOM__', label: 'Enter a custom location…' },
  ];
  const selectedEmployee = (id: string) => employees.find((employee) => String(employee.id) === String(id));
  const update = (setter: any, index: number, key: string, value: string) => setter((rows: any[]) => rows.map((row, i) => i === index ? { ...row, [key]: value } : row));

  async function addSignature(role: string, sourceFile: File) {
    if (!sourceFile.type.startsWith('image/')) { setSaveError('Choose an image file for a signature.'); return; }
    const source = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => typeof reader.result === 'string' ? resolve(reader.result) : reject(new Error('Could not read the signature image.'));
      reader.onerror = () => reject(new Error('Could not read the signature image.'));
      reader.readAsDataURL(sourceFile);
    });
    const imageData = await new Promise<string>((resolve, reject) => {
      const image = new Image();
      image.onload = () => {
        const canvas = document.createElement('canvas');
        const scale = Math.min(1, 600 / image.width, 180 / image.height);
        canvas.width = Math.max(1, Math.round(image.width * scale));
        canvas.height = Math.max(1, Math.round(image.height * scale));
        const context = canvas.getContext('2d');
        if (!context) { reject(new Error('Could not process the signature image.')); return; }
        context.drawImage(image, 0, 0, canvas.width, canvas.height);
        resolve(canvas.toDataURL('image/png'));
      };
      image.onerror = () => reject(new Error('The selected file is not a readable image.'));
      image.src = source;
    });
    const name = window.prompt('Name this signature so you can select it again next time:')?.trim() || '';
    setSignatures((current: any) => ({ ...current, [role]: { signer_name: name, image_data: imageData } }));
    if (name) {
      const saved = { id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`, name, image_data: imageData };
      const next = [saved, ...savedSignatures.filter((item) => item.name.toLowerCase() !== name.toLowerCase())].slice(0, 20);
      setSavedSignatures(next);
      try { localStorage.setItem(signatureStorageKey, JSON.stringify(next)); } catch { setSaveError('Signature added to this card, but this browser could not save it for reuse.'); }
    }
  }

  async function save() {
    setSaving(true);
    setSaveError('');
    try {
      const asset = equipmentList.find((row) => String(row.id) === String(assetId));
      const payloadControl = { ...control, equipment: asset?.name || asset?.asset_name || asset?.description || asset?.asset_number || control.equipment || '', fleet_unit_id: control.fleet_unit_id || asset?.asset_number || asset?.fleet_number || '', location: control.location === '__CUSTOM__' ? control.custom_location || '' : control.location, department: control.department === '__CUSTOM__' ? control.custom_department || '' : control.department };
      const payload = { asset_id: assetId, project_id: projectId || record?.project_id || null, site_location_id: control.location_site_id || null, status: record?.status || createdRecord?.status || 'DRAFT', job_control: payloadControl, reported_failure: failure, corrective_action: action, parts_materials: parts, labour_downtime: labour, test_release: release, signatures };
      const existing = record || createdRecord;
      const saved = await apiFetch<any>(existing ? `/api/v1/pm-job-cards/breakdown/${existing.id}` : '/api/v1/pm-job-cards/breakdown', {
        method: existing ? 'PATCH' : 'POST',
        body: JSON.stringify(payload),
      });
      setCreatedRecord(saved);
      if (file) {
        const form = new FormData(); form.append('file', file); form.append('title', `Breakdown Job Card ${saved.job_card_number}`); form.append('category', 'Equipment'); form.append('source_type', 'breakdown_job_card'); form.append('source_id', saved.id); form.append('visibility', 'PUBLIC');
        await apiFetch('/api/v1/documents', { method: 'POST', body: form });
      }
      if (view === 'FREE_FLOW') {
        const pdf = await makeBreakdownPdf({ control: payloadControl, failure, action, parts, labour, release, signatures, number: saved.job_card_number });
        const form = new FormData();
        form.append('file', pdf, `${saved.job_card_number || 'breakdown-job-card'}.pdf`);
        form.append('title', `Breakdown Job Card ${saved.job_card_number}`);
        form.append('category', 'Equipment');
        form.append('source_type', 'breakdown_job_card');
        form.append('source_id', saved.id);
        form.append('visibility', 'PUBLIC');
        await apiFetch('/api/v1/documents', { method: 'POST', body: form });
      }
      onSaved?.(); onClose();
    } catch (error: any) {
      setSaveError(error?.message || 'Could not save the breakdown job card. Please retry.');
    } finally { setSaving(false); }
  }

  const input = (label: string, key: string) => <label className="block space-y-1 font-medium"><span className="block">{label}</span><input className="w-full border rounded-lg p-2 bg-background" value={control[key] || ''} onChange={(event) => setControl({ ...control, [key]: event.target.value })} /></label>;
  const sentenceCase = (value: string) => value.replaceAll('_', ' ').toLowerCase().replace(/^\w/, (char) => char.toUpperCase());
  const steps = ['Job control', 'Failure & repair', 'Parts & labour', 'Test & release'];
  const inventoryOptions = items.map((item) => ({ value: String(item.id), label: `${item.name || item.item_name || 'Item'}${item.part_number ? ` | ${item.part_number}` : ''} · ${item.quantity_available ?? 0} available` }));

  const signatureField = (role: 'technician' | 'supervisor' | 'operator', label: string, allowSaved = true) => (
    <div className="space-y-2 p-2 border-b border-black">
      <div className="font-semibold">{label}</div>
      <input className="w-full border p-1.5" placeholder="Signer name" value={signatures[role]?.signer_name || ''} onChange={(event) => setSignatures((current: any) => ({ ...current, [role]: { ...current[role], signer_name: event.target.value } }))} />
      {allowSaved && savedSignatures.length > 0 && <select aria-label={`Saved ${label.toLowerCase()}`} className="w-full border bg-white p-1.5" value="" onChange={(event) => { const chosen = savedSignatures.find((item) => item.id === event.target.value); if (chosen) setSignatures((current: any) => ({ ...current, [role]: { signer_name: chosen.name, image_data: chosen.image_data } })); }}><option value="">Choose a saved signature…</option>{savedSignatures.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select>}
      <label className="block cursor-pointer border border-dashed p-1.5 text-center text-[10px] font-medium hover:bg-slate-50">Upload signature<input className="hidden" type="file" accept="image/png,image/jpeg,image/webp" onChange={(event) => { const image = event.target.files?.[0]; if (image) void addSignature(role, image).catch((error: any) => setSaveError(error?.message || 'Could not add signature.')); event.currentTarget.value = ''; }} /></label>
      {signatures[role]?.image_data && <img src={signatures[role].image_data} alt={`${label} preview`} className="h-10 max-w-full object-contain" />}
    </div>
  );

  return <Modal title={`${record ? 'Edit' : 'Create'} daily maintenance / breakdown repair job card`} onClose={onClose} className="sm:!h-[94vh] sm:!max-h-[94vh] sm:!w-[92vw] sm:!max-w-[1440px]">
    <div className="space-y-4 text-xs">
      <div className="flex border-b" role="tablist" aria-label="Breakdown job card entry mode">
        {(['ASSISTED', 'FREE_FLOW'] as const).map((mode) => <button type="button" key={mode} role="tab" aria-selected={view === mode} onClick={() => setView(mode)} className={`border-b-2 px-4 py-2 font-bold transition ${view === mode ? 'border-primary text-primary' : 'border-transparent text-muted-foreground hover:text-foreground'}`}>{mode === 'ASSISTED' ? 'Assisted' : 'Free flow'}</button>)}
      </div>
      {view === 'FREE_FLOW' ? <div className="max-h-[72vh] space-y-3 overflow-auto bg-slate-100 p-2 sm:p-4">
        <div className="freeflow-job-card mx-auto max-w-[1400px] space-y-2 bg-white p-3 shadow sm:p-6">
          <h2 className="py-2 text-center text-sm font-black tracking-wide">DAILY MAINTENANCE / BREAKDOWN REPAIR JOB CARD</h2>
          <section><h3 className="bg-[#184877] px-2 py-1 text-center text-[11px] font-bold uppercase text-white">Job control &amp; machine identification</h3><div className="grid grid-cols-2 border-l border-t border-black sm:grid-cols-4">
            {[
              ['Equipment', <input key="equipment" aria-label="Equipment" value={control.equipment || equipmentList.find((asset) => String(asset.id) === String(assetId))?.name || ''} onChange={(event) => { const value = event.target.value; const match = equipmentList.find((asset) => [asset.name, asset.asset_name, asset.description, asset.asset_number, asset.fleet_number].some((name) => String(name || '').trim().toLowerCase() === value.trim().toLowerCase())); setControl((old: any) => ({ ...old, equipment: value, fleet_unit_id: match ? old.fleet_unit_id || match.asset_number || match.fleet_number || '' : old.fleet_unit_id })); setAssetId(match ? String(match.id) : ''); }} />],
              ['Fleet / Unit ID', <input key="fleet" value={control.fleet_unit_id || ''} onChange={(event) => setControl({ ...control, fleet_unit_id: event.target.value })} />],
              ['Location', <input key="location" aria-label="Location" placeholder="Enter location" value={control.location === '__CUSTOM__' ? control.custom_location || '' : control.location || ''} onChange={(event) => setControl({ ...control, location: event.target.value, location_site_id: '', custom_location: '' })} />],
              ['Hour / KM', <input key="hour" value={control.hour_km || ''} onChange={(event) => setControl({ ...control, hour_km: event.target.value })} />],
              ['Operator / Driver', <input key="operator" value={control.operator_driver || ''} onChange={(event) => setControl({ ...control, operator_driver: event.target.value })} />],
              ['Department', <input key="department" value={control.department === '__CUSTOM__' ? control.custom_department || '' : control.department || ''} onChange={(event) => setControl({ ...control, department: event.target.value })} />],
              ['Time Reported', <input key="reported" placeholder="HH:MM" value={control.time_reported || ''} onChange={(event) => setControl({ ...control, time_reported: event.target.value })} />],
              ['Time Attended', <input key="attended" placeholder="HH:MM" value={control.time_attended || ''} onChange={(event) => setControl({ ...control, time_attended: event.target.value })} />],
            ].map(([label, inputElement]: any) => <div key={label} className="min-w-0 border-b border-r border-black"><div className="bg-[#dbe7f4] px-1.5 py-1 font-bold">{label}</div><div className="min-h-8 p-1 [&_input]:w-full [&_input]:border-0 [&_input]:p-1 [&_button]:min-h-7 [&_button]:rounded-none [&_button]:text-left [&_button]:text-[10px]">{inputElement}</div></div>)}
          </div></section>
          {[['REPORTED FAILURE / REQUEST', failure, setFailure, 'min-h-16'], ['CORRECTIVE ACTION / WORK COMPLETED', action, setAction, 'min-h-28']].map(([title, value, setter, height]: any) => <section key={title}><h3 className="bg-[#184877] px-2 py-1 text-center text-[11px] font-bold uppercase text-white">{title}</h3><textarea aria-label={title} className={`w-full resize-y border border-black p-2 text-[11px] ${height}`} value={value} onChange={(event) => setter(event.target.value)} /></section>)}
          <section><h3 className="bg-[#184877] px-2 py-1 text-center text-[11px] font-bold uppercase text-white">Parts, consumables &amp; materials</h3><div className="overflow-x-auto"><table className="w-full min-w-[760px] table-fixed border-collapse text-[10px]"><thead><tr>{[['Description', 'description'], ['Part No.', 'part_no'], ['Qty', 'qty'], ['Unit', 'unit'], ['Source', 'source'], ['Condition', 'condition'], ['Old Part Returned', 'old_returned'], ['Remarks', 'remarks']].map(([label]) => <th key={label} className="border border-black bg-[#dbe7f4] p-1 text-left">{label}</th>)}</tr></thead><tbody>{parts.map((part, index) => <tr key={index}>{Object.keys(emptyPart).map((key) => <td key={key} className="border border-black p-0"><input aria-label={`${sentenceCase(key)} row ${index + 1}`} className="w-full border-0 p-1 text-[10px]" value={part[key]} onChange={(event) => update(setParts, index, key, event.target.value)} /></td>)}</tr>)}</tbody></table></div><button type="button" className="mt-1 border px-2 py-1" onClick={() => setParts((current) => [...current, { ...emptyPart }])}>Add material row</button></section>
          <section><h3 className="bg-[#184877] px-2 py-1 text-center text-[11px] font-bold uppercase text-white">Labour &amp; downtime</h3><div className="overflow-x-auto"><table className="w-full min-w-[680px] table-fixed border-collapse text-[10px]"><thead><tr>{['Technician', 'Start', 'Finish', 'Labour Hrs', 'Machine Down Hrs', 'Work Hrs', 'Remarks'].map((label) => <th key={label} className="border border-black bg-[#dbe7f4] p-1 text-left">{label}</th>)}</tr></thead><tbody>{labour.map((row, index) => <tr key={index}><td className="border border-black p-0"><input aria-label={`Technician ${index + 1}`} className="w-full border-0 p-1 text-[10px]" value={row.technician || ''} onChange={(event) => setLabour((current) => current.map((item, i) => i === index ? { ...item, technician: event.target.value, technician_employee_id: '' } : item))} /></td>{['start', 'finish', 'labour_hours', 'machine_down_hours', 'work_hours', 'remarks'].map((key) => <td key={key} className="border border-black p-0"><input aria-label={`${sentenceCase(key)} technician ${index + 1}`} className="w-full border-0 p-1 text-[10px]" value={row[key] || ''} onChange={(event) => update(setLabour, index, key, event.target.value)} /></td>)}</tr>)}</tbody></table></div><button type="button" className="mt-1 border px-2 py-1" onClick={() => setLabour((current) => [...current, { technician: '', technician_employee_id: '', start: '', finish: '', labour_hours: '', machine_down_hours: '', work_hours: '', remarks: '' }])}>Add technician row</button></section>
          <section><h3 className="bg-[#184877] px-2 py-1 text-center text-[11px] font-bold uppercase text-white">Test, release &amp; remarks</h3><textarea className="min-h-20 w-full border border-black p-2 text-[11px]" value={release['Test, release & remarks'] || ''} onChange={(event) => setRelease({ ...release, 'Test, release & remarks': event.target.value })} /></section>
          <section><div className="grid grid-cols-2 border-l border-t border-black sm:grid-cols-4">{signatureField('technician', 'Technician Sign', false)}{signatureField('supervisor', 'Supervisor Sign', false)}{signatureField('operator', 'Operator Sign', false)}<label className="border-b border-r border-black"><span className="block bg-[#dbe7f4] p-1 font-bold">Date</span><input type="date" className="w-full p-2" value={control.date || ''} onChange={(event) => setControl({ ...control, date: event.target.value })} /></label></div></section>
        </div>
      </div> : <div className="space-y-4 text-xs">
      <div className="grid grid-cols-4 gap-1">{steps.map((title, index) => <button type="button" key={title} onClick={() => setStep(index)} className={`rounded-lg p-2 font-bold ${step === index ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'}`}>Step {index + 1}<span className="block text-[10px]">{title}</span></button>)}</div>
      {step === 0 && <div className="grid grid-cols-2 gap-3">
        <label className="block space-y-1 font-medium col-span-2"><span className="block">Equipment *</span><SearchableSelect value={assetId} onChange={(value) => { setAssetId(value); const asset = equipmentList.find((row) => String(row.id) === value); if (asset) setControl((old: any) => ({ ...old, fleet_unit_id: old.fleet_unit_id || asset.asset_number || asset.fleet_number || '' })); }} options={equipmentList.map((asset) => ({ value: String(asset.id), label: asset.name || asset.asset_number || asset.id, sublabel: [asset.asset_number, asset.make, asset.model].filter(Boolean).join(' · ') }))} placeholder="Search project equipment..." required /></label>
        {input('Fleet / unit ID', 'fleet_unit_id')}
        <div className="block space-y-1 font-medium"><span className="block">Location</span>{control.location === '__CUSTOM__' ? <input autoFocus className="w-full border rounded-lg p-2 bg-background" placeholder="Enter location" value={control.custom_location || ''} onChange={(event) => setControl({ ...control, custom_location: event.target.value })} /> : <SearchableSelect value={control.location_site_id || ''} onChange={(value) => { if (value === '__CUSTOM__') { setControl({ ...control, location_site_id: '', location: '__CUSTOM__', custom_location: '' }); return; } const site = sites.find((row) => String(row.id) === value); setControl({ ...control, location_site_id: value, location: site?.name || '' }); }} options={siteOptions} placeholder="Search project sites..." />}{control.location === '__CUSTOM__' && <button type="button" className="text-primary underline" onClick={() => setControl({ ...control, location: '', custom_location: '' })}>Choose a project site</button>}</div>
        {input('Hour / km', 'hour_km')}
        <div className="block space-y-1 font-medium"><span className="block">Operator / Driver</span>{control.operator_employee_id === '__CUSTOM__' ? <><input autoFocus className="w-full border rounded-lg p-2 bg-background" placeholder="Enter operator / driver" value={control.operator_driver || ''} onChange={(event) => setControl({ ...control, operator_driver: event.target.value })} /><button type="button" className="text-primary underline" onClick={() => setControl({ ...control, operator_employee_id: '', operator_driver: '' })}>Choose an employee</button></> : <SearchableSelect value={control.operator_employee_id || ''} onChange={(value) => { if (value === '__CUSTOM__') { setControl({ ...control, operator_employee_id: value, operator_driver: '' }); return; } const employee = selectedEmployee(value); setControl({ ...control, operator_employee_id: value, operator_driver: employeeName(employee), department: employee?.department_name || employee?.department?.name || employee?.department || control.department || '' }); }} options={[{ value: '__CUSTOM__', label: 'Enter a custom operator / driver…' }, ...employeeOptions]} placeholder="Search employees..." />}</div>
        <label className="block space-y-1 font-medium"><span className="block">Department</span>{control.department === '__CUSTOM__' ? <><input autoFocus className="w-full border rounded-lg p-2 bg-background" value={control.custom_department || ''} onChange={(event) => setControl({ ...control, custom_department: event.target.value })} placeholder="Enter department" /><button type="button" className="text-primary underline" onClick={() => setControl({ ...control, department: '', custom_department: '' })}>Choose a department</button></> : <SearchableSelect value={control.department || ''} onChange={(value) => { if (value === '__CUSTOM__') { setControl({ ...control, department: '__CUSTOM__', custom_department: '' }); return; } setControl({ ...control, department: value }); }} options={departmentOptions} placeholder="Search departments..." />}</label>
        {input('Time reported', 'time_reported')}{input('Time attended', 'time_attended')}
        <label className="block space-y-1 font-medium col-span-2"><span className="block">Supporting file</span><input type="file" accept="image/*,.pdf,.doc,.docx" onChange={(event) => setFile(event.target.files?.[0] || null)} className="w-full border rounded-lg p-2 bg-background" /></label>
      </div>}
      {step === 1 && <div className="space-y-3"><label className="block space-y-1 font-medium"><span className="block">Reported failure / request</span><textarea className="w-full border rounded-lg p-2 bg-background min-h-32" value={failure} onChange={(event) => setFailure(event.target.value)} /></label><label className="block space-y-1 font-medium"><span className="block">Corrective action / work completed</span><textarea className="w-full border rounded-lg p-2 bg-background min-h-40" value={action} onChange={(event) => setAction(event.target.value)} /></label></div>}
      {step === 2 && <div className="space-y-3 max-h-[55vh] overflow-y-auto"><h4 className="font-bold">Parts, consumables & materials</h4><div className="grid grid-cols-1 sm:grid-cols-2 gap-3"><label className="block space-y-1 font-medium"><span className="block">Store</span><select className="w-full border rounded-lg p-2 bg-background" value={storeId} onChange={(event) => setStoreId(event.target.value)}><option value="">Select store first</option>{stores.map((store) => <option key={store.id} value={store.id}>{store.name || store.code || store.id}</option>)}</select></label><label className="block space-y-1 font-medium"><span className="block">Inventory item</span><SearchableSelect disabled={!storeId} value="" onChange={(value) => { const item = items.find((row) => String(row.id) === value); if (item) setParts((rows) => rows.map((row, index) => index === rows.length - 1 ? { ...row, description: item.name || item.item_name || '', part_no: item.part_number || item.sku || '', unit: item.unit || item.unit_of_measure || '', source: stores.find((store) => String(store.id) === String(storeId))?.name || '' } : row)); }} options={inventoryOptions} placeholder={storeId ? 'Search stock at selected store...' : 'Select a store first...'} /></label></div>
        {parts.map((part, index) => <div key={index} className="grid grid-cols-2 gap-2 border rounded-lg p-3">{Object.keys(emptyPart).map((key) => <label className="block space-y-1 font-medium" key={key}><span className="block">{sentenceCase(key)}</span><input className="w-full border rounded-lg p-2 bg-background" value={part[key]} onChange={(event) => update(setParts, index, key, event.target.value)} /></label>)}</div>)}
        <button type="button" className="btn-secondary" onClick={() => setParts([...parts, { ...emptyPart }])}>+ Add part</button><h4 className="font-bold pt-3">Labour & downtime</h4>
        {labour.map((row, index) => <div key={index} className="grid grid-cols-2 gap-2 border rounded-lg p-3"><label className="block space-y-1 font-medium col-span-2"><span className="block">Technician</span>{row.technician_employee_id === '__CUSTOM__' ? <><input autoFocus className="w-full border rounded-lg p-2 bg-background" value={row.technician || ''} onChange={(event) => update(setLabour, index, 'technician', event.target.value)} placeholder="Enter technician name" /><button type="button" className="text-primary underline" onClick={() => setLabour((rows) => rows.map((item, i) => i === index ? { ...item, technician_employee_id: '', technician: '' } : item))}>Choose an employee</button></> : <SearchableSelect value={row.technician_employee_id || ''} onChange={(value) => { if (value === '__CUSTOM__') { setLabour((rows) => rows.map((item, i) => i === index ? { ...item, technician_employee_id: value, technician: '' } : item)); return; } const employee = selectedEmployee(value); setLabour((rows) => rows.map((item, i) => i === index ? { ...item, technician_employee_id: value, technician: employeeName(employee) } : item)); }} options={[{ value: '__CUSTOM__', label: 'Enter a custom technician…' }, ...employeeOptions]} placeholder="Search employees..." />}</label>{Object.keys(row).filter((key) => key !== 'technician' && key !== 'technician_employee_id').map((key) => <label className="block space-y-1 font-medium" key={key}><span className="block">{sentenceCase(key)}</span><input className="w-full border rounded-lg p-2 bg-background" value={row[key]} onChange={(event) => update(setLabour, index, key, event.target.value)} /></label>)}</div>)}
        <button type="button" className="btn-secondary" onClick={() => setLabour([...labour, { technician: '', technician_employee_id: '', start: '', finish: '', labour_hours: '', machine_down_hours: '', work_hours: '', remarks: '' }])}>+ Add technician</button>
      </div>}
      {step === 3 && <div className="space-y-3"><label className="block space-y-1 font-medium"><span className="block">Test, release & remarks</span><textarea className="w-full border rounded-lg p-2 bg-background min-h-24" value={release['Test, release & remarks'] || ''} onChange={(event) => setRelease({ ...release, 'Test, release & remarks': event.target.value })} /></label><div className="grid gap-2 sm:grid-cols-3">{signatureField('technician', 'Technician Sign')}{signatureField('supervisor', 'Supervisor Sign')}{signatureField('operator', 'Operator Sign')}</div></div>}
      </div>}
      {saveError && <p role="alert" className="rounded-lg border border-red-300 bg-red-50 p-3 text-sm text-red-800">{saveError}</p>}
      {view === 'FREE_FLOW' && <p className="text-[11px] text-muted-foreground">Saving adds a generated PDF copy to this job card. Any files already attached are kept.</p>}
      <div className="flex justify-between border-t pt-3">
        {view === 'ASSISTED' && <button type="button" className="btn-secondary" disabled={!step} onClick={() => setStep(step - 1)}>Back</button>}
        <div className="ml-auto flex gap-2">
          {view === 'ASSISTED' && step < 3 && <button type="button" className="btn-primary" disabled={step === 0 && !assetId} onClick={() => setStep(step + 1)}>Next</button>}
          {(view === 'FREE_FLOW' || step === 3) && <button type="button" className="btn-primary" disabled={saving || !assetId} onClick={save}>{saving ? 'Saving…' : record || createdRecord ? 'Save changes' : view === 'FREE_FLOW' ? 'Save job card and PDF' : 'Save job card'}</button>}
        </div>
      </div>
    </div>
  </Modal>;
}
