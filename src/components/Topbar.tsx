'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Bell, Search, LogOut, Zap, Sparkles, X, User, Clock, Calendar, ShieldCheck } from 'lucide-react';
import { useAuth } from './AuthProvider';
import { useData, rows } from './DataUI';

export default function Topbar() {
  const auth = useAuth();
  const router = useRouter();
  const [search, setSearch] = useState('');
  const [resource, setResource] = useState('projects');
  const [show, setShow] = useState(false);

  const notifications = useData('/api/v1/hr/notifications');
  const unread = rows(notifications?.data)?.filter(r => !r?.read_at)?.length;

  const sections = [
    ['Projects', 'projects', 'projects.read'],
    ['Employees', 'employees', 'employees.read_basic'],
    ['Assets', 'assets', 'assets.read'],
    ['Inventory', 'inventory/items', 'inventory.read'],
    ['Documents', 'documents', 'documents.read'],
  ]?.filter(([, , p]) => auth?.can(p));

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const query = search.trim();
    if (resource === 'documents') {
      router.push('/documents' + (query ? '?search=' + encodeURIComponent(query) : ''));
      return;
    }

    const targetResource = sections?.some(([, r]) => r === resource)
      ? resource
      : sections?.[0]?.[1] || 'projects';
    
    router.push('/workspace/' + targetResource + (query ? '?search=' + encodeURIComponent(query) : ''));
  };

  return (
    <header className="min-h-14 border-b bg-card flex items-center px-4 md:px-6 gap-3 flex-shrink-0 no-print">
      {/* Search */}
      <form
        className="hidden md:flex flex-1 max-w-xl items-center gap-2 bg-muted/40 border border-border px-3 py-1.5 focus-within:ring-2 focus-within:ring-primary/40 focus-within:border-primary/40 transition-all"
        onSubmit={handleSearchSubmit}
      >
        <Search size={16} className="text-muted-foreground flex-shrink-0" />
        <select
          aria-label="Search section"
          className="text-xs bg-transparent border-0 font-600 text-foreground cursor-pointer focus:outline-none max-w-28 border-r border-border pr-2"
          value={resource}
          onChange={e => setResource(e?.target?.value)}
        >
          {sections?.map(([name, r]) => (
            <option value={r} key={r}>
              {name}
            </option>
          ))}
        </select>
        <input
          className="text-xs bg-transparent outline-none flex-1 min-w-0 px-2 font-500 placeholder:text-muted-foreground"
          aria-label="Search records"
          placeholder={`Search ${sections?.find(([, r]) => r === resource)?.[0] || 'records'}...`}
          value={search}
          onChange={e => setSearch(e?.target?.value)}
        />
        {search && (
          <button
            type="button"
            onClick={() => setSearch('')}
            className="text-muted-foreground hover:text-foreground p-0.5"
            title="Clear search"
          >
            <X size={14} />
          </button>
        )}
        <button
          type="submit"
          className="btn-primary text-xs py-1 px-2.5 font-600 ml-1 flex items-center gap-1"
        >
          <span>Search</span>
        </button>
      </form>

      {/* Right side */}
      <div className="ml-auto flex items-center gap-3">
        {/* Command Center Button */}
        <Link
          href="/command-center"
          className="flex items-center gap-1.5 px-3 py-1.5 bg-primary/10 hover:bg-primary/20 text-primary font-600 text-xs transition-colors border border-primary/20"
          title="Open Action Command Center"
        >
          <Zap size={14} className="fill-primary/20" />
          <span>Command Center</span>
        </Link>

        {/* Intelligence Page Button for High-Level Authorized Users */}
        {auth.can('intelligence.read') && (
          <Link
            href="/intelligence"
            className="flex items-center gap-1.5 px-3 py-1.5 gradient-brand text-white font-600 text-xs shadow-sm hover:opacity-90 transition-opacity"
            title="Open Executive Operations Intelligence & AI Wizard"
          >
            <Sparkles size={14} />
            <span>Intelligence</span>
          </Link>
        )}

        {/* Notifications */}
        <Link
          aria-label={'Notifications' + (unread ? ', ' + unread + ' unread' : '')}
          href="/workspace/hr/notifications"
          className="relative p-2 hover:bg-muted"
        >
          <Bell size={18} />
          {unread > 0 && (
            <span className="absolute -top-0.5 -right-0.5 bg-accent text-white text-[10px] px-1">
              {unread}
            </span>
          )}
        </Link>

        {/* User menu */}
        <div className="relative">
          <button
            className="flex items-center gap-2 px-2 py-2 hover:bg-muted"
            onClick={() => setShow(!show)}
            aria-expanded={show}
          >
            <span className="w-7 h-7 gradient-brand flex items-center justify-center text-xs font-bold text-white">
              {auth?.user?.first_name?.[0]}
              {auth?.user?.last_name?.[0]}
            </span>
            <span className="hidden sm:inline text-sm font-medium">
              {auth?.user?.first_name} {auth?.user?.last_name}
            </span>
          </button>

          {show && (
            <>
              <div className="fixed inset-0 z-30" onClick={() => setShow(false)} />
              <div className="absolute right-0 top-full mt-2 card shadow-xl p-3 w-72 z-40 border border-border divide-y divide-border">
                {/* Profile Header */}
                <div className="pb-3 px-1">
                  <div className="flex items-center gap-3">
                    <span className="w-10 h-10 gradient-brand flex items-center justify-center text-sm font-bold text-white shadow-sm flex-shrink-0">
                      {auth?.user?.first_name?.[0]}
                      {auth?.user?.last_name?.[0]}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-semibold text-foreground truncate">
                        {auth?.user?.first_name} {auth?.user?.last_name}
                      </p>
                      <p className="text-xs text-muted-foreground truncate">{auth?.user?.email}</p>
                      <div className="flex flex-wrap gap-1 mt-1.5">
                        {(auth?.access?.roles || ['Staff']).map((role) => (
                          <span
                            key={role}
                            className="inline-block px-1.5 py-0.5 text-[10px] font-semibold bg-primary/10 text-primary border border-primary/20 capitalize"
                          >
                            {role.replace('_', ' ')}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Quick Navigation / Profile links */}
                <div className="py-2 space-y-0.5">
                  <Link
                    href="/workspace/employees/me"
                    onClick={() => setShow(false)}
                    className="flex items-center gap-2.5 px-2.5 py-2 text-xs font-medium text-foreground hover:bg-muted transition-colors"
                  >
                    <User size={15} className="text-muted-foreground" />
                    <span>My Profile</span>
                  </Link>

                  <Link
                    href="/workspace/hr/me/time-logs"
                    onClick={() => setShow(false)}
                    className="flex items-center gap-2.5 px-2.5 py-2 text-xs font-medium text-foreground hover:bg-muted transition-colors"
                  >
                    <Clock size={15} className="text-muted-foreground" />
                    <span>My Activity & Time Logs</span>
                  </Link>

                  <Link
                    href="/workspace/hr/me/leave-requests"
                    onClick={() => setShow(false)}
                    className="flex items-center gap-2.5 px-2.5 py-2 text-xs font-medium text-foreground hover:bg-muted transition-colors"
                  >
                    <Calendar size={15} className="text-muted-foreground" />
                    <span>My Leave Requests</span>
                  </Link>

                  <Link
                    href="/workspace/hr/notifications"
                    onClick={() => setShow(false)}
                    className="flex items-center gap-2.5 px-2.5 py-2 text-xs font-medium text-foreground hover:bg-muted transition-colors"
                  >
                    <Bell size={15} className="text-muted-foreground" />
                    <span>Notifications</span>
                  </Link>

                  {(auth?.access?.is_superuser || auth?.can('users.manage')) && (
                    <Link
                      href="/workspace/admin"
                      onClick={() => setShow(false)}
                      className="flex items-center gap-2.5 px-2.5 py-2 text-xs font-medium text-foreground hover:bg-muted transition-colors"
                    >
                      <ShieldCheck size={15} className="text-muted-foreground" />
                      <span>System Administration</span>
                    </Link>
                  )}
                </div>

                {/* Sign out */}
                <div className="pt-2">
                  <button
                    className="flex items-center justify-center gap-2 w-full px-3 py-2 text-xs font-semibold text-destructive hover:bg-destructive/10 transition-colors"
                    onClick={() => {
                      setShow(false);
                      void auth?.signOut();
                    }}
                  >
                    <LogOut size={14} />
                    <span>Sign Out</span>
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
