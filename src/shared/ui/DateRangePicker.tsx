'use client';

import { useImperativeHandle, useRef, useState, useEffect, Ref } from 'react';
import {
  startOfMonth,
  endOfMonth,
  subDays,
  subMonths,
  startOfYear,
  startOfWeek,
  endOfWeek,
  format,
} from 'date-fns';
import { createPortal } from 'react-dom';
import { DateRange } from 'react-date-range';
import { Icon } from '@iconify/react';
import 'react-date-range/dist/styles.css';
import 'react-date-range/dist/theme/default.css';

// ─── Preset registry ──────────────────────────────────────────────────────────

export const PRESETS: readonly string[] = [
  'Today',
  'Yesterday',
  'Last 7 Days',
  'Last 30 Days',
  'Last 90 Days',
  'This Week',
  'Last Week',
  'This Month',
  'Last Month',
  'This Year',
  'All Time',
  'Custom Range',
] as const;

// ─── Local day helpers ────────────────────────────────────────────────────────

function sod(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate(), 0, 0, 0, 0);
}

function eod(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate(), 23, 59, 59, 999);
}

// ─── computePresetRange ───────────────────────────────────────────────────────

export function computePresetRange(
  label: string
): { startDate: Date | null; endDate: Date | null } {
  const now = new Date();

  switch (label) {
    case 'Today':
      return { startDate: sod(now), endDate: eod(now) };

    case 'Yesterday': {
      const yesterday = subDays(now, 1);
      return { startDate: sod(yesterday), endDate: eod(yesterday) };
    }

    case 'Last 7 Days':
      return { startDate: sod(subDays(now, 6)), endDate: eod(now) };

    case 'Last 30 Days':
      return { startDate: sod(subDays(now, 29)), endDate: eod(now) };

    case 'Last 90 Days':
      return { startDate: sod(subDays(now, 89)), endDate: eod(now) };

    case 'This Week':
      return { startDate: startOfWeek(now, { weekStartsOn: 1 }), endDate: eod(now) };

    case 'Last Week': {
      const lastWeekEnd = endOfWeek(subDays(now, 7), { weekStartsOn: 1 });
      const lastWeekStart = startOfWeek(subDays(now, 7), { weekStartsOn: 1 });
      return { startDate: lastWeekStart, endDate: lastWeekEnd };
    }

    case 'This Month':
      return { startDate: startOfMonth(now), endDate: eod(now) };

    case 'Last Month': {
      const lastMonth = subMonths(now, 1);
      return { startDate: startOfMonth(lastMonth), endDate: endOfMonth(lastMonth) };
    }

    case 'This Year':
      return { startDate: startOfYear(now), endDate: eod(now) };

    case 'All Time': {
      return { startDate: new Date(2020, 0, 1), endDate: eod(now) };
    }

    case 'Custom Range':
    default:
      return { startDate: null, endDate: null };
  }
}

// ─── Public types (backward-compatible with v1) ───────────────────────────────

export interface DateRangeValue {
  startDate: Date | null;
  endDate: Date | null;
  label?: string;
}

export interface DateRangePickerProps {
  value?: DateRangeValue;
  onChange?: (value: DateRangeValue) => void;
  className?: string;
  /** Extra classes applied to the trigger button itself */
  triggerClassName?: string;
  /** @deprecated — accepted for backward compat, no-op */
  hideDropdown?: boolean;
  mode?: 'light' | 'dark';
  allowedRanges?: string[];
  ref?: Ref<DateRangePickerRef>;
}

export interface DateRangePickerRef {
  focus: () => void;
  openDropdown: () => void;
}

// ─── Internal types ───────────────────────────────────────────────────────────

interface DraftRange {
  startDate: Date | null;
  endDate: Date | null;
  key: string; // always 'selection' — required by react-date-range
}

interface PresetItem {
  label: string;
}

interface LayoutProps {
  isDark: boolean;
  visibleRanges: PresetItem[];
  activeLabel: string;
  draftRange: DraftRange;
  calendarRenderKey: number;
  onPresetClick: (label: string) => void;
  onCalendarChange: (ranges: unknown) => void;
  onApply: () => void;
  onCancel: () => void;
}

