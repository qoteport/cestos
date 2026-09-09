// Centralized API client for Cestos Operations
const BASE_URL = 'https://cestos-oversight.fly.dev';

// ─── Token Management ────────────────────────────────────────────────────────

export function getAccessToken(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('cestos_access_token');
}

export function setTokens(access: string, refresh: string) {
  localStorage.setItem('cestos_access_token', access);
  localStorage.setItem('cestos_refresh_token', refresh);
}

export function clearTokens() {
  localStorage.removeItem('cestos_access_token');
  localStorage.removeItem('cestos_refresh_token');
}

export function getRefreshToken(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('cestos_refresh_token');
}

// ─── Core Fetch ──────────────────────────────────────────────────────────────

async function apiFetch<T>(path: string, options: RequestInit = {}): Promise<T> {
  const token = getAccessToken();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>),
  };
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const res = await fetch(`${BASE_URL}${path}`, { ...options, headers });

  if (res.status === 401) {
    // Attempt token refresh
    const refreshed = await tryRefresh();
    if (refreshed) {
      headers['Authorization'] = `Bearer ${getAccessToken()}`;
      const retryRes = await fetch(`${BASE_URL}${path}`, { ...options, headers });
      if (!retryRes.ok) throw new ApiError(retryRes.status, await retryRes.text());
      return retryRes.json() as Promise<T>;
    } else {
      clearTokens();
      if (typeof window !== 'undefined') window.location.href = '/sign-up-login';
      throw new ApiError(401, 'Session expired');
    }
  }

  if (!res.ok) {
    const body = await res.text();
    throw new ApiError(res.status, body);
  }

  // 204 No Content
  if (res.status === 204) return undefined as unknown as T;
  return res.json() as Promise<T>;
}

async function tryRefresh(): Promise<boolean> {
  const refreshToken = getRefreshToken();
  if (!refreshToken) return false;
  try {
    const res = await fetch(`${BASE_URL}/api/v1/auth/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refresh_token: refreshToken }),
    });
    if (!res.ok) return false;
    const data = await res.json();
    setTokens(data.access_token, data.refresh_token ?? refreshToken);
    return true;
  } catch {
    return false;
  }
}

export class ApiError extends Error {
  constructor(public status: number, message: string) {
    super(message);
    this.name = 'ApiError';
  }
}

// ─── Auth ────────────────────────────────────────────────────────────────────

export interface LoginRequest {
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
  });
}

export async function getMe(): Promise<UserRead> {
  return apiFetch<UserRead>('/api/v1/auth/me');
}

export async function logout(): Promise<void> {
  try {
    await apiFetch('/api/v1/auth/logout', { method: 'POST' });
  } finally {
    clearTokens();
  }
}

// ─── Operations / Dashboard ──────────────────────────────────────────────────

export interface OperationsSummary {
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

export async function getOperationsSummary(): Promise<OperationsSummary> {
  return apiFetch<OperationsSummary>('/api/v1/operations/summary');
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

export async function getWorkforceDashboard(): Promise<WorkforceDashboard> {
  return apiFetch<WorkforceDashboard>('/api/v1/employees/dashboard-summary');
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
  operating?: number;
  available?: number;
  standby?: number;
  breakdown?: number;
  under_maintenance?: number;
  out_of_service?: number;
  critical_defects?: number;
  expiring_insurance?: number;
  expiring_registrations?: number;
  stale_meter_readings?: number;
  by_project?: { project: string; count: number }[];
  [key: string]: unknown;
}

export async function getFleetDashboard(): Promise<FleetDashboard> {
  return apiFetch<FleetDashboard>('/api/v1/assets/dashboard-summary');
}

export async function getAssets(params?: Record<string, string>): Promise<PaginatedResponse<unknown>> {
  const qs = params ? '?' + new URLSearchParams(params).toString() : '';
  return apiFetch<PaginatedResponse<unknown>>(`/api/v1/assets${qs}`);
}

// ─── Inventory ───────────────────────────────────────────────────────────────

export interface InventoryDashboard {
  total_value?: number;
  low_stock_count?: number;
  out_of_stock_count?: number;
  critical_stock_count?: number;
  pending_requests?: number;
  in_transit_transfers?: number;
  quarantined_count?: number;
  reorder_required?: number;
  recent_transactions?: unknown[];
  [key: string]: unknown;
}

export async function getInventoryDashboard(): Promise<InventoryDashboard> {
  return apiFetch<InventoryDashboard>('/api/v1/inventory/dashboard-summary');
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
