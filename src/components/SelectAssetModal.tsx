'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { Search, Truck, MapPin, FolderKanban, Tag, RefreshCw } from 'lucide-react';
import { apiFetch } from '@/lib/api';
import { Modal, Row } from './DataUI';

interface SelectAssetModalProps {
  title?: string;
  subtitle?: string;
  onClose: () => void;
  onSelectAsset: (asset: Row) => void;
}

export default function SelectAssetModal({
  title = 'Select Equipment Asset',
  subtitle = 'Choose an equipment asset to proceed.',
  onClose,
  onSelectAsset,
}: SelectAssetModalProps) {
  const [assets, setAssets] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

  const fetchAssets = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await apiFetch<any>('/api/v1/assets?page_size=100');
      const list = Array.isArray(res) ? res : res.items || [];
      setAssets(list);
    } catch (err: any) {
      setError(err.message || 'Failed to load equipment assets');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAssets();
  }, []);

  const filteredAssets = useMemo(() => {
    if (!searchQuery.trim()) return assets;
    const q = searchQuery.toLowerCase().trim();
    return assets.filter((ast) => {
      const name = (ast.name || '').toLowerCase();
      const code = (ast.asset_number || ast.code || '').toLowerCase();
      const mfr = (ast.manufacturer || '').toLowerCase();
      const model = (ast.model || '').toLowerCase();
      const serial = (ast.serial_number || '').toLowerCase();
      const project = (ast.current_project?.name || ast.project_name || '').toLowerCase();
      return (
        name.includes(q) ||
        code.includes(q) ||
        mfr.includes(q) ||
        model.includes(q) ||
        serial.includes(q) ||
        project.includes(q)
      );
    });
  }, [assets, searchQuery]);

  return (
    <Modal name={title} onClose={onClose}>
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pb-2 border-b">
          <p className="text-sm text-muted-foreground">{subtitle}</p>
          <div className="relative w-full sm:w-72 shrink-0">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={16} />
            <input
              type="text"
              placeholder="Search by asset #, name, model..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 text-xs bg-muted/50 border rounded-md focus:outline-none focus:ring-2 focus:ring-primary/40"
              autoFocus
            />
          </div>
        </div>

        {error && (
          <div className="p-3 bg-red-50 text-red-700 text-xs rounded-md border border-red-200 flex items-center justify-between">
            <span>{error}</span>
            <button type="button" onClick={fetchAssets} className="btn-secondary text-[11px] py-1 px-2">
              <RefreshCw size={12} className="inline mr-1" /> Retry
            </button>
          </div>
        )}

        {loading ? (
          <div className="py-12 text-center text-xs text-muted-foreground space-y-2">
            <RefreshCw size={20} className="animate-spin mx-auto text-primary" />
            <p>Loading equipment assets...</p>
          </div>
        ) : filteredAssets.length === 0 ? (
          <div className="py-10 text-center text-xs text-muted-foreground border border-dashed rounded-lg">
            <Truck size={28} className="mx-auto text-muted-foreground/40 mb-2" />
            <p className="font-600">No assets found</p>
            {searchQuery && <p className="text-[11px] mt-1 text-muted-foreground">Try clearing your search query</p>}
          </div>
        ) : (
          <div className="max-h-96 overflow-y-auto space-y-2 pr-1 scrollbar-thin">
            {filteredAssets.map((ast) => {
              const photo = ast.photo_url || ast.profile_photo_url;
              const projectName = ast.current_project?.name || ast.project_name || 'Unassigned';
              const locationName = ast.current_location?.name || ast.location_name || '';

              return (
                <div
                  key={ast.id}
                  onClick={() => onSelectAsset(ast)}
                  className="card p-3 border hover:border-primary/50 hover:bg-primary/5 transition-all cursor-pointer flex items-center justify-between gap-3 group"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center shrink-0 overflow-hidden border">
                      {photo ? (
                        <img src={photo} alt={ast.name} className="w-full h-full object-cover" />
                      ) : (
                        <Truck size={20} className="text-primary/70" />
                      )}
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-xs text-foreground truncate">{ast.name}</span>
                        {ast.asset_number && (
                          <span className="badge badge-secondary text-[10px] py-0 px-1.5 font-mono">
                            {ast.asset_number}
                          </span>
                        )}
                      </div>
                      <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 text-[11px] text-muted-foreground mt-1">
                        {ast.manufacturer && (
                          <span className="flex items-center gap-1">
                            <Tag size={11} className="text-muted-foreground/70" />
                            {ast.manufacturer} {ast.model || ''}
                          </span>
                        )}
                        <span className="flex items-center gap-1">
                          <FolderKanban size={11} className="text-muted-foreground/70" />
                          {projectName}
                        </span>
                        {locationName && (
                          <span className="flex items-center gap-1">
                            <MapPin size={11} className="text-muted-foreground/70" />
                            {locationName}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  <button
                    type="button"
                    className="btn-primary text-xs py-1 px-3 shrink-0 opacity-90 group-hover:opacity-100 transition-opacity"
                  >
                    Select
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </Modal>
  );
}
