'use client';
import { useState } from 'react';
import { ArrowRight, Truck, CheckCircle2 } from 'lucide-react';
import { apiFetch } from '@/lib/api';
import { Modal, Row, rows, useData, State } from './DataUI';
import SearchableSelect from './SearchableSelect';
import AppDateTimePicker from './AppDateTimePicker';
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
          <div>
            <label className="block text-xs font-semibold mb-1">
              Equipment / Asset *
            </label>
            <SearchableSelect
              options={rows(assetsData.data).map((a) => {
                const projName =
                  a.current_project?.name ||
                  a.project_name ||
                  a.current_project_name ||
                  a.current_assignment?.project?.name;
                const statusLabel = projName
                  ? `Assigned: ${projName}`
                  : a.status?.replace(/_/g, ' ') || 'AVAILABLE';
                return {
                  value: a.id,
                  label: `${a.name || a.asset_code || a.code} (${a.asset_number || 'No Code'})`,
                  sublabel: statusLabel,
                  badge: a.asset_number || a.code,
                };
              })}
              value={selectedAssetId}
              onChange={(val) => setSelectedAssetId(val)}
              placeholder="Search equipment asset to assign..."
              required
            />
          </div>
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
            <div>
              <label className="block text-xs font-semibold mb-1">
                Destination project *
              </label>
              <SearchableSelect
                options={rows(projects.data)
                  .filter(
                    (p) =>
                      p.id !== currentProject?.id &&
                      p.is_active &&
                      p.status !== 'CLOSED' &&
                      p.status !== 'COMPLETED'
                  )
                  .map((p) => ({
                    value: p.id,
                    label: p.name,
                    sublabel: p.code || p.project_code,
                  }))}
                value={target}
                onChange={(val) => {
                  setTarget(val);
                  setLocation('');
                }}
                placeholder="Search destination project..."
                required
              />
            </div>
            <div>
              <label className="block text-xs font-semibold mb-1">
                Destination site
              </label>
              <SearchableSelect
                options={rows(locations.data)
                  .filter((r) => !r.project_id || r.project_id === target)
                  .map((r) => ({
                    value: r.id,
                    label: r.name,
                  }))}
                value={location}
                onChange={(val) => setLocation(val)}
                placeholder="No site specified"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold mb-1">
                Primary operator
              </label>
              <SearchableSelect
                options={rows(people.data).map((r) => ({
                  value: r.id,
                  label: `${r.first_name || ''} ${r.last_name || ''}`.trim() || r.email || r.id,
                  sublabel: r.job_title || r.role || r.department,
                }))}
                value={operator}
                onChange={(val) => setOperator(val)}
                placeholder="No operator specified"
              />
            </div>
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
            <div>
              <label className="block text-xs font-semibold mb-1">
                Expected return
              </label>
              <AppDateTimePicker
                mode="datetime"
                value={returnAt}
                onChange={(val) => setReturnAt(val)}
                placeholder="Select expected return date & time..."
              />
            </div>
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
        <div className="sticky bottom-0 -mx-4 -mb-4 sm:-mx-6 sm:-mb-6 p-3.5 sm:px-6 sm:py-4 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-t border-slate-200 dark:border-slate-800 z-10 flex flex-row items-center justify-end gap-2 sm:gap-3 mt-4">
          <button type="button" className="btn-secondary text-xs w-full sm:w-auto" onClick={onClose}>
            Cancel
          </button>
          <button
            disabled={busy || projects.loading || !!projects.error}
            className="btn-primary text-xs w-full sm:w-auto"
          >
            {busy ? 'Saving…' : transfer ? 'Confirm transfer' : 'Confirm assignment'}
          </button>
        </div>
      </form>
    </Modal>
  );
}
