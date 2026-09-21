'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import FieldPortalLayout from '@/components/FieldPortalLayout';
import EmployeeDetailView from '@/components/EmployeeDetailView';

export default function FieldPortalProfilePage() {
  const router = useRouter();

  return (
    <FieldPortalLayout
      activeTab="PROFILE"
      onTabChange={(tab) => {
        if (tab !== 'PROFILE') {
          router.push(tab === 'DRILL_HOLES' || tab === 'WORK_ORDERS' ? `/field-portal?tab=${tab}` : '/field-portal');
        }
      }}
    >
      <div className="space-y-6">
        <EmployeeDetailView employeeId="me" />
      </div>
    </FieldPortalLayout>
  );
}
