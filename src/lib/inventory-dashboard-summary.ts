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
  let count = 0;

  for (const anomaly of anomalies) {
    if (anomaly.acknowledged) continue;

    // Anomalies with module_type are already scoped by the query filter
    if (anomaly.moduleType) {
      count++;
    } else {
      // Legacy rows without module_type: fall back to item matching
      if (inventory.some((item) => anomalyMatchesInventoryItem(anomaly, item))) {
        count++;
      }
    }
  }

  return count;
};
