'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import EmployeeDetailView from '@/components/EmployeeDetailView';
import { useAuth } from '@/components/AuthProvider';
import { apiFetch } from '@/lib/api';

export default function MyProfilePage() {
  const router = useRouter();
  const auth = useAuth();
  const [employeeId, setEmployeeId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const emps = await apiFetch<any>('/api/v1/employees?page_size=100');
        const myEmp = emps?.items?.find((e: any) => e.work_email?.toLowerCase() === auth?.user?.email?.toLowerCase() || e.personal_email?.toLowerCase() === auth?.user?.email?.toLowerCase());
        if (myEmp) setEmployeeId(myEmp.id);
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [auth?.user?.email]);

  if (loading) {
    return <div className="p-8 text-center text-muted-foreground">Loading profile...</div>;
  }

  if (!employeeId) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950 py-6 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto space-y-4">
          <div className="flex items-center justify-between border-b pb-3 border-slate-200 dark:border-slate-800">
            <button
              type="button"
              onClick={() => router.push('/executive-portal')}
              className="inline-flex items-center gap-1.5 text-xs font-bold text-indigo-600 dark:text-indigo-400 hover:text-indigo-800 transition"
            >
              <ArrowLeft size={14} /> Back to Portal
            </button>
          </div>
          <div className="p-8 text-center text-muted-foreground bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800">
            No employee profile found linked to your account ({auth?.user?.email}).
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 py-6 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto space-y-4">
        <div className="flex items-center justify-between border-b pb-3 border-slate-200 dark:border-slate-800">
          <button
            type="button"
            onClick={() => router.push('/executive-portal')}
            className="inline-flex items-center gap-1.5 text-xs font-bold text-indigo-600 dark:text-indigo-400 hover:text-indigo-800 transition"
          >
            <ArrowLeft size={14} /> Back to Portal
          </button>
          <span className="text-xs font-bold text-slate-500 bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 px-3 py-1 rounded-full border border-indigo-200 dark:border-indigo-800">
            My Profile - Full Access
          </span>
        </div>
        <EmployeeDetailView employeeId={employeeId} onClose={() => router.push('/executive-portal')} readOnly={false} hideBackButton={true} />
      </div>
    </div>
  );
}
