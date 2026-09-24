'use client';

import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { Toaster } from 'sonner';

export default function AppToaster() {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  if (!mounted) return null;
  return createPortal(
    <Toaster position="top-center" richColors closeButton expand duration={30_000}
      style={{ zIndex: 2147483647 }}
      toastOptions={{ duration: 30_000, style: { fontFamily: 'var(--font-dm-sans)', fontSize: '14px' } }}
    />, document.body,
  );
}
