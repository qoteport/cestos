import {lockOfflineAccess} from './offlineAuth';
export class SessionUnavailableError extends Error {constructor(){super('Session verification is temporarily unavailable. Please retry when connected.');this.name='SessionUnavailableError';}}
// One token rotation per browser session, including concurrent requests and tabs.
const ACCESS = 'cestos_access_token';
const REFRESH = 'cestos_refresh_token';
export function getAccessToken() { return typeof window === 'undefined' ? null : sessionStorage.getItem(ACCESS) || localStorage.getItem(ACCESS); }
export function getRefreshToken() { return typeof window === 'undefined' ? null : sessionStorage.getItem(REFRESH) || localStorage.getItem(REFRESH); }
export function clearTokens() {
  if (typeof window === 'undefined') return;
  for (const storage of [sessionStorage, localStorage]) { storage.removeItem(ACCESS); storage.removeItem(REFRESH); }
}
export function setTokens(access: string, refresh: string, remember?: boolean) {
  const persistent = remember ?? !!localStorage.getItem(REFRESH);
  clearTokens();
  const storage = persistent ? localStorage : sessionStorage;
  storage.setItem(ACCESS, access); storage.setItem(REFRESH, refresh);
}
let refreshing: Promise<boolean> | null = null;
export function refreshSession(base: string, failedAccess: string | null): Promise<boolean> {
  if (refreshing) return refreshing;
  const rotate = async () => {
    if (getAccessToken() && getAccessToken() !== failedAccess) return true;
    const token = getRefreshToken();
    if (!token) return false;
    let response: Response;
    try {response = await fetch(`${base}/api/v1/auth/refresh`, { method: 'POST', headers: {'Content-Type':'application/json'}, body: JSON.stringify({refresh_token:token}), cache:'no-store' });}catch{throw new SessionUnavailableError();}
    if (response.status === 401) { if (getRefreshToken() === token) {clearTokens();lockOfflineAccess();} return false; }
    if(!response.ok)throw new SessionUnavailableError();
    const text = await response.text();
    let data: any = {};
    try { data = text ? JSON.parse(text) : {}; } catch { data = {}; }
    if (getRefreshToken() !== token) return !!getAccessToken(); // Logout or a new login won the race.
    if(typeof data.access_token!=='string' || !data.access_token || typeof data.refresh_token!=='string' || !data.refresh_token)throw new SessionUnavailableError();
    setTokens(data.access_token, data.refresh_token);
    return true;
  };
  const pending = Promise.resolve(typeof navigator !== 'undefined' && navigator.locks ? navigator.locks.request('cestos-session-refresh', rotate) : rotate()).then(value => value).finally(() => { refreshing = null; });
  refreshing = pending;
  return pending;
}
