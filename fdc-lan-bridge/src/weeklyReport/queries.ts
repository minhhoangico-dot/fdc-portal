/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { hisPool } from "../db/his";
import { WeeklyReportDetailsQuery, WeeklyReportInfectiousCode, WeeklyReportServiceMapping } from "./types";

export { getExaminationStats } from "./queries/examination";
export { getLaboratoryStats } from "./queries/laboratory";
export { getImagingStats } from "./queries/imaging";
export { getSpecialistStats } from "./queries/procedures";
export { getTransferStats } from "./queries/transfer";
export { getInfectiousStats } from "./queries/infectious";

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

