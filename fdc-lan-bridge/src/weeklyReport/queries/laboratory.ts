/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { hisPool } from "../../db/his";
import { WeeklyReportStatItem } from "../types";

const LAB_SUBGROUP = {
  HOA_SINH: 301,
  HUYET_HOC: 303,
  MIEN_DICH: 318,
};

function toCount(value: unknown): number {
  return Number(value ?? 0);
}

export async function getLaboratoryStats(
  startDate: Date,
  endDate: Date,
  prevStartDate: Date,
  prevEndDate: Date,
): Promise<WeeklyReportStatItem[]> {
  const resultTemplate: Record<string, WeeklyReportStatItem> = {
    xn_gui_ngoai: { key: "xn_gui_ngoai", name: "Xet nghiem gui [G]", current: 0, previous: 0, is_bhyt: false },
    xn_bhyt: { key: "xn_bhyt", name: "Xet nghiem BHYT", current: 0, previous: 0, is_bhyt: true },
    xn_dv_huyet_hoc: { key: "xn_dv_huyet_hoc", name: "XN Huyet hoc (DV)", current: 0, previous: 0, is_bhyt: false },
    xn_dv_sinh_hoa: { key: "xn_dv_sinh_hoa", name: "XN Sinh hoa (DV)", current: 0, previous: 0, is_bhyt: false },
    xn_dv_mien_dich: { key: "xn_dv_mien_dich", name: "XN Mien dich (DV)", current: 0, previous: 0, is_bhyt: false },
    xn_dv_khac: { key: "xn_dv_khac", name: "XN khac (DV)", current: 0, previous: 0, is_bhyt: false },
  };

  const { rows } = await hisPool.query<{
    category: string;
    current_count: string;
    prev_count: string;
  }>(
    `
      SELECT
        CASE
          WHEN sd.servicename LIKE '%[G]%' THEN 'xn_gui_ngoai'
          WHEN pr.dm_patientobjectid = 1 THEN 'xn_bhyt'
          WHEN sd.dm_servicesubgroupid = ${LAB_SUBGROUP.HUYET_HOC} THEN 'xn_dv_huyet_hoc'
          WHEN sd.dm_servicesubgroupid = ${LAB_SUBGROUP.HOA_SINH} THEN 'xn_dv_sinh_hoa'
          WHEN sd.dm_servicesubgroupid = ${LAB_SUBGROUP.MIEN_DICH} THEN 'xn_dv_mien_dich'
          ELSE 'xn_dv_khac'
        END AS category,
        COUNT(*) FILTER (WHERE sd.servicedatausedate BETWEEN $1 AND $2) AS current_count,
        COUNT(*) FILTER (WHERE sd.servicedatausedate BETWEEN $3 AND $4) AS prev_count
      FROM tb_servicedata sd
      JOIN tb_patientrecord pr ON pr.patientrecordid = sd.patientrecordid
      WHERE sd.servicedatausedate BETWEEN $3 AND $2
        AND sd.dm_servicegroupid = 3
        AND sd.servicedataid_master = 0
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

