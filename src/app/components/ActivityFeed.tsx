'use client';

import React, { useState } from 'react';
import {
  FolderKanban,
  Wrench,
  Users,
  Package,
  Layers,
  Activity as ActivityIcon,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { useData, display, title, State } from '@/components/DataUI';

interface ActivityEvent {
  id: string;
  action: string;
  summary: string;
  author_name: string;
  created_at: string;
  details: Record<string, unknown>;
  previous: Record<string, unknown>;
}

// ── Action label map (sentence case) ─────────────────────────────────────────
const ACTION_LABELS: Record<string, string> = {
  'project.created': 'Project created',
  'project.updated': 'Project updated',
  'project.report_created': 'Report submitted',
  'project.report_updated': 'Report updated',
  'employee.created': 'Employee onboarded',
  'employee.updated': 'Employee updated',
  'employee.archived': 'Employee archived',
  'employee.restored': 'Employee restored',
  'employee.assigned': 'Employee assigned to project',
  'employee.assignment_updated': 'Assignment updated',
  'employee.assignment_completed': 'Assignment completed',
  'employee.transferred': 'Employee transferred',
  'employee.family_member_added': 'Family member added',
  'employee.family_member_updated': 'Family member updated',
  'employee.document_added': 'Document added',
  'employee.document_updated': 'Document updated',
  'employee.document_verified': 'Document verified',
  'employee.document_rejected': 'Document rejected',
  'employee.qualification_added': 'Qualification added',
  'employee.skill_added': 'Skill added',
  'employee.skill_updated': 'Skill updated',
  'employee.training_added': 'Training added',
  'employee.training_updated': 'Training updated',
  'employee.license_added': 'Licence added',
  'employee.license_updated': 'Licence updated',
  'employee.rotation_created': 'Rotation created',
  'asset.created': 'Asset created',
  'asset.updated': 'Asset updated',
  'asset.assigned': 'Asset assigned to project',
  'asset.unassigned': 'Asset unassigned',
  'asset.maintenance_created': 'Maintenance logged',
  'asset.fuel_logged': 'Fuel logged',
  'asset.defect_reported': 'Defect reported',
  'location.created': 'Site added',
  'location.updated': 'Site updated',
  'inventory.created': 'Inventory item added',
  'inventory.updated': 'Inventory item updated',
  'transfer.created': 'Stock transfer dispatched',
};

function actionLabel(action: string): string {
  if (!action) return 'Activity recorded';
  return (
    ACTION_LABELS[action] ?? action.replace(/[._]/g, ' ').replace(/^\w/, (c) => c.toUpperCase())
  );
}

function actionIcon(action: string) {
  const category = action?.split('.')[0] || '';
  switch (category) {
    case 'project':
      return <FolderKanban size={13} />;
    case 'employee':
      return <Users size={13} />;
    case 'asset':
      return <Wrench size={13} />;
    case 'inventory': case'transfer':
      return <Package size={13} />;
    case 'location':
      return <Layers size={13} />;
    default:
      return <ActivityIcon size={13} />;
  }
}

function iconBg(action: string) {
  const category = action?.split('.')[0] || '';
  switch (category) {
    case 'project':
      return 'bg-blue-100 text-blue-700';
    case 'employee':
      return 'bg-purple-100 text-purple-700';
    case 'asset':
      return 'bg-amber-100 text-amber-700';
    case 'inventory': case'transfer':
      return 'bg-green-100 text-green-700';
    default:
      return 'bg-slate-100 text-slate-700';
  }
}

// ── Resolve raw audit details (filter out remaining UUIDs) ────────────────────
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const SKIP_KEYS = new Set(['id', 'organization_id', 'created_by_id', 'updated_by_id']);

function isUUID(v: unknown): boolean {
  return typeof v === 'string' && UUID_RE.test(v);
}

function isRenderable(v: unknown): boolean {
  if (v == null || v === '') return false;
  if (isUUID(v)) return false;
  if (typeof v === 'object') return false;
  return true;
}

function resolvedEntries(blob: Record<string, unknown> | null | undefined): [string, string][] {
  if (!blob || typeof blob !== 'object') return [];
  return Object.entries(blob)
    .filter(([k, v]) => !SKIP_KEYS.has(k) && !k.endsWith('_id') && isRenderable(v))
    .map(([k, v]) => [title(k), display(v)]);
}

function changedFields(
  prev: Record<string, unknown> | null | undefined,
  next: Record<string, unknown> | null | undefined
): { label: string; before: string; after: string }[] {
  if (!prev || !next) return [];
  return Object.keys(next)
    .filter((k) => {
      if (SKIP_KEYS.has(k) || k.endsWith('_id')) return false;
      const before = prev[k];
      const after = next[k];
      if (!isRenderable(before) && !isRenderable(after)) return false;
      return String(before ?? '') !== String(after ?? '');
    })
    .map((k) => ({
      label: title(k),
      before: display(prev[k]),
      after: display(next[k]),
    }));
}

function ActivityDetailView({
  action,
  details,
  previous,
}: {
  action: string;
  details: Record<string, unknown> | null | undefined;
  previous: Record<string, unknown> | null | undefined;
}) {
  const isUpdate = action.includes('updated') || action.includes('completed');

  if (isUpdate && previous && Object.keys(previous).length > 0) {
    const diffs = changedFields(previous, details ?? {});
    if (diffs.length > 0) {
      return (
        <div className="mt-2 space-y-1">
          <p className="text-2xs font-600 uppercase text-muted-foreground">Changes</p>
          <div className="grid grid-cols-1 gap-1">
            {diffs.map(({ label, before, after }) => (
              <div
                key={label}
                className="border border-border p-1.5 rounded bg-background text-2xs"
              >
                <span className="font-600 text-muted-foreground">{label}: </span>
                <span className="line-through text-muted-foreground">{before}</span>
                <span className="mx-1">→</span>
                <span className="font-600 text-foreground">{after}</span>
              </div>
            ))}
          </div>
        </div>
      );
    }
  }

  if (!details) return null;
  const all = resolvedEntries(details);
  if (!all.length) return null;

  return (
    <div className="mt-2 grid grid-cols-2 gap-1.5">
      {all.slice(0, 6).map(([label, value]) => (
        <div key={label} className="border border-border p-1.5 rounded bg-background">
          <p className="text-2xs text-muted-foreground font-600">{label}</p>
          <p className="text-xs text-foreground font-500 truncate">{value}</p>
        </div>
      ))}
    </div>
  );
}

function ActivityItem({ item }: { item: ActivityEvent }) {
  const [expanded, setExpanded] = React.useState(false);

  // Determine if there's anything useful to expand
  const isUpdate =
    (item.action || '').includes('updated') || (item.action || '').includes('completed');
  const hasDiffs =
    isUpdate &&
    item.previous &&
    Object.keys(item.previous).length > 0 &&
    changedFields(item.previous, item.details ?? {}).length > 0;
  const hasFields = resolvedEntries(item.details).length > 0;
  const hasDetails = hasDiffs || hasFields;

  // The primary line to show — use backend-built summary if available
  const summaryLine: string = item.summary || actionLabel(item.action);

  return (
    <div className="px-4 py-3 hover:bg-muted/30 transition-colors">
      <div className="flex items-start gap-3">
        <div
          className={`w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5 ${iconBg(item.action)}`}
        >
          {actionIcon(item.action)}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <p className="text-xs font-600 text-foreground leading-snug">{summaryLine}</p>
              <p className="text-2xs text-muted-foreground mt-0.5">
                {actionLabel(item.action)}
                {item.author_name ? ` · ${item.author_name}` : ''}
              </p>
            </div>
            <span className="text-2xs text-muted-foreground tabular-nums flex-shrink-0 pt-0.5">
              {item.created_at ? display(item.created_at) : ''}
            </span>
          </div>
        </div>
        {hasDetails && (
          <button
            onClick={() => setExpanded(!expanded)}
            className="text-muted-foreground hover:text-foreground text-xs p-1 flex-shrink-0"
            title="Toggle details"
          >
            {expanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
          </button>
        )}
      </div>

      {expanded && (
        <ActivityDetailView action={item.action} details={item.details} previous={item.previous} />
      )}
    </div>
  );
}

export default function ActivityFeed() {
  const [page, setPage] = React.useState(1);
  const data = useData<{ items: ActivityEvent[]; total: number }>(
    '/api/v1/operations/activity?page_size=15&page=' + page
  );
  const activityList = data.data?.items || [];

  return (
    <div className="card h-fit">
      <div className="flex items-center justify-between px-4 py-3 border-b border-border">
        <span className="text-sm font-700 text-foreground">Recent activity</span>
        <button
          className="text-2xs text-primary"
          onClick={data.reload}
          aria-label="Refresh recent activity"
        >
          Refresh
        </button>
      </div>

      <State loading={data.loading} error={data.error} retry={data.reload}>
        <div className="divide-y divide-border">
          {activityList.map((item) => (
            <ActivityItem key={item.id} item={item} />
          ))}
          {!activityList.length && (
            <div className="px-4 py-8 text-center text-xs text-muted-foreground">
              No recent activities logged yet.
            </div>
          )}
        </div>
      </State>
      {!data.loading && !data.error && (
        <div className="flex justify-between items-center px-4 py-3 border-t text-xs">
          <span>
            Page {page} · {data.data?.total || 0} events
          </span>
          <div className="flex gap-3">
            <button
              className="text-primary disabled:text-muted-foreground"
              disabled={page === 1}
              onClick={() => setPage(page - 1)}
            >
              Newer
            </button>
            <button
              className="text-primary disabled:text-muted-foreground"
              disabled={page * 15 >= (data.data?.total || 0)}
              onClick={() => setPage(page + 1)}
            >
              Older
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
