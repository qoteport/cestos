'use client';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useSearchParams, useRouter } from 'next/navigation';
import { Plus, RefreshCw, Search, ArrowLeft, ArrowRight, ExternalLink } from 'lucide-react';
import contract from '@/lib/contract.json';
import { apiFetch, apiFetchBlob } from '@/lib/api';
import { useAuth } from './AuthProvider';
import { Row, title, rows, display, useData, State, Table, Facts, Modal } from './DataUI';
import RecordForm from './RecordForm';
import AssetDetailView from './AssetDetailView';
import EmployeeDetailView from './EmployeeDetailView';
import EmployeeWizardForm from './EmployeeWizardForm';
import { ProjectRegister } from './ProjectDashboard';
import EmployeeAvailabilityWorkspace from './EmployeeAvailabilityWorkspace';
import RotationsWorkspace from './RotationsWorkspace';
import TrainingComplianceWorkspace from './TrainingComplianceWorkspace';
import ExpiringDocumentsWorkspace from './ExpiringDocumentsWorkspace';
import EquipmentExpiringDocumentsWorkspace from './EquipmentExpiringDocumentsWorkspace';
import StoreDetailView from './StoreDetailView';
import ItemDetailView from './ItemDetailView';
import NotificationWorkspace from './NotificationWorkspace';
import AdminWorkspace from './AdminWorkspace';

