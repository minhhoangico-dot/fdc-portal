export {};

const mockMisaQuery = jest.fn();
const mockConnect = jest.fn();
const mockSnapshotUpsert = jest.fn();
const mockSnapshotDelete = jest.fn();
const mockDailyUpsert = jest.fn();
const mockInfo = jest.fn();
const mockError = jest.fn();
const mockLogSync = jest.fn();

const MockRequest = jest.fn(() => {
  const inputs: Record<string, unknown> = {};
  const request = {
    input: (name: string, _type: unknown, value: unknown) => {
      inputs[name] = value;
      return request;
    },
    query: (sql: string) => mockMisaQuery(sql, { ...inputs }),
  };

  return request;
});

const mockFrom = jest.fn((table: string) => {
  if (table === "fdc_inventory_snapshots") {
    let selected = "";
    let startDate = "";
    let endDate = "";
    let warehouse = "";
    let deleteMode = false;

    const chain: any = {
      select: (columns: string) => {
        selected = columns;
        return chain;
      },
      like: () => chain,
      eq: (column: string, value: string) => {
        if (deleteMode && column === "warehouse") {
          warehouse = value;
        }
        return chain;
      },
      order: () => chain,
      gte: (_column: string, value: string) => {
        startDate = value;
        return chain;
      },
      lte: (_column: string, value: string) => {
        endDate = value;
        if (deleteMode) {
          mockSnapshotDelete({
            startDate,
            endDate,
            warehouse,
          });
          return Promise.resolve({ error: null });
        }
        return chain;
      },
      limit: async () => {
        if (selected === "snapshot_date") {
          return {
            data: [{ snapshot_date: "2026-03-12" }],
            error: null,
          };
        }

        throw new Error(`Unexpected inventory snapshot limit select: ${selected}`);
      },
      range: async () => {
        if (
          selected === "snapshot_date, current_stock, unit_price, his_medicineid" &&
          startDate === "2026-03-13" &&
          endDate === "2026-03-14"
        ) {
          return {
            data: [
              {
                snapshot_date: "2026-03-13",
                current_stock: 8,
                unit_price: 25,
                his_medicineid: "misa_VT001__stock_1522",
              },
              {
                snapshot_date: "2026-03-14",
                current_stock: 4,
                unit_price: 25,
                his_medicineid: "misa_VT001__stock_1522",
              },
              {
                snapshot_date: "2026-03-14",
                current_stock: 6,
                unit_price: 20,
                his_medicineid: "misa_VT001__stock_1521",
              },
            ],
            error: null,
          };
        }

        return { data: [], error: null };
      },
      delete: () => {
        deleteMode = true;
        return chain;
      },
      upsert: mockSnapshotUpsert,
    };

    return chain;
  }

  if (table === "fdc_inventory_daily_value") {
    let selected = "";

    const chain: any = {
      select: (columns: string) => {
        selected = columns;
        return chain;
      },
      eq: () => chain,
      order: () => chain,
      limit: async () => {
        if (selected === "snapshot_date") {
          return {
            data: [{ snapshot_date: "2026-03-12" }],
            error: null,
          };
        }

        throw new Error(`Unexpected inventory daily value limit select: ${selected}`);
      },
      upsert: mockDailyUpsert,
    };

    return chain;
  }

  throw new Error(`Unexpected table: ${table}`);
});

