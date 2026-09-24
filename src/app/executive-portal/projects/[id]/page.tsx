'use client';

import React from 'react';
import { useParams } from 'next/navigation';
import ExecutiveProjectDetailView from '@/components/ExecutiveProjectDetailView';

export default function ExecutiveProjectDetailPage() {
  const params = useParams();
  const id = Array.isArray(params?.id) ? params.id[0] : (params?.id as string) || '';

  if (!id) {
    return (
      <div className="p-8 text-center text-muted-foreground">
        Invalid or missing project ID.
      </div>
    );
  }

  return <ExecutiveProjectDetailView projectId={id} />;
}
