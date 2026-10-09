import {imageMime,assetUrl,type WorkbookAsset} from './workbookMedia';
import {calculateSheet,translateFormula} from './workbookFormulas';
import type { FieldSheet, CellRange } from './fieldWorkbook';
import { displayCellValue } from './workbookCellTypes';

export type FillMode = 'copy' | 'series' | 'days' | 'weekdays' | 'months' | 'years' | 'auto';

interface ParsedDate {
  type: 'iso' | 'slash_ymd' | 'slash_mdy' | 'iso_time';
  date: Date;
  raw: string;
}

function parseSmartDate(str: string): ParsedDate | null {
  if (!str || typeof str !== 'string' || str.startsWith('=')) return null;
  const s = str.trim();

  // ISO YYYY-MM-DD
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) {
    const t = Date.parse(s + 'T00:00:00Z');
    if (Number.isFinite(t)) {
      const d = new Date(t);
      if (d.toISOString().slice(0, 10) === s) return { type: 'iso', date: d, raw: s };
    }
  }

  // ISO YYYY-MM-DD HH:mm or HH:mm:ss
  const isoTimeMatch = s.match(/^(\d{4}-\d{2}-\d{2})[ T](\d{2}:\d{2}(?::\d{2})?)$/);
  if (isoTimeMatch) {
    const t = Date.parse(isoTimeMatch[1] + 'T' + isoTimeMatch[2] + 'Z');
    if (Number.isFinite(t)) {
      return { type: 'iso_time', date: new Date(t), raw: s };
    }
  }

  // YYYY/MM/DD
  if (/^\d{4}\/\d{2}\/\d{2}$/.test(s)) {
    const iso = s.replace(/\//g, '-');
    const t = Date.parse(iso + 'T00:00:00Z');
    if (Number.isFinite(t)) return { type: 'slash_ymd', date: new Date(t), raw: s };
  }

  // MM/DD/YYYY
  const mdyMatch = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (mdyMatch) {
    const [, m, d, y] = mdyMatch;
    const iso = `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`;
    const t = Date.parse(iso + 'T00:00:00Z');
    if (Number.isFinite(t)) return { type: 'slash_mdy', date: new Date(t), raw: s };
  }

  return null;
}

function formatSmartDate(parsed: ParsedDate, targetDate: Date): string {
  const y = targetDate.getUTCFullYear();
  const m = String(targetDate.getUTCMonth() + 1).padStart(2, '0');
  const d = String(targetDate.getUTCDate()).padStart(2, '0');

  if (parsed.type === 'iso') {
    return `${y}-${m}-${d}`;
  }
  if (parsed.type === 'slash_ymd') {
    return `${y}/${m}/${d}`;
  }
  if (parsed.type === 'slash_mdy') {
    const parts = parsed.raw.split('/');
    const origM = parts[0];
    const origD = parts[1];
    const padM = origM.length === 2 ? m : String(targetDate.getUTCMonth() + 1);
    const padD = origD.length === 2 ? d : String(targetDate.getUTCDate());
    return `${padM}/${padD}/${y}`;
  }
  if (parsed.type === 'iso_time') {
    const timePart = parsed.raw.split(/[ T]/)[1] || '00:00';
    return `${y}-${m}-${d} ${timePart}`;
  }
  return `${y}-${m}-${d}`;
}

function addWeekdays(startDate: Date, count: number): Date {
  const d = new Date(startDate.getTime());
  let added = 0;
  const step = count >= 0 ? 1 : -1;
  const target = Math.abs(count);
  while (added < target) {
    d.setUTCDate(d.getUTCDate() + step);
    const day = d.getUTCDay();
    if (day !== 0 && day !== 6) {
      added++;
    }
  }
  return d;
}

function addMonths(startDate: Date, count: number): Date {
  const d = new Date(startDate.getTime());
  const origDay = d.getUTCDate();
  d.setUTCMonth(d.getUTCMonth() + count);
  if (d.getUTCDate() !== origDay) {
    d.setUTCDate(0);
  }
  return d;
}

