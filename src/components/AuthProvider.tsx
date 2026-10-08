 'use client';
import {createContext, useContext, useEffect, useState, useCallback, useRef, ReactNode} from 'react';
import {readTrustedSession,rememberVerifiedSession,enterOfflineAccess,exitOfflineAccess,lockOfflineAccess,tokenScope} from '@/lib/offlineAuth';
import {apiFetch, getMe, getAccessToken, getRefreshToken, clearTokens, logout, UserRead, ApiError} from '@/lib/api';

type Access = {roles: string[]; permissions: string[]; is_superuser: boolean};
type Auth = {offline: boolean; offlineUntil: number | null; user: UserRead | null; access: Access | null; loading: boolean; error: string; reload: () => Promise<void>; signOut: () => Promise<void>; can: (code:string) => boolean};

const PERMISSION_ALIASES: Record<string, string[]> = {
  'assets.read': ['assets.read_write', 'assets.read_assigned', 'assets.read_assigned_only', 'assets.update', 'assets.manage', 'assets.write', 'assets.create', 'assets.assignments.manage', 'assets.transfers.manage'],
  'assets.update': ['assets.read_write', 'assets.manage', 'assets.write'],
  'assets.read_write': ['assets.read', 'assets.update', 'assets.manage', 'assets.write'],
  'assets.logs.write': ['assets.update', 'assets.manage', 'assets.write', 'assets.create'],
  'assets.assignments.manage': ['assets.update', 'assets.manage', 'assets.write'],
  'assets.transfers.manage': ['assets.update', 'assets.manage', 'assets.write'],
  'assets.meter.record': ['assets.record_meter', 'assets.update', 'assets.manage'],
  'assets.record_meter': ['assets.meter.record', 'assets.update', 'assets.manage'],
  'departments.manage': ['employees.update', 'employees.manage', 'employees.write'],
  'positions.manage': ['employees.update', 'employees.manage', 'employees.write'],
  'employees.contracts.manage': ['employees.documents.manage', 'employees.update', 'employees.manage'],
  'employees.write': ['employees.update', 'employees.manage', 'employees.create'],
  'employees.manage': ['employees.update', 'employees.create', 'employees.write'],
  'projects.tasks.manage': ['projects.update', 'projects.manage', 'projects.write'],
  'projects.update': ['projects.manage', 'projects.write'],
  'projects.create': ['projects.manage', 'projects.write'],
  'inventory.manage': ['inventory.admin', 'inventory.write'],
  'roles.manage': ['users.create', 'users.update', 'users.manage', 'admin.manage'],
  'intelligence.read': ['projects.read', 'employees.read_basic', 'assets.read'],
  'drilling.shifts.approve': ['reports.approve', 'projects.manage', 'projects.update', 'drilling.approve'],
  'reports.approve': ['drilling.shifts.approve', 'projects.manage', 'projects.update', 'drilling.approve'],
};

const Context = createContext<Auth | null>(null);

