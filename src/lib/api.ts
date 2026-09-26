// Browser calls stay on this origin; Next.js proxies to the configured backend.
import {getAccessToken, getRefreshToken, setTokens, clearTokens, refreshSession} from './session';
import { notifyOperationalDataUpdated } from './operationalDataSync';
import { cacheApiResponse, currentOfflineScope, enqueueOfflineWrite, listOfflineWrites, readCachedApiResponse, removeOfflineWrite, restoreOfflineBody, serializeOfflineBody, updateOfflineWrite, type OfflineWrite } from './offlineStore';
export {getAccessToken, getRefreshToken, setTokens, clearTokens} from './session';
export const BASE_URL = '';
export class ApiError extends Error {
  constructor(public status: number, message: string) { super(message); this.name = 'ApiError'; }
}
export class OfflineQueuedError extends ApiError {
  constructor(public queueId: string) { super(0, 'Cestos is unreachable. This change is saved on this device and will sync when the server is available.'); this.name = 'OfflineQueuedError'; }
}
type ApiFetchPolicy = { queueWhenOffline?: boolean; cacheOfflineRead?: boolean; cacheResponse?: boolean; memoryCache?: boolean };
type MemoryApiEntry = { value: unknown; savedAt: number };
const MEMORY_API_TTL_MS = 45_000;
const MEMORY_CACHE_INVALIDATED_EVENT = 'cestos:api-cache-invalidated';
const MEMORY_CACHE_CHANNEL = 'cestos-api-cache-invalidation';
const memoryApiCache = new Map<string, MemoryApiEntry>();
let invalidationChannel: BroadcastChannel | null = null;
let cacheInvalidationConfigured = false;

function memoryCacheKey(path: string, token = getAccessToken()) { return `${token || 'anonymous'}::${path}`; }

export function peekMemoryApiResponse<T>(path: string, authenticated = true): T | undefined {
  if (typeof window === 'undefined') return undefined;
  return memoryApiCache.get(memoryCacheKey(path, authenticated ? getAccessToken() : null))?.value as T | undefined;
}

function setupCacheInvalidation() {
  if (typeof window === 'undefined' || cacheInvalidationConfigured) return;
  cacheInvalidationConfigured = true;
  try {
    if ('BroadcastChannel' in window) {
      invalidationChannel = new BroadcastChannel(MEMORY_CACHE_CHANNEL);
      invalidationChannel.onmessage = () => { memoryApiCache.clear(); window.dispatchEvent(new Event(MEMORY_CACHE_INVALIDATED_EVENT)); };
    }
  } catch { /* In-tab invalidation still works. */ }
  window.addEventListener('cestos:session-expired', () => memoryApiCache.clear());
}

export function invalidateMemoryApiCache() {
  memoryApiCache.clear();
  if (typeof window === 'undefined') return;
  setupCacheInvalidation();
  window.dispatchEvent(new Event(MEMORY_CACHE_INVALIDATED_EVENT));
  try { invalidationChannel?.postMessage({ changedAt: Date.now() }); } catch { /* Cache will revalidate when its short lifetime expires. */ }
}
let backendHealthCheckedAt = 0;
let backendIsReachable = false;
let backendHealthCheck: Promise<boolean> | null = null;

async function checkApiBackend(force = false): Promise<boolean> {
  if (!force && Date.now() - backendHealthCheckedAt < 8_000) return backendIsReachable;
  if (backendHealthCheck) return backendHealthCheck;
  const controller = new AbortController();
  const timeout = window.setTimeout(() => controller.abort(), 4_000);
  backendHealthCheck = fetch(`${BASE_URL}/api/v1/health`, { method: 'GET', cache: 'no-store', signal: controller.signal })
    // Any HTTP response proves the API is reachable. A missing health route
    // must not make login or other online requests enter the offline queue.
    .then((response) => response.status < 500)
    .catch(() => false)
    .then((reachable) => {
      backendIsReachable = reachable;
      backendHealthCheckedAt = Date.now();
      if (typeof window !== 'undefined') window.dispatchEvent(new CustomEvent('cestos:backend-connectivity-changed', { detail: { reachable } }));
      return reachable;
    })
    .finally(() => { window.clearTimeout(timeout); backendHealthCheck = null; });
  return backendHealthCheck;
}

