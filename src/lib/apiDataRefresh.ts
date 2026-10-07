'use client';

import { startTransition, useEffect, useRef } from 'react';
import { API_DATA_REFRESHED_EVENT } from './apiDataEvents';

export function useApiDataRefresh(onRefresh: () => void) {
  const callback = useRef(onRefresh);
  useEffect(() => { callback.current = onRefresh; }, [onRefresh]);

  useEffect(() => {
    let timer: number | undefined;
    const handle = () => {
      if (timer) window.clearTimeout(timer);
      timer = window.setTimeout(() => startTransition(() => callback.current()), 180);
    };
    window.addEventListener(API_DATA_REFRESHED_EVENT, handle);
    return () => {
      window.removeEventListener(API_DATA_REFRESHED_EVENT, handle);
      if (timer) window.clearTimeout(timer);
    };
  }, []);
}
