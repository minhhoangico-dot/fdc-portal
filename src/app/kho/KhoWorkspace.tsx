/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * KhoWorkspace — the parked "Kho & Dược" consolidation surface (route: /kho).
 *
 * Orchestrator only. It instantiates BOTH frozen viewmodels via the proven
 * enabled-dual-hook pattern (copied from app/valuation/page.tsx): only the
 * active warehouse's hook runs queries, the other stays idle. The two datasets
 * are NEVER merged — each warehouse renders from the same unedited viewmodel
 * that drives the live /pharmacy and /inventory pages, so the numbers are
 * identical by construction.
 *
 * Presentation is delegated to the shared Kho views (Tổng quan / Danh sách /
 * Giá trị / Bất thường) and, for Vật tư only, to the legacy inventory tabs
 * mounted VERBATIM (Tiêu thụ / Nhập xuất / Kiểm kê). Warehouse + sub-tab
 * persist to ?wh= / ?tab= for deep-linking and deterministic screenshots.
 *
 * This file owns no query, computation, threshold, sort, or filter logic.
 */

import { useSearchParams } from 'react-router-dom';
import { format, parseISO } from 'date-fns';

import { PageHeader } from '@/ui/PageHeader';
import { TabBar, type TabBarItem } from '@/ui/TabBar';
import { anomalyMatchesInventoryItem } from '@/lib/inventory-identity';
import type { InventoryAnomaly } from '@/types/inventory';
import { usePharmacyInventory } from '@/viewmodels/usePharmacyInventory';
import { useSupplyInventory } from '@/viewmodels/useSupplyInventory';

import KhoOverviewView from './KhoOverviewView';
import KhoInventoryListView from './KhoInventoryListView';
import KhoValuationView from './KhoValuationView';
import KhoAnomaliesView from './KhoAnomaliesView';
import KhoDetailDrawer from './KhoDetailDrawer';
import ConsumptionTab from '@/app/inventory/ConsumptionTab';
import ImportExportTab from '@/app/inventory/ImportExportTab';
import StocktakeTab from '@/app/inventory/StocktakeTab';

import {
  WAREHOUSES,
  coerceTab,
  coerceWarehouse,
  getKhoTabs,
  type KhoTabKey,
  type WarehouseKey,
} from './khoTabs';

function formatSyncLabel(lastSyncDate: string | null | undefined): string | undefined {
  if (!lastSyncDate) return undefined;
  try {
    return `Cập nhật: ${format(parseISO(lastSyncDate), 'dd/MM/yyyy HH:mm')}`;
  } catch {
    return undefined;
  }
}

export default function KhoWorkspace() {
  const [searchParams, setSearchParams] = useSearchParams();

  // URL is the single source of truth for warehouse + sub-tab (deep-linkable).
  const warehouse = coerceWarehouse(searchParams.get('wh'));
  const activeTab = coerceTab(warehouse, searchParams.get('tab'));

  // Enabled-dual-hook: only the active warehouse runs queries; no merge.
  const pharmacy = usePharmacyInventory({ enabled: warehouse === 'thuoc' });
  const supply = useSupplyInventory({ enabled: warehouse === 'vat-tu' });
  const vm = warehouse === 'thuoc' ? pharmacy : supply;

  const setWarehouse = (nextWarehouse: WarehouseKey) => {
    setSearchParams(
      (prev) => {
        const next = new URLSearchParams(prev);
        next.set('wh', nextWarehouse);
        // Keep the same sub-tab if it exists in the new warehouse, else reset.
        next.set('tab', coerceTab(nextWarehouse, next.get('tab')));
        return next;
      },
      { replace: true },
    );
  };

  const setTab = (nextTab: KhoTabKey) => {
    setSearchParams(
      (prev) => {
        const next = new URLSearchParams(prev);
        next.set('tab', nextTab);
        return next;
      },
      { replace: true },
    );
  };

  // Anomaly drill-down parity with the retired app/pharmacy/page.tsx:258–269:
  // resolve the anomaly to its inventory item, open the shared drawer, and
  // switch to the Danh sách sub-tab. Reads vm.filteredInventory only.
  const inspectAnomaly = (anomaly: InventoryAnomaly) => {
    const found = vm.filteredInventory.find((item) =>
      anomalyMatchesInventoryItem(anomaly, item),
    );

    if (!found) {
      return;
    }

    vm.setSelectedItem(found);
    setTab('danh-sach');
  };

  const warehouseItems: TabBarItem<WarehouseKey>[] = WAREHOUSES.map((w) => ({
    key: w.key,
    label: w.label,
    icon: <w.icon className="h-4 w-4" />,
  }));

  const tabItems: TabBarItem<KhoTabKey>[] = getKhoTabs(warehouse).map((t) => ({
    key: t.key,
    label: t.label,
    icon: <t.icon className="h-4 w-4" />,
  }));

  return (
    <div className="mx-auto max-w-7xl space-y-6 pb-24">
      <PageHeader
        title="Kho & Dược"
        sub={formatSyncLabel(vm.lastSyncDate)}
        actions={
          <TabBar
            tabs={warehouseItems}
            activeKey={warehouse}
            onChange={setWarehouse}
          />
        }
      />

      <TabBar tabs={tabItems} activeKey={activeTab} onChange={setTab} />

      {vm.error ? (
        <div className="rounded-field border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
          {vm.error}
        </div>
      ) : null}

      {activeTab === 'tong-quan' ? (
        <KhoOverviewView vm={vm} warehouse={warehouse} />
      ) : null}

      {activeTab === 'danh-sach' ? (
        <KhoInventoryListView vm={vm} warehouse={warehouse} />
      ) : null}

      {activeTab === 'gia-tri' ? (
        <KhoValuationView vm={vm} warehouse={warehouse} />
      ) : null}

      {activeTab === 'bat-thuong' ? (
        <KhoAnomaliesView vm={vm} warehouse={warehouse} onInspectAnomaly={inspectAnomaly} />
      ) : null}

      {/* Vật tư-only tabs — legacy inventory components mounted VERBATIM. */}
      {activeTab === 'tieu-thu' ? <ConsumptionTab /> : null}

      {activeTab === 'nhap-xuat' ? <ImportExportTab /> : null}

      {activeTab === 'kiem-ke' ? (
        <StocktakeTab filteredInventory={supply.filteredInventory} />
      ) : null}

      {/* Shared detail drawer — one mount serves both the Danh sách row click
          and the Bất thường anomaly click, for both warehouses. Renders null
          when no item is selected. */}
      <KhoDetailDrawer vm={vm} warehouse={warehouse} />
    </div>
  );
}
