/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { AlertTriangle } from "lucide-react";

const COPY = {
  label: "\u0043\u1ea3\u006e\u0068\u0020\u0062\u00e1\u006f",
} as const;

export interface InventoryAlertsPanelProps {
  count: number;
  onOpen: () => void;
}

export function InventoryAlertsPanel({
  count,
  onOpen,
}: InventoryAlertsPanelProps) {
  return (
    <button
      type="button"
      onClick={onOpen}
      className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm text-left transition-colors hover:border-gray-200 focus:outline-none focus:ring-2 focus:ring-indigo-300"
    >
      <div className="flex items-center gap-3 mb-2">
        <div
          className={`w-10 h-10 rounded-full flex items-center justify-center ${
            count > 0 ? "bg-rose-50 text-rose-600" : "bg-emerald-50 text-emerald-600"
          }`}
        >
          <AlertTriangle className="w-5 h-5" />
        </div>
        <span className="text-sm font-medium text-gray-500">{COPY.label}</span>
      </div>
      <p className={`text-2xl font-bold ${count > 0 ? "text-rose-600" : "text-gray-900"}`}>
        {count}
      </p>
    </button>
  );
}
