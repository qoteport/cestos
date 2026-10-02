'use client';

import { useEffect, useRef, useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { FileSpreadsheet, X } from 'lucide-react';

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
        <header className="flex shrink-0 items-center justify-between gap-4 border-b border-slate-200 bg-white px-4 py-3 dark:border-slate-800 dark:bg-slate-900 sm:px-6">
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
            className="rounded-lg border border-slate-300 p-2 hover:bg-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600 dark:border-slate-700 dark:hover:bg-slate-800"
          >
            <X size={20} />
          </button>
        </header>
        <div className="min-h-0 flex-1 overflow-auto p-3 sm:p-6">{visited && children}</div>
      </div>
    </dialog>,
    document.body
  );
}
