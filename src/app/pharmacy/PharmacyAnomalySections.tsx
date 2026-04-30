/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import type { ReactNode } from "react";
import { format, parseISO } from "date-fns";
import { AlertTriangle, Eye, ShieldAlert } from "lucide-react";

import type { InventoryAnomaly } from "@/types/inventory";

const COPY = {
  previewTitle: "\u0043\u1ea3\u006e\u0068\u0020\u0062\u00e1\u006f\u0020\u0063\u1ea7\u006e\u0020\u0078\u1eed\u0020\u006c\u00fd",
  viewAll: "\u0058\u0065\u006d\u0020\u0074\u1ea5\u0074\u0020\u0063\u1ea3\u0020\u2192",
  emptyTitle: "\u004b\u0068\u00f4\u006e\u0067\u0020\u0063\u00f3\u0020\u0062\u1ea5\u0074\u0020\u0074\u0068\u01b0\u1edd\u006e\u0067",
  emptyBody:
    "\u0054\u1ea5\u0074\u0020\u0063\u1ea3\u0020\u0074\u0068\u0075\u1ed1\u0063\u0020\u0074\u0072\u006f\u006e\u0067\u0020\u006b\u0068\u006f\u0020\u0111\u0061\u006e\u0067\u0020\u1edf\u0020\u0074\u0072\u1ea1\u006e\u0067\u0020\u0074\u0068\u00e1\u0069\u0020\u0062\u00ec\u006e\u0068\u0020\u0074\u0068\u01b0\u1edd\u006e\u0067\u002e",
  detectedAt: "\u0050\u0068\u00e1\u0074\u0020\u0068\u0069\u1ec7\u006e",
  inspect: "\u0058\u0065\u006d\u0020\u0063\u0068\u0069\u0020\u0074\u0069\u1ebf\u0074",
  acknowledge: "\u0058\u00e1\u0063\u0020\u006e\u0068\u1ead\u006e",
  acknowledged: "\u0110\u00e3\u0020\u0078\u00e1\u0063\u0020\u006e\u0068\u1ead\u006e",
} as const;

export interface PharmacyAnomalyPreviewProps {
  anomalies: InventoryAnomaly[];
  getSeverityColor: (severity: string) => string;
  getSeverityLabel: (severity: string) => string;
  onShowAll: () => void;
}

