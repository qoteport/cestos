'use client';

import React from 'react';
import { useParams, useRouter } from 'next/navigation';
import AssetDetailView from '@/components/AssetDetailView';
import { ArrowLeft } from 'lucide-react';

export default function FieldAdminEquipmentDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = Array.isArray(params?.id) ? params.id[0] : (params?.id as string) || '';

  if (!id) {
    return (
      <div className="p-8 text-center text-slate-500">
        Invalid or missing equipment ID.
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 py-6 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto space-y-4">
        <div className="flex items-center justify-between border-b pb-3 border-slate-200 dark:border-slate-800">
          <button
            type="button"
            onClick={() => router.push('/field-admin-portal')}
            className="inline-flex items-center gap-1.5 text-xs font-bold text-orange-600 dark:text-orange-400 hover:text-orange-800 dark:hover:text-orange-300 transition"
          >
            <ArrowLeft size={16} /> Back to Field Admin Portal
          </button>
          <span className="text-xs font-bold bg-orange-50 dark:bg-orange-950/60 text-orange-700 dark:text-orange-300 px-3 py-1 rounded-full border border-orange-200 dark:border-orange-800">
            Field Admin Operations View
          </span>
        </div>

        <AssetDetailView assetId={id} hideInsuranceAndRegistration={true} hideBackButton={true} />
      </div>
    </div>
  );
}
