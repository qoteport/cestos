'use client';

import { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ArrowLeft,
  Bold,
  Italic,
  AlignLeft,
  AlignCenter,
  AlignRight,
  BetweenHorizontalStart,
  BetweenHorizontalEnd,
  BetweenVerticalStart,
  BetweenVerticalEnd,
  Rows2,
  Columns2,
  Minus,
  TableCellsMerge,
  TableCellsSplit,
  ClipboardCopy,
  Eraser,
  BookmarkPlus,
  Clock3,
  ChevronDown,
  ChevronUp,
  Download,
  FileSpreadsheet,
  Info,
  Plus,
  Redo2,
  Save,
  Undo2,
  Upload,
} from 'lucide-react';
import { apiFetch, apiFetchBlob, downloadBlob } from '@/lib/api';
import {
  changeDimension,
  cellFormat,
  formatCells,
  type CellFormat,
  columnName,
  copyWorkbook,
  exportWorkbook,
  importWorkbook,
  makeSheet,
  mergeCells,
  newWorkbook,
  overlaps,
  pasteCells,
  rangeBetween,
  suggestionsFor,
  validateWorkbook,
  workbookTemplates,
  type CellRange,
  type FieldSheet,
  type FieldWorkbook,
} from '@/lib/fieldWorkbook';
import { useFieldWorkbookHeader } from './FieldWorkbookDialog';

type Document = { id: string; title: string; tags: string[]; created_at: string };
type Point = { r: number; c: number };
const button =
  'inline-flex items-center justify-center gap-2 rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-40 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100 dark:hover:bg-slate-700';
const iconButton = `${button} h-10 w-10 shrink-0 !p-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600 focus-visible:ring-offset-2`;
const primary = `${button} !border-emerald-700 !bg-emerald-700 !text-white hover:!bg-emerald-800`;

const GridCell = memo(function GridCell({
  value,
  r,
  c,
  selected,
  active,
  merge,
  header,
  bold,
  italic,
  align,
  list,
  onValue,
  onSelect,
  onNavigate,
  onPaste,
}: {
  value: string;
  r: number;
  c: number;
  selected: boolean;
  active: boolean;
  merge?: CellRange;
  header: boolean;
  bold?: boolean;
  italic?: boolean;
  align?: CellFormat['align'];
  list?: string;
  onValue: (r: number, c: number, value: string) => void;
  onSelect: (r: number, c: number, extend: boolean) => void;
  onNavigate: (r: number, c: number, key: string, shift: boolean) => void;
  onPaste: (r: number, c: number, text: string) => void;
}) {
  return (
    <td
      data-grid-cell={`${r}:${c}`}
      rowSpan={merge ? merge.er - merge.r + 1 : 1}
      colSpan={merge ? merge.ec - merge.c + 1 : 1}
      className={`relative border border-slate-200 p-0 dark:border-slate-700 ${selected ? 'bg-emerald-50 dark:bg-emerald-950' : header ? 'bg-slate-100 dark:bg-slate-800' : 'bg-white dark:bg-slate-900'} ${active ? 'outline outline-2 -outline-offset-2 outline-emerald-600' : ''}`}
    >
      <input
        data-cell={`${r}:${c}`}
        aria-label={`${columnName(c)}${r + 1}`}
        aria-selected={selected}
        list={list}
        value={value}
        maxLength={32767}
        autoComplete="off"
        className={`h-full min-h-[32px] w-full min-w-0 bg-transparent px-2 py-1 text-sm text-slate-900 outline-none dark:text-slate-100 ${bold ? 'font-bold' : 'font-normal'} ${italic ? 'italic' : ''}`}
        style={{ textAlign: align }}
        title={value}
        onFocus={() => onSelect(r, c, false)}
        onMouseDown={(event) => {
          if (event.shiftKey) {
            event.preventDefault();
            onSelect(r, c, true);
          }
        }}
        onChange={(event) => onValue(r, c, event.target.value)}
        onKeyDown={(event) => {
          if (
            event.key === 'Tab' ||
            event.key === 'Enter' ||
            (event.shiftKey && event.key.startsWith('Arrow')) ||
            (event.altKey && event.key.startsWith('Arrow'))
          ) {
            event.preventDefault();
            onNavigate(r, c, event.key, event.shiftKey);
          }
        }}
        onPaste={(event) => {
          const text = event.clipboardData.getData('text/plain');
          if (text.includes('\t') || text.includes('\n')) {
            event.preventDefault();
            onPaste(r, c, text);
          }
        }}
      />
    </td>
  );
});

