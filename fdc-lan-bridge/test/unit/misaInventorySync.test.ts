import { buildMisaInventorySnapshotsFromDeltas } from "../../src/lib/misaInventorySync";

describe("buildMisaInventorySnapshotsFromDeltas", () => {
  it("replays daily deltas and carries forward remaining stock", () => {
    const rows = buildMisaInventorySnapshotsFromDeltas({
      seeds: [
        {
          his_medicineid: "misa_A",
          medicine_code: "A",
          name: "Vat tu A",
          category: "Vat tu",
          warehouse: "Kho",
          unit: "Hop",
          current_stock: 10,
          total_value: 200,
        },
      ],
      metadataByHisMedicineId: new Map([
        [
          "misa_A",
          {
            his_medicineid: "misa_A",
            medicine_code: "A",
            name: "Vat tu A",
            category: "Vat tu",
            warehouse: "Kho",
            unit: "Hop",
          },
        ],
        [
          "misa_B",
          {
            his_medicineid: "misa_B",
            medicine_code: "B",
            name: "Vat tu B",
            category: "Vat tu y te",
            warehouse: "Kho",
            unit: "Cai",
          },
        ],
      ]),
      deltas: [
        {
          snapshot_date: "2026-03-13",
          his_medicineid: "misa_A",
          delta_stock: -2,
          delta_value: -40,
        },
        {
          snapshot_date: "2026-03-14",
          his_medicineid: "misa_B",
          delta_stock: 5,
          delta_value: 50,
        },
      ],
      startDate: "2026-03-13",
      endDate: "2026-03-14",
    });

    expect(rows).toEqual([
      expect.objectContaining({
        his_medicineid: "misa_A",
        snapshot_date: "2026-03-13",
        current_stock: 8,
        unit_price: 20,
      }),
      expect.objectContaining({
        his_medicineid: "misa_A",
        snapshot_date: "2026-03-14",
        current_stock: 8,
        unit_price: 20,
      }),
      expect.objectContaining({
        his_medicineid: "misa_B",
        snapshot_date: "2026-03-14",
        current_stock: 5,
        unit_price: 10,
      }),
    ]);
  });
});