export function AuthProvider({children}:{children:ReactNode}) {
 const [user,setUser]=useState<UserRead|null>(null); const [access,setAccess]=useState<Access|null>(null);
 const [loading,setLoading]=useState(true); const [error,setError]=useState('');
 const [offline,setOffline]=useState(false);const [offlineUntil,setOfflineUntil]=useState<number|null>(null);
 const generation=useRef(0);const hydrated=useRef(false);
 const restoreOffline=useCallback(()=>{
  const saved=readTrustedSession();const scope=tokenScope(getAccessToken());
  if(!saved || (scope && scope!==saved.scope) || !enterOfflineAccess())return false;
  setUser({...saved.user,is_superuser:false});setAccess({...saved.access,is_superuser:false});setOffline(true);setOfflineUntil(saved.expiresAt);setError('');setLoading(false);hydrated.current=true;return true;
 },[]);
 const reload=useCallback(async()=>{
  const run=++generation.current;if(!hydrated.current)setLoading(true);setError('');
  try {
   if(navigator.onLine===false){if(!restoreOffline()){exitOfflineAccess();setOffline(false);setUser(null);setAccess(null);setError('Offline access is unavailable or expired. Connect to the internet to sign in.');}return;}
   if(!getAccessToken()&&!getRefreshToken()) {setUser(null);setAccess(null);setOffline(false);exitOfflineAccess();return;}
   const policy={verifySession:true,bypassMemoryRead:true,memoryCache:false,cacheOfflineRead:false,cacheResponse:false};
   const profile=await apiFetch<UserRead>('/api/v1/auth/me',{},true,policy);
   const permissions=await apiFetch<Access>('/api/v1/auth/access',{},true,policy);
   if(run!==generation.current)return;
   // Only fresh server responses can renew the 30-day offline window.
   try {rememberVerifiedSession(profile,permissions,getAccessToken(),!!localStorage.getItem('cestos_refresh_token'));}catch{lockOfflineAccess();setError('This browser could not enable offline access. Keep the app open while working.');}
   exitOfflineAccess();setOffline(false);setOfflineUntil(null);
   if(profile?.portal_type)localStorage.setItem('cestos_portal_type',profile.portal_type.toUpperCase());
   if(profile?.is_superuser)localStorage.setItem('cestos_is_superuser','true');else localStorage.removeItem('cestos_is_superuser');
   setUser(profile);setAccess(permissions);hydrated.current=true;
  }catch(e){
   if(run!==generation.current)return;
   if(e instanceof ApiError && (e.status===401||e.status===403)){lockOfflineAccess();setUser(null);setAccess(null);setOffline(false);setError('Your session needs an online sign-in. Local drafts have been kept.');}
   else if((!(e instanceof ApiError)||e.status===0||e.status>=500)&&restoreOffline())return;
   else {setError(e instanceof Error?e.message:'Could not restore session.');}
  }finally{if(run===generation.current)setLoading(false);}
 },[restoreOffline]);
 useEffect(()=>{
  if(window.location.hash.startsWith('#reset=')&&window.location.pathname!=='/sign-up-login'){window.location.replace('/sign-up-login'+window.location.hash);return;}
  void reload();
  const expired=()=>{generation.current++;lockOfflineAccess();clearTokens();setUser(null);setAccess(null);setOffline(false);setLoading(false);localStorage.removeItem('cestos_portal_type');localStorage.removeItem('cestos_is_superuser');};
  const unavailable=()=>{restoreOffline();};
  const changed=(e:StorageEvent)=>{if(e.key==='cestos_trusted_offline_session'&&e.newValue===null)expired();else if(e.key==='cestos_access_token'||e.key==='cestos_refresh_token')void reload();};
  const online=()=>{void reload();};
  const timer=window.setInterval(()=>{if(navigator.onLine!==false)void reload();else if(!readTrustedSession()){setUser(null);setAccess(null);setOffline(false);setError('Offline access has expired. Connect to sign in again.');}},60000);
  window.addEventListener('online',online);window.addEventListener('offline',unavailable);window.addEventListener('cestos:offline-session-needed',unavailable);window.addEventListener('cestos:session-expired',expired);window.addEventListener('storage',changed);
  return()=>{generation.current++;window.clearInterval(timer);window.removeEventListener('online',online);window.removeEventListener('offline',unavailable);window.removeEventListener('cestos:offline-session-needed',unavailable);window.removeEventListener('cestos:session-expired',expired);window.removeEventListener('storage',changed);};
 },[reload,restoreOffline]);
 const signOut=async()=>{generation.current++;lockOfflineAccess();setOffline(false);try{localStorage.removeItem('cestos_portal_type');localStorage.removeItem('cestos_is_superuser');await logout();}finally{setUser(null);setAccess(null);window.location.assign('/sign-up-login');}};
  const can = (code: string) => {
    if (typeof code !== 'string' || !access) return false;
    if(offline && /(users|roles|permissions|organizations|admin|payment|payroll|procurement|invoice|expense|approve|publish|share)/i.test(code))return false;
    if (access.is_superuser) return true;
    const isCeo = access.roles?.some((r) => {
      const lower = r.trim().toLowerCase();
      return lower === 'ceo' || lower.includes('chief executive');
    });
    if ((code === 'operations.insights.read' || code === 'operations.read' || code === 'commercial.read') && isCeo) return true;
    const userPerms = access.permissions || [];
    if (userPerms.includes(code)) return true;
    if (code === 'operations.insights.read' && userPerms.includes('operations.read')) return true;
    if (code === 'operations.read' && userPerms.includes('operations.insights.read')) return true;
    const aliases = PERMISSION_ALIASES[code] || [];
    if (aliases.some((a) => userPerms.includes(a))) return true;
    if (code.startsWith('inventory.') && (userPerms.includes('inventory.admin') || userPerms.includes('inventory.manage') || userPerms.includes('inventory.write'))) return true;
    if (code.startsWith('assets.')) {
      const isSupervisorOrLead = access.roles?.some((r) =>
        ['supervisor', 'manager', 'admin', 'foreman', 'lead', 'superintendent', 'driller', 'engineer', 'operator'].some((kw) =>
          r.toLowerCase().includes(kw)
        )
      );
      if (code === 'assets.read' || code === 'assets.read_assigned' || code.endsWith('.read') || user?.portal_type === 'FIELD' || user?.is_field_portal_only || isSupervisorOrLead) return true;
      if (userPerms.includes('assets.manage') || userPerms.includes('assets.write') || userPerms.includes('assets.update')) return true;
    }
    if (code.startsWith('projects.') && (userPerms.includes('projects.manage') || userPerms.includes('projects.write') || userPerms.includes('projects.update'))) return true;
    if (code.startsWith('drilling.') && (userPerms.includes('projects.manage') || userPerms.includes('projects.write') || userPerms.includes('projects.update'))) return true;
    if (code.startsWith('commercial.') && (userPerms.includes('projects.manage') || userPerms.includes('projects.write') || userPerms.includes('projects.update') || userPerms.includes('commercial.read'))) return true;
    if (code.startsWith('hse.') && (userPerms.includes('employees.manage') || userPerms.includes('employees.write') || userPerms.includes('projects.update'))) return true;
    if (code.startsWith('employees.') && (userPerms.includes('employees.manage') || userPerms.includes('employees.write') || userPerms.includes('employees.update'))) return true;
    if (code.startsWith('locations.') && (userPerms.includes('projects.manage') || userPerms.includes('projects.write') || userPerms.includes('locations.manage'))) return true;
    return false;
  };
 return <Context.Provider value={{user,access,loading,error,reload,signOut,can,offline,offlineUntil}}>{children}</Context.Provider>;
}
export function canAccessAdministration(auth: Pick<Auth, 'access' | 'can'>) {
 return !!auth.access?.is_superuser || (!auth.access?.roles.some(role => role.trim().toLowerCase() === 'supervisor') && ['admin.manage', 'users.read', 'users.create', 'users.update', 'roles.manage'].some(code => auth.can(code)));
}
export function useAuth(){const value=useContext(Context);if(!value)throw new Error('AuthProvider missing');return value;}


