'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Search, ChevronDown, Check, X } from 'lucide-react';

export interface SearchableSelectOption {
  value: string;
  label: string;
  sublabel?: string;
  badge?: string;
  raw?: any;
}

export interface SearchableSelectProps {
  options: SearchableSelectOption[];
  value: string;
  onChange: (value: string, option?: SearchableSelectOption) => void;
  placeholder?: string;
  name?: string;
  required?: boolean;
  disabled?: boolean;
  className?: string;
  ariaLabel?: string;
}

export default function SearchableSelect({
  options,
  value,
  onChange,
  placeholder = 'Select option...',
  name,
  required = false,
  disabled = false,
  className = '',
  ariaLabel,
}: SearchableSelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const containerRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  const selectedOption = options.find((opt) => String(opt.value) === String(value));

  // Close dropdown on outside click
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  // Auto focus search input when opened
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => searchInputRef.current?.focus(), 50);
    } else {
      setSearchQuery('');
    }
  }, [isOpen]);

  const filteredOptions = options.filter((opt) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    const lbl = String(opt.label || '').toLowerCase();
    const sub = String(opt.sublabel || '').toLowerCase();
    const val = String(opt.value || '').toLowerCase();
    return lbl.includes(q) || sub.includes(q) || val.includes(q);
  });

  const handleSelect = (opt: SearchableSelectOption) => {
    onChange(opt.value, opt);
    setIsOpen(false);
  };

  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation();
    onChange('');
    setIsOpen(false);
  };

  return (
    <div className={`relative w-full ${className}`} ref={containerRef}>
      {/* Hidden input for HTML form submission */}
      {name && (
        <input
          type="hidden"
          name={name}
          value={value || ''}
          required={required && !value}
        />
      )}

      {/* Main Trigger Button */}
      <button
        type="button"
        disabled={disabled}
        aria-label={ariaLabel || placeholder}
        onClick={() => !disabled && setIsOpen(!isOpen)}
        className={`input-field flex items-center justify-between text-left cursor-pointer text-xs w-full min-h-[38px] px-3 py-2 bg-background border rounded-md transition-all ${
          isOpen ? 'ring-2 ring-primary/20 border-primary' : 'hover:border-primary/50'
        } ${disabled ? 'opacity-50 cursor-not-allowed bg-muted' : ''}`}
      >
        <span className="truncate flex-1 pr-2">
          {selectedOption ? (
            <span className="font-medium text-foreground">
              {selectedOption.label}
              {selectedOption.sublabel && (
                <span className="text-muted-foreground font-normal ml-1.5 text-[11px]">
                  ({selectedOption.sublabel})
                </span>
              )}
            </span>
          ) : (
            <span className="text-muted-foreground">{placeholder}</span>
          )}
        </span>
        <div className="flex items-center gap-1.5 shrink-0 text-muted-foreground">
          {value && !disabled && (
            <span
              role="button"
              tabIndex={0}
              title="Clear selection"
              onClick={handleClear}
              onKeyDown={(e) => e.key === 'Enter' && handleClear(e as any)}
              className="p-0.5 rounded hover:bg-muted text-muted-foreground hover:text-foreground"
            >
              <X size={13} />
            </span>
          )}
          <ChevronDown
            size={14}
            className={`transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}
          />
        </div>
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <div className="absolute z-[10050] top-full left-0 right-0 mt-1 bg-background border border-border shadow-xl rounded-md overflow-hidden flex flex-col max-h-64 animate-in fade-in-50 zoom-in-95">
          {/* Search Bar inside dropdown */}
          <div className="p-2 border-b bg-muted/30 sticky top-0 z-10 flex items-center gap-2">
            <Search size={14} className="text-muted-foreground shrink-0 ml-1" />
            <input
              ref={searchInputRef}
              type="text"
              className="w-full text-xs bg-transparent border-none outline-none focus:ring-0 placeholder:text-muted-foreground"
              placeholder="Search options..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Escape') setIsOpen(false);
                if (e.key === 'Enter' && filteredOptions.length > 0) {
                  e.preventDefault();
                  handleSelect(filteredOptions[0]);
                }
              }}
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="text-muted-foreground hover:text-foreground p-0.5"
              >
                <X size={12} />
              </button>
            )}
          </div>

          {/* Options List */}
          <div className="overflow-y-auto flex-1 scrollbar-thin p-1 space-y-0.5">
            {filteredOptions.length === 0 ? (
              <div className="p-3 text-center text-xs text-muted-foreground italic">
                No matching options found
              </div>
            ) : (
              filteredOptions.map((opt) => {
                const isSelected = String(opt.value) === String(value);
                return (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => handleSelect(opt)}
                    className={`w-full text-left px-2.5 py-1.5 rounded text-xs flex items-center justify-between gap-2 transition-colors ${
                      isSelected
                        ? 'bg-primary/10 text-primary font-semibold'
                        : 'hover:bg-muted text-foreground'
                    }`}
                  >
                    <div className="min-w-0 flex-1">
                      <div className="truncate font-medium">{opt.label}</div>
                      {opt.sublabel && (
                        <div className="text-[11px] text-muted-foreground truncate">
                          {opt.sublabel}
                        </div>
                      )}
                    </div>
                    {opt.badge && (
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-secondary text-primary border border-primary/20 shrink-0 font-mono">
                        {opt.badge}
                      </span>
                    )}
                    {isSelected && <Check size={14} className="text-primary shrink-0 ml-1" />}
                  </button>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export interface MultiSearchableSelectProps {
  options: SearchableSelectOption[];
  values: string[];
  onChange: (values: string[], selectedOptions: SearchableSelectOption[]) => void;
  placeholder?: string;
  name?: string;
  required?: boolean;
  disabled?: boolean;
  className?: string;
  ariaLabel?: string;
}

export function MultiSearchableSelect({
  options,
  values = [],
  onChange,
  placeholder = 'Select multiple options...',
  name,
  required = false,
  disabled = false,
  className = '',
  ariaLabel,
}: MultiSearchableSelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const containerRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  const selectedOptions = options.filter((opt) => values.includes(String(opt.value)));

  // Close dropdown on outside click
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  // Auto focus search input when opened
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => searchInputRef.current?.focus(), 50);
    } else {
      setSearchQuery('');
    }
  }, [isOpen]);

  const filteredOptions = options.filter((opt) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    const lbl = String(opt.label || '').toLowerCase();
    const sub = String(opt.sublabel || '').toLowerCase();
    const val = String(opt.value || '').toLowerCase();
    return lbl.includes(q) || sub.includes(q) || val.includes(q);
  });

  const handleToggle = (opt: SearchableSelectOption) => {
    const valStr = String(opt.value);
    let nextValues: string[];
    if (values.includes(valStr)) {
      nextValues = values.filter((v) => String(v) !== valStr);
    } else {
      nextValues = [...values, valStr];
    }
    const nextSelected = options.filter((o) => nextValues.includes(String(o.value)));
    onChange(nextValues, nextSelected);
  };

  const handleRemove = (valToRemove: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const nextValues = values.filter((v) => String(v) !== String(valToRemove));
    const nextSelected = options.filter((o) => nextValues.includes(String(o.value)));
    onChange(nextValues, nextSelected);
  };

  const handleClearAll = (e: React.MouseEvent) => {
    e.stopPropagation();
    onChange([], []);
  };

  return (
    <div className={`relative w-full ${className}`} ref={containerRef}>
      {name && (
        <input
          type="hidden"
          name={name}
          value={values.join(',')}
          required={required && values.length === 0}
        />
      )}

      <button
        type="button"
        disabled={disabled}
        aria-label={ariaLabel || placeholder}
        onClick={() => !disabled && setIsOpen(!isOpen)}
        className={`input-field flex items-center justify-between text-left cursor-pointer text-xs w-full min-h-[38px] px-3 py-1.5 bg-background border rounded-md transition-all ${
          isOpen ? 'ring-2 ring-primary/20 border-primary' : 'hover:border-primary/50'
        } ${disabled ? 'opacity-50 cursor-not-allowed bg-muted' : ''}`}
      >
        <div className="flex flex-wrap items-center gap-1 flex-1 pr-2">
          {selectedOptions.length > 0 ? (
            selectedOptions.map((opt) => (
              <span
                key={opt.value}
                className="inline-flex items-center gap-1 bg-primary/10 text-primary font-medium text-[11px] px-2 py-0.5 rounded border border-primary/20"
              >
                <span className="truncate max-w-[150px]">{opt.label}</span>
                <span
                  role="button"
                  tabIndex={0}
                  onClick={(e) => handleRemove(opt.value, e)}
                  onKeyDown={(e) => e.key === 'Enter' && handleRemove(opt.value, e as any)}
                  className="hover:bg-primary/20 rounded p-0.5 cursor-pointer text-primary"
                  title="Remove technician"
                >
                  <X size={11} />
                </span>
              </span>
            ))
          ) : (
            <span className="text-muted-foreground">{placeholder}</span>
          )}
        </div>

        <div className="flex items-center gap-1.5 shrink-0 text-muted-foreground">
          {values.length > 0 && !disabled && (
            <span
              role="button"
              tabIndex={0}
              title="Clear all selections"
              onClick={handleClearAll}
              className="p-0.5 rounded hover:bg-muted text-muted-foreground hover:text-foreground"
            >
              <X size={13} />
            </span>
          )}
          <ChevronDown
            size={14}
            className={`transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}
          />
        </div>
      </button>

      {isOpen && (
        <div className="absolute z-[10050] top-full left-0 right-0 mt-1 bg-background border border-border shadow-xl rounded-md overflow-hidden flex flex-col max-h-64 animate-in fade-in-50 zoom-in-95">
          <div className="p-2 border-b bg-muted/30 sticky top-0 z-10 flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 flex-1">
              <Search size={14} className="text-muted-foreground shrink-0 ml-1" />
              <input
                ref={searchInputRef}
                type="text"
                className="w-full text-xs bg-transparent border-none outline-none focus:ring-0 placeholder:text-muted-foreground"
                placeholder="Search options..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Escape') setIsOpen(false);
                }}
              />
            </div>
            {values.length > 0 && (
              <span className="text-[10px] text-muted-foreground font-semibold px-1.5 py-0.5 bg-muted rounded shrink-0">
                {values.length} selected
              </span>
            )}
          </div>

          <div className="overflow-y-auto flex-1 scrollbar-thin p-1 space-y-0.5">
            {filteredOptions.length === 0 ? (
              <div className="p-3 text-center text-xs text-muted-foreground italic">
                No matching options found
              </div>
            ) : (
              filteredOptions.map((opt) => {
                const isSelected = values.includes(String(opt.value));
                return (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => handleToggle(opt)}
                    className={`w-full text-left px-2.5 py-1.5 rounded text-xs flex items-center justify-between gap-2 transition-colors ${
                      isSelected
                        ? 'bg-primary/10 text-primary font-semibold'
                        : 'hover:bg-muted text-foreground'
                    }`}
                  >
                    <div className="min-w-0 flex-1">
                      <div className="truncate font-medium">{opt.label}</div>
                      {opt.sublabel && (
                        <div className="text-[11px] text-muted-foreground truncate">
                          {opt.sublabel}
                        </div>
                      )}
                    </div>
                    {opt.badge && (
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-secondary text-primary border border-primary/20 shrink-0 font-mono">
                        {opt.badge}
                      </span>
                    )}
                    <div
                      className={`w-4 h-4 rounded border flex items-center justify-center shrink-0 transition-colors ${
                        isSelected
                          ? 'bg-primary border-primary text-primary-foreground'
                          : 'border-muted-foreground/40'
                      }`}
                    >
                      {isSelected && <Check size={12} className="stroke-[3]" />}
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}

