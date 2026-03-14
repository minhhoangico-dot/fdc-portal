import {
  aggregateDailyValuesFromSnapshots,
  buildMissingPharmacySnapshots,
} from "../../src/lib/pharmacyInventorySync";

describe("pharmacyInventorySync", () => {
  it("rolls baseline snapshots forward using import and export deltas", () => {
    const rows = buildMissingPharmacySnapshots({
      baselineSnapshots: [
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
      metadataByHisMedicineId: new Map([
        [
          "S100",
          {
            his_medicineid: "S100",
            medicine_code: "TH001",
            name: "Thuoc A",
            category: "Khac",
            warehouse: "Kho Thuoc",
            unit: "Vien",
            batch_number: "LO1",
            expiry_date: "2026-12-31",
            unit_price: 1000,
          },
        ],
        [
          "S200",
          {
            his_medicineid: "S200",
            medicine_code: "TH002",
            name: "Thuoc B",
            category: "Khac",
            warehouse: "Kho Thuoc",
            unit: "Hop",
            batch_number: "LO2",
            expiry_date: "2026-12-31",
            unit_price: 2000,
          },
        ],
      ]),
      importDeltas: [
        {
          snapshot_date: "2026-03-13",
          his_medicineid: "S200",
          quantity: 5,
        },
      ],
      exportDeltas: [
        {
          snapshot_date: "2026-03-13",
          his_medicineid: "S100",
          quantity: 2,
        },
        {
          snapshot_date: "2026-03-13",
          his_medicineid: "S200",
          quantity: 1,
        },
      ],
      startDate: "2026-03-13",
      endDate: "2026-03-13",
    });

    expect(rows).toEqual([
      expect.objectContaining({
        his_medicineid: "S100",
        snapshot_date: "2026-03-13",
        current_stock: 8,
        approved_export: 2,
      }),
      expect.objectContaining({
        his_medicineid: "S200",
        snapshot_date: "2026-03-13",
        current_stock: 4,
        approved_export: 1,
      }),
    ]);
  });

  it("aggregates snapshot rows into daily value rows", () => {
    const rows = aggregateDailyValuesFromSnapshots(
      [
        {
          snapshot_date: "2026-03-13",
          current_stock: 8,
          unit_price: 1000,
        },
        {
          snapshot_date: "2026-03-13",
          current_stock: 4,
          unit_price: 2000,
        },
        {
          snapshot_date: "2026-03-14",
          current_stock: 7,
          unit_price: 1000,
        },
      ],
      "pharmacy",
    );

    expect(rows).toEqual([
      {
        snapshot_date: "2026-03-13",
        module_type: "pharmacy",
        total_stock: 12,
        total_value: 16000,
      },
      {
        snapshot_date: "2026-03-14",
        module_type: "pharmacy",
        total_stock: 7,
        total_value: 7000,
      },
    ]);
  });
});
