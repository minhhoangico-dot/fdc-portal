export {};

const mockHisQuery = jest.fn();
const mockSnapshotUpsert = jest.fn();
const mockDailyUpsert = jest.fn();
const mockCleanupLt = jest.fn();
const mockCleanupNotLike = jest.fn(() => ({
  lt: mockCleanupLt,
}));
const mockCleanupNotIs = jest.fn(() => ({
  not: mockCleanupNotLike,
}));
const mockDelete = jest.fn(() => ({
  not: mockCleanupNotIs,
}));
const mockFrom = jest.fn((table: string) => {
  if (table === "fdc_inventory_snapshots") {
    return {
      upsert: mockSnapshotUpsert,
      delete: mockDelete,
    };
  }

  if (table === "fdc_inventory_daily_value") {
    return {
      upsert: mockDailyUpsert,
    };
  }

  throw new Error(`Unexpected table: ${table}`);
});
const mockInfo = jest.fn();
const mockError = jest.fn();
const mockWarn = jest.fn();
const mockLogSync = jest.fn();

jest.mock("../../src/db/his", () => ({
  hisPool: {
    query: (...args: any[]) => mockHisQuery(...args),
  },
}));

jest.mock("../../src/db/supabase", () => ({
  supabase: {
    from: (table: string) => mockFrom(table),
  },
}));

jest.mock("../../src/lib/logger", () => ({
  logger: {
    info: (...args: any[]) => mockInfo(...args),
    error: (...args: any[]) => mockError(...args),
    warn: (...args: any[]) => mockWarn(...args),
  },
}));

jest.mock("../../src/lib/syncLog", () => ({
  logSync: (...args: any[]) => mockLogSync(...args),
}));

describe("syncInventoryJob", () => {
  beforeEach(() => {
    mockHisQuery.mockReset();
    mockSnapshotUpsert.mockReset();
    mockDailyUpsert.mockReset();
    mockCleanupLt.mockReset();
    mockCleanupNotLike.mockClear();
    mockCleanupNotIs.mockClear();
    mockDelete.mockClear();
    mockFrom.mockClear();
    mockInfo.mockReset();
    mockError.mockReset();
    mockWarn.mockReset();
    mockLogSync.mockReset();

    mockHisQuery.mockResolvedValue({
      rows: [
        {
          his_medicineid: "S100",
          medicine_code: "TH001",
          name: "Thuoc A",
          unit: "Vien",
          warehouse_name: "Kho Thuoc",
          current_stock: 2,
          approved_export: 0,
          batch_number: "LO1",
          expiry_date: "2026-12-31",
          unit_price: 1000,
        },
        {
          his_medicineid: "S101",
          medicine_code: "TH002",
          name: "Thuoc B",
          unit: "Hop",
          warehouse_name: "Kho Thuoc",
          current_stock: 3,
          approved_export: 0,
          batch_number: "LO2",
          expiry_date: "2026-12-31",
          unit_price: 2000,
        },
      ],
    });
    mockSnapshotUpsert.mockResolvedValue({ error: null });
    mockDailyUpsert.mockResolvedValue({ error: null });
    mockCleanupLt.mockResolvedValue({ error: null });
    mockLogSync.mockResolvedValue(undefined);
  });

  it("writes HIS totals to module_type pharmacy and preserves MISA snapshots on cleanup", async () => {
    const { syncInventoryJob } = await import("../../src/jobs/syncInventory");

    await syncInventoryJob();

    expect(mockDailyUpsert).toHaveBeenCalledWith(
      [
        expect.objectContaining({
          module_type: "pharmacy",
          total_stock: 5,
          total_value: 8000,
        }),
      ],
      { onConflict: "snapshot_date,module_type" },
    );
    expect(mockCleanupNotIs).toHaveBeenCalledWith("his_medicineid", "is", null);
    expect(mockCleanupNotLike).toHaveBeenCalledWith(
      "his_medicineid",
      "like",
      "misa_%",
    );
    expect(mockCleanupLt).toHaveBeenCalledWith(
      "snapshot_date",
      expect.any(String),
    );
    expect(mockError).not.toHaveBeenCalled();
  });
});
