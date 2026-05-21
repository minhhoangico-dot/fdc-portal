/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

const mockFetchThresholdConfigs = jest.fn();
const mockLogSync = jest.fn();
const mockInsert = jest.fn();
const mockUpdateIn = jest.fn();

const snapshotRows = [
  {
    his_medicineid: "S100",
    warehouse: "Kho Thuoc",
    name: "Thuoc A",
    category: "Khac",
    unit: "Vien",
    snapshot_date: "2026-04-05",
    current_stock: 10,
    expiry_date: null,
  },
  {
    his_medicineid: "S100",
    warehouse: "Kho Thuoc",
    name: "Thuoc A",
    category: "Khac",
    unit: "Vien",
    snapshot_date: "2026-04-06",
    current_stock: 0,
    expiry_date: null,
  },
];

jest.mock("../../src/db/supabase", () => ({
  supabase: {
    from: (table: string) => {
      if (table === "fdc_inventory_snapshots") {
        return {
          select: () => ({
            gte: () => ({
              order: async () => ({
                data: snapshotRows,
                error: null,
              }),
            }),
          }),
        };
      }

      if (table === "fdc_analytics_anomalies") {
        return {
          select: () => ({
            eq: async () => ({
              data: [
                {
                  id: "legacy-other-item",
                  material_name: "Thuoc A",
                  inventory_item_key: "s200::kho le",
                  module_type: "pharmacy",
                  rule_id: "zero_stock",
                  is_acknowledged: false,
                },
                {
                  id: "legacy-null-key",
                  material_name: "Thuoc A",
                  inventory_item_key: null,
                  module_type: "pharmacy",
                  rule_id: "near_expiry",
                  is_acknowledged: false,
                },
              ],
              error: null,
            }),
          }),
          update: () => ({
            in: mockUpdateIn,
          }),
          insert: mockInsert,
        };
      }

      throw new Error(`Unexpected table: ${table}`);
    },
  },
}));

jest.mock("../../src/lib/anomalyThresholds", () => {
  const actual = jest.requireActual("../../src/lib/anomalyThresholds");
  return {
    ...actual,
    fetchThresholdConfigs: () => mockFetchThresholdConfigs(),
  };
});

jest.mock("../../src/lib/logger", () => ({
  logger: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  },
}));

jest.mock("../../src/lib/syncLog", () => ({
  logSync: (...args: any[]) => mockLogSync(...args),
}));

describe("detectAnomaliesJob", () => {
  beforeEach(() => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date("2026-04-06T01:00:00.000Z"));
    mockFetchThresholdConfigs.mockReset();
    mockLogSync.mockReset();
    mockInsert.mockReset();
    mockUpdateIn.mockReset();

    mockFetchThresholdConfigs.mockResolvedValue(new Map());
    mockInsert.mockResolvedValue({ error: null });
    mockUpdateIn.mockResolvedValue({ error: null });
    mockLogSync.mockResolvedValue(undefined);
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it("creates a pharmacy anomaly for the exact inventory key even when another same-name anomaly exists", async () => {
    const { detectAnomaliesJob } = await import("../../src/jobs/detectAnomalies");

    await detectAnomaliesJob();

    expect(mockInsert).toHaveBeenCalledWith([
      expect.objectContaining({
        material_name: "Thuoc A",
        inventory_item_key: "s100::kho thuoc",
        module_type: "pharmacy",
        rule_id: "zero_stock",
      }),
    ]);
  });
});
