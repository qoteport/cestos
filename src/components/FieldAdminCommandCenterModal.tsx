'use client';

import { ArrowRight, Building2, ClipboardList, Clock3, DollarSign, FileText, Truck, Wrench, X, Zap, Sparkles } from 'lucide-react';

export type FieldAdminCommand =
  | 'timesheet'
  | 'breakdown'
  | 'preventive'
  | 'assessment'
  | 'action'
  | 'pm'
  | 'equipment'
  | 'expense'
  | 'purchase_order';

const commands: { id: FieldAdminCommand; title: string; description: string; group: string; icon: typeof FileText; badge: string }[] = [
  { id: 'timesheet', title: 'Import Employee Timesheet', description: 'Upload a monthly time sheet, match employees and sites, and save all rows together.', group: 'Workforce', icon: Clock3, badge: 'Timesheets' },
  { id: 'preventive', title: 'Import Preventive Maintenance Cards', description: 'Review and edit preventive job cards from a CSV before saving.', group: 'Maintenance', icon: Wrench, badge: 'Preventive PM' },
  { id: 'breakdown', title: 'Import Breakdown Cards', description: 'Review and edit breakdown repair cards from a CSV before saving.', group: 'Maintenance', icon: Wrench, badge: 'Breakdown Repair' },
  { id: 'assessment', title: 'Import Maintenance Assessments', description: 'Load a two-week maintenance assessment report and edit it before saving.', group: 'Maintenance', icon: ClipboardList, badge: 'Assessment' },
  { id: 'action', title: 'Import Action Tracker', description: 'Upload and review equipment findings and action items.', group: 'Maintenance', icon: ClipboardList, badge: 'Action Findings' },
  { id: 'pm', title: 'Import PM Tracker', description: 'Upload and review planned and completed maintenance entries.', group: 'Maintenance', icon: ClipboardList, badge: 'PM Log' },
  { id: 'equipment', title: 'Import Equipment Register', description: 'Upload and review fleet register rows before saving.', group: 'Maintenance', icon: Truck, badge: 'Fleet Register' },
  { id: 'expense', title: 'Create Expense Claim', description: 'Upload an invoice or receipt to prepare an editable expense voucher form.', group: 'Finance', icon: DollarSign, badge: 'Expense Voucher' },
  { id: 'purchase_order', title: 'Create Purchase Order', description: 'Upload a quotation or request document to prepare an editable purchase order.', group: 'Finance', icon: FileText, badge: 'Purchase Order' },
];

export default function FieldAdminCommandCenterModal({ onClose, onSelect }: { onClose: () => void; onSelect: (command: FieldAdminCommand) => void }) {
  return (
    <div
      className="fixed inset-0 z-[10020] flex items-center justify-center bg-black/70 p-2 backdrop-blur-xs sm:p-6"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="field-admin-command-title"
        className="flex h-[min(92dvh,940px)] w-full max-w-6xl flex-col overflow-hidden rounded-2xl border border-slate-200 bg-card shadow-2xl dark:border-slate-800"
      >
        {/* Plain Clean Header */}
        <header className="flex shrink-0 items-center justify-between border-b border-border bg-card px-4 py-3.5 sm:px-6 sm:py-4 sticky top-0 z-10">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-orange-100 dark:bg-orange-950/60 text-orange-600 dark:text-orange-400 flex items-center justify-center shrink-0">
              <Zap size={20} className="fill-amber-500 text-amber-500" />
            </div>
            <div>
              <h2 id="field-admin-command-title" className="font-bold text-base sm:text-lg text-foreground flex items-center gap-2">
                Field Admin Command Center
              </h2>
              <p className="text-xs text-muted-foreground">Start common workforce, maintenance, and finance tasks from one place.</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close command center"
            className="rounded-full p-1.5 hover:bg-muted text-muted-foreground transition"
          >
            <X size={18} />
          </button>
        </header>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-5 sm:p-8 bg-slate-50/50 dark:bg-slate-950/40">
          <div className="mx-auto max-w-5xl space-y-8">
            {['Workforce', 'Maintenance', 'Finance'].map((group) => (
              <section key={group} className="space-y-3">
                <div className="flex items-center gap-2 border-b border-border/60 pb-2">
                  <span className="inline-flex items-center gap-1.5 text-xs font-black uppercase tracking-wider text-orange-600 dark:text-orange-400">
                    <Zap size={12} className="fill-amber-500 text-amber-500" /> {group} Actions
                  </span>
                </div>

                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {commands
                    .filter((command) => command.group === group)
                    .map(({ id, title, description, icon: Icon, badge }) => (
                      <button
                        key={id}
                        type="button"
                        onClick={() => onSelect(id)}
                        className="group relative flex flex-col justify-between rounded-2xl border border-slate-200 dark:border-slate-800 bg-card p-5 text-left transition-all duration-200 hover:-translate-y-1 hover:border-orange-500 dark:hover:border-orange-500 hover:shadow-xl dark:bg-slate-900/80 cursor-pointer"
                      >
                        <div>
                          <div className="flex items-center justify-between mb-3">
                            <span className="inline-flex h-11 w-11 items-center justify-center rounded-xl bg-orange-100 text-orange-700 group-hover:bg-orange-600 group-hover:text-white dark:bg-orange-950/80 dark:text-orange-300 transition-colors shadow-xs">
                              <Icon size={20} />
                            </span>
                            <span className="text-[10px] font-extrabold uppercase tracking-wider px-2.5 py-1 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                              {badge}
                            </span>
                          </div>
                          <span className="block text-sm font-extrabold text-foreground group-hover:text-orange-600 dark:group-hover:text-orange-400 transition-colors">
                            {title}
                          </span>
                          <span className="mt-1.5 block text-xs leading-relaxed text-muted-foreground">{description}</span>
                        </div>

                        <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between text-xs font-bold text-orange-600 dark:text-orange-400 group-hover:translate-x-0.5 transition-transform">
                          <span className="flex items-center gap-1">
                            <Zap size={12} className="fill-amber-500 text-amber-500" /> Launch Action
                          </span>
                          <ArrowRight size={14} />
                        </div>
                      </button>
                    ))}
                </div>
              </section>
            ))}

            {/* Note Footer */}
            <div className="rounded-2xl border border-orange-200 dark:border-orange-900/50 bg-orange-50/50 dark:bg-orange-950/20 p-4 text-xs text-orange-950 dark:text-orange-200 flex items-start gap-3 shadow-xs">
              <Zap size={18} className="fill-amber-500 text-amber-500 shrink-0 mt-0.5" />
              <p className="leading-relaxed">
                Uploaded documents and CSV data open in review forms before saving. Finance actions include expenses and purchase orders; vendor master setup remains in Finance Portal.
              </p>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
