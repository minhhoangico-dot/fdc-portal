/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { hisPool } from "../../db/his";
import { WeeklyReportStatItem } from "../types";

function toCount(value: unknown): number {
  return Number(value ?? 0);
}

export async function getTransferStats(
  startDate: Date,
  endDate: Date,
  prevStartDate: Date,
  prevEndDate: Date,
): Promise<WeeklyReportStatItem[]> {
  const { rows } = await hisPool.query<{ current_count: string; prev_count: string }>(
    `
      SELECT
        COUNT(*) FILTER (WHERE pr.receptiondate BETWEEN $1 AND $2) AS current_count,
        COUNT(*) FILTER (WHERE pr.receptiondate BETWEEN $3 AND $4) AS prev_count
      FROM tb_patientrecord pr
      WHERE pr.receptiondate BETWEEN $3 AND $2
        AND pr.dm_hinhthucravienid = 13
        AND pr.dm_patientobjectid != 3
    `,
    [startDate, endDate, prevStartDate, prevEndDate],
  );

  return [
    {
      key: "chuyen_vien",
      name: "Chuyen vien",
      current: toCount(rows[0]?.current_count),
      previous: toCount(rows[0]?.prev_count),
      is_bhyt: false,
    },
  ];
}