const routes: Row = contract.routes;
export function operation(path: string, method: string): Row | null {
  const key =
    Object.keys(routes).find((k) => k === path) ||
    Object.keys(routes).find(
      (k) => k.includes('{') && new RegExp('^' + k.replace(/\{[^}]+\}/g, '[^/]+') + '$').test(path)
    );
  return key ? routes[key][method] || null : null;
}
function ClientLogo({ clientId }: { clientId: string }) {
  const [src, setSrc] = useState<string | null>(null);
  useEffect(() => {
    let active = true;
    apiFetchBlob(`/api/v1/clients/${clientId}/logo`)
      .then((blob) => {
        if (active) setSrc(URL.createObjectURL(blob));
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, [clientId]);
  if (!src) return null;
  return (
    <div className="mb-4">
      <img
        src={src}
        alt="Client logo"
        className="h-16 w-auto max-w-48 rounded border border-border object-contain bg-white p-1"
      />
    </div>
  );
}
export default function ResourceWorkspace({ resource }: { resource: string }) {
  const searchParams = useSearchParams();
  if (resource === 'projects') return <ProjectRegister />;
  if (resource === 'employees/available') return <EmployeeAvailabilityWorkspace />;
  if (resource === 'rotations/current' || resource === 'rotations/upcoming') return <RotationsWorkspace />;
  if (resource === 'training/compliance') return <TrainingComplianceWorkspace />;
  if (resource === 'employee-documents/expiring') return <ExpiringDocumentsWorkspace />;
  if (resource === 'assets/expiring-documents' || resource === 'assets/expiring') return <EquipmentExpiringDocumentsWorkspace />;
  if (resource === 'hr/notifications' || resource === 'notifications' || resource === 'notification-schedules') return <NotificationWorkspace />;
  if (resource === 'admin' || resource === 'users' || resource === 'roles' || resource === 'admin/users' || resource === 'admin/roles' || resource === 'admin/leave') return <AdminWorkspace />;

  const matchStore = /^(inventory\/stores|stores)\/([0-9a-f-]{36})$/i.exec(resource);
  if (matchStore) return <StoreDetailView storeId={matchStore[2]} />;

  const matchItem = /^(inventory\/items|items)\/([0-9a-f-]{36})$/i.exec(resource);
  if (matchItem) return <ItemDetailView itemId={matchItem[2]} />;

  const match = /^(employees|assets)\/([0-9a-f-]{36}|me)$/i.exec(resource);
  if (match)
    return match[1] === 'employees' ? (
      <EmployeeDetailView employeeId={match[2]} />
    ) : (
      <AssetDetailView assetId={match[2]} />
    );

  if (resource === 'employees') {
    const isAll = searchParams.get('view') === 'all' || searchParams.has('search') || searchParams.has('page');
    if (!isAll) {
      return <EmployeeDetailView employeeId="me" />;
    }
  }

  return <ResourceList key={resource} resource={resource} />;
}

function ResourceList({ resource }: { resource: string }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const queryParam = searchParams.get('search') || '';
  const auth = useAuth();
  const path = '/api/v1/' + resource;
  const read = operation(path, 'GET');
  const create = operation(path, 'POST');
  const allowed = (op: Row | null) =>
    !!op && (op.permissions || []).every((p: string) => auth.can(p));
  const [search, setSearch] = useState('');
  const [query, setQuery] = useState('');
  const [page, setPage] = useState(1);
  useEffect(() => {
    const value = queryParam;
    setSearch(value);
    setQuery(value);
    setPage(1);
  }, [resource, queryParam]);
  const [selected, setSelected] = useState<Row | null>(null);
  const [editing, setEditing] = useState(false);
  const [creating, setCreating] = useState(false);
  const params = new URLSearchParams();
  if (read?.parameters?.includes('page')) params.set('page', String(page));
  if (read?.parameters?.includes('page_size')) params.set('page_size', '20');
  if (query && read?.parameters?.includes('search')) params.set('search', query);
  const req = useData(allowed(read) ? path + '?' + params : null);
  const list = rows(req.data);
  const total = req.data?.total ?? list.length;
  const pages = req.data?.pages ?? Math.max(1, Math.ceil(total / 20));
  const label = title(resource.split('/').pop()!);
  const detail = useData(
    selected && operation(path + '/' + selected.id, 'GET') ? path + '/' + selected.id : null
  );
  const current = detail.data || selected;
  const update = selected ? operation(path + '/' + selected.id, 'PATCH') : null;
  const [actionError, setActionError] = useState('');
  const [busy, setBusy] = useState(false);
  const [pending, setPending] = useState<string | null>(null);
  const [reason, setReason] = useState('');
  const [counts, setCounts] = useState<Row>({});
  const kind = resource.replace('inventory/', '');
  let actions: string[] = [];
  if (resource.startsWith('inventory/') && current) {
    const status = current.status;
    if (
      [
        'receipts',
        'issues',
        'returns',
        'transfers',
        'requests',
        'adjustments',
        'stock-counts',
      ].includes(kind)
    ) {
      if (status === 'DRAFT')
        actions =
          kind === 'stock-counts'
            ? ['start']
            : kind === 'requests'
              ? ['submit', 'cancel']
              : kind === 'transfers'
                ? ['approve', 'cancel']
                : ['adjustments', 'issues'].includes(kind)
                  ? ['approve', ...(kind === 'issues' ? ['post'] : []), 'cancel']
                  : ['post', ...(kind === 'receipts' ? ['cancel'] : [])];
      if (status === 'APPROVED')
        actions =
          kind === 'transfers'
            ? ['dispatch', 'cancel']
            : kind === 'requests'
              ? ['create-issue']
              : ['post'];
      if (status === 'IN_TRANSIT') actions = ['receive'];
      if (status === 'IN_PROGRESS') actions = ['submit'];
      if (status === 'SUBMITTED') actions = ['approve', ...(kind === 'requests' ? ['reject'] : [])];
      if (kind === 'stock-counts' && !['POSTED', 'CANCELLED', 'DRAFT'].includes(status))
        actions.push('restart');
    } else if (kind === 'reservations' && status === 'ACTIVE') actions = ['release', 'cancel'];
  }
  async function perform(action: string) {
    if (!current) return;
    setBusy(true);
    setActionError('');
    try {
      await apiFetch(path + '/' + current.id + '/' + action, {
        method: 'POST',
        body: JSON.stringify({
          reason: reason || undefined,
          ...(Object.keys(counts).length ? { quantities: counts } : {}),
        }),
      });
      setPending(null);
      setReason('');
      setCounts({});
      detail.reload();
      req.reload();
    } catch (e) {
      setActionError(e instanceof Error ? e.message : 'Action failed.');
    } finally {
      setBusy(false);
    }
  }
  if (!read)
    return (
      <div className="card p-8">
        <h1 className="text-xl font-bold">This view is unavailable</h1>
        <p className="mt-2 text-muted-foreground">Choose a section from the navigation.</p>
      </div>
    );

  return (
    <div className="space-y-5 fade-in">
      <div className="flex flex-wrap justify-between gap-4 items-end">
        <div>
          <Link
            href={resource.startsWith('inventory/') ? '/inventory-overview' : '/'}
            className="text-xs text-primary flex gap-1 items-center mb-3"
          >
            <ArrowLeft size={12} />
            Overview
          </Link>
          <h1 className="text-2xl font-bold">{label}</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {req.loading ? 'Loading records' : `${total} records`} · Cestos Operations
          </p>
        </div>
        <div className="flex gap-2">
          <button aria-label="Refresh records" className="btn-secondary" onClick={req.reload}>
            <RefreshCw size={16} />
          </button>
          {allowed(create) && (
            <button className="btn-primary" onClick={() => setCreating(true)}>
              <Plus size={16} />
              New {label.toLowerCase()}
            </button>
          )}
        </div>
      </div>
      {!allowed(read) ? (
        <div className="card p-8 text-muted-foreground">
          Your account does not have access to these records.
        </div>
      ) : (
        <>
          <form
            className="card p-3 flex gap-2"
            onSubmit={(e) => {
              e.preventDefault();
              setQuery(search);
              setPage(1);
            }}
          >
            {read.parameters?.includes('search') ? (
              <>
                <input
                  aria-label={'Search ' + label}
                  className="input-field max-w-lg"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder={'Search ' + label.toLowerCase() + '…'}
                />
                <button className="btn-secondary">
                  <Search size={16} />
                  Search
                </button>
              </>
            ) : (
              <p className="text-sm text-muted-foreground px-2 py-1">
                Select a record to view its details.
              </p>
            )}
          </form>
          <State loading={req.loading} error={req.error} retry={req.reload}>
            <div className="card overflow-hidden">
              <Table
                data={list}
                onSelect={(row) => {
                  if (resource === 'inventory/stores' || resource === 'stores') {
                    router.push('/workspace/inventory/stores/' + row.id);
                  } else if (resource === 'hr/salaries' && row.employee_id) {
                    router.push('/workspace/employees/' + row.employee_id);
                  } else if (resource === 'employees') {
                    router.push('/workspace/employees/' + row.id);
                  } else if (resource === 'assets') {
                    router.push('/workspace/assets/' + row.id);
                  } else {
                    setSelected(row);
                  }
                }}
              />
              {pages > 1 && (
                <div className="flex items-center justify-between border-t p-3 text-xs text-muted-foreground">
                  <span>
                    Showing {list.length} of {total} records
                  </span>
                  <div className="flex gap-2">
                    <button
                      className="btn-secondary"
                      disabled={page === 1}
                      onClick={() => setPage(page - 1)}
                    >
                      Previous
                    </button>
                    <button
                      className="btn-secondary"
                      disabled={page >= pages}
                      onClick={() => setPage(page + 1)}
                    >
                      Next
                    </button>
                  </div>
                </div>
              )}
            </div>
          </State>
        </>
      )}
      {selected && !editing && (
        <Modal
          name={display(
            current?.name ||
              current?.document_number ||
              current?.employee_number ||
              current?.asset_number ||
              label
          )}
          onClose={() => setSelected(null)}
        >
          <State loading={detail.loading} error={detail.error} retry={detail.reload}>
            {current && (
              <>
                {resource === 'clients' && current?.profile_photo_url && (
                  <ClientLogo clientId={current.id} />
                )}
                {(resource === 'inventory/items' || resource === 'items') ? (
                  <div className="space-y-4">
                    <Facts
                      data={{
                        'Item Number / SKU': current.item_number || current.sku || 'N/A',
                        'Item Name': current.name || 'N/A',
                        'Category': current.category_name || current.category?.name || 'Catalog Item',
                        'Base Unit': current.unit_symbol || current.base_unit?.symbol || 'units',
                        'Standard Cost': current.standard_cost != null ? `$${Number(current.standard_cost).toFixed(2)}` : 'N/A',
                        'Minimum Stock Level': current.minimum_stock_level ?? 0,
                        'Reorder Point': current.reorder_point ?? 0,
                        'Status': current.is_active !== false ? 'Active' : 'Inactive',
                      }}
                    />
                    <div className="p-3.5 bg-blue-50/80 border border-blue-200/80 rounded-xl text-xs text-slate-800 flex items-center justify-between flex-wrap gap-2 mt-4">
                      <div>
                        <span className="font-bold text-slate-900 block">Complete Item Detail Page Available</span>
                        <span className="text-muted-foreground text-[11px]">View live stock levels, consumption trends, store balances & actions.</span>
                      </div>
                      <Link
                        className="btn-primary text-xs font-semibold shrink-0 flex items-center gap-1.5 shadow-xs"
                        href={'/workspace/inventory/items/' + current.id}
                        onClick={() => setSelected(null)}
                      >
                        <span>More Details & Charts</span>
                        <ArrowRight size={13} />
                      </Link>
                    </div>
                  </div>
                ) : (
                  <Facts data={current} />
                )}
                {current.items && (
                  <div className="mt-6">
                    <h3 className="font-semibold mb-3">Items</h3>
                    <Table data={current.items} />
                  </div>
                )}
                <div className="flex flex-wrap gap-2 mt-6 border-t pt-4">
                  {(resource === 'inventory/items' || resource === 'items') && (
                    <Link
                      className="btn-primary text-xs font-semibold flex items-center gap-1.5"
                      href={'/workspace/inventory/items/' + current.id}
                      onClick={() => setSelected(null)}
                    >
                      <span>More Details / Full Workspace</span>
                      <ExternalLink size={13} />
                    </Link>
                  )}
                  {allowed(update) &&
                    (!resource.startsWith('inventory/') ||
                      !current.status ||
                      current.status === 'DRAFT') && (
                      <button className="btn-secondary text-xs" onClick={() => setEditing(true)}>
                        Edit record
                      </button>
                    )}
                  {resource === 'projects' && (
                    <Link
                      className="btn-primary"
                      href={'/project-command-center?project=' + current.id}
                    >
                      Open command center
                    </Link>
                  )}
                  {actions
                    .filter((a) => allowed(operation(path + '/' + current.id + '/' + a, 'POST')))
                    .map((a) => (
                      <button
                        className="btn-primary"
                        key={a}
                        onClick={() => {
                          setPending(a);
                          setActionError('');
                        }}
                      >
                        {title(a)}
                      </button>
                    ))}
                </div>
              </>
            )}
          </State>
        </Modal>
      )}
      {pending && current && (
        <Modal name={title(pending) + ' ' + label.toLowerCase()} onClose={() => setPending(null)}>
          {pending === 'create-issue' ? (
            <RecordForm
              resource={resource}
              path={path + '/' + current.id + '/create-issue'}
              operation={operation(path + '/' + current.id + '/create-issue', 'POST')!}
              onClose={() => setPending(null)}
              onSaved={() => {
                setPending(null);
                req.reload();
              }}
            />
          ) : (
            <form
              className="space-y-4"
              onSubmit={(e) => {
                e.preventDefault();
                void perform(pending);
              }}
            >
              <p className="text-sm text-muted-foreground">
                Apply this action to {current.document_number || 'the selected record'}.
              </p>
              {kind === 'stock-counts' &&
                pending === 'submit' &&
                current.items?.map((line: Row) => (
                  <label className="block text-sm" key={line.id}>
                    Count for {line.item_id}
                    <input
                      className="input-field mt-1"
                      required
                      type="number"
                      min="0"
                      step="0.0001"
                      value={counts[line.id] ?? ''}
                      onChange={(e) => setCounts({ ...counts, [line.id]: e.target.value })}
                    />
                  </label>
                ))}
              <label className="block text-sm">
                Reason{pending === 'restart' ? ' *' : ' (optional)'}
                <input
                  className="input-field mt-1"
                  value={reason}
                  required={pending === 'restart'}
                  onChange={(e) => setReason(e.target.value)}
                />
              </label>
              {actionError && (
                <p role="alert" className="text-red-700">
                  {actionError}
                </p>
              )}
              <button disabled={busy} className="btn-primary">
                {busy ? 'Processing…' : title(pending)}
              </button>
            </form>
          )}
        </Modal>
      )}
      {creating && resource === 'employees' && (
        <EmployeeWizardForm
          onClose={() => setCreating(false)}
          onSaved={(emp) => {
            setCreating(false);
            req.reload();
            if (emp?.id) router.push('/workspace/employees/' + emp.id);
          }}
        />
      )}
      {(creating || editing) && resource !== 'employees' && (
        <RecordForm
          resource={resource}
          path={editing ? path + '/' + selected!.id : path}
          operation={editing ? update! : create!}
          initial={editing ? current : undefined}
          onClose={() => {
            setCreating(false);
            setEditing(false);
          }}
          onSaved={() => {
            setCreating(false);
            setEditing(false);
            setSelected(null);
            req.reload();
          }}
        />
      )}
    </div>
  );
}
