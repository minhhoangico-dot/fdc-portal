/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import {
  buildQueueDetailRows,
  buildTatDetailRows,
  buildReagentDetailRows,
  parseLabDashboardDetailQuery,
} from "../../src/labDashboard/detailHelpers";

describe("lab dashboard detail helpers", () => {
  const timelineRows = [
    {
      serviceDataId: 10,
      patientCode: "BN010",
      subgroupKey: "hoa-sinh",
      subgroupName: "Hoa sinh",
      testName: "Dinh luong Glucose",
      requestedAt: "2026-03-23T07:00:00.000Z",
      processingAt: null,
      resultAt: null,
      totalMinutes: null,
      requestedToProcessingMinutes: null,
      processingToResultMinutes: null,
      stage: "waiting" as const,
    },
    {
      serviceDataId: 11,
      patientCode: "BN011",
      subgroupKey: "huyet-hoc",
      subgroupName: "Huyet hoc",
      testName: "Tong phan tich te bao mau",
      requestedAt: "2026-03-23T06:30:00.000Z",
      processingAt: "2026-03-23T06:40:00.000Z",
      resultAt: null,
      totalMinutes: null,
      requestedToProcessingMinutes: 10,
      processingToResultMinutes: null,
      stage: "processing" as const,
    },
    {
      serviceDataId: 12,
      patientCode: "BN012",
      subgroupKey: "hoa-sinh",
      subgroupName: "Hoa sinh",
      testName: "Dinh luong Glucose",
      requestedAt: "2026-03-23T05:00:00.000Z",
      processingAt: "2026-03-23T05:20:00.000Z",
      resultAt: "2026-03-23T06:45:00.000Z",
      totalMinutes: 105,
      requestedToProcessingMinutes: 20,
      processingToResultMinutes: 85,
      stage: "completed" as const,
    },
    {
      serviceDataId: 13,
      patientCode: "BN013",
      subgroupKey: "mien-dich",
      subgroupName: "Mien dich",
      testName: "CEA",
      requestedAt: "2026-03-23T05:10:00.000Z",
      processingAt: "2026-03-23T05:30:00.000Z",
      resultAt: "2026-03-23T08:50:00.000Z",
      totalMinutes: 220,
      requestedToProcessingMinutes: 20,
      processingToResultMinutes: 200,
      stage: "completed" as const,
    },
  ];

  const reagentRows = [
    {
      kind: "reagent" as const,
      reagentKey: "s9751",
      reagentName: "Hoa chat xet nghiem HBA1C",
      sourceName: "Hoa chat xet nghiem HBA1C",
      medicineCode: "S9751",
      warehouse: "Khoa Xet Nghiem",
      currentStock: 1,
      unit: "Cai",
      snapshotDate: "2026-03-23",
    },
    {
      kind: "reagent" as const,
      reagentKey: "test-magluni-tsh",
      reagentName: "Test Magluni TSH",
      sourceName: "Test Magluni TSH",
      medicineCode: null,
      warehouse: "Khoa Xet Nghiem",
      currentStock: 1,
      unit: "Cai",
      snapshotDate: "2026-03-23",
    },
    {
      kind: "reagent" as const,
      reagentKey: "ntt10",
      reagentName: "Nuoc tieu 10 thong so",
      sourceName: "Nuoc tieu 10 thong so",
      medicineCode: "NTT10",
      warehouse: "Khoa Xet Nghiem",
      currentStock: 0.8,
      unit: "Hop",
      snapshotDate: "2026-03-23",
    },
  ];

  it("parses a valid tat detail query", () => {
    expect(
      parseLabDashboardDetailQuery({
        section: "tat",
        focus: "type:hoa-sinh",
        date: "2026-03-23",
      }),
    ).toEqual({
      section: "tat",
      focus: "type:hoa-sinh",
      asOfDate: "2026-03-23",
    });
  });

  it("rejects an invalid focus for the selected section", () => {
    expect(() =>
      parseLabDashboardDetailQuery({
        section: "queue",
        focus: "median",
      }),
    ).toThrow("Invalid focus");
  });

  it("filters queue detail rows by stage and keeps oldest waiting rows first", () => {
    const rows = buildQueueDetailRows(timelineRows, "waiting");

    expect(rows).toHaveLength(1);
    expect(rows[0].patientCode).toBe("BN010");
    expect(rows[0].stage).toBe("waiting");
  });

  it("sorts tat detail rows by the selected metric descending", () => {
    const rows = buildTatDetailRows(timelineRows, "processing_to_result");

    expect(rows.map((row) => row.patientCode)).toEqual(["BN013", "BN012"]);
    expect(rows[0].processingToResultMinutes).toBe(200);
  });

  it("filters tat detail rows by type focus", () => {
    const rows = buildTatDetailRows(timelineRows, "type:hoa-sinh");

    expect(rows).toHaveLength(1);
    expect(rows[0].subgroupKey).toBe("hoa-sinh");
    expect(rows[0].patientCode).toBe("BN012");
    expect((rows[0] as any).testName).toBe("Dinh luong Glucose");
  });

  it("preserves test names on tat detail rows for every subgroup", () => {
    const rows = buildTatDetailRows(timelineRows, "processing_to_result");

    expect((rows[0] as any).testName).toBe("CEA");
    expect((rows[1] as any).testName).toBe("Dinh luong Glucose");
  });

  it("sorts reagent detail rows by stock asc then name", () => {
    const rows = buildReagentDetailRows(reagentRows, "all");

    expect(rows.map((row) => row.reagentKey)).toEqual([
      "ntt10",
      "s9751",
      "test-magluni-tsh",
    ]);
  });

  it("filters reagent detail rows by reagent focus", () => {
    const rows = buildReagentDetailRows(reagentRows, "reagent:test-magluni-tsh");

    expect(rows).toHaveLength(1);
    expect(rows[0].reagentKey).toBe("test-magluni-tsh");
    expect(rows[0].reagentName).toBe("Test Magluni TSH");
  });
});
