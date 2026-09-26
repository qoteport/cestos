'use client';

import React, { useEffect, useState, useRef } from 'react';
import { createPortal } from 'react-dom';
import {
  FileText,
  X,
  Download,
  ExternalLink,
  Printer,
  Eye,
  RefreshCw,
  AlertCircle,
  Paperclip,
  ZoomIn,
  ZoomOut,
  RotateCw,
} from 'lucide-react';
import { apiFetchBlob, downloadBlob } from '@/lib/api';

export interface UniversalFileViewerModalProps {
  isOpen: boolean;
  onClose: () => void;
  fileUrl?: string;
  blob?: Blob | null;
  fileName?: string;
  title?: string;
  fileType?: string;
}

export default function UniversalFileViewerModal({
  isOpen,
  onClose,
  fileUrl,
  blob,
  fileName = 'Document',
  title = 'Internal Document & File Viewer',
  fileType,
}: UniversalFileViewerModalProps) {
  const [mounted, setMounted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [activeBlob, setActiveBlob] = useState<Blob | null>(blob || null);
  const [objectUrl, setObjectUrl] = useState<string>('');
  const [textContent, setTextContent] = useState<string>('');
  const [zoomLevel, setZoomLevel] = useState<number>(100);
  const [rotation, setRotation] = useState<number>(0);
  const [closing, setClosing] = useState(false);
  const iframeRef = useRef<HTMLIFrameElement>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!isOpen) return;

    let currentUrl = '';
    setError('');
    setZoomLevel(100);
    setRotation(0);
    setTextContent('');
    setClosing(false);

    async function loadFile() {
      if (blob) {
        setActiveBlob(blob);
        const url = URL.createObjectURL(blob);
        currentUrl = url;
        setObjectUrl(url);

        if (blob.type.includes('text') || blob.type.includes('json') || fileName.match(/\.(txt|csv|log|json|md)$/i)) {
          const text = await blob.text().catch(() => '');
          setTextContent(text);
        }
        return;
      }

      if (!fileUrl) {
        setError('No file URL or document payload provided.');
        return;
      }

      setLoading(true);
      try {
        // API paths need the authenticated fetch helper. Absolute URLs are
        // usually public or signed attachments, so fetch them without sending
        // the app's bearer token to another origin.
        const fetchedBlob = /^https?:\/\//i.test(fileUrl)
          ? await fetch(fileUrl).then((response) => {
              if (!response.ok) throw new Error(`Could not load file (${response.status})`);
              return response.blob();
            })
          : await apiFetchBlob(fileUrl);
        setActiveBlob(fetchedBlob);
        const url = URL.createObjectURL(fetchedBlob);
        currentUrl = url;
        setObjectUrl(url);

        if (
          fetchedBlob.type.includes('text') ||
          fetchedBlob.type.includes('json') ||
          fileName.match(/\.(txt|csv|log|json|md)$/i)
        ) {
          const text = await fetchedBlob.text().catch(() => '');
          setTextContent(text);
        }
      } catch (err: any) {
        setError(err?.message || 'Could not load document file. Check permissions.');
      } finally {
        setLoading(false);
      }
    }

    void loadFile();

    return () => {
      if (currentUrl) {
        URL.revokeObjectURL(currentUrl);
      }
    };
  }, [isOpen, fileUrl, blob, fileName]);

  if (!isOpen || !mounted) return null;

  // Determine file category
  const lowerName = (fileName || '').toLowerCase();
  const mime = (activeBlob?.type || fileType || '').toLowerCase();

  const isPdf = lowerName.endsWith('.pdf') || mime.includes('pdf');
  const isImage =
    /\.(png|jpe?g|gif|svg|webp|bmp)$/i.test(lowerName) || mime.startsWith('image/');
  const isText =
    /\.(txt|csv|log|json|md|xml|html)$/i.test(lowerName) ||
    mime.includes('text') ||
    mime.includes('json');

  const handlePrint = () => {
    if (isPdf && iframeRef.current?.contentWindow) {
      try {
        iframeRef.current.contentWindow.focus();
        iframeRef.current.contentWindow.print();
        return;
      } catch {
        // Fall back to print window
      }
    }

    if (objectUrl) {
      const printWin = window.open(objectUrl, '_blank');
      if (printWin) {
        printWin.onload = () => {
          printWin.print();
        };
      }
    } else {
      window.print();
    }
  };

  const handleOpenExternal = () => {
    if (objectUrl) {
      window.open(objectUrl, '_blank', 'noopener,noreferrer');
    } else if (fileUrl) {
      window.open(fileUrl, '_blank', 'noopener,noreferrer');
    }
  };

  const handleDownload = () => {
    if (activeBlob) {
      downloadBlob(activeBlob, fileName);
    } else if (fileUrl) {
      const link = document.createElement('a');
      link.href = fileUrl;
      link.download = fileName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  };

  const handleClose = () => {
    if (closing) return;
    setClosing(true);
    setTimeout(onClose, 190);
  };

  return createPortal(
    <div className={`fixed inset-0 z-[2147483647] flex items-center justify-center bg-slate-950/80 p-2 sm:p-4 backdrop-blur-xs ${closing ? 'animate-modal-backdrop-out' : 'animate-modal-backdrop-in'}`}>
      <div className={`bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl w-full max-w-6xl h-[92vh] flex flex-col overflow-hidden ${closing ? 'animate-modal-content-out' : 'animate-modal-content-in'}`}>
        {/* Header Toolbar */}
        <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-3.5 border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-9 h-9 rounded-xl bg-orange-100 dark:bg-orange-950/60 text-orange-600 dark:text-orange-400 flex items-center justify-center font-bold shrink-0">
              <Eye size={20} />
            </div>
            <div className="min-w-0">
              <h3 className="font-bold text-sm sm:text-base text-slate-900 dark:text-white truncate">
                {title}
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 font-mono truncate flex items-center gap-1.5 mt-0.5">
                <Paperclip size={12} className="text-orange-600 shrink-0" />
                <span className="truncate">{fileName}</span>
                {activeBlob?.size && (
                  <span className="text-[11px] text-slate-400">
                    ({(activeBlob.size / 1024).toFixed(1)} KB)
                  </span>
                )}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {/* Image controls */}
            {isImage && (
              <div className="hidden sm:flex items-center gap-1 bg-slate-100 dark:bg-slate-800 p-1 rounded-xl mr-2">
                <button
                  type="button"
                  onClick={() => setZoomLevel((z) => Math.max(50, z - 25))}
                  className="p-1.5 text-slate-600 dark:text-slate-300 hover:bg-white dark:hover:bg-slate-700 rounded-lg transition"
                  title="Zoom Out"
                >
                  <ZoomOut size={15} />
                </button>
                <span className="text-xs font-mono font-bold px-1.5 text-slate-700 dark:text-slate-200">
                  {zoomLevel}%
                </span>
                <button
                  type="button"
                  onClick={() => setZoomLevel((z) => Math.min(300, z + 25))}
                  className="p-1.5 text-slate-600 dark:text-slate-300 hover:bg-white dark:hover:bg-slate-700 rounded-lg transition"
                  title="Zoom In"
                >
                  <ZoomIn size={15} />
                </button>
                <button
                  type="button"
                  onClick={() => setRotation((r) => (r + 90) % 360)}
                  className="p-1.5 text-slate-600 dark:text-slate-300 hover:bg-white dark:hover:bg-slate-700 rounded-lg transition border-l ml-1 pl-2"
                  title="Rotate 90°"
                >
                  <RotateCw size={15} />
                </button>
              </div>
            )}

            {/* Print Button */}
            <button
              type="button"
              onClick={handlePrint}
              disabled={loading || !!error}
              className="px-3 py-1.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold transition flex items-center gap-1.5 disabled:opacity-40"
              title="Print Document"
            >
              <Printer size={14} /> <span className="hidden sm:inline">Print</span>
            </button>

            {/* Open External Button */}
            <button
              type="button"
              onClick={handleOpenExternal}
              disabled={loading || !!error}
              className="px-3 py-1.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold transition flex items-center gap-1.5 disabled:opacity-40"
              title="Open file in external browser tab"
            >
              <ExternalLink size={14} /> <span className="hidden sm:inline">View External</span>
            </button>

            {/* Download Button */}
            <button
              type="button"
              onClick={handleDownload}
              disabled={loading || !!error}
              className="px-3.5 py-1.5 bg-orange-600 hover:bg-orange-700 text-white rounded-xl text-xs font-bold shadow-xs transition flex items-center gap-1.5 disabled:opacity-40"
              title="Download File"
            >
              <Download size={14} /> <span className="hidden sm:inline">Download</span>
            </button>

            {/* Close Modal Button */}
            <button
              type="button"
              onClick={handleClose}
              className="p-1.5 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 hover:text-slate-900 dark:hover:text-white transition ml-1"
              title="Close File Viewer"
            >
              <X size={20} />
            </button>
          </div>
        </div>

        {/* Content Display Body */}
        <div className="flex-1 bg-slate-100 dark:bg-slate-950 p-3 sm:p-5 overflow-hidden flex items-center justify-center relative">
          {loading && (
            <div className="flex flex-col items-center justify-center gap-3 text-slate-500">
              <RefreshCw size={28} className="animate-spin text-orange-600" />
              <p className="text-xs font-bold">Loading document file...</p>
            </div>
          )}

          {error && !loading && (
            <div className="bg-white dark:bg-slate-900 border border-red-200 dark:border-red-900/60 p-6 rounded-2xl max-w-md w-full text-center space-y-3 shadow-lg">
              <AlertCircle size={32} className="text-red-500 mx-auto" />
              <h4 className="font-bold text-sm text-slate-900 dark:text-white">Failed to Load Document</h4>
              <p className="text-xs text-slate-500">{error}</p>
              <div className="flex justify-center gap-2 pt-2">
                <button
                  type="button"
                  onClick={handleOpenExternal}
                  className="px-4 py-2 bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 text-xs font-bold rounded-xl hover:bg-slate-200 transition"
                >
                  Try External Link
                </button>
              </div>
            </div>
          )}

          {!loading && !error && objectUrl && (
            <>
              {/* PDF Viewer */}
              {isPdf && (
                <iframe
                  ref={iframeRef}
                  src={`${objectUrl}#toolbar=0&navpanes=0&scrollbar=1`}
                  className="w-full h-full border-0 rounded-xl bg-white shadow-md"
                  title={fileName}
                />
              )}

              {/* Image Viewer */}
              {isImage && (
                <div className="w-full h-full flex items-center justify-center overflow-auto p-4">
                  <img
                    src={objectUrl}
                    alt={fileName}
                    style={{
                      transform: `scale(${zoomLevel / 100}) rotate(${rotation}deg)`,
                      transition: 'transform 0.2s ease-in-out',
                    }}
                    className="max-h-full max-w-full object-contain rounded-xl shadow-lg border border-slate-200 dark:border-slate-800 bg-white"
                  />
                </div>
              )}

              {/* Text / Code Viewer */}
              {isText && (
                <div className="w-full h-full flex flex-col bg-slate-900 text-slate-100 rounded-xl overflow-hidden shadow-lg border border-slate-800">
                  <div className="px-4 py-2 bg-slate-950 border-b border-slate-800 text-[11px] font-mono font-bold text-slate-400 flex justify-between">
                    <span>DOCUMENT PREVIEW: {fileName}</span>
                    <span>{textContent.length} characters</span>
                  </div>
                  <pre className="flex-1 p-5 font-mono text-xs overflow-auto whitespace-pre-wrap leading-relaxed select-text">
                    {textContent || 'No text content extracted.'}
                  </pre>
                </div>
              )}

              {/* Fallback for binary / unsupported files (.docx, .xlsx, .zip) */}
              {!isPdf && !isImage && !isText && (
                <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-8 rounded-2xl max-w-lg w-full text-center space-y-4 shadow-xl">
                  <div className="w-16 h-16 rounded-2xl bg-orange-100 dark:bg-orange-950/60 text-orange-600 flex items-center justify-center mx-auto">
                    <FileText size={32} />
                  </div>
                  <div>
                    <h4 className="font-bold text-base text-slate-900 dark:text-white">{fileName}</h4>
                    <p className="text-xs text-slate-500 mt-1">
                      Direct in-app rendering for this binary file format is not supported inline.
                    </p>
                  </div>
                  <div className="flex flex-wrap justify-center gap-3 pt-2">
                    <button
                      type="button"
                      onClick={handleDownload}
                      className="px-4 py-2 bg-orange-600 hover:bg-orange-700 text-white rounded-xl text-xs font-bold shadow-xs transition flex items-center gap-1.5"
                    >
                      <Download size={14} /> Download File
                    </button>
                    <button
                      type="button"
                      onClick={handleOpenExternal}
                      className="px-4 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-800 dark:text-slate-200 rounded-xl text-xs font-bold transition flex items-center gap-1.5"
                    >
                      <ExternalLink size={14} /> Open External
                    </button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>,
    document.body
  );
}
