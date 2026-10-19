'use client';

import { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import { Icon } from '@iconify/react';
import GlassPanel from '@/shared/ui/GlassPanel';

function useDebounce<T>(value: T, delay: number): T {
  const [debounced, setDebounced] = useState<T>(value);
  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);
  return debounced;
}

export interface FilterOption {
  id: string;
  label: string;
  category: string;
  value: string;
}

export interface ActiveFilter {
  category: string;
  values: string[];
  label: string;
  operator: 'is' | 'is_not';
}

export interface FilterCategoryDef {
  id: string;
  label: string;
  icon: string;
}

export interface UnifiedSearchFilterProps {
  mode: 'light' | 'dark';
  onFilterChange: (filters: ActiveFilter[]) => void;
  onSearchChange?: (searchTerm: string) => void;
  filterCategories?: FilterCategoryDef[];
  categoryOptions?: Record<string, FilterOption[]>;
  singleSelectCategories?: string[];
  initialFilters?: ActiveFilter[];
  searchPlaceholder?: string;
}

type PanelState = 'search' | 'values';

export default function UnifiedSearchFilter({
  mode,
  onFilterChange,
  onSearchChange,
  filterCategories = [],
  categoryOptions = {},
  singleSelectCategories,
  initialFilters,
  searchPlaceholder = 'Search and filter...',
}: UnifiedSearchFilterProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [inputValue, setInputValue] = useState('');
  const [activeFilters, setActiveFilters] = useState<ActiveFilter[]>(initialFilters ?? []);
  const [panelState, setPanelState] = useState<PanelState>('search');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [selectedValues, setSelectedValues] = useState<string[]>([]);
  const [operator, setOperator] = useState<'is' | 'is_not'>('is');
  const [valueSearch, setValueSearch] = useState('');

  const debouncedInput = useDebounce(inputValue, 300);
  const debouncedValueSearch = useDebounce(valueSearch, 300);
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const externalUpdateRef = useRef(false);
  useEffect(() => {
    if (initialFilters) {
      externalUpdateRef.current = true;
      setActiveFilters(initialFilters);
    }
  }, [initialFilters]);

  const getAllFilterOptions = useMemo(() => {
    const allOptions: Array<{ category: string; categoryLabel: string; value: string; label: string; icon: string }> = [];
    filterCategories.forEach((cat) => {
      const options = categoryOptions[cat.id] ?? [];
      options.forEach((opt) => {
        allOptions.push({ category: cat.id, categoryLabel: cat.label, value: opt.value, label: opt.label, icon: cat.icon });
      });
    });
    return allOptions;
  }, [filterCategories, categoryOptions]);

  const matchingSuggestions = useMemo(() => {
    if (!debouncedInput.trim()) return [];
    const lower = debouncedInput.toLowerCase();
    const catMatches = filterCategories
      .filter((c) => c.label.toLowerCase().startsWith(lower))
      .map((c) => ({ type: 'category' as const, category: c.id, categoryLabel: c.label, icon: c.icon, displayText: c.label }));
    const valMatches = getAllFilterOptions
      .filter((o) => o.label.toLowerCase().includes(lower))
      .map((o) => ({ type: 'value' as const, category: o.category, categoryLabel: o.categoryLabel, icon: o.icon, value: o.value, displayText: `${o.categoryLabel}: ${o.label}` }));
    return [...catMatches, ...valMatches];
  }, [debouncedInput, getAllFilterOptions, filterCategories]);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
        setPanelState('search');
        setSelectedValues([]);
        setOperator('is');
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handler);
      return () => document.removeEventListener('mousedown', handler);
    }
    return undefined;
  }, [isOpen]);

  useEffect(() => { onSearchChange?.(inputValue); }, [inputValue, onSearchChange]);
  useEffect(() => {
    if (externalUpdateRef.current) { externalUpdateRef.current = false; return; }
    onFilterChange(activeFilters);
  }, [activeFilters, onFilterChange]);

  const handleRemoveFilter = (index: number) => setActiveFilters((prev) => prev.filter((_, i) => i !== index));

  const handleSelectCategory = (categoryId: string) => {
    const existing = activeFilters.find((f) => f.category === categoryId);
    setSelectedCategory(categoryId);
    setSelectedValues(existing?.values ?? []);
    setOperator(existing?.operator ?? 'is');
    setPanelState('values');
  };

  const applyFilter = useCallback((values: string[], op: 'is' | 'is_not', categoryId?: string) => {
    const catId = categoryId ?? selectedCategory;
    if (!catId) return;

    if (values.length === 0) {
      setActiveFilters((prev) => prev.filter((f) => f.category !== catId));
      return;
    }

    const categoryLabel = filterCategories.find((c) => c.id === catId)?.label ?? '';
    const isSingle = singleSelectCategories?.includes(catId) ?? false;
    const operatorText = op === 'is' ? 'is' : 'is not';

    setActiveFilters((prev) => {
      const idx = prev.findIndex((f) => f.category === catId);
      const makeLabel = (vals: string[]) => {
        const vLabel = vals.map((v) => getAllFilterOptions.find((o) => o.value === v)?.label ?? v).join(', ');
        return `${categoryLabel}: ${operatorText} ${vLabel}`;
      };

      if (idx >= 0 && !isSingle) {
        const combined = Array.from(new Set([...prev[idx].values, ...values]));
        const updated = [...prev];
        updated[idx] = { category: catId, values: combined, label: makeLabel(combined), operator: op };
        return updated;
      } else if (idx >= 0 && isSingle) {
        const updated = [...prev];
        updated[idx] = { category: catId, values, label: makeLabel(values), operator: op };
        return updated;
      } else {
        return [...prev, { category: catId, values, label: makeLabel(values), operator: op }];
      }
    });
  }, [selectedCategory, filterCategories, singleSelectCategories, getAllFilterOptions]);

  const replaceCategoryValues = (values: string[], op: 'is' | 'is_not') => {
    const catId = selectedCategory;
    if (!catId) return;
    setActiveFilters((prev) => prev.filter((f) => f.category !== catId));
    if (values.length > 0) applyFilter(values, op, catId);
  };

  const currentOptions = selectedCategory ? (categoryOptions[selectedCategory] ?? []) : [];
  const filteredValues = currentOptions.filter((o) => o.label.toLowerCase().includes(debouncedValueSearch.toLowerCase()));
  const selectedCategoryLabel = filterCategories.find((c) => c.id === selectedCategory)?.label;

  const showPanel = isOpen;

  return (
    <div className="relative w-full" ref={containerRef}>
      {/* Input bar */}
      <div
        onClick={() => { setIsOpen(true); setPanelState('search'); inputRef.current?.focus(); }}
        className={`w-full flex items-center gap-2 px-4 py-1.5 rounded-xl border transition-all cursor-text ${
          mode === 'dark'
            ? `border-gray-700 ${isOpen ? 'bg-gray-800 ring-2 ring-brand-500/50' : 'bg-gray-900 hover:bg-gray-800'}`
            : `border-gray-300 ${isOpen ? 'bg-white ring-2 ring-brand-500/50' : 'bg-gray-50 hover:bg-white'}`
        }`}
      >
        <Icon icon="solar:magnifer-broken" className={`w-5 h-5 shrink-0 ${mode === 'dark' ? 'text-gray-500' : 'text-gray-400'}`} />

        <div className="flex items-center gap-1.5 flex-1 min-w-0">
          <div className="flex gap-1.5 flex-wrap">
            {activeFilters.map((filter, index) => (
              <button
                key={`${filter.category}-${index}`}
                onClick={(e) => { e.stopPropagation(); handleRemoveFilter(index); }}
                className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium whitespace-nowrap transition-all ${
                  mode === 'dark'
                    ? 'bg-brand-500/20 text-orange-300 border border-brand-500/40 hover:bg-brand-500/30'
                    : 'bg-brand-500/10 text-brand-500 border border-brand-500/30 hover:bg-brand-500/20'
                }`}
              >
                <span>{filter.label}</span>
                <Icon icon="solar:close-circle-broken" className="w-3 h-3" />
              </button>
            ))}
          </div>

          <input
            ref={inputRef}
            type="text"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            placeholder={activeFilters.length === 0 ? searchPlaceholder : 'Add filter or search...'}
            className={`flex-1 bg-transparent outline-none min-w-0 text-sm ${
              mode === 'dark' ? 'text-gray-100 placeholder-gray-500' : 'text-gray-900 placeholder-gray-500'
            }`}
            onFocus={() => { setIsOpen(true); setPanelState('search'); }}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && matchingSuggestions.length > 0) {
                e.preventDefault();
                const first = matchingSuggestions[0];
                if (first.type === 'value') {
                  applyFilter([(first as any).value], 'is', first.category);
                  setInputValue('');
                  setPanelState('search');
                  setSelectedValues([]);
                  setSelectedCategory(null);
                  inputRef.current?.focus();
                } else {
                  handleSelectCategory(first.category);
                }
              } else if (e.key === 'Backspace' && inputValue === '' && activeFilters.length > 0) {
                e.preventDefault();
                setActiveFilters((prev) => prev.slice(0, -1));
              }
            }}
          />
        </div>

        {(inputValue || activeFilters.length > 0) && (
          <button
            onClick={(e) => { e.stopPropagation(); setInputValue(''); setActiveFilters([]); setPanelState('search'); }}
            className={`p-1 ${mode === 'dark' ? 'text-gray-500 hover:text-gray-400' : 'text-gray-400 hover:text-gray-600'}`}
          >
            <Icon icon="solar:close-circle-broken" className="w-5 h-5" />
          </button>
        )}

        <Icon icon="solar:funnel-broken" className={`w-5 h-5 shrink-0 ${mode === 'dark' ? 'text-gray-500' : 'text-gray-400'}`} />
      </div>

      {/* Dropdown panel */}
      {showPanel && (filterCategories.length > 0 || inputValue.trim() !== '') && (
        <div className="absolute top-full mt-2 left-0 z-50" style={{ width: '360px' }}>
          <GlassPanel
            mode={mode}
            className={`rounded-xl backdrop-blur-sm ${mode === 'dark' ? 'bg-gray-900/60' : 'bg-white/80'}`}
            shadow={mode === 'dark' ? 'shadow-xl shadow-black/20' : 'shadow-xl shadow-slate-200/50'}
          >
            {panelState === 'search' && (
              <div className="flex flex-col max-h-96">
                <div className="flex-1 p-2 overflow-y-auto space-y-1">
                  {inputValue.trim() === '' ? (
                    filterCategories.map((cat) => (
                      <button
                        key={cat.id}
                        onClick={() => handleSelectCategory(cat.id)}
                        className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all ${
                          mode === 'dark' ? 'text-gray-300 hover:bg-gray-700' : 'text-gray-700 hover:bg-gray-100'
                        }`}
                      >
                        <Icon icon={cat.icon} className="w-4 h-4" />
                        <span className="flex-1 text-left">{cat.label}</span>
                        <Icon icon="solar:alt-arrow-right-broken" className="w-4 h-4 opacity-50" />
                      </button>
                    ))
                  ) : (
                    matchingSuggestions.length > 0 ? (
                      matchingSuggestions.map((s, idx) => (
                        <button
                          key={`${s.type}-${idx}`}
                          onClick={() => {
                            if (s.type === 'value') {
                              applyFilter([(s as any).value], 'is', s.category);
                              setInputValue('');
                              setPanelState('search');
                              setSelectedValues([]);
                              setSelectedCategory(null);
                            } else {
                              handleSelectCategory(s.category);
                            }
                          }}
                          className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-all ${
                            s.type === 'value'
                              ? mode === 'dark'
                                ? 'text-orange-300 hover:bg-brand-500/20 bg-brand-500/10 border border-brand-500/40'
                                : 'text-brand-500 hover:bg-brand-500/15 bg-brand-500/5 border border-brand-500/30'
                              : mode === 'dark'
                                ? 'text-gray-300 hover:bg-gray-700/50 bg-gray-800/50 border border-gray-700'
                                : 'text-gray-700 hover:bg-gray-100 bg-gray-50 border border-gray-200'
                          }`}
                        >
                          <Icon
                            icon={s.type === 'value' ? 'solar:check-circle-bold' : 'solar:alt-arrow-right-broken'}
                            className="w-4 h-4"
                          />
                          <span className="font-medium">{s.displayText.replace(':', ' is')}</span>
                        </button>
                      ))
                    ) : (
                      <p className={`text-xs text-center py-4 ${mode === 'dark' ? 'text-gray-500' : 'text-gray-400'}`}>
                        No matches found
                      </p>
                    )
                  )}
                </div>
              </div>
            )}

            {panelState === 'values' && (
              <div className="flex flex-col max-h-96">
                <button
                  onClick={() => { setPanelState('search'); setSelectedValues([]); }}
                  className={`w-full px-3 py-3 border-b flex items-center gap-2 transition-colors ${
                    mode === 'dark'
                      ? 'border-gray-700 hover:bg-gray-800/50 text-gray-300'
                      : 'border-gray-200 hover:bg-gray-50 text-gray-600'
                  }`}
                >
                  <Icon icon="solar:alt-arrow-left-broken" className="w-4 h-4 shrink-0" />
                  <p className="text-sm font-semibold flex-1 text-left">{selectedCategoryLabel}</p>
                </button>

                <div className={`px-3 py-2 border-b ${mode === 'dark' ? 'border-gray-700' : 'border-gray-200'}`}>
                  <input
                    type="text"
                    placeholder="Search values..."
                    value={valueSearch}
                    onChange={(e) => setValueSearch(e.target.value)}
                    className={`w-full px-2 py-1.5 text-sm rounded border outline-none transition-all ${
                      mode === 'dark'
                        ? 'bg-gray-700 border-gray-600 text-gray-100 placeholder-gray-500 focus:border-brand-500'
                        : 'bg-gray-50 border-gray-300 text-gray-900 placeholder-gray-500 focus:border-brand-500'
                    }`}
                    autoFocus
                  />
                </div>

                <div className="flex-1 p-2 overflow-y-auto space-y-1">
                  {filteredValues.map((opt) => (
                    <button
                      key={opt.id}
                      onClick={() => {
                        const isSingle = singleSelectCategories?.includes(selectedCategory ?? '') ?? false;
                        const newValues = selectedValues.includes(opt.value)
                          ? selectedValues.filter((v) => v !== opt.value)
                          : isSingle ? [opt.value] : [...selectedValues, opt.value];
                        setSelectedValues(newValues);
                        replaceCategoryValues(newValues, operator);
                      }}
                      className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-all ${
                        mode === 'dark' ? 'text-gray-300 hover:bg-gray-700' : 'text-gray-700 hover:bg-gray-100'
                      }`}
                    >
                      <div
                        className={`w-4 h-4 rounded border flex items-center justify-center shrink-0 ${
                          selectedValues.includes(opt.value)
                            ? 'bg-brand-500 border-brand-500 text-white'
                            : mode === 'dark' ? 'border-gray-600' : 'border-gray-300'
                        }`}
                      >
                        {selectedValues.includes(opt.value) && (
                          <Icon icon="solar:check-circle-bold" className="w-3 h-3" />
                        )}
                      </div>
                      <span>{opt.label}</span>
                    </button>
                  ))}
                </div>

                <div className={`border-t p-3 ${mode === 'dark' ? 'border-gray-700' : 'border-gray-200'}`}>
                  <div className="flex gap-1 bg-gray-100 dark:bg-gray-700 rounded-lg p-1">
                    {(['is', 'is_not'] as const).map((op) => (
                      <button
                        key={op}
                        onClick={() => { setOperator(op); replaceCategoryValues(selectedValues, op); }}
                        className={`flex-1 px-3 py-1.5 rounded text-xs font-medium transition-all ${
                          operator === op
                            ? mode === 'dark' ? 'bg-brand-500 text-white' : 'bg-white text-brand-500 shadow-sm'
                            : mode === 'dark' ? 'text-gray-400 hover:text-gray-300' : 'text-gray-600 hover:text-gray-900'
                        }`}
                      >
                        {op === 'is' ? 'Include' : 'Exclude'}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </GlassPanel>
        </div>
      )}
    </div>
  );
}
