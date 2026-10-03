'use client';

import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { ArrowLeft, Download, FileSpreadsheet, Save, X } from 'lucide-react';
import type { FieldWorkbook } from '@/lib/fieldWorkbook';

export type HeaderState = {
  book: FieldWorkbook;
  dirty: boolean;
  busy: boolean;
  onLeave: () => void;
  onRename: (newName: string) => void;
  onDownload: () => void;
  onSave: () => void;
} | null;

const FieldWorkbookHeaderContext = createContext<{
  setHeaderState: (state: HeaderState) => void;
}>({
  setHeaderState: () => {},
});

export function useFieldWorkbookHeader() {
  return useContext(FieldWorkbookHeaderContext);
}

export default function FieldWorkbookDialog({
  open,
  onClose,
  children,
}: {
  open: boolean;
  onClose: () => void;
  children: ReactNode;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  const [mounted, setMounted] = useState(false);
  const [entered, setEntered] = useState(false);
  const [visited, setVisited] = useState(false);
  const [headerState, setHeaderState] = useState<HeaderState>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    setMounted(true);
    return () => {
      if (timer.current) clearTimeout(timer.current);
    };
  }, []);

  useEffect(() => {
    if (!mounted || !open) return;
    setVisited(true);
    const node = dialog.current;
    if (node && !node.open) node.showModal();
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    let secondFrame = 0;
    const frame = requestAnimationFrame(() => {
      secondFrame = requestAnimationFrame(() => setEntered(true));
    });
    return () => {
      cancelAnimationFrame(frame);
      cancelAnimationFrame(secondFrame);
      document.body.style.overflow = previous;
    };
  }, [open, mounted]);

  useEffect(() => {
    if (!open) {
      setEntered(false);
      dialog.current?.close();
      setHeaderState(null);
    }
  }, [open]);

  function close() {
    if (timer.current) return;
    setEntered(false);
    timer.current = setTimeout(
      () => {
        timer.current = null;
        onClose();
      },
      window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 0 : 200
    );
  }

  if (!mounted) return null;

  return createPortal(
    <FieldWorkbookHeaderContext.Provider value={{ setHeaderState }}>
      <dialog
        ref={dialog}
        aria-labelledby="field-workbooks-title"
        onCancel={(event) => {
          event.preventDefault();
          close();
        }}
        className={`fixed inset-0 m-0 h-[100dvh] max-h-none w-screen max-w-none overflow-hidden border-0 bg-slate-50 p-0 text-slate-900 shadow-2xl transition-[opacity,transform] duration-200 ease-out backdrop:bg-slate-950/60 motion-reduce:transition-none dark:bg-slate-950 dark:text-white ${entered ? 'translate-y-0 opacity-100' : 'translate-y-4 opacity-0'}`}
      >
        <div className="flex h-full min-h-0 flex-col">
          <header className="flex shrink-0 flex-wrap items-center justify-between gap-3 border-b border-slate-200 bg-white px-3 py-2.5 dark:border-slate-800 dark:bg-slate-900 sm:px-6">
            {headerState?.book ? (
              <>
                <div className="flex min-w-0 items-center gap-2 sm:gap-3">
                  <button
                    type="button"
                    disabled={headerState.busy}
                    onClick={headerState.onLeave}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-100 disabled:opacity-40 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700 transition shadow-xs"
                  >
                    <ArrowLeft size={14} />
                    <span>Library</span>
                  </button>
                  <FileSpreadsheet size={20} className="shrink-0 text-emerald-600" />
                  <input
                    aria-label="Workbook name"
                    maxLength={250}
                    value={headerState.book.name}
                    disabled={headerState.busy}
                    onChange={(e) => headerState.onRename(e.target.value)}
                    className="min-w-36 max-w-[200px] sm:max-w-md rounded-lg border border-slate-200 hover:border-slate-300 px-2.5 py-1 text-base font-bold text-slate-900 transition hover:bg-slate-100 focus:border-emerald-600 focus:bg-white focus:outline-none dark:text-white dark:border-slate-700 dark:hover:bg-slate-800 dark:focus:border-emerald-500 dark:focus:bg-slate-900"
                    placeholder="Untitled workbook"
                  />
                  <span className="hidden sm:inline-block text-xs font-medium text-slate-500 dark:text-slate-400 shrink-0">
                    {headerState.dirty ? 'Unsaved changes' : 'Saved'} · {headerState.book.sheets.length} sheet{headerState.book.sheets.length === 1 ? '' : 's'}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    disabled={headerState.busy}
                    onClick={headerState.onDownload}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-100 disabled:opacity-40 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700 transition shadow-xs"
                  >
                    <Download size={14} />
                    <span className="hidden sm:inline">Excel</span>
                  </button>
                  <button
                    type="button"
                    disabled={headerState.busy}
                    onClick={headerState.onSave}
                    className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-3.5 py-1.5 text-xs font-bold text-white shadow-xs hover:bg-emerald-700 disabled:opacity-40 transition"
                  >
                    <Save size={14} />
                    <span>{headerState.busy ? 'Working…' : 'Save'}</span>
                  </button>
                  <button
                    type="button"
                    onClick={close}
                    title="Close workbooks"
                    aria-label="Close workbooks"
                    className="rounded-lg border border-slate-300 p-1.5 text-slate-700 hover:bg-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
                  >
                    <X size={18} />
                  </button>
                </div>
              </>
            ) : (
              <>
                <h2 id="field-workbooks-title" className="flex items-center gap-2 text-base font-bold">
                  <FileSpreadsheet size={20} className="text-emerald-600" />
                  Workbooks
                </h2>
                <button
                  type="button"
                  autoFocus
                  onClick={close}
                  title="Close workbooks"
                  aria-label="Close workbooks"
                  className="rounded-lg border border-slate-300 p-1.5 hover:bg-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600 dark:border-slate-700 dark:hover:bg-slate-800"
                >
                  <X size={18} />
                </button>
              </>
            )}
          </header>
          <div className="min-h-0 flex-1 overflow-auto p-3 sm:p-6">{visited && children}</div>
        </div>
      </dialog>
    </FieldWorkbookHeaderContext.Provider>,
    document.body
  );
}