function addYears(startDate: Date, count: number): Date {
  const d = new Date(startDate.getTime());
  const origDay = d.getUTCDate();
  d.setUTCFullYear(d.getUTCFullYear() + count);
  if (d.getUTCDate() !== origDay) {
    d.setUTCDate(0);
  }
  return d;
}

interface ParsedTextNumber {
  prefix: string;
  num: number;
  padLen: number;
  suffix: string;
}

function parseTextNumber(str: string): ParsedTextNumber | null {
  if (!str || typeof str !== 'string' || str.startsWith('=')) return null;
  let match = str.match(/^()(-?\d+)(\D*)$/);
  if (!match) {
    match = str.match(/^(.*?)(\d+)(\D*)$/);
  }
  if (!match) return null;
  const [, prefix, numStr, suffix] = match;
  const num = parseInt(numStr, 10);
  if (isNaN(num)) return null;
  const padLen =
    numStr.startsWith('-') ? 0 : numStr.length > 1 && numStr.startsWith('0') ? numStr.length : 0;
  return { prefix, num, padLen, suffix };
}

function formatTextNumber(parsed: ParsedTextNumber, nextNum: number): string {
  let numStr = String(nextNum);
  if (parsed.padLen > 0 && nextNum >= 0) {
    numStr = numStr.padStart(parsed.padLen, '0');
  }
  return `${parsed.prefix}${numStr}${parsed.suffix}`;
}

interface ParsedCyclicName {
  list: string[];
  index: number;
  casing: 'lower' | 'upper' | 'title';
}

