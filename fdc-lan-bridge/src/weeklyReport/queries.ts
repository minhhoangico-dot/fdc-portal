/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import dayjs from "dayjs";
import { hisPool } from "../db/his";
import {
  WeeklyReportAgeGroups,
  WeeklyReportDetailsQuery,
  WeeklyReportInfectiousCode,
  WeeklyReportInfectiousStat,
  WeeklyReportServiceMapping,
  WeeklyReportStatItem,
} from "./types";

const LAB_SUBGROUP = {
  HOA_SINH: 301,
  HUYET_HOC: 303,
  MIEN_DICH: 318,
};

const IMAGING_SUBGROUP = {
  XQUANG: 401,
  SIEU_AM: 402,
  NOI_SOI: 403,
  DIEN_TIM: 404,
};

const SPECIALIST_SUBGROUP = {
  TMH: 100000,
  TAI_NHA: 100004,
  THU_THUAT_DD: 501,
  VAC_XIN: 10001,
  NGOAI_BS: 100002,
  SAN: 100003,
};

const GROUP_ID_MAP: Record<string, number> = {
  kham_benh: 1,
  xet_nghiem: 3,
  cdha: 4,
  chuyen_khoa: 5,
};

function toCount(value: unknown): number {
  return Number(value ?? 0);
}

function buildEmptyAgeGroups(): WeeklyReportAgeGroups {
  return {
    age_0_2: 0,
    age_3_12: 0,
    age_13_18: 0,
    age_18_50: 0,
    age_over_50: 0,
  };
}

function matchesLikePattern(text: string, pattern: string): boolean {
  const regex = new RegExp(
    `^${pattern.replace(/[%_]/g, (token) => (token === "%" ? ".*" : "."))}$`,
    "i",
  );
  return regex.test(text);
}

