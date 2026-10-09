'use client';
import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import {
  ArrowDownAZ,
  ArrowUpZA,
  Filter,
  FilterX,
  Lock,
  Unlock,
  Search,
  Replace,
  Printer,
  Sigma,
  Calculator,
  Clock,
  Sparkles,
} from 'lucide-react';
import { sortSheet, replaceSheetText } from '@/lib/workbookOperations';
import type { FieldSheet, CellRange } from '@/lib/fieldWorkbook';
import SearchableSelect from './SearchableSelect';

export default function WorkbookTools({
  sheet,
  selection,
  onChange,
  onFind,
  onError,
}: {
  sheet: FieldSheet;
  selection: CellRange;
  onChange: (fn: (sheet: FieldSheet) => FieldSheet) => void;
  onFind: (r: number, c: number) => void;
  onError: (message: string) => void;
}) {
  const [find, setFind] = useState('');
  const [replace, setReplace] = useState('');
  const [matchCase, setMatchCase] = useState(false);
  const [printOpen, setPrintOpen] = useState(false);
  const printTrigger = useRef<HTMLButtonElement>(null);
  const printDialog = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!printOpen) return;
    printDialog.current?.focus();
    return () => printTrigger.current?.focus();
  }, [printOpen]);

  const freeze = (rows: number, cols: number) => {
    if (sheet.merges.some((m) => (m.r < rows && m.er >= rows) || (m.c < cols && m.ec >= cols))) {
      onError('Choose a freeze boundary outside merged cells.');
      return;
    }
    onChange((s) => ({ ...s, view: { ...s.view, freezeRows: rows, freezeColumns: cols } }));
  };

  const control =
    'inline-flex items-center gap-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-2.5 py-1 text-xs font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-750 transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-xs';
  const inputControl =
    'rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-2.5 py-1 text-xs text-slate-800 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500';

  const findNext = () => {
    if (!find) return;
    const start = selection.r * sheet.widths.length + selection.c;
    for (let n = 1; n <= sheet.cells.length * sheet.widths.length; n++) {
      const pos = (start + n) % (sheet.cells.length * sheet.widths.length),
        r = Math.floor(pos / sheet.widths.length),
        c = pos % sheet.widths.length;
      const value = sheet.cells[r][c];
      if (
        (matchCase ? value : value.toLowerCase()).includes(matchCase ? find : find.toLowerCase())
      ) {
        onFind(r, c);
        return;
      }
    }
    onError('No matching cells found.');
  };

  return (
    <div
      className="flex flex-wrap items-center gap-2 border-b border-slate-200 dark:border-slate-800 p-2 text-xs bg-slate-50/50 dark:bg-slate-900/50"
      aria-label="Sheet tools"
    >
      {/* Sort group */}
      <div className="flex items-center gap-1">
        <button
          type="button"
          className={control}
          title="Sort ascending"
          onClick={() =>
            onChange((s) => sortSheet(s, selection.c, false, (s.connection?.headerRow ?? 0) + 1))
          }
        >
          <ArrowDownAZ size={14} className="text-slate-500 dark:text-slate-400" />
          <span>Sort A–Z</span>
        </button>
        <button
          type="button"
          className={control}
          title="Sort descending"
          onClick={() =>
            onChange((s) => sortSheet(s, selection.c, true, (s.connection?.headerRow ?? 0) + 1))
          }
        >
          <ArrowUpZA size={14} className="text-slate-500 dark:text-slate-400" />
          <span>Sort Z–A</span>
        </button>
      </div>

      <div className="h-4 w-px bg-slate-200 dark:bg-slate-700" />

      {/* Filter group */}
      <div className="flex items-center gap-1.5">
        <div className="relative flex items-center">
          <Filter size={13} className="absolute left-2.5 text-slate-400 pointer-events-none" />
          <input
            className={`${inputControl} pl-8 w-44`}
            aria-label="Filter selected column"
            placeholder="Filter column..."
            value={sheet.view?.filterColumn === selection.c ? sheet.view?.filterText || '' : ''}
            onChange={(e) => {
              if (
                e.target.value &&
                sheet.merges.some((m) => m.er > (sheet.connection?.headerRow ?? 0))
              ) {
                onError('Unmerge data rows before filtering; merged headers can stay.');
                return;
              }
              onChange((s) => ({
                ...s,
                view: { ...s.view, filterColumn: selection.c, filterText: e.target.value },
              }));
            }}
          />
        </div>
        <button
          type="button"
          className={control}
          title="Clear filter"
          onClick={() => onChange((s) => ({ ...s, view: { ...s.view, filterText: '' } }))}
        >
          <FilterX size={13} className="text-slate-500 dark:text-slate-400" />
          <span>Clear filter</span>
        </button>
      </div>

      <div className="h-4 w-px bg-slate-200 dark:bg-slate-700" />

      {/* Freeze group */}
      <div className="flex items-center gap-1">
        <button
          type="button"
          className={control}
          onClick={() => freeze(selection.r, selection.c)}
          title="Freeze rows above and columns to left"
        >
          <Lock size={13} className="text-slate-500 dark:text-slate-400" />
          <span>Freeze above / left</span>
        </button>
        <button
          type="button"
          className={control}
          onClick={() => freeze(1, sheet.view?.freezeColumns || 0)}
        >
          <span>Freeze header</span>
        </button>
        <button
          type="button"
          className={control}
          onClick={() =>
            onChange((s) => ({ ...s, view: { ...s.view, freezeRows: 0, freezeColumns: 0 } }))
          }
          title="Unfreeze panes"
        >
          <Unlock size={13} className="text-slate-500 dark:text-slate-400" />
          <span>Unfreeze</span>
        </button>
      </div>

      <div className="h-4 w-px bg-slate-200 dark:bg-slate-700" />

      {/* Find & Replace group */}
      <div className="flex items-center gap-1.5 flex-wrap">
        <div className="relative flex items-center">
          <Search size={13} className="absolute left-2.5 text-slate-400 pointer-events-none" />
          <input
            aria-label="Find text"
            className={`${inputControl} pl-8 w-32`}
            placeholder="Find..."
            value={find}
            onChange={(e) => setFind(e.target.value)}
          />
        </div>
        <div className="relative flex items-center">
          <Replace size={13} className="absolute left-2.5 text-slate-400 pointer-events-none" />
          <input
            aria-label="Replacement text"
            className={`${inputControl} pl-8 w-36`}
            placeholder="Replace with..."
            value={replace}
            onChange={(e) => setReplace(e.target.value)}
          />
        </div>
        <label className="flex items-center gap-1.5 text-xs text-slate-600 dark:text-slate-300 cursor-pointer select-none px-1">
          <input
            type="checkbox"
            className="rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
            checked={matchCase}
            onChange={(e) => setMatchCase(e.target.checked)}
          />
          Match case
        </label>
        <button type="button" className={control} onClick={findNext}>
          Find next
        </button>
        <button
          type="button"
          className={control}
          disabled={!find}
          onClick={() =>
            onChange((s) => ({
              ...s,
              cells: s.cells.map((row, r) =>
                row.map((value, c) =>
                  r === selection.r && c === selection.c
                    ? replaceSheetText({ ...s, cells: [[value]] }, find, replace, matchCase)
                        .cells[0][0]
                    : value
                )
              ),
            }))
          }
        >
          Replace cell
        </button>
        <button
          type="button"
          className={control}
          disabled={!find}
          onClick={() => onChange((s) => replaceSheetText(s, find, replace, matchCase))}
        >
          Replace all
        </button>
      </div>

      <div className="h-4 w-px bg-slate-200 dark:bg-slate-700" />

      {/* Print */}
      <button
        ref={printTrigger}
        type="button"
        className={control}
        aria-haspopup="dialog"
        onClick={() => setPrintOpen(true)}
      >
        <Printer size={13} className="text-slate-500 dark:text-slate-400" />
        <span>Print setup</span>
      </button>

      {printOpen &&
        createPortal(
          <div
            className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/40 p-4"
            onClick={(event) => {
              if (event.target === event.currentTarget) setPrintOpen(false);
            }}
          >
            <div
              ref={printDialog}
              role="dialog"
              aria-modal="true"
              aria-labelledby="workbook-print-setup-title"
              tabIndex={-1}
              className="max-h-[calc(100dvh-2rem)] w-full max-w-sm space-y-3 overflow-y-auto rounded-xl border bg-white p-5 text-slate-900 shadow-xl dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
              onKeyDown={(event) => {
                if (event.key === 'Escape') {
                  event.stopPropagation();
                  setPrintOpen(false);
                }
                if (event.key === 'Tab') {
                  const items = Array.from(
                    event.currentTarget.querySelectorAll<HTMLElement>(
                      'button:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex="0"]'
                    )
                  ).filter((item) => item.getClientRects().length);
                  const first = items[0],
                    last = items[items.length - 1];
                  if (
                    event.shiftKey &&
                    (document.activeElement === first ||
                      document.activeElement === event.currentTarget)
                  ) {
                    event.preventDefault();
                    last?.focus();
                  } else if (!event.shiftKey && document.activeElement === last) {
                    event.preventDefault();
                    first?.focus();
                  }
                }
              }}
            >
              <div className="flex items-center justify-between gap-4">
                <h3 id="workbook-print-setup-title" className="font-semibold">
                  Print setup
                </h3>
                <button type="button" className={control} onClick={() => setPrintOpen(false)}>
                  Close
                </button>
              </div>
              <button
                type="button"
                className={control}
                onClick={() => onChange((s) => ({ ...s, print: { ...s.print, area: selection } }))}
              >
                Print selected area
              </button>
              <button
                type="button"
                className={control}
                onClick={() => onChange((s) => ({ ...s, print: { ...s.print, area: undefined } }))}
              >
                Print whole sheet
              </button>
              <SearchableSelect
                ariaLabel="Print orientation"
                value={sheet.print?.orientation || 'landscape'}
                options={[
                  { value: 'landscape', label: 'Landscape' },
                  { value: 'portrait', label: 'Portrait' },
                ]}
                onChange={(value) =>
                  onChange((s) => ({
                    ...s,
                    print: { ...s.print, orientation: value as 'portrait' | 'landscape' },
                  }))
                }
              />
              <SearchableSelect
                ariaLabel="Print scaling"
                value={sheet.print?.fit || 'width'}
                options={[
                  { value: 'width', label: 'Fit columns to page width' },
                  { value: 'actual', label: 'Actual column widths' },
                ]}
                onChange={(value) =>
                  onChange((s) => ({
                    ...s,
                    print: { ...s.print, fit: value as 'width' | 'actual' },
                  }))
                }
              />
              <label className="block">
                Repeat top rows{' '}
                <input
                  type="number"
                  min={0}
                  max={20}
                  value={sheet.print?.repeatRows || 0}
                  onChange={(e) =>
                    onChange((s) => ({
                      ...s,
                      print: {
                        ...s.print,
                        repeatRows: Math.max(0, Math.min(20, Number(e.target.value))),
                      },
                    }))
                  }
                />
              </label>
              <button
                type="button"
                className={control}
                onClick={() =>
                  onChange((s) => ({
                    ...s,
                    print: {
                      ...s.print,
                      breakRows: [
                        ...new Set([...(s.print?.breakRows || []), selection.r]),
                      ].sort((a, b) => a - b),
                    },
                  }))
                }
              >
                Page break before selected row
              </button>
              <button
                type="button"
                className={control}
                onClick={() => onChange((s) => ({ ...s, print: { ...s.print, breakRows: [] } }))}
              >
                Clear page breaks
              </button>
            </div>
          </div>,
          document.body
        )}

      <div className="h-4 w-px bg-slate-200 dark:bg-slate-700" />

      {/* Formulas Badge Group */}
      <div className="flex items-center gap-1.5 ml-auto text-slate-500 dark:text-slate-400 font-mono text-[11px]">
        <span
          className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-medium"
          title="Sum formula: =SUM(A2:A10)"
        >
          <Sigma size={12} className="text-emerald-600 dark:text-emerald-400" />
          <span>SUM</span>
        </span>
        <span
          className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-medium"
          title="Average formula: =AVERAGE(A2:A10)"
        >
          <Calculator size={12} className="text-blue-600 dark:text-blue-400" />
          <span>AVG</span>
        </span>
        <span
          className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-medium"
          title="Hours formula: =HOURS(B2,C2)"
        >
          <Clock size={12} className="text-amber-600 dark:text-amber-400" />
          <span>HRS</span>
        </span>
      </div>
    </div>
  );
}

