'use client';

import { useEffect, useState } from 'react';
import { apiFetch, discardOfflineWrite, getOfflineWriteQueue, retryOfflineWrite, syncOfflineWriteQueue } from '@/lib/api';
import type { OfflineWrite } from '@/lib/offlineStore';
import { useAuth } from './AuthProvider';

export default function PwaRuntime() {
  const [installPrompt, setInstallPrompt] = useState<any>(null);
  const [updateAvailable, setUpdateAvailable] = useState(false);
  const [serviceWorkerReady, setServiceWorkerReady] = useState(false);
  const [notificationSettingsVersion, setNotificationSettingsVersion] = useState(0);
  const [browserNotificationsEnabled, setBrowserNotificationsEnabled] = useState(false);
  const [notificationPermission, setNotificationPermission] = useState<'default' | 'granted' | 'denied' | 'unsupported'>('default');
  const [notificationPromptDismissed, setNotificationPromptDismissed] = useState(false);
  const [online, setOnline] = useState(true);
  const [offlineWrites, setOfflineWrites] = useState<OfflineWrite[]>([]);
  const [queueOpen, setQueueOpen] = useState(false);
  const [syncingOffline, setSyncingOffline] = useState(false);
  const [offlineCacheWarning, setOfflineCacheWarning] = useState(false);
  const { user } = useAuth();

  useEffect(() => {
    const refreshQueue = () => { void getOfflineWriteQueue().then(setOfflineWrites).catch(() => setOfflineWrites([])); };
    const onOnline = () => {
      setOnline(true);
      setSyncingOffline(true);
      void syncOfflineWriteQueue().finally(() => { setSyncingOffline(false); refreshQueue(); });
    };
    const onOffline = () => setOnline(false);
    setOnline(navigator.onLine);
    if ('storage' in navigator && navigator.storage?.persist) void navigator.storage.persist().catch(() => false);
    refreshQueue();
    if (navigator.onLine) onOnline();
    window.addEventListener('online', onOnline);
    window.addEventListener('offline', onOffline);
    window.addEventListener('cestos:offline-queue-changed', refreshQueue);
    const onCacheError = () => setOfflineCacheWarning(true);
    window.addEventListener('cestos:offline-cache-error', onCacheError);
    const syncTimer = window.setInterval(() => {
      if (navigator.onLine) void syncOfflineWriteQueue().finally(refreshQueue);
    }, 15_000);
    return () => {
      window.clearInterval(syncTimer);
      window.removeEventListener('online', onOnline);
      window.removeEventListener('offline', onOffline);
      window.removeEventListener('cestos:offline-queue-changed', refreshQueue);
      window.removeEventListener('cestos:offline-cache-error', onCacheError);
    };
  }, [user?.id]);

  useEffect(() => {
    if (!user?.id) return;
    const supported = 'Notification' in window;
    const permission = supported ? Notification.permission : 'unsupported';
    setNotificationPermission(permission);
    setBrowserNotificationsEnabled(permission === 'granted' && localStorage.getItem(`cestos.browserNotifications.enabled.${user.id}`) === 'true');
  }, [user?.id]);

  useEffect(() => {
    if (!('serviceWorker' in navigator)) return;
    let active = true;
    let registration: ServiceWorkerRegistration | undefined;
    const register = async () => {
      try {
        registration = await navigator.serviceWorker.register('/sw.js', { scope: '/', updateViaCache: 'none' });
        if (active) setServiceWorkerReady(true);
        await registration.update();
      } catch { /* App remains usable when service workers are unavailable. */ }
    };
    void register();
    const timer = window.setInterval(() => { void registration?.update().catch(() => {}); }, 60_000);
    const updateOnReturn = () => { if (document.visibilityState === 'visible') void registration?.update().catch(() => {}); };
    document.addEventListener('visibilitychange', updateOnReturn);
    return () => { active = false; window.clearInterval(timer); document.removeEventListener('visibilitychange', updateOnReturn); };
  }, []);

  useEffect(() => {
    const onSettingsChanged = () => setNotificationSettingsVersion((value) => value + 1);
    window.addEventListener('cestos:browser-notifications-changed', onSettingsChanged);
    return () => window.removeEventListener('cestos:browser-notifications-changed', onSettingsChanged);
  }, []);

  useEffect(() => {
    const onInstallPrompt = (event: Event) => { event.preventDefault(); setInstallPrompt(event); };
    window.addEventListener('beforeinstallprompt', onInstallPrompt);
    return () => window.removeEventListener('beforeinstallprompt', onInstallPrompt);
  }, []);

  useEffect(() => {
    let active = true;
    let current = '';
    let checking = false;
    const check = async () => {
      if (checking || document.visibilityState === 'hidden' || navigator.onLine === false) return;
      checking = true;
      try {
        const response = await fetch(`/build-version.json?t=${Date.now()}`, { cache: 'no-store', headers: { 'cache-control': 'no-cache' } });
        if (!response.ok) return;
        const info = await response.json();
        const next = String(info.version || '');
        if (!next) return;
        if (!current) current = next;
        else if (next !== current && active) setUpdateAvailable(true);
      } catch { /* A temporary outage must not interrupt active work. */ }
      finally { checking = false; }
    };
    void check();
    const timer = window.setInterval(() => void check(), 30_000);
    const onVisible = () => { if (document.visibilityState === 'visible') void check(); };
    window.addEventListener('online', onVisible);
    document.addEventListener('visibilitychange', onVisible);
    return () => { active = false; window.clearInterval(timer); window.removeEventListener('online', onVisible); document.removeEventListener('visibilitychange', onVisible); };
  }, []);

  useEffect(() => {
    if (!user?.id || !('Notification' in window) || Notification.permission !== 'granted' || localStorage.getItem(`cestos.browserNotifications.enabled.${user.id}`) !== 'true') return;
    let active = true;
    let primed = false;
    const portalRoutes: Record<string, string> = { FIELD: '/field-portal/notifications', FIELD_ADMIN: '/field-admin-portal', HR: '/hr-portal', FINANCE: '/finance-portal', EXECUTIVE: '/executive-portal' };
    const notificationUrl = user.is_superuser ? '/workspace/hr/notifications' : portalRoutes[String(user.portal_type || 'FIELD').toUpperCase()] || '/field-portal';
    const knownKey = `cestos.browserNotifications.known.${user.id}`;
    const poll = async () => {
      try {
        const feed = await apiFetch<any>('/api/v1/notifications?page=1&page_size=20&is_read=false');
        if (!active) return;
        const items = Array.isArray(feed?.items) ? feed.items : [];
        const ids = items.map((item: any) => String(item.id));
        if (!primed) {
          primed = true;
          try { localStorage.setItem(knownKey, JSON.stringify(ids)); } catch {}
          return;
        }
        let known: string[] = [];
        try { known = JSON.parse(localStorage.getItem(knownKey) || '[]'); } catch {}
        const newlyAdded = items.filter((item: any) => !known.includes(String(item.id)));
        if (newlyAdded.length && document.visibilityState === 'hidden' && serviceWorkerReady) {
          void navigator.serviceWorker.ready.then((registration) => Promise.all(newlyAdded.slice(0, 3).map((item: any) => registration.showNotification('Cestos Operations', {
            body: String(item.message || 'You have a new notification').slice(0, 240), icon: '/assets/pwa/icon-192.png', badge: '/assets/pwa/icon-192.png', tag: `cestos-${item.id}`, data: { url: notificationUrl },
          })))).catch(() => {});
        }
        try { localStorage.setItem(knownKey, JSON.stringify([...ids, ...known].slice(0, 200))); } catch {}
      } catch { /* Leave notification delivery independent of the main UI. */ }
    };
    void poll();
    const timer = window.setInterval(() => void poll(), 30_000);
    return () => { active = false; window.clearInterval(timer); };
  }, [user?.id, serviceWorkerReady, notificationSettingsVersion]);

  const install = async () => {
    if (!installPrompt) return;
    await installPrompt.prompt();
    await installPrompt.userChoice;
    setInstallPrompt(null);
  };

  const toggleNotifications = async () => {
    if (!user?.id || !('Notification' in window)) return;
    if (browserNotificationsEnabled) {
      localStorage.setItem(`cestos.browserNotifications.enabled.${user.id}`, 'false');
      setBrowserNotificationsEnabled(false);
      window.dispatchEvent(new Event('cestos:browser-notifications-changed'));
      return;
    }
    const permission = Notification.permission === 'default' ? await Notification.requestPermission() : Notification.permission;
    setNotificationPermission(permission);
    if (permission === 'granted') {
      localStorage.setItem(`cestos.browserNotifications.enabled.${user.id}`, 'true');
      setBrowserNotificationsEnabled(true);
      window.dispatchEvent(new Event('cestos:browser-notifications-changed'));
    }
  };

  const showNotificationControl = Boolean(user?.id) && !notificationPromptDismissed && notificationPermission !== 'unsupported' && notificationPermission !== 'denied';
  const showRuntimeBanner = !online || offlineWrites.length > 0 || syncingOffline || offlineCacheWarning || updateAvailable || Boolean(installPrompt) || showNotificationControl;
  if (!showRuntimeBanner && !queueOpen) return null;
  return <>
    {showRuntimeBanner && <div className="fixed bottom-4 left-1/2 z-[2147483646] flex w-[min(94vw,680px)] -translate-x-1/2 flex-wrap items-center justify-between gap-3 border border-slate-300 bg-white p-3 text-sm text-slate-900 shadow-2xl" role="status" aria-live="polite">
      <span className="min-w-0 flex-1">{offlineCacheWarning ? 'Some data could not be saved for offline use. Check this device’s available storage, then reload the data.' : !online ? 'Offline mode. Changes are saved on this device and will sync when connected.' : offlineWrites.some((item) => item.state === 'failed') ? `${offlineWrites.filter((item) => item.state === 'failed').length} offline change(s) need attention.` : offlineWrites.length || syncingOffline ? `${offlineWrites.length} change(s) waiting to sync${syncingOffline ? '…' : '.'}` : updateAvailable ? 'A new Cestos version is ready.' : installPrompt ? 'Install Cestos Operations for quick access.' : browserNotificationsEnabled ? 'Browser notifications are enabled.' : 'Get browser alerts for new Cestos notifications.'}</span>
      <div className="flex shrink-0 flex-wrap gap-2">
        {offlineWrites.length > 0 && <button type="button" onClick={() => setQueueOpen(true)} className="border border-slate-300 px-3 py-2 font-semibold">Offline changes ({offlineWrites.length})</button>}
        {offlineCacheWarning && <button type="button" onClick={() => setOfflineCacheWarning(false)} className="border border-slate-300 px-3 py-2">Dismiss</button>}
        {online && offlineWrites.some((item) => item.state === 'pending') && <button type="button" disabled={syncingOffline} onClick={() => { setSyncingOffline(true); void syncOfflineWriteQueue().finally(() => { setSyncingOffline(false); void getOfflineWriteQueue().then(setOfflineWrites); }); }} className="border border-slate-300 px-3 py-2 font-semibold">Sync now</button>}
        {installPrompt && <button type="button" onClick={() => void install()} className="bg-slate-100 px-3 py-2 font-semibold">Install app</button>}
        {showNotificationControl && <button type="button" onClick={() => void toggleNotifications()} className="border border-slate-300 px-3 py-2 font-semibold">{browserNotificationsEnabled ? 'Turn off alerts' : 'Enable alerts'}</button>}
        {updateAvailable && <button type="button" onClick={() => window.location.reload()} className="bg-[#184877] px-3 py-2 font-bold text-white">Reload to update</button>}
        {!updateAvailable && !installPrompt && showNotificationControl && <button type="button" onClick={() => setNotificationPromptDismissed(true)} className="border px-3 py-2">Later</button>}
        {!updateAvailable && installPrompt && <button type="button" onClick={() => setInstallPrompt(null)} className="border px-3 py-2">Later</button>}
      </div>
    </div>}
    {queueOpen && <div className="fixed inset-0 z-[2147483647] flex items-end justify-center bg-slate-950/50 p-3 sm:items-center" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) setQueueOpen(false); }}>
      <section className="flex max-h-[85vh] w-full max-w-2xl flex-col border border-slate-300 bg-white shadow-2xl" role="dialog" aria-modal="true" aria-labelledby="offline-queue-title">
        <header className="flex items-center justify-between border-b border-slate-200 p-4"><div><h2 id="offline-queue-title" className="font-bold text-slate-900">Offline changes</h2><p className="mt-1 text-xs text-slate-600">Stored on this device and sent in order after reconnection.</p></div><button onClick={() => setQueueOpen(false)} className="border px-3 py-2" aria-label="Close">×</button></header>
        <div className="min-h-0 space-y-3 overflow-y-auto p-4">
          {offlineWrites.length === 0 ? <p className="text-sm text-slate-600">All changes have synced.</p> : offlineWrites.map((item) => <article key={item.id} className="border border-slate-200 p-3 text-sm">
            <div className="flex flex-wrap items-start justify-between gap-2"><div className="min-w-0"><p className="font-semibold text-slate-900">{item.method} · {item.path}</p><p className="mt-1 text-xs text-slate-500">{new Date(item.createdAt).toLocaleString()} · {item.state === 'failed' ? 'Needs attention' : 'Waiting to sync'}</p>{item.error && <p className="mt-2 text-red-700">{item.error}</p>}</div><div className="flex gap-2">{item.state === 'failed' && <button onClick={() => { void retryOfflineWrite(item.id).then(() => getOfflineWriteQueue().then(setOfflineWrites)); }} className="border border-slate-300 px-2 py-1 font-semibold">Retry</button>}<button onClick={() => { void discardOfflineWrite(item.id).then(() => getOfflineWriteQueue().then(setOfflineWrites)); }} className="border border-red-200 px-2 py-1 text-red-700">Remove</button></div></div>
          </article>)}
        </div>
        <footer className="border-t border-slate-200 p-3 text-xs text-slate-500">Keep this browser profile and its site data until all queued changes have synced.</footer>
      </section>
    </div>}
  </>;
}
