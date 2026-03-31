/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

const mockHisQuery = jest.fn();

let snapshotDateRows = [{ snapshot_date: "2026-03-23" }];
let inventorySnapshotRows = [
  {
    name: "Nuoc tieu 10 thong so",
    warehouse: "Khoa Xet Nghiem",
    current_stock: 0.75,
    unit: "Hop",
    medicine_code: "NTT10",
    snapshot_date: "2026-03-23",
  },
  {
    name: "Hoa chat xet nghiem HBA1C",
    warehouse: "Khoa Xet Nghiem",
    current_stock: 1,
    unit: "",
    medicine_code: "S9751",
    snapshot_date: "2026-03-23",
  },
  {
    name: "Test Magluni TSH",
    warehouse: "Khoa Xet Nghiem",
    current_stock: 1,
    unit: null,
    medicine_code: null,
    snapshot_date: "2026-03-23",
  },
  {
    name: "Test Maglumi FT4",
    warehouse: "Khoa Xet Nghiem",
    current_stock: 1,
    unit: "Cai",
    medicine_code: "FT4-01",
    snapshot_date: "2026-03-23",
  },
  {
    name: "Hoa chat xet nghiem ALT",
    warehouse: "Khoa Xet Nghiem",
    current_stock: 2,
    unit: "Cai",
    medicine_code: "ALT001",
    snapshot_date: "2026-03-23",
  },
  {
    name: "Creatinine kit",
    warehouse: "Khoa Xet Nghiem",
    current_stock: 34,
    unit: "",
    medicine_code: "CRE34",
    snapshot_date: "2026-03-23",
  },
  {
    name: "Test Magluni TSH",
    warehouse: "Khoa Xet Nghiem",
    current_stock: 92,
    unit: "",
    medicine_code: "TSH092",
    snapshot_date: "2026-03-23",
  },
  {
    name: "Hoa chat xet nghiem HBA1C",
    warehouse: "Khoa Duoc / Vat tu",
    current_stock: 99,
    unit: "Hop",
    medicine_code: "S9751",
    snapshot_date: "2026-03-23",
  },
];

const paidWaitingTimelineRow = {
  servicedataid: 9001,
  patientcode: "BN-PAID",
  dm_servicesubgroupid: 301,
  subgroup_name: "Hoa sinh",
  requested_at: "2026-03-23T07:00:00.000Z",
  processing_at: null,
  result_at: null,
  stage: "waiting",
  total_minutes: null,
  requested_to_processing_minutes: null,
  processing_to_result_minutes: null,
};

const unpaidWaitingTimelineRow = {
  servicedataid: 9002,
  patientcode: "BN-UNPAID",
  dm_servicesubgroupid: 301,
  subgroup_name: "Hoa sinh",
  requested_at: "2026-03-23T07:05:00.000Z",
  processing_at: null,
  result_at: null,
  stage: "waiting",
  total_minutes: null,
  requested_to_processing_minutes: null,
  processing_to_result_minutes: null,
};

const processingFallbackTimelineRow = {
  servicedataid: 9003,
  patientcode: "BN-DO-FALLBACK",
  dm_servicesubgroupid: 303,
  subgroup_name: "Huyet hoc",
  requested_at: "2026-03-25T07:10:00.000Z",
  processing_at: "2026-03-25T07:18:00.000Z",
  result_at: null,
  stage: "processing",
  total_minutes: null,
  requested_to_processing_minutes: 8,
  processing_to_result_minutes: null,
};

const completedFallbackTimelineRow = {
  servicedataid: 9004,
  patientcode: "23009760",
  dm_servicesubgroupid: 318,
  subgroup_name: "Mien dich",
  requested_at: "2026-03-25T07:20:00.000Z",
  processing_at: "2026-03-25T07:28:00.000Z",
  result_at: "2026-03-25T07:40:00.000Z",
  stage: "completed",
  total_minutes: 20,
  requested_to_processing_minutes: 8,
  processing_to_result_minutes: 12,
};

