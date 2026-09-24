'use client';

import { useEffect, useState } from 'react';
import { apiFetch } from '@/lib/api';
import { useAuth } from './AuthProvider';

export default function PwaRuntime() {
  const [installPrompt, setInstallPrompt] = useState<any>(null);
  const [updateAvailable, setUpdateAvailable] = useState(false);
  const [serviceWorkerReady, setServiceWorkerReady] = useState(false);
  const [notificationSettingsVersion, setNotificationSettingsVersion] = useState(0);
  const [browserNotificationsEnabled, setBrowserNotificationsEnabled] = useState(false);
  const [notificationPermission, setNotificationPermission] = useState<'default' | 'granted' | 'denied' | 'unsupported'>('default');
  const [notificationPromptDismissed, setNotificationPromptDismissed] = useState(false);
  const { user } = useAuth();

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
  if (!installPrompt && !updateAvailable && !showNotificationControl) return null;
  return <div className="fixed bottom-4 left-1/2 z-[2147483646] flex w-[min(94vw,620px)] -translate-x-1/2 flex-wrap items-center justify-between gap-3 border border-slate-300 bg-white p-3 text-sm text-slate-900 shadow-2xl" role="status">
    <span className="min-w-0 flex-1">{updateAvailable ? 'A new Cestos version is ready.' : installPrompt ? 'Install Cestos Operations for quick access.' : browserNotificationsEnabled ? 'Browser notifications are enabled.' : 'Get browser alerts for new Cestos notifications.'}</span>
    <div className="flex shrink-0 gap-2">
      {installPrompt && <button type="button" onClick={() => void install()} className="bg-slate-100 px-3 py-2 font-semibold">Install app</button>}
      {showNotificationControl && <button type="button" onClick={() => void toggleNotifications()} className="border border-slate-300 px-3 py-2 font-semibold">{browserNotificationsEnabled ? 'Turn off alerts' : 'Enable alerts'}</button>}
      {updateAvailable && <button type="button" onClick={() => window.location.reload()} className="bg-[#184877] px-3 py-2 font-bold text-white">Reload to update</button>}
      {!updateAvailable && !installPrompt && showNotificationControl && <button type="button" onClick={() => setNotificationPromptDismissed(true)} className="border px-3 py-2">Later</button>}
      {!updateAvailable && installPrompt && <button type="button" onClick={() => setInstallPrompt(null)} className="border px-3 py-2">Later</button>}
    </div>
  </div>;
}
