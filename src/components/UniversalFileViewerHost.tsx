'use client';

import { useEffect, useState } from 'react';
import UniversalFileViewerModal from './UniversalFileViewerModal';
import { subscribeToFileViewer, type FileViewerRequest } from '@/lib/fileViewer';

export default function UniversalFileViewerHost() {
  const [request, setRequest] = useState<FileViewerRequest | null>(null);

  useEffect(() => subscribeToFileViewer(setRequest), []);

  return (
    <UniversalFileViewerModal
      isOpen={!!request}
      onClose={() => setRequest(null)}
      fileUrl={request?.fileUrl}
      blob={request?.blob}
      fileName={request?.fileName}
      title={request?.title}
    />
  );
}
