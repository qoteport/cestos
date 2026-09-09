'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { Users, Wrench, MapPin, ChevronRight } from 'lucide-react';
import { getProjects, type ProjectRead } from '@/lib/api';

function getStatusClass(status?: string): string {
  switch (status?.toUpperCase()) {
    case 'ACTIVE': return 'badge-active';
    case 'MOBILIZING': return 'badge-mobilizing';
    case 'PLANNING': return 'badge-neutral';
    case 'PAUSED': return 'badge-warning';
    case 'COMPLETED': return 'badge-neutral';
    default: return 'badge-neutral';
  }
}

export default function ProjectCards() {
  const [projects, setProjects] = useState<ProjectRead[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getProjects({ status: 'ACTIVE', page_size: '5' })
      .then(res => setProjects(res?.items ?? []))
      .catch(() => setProjects([]))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="card">
      <div className="flex items-center justify-between px-4 py-3 border-b border-border">
        <span className="text-sm font-700 text-foreground">Active Projects</span>
        <Link href="/project-command-center" className="text-xs text-primary font-600 hover:underline flex items-center gap-1">
          All Projects <ChevronRight size={12} />
        </Link>
      </div>

      {loading ? (
        <div className="divide-y divide-border">
          {[1, 2, 3].map(i => (
            <div key={i} className="px-4 py-4">
              <div className="h-4 bg-muted animate-pulse rounded w-1/3 mb-2" />
              <div className="h-3 bg-muted animate-pulse rounded w-2/3" />
            </div>
          ))}
        </div>
      ) : projects.length === 0 ? (
        <div className="px-4 py-8 text-center text-sm text-muted-foreground">
          No active projects found.
        </div>
      ) : (
        <div className="divide-y divide-border">
          {projects.map(project => {
            const managerName = project?.project_manager
              ? ((project.project_manager as { full_name?: string; first_name?: string; last_name?: string })?.full_name ||
                 `${(project.project_manager as { first_name?: string })?.first_name ?? ''} ${(project.project_manager as { last_name?: string })?.last_name ?? ''}`.trim())
              : null;
            const clientName = (project?.client as { name?: string })?.name;
            const empCount = (project as Record<string, unknown>)?.employee_count as number | undefined;
            const assetCount = (project as Record<string, unknown>)?.asset_count as number | undefined;
            const siteCount = (project as Record<string, unknown>)?.site_count as number | undefined;

            return (
              <div key={project.id} className="px-4 py-4 hover:bg-muted/40 transition-colors">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      {project?.project_number && (
                        <span className="text-xs font-500 text-muted-foreground">{project.project_number}</span>
                      )}
                      <span className={`badge ${getStatusClass(project?.status)}`}>{project?.status}</span>
                    </div>
                    <Link href="/project-command-center" className="text-sm font-700 text-foreground hover:text-primary transition-colors">
                      {project.name}
                    </Link>
                    <div className="flex items-center gap-1 mt-0.5">
                      <MapPin size={11} className="text-muted-foreground" />
                      <span className="text-xs text-muted-foreground">
                        {[clientName, managerName, project?.location].filter(Boolean).join(' • ')}
                      </span>
                    </div>
                  </div>
                  <Link href="/project-command-center" className="btn-ghost text-xs py-1 px-2 flex-shrink-0">
                    Open <ChevronRight size={12} />
                  </Link>
                </div>

                <div className="flex items-center gap-4 mt-3">
                  {empCount !== undefined && (
                    <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                      <Users size={13} className="text-primary" />
                      <span className="font-600 text-foreground">{empCount}</span>
                      <span>people</span>
                    </div>
                  )}
                  {assetCount !== undefined && (
                    <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                      <Wrench size={13} className="text-primary" />
                      <span className="font-600 text-foreground">{assetCount}</span>
                      <span>assets</span>
                    </div>
                  )}
                  {siteCount !== undefined && (
                    <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                      <MapPin size={13} className="text-primary" />
                      <span className="font-600 text-foreground">{siteCount}</span>
                      <span>sites</span>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}