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

import * as XLSX from 'xlsx';

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
  const [spreadsheetSheets, setSpreadsheetSheets] = useState<{ name: string; rows: string[][] }[]>([]);
  const [activeSheetIndex, setActiveSheetIndex] = useState<number>(0);
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
    let cancelled = false;
    setError('');
    setLoading(false);
    setActiveBlob(null);
    setObjectUrl('');
    setZoomLevel(100);
    setRotation(0);
    setTextContent('');
    setSpreadsheetSheets([]);
    setActiveSheetIndex(0);
    setClosing(false);

    async function parseSpreadsheet(targetBlob: Blob) {
      try {
        const buffer = await targetBlob.arrayBuffer();
        const workbook = XLSX.read(buffer, { type: 'array', cellDates: true, cellFormula: false });
        const sheetsData: { name: string; rows: string[][] }[] = [];

        for (const sheetName of workbook.SheetNames) {
          const worksheet = workbook.Sheets[sheetName];
          if (!worksheet) continue;
          const rawRows: (string | number | boolean | null)[][] = XLSX.utils.sheet_to_json(worksheet, {
            header: 1,
            defval: '',
            blankrows: false,
          });
          const stringRows = rawRows.map((row) =>
            (row || []).map((cell) => (cell === null || cell === undefined ? '' : String(cell).trim()))
          );

          if (stringRows.length > 0) {
            sheetsData.push({ name: sheetName, rows: stringRows });
          }
        }

        if (!cancelled && sheetsData.length > 0) {
          setSpreadsheetSheets(sheetsData);
        }
      } catch (err) {
        console.warn('Could not parse spreadsheet table in viewer:', err);
      }
    }

    async function loadFile() {
      if (blob) {
        if (cancelled) return;
        setActiveBlob(blob);
        const url = URL.createObjectURL(blob);
        currentUrl = url;
        setObjectUrl(url);

        const isExcelOrCsv = blob.type.includes('csv') || blob.type.includes('spreadsheet') || blob.type.includes('excel') || fileName.match(/\.(csv|xlsx|xls|tsv)$/i);
        if (isExcelOrCsv) {
          await parseSpreadsheet(blob);
        }

        if (blob.type.includes('text') || blob.type.includes('json') || fileName.match(/\.(txt|csv|log|json|md)$/i)) {
          const text = await blob.text().catch(() => '');
          if (!cancelled) setTextContent(text);
        }
        return;
      }

      if (!fileUrl) {
        setError('No file URL or document payload provided.');
        return;
      }

      setLoading(true);
      try {
        const fetchedBlob = /^https?:\/\//i.test(fileUrl)
          ? await fetch(fileUrl).then((response) => {
              if (!response.ok) throw new Error(`Could not load file (${response.status})`);
              return response.blob();
            })
          : await apiFetchBlob(fileUrl);
        if (cancelled) return;
        setActiveBlob(fetchedBlob);
        const url = URL.createObjectURL(fetchedBlob);
        currentUrl = url;
        setObjectUrl(url);

        const isExcelOrCsv = fetchedBlob.type.includes('csv') || fetchedBlob.type.includes('spreadsheet') || fetchedBlob.type.includes('excel') || fileName.match(/\.(csv|xlsx|xls|tsv)$/i);
        if (isExcelOrCsv) {
          await parseSpreadsheet(fetchedBlob);
        }

        if (
          fetchedBlob.type.includes('text') ||
          fetchedBlob.type.includes('json') ||
          fileName.match(/\.(txt|csv|log|json|md)$/i)
        ) {
          const text = await fetchedBlob.text().catch(() => '');
          if (!cancelled) setTextContent(text);
        }
      } catch (err: any) {
        if (!cancelled) setError(err?.message || 'Could not load document file. Check permissions.');
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    void loadFile();

    return () => {
      cancelled = true;
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
  const isSpreadsheet =
    /\.(csv|xlsx|xls|tsv)$/i.test(lowerName) ||
    mime.includes('csv') ||
    mime.includes('spreadsheet') ||
    mime.includes('excel');
  const isText =
    !isSpreadsheet &&
    !isImage &&
    !isPdf &&
    (/\.(txt|log|json|md|xml|html)$/i.test(lowerName) ||
      mime.includes('text') ||
      mime.includes('json'));

  const activeSheet = spreadsheetSheets[activeSheetIndex] || spreadsheetSheets[0];
  const maxColumns = activeSheet?.rows?.reduce((max, row) => Math.max(max, row.length), 0) || 0;

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
        <div className="relative border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-4 py-3.5 sm:px-6 shrink-0">
          {/* Pinned Top-Right Close Button */}
          <button
            type="button"
            onClick={handleClose}
            className="absolute right-3 sm:right-4 top-3 sm:top-3.5 z-20 p-1.5 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 hover:text-slate-900 dark:hover:text-white transition"
            title="Close File Viewer"
            aria-label="Close File Viewer"
          >
            <X size={20} />
          </button>

          {/* Main Header Content Container */}
          <div className="flex flex-wrap items-center justify-between gap-3 pr-10">
            {/* Title & File Info */}
            <div className="flex items-center gap-3 min-w-0 flex-1 max-w-full sm:max-w-xl">
              <div className="w-9 h-9 rounded-xl bg-orange-100 dark:bg-orange-950/60 text-orange-600 dark:text-orange-400 flex items-center justify-center font-bold shrink-0">
                <Eye size={20} />
              </div>
              <div className="min-w-0 flex-1">
                <h3 className="font-bold text-sm sm:text-base text-slate-900 dark:text-white truncate">
                  {title}
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 font-mono truncate flex items-center gap-1.5 mt-0.5">
                  <Paperclip size={12} className="text-orange-600 shrink-0" />
                  <span className="truncate">{fileName}</span>
                  {activeBlob?.size && (
                    <span className="text-[11px] text-slate-400 shrink-0">
                      ({(activeBlob.size / 1024).toFixed(1)} KB)
                    </span>
                  )}
                </p>
              </div>
            </div>

            {/* Action Controls (Print, External, Download, Zoom) */}
            <div className="flex flex-wrap items-center gap-2 shrink-0">
              {/* Image controls */}
              {isImage && (
                <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800 p-1 rounded-xl mr-1 sm:mr-2">
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
            </div>
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
                <div className="w-full h-full flex items-center justify-center overflow-auto p-2 sm:p-6 text-center">
                  <img
                    src={objectUrl}
                    alt={fileName}
                    style={{
                      transform: zoomLevel !== 100 || rotation !== 0 ? `scale(${zoomLevel / 100}) rotate(${rotation}deg)` : undefined,
                      transition: 'transform 0.2s ease-in-out',
                    }}
                    className="max-h-full max-w-full object-contain rounded-xl shadow-xl border border-slate-200 dark:border-slate-800 bg-white m-auto"
                  />
                </div>
              )}

              {/* CSV & Excel Tabular Spreadsheet Viewer */}
              {isSpreadsheet && (
                <div className="w-full h-full flex flex-col bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-lg">
                  {/* Workbook Sheet Tabs Bar */}
                  <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 px-4 py-2 text-xs">
                    <div className="flex items-center gap-2 overflow-x-auto py-0.5">
                      <span className="font-bold text-slate-700 dark:text-slate-300 text-[11px] uppercase tracking-wider mr-2">
                        Sheets:
                      </span>
                      {spreadsheetSheets.length > 0 ? (
                        spreadsheetSheets.map((sheet, index) => (
                          <button
                            key={sheet.name}
                            type="button"
                            onClick={() => setActiveSheetIndex(index)}
                            className={`px-3 py-1 rounded-lg font-semibold text-xs transition ${
                              activeSheetIndex === index
                                ? 'bg-orange-600 text-white shadow-xs font-bold'
                                : 'bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-300 dark:hover:bg-slate-700'
                            }`}
                          >
                            {sheet.name} ({sheet.rows.length} rows)
                          </button>
                        ))
                      ) : (
                        <span className="text-slate-500 italic">Reading data table...</span>
                      )}
                    </div>

                    {activeSheet && (
                      <span className="text-[11px] font-mono text-slate-500 shrink-0 ml-3">
                        {activeSheet.rows.length} rows × {maxColumns} columns
                      </span>
                    )}
                  </div>

                  {/* Interactive Table Grid */}
                  <div className="flex-1 overflow-auto bg-white dark:bg-slate-900">
                    {activeSheet && activeSheet.rows.length > 0 ? (
                      <table className="w-full text-left border-collapse text-xs">
                        <thead>
                          <tr className="bg-slate-100 dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 sticky top-0 z-10">
                            <th className="px-3 py-2 text-[11px] font-bold text-slate-400 border-r border-slate-200 dark:border-slate-700 w-12 text-center bg-slate-100 dark:bg-slate-800">
                              #
                            </th>
                            {Array.from({ length: maxColumns }).map((_, colIdx) => (
                              <th
                                key={colIdx}
                                className="px-3.5 py-2 font-bold text-slate-800 dark:text-slate-200 border-r border-slate-200 dark:border-slate-700 whitespace-nowrap bg-slate-100 dark:bg-slate-800"
                              >
                                {activeSheet.rows[0]?.[colIdx] || `Col ${colIdx + 1}`}
                              </th>
                            ))}
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                          {activeSheet.rows.slice(1).map((row, rowIdx) => (
                            <tr
                              key={rowIdx}
                              className="hover:bg-slate-50 dark:hover:bg-slate-800/60 transition-colors"
                            >
                              <td className="px-3 py-2 text-[11px] font-mono font-semibold text-slate-400 border-r border-slate-200 dark:border-slate-800 text-center bg-slate-50/50 dark:bg-slate-950/50">
                                {rowIdx + 2}
                              </td>
                              {Array.from({ length: maxColumns }).map((_, colIdx) => (
                                <td
                                  key={colIdx}
                                  className="px-3.5 py-2 text-slate-700 dark:text-slate-300 border-r border-slate-200 dark:border-slate-800 whitespace-nowrap"
                                >
                                  {row[colIdx] !== undefined ? row[colIdx] : ''}
                                </td>
                              ))}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    ) : (
                      <div className="flex flex-col items-center justify-center p-8 text-slate-500 space-y-2">
                        <FileText size={24} />
                        <p className="text-xs font-bold">No tabular data rows found in this sheet.</p>
                      </div>
                    )}
                  </div>
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

              {/* Fallback for binary / unsupported files (.zip, .pdf binary errors) */}
              {!isPdf && !isImage && !isSpreadsheet && !isText && (
                <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-8 rounded-2xl max-w-lg w-full text-center space-y-4 shadow-xl">
                  <div className="w-16 h-16 rounded-2xl bg-orange-100 dark:bg-orange-950/60 text-orange-600 flex items-center justify-center mx-auto">
                    <FileText size={32} />
                  </div>
                  <div>
                    <h4 className="font-bold text-base text-slate-900 dark:text-white">{fileName}</h4>
                    <p className="text-xs text-slate-500 mt-1">
                      Direct in-app rendering for this file format is not supported inline.
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
