// Browser calls stay on this origin; Next.js proxies to the local backend.
import {getAccessToken, getRefreshToken, setTokens, clearTokens, refreshSession} from './session';
export {getAccessToken, getRefreshToken, setTokens, clearTokens} from './session';
export const BASE_URL = '';
export class ApiError extends Error {
  constructor(public status: number, message: string) { super(message); this.name = 'ApiError'; }
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
async function readResponse<T>(response: Response): Promise<T> {
  if (response.status === 204) return undefined as T;
  const text = await response.text();
  let body;
  try { body = text ? JSON.parse(text) : undefined; } catch { body = undefined; }
  if (!response.ok) throw new ApiError(response.status, extractErrorMessage(body, response.status));
  return body as T;
}
export async function apiFetch<T>(path: string, options: RequestInit = {}, authenticated = true): Promise<T> {
  if (typeof window === 'undefined') return {} as T;
  const token = authenticated ? getAccessToken() : null;
  const headers = new Headers(options.headers);
  if (options.body && !(options.body instanceof FormData)) headers.set('Content-Type', 'application/json');
  if (token) headers.set('Authorization', `Bearer ${token}`);
  let response: Response;
  try { response = await fetch(`${BASE_URL}${path}`, {...options, headers, cache:'no-store'}); }
  catch { throw new ApiError(0, 'Cannot reach the local backend. Check that Cestos is running on port 8000, then retry.'); }
  if (response.status === 401 && authenticated) {
    if (await refreshSession(BASE_URL, token)) {
      headers.set('Authorization', `Bearer ${getAccessToken()}`);
      response = await fetch(`${BASE_URL}${path}`, {...options, headers, cache:'no-store'});
    }
    if (response.status === 401) {
      clearTokens();
      if (typeof window !== 'undefined') window.dispatchEvent(new Event('cestos:session-expired'));
    }
  }
  return readResponse<T>(response);
}

export async function apiFetchBlob(path: string, options: RequestInit = {}, authenticated = true): Promise<Blob> {
  const token = authenticated ? getAccessToken() : null;
  const headers = new Headers(options.headers);
  if (token) headers.set('Authorization', `Bearer ${token}`);
  let response: Response;
  try { response = await fetch(`${BASE_URL}${path}`, {...options, headers, cache:'no-store'}); }
  catch { throw new ApiError(0, 'Cannot reach the local backend. Check that Cestos is running on port 8000, then retry.'); }
  if (response.status === 401 && authenticated) {
    if (await refreshSession(BASE_URL, token)) {
      headers.set('Authorization', `Bearer ${getAccessToken()}`);
      response = await fetch(`${BASE_URL}${path}`, {...options, headers, cache:'no-store'});
    }
    if (response.status === 401) {
      clearTokens();
      if (typeof window !== 'undefined') window.dispatchEvent(new Event('cestos:session-expired'));
    }
  }
  if (!response.ok) {
    const text = await response.text().catch(() => '');
    let body;
    try { body = text ? JSON.parse(text) : undefined; } catch {}
    throw new ApiError(response.status, body?.error?.message || `Failed to fetch file (${response.status})`);
  }
  return response.blob();
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
  role?: string;
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
  [key: string]: unknown;
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
  [key: string]: unknown;
}

export interface ProjectOverview extends ProjectRead {
  employee_count?: number;
  asset_count?: number;
  site_count?: number;
  current_employees?: unknown[];
  current_assets?: unknown[];
  recent_assignments?: unknown[];
  sites?: unknown[];
  [key: string]: unknown;
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
  [key: string]: unknown;
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
  [key: string]: unknown;
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
  [key: string]: unknown;
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