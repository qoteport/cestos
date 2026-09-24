with open('src/components/FieldAdminPortalWorkspace.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

start_idx = content.find('{viewingIncident && (')
end_idx = content.find('</div>\n  );\n}')

if start_idx != -1 and end_idx != -1:
    modal_jsx = content[start_idx:end_idx]
    
    # We will build a brand new IncidentDetailModal component
    new_component = """import React from 'react';
import { X, ShieldCheck, ShieldAlert, AlertTriangle, Info, Calendar, MapPin, User, FileText, Printer } from 'lucide-react';
import { StatusBadge } from './AppLayout'; // Adjust if StatusBadge is elsewhere

export default function IncidentDetailModal({ incident, onClose }: { incident: any; onClose: () => void }) {
  if (!incident) return null;

  // Determine colors based on severity
  const severity = incident.severity || 'MEDIUM';
  let themeColor = 'bg-slate-500';
  let lightThemeColor = 'bg-slate-50';
  let textColor = 'text-slate-700';
  let icon = <Info size={24} className="text-slate-600" />;

  if (severity === 'CRITICAL') {
    themeColor = 'bg-red-600'; lightThemeColor = 'bg-red-50 dark:bg-red-950/30'; textColor = 'text-red-700 dark:text-red-400';
    icon = <ShieldAlert size={28} className="text-red-600" />;
  } else if (severity === 'HIGH') {
    themeColor = 'bg-orange-500'; lightThemeColor = 'bg-orange-50 dark:bg-orange-950/30'; textColor = 'text-orange-700 dark:text-orange-400';
    icon = <AlertTriangle size={28} className="text-orange-600" />;
  } else if (severity === 'MEDIUM') {
    themeColor = 'bg-amber-500'; lightThemeColor = 'bg-amber-50 dark:bg-amber-950/30'; textColor = 'text-amber-700 dark:text-amber-400';
    icon = <AlertTriangle size={28} className="text-amber-600" />;
  } else {
    themeColor = 'bg-emerald-500'; lightThemeColor = 'bg-emerald-50 dark:bg-emerald-950/30'; textColor = 'text-emerald-700 dark:text-emerald-400';
    icon = <ShieldCheck size={28} className="text-emerald-600" />;
  }

  const printReport = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 bg-slate-950/80 z-50 flex items-center justify-center p-0 sm:p-6 overflow-hidden backdrop-blur-sm print:bg-white print:p-0">
      <div className="bg-white dark:bg-slate-900 w-full h-full sm:h-auto sm:max-h-[95vh] max-w-full sm:max-w-3xl sm:rounded-2xl shadow-2xl flex flex-col overflow-hidden relative print:shadow-none print:h-auto print:max-h-none print:w-full">
        
        {/* Top Accent Bar */}
        <div className={`h-2 w-full ${themeColor} print:hidden`}></div>

        {/* Action Header (Hidden in Print) */}
        <div className="flex items-center justify-between border-b px-4 py-3 sm:px-6 bg-slate-50 dark:bg-slate-900 shrink-0 sticky top-0 z-10 print:hidden">
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center w-8 h-8 rounded-full bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
              <FileText size={16} />
            </div>
            <h3 className="font-bold text-sm text-slate-900 dark:text-white tracking-wide uppercase">
              Incident Report View
            </h3>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={printReport}
              className="p-2 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-800 text-slate-500 hover:text-slate-900 dark:hover:text-white transition flex items-center gap-1.5 text-xs font-semibold"
            >
              <Printer size={16} /> Print
            </button>
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-full hover:bg-slate-200 dark:hover:bg-slate-800 text-slate-500 hover:text-slate-900 dark:hover:text-white transition"
            >
              <X size={20} />
            </button>
          </div>
        </div>

        {/* Report Content */}
        <div className="flex-1 overflow-y-auto p-5 sm:p-8 space-y-8 bg-white dark:bg-slate-900 print:p-0 print:overflow-visible">
          
          {/* Official Report Header */}
          <div className="flex items-start justify-between border-b-2 border-slate-800 dark:border-slate-200 pb-6 print:border-black">
            <div className="space-y-1 max-w-[70%]">
              <span className="text-xs font-extrabold tracking-widest text-slate-500 uppercase">Official Safety Record</span>
              <h1 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white leading-tight print:text-black">
                {incident.title || 'Safety Event Report'}
              </h1>
              <div className="flex flex-wrap items-center gap-x-4 gap-y-2 mt-3 text-sm text-slate-600 dark:text-slate-400 font-medium">
                <span className="flex items-center gap-1.5"><Calendar size={14} className="text-slate-400" /> {incident.incident_date ? new Date(incident.incident_date).toLocaleString() : 'Date Unknown'}</span>
                <span className="flex items-center gap-1.5"><MapPin size={14} className="text-slate-400" /> {incident.location || 'Site Field Area'}</span>
              </div>
            </div>
            <div className="text-right flex flex-col items-end gap-2 shrink-0">
              {icon}
              <div className="mt-1">
                <StatusBadge status={incident.severity || 'MEDIUM'} />
              </div>
              <p className="text-[10px] text-slate-400 font-mono mt-1">ID: {incident.id?.split('-')[0].toUpperCase() || 'SYS-REQ'}</p>
            </div>
          </div>

          {/* Key Attributes Grid */}
          <div className={`grid grid-cols-2 md:grid-cols-4 gap-4 p-5 rounded-xl border border-slate-200 dark:border-slate-800 ${lightThemeColor} print:bg-transparent print:border-black print:rounded-none`}>
            <div>
              <span className="block text-[10px] uppercase tracking-wider font-bold text-slate-500">Incident Category</span>
              <span className={`text-sm font-black mt-0.5 ${textColor}`}>{incident.incident_type || 'INCIDENT'}</span>
            </div>
            <div>
              <span className="block text-[10px] uppercase tracking-wider font-bold text-slate-500">Severity Level</span>
              <span className={`text-sm font-black mt-0.5 ${textColor}`}>{incident.severity || 'MEDIUM'}</span>
            </div>
            <div>
              <span className="block text-[10px] uppercase tracking-wider font-bold text-slate-500">Status</span>
              <span className="text-sm font-bold text-slate-900 dark:text-white mt-0.5">{incident.status || 'OPEN'}</span>
            </div>
            <div>
              <span className="block text-[10px] uppercase tracking-wider font-bold text-slate-500">Reported By</span>
              <span className="text-sm font-medium text-slate-900 dark:text-white mt-0.5 flex items-center gap-1">
                <User size={12} className="text-slate-400" /> {incident.reported_by || 'Field Personnel'}
              </span>
            </div>
          </div>

          {/* Detailed Narrative */}
          <div className="space-y-3">
            <h4 className="text-sm font-black uppercase tracking-wider text-slate-900 dark:text-white border-b pb-2 print:text-black print:border-black">Detailed Incident Description</h4>
            <div className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed whitespace-pre-wrap font-medium p-4 bg-slate-50 dark:bg-slate-800/50 rounded-xl print:bg-transparent print:p-0 print:text-black">
              {incident.description || 'No additional narrative recorded for this incident. See field attachments if available.'}
            </div>
          </div>

          {/* Corrective Actions */}
          {incident.corrective_action && (
            <div className="space-y-3">
              <h4 className="text-sm font-black uppercase tracking-wider text-emerald-800 dark:text-emerald-400 border-b border-emerald-200 dark:border-emerald-800 pb-2 print:text-black print:border-black">Immediate Corrective Actions Taken</h4>
              <div className="text-sm text-emerald-950 dark:text-emerald-100 leading-relaxed whitespace-pre-wrap font-medium p-4 bg-emerald-50 dark:bg-emerald-900/20 rounded-xl border border-emerald-100 dark:border-emerald-800/50 print:bg-transparent print:p-0 print:border-none print:text-black">
                {incident.corrective_action}
              </div>
            </div>
          )}

          {/* Signatures (Print Only) */}
          <div className="hidden print:block mt-24 pt-8 border-t border-black">
            <div className="grid grid-cols-2 gap-16">
              <div>
                <div className="border-b border-black h-8 mb-2"></div>
                <p className="text-xs font-bold uppercase">HSE Officer Signature</p>
                <p className="text-[10px] text-gray-500 mt-1">Date: __________________</p>
              </div>
              <div>
                <div className="border-b border-black h-8 mb-2"></div>
                <p className="text-xs font-bold uppercase">Site Manager Signature</p>
                <p className="text-[10px] text-gray-500 mt-1">Date: __________________</p>
              </div>
            </div>
          </div>

        </div>

        {/* Sticky Footer */}
        <div className="flex items-center justify-between border-t px-4 py-3 sm:px-6 bg-slate-50 dark:bg-slate-900 shrink-0 print:hidden">
          <p className="text-xs text-slate-500 font-mono">Confidential Safety Record</p>
          <button
            type="button"
            onClick={onClose}
            className="px-6 py-2.5 bg-slate-800 hover:bg-slate-900 dark:bg-slate-100 dark:hover:bg-white text-white dark:text-slate-900 font-bold rounded-xl text-sm shadow-sm transition"
          >
            Close Report
          </button>
        </div>
      </div>
    </div>
  );
}
"""
    with open('src/components/IncidentDetailModal.tsx', 'w', encoding='utf-8') as mf:
        mf.write(new_component)
    print("Created IncidentDetailModal.tsx")
