'use client';

import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { Calendar as CalendarIcon, Clock, ChevronLeft, ChevronRight, X, Check } from 'lucide-react';

export interface AppDateTimePickerProps {
  value?: string;
  defaultValue?: string;
  onChange?: (value: string) => void;
  mode?: 'date' | 'datetime' | 'time';
  placeholder?: string;
  name?: string;
  disabled?: boolean;
  required?: boolean;
  min?: string;
  max?: string;
  className?: string;
  ariaLabel?: string;
  showPresets?: boolean;
}

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

const DAYS_OF_WEEK = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];

export default function AppDateTimePicker({
  value,
  defaultValue,
  onChange,
  mode = 'date',
  placeholder,
  name,
  disabled = false,
  required = false,
  min,
  max,
  className = '',
  ariaLabel,
  showPresets = true,
}: AppDateTimePickerProps) {
  const [internalVal, setInternalVal] = useState(defaultValue || '');
  const effectiveValue = value !== undefined ? value : internalVal;

  const [isOpen, setIsOpen] = useState(false);
  const [isMounted, setIsMounted] = useState(false);
  const [popoverStyle, setPopoverStyle] = useState<React.CSSProperties>({});

  const containerRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const popoverRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  // Parse current value
  const parsedValue = useMemo(() => {
    if (!effectiveValue) return null;
    if (mode === 'time') {
      const parts = effectiveValue.split(':');
      if (parts.length >= 2) {
        const d = new Date();
        d.setHours(Number(parts[0]) || 0, Number(parts[1]) || 0, 0, 0);
        return d;
      }
      return null;
    }
    const d = new Date(effectiveValue);
    return isNaN(d.getTime()) ? null : d;
  }, [effectiveValue, mode]);

  // Current view state (Year & Month being viewed)
  const [viewYear, setViewYear] = useState<number>(() => {
    return parsedValue ? parsedValue.getFullYear() : new Date().getFullYear();
  });
  const [viewMonth, setViewMonth] = useState<number>(() => {
    return parsedValue ? parsedValue.getMonth() : new Date().getMonth();
  });

  // Selected date components
  const [selectedDate, setSelectedDate] = useState<string>(() => {
    if (!effectiveValue) return '';
    if (mode === 'time') return '';
    if (effectiveValue.includes('T')) return effectiveValue.split('T')[0];
    return effectiveValue.slice(0, 10);
  });

  // Selected time components
  const [selectedHours, setSelectedHours] = useState<number>(() => {
    if (parsedValue) return parsedValue.getHours();
    return 9;
  });
  const [selectedMinutes, setSelectedMinutes] = useState<number>(() => {
    if (parsedValue) return parsedValue.getMinutes();
    return 0;
  });

  // Sync internal state when prop value changes
  useEffect(() => {
    if (parsedValue) {
      setViewYear(parsedValue.getFullYear());
      setViewMonth(parsedValue.getMonth());
      if (mode !== 'time') {
        const yyyy = parsedValue.getFullYear();
        const mm = String(parsedValue.getMonth() + 1).padStart(2, '0');
        const dd = String(parsedValue.getDate()).padStart(2, '0');
        setSelectedDate(`${yyyy}-${mm}-${dd}`);
      }
      setSelectedHours(parsedValue.getHours());
      setSelectedMinutes(parsedValue.getMinutes());
    } else if (!effectiveValue) {
      setSelectedDate('');
    }
  }, [effectiveValue, parsedValue, mode]);

  // Calculate popover positioning dynamically (smart portal + flip)
  const updatePosition = useCallback(() => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const spaceBelow = window.innerHeight - rect.bottom;
    const spaceAbove = rect.top;

    const estimatedHeight = mode === 'time' ? 220 : mode === 'datetime' ? 420 : 360;
    const openUpwards = spaceBelow < estimatedHeight && spaceAbove > spaceBelow;

    let top: number;
    if (openUpwards) {
      top = Math.max(8, rect.top - estimatedHeight - 4);
    } else {
      top = rect.bottom + 4;
    }

    const popoverWidth = Math.min(window.innerWidth - 24, 350);
    let left = rect.left;
    if (left + popoverWidth > window.innerWidth - 12) {
      left = Math.max(12, window.innerWidth - popoverWidth - 12);
    }

    setPopoverStyle({
      position: 'fixed',
      top: `${top}px`,
      left: `${left}px`,
      width: `${popoverWidth}px`,
      maxHeight: `${Math.min(480, openUpwards ? spaceAbove - 16 : spaceBelow - 16)}px`,
      zIndex: 2147483647,
    });
  }, [mode]);

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

  // Close on outside click
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

  // Format display text
  const displayText = useMemo(() => {
    if (!effectiveValue) return '';
    if (mode === 'time') {
      const parts = effectiveValue.split(':');
      if (parts.length >= 2) {
        const h = Number(parts[0]);
        const m = String(parts[1]).padStart(2, '0');
        const ampm = h >= 12 ? 'PM' : 'AM';
        const h12 = h % 12 || 12;
        return `${h12}:${m} ${ampm}`;
      }
      return effectiveValue;
    }
    const d = parsedValue;
    if (!d) return effectiveValue;

    const dateStr = d.toLocaleDateString('en-GB', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });

    if (mode === 'datetime') {
      const timeStr = d.toLocaleTimeString('en-US', {
        hour: 'numeric',
        minute: '2-digit',
        hour12: true,
      });
      return `${dateStr}, ${timeStr}`;
    }

    return dateStr;
  }, [effectiveValue, parsedValue, mode]);

  const defaultPlaceholder = mode === 'datetime'
    ? 'Select date & time...'
    : mode === 'time'
    ? 'Select time...'
    : 'Select date...';

  // Navigation handlers
  const prevMonth = () => {
    if (viewMonth === 0) {
      setViewMonth(11);
      setViewYear((y) => y - 1);
    } else {
      setViewMonth((m) => m - 1);
    }
  };

  const nextMonth = () => {
    if (viewMonth === 11) {
      setViewMonth(0);
      setViewYear((y) => y + 1);
    } else {
      setViewMonth((m) => m + 1);
    }
  };

  // Calendar days calculation
  const calendarDays = useMemo(() => {
    const firstDayIndex = new Date(viewYear, viewMonth, 1).getDay();
    const daysInCurrentMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
    const daysInPrevMonth = new Date(viewYear, viewMonth, 0).getDate();

    const days: Array<{
      day: number;
      month: number;
      year: number;
      dateString: string;
      isCurrentMonth: boolean;
      isToday: boolean;
      isSelected: boolean;
      isDisabled: boolean;
    }> = [];

    const todayStr = new Date().toISOString().slice(0, 10);

    // Prev month padding
    for (let i = firstDayIndex - 1; i >= 0; i--) {
      const d = daysInPrevMonth - i;
      const m = viewMonth === 0 ? 11 : viewMonth - 1;
      const y = viewMonth === 0 ? viewYear - 1 : viewYear;
      const dateString = `${y}-${String(m + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      days.push({
        day: d,
        month: m,
        year: y,
        dateString,
        isCurrentMonth: false,
        isToday: dateString === todayStr,
        isSelected: dateString === selectedDate,
        isDisabled: (min ? dateString < min : false) || (max ? dateString > max : false),
      });
    }

    // Current month days
    for (let d = 1; d <= daysInCurrentMonth; d++) {
      const dateString = `${viewYear}-${String(viewMonth + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      days.push({
        day: d,
        month: viewMonth,
        year: viewYear,
        dateString,
        isCurrentMonth: true,
        isToday: dateString === todayStr,
        isSelected: dateString === selectedDate,
        isDisabled: (min ? dateString < min : false) || (max ? dateString > max : false),
      });
    }

    // Next month padding
    const totalCells = Math.ceil(days.length / 7) * 7;
    const remaining = totalCells - days.length;
    for (let d = 1; d <= remaining; d++) {
      const m = viewMonth === 11 ? 0 : viewMonth + 1;
      const y = viewMonth === 11 ? viewYear + 1 : viewYear;
      const dateString = `${y}-${String(m + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      days.push({
        day: d,
        month: m,
        year: y,
        dateString,
        isCurrentMonth: false,
        isToday: dateString === todayStr,
        isSelected: dateString === selectedDate,
        isDisabled: (min ? dateString < min : false) || (max ? dateString > max : false),
      });
    }

    return days;
  }, [viewYear, viewMonth, selectedDate, min, max]);

  const emitChange = (dateStr: string, hours: number, minutes: number) => {
    if (mode === 'time') {
      const hStr = String(hours).padStart(2, '0');
      const mStr = String(minutes).padStart(2, '0');
      const timeVal = `${hStr}:${mStr}`;
      setInternalVal(timeVal);
      onChange?.(timeVal);
      return;
    }

    if (!dateStr) {
      setInternalVal('');
      onChange?.('');
      return;
    }

    if (mode === 'date') {
      setInternalVal(dateStr);
      onChange?.(dateStr);
      return;
    }

    if (mode === 'datetime') {
      const hStr = String(hours).padStart(2, '0');
      const mStr = String(minutes).padStart(2, '0');
      const dtVal = `${dateStr}T${hStr}:${mStr}`;
      setInternalVal(dtVal);
      onChange?.(dtVal);
    }
  };

  const handleDaySelect = (dayObj: typeof calendarDays[0]) => {
    if (dayObj.isDisabled) return;
    setSelectedDate(dayObj.dateString);
    if (dayObj.month !== viewMonth) {
      setViewMonth(dayObj.month);
      setViewYear(dayObj.year);
    }
    if (mode === 'date') {
      emitChange(dayObj.dateString, selectedHours, selectedMinutes);
      setIsOpen(false);
      triggerRef.current?.focus();
    } else {
      emitChange(dayObj.dateString, selectedHours, selectedMinutes);
    }
  };

  const handleTimeChange = (hours: number, minutes: number) => {
    setSelectedHours(hours);
    setSelectedMinutes(minutes);
    const dateToUse = selectedDate || new Date().toISOString().slice(0, 10);
    emitChange(dateToUse, hours, minutes);
  };

  const handlePreset = (preset: 'today' | 'yesterday' | 'tomorrow' | 'now' | 'clear') => {
    const now = new Date();
    if (preset === 'clear') {
      setSelectedDate('');
      setInternalVal('');
      onChange?.('');
      setIsOpen(false);
      triggerRef.current?.focus();
      return;
    }

    let targetDate = new Date();
    if (preset === 'yesterday') {
      targetDate.setDate(now.getDate() - 1);
    } else if (preset === 'tomorrow') {
      targetDate.setDate(now.getDate() + 1);
    }

    const yyyy = targetDate.getFullYear();
    const mm = String(targetDate.getMonth() + 1).padStart(2, '0');
    const dd = String(targetDate.getDate()).padStart(2, '0');
    const dateStr = `${yyyy}-${mm}-${dd}`;

    setViewYear(targetDate.getFullYear());
    setViewMonth(targetDate.getMonth());
    setSelectedDate(dateStr);

    const h = preset === 'now' ? now.getHours() : selectedHours;
    const m = preset === 'now' ? now.getMinutes() : selectedMinutes;

    emitChange(dateStr, h, m);
    if (mode === 'date') {
      setIsOpen(false);
      triggerRef.current?.focus();
    }
  };

  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation();
    setSelectedDate('');
    setInternalVal('');
    onChange?.('');
    triggerRef.current?.focus();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (disabled) return;
    if (e.key === 'Escape' && isOpen) {
      e.preventDefault();
      setIsOpen(false);
      triggerRef.current?.focus();
    }
  };

  return (
    <div className={`relative w-full ${className}`} ref={containerRef}>
      {/* Hidden input for HTML form submission */}
      {name && (
        <input
          type="hidden"
          name={name}
          value={effectiveValue || ''}
          required={required && !effectiveValue}
        />
      )}

      {/* Trigger Button */}
      <button
        ref={triggerRef}
        type="button"
        disabled={disabled}
        aria-label={ariaLabel || placeholder || defaultPlaceholder}
        aria-expanded={isOpen}
        aria-haspopup="dialog"
        onClick={() => !disabled && setIsOpen(!isOpen)}
        onKeyDown={handleKeyDown}
        className={`input-field flex items-center justify-between text-left cursor-pointer text-xs sm:text-sm w-full min-h-[42px] px-3.5 py-2.5 bg-background border rounded-xl transition-all shadow-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-1 ${
          isOpen ? 'ring-2 ring-primary/30 border-primary shadow-sm' : 'hover:border-primary/50'
        } ${disabled ? 'opacity-50 cursor-not-allowed bg-muted' : ''}`}
      >
        <span className="flex items-center gap-2 truncate flex-1 pr-2">
          {mode === 'time' ? (
            <Clock size={16} className="text-primary shrink-0" />
          ) : (
            <CalendarIcon size={16} className="text-primary shrink-0" />
          )}
          {displayText ? (
            <span className="font-semibold text-foreground">{displayText}</span>
          ) : (
            <span className="text-muted-foreground/80">{placeholder || defaultPlaceholder}</span>
          )}
        </span>

        <div className="flex items-center gap-1.5 shrink-0 text-muted-foreground">
          {effectiveValue && !disabled && (
            <span
              role="button"
              tabIndex={0}
              title="Clear date"
              onClick={handleClear}
              className="p-1 rounded-md hover:bg-muted text-muted-foreground hover:text-foreground transition"
            >
              <X size={14} />
            </span>
          )}
          <span className="text-muted-foreground/70">
            {mode === 'time' ? <Clock size={14} /> : <CalendarIcon size={14} />}
          </span>
        </div>
      </button>

      {/* Popover / Calendar Modal rendered via Portal */}
      {isOpen && isMounted && createPortal(
        <div
          ref={popoverRef}
          style={popoverStyle}
          role="dialog"
          aria-label="Date and time picker dialog"
          onKeyDown={handleKeyDown}
          className="bg-background dark:bg-slate-900 border border-border shadow-2xl rounded-2xl overflow-hidden animate-in fade-in-50 zoom-in-95 p-4 space-y-3.5 text-foreground"
        >
          {/* Presets Header */}
          {showPresets && mode !== 'time' && (
            <div className="flex items-center justify-between gap-1.5 pb-2.5 border-b border-border text-xs">
              <div className="flex items-center gap-1.5 flex-wrap">
                <button
                  type="button"
                  onClick={() => handlePreset('today')}
                  className="px-2.5 py-1 rounded-lg bg-muted hover:bg-primary/10 hover:text-primary text-foreground font-semibold transition"
                >
                  Today
                </button>
                <button
                  type="button"
                  onClick={() => handlePreset('yesterday')}
                  className="px-2.5 py-1 rounded-lg bg-muted hover:bg-primary/10 hover:text-primary text-muted-foreground hover:text-foreground transition font-medium"
                >
                  Yesterday
                </button>
                <button
                  type="button"
                  onClick={() => handlePreset('tomorrow')}
                  className="px-2.5 py-1 rounded-lg bg-muted hover:bg-primary/10 hover:text-primary text-muted-foreground hover:text-foreground transition font-medium"
                >
                  Tomorrow
                </button>
              </div>
              {effectiveValue && (
                <button
                  type="button"
                  onClick={() => handlePreset('clear')}
                  className="text-rose-600 dark:text-rose-400 hover:text-rose-700 font-bold text-xs transition px-1 py-0.5"
                >
                  Clear
                </button>
              )}
            </div>
          )}

          {/* Month / Year Header */}
          {mode !== 'time' && (
            <div className="flex items-center justify-between px-1">
              <button
                type="button"
                onClick={prevMonth}
                className="w-9 h-9 rounded-xl border border-border bg-card hover:bg-muted text-foreground flex items-center justify-center transition shadow-xs focus-visible:ring-2 focus-visible:ring-primary"
                aria-label="Previous month"
              >
                <ChevronLeft size={18} />
              </button>

              <div className="flex items-center gap-1.5 text-sm sm:text-base font-extrabold text-foreground tracking-tight">
                <span>{MONTH_NAMES[viewMonth]}</span>
                <span className="text-primary">{viewYear}</span>
              </div>

              <button
                type="button"
                onClick={nextMonth}
                className="w-9 h-9 rounded-xl border border-border bg-card hover:bg-muted text-foreground flex items-center justify-center transition shadow-xs focus-visible:ring-2 focus-visible:ring-primary"
                aria-label="Next month"
              >
                <ChevronRight size={18} />
              </button>
            </div>
          )}

          {/* Calendar Grid */}
          {mode !== 'time' && (
            <div>
              {/* Day of Week Labels */}
              <div className="grid grid-cols-7 gap-1 text-center text-xs font-bold text-muted-foreground/80 mb-1.5">
                {DAYS_OF_WEEK.map((d) => (
                  <div key={d} className="py-1">
                    {d}
                  </div>
                ))}
              </div>

              {/* Day Cells - Large & Touch Friendly (36px–40px) */}
              <div className="grid grid-cols-7 gap-1 text-center" role="grid">
                {calendarDays.map((dayObj, i) => (
                  <button
                    key={`${dayObj.dateString}-${i}`}
                    type="button"
                    disabled={dayObj.isDisabled}
                    role="gridcell"
                    aria-selected={dayObj.isSelected}
                    onClick={() => handleDaySelect(dayObj)}
                    className={`w-9 h-9 sm:w-10 sm:h-10 mx-auto rounded-xl text-xs sm:text-sm flex items-center justify-center font-semibold transition-all ${
                      dayObj.isSelected
                        ? 'bg-primary text-primary-foreground font-extrabold shadow-md scale-105'
                        : dayObj.isToday
                        ? 'border-2 border-primary text-primary font-bold'
                        : dayObj.isCurrentMonth
                        ? 'text-foreground hover:bg-primary/10 hover:text-primary font-semibold'
                        : 'text-muted-foreground/40 hover:bg-muted/50 font-normal'
                    } ${dayObj.isDisabled ? 'opacity-25 cursor-not-allowed' : ''}`}
                  >
                    {dayObj.day}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Time Picker Section (for datetime or time mode) */}
          {(mode === 'datetime' || mode === 'time') && (
            <div className="pt-3 border-t border-border space-y-2.5">
              <div className="flex items-center justify-between text-xs font-bold text-foreground">
                <span className="flex items-center gap-1.5 text-primary">
                  <Clock size={15} /> Select Time
                </span>
                <button
                  type="button"
                  onClick={() => handlePreset('now')}
                  className="text-xs text-primary font-bold hover:underline"
                >
                  Set to current time
                </button>
              </div>

              {/* Time Steppers / Selectors */}
              <div className="flex items-center justify-center gap-2">
                <div className="flex flex-col items-center">
                  <label className="text-[10px] font-bold text-muted-foreground uppercase mb-0.5">Hour</label>
                  <select
                    value={selectedHours}
                    onChange={(e) => handleTimeChange(Number(e.target.value), selectedMinutes)}
                    aria-label="Select Hour"
                    className="bg-muted text-foreground font-mono text-sm font-bold rounded-xl min-h-[44px] px-3 py-2 border border-border focus:ring-2 focus:ring-primary outline-none cursor-pointer"
                  >
                    {Array.from({ length: 24 }, (_, i) => (
                      <option key={i} value={i}>
                        {String(i).padStart(2, '0')}:00 ({i % 12 || 12} {i >= 12 ? 'PM' : 'AM'})
                      </option>
                    ))}
                  </select>
                </div>

                <span className="font-extrabold text-lg text-muted-foreground mt-4">:</span>

                <div className="flex flex-col items-center">
                  <label className="text-[10px] font-bold text-muted-foreground uppercase mb-0.5">Minute</label>
                  <select
                    value={selectedMinutes}
                    onChange={(e) => handleTimeChange(selectedHours, Number(e.target.value))}
                    aria-label="Select Minute"
                    className="bg-muted text-foreground font-mono text-sm font-bold rounded-xl min-h-[44px] px-3 py-2 border border-border focus:ring-2 focus:ring-primary outline-none cursor-pointer"
                  >
                    {Array.from({ length: 12 }, (_, i) => i * 5).map((m) => (
                      <option key={m} value={m}>
                        {String(m).padStart(2, '0')} min
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Quick Time Preset Pills */}
              <div className="flex items-center justify-center gap-1.5 flex-wrap pt-1">
                {[
                  { label: '08:00 AM', h: 8, m: 0 },
                  { label: '12:00 PM', h: 12, m: 0 },
                  { label: '05:00 PM', h: 17, m: 0 },
                ].map((preset) => (
                  <button
                    key={preset.label}
                    type="button"
                    onClick={() => handleTimeChange(preset.h, preset.m)}
                    className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition ${
                      selectedHours === preset.h && selectedMinutes === preset.m
                        ? 'bg-primary text-primary-foreground font-bold shadow-xs'
                        : 'bg-primary/10 text-primary hover:bg-primary/20 border border-primary/20'
                    }`}
                  >
                    {preset.label}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Action / Done Button */}
          {(mode === 'datetime' || mode === 'time') && (
            <div className="pt-2 border-t border-border flex justify-end">
              <button
                type="button"
                onClick={() => {
                  setIsOpen(false);
                  triggerRef.current?.focus();
                }}
                className="w-full min-h-[42px] py-2.5 px-4 bg-primary text-primary-foreground font-bold text-xs sm:text-sm rounded-xl shadow-md flex items-center justify-center gap-2 hover:opacity-95 active:scale-[0.99] transition-all"
              >
                <Check size={16} className="stroke-[3]" /> Done & Apply
              </button>
            </div>
          )}
        </div>,
        document.body
      )}
    </div>
  );
}
