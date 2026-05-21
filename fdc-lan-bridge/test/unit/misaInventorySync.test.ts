import { buildMisaInventorySnapshotsFromDeltas } from "../../src/lib/misaInventorySync";

describe("buildMisaInventorySnapshotsFromDeltas", () => {
  it("replays daily deltas and carries forward remaining stock", () => {
    const rows = buildMisaInventorySnapshotsFromDeltas({
      seeds: [
        {
          his_medicineid: "misa_A__stock_kho",
          medicine_code: "A",
          name: "Vat tu A",
          category: "Vat tu",
          warehouse: "Kho",
          unit: "Hop",
          current_stock: 10,
          total_value: 200,
        },
      ],
      metadataByStateKey: new Map([
        [
          "misa_A__stock_kho",
          {
            his_medicineid: "misa_A__stock_kho",
            medicine_code: "A",
            name: "Vat tu A",
            category: "Vat tu",
            warehouse: "Kho",
            unit: "Hop",
          },
        ],
        [
          "misa_B__stock_kho",
          {
            his_medicineid: "misa_B__stock_kho",
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
          his_medicineid: "misa_A__stock_kho",
          warehouse: "Kho",
          delta_stock: -2,
          delta_value: -40,
        },
        {
          snapshot_date: "2026-03-14",
          his_medicineid: "misa_B__stock_kho",
          warehouse: "Kho",
          delta_stock: 5,
          delta_value: 50,
        },
      ],
      startDate: "2026-03-13",
      endDate: "2026-03-14",
    });

    expect(rows).toEqual([
      expect.objectContaining({
        his_medicineid: "misa_A__stock_kho",
        snapshot_date: "2026-03-13",
        current_stock: 8,
        unit_price: 20,
      }),
      expect.objectContaining({
        his_medicineid: "misa_A__stock_kho",
        snapshot_date: "2026-03-14",
        current_stock: 8,
        unit_price: 20,
      }),
      expect.objectContaining({
        his_medicineid: "misa_B__stock_kho",
        snapshot_date: "2026-03-14",
        current_stock: 5,
        unit_price: 10,
      }),
    ]);
  });

  it("keeps the same MISA item code split by warehouse instead of merging balances", () => {
    const rows = buildMisaInventorySnapshotsFromDeltas({
      seeds: [
        {
          his_medicineid: "misa_AO018__stock_1521",
          medicine_code: "AO018",
          name: "Bo xanh nu size M",
          category: "Vat tu",
          warehouse: "Kho vat tu - Khac",
          stock_id: "1521",
          unit: "Bo",
          current_stock: 170,
          total_value: 17_909_678,
        },
        {
          his_medicineid: "misa_AO018__stock_1522",
          medicine_code: "AO018",
          name: "Bo xanh nu size M",
          category: "Vat tu",
          warehouse: "Kho vat tu - Dich vu",
          stock_id: "1522",
          unit: "Bo",
          current_stock: 9,
          total_value: 2_772_000,
        },
      ],
      metadataByStateKey: new Map([
        [
          "misa_AO018__stock_1521",
          {
            his_medicineid: "misa_AO018__stock_1521",
            medicine_code: "AO018",
            name: "Bo xanh nu size M",
            category: "Vat tu",
            warehouse: "Kho vat tu - Khac",
            stock_id: "1521",
            unit: "Bo",
          },
        ],
        [
          "misa_AO018__stock_1522",
          {
            his_medicineid: "misa_AO018__stock_1522",
            medicine_code: "AO018",
            name: "Bo xanh nu size M",
            category: "Vat tu",
            warehouse: "Kho vat tu - Dich vu",
            stock_id: "1522",
            unit: "Bo",
          },
        ],
      ]),
      deltas: [],
      startDate: "2026-04-06",
      endDate: "2026-04-06",
    });

    expect(rows).toEqual([
      expect.objectContaining({
        his_medicineid: "misa_AO018__stock_1521",
        warehouse: "Kho vat tu - Khac",
        current_stock: 170,
      }),
      expect.objectContaining({
        his_medicineid: "misa_AO018__stock_1522",
        warehouse: "Kho vat tu - Dich vu",
        current_stock: 9,
      }),
    ]);
  });
});
