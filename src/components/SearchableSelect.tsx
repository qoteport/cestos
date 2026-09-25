'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { Search, ChevronDown, Check, X } from 'lucide-react';

export interface SearchableSelectOption {
  value: string;
  label: string;
  sublabel?: string;
  badge?: string;
  raw?: any;
  disabled?: boolean;
}

export interface SearchableSelectProps {
  options: SearchableSelectOption[];
  value?: string;
  defaultValue?: string;
  onChange?: (value: string, option?: SearchableSelectOption) => void;
  placeholder?: string;
  name?: string;
  required?: boolean;
  disabled?: boolean;
  className?: string;
  ariaLabel?: string;
  searchable?: boolean;
}

export default function SearchableSelect({
  options,
  value,
  defaultValue,
  onChange,
  placeholder = 'Select option...',
  name,
  required = false,
  disabled = false,
  className = '',
  ariaLabel,
  searchable,
}: SearchableSelectProps) {
  const [internalVal, setInternalVal] = useState(defaultValue || '');
  const currentValue = value !== undefined ? value : internalVal;

  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [isMounted, setIsMounted] = useState(false);
  const [popoverStyle, setPopoverStyle] = useState<React.CSSProperties>({});
  const [highlightedIndex, setHighlightedIndex] = useState(0);

  const containerRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const popoverRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  const shouldShowSearch = searchable !== undefined ? searchable : options.length > 5;
  const selectedOption = options.find((opt) => String(opt.value) === String(currentValue));

  useEffect(() => {
    setIsMounted(true);
  }, []);

  const filteredOptions = options.filter((opt) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    const lbl = String(opt.label || '').toLowerCase();
    const sub = String(opt.sublabel || '').toLowerCase();
    const val = String(opt.value || '').toLowerCase();
    return lbl.includes(q) || sub.includes(q) || val.includes(q);
  });

  // Calculate dropdown positioning dynamically (smart portal + flip)
  const updatePosition = useCallback(() => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const spaceBelow = window.innerHeight - rect.bottom;
    const spaceAbove = rect.top;

    const estimatedHeight = Math.min(300, Math.max(120, filteredOptions.length * 38 + (shouldShowSearch ? 50 : 10)));
    const openUpwards = spaceBelow < estimatedHeight && spaceAbove > spaceBelow;

    let top: number;
    if (openUpwards) {
      top = Math.max(8, rect.top - estimatedHeight - 4);
    } else {
      top = rect.bottom + 4;
    }

    const popoverWidth = Math.max(rect.width, 220);
    let left = rect.left;
    if (left + popoverWidth > window.innerWidth - 12) {
      left = Math.max(12, window.innerWidth - popoverWidth - 12);
    }

    setPopoverStyle({
      position: 'fixed',
      top: `${top}px`,
      left: `${left}px`,
      width: `${popoverWidth}px`,
      maxHeight: `${Math.min(320, openUpwards ? spaceAbove - 16 : spaceBelow - 16)}px`,
      zIndex: 2147483647,
    });
  }, [filteredOptions.length, shouldShowSearch]);

  useEffect(() => {
    if (isOpen) {
      updatePosition();
      const handleScrollOrResize = () => updatePosition();
      window.addEventListener('resize', handleScrollOrResize);
      window.addEventListener('scroll', handleScrollOrResize, true);
      return () => {
        window.removeEventListener('resize', handleScrollOrResize);
        window.removeEventListener('scroll', handleScrollOrResize, true);
      };
    }
  }, [isOpen, updatePosition]);

  // Close dropdown on outside click
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      const targetNode = event.target as Node;
      const isInsideContainer = containerRef.current && containerRef.current.contains(targetNode);
      const isInsidePopover = popoverRef.current && popoverRef.current.contains(targetNode);
      if (!isInsideContainer && !isInsidePopover) {
        setIsOpen(false);
      }
    }
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  // Auto focus search input when opened
  useEffect(() => {
    if (isOpen) {
      setHighlightedIndex(0);
      if (shouldShowSearch) {
        setTimeout(() => searchInputRef.current?.focus(), 50);
      }
    } else {
      setSearchQuery('');
    }
  }, [isOpen, shouldShowSearch]);

  const handleSelect = (opt: SearchableSelectOption) => {
    if (opt.disabled) return;
    setInternalVal(opt.value);
    onChange?.(opt.value, opt);
    setIsOpen(false);
    triggerRef.current?.focus();
  };

  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation();
    setInternalVal('');
    onChange?.('');
    setIsOpen(false);
    triggerRef.current?.focus();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (disabled) return;

    if (!isOpen) {
      if (['ArrowDown', 'ArrowUp', 'Enter', ' '].includes(e.key)) {
        e.preventDefault();
        setIsOpen(true);
      }
      return;
    }

    if (e.key === 'Escape') {
      e.preventDefault();
      setIsOpen(false);
      triggerRef.current?.focus();
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      setHighlightedIndex((prev) => (prev + 1) % Math.max(1, filteredOptions.length));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setHighlightedIndex((prev) => (prev - 1 + filteredOptions.length) % Math.max(1, filteredOptions.length));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (filteredOptions[highlightedIndex]) {
        handleSelect(filteredOptions[highlightedIndex]);
      }
    }
  };

  return (
    <div className={`relative w-full ${className}`} ref={containerRef}>
      {/* Hidden input for HTML form submission */}
      {name && (
        <input
          type="hidden"
          name={name}
          value={currentValue || ''}
          required={required && !currentValue}
        />
      )}

      {/* Main Trigger Button */}
      <button
        ref={triggerRef}
        type="button"
        disabled={disabled}
        aria-label={ariaLabel || placeholder}
        aria-expanded={isOpen}
        aria-haspopup="listbox"
        onClick={() => !disabled && setIsOpen(!isOpen)}
        onKeyDown={handleKeyDown}
        className={`input-field flex items-center justify-between text-left cursor-pointer text-xs sm:text-sm w-full min-h-[42px] px-3.5 py-2.5 bg-background border rounded-xl transition-all shadow-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-1 ${
          isOpen ? 'ring-2 ring-primary/30 border-primary shadow-sm' : 'hover:border-primary/50'
        } ${disabled ? 'opacity-50 cursor-not-allowed bg-muted' : ''}`}
      >
        <span className="truncate flex-1 pr-2">
          {selectedOption ? (
            <span className="font-semibold text-foreground">
              {selectedOption.label}
              {selectedOption.sublabel && (
                <span className="text-muted-foreground font-normal ml-1.5 text-xs">
                  ({selectedOption.sublabel})
                </span>
              )}
            </span>
          ) : (
            <span className="text-muted-foreground/80">{placeholder}</span>
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
              className="p-1 rounded-md hover:bg-muted text-muted-foreground hover:text-foreground transition"
            >
              <X size={14} />
            </span>
          )}
          <ChevronDown
            size={16}
            className={`transition-transform duration-200 text-muted-foreground/70 ${isOpen ? 'rotate-180 text-primary' : ''}`}
          />
        </div>
      </button>

      {/* Dropdown Menu rendered via Portal */}
      {isOpen && isMounted && createPortal(
        <div
          ref={popoverRef}
          style={popoverStyle}
          role="listbox"
          tabIndex={-1}
          onKeyDown={handleKeyDown}
          className="bg-background dark:bg-slate-900 border border-border shadow-2xl rounded-2xl overflow-hidden flex flex-col animate-in fade-in-50 zoom-in-95"
        >
          {/* Search Bar inside dropdown */}
          {shouldShowSearch && (
            <div className="p-2.5 border-b border-border bg-muted/40 sticky top-0 z-10 flex items-center gap-2">
              <Search size={15} className="text-muted-foreground shrink-0 ml-1" />
              <input
                ref={searchInputRef}
                type="text"
                className="w-full text-xs sm:text-sm bg-transparent border-none outline-none focus:ring-0 placeholder:text-muted-foreground text-foreground"
                placeholder="Search options..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="text-muted-foreground hover:text-foreground p-1 rounded-md"
                >
                  <X size={13} />
                </button>
              )}
            </div>
          )}

          {/* Options List */}
          <div className="overflow-y-auto flex-1 scrollbar-none scrollbar-hide p-1.5 space-y-0.5 max-h-60 [&::-webkit-scrollbar]:hidden">
            {filteredOptions.length === 0 ? (
              <div className="p-4 text-center text-xs sm:text-sm text-muted-foreground italic font-medium">
                No matching options found
              </div>
            ) : (
              filteredOptions.map((opt, index) => {
                const isSelected = String(opt.value) === String(value);
                const isHighlighted = index === highlightedIndex;
                return (
                  <button
                    key={opt.value}
                    type="button"
                    disabled={opt.disabled}
                    aria-disabled={opt.disabled}
                    role="option"
                    aria-selected={isSelected}
                    onClick={() => handleSelect(opt)}
                    onMouseEnter={() => setHighlightedIndex(index)}
                    className={`disabled:opacity-50 disabled:cursor-not-allowed w-full text-left px-3 py-2.5 rounded-xl text-xs sm:text-sm flex items-center justify-between gap-2 transition-all min-h-[38px] ${
                      isSelected
                        ? 'bg-primary/15 text-primary font-bold shadow-xs'
                        : isHighlighted
                        ? 'bg-muted text-foreground font-semibold'
                        : 'hover:bg-muted text-foreground font-medium'
                    }`}
                  >
                    <div className="min-w-0 flex-1">
                      <div className="truncate">{opt.label}</div>
                      {opt.sublabel && (
                        <div className="text-[11px] sm:text-xs text-muted-foreground truncate font-normal">
                          {opt.sublabel}
                        </div>
                      )}
                    </div>
                    {opt.badge && (
                      <span className="text-[10px] px-2 py-0.5 rounded-md bg-secondary text-primary border border-primary/20 shrink-0 font-mono font-bold">
                        {opt.badge}
                      </span>
                    )}
                    {isSelected && <Check size={16} className="text-primary shrink-0 ml-1 stroke-[2.5]" />}
                  </button>
                );
              })
            )}
          </div>
        </div>,
        document.body
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
  const [isMounted, setIsMounted] = useState(false);
  const [popoverStyle, setPopoverStyle] = useState<React.CSSProperties>({});

  const containerRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const popoverRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  const selectedOptions = options.filter((opt) => values.includes(String(opt.value)));

  useEffect(() => {
    setIsMounted(true);
  }, []);

  const filteredOptions = options.filter((opt) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    const lbl = String(opt.label || '').toLowerCase();
    const sub = String(opt.sublabel || '').toLowerCase();
    const val = String(opt.value || '').toLowerCase();
    return lbl.includes(q) || sub.includes(q) || val.includes(q);
  });

  const updatePosition = useCallback(() => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const spaceBelow = window.innerHeight - rect.bottom;
    const spaceAbove = rect.top;

    const estimatedHeight = Math.min(300, Math.max(140, filteredOptions.length * 38 + 50));
    const openUpwards = spaceBelow < estimatedHeight && spaceAbove > spaceBelow;

    let top: number;
    if (openUpwards) {
      top = Math.max(8, rect.top - estimatedHeight - 4);
    } else {
      top = rect.bottom + 4;
    }

    const popoverWidth = Math.max(rect.width, 240);
    let left = rect.left;
    if (left + popoverWidth > window.innerWidth - 12) {
      left = Math.max(12, window.innerWidth - popoverWidth - 12);
    }

    setPopoverStyle({
      position: 'fixed',
      top: `${top}px`,
      left: `${left}px`,
      width: `${popoverWidth}px`,
      maxHeight: `${Math.min(320, openUpwards ? spaceAbove - 16 : spaceBelow - 16)}px`,
      zIndex: 2147483647,
    });
  }, [filteredOptions.length]);

  useEffect(() => {
    if (isOpen) {
      updatePosition();
      const handleScrollOrResize = () => updatePosition();
      window.addEventListener('resize', handleScrollOrResize);
      window.addEventListener('scroll', handleScrollOrResize, true);
      return () => {
        window.removeEventListener('resize', handleScrollOrResize);
        window.removeEventListener('scroll', handleScrollOrResize, true);
      };
    }
  }, [isOpen, updatePosition]);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      const targetNode = event.target as Node;
      const isInsideContainer = containerRef.current && containerRef.current.contains(targetNode);
      const isInsidePopover = popoverRef.current && popoverRef.current.contains(targetNode);
      if (!isInsideContainer && !isInsidePopover) {
        setIsOpen(false);
      }
    }
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => searchInputRef.current?.focus(), 50);
    } else {
      setSearchQuery('');
    }
  }, [isOpen]);

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
        ref={triggerRef}
        type="button"
        disabled={disabled}
        aria-label={ariaLabel || placeholder}
        aria-expanded={isOpen}
        aria-haspopup="listbox"
        onClick={() => !disabled && setIsOpen(!isOpen)}
        className={`input-field flex items-center justify-between text-left cursor-pointer text-xs sm:text-sm w-full min-h-[42px] px-3.5 py-2 bg-background border rounded-xl transition-all shadow-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-1 ${
          isOpen ? 'ring-2 ring-primary/30 border-primary shadow-sm' : 'hover:border-primary/50'
        } ${disabled ? 'opacity-50 cursor-not-allowed bg-muted' : ''}`}
      >
        <div className="flex flex-wrap items-center gap-1.5 flex-1 pr-2">
          {selectedOptions.length > 0 ? (
            selectedOptions.map((opt) => (
              <span
                key={opt.value}
                className="inline-flex items-center gap-1 bg-primary/10 text-primary font-semibold text-xs px-2.5 py-1 rounded-lg border border-primary/20"
              >
                <span className="truncate max-w-[150px]">{opt.label}</span>
                <span
                  role="button"
                  tabIndex={0}
                  onClick={(e) => handleRemove(opt.value, e)}
                  onKeyDown={(e) => e.key === 'Enter' && handleRemove(opt.value, e as any)}
                  className="hover:bg-primary/20 rounded p-0.5 cursor-pointer text-primary transition"
                  title="Remove option"
                >
                  <X size={12} />
                </span>
              </span>
            ))
          ) : (
            <span className="text-muted-foreground/80">{placeholder}</span>
          )}
        </div>

        <div className="flex items-center gap-1.5 shrink-0 text-muted-foreground">
          {values.length > 0 && !disabled && (
            <span
              role="button"
              tabIndex={0}
              title="Clear all selections"
              onClick={handleClearAll}
              className="p-1 rounded-md hover:bg-muted text-muted-foreground hover:text-foreground transition"
            >
              <X size={14} />
            </span>
          )}
          <ChevronDown
            size={16}
            className={`transition-transform duration-200 text-muted-foreground/70 ${isOpen ? 'rotate-180 text-primary' : ''}`}
          />
        </div>
      </button>

      {isOpen && isMounted && createPortal(
        <div
          ref={popoverRef}
          style={popoverStyle}
          role="listbox"
          aria-multiselectable="true"
          className="bg-background dark:bg-slate-900 border border-border shadow-2xl rounded-2xl overflow-hidden flex flex-col animate-in fade-in-50 zoom-in-95"
        >
          <div className="p-2.5 border-b border-border bg-muted/40 sticky top-0 z-10 flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 flex-1">
              <Search size={15} className="text-muted-foreground shrink-0 ml-1" />
              <input
                ref={searchInputRef}
                type="text"
                className="w-full text-xs sm:text-sm bg-transparent border-none outline-none focus:ring-0 placeholder:text-muted-foreground text-foreground"
                placeholder="Search options..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            {values.length > 0 && (
              <span className="text-[10px] text-primary font-bold px-2 py-0.5 bg-primary/10 rounded-md border border-primary/20 shrink-0">
                {values.length} selected
              </span>
            )}
          </div>

          <div className="overflow-y-auto flex-1 scrollbar-none scrollbar-hide p-1.5 space-y-0.5 max-h-60 [&::-webkit-scrollbar]:hidden">
            {filteredOptions.length === 0 ? (
              <div className="p-4 text-center text-xs sm:text-sm text-muted-foreground italic font-medium">
                No matching options found
              </div>
            ) : (
              filteredOptions.map((opt) => {
                const isSelected = values.includes(String(opt.value));
                return (
                  <button
                    key={opt.value}
                    type="button"
                    role="option"
                    aria-selected={isSelected}
                    onClick={() => handleToggle(opt)}
                    className={`disabled:opacity-50 disabled:cursor-not-allowed w-full text-left px-3 py-2.5 rounded-xl text-xs sm:text-sm flex items-center justify-between gap-2 transition-all min-h-[38px] ${
                      isSelected
                        ? 'bg-primary/15 text-primary font-bold'
                        : 'hover:bg-muted text-foreground font-medium'
                    }`}
                  >
                    <div className="min-w-0 flex-1">
                      <div className="truncate">{opt.label}</div>
                      {opt.sublabel && (
                        <div className="text-[11px] sm:text-xs text-muted-foreground truncate font-normal">
                          {opt.sublabel}
                        </div>
                      )}
                    </div>
                    {opt.badge && (
                      <span className="text-[10px] px-2 py-0.5 rounded-md bg-secondary text-primary border border-primary/20 shrink-0 font-mono font-bold">
                        {opt.badge}
                      </span>
                    )}
                    <div
                      className={`w-5 h-5 rounded-lg border flex items-center justify-center shrink-0 transition-colors ${
                        isSelected
                          ? 'bg-primary border-primary text-primary-foreground'
                          : 'border-muted-foreground/40'
                      }`}
                    >
                      {isSelected && <Check size={13} className="stroke-[3]" />}
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}

export const CustomSelect = SearchableSelect;
