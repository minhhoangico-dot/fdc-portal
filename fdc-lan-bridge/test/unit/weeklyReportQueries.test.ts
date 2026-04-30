/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

const mockHisQuery = jest.fn();

jest.mock("../../src/db/his", () => ({
  hisPool: {
    query: mockHisQuery,
  },
}));

import { getExaminationStats } from "../../src/weeklyReport/queries";
import { WeeklyReportServiceMapping } from "../../src/weeklyReport/types";

describe("weekly report examination queries", () => {
  beforeEach(() => {
    mockHisQuery.mockReset();
  });

  it("matches contains mappings case-insensitively like the detail ILIKE query", async () => {
    mockHisQuery.mockResolvedValue({
      rows: [
        {
          servicename: "Khám Sức khỏe (Khám)",
          current_count: "38",
          prev_count: "0",
        },
      ],
    });

    const mappings: WeeklyReportServiceMapping[] = [
      {
        id: "kham-suc-khoe",
        category_key: "kham_suc_khoe",
        category_name_vi: "Khám sức khỏe và tư vấn",
        display_group: "kham_benh",
        match_type: "contains",
        match_value: "sức khỏe",
        is_active: true,
        display_order: 8,
      },
    ];

    const stats = await getExaminationStats(
      new Date("2026-04-06T00:00:00.000Z"),
      new Date("2026-04-12T23:59:59.999Z"),
      new Date("2026-03-30T00:00:00.000Z"),
      new Date("2026-04-05T23:59:59.999Z"),
      mappings,
    );

    expect(stats).toEqual([
      {
        key: "kham_suc_khoe",
        name: "Khám sức khỏe và tư vấn",
        current: 38,
        previous: 0,
        is_bhyt: false,
      },
    ]);
  });
});