jest.mock("mssql", () => ({
  __esModule: true,
  default: {
    Date: "Date",
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
    jest.useFakeTimers();
    jest.setSystemTime(new Date("2026-03-13T23:30:00.000Z"));

    mockMisaQuery.mockReset();
    mockConnect.mockReset();
    mockSnapshotUpsert.mockReset();
    mockSnapshotDelete.mockReset();
    mockDailyUpsert.mockReset();
    mockInfo.mockReset();
    mockError.mockReset();
    mockLogSync.mockReset();
    mockFrom.mockClear();
    MockRequest.mockClear();

    mockMisaQuery.mockImplementation(async (sql: string) => {
      if (sql.includes("CONVERT(varchar(10), CAST(l.RefDate AS date), 23) as snapshot_date")) {
        return {
          recordset: [
            {
              snapshot_date: "2026-03-13",
              InventoryItemCode: "VT001",
              StockID: "1522",
              StockCode: "1522",
              StockName: "Kho Dich vu",
              delta_stock: -2,
              delta_value: -50,
            },
          ],
        };
      }

      if (sql.includes("AND l.RefDate < @startDate")) {
        return {
          recordset: [
            {
              InventoryItemCode: "VT001",
              StockID: "1522",
              StockCode: "1522",
              StockName: "Kho Dich vu",
              balance: 10,
              total_value: 250,
            },
          ],
        };
      }

      if (sql.includes("HAVING SUM(ISNULL(l.InwardQuantity, 0)) - SUM(ISNULL(l.OutwardQuantity, 0)) > 0")) {
        return {
          recordset: [
            {
              InventoryItemCode: "VT001",
              InventoryItemName: "Vat tu A",
              InventoryAccount: "1522",
              UnitName: "Hop",
              StockID: "1522",
              StockCode: "1522",
              StockName: "Kho Dich vu",
              balance: 4,
              total_value: 100,
            },
            {
              InventoryItemCode: "VT001",
              InventoryItemName: "Vat tu A",
              InventoryAccount: "1522",
              UnitName: "Hop",
              StockID: "1521",
              StockCode: "1521",
              StockName: "Kho Khac",
              balance: 6,
              total_value: 120,
            },
          ],
        };
      }

      if (
        sql.includes("MAX(i.InventoryItemName) as InventoryItemName") &&
        sql.includes("GROUP BY i.InventoryItemCode, l.StockID")
      ) {
        return {
          recordset: [
            {
              InventoryItemCode: "VT001",
              InventoryItemName: "Vat tu A",
              InventoryAccount: "1522",
              UnitName: "Hop",
              StockID: "1522",
              StockCode: "1522",
              StockName: "Kho Dich vu",
            },
            {
              InventoryItemCode: "VT001",
              InventoryItemName: "Vat tu A",
              InventoryAccount: "1522",
              UnitName: "Hop",
              StockID: "1521",
              StockCode: "1521",
              StockName: "Kho Khac",
            },
          ],
        };
      }

      throw new Error(`Unexpected MISA query: ${sql}`);
    });

    mockSnapshotUpsert.mockResolvedValue({ error: null });
    mockDailyUpsert.mockResolvedValue({ error: null });
    mockLogSync.mockResolvedValue(undefined);
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it("backfills missed MISA snapshots before refreshing today's inventory total", async () => {
    const { syncMisaSuppliesJob } = await import("../../src/jobs/syncMisaSupplies");

    await syncMisaSuppliesJob();

    expect(mockSnapshotUpsert).toHaveBeenNthCalledWith(
      1,
      [
        expect.objectContaining({
          his_medicineid: "misa_VT001__stock_1522",
          snapshot_date: "2026-03-13",
          warehouse: "Kho Dich vu",
          current_stock: 8,
          unit_price: 25,
          category: "V\u1eadt t\u01b0 y t\u1ebf",
        }),
      ],
      { onConflict: "his_medicineid,warehouse,snapshot_date" },
    );

    expect(mockSnapshotUpsert).toHaveBeenNthCalledWith(
      2,
      expect.arrayContaining([
        expect.objectContaining({
          his_medicineid: "misa_VT001__stock_1522",
          snapshot_date: "2026-03-14",
          warehouse: "Kho Dich vu",
          current_stock: 4,
          unit_price: 25,
          category: "V\u1eadt t\u01b0 y t\u1ebf",
        }),
        expect.objectContaining({
          his_medicineid: "misa_VT001__stock_1521",
          snapshot_date: "2026-03-14",
          warehouse: "Kho Khac",
          current_stock: 6,
          unit_price: 20,
          category: "V\u1eadt t\u01b0 y t\u1ebf",
        }),
      ]),
      { onConflict: "his_medicineid,warehouse,snapshot_date" },
    );

    expect(mockDailyUpsert).toHaveBeenCalledWith(
      [
        {
          snapshot_date: "2026-03-13",
          module_type: "inventory",
          total_stock: 8,
          total_value: 200,
        },
        {
          snapshot_date: "2026-03-14",
          module_type: "inventory",
          total_stock: 10,
          total_value: 220,
        },
      ],
      { onConflict: "snapshot_date,module_type" },
    );

    expect(mockSnapshotDelete).toHaveBeenCalledWith({
      startDate: "2026-03-13",
      endDate: "2026-03-14",
      warehouse: "Kh\u1ed1i V\u1eadt T\u01b0",
    });

    expect(mockError).not.toHaveBeenCalled();
  });
});