interface PresetPanelProps {
  isDark: boolean;
  presets: PresetItem[];
  activeLabel: string;
  onSelect: (label: string) => void;
}

interface CalendarPanelProps {
  isDark: boolean;
  draftRange: DraftRange;
  calendarRenderKey: number;
  months: 1 | 2;
  direction: 'horizontal' | 'vertical';
  canApply: boolean;
  onCalendarChange: (ranges: unknown) => void;
  onApply: () => void;
  onCancel: () => void;
  shownDate?: Date;
}

interface DateInputsRowProps {
  isDark: boolean;
  draftRange: { startDate: Date | null; endDate: Date | null };
}

interface FooterActionsProps {
  isDark: boolean;
  canApply: boolean;
  onApply: () => void;
  onCancel: () => void;
}

// ─── FooterActions ────────────────────────────────────────────────────────────

function FooterActions({ isDark, canApply, onApply, onCancel }: FooterActionsProps) {
  return (
    <div
      className={`flex items-center justify-end gap-3 px-5 py-3 border-t ${
        isDark ? 'border-gray-700/80' : 'border-gray-100'
      }`}
    >
      <button
        type="button"
        onClick={onCancel}
        className={`px-4 py-2 rounded-lg text-sm font-semibold transition-colors duration-150 ${
          isDark
            ? 'text-gray-300 hover:bg-gray-800'
            : 'text-gray-600 hover:bg-gray-100'
        }`}
      >
        Cancel
      </button>
      <button
        type="button"
        onClick={onApply}
        disabled={!canApply}
        className={`px-5 py-2 rounded-lg text-sm font-bold transition-all duration-150 ${
          canApply
            ? 'bg-gcg-orange text-white hover:bg-gcg-orange-dark shadow-sm hover:shadow-md'
            : isDark
              ? 'bg-gray-700 text-gray-500 cursor-not-allowed'
              : 'bg-gray-100 text-gray-400 cursor-not-allowed'
        }`}
      >
        Apply
      </button>
    </div>
  );
}

// ─── DateInputsRow ────────────────────────────────────────────────────────────