const bhAdjustmentTimelineRow = {
  servicedataid: 9005,
  patientcode: "23009760",
  dm_servicesubgroupid: 301,
  subgroup_name: "Hoa sinh",
  requested_at: "2026-03-25T07:22:00.000Z",
  processing_at: null,
  result_at: null,
  stage: "waiting",
  total_minutes: null,
  requested_to_processing_minutes: null,
  processing_to_result_minutes: null,
};

jest.mock("../../src/db/his", () => ({
  hisPool: {
    query: mockHisQuery,
  },
}));

jest.mock("../../src/db/supabase", () => ({
  supabase: {
    from: jest.fn(() => ({
      select: jest.fn((columns: string) => {
        if (columns === "snapshot_date") {
          return {
            order: jest.fn(() => ({
              limit: jest.fn(async () => ({
                data: snapshotDateRows,
                error: null,
              })),
            })),
          };
        }

        if (columns === "name, warehouse, current_stock, unit, medicine_code, snapshot_date") {
          return {
            eq: jest.fn(() => ({
              gt: jest.fn(() => ({
                order: jest.fn(() => ({
                  range: jest.fn(async () => ({
                    data: inventorySnapshotRows,
                    error: null,
                  })),
                })),
              })),
            })),
          };
        }

        throw new Error(`Unexpected Supabase select columns: ${columns}`);
      }),
    })),
  },
}));

jest.mock("../../src/lib/logger", () => ({
  logger: {
    error: jest.fn(),
    warn: jest.fn(),
    info: jest.fn(),
    debug: jest.fn(),
  },
}));

import {
  getLabDashboardCurrent,
  getLabDashboardDetails,
} from "../../src/labDashboard/service";

