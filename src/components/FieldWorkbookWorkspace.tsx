'use client';
import SearchableSelect from './SearchableSelect';
import WorkbookColorPicker from './WorkbookColorPicker';
import { displayCellValue } from '@/lib/workbookCellTypes';
import { originalBytes } from '@/lib/excelWorkbook';

import { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ArrowLeft,
  MoveHorizontal,
  MoveVertical,
  Bold,
  Italic,
  AlignLeft,
  AlignCenter,
  AlignRight,
  AlertTriangle,
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
  Copy,
  Eraser,
  BookmarkPlus,
  Clock3,
  ChevronDown,
  ChevronUp,
  Download,
  FileSpreadsheet,
  Info,
  Maximize2,
  Minimize2,
  Plus,
  Pencil,
  Redo2,
  Save,
  Trash2,
  Undo2,
  Upload,
  X,
} from 'lucide-react';
import { apiFetch, apiFetchBlob, downloadBlob } from '@/lib/api';
import {
  changeDimension,
  cellFormat,
  formatCells,
  applyTableDesign,
  tableDesigns,
  type CellFormat,
  columnName,
  copyWorkbook,
  exportWorkbook,
  importWorkbook,
  makeSheet,
  MAX_ROWS,
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
  appearance,
  list,
  onValue,
  onSelect,
  onNavigate,
  onPaste,
  onContextMenu,
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
  appearance?: CellFormat;
  list?: string;
  onValue: (r: number, c: number, value: string) => void;
  onSelect: (r: number, c: number, extend: boolean) => void;
  onNavigate: (r: number, c: number, key: string, shift: boolean) => void;
  onPaste: (r: number, c: number, text: string) => void;
  onContextMenu?: (r: number, c: number, event: React.MouseEvent) => void;
}) {
  const [editing, setEditing] = useState(false);
  const kind = appearance?.dataType;
  const picker = kind === 'datetime' ? 'datetime-local' : kind === 'date' || kind === 'time' ? kind : 'text';
  // Keep incompatible existing values visible until the user explicitly replaces them.
  const compatible = !value || (kind === 'date' ? /^\d{4}-\d{2}-\d{2}$/.test(value) : kind === 'time' ? /^\d{2}:\d{2}(?::\d{2})?$/.test(value) : /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/.test(value));
  return (
    <td
      style={{
        backgroundColor: appearance?.background || undefined,
        verticalAlign: appearance?.vertical,
        borderTop: appearance?.borders?.top,
        borderBottom: appearance?.borders?.bottom,
        borderLeft: appearance?.borders?.left,
        borderRight: appearance?.borders?.right,
      }}
      data-grid-cell={`${r}:${c}`}
      rowSpan={merge ? merge.er - merge.r + 1 : 1}
      colSpan={merge ? merge.ec - merge.c + 1 : 1}
      onContextMenu={(event) => {
        event.preventDefault();
        onContextMenu?.(r, c, event);
      }}
      className={`relative border border-slate-200 p-0 dark:border-slate-700 ${selected ? 'bg-emerald-50 dark:bg-emerald-950' : header ? 'bg-slate-100 dark:bg-slate-800' : 'bg-white dark:bg-slate-900'} ${active ? 'outline outline-2 -outline-offset-2 outline-emerald-600 z-10' : ''}`}
    >
      <input
        data-cell={`${r}:${c}`}
        aria-label={`${columnName(c)}${r + 1}`}
        aria-selected={selected}
        list={list}
        type={picker !== 'text' && compatible ? picker : 'text'}
        step={kind === 'time' || kind === 'datetime' ? 1 : undefined}
        inputMode={['number','currency','percent'].includes(kind || '') ? 'decimal' : undefined}
        value={editing ? value : displayCellValue(value, appearance || {})}
        maxLength={32767}
        autoComplete="off"
        className={`h-full min-h-[32px] w-full min-w-0 bg-transparent px-2 py-1 text-sm text-slate-900 !border-0 !outline-none !ring-0 !ring-offset-0 !shadow-none focus:!outline-none focus-visible:!outline-none dark:text-slate-100 ${bold ? 'font-bold' : 'font-normal'} ${italic ? 'italic' : ''}`}
        style={{
          textAlign: align,
          fontFamily: appearance?.fontName,
          fontSize: appearance?.fontSize ? `${appearance.fontSize}pt` : undefined,
          color: appearance?.color || undefined,
          textDecoration: [
            appearance?.underline ? 'underline' : '',
            appearance?.strike ? 'line-through' : '',
          ].join(' '),
          minHeight: appearance ? 0 : undefined,
        }}
        title={value}
        onFocus={() => { setEditing(true); onSelect(r, c, false); }}
        onBlur={() => setEditing(false)}
        onMouseDown={(event) => {
          if (event.button !== 0) {
            event.preventDefault();
            return;
          }
          if (event.shiftKey) {
            event.preventDefault();
            onSelect(r, c, true);
          }
        }}
        onContextMenu={(event) => {
          event.preventDefault();
          onContextMenu?.(r, c, event);
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
  const [contextMenu, setContextMenu] = useState<{
    x: number;
    y: number;
    sheetIndex: number;
  } | null>(null);
  const [editingSheetIndex, setEditingSheetIndex] = useState<number | null>(null);
  const [editingSheetName, setEditingSheetName] = useState('');
  const [confirmDeleteSheet, setConfirmDeleteSheet] = useState<FieldSheet | null>(null);
  const [showTemplateModal, setShowTemplateModal] = useState(false);
  const [gridContextMenu, setGridContextMenu] = useState<{
    type: 'column' | 'row' | 'cell';
    r?: number;
    c?: number;
    x: number;
    y: number;
  } | null>(null);
  const [showLeaveConfirmModal, setShowLeaveConfirmModal] = useState(false);
  const [gridViewportHeight, setGridViewportHeight] = useState<number | null>(null);
  const [isMaximized, setIsMaximized] = useState(false);
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
  useEffect(() => {
    if (!notice) return;
    const timer = setTimeout(() => {
      setNotice('');
    }, 3500);
    return () => clearTimeout(timer);
  }, [notice]);
  useEffect(() => {
    if (!error) return;
    const timer = setTimeout(() => {
      setError('');
    }, 5000);
    return () => clearTimeout(timer);
  }, [error]);

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
  function startGridHeightResize(event: React.PointerEvent) {
    event.preventDefault();
    event.stopPropagation();
    const startY = event.clientY;
    const startHeight = gridRef.current?.getBoundingClientRect().height || 450;

    const onMove = (e: PointerEvent) => {
      const delta = e.clientY - startY;
      const nextHeight = Math.max(250, Math.min(1600, startHeight + delta));
      setGridViewportHeight(nextHeight);
      setIsMaximized(false);
    };
    const onUp = () => {
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
    };
    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
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
  function performLeave() {
    localStorage.removeItem(storageKey);
    setBook(null);
    setDirty(false);
    setError('');
    setNotice('');
    setShowLeaveConfirmModal(false);
  }
  function leave() {
    if (dirty) {
      setShowLeaveConfirmModal(true);
    } else {
      performLeave();
    }
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
  function addRows(count: number) {
    if (!sheet || !book) return;
    if (sheet.cells.length + count > MAX_ROWS) {
      setError(`Cannot exceed ${MAX_ROWS} rows per sheet.`);
      return;
    }
    let nextSheet = sheet;
    for (let i = 0; i < count; i++) {
      nextSheet = changeDimension(nextSheet, 'row', nextSheet.cells.length, false);
    }
    commit({
      ...book,
      sheets: book.sheets.map((s, idx) => (idx === sheetIndex ? nextSheet : s)),
    });
    setNotice(`Added ${count} new rows to sheet.`);
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
  function finishSheetRename(index: number) {
    const name = editingSheetName.trim();
    const targetSheet = book?.sheets[index];
    if (!book || !targetSheet) return;
    if (
      !name ||
      name.length > 31 ||
      /[\\/?*\[\]:]/.test(name) ||
      book.sheets.some((st, idx) => idx !== index && st.name.toLowerCase() === name.toLowerCase())
    ) {
      setError('Use a unique sheet name of 1–31 characters without \\ / ? * [ ] :');
      setEditingSheetIndex(null);
      return;
    }
    if (name !== targetSheet.name) {
      commit({
        ...book,
        sheets: book.sheets.map((st, idx) => (idx === index ? { ...st, name } : st)),
      });
    }
    setEditingSheetIndex(null);
  }
  async function readFile(file?: File) {
    if (!file) return;
    setBusy(true);
    setError('');
    try {
      activate(await importWorkbook(file), true);
      setNotice(
        'Imported all worksheets. XLSX layout and common formatting are retained; formulas display saved results. Original XLSX retained intact. Advanced Excel features may not display here or survive an edited export.'
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
    <div className="fixed bottom-6 right-6 z-50 flex max-w-md flex-col gap-2 pointer-events-none">
      {error && (
        <div
          role="alert"
          className="pointer-events-auto flex items-center justify-between gap-3 rounded-xl border border-red-200 bg-red-600 px-4 py-3 text-sm font-medium text-white shadow-2xl backdrop-blur-md transition-all dark:border-red-800"
        >
          <div className="flex items-center gap-2.5">
            <AlertTriangle size={18} className="shrink-0 text-red-200" />
            <span>{error}</span>
          </div>
          <button
            type="button"
            className="rounded-lg p-1 text-red-200 hover:bg-red-700 hover:text-white transition-colors"
            onClick={() => setError('')}
            title="Dismiss notification"
          >
            <X size={16} />
          </button>
        </div>
      )}
      {book?.source && (
        <button
          className={`${button} pointer-events-auto`}
          onClick={() =>
            downloadBlob(
              new Blob([originalBytes(book.source!.base64) as BlobPart]),
              book.source!.name
            )
          }
        >
          Download original Excel file
        </button>
      )}
      {notice && (
        <div
          role="status"
          className="pointer-events-auto flex items-center justify-between gap-3 rounded-xl border border-emerald-500/30 bg-emerald-800/95 px-4 py-3 text-sm font-medium text-white shadow-2xl backdrop-blur-md transition-all dark:border-emerald-600/40"
        >
          <div className="flex items-center gap-2.5">
            <Info size={18} className="shrink-0 text-emerald-300" />
            <span>{notice}</span>
          </div>
          <button
            type="button"
            className="rounded-lg p-1 text-emerald-200 hover:bg-emerald-700 hover:text-white transition-colors"
            onClick={() => setNotice('')}
            title="Dismiss notification"
          >
            <X size={16} />
          </button>
        </div>
      )}
    </div>
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
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <h3 className="font-semibold">Saved workbooks & templates</h3>
          <div className="flex min-w-0 w-full items-center gap-2 lg:w-auto">
          <input
            aria-label="Search workbooks"
            placeholder="Search saved files…"
            className="input-field !h-10 min-w-0 flex-1 lg:w-72"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <button className={`${button} h-10 shrink-0`} disabled={loading} onClick={() => void loadLibrary()}>
            Refresh
          </button>
          </div>
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
              <span>
                Selection details ({columnName(selection.c)}
                {selection.r + 1})
              </span>
              {showSelectionInfo ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
            </button>
          </div>
        </div>

        {showToolbar && (
          <div className="flex flex-wrap items-center gap-2 rounded-xl border bg-white p-2 dark:border-slate-700 dark:bg-slate-900">
            {/* Undo / Redo Group */}
            <div className="flex items-center gap-1">
              <button
                className={button}
                disabled={!undo.length}
                aria-label="Undo"
                title="Undo (Ctrl+Z)"
                onClick={() => undoRedo(false)}
              >
                <Undo2 size={16} />
              </button>
              <button
                className={button}
                disabled={!redo.length}
                aria-label="Redo"
                title="Redo (Ctrl+Y)"
                onClick={() => undoRedo(true)}
              >
                <Redo2 size={16} />
              </button>
            </div>

            <div
              className="h-6 w-px bg-slate-200 dark:bg-slate-700 mx-1 self-center"
              aria-hidden="true"
            />

            {/* Text Formatting Group */}
            <div className="flex items-center gap-1" role="group" aria-label="Text formatting">
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

            <div
              className="h-6 w-px bg-slate-200 dark:bg-slate-700 mx-1 self-center"
              aria-hidden="true"
            />

            <div className="flex items-center gap-2" role="group" aria-label="Cell colors">
              {([{key: 'color', label: 'Text color', fallback: '#000000'}, {key: 'background', label: 'Cell background color', fallback: '#ffffff'}] as const).map(({key, label, fallback}) => (
                <WorkbookColorPicker key={key} label={label} fallback={fallback}
                  value={cellFormat(sheet, anchor.r, anchor.c)[key]}
                  onChange={color => changeSheet(s => formatCells(s, selection, {[key]: color}))} />
              ))}
              <button type="button" className={button} title="Reset text and background colors" onClick={() => changeSheet(s => formatCells(s, selection, {color: '', background: ''}))}>Reset colors</button>
            </div>

            <details className="relative">
              <summary className={`${button} h-10 cursor-pointer list-none`}>Table designs</summary>
              <div className="absolute left-0 top-full z-30 mt-2 w-64 rounded-xl border bg-white p-3 shadow-xl dark:border-slate-700 dark:bg-slate-900">
                <p className="mb-2 text-xs text-slate-500">Applies to the entire current sheet. The first row is the header.</p>
                <div className="grid grid-cols-2 gap-2">
                  {tableDesigns.map((design, index) => (
                    <button key={design.name} type="button" aria-label={`Apply ${design.name} table design`}
                      className="overflow-hidden rounded-lg border text-left focus-visible:outline-emerald-600"
                      onClick={event => {
                        changeSheet(s => applyTableDesign(s, {r: 0, c: 0, er: s.cells.length - 1, ec: s.widths.length - 1}, index));
                        event.currentTarget.closest('details')?.removeAttribute('open');
                      }}>
                      <span className="block px-2 py-1 text-xs font-bold" style={{background: design.header, color: '#ffffff'}}>{design.name}</span>
                      <span aria-hidden="true" className="block h-3" style={{background: design.stripe}} />
                      <span aria-hidden="true" className="block h-3 bg-white" />
                      <span aria-hidden="true" className="block h-3" style={{background: design.stripe}} />
                    </button>
                  ))}
                </div>
              </div>
            </details>

            <div className="flex items-center gap-2" role="group" aria-label="Cell data format">
              <SearchableSelect ariaLabel="Cell content type" className="min-w-40" disabled={busy}
                value={cellFormat(sheet, anchor.r, anchor.c).dataType || 'general'}
                options={['general','text','number','currency','percent','date','time','datetime'].map(type => ({value: type, label: type === 'datetime' ? 'Date & time' : type.charAt(0).toUpperCase()+type.slice(1)}))}
                onChange={value => changeSheet(s => formatCells(s, selection, {dataType: value as CellFormat['dataType']}))} />
              {['number','currency','percent'].includes(cellFormat(sheet, anchor.r, anchor.c).dataType || '') && <>
                <label className="flex items-center gap-1 text-xs">Decimals<select aria-label="Decimal places" className="input-field !h-10 !w-auto" value={cellFormat(sheet, anchor.r, anchor.c).decimals ?? 2} onChange={e => changeSheet(s => formatCells(s, selection, {decimals:Number(e.target.value)}))}>{[0,1,2,3,4,5,6].map(n=><option key={n} value={n}>{n}</option>)}</select></label>
                {cellFormat(sheet, anchor.r, anchor.c).dataType === 'currency' && <select aria-label="Currency" className="input-field !h-10 !w-auto" value={cellFormat(sheet, anchor.r, anchor.c).currency || 'USD'} onChange={e => changeSheet(s => formatCells(s, selection, {currency:e.target.value}))}>{['USD','GHS','EUR','GBP','LRD'].map(code=><option key={code}>{code}</option>)}</select>}
                {cellFormat(sheet, anchor.r, anchor.c).dataType === 'percent' && <span className="text-xs text-slate-500">0.25 = 25%</span>}
              </>}
            </div>

            {/* Row & Column Actions Group */}
            <div className="flex items-center gap-1">
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
            </div>

            <div
              className="h-6 w-px bg-slate-200 dark:bg-slate-700 mx-1 self-center"
              aria-hidden="true"
            />

            {/* Merge & Selection Group */}
            <div className="flex items-center gap-1">
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
            </div>

            <div
              className="h-6 w-px bg-slate-200 dark:bg-slate-700 mx-1 self-center"
              aria-hidden="true"
            />

            {/* Template & History Group */}
            <div className="flex items-center gap-1">
              <button
                type="button"
                title="Duplicate sheet"
                aria-label="Duplicate sheet"
                className={iconButton}
                disabled={book.sheets.length >= 30}
                onClick={() => {
                  const duplicate = structuredClone(sheet);
                  duplicate.id = crypto.randomUUID();
                  let n = 2;
                  while (book.sheets.some((s) => s.name === `${sheet.name.slice(0, 25)} (${n})`))
                    n++;
                  duplicate.name = `${sheet.name.slice(0, 25)} (${n})`;
                  commit({ ...book, sheets: [...book.sheets, duplicate] });
                  setSheetIndex(book.sheets.length);
                  setAnchor({ r: 0, c: 0 });
                  setEnd({ r: 0, c: 0 });
                }}
              >
                <Copy size={18} aria-hidden="true" />
              </button>
              <button
                type="button"
                title="Add template sheets…"
                aria-label="Add template sheets"
                className={iconButton}
                disabled={book.sheets.length >= 30}
                onClick={() => setShowTemplateModal(true)}
              >
                <FileSpreadsheet size={18} aria-hidden="true" />
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
              Drag across cells or row/column headings to select · Shift-click to extend · Tab /
              Enter to move · Alt + arrows to navigate · Paste tables from Excel
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
        <div className="flex flex-col">
          <div
            ref={gridRef}
            onMouseDownCapture={(event) => {
              // Secondary clicks must not focus an input and collapse the selected range.
              if (event.button === 2) event.preventDefault();
            }}
            onPointerDown={beginSelection}
            style={{
              scrollPaddingLeft: 48,
              scrollPaddingTop: 36,
              height: isMaximized
                ? '82vh'
                : gridViewportHeight
                  ? `${gridViewportHeight}px`
                  : undefined,
              maxHeight: isMaximized ? '82vh' : gridViewportHeight ? 'none' : '60vh',
            }}
            onCopy={(event) => {
              if (selection.r !== selection.er || selection.c !== selection.ec) {
                event.preventDefault();
                event.clipboardData.setData('text/plain', selectionText());
              }
            }}
            className="relative w-full max-w-full overflow-auto rounded-t-xl border border-slate-300 bg-white dark:border-slate-700 dark:bg-slate-900 transition-[height]"
          >
            <table
              className="table-fixed border-separate border-spacing-0"
              style={{ width: 48 + sheet.widths.reduce((a, b) => a + b, 0) }}
              aria-label={sheet.name}
            >
              <colgroup>
                <col style={{ width: 48 }} />
                {sheet.widths.map((w, c) => (
                  <col key={c} style={{ width: w, visibility: w === 0 ? 'collapse' : undefined }} />
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
                      style={{ display: sheet.widths[c] === 0 ? 'none' : undefined }}
                      className="relative border bg-slate-100 text-xs font-medium dark:border-slate-700 dark:bg-slate-800"
                      onContextMenu={(event) => {
                        event.preventDefault();
                        if (c < selection.c || c > selection.ec) {
                          setAnchor({ r: 0, c });
                          setEnd({ r: sheet.cells.length - 1, c });
                        }
                        setGridContextMenu({
                          type: 'column',
                          c,
                          x: event.clientX,
                          y: event.clientY,
                        });
                      }}
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
                        className="absolute -right-2 top-0 z-30 flex h-full w-4 cursor-col-resize touch-none items-center justify-center text-slate-500 hover:bg-emerald-100 hover:text-emerald-700 dark:hover:bg-emerald-950"
                      >
                        <MoveHorizontal size={14} aria-hidden="true" className="pointer-events-none shrink-0" />
                      </span>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {sheet.cells.map((row, r) => (
                  <tr
                    key={r}
                    style={{
                      height: sheet.heights[r],
                      display: sheet.heights[r] === 0 ? 'none' : undefined,
                    }}
                  >
                    <th
                      className="sticky left-0 z-10 border bg-slate-100 text-xs font-normal dark:border-slate-700 dark:bg-slate-800"
                      onContextMenu={(event) => {
                        event.preventDefault();
                        if (r < selection.r || r > selection.er) {
                          setAnchor({ r, c: 0 });
                          setEnd({ r, c: sheet.widths.length - 1 });
                        }
                        setGridContextMenu({
                          type: 'row',
                          r,
                          x: event.clientX,
                          y: event.clientY,
                        });
                      }}
                    >
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
                        className="absolute -bottom-2 left-0 z-20 flex h-4 w-full cursor-row-resize touch-none items-center justify-center text-slate-500 hover:bg-emerald-100 hover:text-emerald-700 dark:hover:bg-emerald-950"
                      >
                        <MoveVertical size={14} aria-hidden="true" className="pointer-events-none shrink-0" />
                      </span>
                    </th>
                    {row.map((value, c) => {
                      if (sheet.widths[c] === 0) return null;
                      const merge = mergeLookup.get(`${r}:${c}`);
                      if (merge && (merge.r !== r || merge.c !== c)) return null;
                      return (
                        <GridCell
                          key={c}
                          {...{ value, r, c, merge }}
                          header={!sheet.imported && r === 0}
                          appearance={cellFormat(sheet, r, c)}
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
                          onContextMenu={(r, c, event) => {
                            if (
                              r < selection.r ||
                              r > selection.er ||
                              c < selection.c ||
                              c > selection.ec
                            ) {
                              setAnchor({ r, c });
                              setEnd({ r, c });
                            }
                            setGridContextMenu({
                              type: 'cell',
                              r,
                              c,
                              x: event.clientX,
                              y: event.clientY,
                            });
                          }}
                        />
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div
            title="Drag down to extend sheet view height and expose more rows in view"
            onPointerDown={startGridHeightResize}
            className="-mt-px group flex h-3.5 w-full cursor-ns-resize items-center justify-center rounded-b-xl border border-t-0 border-slate-300 bg-slate-100 hover:bg-emerald-500/20 dark:border-slate-700 dark:bg-slate-800 transition-colors"
          >
            <div className="h-1 w-12 rounded-full bg-slate-300 group-hover:bg-emerald-600 dark:bg-slate-600" />
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-200 bg-slate-50/80 p-2.5 dark:border-slate-800 dark:bg-slate-900/80">
          <div className="flex items-center gap-2 text-xs text-slate-600 dark:text-slate-400">
            <span className="font-semibold">{sheet.cells.length}</span> rows ×{' '}
            <span className="font-semibold">{sheet.widths.length}</span> columns
            <span className="text-slate-400 dark:text-slate-600">·</span>
            <span className="text-[11px] text-slate-500">Max limit: {MAX_ROWS} rows</span>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-1.5">
              <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                View height:
              </span>
              <button
                type="button"
                title={
                  isMaximized || gridViewportHeight
                    ? 'Reset to standard view height (60vh)'
                    : 'Extend view height to expose more rows (82vh)'
                }
                className={`inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1 text-xs font-semibold transition-colors ${
                  isMaximized || gridViewportHeight
                    ? 'bg-emerald-50 border-emerald-300 text-emerald-800 dark:bg-emerald-950 dark:border-emerald-800 dark:text-emerald-200'
                    : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50 dark:bg-slate-900 dark:border-slate-800 dark:text-slate-400'
                }`}
                onClick={() => {
                  if (isMaximized || gridViewportHeight) {
                    setIsMaximized(false);
                    setGridViewportHeight(null);
                  } else {
                    setIsMaximized(true);
                  }
                }}
              >
                {isMaximized ? <Minimize2 size={14} /> : <Maximize2 size={14} />}
                <span>{isMaximized ? 'Standard height' : 'Extend view height'}</span>
              </button>
            </div>

            <div className="h-4 w-px bg-slate-300 dark:bg-slate-700 hidden sm:block" />

            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                Add rows:
              </span>
              <div className="inline-flex items-center rounded-lg border border-slate-300 bg-white shadow-xs dark:border-slate-700 dark:bg-slate-900">
                {[10, 25, 50, 100].map((count, idx, arr) => (
                  <div key={count} className="flex items-center">
                    <button
                      type="button"
                      className="px-2.5 py-1 text-xs font-semibold text-slate-700 hover:bg-emerald-50 hover:text-emerald-800 dark:text-slate-200 dark:hover:bg-emerald-950 dark:hover:text-emerald-200 disabled:opacity-40 transition-colors"
                      disabled={sheet.cells.length >= MAX_ROWS}
                      onClick={() => addRows(count)}
                      title={`Add ${count} more rows to the bottom of the sheet`}
                    >
                      +{count} rows
                    </button>
                    {idx < arr.length - 1 && (
                      <div className="h-4 w-px bg-slate-200 dark:bg-slate-700" />
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
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
        <div className="sticky bottom-0 z-30 flex flex-wrap items-center gap-2 rounded-xl border border-slate-200 bg-white/95 p-2 backdrop-blur-md shadow-lg dark:border-slate-700 dark:bg-slate-900/95">
          <div
            role="tablist"
            aria-label="Worksheets"
            className="flex max-w-full items-center gap-1 overflow-auto"
          >
            {book.sheets.map((s, i) =>
              editingSheetIndex === i ? (
                <input
                  key={s.id}
                  autoFocus
                  aria-label="Rename sheet"
                  className="w-28 rounded-lg border-2 border-emerald-600 bg-white px-3 py-1 text-xs font-semibold text-slate-800 outline-none dark:bg-slate-900 dark:text-slate-100"
                  value={editingSheetName}
                  maxLength={31}
                  onChange={(e) => setEditingSheetName(e.target.value)}
                  onFocus={(e) => e.target.select()}
                  onBlur={() => finishSheetRename(i)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') finishSheetRename(i);
                    if (e.key === 'Escape') setEditingSheetIndex(null);
                  }}
                />
              ) : (
                <button
                  key={s.id}
                  role="tab"
                  aria-selected={i === sheetIndex}
                  title="Right click or double click to rename or delete sheet"
                  className={`${button} whitespace-nowrap ${i === sheetIndex ? '!border-emerald-600 !bg-emerald-50 !text-emerald-800 dark:!bg-emerald-950/60 dark:!text-emerald-200' : ''}`}
                  onClick={() => {
                    setSheetIndex(i);
                    setAnchor({ r: 0, c: 0 });
                    setEnd({ r: 0, c: 0 });
                    lastEdit.current = '';
                  }}
                  onDoubleClick={() => {
                    setEditingSheetIndex(i);
                    setEditingSheetName(s.name);
                  }}
                  onContextMenu={(e) => {
                    e.preventDefault();
                    setSheetIndex(i);
                    setContextMenu({ x: e.clientX, y: e.clientY, sheetIndex: i });
                  }}
                >
                  {s.name}
                </button>
              )
            )}
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
        </div>

        {contextMenu && (
          <>
            <div
              className="fixed inset-0 z-40 bg-transparent"
              onClick={() => setContextMenu(null)}
              onContextMenu={(e) => {
                e.preventDefault();
                setContextMenu(null);
              }}
            />
            <div
              style={{ top: contextMenu.y, left: contextMenu.x }}
              className="fixed z-50 min-w-36 rounded-xl border border-slate-200 bg-white p-1.5 shadow-xl dark:border-slate-700 dark:bg-slate-900"
            >
              <button
                type="button"
                className="flex w-full items-center gap-2 rounded-lg px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-800"
                onClick={() => {
                  const idx = contextMenu.sheetIndex;
                  setContextMenu(null);
                  setEditingSheetIndex(idx);
                  setEditingSheetName(book.sheets[idx].name);
                }}
              >
                <Pencil size={14} />
                Rename
              </button>
              <button
                type="button"
                disabled={book.sheets.length === 1}
                className="flex w-full items-center gap-2 rounded-lg px-3 py-1.5 text-xs font-medium text-red-600 hover:bg-red-50 disabled:opacity-40 dark:hover:bg-red-950/40"
                onClick={() => {
                  const target = book.sheets[contextMenu.sheetIndex];
                  setContextMenu(null);
                  setConfirmDeleteSheet(target);
                }}
              >
                <Trash2 size={14} />
                Delete sheet
              </button>
            </div>
          </>
        )}

        {confirmDeleteSheet && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 p-4 backdrop-blur-xs">
            <div className="w-full max-w-sm rounded-xl border border-slate-200 bg-white p-5 shadow-2xl dark:border-slate-800 dark:bg-slate-900">
              <h4 className="text-base font-bold text-slate-900 dark:text-white">
                Delete worksheet?
              </h4>
              <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">
                Are you sure you want to delete{' '}
                <strong className="font-semibold text-slate-900 dark:text-white">
                  “{confirmDeleteSheet.name}”
                </strong>
                ? All cells and data on this sheet will be lost.
              </p>
              <div className="mt-5 flex items-center justify-end gap-2">
                <button
                  type="button"
                  className={button}
                  onClick={() => setConfirmDeleteSheet(null)}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  className="rounded-lg bg-red-600 px-3.5 py-2 text-xs font-semibold text-white shadow-xs hover:bg-red-700"
                  onClick={() => {
                    const targetId = confirmDeleteSheet.id;
                    commit({ ...book, sheets: book.sheets.filter((s) => s.id !== targetId) });
                    setSheetIndex(0);
                    setAnchor({ r: 0, c: 0 });
                    setEnd({ r: 0, c: 0 });
                    setConfirmDeleteSheet(null);
                  }}
                >
                  Delete sheet
                </button>
              </div>
            </div>
          </div>
        )}

        {gridContextMenu && (
          <>
            <div
              className="fixed inset-0 z-40 bg-transparent"
              onClick={() => setGridContextMenu(null)}
              onContextMenu={(e) => {
                e.preventDefault();
                setGridContextMenu(null);
              }}
            />
            <div
              style={{
                top: Math.min(
                  gridContextMenu.y,
                  typeof window !== 'undefined' ? window.innerHeight - 320 : gridContextMenu.y
                ),
                left: Math.min(
                  gridContextMenu.x,
                  typeof window !== 'undefined' ? window.innerWidth - 240 : gridContextMenu.x
                ),
              }}
              className="fixed z-50 max-h-[calc(100dvh-16px)] overflow-y-auto min-w-56 rounded-xl border border-slate-200 bg-white p-1.5 shadow-2xl dark:border-slate-700 dark:bg-slate-900 text-xs font-medium text-slate-700 dark:text-slate-200"
            >
              <div className="px-3 py-1.5 text-[10px] font-semibold text-slate-500" aria-label="Selected cell range">
                Selection: {columnName(selection.c)}{selection.r + 1}:{columnName(selection.ec)}{selection.er + 1}
              </div>
                  {(selection.r !== selection.er || selection.c !== selection.ec) && (
                    <button
                      type="button"
                      className="flex w-full items-center gap-2 rounded-lg px-3 py-1.5 hover:bg-slate-100 dark:hover:bg-slate-800"
                      onClick={() => {
                        setGridContextMenu(null);
                        changeSheet((s) => {
                          const next = mergeCells(s, selection);
                          setAnchor({ r: selection.r, c: selection.c });
                          setEnd({ r: selection.r, c: selection.c });
                          return next;
                        });
                      }}
                    >
                      <TableCellsMerge size={15} />
                      Merge cells
                    </button>
                  )}
                  {sheet.merges.some((m) => overlaps(m, selection)) && (
                    <button
                      type="button"
                      className="flex w-full items-center gap-2 rounded-lg px-3 py-1.5 hover:bg-slate-100 dark:hover:bg-slate-800"
                      onClick={() => {
                        setGridContextMenu(null);
                        changeSheet((s) => ({
                          ...s,
                          merges: s.merges.filter((m) => !overlaps(m, selection)),
                        }));
                      }}
                    >
                      <TableCellsSplit size={15} />
                      Unmerge cells
                    </button>
                  )}
              {gridContextMenu.type === 'column' && (
                <>
                  <div className="px-3 py-1.5 font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider text-[10px]">
                    Column {columnName(selection.c)}
                    {selection.c !== selection.ec ? `–${columnName(selection.ec)}` : ''}
                  </div>
                  <button
                    type="button"
                    className="flex w-full items-center gap-2 rounded-lg px-3 py-1.5 hover:bg-slate-100 dark:hover:bg-slate-800"
                    onClick={() => {
                      setGridContextMenu(null);
                      dimension('column', false);
                    }}
                  >
                    <BetweenVerticalStart size={15} />
                    Insert 1 column left
                  </button>
                  <button
                    type="button"
                    className="flex w-full items-center gap-2 rounded-lg px-3 py-1.5 hover:bg-slate-100 dark:hover:bg-slate-800"
                    onClick={() => {
                      setGridContextMenu(null);
                      dimension('column', false, true);
                    }}
                  >
                    <BetweenVerticalEnd size={15} />
                    Insert 1 column right
                  </button>
                  <button
                    type="button"
                    className="flex w-full items-center gap-2 rounded-lg px-3 py-1.5 text-red-600 hover:bg-red-50 dark:hover:bg-red-950/40"
                    onClick={() => {
                      setGridContextMenu(null);
                      if (window.confirm('Delete the selected columns and their contents?'))
                        dimension('column', true);
                    }}
                  >
                    <Columns2 size={15} />
                    Delete column{selection.c !== selection.ec ? 's' : ''}
                  </button>
                  <div className="my-1 border-t border-slate-100 dark:border-slate-800" />
                  <button
                    type="button"
                    className="flex w-full items-center gap-2 rounded-lg px-3 py-1.5 hover:bg-slate-100 dark:hover:bg-slate-800"
                    onClick={() => {
                      setGridContextMenu(null);
                      const val = window.prompt('Set column width (60–600 px):', String(width));
                      if (val) {
                        const size = Math.max(60, Math.min(600, Number(val) || 160));
                        changeSheet((s) => ({
                          ...s,
                          widths: s.widths.map((w, colIdx) =>
                            colIdx >= selection.c && colIdx <= selection.ec ? size : w
                          ),
                        }));
                      }
                    }}
                  >
                    Column width…
                  </button>
                  <button
                    type="button"
                    className="flex w-full items-center gap-2 rounded-lg px-3 py-1.5 hover:bg-slate-100 dark:hover:bg-slate-800"
                    onClick={() => {
                      setGridContextMenu(null);
                      changeSheet((s) => ({
                        ...s,
                        cells: s.cells.map((row) =>
                          row.map((cell, c) => (c >= selection.c && c <= selection.ec ? '' : cell))
                        ),
                      }));
                    }}
                  >
                    <Eraser size={15} />
                    Clear contents
                  </button>
                </>
              )}

              {gridContextMenu.type === 'row' && (
                <>
                  <div className="px-3 py-1.5 font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider text-[10px]">
                    Row {selection.r + 1}
                    {selection.r !== selection.er ? `–${selection.er + 1}` : ''}
                  </div>
                  <button
                    type="button"
                    className="flex w-full items-center gap-2 rounded-lg px-3 py-1.5 hover:bg-slate-100 dark:hover:bg-slate-800"
                    onClick={() => {
                      setGridContextMenu(null);
                      dimension('row', false);
                    }}
                  >
                    <BetweenHorizontalStart size={15} />
                    Insert 1 row above
                  </button>
                  <button
                    type="button"
                    className="flex w-full items-center gap-2 rounded-lg px-3 py-1.5 hover:bg-slate-100 dark:hover:bg-slate-800"
                    onClick={() => {
                      setGridContextMenu(null);
                      dimension('row', false, true);
                    }}
                  >
                    <BetweenHorizontalEnd size={15} />
                    Insert 1 row below
                  </button>
                  <button
                    type="button"
                    className="flex w-full items-center gap-2 rounded-lg px-3 py-1.5 text-red-600 hover:bg-red-50 dark:hover:bg-red-950/40"
                    onClick={() => {
                      setGridContextMenu(null);
                      if (window.confirm('Delete the selected rows and their contents?'))
                        dimension('row', true);
                    }}
                  >
                    <Rows2 size={15} />
                    Delete row{selection.r !== selection.er ? 's' : ''}
                  </button>
                  <div className="my-1 border-t border-slate-100 dark:border-slate-800" />
                  <button
                    type="button"
                    className="flex w-full items-center gap-2 rounded-lg px-3 py-1.5 hover:bg-slate-100 dark:hover:bg-slate-800"
                    onClick={() => {
                      setGridContextMenu(null);
                      const val = window.prompt('Set row height (26–300 px):', String(height));
                      if (val) {
                        const size = Math.max(26, Math.min(300, Number(val) || 34));
                        changeSheet((s) => ({
                          ...s,
                          heights: s.heights.map((h, rIdx) =>
                            rIdx >= selection.r && rIdx <= selection.er ? size : h
                          ),
                        }));
                      }
                    }}
                  >
                    Row height…
                  </button>
                  <button
                    type="button"
                    className="flex w-full items-center gap-2 rounded-lg px-3 py-1.5 hover:bg-slate-100 dark:hover:bg-slate-800"
                    onClick={() => {
                      setGridContextMenu(null);
                      changeSheet((s) => ({
                        ...s,
                        cells: s.cells.map((row, r) =>
                          r >= selection.r && r <= selection.er ? row.map(() => '') : row
                        ),
                      }));
                    }}
                  >
                    <Eraser size={15} />
                    Clear contents
                  </button>
                </>
              )}

              {gridContextMenu.type === 'cell' && (
                <>
                  <div className="px-3 py-1.5 font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider text-[10px]">
                    Range {columnName(selection.c)}
                    {selection.r + 1}
                    {selection.er !== selection.r || selection.ec !== selection.c
                      ? `:${columnName(selection.ec)}${selection.er + 1}`
                      : ''}
                  </div>
                  <button
                    type="button"
                    className="flex w-full items-center gap-2 rounded-lg px-3 py-1.5 hover:bg-slate-100 dark:hover:bg-slate-800"
                    onClick={() => {
                      setGridContextMenu(null);
                      void navigator.clipboard
                        .writeText(selectionText())
                        .then(() => setNotice('Selection copied.'))
                        .catch(() => setError('Clipboard access unavailable.'));
                    }}
                  >
                    <ClipboardCopy size={15} />
                    Copy selection
                  </button>
                  <button
                    type="button"
                    className="flex w-full items-center gap-2 rounded-lg px-3 py-1.5 hover:bg-slate-100 dark:hover:bg-slate-800"
                    onClick={() => {
                      setGridContextMenu(null);
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
                      }));
                    }}
                  >
                    <Eraser size={15} />
                    Clear contents
                  </button>
                  <div className="my-1 border-t border-slate-100 dark:border-slate-800" />
                  <div className="my-1 border-t border-slate-100 dark:border-slate-800" />
                  <div className="flex items-center justify-between px-2 py-1">
                    <button
                      type="button"
                      title="Bold"
                      className={`p-1.5 rounded hover:bg-slate-100 dark:hover:bg-slate-800 ${cellFormat(sheet, anchor.r, anchor.c).bold ? 'bg-emerald-100 text-emerald-800 font-bold' : ''}`}
                      onClick={() => {
                        changeSheet((s) =>
                          formatCells(s, selection, {
                            bold: !cellFormat(sheet, anchor.r, anchor.c).bold,
                          })
                        );
                      }}
                    >
                      <Bold size={15} />
                    </button>
                    <button
                      type="button"
                      title="Italic"
                      className={`p-1.5 rounded hover:bg-slate-100 dark:hover:bg-slate-800 ${cellFormat(sheet, anchor.r, anchor.c).italic ? 'bg-emerald-100 text-emerald-800' : ''}`}
                      onClick={() => {
                        changeSheet((s) =>
                          formatCells(s, selection, {
                            italic: !cellFormat(sheet, anchor.r, anchor.c).italic,
                          })
                        );
                      }}
                    >
                      <Italic size={15} />
                    </button>
                    <button
                      type="button"
                      title="Align left"
                      className="p-1.5 rounded hover:bg-slate-100 dark:hover:bg-slate-800"
                      onClick={() => {
                        changeSheet((s) => formatCells(s, selection, { align: 'left' }));
                      }}
                    >
                      <AlignLeft size={15} />
                    </button>
                    <button
                      type="button"
                      title="Align centre"
                      className="p-1.5 rounded hover:bg-slate-100 dark:hover:bg-slate-800"
                      onClick={() => {
                        changeSheet((s) => formatCells(s, selection, { align: 'center' }));
                      }}
                    >
                      <AlignCenter size={15} />
                    </button>
                    <button
                      type="button"
                      title="Align right"
                      className="p-1.5 rounded hover:bg-slate-100 dark:hover:bg-slate-800"
                      onClick={() => {
                        changeSheet((s) => formatCells(s, selection, { align: 'right' }));
                      }}
                    >
                      <AlignRight size={15} />
                    </button>
                  </div>
                  <div className="my-1 border-t border-slate-100 dark:border-slate-800" />
                  <button
                    type="button"
                    className="flex w-full items-center gap-2 rounded-lg px-3 py-1.5 hover:bg-slate-100 dark:hover:bg-slate-800"
                    onClick={() => {
                      setGridContextMenu(null);
                      dimension('row', false);
                    }}
                  >
                    <BetweenHorizontalStart size={15} />
                    Insert row above
                  </button>
                  <button
                    type="button"
                    className="flex w-full items-center gap-2 rounded-lg px-3 py-1.5 hover:bg-slate-100 dark:hover:bg-slate-800"
                    onClick={() => {
                      setGridContextMenu(null);
                      dimension('column', false);
                    }}
                  >
                    <BetweenVerticalStart size={15} />
                    Insert column left
                  </button>
                  <button
                    type="button"
                    className="flex w-full items-center gap-2 rounded-lg px-3 py-1.5 text-red-600 hover:bg-red-50 dark:hover:bg-red-950/40"
                    onClick={() => {
                      setGridContextMenu(null);
                      if (window.confirm('Delete the selected rows?')) dimension('row', true);
                    }}
                  >
                    <Rows2 size={15} />
                    Delete row(s)
                  </button>
                  <button
                    type="button"
                    className="flex w-full items-center gap-2 rounded-lg px-3 py-1.5 text-red-600 hover:bg-red-50 dark:hover:bg-red-950/40"
                    onClick={() => {
                      setGridContextMenu(null);
                      if (window.confirm('Delete the selected columns?')) dimension('column', true);
                    }}
                  >
                    <Columns2 size={15} />
                    Delete column(s)
                  </button>
                </>
              )}
            </div>
          </>
        )}

        {showLeaveConfirmModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 p-4 backdrop-blur-xs">
            <div className="w-full max-w-sm rounded-2xl border border-slate-200 bg-white p-5 shadow-2xl dark:border-slate-800 dark:bg-slate-900">
              <div className="flex items-center gap-3 text-amber-600 dark:text-amber-400">
                <AlertTriangle size={24} />
                <h4 className="text-base font-bold text-slate-900 dark:text-white">
                  Unsaved changes
                </h4>
              </div>
              <p className="mt-2.5 text-sm text-slate-600 dark:text-slate-300">
                You have unsaved changes in{' '}
                <strong className="font-semibold text-slate-900 dark:text-white">
                  “{book?.name}”
                </strong>
                . If you leave now, your recent edits will be lost.
              </p>
              <div className="mt-5 flex items-center justify-end gap-2">
                <button
                  type="button"
                  className={button}
                  onClick={() => setShowLeaveConfirmModal(false)}
                >
                  Keep editing
                </button>
                <button
                  type="button"
                  className="rounded-lg bg-red-600 px-3.5 py-2 text-xs font-semibold text-white shadow-xs hover:bg-red-700"
                  onClick={performLeave}
                >
                  Discard & Leave
                </button>
              </div>
            </div>
          </div>
        )}

        {showTemplateModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 p-4 backdrop-blur-xs">
            <div className="flex max-h-[85vh] w-full max-w-2xl flex-col rounded-2xl border border-slate-200 bg-white shadow-2xl dark:border-slate-800 dark:bg-slate-900">
              <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4 dark:border-slate-800">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300">
                    <FileSpreadsheet size={20} />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-slate-900 dark:text-white">
                      Add template sheets
                    </h3>
                    <p className="text-xs text-slate-500">
                      Choose an operational template to append its pre-structured sheets to this
                      workbook.
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-800 dark:hover:text-slate-200"
                  onClick={() => setShowTemplateModal(false)}
                >
                  <X size={18} />
                </button>
              </div>

              <div className="grid max-h-[60vh] gap-3 overflow-y-auto p-6 sm:grid-cols-2">
                {workbookTemplates.map((t, index) => {
                  const sheetsCount = t.sheets.length;
                  const sheetNames = t.sheets.map((s) => s[0]).join(', ');
                  return (
                    <div
                      key={t.name}
                      className="flex flex-col justify-between rounded-xl border border-slate-200 bg-slate-50/50 p-4 transition-all hover:border-emerald-500 hover:bg-emerald-50/20 dark:border-slate-800 dark:bg-slate-800/40 dark:hover:border-emerald-600"
                    >
                      <div>
                        <h4 className="text-sm font-bold text-slate-900 dark:text-white">
                          {t.name}
                        </h4>
                        <p className="mt-1 text-xs text-slate-500 dark:text-slate-400 line-clamp-2">
                          {t.description}
                        </p>
                        <div className="mt-2.5 flex flex-wrap items-center gap-1.5">
                          <span className="rounded-full bg-slate-200 px-2 py-0.5 text-[10px] font-semibold text-slate-700 dark:bg-slate-700 dark:text-slate-300">
                            {sheetsCount} {sheetsCount === 1 ? 'sheet' : 'sheets'}
                          </span>
                          <span
                            className="truncate text-[11px] text-slate-500 dark:text-slate-400"
                            title={sheetNames}
                          >
                            {sheetNames}
                          </span>
                        </div>
                      </div>
                      <button
                        type="button"
                        className="mt-4 flex w-full items-center justify-center gap-1.5 rounded-lg bg-emerald-600 px-3 py-2 text-xs font-semibold text-white shadow-xs hover:bg-emerald-700 disabled:opacity-50"
                        disabled={book.sheets.length + sheetsCount > 30}
                        onClick={() => {
                          const template = newWorkbook(index);
                          if (book.sheets.length + template.sheets.length > 30) {
                            setError('A workbook can contain up to 30 sheets.');
                            return;
                          }
                          const names = new Set(book.sheets.map((s) => s.name.toLowerCase()));
                          for (const s of template.sheets) {
                            const base = s.name;
                            let n = 2;
                            while (names.has(s.name.toLowerCase()))
                              s.name = `${base.slice(0, 25)} (${n++})`;
                            names.add(s.name.toLowerCase());
                          }
                          commit({ ...book, sheets: [...book.sheets, ...template.sheets] });
                          setSheetIndex(book.sheets.length);
                          setAnchor({ r: 0, c: 0 });
                          setEnd({ r: 0, c: 0 });
                          setShowTemplateModal(false);
                        }}
                      >
                        <Plus size={14} />
                        Add sheets
                      </button>
                    </div>
                  );
                })}
              </div>

              <div className="flex items-center justify-between border-t border-slate-200 px-6 py-3 dark:border-slate-800">
                <span className="text-xs text-slate-500">
                  Current sheets: {book.sheets.length} / 30 max
                </span>
                <button
                  type="button"
                  className={button}
                  onClick={() => setShowTemplateModal(false)}
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        )}
      </fieldset>
    </section>
  );
}
