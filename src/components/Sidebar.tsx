'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { LayoutDashboard, FileText, FolderKanban, Users, Truck, Package, ChevronDown, PanelLeftClose, PanelLeftOpen, LogOut, User, Bell, ShieldCheck, Building2, Flame, DollarSign, ShoppingBag } from 'lucide-react';
import AppLogo from './ui/AppLogo';
import { useAuth, canAccessAdministration } from './AuthProvider';
import { operation } from './ResourceWorkspace';

interface SidebarGroup {
  name: string;
  icon: React.ElementType;
  href: string;
  permission: string;
  sections: { title?: string; links: [string, string][] }[];
}

const groups: SidebarGroup[] = [
  {
    name: 'Dashboard',
    icon: Building2,
    href: '/',
    permission: 'projects.read',
    sections: [
      {
        title: 'Operations Oversight',
        links: [
          ['Executive Overview', '/'],
          ['Operations and Revenue', '/control-tower-overview'],
        ],
      },
      {
        title: 'Commercial & Costing',
        links: [
          ['Commercial Overview', '/commercial-overview'],
          ['Commercial Contracts', 'commercial/contracts'],
          ['Cost Subledger', 'commercial/cost-entries'],
          ['Revenue Subledger', 'commercial/revenue-entries'],
        ],
      },
      {
        title: 'Commercial Tenders',
        links: [
          ['Tender Pipeline', '/tenders-overview'],
          ['Tender Opportunities Data', 'control-tower/opportunities'],
        ],
      },
    ],
  },
  {
    name: 'Projects',
    icon: FolderKanban,
    href: '/projects-overview',
    permission: 'projects.read',
    sections: [
      {
        title: 'Portfolio & Sites',
        links: [
          ['All projects', 'projects'],
          ['Clients', 'clients'],
          ['Locations', 'locations'],
        ],
      },
      {
        title: 'Drilling Operations',
        links: [
          ['Drilling Overview', '/drilling-overview'],
          ['Shift Production Reports', 'drilling/shifts'],
          ['Drilling Programs', 'drilling/programs'],
          ['Drill Holes', 'drilling/holes'],
        ],
      },
    ],
  },
  {
    name: 'Workforce',
    icon: Users,
    href: '/workforce-overview',
    permission: 'employees.read_basic',
    sections: [
      {
        title: 'Personnel & Rotations',
        links: [
          ['Employees', 'employees'],
          ['Availability', 'employees/available'],
          ['Rotations', 'rotations/current'],
          ['Upcoming rotations', 'rotations/upcoming'],          
          ['Salaries & Compensation', 'hr/salaries'],
          ['Leave management', 'leave-management'],
        ],
      },
      {
        title: 'Field Leadership & Performance',
        links: [
          ['Field Leadership Scorecards', '/field-leadership-overview'],
          ['Supervisor Scorecards Data', 'control-tower/scorecards'],
        ],
      },
      {
        title: 'Compliance & Structure',
        links: [
          ['Training compliance', 'training/compliance'],
          ['Expiring documents', 'employee-documents/expiring'],
          ['Departments', 'departments'],
          ['Positions', 'positions'],
        ],
      },
    ],
  },
  {
    name: 'Equipments',
    icon: Truck,
    href: '/fleet-dashboard',
    permission: 'assets.read',
    sections: [
      {
        title: 'Equipment & Metering',
        links: [
          ['Equipment fleet', 'assets'],
          ['Components', 'components'],
          ['Meter readings', 'assets/meter-readings'],
          ['Asset categories', 'asset-categories'],
        ],
      },
      {
        title: 'Operations & Maintenance',
        links: [
          ['Maintenance & Schedules', 'maintenance'],
          ['Work orders', 'maintenance/work-orders'],
          ['Defects', 'maintenance/defects'],
          ['Inspections', 'inspections'],
          ['Fuel logs', 'fuel-logs'],
        ],
      },
      {
        title: 'HSE & Compliance',
        links: [
          ['HSE Incidents & Near-Misses', 'hse/incidents'],
          ['Expiring Licences & Compliance', 'assets/expiring-documents'],
        ],
      },
    ],
  },
  {
    name: 'Inventory & Procurement',
    icon: Package,
    href: '/inventory-overview',
    permission: 'inventory.read',
    sections: [
      {
        title: 'Procurement & POs',
        links: [
          ['Purchase Orders', 'procurement/purchase-orders'],
          ['Suppliers & Vendors', 'inventory/suppliers'],
        ],
      },
      {
        title: 'Stores & Facilities',
        links: [
          ['Stores & Facilities', 'inventory/stores'],
          ['Storage Bins & Locations', 'inventory/bins'],
          ['Items Catalog', 'inventory/items'],
          ['Item Categories', 'inventory/categories'],
          ['Units of Measure', 'inventory/units'],
        ],
      },
      {
        title: 'Stock Management',
        links: [
          ['Material Requests', 'inventory/requests'],
          ['Stock Receipts (GRN)', 'inventory/receipts'],
          ['Goods Issues', 'inventory/issues'],
          ['Stock Transfers', 'inventory/transfers'],
          ['Stock Returns', 'inventory/returns'],
          ['Stock Reservations', 'inventory/reservations'],
        ],
      },
      {
        title: 'Stock Control & Audits',
        links: [
          ['Current Stock Register', 'inventory/stock'],
          ['Stock Counts & Audits', 'inventory/stock-counts'],
          ['Stock Adjustments', 'inventory/adjustments'],
          ['Movement Ledger', 'inventory/transactions'],
          ['Custody Log', 'inventory/custody'],
        ],
      },
      {
        title: 'Planning & Vendors',
        links: [
          ['Reorder Recommendations', 'inventory/reorder-recommendations'],
          ['Demand Forecast', 'inventory/forecast'],
          ['Stock Policies', 'inventory/stock-policies'],
          ['Batches & Lots', 'inventory/lots'],
          ['Serial Numbers', 'inventory/serials'],
        ],
      },
    ],
  },
  {
    name: 'Documents',
    icon: FileText,
    href: '/documents',
    permission: 'documents.read',
    sections: [
      {
        title: 'Library',
        links: [
          ['Document library', 'documents'],
          ['Expiring documents', 'employee-documents/expiring'],
        ],
      },
    ],
  },
];

