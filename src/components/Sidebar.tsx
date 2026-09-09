'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  FolderKanban,
  Users,
  Wrench,
  Package,
  BarChart2,
  Bell,
  Settings,
  ChevronDown,
  ChevronRight,
  PanelLeftClose,
  PanelLeftOpen,
  Building2,
  MapPin,
  Boxes,
  ArrowLeftRight,
  ClipboardList,
  FileText,
  TrendingDown,
  RotateCcw,
  BookOpen,
  UserCheck,
  Calendar,
  GraduationCap,
  Shield,
  Truck,
  AlertTriangle,
  CheckSquare,
  User,
  LogOut,
} from 'lucide-react';
import AppLogo from '@/components/ui/AppLogo';

interface NavItem {
  id: string;
  label: string;
  icon: React.ReactNode;
  href?: string;
  badge?: number;
  children?: NavItem[];
}

const NAV_ITEMS: NavItem[] = [
  {
    id: 'nav-dashboard',
    label: 'Dashboard',
    icon: <LayoutDashboard size={18} />,
    href: '/',
  },
  {
    id: 'nav-projects',
    label: 'Projects',
    icon: <FolderKanban size={18} />,
    children: [
      { id: 'nav-projects-all', label: 'All Projects', icon: <FolderKanban size={15} />, href: '/project-command-center' },
      { id: 'nav-projects-clients', label: 'Clients', icon: <Building2 size={15} />, href: '/project-command-center' },
      { id: 'nav-projects-locations', label: 'Locations', icon: <MapPin size={15} />, href: '/project-command-center' },
    ],
  },
  {
    id: 'nav-workforce',
    label: 'Workforce',
    icon: <Users size={18} />,
    children: [
      { id: 'nav-workforce-overview', label: 'Overview', icon: <LayoutDashboard size={15} />, href: '/workforce-overview' },
      { id: 'nav-workforce-employees', label: 'Employees', icon: <Users size={15} />, href: '/workforce-overview' },
      { id: 'nav-workforce-availability', label: 'Availability', icon: <UserCheck size={15} />, href: '/workforce-overview' },
      { id: 'nav-workforce-rotations', label: 'Rotations', icon: <RotateCcw size={15} />, href: '/workforce-overview' },
      { id: 'nav-workforce-leave', label: 'Leave', icon: <Calendar size={15} />, href: '/workforce-overview' },
      { id: 'nav-workforce-training', label: 'Training & Compliance', icon: <GraduationCap size={15} />, href: '/workforce-overview' },
      { id: 'nav-workforce-documents', label: 'Documents', icon: <FileText size={15} />, href: '/workforce-overview' },
    ],
  },
  {
    id: 'nav-equipment',
    label: 'Equipment',
    icon: <Wrench size={18} />,
    children: [
      { id: 'nav-equipment-fleet', label: 'Fleet Overview', icon: <LayoutDashboard size={15} />, href: '/fleet-dashboard' },
      { id: 'nav-equipment-assets', label: 'Assets', icon: <Truck size={15} />, href: '/fleet-dashboard' },
      { id: 'nav-equipment-available', label: 'Available Equipment', icon: <CheckSquare size={15} />, href: '/fleet-dashboard' },
      { id: 'nav-equipment-inspections', label: 'Inspections', icon: <Shield size={15} />, href: '/fleet-dashboard' },
      { id: 'nav-equipment-defects', label: 'Defects', icon: <AlertTriangle size={15} />, href: '/fleet-dashboard', badge: 2 },
      { id: 'nav-equipment-compliance', label: 'Compliance', icon: <BookOpen size={15} />, href: '/fleet-dashboard' },
    ],
  },
  {
    id: 'nav-inventory',
    label: 'Inventory',
    icon: <Package size={18} />,
    children: [
      { id: 'nav-inv-overview', label: 'Overview', icon: <LayoutDashboard size={15} />, href: '/inventory-overview' },
      { id: 'nav-inv-items', label: 'Items', icon: <Boxes size={15} />, href: '/inventory-overview' },
      { id: 'nav-inv-stores', label: 'Stores', icon: <Building2 size={15} />, href: '/inventory-overview' },
      { id: 'nav-inv-requests', label: 'Requests', icon: <ClipboardList size={15} />, href: '/inventory-overview', badge: 6 },
      { id: 'nav-inv-receipts', label: 'Receipts', icon: <Package size={15} />, href: '/inventory-overview' },
      { id: 'nav-inv-issues', label: 'Issues', icon: <ArrowLeftRight size={15} />, href: '/inventory-overview' },
      { id: 'nav-inv-transfers', label: 'Transfers', icon: <Truck size={15} />, href: '/inventory-overview' },
      { id: 'nav-inv-returns', label: 'Returns', icon: <RotateCcw size={15} />, href: '/inventory-overview' },
      { id: 'nav-inv-reservations', label: 'Reservations', icon: <BookOpen size={15} />, href: '/inventory-overview' },
      { id: 'nav-inv-counts', label: 'Stock Counts', icon: <CheckSquare size={15} />, href: '/inventory-overview' },
      { id: 'nav-inv-adjustments', label: 'Adjustments', icon: <TrendingDown size={15} />, href: '/inventory-overview' },
      { id: 'nav-inv-transactions', label: 'Transactions', icon: <FileText size={15} />, href: '/inventory-overview' },
      { id: 'nav-inv-forecast', label: 'Forecast & Reorder', icon: <BarChart2 size={15} />, href: '/inventory-overview' },
      { id: 'nav-inv-reports', label: 'Reports', icon: <BarChart2 size={15} />, href: '/inventory-overview' },
    ],
  },
  {
    id: 'nav-reports',
    label: 'Reports',
    icon: <BarChart2 size={18} />,
    href: '/',
  },
];

