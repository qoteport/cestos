'use client';

import React from 'react';
import { useParams } from 'next/navigation';
import HREmployeeDetailView from '@/components/HREmployeeDetailView';

export default function HREmployeeDetailPage() {
  const params = useParams();
  const id = Array.isArray(params?.id) ? params.id[0] : (params?.id as string) || '';

  if (!id) {
    return (
      <div className="p-8 text-center text-muted-foreground">
        Invalid or missing employee ID.
      </div>
    );
  }

  return <HREmployeeDetailView employeeId={id} />;
}
