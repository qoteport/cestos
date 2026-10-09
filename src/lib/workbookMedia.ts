import type { FieldWorkbook, FieldSheet } from './fieldWorkbook';
export type WorkbookAsset = { id: string; name: string; mime: string; size: number; data: string };
export type SheetFolder = { id: string; name: string };
export const FILE_LIMIT = 8 * 1024 * 1024,
  MEDIA_LIMIT = 20 * 1024 * 1024;
export const imageMime = (mime: string) =>
  ['image/png', 'image/jpeg', 'image/gif', 'image/webp'].includes(mime);
export const videoMime = (mime: string) => ['video/mp4', 'video/webm', 'video/ogg'].includes(mime);
export function assetUrl(asset: WorkbookAsset) {
  return `data:${imageMime(asset.mime) || videoMime(asset.mime) ? asset.mime : 'application/octet-stream'};base64,${asset.data}`;
}
export function pruneAssets(book: FieldWorkbook): FieldWorkbook {
  if (!book.assets) return book;
  const used = new Set(book.sheets.flatMap((s) => Object.values(s.media || {}).flat()));
  return {
    ...book,
    assets: Object.fromEntries(Object.entries(book.assets).filter(([id]) => used.has(id))),
  };
}
export async function readWorkbookAsset(file: File): Promise<WorkbookAsset> {
  if (!file.size || file.size > FILE_LIMIT) throw Error('Choose a nonempty file up to 8 MB.');
  const bytes = new Uint8Array(await file.arrayBuffer());
  let binary = '';
  for (let i = 0; i < bytes.length; i += 32768)
    binary += String.fromCharCode(...bytes.subarray(i, i + 32768));
  return {
    id: crypto.randomUUID(),
    name: file.name.slice(0, 250),
    mime: imageMime(file.type) || videoMime(file.type) ? file.type : 'application/octet-stream',
    size: file.size,
    data: btoa(binary),
  };
}
export function insertMedia(
  book: FieldWorkbook,
  sheetId: string,
  r: number,
  c: number,
  files: WorkbookAsset[]
): FieldWorkbook {
  const next = pruneAssets(book),
    sheet = next.sheets.find((s) => s.id === sheetId);
  if (!sheet || !sheet.cells[r] || c < 0 || c >= sheet.widths.length)
    throw Error('Select a valid cell.');
  const merge = sheet.merges.find((m) => r >= m.r && r <= m.er && c >= m.c && c <= m.ec);
  if (merge) {
    r = merge.r;
    c = merge.c;
  }
  const key = `${r}:${c}`,
    ids = [...(sheet.media?.[key] || []), ...files.map((f) => f.id)];
  if (ids.length > 10) throw Error('A cell can hold up to 10 attachments.');
  const assets = { ...next.assets, ...Object.fromEntries(files.map((f) => [f.id, f])) };
  if (Object.values(assets).reduce((n, f) => n + f.size, 0) > MEDIA_LIMIT)
    throw Error('This workbook supports up to 20 MB of attachments.');
  const heights = [...sheet.heights];
  if (files.some((f) => imageMime(f.mime))) heights[r] = Math.max(100, heights[r]);
  return {
    ...next,
    assets,
    sheets: next.sheets.map((s) =>
      s.id === sheetId ? { ...s, heights, media: { ...s.media, [key]: ids } } : s
    ),
  };
}
export function removeMedia(book: FieldWorkbook, sheetId: string, key: string, id: string) {
  return pruneAssets({
    ...book,
    sheets: book.sheets.map((s) =>
      s.id === sheetId
        ? {
            ...s,
            media: Object.fromEntries(
              Object.entries(s.media || {})
                .map(([k, ids]) => [k, k === key ? ids.filter((v) => v !== id) : ids])
                .filter(([, ids]) => ids.length)
            ),
          }
        : s
    ),
  });
}
export function validateMedia(book: FieldWorkbook) {
  const folders = book.folders || [];
  if (!Array.isArray(folders) || folders.length > 50) throw Error('Invalid sheet folders.');
  const names = new Set<string>(),
    ids = new Set<string>();
  for (const f of folders) {
    if (
      !f ||
      typeof f.id !== 'string' ||
      !/^[a-zA-Z0-9_-]{1,100}$/.test(f.id) || f.id==='unfiled' ||
      ids.has(f.id) ||
      typeof f.name !== 'string' ||
      !f.name.trim() ||
      f.name.length > 60 ||
      names.has(f.name.trim().toLowerCase())
    )
      throw Error('Invalid or duplicate sheet folder.');
    ids.add(f.id);
    names.add(f.name.trim().toLowerCase());
  }
  const assets = book.assets || {};
  if (typeof assets !== 'object' || Array.isArray(assets))
    throw Error('Invalid workbook attachments.');
  let total = 0;
  for (const [id, a] of Object.entries(assets)) {
    if (
      !a ||
      id !== a.id || !/^[a-zA-Z0-9_-]{1,100}$/.test(id) ||
      typeof a.name !== 'string' ||
      !a.name ||
      a.name.length > 250 ||
      !Number.isInteger(a.size) ||
      a.size < 1 ||
      a.size > FILE_LIMIT ||
      typeof a.mime !== 'string' ||
      (!imageMime(a.mime) && !videoMime(a.mime) && a.mime !== 'application/octet-stream') ||
      typeof a.data !== 'string' ||
      a.data.length !== Math.ceil(a.size / 3) * 4 ||
      !/^[A-Za-z0-9+/]*={0,2}$/.test(a.data) ||
      (a.data.length / 4) * 3 - (a.data.endsWith('==') ? 2 : a.data.endsWith('=') ? 1 : 0) !==
        a.size
    )
      throw Error('Invalid workbook attachment.');
    total += a.size;
  }
  if (total > MEDIA_LIMIT) throw Error('Workbook attachments exceed 20 MB.');
  for (const s of book.sheets) {
    if (s.folderId && !ids.has(s.folderId)) throw Error('Worksheet folder is missing.');
    if (s.media && (typeof s.media !== 'object' || Array.isArray(s.media)))
      throw Error('Invalid cell attachments.');
    for (const [key, refs] of Object.entries(s.media || {})) {
      const [r, c] = key.split(':').map(Number);
      if (
        !/^\d+:\d+$/.test(key) ||
        r >= s.cells.length ||
        c >= s.widths.length ||
        !Array.isArray(refs) ||
        refs.length > 10 ||
        new Set(refs).size !== refs.length ||
        refs.some(
          (id) => typeof id !== 'string' || !Object.prototype.hasOwnProperty.call(assets, id)
        )
      )
        throw Error('Invalid cell attachment reference.');
    }
  }
}
export function changeFolder(book: FieldWorkbook, id: string, name: string): FieldWorkbook {
  const text = name.trim();
  if (!text || text.length > 60) throw Error('Use a folder name of 1–60 characters.');
  if (book.folders?.some((f) => f.id !== id && f.name.toLowerCase() === text.toLowerCase()))
    throw Error('A folder with this name already exists.');
  return {
    ...book,
    folders: book.folders?.some((f) => f.id === id)
      ? book.folders.map((f) => (f.id === id ? { ...f, name: text } : f))
      : [...(book.folders || []), { id, name: text }],
  };
}
export function removeFolder(book: FieldWorkbook, id: string): FieldWorkbook {
  return {
    ...book,
    folders: book.folders?.filter((f) => f.id !== id),
    sheets: book.sheets.map((s) => (s.folderId === id ? { ...s, folderId: undefined } : s)),
  };
}

