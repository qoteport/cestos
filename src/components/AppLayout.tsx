'use client';

import React, { useState, useEffect } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { Loader2 } from 'lucide-react';
import Sidebar from './Sidebar';
import Topbar from './Topbar';
import { useAuth } from './AuthProvider';
import AppLogo from './ui/AppLogo';

const portalRoutes: Record<string, string> = {
  FIELD: '/field-portal',
  FIELD_ADMIN: '/field-admin-portal',
  HR: '/hr-portal',
  FINANCE: '/finance-portal',
  EXECUTIVE: '/executive-portal',
};

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const [collapsed, setCollapsed] = useState(false);
  const { user, loading, error, reload } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  // Instant local storage check on mount so PWA redirects without flashing workspace
  const [cachedPortal] = useState<string | null>(() => {
    if (typeof window === 'undefined') return null;
    const isSuper = localStorage.getItem('cestos_is_superuser') === 'true';
    if (isSuper) return null;
    const pt = localStorage.getItem('cestos_portal_type');
    return pt ? (portalRoutes[pt.toUpperCase()] || '/field-portal') : null;
  });

  const isNonSuperuser = user ? !user.is_superuser : false;
  const assignedPortal = user?.portal_type ? portalRoutes[user.portal_type.toUpperCase()] : undefined;
  const targetPortal = assignedPortal || (isNonSuperuser ? '/field-portal' : undefined) || cachedPortal;
  const shouldRedirect = !!targetPortal && pathname !== targetPortal;

  useEffect(() => {
    if (!loading && !user && !error) {
      router.replace('/sign-up-login');
      return;
    }
    if (targetPortal && pathname !== targetPortal) {
      router.replace(targetPortal);
    }
  }, [user, loading, error, router, targetPortal, pathname]);

  if (error) {
    return (
      <main className="min-h-screen flex items-center justify-center p-6 bg-background">
        <div className="card p-8 max-w-md shadow-lg border">
          <h1 className="text-xl font-bold">Connection unavailable</h1>
          <p role="alert" className="my-4 text-muted-foreground text-sm leading-relaxed">
            {error}
          </p>
          <button className="btn-primary" onClick={() => void reload()}>
            Retry connection
          </button>
        </div>
      </main>
    );
  }

  // If session is loading, or user is resolving, or pending portal redirection, show clean branded splash
  if (loading || !user || shouldRedirect) {
    return (
      <main
        className="min-h-screen flex flex-col items-center justify-center p-6 bg-background text-muted-foreground select-none"
        role="status"
        aria-live="polite"
      >
        <div className="flex flex-col items-center gap-4">
          <AppLogo size={80} className="animate-pulse" />
          <div className="flex items-center gap-2.5 text-xs sm:text-sm font-medium text-slate-600 dark:text-slate-300">
            <Loader2 className="h-4 w-4 animate-spin text-primary" />
            <span>Restoring your workspace…</span>
          </div>
        </div>
      </main>
    );
  }

  return (
    <div className="flex h-screen overflow-hidden bg-background print:h-auto print:overflow-visible print:block print:bg-white">
      <Sidebar collapsed={collapsed} onToggle={() => setCollapsed(!collapsed)} />
      <div className="flex-1 flex flex-col overflow-hidden min-w-0 print:h-auto print:overflow-visible print:block print:w-full">
        <Topbar />
        <main className="flex-1 overflow-y-auto scrollbar-thin print:h-auto print:overflow-visible print:block print:p-0">
          <div className="max-w-screen-2xl mx-auto px-4 py-6 md:px-6 xl:px-8 print:max-w-full print:p-0 print:m-0">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