describe("lab dashboard reagent service", () => {
  beforeEach(() => {
    snapshotDateRows = [{ snapshot_date: "2026-03-23" }];
    inventorySnapshotRows = [
      {
        name: "Nuoc tieu 10 thong so",
        warehouse: "Khoa Xet Nghiem",
        current_stock: 0.75,
        unit: "Hop",
        medicine_code: "NTT10",
        snapshot_date: "2026-03-23",
      },
      {
        name: "Hoa chat xet nghiem HBA1C",
        warehouse: "Khoa Xet Nghiem",
        current_stock: 1,
        unit: "",
        medicine_code: "S9751",
        snapshot_date: "2026-03-23",
      },
      {
        name: "Test Magluni TSH",
        warehouse: "Khoa Xet Nghiem",
        current_stock: 1,
        unit: null,
        medicine_code: null,
        snapshot_date: "2026-03-23",
      },
      {
        name: "Test Maglumi FT4",
        warehouse: "Khoa Xet Nghiem",
        current_stock: 1,
        unit: "Cai",
        medicine_code: "FT4-01",
        snapshot_date: "2026-03-23",
      },
      {
        name: "Hoa chat xet nghiem ALT",
        warehouse: "Khoa Xet Nghiem",
        current_stock: 2,
        unit: "Cai",
        medicine_code: "ALT001",
        snapshot_date: "2026-03-23",
      },
      {
        name: "Creatinine kit",
        warehouse: "Khoa Xet Nghiem",
        current_stock: 34,
        unit: "",
        medicine_code: "CRE34",
        snapshot_date: "2026-03-23",
      },
      {
        name: "Test Magluni TSH",
        warehouse: "Khoa Xet Nghiem",
        current_stock: 92,
        unit: "",
        medicine_code: "TSH092",
        snapshot_date: "2026-03-23",
      },
      {
        name: "Hoa chat xet nghiem HBA1C",
        warehouse: "Khoa Duoc / Vat tu",
        current_stock: 99,
        unit: "Hop",
        medicine_code: "S9751",
        snapshot_date: "2026-03-23",
      },
    ];

    mockHisQuery.mockReset();
    mockHisQuery.mockImplementation(async (sql: string) => {
      const usesProcessingFallback = sql.includes("do_servicedatadate");
      const usesResultFallback = sql.includes("end_date");
      const excludesBhAdjustments = sql.includes("Chênh lệch BH - %");

      if (sql.includes("AS waiting_for_sample")) {
        return {
          rows: [
            {
              waiting_for_sample:
                sql.includes("isthutien") && usesProcessingFallback && usesResultFallback && excludesBhAdjustments
                  ? 1
                  : 3,
              processing: usesProcessingFallback && excludesBhAdjustments ? 1 : 0,
              completed_today: usesResultFallback && excludesBhAdjustments ? 1 : 0,
            },
          ],
        };
      }

      if (sql.includes("AS average_minutes")) {
        return {
          rows: [
            {
              average_minutes: 0,
              median_minutes: 0,
              requested_to_processing_minutes: 0,
              processing_to_result_minutes: 0,
            },
          ],
        };
      }

      if (sql.includes("GROUP BY dm_servicesubgroupid, subgroup_name")) {
        return { rows: [] };
      }

      if (sql.includes("JOIN tb_patient p ON p.patientid = pr.patientid")) {
        if (usesProcessingFallback && usesResultFallback && excludesBhAdjustments) {
          return {
            rows: [paidWaitingTimelineRow, processingFallbackTimelineRow, completedFallbackTimelineRow],
          };
        }

        return {
          rows: sql.includes("isthutien")
            ? [paidWaitingTimelineRow, bhAdjustmentTimelineRow, completedFallbackTimelineRow]
            : [paidWaitingTimelineRow, unpaidWaitingTimelineRow, bhAdjustmentTimelineRow, completedFallbackTimelineRow],
        };
      }

      if (sql.includes("AS abnormal_count")) {
        return {
          rows: [{ abnormal_count: 0 }],
        };
      }

      if (sql.includes("AS total_results")) {
        return {
          rows: [{ total_results: 0 }],
        };
      }

      if (sql.includes("COALESCE(NULLIF(BTRIM(sd.servicecode)")) {
        return { rows: [] };
      }

      throw new Error(`Unexpected HIS query in test: ${sql}`);
    });
  });

  it("returns real lab inventory rows for reagents ordered by stock asc then name", async () => {
    const payload = await getLabDashboardCurrent("2026-03-23");

    expect(payload.meta.sectionErrors?.reagents).toBeUndefined();
    expect(payload.reagents.map((row) => row.key)).toEqual([
      "ntt10",
      "s9751",
      "ft4-01",
      "test-magluni-tsh",
      "alt001",
      "cre34",
      "tsh092",
    ]);
    expect(payload.reagents).toEqual([
      expect.objectContaining({
        key: "ntt10",
        name: "Nuoc tieu 10 thong so",
        currentStock: 0.8,
        unit: "Hop",
        status: "critical",
        medicineCode: "NTT10",
      }),
      expect.objectContaining({
        key: "s9751",
        name: "Hoa chat xet nghiem HBA1C",
        currentStock: 1,
        unit: "Cái",
        status: "critical",
        medicineCode: "S9751",
      }),
      expect.objectContaining({
        key: "ft4-01",
        name: "Test Maglumi FT4",
        currentStock: 1,
        unit: "Cai",
        status: "critical",
        medicineCode: "FT4-01",
      }),
      expect.objectContaining({
        key: "test-magluni-tsh",
        name: "Test Magluni TSH",
        currentStock: 1,
        unit: "Cái",
        status: "critical",
        medicineCode: null,
      }),
      expect.objectContaining({
        key: "alt001",
        name: "Hoa chat xet nghiem ALT",
        currentStock: 2,
        unit: "Cai",
        status: "low",
        medicineCode: "ALT001",
      }),
      expect.objectContaining({
        key: "cre34",
        name: "Creatinine kit",
        currentStock: 34,
        unit: "Cái",
        status: "ok",
        medicineCode: "CRE34",
      }),
      expect.objectContaining({
        key: "tsh092",
        name: "Test Magluni TSH",
        currentStock: 92,
        unit: "Cái",
        status: "ok",
        medicineCode: "TSH092",
      }),
    ]);
    expect(payload.reagents[0]).not.toHaveProperty("targetStock");
  });

  it("returns reagent detail rows from the same real inventory list", async () => {
    const payload = await getLabDashboardDetails({
      section: "reagents",
      focus: "all",
      asOfDate: "2026-03-23",
    });

    expect(payload.rows).toEqual([
      expect.objectContaining({
        kind: "reagent",
        reagentKey: "ntt10",
        reagentName: "Nuoc tieu 10 thong so",
        warehouse: "Khoa Xet Nghiem",
        currentStock: 0.8,
        unit: "Hop",
      }),
      expect.objectContaining({
        kind: "reagent",
        reagentKey: "s9751",
        reagentName: "Hoa chat xet nghiem HBA1C",
        warehouse: "Khoa Xet Nghiem",
        currentStock: 1,
        unit: "Cái",
      }),
      expect.objectContaining({
        kind: "reagent",
        reagentKey: "ft4-01",
        reagentName: "Test Maglumi FT4",
        warehouse: "Khoa Xet Nghiem",
        currentStock: 1,
        unit: "Cai",
      }),
      expect.objectContaining({
        kind: "reagent",
        reagentKey: "test-magluni-tsh",
        reagentName: "Test Magluni TSH",
        warehouse: "Khoa Xet Nghiem",
        currentStock: 1,
        unit: "Cái",
      }),
      expect.objectContaining({
        kind: "reagent",
        reagentKey: "alt001",
        reagentName: "Hoa chat xet nghiem ALT",
        warehouse: "Khoa Xet Nghiem",
        currentStock: 2,
        unit: "Cai",
      }),
      expect.objectContaining({
        kind: "reagent",
        reagentKey: "cre34",
        reagentName: "Creatinine kit",
        warehouse: "Khoa Xet Nghiem",
        currentStock: 34,
        unit: "Cái",
      }),
      expect.objectContaining({
        kind: "reagent",
        reagentKey: "tsh092",
        reagentName: "Test Magluni TSH",
        warehouse: "Khoa Xet Nghiem",
        currentStock: 92,
        unit: "Cái",
      }),
    ]);
  });

  it("filters reagent detail rows by the real inventory item key", async () => {
    const payload = await getLabDashboardDetails({
      section: "reagents",
      focus: "reagent:test-magluni-tsh",
      asOfDate: "2026-03-23",
    });

    expect(payload.rows).toEqual([
      expect.objectContaining({
        kind: "reagent",
        reagentKey: "test-magluni-tsh",
        reagentName: "Test Magluni TSH",
        medicineCode: null,
        warehouse: "Khoa Xet Nghiem",
        currentStock: 1,
        unit: "Cái",
      }),
    ]);
  });

  it("counts waiting-for-sample rows only when the lab order has a paid treatment", async () => {
    const payload = await getLabDashboardCurrent("2026-03-23");

    expect(payload.queue.waitingForSample).toBe(1);
    expect(payload.queue.processing).toBe(1);
    expect(payload.queue.completedToday).toBe(1);
  });

  it("keeps queue waiting detail rows aligned with the paid-only waiting rule", async () => {
    const payload = await getLabDashboardDetails({
      section: "queue",
      focus: "waiting",
      asOfDate: "2026-03-23",
    });

    expect(payload.rows).toHaveLength(1);
    expect(payload.rows).toEqual([
      expect.objectContaining({
        kind: "queue",
        serviceDataId: 9001,
        patientCode: "BN-PAID",
        stage: "waiting",
      }),
    ]);
  });

  it("moves do-servicedata fallback rows into processing instead of leaving them in waiting", async () => {
    const payload = await getLabDashboardDetails({
      section: "queue",
      focus: "processing",
      asOfDate: "2026-03-23",
    });

    expect(payload.rows).toEqual([
      expect.objectContaining({
        kind: "queue",
        serviceDataId: 9003,
        patientCode: "BN-DO-FALLBACK",
        stage: "processing",
      }),
    ]);
  });

  it("treats end-date fallback rows as completed so completed-result patients leave waiting", async () => {
    const completedPayload = await getLabDashboardDetails({
      section: "queue",
      focus: "completed",
      asOfDate: "2026-03-23",
    });

    expect(completedPayload.rows).toEqual([
      expect.objectContaining({
        kind: "queue",
        serviceDataId: 9004,
        patientCode: "23009760",
        stage: "completed",
      }),
    ]);

    const waitingPayload = await getLabDashboardDetails({
      section: "queue",
      focus: "waiting",
      asOfDate: "2026-03-23",
    });

    expect(waitingPayload.rows).not.toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          serviceDataId: 9004,
          patientCode: "23009760",
        }),
      ]),
    );
  });
});
