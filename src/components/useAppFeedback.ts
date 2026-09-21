'use client';

import { useCallback, useState } from 'react';
import { toast } from 'sonner';

export type AppAlert = { type: 'success' | 'error' | 'info'; message: string };

export default function useAppFeedback() {
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const clearErrors = useCallback(() => setFormErrors({}), []);
  const notify = useCallback((alert: AppAlert | null, formId?: string) => {
    if (!alert) return;
    const message = alert.message || 'The request could not be completed. Please try again.';
    if (formId) setFormErrors(previous => ({
      ...previous, [formId]: alert.type === 'error' ? message : '',
    }));
    toast[alert.type](message, {
      duration: alert.type === 'error' ? Infinity : 6000,
      closeButton: true,
    });
  }, []);
  return { notify, formErrors, clearErrors };
}