export async function getExaminationStats(
  startDate: Date,
  endDate: Date,
  prevStartDate: Date,
  prevEndDate: Date,
  mappings: WeeklyReportServiceMapping[],
): Promise<WeeklyReportStatItem[]> {
  const { rows } = await hisPool.query<{
    servicename: string;
    current_count: string;
    prev_count: string;
  }>(
    `
      SELECT
        sd.servicename,
        COUNT(*) FILTER (WHERE sd.servicedatausedate BETWEEN $1 AND $2) AS current_count,
        COUNT(*) FILTER (WHERE sd.servicedatausedate BETWEEN $3 AND $4) AS prev_count
      FROM tb_servicedata sd
      JOIN tb_patientrecord pr ON pr.patientrecordid = sd.patientrecordid
      WHERE sd.servicedatausedate BETWEEN $3 AND $2
        AND sd.dm_servicegroupid = 1
        AND pr.dm_patientobjectid != 3
      GROUP BY sd.servicename
    `,
    [startDate, endDate, prevStartDate, prevEndDate],
  );

  const activeMappings = mappings
    .filter((item) => item.is_active && item.display_group === "kham_benh")
    .sort((a, b) => a.display_order - b.display_order);

  const stats: Record<string, WeeklyReportStatItem> = {};
  for (const mapping of activeMappings) {
    stats[mapping.category_key] = {
      key: mapping.category_key,
      name: mapping.category_name_vi,
      current: 0,
      previous: 0,
      is_bhyt: mapping.category_name_vi.includes("BHYT"),
    };
  }

  for (const row of rows) {
    for (const mapping of activeMappings) {
      const serviceName = row.servicename || "";
      const matched =
        (mapping.match_type === "exact" && serviceName === mapping.match_value) ||
        (mapping.match_type === "contains" && serviceName.includes(mapping.match_value)) ||
        (mapping.match_type === "starts_with" && serviceName.startsWith(mapping.match_value)) ||
        (mapping.match_type === "regex" && new RegExp(mapping.match_value, "i").test(serviceName));

      if (!matched) continue;

      stats[mapping.category_key].current += toCount(row.current_count);
      stats[mapping.category_key].previous += toCount(row.prev_count);
      break;
    }
  }

  return Object.values(stats);
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

export async function getInfectiousStats(
  startDate: Date,
  endDate: Date,
  codes: WeeklyReportInfectiousCode[],
): Promise<WeeklyReportInfectiousStat[]> {
  const activeCodes = codes
    .filter((item) => item.is_active)
    .sort((a, b) => a.display_order - b.display_order);
  const patterns = activeCodes.map((item) => item.icd_pattern);

  if (patterns.length === 0) return [];

  const previousEnd = dayjs(startDate).subtract(1, "day").endOf("day").toDate();
  const previousStart = dayjs(startDate).subtract(30, "day").startOf("day").toDate();
  const lastYearStart = dayjs(startDate).subtract(1, "year").toDate();
  const lastYearEnd = dayjs(endDate).subtract(1, "year").toDate();

  const { rows } = await hisPool.query<{
    period: "current" | "previous" | "last_year";
    chandoanbandau_icd10: string;
    case_count: string;
    age_0_2: string;
    age_3_12: string;
    age_13_18: string;
    age_18_50: string;
    age_over_50: string;
  }>(
    `
      WITH periods AS (
        SELECT 'current' AS period, $1::timestamp AS start_date, $2::timestamp AS end_date
        UNION ALL
        SELECT 'previous', $3::timestamp, $4::timestamp
        UNION ALL
        SELECT 'last_year', $5::timestamp, $6::timestamp
      )
      SELECT
        p.period,
        mk.chandoanbandau_icd10,
        COUNT(*) AS case_count,
        COUNT(*) FILTER (WHERE (EXTRACT(YEAR FROM pr.receptiondate) - pr.birthdayyear) <= 2) AS age_0_2,
        COUNT(*) FILTER (WHERE (EXTRACT(YEAR FROM pr.receptiondate) - pr.birthdayyear) BETWEEN 3 AND 12) AS age_3_12,
        COUNT(*) FILTER (WHERE (EXTRACT(YEAR FROM pr.receptiondate) - pr.birthdayyear) BETWEEN 13 AND 18) AS age_13_18,
        COUNT(*) FILTER (WHERE (EXTRACT(YEAR FROM pr.receptiondate) - pr.birthdayyear) BETWEEN 19 AND 50) AS age_18_50,
        COUNT(*) FILTER (WHERE (EXTRACT(YEAR FROM pr.receptiondate) - pr.birthdayyear) > 50) AS age_over_50
      FROM periods p
      JOIN tb_patientrecord pr ON pr.receptiondate BETWEEN p.start_date AND p.end_date
      JOIN tb_medicalrecord_khambenh mk ON mk.medicalrecordid = pr.medicalrecordid_kb
      WHERE mk.chandoanbandau_icd10 LIKE ANY ($7)
      GROUP BY p.period, mk.chandoanbandau_icd10
    `,
    [startDate, endDate, previousStart, previousEnd, lastYearStart, lastYearEnd, patterns],
  );

  const statsMap = new Map<string, WeeklyReportInfectiousStat>();
  const codeKeyMap = new Map<string, string>();

  for (const code of activeCodes) {
    const key = code.disease_group === "rsv" ? "group_rsv" : code.icd_code;
    const diseaseName = code.disease_group === "rsv" ? "Benh do virus RSV" : code.disease_name_vi;

    codeKeyMap.set(code.icd_code, key);
    if (!statsMap.has(key)) {
      statsMap.set(key, {
        icd_code: key,
        disease_name: diseaseName,
        group: code.disease_group,
        periods: { current: 0, previous: 0, last_year: 0 },
        age_groups: buildEmptyAgeGroups(),
      });
    }
  }

  for (const row of rows) {
    const icd = row.chandoanbandau_icd10 || "";
    for (const code of activeCodes) {
      if (!matchesLikePattern(icd, code.icd_pattern)) continue;

      const key = codeKeyMap.get(code.icd_code);
      if (!key) continue;
      const stat = statsMap.get(key);
      if (!stat) continue;

      const rowCount = toCount(row.case_count);
      if (row.period === "previous") {
        stat.periods.previous += rowCount;
      } else {
        stat.periods[row.period] += rowCount;
      }

      if (row.period === "current") {
        stat.age_groups.age_0_2 += toCount(row.age_0_2);
        stat.age_groups.age_3_12 += toCount(row.age_3_12);
        stat.age_groups.age_13_18 += toCount(row.age_13_18);
        stat.age_groups.age_18_50 += toCount(row.age_18_50);
        stat.age_groups.age_over_50 += toCount(row.age_over_50);
      }

      break;
    }
  }

  for (const stat of statsMap.values()) {
    if (stat.periods.previous > 0) {
      stat.periods.previous = Number((stat.periods.previous / 4.28).toFixed(1));
    }
  }

  return Array.from(statsMap.values());
}

export async function getWeeklyReportDetails(
  query: WeeklyReportDetailsQuery,
  mappings: WeeklyReportServiceMapping[],
  codes: WeeklyReportInfectiousCode[],
): Promise<Record<string, unknown>[]> {
  const startDate = new Date(query.start);
  const endDate = new Date(query.end);

  if (query.type === "infectious") {
    const patterns =
      query.key === "group_rsv"
        ? codes
            .filter((item) => item.is_active && item.disease_group === "rsv")
            .map((item) => item.icd_pattern)
        : codes
            .filter((item) => item.is_active && item.icd_code === query.key)
            .map((item) => item.icd_pattern);

    if (patterns.length === 0) return [];

    const { rows } = await hisPool.query(
      `
        SELECT
          pr.patientrecordid AS servicedataid,
          p.patientcode,
          p.patientname,
          (p.birthdayday || '/' || p.birthdaymonth || '/' || p.birthdayyear) AS dob,
          (EXTRACT(YEAR FROM CURRENT_DATE) - p.birthdayyear) AS age,
          CASE WHEN p.dm_gioitinhid = 1 THEN 'Nam' ELSE 'Nu' END AS gender,
          pr.insuranceid,
          CASE
            WHEN pr.dm_patientobjectid = 1 THEN 'Bao hiem'
            WHEN pr.dm_patientobjectid = 2 THEN 'Vien phi'
            WHEN pr.dm_patientobjectid = 3 THEN 'Yeu cau'
            WHEN pr.dm_patientobjectid = 5 THEN 'Mien phi'
            ELSE 'Khong ro'
          END AS doituong,
          mk.chandoanbandau AS servicename,
          TO_CHAR(pr.receptiondate, 'DD/MM/YYYY HH24:MI') AS time,
          0 AS serviceprice,
          kp.departmentname AS room
        FROM tb_patientrecord pr
        JOIN tb_patient p ON p.patientid = pr.patientid
        JOIN tb_medicalrecord_khambenh mk ON mk.medicalrecordid = pr.medicalrecordid_kb
        LEFT JOIN tb_department kp ON kp.departmentid = pr.departmentid
        WHERE pr.receptiondate BETWEEN $1 AND $2
          AND mk.chandoanbandau_icd10 LIKE ANY ($3)
        ORDER BY pr.receptiondate DESC
        LIMIT 1000
      `,
      [startDate, endDate, patterns],
    );

    return rows;
  }

  if (query.type === "age_group") {
    const ageConditions: Record<string, string> = {
      age_0_2: "(EXTRACT(YEAR FROM CURRENT_DATE) - p.birthdayyear) BETWEEN 0 AND 2",
      age_3_12: "(EXTRACT(YEAR FROM CURRENT_DATE) - p.birthdayyear) BETWEEN 3 AND 12",
      age_13_18: "(EXTRACT(YEAR FROM CURRENT_DATE) - p.birthdayyear) BETWEEN 13 AND 18",
      age_18_50: "(EXTRACT(YEAR FROM CURRENT_DATE) - p.birthdayyear) BETWEEN 19 AND 50",
      age_over_50: "(EXTRACT(YEAR FROM CURRENT_DATE) - p.birthdayyear) > 50",
    };

    const ageCondition = ageConditions[query.key];
    if (!ageCondition) return [];

    const patterns = codes.filter((item) => item.is_active).map((item) => item.icd_pattern);
    const { rows } = await hisPool.query(
      `
        SELECT
          pr.patientrecordid AS servicedataid,
          p.patientcode,
          p.patientname,
          (p.birthdayday || '/' || p.birthdaymonth || '/' || p.birthdayyear) AS dob,
          (EXTRACT(YEAR FROM CURRENT_DATE) - p.birthdayyear) AS age,
          CASE WHEN p.dm_gioitinhid = 1 THEN 'Nam' ELSE 'Nu' END AS gender,
          pr.insuranceid,
          CASE
            WHEN pr.dm_patientobjectid = 1 THEN 'Bao hiem'
            WHEN pr.dm_patientobjectid = 2 THEN 'Vien phi'
            WHEN pr.dm_patientobjectid = 3 THEN 'Yeu cau'
            WHEN pr.dm_patientobjectid = 5 THEN 'Mien phi'
            ELSE 'Khong ro'
          END AS doituong,
          mk.chandoanbandau AS servicename,
          TO_CHAR(pr.receptiondate, 'DD/MM/YYYY HH24:MI') AS time,
          0 AS serviceprice,
          kp.departmentname AS room
        FROM tb_patientrecord pr
        JOIN tb_patient p ON p.patientid = pr.patientid
        JOIN tb_medicalrecord_khambenh mk ON mk.medicalrecordid = pr.medicalrecordid_kb
        LEFT JOIN tb_department kp ON kp.departmentid = pr.departmentid
        WHERE pr.receptiondate BETWEEN $1 AND $2
          AND mk.chandoanbandau_icd10 LIKE ANY ($3)
          AND ${ageCondition}
        ORDER BY pr.receptiondate DESC
        LIMIT 1000
      `,
      [startDate, endDate, patterns],
    );

    return rows;
  }

  if (query.type === "transfer") {
    const { rows } = await hisPool.query(
      `
        SELECT
          pr.patientrecordid AS servicedataid,
          p.patientcode,
          p.patientname,
          (p.birthdayday || '/' || p.birthdaymonth || '/' || p.birthdayyear) AS dob,
          (EXTRACT(YEAR FROM CURRENT_DATE) - p.birthdayyear) AS age,
          CASE WHEN p.dm_gioitinhid = 1 THEN 'Nam' ELSE 'Nu' END AS gender,
          COALESCE(bv.dm_benhvienname, pr.mabenhvienchuyendi, 'Khong ro') AS hospitalname,
          pr.chandoan_kb_main AS diagnosis,
          TO_CHAR(pr.receptiondate, 'DD/MM/YYYY') AS examtime,
          pr.insurancecode AS insuranceid,
          CASE
            WHEN pr.dm_patientobjectid = 1 THEN 'Bao hiem'
            WHEN pr.dm_patientobjectid = 2 THEN 'Vien phi'
            WHEN pr.dm_patientobjectid = 3 THEN 'Yeu cau'
            WHEN pr.dm_patientobjectid = 5 THEN 'Mien phi'
            ELSE 'Khong ro'
          END AS doituong,
          TO_CHAR(pr.receptiondate, 'DD/MM/YYYY HH24:MI') AS time,
          kp.departmentname AS room
        FROM tb_patientrecord pr
        JOIN tb_patient p ON p.patientid = pr.patientid
        LEFT JOIN tb_department kp ON kp.departmentid = pr.departmentid
        LEFT JOIN tb_dm_benhvien bv ON bv.dm_benhviencode = pr.mabenhvienchuyendi
        WHERE pr.receptiondate BETWEEN $1 AND $2
          AND pr.dm_hinhthucravienid = 13
          AND pr.dm_patientobjectid != 3
        ORDER BY pr.receptiondate DESC
        LIMIT 1000
      `,
      [startDate, endDate],
    );

    return rows;
  }

  let whereClause = "";
  let groupFilter = "";
  const params: Array<string | Date> = [startDate, endDate];
  let paramIndex = 3;

  const hardcodedKeys = new Set([
    "xn_gui_ngoai",
    "xn_bhyt",
    "xn_dv_huyet_hoc",
    "xn_dv_sinh_hoa",
    "xn_dv_mien_dich",
    "xn_dv_khac",
    "xquang_dv",
    "xquang_bhyt",
    "sieu_am_dv",
    "sieu_am_bhyt",
    "noi_soi",
    "dien_tim",
    "cdha_khac",
    "tmh_dv",
    "tmh_bhyt",
    "tai_nha",
    "thu_thuat_dd",
    "vac_xin",
    "ngoai_bs",
    "thu_thuat_san",
    "ck_khac",
  ]);

  const mapping = hardcodedKeys.has(query.key)
    ? null
    : mappings.find((item) => item.category_key === query.key && item.is_active) ?? null;

  if (mapping) {
    const groupId = GROUP_ID_MAP[mapping.display_group];
    if (groupId) {
      groupFilter = `AND sd.dm_servicegroupid = ${groupId}`;
    }

    if (mapping.match_type === "exact") {
      whereClause = `AND sd.servicename = $${paramIndex}`;
      params.push(mapping.match_value);
      paramIndex += 1;
    } else if (mapping.match_type === "contains") {
      whereClause = `AND sd.servicename ILIKE $${paramIndex}`;
      params.push(`%${mapping.match_value}%`);
      paramIndex += 1;
    } else if (mapping.match_type === "starts_with") {
      whereClause = `AND sd.servicename ILIKE $${paramIndex}`;
      params.push(`${mapping.match_value}%`);
      paramIndex += 1;
    } else if (mapping.match_type === "regex") {
      whereClause = `AND sd.servicename ~* $${paramIndex}`;
      params.push(mapping.match_value);
    }
  } else {
    const baseLabFilter = "AND sd.dm_servicegroupid = 3 AND sd.servicedataid_master = 0";
    const baseImagingFilter = "AND sd.dm_servicegroupid = 4";
    const baseSpecialistFilter = "AND sd.dm_servicegroupid = 5";

    if (query.key === "xn_gui_ngoai") {
      whereClause = "AND sd.servicename LIKE '%[G]%'";
      groupFilter = baseLabFilter;
    } else if (query.key === "xn_bhyt") {
      whereClause = "AND pr.dm_patientobjectid = 1 AND sd.servicename NOT LIKE '%[G]%'";
      groupFilter = baseLabFilter;
    } else if (query.key === "xn_dv_huyet_hoc") {
      whereClause = `AND pr.dm_patientobjectid != 1 AND sd.servicename NOT LIKE '%[G]%' AND sd.dm_servicesubgroupid = ${LAB_SUBGROUP.HUYET_HOC}`;
      groupFilter = baseLabFilter;
    } else if (query.key === "xn_dv_sinh_hoa") {
      whereClause = `AND pr.dm_patientobjectid != 1 AND sd.servicename NOT LIKE '%[G]%' AND sd.dm_servicesubgroupid = ${LAB_SUBGROUP.HOA_SINH}`;
      groupFilter = baseLabFilter;
    } else if (query.key === "xn_dv_mien_dich") {
      whereClause = `AND pr.dm_patientobjectid != 1 AND sd.servicename NOT LIKE '%[G]%' AND sd.dm_servicesubgroupid = ${LAB_SUBGROUP.MIEN_DICH}`;
      groupFilter = baseLabFilter;
    } else if (query.key === "xn_dv_khac") {
      whereClause = `AND pr.dm_patientobjectid != 1 AND sd.servicename NOT LIKE '%[G]%' AND sd.dm_servicesubgroupid NOT IN (${LAB_SUBGROUP.HOA_SINH}, ${LAB_SUBGROUP.HUYET_HOC}, ${LAB_SUBGROUP.MIEN_DICH})`;
      groupFilter = baseLabFilter;
    } else if (query.key === "xquang_dv") {
      whereClause = `AND sd.dm_servicesubgroupid = ${IMAGING_SUBGROUP.XQUANG} AND pr.dm_patientobjectid != 1`;
      groupFilter = baseImagingFilter;
    } else if (query.key === "xquang_bhyt") {
      whereClause = `AND sd.dm_servicesubgroupid = ${IMAGING_SUBGROUP.XQUANG} AND pr.dm_patientobjectid = 1`;
      groupFilter = baseImagingFilter;
    } else if (query.key === "sieu_am_dv") {
      whereClause = `AND sd.dm_servicesubgroupid = ${IMAGING_SUBGROUP.SIEU_AM} AND pr.dm_patientobjectid != 1`;
      groupFilter = baseImagingFilter;
    } else if (query.key === "sieu_am_bhyt") {
      whereClause = `AND sd.dm_servicesubgroupid = ${IMAGING_SUBGROUP.SIEU_AM} AND pr.dm_patientobjectid = 1`;
      groupFilter = baseImagingFilter;
    } else if (query.key === "noi_soi") {
      whereClause = `AND sd.dm_servicesubgroupid = ${IMAGING_SUBGROUP.NOI_SOI}`;
      groupFilter = baseImagingFilter;
    } else if (query.key === "dien_tim") {
      whereClause = `AND sd.dm_servicesubgroupid = ${IMAGING_SUBGROUP.DIEN_TIM}`;
      groupFilter = baseImagingFilter;
    } else if (query.key === "cdha_khac") {
      whereClause = `AND sd.dm_servicesubgroupid NOT IN (${IMAGING_SUBGROUP.XQUANG}, ${IMAGING_SUBGROUP.SIEU_AM}, ${IMAGING_SUBGROUP.NOI_SOI}, ${IMAGING_SUBGROUP.DIEN_TIM})`;
      groupFilter = baseImagingFilter;
    } else if (query.key === "tmh_dv") {
      whereClause = `AND sd.dm_servicesubgroupid = ${SPECIALIST_SUBGROUP.TMH} AND pr.dm_patientobjectid != 1`;
      groupFilter = baseSpecialistFilter;
    } else if (query.key === "tmh_bhyt") {
      whereClause = `AND sd.dm_servicesubgroupid = ${SPECIALIST_SUBGROUP.TMH} AND pr.dm_patientobjectid = 1`;
      groupFilter = baseSpecialistFilter;
    } else if (query.key === "tai_nha") {
      whereClause = `AND sd.dm_servicesubgroupid = ${SPECIALIST_SUBGROUP.TAI_NHA}`;
      groupFilter = baseSpecialistFilter;
    } else if (query.key === "thu_thuat_dd") {
      whereClause = `AND sd.dm_servicesubgroupid = ${SPECIALIST_SUBGROUP.THU_THUAT_DD}`;
      groupFilter = baseSpecialistFilter;
    } else if (query.key === "vac_xin") {
      whereClause = `AND sd.dm_servicesubgroupid = ${SPECIALIST_SUBGROUP.VAC_XIN}`;
      groupFilter = baseSpecialistFilter;
    } else if (query.key === "ngoai_bs") {
      whereClause = `AND sd.dm_servicesubgroupid = ${SPECIALIST_SUBGROUP.NGOAI_BS}`;
      groupFilter = baseSpecialistFilter;
    } else if (query.key === "thu_thuat_san") {
      whereClause = `AND sd.dm_servicesubgroupid = ${SPECIALIST_SUBGROUP.SAN}`;
      groupFilter = baseSpecialistFilter;
    } else if (query.key === "ck_khac") {
      whereClause = `AND sd.dm_servicesubgroupid NOT IN (${SPECIALIST_SUBGROUP.TMH}, ${SPECIALIST_SUBGROUP.TAI_NHA}, ${SPECIALIST_SUBGROUP.THU_THUAT_DD}, ${SPECIALIST_SUBGROUP.VAC_XIN}, ${SPECIALIST_SUBGROUP.NGOAI_BS}, ${SPECIALIST_SUBGROUP.SAN})`;
      groupFilter = baseSpecialistFilter;
    } else {
      return [];
    }
  }

  const { rows } = await hisPool.query(
    `
      SELECT
        sd.servicedataid,
        p.patientcode,
        p.patientname,
        (p.birthdayday || '/' || p.birthdaymonth || '/' || p.birthdayyear) AS dob,
        (EXTRACT(YEAR FROM CURRENT_DATE) - p.birthdayyear) AS age,
        CASE WHEN p.dm_gioitinhid = 1 THEN 'Nam' ELSE 'Nu' END AS gender,
        pr.insuranceid,
        CASE
          WHEN pr.dm_patientobjectid = 1 THEN 'Bao hiem'
          WHEN pr.dm_patientobjectid = 2 THEN 'Vien phi'
          WHEN pr.dm_patientobjectid = 3 THEN 'Yeu cau'
          WHEN pr.dm_patientobjectid = 5 THEN 'Mien phi'
          ELSE 'Khong ro'
        END AS doituong,
        sd.servicename,
        TO_CHAR(sd.servicedatausedate, 'DD/MM/YYYY HH24:MI') AS time,
        sd.dongia AS serviceprice,
        kp.departmentname AS room
      FROM tb_servicedata sd
      JOIN tb_patientrecord pr ON pr.patientrecordid = sd.patientrecordid
      JOIN tb_patient p ON p.patientid = pr.patientid
      LEFT JOIN tb_medicalrecord mr ON mr.medicalrecordid = sd.medicalrecordid
      LEFT JOIN tb_department kp ON kp.departmentid = mr.departmentid
      WHERE sd.servicedatausedate BETWEEN $1 AND $2
        AND pr.dm_patientobjectid != 3
        ${groupFilter}
        ${whereClause}
      ORDER BY sd.servicedatausedate DESC
      LIMIT 10000
    `,
    params,
  );

  return rows;
}

