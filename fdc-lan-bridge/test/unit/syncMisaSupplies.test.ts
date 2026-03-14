export {};

const mockMisaQuery = jest.fn();
const mockConnect = jest.fn();
const mockSnapshotUpsert = jest.fn();
const mockDailyUpsert = jest.fn();
const mockFrom = jest.fn((table: string) => {
  if (table === "fdc_inventory_snapshots") {
    return {
      upsert: mockSnapshotUpsert,
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
const mockLogSync = jest.fn();
const MockRequest = jest.fn(() => ({
  query: (...args: any[]) => mockMisaQuery(...args),
}));

jest.mock("mssql", () => ({
  __esModule: true,
  default: {
    Request: MockRequest,
  },
}));

jest.mock("../../src/db/misa", () => ({
  misaPool: {
    connected: true,
    connect: (...args: any[]) => mockConnect(...args),
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
  },
}));

jest.mock("../../src/lib/syncLog", () => ({
  logSync: (...args: any[]) => mockLogSync(...args),
}));

describe("syncMisaSuppliesJob", () => {
  beforeEach(() => {
    mockMisaQuery.mockReset();
    mockConnect.mockReset();
    mockSnapshotUpsert.mockReset();
    mockDailyUpsert.mockReset();
    mockFrom.mockClear();
    mockInfo.mockReset();
    mockError.mockReset();
    mockLogSync.mockReset();
    MockRequest.mockClear();

    mockMisaQuery
      .mockResolvedValueOnce({
        recordset: [
          {
            InventoryItemCode: "VT001",
            InventoryItemName: "Vat tu A",
            InventoryAccount: "1522",
            UnitID: "U1",
            balance: 4,
            total_value: 100,
          },
        ],
      })
      .mockResolvedValueOnce({
        recordset: [{ UnitID: "U1", UnitName: "Hop" }],
      });
    mockSnapshotUpsert.mockResolvedValue({ error: null });
    mockDailyUpsert.mockResolvedValue({ error: null });
    mockLogSync.mockResolvedValue(undefined);
  });

  it("writes MISA supplies to misa_* snapshots and inventory aggregate", async () => {
    const { syncMisaSuppliesJob } = await import("../../src/jobs/syncMisaSupplies");

    await syncMisaSuppliesJob();

    expect(mockSnapshotUpsert).toHaveBeenCalledWith(
      [
        expect.objectContaining({
          his_medicineid: "misa_VT001",
          category: "Vật tư y tế",
          current_stock: 4,
          unit_price: 25,
        }),
      ],
      { onConflict: "his_medicineid,snapshot_date" },
    );
    expect(mockDailyUpsert).toHaveBeenCalledWith(
      [
        expect.objectContaining({
          module_type: "inventory",
          total_stock: 4,
          total_value: 100,
        }),
      ],
      { onConflict: "snapshot_date,module_type" },
    );
    expect(mockError).not.toHaveBeenCalled();
  });
});
