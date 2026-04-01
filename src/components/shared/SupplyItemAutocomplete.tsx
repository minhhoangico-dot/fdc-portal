/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { cn } from '@/lib/utils';
import type { SupplyItemSuggestion } from '@/types/roomManagement';

interface SupplyItemAutocompleteProps {
  value: string;
  onChange: (value: string) => void;
  onSelect: (suggestion: SupplyItemSuggestion) => void;
  suggestions: (query: string) => SupplyItemSuggestion[];
  placeholder?: string;
  className?: string;
}

const INPUT_CLASSNAME =
  'w-full rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-sm text-gray-900 outline-none transition focus:border-indigo-300 focus:ring-2 focus:ring-indigo-100';

export function SupplyItemAutocomplete({
  value,
  onChange,
  onSelect,
  suggestions,
  placeholder,
  className,
}: SupplyItemAutocompleteProps) {
  const [isOpen, setIsOpen] = React.useState(false);
  const [highlightIndex, setHighlightIndex] = React.useState(-1);
  const [filtered, setFiltered] = React.useState<SupplyItemSuggestion[]>([]);
  const blurTimeoutRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);

  const updateSuggestions = React.useCallback(
    (query: string) => {
      const results = suggestions(query);
      setFiltered(results);
      setIsOpen(results.length > 0);
      setHighlightIndex(-1);
    },
    [suggestions],
  );

  const handleChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const val = event.target.value;
    onChange(val);
    updateSuggestions(val);
  };

  const handleFocus = () => {
    if (blurTimeoutRef.current) {
      clearTimeout(blurTimeoutRef.current);
      blurTimeoutRef.current = null;
    }
    if (value.trim()) {
      updateSuggestions(value);
    }
  };

  const handleBlur = () => {
    blurTimeoutRef.current = setTimeout(() => setIsOpen(false), 150);
  };

  const selectItem = (suggestion: SupplyItemSuggestion) => {
    onChange(suggestion.itemName);
    onSelect(suggestion);
    setIsOpen(false);
    setHighlightIndex(-1);
  };

  const handleKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (!isOpen || filtered.length === 0) return;

    switch (event.key) {
      case 'ArrowDown':
        event.preventDefault();
        setHighlightIndex((prev) => (prev + 1) % filtered.length);
        break;
      case 'ArrowUp':
        event.preventDefault();
        setHighlightIndex((prev) => (prev <= 0 ? filtered.length - 1 : prev - 1));
        break;
      case 'Enter':
        event.preventDefault();
        if (highlightIndex >= 0 && highlightIndex < filtered.length) {
          selectItem(filtered[highlightIndex]);
        }
        break;
      case 'Escape':
        setIsOpen(false);
        setHighlightIndex(-1);
        break;
    }
  };

  const roomSuggestions = filtered.filter((s) => s.source === 'room');
  const globalSuggestions = filtered.filter((s) => s.source === 'global');

  let runningIndex = 0;

  return (
    <div className="relative">
      <input
        value={value}
        onChange={handleChange}
        onFocus={handleFocus}
        onBlur={handleBlur}
        onKeyDown={handleKeyDown}
        className={cn(INPUT_CLASSNAME, className)}
        placeholder={placeholder}
        autoComplete="off"
      />

      {isOpen && filtered.length > 0 && (
        <div className="absolute left-0 top-full z-[60] mt-1 w-full rounded-xl border border-gray-200 bg-white shadow-lg max-h-64 overflow-y-auto">
          {roomSuggestions.length > 0 && (
            <div>
              <div className="px-3 py-1.5 text-[11px] font-semibold uppercase tracking-wider text-gray-400">
                Phòng này
              </div>
              {roomSuggestions.map((suggestion) => {
                const idx = runningIndex++;
                return (
                  <button
                    key={`room-${suggestion.itemName}-${suggestion.unit}`}
                    type="button"
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => selectItem(suggestion)}
                    className={cn(
                      'flex w-full items-center justify-between gap-2 px-3 py-2 text-left text-sm transition-colors',
                      idx === highlightIndex
                        ? 'bg-indigo-50 text-indigo-900'
                        : 'text-gray-700 hover:bg-gray-50',
                    )}
                  >
                    <span className="font-medium truncate">{suggestion.itemName}</span>
                    <span className="flex shrink-0 items-center gap-2 text-xs text-gray-400">
                      <span>{suggestion.unit}</span>
                      {suggestion.lastQty != null && (
                        <span>SL: {suggestion.lastQty}</span>
                      )}
                      <span>×{suggestion.useCount}</span>
                    </span>
                  </button>
                );
              })}
            </div>
          )}

          {globalSuggestions.length > 0 && (
            <div>
              {roomSuggestions.length > 0 && (
                <div className="border-t border-gray-100" />
              )}
              <div className="px-3 py-1.5 text-[11px] font-semibold uppercase tracking-wider text-gray-400">
                Toàn phòng khám
              </div>
              {globalSuggestions.map((suggestion) => {
                const idx = runningIndex++;
                return (
                  <button
                    key={`global-${suggestion.itemName}-${suggestion.unit}`}
                    type="button"
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => selectItem(suggestion)}
                    className={cn(
                      'flex w-full items-center justify-between gap-2 px-3 py-2 text-left text-sm transition-colors',
                      idx === highlightIndex
                        ? 'bg-indigo-50 text-indigo-900'
                        : 'text-gray-700 hover:bg-gray-50',
                    )}
                  >
                    <span className="font-medium truncate">{suggestion.itemName}</span>
                    <span className="flex shrink-0 items-center gap-2 text-xs text-gray-400">
                      <span>{suggestion.unit}</span>
                      {suggestion.lastQty != null && (
                        <span>SL: {suggestion.lastQty}</span>
                      )}
                      <span>×{suggestion.useCount}</span>
                    </span>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
