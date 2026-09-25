'use client';

import React, { useState, useEffect, useRef, useMemo } from 'react';
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
  const containerRef = useRef<HTMLDivElement>(null);

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

  // Close on outside click
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
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
    }
  };

  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation();
    setSelectedDate('');
    setInternalVal('');
    onChange?.('');
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
        type="button"
        disabled={disabled}
        aria-label={ariaLabel || placeholder || defaultPlaceholder}
        onClick={() => !disabled && setIsOpen(!isOpen)}
        className={`input-field flex items-center justify-between text-left cursor-pointer text-xs w-full min-h-[38px] px-3 py-2 bg-background border rounded-md transition-all ${
          isOpen ? 'ring-2 ring-primary/20 border-primary' : 'hover:border-primary/50'
        } ${disabled ? 'opacity-50 cursor-not-allowed bg-muted' : ''}`}
      >
        <span className="flex items-center gap-2 truncate flex-1 pr-2">
          {mode === 'time' ? (
            <Clock size={15} className="text-primary shrink-0" />
          ) : (
            <CalendarIcon size={15} className="text-primary shrink-0" />
          )}
          {displayText ? (
            <span className="font-medium text-foreground">{displayText}</span>
          ) : (
            <span className="text-muted-foreground">{placeholder || defaultPlaceholder}</span>
          )}
        </span>

        <div className="flex items-center gap-1.5 shrink-0 text-muted-foreground">
          {value && !disabled && (
            <span
              role="button"
              tabIndex={0}
              title="Clear date"
              onClick={handleClear}
              className="p-0.5 rounded hover:bg-muted text-muted-foreground hover:text-foreground"
            >
              <X size={13} />
            </span>
          )}
          <span className="text-muted-foreground/60">
            {mode === 'time' ? <Clock size={13} /> : <CalendarIcon size={13} />}
          </span>
        </div>
      </button>

      {/* Popover / Calendar Modal */}
      {isOpen && (
        <div className="absolute z-[10050] top-full left-0 mt-1.5 w-full sm:w-80 bg-background border border-border shadow-2xl rounded-xl overflow-hidden animate-in fade-in-50 zoom-in-95 p-3 space-y-3">
          {/* Presets Header */}
          {showPresets && mode !== 'time' && (
            <div className="flex items-center justify-between gap-1 pb-2 border-b border-border text-[11px]">
              <div className="flex items-center gap-1 flex-wrap">
                <button
                  type="button"
                  onClick={() => handlePreset('today')}
                  className="px-2 py-0.5 rounded bg-muted hover:bg-muted/80 text-foreground font-medium transition"
                >
                  Today
                </button>
                <button
                  type="button"
                  onClick={() => handlePreset('yesterday')}
                  className="px-2 py-0.5 rounded bg-muted hover:bg-muted/80 text-muted-foreground hover:text-foreground transition"
                >
                  Yesterday
                </button>
                <button
                  type="button"
                  onClick={() => handlePreset('tomorrow')}
                  className="px-2 py-0.5 rounded bg-muted hover:bg-muted/80 text-muted-foreground hover:text-foreground transition"
                >
                  Tomorrow
                </button>
              </div>
              {value && (
                <button
                  type="button"
                  onClick={() => handlePreset('clear')}
                  className="text-rose-600 hover:text-rose-700 font-semibold text-[10px]"
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
                className="p-1 rounded-md hover:bg-muted text-muted-foreground hover:text-foreground transition"
                aria-label="Previous month"
              >
                <ChevronLeft size={16} />
              </button>

              <div className="flex items-center gap-1.5 text-xs font-bold text-foreground">
                <span>{MONTH_NAMES[viewMonth]}</span>
                <span>{viewYear}</span>
              </div>

              <button
                type="button"
                onClick={nextMonth}
                className="p-1 rounded-md hover:bg-muted text-muted-foreground hover:text-foreground transition"
                aria-label="Next month"
              >
                <ChevronRight size={16} />
              </button>
            </div>
          )}

          {/* Calendar Grid */}
          {mode !== 'time' && (
            <div>
              {/* Day of Week Labels */}
              <div className="grid grid-cols-7 gap-1 text-center text-[10px] font-semibold text-muted-foreground mb-1">
                {DAYS_OF_WEEK.map((d) => (
                  <div key={d} className="py-0.5">
                    {d}
                  </div>
                ))}
              </div>

              {/* Day Cells */}
              <div className="grid grid-cols-7 gap-1 text-center">
                {calendarDays.map((dayObj, i) => (
                  <button
                    key={`${dayObj.dateString}-${i}`}
                    type="button"
                    disabled={dayObj.isDisabled}
                    onClick={() => handleDaySelect(dayObj)}
                    className={`h-7 w-7 mx-auto rounded-lg text-xs flex items-center justify-center font-medium transition-all ${
                      dayObj.isSelected
                        ? 'bg-primary text-primary-foreground font-bold shadow-xs'
                        : dayObj.isToday
                        ? 'border border-primary text-primary font-bold'
                        : dayObj.isCurrentMonth
                        ? 'text-foreground hover:bg-muted'
                        : 'text-muted-foreground/40 hover:bg-muted/50'
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
            <div className="pt-2 border-t border-border space-y-2">
              <div className="flex items-center justify-between text-xs font-semibold text-muted-foreground">
                <span className="flex items-center gap-1">
                  <Clock size={13} /> Time
                </span>
                <button
                  type="button"
                  onClick={() => handlePreset('now')}
                  className="text-[10px] text-primary hover:underline"
                >
                  Set to current time
                </button>
              </div>

              <div className="flex items-center justify-center gap-2 text-xs">
                {/* Hours Select */}
                <div className="flex items-center gap-1">
                  <select
                    value={selectedHours}
                    onChange={(e) => handleTimeChange(Number(e.target.value), selectedMinutes)}
                    className="bg-muted text-foreground font-mono text-xs rounded-md px-2 py-1 border border-border focus:ring-1 focus:ring-primary outline-hidden"
                  >
                    {Array.from({ length: 24 }, (_, i) => (
                      <option key={i} value={i}>
                        {String(i).padStart(2, '0')}:00 ({i % 12 || 12} {i >= 12 ? 'PM' : 'AM'})
                      </option>
                    ))}
                  </select>
                </div>

                <span className="font-bold text-muted-foreground">:</span>

                {/* Minutes Select */}
                <div className="flex items-center gap-1">
                  <select
                    value={selectedMinutes}
                    onChange={(e) => handleTimeChange(selectedHours, Number(e.target.value))}
                    className="bg-muted text-foreground font-mono text-xs rounded-md px-2 py-1 border border-border focus:ring-1 focus:ring-primary outline-hidden"
                  >
                    {Array.from({ length: 12 }, (_, i) => i * 5).map((m) => (
                      <option key={m} value={m}>
                        {String(m).padStart(2, '0')} min
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>
          )}

          {/* Done Button for datetime / time */}
          {(mode === 'datetime' || mode === 'time') && (
            <div className="pt-2 border-t border-border flex justify-end">
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="btn-primary py-1 px-3 text-xs flex items-center gap-1"
              >
                <Check size={12} /> Done
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
