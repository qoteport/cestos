'use client';

import { useEffect, useState } from 'react';
import { Calendar, Eye } from 'lucide-react';
import { useAuth } from './AuthProvider';
import { Modal } from './DataUI';
import useAppFeedback from './useAppFeedback';
import { apiFetch } from '@/lib/api';
import SearchableSelect from './SearchableSelect';

type TeamLeave = {
  id: string;
  employee_id: string;
  employee_name: string;
  employee_number: string;
  job_title: string | null;
  leave_type: string | null;
  start_date: string;
  end_date: string;
  days: number;
  status: string;
  reason: string | null;
  notes: string | null;
  created_at: string;
  approved_at: string | null;
  has_attachment: boolean;
};

export default function FieldTeamLeaveRequests({ projectId, search }: { projectId: string; search: string }) {
  const auth = useAuth();
  const { notify } = useAppFeedback();
  const isSupervisor = auth.access?.roles.some((role) => role.trim().toLowerCase() === 'supervisor') ?? false;
  const [requests, setRequests] = useState<TeamLeave[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [status, setStatus] = useState('ALL');
  const [selected, setSelected] = useState<TeamLeave | null>(null);
  const [version, setVersion] = useState(0);

  useEffect(() => {
    let active = true;
    setRequests([]);
    setSelected(null);
    if (!isSupervisor || !projectId) { setLoading(false); return; }
    setLoading(true);
    setError('');
    const query = `?project_id=${encodeURIComponent(projectId)}`;
    apiFetch<TeamLeave[]>(`/api/v1/field-portal/team-leave-requests${query}`)
      .then((data) => { if (active) setRequests(data); })
      .catch((err) => { if (active) setError(err instanceof Error ? err.message : 'Could not load team leave requests.'); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [isSupervisor, auth.user?.id, projectId, version]);

  useEffect(() => { if (error) notify({ type: 'error', message: error }); }, [error, notify]);

  if (!isSupervisor) return null;
  const visible = requests.filter((request) =>
    (status === 'ALL' || request.status === status) &&
    `${request.employee_name} ${request.employee_number} ${request.job_title || ''}`.toLowerCase().includes(search.trim().toLowerCase())
  );

  return (
    <section className="space-y-3" aria-label="Team leave requests">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className="font-bold flex items-center gap-2"><Calendar size={18} /> Team Leave Requests</h3>
          <p className="text-xs text-muted-foreground">Supervisor view · Leave requested by your team in the selected project scope.</p>
        </div>
        <div className="text-xs flex items-center gap-2">
          <span>Status</span>
          <div className="w-40">
            <SearchableSelect
              value={status}
              onChange={(val) => setStatus(val)}
              options={[
                { value: 'ALL', label: 'All statuses' },
                { value: 'PENDING', label: 'Pending' },
                { value: 'APPROVED', label: 'Approved' },
                { value: 'REJECTED', label: 'Rejected' },
              ]}
              searchable={false}
              ariaLabel="Filter status"
            />
          </div>
        </div>
      </div>
      {error ? (
        <div className="text-sm p-4">
          <button type="button" className="underline" onClick={() => setVersion((value) => value + 1)}>Retry loading team leave requests</button>
        </div>
      ) : loading ? <p role="status" className="text-sm text-muted-foreground">Loading team leave requests…</p> : (
        <div className="border rounded-xl bg-card overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="bg-muted/50 text-xs uppercase"><tr>
              <th className="p-3">Team member</th><th className="p-3">Leave type</th><th className="p-3">Dates</th>
              <th className="p-3">Days</th><th className="p-3">Status</th><th className="p-3">Details</th>
            </tr></thead>
            <tbody className="divide-y">
              {visible.length === 0 ? <tr><td colSpan={6} className="p-6 text-center text-muted-foreground">No team leave requests match this view.</td></tr> : visible.map((request) => (
                <tr key={request.id}>
                  <td className="p-3"><strong className="block">{request.employee_name}</strong><span className="text-xs text-muted-foreground">{request.employee_number} · {request.job_title || 'Team member'}</span></td>
                  <td className="p-3">{request.leave_type || 'Leave'}</td>
                  <td className="p-3 whitespace-nowrap">{request.start_date} – {request.end_date}</td>
                  <td className="p-3">{request.days}</td><td className="p-3">{request.status}</td>
                  <td className="p-3"><button type="button" onClick={() => setSelected(request)} className="btn-secondary text-xs" aria-label={`View leave details for ${request.employee_name}`}><Eye size={14} /> View details</button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {selected && <Modal title={`Leave request · ${selected.employee_name}`} onClose={() => setSelected(null)}>
        <dl className="grid grid-cols-2 gap-4 text-sm">
          <div><dt className="text-muted-foreground">Employee</dt><dd>{selected.employee_name} ({selected.employee_number})</dd></div>
          <div><dt className="text-muted-foreground">Leave type</dt><dd>{selected.leave_type || 'Leave'}</dd></div>
          <div><dt className="text-muted-foreground">Dates</dt><dd>{selected.start_date} – {selected.end_date}</dd></div>
          <div><dt className="text-muted-foreground">Duration</dt><dd>{selected.days} calendar day(s)</dd></div>
          <div><dt className="text-muted-foreground">Status</dt><dd>{selected.status}</dd></div>
          <div><dt className="text-muted-foreground">Requested</dt><dd>{new Date(selected.created_at).toLocaleString()}</dd></div>
          <div className="col-span-2"><dt className="text-muted-foreground">Reason</dt><dd className="whitespace-pre-wrap break-words">{selected.reason || 'No reason provided.'}</dd></div>
          {selected.notes && <div className="col-span-2"><dt className="text-muted-foreground">Notes</dt><dd className="whitespace-pre-wrap break-words">{selected.notes}</dd></div>}
          {selected.approved_at && <div><dt className="text-muted-foreground">Approved</dt><dd>{new Date(selected.approved_at).toLocaleString()}</dd></div>}
          <div><dt className="text-muted-foreground">Supporting document</dt><dd>{selected.has_attachment ? 'Attached' : 'None'}</dd></div>
        </dl>
      </Modal>}
    </section>
  );
}
