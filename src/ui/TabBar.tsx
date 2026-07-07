/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import type { ReactNode } from 'react';

/**
 * TabBar — the gray-100 pill tab pattern already used across the portal
 * (e.g. `src/app/attendance/page.tsx`), tokenized: active = card bg +
 * brand-600 text (direction §5.2).
 *
 * Pure presentational: no supabase, no viewmodels.
 */

export interface TabBarItem<K extends string = string> {
  key: K;
  label: string;
  icon?: ReactNode;
}

export interface TabBarProps<K extends string = string> {
  tabs: TabBarItem<K>[];
  activeKey: K;
  onChange: (key: K) => void;
  className?: string;
}

export function TabBar<K extends string = string>({
  tabs,
  activeKey,
  onChange,
  className = '',
}: TabBarProps<K>) {
  return (
    <div className={`flex overflow-x-auto rounded-field bg-gray-100 p-1 ${className}`.trim()}>
      {tabs.map((tab) => (
        <button
          key={tab.key}
          type="button"
          onClick={() => onChange(tab.key)}
          className={`flex flex-1 items-center justify-center gap-1.5 whitespace-nowrap rounded-field px-3 py-2 text-[13px] font-medium transition-all sm:flex-none ${
            activeKey === tab.key
              ? 'bg-card text-brand-600 shadow-card'
              : 'text-ink-600 hover:text-ink-900'
          }`}
        >
          {tab.icon}
          {tab.label}
        </button>
      ))}
    </div>
  );
}

export default TabBar;
