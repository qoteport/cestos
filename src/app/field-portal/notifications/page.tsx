'use client';

import { useRouter } from 'next/navigation';
import FieldPortalLayout from '@/components/FieldPortalLayout';
import NotificationWorkspace from '@/components/NotificationWorkspace';

export default function FieldNotificationsPage() {
  const router = useRouter();
  return (
    <FieldPortalLayout activeTab="NOTIFICATIONS" onTabChange={(tab: string) => router.push(`/field-portal?tab=${encodeURIComponent(tab)}`)}>
      <NotificationWorkspace fieldPortal />
    </FieldPortalLayout>
  );
}