function parseCyclicName(str: string): ParsedCyclicName | null {
  if (!str || typeof str !== 'string' || str.startsWith('=')) return null;
  const s = str.trim();
  const lower = s.toLowerCase();

  const dayShort = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'];
  const dayFull = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
  const monthShort = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec'];
  const monthFull = [
    'january',
    'february',
    'march',
    'april',
    'may',
    'june',
    'july',
    'august',
    'september',
    'october',
    'november',
    'december',
  ];

  const lists = [
    { raw: ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'], keys: dayShort },
    { raw: ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'], keys: dayFull },
    { raw: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'], keys: monthShort },
    {
      raw: ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'],
      keys: monthFull,
    },
  ];

  for (const item of lists) {
    const idx = item.keys.indexOf(lower);
    if (idx !== -1) {
      let casing: 'lower' | 'upper' | 'title' = 'title';
      if (s === s.toLowerCase()) casing = 'lower';
      else if (s === s.toUpperCase()) casing = 'upper';
      return { list: item.raw, index: idx, casing };
    }
  }

  return null;
}

function formatCyclicName(parsed: ParsedCyclicName, stepOffset: number): string {
  const len = parsed.list.length;
  const targetIdx = ((parsed.index + stepOffset) % len + len) % len;
  const val = parsed.list[targetIdx];
  if (parsed.casing === 'lower') return val.toLowerCase();
  if (parsed.casing === 'upper') return val.toUpperCase();
  return val;
}

export function computeSmartSeriesValue(
  first: string,
  second: string | undefined,
  offset: number,
  mode: FillMode = 'auto'
): string {
  if (mode === 'copy') return first;

  const numeric = /^-?\d+(\.\d+)?$/;
  const isFirstNum = numeric.test(first);
  const isSecondNum = second !== undefined && numeric.test(second);

  const date1 = parseSmartDate(first);
  const date2 = second !== undefined ? parseSmartDate(second) : null;

  // Specific Date Modes (days, weekdays, months, years)
  if (mode === 'days' || mode === 'weekdays' || mode === 'months' || mode === 'years') {
    if (date1) {
      if (mode === 'days') {
        if (date2) {
          const diffMs = date2.date.getTime() - date1.date.getTime();
          const target = new Date(date1.date.getTime() + diffMs * offset);
          return formatSmartDate(date1, target);
        }
        const target = new Date(date1.date.getTime() + 86400000 * offset);
        return formatSmartDate(date1, target);
      }
      if (mode === 'weekdays') {
        let stepCount = 1;
        if (date2) {
          // Approximate weekday step difference
          const diffDays = Math.round((date2.date.getTime() - date1.date.getTime()) / 86400000);
          if (diffDays !== 0) stepCount = diffDays;
        }
        const target = addWeekdays(date1.date, stepCount * offset);
        return formatSmartDate(date1, target);
      }
      if (mode === 'months') {
        let stepMonths = 1;
        if (date2) {
          const m1 = date1.date.getUTCFullYear() * 12 + date1.date.getUTCMonth();
          const m2 = date2.date.getUTCFullYear() * 12 + date2.date.getUTCMonth();
          if (m2 - m1 !== 0) stepMonths = m2 - m1;
        }
        const target = addMonths(date1.date, stepMonths * offset);
        return formatSmartDate(date1, target);
      }
      if (mode === 'years') {
        let stepYears = 1;
        if (date2) {
          const y1 = date1.date.getUTCFullYear();
          const y2 = date2.date.getUTCFullYear();
          if (y2 - y1 !== 0) stepYears = y2 - y1;
        }
        const target = addYears(date1.date, stepYears * offset);
        return formatSmartDate(date1, target);
      }
    }
  }

  // Auto / Series mode
  // 1. Pure numbers
  if (isFirstNum && isSecondNum) {
    const step = Number(second) - Number(first);
    return String(Number((Number(first) + step * offset).toFixed(10)));
  }
  if (isFirstNum && second === undefined) {
    return String(Number((Number(first) + offset).toFixed(10)));
  }

  // 2. Dates
  if (date1 && date2) {
    const diffMs = date2.date.getTime() - date1.date.getTime();
    const target = new Date(date1.date.getTime() + diffMs * offset);
    return formatSmartDate(date1, target);
  }
  if (date1 && second === undefined) {
    const target = new Date(date1.date.getTime() + 86400000 * offset);
    return formatSmartDate(date1, target);
  }

  // 3. Cyclic day/month names (Mon, Tue / Jan, Feb)
  const cyc1 = parseCyclicName(first);
  const cyc2 = second !== undefined ? parseCyclicName(second) : null;
  if (cyc1) {
    if (cyc2 && cyc1.list === cyc2.list) {
      const step = cyc2.index - cyc1.index;
      return formatCyclicName(cyc1, step * offset);
    }
    return formatCyclicName(cyc1, offset);
  }

  // 4. Text + Number patterns (WO-001, Task 1, Q1)
  const txt1 = parseTextNumber(first);
  const txt2 = second !== undefined ? parseTextNumber(second) : null;
  if (txt1) {
    if (txt2 && txt1.prefix === txt2.prefix && txt1.suffix === txt2.suffix) {
      const step = txt2.num - txt1.num;
      return formatTextNumber(txt1, txt1.num + step * offset);
    }
    return formatTextNumber(txt1, txt1.num + offset);
  }

  // Fallback to null when no series pattern matches
  return null;
}

export function autofillRange(
  sheet: FieldSheet,
  range: CellRange,
  direction: 'down' | 'right',
  modeArg: boolean | FillMode = false
): FieldSheet {
  if (
    sheet.merges.some(
      (m) => !(m.er < range.r || m.r > range.er || m.ec < range.c || m.c > range.ec)
    )
  )
    throw new Error('Unmerge this selection before filling it.');

  const fillMode: FillMode =
    typeof modeArg === 'boolean' ? (modeArg ? 'series' : 'copy') : modeArg;

  const next = {
    ...sheet,
    cells: sheet.cells.map((row) => [...row]),
    formats: { ...sheet.formats },
    media: { ...sheet.media },
  };
  const length = direction === 'down' ? range.er - range.r + 1 : range.ec - range.c + 1;
  const lanes = direction === 'down' ? range.ec - range.c + 1 : range.er - range.r + 1;
  if (length < 2) throw new Error('Select at least two cells in the fill direction.');

  for (let lane = 0; lane < lanes; lane++) {
    const position = (offset: number) =>
      direction === 'down'
        ? [range.r + offset, range.c + lane]
        : [range.r + lane, range.c + offset];

    const [r, c] = position(0);
    const [r2, c2] = position(1);

    const first = sheet.cells[r][c];
    const second = sheet.cells[r2]?.[c2];

    const numeric = /^-?\d+(\.\d+)?$/;
    const datePattern = /^\d{4}-\d{2}-\d{2}$/;
    const isNumber = numeric.test(first) && numeric.test(second || '');
    const date1 = parseSmartDate(first);
    const date2 = parseSmartDate(second || '');
    const isDate = !!(date1 && date2);
    const txt1 = parseTextNumber(first);
    const cyc1 = parseCyclicName(first);

    const hasTwoSeedPattern = isNumber || isDate || !!(txt1 && parseTextNumber(second || '')) || !!(cyc1 && parseCyclicName(second || ''));
    const hasSingleSeedPattern = isNumber || !!date1 || !!txt1 || !!cyc1;

    const useTwoSeeds = fillMode !== 'copy' && hasTwoSeedPattern && length >= 3;
    const startIndex = useTwoSeeds ? 2 : 1;

    if (fillMode !== 'copy' && !hasSingleSeedPattern && (!hasTwoSeedPattern || length < 3)) {
      throw new Error(
        'Select starting numbers, dates, or structured text to fill a series.'
      );
    }

    for (let index = startIndex; index < length; index++) {
      const [tr, tc] = position(index);
      if (fillMode === 'copy') {
        next.cells[tr][tc] = translateFormula(first, tr - r, tc - c);
      } else {
        const secondVal = useTwoSeeds ? second : undefined;
        const offset = useTwoSeeds ? index : index;
        next.cells[tr][tc] = computeSmartSeriesValue(first, secondVal, offset, fillMode) ?? first;
      }

      if (sheet.media?.[`${r}:${c}`]) next.media[`${tr}:${tc}`] = [...sheet.media[`${r}:${c}`]];
      else delete next.media[`${tr}:${tc}`];

      if (sheet.formats?.[`${r}:${c}`])
        next.formats[`${tr}:${tc}`] = { ...sheet.formats[`${r}:${c}`] };
      else delete next.formats[`${tr}:${tc}`];
    }
  }
  return next;
}
export function commonColumnValues(
  sheets: FieldSheet[],
  heading: string,
  current: FieldSheet,
  column: number
): string[] {
  const normalized = heading.trim().toLowerCase();
  const counts = new Map<string, number>();
  for (const sheet of [current, ...sheets.filter((sheet) => sheet.id !== current.id)]) {
    const c =
      sheet === current
        ? column
        : normalized
          ? (sheet.cells[0]?.findIndex((value) => value.trim().toLowerCase() === normalized) ?? -1)
          : -1;
    if (c < 0) continue;
    for (const row of sheet.cells.slice(1)) {
      const value = row[c]?.trim();
      if (value && value.length <= 200) counts.set(value, (counts.get(value) || 0) + 1);
    }
  }
  return [...counts]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 50)
    .map(([value]) => value);
}
const escape = (value: string) =>
  value.replace(
    /[&<>"']/g,
    (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char]!
  );
export function printableSheetHtml(sheet: FieldSheet, workbookName: string, assets:Record<string,WorkbookAsset>={}): string {
  if (sheet.previewLimited)
    throw new Error('This sheet is partially loaded. Export Excel to print every row.');
  const area=sheet.print?.area || {r:0,c:0,er:sheet.cells.length-1,ec:sheet.widths.length-1};
  if(area.r<0 || area.c<0 || area.er>=sheet.cells.length || area.ec>=sheet.widths.length)throw new Error('Reset the print area after changing sheet dimensions.');
  for(const m of sheet.merges)if(!(m.er<area.r||m.r>area.er||m.ec<area.c||m.c>area.ec) && (m.r<area.r||m.c<area.c||m.er>area.er||m.ec>area.ec))throw new Error('The print area cuts through a merged cell. Select the complete merged area.');
  const computed=calculateSheet(sheet), repeat=sheet.print?.repeatRows || 0;
  const widths=sheet.widths.slice(area.c,area.ec+1),total=widths.reduce((a,b)=>a+b,0)||1;
  const rows=sheet.cells.map((_,r)=>r).filter(r=>r>=area.r&&r<=area.er&&sheet.heights[r]!==0&&(!sheet.view?.filterText||r===0||computed[r][sheet.view.filterColumn||0].toLowerCase().includes(sheet.view.filterText.toLowerCase())));
  const rowHtml=(r:number)=>`<tr style="height:${sheet.heights[r]}px">${sheet.cells[r].slice(area.c,area.ec+1).map((_,offset)=>{
    const c=area.c+offset;if(!sheet.widths[c])return '';
    const m=sheet.merges.find(m=>r>=m.r&&r<=m.er&&c>=m.c&&c<=m.ec);if(m&&(r!==m.r||c!==m.c))return '';
    const f={bold:!sheet.imported&&r===0,...sheet.formats?.[`${r}:${c}`]};
    const css=`font-weight:${f.bold?'bold':'normal'};font-style:${f.italic?'italic':'normal'};text-align:${['left','center','right'].includes(f.align||'')?f.align:'left'};color:${/^#[0-9a-f]{6}$/i.test(f.color||'')?f.color:'#000'};background:${/^#[0-9a-f]{6}$/i.test(f.background||'')?f.background:'#fff'};`;
    return `<td ${m?`rowspan="${m.er-m.r+1}" colspan="${m.ec-m.c+1}"`:''} style="${css}">${escape(displayCellValue(computed[r][c],f))||'&nbsp;'}${(sheet.media?.[`${r}:${c}`]||[]).map(id=>assets[id]).filter(Boolean).map(a=>imageMime(a.mime)?`<img src="${assetUrl(a)}" alt="${escape(a.name)}" style="display:block;max-width:100%;max-height:120px">`:`<div>${escape(a.name)}</div>`).join('')}</td>`;
  }).join('')}</tr>`;
  const breaks=(sheet.print?.breakRows||[]).filter(r=>r>area.r&&r<=area.er);
  if(sheet.merges.some(m=>breaks.some(r=>m.r<r&&m.er>=r)|| (m.r<area.r+repeat&&m.er>=area.r+repeat)))throw new Error('A page break or repeated-header boundary crosses a merged cell. Adjust print setup.');
  const headings=rows.filter(r=>r<area.r+repeat),body=rows.filter(r=>r>=area.r+repeat);
  const sections:number[][]=[[]];for(const r of body){if(breaks.includes(r)&&sections.at(-1)!.length)sections.push([]);sections.at(-1)!.push(r);}
  const fit=sheet.print?.fit!=='actual';
  const tables=sections.map((section,index)=>`<table style="${index?'break-before:page;':''}width:${fit?'100%':total+'px'}"><colgroup>${widths.map(w=>`<col style="width:${fit?100*w/total+'%':w+'px'};${w===0?'display:none':''}">`).join('')}</colgroup>${headings.length?`<thead>${headings.map(rowHtml).join('')}</thead>`:''}<tbody>${section.map(rowHtml).join('')}</tbody></table>`).join('');
  return `<!doctype html><html><head><meta charset="utf-8"><title>${escape(workbookName+' — '+sheet.name)}</title><style>@page{size:${sheet.print?.orientation==='portrait'?'portrait':'landscape'};margin:12mm}body{font:11px Arial;color:#000}h1{font-size:16px}table{border-collapse:collapse;table-layout:fixed}thead{display:table-header-group}td{border:1px solid #777;padding:4px;white-space:pre-wrap;overflow-wrap:anywhere;vertical-align:middle;print-color-adjust:exact}tr{break-inside:avoid}</style></head><body><h1>${escape(workbookName)} — ${escape(sheet.name)}</h1>${tables}</body></html>`;
}
export function printSheet(sheet: FieldSheet, workbookName: string, assets:Record<string,WorkbookAsset>={}) {
  const html = printableSheetHtml(sheet, workbookName,assets);
  const frame = document.createElement('iframe');
  frame.title = 'Print active worksheet';
  frame.style.cssText = 'position:fixed;width:0;height:0;border:0';
  frame.onload = () => {
    frame.contentWindow?.focus();
    frame.contentWindow?.print();
  };
  frame.srcdoc = html;
  document.body.appendChild(frame);
  const remove = () => frame.remove();
  frame.contentWindow?.addEventListener('afterprint', remove, { once: true });
  window.setTimeout(remove, 120000);
}

/** Extend a seed block, preserving it and copying styles; smart series supports dates, numbers, text patterns. */
export function dragFill(
  sheet: FieldSheet,
  seed: CellRange,
  target: CellRange,
  vertical: boolean,
  copyOnly = false,
  mode: FillMode = 'auto'
): FieldSheet {
  if (target.r < 0 || target.c < 0 || target.er >= sheet.cells.length || target.ec >= sheet.widths.length)
    throw new Error('Fill must stay within the sheet.');
  if (sheet.merges.some(m => !(m.er < target.r || m.r > target.er || m.ec < target.c || m.c > target.ec)))
    throw new Error('Unmerge these cells before using autofill.');
  const next = {...sheet, cells: sheet.cells.map(row => [...row]), formats: {...sheet.formats}, media:{...sheet.media}};
  const length = vertical ? seed.er-seed.r+1 : seed.ec-seed.c+1;

  for (let r=target.r;r<=target.er;r++) for (let c=target.c;c<=target.ec;c++) {
    if (r>=seed.r && r<=seed.er && c>=seed.c && c<=seed.ec) continue;
    const offset = vertical ? r-seed.r : c-seed.c;
    const cycle = ((offset % length)+length)%length;
    const sr = vertical ? seed.r+cycle : r, sc = vertical ? c : seed.c+cycle;
    let value = sheet.cells[sr][sc];

    if (!copyOnly) {
      let seriesVal: string | null = null;
      if (length === 2) {
        const first = sheet.cells[seed.r + (vertical ? 0 : r - seed.r)][seed.c + (vertical ? c - seed.c : 0)];
        const second = sheet.cells[seed.r + (vertical ? 1 : r - seed.r)][seed.c + (vertical ? c - seed.c : 1)];
        seriesVal = computeSmartSeriesValue(first, second, offset, mode === 'copy' ? 'copy' : (mode === 'auto' ? 'series' : mode));
      } else if (length === 1) {
        const first = sheet.cells[seed.r + (vertical ? 0 : r - seed.r)][seed.c + (vertical ? c - seed.c : 0)];
        seriesVal = computeSmartSeriesValue(first, undefined, offset, mode === 'copy' ? 'copy' : (mode === 'auto' ? 'series' : mode));
      }
      if (seriesVal !== null) {
        value = seriesVal;
      }
    }

    next.cells[r][c] = translateFormula(value, r - sr, c - sc);
    if(sheet.media?.[`${sr}:${sc}`]) next.media[`${r}:${c}`] = [...sheet.media[`${sr}:${sc}`]]; else delete next.media[`${r}:${c}`];
    const format = sheet.formats?.[`${sr}:${sc}`];
    if(format) next.formats[`${r}:${c}`] = {...format}; else delete next.formats[`${r}:${c}`];
  }
  return next;
}

