export interface FileViewerRequest {
  fileUrl?: string;
  blob?: Blob;
  fileName?: string;
  title?: string;
}

const FILE_VIEWER_EVENT = 'cestos:open-file-viewer';

/** Open any file in the shared in-app viewer from anywhere in the application. */
export function openUniversalFileViewer(request: FileViewerRequest) {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(new CustomEvent<FileViewerRequest>(FILE_VIEWER_EVENT, { detail: request }));
}

export function subscribeToFileViewer(listener: (request: FileViewerRequest) => void) {
  if (typeof window === 'undefined') return () => {};
  const handleOpen = (event: Event) => listener((event as CustomEvent<FileViewerRequest>).detail);
  window.addEventListener(FILE_VIEWER_EVENT, handleOpen);
  return () => window.removeEventListener(FILE_VIEWER_EVENT, handleOpen);
}
