export type NotificationSnapshot<T> = { data: T | null; error: string; loading: boolean };

// One in-flight request and one timer per resource, shared by every subscriber.
export function createNotificationPoller<T>(fetchData: (signal: AbortSignal) => Promise<T>) {
  let snapshot: NotificationSnapshot<T> = { data: null, error: '', loading: true };
  const listeners = new Set<() => void>();
  let controller: AbortController | null = null;
  let timer: ReturnType<typeof setTimeout> | undefined;
  let queued = false;
  const publish = (value: NotificationSnapshot<T>) => {
    snapshot = value;
    listeners.forEach(listener => listener());
  };
  const schedule = () => {
    clearTimeout(timer);
    if (listeners.size) timer = setTimeout(() => void refresh(false), 30000);
  };
  async function refresh(force = true) {
    if (!listeners.size) return;
    if (document.hidden || navigator.onLine === false) { schedule(); return; }
    if (controller) { queued ||= force; return; }
    clearTimeout(timer);
    const request = new AbortController();
    controller = request;
    const timeout = setTimeout(() => request.abort(), 8000);
    try {
      const data = await fetchData(request.signal);
      if (controller === request && !request.signal.aborted) {
        publish({ data, loading: false, error: '' });
      }
    } catch (error) {
      if (controller === request) {
        publish({ ...snapshot, loading: false, error: snapshot.data === null
          ? (error instanceof Error ? error.message : 'Notification sync failed') : '' });
      }
    } finally {
      clearTimeout(timeout);
      if (controller === request) {
        controller = null;
        if (queued) { queued = false; void refresh(false); }
        else schedule();
      }
    }
  }
  const onVisible = () => { void refresh(false); };
  const onChanged = () => { void refresh(true); };
  return {
    getSnapshot: () => snapshot,
    refresh: () => { void refresh(true); },
    subscribe(listener: () => void) {
      listeners.add(listener);
      if (listeners.size === 1) {
        window.addEventListener('focus', onVisible);
        window.addEventListener('online', onVisible);
        document.addEventListener('visibilitychange', onVisible);
        window.addEventListener('cestos:notifications-changed', onChanged);
        void refresh(false);
      }
      return () => {
        listeners.delete(listener);
        if (!listeners.size) {
          clearTimeout(timer);
          controller?.abort();
          controller = null;
          queued = false;
          window.removeEventListener('focus', onVisible);
          window.removeEventListener('online', onVisible);
          document.removeEventListener('visibilitychange', onVisible);
          window.removeEventListener('cestos:notifications-changed', onChanged);
        }
      };
    },
  };
}
