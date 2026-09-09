'use client';

import React, { useState } from 'react';
import { Bell, Search, X, ChevronDown } from 'lucide-react';
import Link from 'next/link';

const NOTIFICATIONS = [
  { id: 'notif-001', type: 'critical', title: 'Asset Defect — CDR-002', sub: 'CRITICAL severity defect reported', time: '12 min ago', href: '/fleet-dashboard' },
  { id: 'notif-002', type: 'warning', title: 'Inventory Request REQ-00891', sub: 'Project Alpha — awaiting approval', time: '34 min ago', href: '/inventory-overview' },
  { id: 'notif-003', type: 'warning', title: 'Leave Request — Kwame Asante', sub: 'Sep 20–26 annual leave submitted', time: '1 hr ago', href: '/workforce-overview' },
  { id: 'notif-004', type: 'info', title: '7 Employee Documents Expiring', sub: 'Within the next 30 days', time: '2 hr ago', href: '/workforce-overview' },
  { id: 'notif-005', type: 'info', title: 'Transfer TRF-00412 Received', sub: 'Hydraulic Oil arrived at Alpha Store', time: '3 hr ago', href: '/inventory-overview' },
];

export default function Topbar() {
  const [notifOpen, setNotifOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchVal, setSearchVal] = useState('');

  return (
    <header className="h-13 border-b border-border bg-card flex items-center px-6 gap-4 flex-shrink-0 relative z-30" style={{ height: '52px' }}>
      {/* Search */}
      <div className="flex-1 max-w-sm">
        {searchOpen ? (
          <div className="flex items-center gap-2 bg-muted border border-border rounded px-3 py-1.5">
            <Search size={14} className="text-muted-foreground flex-shrink-0" />
            <input
              autoFocus
              value={searchVal}
              onChange={e => setSearchVal(e?.target?.value)}
              placeholder="Search employees, assets, items, projects..."
              className="flex-1 bg-transparent text-sm text-foreground outline-none placeholder:text-muted-foreground"
            />
            <button onClick={() => { setSearchOpen(false); setSearchVal(''); }}>
              <X size={14} className="text-muted-foreground hover:text-foreground" />
            </button>
          </div>
        ) : (
          <button
            onClick={() => setSearchOpen(true)}
            className="flex items-center gap-2 text-muted-foreground hover:text-foreground text-sm transition-colors"
          >
            <Search size={15} />
            <span className="hidden sm:inline">Search Cestos...</span>
            <span className="hidden md:inline text-2xs border border-border rounded px-1.5 py-0.5 font-mono">⌘K</span>
          </button>
        )}
      </div>

      <div className="flex items-center gap-1 ml-auto">
        {/* Notifications */}
        <div className="relative">
          <button
            onClick={() => setNotifOpen(prev => !prev)}
            className="relative flex items-center justify-center w-8 h-8 rounded hover:bg-muted transition-colors"
          >
            <Bell size={17} className="text-muted-foreground" />
            <span className="absolute top-1 right-1 w-4 h-4 bg-accent text-accent-foreground text-2xs font-bold rounded-full flex items-center justify-center">
              5
            </span>
          </button>

          {notifOpen && (
            <div className="absolute right-0 top-full mt-2 w-80 card shadow-card-lg z-50 fade-in">
              <div className="flex items-center justify-between px-4 py-3 border-b border-border">
                <span className="text-sm font-600 text-foreground">Needs Your Attention</span>
                <button onClick={() => setNotifOpen(false)}>
                  <X size={14} className="text-muted-foreground hover:text-foreground" />
                </button>
              </div>
              <div className="max-h-80 overflow-y-auto scrollbar-thin">
                {NOTIFICATIONS?.map(n => (
                  <Link
                    key={n?.id}
                    href={n?.href}
                    onClick={() => setNotifOpen(false)}
                    className={`flex gap-3 px-4 py-3 hover:bg-muted border-l-2 transition-colors block ${
                      n?.type === 'critical' ? 'border-red-500' : n?.type === 'warning' ? 'border-amber-500' : 'border-primary'
                    }`}
                  >
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-600 text-foreground truncate">{n?.title}</p>
                      <p className="text-2xs text-muted-foreground mt-0.5 truncate">{n?.sub}</p>
                    </div>
                    <span className="text-2xs text-muted-foreground whitespace-nowrap">{n?.time}</span>
                  </Link>
                ))}
              </div>
              <div className="px-4 py-2 border-t border-border">
                <button className="text-xs text-primary font-500 hover:underline">View all notifications</button>
              </div>
            </div>
          )}
        </div>

        {/* User */}
        <button className="flex items-center gap-2 px-2 py-1.5 rounded hover:bg-muted transition-colors ml-1">
          <div className="w-7 h-7 rounded-full gradient-brand flex items-center justify-center">
            <span className="text-2xs font-bold text-white">SO</span>
          </div>
          <span className="hidden md:inline text-sm font-500 text-foreground">Seth Owusu</span>
          <ChevronDown size={13} className="text-muted-foreground hidden md:inline" />
        </button>
      </div>
    </header>
  );
}