async function enqueueRequest(path: string, options: RequestInit, method: string, authenticated: boolean, scope: string | null): Promise<never> {
  if (!authenticated || /\/auth\/(login|refresh|logout|password-reset|reset-password)/i.test(path)) {
    throw new ApiError(0, 'This action needs an active internet connection and cannot be queued safely.');
  }
  const body = serializeOfflineBody(options.body);
  const token = getAccessToken();
  if (!body || !scope || !token) throw new ApiError(0, 'Cestos is unreachable and this request cannot be safely stored for later sync.');
  const id = typeof crypto !== 'undefined' && 'randomUUID' in crypto ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(16).slice(2)}`;
  const headers = new Headers(options.headers);
  headers.delete('authorization');
  headers.delete('content-type');
  headers.delete('content-length');
  const write: OfflineWrite = { id, scope, path, method, authenticated, headers: [...headers.entries()], ...body, createdAt: Date.now(), state: 'pending', attempts: 0 };
  try { await enqueueOfflineWrite(write); }
  catch { throw new ApiError(0, 'Cestos is unreachable, and this device could not store the request. Keep the form open and try again when storage is available.'); }
  throw new OfflineQueuedError(id);
}
// Extracts a human-readable message from DRF/FastAPI style error/validation bodies.
function extractErrorMessage(body: any, status: number): string {
  if (body?.error?.message) {
    const details = body.error.details ?? body.error.errors;
    if (Array.isArray(details) && details.length) {
      const msgs = details
        .map((d: any) => (d?.loc ? `${d.loc[d.loc.length - 1]}: ${d.msg}` : d?.msg))
        .filter(Boolean);
      if (msgs.length) return `${body.error.message}: ${msgs.join('; ')}`;
    }
    return body.error.message;
  }
  if (typeof body?.detail === 'string') return body.detail;
  if (Array.isArray(body?.detail)) {
    const msgs = body.detail
      .map((d: any) => (d?.loc ? `${d.loc[d.loc.length - 1]}: ${d.msg}` : d?.msg))
      .filter(Boolean);
    if (msgs.length) return msgs.join('; ');
  }
  if (body && typeof body === 'object' && !Array.isArray(body)) {
    const fieldMsgs = Object.entries(body)
      .filter(([, v]) => Array.isArray(v) || typeof v === 'string')
      .map(([k, v]) => `${k}: ${Array.isArray(v) ? v.join(', ') : v}`);
    if (fieldMsgs.length) return fieldMsgs.join('; ');
  }
  return `Request failed (${status}). Please retry.`;
}
export function handleSessionExpired() {
  clearTokens();
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new Event('cestos:session-expired'));
    if (!window.location.pathname.startsWith('/sign-up-login')) {
      window.location.href = '/sign-up-login';
    }
  }
}

async function readResponse<T>(response: Response): Promise<T> {
  if (response.status === 204) return undefined as T;
  const text = await response.text();
  let body;
  try { body = text ? JSON.parse(text) : undefined; } catch { body = undefined; }
  if (!response.ok) {
    const message = extractErrorMessage(body, response.status);
    if (/bearer\s*token\s*required/i.test(message) || response.status === 401) {
      handleSessionExpired();
    }
    throw new ApiError(response.status, message);
  }
  return body as T;
}
export async function apiFetch<T>(path: string, options: RequestInit = {}, authenticated = true, policy: ApiFetchPolicy = {}): Promise<T> {
  if (typeof window === 'undefined') return {} as T;
  const method = (options.method || 'GET').toUpperCase();
  const isRead = method === 'GET' || method === 'HEAD';
  const token = authenticated ? getAccessToken() : null;
  setupCacheInvalidation();
  const cacheKey = memoryCacheKey(path, token);
  const memoryCacheable = isRead && policy.memoryCache !== false && policy.cacheResponse !== false && !/\/notifications(?:\/|$)/i.test(path);
  const memoryEntry = memoryCacheable ? memoryApiCache.get(cacheKey) : undefined;
  if (memoryEntry && (Date.now() - memoryEntry.savedAt < MEMORY_API_TTL_MS || navigator.onLine === false)) return memoryEntry.value as T;
  const offlineScope = await currentOfflineScope(token);
  if (isRead && navigator.onLine === false) {
    if (policy.cacheOfflineRead !== false && offlineScope) {
      const cached = await readCachedApiResponse<T>(offlineScope, path);
      if (cached !== undefined) return cached;
    }
    throw new ApiError(0, 'This information is not available offline yet. Open it while connected, then it will be available on this device.');
  }
  if (!isRead && policy.queueWhenOffline !== false && (navigator.onLine === false || !(await checkApiBackend()))) {
    return enqueueRequest(path, options, method, authenticated, offlineScope);
  }
  const headers = new Headers(options.headers);
  if (options.body && !(options.body instanceof FormData)) headers.set('Content-Type', 'application/json');
  if (token) headers.set('Authorization', `Bearer ${token}`);
  let response: Response;
  try { response = await fetch(`${BASE_URL}${path}`, {...options, headers, cache:'no-store'}); }
  catch {
    if (isRead && memoryEntry) return memoryEntry.value as T;
    if (isRead && policy.cacheOfflineRead !== false && offlineScope) {
      const cached = await readCachedApiResponse<T>(offlineScope, path);
      if (cached !== undefined) return cached;
    }
    if (!isRead && policy.queueWhenOffline !== false && !(await checkApiBackend(true))) {
      return enqueueRequest(path, options, method, authenticated, offlineScope);
    }
    throw new ApiError(0, 'Cannot reach the server. Check your connection and try again.');
  }
  if (response.status === 401 && authenticated) {
    if (await refreshSession(BASE_URL, token)) {
      headers.set('Authorization', `Bearer ${getAccessToken()}`);
      response = await fetch(`${BASE_URL}${path}`, {...options, headers, cache:'no-store'});
    }
    if (response.status === 401) {
      handleSessionExpired();
    }
  }
  if (isRead && response.status >= 500 && policy.cacheOfflineRead !== false && offlineScope && !(await checkApiBackend(true))) {
    const cached = await readCachedApiResponse<T>(offlineScope, path);
    if (cached !== undefined) return cached;
  }
  if (!isRead && policy.queueWhenOffline !== false && response.status >= 500 && !(await checkApiBackend(true))) {
    return enqueueRequest(path, options, method, authenticated, offlineScope);
  }
  const result = await readResponse<T>(response);
  if (memoryCacheable && policy.cacheResponse !== false && response.headers.get('content-type')?.includes('application/json')) {
    memoryApiCache.set(memoryCacheKey(path, authenticated ? getAccessToken() : null), { value: result, savedAt: Date.now() });
  }
  if (!isRead && method !== 'OPTIONS') invalidateMemoryApiCache();
  if (isRead && policy.cacheResponse !== false && response.headers.get('content-type')?.includes('application/json') && offlineScope) {
    await cacheApiResponse(offlineScope, path, result);
  }
  if (method !== 'GET' && method !== 'HEAD' && method !== 'OPTIONS') {
    const route = path.split('?')[0];
    if (route.startsWith('/api/v1/procurement/purchase-orders')) {
      notifyOperationalDataUpdated('purchase_orders');
    }
    if (route.startsWith('/api/v1/operational-expenses')) {
      notifyOperationalDataUpdated('expenses');
      // Expense creation and payments are reflected on the linked PO tables too.
      notifyOperationalDataUpdated('purchase_orders');
    }
  }
  return result;
}

export async function getOfflineWriteQueue(): Promise<OfflineWrite[]> {
  const scope = await currentOfflineScope(getAccessToken());
  return scope ? listOfflineWrites(scope) : [];
}

export async function discardOfflineWrite(id: string): Promise<void> { await removeOfflineWrite(id); }

export async function retryOfflineWrite(id: string): Promise<void> {
  const rows = await getOfflineWriteQueue();
  const row = rows.find((entry) => entry.id === id);
  if (row) await updateOfflineWrite({ ...row, state: 'pending', error: undefined });
}

let offlineSync: Promise<void> | null = null;
export async function syncOfflineWriteQueue(): Promise<void> {
  if (typeof window === 'undefined' || navigator.onLine === false || offlineSync) return offlineSync || undefined;
  const token = getAccessToken();
  const scope = await currentOfflineScope(token);
  if (!scope) return;
  if (!(await checkApiBackend())) return;
  const sync = async () => {
    const rows = await listOfflineWrites(scope);
    for (const row of rows) {
      if (navigator.onLine === false || row.state === 'failed') break;
      try {
        const headers = new Headers(row.headers);
        const body = restoreOfflineBody(row);
        await apiFetch(row.path, { method: row.method, headers, body }, row.authenticated, { queueWhenOffline: false, cacheOfflineRead: false, cacheResponse: false });
        await removeOfflineWrite(row.id);
        window.dispatchEvent(new CustomEvent('cestos:offline-write-synced', { detail: { id: row.id, path: row.path } }));
      } catch (error) {
        const reachable = await checkApiBackend(true);
        const current: OfflineWrite = {
          ...row,
          attempts: row.attempts + 1,
          state: reachable ? 'failed' : 'pending',
          error: error instanceof Error ? error.message : 'Sync failed.',
        };
        await updateOfflineWrite(current);
        break;
      }
    }
  };
  offlineSync = ('locks' in navigator && navigator.locks)
    ? navigator.locks.request('cestos-offline-write-sync', async () => { await sync(); }).then(() => undefined)
    : sync();
  try { await offlineSync; } finally { offlineSync = null; }
}

export async function apiFetchBlob(path: string, options: RequestInit = {}, authenticated = true): Promise<Blob> {
  const token = authenticated ? getAccessToken() : null;
  const method = (options.method || 'GET').toUpperCase();
  const offlineScope = await currentOfflineScope(token);
  const cachedFile = () => method === 'GET' && offlineScope ? readCachedApiResponse<Blob>(offlineScope, path) : Promise.resolve(undefined);
  if (method === 'GET' && navigator.onLine === false) {
    const cached = await cachedFile();
    if (cached) return cached;
    throw new ApiError(0, 'This file has not been opened on this device and is unavailable offline.');
  }
  const headers = new Headers(options.headers);
  if (token) headers.set('Authorization', `Bearer ${token}`);
  let response: Response;
  try { response = await fetch(`${BASE_URL}${path}`, {...options, headers, cache:'no-store'}); }
  catch {
    const cached = await cachedFile();
    if (cached) return cached;
    throw new ApiError(0, 'Cannot reach the server. Check your connection and try again.');
  }
  if (response.status === 401 && authenticated) {
    if (await refreshSession(BASE_URL, token)) {
      headers.set('Authorization', `Bearer ${getAccessToken()}`);
      response = await fetch(`${BASE_URL}${path}`, {...options, headers, cache:'no-store'});
    }
    if (response.status === 401) {
      handleSessionExpired();
    }
  }
  if (!response.ok) {
    if (method === 'GET' && response.status >= 500 && !(await checkApiBackend(true))) {
      const cached = await cachedFile();
      if (cached) return cached;
    }
    const text = await response.text().catch(() => '');
    let body;
    try { body = text ? JSON.parse(text) : undefined; } catch {}
    const message = extractErrorMessage(body, response.status);
    if (/bearer\s*token\s*required/i.test(message) || response.status === 401) {
      handleSessionExpired();
    }
    throw new ApiError(response.status, message || `Failed to fetch file (${response.status})`);
  }
  const blob = await response.blob();
  if (method === 'GET' && offlineScope) await cacheApiResponse(offlineScope, path, blob);
  return blob;
}

export function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 5000);
}
// ─── Auth ────────────────────────────────────────────────────────────────────

export interface LoginRequest {
  organization_id: string;
  email: string;
  password: string;
}

export interface TokenResponse {
  access_token: string;
  refresh_token: string;
  token_type: string;
}

export interface UserRead {
  id: string;
  email: string;
  full_name?: string;
  first_name?: string;
  last_name?: string;
  is_active: boolean;
  is_superuser?: boolean;
  is_field_portal_only?: boolean;
  portal_type?: string;
  role?: string;
  roles?: any[];
}

export async function login(data: LoginRequest): Promise<TokenResponse> {
  return apiFetch<TokenResponse>('/api/v1/auth/login', {
    method: 'POST',
    body: JSON.stringify(data),
  }, false);
}

export async function getMe(): Promise<UserRead> {
  return apiFetch<UserRead>('/api/v1/auth/me');
}

export async function logout(): Promise<void> {
  const refresh_token = getRefreshToken();
  clearTokens();
  if (refresh_token) await apiFetch('/api/v1/auth/logout', {method:'POST', body:JSON.stringify({refresh_token})}, false);
}

// ─── Operations / Dashboard ──────────────────────────────────────────────────

export interface OperationsSummary {
  employees?: {
    total: number;
    active: number;
    assigned: number;
    unassigned: number;
  };
  projects?: {
    total: number;
    active: number;
    planning: number;
    paused: number;
  };
  assets?: {
    total: number;
    operating: number;
    available: number;
    maintenance: number;
    breakdown: number;
    unassigned: number;
  };
  active_projects?: number;
  active_employees?: number;
  operating_assets?: number;
  available_employees?: number;
  available_assets?: number;
  breakdowns?: number;
  critical_defects?: number;
  expiring_employee_documents?: number;
  expiring_equipment_registrations?: number;
  critical_stock_items?: number;
  pending_inventory_requests?: number;
  [key: string]: any;
}

export async function getOperationsSummary(params?: Record<string, string>): Promise<OperationsSummary> {
  const qs = params ? '?' + new URLSearchParams(params).toString() : '';
  return apiFetch<OperationsSummary>(`/api/v1/operations/summary${qs}`);
}

export function getDateRangeFromPreset(preset: string): { dateFrom: string; dateTo: string } {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth();

  const formatDate = (d: Date) => {
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
  };

  switch (preset) {
    case 'today':
      return { dateFrom: formatDate(now), dateTo: formatDate(now) };
    case 'this_week': {
      const dayOfWeek = now.getDay();
      const diffToMonday = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
      const monday = new Date(now);
      monday.setDate(now.getDate() + diffToMonday);
      return { dateFrom: formatDate(monday), dateTo: formatDate(now) };
    }
    case 'this_month': {
      const firstOfMonth = new Date(year, month, 1);
      return { dateFrom: formatDate(firstOfMonth), dateTo: formatDate(now) };
    }
    case 'this_quarter': {
      const quarterMonth = Math.floor(month / 3) * 3;
      const startOfQuarter = new Date(year, quarterMonth, 1);
      return { dateFrom: formatDate(startOfQuarter), dateTo: formatDate(now) };
    }
    case 'ytd': {
      const startOfYear = new Date(year, 0, 1);
      return { dateFrom: formatDate(startOfYear), dateTo: formatDate(now) };
    }
    case 'all_time':
    default:
      return { dateFrom: '', dateTo: '' };
  }
}

// ─── Projects ────────────────────────────────────────────────────────────────

export interface ProjectRead {
  id: string;
  project_number?: string;
  name: string;
  status?: string;
  client?: { id: string; name: string };
  project_manager?: { id: string; full_name?: string; first_name?: string; last_name?: string };
  start_date?: string;
  end_date?: string;
  location?: string;
  [key: string]: any;
}

export interface ProjectOverview extends ProjectRead {
  employee_count?: number;
  asset_count?: number;
  site_count?: number;
  current_employees?: unknown[];
  current_assets?: unknown[];
  recent_assignments?: unknown[];
  sites?: unknown[];
  [key: string]: any;
}

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  page_size: number;
  pages?: number;
}

export async function getProjects(params?: Record<string, string>): Promise<PaginatedResponse<ProjectRead>> {
  const qs = params ? '?' + new URLSearchParams(params).toString() : '';
  return apiFetch<PaginatedResponse<ProjectRead>>(`/api/v1/projects${qs}`);
}

export async function getProjectOverview(projectId: string): Promise<ProjectOverview> {
  return apiFetch<ProjectOverview>(`/api/v1/projects/${projectId}/overview`);
}

export async function getProjectManpowerSummary(projectId: string): Promise<unknown> {
  return apiFetch(`/api/v1/projects/${projectId}/manpower-summary`);
}

export async function getProjectEquipmentSummary(projectId: string): Promise<unknown> {
  return apiFetch(`/api/v1/projects/${projectId}/equipment-summary`);
}

export async function getProjectInventorySummary(projectId: string): Promise<unknown> {
  return apiFetch(`/api/v1/projects/${projectId}/inventory-summary`);
}

// ─── Workforce / Employees ───────────────────────────────────────────────────

export interface WorkforceDashboard {
  total_employees?: number;
  active_employees?: number;
  assigned_employees?: number;
  available_employees?: number;
  off_rotation?: number;
  on_leave?: number;
  inactive_employees?: number;
  by_department?: { department: string; count: number }[];
  by_project?: { project: string; count: number }[];
  [key: string]: any;
}

export async function getWorkforceDashboard(params?: Record<string, string>): Promise<WorkforceDashboard> {
  const qs = params ? '?' + new URLSearchParams(params).toString() : '';
  return apiFetch<WorkforceDashboard>(`/api/v1/employees/dashboard-summary${qs}`);
}

export async function getUpcomingRotations(days = 14): Promise<unknown[]> {
  return apiFetch<unknown[]>(`/api/v1/rotations/upcoming?days=${days}`);
}

export async function getExpiringTraining(days = 30): Promise<unknown[]> {
  return apiFetch<unknown[]>(`/api/v1/training/expiring?days=${days}`);
}

export async function getExpiringLicenses(days = 30): Promise<unknown[]> {
  return apiFetch<unknown[]>(`/api/v1/employee-licenses/expiring?days=${days}`);
}

export async function getExpiringEmployeeDocuments(days = 30): Promise<unknown[]> {
  return apiFetch<unknown[]>(`/api/v1/employee-documents/expiring?days=${days}`);
}

export async function getEmployees(params?: Record<string, string>): Promise<PaginatedResponse<unknown>> {
  const qs = params ? '?' + new URLSearchParams(params).toString() : '';
  return apiFetch<PaginatedResponse<unknown>>(`/api/v1/employees${qs}`);
}

// ─── Equipment / Assets ──────────────────────────────────────────────────────

export interface FleetDashboard {
  total?: number;
  total_assets?: number;
  operating?: number;
  operating_assets?: number;
  available?: number;
  available_assets?: number;
  standby?: number;
  standby_assets?: number;
  breakdown?: number;
  breakdown_assets?: number;
  under_maintenance?: number;
  maintenance_assets?: number;
  out_of_service?: number;
  out_of_service_assets?: number;
  critical_defects?: number;
  critical_open_defects?: number;
  expiring_insurance?: number;
  expiring_registrations?: number;
  expiring_documents?: number;
  stale_meter_readings?: number;
  assets_without_recent_meter_reading?: number;
  by_project?: { project: string; count: number }[];
  assets_by_project?: Record<string, number> | { project: string; count: number }[];
  assets?: Record<string, any>[];
  [key: string]: any;
}

export async function getFleetDashboard(params?: Record<string, string>): Promise<FleetDashboard> {
  const qs = params ? '?' + new URLSearchParams(params).toString() : '';
  return apiFetch<FleetDashboard>(`/api/v1/assets/dashboard-summary${qs}`);
}

export async function getAssets(params?: Record<string, string>): Promise<PaginatedResponse<unknown>> {
  const qs = params ? '?' + new URLSearchParams(params).toString() : '';
  return apiFetch<PaginatedResponse<unknown>>(`/api/v1/assets${qs}`);
}

export async function getFuelSuppliers(): Promise<{ id: string; name: string }[]> {
  return apiFetch<{ id: string; name: string }[]>('/api/v1/fuel-suppliers');
}

export async function uploadLogFile(assetId: string, logType: string, logId: string, title: string, file: File): Promise<unknown> {
  const fd = new FormData();
  fd.append('title', title);
  fd.append('file', file);
  return apiFetch(`/api/v1/assets/${assetId}/logs/${logType}/${logId}/files`, {
    method: 'POST',
    body: fd,
  });
}

export async function getLogFiles(assetId: string, logType: string, logId: string): Promise<unknown[]> {
  return apiFetch<unknown[]>(`/api/v1/assets/${assetId}/logs/${logType}/${logId}/files`);
}

export async function downloadLogFile(assetId: string, fileId: string, filename: string): Promise<void> {
  const blob = await apiFetchBlob(`/api/v1/assets/${assetId}/log-files/${fileId}/download`);
  downloadBlob(blob, filename);
}

export async function getAssignmentSummary(assetId: string, assignmentId: string): Promise<unknown> {
  return apiFetch(`/api/v1/assets/${assetId}/assignments/${assignmentId}/summary`);
}

// ─── Inventory ───────────────────────────────────────────────────────────────

export interface InventoryDashboard {
  total_inventory_value?: number | string;
  total_value?: number | string;
  low_stock_items?: number;
  low_stock_count?: number;
  out_of_stock_items?: number;
  out_of_stock_count?: number;
  critical_stock_items?: number;
  critical_stock_count?: number;
  pending_requests?: number;
  in_transit_transfers?: number;
  quarantined_items?: number;
  quarantined_count?: number;
  items_requiring_reorder?: number;
  reorder_required?: number;
  recent_transactions?: unknown[];
  [key: string]: any;
}

export async function getInventoryDashboard(params?: Record<string, string>): Promise<InventoryDashboard> {
  const qs = params ? '?' + new URLSearchParams(params).toString() : '';
  return apiFetch<InventoryDashboard>(`/api/v1/inventory/dashboard-summary${qs}`);
}

export async function getInventoryTransactions(params?: Record<string, string>): Promise<PaginatedResponse<unknown>> {
  const qs = params ? '?' + new URLSearchParams(params).toString() : '';
  return apiFetch<PaginatedResponse<unknown>>(`/api/v1/inventory/transactions${qs}`);
}

export async function getLowStockItems(params?: Record<string, string>): Promise<unknown[]> {
  const qs = params ? '?' + new URLSearchParams(params).toString() : '';
  return apiFetch<unknown[]>(`/api/v1/inventory/low-stock${qs}`);
}

export async function getCriticalStockItems(params?: Record<string, string>): Promise<unknown[]> {
  const qs = params ? '?' + new URLSearchParams(params).toString() : '';
  return apiFetch<unknown[]>(`/api/v1/inventory/critical-stock${qs}`);
}

// ─── Phase 1: Drilling Operations ───────────────────────────────────────────

export interface DrillingProgramRead {
  id: string;
  organization_id: string;
  project_id: string;
  program_name: string;
  name?: string;
  program_code?: string;
  drilling_type: string;
  target_metres: number;
  drilled_metres: number;
  status: string;
  created_at: string;
  [key: string]: any;
}

export interface DrillHoleRead {
  id: string;
  organization_id: string;
  program_id: string;
  hole_number: string;
  target_depth_m: number;
  final_depth_m: number;
  dip_deg?: number;
  azimuth_deg?: number;
  status: string;
  created_at: string;
  [key: string]: any;
}

export interface DrillingShiftReportRead {
  id: string;
  organization_id: string;
  rig_id: string;
  project_id: string;
  hole_id?: string;
  shift_date: string;
  shift_type: string;
  shift_number: string;
  status: string;
  start_depth_m?: number;
  end_depth_m?: number;
  metres_drilled?: number;
  total_metres_drilled: number;
  core_recovery_pct: number;
  productive_hours: number;
  standby_hours: number;
  maintenance_hours: number;
  intervals?: any[];
  time_segments?: any[];
  crew_members?: any[];
  created_at: string;
  [key: string]: any;
}

export async function getDrillingPrograms(params?: Record<string, string>): Promise<DrillingProgramRead[]> {
  const qs = params ? '?' + new URLSearchParams(params).toString() : '';
  return apiFetch<DrillingProgramRead[]>(`/api/v1/drilling/programs${qs}`);
}

export async function createDrillingProgram(data: Record<string, any>): Promise<DrillingProgramRead> {
  return apiFetch<DrillingProgramRead>('/api/v1/drilling/programs', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function getDrillHoles(params?: Record<string, string>): Promise<DrillHoleRead[]> {
  const qs = params ? '?' + new URLSearchParams(params).toString() : '';
  return apiFetch<DrillHoleRead[]>(`/api/v1/drilling/holes${qs}`);
}

export async function createDrillHole(programId: string, data: Record<string, any>): Promise<DrillHoleRead> {
  return apiFetch<DrillHoleRead>(`/api/v1/drilling/programs/${programId}/holes`, {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function getDrillingShifts(params?: Record<string, string>): Promise<DrillingShiftReportRead[]> {
  const qs = params ? '?' + new URLSearchParams(params).toString() : '';
  return apiFetch<DrillingShiftReportRead[]>(`/api/v1/drilling/shifts${qs}`);
}

export async function createDrillingShift(data: Record<string, any>): Promise<DrillingShiftReportRead> {
  return apiFetch<DrillingShiftReportRead>('/api/v1/drilling/shifts', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function submitDrillingShift(shiftId: string): Promise<DrillingShiftReportRead> {
  return apiFetch<DrillingShiftReportRead>(`/api/v1/drilling/shifts/${shiftId}/submit`, { method: 'POST' });
}

export async function approveDrillingShift(shiftId: string): Promise<DrillingShiftReportRead> {
  return apiFetch<DrillingShiftReportRead>(`/api/v1/drilling/shifts/${shiftId}/approve`, { method: 'POST' });
}

export async function updateDrillingShift(shiftId: string, data: Record<string, any>): Promise<DrillingShiftReportRead> {
  return apiFetch<DrillingShiftReportRead>(`/api/v1/drilling/shifts/${shiftId}`, {
    method: 'PATCH',
    body: JSON.stringify(data),
  });
}

export async function deleteDrillingShift(shiftId: string): Promise<void> {
  return apiFetch<void>(`/api/v1/drilling/shifts/${shiftId}`, { method: 'DELETE' });
}

// ─── Phase 2: Commercial & Contracts ────────────────────────────────────────

export interface ProjectContractRead {
  id: string;
  project_id: string;
  contract_name: string;
  contract_number: string;
  status: string;
  currency: string;
  start_date?: string;
  end_date?: string;
  notes?: string;
  total_contract_value?: number;
  attachments?: { name: string; url: string }[];
  rate_cards?: any[];
  [key: string]: any;
}

export interface CostSubledgerRead {
  id: string;
  project_id?: string;
  rig_id?: string;
  cost_category: string;
  description: string;
  amount: number;
  currency: string;
  created_at: string;
  [key: string]: any;
}

export interface RevenueSubledgerRead {
  id: string;
  project_id?: string;
  rig_id?: string;
  category: string;
  total_revenue_base: number;
  amount?: number;
  currency: string;
  description?: string;
  entry_date?: string;
  created_at: string;
  [key: string]: any;
}

export async function getProjectContracts(params?: Record<string, string>): Promise<ProjectContractRead[]> {
  const qs = params ? '?' + new URLSearchParams(params).toString() : '';
  return apiFetch<ProjectContractRead[]>(`/api/v1/commercial/contracts${qs}`);
}

export async function createProjectContract(data: Record<string, any>): Promise<ProjectContractRead> {
  return apiFetch<ProjectContractRead>('/api/v1/commercial/contracts', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function updateProjectContract(id: string, data: Record<string, any>): Promise<ProjectContractRead> {
  return apiFetch<ProjectContractRead>(`/api/v1/commercial/contracts/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(data),
  });
}

