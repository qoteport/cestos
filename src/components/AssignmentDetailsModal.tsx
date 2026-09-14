'use client';

import React, { useState, useEffect } from 'react';
import {
  Briefcase, MapPin, UserCheck, Calendar, Clock,
  Edit, FileText, CheckCircle, Info, Tag, User, Shield
} from 'lucide-react';
import { Modal, Row, display, title } from './DataUI';
import { apiFetch } from '@/lib/api';

interface AssignmentDetailsModalProps {
  assignment: Row;
  employeeName?: string;
  onClose: () => void;
  onEdit?: (assignment: Row) => void;
}

export default function AssignmentDetailsModal({
  assignment,
  employeeName,
  onClose,
  onEdit,
}: AssignmentDetailsModalProps) {
  const [enriched, setEnriched] = useState<Row>(assignment);

  useEffect(() => {
    let active = true;
    const fetchExtra = async () => {
      try {
        const updates: Row = { ...assignment };

        // Enrich project if needed
        if (assignment.project_id && !assignment.project_name && typeof assignment.project !== 'object') {
          try {
            const p = await apiFetch<Row>(`/api/v1/projects/${assignment.project_id}`);
            if (p && active) updates.project_name = p.name || p.title;
          } catch {}
        }

        // Enrich location if needed
        if (assignment.location_id && !assignment.location_name && typeof assignment.location !== 'object') {
          try {
            const l = await apiFetch<Row>(`/api/v1/locations/${assignment.location_id}`);
            if (l && active) updates.location_name = l.name;
          } catch {}
        }

        // Enrich supervisor if needed
        if (assignment.supervisor_id && !assignment.supervisor_name && typeof assignment.supervisor !== 'object') {
          try {
            const s = await apiFetch<Row>(`/api/v1/employees/${assignment.supervisor_id}`);
            if (s && active) updates.supervisor_name = [s.first_name, s.last_name].filter(Boolean).join(' ') || s.name;
          } catch {}
        }

        if (active) setEnriched(updates);
      } catch {}
    };

    fetchExtra();
    return () => { active = false; };
  }, [assignment]);

  const item = enriched;

  const projectName = item.project_name || (typeof item.project === 'object' ? item.project?.name : null) || item.project_id || 'Project Assignment';
  const locationName = item.location_name || (typeof item.location === 'object' ? item.location?.name : null) || item.location_id || 'Not specified';
  const supervisorName = item.supervisor_name || (typeof item.supervisor === 'object' ? [item.supervisor?.first_name, item.supervisor?.last_name].filter(Boolean).join(' ') : null) || item.supervisor_id || 'None assigned';

  const statusColor =
    item.status === 'ACTIVE'
      ? 'bg-emerald-100 text-emerald-800 border-emerald-300'
      : item.status === 'COMPLETED'
      ? 'bg-blue-100 text-blue-800 border-blue-300'
      : item.status === 'CANCELLED'
      ? 'bg-rose-100 text-rose-800 border-rose-300'
      : 'bg-amber-100 text-amber-800 border-amber-300';

  return (
    <Modal name={`Assignment Details — ${item.assignment_number || 'Record'}`} onClose={onClose}>
      <div className="space-y-5">
        {/* Header Bar with Status & Edit Action */}
        <div className="flex flex-wrap items-center justify-between gap-3 p-4 bg-muted/30 border rounded-lg">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-full bg-primary/10 text-primary border border-primary/20">
              <Briefcase size={20} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-foreground">
                  {display(projectName)}
                </h3>
                {item.is_primary && (
                  <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-blue-100 text-blue-800 border border-blue-200">
                    PRIMARY
                  </span>
                )}
              </div>
              <p className="text-xs text-muted-foreground">
                Assignment #: <span className="font-mono font-semibold">{item.assignment_number || item.id || '—'}</span>
                {employeeName ? ` • ${employeeName}` : ''}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className={`px-2.5 py-1 rounded-full text-xs font-bold border ${statusColor}`}>
              {display(item.status || 'ACTIVE')}
            </span>
            {onEdit && (
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onEdit(item);
                }}
                className="btn-primary text-xs flex items-center gap-1.5"
              >
                <Edit size={13} /> Edit Assignment
              </button>
            )}
          </div>
        </div>

        {/* Details Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Box 1: Project & Role Details */}
          <div className="p-4 border rounded-lg bg-card space-y-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5 border-b pb-2">
              <Briefcase size={14} className="text-primary" /> Role & Project Scope
            </h4>
            <div className="space-y-2 text-xs">
              <div>
                <span className="text-muted-foreground block text-[11px]">Role on Project</span>
                <span className="font-semibold text-foreground text-sm">{display(item.role_on_project || 'Project Member')}</span>
              </div>
              <div>
                <span className="text-muted-foreground block text-[11px]">Assignment Type</span>
                <span className="font-semibold text-foreground">{display(item.assignment_type || 'PROJECT')}</span>
              </div>
              {item.position_id && (
                <div>
                  <span className="text-muted-foreground block text-[11px]">Position ID / Title</span>
                  <span className="font-semibold text-foreground">{display(item.position_name || item.position_id)}</span>
                </div>
              )}
            </div>
          </div>

          {/* Box 2: Location & Leadership */}
          <div className="p-4 border rounded-lg bg-card space-y-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5 border-b pb-2">
              <MapPin size={14} className="text-primary" /> Site & Leadership
            </h4>
            <div className="space-y-2 text-xs">
              <div>
                <span className="text-muted-foreground block text-[11px]">Work / Site Location</span>
                <span className="font-semibold text-foreground flex items-center gap-1">
                  <MapPin size={12} className="text-muted-foreground shrink-0" />
                  {display(locationName)}
                </span>
              </div>
              <div>
                <span className="text-muted-foreground block text-[11px]">Project Supervisor</span>
                <span className="font-semibold text-foreground flex items-center gap-1">
                  <UserCheck size={12} className="text-muted-foreground shrink-0" />
                  {display(supervisorName)}
                </span>
              </div>
            </div>
          </div>

          {/* Box 3: Dates & Schedule */}
          <div className="p-4 border rounded-lg bg-card space-y-3 md:col-span-2">
            <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5 border-b pb-2">
              <Calendar size={14} className="text-primary" /> Schedule, Dates & Rotation
            </h4>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
              <div className="p-2.5 rounded bg-muted/30 border">
                <span className="text-muted-foreground block text-[10px]">Start Date</span>
                <span className="font-bold text-foreground">{display(item.start_date)}</span>
              </div>
              <div className="p-2.5 rounded bg-muted/30 border">
                <span className="text-muted-foreground block text-[10px]">End Date</span>
                <span className="font-bold text-foreground">{display(item.end_date || 'Ongoing')}</span>
              </div>
              <div className="p-2.5 rounded bg-muted/30 border">
                <span className="text-muted-foreground block text-[10px]">Mobilization Date</span>
                <span className="font-bold text-foreground">{display(item.mobilization_date || '—')}</span>
              </div>
              <div className="p-2.5 rounded bg-muted/30 border">
                <span className="text-muted-foreground block text-[10px]">Demobilization Date</span>
                <span className="font-bold text-foreground">{display(item.demobilization_date || '—')}</span>
              </div>
            </div>

            {item.rotation_pattern && (
              <div className="pt-1 text-xs">
                <span className="text-muted-foreground block text-[11px]">Rotation Pattern</span>
                <span className="font-semibold text-foreground">{display(item.rotation_pattern)}</span>
              </div>
            )}
          </div>

          {/* Box 4: Notes */}
          {item.notes && (
            <div className="p-4 border rounded-lg bg-card space-y-2 md:col-span-2">
              <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5 border-b pb-2">
                <FileText size={14} className="text-primary" /> Notes & Directives
              </h4>
              <p className="text-xs text-foreground whitespace-pre-wrap leading-relaxed">{item.notes}</p>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="flex justify-between items-center pt-3 border-t">
          <button type="button" className="btn-secondary text-xs" onClick={onClose}>
            Close
          </button>

          {onEdit && (
            <button
              type="button"
              onClick={() => {
                onClose();
                onEdit(item);
              }}
              className="btn-primary text-xs flex items-center gap-1.5"
            >
              <Edit size={13} /> Edit Assignment
            </button>
          )}
        </div>
      </div>
    </Modal>
  );
}
