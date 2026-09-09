import React from 'react';
import { Package, Wrench, Users, ClipboardList, ArrowLeftRight, CheckCircle } from 'lucide-react';

const ACTIVITIES = [
  {
    id: 'act-001',
    time: '09:32',
    icon: <Wrench size={13} />,
    iconBg: 'bg-blue-100 text-blue-600',
    text: 'Rig CDR-002 transferred to Project Alpha',
    sub: 'Alpha Site',
    type: 'equipment',
  },
  {
    id: 'act-002',
    time: '09:18',
    icon: <Package size={13} />,
    iconBg: 'bg-green-100 text-green-700',
    text: '200 L Hydraulic Oil received',
    sub: 'Main Warehouse',
    type: 'inventory',
  },
  {
    id: 'act-003',
    time: '08:51',
    icon: <Users size={13} />,
    iconBg: 'bg-purple-100 text-purple-700',
    text: 'Kwame Asante assigned to Project Bravo',
    sub: 'Bravo Drill Site',
    type: 'workforce',
  },
  {
    id: 'act-004',
    time: '08:34',
    icon: <CheckCircle size={13} />,
    iconBg: 'bg-green-100 text-green-700',
    text: 'Inventory request REQ-00884 approved',
    sub: 'Project Alpha',
    type: 'inventory',
  },
  {
    id: 'act-005',
    time: '08:12',
    icon: <ArrowLeftRight size={13} />,
    iconBg: 'bg-amber-100 text-amber-700',
    text: 'Transfer TRF-00412 dispatched',
    sub: 'Main Warehouse → Alpha Store',
    type: 'inventory',
  },
  {
    id: 'act-006',
    time: '07:55',
    icon: <Wrench size={13} />,
    iconBg: 'bg-red-100 text-red-600',
    text: 'Defect reported on PU-007',
    sub: 'HIGH severity — Project Bravo',
    type: 'equipment',
  },
  {
    id: 'act-007',
    time: '07:44',
    icon: <ClipboardList size={13} />,
    iconBg: 'bg-blue-100 text-blue-600',
    text: 'Stock count COUNT-00031 started',
    sub: 'Main Warehouse',
    type: 'inventory',
  },
  {
    id: 'act-008',
    time: '07:30',
    icon: <Users size={13} />,
    iconBg: 'bg-purple-100 text-purple-700',
    text: 'Leave request from Samuel Antwi',
    sub: 'Sep 20–26 annual leave',
    type: 'workforce',
  },
];

export default function ActivityFeed() {
  return (
    <div className="card h-fit">
      <div className="flex items-center justify-between px-4 py-3 border-b border-border">
        <span className="text-sm font-700 text-foreground">Recent Activity</span>
        <span className="text-2xs text-muted-foreground">Today</span>
      </div>
      <div className="divide-y divide-border">
        {ACTIVITIES?.map(item => (
          <div key={item?.id} className="flex items-start gap-3 px-4 py-3 hover:bg-muted/40 transition-colors">
            <div className={`w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5 ${item?.iconBg}`}>
              {item?.icon}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-500 text-foreground leading-snug">{item?.text}</p>
              <p className="text-2xs text-muted-foreground mt-0.5">{item?.sub}</p>
            </div>
            <span className="text-2xs text-muted-foreground tabular-nums flex-shrink-0">{item?.time}</span>
          </div>
        ))}
      </div>
      <div className="px-4 py-2.5 border-t border-border">
        <button className="text-xs text-primary font-600 hover:underline">View full activity log</button>
      </div>
    </div>
  );
}