export async function deleteProjectContract(id: string): Promise<void> {
  return apiFetch<void>(`/api/v1/commercial/contracts/${id}`, { method: 'DELETE' });
}

export async function getProjectFinancials(projectId: string): Promise<unknown> {
  return apiFetch(`/api/v1/commercial/projects/${projectId}/financials`);
}

export async function getRigPerformance(rigId: string): Promise<unknown> {
  return apiFetch(`/api/v1/commercial/rigs/${rigId}/performance`);
}

// ─── Phase 3: Maintenance Reliability & HSE ─────────────────────────────────

export interface MaintenanceWorkOrderRead {
  id: string;
  wo_number: string;
  asset_id: string;
  project_id?: string;
  title: string;
  description?: string;
  work_type: string;
  priority: string;
  status: string;
  failure_taxonomy?: string;
  downtime_hours?: number;
  estimated_lost_contribution?: number;
  cost_lines?: any[];
  created_at: string;
  [key: string]: unknown;
}

export interface HseIncidentRead {
  id: string;
  incident_number: string;
  incident_type: string;
  severity: string;
  project_id?: string;
  asset_id?: string;
  title: string;
  description?: string;
  status: string;
  occurred_at: string;
  actions?: any[];
  [key: string]: unknown;
}

export interface HseActionRead {
  id: string;
  action_number: string;
  incident_id: string;
  assigned_to_id?: string;
  title: string;
  status: string;
  due_date: string;
  [key: string]: unknown;
}

