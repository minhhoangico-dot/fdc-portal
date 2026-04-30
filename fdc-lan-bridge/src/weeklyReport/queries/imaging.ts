/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { hisPool } from "../../db/his";
import { WeeklyReportStatItem } from "../types";

const IMAGING_SUBGROUP = {
  XQUANG: 401,
  SIEU_AM: 402,
  NOI_SOI: 403,
  DIEN_TIM: 404,
};

function toCount(value: unknown): number {
  return Number(value ?? 0);
}

export async function getImagingStats(
  startDate: Date,
  endDate: Date,
  prevStartDate: Date,
  prevEndDate: Date,
): Promise<WeeklyReportStatItem[]> {
  const resultTemplate: Record<string, WeeklyReportStatItem> = {
    xquang_dv: { key: "xquang_dv", name: "X-quang dich vu", current: 0, previous: 0, is_bhyt: false },
    xquang_bhyt: { key: "xquang_bhyt", name: "X-quang BHYT", current: 0, previous: 0, is_bhyt: true },
    sieu_am_dv: { key: "sieu_am_dv", name: "Sieu am dich vu", current: 0, previous: 0, is_bhyt: false },
    sieu_am_bhyt: { key: "sieu_am_bhyt", name: "Sieu am BHYT", current: 0, previous: 0, is_bhyt: true },
    noi_soi: { key: "noi_soi", name: "Noi soi", current: 0, previous: 0, is_bhyt: false },
    dien_tim: { key: "dien_tim", name: "Dien tim", current: 0, previous: 0, is_bhyt: false },
    cdha_khac: { key: "cdha_khac", name: "CDHA khac", current: 0, previous: 0, is_bhyt: false },
  };

  const { rows } = await hisPool.query<{
    category: string;
    current_count: string;
    prev_count: string;
  }>(
    `
      SELECT
        CASE
          WHEN sd.dm_servicesubgroupid = ${IMAGING_SUBGROUP.XQUANG}
            THEN CASE WHEN pr.dm_patientobjectid = 1 THEN 'xquang_bhyt' ELSE 'xquang_dv' END
          WHEN sd.dm_servicesubgroupid = ${IMAGING_SUBGROUP.SIEU_AM}
            THEN CASE WHEN pr.dm_patientobjectid = 1 THEN 'sieu_am_bhyt' ELSE 'sieu_am_dv' END
          WHEN sd.dm_servicesubgroupid = ${IMAGING_SUBGROUP.NOI_SOI} THEN 'noi_soi'
          WHEN sd.dm_servicesubgroupid = ${IMAGING_SUBGROUP.DIEN_TIM} THEN 'dien_tim'
          ELSE 'cdha_khac'
        END AS category,
        COUNT(*) FILTER (WHERE sd.servicedatausedate BETWEEN $1 AND $2) AS current_count,
        COUNT(*) FILTER (WHERE sd.servicedatausedate BETWEEN $3 AND $4) AS prev_count
      FROM tb_servicedata sd
      JOIN tb_patientrecord pr ON pr.patientrecordid = sd.patientrecordid
      WHERE sd.servicedatausedate BETWEEN $3 AND $2
        AND sd.dm_servicegroupid = 4
        AND pr.dm_patientobjectid != 3
      GROUP BY 1
    `,
    [startDate, endDate, prevStartDate, prevEndDate],
  );

  for (const row of rows) {
    if (!resultTemplate[row.category]) continue;
    resultTemplate[row.category].current = toCount(row.current_count);
    resultTemplate[row.category].previous = toCount(row.prev_count);
  }

  return Object.values(resultTemplate);
}

