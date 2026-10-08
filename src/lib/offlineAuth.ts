// Offline identity is for local work only. It never authorizes server requests.
export const OFFLINE_ACCESS_MS = 7 * 24 * 60 * 60 * 1000;
const KEY = 'cestos_trusted_offline_session';
let offline = false;
export type TrustedSession = {
  version: 1;
  user: any;
  access: { roles: string[]; permissions: string[]; is_superuser: boolean };
  scope: string;
  verifiedAt: number;
  expiresAt: number;
};
export function tokenScope(token: string | null): string | null {
  try {
    if (!token) return null;
    const part = token.split('.')[1];
    const payload = JSON.parse(
      atob(
        part
          .replace(/-/g, '+')
          .replace(/_/g, '/')
          .padEnd(Math.ceil(part.length / 4) * 4, '=')
      )
    );
    return payload.sub && payload.org ? `${payload.org}:${payload.sub}` : null;
  } catch {
    return null;
  }
}
export function readTrustedSession(): TrustedSession | null {
  try {
    const raw = sessionStorage.getItem(KEY) || localStorage.getItem(KEY);
    if (!raw) return null;
    const saved = JSON.parse(raw) as TrustedSession;
    const now = Date.now();
    if (
      saved.version !== 1 ||
      !saved.user?.id ||
      !saved.scope ||
      !saved.scope.endsWith(`:${saved.user.id}`) ||
      !Array.isArray(saved.access?.permissions) ||
      !Array.isArray(saved.access?.roles) ||
      !Number.isFinite(saved.verifiedAt) ||
      saved.verifiedAt > now ||
      saved.expiresAt !== saved.verifiedAt + OFFLINE_ACCESS_MS ||
      now >= saved.expiresAt
    )
      return null;
    return saved;
  } catch {
    return null;
  }
}
export function rememberVerifiedSession(
  user: any,
  access: TrustedSession['access'],
  token: string | null,
  persistent: boolean
) {
  const scope = tokenScope(token);
  if (!scope || !scope.endsWith(`:${user.id}`)) return;
  const verifiedAt = Date.now();
  const data: TrustedSession = {
    version: 1,
    user,
    access,
    scope,
    verifiedAt,
    expiresAt: verifiedAt + OFFLINE_ACCESS_MS,
  };
  (persistent ? localStorage : sessionStorage).setItem(KEY, JSON.stringify(data));
  (persistent ? sessionStorage : localStorage).removeItem(KEY);
  offline = false;
}
export function lockOfflineAccess() {
  offline = false;
  try {
    localStorage.removeItem(KEY);
    sessionStorage.removeItem(KEY);
  } catch {}
}
export function enterOfflineAccess() {
  offline = !!readTrustedSession();
  return offline;
}
export function exitOfflineAccess() {
  offline = false;
}
export function offlineAccessActive() {
  return offline && !!readTrustedSession();
}
export function offlineRestrictedPath(path: string) {
  return /\/api\/v1\/(auth|users|roles|permissions|organizations|documents|workbook-shares|workbook-connections|payments|payroll|procurement|invoices|expenses|bank)(?:\/|\?|$)/i.test(
    path
  );
}
export function offlineWriteAllowed(path: string, method: string) {
  return (
    ['POST', 'PUT', 'PATCH'].includes(method) &&
    !offlineRestrictedPath(path) &&
    !/\/api\/v1\/(operational-expenses|purchase-orders|hr|employees|clients|suppliers)(?:\/|\?|$)/i.test(
      path
    ) &&
    !/(approve|reject|publish|share|grant|revoke|password)/i.test(path)
  );
}
