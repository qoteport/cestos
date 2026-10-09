'use client';
import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
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
  const [find, setFind] = useState(''),
    [replace, setReplace] = useState(''),
    [matchCase, setMatchCase] = useState(false);
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
  const control = 'rounded border px-2 py-1 text-xs';
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
      className="flex flex-wrap items-center gap-2 border-b p-2 text-xs"
      aria-label="Sheet tools"
    >
      <button
        type="button"
        className={control}
        onClick={() =>
          onChange((s) => sortSheet(s, selection.c, false, (s.connection?.headerRow ?? 0) + 1))
        }
      >
        Sort A–Z
      </button>
      <button
        type="button"
        className={control}
        onClick={() =>
          onChange((s) => sortSheet(s, selection.c, true, (s.connection?.headerRow ?? 0) + 1))
        }
      >
        Sort Z–A
      </button>
      <input
        className={control}
        aria-label="Filter selected column"
        placeholder="Filter selected column…"
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
      <button
        type="button"
        className={control}
        onClick={() => onChange((s) => ({ ...s, view: { ...s.view, filterText: '' } }))}
      >
        Clear filter
      </button>
      <button type="button" className={control} onClick={() => freeze(selection.r, selection.c)}>
        Freeze above / left
      </button>
      <button
        type="button"
        className={control}
        onClick={() => freeze(1, sheet.view?.freezeColumns || 0)}
      >
        Freeze header
      </button>
      <button
        type="button"
        className={control}
        onClick={() =>
          onChange((s) => ({ ...s, view: { ...s.view, freezeRows: 0, freezeColumns: 0 } }))
        }
      >
        Unfreeze
      </button>
      <input
        aria-label="Find text"
        className={control}
        placeholder="Find…"
        value={find}
        onChange={(e) => setFind(e.target.value)}
      />
      <input
        aria-label="Replacement text"
        className={control}
        placeholder="Replace with…"
        value={replace}
        onChange={(e) => setReplace(e.target.value)}
      />
      <label>
        <input
          type="checkbox"
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
      <button ref={printTrigger} type="button" className={control} aria-haspopup="dialog" onClick={() => setPrintOpen(true)}>Print setup</button>
      {printOpen && createPortal(
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/40 p-4" onClick={event => {if(event.target===event.currentTarget)setPrintOpen(false);}}>
        <div ref={printDialog} role="dialog" aria-modal="true" aria-labelledby="workbook-print-setup-title" tabIndex={-1}
          className="max-h-[calc(100dvh-2rem)] w-full max-w-sm space-y-3 overflow-y-auto rounded-xl border bg-white p-5 text-slate-900 shadow-xl dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
          onKeyDown={event => {
            if(event.key==='Escape'){event.stopPropagation();setPrintOpen(false);}
            if(event.key==='Tab'){
              const items=Array.from(event.currentTarget.querySelectorAll<HTMLElement>('button:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex="0"]')).filter(item=>item.getClientRects().length);
              const first=items[0],last=items[items.length-1];
              if(event.shiftKey&&(document.activeElement===first||document.activeElement===event.currentTarget)){event.preventDefault();last?.focus();}
              else if(!event.shiftKey&&document.activeElement===last){event.preventDefault();first?.focus();}
            }
          }}>
          <div className="flex items-center justify-between gap-4">
            <h3 id="workbook-print-setup-title" className="font-semibold">Print setup</h3>
            <button type="button" className={control} onClick={()=>setPrintOpen(false)}>Close</button>
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
              onChange((s) => ({ ...s, print: { ...s.print, fit: value as 'width' | 'actual' } }))
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
                  breakRows: [...new Set([...(s.print?.breakRows || []), selection.r])].sort(
                    (a, b) => a - b
                  ),
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
        </div>, document.body
      )}
      <span>Formulas: =SUM(A2:A10), =AVERAGE(A2:A10), =HOURS(B2,C2), =(C2-B2)*24</span>
    </div>
  );
}
