/** Turn stored enum/code values into readable UI text without changing the value. */
export function formatCodeLabel(value: unknown, fallback = '—'): string {
  if (value === null || value === undefined || value === '') return fallback;
  return String(value).replace(/_+/g, ' ').replace(/\s+/g, ' ').trim();
}
