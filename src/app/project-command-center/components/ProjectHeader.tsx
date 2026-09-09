'use client';

import React, { useEffect, useState } from 'react';
import { Edit, ChevronRight, MapPin, User, Calendar, Target } from 'lucide-react';
import Link from 'next/link';
import { getProjects, getProjectOverview, type ProjectOverview } from '@/lib/api';

function formatDate(d?: string): string {
  if (!d) return '—';
  try { return new Date(d).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }); }
  catch { return d; }
}

export default function ProjectHeader() {
  const [project, setProject] = useState<ProjectOverview | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Load first active project as the command center default
    getProjects({ status: 'ACTIVE', page_size: '1' })
      .then(async res => {
        const first = res?.items?.[0];
        if (first?.id) {
          const overview = await getProjectOverview(first.id);
          setProject(overview);
        }
      })
      .catch(() => setProject(null))
      .finally(() => setLoading(false));
  }, []);

  const managerName = project?.project_manager
    ? ((project.project_manager as { full_name?: string; first_name?: string; last_name?: string })?.full_name ||
       `${(project.project_manager as { first_name?: string })?.first_name ?? ''} ${(project.project_manager as { last_name?: string })?.last_name ?? ''}`.trim())
    : '—';
  const clientName = (project?.client as { name?: string })?.name ?? '—';
  const status = project?.status ?? '—';
  const statusClass = status === 'ACTIVE' ? 'badge-active' : status === 'MOBILIZING' ? 'badge-mobilizing' : 'badge-neutral';

  if (loading) {
    return (
      <div>
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-3">
          <Link href="/" className="hover:text-primary transition-colors">Dashboard</Link>
          <ChevronRight size={12} />
          <span>Projects</span>
          <ChevronRight size={12} />
          <div className="h-3 w-24 bg-muted animate-pulse rounded" />
        </div>
        <div className="card p-5">
          <div className="h-6 bg-muted animate-pulse rounded w-1/3 mb-3" />
          <div className="h-4 bg-muted animate-pulse rounded w-2/3" />
        </div>
      </div>
    );
  }

  if (!project) {
    return (
      <div>
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-3">
          <Link href="/" className="hover:text-primary transition-colors">Dashboard</Link>
          <ChevronRight size={12} />
          <span className="text-foreground font-500">Projects</span>
        </div>
        <div className="card p-5">
          <p className="text-sm text-muted-foreground">No active projects found.</p>
        </div>
      </div>
    );
  }

  const targetMetres = (project as Record<string, unknown>)?.target_metres as number | undefined;
  const drilledMetres = (project as Record<string, unknown>)?.drilled_metres as number | undefined;
  const progress = targetMetres && drilledMetres ? Math.round((drilledMetres / targetMetres) * 100) : undefined;

  return (
    <div>
      <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-3">
        <Link href="/" className="hover:text-primary transition-colors">Dashboard</Link>
        <ChevronRight size={12} />
        <span className="hover:text-primary cursor-pointer transition-colors">Projects</span>
        <ChevronRight size={12} />
        <span className="text-foreground font-500">{project.name}</span>
      </div>

      <div className="card p-5">
        <div className="flex flex-col lg:flex-row lg:items-start gap-4 justify-between">
          <div className="flex-1">
            <div className="flex items-center gap-3 mb-2 flex-wrap">
              {project?.project_number && (
                <span className="text-xs font-600 text-muted-foreground">{project.project_number}</span>
              )}
              <span className={`badge ${statusClass}`}>{status}</span>
            </div>
            <h1 className="page-title mb-3">{project.name}</h1>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-x-6 gap-y-2">
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <User size={13} className="text-primary flex-shrink-0" />
                <span>Client:</span>
                <span className="font-600 text-foreground">{clientName}</span>
              </div>
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <User size={13} className="text-primary flex-shrink-0" />
                <span>PM:</span>
                <span className="font-600 text-foreground">{managerName}</span>
              </div>
              {project?.start_date && (
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <Calendar size={13} className="text-primary flex-shrink-0" />
                  <span>Start:</span>
                  <span className="font-600 text-foreground">{formatDate(project.start_date)}</span>
                </div>
              )}
              {project?.end_date && (
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <Calendar size={13} className="text-primary flex-shrink-0" />
                  <span>Target End:</span>
                  <span className="font-600 text-foreground">{formatDate(project.end_date)}</span>
                </div>
              )}
              {project?.location && (
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <MapPin size={13} className="text-primary flex-shrink-0" />
                  <span>Location:</span>
                  <span className="font-600 text-foreground">{project.location as string}</span>
                </div>
              )}
              {targetMetres !== undefined && (
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <Target size={13} className="text-primary flex-shrink-0" />
                  <span>Target:</span>
                  <span className="font-600 text-foreground">{targetMetres.toLocaleString()} m</span>
                </div>
              )}
              {drilledMetres !== undefined && (
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <Target size={13} className="text-primary flex-shrink-0" />
                  <span>Drilled:</span>
                  <span className="font-600 text-foreground">{drilledMetres.toLocaleString()} m</span>
                </div>
              )}
              {progress !== undefined && (
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <Target size={13} className="text-primary flex-shrink-0" />
                  <span>Progress:</span>
                  <span className="font-600 text-green-700">{progress}%</span>
                </div>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2 flex-shrink-0">
            <button className="btn-secondary text-sm">
              <Edit size={14} />
              Edit Project
            </button>
            <button className="btn-primary text-sm">
              Assign Resources
            </button>
          </div>
        </div>

        {progress !== undefined && (
          <div className="mt-4 pt-4 border-t border-border">
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-xs text-muted-foreground">Drilling Progress</span>
              <span className="text-xs font-600 text-foreground tabular-nums">
                {drilledMetres?.toLocaleString()} m / {targetMetres?.toLocaleString()} m
              </span>
            </div>
            <div className="h-2 bg-muted rounded-full overflow-hidden">
              <div className="h-full bg-primary rounded-full" style={{ width: `${progress}%` }} />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}