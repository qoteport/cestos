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

import SearchableSelect from './SearchableSelect';

export function PurchaseOrderCategoryField({
  value,
  onChange,
  className = '',
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
        className={`w-full rounded-lg border bg-background p-2.5 text-sm ${className}`}
      />
      <button type="button" onClick={() => { setCustom(false); onChange(''); }} className="text-[11px] font-semibold text-blue-700 hover:underline">
        Choose a standard category
      </button>
    </div>
  ) : (
    <SearchableSelect
      value={value}
      onChange={(val) => {
        if (val === CUSTOM) {
          setCustom(true);
          onChange('');
        } else {
          onChange(val);
        }
      }}
      placeholder="No category"
      searchable={false}
      options={[
        { value: '', label: 'No category' },
        ...PURCHASE_ORDER_CATEGORIES.map((item) => ({ value: item.value, label: item.label })),
        { value: CUSTOM, label: 'Custom…' },
      ]}
      className={className}
      ariaLabel="Purchase order category"
    />
  );
}

export function purchaseOrderCategoryLabel(category?: string | null) {
  return PURCHASE_ORDER_CATEGORIES.find((item) => item.value === category)?.label || category || 'Uncategorized';
}
