import type { DeviceWorkbook } from './workbookDevice';
export type LibraryDocument = { id: string; title: string; tags: string[]; created_at: string };
export type LibraryRow = { id: string; name: string; date: string; template: boolean; doc?: LibraryDocument; device?: DeviceWorkbook };

// Older documents have no wb- tag. Their downloaded device copy still records
// the document version, which is a reliable identity link (names are not).
export function workbookLibraryRows(documents: LibraryDocument[], devices: DeviceWorkbook[]): LibraryRow[] {
  const versions = new Map<string, string>();
  for (const device of devices) {
    for (const version of [device.remoteVersion, device.baseVersion]) if (version) versions.set(version, device.book.id);
  }
  const rows = new Map<string, LibraryRow>();
  for (const doc of documents) {
    const id = versions.get(doc.id) || doc.tags.find(tag => tag.startsWith('wb-'))?.slice(3) || `document:${doc.id}`;
    const previous = rows.get(id);
    if (previous && previous.date >= doc.created_at) continue;
    rows.set(id, {id, name:doc.title, date:doc.created_at, template:doc.tags.includes('workbook-template'), doc});
  }
  for (const device of devices) {
    const id = device.book.id;
    rows.set(id, {...rows.get(id), id, name:device.book.name, date:device.savedAt, template:device.book.template, device});
  }
  return [...rows.values()];
}
