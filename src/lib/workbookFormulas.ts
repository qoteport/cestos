import type { FieldSheet } from './fieldWorkbook';
export function referencePosition(reference: string) {
  const match = /^\$?([A-Z]+)\$?(\d+)$/i.exec(reference);
  if (!match) throw Error('#REF!');
  let c = 0;
  for (const ch of match[1].toUpperCase()) c = c * 26 + ch.charCodeAt(0) - 64;
  return { r: Number(match[2]) - 1, c: c - 1 };
}
export function calculateSheet(sheet: FieldSheet): string[][] {
  const cache = new Map<string, string>();
  const visiting = new Set<string>();
  let operations = 0;
  const cell = (r: number, c: number): string => {
    if (++operations > 2000000) throw Error('#LIMIT!');
    if (r < 0 || c < 0 || r >= sheet.cells.length || c >= sheet.widths.length) throw Error('#REF!');
    const key = `${r}:${c}`;
    if (cache.has(key)) return cache.get(key)!;
    const raw = sheet.cells[r][c];
    if (!raw.startsWith('=')) return raw;
    if (visiting.has(key)) throw Error('#CYCLE!');
    if (visiting.size > 100) throw Error('#LIMIT!');
    visiting.add(key);
    try {
      const result = evaluate(raw.slice(1), (ref) => {
        const p = referencePosition(ref);
        return cell(p.r, p.c);
      });
      const value = String(Number(result.toFixed(10)));
      cache.set(key, value);
      return value;
    } catch (e) {
      const value = e instanceof Error ? e.message : '#VALUE!';
      cache.set(key, value);
      return value;
    } finally {
      visiting.delete(key);
    }
  };
  return sheet.cells.map((row, r) =>
    row.map((_, c) => {
      try {
        return cell(r, c);
      } catch (e) {
        return e instanceof Error ? e.message : '#VALUE!';
      }
    })
  );
}
function number(value: string): number {
  if (value.startsWith('#')) throw Error(value);
  if (!value.trim()) return 0;
  if (/^\d{1,2}:\d{2}(:\d{2})?$/.test(value)) {
    const [h, m, s = 0] = value.split(':').map(Number);
    return (h * 3600 + m * 60 + s) / 86400;
  }
  if (/^\d{4}-\d{2}-\d{2}(T.*)?$/.test(value)) {
    const n = Date.parse(value.includes('T') ? value + 'Z' : value + 'T00:00:00Z');
    if (Number.isFinite(n)) return n / 86400000 + 25569;
  }
  const n = Number(value);
  if (!Number.isFinite(n)) throw Error('#VALUE!');
  return n;
}
export function evaluate(expression: string, read: (ref: string) => string): number {
  if (expression.includes('#REF!')) throw Error('#REF!');
  if (expression.length > 10000) throw Error('#LIMIT!');
  const tokens =
    expression
      .toUpperCase()
      .match(/\$?[A-Z]+\$?\d+|[A-Z]+|(?:\d+(?:\.\d*)?|\.\d+)|[+\-*/^(),:]/g) || [];
  if (tokens.join('') !== expression.toUpperCase().replace(/\s/g, '')) throw Error('#NAME?');
  let i = 0;
  const scalar = (v: number | number[]) => {
    if (Array.isArray(v)) throw Error('#VALUE!');
    return v;
  };
  const atom = (): number | number[] => {
    const t = tokens[i++];
    if (t === '+' || t === '-') return (t === '-' ? -1 : 1) * scalar(atom());
    if (t === '(') {
      const v = expr();
      if (tokens[i++] !== ')') throw Error('#VALUE!');
      return v;
    }
    if (/^\$?[A-Z]+\$?\d+$/.test(t || '')) {
      if (tokens[i] !== ':') return number(read(t));
      i++;
      const a = referencePosition(t),
        b = referencePosition(tokens[i++] || '');
      const values: number[] = [];
      if ((Math.abs(b.r - a.r) + 1) * (Math.abs(b.c - a.c) + 1) > 200000) throw Error('#LIMIT!');
      for (let r = Math.min(a.r, b.r); r <= Math.max(a.r, b.r); r++)
        for (let c = Math.min(a.c, b.c); c <= Math.max(a.c, b.c); c++) {
          let name = '',
            n = c + 1;
          while (n) {
            name = String.fromCharCode(65 + ((n - 1) % 26)) + name;
            n = Math.floor((n - 1) / 26);
          }
          const v = read(name + (r + 1));
          if (v.startsWith('#')) throw Error(v);
          if (v.trim())
            try {
              values.push(number(v));
            } catch {
              /* Text in ranges is ignored like Excel totals. */
            }
        }
      return values;
    }
    if (/^[A-Z]+$/.test(t || '')) {
      if (tokens[i++] !== '(') throw Error('#NAME?');
      const args: (number | number[])[] = [];
      if (tokens[i] !== ')') {
        do {
          args.push(expr());
          if (tokens[i] !== ',') break;
          i++;
        } while (i < tokens.length);
      }
      if (tokens[i++] !== ')') throw Error('#VALUE!');
      const values = args.flat();
      let result: number;
      switch (t) {
        case 'SUM':
          result = values.reduce((a, b) => a + b, 0);
          break;
        case 'AVERAGE':
          if (!values.length) throw Error('#DIV/0!');
          result = values.reduce((a, b) => a + b, 0) / values.length;
          break;
        case 'COUNT':
          result = values.length;
          break;
        case 'MIN':
          result = values.length ? values.reduce((a, b) => Math.min(a, b), Infinity) : 0;
          break;
        case 'MAX':
          result = values.length ? values.reduce((a, b) => Math.max(a, b), -Infinity) : 0;
          break;
        case 'MOD':
          if (values.length !== 2 || values[1] === 0) throw Error('#VALUE!');
          result = ((values[0] % values[1]) + values[1]) % values[1];
          break;
        case 'HOURS':
          if (values.length !== 2) throw Error('#VALUE!');
          result = ((((values[1] - values[0]) % 1) + 1) % 1) * 24;
          break;
        default:
          throw Error('#NAME?');
      }
      return result;
    }
    if (!t || !/^\d*\.?\d+$/.test(t)) throw Error('#VALUE!');
    return Number(t);
  };
  const power = (): number | number[] => {
    const a = atom();
    if (tokens[i] === '^') {
      i++;
      return scalar(a) ** scalar(power());
    }
    return a;
  };
  const product = (): number | number[] => {
    let a = power();
    while (['*', '/'].includes(tokens[i])) {
      const op = tokens[i++],
        b = scalar(power());
      if (op === '/' && b === 0) throw Error('#DIV/0!');
      a = op === '*' ? scalar(a) * b : scalar(a) / b;
    }
    return a;
  };
  const expr = (): number | number[] => {
    let a = product();
    while (['+', '-'].includes(tokens[i])) {
      const op = tokens[i++],
        b = scalar(product());
      a = op === '+' ? scalar(a) + b : scalar(a) - b;
    }
    return a;
  };
  const result = scalar(expr());
  if (i !== tokens.length || !Number.isFinite(result)) throw Error('#VALUE!');
  return result;
}

