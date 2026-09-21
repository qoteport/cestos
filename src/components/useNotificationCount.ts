'use client';

import useNotificationData from './useNotificationData';

export default function useNotificationCount() {
  const { data } = useNotificationData<{ total: number }>('/api/v1/notifications/unread-count');
  return data?.total ?? 0;
}
