export {};

const mockHisQuery = jest.fn();
const mockSnapshotUpsert = jest.fn();
const mockDailyUpsert = jest.fn();
const mockCleanupLt = jest.fn();
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
    from: (table: string) => {
      if (table === "fdc_inventory_snapshots") {
        let selected = "";
        let snapshotDateFilter: string | null = null;
        let startDateFilter: string | null = null;
        let endDateFilter: string | null = null;

        const chain: any = {
          not: () => chain,
          select: (columns: string) => {
            selected = columns;
            return chain;
          },
          order: () => chain,
          eq: (column: string, value: string) => {
            if (column === "snapshot_date") {
              snapshotDateFilter = value;
            }
            return chain;
          },
          gte: (_column: string, value: string) => {
            startDateFilter = value;
            return chain;
          },
          lte: (_column: string, value: string) => {
            endDateFilter = value;
            return chain;
          },
          limit: async () => {
            if (selected === "snapshot_date") {
              return {
                data: [{ snapshot_date: "2026-03-12" }],
                error: null,
              };
            }

            throw new Error(`Unexpected limit select for snapshots: ${selected}`);
          },
          range: async () => {
            if (
              selected.includes("his_medicineid, medicine_code") &&
              snapshotDateFilter === "2026-03-12"
            ) {
              return {
                data: [
                  {
                    his_medicineid: "S100",
                    medicine_code: "TH001",
                    name: "Thuoc A",
                    category: "Khac",
                    warehouse: "Kho Thuoc",
                    current_stock: 10,
                    unit: "Vien",
                    batch_number: "LO1",
                    expiry_date: "2026-12-31",
                    unit_price: 1000,
                  },
                ],
                error: null,
              };
            }

            if (
              selected === "snapshot_date, current_stock, unit_price" &&
              startDateFilter === "2026-03-13" &&
              endDateFilter === "2026-03-14"
            ) {
              return {
                data: [
                  {
                    snapshot_date: "2026-03-13",
                    current_stock: 8,
                    unit_price: 1000,
                  },
                  {
                    snapshot_date: "2026-03-14",
                    current_stock: 5,
                    unit_price: 1000,
                  },
                ],
                error: null,
              };
            }

            return { data: [], error: null };
          },
          upsert: mockSnapshotUpsert,
          delete: () => ({
            not: () => ({
              not: () => ({
                lt: mockCleanupLt,
              }),
            }),
          }),
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

            throw new Error(`Unexpected limit select for daily value: ${selected}`);
          },
          upsert: mockDailyUpsert,
        };

        return chain;
      }

      throw new Error(`Unexpected table: ${table}`);
    },
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
    jest.useFakeTimers();
    jest.setSystemTime(new Date("2026-03-13T23:30:00.000Z"));

    mockHisQuery.mockReset();
    mockSnapshotUpsert.mockReset();
    mockDailyUpsert.mockReset();
    mockCleanupLt.mockReset();
    mockInfo.mockReset();
    mockError.mockReset();
    mockWarn.mockReset();
    mockLogSync.mockReset();

    mockHisQuery.mockImplementation(async (query: string) => {
      if (query.includes("COALESCE(e.day_export, 0) as approved_export")) {
        return {
          rows: [
            {
              his_medicineid: "S100",
              medicine_code: "TH001",
              name: "Thuoc A",
              unit: "Vien",
              warehouse_name: "Kho Thuoc",
              current_stock: 5,
              approved_export: 3,
              batch_number: "LO1",
              expiry_date: "2026-12-31",
              unit_price: 1000,
            },
          ],
        };
      }

      if (query.includes("medicine_import_date::date::text as snapshot_date")) {
        return { rows: [] };
      }

      if (query.includes("medicine_export_date::date::text as snapshot_date")) {
        return {
          rows: [
            {
              his_medicineid: "S100",
              snapshot_date: "2026-03-13",
              quantity: 2,
            },
          ],
        };
      }

      if (query.includes("unit_price") && query.includes("warehouse_name")) {
        return {
          rows: [
            {
              his_medicineid: "S100",
              medicine_code: "TH001",
              name: "Thuoc A",
              unit: "Vien",
              warehouse_name: "Kho Thuoc",
              batch_number: "LO1",
              expiry_date: "2026-12-31",
              unit_price: 1000,
            },
          ],
        };
      }

      throw new Error(`Unexpected HIS query: ${query}`);
    });

    mockSnapshotUpsert.mockResolvedValue({ error: null });
    mockDailyUpsert.mockResolvedValue({ error: null });
    mockCleanupLt.mockResolvedValue({ error: null });
    mockLogSync.mockResolvedValue(undefined);
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it("backfills missed pharmacy snapshots from the latest sync date before writing today", async () => {
    const { syncInventoryJob } = await import("../../src/jobs/syncInventory");

    await syncInventoryJob();

    expect(mockSnapshotUpsert).toHaveBeenNthCalledWith(
      1,
      [
        expect.objectContaining({
          his_medicineid: "S100",
          snapshot_date: "2026-03-13",
          current_stock: 8,
          approved_export: 2,
        }),
      ],
      { onConflict: "his_medicineid,warehouse,snapshot_date" },
    );

    expect(mockSnapshotUpsert).toHaveBeenNthCalledWith(
      2,
      [
        expect.objectContaining({
          his_medicineid: "S100",
          snapshot_date: "2026-03-14",
          current_stock: 5,
          approved_export: 3,
        }),
      ],
      { onConflict: "his_medicineid,warehouse,snapshot_date" },
    );

    expect(mockDailyUpsert).toHaveBeenCalledWith(
      [
        {
          snapshot_date: "2026-03-13",
          module_type: "pharmacy",
          total_stock: 8,
          total_value: 8000,
        },
        {
          snapshot_date: "2026-03-14",
          module_type: "pharmacy",
          total_stock: 5,
          total_value: 5000,
        },
      ],
      { onConflict: "snapshot_date,module_type" },
    );

    expect(mockCleanupLt).toHaveBeenCalledWith("snapshot_date", "2025-12-14");
    expect(mockError).not.toHaveBeenCalled();
  });
});