export function shiftReferences(
  value: string,
  axis: 'row' | 'column',
  index: number,
  remove: boolean
): string {
  if (!value.startsWith('=')) return value;
  return value.replace(/(\$?)([A-Z]+)(\$?)(\d+)/gi, (_, colLock, col, rowLock, row) => {
    const point = referencePosition(col + row),
      position = axis === 'row' ? point.r : point.c;
    if (remove && position === index) return '#REF!';
    if (position < index) return colLock + col + rowLock + row;
    if (axis === 'row') return colLock + col + rowLock + (Number(row) + (remove ? -1 : 1));
    let n = point.c + 1 + (remove ? -1 : 1),
      name = '';
    while (n) {
      name = String.fromCharCode(65 + ((n - 1) % 26)) + name;
      n = Math.floor((n - 1) / 26);
    }
    return colLock + name + rowLock + row;
  });
}

/** Translate relative references when filling; absolute row/column anchors stay fixed. */
export function translateFormula(value: string, dr: number, dc: number): string {
  if (!value.startsWith('=')) return value;
  return value.replace(/(\$?)([A-Z]+)(\$?)(\d+)/gi, (_, cl, col, rl, row) => {
    const p = referencePosition(col + row),
      r = p.r + (rl ? 0 : dr),
      c = p.c + (cl ? 0 : dc);
    if (r < 0 || c < 0) return '#REF!';
    let n = c + 1,
      name = '';
    while (n) {
      name = String.fromCharCode(65 + ((n - 1) % 26)) + name;
      n = Math.floor((n - 1) / 26);
    }
    return cl + name + rl + (r + 1);
  });
}
