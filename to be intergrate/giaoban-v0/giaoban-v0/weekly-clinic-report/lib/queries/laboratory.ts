
import { queryHis } from '@/lib/db/his-client';

// Lab subgroup IDs
const SUBGROUP = {
  HOA_SINH: 301,    // Sinh hóa
  HUYET_HOC: 303,   // Huyết học
  MIEN_DICH: 318    // Miễn dịch
};

export async function getLaboratoryStats(startDate: Date, endDate: Date, prevStartDate: Date, prevEndDate: Date) {
  // Use dm_servicegroupid = 3 for Xét nghiệm
  // Only count parent tests (servicedataid_master = 0)
  // Exclude Yêu cầu (dm_patientobjectid = 3)
  const sql = `
    SELECT 
      CASE 
        WHEN sd.servicename LIKE '%[G]%' THEN 'xn_gui_ngoai'
        WHEN pr.dm_patientobjectid = 1 THEN 'xn_bhyt'
        WHEN sd.dm_servicesubgroupid = ${SUBGROUP.HUYET_HOC} THEN 'xn_dv_huyet_hoc'
        WHEN sd.dm_servicesubgroupid = ${SUBGROUP.HOA_SINH} THEN 'xn_dv_sinh_hoa'
        WHEN sd.dm_servicesubgroupid = ${SUBGROUP.MIEN_DICH} THEN 'xn_dv_mien_dich'
        ELSE 'xn_dv_khac'
      END as category,
      COUNT(*) FILTER (WHERE sd.servicedatausedate BETWEEN $1 AND $2) as current_count,
      COUNT(*) FILTER (WHERE sd.servicedatausedate BETWEEN $3 AND $4) as prev_count
    FROM tb_servicedata sd
    JOIN tb_patientrecord pr ON pr.patientrecordid = sd.patientrecordid
    WHERE sd.servicedatausedate BETWEEN $3 AND $2
      AND sd.dm_servicegroupid = 3
      AND sd.servicedataid_master = 0
      AND pr.dm_patientobjectid != 3
    GROUP BY 1
  `;

  const { rows } = await queryHis(sql, [startDate, endDate, prevStartDate, prevEndDate]);

  const result = {
    xn_gui_ngoai: { key: 'xn_gui_ngoai', name: 'Xét nghiệm gửi [G]', current: 0, previous: 0 },
    xn_bhyt: { key: 'xn_bhyt', name: 'Xét nghiệm BHYT', current: 0, previous: 0 },
    xn_dv_huyet_hoc: { key: 'xn_dv_huyet_hoc', name: 'XN Huyết học (DV)', current: 0, previous: 0 },
    xn_dv_sinh_hoa: { key: 'xn_dv_sinh_hoa', name: 'XN Sinh hóa (DV)', current: 0, previous: 0 },
    xn_dv_mien_dich: { key: 'xn_dv_mien_dich', name: 'XN Miễn dịch (DV)', current: 0, previous: 0 },
    xn_dv_khac: { key: 'xn_dv_khac', name: 'XN khác (DV)', current: 0, previous: 0 }
  };

  for (const row of rows) {
    const key = row.category as keyof typeof result;
    if (result[key]) {
      result[key].current = parseInt(row.current_count);
      result[key].previous = parseInt(row.prev_count);
    }
  }

  return Object.values(result);
}
