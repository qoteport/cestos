'use client';

import React, { useState } from 'react';
import ProjectOverviewTab from './ProjectOverviewTab';
import ProjectWorkforceTab from './ProjectWorkforceTab';
import ProjectEquipmentTab from './ProjectEquipmentTab';
import ProjectInventoryTab from './ProjectInventoryTab';
import ProjectSitesTab from './ProjectSitesTab';

const TABS = [
  { id: 'tab-overview', label: 'Overview' },
  { id: 'tab-sites', label: 'Sites' },
  { id: 'tab-workforce', label: 'Workforce' },
  { id: 'tab-equipment', label: 'Equipment' },
  { id: 'tab-inventory', label: 'Inventory' },
];

export default function ProjectTabs() {
  const [activeTab, setActiveTab] = useState('tab-overview');

  return (
    <div className="card">
      <div className="tab-nav px-4 overflow-x-auto scrollbar-thin">
        {TABS?.map(tab => (
          <button
            key={tab?.id}
            className={`tab-item ${activeTab === tab?.id ? 'active' : ''}`}
            onClick={() => setActiveTab(tab?.id)}
          >
            {tab?.label}
          </button>
        ))}
      </div>
      <div className="p-5">
        {activeTab === 'tab-overview' && <ProjectOverviewTab />}
        {activeTab === 'tab-sites' && <ProjectSitesTab />}
        {activeTab === 'tab-workforce' && <ProjectWorkforceTab />}
        {activeTab === 'tab-equipment' && <ProjectEquipmentTab />}
        {activeTab === 'tab-inventory' && <ProjectInventoryTab />}
      </div>
    </div>
  );
}