export default function FieldWorkbookWorkspace({
  projects,
  assets,
  employees,
  sites,
  storageScope,
}: {
  projects: any[];
  assets: any[];
  employees: any[];
  sites: any[];
  storageScope: string;
}) {
  const [book, setBook] = useState<FieldWorkbook | null>(null);
  const [sheetIndex, setSheetIndex] = useState(0);
  const dragSelection = useRef<{ kind: 'cell' | 'row' | 'column'; start: Point } | null>(null);
  const [anchor, setAnchor] = useState<Point>({ r: 0, c: 0 });
  const [end, setEnd] = useState<Point>({ r: 0, c: 0 });
  const [dirty, setDirty] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [documents, setDocuments] = useState<Document[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [undo, setUndo] = useState<FieldWorkbook[]>([]);
  const [redo, setRedo] = useState<FieldWorkbook[]>([]);
  const [templatePicker, setTemplatePicker] = useState(false);
  const [templateName, setTemplateName] = useState('');
  const [sheetName, setSheetName] = useState('');
  const [width, setWidth] = useState(160);
  const [height, setHeight] = useState(34);
  const [showHistory, setShowHistory] = useState(false);
  const [showToolbar, setShowToolbar] = useState(true);
  const [showFormulaBar, setShowFormulaBar] = useState(true);
  const [showSelectionInfo, setShowSelectionInfo] = useState(false);
  const bookRef = useRef(book);
  bookRef.current = book;
  const sheetRef = useRef(sheetIndex);
  sheetRef.current = sheetIndex;
  const lastEdit = useRef('');
  const endRef = useRef(end);
  endRef.current = end;
  const resizeCleanup = useRef<() => void>(() => {});
  useEffect(() => () => resizeCleanup.current(), []);
  const gridRef = useRef<HTMLDivElement>(null);
  const storageKey = `cestos-field-workbook:${storageScope}`;
  const sheet = book?.sheets[sheetIndex];
  const selection = rangeBetween(anchor, end);

  const headerContext = useFieldWorkbookHeader();
  const setHeaderState = headerContext?.setHeaderState;

  const loadLibrary = useCallback(async () => {
    setLoading(true);
    try {
      const all: Document[] = [];
      let page = 1;
      while (true) {
        const result = await apiFetch<{ items: Document[]; total: number }>(
          `/api/v1/documents?view=all&category=Field%20Workbooks&page_size=100&page=${page}`,
          {},
          true,
          { bypassMemoryRead: true }
        );
        all.push(...result.items);
        if (all.length >= result.total || !result.items.length) break;
        page++;
      }
      setDocuments(all);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not load saved workbooks.');
    } finally {
      setLoading(false);
    }
  }, []);
  useEffect(() => {
    void loadLibrary();
  }, [loadLibrary]);
  useEffect(() => {
    try {
      const raw = localStorage.getItem(storageKey);
      if (raw) {
        setBook(validateWorkbook(JSON.parse(raw)));
        setDirty(true);
        setNotice('Recovered your unsaved workbook from this browser.');
      }
    } catch {
      setError(
        'A previous draft could not be restored. Saved workbooks are still available below.'
      );
    }
  }, [storageKey]);
  useEffect(() => {
    if (!dirty || !book) return;
    try {
      localStorage.setItem(storageKey, JSON.stringify(book));
    } catch {
      setError(
        'The browser could not keep a recovery draft. Save your workbook to keep your changes.'
      );
    }
  }, [book, dirty, storageKey]);
  useEffect(() => {
    if (!dirty) return;
    const guard = (event: BeforeUnloadEvent) => {
      event.preventDefault();
    };
    window.addEventListener('beforeunload', guard);
    return () => window.removeEventListener('beforeunload', guard);
  }, [dirty]);
  useEffect(() => {
    setSheetName(sheet?.name || '');
  }, [sheet?.id, sheet?.name]);
  useEffect(() => {
    if (sheet) {
      setWidth(sheet.widths[anchor.c] || 160);
      setHeight(sheet.heights[anchor.r] || 34);
    }
  }, [sheet, anchor]);

  const latest = useMemo(() => {
    const seen = new Set<string>();
    return documents.filter((doc) => {
      const key = doc.tags.find((t) => t.startsWith('wb-')) || doc.id;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }, [documents]);
  const commit = useCallback((next: FieldWorkbook, key = '') => {
    const previous = bookRef.current;
    if (!previous) return;
    if (!key || lastEdit.current !== key) setUndo((history) => [...history.slice(-29), previous]);
    lastEdit.current = key;
    setRedo([]);
    bookRef.current = next;
    setBook(next);
    setDirty(true);
    setError('');
    setNotice('');
  }, []);
  const changeSheet = useCallback(
    (transform: (sheet: FieldSheet) => FieldSheet, key = '') => {
      const current = bookRef.current;
      if (!current) return;
      try {
        const next = {
          ...current,
          sheets: current.sheets.map((s, i) => (i === sheetRef.current ? transform(s) : s)),
        };
        commit(next, key);
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Could not update the sheet.');
      }
    },
    [commit]
  );
  const onValue = useCallback(
    (r: number, c: number, value: string) =>
      changeSheet(
        (s) => ({
          ...s,
          cells: s.cells.map((row, i) =>
            i === r ? row.map((cell, j) => (j === c ? value : cell)) : row
          ),
        }),
        `cell:${sheetRef.current}:${r}:${c}`
      ),
    [changeSheet]
  );
  function beginSelection(event: React.PointerEvent) {
    if (event.button !== 0 || event.pointerType === 'touch') return;
    const target = event.target as HTMLElement;
    const cell = target.closest<HTMLElement>('[data-grid-cell]');
    const row = target.closest<HTMLElement>('[data-grid-row]');
    const column = target.closest<HTMLElement>('[data-grid-column]');
    if (!cell && !row && !column) return;
    const current = bookRef.current?.sheets[sheetRef.current];
    if (!current) return;
    const kind = row ? 'row' : column ? 'column' : 'cell';
    const point = row
      ? { r: Number(row.dataset.gridRow), c: 0 }
      : column
        ? { r: 0, c: Number(column.dataset.gridColumn) }
        : (() => {
            const [r, c] = cell!.dataset.gridCell!.split(':').map(Number);
            return { r, c };
          })();
    selectionCleanup.current();
    const base = event.shiftKey ? anchor : point;
    const start =
      kind === 'row' ? { r: base.r, c: 0 } : kind === 'column' ? { r: 0, c: base.c } : base;
    dragSelection.current = { kind, start };
    if (event.shiftKey || kind !== 'cell') event.preventDefault();
    setAnchor(start);
    setEnd(
      kind === 'row'
        ? { r: point.r, c: current.widths.length - 1 }
        : kind === 'column'
          ? { r: current.cells.length - 1, c: point.c }
          : point
    );
    const move = (e: PointerEvent) => {
      const hit = document.elementFromPoint(e.clientX, e.clientY) as HTMLElement | null;
      const hitCell = hit?.closest<HTMLElement>('[data-grid-cell]');
      const hitRow = hit?.closest<HTMLElement>('[data-grid-row]');
      const hitColumn = hit?.closest<HTMLElement>('[data-grid-column]');
      let next: Point | undefined;
      if (hitCell) {
        const [r, c] = hitCell.dataset.gridCell!.split(':').map(Number);
        next = { r, c };
      } else if (hitRow) next = { r: Number(hitRow.dataset.gridRow), c: 0 };
      else if (hitColumn) next = { r: 0, c: Number(hitColumn.dataset.gridColumn) };
      if (!next) return;
      if (next.r !== point.r || next.c !== point.c) {
        e.preventDefault();
        window.getSelection()?.removeAllRanges();
      }
      setEnd(
        kind === 'row'
          ? { r: next.r, c: current.widths.length - 1 }
          : kind === 'column'
            ? { r: current.cells.length - 1, c: next.c }
            : next
      );
    };
    const finish = () => {
      dragSelection.current = null;
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerup', finish);
      window.removeEventListener('pointercancel', finish);
    };
    selectionCleanup.current = finish;
    window.addEventListener('pointermove', move, { passive: false });
    window.addEventListener('pointerup', finish);
    window.addEventListener('pointercancel', finish);
  }
  const selectionCleanup = useRef<() => void>(() => {});
  useEffect(() => () => selectionCleanup.current(), []);
  const onSelect = useCallback((r: number, c: number, extend: boolean) => {
    if (dragSelection.current) return;
    if (!extend) setAnchor({ r, c });
    setEnd({ r, c });
  }, []);
  const focus = useCallback((r: number, c: number) => {
    requestAnimationFrame(() =>
      gridRef.current?.querySelector<HTMLInputElement>(`[data-cell="${r}:${c}"]`)?.focus()
    );
  }, []);
  const onNavigate = useCallback(
    (r: number, c: number, key: string, shift: boolean) => {
      const s = bookRef.current?.sheets[sheetRef.current];
      if (!s) return;
      if (shift && key.startsWith('Arrow')) {
        r = endRef.current.r;
        c = endRef.current.c;
      }
      const merged = s.merges.find((m) => r >= m.r && r <= m.er && c >= m.c && c <= m.ec);
      if (key === 'Tab') c = shift ? c - 1 : (merged?.ec ?? c) + 1;
      else if (key === 'ArrowRight') c = (merged?.ec ?? c) + 1;
      else if (key === 'ArrowLeft') c--;
      else if (key === 'ArrowUp') r--;
      else r = shift && key === 'Enter' ? r - 1 : (merged?.er ?? r) + 1;
      if (key === 'Tab') {
        if (c >= s.widths.length) {
          c = 0;
          r++;
        } else if (c < 0) {
          c = s.widths.length - 1;
          r--;
        }
      }
      r = Math.max(0, Math.min(s.cells.length - 1, r));
      c = Math.max(0, Math.min(s.widths.length - 1, c));
      const target = s.merges.find((m) => r >= m.r && r <= m.er && c >= m.c && c <= m.ec);
      if (target) {
        r = target.r;
        c = target.c;
      }
      if (shift && key.startsWith('Arrow')) setEnd({ r, c });
      else focus(r, c);
    },
    [focus]
  );
  const onPaste = useCallback(
    async (r: number, c: number, text: string) => {
      const targetSheet = bookRef.current?.sheets[sheetRef.current]?.id;
      try {
        const XLSX = await import('xlsx');
        const parsed = XLSX.read(text, { type: 'string', FS: '\t', raw: true });
        const values = XLSX.utils.sheet_to_json<string[]>(parsed.Sheets[parsed.SheetNames[0]], {
          header: 1,
          raw: false,
          defval: '',
        });
        if (bookRef.current?.sheets[sheetRef.current]?.id !== targetSheet) return;
        changeSheet((s) => pasteCells(s, r, c, values));
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Could not paste this table.');
      }
    },
    [changeSheet]
  );
  const suggestions = useMemo(
    () =>
      sheet?.widths.map((_, c) =>
        suggestionsFor(sheet.cells[0][c] || '', projects, assets, employees, sites)
      ) || [],
    [sheet?.cells[0], sheet?.widths, projects, assets, employees, sites]
  );
  const mergeLookup = useMemo(() => {
    const map = new Map<string, CellRange>();
    for (const m of sheet?.merges || [])
      for (let r = m.r; r <= m.er; r++) for (let c = m.c; c <= m.ec; c++) map.set(`${r}:${c}`, m);
    return map;
  }, [sheet?.merges]);
  function resize(axis: 'row' | 'column', index: number, event: React.PointerEvent) {
    event.preventDefault();
    event.stopPropagation();
    if (!sheet) return;
    resizeCleanup.current();
    const start = axis === 'row' ? event.clientY : event.clientX;
    const original = axis === 'row' ? sheet.heights[index] : sheet.widths[index];
    let size = original;
    const element =
      axis === 'row'
        ? gridRef.current?.querySelectorAll('tbody tr')[index]
        : gridRef.current?.querySelectorAll('col')[index + 1];
    const move = (e: PointerEvent) => {
      size = Math.max(
        axis === 'row' ? 26 : 60,
        Math.min(
          axis === 'row' ? 300 : 600,
          original + (axis === 'row' ? e.clientY : e.clientX) - start
        )
      );
      if (element instanceof HTMLElement)
        element.style[axis === 'row' ? 'height' : 'width'] = `${size}px`;
    };
    const cleanup = () => {
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerup', up);
      window.removeEventListener('pointercancel', cancel);
    };
    const up = () => {
      cleanup();
      if (size !== original)
        changeSheet((s) =>
          axis === 'row'
            ? { ...s, heights: s.heights.map((v, i) => (i === index ? size : v)) }
            : { ...s, widths: s.widths.map((v, i) => (i === index ? size : v)) }
        );
    };
    const cancel = () => {
      cleanup();
      if (element instanceof HTMLElement)
        element.style[axis === 'row' ? 'height' : 'width'] = `${original}px`;
    };
    resizeCleanup.current = cancel;
    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', up);
    window.addEventListener('pointercancel', cancel);
  }
  function selectionText() {
    return (
      sheet?.cells
        .slice(selection.r, selection.er + 1)
        .map((row) =>
          row
            .slice(selection.c, selection.ec + 1)
            .map((value) => (/[\t\n\r"]/.test(value) ? `"${value.replaceAll('"', '""')}"` : value))
            .join('\t')
        )
        .join('\n') || ''
    );
  }
  function activate(next: FieldWorkbook, isDirty: boolean) {
    try {
      localStorage.removeItem(storageKey);
    } catch {}
    setBook(next);
    bookRef.current = next;
    setSheetIndex(0);
    setAnchor({ r: 0, c: 0 });
    setEnd({ r: 0, c: 0 });
    setUndo([]);
    setRedo([]);
    lastEdit.current = '';
    setDirty(isDirty);
    setTemplatePicker(false);
    setShowHistory(false);
    setError('');
    setNotice('');
  }
  function leave() {
    if (dirty && !window.confirm('Leave this workbook and discard unsaved changes?')) return;
    localStorage.removeItem(storageKey);
    setBook(null);
    setDirty(false);
    setError('');
    setNotice('');
  }
  async function openDocument(doc: Document, asTemplate = false) {
    setBusy(true);
    setError('');
    try {
      const blob = await apiFetchBlob(`/api/v1/documents/${doc.id}/download`);
      const source = validateWorkbook(JSON.parse(await blob.text()));
      const next = asTemplate ? copyWorkbook(source) : source;
      if (asTemplate) next.name = source.name.replace(/ template$/i, '');
      activate(next, asTemplate);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not open workbook.');
    } finally {
      setBusy(false);
    }
  }
  async function save(asTemplate = false) {
    if (!book) return;
    if (!book.name.trim()) {
      setError('Give your workbook a name.');
      return;
    }
    setBusy(true);
    setError('');
    try {
      const saved = asTemplate
        ? { ...copyWorkbook(book, true), name: templateName.trim() || `${book.name} template` }
        : book;
      validateWorkbook(saved);
      const form = new FormData();
      form.append(
        'file',
        new File([JSON.stringify(saved)], `${saved.id}.cestos.json`, { type: 'application/json' })
      );
      form.append('title', saved.name.slice(0, 250));
      form.append('category', 'Field Workbooks');
      form.append(
        'tags',
        `wb-${saved.id},${saved.template ? 'workbook-template' : 'field-workbook'}`
      );
      form.append('visibility', 'PRIVATE');
      await apiFetch('/api/v1/documents', { method: 'POST', body: form }, true, {
        queueWhenOffline: false,
      });
      if (!asTemplate) {
        setDirty(false);
        lastEdit.current = '';
        localStorage.removeItem(storageKey);
      }
      setTemplatePicker(false);
      setNotice(
        asTemplate
          ? 'Template saved. Reuse it from the workbook library.'
          : 'Workbook saved. Previous saved versions remain available in History.'
      );
      await loadLibrary();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not save workbook.');
    } finally {
      setBusy(false);
    }
  }
  function undoRedo(forward: boolean) {
    const stack = forward ? redo : undo;
    if (!book || !stack.length) return;
    const next = stack[stack.length - 1];
    if (forward) {
      setRedo(stack.slice(0, -1));
      setUndo([...undo, book]);
    } else {
      setUndo(stack.slice(0, -1));
      setRedo([...redo, book]);
    }
    setBook(next);
    bookRef.current = next;
    setSheetIndex(Math.min(sheetIndex, next.sheets.length - 1));
    setAnchor({ r: 0, c: 0 });
    setEnd({ r: 0, c: 0 });
    setDirty(true);
    lastEdit.current = '';
  }
  function dimension(axis: 'row' | 'column', remove: boolean, after = false) {
    changeSheet((s) => {
      const start = axis === 'row' ? selection.r : selection.c;
      const end = axis === 'row' ? selection.er : selection.ec;
      if (!remove) return changeDimension(s, axis, after ? end + 1 : start, false);
      if (end - start + 1 >= (axis === 'row' ? s.cells.length : s.widths.length))
        throw new Error('Keep at least one row and one column.');
      let next = s;
      for (let index = end; index >= start; index--)
        next = changeDimension(next, axis, index, true);
      return next;
    });
    setAnchor({ r: 0, c: 0 });
    setEnd({ r: 0, c: 0 });
  }
  function renameSheet() {
    const name = sheetName.trim();
    if (!book || !sheet) return;
    if (
      !name ||
      name.length > 31 ||
      /[\\/?*\[\]:]/.test(name) ||
      book.sheets.some((s) => s.id !== sheet.id && s.name.toLowerCase() === name.toLowerCase())
    ) {
      setError('Use a unique sheet name of 1–31 characters without \\ / ? * [ ] :');
      setSheetName(sheet.name);
      return;
    }
    if (name !== sheet.name) changeSheet((s) => ({ ...s, name }));
  }
  async function readFile(file?: File) {
    if (!file) return;
    setBusy(true);
    setError('');
    try {
      activate(await importWorkbook(file), true);
      setNotice(
        'Imported all worksheets. Formula cells use saved values; advanced Excel formatting is not imported.'
      );
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not import workbook.');
    } finally {
      setBusy(false);
    }
  }
  async function download() {
    if (!book) return;
    setBusy(true);
    try {
      downloadBlob(await exportWorkbook(book), `${book.name.replace(/[\\/:*?"<>|]/g, '-')}.xlsx`);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Export failed.');
    } finally {
      setBusy(false);
    }
  }
  useEffect(() => {
    if (!setHeaderState) return;
    if (book) {
      setHeaderState({
        book,
        dirty,
        busy,
        onLeave: leave,
        onRename: (newName: string) => commit({ ...book, name: newName }, 'name'),
        onDownload: () => void download(),
        onSave: () => void save(),
      });
    } else {
      setHeaderState(null);
    }
  }, [book, dirty, busy, setHeaderState, leave, commit, download, save]);

  const feedback = (
    <>
      {error && (
        <p
          role="alert"
          className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800"
        >
          {error}
        </p>
      )}
      {notice && (
        <p
          role="status"
          className="rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-900"
        >
          {notice}
        </p>
      )}
    </>
  );
  if (!book || !sheet)
    return (
      <section className="space-y-6 rounded-2xl border bg-white p-5 dark:border-slate-700 dark:bg-slate-900">
        <header className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-xs font-bold uppercase tracking-widest text-emerald-700">
              Field Admin
            </p>
            <h2 className="mt-1 text-2xl font-bold">Workbooks</h2>
            <p className="mt-1 text-sm text-slate-500">
              Simple tables for field work. Start with a template, a blank file or your existing
              spreadsheet.
            </p>
          </div>
          <div className="flex gap-2">
            <button
              className={primary}
              disabled={busy}
              onClick={() => activate(newWorkbook(), true)}
            >
              <Plus size={16} />
              New workbook
            </button>
            <label className={`${button} cursor-pointer`}>
              <Upload size={16} />
              Import Excel / CSV
              <input
                aria-label="Import Excel or CSV workbook"
                className="hidden"
                type="file"
                accept=".xlsx,.xls,.csv"
                disabled={busy}
                onChange={(e) => {
                  void readFile(e.target.files?.[0]);
                  e.target.value = '';
                }}
              />
            </label>
          </div>
        </header>
        {feedback}
        {busy && <p role="status">Opening workbook…</p>}
        <div>
          <h3 className="mb-3 font-semibold">Ready-to-use templates</h3>
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {workbookTemplates.map((template, index) => (
              <button
                key={template.name}
                disabled={busy}
                onClick={() => activate(newWorkbook(index), true)}
                className="rounded-xl border border-slate-200 p-4 text-left transition hover:border-emerald-500 hover:bg-emerald-50 dark:border-slate-700 dark:hover:bg-emerald-950"
              >
                <FileSpreadsheet className="mb-3 text-emerald-700" size={22} />
                <p className="text-sm font-bold">{template.name}</p>
                <p className="mt-1 text-xs text-slate-500">{template.description}</p>
                <span className="mt-3 block text-xs font-medium text-emerald-700">
                  {template.sheets.length} {template.sheets.length === 1 ? 'sheet' : 'sheets'} · Use
                  template →
                </span>
              </button>
            ))}
          </div>
        </div>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h3 className="font-semibold">Saved workbooks & templates</h3>
          <input
            aria-label="Search workbooks"
            placeholder="Search saved files…"
            className="input-field"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <button className={button} disabled={loading} onClick={() => void loadLibrary()}>
            Refresh
          </button>
        </div>
        <p className="text-xs text-slate-500">
          Saved privately in your document library. Each save keeps a new version. Workbook data
          stays in these sheets; it does not create maintenance records.
        </p>
        {loading ? (
          <p role="status">Loading saved files…</p>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {latest
              .filter((d) => d.title.toLowerCase().includes(search.toLowerCase()))
              .map((doc) => (
                <div key={doc.id} className="rounded-xl border p-4">
                  <p className="font-semibold">{doc.title}</p>
                  <p className="my-2 text-xs text-slate-500">
                    {doc.tags.includes('workbook-template') ? 'Template' : 'Workbook'} ·{' '}
                    {new Date(doc.created_at).toLocaleString()}
                  </p>
                  <button
                    disabled={busy}
                    className={button}
                    onClick={() => void openDocument(doc, doc.tags.includes('workbook-template'))}
                  >
                    {doc.tags.includes('workbook-template') ? 'Use template' : 'Open workbook'}
                  </button>
                </div>
              ))}
            {!latest.length && (
              <p className="text-sm text-slate-500">
                Your saved workbooks and templates will appear here.
              </p>
            )}
          </div>
        )}
      </section>
    );

  return (
    <section
      className="min-w-0 max-w-full space-y-3"
      onKeyDown={(event) => {
        if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 's') {
          event.preventDefault();
          if (!busy) void save();
        }
        if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'z') {
          event.preventDefault();
          if (!busy) undoRedo(event.shiftKey);
        }
      }}
    >

      {feedback}
      <fieldset disabled={busy} className="min-w-0 space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 pb-2 dark:border-slate-800">
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              className={`inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1 text-xs font-semibold transition-colors ${
                showToolbar
                  ? 'bg-slate-100 border-slate-300 text-slate-800 dark:bg-slate-800 dark:border-slate-700 dark:text-slate-100'
                  : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50 dark:bg-slate-900 dark:border-slate-800 dark:text-slate-400'
              }`}
              onClick={() => setShowToolbar(!showToolbar)}
            >
              {showToolbar ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
              <span>Toolbar</span>
            </button>
            <button
              type="button"
              className={`inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1 text-xs font-semibold transition-colors ${
                showFormulaBar
                  ? 'bg-slate-100 border-slate-300 text-slate-800 dark:bg-slate-800 dark:border-slate-700 dark:text-slate-100'
                  : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50 dark:bg-slate-900 dark:border-slate-800 dark:text-slate-400'
              }`}
              onClick={() => setShowFormulaBar(!showFormulaBar)}
            >
              {showFormulaBar ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
              <span>Cell value</span>
            </button>
            <button
              type="button"
              className={`inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1 text-xs font-semibold transition-colors ${
                showSelectionInfo
                  ? 'bg-emerald-50 border-emerald-300 text-emerald-800 dark:bg-emerald-950 dark:border-emerald-800 dark:text-emerald-200'
                  : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50 dark:bg-slate-900 dark:border-slate-800 dark:text-slate-400'
              }`}
              onClick={() => setShowSelectionInfo(!showSelectionInfo)}
            >
              <Info size={14} />
              <span>Selection details ({columnName(selection.c)}{selection.r + 1})</span>
              {showSelectionInfo ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
            </button>
          </div>
        </div>

        {showToolbar && (
          <div className="flex flex-wrap items-center gap-2">
            <div
              className="flex items-center gap-1 rounded-xl border bg-white p-2 dark:border-slate-700 dark:bg-slate-900"
              role="group"
              aria-label="Text formatting"
            >
              {[
                {
                  label: 'Bold',
                  Icon: Bold,
                  active: Boolean(cellFormat(sheet, anchor.r, anchor.c).bold),
                  format: { bold: !cellFormat(sheet, anchor.r, anchor.c).bold },
                },
                {
                  label: 'Italic',
                  Icon: Italic,
                  active: Boolean(cellFormat(sheet, anchor.r, anchor.c).italic),
                  format: { italic: !cellFormat(sheet, anchor.r, anchor.c).italic },
                },
                ...(
                  [
                    { label: 'Align left', Icon: AlignLeft, value: 'left' },
                    { label: 'Align centre', Icon: AlignCenter, value: 'center' },
                    { label: 'Align right', Icon: AlignRight, value: 'right' },
                  ] as const
                ).map((item) => ({
                  ...item,
                  active: cellFormat(sheet, anchor.r, anchor.c).align === item.value,
                  format: { align: item.value },
                })),
              ].map(({ label, Icon, active, format }) => (
                <button
                  key={label}
                  type="button"
                  title={label}
                  aria-label={label}
                  aria-pressed={active}
                  className={`${iconButton} ${active ? '!border-emerald-600 !bg-emerald-50 !text-emerald-800 dark:!bg-emerald-950 dark:!text-emerald-200' : ''}`}
                  onClick={() => changeSheet((s) => formatCells(s, selection, format))}
                >
                  <Icon size={18} aria-hidden="true" />
                </button>
              ))}
            </div>
            <div className="flex flex-wrap items-center gap-2 rounded-xl border bg-white p-2 dark:border-slate-700 dark:bg-slate-900">
              <button
                className={button}
                disabled={!undo.length}
                aria-label="Undo"
                onClick={() => undoRedo(false)}
              >
                <Undo2 size={16} />
              </button>
              <button
                className={button}
                disabled={!redo.length}
                aria-label="Redo"
                onClick={() => undoRedo(true)}
              >
                <Redo2 size={16} />
              </button>
              <button
                type="button"
                title="Insert row above"
                aria-label="Insert row above"
                className={iconButton}
                onClick={() => dimension('row', false)}
              >
                <BetweenHorizontalStart size={18} aria-hidden="true" />
              </button>
              <button
                type="button"
                title="Add row below"
                aria-label="Add row below"
                className={iconButton}
                onClick={() => dimension('row', false, true)}
              >
                <BetweenHorizontalEnd size={18} aria-hidden="true" />
              </button>
              <button
                type="button"
                title="Insert column left"
                aria-label="Insert column left"
                className={iconButton}
                onClick={() => dimension('column', false)}
              >
                <BetweenVerticalStart size={18} aria-hidden="true" />
              </button>
              <button
                type="button"
                title="Add column right"
                aria-label="Add column right"
                className={iconButton}
                onClick={() => dimension('column', false, true)}
              >
                <BetweenVerticalEnd size={18} aria-hidden="true" />
              </button>
              <button
                type="button"
                title="Delete row"
                aria-label="Delete row"
                className={iconButton}
                onClick={() => {
                  if (window.confirm('Delete the selected rows and their contents?'))
                    dimension('row', true);
                }}
              >
                <span className="relative" aria-hidden="true">
                  <Rows2 size={18} />
                  <Minus
                    size={10}
                    strokeWidth={3}
                    className="absolute -bottom-1 -right-1 rounded-full bg-white text-red-600 dark:bg-slate-800"
                  />
                </span>
              </button>
              <button
                type="button"
                title="Delete column"
                aria-label="Delete column"
                className={iconButton}
                onClick={() => {
                  if (window.confirm('Delete the selected columns and their contents?'))
                    dimension('column', true);
                }}
              >
                <span className="relative" aria-hidden="true">
                  <Columns2 size={18} />
                  <Minus
                    size={10}
                    strokeWidth={3}
                    className="absolute -bottom-1 -right-1 rounded-full bg-white text-red-600 dark:bg-slate-800"
                  />
                </span>
              </button>
              <button
                type="button"
                title="Merge selection"
                aria-label="Merge selection"
                className={iconButton}
                onClick={() =>
                  changeSheet((s) => {
                    const next = mergeCells(s, selection);
                    setAnchor({ r: selection.r, c: selection.c });
                    setEnd({ r: selection.r, c: selection.c });
                    return next;
                  })
                }
              >
                <TableCellsMerge size={18} aria-hidden="true" />
              </button>
              <button
                type="button"
                title="Unmerge"
                aria-label="Unmerge"
                className={iconButton}
                onClick={() =>
                  changeSheet((s) => ({
                    ...s,
                    merges: s.merges.filter((m) => !overlaps(m, selection)),
                  }))
                }
              >
                <TableCellsSplit size={18} aria-hidden="true" />
              </button>
              <button
                type="button"
                title="Copy selection"
                aria-label="Copy selection"
                className={iconButton}
                onClick={() => {
                  void navigator.clipboard
                    .writeText(selectionText())
                    .then(() => setNotice('Selection copied.'))
                    .catch(() =>
                      setError('Clipboard access is unavailable. Use Ctrl+C on a selected range.')
                    );
                }}
              >
                <ClipboardCopy size={18} aria-hidden="true" />
              </button>
              <button
                type="button"
                title="Clear selection"
                aria-label="Clear selection"
                className={iconButton}
                onClick={() =>
                  changeSheet((s) => ({
                    ...s,
                    cells: s.cells.map((row, r) =>
                      row.map((cell, c) =>
                        r >= selection.r &&
                        r <= selection.er &&
                        c >= selection.c &&
                        c <= selection.ec
                          ? ''
                          : cell
                      )
                    ),
                  }))
                }
              >
                <Eraser size={18} aria-hidden="true" />
              </button>
              <button
                type="button"
                title="Save as template"
                aria-label="Save as template"
                className={iconButton}
                onClick={() => {
                  setTemplateName(`${book.name} template`);
                  setTemplatePicker(!templatePicker);
                }}
              >
                <BookmarkPlus size={18} aria-hidden="true" />
              </button>
              <button
                type="button"
                title="History"
                aria-label="History"
                className={iconButton}
                onClick={() => setShowHistory(!showHistory)}
              >
                <Clock3 size={18} aria-hidden="true" />
              </button>
            </div>
          </div>
        )}
        {templatePicker && (
          <div className="flex flex-wrap items-center gap-3 rounded-xl border bg-white p-4 dark:bg-slate-900">
            <input
              className="input-field"
              aria-label="Template name"
              value={templateName}
              maxLength={250}
              onChange={(e) => setTemplateName(e.target.value)}
            />
            <p className="text-xs text-slate-500">
              Includes all sheets, values and layout. Clear example data first if needed.
            </p>
            <button className={primary} onClick={() => void save(true)}>
              Save template
            </button>
            <button className={button} onClick={() => setTemplatePicker(false)}>
              Cancel
            </button>
          </div>
        )}
        {showHistory && (
          <div className="max-h-48 space-y-2 overflow-auto rounded-xl border bg-white p-3 dark:bg-slate-900">
            <p className="text-sm font-semibold">Saved versions</p>
            {documents
              .filter((d) => d.tags.includes(`wb-${book.id}`))
              .map((doc) => (
                <button
                  key={doc.id}
                  className={`${button} mr-2`}
                  onClick={() => {
                    if (
                      !dirty ||
                      window.confirm('Open this saved version and discard unsaved changes?')
                    )
                      void openDocument(doc);
                  }}
                >
                  {new Date(doc.created_at).toLocaleString()}
                </button>
              ))}
            {!documents.some((d) => d.tags.includes(`wb-${book.id}`)) && (
              <p className="text-xs text-slate-500">Save this workbook to start its history.</p>
            )}
          </div>
        )}
        {showSelectionInfo && (
          <div className="flex flex-wrap items-center gap-3 rounded-lg border bg-slate-50 p-2.5 text-xs dark:bg-slate-800/50">
            <span className="rounded border bg-white px-3 py-2 font-mono dark:bg-slate-900">
              {columnName(selection.c)}
              {selection.r + 1}
              {selection.er !== selection.r || selection.ec !== selection.c
                ? `:${columnName(selection.ec)}${selection.er + 1}`
                : ''}
            </span>
            <label>
              Column width{' '}
              <input
                aria-label="Column width"
                type="number"
                min={60}
                max={600}
                value={width}
                className="ml-1 w-20 rounded border p-1 dark:bg-slate-900"
                onChange={(e) => setWidth(Number(e.target.value))}
                onBlur={() => {
                  const size = Math.max(60, Math.min(600, width || 160));
                  changeSheet((s) => ({
                    ...s,
                    widths: s.widths.map((w, c) =>
                      c >= selection.c && c <= selection.ec ? size : w
                    ),
                  }));
                }}
              />
            </label>
            <label>
              Row height{' '}
              <input
                aria-label="Row height"
                type="number"
                min={26}
                max={300}
                value={height}
                className="ml-1 w-20 rounded border p-1 dark:bg-slate-900"
                onChange={(e) => setHeight(Number(e.target.value))}
                onBlur={() => {
                  const size = Math.max(26, Math.min(300, height || 34));
                  changeSheet((s) => ({
                    ...s,
                    heights: s.heights.map((h, r) =>
                      r >= selection.r && r <= selection.er ? size : h
                    ),
                  }));
                }}
              />
            </label>
            <p className="text-slate-500">
              Drag across cells or row/column headings to select · Shift-click to extend · Tab / Enter
              to move · Alt + arrows to navigate · Paste tables from Excel
            </p>
          </div>
        )}
        {showFormulaBar && (
          <div className="flex items-start gap-3 rounded-lg border bg-white px-3 py-2 dark:bg-slate-900">
            <label
              htmlFor="workbook-cell-value"
              className="shrink-0 whitespace-nowrap py-1 text-sm font-semibold leading-6 text-slate-500"
            >
              Cell value
            </label>
            <textarea
              id="workbook-cell-value"
              rows={1}
              aria-label="Selected cell value"
              className="block min-h-8 min-w-0 flex-1 resize-y border-0 bg-transparent px-0 py-1 text-sm leading-6 outline-none focus:ring-0"
              value={sheet.cells[anchor.r]?.[anchor.c] || ''}
              maxLength={32767}
              onChange={(e) => onValue(anchor.r, anchor.c, e.target.value)}
            />
          </div>
        )}
        <div
          ref={gridRef}
          onPointerDown={beginSelection}
          style={{ scrollPaddingLeft: 48, scrollPaddingTop: 36 }}
          onCopy={(event) => {
            if (selection.r !== selection.er || selection.c !== selection.ec) {
              event.preventDefault();
              event.clipboardData.setData('text/plain', selectionText());
            }
          }}
          className="relative w-full max-w-full max-h-[60vh] overflow-auto rounded-xl border border-slate-300 bg-white dark:border-slate-700 dark:bg-slate-900"
        >
          <table
            className="table-fixed border-separate border-spacing-0"
            style={{ width: 48 + sheet.widths.reduce((a, b) => a + b, 0) }}
            aria-label={sheet.name}
          >
            <colgroup>
              <col style={{ width: 48 }} />
              {sheet.widths.map((w, c) => (
                <col key={c} style={{ width: w }} />
              ))}
            </colgroup>
            <thead className="sticky top-0 z-20">
              <tr>
                <th className="sticky left-0 z-30 border bg-slate-100 text-xs dark:bg-slate-800">
                  #
                </th>
                {sheet.widths.map((_, c) => (
                  <th
                    key={c}
                    className="relative border bg-slate-100 text-xs font-medium dark:border-slate-700 dark:bg-slate-800"
                  >
                    <button
                      className="w-full py-2"
                      data-grid-column={c}
                      onClick={(event) => {
                        if (event.detail !== 0) return;
                        if (!event.shiftKey) setAnchor({ r: 0, c });
                        setEnd({ r: sheet.cells.length - 1, c });
                      }}
                      aria-label={`Select column ${columnName(c)}`}
                    >
                      {columnName(c)}
                    </button>
                    <span
                      title="Drag to resize column"
                      onPointerDown={(event) => resize('column', c, event)}
                      className="absolute -right-1 top-0 z-30 h-full w-2 cursor-col-resize touch-none hover:bg-emerald-500/40"
                    />
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {sheet.cells.map((row, r) => (
                <tr key={r} style={{ height: sheet.heights[r] }}>
                  <th className="sticky left-0 z-10 border bg-slate-100 text-xs font-normal dark:border-slate-700 dark:bg-slate-800">
                    <button
                      className="h-full w-full py-2"
                      aria-label={`Select row ${r + 1}`}
                      data-grid-row={r}
                      onClick={(event) => {
                        if (event.detail !== 0) return;
                        if (!event.shiftKey) setAnchor({ r, c: 0 });
                        setEnd({ r, c: sheet.widths.length - 1 });
                      }}
                    >
                      {r + 1}
                    </button>
                    <span
                      title="Drag to resize row"
                      onPointerDown={(event) => resize('row', r, event)}
                      className="absolute -bottom-1 left-0 z-20 h-2 w-full cursor-row-resize touch-none hover:bg-emerald-500/40"
                    />
                  </th>
                  {row.map((value, c) => {
                    const merge = mergeLookup.get(`${r}:${c}`);
                    if (merge && (merge.r !== r || merge.c !== c)) return null;
                    return (
                      <GridCell
                        key={c}
                        {...{ value, r, c, merge }}
                        header={r === 0}
                        {...cellFormat(sheet, r, c)}
                        active={anchor.r === r && anchor.c === c}
                        selected={
                          r >= selection.r &&
                          r <= selection.er &&
                          c >= selection.c &&
                          c <= selection.ec
                        }
                        list={
                          r > 0 && suggestions[c]?.length
                            ? `wb-suggest-${sheet.id}-${c}`
                            : undefined
                        }
                        onValue={onValue}
                        onSelect={onSelect}
                        onNavigate={onNavigate}
                        onPaste={onPaste}
                      />
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {suggestions.map(
          (values, c) =>
            values.length > 0 && (
              <datalist key={c} id={`wb-suggest-${sheet.id}-${c}`}>
                {values.map((value) => (
                  <option key={value} value={value} />
                ))}
              </datalist>
            )
        )}
        <div className="flex flex-wrap items-center gap-2 rounded-xl border bg-white p-2 dark:border-slate-700 dark:bg-slate-900">
          <div
            role="tablist"
            aria-label="Worksheets"
            className="flex max-w-full gap-1 overflow-auto"
          >
            {book.sheets.map((s, i) => (
              <button
                key={s.id}
                role="tab"
                aria-selected={i === sheetIndex}
                className={`${button} whitespace-nowrap ${i === sheetIndex ? '!border-emerald-600 !bg-emerald-50 !text-emerald-800' : ''}`}
                onClick={() => {
                  setSheetIndex(i);
                  setAnchor({ r: 0, c: 0 });
                  setEnd({ r: 0, c: 0 });
                  lastEdit.current = '';
                }}
              >
                {s.name}
              </button>
            ))}
          </div>
          <button
            aria-label="Add worksheet"
            className={button}
            disabled={book.sheets.length >= 30}
            onClick={() => {
              let n = book.sheets.length + 1;
              while (book.sheets.some((s) => s.name === `Sheet ${n}`)) n++;
              commit({ ...book, sheets: [...book.sheets, makeSheet(`Sheet ${n}`)] });
              setSheetIndex(book.sheets.length);
              setAnchor({ r: 0, c: 0 });
              setEnd({ r: 0, c: 0 });
            }}
          >
            <Plus size={16} />
            Sheet
          </button>
          <label className="text-xs">
            Sheet name{' '}
            <input
              aria-label="Sheet name"
              className="ml-1 w-40 rounded border p-2 dark:bg-slate-900"
              value={sheetName}
              maxLength={31}
              onChange={(e) => setSheetName(e.target.value)}
              onBlur={renameSheet}
              onKeyDown={(e) => {
                if (e.key === 'Enter') renameSheet();
              }}
            />
          </label>
          <button
            className={button}
            disabled={book.sheets.length === 1}
            onClick={() => {
              if (window.confirm(`Delete “${sheet.name}” and all its cells?`)) {
                commit({ ...book, sheets: book.sheets.filter((s) => s.id !== sheet.id) });
                setSheetIndex(0);
                setAnchor({ r: 0, c: 0 });
                setEnd({ r: 0, c: 0 });
              }
            }}
          >
            Delete sheet
          </button>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            className={button}
            disabled={book.sheets.length >= 30}
            onClick={() => {
              const duplicate = structuredClone(sheet);
              duplicate.id = crypto.randomUUID();
              let n = 2;
              while (book.sheets.some((s) => s.name === `${sheet.name.slice(0, 25)} (${n})`)) n++;
              duplicate.name = `${sheet.name.slice(0, 25)} (${n})`;
              commit({ ...book, sheets: [...book.sheets, duplicate] });
              setSheetIndex(book.sheets.length);
              setAnchor({ r: 0, c: 0 });
              setEnd({ r: 0, c: 0 });
            }}
          >
            Duplicate sheet
          </button>
          <select
            aria-label="Add sheets from a template"
            className={button}
            value=""
            onChange={(event) => {
              if (!event.target.value) return;
              const template = newWorkbook(Number(event.target.value));
              if (book.sheets.length + template.sheets.length > 30) {
                setError('A workbook can contain up to 30 sheets.');
                return;
              }
              const names = new Set(book.sheets.map((s) => s.name.toLowerCase()));
              for (const s of template.sheets) {
                const base = s.name;
                let n = 2;
                while (names.has(s.name.toLowerCase())) s.name = `${base.slice(0, 25)} (${n++})`;
                names.add(s.name.toLowerCase());
              }
              commit({ ...book, sheets: [...book.sheets, ...template.sheets] });
              setSheetIndex(book.sheets.length);
              setAnchor({ r: 0, c: 0 });
              setEnd({ r: 0, c: 0 });
            }}
          >
            <option value="">Add template sheets…</option>
            {workbookTemplates.map((t, i) => (
              <option key={t.name} value={String(i)}>
                {t.name}
              </option>
            ))}
          </select>
        </div>
        <p className="text-xs text-slate-500">
          {sheet.cells.length} rows × {sheet.widths.length} columns · Suggestions follow the
          first-row headings and allow custom values · Basic tables only, no formula calculation
        </p>
      </fieldset>
    </section>
  );
}
