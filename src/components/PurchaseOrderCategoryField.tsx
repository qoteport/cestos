'use client';

import { useEffect, useState } from 'react';

export const PURCHASE_ORDER_CATEGORIES = [
  { value: 'FUEL', label: 'Fuel' },
  { value: 'LABOUR', label: 'Labour' },
  { value: 'MAINTENANCE_PARTS', label: 'Maintenance & parts' },
  { value: 'LOGISTICS', label: 'Logistics' },
  { value: 'CONSUMABLES', label: 'Consumables' },
] as const;

const CUSTOM = '__CUSTOM_CATEGORY__';

export function PurchaseOrderCategoryField({
  value,
  onChange,
  className = 'w-full rounded-lg border bg-background p-2.5 text-sm',
}: {
  value: string;
  onChange: (value: string) => void;
  className?: string;
}) {
  const [custom, setCustom] = useState(Boolean(value && !PURCHASE_ORDER_CATEGORIES.some((item) => item.value === value)));

  useEffect(() => {
    if (!value) return;
    setCustom(!PURCHASE_ORDER_CATEGORIES.some((item) => item.value === value));
  }, [value]);

  return custom ? (
    <div className="space-y-1.5">
      <input
        autoFocus
        maxLength={100}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder="Enter a custom category"
        className={className}
      />
      <button type="button" onClick={() => { setCustom(false); onChange(''); }} className="text-[11px] font-semibold text-blue-700 hover:underline">
        Choose a standard category
      </button>
    </div>
  ) : (
    <select
      value={value}
      onChange={(event) => {
        if (event.target.value === CUSTOM) {
          setCustom(true);
          onChange('');
        } else {
          onChange(event.target.value);
        }
      }}
      className={className}
    >
      <option value="">No category</option>
      {PURCHASE_ORDER_CATEGORIES.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}
      <option value={CUSTOM}>Custom…</option>
    </select>
  );
}

export function purchaseOrderCategoryLabel(category?: string | null) {
  return PURCHASE_ORDER_CATEGORIES.find((item) => item.value === category)?.label || category || 'Uncategorized';
}