export default function Sidebar({
  collapsed,
  onToggle,
}: {
  collapsed: boolean;
  onToggle: () => void;
}) {
  const auth = useAuth();
  const path = usePathname();
  const [open, setOpen] = useState<string[]>(
    groups
      .filter(
        (g) =>
          path === g.href ||
          (g.name === 'Dashboard' && (path === '/' || path === '/control-tower-overview' || path === '/commercial-overview' || path === '/tenders-overview')) ||
          (g.name === 'Projects' && (path === '/project-command-center' || path === '/drilling-overview')) ||
          (g.name === 'Workforce' && (path === '/field-leadership-overview' || path === '/workforce-overview')) ||
          g.sections.some((s) => s.links.some(([, r]) => path === (r.startsWith('/') ? r : '/workspace/' + r)))
      )
      .map((g) => g.name)
  );

  const name = [auth.user?.first_name, auth.user?.last_name].filter(Boolean).join(' ');

  const active = (href: string) =>
    path === href || (href === '/' && path === '/control-tower-overview') || (href === '/projects-overview' && path === '/project-command-center')
      ? 'bg-secondary text-primary font-semibold' :'text-muted-foreground hover:bg-muted hover:text-foreground';

  return (
    <aside
      className={
        'border-r bg-card flex flex-col flex-shrink-0 sidebar-transition no-print ' + (collapsed ?'w-16' : 'w-60')
      }
    >
      {/* Logo */}
      <Link href="/" className="h-16 flex items-center gap-3 px-4 border-b">
        <AppLogo size={28} />
        {!collapsed && (
          <div>
            <strong className="block text-sm">Cestos</strong>
            <span className="text-xs text-muted-foreground">Operations</span>
          </div>
        )}
      </Link>

      {/* Navigation */}
      <nav
        className="flex-1 overflow-y-auto py-3 px-2 space-y-1 scrollbar-thin"
        aria-label="Main navigation"
      >
        {/* Module groups */}
        {groups
          .filter((g) => auth.can(g.permission))
          .map((g) => {
            const expanded = open.includes(g.name);
            return (
              <div key={g.name}>
                <div className="flex">
                  <Link
                    title={g.name}
                    href={g.href}
                    className={
                      'flex flex-1 gap-3 items-center p-2.5 rounded text-sm ' + active(g.href)
                    }
                  >
                    <g.icon size={18} />
                    {!collapsed && g.name}
                  </Link>
                  {!collapsed && (
                    <button
                      className="px-2 text-muted-foreground"
                      aria-label={'Toggle ' + g.name}
                      aria-expanded={expanded}
                      onClick={() =>
                        setOpen(expanded ? open.filter((x) => x !== g.name) : [...open, g.name])
                      }
                    >
                      <ChevronDown
                        size={14}
                        className={
                          'transition-transform duration-200 ' + (expanded ? 'rotate-180' : '')
                        }
                      />
                    </button>
                  )}
                </div>
                {!collapsed && expanded && (
                  <div className="ml-4 pl-3 border-l my-1 space-y-2">
                    {g.sections.map((sec, sIdx) => {
                      const visibleLinks = sec.links.filter(([, r]) => {
                        if (r.startsWith('/')) return true;
                        const op = operation('/api/v1/' + r, 'GET');
                        if (!op) return true;
                        return (op.permissions || []).every((p: string) => auth.can(p));
                      });
                      if (!visibleLinks.length) return null;
                      return (
                        <div key={sec.title || sIdx} className="space-y-0.5">
                          {sec.title && (
                            <p className="px-2 pt-1.5 pb-0.5 text-[10px] uppercase font-bold tracking-wider text-muted-foreground/75 select-none">
                              {sec.title}
                            </p>
                          )}
                          {visibleLinks.map(([label, resource]) => {
                            const targetHref = resource.startsWith('/') ? resource : '/workspace/' + resource;
                            return (
                              <Link
                                className={
                                  'block px-2 py-1.5 rounded text-xs transition-colors ' + active(targetHref)
                                }
                                href={targetHref}
                                key={resource}
                              >
                                {label}
                              </Link>
                            );
                          })}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}

        <div className="border-t my-3" />

        {/* Self-service & Admin links */}
        {[
          ['My activity', 'hr/me/time-logs'],
          ['My leave', 'hr/me/leave-requests'],
          ['Notifications', 'hr/notifications'],
          ['Administration', 'admin'],
        ].filter(([, r]) => r !== 'admin' || canAccessAdministration(auth)).map(([label, r]) => (
          <Link
            key={r}
            title={label}
            className={'flex gap-3 items-center p-2.5 rounded text-sm ' + active('/workspace/' + r)}
            href={'/workspace/' + r}
          >
            {r === 'hr/notifications' ? (
              <Bell size={18} />
            ) : r === 'admin' ? (
              <ShieldCheck size={18} />
            ) : (
              <User size={18} />
            )}
            {!collapsed && label}
          </Link>
        ))}
      </nav>

      {/* Footer */}
      <div className="border-t p-2">
        {!collapsed && (
          <div className="px-2 py-3">
            <p className="text-sm font-semibold truncate">{name}</p>
            <p className="text-xs text-muted-foreground truncate mt-1">
              {auth.access?.roles.join(', ') || 'Team member'}
            </p>
          </div>
        )}
        <button
          title="Sign out"
          className="flex items-center gap-2 w-full px-2 py-2 rounded hover:bg-muted text-sm text-muted-foreground"
          onClick={() => void auth.signOut()}
        >
          <LogOut size={16} />
          {!collapsed && 'Sign out'}
        </button>
        <button
          className="flex items-center justify-center gap-2 w-full py-2 rounded hover:bg-muted text-xs text-muted-foreground"
          onClick={onToggle}
          aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          {collapsed ? (
            <PanelLeftOpen size={16} />
          ) : (
            <>
              <PanelLeftClose size={16} />
              Collapse
            </>
          )}
        </button>
      </div>
    </aside>
  );
}
