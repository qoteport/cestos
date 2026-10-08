'use client';

import { createContext, useContext, useEffect, useRef, useState, useMemo, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { Download, FileSpreadsheet, Save, X, Plus, FolderOpen } from 'lucide-react';
import type { FieldWorkbook } from '@/lib/fieldWorkbook';

export type HeaderState = {
  book: FieldWorkbook;
  dirty: boolean;
  busy: boolean;
  onLeave: () => void;
  onRename: (newName: string) => void;
  onDownload: (format?: 'xlsx' | 'csv' | 'backup') => void;
  onSaveDevice: () => void;
  onPrint: () => void;
  onRecover: () => void;
  onShare: () => void;
  autosaveStatus: string;
  online: boolean;
  offlineToolsReady: boolean;
  onSave: () => void;
} | null;

export type WorkbookTabsState = {
  tabs: {id: string; name: string; dirty: boolean}[];
  activeId: string | null;
  busy: boolean;
  onSelect: (id: string) => void;
  onCloseTab: (id: string) => void;
  onNew: () => void;
  onLibrary: () => void;
};
const FieldWorkbookHeaderContext = createContext<{
  setHeaderState: (state: HeaderState) => void;
  setTabsState: (state: WorkbookTabsState | null) => void;
}>({setHeaderState: () => {}, setTabsState: () => {}});

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
  const [tabsState, setTabsState] = useState<WorkbookTabsState | null>(null);
  const [headerState, setHeaderState] = useState<HeaderState>(null);
  const contextValue = useMemo(() => ({setHeaderState, setTabsState}), []);
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
    <FieldWorkbookHeaderContext.Provider value={contextValue}>
      <dialog
        ref={dialog}
        style={{fontFamily: "Arial, sans-serif"}}
        aria-labelledby="field-workbooks-title"
        onCancel={(event) => {
          event.preventDefault();
          close();
        }}
        className={`fixed inset-0 m-0 h-[100dvh] max-h-none w-screen max-w-none overflow-hidden border-0 bg-slate-50 p-0 text-slate-900 shadow-2xl transition-[opacity,transform] duration-200 ease-out backdrop:bg-slate-950/60 motion-reduce:transition-none dark:bg-slate-950 dark:text-white ${entered ? 'translate-y-0 opacity-100' : 'translate-y-4 opacity-0'}`}
      >
        <div className="flex h-full min-h-0 flex-col">
          <header className="shrink-0 border-b border-slate-200 bg-[#edf2f3] dark:border-slate-700 dark:bg-slate-900">
            <h2 id="field-workbooks-title" className="sr-only">Cestos Workbooks</h2>
            <div className="flex h-11 items-stretch gap-1 px-2">
              <div className="flex shrink-0 items-center gap-1.5 px-2">
                <button
                  type="button"
                  title="Workbook library"
                  aria-label="Workbook library"
                  disabled={tabsState?.busy}
                  onClick={tabsState?.onLibrary}
                  className={`group relative flex items-center justify-center rounded-lg p-1.5 transition-all duration-150 outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 disabled:opacity-50 active:scale-95 ${
                    !tabsState?.activeId
                      ? 'bg-emerald-100/90 text-emerald-700 shadow-xs dark:bg-emerald-950 dark:text-emerald-300'
                      : 'text-emerald-800 hover:bg-emerald-100/70 hover:text-emerald-600 dark:text-emerald-300 dark:hover:bg-emerald-950/60 dark:hover:text-emerald-200'
                  }`}
                >
                  <FileSpreadsheet
                    size={20}
                    className="transition-transform duration-150 group-hover:scale-110"
                  />
                </button>
                <span className="hidden text-xs font-bold tracking-wide text-slate-800 dark:text-slate-200 sm:inline select-none">
                  CESTOS SHEETS
                </span>
              </div>
              <div role="tablist" aria-label="Open workbooks" className="flex min-w-0 flex-1 items-end gap-1 overflow-x-auto">
                {tabsState?.tabs.map(tab=><div key={tab.id} className={`flex h-9 min-w-32 max-w-56 shrink-0 items-center rounded-t-md border border-b-0 ${tabsState.activeId===tab.id ? 'border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-950' : 'border-transparent bg-slate-200/50 hover:bg-slate-200 dark:bg-slate-800'}`}>
                  <button type="button" role="tab" aria-selected={tabsState.activeId===tab.id} aria-label={`Open workbook ${tab.name}`} disabled={tabsState.busy} onClick={()=>tabsState.onSelect(tab.id)} className={`flex min-w-0 flex-1 items-center gap-2 px-3 py-2 text-xs ${tabsState.activeId===tab.id ? 'font-semibold text-emerald-800 dark:text-emerald-300' : 'text-slate-600 dark:text-slate-300'}`}><span className="truncate">{tab.name}</span>{tab.dirty && <span aria-label="Unsaved changes" className="h-1.5 w-1.5 shrink-0 rounded-full bg-emerald-600"/>}</button>
                  <button type="button" aria-label={`Close workbook ${tab.name}`} disabled={tabsState.busy} onClick={()=>tabsState.onCloseTab(tab.id)} className="mr-1 rounded p-1 text-slate-500 hover:bg-slate-200 dark:hover:bg-slate-700"><X size={13}/></button>
                </div>)}
              </div>
              <button type="button" aria-label="New workbook tab" title="New workbook" disabled={tabsState?.busy} onClick={tabsState?.onNew} className="my-1 rounded px-2 text-slate-600 hover:bg-white dark:hover:bg-slate-800"><Plus size={18}/></button>
              <button type="button" aria-label="Close workbooks" onClick={close} className="my-1 rounded px-2 text-slate-500 hover:bg-red-100 hover:text-red-700"><X size={18}/></button>
            </div>
            {headerState?.book && <div className="flex min-h-10 flex-wrap items-center justify-between gap-3 border-t border-slate-200 bg-white px-4 dark:border-slate-700 dark:bg-slate-950">
              <div className="flex min-w-0 items-center gap-3"><input aria-label="Workbook name" maxLength={250} value={headerState.book.name} disabled={headerState.busy} onChange={e=>headerState.onRename(e.target.value)} className="min-w-0 max-w-60 rounded border border-transparent bg-transparent px-1 py-0.5 text-xs font-semibold hover:border-slate-300 focus:border-emerald-600 focus:outline-none"/><span className="hidden text-[11px] text-slate-400 sm:inline">{!headerState.online ? 'Offline · ' : ''}{headerState.dirty ? 'Unsaved changes' : 'Saved'} · {headerState.book.sheets.length} {headerState.book.sheets.length === 1 ? 'sheet' : 'sheets'}</span></div>
              <div className="flex flex-wrap items-center gap-2 py-1">
                <details className="relative">
                  <summary className="flex cursor-pointer items-center gap-1.5 rounded border border-slate-300 dark:border-slate-700 px-2.5 py-1 text-xs text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800">
                    <Download size={14} />
                    Export & Backup
                  </summary>
                  <div className="absolute right-0 top-full z-[80] mt-1 w-64 rounded-xl border border-slate-200 bg-white p-2 text-xs shadow-xl dark:border-slate-700 dark:bg-slate-900">
                    <div className="px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                      Downloads & Formats
                    </div>
                    <button
                      type="button"
                      disabled={headerState.busy}
                      className="block w-full rounded-lg px-3 py-2 text-left hover:bg-slate-100 dark:hover:bg-slate-800"
                      onClick={(event) => {
                        headerState.onDownload('xlsx');
                        event.currentTarget.closest('details')?.removeAttribute('open');
                      }}
                    >
                      Download Excel (.xlsx)
                    </button>
                    <button
                      type="button"
                      disabled={headerState.busy}
                      className="block w-full rounded-lg px-3 py-2 text-left hover:bg-slate-100 dark:hover:bg-slate-800"
                      onClick={(event) => {
                        headerState.onDownload('backup');
                        event.currentTarget.closest('details')?.removeAttribute('open');
                      }}
                    >
                      Complete backup (.cestos.json)
                    </button>
                    <button
                      type="button"
                      disabled={headerState.busy}
                      className="block w-full rounded-lg px-3 py-2 text-left hover:bg-slate-100 dark:hover:bg-slate-800"
                      onClick={(event) => {
                        headerState.onDownload('csv');
                        event.currentTarget.closest('details')?.removeAttribute('open');
                      }}
                    >
                      Current sheet values (.csv)
                    </button>
                    <div className="my-1 border-t border-slate-100 dark:border-slate-800" />
                    <div className="px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                      Tools & Recovery
                    </div>
                    <button
                      type="button"
                      disabled={headerState.busy}
                      className="block w-full rounded-lg px-3 py-2 text-left hover:bg-slate-100 dark:hover:bg-slate-800"
                      onClick={(event) => {
                        event.currentTarget.closest('details')?.removeAttribute('open');
                        headerState.onPrint();
                      }}
                    >
                      Print active sheet / Save as PDF
                    </button>
                    <button
                      type="button"
                      disabled={headerState.busy}
                      className="block w-full rounded-lg px-3 py-2 text-left hover:bg-slate-100 dark:hover:bg-slate-800"
                      onClick={(event) => {
                        headerState.onRecover();
                        event.currentTarget.closest('details')?.removeAttribute('open');
                      }}
                    >
                      Recover previous version
                    </button>
                  </div>
                </details>
                <button
                  type="button"
                  className="rounded border border-slate-300 dark:border-slate-700 px-2.5 py-1 text-xs text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800"
                  disabled={headerState.busy || !headerState.online}
                  onClick={headerState.onShare}
                >
                  Share
                </button>
                <button
                  type="button"
                  disabled={headerState.busy}
                  onClick={headerState.onSave}
                  className="flex items-center gap-1.5 rounded-lg bg-emerald-700 px-3.5 py-1.5 text-xs font-bold text-white shadow-xs hover:bg-emerald-800 transition"
                >
                  <Save size={14} />
                  {headerState.busy ? 'Working…' : 'Save'}
                </button>
                <span className="text-[10px] text-slate-500" title="Open this page online before using it offline. Browser data must be retained.">{headerState.autosaveStatus}</span>
              </div>
            </div>}
          </header>
          <div className="min-h-0 flex-1 overflow-auto">{visited && children}</div>
        </div>
      </dialog>
    </FieldWorkbookHeaderContext.Provider>,
    document.body
  );
}
