with open('src/components/IncidentDetailModal.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

import_line = "import { StatusBadge } from './AppLayout'; // Adjust if StatusBadge is elsewhere"
status_func = """
function StatusBadge({ status }: { status: string }) {
  const s = (status || '').toUpperCase();
  const map: Record<string, string> = {
    PAID: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-300',
    APPROVED: 'bg-indigo-100 text-indigo-800 dark:bg-indigo-950/50 dark:text-indigo-300',
    WAITING_APPROVAL: 'bg-amber-100 text-amber-800 dark:bg-amber-950/50 dark:text-amber-300',
    ACTIVE: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-300',
    'ACTIVE / AVAILABLE': 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-300',
    PENDING: 'bg-amber-100 text-amber-800 dark:bg-amber-950/50 dark:text-amber-300',
    SUBMITTED: 'bg-amber-100 text-amber-800 dark:bg-amber-950/50 dark:text-amber-300',
    DRAFT: 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-300',
    OVERDUE: 'bg-red-100 text-red-800 dark:bg-red-950/50 dark:text-red-300',
    CANCELLED: 'bg-red-100 text-red-800 dark:bg-red-950/50 dark:text-red-300',
    COMPLETED: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-300',
    RECEIVED: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-300',
    HIGH: 'bg-orange-100 text-orange-800 dark:bg-orange-950/50 dark:text-orange-300',
    CRITICAL: 'bg-red-100 text-red-800 dark:bg-red-950/50 dark:text-red-300',
    MEDIUM: 'bg-amber-100 text-amber-800 dark:bg-amber-950/50 dark:text-amber-300',
    LOW: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-300',
  };
  return (
    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold tracking-wider ${map[s] || 'bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-300'}`}>
      {s}
    </span>
  );
}
"""

content = content.replace(import_line, status_func)

with open('src/components/IncidentDetailModal.tsx', 'w', encoding='utf-8') as f:
    f.write(content)