export function PharmacyAnomalyPreview({
  anomalies,
  getSeverityColor,
  getSeverityLabel,
  onShowAll,
}: PharmacyAnomalyPreviewProps) {
  if (anomalies.length === 0) {
    return null;
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
          <AlertTriangle className="w-5 h-5 text-rose-500" />
          {COPY.previewTitle} ({anomalies.length})
        </h2>
        <button
          type="button"
          onClick={onShowAll}
          className="text-sm text-indigo-600 hover:text-indigo-800 font-medium"
        >
          {COPY.viewAll}
        </button>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
        {anomalies.slice(0, 6).map((anomaly) => (
          <div
            key={anomaly.id}
            className="bg-white rounded-xl p-4 border border-gray-100 shadow-sm hover:border-rose-200 transition-colors"
          >
            <div className="flex items-start gap-3">
              <div
                className={`mt-0.5 px-2 py-1 rounded text-[10px] font-bold uppercase tracking-wider ${getSeverityColor(
                  anomaly.severity,
                )}`}
              >
                {getSeverityLabel(anomaly.severity)}
              </div>
              <div className="flex-1 min-w-0">
                <h4 className="font-bold text-gray-900 text-sm truncate">{anomaly.materialId}</h4>
                <p className="text-xs text-gray-600 mt-1 line-clamp-2">{anomaly.description}</p>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export interface PharmacyAnomalyCenterProps {
  anomalies: InventoryAnomaly[];
  getSeverityColor: (severity: string) => string;
  getSeverityLabel: (severity: string) => string;
  getRuleLabel: (rule: string) => string;
  getRuleIcon: (rule: string) => ReactNode;
  onInspectAnomaly: (anomaly: InventoryAnomaly) => void;
  onAcknowledgeAnomaly: (id: string) => void;
}

export function PharmacyAnomalyCenter({
  anomalies,
  getSeverityColor,
  getSeverityLabel,
  getRuleLabel,
  getRuleIcon,
  onInspectAnomaly,
  onAcknowledgeAnomaly,
}: PharmacyAnomalyCenterProps) {
  const activeAnomalies = anomalies.filter((anomaly) => !anomaly.acknowledged);
  const acknowledgedAnomalies = anomalies.filter((anomaly) => anomaly.acknowledged);

  if (activeAnomalies.length === 0) {
    return (
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-12 text-center">
        <div className="w-16 h-16 rounded-full bg-emerald-50 flex items-center justify-center mx-auto mb-4">
          <ShieldAlert className="w-8 h-8 text-emerald-500" />
        </div>
        <h3 className="text-lg font-bold text-gray-900 mb-2">{COPY.emptyTitle}</h3>
        <p className="text-sm text-gray-500">{COPY.emptyBody}</p>
      </div>
    );
  }

  const anomalyByRule = activeAnomalies.reduce<Record<string, InventoryAnomaly[]>>(
    (groups, anomaly) => {
      if (!groups[anomaly.rule]) {
        groups[anomaly.rule] = [];
      }

      groups[anomaly.rule].push(anomaly);
      return groups;
    },
    {},
  );

  return (
    <>
      {Object.entries(anomalyByRule).map(([rule, items]) => (
        <div key={rule} className="space-y-3">
          <h2 className="text-base font-bold text-gray-900 flex items-center gap-2">
            {getRuleIcon(rule)}
            {getRuleLabel(rule)}
            <span className="text-sm font-medium text-gray-400">({items.length})</span>
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {items.map((anomaly) => (
              <div
                key={anomaly.id}
                className="bg-white rounded-xl p-4 border border-gray-100 shadow-sm flex flex-col gap-3"
              >
                <div className="flex items-start gap-3">
                  <div
                    className={`mt-0.5 px-2 py-1 rounded text-[10px] font-bold uppercase tracking-wider ${getSeverityColor(
                      anomaly.severity,
                    )}`}
                  >
                    {getSeverityLabel(anomaly.severity)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h4 className="font-bold text-gray-900 text-sm truncate">
                      {anomaly.materialId}
                    </h4>
                    <p className="text-xs text-gray-600 mt-1">{anomaly.description}</p>
                    <p className="text-xs text-gray-400 mt-2">
                      {COPY.detectedAt}: {format(parseISO(anomaly.detectedAt), "HH:mm dd/MM/yyyy")}
                    </p>
                  </div>
                </div>
                <div className="flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => onInspectAnomaly(anomaly)}
                    className="px-3 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-xs font-medium rounded-lg transition-colors flex items-center gap-1"
                  >
                    <Eye className="w-3 h-3" /> {COPY.inspect}
                  </button>
                  <button
                    type="button"
                    onClick={() => onAcknowledgeAnomaly(anomaly.id)}
                    className="px-3 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs font-medium rounded-lg transition-colors"
                  >
                    {COPY.acknowledge}
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}

      {acknowledgedAnomalies.length > 0 ? (
        <details className="mt-4">
          <summary className="text-sm text-gray-500 cursor-pointer hover:text-gray-700">
            {COPY.acknowledged} ({acknowledgedAnomalies.length})
          </summary>
          <div className="mt-3 space-y-2">
            {acknowledgedAnomalies.slice(0, 10).map((anomaly) => (
              <div
                key={anomaly.id}
                className="flex items-center gap-3 p-3 rounded-lg bg-gray-50 text-sm"
              >
                <div className="w-2 h-2 rounded-full bg-gray-300 shrink-0" />
                <div className="flex-1 min-w-0">
                  <span className="font-medium text-gray-700">{anomaly.materialId}</span>
                  <span className="text-gray-400 ml-2">{anomaly.description}</span>
                </div>
                <span className="text-xs text-gray-400 shrink-0">
                  {format(parseISO(anomaly.detectedAt), "dd/MM")}
                </span>
              </div>
            ))}
          </div>
        </details>
      ) : null}
    </>
  );
}
