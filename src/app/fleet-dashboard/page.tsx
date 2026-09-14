'use client';

import React, { useState } from 'react';
import AppLayout from '@/components/AppLayout';
import contract from '@/lib/contract.json';
import { Modal } from '@/components/DataUI';
import RecordForm from '@/components/RecordForm';
import { operation } from '@/components/ResourceWorkspace';
import FleetPageHeader from './components/FleetPageHeader';
import FleetKPIGrid from './components/FleetKPIGrid';
import FleetAttentionPanel from './components/FleetAttentionPanel';
import FleetByProjectChart from './components/FleetByProjectChart';
import AssetStatusTable from './components/AssetStatusTable';

export default function Page() {
  const [showAddModal, setShowAddModal] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  // DB Filter States
  const [statusFilter, setStatusFilter] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [locationId, setLocationId] = useState('');
  const [projectId, setProjectId] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  const createOp = operation('/api/v1/assets', 'POST') || {
    summary: 'Create asset',
    requestBody: {
      content: {
        'application/json': {
          schema: {
            $ref: '#/components/schemas/AssetCreate',
          },
        },
      },
    },
  };

  return (
    <AppLayout>
      <div className="space-y-6 fade-in">
        <FleetPageHeader
          onAddAsset={() => setShowAddModal(true)}
          onRefresh={() => setRefreshKey((k) => k + 1)}
          statusFilter={statusFilter}
          setStatusFilter={setStatusFilter}
          categoryId={categoryId}
          setCategoryId={setCategoryId}
          locationId={locationId}
          setLocationId={setLocationId}
          projectId={projectId}
          setProjectId={setProjectId}
          dateFrom={dateFrom}
          setDateFrom={setDateFrom}
          dateTo={dateTo}
          setDateTo={setDateTo}
        />
        <FleetKPIGrid
          key={`kpi-${refreshKey}`}
          statusFilter={statusFilter}
          categoryId={categoryId}
          locationId={locationId}
          projectId={projectId}
          dateFrom={dateFrom}
          dateTo={dateTo}
        />
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
          <div className="xl:col-span-2">
            <FleetByProjectChart
              key={`chart-${refreshKey}`}
              statusFilter={statusFilter}
              categoryId={categoryId}
              locationId={locationId}
              projectId={projectId}
              dateFrom={dateFrom}
              dateTo={dateTo}
            />
          </div>
          <div>
            <FleetAttentionPanel key={`attn-${refreshKey}`} />
          </div>
        </div>
        <AssetStatusTable
          key={`table-${refreshKey}`}
          statusFilter={statusFilter}
          categoryId={categoryId}
          locationId={locationId}
          projectId={projectId}
        />

        {/* MODAL: Add New Asset / Equipment */}
        {showAddModal && (
          <Modal name="Add New Asset / Equipment" onClose={() => setShowAddModal(false)}>
            <RecordForm
              resource="assets"
              operation={createOp}
              path="/api/v1/assets"
              onClose={() => setShowAddModal(false)}
              onSaved={() => {
                setShowAddModal(false);
                setRefreshKey((k) => k + 1);
              }}
            />
          </Modal>
        )}
      </div>
    </AppLayout>
  );
}
