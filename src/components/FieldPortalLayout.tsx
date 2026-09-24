'use client';
import { hasSupervisorRole, canOpenFieldTab } from '@/lib/fieldPortalAccess';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  Flame,
  Wrench,
  AlertTriangle,
  Package,
  ShieldCheck,
  User,
  LogOut,
  PanelLeftClose,
  PanelLeftOpen,
  ArrowRight,
  HardHat,
  Clock,
  Fuel,
  Bell,
  RefreshCw,
  Truck,
  Users,
  Compass,
  ChevronDown,
  Menu,
  X,
  ShoppingCart,
} from 'lucide-react';
import AppLogo from './ui/AppLogo';
import useNotificationCount from './useNotificationCount';
import { useAuth } from './AuthProvider';

export interface FieldPortalLayoutProps {
  children: React.ReactNode;
  activeTab: string;
  onTabChange: (tab: any) => void;
  onRefresh?: () => void;
  loading?: boolean;
  assignedProjects?: any[];
  selectedProjectId?: string;
  onProjectChange?: (projectId: string) => void;
}

export default function FieldPortalLayout({
  children,
  activeTab,
  onTabChange,
  onRefresh,
  loading = false,
  assignedProjects = [],
  selectedProjectId = '',
  onProjectChange,
}: FieldPortalLayoutProps) {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [planningOpen, setPlanningOpen] = useState(true);
  const { user, loading: authLoading, error, reload, signOut, access, can } = useAuth();
  const router = useRouter();
  const unreadNotifications = useNotificationCount();

  useEffect(() => {
    if (!authLoading && !user && !error) {
      router.replace('/sign-up-login');
    }
  }, [user, authLoading, error, router]);

  const isSupervisorOrAdmin = hasSupervisorRole(access);

  if (error) {
    return (
      <main className="min-h-screen flex items-center justify-center p-6 bg-background">
        <div className="card p-8 max-w-md text-center">
          <h1 className="text-xl font-bold">Field Portal Connection Unavailable</h1>
          <p role="alert" className="my-4 text-sm text-muted-foreground">
            {error}
          </p>
          <button className="btn-primary w-full justify-center" onClick={() => void reload()}>
            Retry Connection
          </button>
        </div>
      </main>
    );
  }

  if (authLoading || !user) {
    return (
      <main
        className="min-h-screen flex items-center justify-center text-muted-foreground bg-background"
        role="status"
      >
        <div className="flex items-center gap-3">
          <RefreshCw className="h-5 w-5 animate-spin text-primary" />
          <span>Opening Field Operations Portal…</span>
        </div>
      </main>
    );
  }

  const name = [user.first_name, user.last_name].filter(Boolean).join(' ');

  const navItems = [
    {
      id: 'MY_WORK',
      label: 'My Work & Tasks',
      icon: Wrench,
    },
    {
      id: 'SHIFT_LOGS',
      label: 'Manage Shifts',
      icon: Flame,
    },
    {
      id: 'EQUIPMENT',
      label: 'Equipment & Maintenance',
      icon: Truck,
    },
    ...(isSupervisorOrAdmin ? [{ id: 'PURCHASE_ORDERS', label: 'Purchase Orders', icon: ShoppingCart }] : []),
    {
      id: 'STORES',
      label: 'Stores & Consumables',
      icon: Package,
    },
    {
      id: 'TEAM',
      label: 'Site Team & Personnel',
      icon: Users,
    },
    {
      id: 'PROFILE',
      label: 'My Profile & Leave',
      icon: User,
    },
  ];

  const bottomNavItems = [
    { id: 'MY_WORK', label: 'Work', icon: Wrench },
    { id: 'SHIFT_LOGS', label: 'Shifts', icon: Flame },
    { id: 'EQUIPMENT', label: 'Fleet', icon: Truck },
    { id: 'STORES', label: 'Stores', icon: Package },
    { id: 'PROFILE', label: 'Profile', icon: User },
  ];

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      {/* DESKTOP SIDEBAR */}
      <aside
        className={
          'border-r bg-card hidden md:flex flex-col flex-shrink-0 transition-all duration-300 z-30 no-print ' +
          (collapsed ? 'w-16' : 'w-64')
        }
      >
        {/* Field Portal Logo & Header */}
        <div className="h-16 flex items-center justify-between px-4 border-b">
          <div className="flex items-center gap-3 overflow-hidden">
            <AppLogo size={28} />
            {!collapsed && (
              <div className="min-w-0">
                <strong className="block text-sm font-bold tracking-tight truncate">
                  Field Portal
                </strong>
                <span className="text-[10px] uppercase font-semibold text-muted-foreground tracking-wider">
                  Cestos Field Ops
                </span>
              </div>
            )}
          </div>

          <button
            onClick={() => setCollapsed(!collapsed)}
            className="p-1.5 rounded hover:bg-muted text-muted-foreground"
            aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          >
            {collapsed ? <PanelLeftOpen size={16} /> : <PanelLeftClose size={16} />}
          </button>
        </div>

        {/* Dedicated Navigation Links */}
        <nav className="flex-1 overflow-y-auto py-4 px-2 space-y-1 scrollbar-thin">
          {!collapsed && (
            <p className="px-3 py-1 text-[10px] font-bold uppercase tracking-widest text-muted-foreground/75">
              Field Navigation
            </p>
          )}

          {navItems.filter(item => isSupervisorOrAdmin || item.id !== 'SHIFT_LOGS').map((item) => {
            const Icon = item.icon;
            const active = activeTab === item.id;
            return (
              <React.Fragment key={item.id}>
                {item.id === 'TEAM' && isSupervisorOrAdmin && (
                  <>
                    <button
                      type="button"
                      onClick={() => setPlanningOpen(!planningOpen)}
                      aria-expanded={planningOpen}
                      aria-controls="field-planning-menu"
                      title="Planning"
                      className="flex items-center gap-3 w-full px-3 py-2.5 rounded-lg text-xs font-semibold text-muted-foreground hover:bg-muted hover:text-foreground"
                    >
                      <Compass className="h-4 w-4 shrink-0" />
                      {!collapsed && (
                        <>
                          <span className="flex-1 text-left">Planning</span>
                          <ChevronDown className={`h-4 w-4 transition-transform ${planningOpen ? '' : '-rotate-90'}`} />
                        </>
                      )}
                    </button>
                    {planningOpen && (
                      <div id="field-planning-menu" className={collapsed ? 'space-y-1' : 'ml-5 border-l pl-2 space-y-1'}>
                        {[
                          { id: 'DRILL_HOLES', label: 'Drill Holes', icon: Compass },
                          { id: 'WORK_ORDERS', label: 'Work Orders', icon: Wrench },
                        ].map((subItem) => {
                          const SubIcon = subItem.icon;
                          const subActive = activeTab === subItem.id;
                          return (
                            <button
                              key={subItem.id}
                              type="button"
                              title={subItem.label}
                              aria-current={subActive ? 'page' : undefined}
                              onClick={() => {
                                onTabChange(subItem.id);
                                setMobileMenuOpen(false);
                              }}
                              className={`flex items-center gap-3 w-full px-3 py-2.5 rounded-lg text-xs font-semibold ${
                                subActive ? 'bg-secondary text-primary font-bold' : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                              }`}
                            >
                              <SubIcon className="h-4 w-4 shrink-0" />
                              {!collapsed && <span>{subItem.label}</span>}
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </>
                )}
                <button
                  onClick={() => {
                    onTabChange(item.id);
                    setMobileMenuOpen(false);
                  }}
                  title={item.label}
                  className={
                    'flex items-center gap-3 w-full px-3 py-2.5 rounded-lg text-xs font-semibold transition-colors ' +
                    (active
                      ? 'bg-secondary text-primary font-bold'
                      : 'text-muted-foreground hover:bg-muted hover:text-foreground')
                  }
                >
                  <Icon className={`h-4 w-4 shrink-0 ${active ? 'text-primary' : 'text-muted-foreground'}`} />
                  {!collapsed && <span className="truncate">{item.label}</span>}
                </button>
              </React.Fragment>
            );
          })}

          <div className="border-t my-4" />

          {/* Quick ERP Switcher (if authorized) */}
          {!user.is_field_portal_only && (
            <button
              onClick={() => router.push('/')}
              title="Switch to Full Operations Platform"
              className="flex items-center gap-3 w-full px-3 py-2 rounded-lg text-xs font-medium text-muted-foreground hover:bg-muted hover:text-foreground transition"
            >
              <ArrowRight className="h-4 w-4 shrink-0 text-muted-foreground" />
              {!collapsed && <span className="truncate">Full ERP Platform</span>}
            </button>
          )}
        </nav>

        {/* Sidebar Footer User Section */}
        <div className="border-t p-3 space-y-2">
          {!collapsed && (
            <div className="px-2 py-1.5 bg-muted/40 rounded-lg border text-xs">
              <p className="font-bold truncate">{name}</p>
              <p className="text-[10px] text-muted-foreground truncate">{user.email}</p>
            </div>
          )}

          <button
            onClick={() => void signOut()}
            className="flex items-center gap-2.5 w-full px-3 py-2 rounded-lg hover:bg-destructive/10 text-xs font-semibold text-destructive transition"
          >
            <LogOut size={16} />
            {!collapsed && 'Sign Out'}
          </button>
        </div>
      </aside>

      {/* MOBILE SLIDE-OVER DRAWER & BACKDROP */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 z-50 md:hidden flex">
          <div
            className="fixed inset-0 bg-black/60 backdrop-blur-xs transition-opacity"
            onClick={() => setMobileMenuOpen(false)}
          />

          <div className="relative w-72 max-w-[85vw] bg-card h-full flex flex-col z-50 shadow-2xl border-r">
            <div className="h-16 flex items-center justify-between px-4 border-b bg-card">
              <div className="flex items-center gap-2.5">
                <AppLogo size={26} />
                <div>
                  <strong className="block text-sm font-bold tracking-tight">Field Portal</strong>
                  <span className="text-[10px] uppercase font-semibold text-muted-foreground">Cestos Field Ops</span>
                </div>
              </div>
              <button
                onClick={() => setMobileMenuOpen(false)}
                className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground"
              >
                <X size={18} />
              </button>
            </div>

            <nav className="flex-1 overflow-y-auto p-3 space-y-1">
              <p className="px-3 py-1 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                Field Operations Menu
              </p>

              {navItems.filter(item => isSupervisorOrAdmin || item.id !== 'SHIFT_LOGS').map((item) => {
                const Icon = item.icon;
                const active = activeTab === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => {
                      onTabChange(item.id);
                      setMobileMenuOpen(false);
                    }}
                    className={`flex items-center gap-3 w-full px-3 py-3 rounded-xl text-xs font-bold transition-all ${
                      active ? 'bg-primary text-primary-foreground shadow-sm' : 'text-foreground hover:bg-muted'
                    }`}
                  >
                    <Icon className="h-4 w-4 shrink-0" />
                    <span>{item.label}</span>
                  </button>
                );
              })}

              <div className="border-t my-3" />
              <p className="px-3 py-1 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                Field Planning
              </p>
              {[
                { id: 'DRILL_HOLES', label: 'Drill Holes', icon: Compass },
                { id: 'WORK_ORDERS', label: 'Work Orders', icon: Wrench },
              ].map((subItem) => {
                const SubIcon = subItem.icon;
                const active = activeTab === subItem.id;
                return (
                  <button
                    key={subItem.id}
                    onClick={() => {
                      onTabChange(subItem.id);
                      setMobileMenuOpen(false);
                    }}
                    className={`flex items-center gap-3 w-full px-3 py-2.5 rounded-xl text-xs font-semibold ${
                      active ? 'bg-secondary text-primary font-bold' : 'text-muted-foreground hover:bg-muted'
                    }`}
                  >
                    <SubIcon className="h-4 w-4 shrink-0" />
                    <span>{subItem.label}</span>
                  </button>
                );
              })}

              {!user.is_field_portal_only && (
                <>
                  <div className="border-t my-3" />
                  <button
                    onClick={() => router.push('/')}
                    className="flex items-center gap-3 w-full px-3 py-2.5 rounded-xl text-xs font-semibold text-primary bg-primary/10 hover:bg-primary/20"
                  >
                    <ArrowRight className="h-4 w-4 shrink-0" />
                    <span>Full ERP Platform</span>
                  </button>
                </>
              )}
            </nav>

            <div className="p-3 border-t bg-muted/20 space-y-2">
              <div className="px-3 py-2 bg-card rounded-lg border text-xs">
                <p className="font-bold truncate text-foreground">{name}</p>
                <p className="text-[10px] text-muted-foreground truncate">{user.email}</p>
              </div>
              <button
                onClick={() => void signOut()}
                className="flex items-center justify-center gap-2 w-full py-2 bg-destructive/10 text-destructive hover:bg-destructive/20 font-bold rounded-lg text-xs transition"
              >
                <LogOut size={15} />
                <span>Sign Out</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MAIN CONTENT AREA */}
      <div className="flex-1 flex flex-col overflow-hidden min-w-0">
        {/* DEDICATED FIELD TOPBAR HEADER */}
        <header className="h-16 border-b bg-card flex items-center justify-between px-3 md:px-6 gap-2 sm:gap-4 flex-shrink-0 z-20 no-print">
          <div className="flex items-center gap-2 sm:gap-3">
            {/* Mobile Hamburger Menu Button */}
            <button
              onClick={() => setMobileMenuOpen(true)}
              className="p-2 rounded-xl hover:bg-muted text-foreground md:hidden border shadow-xs"
              aria-label="Open mobile menu"
            >
              <Menu size={18} />
            </button>

            {/* HEADER ASSIGNED PROJECT SWITCHER */}
            {assignedProjects && assignedProjects.length > 0 && (
              <div className="flex items-center gap-1.5 bg-muted/40 border border-primary/20 rounded-xl px-2.5 py-1 text-xs shadow-sm max-w-[180px] sm:max-w-xs">
                <Compass className="h-4 w-4 text-primary shrink-0 animate-pulse" />
                <span className="text-muted-foreground font-semibold text-[11px] hidden md:inline-block">Project:</span>
                <select
                  value={selectedProjectId || assignedProjects[0]?.id || ''}
                  onChange={(e) => onProjectChange && onProjectChange(e.target.value)}
                  className="bg-transparent font-bold text-foreground focus:outline-none cursor-pointer text-xs pr-1 truncate w-full"
                  title="Switch Active Assigned Project View"
                >
                  {assignedProjects.map((p) => (
                    <option key={p.id} value={p.id} className="bg-background text-foreground">
                      {p.name} {p.code ? `[${p.code}]` : ''}
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>

          {/* Right Header Actions */}
          <div className="flex items-center gap-1.5 sm:gap-3">
            <Link
              href="/field-portal/notifications"
              title={unreadNotifications > 0 ? `${unreadNotifications} new notifications` : 'Notifications'}
              aria-label={`Notifications${unreadNotifications ? `, ${unreadNotifications} unread` : ''}`}
              className={`relative p-2 rounded-lg border transition ${
                unreadNotifications > 0
                  ? 'bg-amber-50 border-amber-300 text-amber-700 dark:bg-amber-950/40 dark:border-amber-800 dark:text-amber-400'
                  : 'text-blue-800 bg-blue-50 border-blue-200 hover:bg-blue-100'
              }`}
            >
              <Bell className={`h-5 w-5 ${unreadNotifications > 0 ? 'text-amber-600 dark:text-amber-400 animate-pulse' : ''}`} />
              {unreadNotifications > 0 && (
                <span className="absolute -top-1 -right-1 min-w-5 h-5 px-1 rounded-full bg-red-600 text-white ring-2 ring-white text-[10px] leading-5 text-center font-bold">
                  {unreadNotifications > 99 ? '99+' : unreadNotifications}
                </span>
              )}
            </Link>
            {onRefresh && (
              <button
                onClick={onRefresh}
                className="p-2 text-muted-foreground hover:text-foreground rounded-xl hover:bg-muted transition border sm:border-0"
                title="Refresh Field Data"
              >
                <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
              </button>
            )}

            {!user.is_field_portal_only && (
              <Link
                href="/"
                className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 bg-primary/10 hover:bg-primary/20 text-primary font-bold text-xs rounded-xl border border-primary/20 transition"
              >
                <span>Full ERP</span>
                <ArrowRight size={14} />
              </Link>
            )}

            <div className="h-6 w-px bg-border mx-0.5 hidden sm:block" />

            {/* Profile badge */}
            <button
              onClick={() => onTabChange('PROFILE')}
              className="flex items-center gap-2 hover:opacity-80 transition cursor-pointer p-1 rounded-xl hover:bg-muted"
              title="View My Profile & Leave"
            >
              <div className="h-8 w-8 rounded-full bg-primary text-primary-foreground font-extrabold flex items-center justify-center text-xs shadow-sm">
                {user.first_name?.[0] || 'F'}
              </div>
              <span className="text-xs font-bold hidden md:inline-block truncate max-w-[100px]">
                {user.first_name}
              </span>
            </button>
          </div>
        </header>

        {/* DEDICATED MAIN SCROLL CONTENT */}
        <main className="flex-1 overflow-y-auto scrollbar-thin p-3 sm:p-5 md:p-6 lg:p-8 pb-24 md:pb-8">
          <div className="max-w-7xl mx-auto space-y-5 sm:space-y-6">
            {children}
          </div>
        </main>

        {/* MOBILE BOTTOM NAVIGATION TABBAR */}
        <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-card/95 backdrop-blur-md border-t flex justify-around items-center h-16 px-1 shadow-lg no-print">
          {bottomNavItems.filter(item => isSupervisorOrAdmin || item.id !== 'SHIFT_LOGS').map((item) => {
            const Icon = item.icon;
            const active = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => onTabChange(item.id)}
                className={`flex items-center justify-center w-full h-full transition-all relative ${
                  active ? 'text-primary font-bold' : 'text-muted-foreground hover:text-foreground font-medium'
                }`}
              >
                {active && (
                  <span className="absolute top-0 w-8 h-0.5 bg-primary rounded-full" />
                )}
                <Icon className={`h-5 w-5 ${active ? 'scale-110 text-primary' : ''} transition-transform`} />

              </button>
            );
          })}
        </nav>
      </div>
    </div>
  );
}
