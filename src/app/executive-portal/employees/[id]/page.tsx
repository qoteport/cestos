'use client';

import React from 'react';
import { useParams } from 'next/navigation';
import ExecutiveEmployeeDetailView from '@/components/ExecutiveEmployeeDetailView';

export default function ExecutiveEmployeeDetailPage() {
  const params = useParams();
  const id = Array.isArray(params?.id) ? params.id[0] : (params?.id as string) || '';

  if (!id) {
    return (
      <div className="p-8 text-center text-muted-foreground">
        Invalid or missing employee ID.
      </div>
    );
  }

  return <ExecutiveEmployeeDetailView employeeId={id} />;
}
