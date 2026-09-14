'use client';
import { useState } from 'react';
import { ArrowRight, Truck, CheckCircle2 } from 'lucide-react';
import { apiFetch } from '@/lib/api';
import { Modal, Row, rows, useData, State } from './DataUI';
export default function AssetAssignmentModal({
  asset,
  currentProject,
  projectId,
  onClose,
  onSaved,
}: {
  asset?: Row;
  currentProject?: Row | null;
  projectId?: string;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [selectedAssetId, setSelectedAssetId] = useState(asset?.id || '');
  const [target, setTarget] = useState(projectId || '');
  const [location, setLocation] = useState('');
  const [operator, setOperator] = useState('');
  const [reason, setReason] = useState('');
  const [meter, setMeter] = useState('');
  const [returnAt, setReturnAt] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const assetsData = useData(asset ? null : '/api/v1/assets?page_size=100');
  const projects = useData('/api/v1/projects?page_size=100');
  const locations = useData('/api/v1/locations?page_size=100');
  const people = useData('/api/v1/employees?page_size=100');

  const activeAsset = asset || rows(assetsData.data).find((r) => r.id === selectedAssetId);
  const currentAssignedProjectName =
    currentProject?.name ||
    activeAsset?.current_project?.name ||
    activeAsset?.project_name ||
    activeAsset?.current_project_name ||
    activeAsset?.current_assignment?.project?.name;
  const destination = rows(projects.data).find((r) => r.id === target);
  const transfer = !!currentAssignedProjectName;

  async function save(e: React.FormEvent) {
    e.preventDefault();
    const assetIdToUse = activeAsset?.id || selectedAssetId;
    if (!assetIdToUse) {
      setError('Please select an equipment asset to assign.');
      return;
    }

    setBusy(true);
    setError('');
    try {
      await apiFetch('/api/v1/assets/' + assetIdToUse + (transfer ? '/transfer' : '/assignments'), {
        method: 'POST',
        body: JSON.stringify({
          project_id: target,
          location_id: location || null,
          primary_operator_id: operator || null,
          assigned_at: new Date().toISOString(),
          expected_return_at: returnAt ? new Date(returnAt).toISOString() : null,
          assignment_reason: reason,
          notes: reason,
          starting_meter: meter || null,
          ...(transfer ? { ending_meter: meter || null } : {}),
        }),
      });
      onSaved();
    } catch (e: any) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <Modal name={transfer ? 'Transfer asset' : 'Assign asset to project'} onClose={onClose}>
      <form onSubmit={save} className="space-y-5">
        {!asset ? (
          <label className="block text-xs font-semibold">
            Equipment / Asset *
            <select
              className="input-field mt-1 text-xs"
              value={selectedAssetId}
              required
              onChange={(e) => setSelectedAssetId(e.target.value)}
            >
              <option value="">Select equipment asset to assign…</option>
              {rows(assetsData.data).map((a) => {
                const projName =
                  a.current_project?.name ||
                  a.project_name ||
                  a.current_project_name ||
                  a.current_assignment?.project?.name;
                const statusLabel = projName
                  ? `Assigned: ${projName}`
                  : a.status?.replace(/_/g, ' ') || 'AVAILABLE';
                return (
                  <option key={a.id} value={a.id}>
                    {a.name || a.asset_code || a.code} ({a.asset_number || 'No Code'}) — {statusLabel}
                  </option>
                );
              })}
            </select>
          </label>
        ) : (
          <div className="flex items-center gap-3">
            <span className="p-3 rounded-lg bg-secondary text-primary">
              <Truck size={24} />
            </span>
            <div>
              <h3 className="font-semibold">{activeAsset?.name}</h3>
              <p className="text-xs text-muted-foreground">
                {activeAsset?.asset_number} · {activeAsset?.status?.replace(/_/g, ' ')}
              </p>
            </div>
          </div>
        )}

        <div className="grid grid-cols-[1fr_auto_1fr] gap-3 items-center">
          <section className="rounded-lg border p-4 bg-muted/40 min-h-24">
            <p className="text-xs uppercase tracking-wide text-muted-foreground">From</p>
            <p className="font-semibold mt-2">{currentAssignedProjectName || 'Unassigned fleet'}</p>
            <p className="text-xs text-muted-foreground mt-1">Current assignment</p>
          </section>
          <ArrowRight size={24} className="text-primary" />
          <section className="rounded-lg border border-primary/30 p-4 bg-secondary min-h-24">
            <p className="text-xs uppercase tracking-wide text-primary">To</p>
            <p className="font-semibold mt-2">{destination?.name || 'Choose destination'}</p>
            <p className="text-xs text-primary mt-1">New project assignment</p>
          </section>
        </div>
        <State loading={projects.loading} error={projects.error} retry={projects.reload}>
          <div className="grid md:grid-cols-2 gap-4">
            <label className="text-xs font-semibold">
              Destination project *
              <select
                className="input-field mt-1"
                value={target}
                required
                onChange={(e) => {
                  setTarget(e.target.value);
                  setLocation('');
                }}
              >
                <option value="">Select project</option>
                {rows(projects.data)
                  .filter(
                    (p) =>
                      p.id !== currentProject?.id &&
                      p.is_active &&
                      p.status !== 'CLOSED' &&
                      p.status !== 'COMPLETED'
                  )
                  .map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))}
              </select>
            </label>
            <label className="text-xs font-semibold">
              Destination site
              <select
                className="input-field mt-1"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
              >
                <option value="">No site specified</option>
                {rows(locations.data)
                  .filter((r) => !r.project_id || r.project_id === target)
                  .map((r) => (
                    <option key={r.id} value={r.id}>
                      {r.name}
                    </option>
                  ))}
              </select>
            </label>
            <label className="text-xs font-semibold">
              Primary operator
              <select
                className="input-field mt-1"
                value={operator}
                onChange={(e) => setOperator(e.target.value)}
              >
                <option value="">No operator specified</option>
                {rows(people.data).map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.first_name} {r.last_name}
                  </option>
                ))}
              </select>
            </label>
            <label className="text-xs font-semibold">
              Handover meter reading
              <input
                className="input-field mt-1"
                type="number"
                min="0"
                step="0.01"
                value={meter}
                onChange={(e) => setMeter(e.target.value)}
                placeholder={String(activeAsset?.current_meter_reading ?? '')}
              />
            </label>
            <label className="text-xs font-semibold">
              Expected return
              <input
                className="input-field mt-1"
                type="datetime-local"
                value={returnAt}
                onChange={(e) => setReturnAt(e.target.value)}
              />
            </label>
            <label className="text-xs font-semibold md:col-span-2">
              Assignment / transfer reason *
              <textarea
                className="input-field mt-1"
                required
                maxLength={200}
                value={reason}
                onChange={(e) => setReason(e.target.value)}
              />
            </label>
          </div>
        </State>
        <p className="text-xs text-muted-foreground flex gap-2">
          <CheckCircle2 size={15} />
          {transfer
            ? 'The current assignment closes and its history is preserved when the transfer succeeds.' :'The asset’s availability and project assignment update together.'}
        </p>
        {error && (
          <p role="alert" className="text-sm text-red-700 bg-red-50 rounded p-3">
            {error}
          </p>
        )}
        <div className="flex justify-end gap-2 border-t pt-4">
          <button type="button" className="btn-secondary text-xs" onClick={onClose}>
            Cancel
          </button>
          <button
            disabled={busy || projects.loading || !!projects.error}
            className="btn-primary text-xs"
          >
            {busy ? 'Saving…' : transfer ? 'Confirm transfer' : 'Confirm assignment'}
          </button>
        </div>
      </form>
    </Modal>
  );
}