export async function attachmentArchive(book: FieldWorkbook): Promise<Blob> {
  const X = await import('xlsx'),
    archive = X.CFB.utils.cfb_new();
  const manifest: { sheet: string; cell: string; file: string }[] = [];
  const clean = (name: string) =>
    name
      .replace(/[^a-zA-Z0-9._ -]/g, '_')
      .replace(/^\.+/, '_')
      .slice(0, 120) || 'file';
  for (const sheet of book.sheets)
    for (const [cell, ids] of Object.entries(sheet.media || {}))
      for (const id of ids) {
        const a = book.assets?.[id];
        if (!a) continue;
        const file = `files/${clean(id)}-${clean(a.name)}`;
        if (!manifest.some((item) => item.file === file))
          X.CFB.utils.cfb_add(
            archive,
            file,
            Uint8Array.from(atob(a.data), (ch) => ch.charCodeAt(0))
          );
        manifest.push({ sheet: sheet.name, cell, file });
      }
  X.CFB.utils.cfb_add(
    archive,
    'attachments.json',
    new TextEncoder().encode(
      JSON.stringify(
        { workbook: book.name, folders: book.folders || [], attachments: manifest },
        null,
        2
      )
    )
  );
  return new Blob([X.CFB.write(archive, { type: 'array', fileType: 'zip' }) as BlobPart], {
    type: 'application/zip',
  });
}
