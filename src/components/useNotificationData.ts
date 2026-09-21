'use client';

import { useCallback, useSyncExternalStore } from 'react';
import { apiFetch } from '@/lib/api';
import { createNotificationPoller, NotificationSnapshot } from '@/lib/notificationPolling';
import { useAuth } from './AuthProvider';

const resources = new Map<string, ReturnType<typeof createNotificationPoller<any>>>();
const empty: NotificationSnapshot<any> = { data: null, error: '', loading: false };
const initial: NotificationSnapshot<any> = { data: null, error: '', loading: true };

export default function useNotificationData<T = any>(path: string | null) {
  const { user } = useAuth();
  const key = user && path ? JSON.stringify([user.id, path]) : null;
  const subscribe = useCallback((listener: () => void) => {
    if (!key || !path) return () => {};
    let resource = resources.get(key);
    if (!resource) {
      resource = createNotificationPoller<T>(signal => apiFetch<T>(path, { signal }));
      resources.set(key, resource);
    }
    const unsubscribe = resource.subscribe(listener);
    // Count consumers separately so one unmount cannot stop another badge.
    const entry = resource;
    const count = (subscribers.get(key) || 0) + 1;
    subscribers.set(key, count);
    return () => {
      unsubscribe();
      const remaining = (subscribers.get(key) || 1) - 1;
      if (remaining) subscribers.set(key, remaining);
      else {
        subscribers.delete(key);
        if (resources.get(key) === entry) resources.delete(key);
      }
    };
  }, [key, path]);
  const getSnapshot = useCallback(() => key
    ? resources.get(key)?.getSnapshot() ?? initial : empty, [key]);
  const snapshot = useSyncExternalStore(subscribe, getSnapshot, () => empty);
  const reload = useCallback(() => { if (key) resources.get(key)?.refresh(); }, [key]);
  return { ...snapshot, reload } as NotificationSnapshot<T> & { reload: () => void };
}

const subscribers = new Map<string, number>();