function DateInputsRow({ isDark, draftRange }: DateInputsRowProps) {
  const fmt = (d: Date | null) => (d ? format(d, 'MMM d, yyyy') : '');

  return (
    <div
      className={`flex items-center gap-3 px-5 py-3 border-b ${
        isDark ? 'border-gray-700/80' : 'border-gray-100'
      }`}
    >
      {/* Start date */}
      <div className="flex-1">
        <p
          className={`text-[10px] font-bold uppercase tracking-widest mb-1 ${
            isDark ? 'text-blue-400' : 'text-gcg-orange'
          }`}
        >
          Start date
        </p>
        <div
          className={`px-3 py-1.5 rounded-lg border text-sm font-medium min-h-[34px] backdrop-blur-sm ${
            isDark
              ? 'bg-white/5 border-blue-500/60 text-gray-100'
              : 'bg-white/40 border-gcg-orange text-gray-800'
          }`}
        >
          {fmt(draftRange.startDate) || <span className="opacity-40">—</span>}
        </div>
      </div>

      <span className={`text-sm mt-5 shrink-0 ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>
        –
      </span>

      {/* End date */}
      <div className="flex-1">
        <p
          className={`text-[10px] font-bold uppercase tracking-widest mb-1 ${
            isDark ? 'text-gray-500' : 'text-gray-400'
          }`}
        >
          End date
        </p>
        <div
          className={`px-3 py-1.5 rounded-lg border text-sm font-medium min-h-[34px] backdrop-blur-sm ${
            isDark
              ? 'bg-white/5 border-gray-600 text-gray-100'
              : 'bg-white/40 border-gray-300 text-gray-800'
          }`}
        >
          {fmt(draftRange.endDate) || <span className="opacity-40">—</span>}
        </div>
      </div>
    </div>
  );
}

// ─── PresetPanel ──────────────────────────────────────────────────────────────

function PresetPanel({ isDark, presets, activeLabel, onSelect }: PresetPanelProps) {
  return (
    <div
      className={`flex flex-col py-2 shrink-0 ${isDark ? 'bg-gray-900/30' : 'bg-white/30'}`}
    >
      {presets.map((preset) => {
        const isActive = activeLabel === preset.label;
        return (
          <button
            key={preset.label}
            type="button"
            onClick={() => onSelect(preset.label)}
            className={`
              w-full text-left px-5 py-2.5 text-sm font-medium transition-colors duration-150
              focus:outline-none focus-visible:ring-2 focus-visible:ring-gcg-orange/40
              ${
                isActive
                  ? isDark
                    ? 'bg-gcg-orange/20 text-blue-300'
                    : 'bg-gcg-orange/10 text-gcg-orange'
                  : isDark
                    ? 'text-gray-300 hover:bg-white/5'
                    : 'text-gray-700 hover:bg-black/5'
              }
            `}
          >
            {preset.label}
          </button>
        );
      })}
    </div>
  );
}

// ─── CalendarPanel ────────────────────────────────────────────────────────────

function CalendarPanel({
  isDark,
  draftRange,
  calendarRenderKey,
  months,
  direction,
  canApply,
  onCalendarChange,
  onApply,
  onCancel,
  shownDate,
}: CalendarPanelProps) {
  return (
    <div className="flex flex-col flex-1 min-w-0">
      {/* Date inputs row */}
      <DateInputsRow isDark={isDark} draftRange={draftRange} />

      {/* Calendar */}
      <div
        className={`overflow-auto px-2 pb-1 ${isDark ? 'dark-mode-datepicker' : ''}`}
        style={{ maxHeight: 500 }}
      >
        <DateRange
          key={calendarRenderKey}
          ranges={[
            {
              startDate: draftRange.startDate ?? new Date(),
              endDate: draftRange.endDate ?? new Date(),
              key: 'selection',
            },
          ]}
          onChange={onCalendarChange}
          moveRangeOnFirstSelection={false}
          showDateDisplay={false}
          rangeColors={['#1b234f']}
          showMonthAndYearPickers={true}
          showPreview={true}
          editableDateInputs={false}
          maxDate={new Date()}
          direction={direction}
          months={months}
          shownDate={shownDate}
          className="w-full"
        />
      </div>

      {/* Footer actions */}
      <FooterActions
        isDark={isDark}
        canApply={canApply}
        onApply={onApply}
        onCancel={onCancel}
      />
    </div>
  );
}

// ─── DesktopLayout ────────────────────────────────────────────────────────────

function DesktopLayout({
  isDark,
  visibleRanges,
  activeLabel,
  draftRange,
  calendarRenderKey,
  onPresetClick,
  onCalendarChange,
  onApply,
  onCancel,
}: LayoutProps) {
  const canApply =
    draftRange.startDate !== null &&
    draftRange.endDate !== null &&
    draftRange.startDate <= draftRange.endDate;

  // For horizontal 2-month view: show the month before current so current is on the right.
  // If a start date is selected, show that month on the left.
  const shownDate = draftRange.startDate ?? subMonths(new Date(), 1);

  return (
    <div className="flex">
      {/* Left: preset panel — 160px, right border divider */}
      <div
        className={`flex flex-col border-r overflow-y-auto ${isDark ? 'border-gray-700/80' : 'border-gray-100'}`}
        style={{ width: 160, minWidth: 160, maxHeight: 450 }}
      >
        <PresetPanel
          isDark={isDark}
          presets={visibleRanges}
          activeLabel={activeLabel}
          onSelect={onPresetClick}
        />
      </div>

      {/* Right: calendar panel — fills remainder */}
      <CalendarPanel
        isDark={isDark}
        draftRange={draftRange}
        calendarRenderKey={calendarRenderKey}
        months={2}
        direction="horizontal"
        canApply={canApply}
        onCalendarChange={onCalendarChange}
        onApply={onApply}
        onCancel={onCancel}
        shownDate={shownDate}
      />
    </div>
  );
}

// ─── MobileLayout ─────────────────────────────────────────────────────────────

function MobileLayout({
  isDark,
  visibleRanges,
  activeLabel,
  draftRange,
  calendarRenderKey,
  onPresetClick,
  onCalendarChange,
  onApply,
  onCancel,
}: LayoutProps) {
  const canApply =
    draftRange.startDate !== null &&
    draftRange.endDate !== null &&
    draftRange.startDate <= draftRange.endDate;

  const shownDate = draftRange.startDate ?? new Date();

  return (
    <div className="flex flex-col max-h-[85vh] overflow-y-auto">
      {/* Top: preset panel — full width, bottom border */}
      <div className={`border-b ${isDark ? 'border-gray-700/80' : 'border-gray-100'}`}>
        <PresetPanel
          isDark={isDark}
          presets={visibleRanges}
          activeLabel={activeLabel}
          onSelect={onPresetClick}
        />
      </div>

      {/* Bottom: calendar panel */}
      <CalendarPanel
        isDark={isDark}
        draftRange={draftRange}
        calendarRenderKey={calendarRenderKey}
        months={1}
        direction="vertical"
        canApply={canApply}
        onCalendarChange={onCalendarChange}
        onApply={onApply}
        onCancel={onCancel}
        shownDate={shownDate}
      />
    </div>
  );
}

// ─── DateRangePicker (root component) ────────────────────────────────────────

function formatDisplayLabel(value: DateRangeValue | undefined): string {
  if (!value) return 'Select date range';
  if (value.label && value.label !== 'Custom Range') return value.label;
  if (value.startDate && value.endDate) {
    return `${format(value.startDate, 'MMM d, yyyy')} – ${format(value.endDate, 'MMM d, yyyy')}`;
  }
  return 'Select date range';
}

const DateRangePicker = function DateRangePicker(
  { value, onChange, className = '', triggerClassName = '', mode = 'light', allowedRanges, ref }: DateRangePickerProps
) {
    const isDark = mode === 'dark';

    // ── State ──────────────────────────────────────────────────────────────
    const [draftRange, setDraftRange] = useState<DraftRange>({
      startDate: value?.startDate ?? null,
      endDate: value?.endDate ?? null,
      key: 'selection',
    });
    const [activeLabel, setActiveLabel] = useState<string>(value?.label || 'Today');
    const [isOpen, setIsOpen] = useState(false);
    const [isMobile, setIsMobile] = useState(false);
    const [popoverStyle, setPopoverStyle] = useState<React.CSSProperties>({});
    const [calendarRenderKey, setCalendarRenderKey] = useState(0);

    // ── Refs ───────────────────────────────────────────────────────────────
    const triggerRef = useRef<HTMLButtonElement>(null);
    const popoverRef = useRef<HTMLDivElement>(null);

    // ── Derived ────────────────────────────────────────────────────────────
    const canApply =
      draftRange.startDate !== null &&
      draftRange.endDate !== null &&
      draftRange.startDate <= draftRange.endDate;

    const visibleRanges: PresetItem[] = (
      allowedRanges
        ? PRESETS.filter((p) => allowedRanges.includes(p))
        : [...PRESETS]
    ).map((label) => ({ label }));

    const displayLabel = formatDisplayLabel(value);

    // ── Mobile detection ───────────────────────────────────────────────────
    useEffect(() => {
      const check = () => setIsMobile(window.innerWidth < 768);
      check();
      window.addEventListener('resize', check);
      return () => window.removeEventListener('resize', check);
    }, []);

    // ── Sync external value → internal state ───────────────────────────────
    useEffect(() => {
      if (value) {
        setActiveLabel(value.label || 'Custom Range');
        setDraftRange({
          startDate: value.startDate,
          endDate: value.endDate,
          key: 'selection',
        });
      }
    }, [value]);

    // ── Positioning ────────────────────────────────────────────────────────
    const computePosition = () => {
      if (!triggerRef.current) return;
      const rect = triggerRef.current.getBoundingClientRect();
      const viewportWidth = window.innerWidth;
      const popoverWidth = isMobile ? Math.min(viewportWidth - 32, 360) : 680;

      let left = rect.left + window.scrollX;
      if (left + popoverWidth > viewportWidth - 16 + window.scrollX) {
        left = viewportWidth - popoverWidth - 16 + window.scrollX;
      }
      if (left < 16 + window.scrollX) left = 16 + window.scrollX;

      setPopoverStyle({
        position: 'absolute',
        top: rect.bottom + window.scrollY + 6,
        left,
        width: popoverWidth,
        zIndex: 9999,
      });
    };

    // Recompute on scroll/resize while open
    useEffect(() => {
      if (!isOpen) return undefined;
      const handler = () => computePosition();
      window.addEventListener('scroll', handler, true);
      window.addEventListener('resize', handler);
      return () => {
        window.removeEventListener('scroll', handler, true);
        window.removeEventListener('resize', handler);
      };
    }, [isOpen, isMobile]);

    // ── Open/close ─────────────────────────────────────────────────────────
    const openPopover = () => {
      setDraftRange({
        startDate: value?.startDate ?? null,
        endDate: value?.endDate ?? null,
        key: 'selection',
      });
      setActiveLabel(value?.label || 'Custom Range');
      computePosition();
      setIsOpen(true);
    };

    const closePopover = (revert = true) => {
      if (revert) {
        setDraftRange({
          startDate: value?.startDate ?? null,
          endDate: value?.endDate ?? null,
          key: 'selection',
        });
        setActiveLabel(value?.label || 'Custom Range');
      }
      setIsOpen(false);
    };

    // Outside click → cancel
    useEffect(() => {
      if (!isOpen) return undefined;
      const handler = (e: MouseEvent) => {
        const target = e.target as Node;
        if (popoverRef.current?.contains(target) || triggerRef.current?.contains(target)) return;
        closePopover(true);
      };
      document.addEventListener('mousedown', handler);
      return () => document.removeEventListener('mousedown', handler);
    }, [isOpen, value]);

    // Escape → cancel
    useEffect(() => {
      if (!isOpen) return undefined;
      const handler = (e: KeyboardEvent) => {
        if (e.key === 'Escape') closePopover(true);
      };
      document.addEventListener('keydown', handler);
      return () => document.removeEventListener('keydown', handler);
    }, [isOpen, value]);

    // Focus management: move focus into popover on open
    useEffect(() => {
      if (!isOpen || !popoverRef.current) return undefined;
      const t = setTimeout(() => {
        try {
          const focusable = popoverRef.current?.querySelector<HTMLElement>(
            'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
          );
          focusable?.focus();
        } catch {
          // graceful degradation — focus stays on trigger
        }
      }, 0);
      return () => clearTimeout(t);
    }, [isOpen]);

    // Focus trap inside popover
    useEffect(() => {
      if (!isOpen || !popoverRef.current) return undefined;
      const handler = (e: KeyboardEvent) => {
        if (e.key !== 'Tab' || !popoverRef.current) return;
        const focusables = Array.from(
          popoverRef.current.querySelectorAll<HTMLElement>(
            'button:not([disabled]), [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
          )
        );
        if (focusables.length === 0) return;
        const first = focusables[0];
        const last = focusables[focusables.length - 1];
        if (e.shiftKey) {
          if (document.activeElement === first) {
            e.preventDefault();
            last.focus();
          }
        } else {
          if (document.activeElement === last) {
            e.preventDefault();
            first.focus();
          }
        }
      };
      document.addEventListener('keydown', handler);
      return () => document.removeEventListener('keydown', handler);
    }, [isOpen]);

    // ── Imperative handle ──────────────────────────────────────────────────
    useImperativeHandle(ref, () => ({
      focus: () => openPopover(),
      openDropdown: () => openPopover(),
    }));

    // ── Handlers ───────────────────────────────────────────────────────────
    const handlePresetClick = (label: string) => {
      const range = computePresetRange(label);
      setActiveLabel(label);
      setDraftRange({ ...range, key: 'selection' });
      if (label === 'Custom Range') {
        setCalendarRenderKey((k) => k + 1);
      }
      // Do NOT call onChange — requires Apply
    };

    const handleCalendarChange = (ranges: unknown) => {
      let sel: { startDate?: Date; endDate?: Date } | null = null;
      if (Array.isArray(ranges)) {
        sel = ranges[0];
      } else if (ranges && typeof ranges === 'object') {
        const r = ranges as Record<string, unknown>;
        sel = (r.selection as typeof sel) ?? (Object.values(r)[0] as typeof sel);
      }
      if (!sel) return;
      setDraftRange({
        startDate: sel.startDate ?? null,
        endDate: sel.endDate ?? null,
        key: 'selection',
      });
      // If user drags on calendar while a preset is active, switch to Custom Range
      setActiveLabel('Custom Range');
    };

    const handleApply = () => {
      if (!canApply) return;
      onChange?.({
        startDate: draftRange.startDate,
        endDate: draftRange.endDate,
        label: activeLabel,
      });
      closePopover(false);
      // Return focus to trigger
      setTimeout(() => triggerRef.current?.focus(), 0);
    };

    const handleCancel = () => {
      closePopover(true);
      setTimeout(() => triggerRef.current?.focus(), 0);
    };

    // ── Render ─────────────────────────────────────────────────────────────
    const layoutProps: LayoutProps = {
      isDark,
      visibleRanges,
      activeLabel,
      draftRange,
      calendarRenderKey,
      onPresetClick: handlePresetClick,
      onCalendarChange: handleCalendarChange,
      onApply: handleApply,
      onCancel: handleCancel,
    };

    return (
      <div className={`relative inline-block ${className}`}>
        {/* ── Trigger button ── */}
        <button
          ref={triggerRef}
          type="button"
          onClick={() => (isOpen ? handleCancel() : openPopover())}
          aria-haspopup="true"
          aria-expanded={isOpen}
          className={`
            flex items-center gap-2 px-3 py-2 rounded-lg border text-sm font-medium backdrop-blur-md
            transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-gcg-orange/40
            ${isDark
              ? 'bg-white/5 border-white/10 text-gray-200 hover:bg-white/10 hover:border-white/20'
              : 'bg-white/50 border-white/40 text-gray-700 hover:bg-white/70 hover:border-white/60'
            }
            ${isOpen
              ? isDark
                ? 'border-gcg-orange/60 ring-2 ring-gcg-orange/20'
                : 'border-gcg-orange/50 ring-2 ring-gcg-orange/10'
              : ''
            }
            ${triggerClassName}
          `}
        >
          <Icon
            icon="solar:calendar-date-broken"
            className={`w-4 h-4 shrink-0 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}
          />
          <span className="max-w-[200px] truncate">{displayLabel}</span>
          <Icon
            icon={isOpen ? 'solar:alt-arrow-up-broken' : 'solar:alt-arrow-down-broken'}
            className={`w-3.5 h-3.5 shrink-0 ${isDark ? 'text-gray-400' : 'text-gray-400'}`}
          />
        </button>

        {/* ── Popover (portalled to body) ── */}
        {isOpen && typeof document !== 'undefined' &&
          createPortal(
            <div
              ref={popoverRef}
              style={popoverStyle}
              role="dialog"
              aria-label="Date range picker"
              className={`
                drp-popover rounded-2xl shadow-md border overflow-hidden backdrop-blur-xl
                ${isDark
                  ? 'dark bg-gray-950/60 border-white/10'
                  : 'bg-white/70 border-white/20'
                }
              `}
            >
              {isMobile
                ? <MobileLayout {...layoutProps} />
                : <DesktopLayout {...layoutProps} />
              }
            </div>,
            document.body
          )
        }
      </div>
    );
}

export default DateRangePicker;
