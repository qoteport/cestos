'use client';

import React, { useState, useEffect } from 'react';
import { Truck } from 'lucide-react';
import { apiFetchBlob } from '@/lib/api';

interface AssetThumbnailProps {
  photoUrl?: string | null;
  assetId?: string;
  assetName?: string;
  className?: string;
  iconSize?: number;
}

export default function AssetThumbnail({
  photoUrl,
  assetId,
  assetName,
  className = 'w-10 h-10 rounded-lg object-cover border border-border shadow-xs shrink-0',
  iconSize = 18,
}: AssetThumbnailProps) {
  const [blobUrl, setBlobUrl] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    let createdUrl = '';

    if (!photoUrl && !assetId) return;

    // Handle data URLs or blob URLs directly
    if (photoUrl && (photoUrl.startsWith('data:') || photoUrl.startsWith('blob:'))) {
      setBlobUrl(photoUrl);
      return;
    }

    const path = photoUrl && photoUrl.startsWith('/')
      ? photoUrl
      : assetId
      ? `/api/v1/asset-media/${assetId}/download`
      : null;

    if (!path) return;

    apiFetchBlob(path)
      .then((blob) => {
        if (active && blob && blob.size > 0) {
          createdUrl = URL.createObjectURL(blob);
          setBlobUrl(createdUrl);
        }
      })
      .catch(() => {
        // Fallback silently
      });

    return () => {
      active = false;
      if (createdUrl) {
        URL.revokeObjectURL(createdUrl);
      }
    };
  }, [photoUrl, assetId]);

  if (blobUrl) {
    return (
      <img
        src={blobUrl}
        alt={assetName || 'Asset photo'}
        className={`${className} block shrink-0`}
        loading="eager"
      />
    );
  }

  return (
    <div className="w-10 h-10 rounded-lg bg-primary/10 text-primary font-bold flex items-center justify-center text-xs shrink-0 border border-primary/20">
      <Truck size={iconSize} />
    </div>
  );
}
