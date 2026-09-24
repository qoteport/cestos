'use client';

import { useEffect, useRef } from 'react';

export type OperationalDataDomain = 'purchase_orders' | 'expenses';
export type OperationalDataUpdate = { domain: OperationalDataDomain; changedAt: number };

const UPDATE_EVENT = 'cestos:operational-data-updated';
const STORAGE_KEY = 'cestos:operational-data-sync';
const CHANNEL_NAME = 'cestos-operational-data-sync';
let senderChannel: BroadcastChannel | null = null;

function dispatchUpdate(update: OperationalDataUpdate) {
  window.dispatchEvent(new CustomEvent<OperationalDataUpdate>(UPDATE_EVENT, { detail: update }));
  // Keep listeners from older UI flows working during the transition.
  if (update.domain === 'expenses') window.dispatchEvent(new CustomEvent('operational-expenses:updated'));
}

export function notifyOperationalDataUpdated(domain: OperationalDataDomain) {
  if (typeof window === 'undefined') return;
  const update = { domain, changedAt: Date.now() } satisfies OperationalDataUpdate;
  dispatchUpdate(update);
  try {
    if ('BroadcastChannel' in window) {
      senderChannel ??= new BroadcastChannel(CHANNEL_NAME);
      senderChannel.postMessage(update);
      return;
    }
  } catch { /* The storage event below remains as a cross-tab fallback. */ }
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(update)); } catch { /* Storage may be unavailable in private browsing. */ }
}

export function useOperationalDataSync(onUpdate: (update: OperationalDataUpdate) => void) {
  const callback = useRef(onUpdate);
  useEffect(() => { callback.current = onUpdate; }, [onUpdate]);

  useEffect(() => {
    const handle = (event: Event) => {
      const update = (event as CustomEvent<OperationalDataUpdate>).detail;
      if (update?.domain) callback.current(update);
    };
    const handleStorage = (event: StorageEvent) => {
      if (event.key !== STORAGE_KEY || !event.newValue) return;
      try { dispatchUpdate(JSON.parse(event.newValue) as OperationalDataUpdate); } catch { /* Ignore malformed cross-tab signals. */ }
    };
    let channel: BroadcastChannel | undefined;
    try {
      if ('BroadcastChannel' in window) {
        channel = new BroadcastChannel(CHANNEL_NAME);
        channel.onmessage = (event: MessageEvent<OperationalDataUpdate>) => dispatchUpdate(event.data);
      }
    } catch { /* Storage events remain available in older browsers. */ }
    window.addEventListener(UPDATE_EVENT, handle);
    window.addEventListener('storage', handleStorage);
    return () => {
      window.removeEventListener(UPDATE_EVENT, handle);
      window.removeEventListener('storage', handleStorage);
      channel?.close();
    };
  }, []);
}