const BOTTOM_ITEMS: NavItem[] = [
  { id: 'nav-my-workspace', label: 'My Workspace', icon: <User size={18} />, href: '/' },
  { id: 'nav-notifications', label: 'Notifications', icon: <Bell size={18} />, href: '/', badge: 8 },
  { id: 'nav-admin', label: 'Administration', icon: <Settings size={18} />, href: '/' },
  { id: 'nav-settings', label: 'Settings', icon: <Settings size={18} />, href: '/' },
];

interface SidebarProps {
  collapsed: boolean;
  onToggle: () => void;
}

export default function Sidebar({ collapsed, onToggle }: SidebarProps) {
  const pathname = usePathname();
  const [openGroups, setOpenGroups] = useState<Set<string>>(new Set(['nav-projects', 'nav-inventory']));

  const toggleGroup = (id: string) => {
    setOpenGroups(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const isActive = (href?: string) => {
    if (!href) return false;
    if (href === '/') return pathname === '/';
    return pathname === href || pathname.startsWith(href + '/');
  };

  const isGroupActive = (item: NavItem) => {
    if (item.href) return isActive(item.href);
    return item.children?.some(c => isActive(c.href)) ?? false;
  };

  return (
    <aside
      className={`flex flex-col h-screen bg-card border-r border-border sidebar-transition overflow-hidden flex-shrink-0 ${
        collapsed ? 'w-16' : 'w-56'
      }`}
    >
      {/* Logo */}
      <div className={`flex items-center border-b border-border flex-shrink-0 ${collapsed ? 'justify-center px-0 py-4 h-14' : 'px-4 py-3 h-14 gap-2'}`}>
        <AppLogo size={28} />
        {!collapsed && (
          <div className="flex flex-col min-w-0">
            <span className="font-bold text-sm text-foreground leading-tight tracking-tight truncate">Cestos</span>
            <span className="text-2xs text-muted-foreground leading-tight">Operations</span>
          </div>
        )}
      </div>

      {/* Main nav */}
      <nav className="flex-1 overflow-y-auto scrollbar-thin py-2 px-2">
        <div className="space-y-0.5">
          {NAV_ITEMS.map(item => {
            const hasChildren = item.children && item.children.length > 0;
            const isOpen = openGroups.has(item.id);
            const active = isGroupActive(item);

            if (hasChildren && !collapsed) {
              return (
                <div key={item.id}>
                  <button
                    onClick={() => toggleGroup(item.id)}
                    className={`w-full flex items-center gap-2.5 px-2.5 py-2 rounded text-left transition-all duration-100 ${
                      active
                        ? 'bg-secondary text-primary font-semibold' :'text-muted-foreground hover:bg-muted hover:text-foreground'
                    }`}
                  >
                    <span className="flex-shrink-0">{item.icon}</span>
                    <span className="flex-1 text-sm font-medium truncate">{item.label}</span>
                    {item.badge && (
                      <span className="text-2xs font-bold bg-accent text-accent-foreground rounded-full px-1.5 py-0.5 min-w-[18px] text-center">
                        {item.badge}
                      </span>
                    )}
                    <span className="flex-shrink-0 text-muted-foreground">
                      {isOpen ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                    </span>
                  </button>
                  {isOpen && (
                    <div className="mt-0.5 ml-3 pl-2.5 border-l border-border space-y-0.5">
                      {item.children!.map(child => (
                        <Link
                          key={child.id}
                          href={child.href ?? '/'}
                          className={`flex items-center gap-2 px-2 py-1.5 rounded text-sm transition-all duration-100 ${
                            isActive(child.href)
                              ? 'bg-secondary text-primary font-semibold' :'text-muted-foreground hover:bg-muted hover:text-foreground'
                          }`}
                        >
                          <span className="flex-shrink-0">{child.icon}</span>
                          <span className="truncate">{child.label}</span>
                          {child.badge && (
                            <span className="ml-auto text-2xs font-bold bg-accent text-accent-foreground rounded-full px-1.5 py-0.5 min-w-[18px] text-center">
                              {child.badge}
                            </span>
                          )}
                        </Link>
                      ))}
                    </div>
                  )}
                </div>
              );
            }

            if (hasChildren && collapsed) {
              return (
                <div key={item.id} className="relative nav-item-collapsed">
                  <button
                    onClick={() => toggleGroup(item.id)}
                    className={`w-full flex items-center justify-center p-2.5 rounded transition-all duration-100 ${
                      active ? 'bg-secondary text-primary' : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                    }`}
                  >
                    {item.icon}
                    {item.badge && (
                      <span className="absolute top-1 right-1 text-2xs font-bold bg-accent text-accent-foreground rounded-full w-3.5 h-3.5 flex items-center justify-center">
                        {item.badge > 9 ? '9+' : item.badge}
                      </span>
                    )}
                  </button>
                  <span className="nav-tooltip">{item.label}</span>
                </div>
              );
            }

            return (
              <div key={item.id} className="relative nav-item-collapsed">
                <Link
                  href={item.href ?? '/'}
                  className={`flex items-center gap-2.5 px-2.5 py-2 rounded transition-all duration-100 ${
                    collapsed ? 'justify-center' : ''
                  } ${
                    active
                      ? 'bg-secondary text-primary font-semibold' :'text-muted-foreground hover:bg-muted hover:text-foreground'
                  }`}
                >
                  <span className="flex-shrink-0">{item.icon}</span>
                  {!collapsed && <span className="text-sm font-medium truncate">{item.label}</span>}
                </Link>
                {collapsed && <span className="nav-tooltip">{item.label}</span>}
              </div>
            );
          })}
        </div>

        {/* Divider */}
        <div className="my-3 border-t border-border" />

        {/* Bottom items */}
        <div className="space-y-0.5">
          {BOTTOM_ITEMS.map(item => (
            <div key={item.id} className="relative nav-item-collapsed">
              <Link
                href={item.href ?? '/'}
                className={`flex items-center gap-2.5 px-2.5 py-2 rounded transition-all duration-100 ${
                  collapsed ? 'justify-center' : ''
                } text-muted-foreground hover:bg-muted hover:text-foreground`}
              >
                <span className="flex-shrink-0 relative">
                  {item.icon}
                  {item.badge && collapsed && (
                    <span className="absolute -top-1 -right-1 text-2xs font-bold bg-accent text-accent-foreground rounded-full w-3.5 h-3.5 flex items-center justify-center">
                      {item.badge > 9 ? '9+' : item.badge}
                    </span>
                  )}
                </span>
                {!collapsed && (
                  <>
                    <span className="text-sm font-medium truncate flex-1">{item.label}</span>
                    {item.badge && (
                      <span className="text-2xs font-bold bg-accent text-accent-foreground rounded-full px-1.5 py-0.5 min-w-[18px] text-center">
                        {item.badge}
                      </span>
                    )}
                  </>
                )}
              </Link>
              {collapsed && <span className="nav-tooltip">{item.label}</span>}
            </div>
          ))}
        </div>
      </nav>

      {/* User + collapse */}
      <div className="border-t border-border p-2 flex-shrink-0">
        {!collapsed && (
          <div className="flex items-center gap-2 px-2 py-2 rounded hover:bg-muted cursor-pointer mb-1 transition-colors">
            <div className="w-7 h-7 rounded-full gradient-brand flex items-center justify-center flex-shrink-0">
              <span className="text-2xs font-bold text-white">SO</span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-600 text-foreground truncate">Seth Owusu</p>
              <p className="text-2xs text-muted-foreground truncate">Operations Manager</p>
            </div>
            <LogOut size={13} className="text-muted-foreground flex-shrink-0" />
          </div>
        )}
        <button
          onClick={onToggle}
          className="w-full flex items-center justify-center gap-2 px-2 py-1.5 rounded text-muted-foreground hover:bg-muted hover:text-foreground transition-colors text-xs font-medium"
        >
          {collapsed ? <PanelLeftOpen size={16} /> : <><PanelLeftClose size={16} /><span>Collapse</span></>}
        </button>
      </div>
    </aside>
  );
}