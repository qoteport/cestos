'use client';

import React, { useState, useEffect } from 'react';
import { Shield, Calendar, Edit, FileText, UserCheck } from 'lucide-react';
import { Modal, Row, display } from './DataUI';
import { apiFetch } from '@/lib/api';

interface AuthorizationDetailsModalProps {
  authorization: Row;
  employeeName?: string;
  assetName?: string;
  onClose: () => void;
  onEdit?: (authorization: Row) => void;
}

export default function AuthorizationDetailsModal({
  authorization,
  employeeName,
  assetName: initialAssetName,
  onClose,
  onEdit,
}: AuthorizationDetailsModalProps) {
  const [enriched, setEnriched] = useState<Row>(authorization);
  const [resolvedAssetName, setResolvedAssetName] = useState<string>(initialAssetName || '');

  useEffect(() => {
    let active = true;
    const fetchExtra = async () => {
      try {
        const updates: Row = { ...authorization };

        if (authorization.asset_id && !resolvedAssetName) {
          try {
            const a = await apiFetch<Row>(`/api/v1/assets/${authorization.asset_id}`);
            if (a && active) {
              setResolvedAssetName(a.name || a.title || a.asset_number || authorization.asset_id);
            }
          } catch {}
        }

        if (authorization.asset_category_id && !updates.category_name) {
          try {
            const c = await apiFetch<Row>(`/api/v1/asset-categories/${authorization.asset_category_id}`);
            if (c && active) {
              updates.category_name = c.name || c.title || c.code;
            }
          } catch {}
        }

        if (authorization.authorized_by_id && !updates.authorized_by_name) {
          try {
            const s = await apiFetch<Row>(`/api/v1/employees/${authorization.authorized_by_id}`);
            if (s && active) {
              updates.authorized_by_name = [s.first_name, s.last_name].filter(Boolean).join(' ') || s.name;
            }
          } catch {}
        }

        if (active) setEnriched(updates);
      } catch {}
    };

    fetchExtra();
    return () => { active = false; };
  }, [authorization, initialAssetName, resolvedAssetName]);

  const item = enriched;

  const targetAsset = resolvedAssetName || item.asset_name || (typeof item.asset === 'object' ? item.asset?.name : null) || item.asset_id;
  const targetCategory = item.category_name || item.asset_category_name || (typeof item.asset_category === 'object' ? item.asset_category?.name : null) || item.asset_category_id;

  const statusColor =
    item.status === 'ACTIVE' ?'bg-emerald-100 text-emerald-800 border-emerald-300'
      : item.status === 'REVOKED'|| item.status === 'EXPIRED' ?'bg-rose-100 text-rose-800 border-rose-300' :'bg-amber-100 text-amber-800 border-amber-300';

  return (
    <Modal name={`Asset Authorization Details — ${display(item.authorization_type || 'Record')}`} onClose={onClose}>
      <div className="space-y-5">
        {/* Header Bar */}
        <div className="flex flex-wrap items-center justify-between gap-3 p-4 bg-muted/30 border rounded-lg">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-full bg-primary/10 text-primary border border-primary/20">
              <Shield size={20} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-foreground">
                  {display(item.authorization_type || 'AUTHORIZATION')}
                </h3>
              </div>
              <p className="text-xs text-muted-foreground">
                Target: <span className="font-semibold text-foreground">{display(targetAsset || targetCategory || 'General Authorization')}</span>
                {employeeName ? ` • ${employeeName}` : ''}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className={`px-2.5 py-1 rounded-full text-xs font-bold border ${statusColor}`}>
              {display(item.status || 'ACTIVE')}
            </span>
            {onEdit && (
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onEdit(item);
                }}
                className="btn-primary text-xs flex items-center gap-1.5"
              >
                <Edit size={13} /> Edit Authorization
              </button>
            )}
          </div>
        </div>

        {/* Details Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Box 1: Authorized Equipment */}
          <div className="p-4 border rounded-lg bg-card space-y-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5 border-b pb-2">
              <Shield size={14} className="text-primary" /> Equipment Target
            </h4>
            <div className="space-y-2 text-xs">
              <div>
                <span className="text-muted-foreground block text-[11px]">Authorized Asset</span>
                <span className="font-semibold text-foreground text-sm">{display(targetAsset || 'All Assets in Category')}</span>
              </div>
              {targetCategory && (
                <div>
                  <span className="text-muted-foreground block text-[11px]">Asset Category</span>
                  <span className="font-semibold text-foreground">{display(targetCategory)}</span>
                </div>
              )}
              <div>
                <span className="text-muted-foreground block text-[11px]">Authorization Level / Type</span>
                <span className="font-semibold text-foreground">{display(item.authorization_type || 'OPERATOR')}</span>
              </div>
            </div>
          </div>

          {/* Box 2: Validity & Issuer */}
          <div className="p-4 border rounded-lg bg-card space-y-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5 border-b pb-2">
              <Calendar size={14} className="text-primary" /> Validity & Issuer
            </h4>
            <div className="space-y-2 text-xs">
              <div>
                <span className="text-muted-foreground block text-[11px]">Valid From</span>
                <span className="font-semibold text-foreground">{display(item.valid_from || 'Immediate')}</span>
              </div>
              <div>
                <span className="text-muted-foreground block text-[11px]">Valid Until / Expiry</span>
                <span className="font-semibold text-foreground">{display(item.valid_until || 'No Expiry / Indefinite')}</span>
              </div>
              {item.authorized_by_name && (
                <div>
                  <span className="text-muted-foreground block text-[11px]">Authorized By</span>
                  <span className="font-semibold text-foreground flex items-center gap-1">
                    <UserCheck size={12} className="text-muted-foreground shrink-0" />
                    {display(item.authorized_by_name)}
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Box 3: Notes & Safety Restrictions */}
          {item.notes && (
            <div className="p-4 border rounded-lg bg-card space-y-2 md:col-span-2">
              <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5 border-b pb-2">
                <FileText size={14} className="text-primary" /> Notes & Operating Conditions
              </h4>
              <p className="text-xs text-foreground whitespace-pre-wrap leading-relaxed">{item.notes}</p>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="flex justify-between items-center pt-3 border-t">
          <button type="button" className="btn-secondary text-xs" onClick={onClose}>
            Close
          </button>

          {onEdit && (
            <button
              type="button"
              onClick={() => {
                onClose();
                onEdit(item);
              }}
              className="btn-primary text-xs flex items-center gap-1.5"
            >
              <Edit size={13} /> Edit Authorization
            </button>
          )}
        </div>
      </div>
    </Modal>
  );
}
