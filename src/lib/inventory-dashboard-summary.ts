/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { anomalyMatchesInventoryItem } from "@/lib/inventory-identity";
import type { InventoryAnomaly, InventoryItem } from "@/types/inventory";

export const countActiveInventoryAnomalies = (
  anomalies: InventoryAnomaly[],
  inventory: InventoryItem[],
): number => {
  const counted = new Set<string>();

  for (const anomaly of anomalies) {
    if (anomaly.acknowledged || counted.has(anomaly.id)) {
      continue;
    }

    if (inventory.some((item) => anomalyMatchesInventoryItem(anomaly, item))) {
      counted.add(anomaly.id);
    }
  }

  return counted.size;
};
