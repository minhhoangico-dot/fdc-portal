/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { hisPool } from "../../db/his";
import { WeeklyReportStatItem } from "../types";

const SPECIALIST_SUBGROUP = {
  TMH: 100000,
  TAI_NHA: 100004,
  THU_THUAT_DD: 501,
  VAC_XIN: 10001,
  NGOAI_BS: 100002,
  SAN: 100003,
};

function toCount(value: unknown): number {
  return Number(value ?? 0);
}

export async function getSpecialistStats(
  startDate: Date,
  endDate: Date,
  prevStartDate: Date,
  prevEndDate: Date,
): Promise<WeeklyReportStatItem[]> {
  const resultTemplate: Record<string, WeeklyReportStatItem> = {
    tmh_dv: { key: "tmh_dv", name: "Thu thuat TMH (DV)", current: 0, previous: 0, is_bhyt: false },
    tmh_bhyt: { key: "tmh_bhyt", name: "Thu thuat TMH (BHYT)", current: 0, previous: 0, is_bhyt: true },
    tai_nha: { key: "tai_nha", name: "Tai nha", current: 0, previous: 0, is_bhyt: false },
    thu_thuat_dd: { key: "thu_thuat_dd", name: "Thu thuat [DD]", current: 0, previous: 0, is_bhyt: false },
    vac_xin: { key: "vac_xin", name: "Tiem Vac xin", current: 0, previous: 0, is_bhyt: false },
    ngoai_bs: { key: "ngoai_bs", name: "Thu thuat Ngoai [BS]", current: 0, previous: 0, is_bhyt: false },
    thu_thuat_san: { key: "thu_thuat_san", name: "Thu thuat San", current: 0, previous: 0, is_bhyt: false },
    ck_khac: { key: "ck_khac", name: "Chuyen khoa khac", current: 0, previous: 0, is_bhyt: false },
  };

  const { rows } = await hisPool.query<{
    category: string;
    current_count: string;
    prev_count: string;
  }>(
    `
      SELECT
        CASE
          WHEN sd.dm_servicesubgroupid = ${SPECIALIST_SUBGROUP.TMH}
            THEN CASE WHEN pr.dm_patientobjectid = 1 THEN 'tmh_bhyt' ELSE 'tmh_dv' END
          WHEN sd.dm_servicesubgroupid = ${SPECIALIST_SUBGROUP.TAI_NHA} THEN 'tai_nha'
          WHEN sd.dm_servicesubgroupid = ${SPECIALIST_SUBGROUP.THU_THUAT_DD} THEN 'thu_thuat_dd'
          WHEN sd.dm_servicesubgroupid = ${SPECIALIST_SUBGROUP.VAC_XIN} THEN 'vac_xin'
          WHEN sd.dm_servicesubgroupid = ${SPECIALIST_SUBGROUP.NGOAI_BS} THEN 'ngoai_bs'
          WHEN sd.dm_servicesubgroupid = ${SPECIALIST_SUBGROUP.SAN} THEN 'thu_thuat_san'
          ELSE 'ck_khac'
        END AS category,
        COUNT(*) FILTER (WHERE sd.servicedatausedate BETWEEN $1 AND $2) AS current_count,
        COUNT(*) FILTER (WHERE sd.servicedatausedate BETWEEN $3 AND $4) AS prev_count
      FROM tb_servicedata sd
      JOIN tb_patientrecord pr ON pr.patientrecordid = sd.patientrecordid
      WHERE sd.servicedatausedate BETWEEN $3 AND $2
        AND sd.dm_servicegroupid = 5
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

