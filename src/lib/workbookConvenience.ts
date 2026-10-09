import {imageMime,assetUrl,type WorkbookAsset} from './workbookMedia';
import {calculateSheet,translateFormula} from './workbookFormulas';
import type { FieldSheet, CellRange } from './fieldWorkbook';
import { displayCellValue } from './workbookCellTypes';

export function autofillRange(
  sheet: FieldSheet,
  range: CellRange,
  direction: 'down' | 'right',
  series = false
): FieldSheet {
  if (
    sheet.merges.some(
      (m) => !(m.er < range.r || m.r > range.er || m.ec < range.c || m.c > range.ec)
    )
  )
    throw new Error('Unmerge this selection before filling it.');
  const next = {
    ...sheet,
    cells: sheet.cells.map((row) => [...row]),
    formats: { ...sheet.formats },
    media:{...sheet.media},
  };
  const length = direction === 'down' ? range.er - range.r + 1 : range.ec - range.c + 1;
  const lanes = direction === 'down' ? range.ec - range.c + 1 : range.er - range.r + 1;
  if (length < 2) throw new Error('Select at least two cells in the fill direction.');
  for (let lane = 0; lane < lanes; lane++) {
    const position = (offset: number) =>
      direction === 'down'
        ? [range.r + offset, range.c + lane]
        : [range.r + lane, range.c + offset];
    const [r, c] = position(0),
      [r2, c2] = position(1);
    const first = sheet.cells[r][c],
      second = sheet.cells[r2][c2];
    const numeric = /^-?\d+(\.\d+)?$/;
    const date = /^\d{4}-\d{2}-\d{2}$/;
    const isNumber = numeric.test(first) && numeric.test(second);
    const date1 = Date.parse(first + 'T00:00:00Z'),
      date2 = Date.parse(second + 'T00:00:00Z');
    const isDate =
      date.test(first) &&
      date.test(second) &&
      Number.isFinite(date1) &&
      Number.isFinite(date2) &&
      new Date(date1).toISOString().slice(0, 10) === first &&
      new Date(date2).toISOString().slice(0, 10) === second;
    if (series && ((!isNumber && !isDate) || length < 3))
      throw new Error(
        'Select two starting numbers or ISO dates (YYYY-MM-DD), followed by the cells to fill.'
      );
    for (let index = series ? 2 : 1; index < length; index++) {
      const [tr, tc] = position(index);
      next.cells[tr][tc] = series
        ? isNumber
          ? String(Number((Number(first) + (Number(second) - Number(first)) * index).toFixed(10)))
          : new Date(date1 + (date2 - date1) * index).toISOString().slice(0, 10)
        : translateFormula(first,tr-r,tc-c);
      if(sheet.media?.[`${r}:${c}`])next.media[`${tr}:${tc}`]=[...sheet.media[`${r}:${c}`]];else delete next.media[`${tr}:${tc}`];
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

/** Extend a seed block, preserving it and copying styles; two numeric/date seeds form a series. */
export function dragFill(sheet: FieldSheet, seed: CellRange, target: CellRange, vertical: boolean, copyOnly = false): FieldSheet {
  if (target.r < 0 || target.c < 0 || target.er >= sheet.cells.length || target.ec >= sheet.widths.length)
    throw new Error('Fill must stay within the sheet.');
  if (sheet.merges.some(m => !(m.er < target.r || m.r > target.er || m.ec < target.c || m.c > target.ec)))
    throw new Error('Unmerge these cells before using autofill.');
  const next = {...sheet, cells: sheet.cells.map(row => [...row]), formats: {...sheet.formats},media:{...sheet.media}};
  const length = vertical ? seed.er-seed.r+1 : seed.ec-seed.c+1;
  for (let r=target.r;r<=target.er;r++) for (let c=target.c;c<=target.ec;c++) {
    if (r>=seed.r && r<=seed.er && c>=seed.c && c<=seed.ec) continue;
    const offset = vertical ? r-seed.r : c-seed.c;
    const cycle = ((offset % length)+length)%length;
    const sr = vertical ? seed.r+cycle : r, sc = vertical ? c : seed.c+cycle;
    let value = sheet.cells[sr][sc];
    if (!copyOnly && length === 2) {
      const first = sheet.cells[seed.r+(vertical?0:r-seed.r)][seed.c+(vertical?c-seed.c:0)];
      const second = sheet.cells[seed.r+(vertical?1:r-seed.r)][seed.c+(vertical?c-seed.c:1)];
      if (/^-?\d+(\.\d+)?$/.test(first) && /^-?\d+(\.\d+)?$/.test(second))
        value = String(Number((Number(first)+(Number(second)-Number(first))*offset).toFixed(10)));
      else if (/^\d{4}-\d{2}-\d{2}$/.test(first) && /^\d{4}-\d{2}-\d{2}$/.test(second)) {
        const a=Date.parse(first+'T00:00:00Z'), b=Date.parse(second+'T00:00:00Z');
        if (Number.isFinite(a) && Number.isFinite(b) && new Date(a).toISOString().slice(0,10)===first && new Date(b).toISOString().slice(0,10)===second)
          value = new Date(a+(b-a)*offset).toISOString().slice(0,10);
      }
    }
    next.cells[r][c]=translateFormula(value,r-sr,c-sc);
    if(sheet.media?.[`${sr}:${sc}`])next.media[`${r}:${c}`]=[...sheet.media[`${sr}:${sc}`]];else delete next.media[`${r}:${c}`];
    const format=sheet.formats?.[`${sr}:${sc}`];
    if(format) next.formats[`${r}:${c}`]={...format}; else delete next.formats[`${r}:${c}`];
  }
  return next;
}
