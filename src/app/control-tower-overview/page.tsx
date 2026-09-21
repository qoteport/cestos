'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import AppLayout from '@/components/AppLayout';
import ResourceWorkspace from '@/components/ResourceWorkspace';

export default function ControlTowerOverviewPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace('/workspace/operations-and-revenue');
  }, [router]);

  return (
    <AppLayout>
      <ResourceWorkspace resource="operations-and-revenue" />
    </AppLayout>
  );
}

