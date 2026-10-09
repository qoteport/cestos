import type { CellFormat } from './fieldWorkbook';
export function typedCellValue(value: string, format: CellFormat): string | number | Date | null {
  if (!value) return null;
  if (['number', 'currency', 'percent'].includes(format.dataType || '')) {
    // Do not guess decimal separators or strip identifiers/currency symbols.
    if (!/^[+-]?(?:\d+\.?\d*|\.\d+)(?:[eE][+-]?\d+)?$/.test(value.trim())) return value;
    const number = Number(value);
    return Number.isFinite(number) ? number : value;
  }
  if (format.dataType === 'time' && /^([01]\d|2[0-3]):[0-5]\d(?::[0-5]\d)?$/.test(value)) {
    const [h,m,s=0] = value.split(':').map(Number); return (h*3600+m*60+s)/86400;
  }
  if ((format.dataType === 'date' && /^\d{4}-\d{2}-\d{2}$/.test(value)) ||
      (format.dataType === 'datetime' && /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(?::\d{2})?$/.test(value))) {
    const date = new Date(value + (format.dataType === 'date' ? 'T00:00:00Z' : 'Z'));
    if (Number.isFinite(date.getTime()) && date.toISOString().startsWith(value)) return date;
  }
  return value;
}
export function cellNumberFormat(format: CellFormat): string {
  const digits = Math.max(0, Math.min(6, format.decimals ?? 2));
  const number = '#,##0' + (digits ? '.' + '0'.repeat(digits) : '');
  const separator = ['-', '/', '.'].includes(format.dateSeparator || '') ? format.dateSeparator! : '-';
  const date = (format.dateOrder === 'dmy' ? ['dd','mm','yyyy'] : format.dateOrder === 'mdy' ? ['mm','dd','yyyy'] : ['yyyy','mm','dd']).join(separator);
  const time = 'hh:mm' + (format.showSeconds ? ':ss' : '') + (format.timeClock === '12' ? ' AM/PM' : '');
  switch(format.dataType) {
    case 'text': return '@';
    case 'number': return number;
    case 'currency': return '"' + (['USD','GHS','EUR','GBP','LRD'].includes(format.currency || '') ? format.currency : 'USD') + '" ' + number;
    case 'percent': return '0' + (digits ? '.' + '0'.repeat(digits) : '') + '%';
    case 'date': return date;
    case 'time': return time;
    case 'datetime': return date + ' ' + time;
    default: return 'General';
  }
}
export function displayCellValue(value: string, format: CellFormat): string {
  const parsed = typedCellValue(value, format);
  if (value && ['date','time','datetime'].includes(format.dataType || '') && typeof parsed !== 'string' && parsed !== null) {
    const separator = ['-', '/', '.'].includes(format.dateSeparator || '') ? format.dateSeparator! : '-';
    const datePart = value.slice(0,10).split('-');
    const date = (format.dateOrder === 'dmy' ? [datePart[2],datePart[1],datePart[0]] : format.dateOrder === 'mdy' ? [datePart[1],datePart[2],datePart[0]] : datePart).join(separator);
    const timePart = (format.dataType === 'datetime' ? value.split('T')[1] : value).split(':');
    const hour = Number(timePart[0]);
    const time = `${format.timeClock === '12' ? String(hour % 12 || 12).padStart(2,'0') : timePart[0]}:${timePart[1]}` + (format.showSeconds ? `:${timePart[2] || '00'}` : '') + (format.timeClock === '12' ? (hour >= 12 ? ' PM' : ' AM') : '');
    return format.dataType === 'date' ? date : format.dataType === 'time' ? time : date + ' ' + time;
  }
  if (typeof parsed !== 'number' || !['number','currency','percent'].includes(format.dataType || '')) return value;
  return new Intl.NumberFormat('en-US', {
    style: format.dataType === 'currency' ? 'currency' : format.dataType === 'percent' ? 'percent' : 'decimal',
    currency: ['USD','GHS','EUR','GBP','LRD'].includes(format.currency || '') ? format.currency : 'USD',
    minimumFractionDigits: Math.max(0,Math.min(6,format.decimals ?? 2)),
    maximumFractionDigits: Math.max(0,Math.min(6,format.decimals ?? 2)),
  }).format(parsed);
}
