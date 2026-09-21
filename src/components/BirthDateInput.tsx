'use client';
import { useEffect, useState } from 'react';

export default function BirthDateInput({ value, onChange }: { value: string; onChange: (value: string) => void }) {
  const [parts, setParts] = useState(value ? value.split('-') : ['', '', '']);
  useEffect(() => { if (value) setParts(value.split('-')); }, [value]);
  const [year, month, day] = parts;
  const days = year && month ? new Date(Number(year), Number(month), 0).getDate() : 31;
  const years = Array.from({ length: 111 }, (_, i) => String(2010 - i));
  if (year && !years.includes(year)) years.unshift(year);
  const update = (index: number, nextValue: string) => {
    const next = [...parts]; next[index] = nextValue;
    if (next[0] && next[1] && Number(next[2]) > new Date(Number(next[0]), Number(next[1]), 0).getDate()) next[2] = '';
    setParts(next);
    onChange(next.every(Boolean) ? next.join('-') : '');
  };
  const partial = parts.some(Boolean);
  return <div className="grid grid-cols-3 gap-2">
    <select aria-label="Birth year" className="input-field" value={year} required={partial} onChange={e => update(0, e.target.value)}><option value="">Year</option>{years.map(item => <option key={item} value={item}>{item}</option>)}</select>
    <select aria-label="Birth month" className="input-field" value={month} required={partial} onChange={e => update(1, e.target.value)}><option value="">Month</option>{Array.from({ length: 12 }, (_, i) => <option key={i} value={String(i + 1).padStart(2, '0')}>{new Date(2000, i, 1).toLocaleString('en', { month: 'short' })}</option>)}</select>
    <select aria-label="Birth day" className="input-field" value={day} required={partial} onChange={e => update(2, e.target.value)}><option value="">Day</option>{Array.from({ length: days }, (_, i) => <option key={i} value={String(i + 1).padStart(2, '0')}>{i + 1}</option>)}</select>
  </div>;
}
