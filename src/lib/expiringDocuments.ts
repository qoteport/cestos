export function normalizeExpiringDocument(row: Record<string, any>): Record<string, any> {
  return { ...row, ...(row.document || {}) };
}