export async function getMaintenanceWorkOrders(params?: Record<string, string>): Promise<MaintenanceWorkOrderRead[]> {
  const qs = params ? '?' + new URLSearchParams(params).toString() : '';
  return apiFetch<MaintenanceWorkOrderRead[]>(`/api/v1/maintenance/work-orders${qs}`);
}

export async function createMaintenanceWorkOrder(data: Record<string, any>): Promise<MaintenanceWorkOrderRead> {
  return apiFetch<MaintenanceWorkOrderRead>('/api/v1/maintenance/work-orders', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function completeMaintenanceWorkOrder(woId: string, data: Record<string, any>): Promise<MaintenanceWorkOrderRead> {
  return apiFetch<MaintenanceWorkOrderRead>(`/api/v1/maintenance/work-orders/${woId}/complete`, {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function getAssetReliability(assetId: string): Promise<unknown> {
  return apiFetch(`/api/v1/maintenance/assets/${assetId}/reliability`);
}

export async function getHseIncidents(params?: Record<string, string>): Promise<HseIncidentRead[]> {
  const qs = params ? '?' + new URLSearchParams(params).toString() : '';
  return apiFetch<HseIncidentRead[]>(`/api/v1/hse/incidents${qs}`);
}

export async function createHseIncident(data: Record<string, any>): Promise<HseIncidentRead> {
  return apiFetch<HseIncidentRead>('/api/v1/hse/incidents', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function createHseAction(incidentId: string, data: Record<string, any>): Promise<HseActionRead> {
  return apiFetch<HseActionRead>(`/api/v1/hse/incidents/${incidentId}/actions`, {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

// ─── Phase 4: Procurement & Purchase Orders ──────────────────────────────────

export interface PurchaseOrderRead {
  id: string;
  po_number: string;
  supplier_id: string;
  project_id?: string;
  category?: string | null;
  status: string;
  total_amount: number;
  currency: string;
  created_by_name?: string | null;
  notes?: string;
  items?: any[];
  created_at: string;
  [key: string]: unknown;
}

export async function getPurchaseOrders(params?: Record<string, string>): Promise<PurchaseOrderRead[]> {
  const qs = params ? '?' + new URLSearchParams(params).toString() : '';
  return apiFetch<PurchaseOrderRead[]>(`/api/v1/procurement/purchase-orders${qs}`);
}

export async function createPurchaseOrder(data: Record<string, any>): Promise<PurchaseOrderRead> {
  return apiFetch<PurchaseOrderRead>('/api/v1/procurement/purchase-orders', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function receivePurchaseOrderGoods(poId: string, itemReceipts: Record<string, number>): Promise<PurchaseOrderRead> {
  return apiFetch<PurchaseOrderRead>(`/api/v1/procurement/purchase-orders/${poId}/receive`, {
    method: 'POST',
    body: JSON.stringify({ item_receipts: itemReceipts }),
  });
}

// ─── Phases 5 & 6: CEO Control Tower, Scorecards & Client Portal ─────────────

export interface CeoControlTowerSummary {
  company_name: string;
  total_projects: number;
  active_rigs: number;
  total_revenue: number;
  total_direct_cost: number;
  net_contribution: number;
  contribution_margin_pct: number;
  total_metres_drilled: number;
  avg_asset_availability_pct: number;
  active_work_orders: number;
  open_hse_incidents: number;
  project_summaries: any[];
  [key: string]: unknown;
}

export interface SupervisorScorecardRead {
  id: string;
  scorecard_number: string;
  supervisor_id: string;
  supervisor_name?: string;
  supervisor?: { id: string; first_name?: string; last_name?: string; full_name?: string; job_title?: string };
  project_id?: string;
  period_start: string;
  period_end: string;
  production_score: number;
  rig_condition_score: number;
  downtime_score: number;
  hse_score: number;
  consumables_score: number;
  crew_management_score: number;
  reporting_score: number;
  stewardship_score: number;
  overall_weighted_score: number;
  grade: string;
  notes?: string;
  created_at: string;
  [key: string]: unknown;
}

export interface CommercialOpportunityRead {
  id: string;
  opportunity_number: string;
  client_id: string;
  title: string;
  tender_stage: string;
  win_probability_pct: number;
  estimated_value: number;
  currency: string;
  expected_close_date?: string;
  notes?: string;
  attachment_name?: string;
  attachment_url?: string;
  created_at: string;
  [key: string]: unknown;
}

export async function getCeoControlTowerSummary(): Promise<CeoControlTowerSummary> {
  return apiFetch<CeoControlTowerSummary>('/api/v1/control-tower/summary');
}

export async function getSupervisorScorecards(params?: Record<string, string>): Promise<SupervisorScorecardRead[]> {
  const qs = params ? '?' + new URLSearchParams(params).toString() : '';
  return apiFetch<SupervisorScorecardRead[]>(`/api/v1/control-tower/scorecards${qs}`);
}

export async function createSupervisorScorecard(data: Record<string, any>): Promise<SupervisorScorecardRead> {
  return apiFetch<SupervisorScorecardRead>('/api/v1/control-tower/scorecards', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function getCommercialOpportunities(params?: Record<string, string>): Promise<CommercialOpportunityRead[]> {
  const qs = params ? '?' + new URLSearchParams(params).toString() : '';
  return apiFetch<CommercialOpportunityRead[]>(`/api/v1/control-tower/opportunities${qs}`);
}

export async function createCommercialOpportunity(data: Record<string, any>): Promise<CommercialOpportunityRead> {
  return apiFetch<CommercialOpportunityRead>('/api/v1/control-tower/opportunities', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function updateCommercialOpportunity(id: string, data: Record<string, any>): Promise<CommercialOpportunityRead> {
  return apiFetch<CommercialOpportunityRead>(`/api/v1/control-tower/opportunities/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(data),
  });
}

export async function grantClientProjectAccess(data: { client_id: string; project_id: string }): Promise<unknown> {
  return apiFetch('/api/v1/control-tower/client-grants', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function publishClientArtifact(data: Record<string, any>): Promise<unknown> {
  return apiFetch('/api/v1/control-tower/publish', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function getClientPortalOverview(clientId: string, projectId: string): Promise<unknown> {
  return apiFetch(`/api/v1/control-tower/client-portal/${clientId}/${projectId}`);
}
