
import { NextResponse } from 'next/server';
import { queryHis } from '@/lib/db/his-client';
import prisma from '@/lib/db/app-client';

// Map display_group to dm_servicegroupid
const GROUP_ID_MAP: Record<string, number> = {
    'kham_benh': 1,
    'xet_nghiem': 3,
    'cdha': 4,
    'chuyen_khoa': 5
};

export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);
    const key = searchParams.get('key');
    const type = searchParams.get('type');
    const startStr = searchParams.get('start');
    const endStr = searchParams.get('end');

    if (!key || !startStr || !endStr) {
        return NextResponse.json({ error: 'Missing parameters' }, { status: 400 });
    }

    const startDate = new Date(startStr);
    const endDate = new Date(endStr);

    try {
        // Special handling for Infectious Diseases
        if (type === 'infectious') {
            let patterns: string[] = [];

            if (key === 'group_rsv') {
                const codes = await prisma.wcrInfectiousCode.findMany({
                    where: { disease_group: 'rsv', is_active: true }
                });
                patterns = codes.map(c => c.icd_pattern);
            } else {
                const code = await prisma.wcrInfectiousCode.findFirst({
                    where: { icd_code: key!, is_active: true }
                });
                if (code) patterns.push(code.icd_pattern);
            }

            if (patterns.length === 0) {
                return NextResponse.json({ error: 'Unknown disease key' }, { status: 404 });
            }

            const sql = `
                SELECT 
                    pr.patientrecordid as servicedataid, -- Use patientrecordid as ID
                    p.patientcode,
                    p.patientname,
                    (p.birthdayday || '/' || p.birthdaymonth || '/' || p.birthdayyear) as dob,
                    (EXTRACT(YEAR FROM CURRENT_DATE) - p.birthdayyear) as age,
                    CASE WHEN p.dm_gioitinhid = 1 THEN 'Nam' ELSE 'Nữ' END as gender,
                    pr.insuranceid,
                    CASE 
                        WHEN pr.dm_patientobjectid = 1 THEN 'Bảo hiểm'
                        WHEN pr.dm_patientobjectid = 2 THEN 'Viện phí'
                        WHEN pr.dm_patientobjectid = 3 THEN 'Yêu cầu'
                        WHEN pr.dm_patientobjectid = 5 THEN 'Miễn phí'
                        ELSE 'Không rõ'
                    END as doituong,
                    mk.chandoanbandau as servicename, -- Use diagnosis as service name
                    TO_CHAR(pr.receptiondate, 'DD/MM/YYYY HH24:MI') as time,
                    0 as serviceprice,
                    kp.departmentname as room
                FROM tb_patientrecord pr
                JOIN tb_patient p ON p.patientid = pr.patientid
                JOIN tb_medicalrecord_khambenh mk ON mk.medicalrecordid = pr.medicalrecordid_kb
                LEFT JOIN tb_department kp ON kp.departmentid = pr.departmentid
                WHERE pr.receptiondate BETWEEN $1 AND $2
                AND mk.chandoanbandau_icd10 LIKE ANY ($3)
                ORDER BY pr.receptiondate DESC
                LIMIT 1000
            `;

            const { rows } = await queryHis(sql, [startDate, endDate, patterns]);
            return NextResponse.json(rows);
        }

        // Special handling for Age Group filter (from infectious disease chart)
        if (type === 'age_group') {
            // Map age group keys to SQL conditions
            const ageConditions: Record<string, string> = {
                'age_0_2': '(EXTRACT(YEAR FROM CURRENT_DATE) - p.birthdayyear) BETWEEN 0 AND 2',
                'age_3_12': '(EXTRACT(YEAR FROM CURRENT_DATE) - p.birthdayyear) BETWEEN 3 AND 12',
                'age_13_18': '(EXTRACT(YEAR FROM CURRENT_DATE) - p.birthdayyear) BETWEEN 13 AND 18',
                'age_18_50': '(EXTRACT(YEAR FROM CURRENT_DATE) - p.birthdayyear) BETWEEN 19 AND 50',
                'age_over_50': '(EXTRACT(YEAR FROM CURRENT_DATE) - p.birthdayyear) > 50'
            };

            const ageCondition = ageConditions[key!];
            if (!ageCondition) {
                return NextResponse.json({ error: 'Invalid age group key' }, { status: 400 });
            }

            // Get all infectious disease ICD patterns
            const codes = await prisma.wcrInfectiousCode.findMany({
                where: { is_active: true }
            });
            const patterns = codes.map(c => c.icd_pattern);

            const sql = `
                SELECT 
                    pr.patientrecordid as servicedataid,
                    p.patientcode,
                    p.patientname,
                    (p.birthdayday || '/' || p.birthdaymonth || '/' || p.birthdayyear) as dob,
                    (EXTRACT(YEAR FROM CURRENT_DATE) - p.birthdayyear) as age,
                    CASE WHEN p.dm_gioitinhid = 1 THEN 'Nam' ELSE 'Nữ' END as gender,
                    pr.insuranceid,
                    CASE 
                        WHEN pr.dm_patientobjectid = 1 THEN 'Bảo hiểm'
                        WHEN pr.dm_patientobjectid = 2 THEN 'Viện phí'
                        WHEN pr.dm_patientobjectid = 3 THEN 'Yêu cầu'
                        WHEN pr.dm_patientobjectid = 5 THEN 'Miễn phí'
                        ELSE 'Không rõ'
                    END as doituong,
                    mk.chandoanbandau as servicename,
                    TO_CHAR(pr.receptiondate, 'DD/MM/YYYY HH24:MI') as time,
                    0 as serviceprice,
                    kp.departmentname as room
                FROM tb_patientrecord pr
                JOIN tb_patient p ON p.patientid = pr.patientid
                JOIN tb_medicalrecord_khambenh mk ON mk.medicalrecordid = pr.medicalrecordid_kb
                LEFT JOIN tb_department kp ON kp.departmentid = pr.departmentid
                WHERE pr.receptiondate BETWEEN $1 AND $2
                AND mk.chandoanbandau_icd10 LIKE ANY ($3)
                AND ${ageCondition}
                ORDER BY pr.receptiondate DESC
                LIMIT 1000
            `;

            const { rows } = await queryHis(sql, [startDate, endDate, patterns]);
            return NextResponse.json(rows);
        }

        // Special handling for Transfer Patients
        if (type === 'transfer') {
            const sql = `
                SELECT 
                    pr.patientrecordid as servicedataid,
                    p.patientcode,
                    p.patientname,
                    (p.birthdayday || '/' || p.birthdaymonth || '/' || p.birthdayyear) as dob,
                    (EXTRACT(YEAR FROM CURRENT_DATE) - p.birthdayyear) as age,
                    CASE WHEN p.dm_gioitinhid = 1 THEN 'Nam' ELSE 'Nữ' END as gender,
                    COALESCE(bv.dm_benhvienname, pr.mabenhvienchuyendi, 'Không rõ') as hospitalname,
                    pr.chandoan_kb_main as diagnosis,
                    TO_CHAR(pr.receptiondate, 'DD/MM/YYYY') as examtime,
                    pr.insurancecode as insuranceid,
                    CASE 
                        WHEN pr.dm_patientobjectid = 1 THEN 'Bảo hiểm'
                        WHEN pr.dm_patientobjectid = 2 THEN 'Viện phí'
                        WHEN pr.dm_patientobjectid = 3 THEN 'Yêu cầu'
                        WHEN pr.dm_patientobjectid = 5 THEN 'Miễn phí'
                        ELSE 'Không rõ'
                    END as doituong,
                    TO_CHAR(pr.receptiondate, 'DD/MM/YYYY HH24:MI') as time,
                    kp.departmentname as room
                FROM tb_patientrecord pr
                JOIN tb_patient p ON p.patientid = pr.patientid
                LEFT JOIN tb_department kp ON kp.departmentid = pr.departmentid
                LEFT JOIN tb_dm_benhvien bv ON bv.dm_benhviencode = pr.mabenhvienchuyendi
                WHERE pr.receptiondate BETWEEN $1 AND $2
                AND pr.dm_hinhthucravienid = 13  -- Chuyển viện
                AND pr.dm_patientobjectid != 3  -- Exclude "Yêu cầu"
                ORDER BY pr.receptiondate DESC
                LIMIT 1000
            `;

            const { rows } = await queryHis(sql, [startDate, endDate]);
            return NextResponse.json(rows);
        }

        let whereClause = '';
        let groupFilter = '';
        let params: any[] = [startDate, endDate];
        let paramIdx = 3;

        // Check if it's a dynamic mapping, but skip for hardcoded lab/imaging/specialist keys
        const labKeys = ['xn_gui_ngoai', 'xn_bhyt', 'xn_dv_huyet_hoc', 'xn_dv_sinh_hoa', 'xn_dv_mien_dich', 'xn_dv_khac'];
        const imagingKeys = ['xquang_dv', 'xquang_bhyt', 'sieu_am_dv', 'sieu_am_bhyt', 'noi_soi', 'dien_tim', 'cdha_khac'];
        const specialistKeys = ['tmh_dv', 'tmh_bhyt', 'tai_nha', 'thu_thuat_dd', 'vac_xin', 'ngoai_bs', 'thu_thuat_san', 'ck_khac'];
        const hardcodedKeys = [...labKeys, ...imagingKeys, ...specialistKeys];

        let mapping = null;
        if (!hardcodedKeys.includes(key!)) {
            mapping = await prisma.wcrServiceMapping.findUnique({
                where: { category_key: key! }
            });
        }

        if (mapping) {
            // Add dm_servicegroupid filter based on display_group
            const groupId = GROUP_ID_MAP[mapping.display_group];
            if (groupId) {
                groupFilter = `AND sd.dm_servicegroupid = ${groupId}`;
            }

            // Add name pattern matching
            if (mapping.match_type === 'exact') {
                whereClause = `AND sd.servicename = $${paramIdx}`;
                params.push(mapping.match_value);
            } else if (mapping.match_type === 'contains') {
                whereClause = `AND sd.servicename ILIKE $${paramIdx}`;
                params.push(`%${mapping.match_value}%`);
            } else if (mapping.match_type === 'starts_with') {
                whereClause = `AND sd.servicename ILIKE $${paramIdx}`;
                params.push(`${mapping.match_value}%`);
            } else if (mapping.match_type === 'regex') {
                whereClause = `AND sd.servicename ~* $${paramIdx}`;
                params.push(mapping.match_value);
            }
        } else {
            // Hardcoded keys for Laboratory - only count parent tests (servicedataid_master = 0)
            const baseLabFilter = `AND sd.dm_servicegroupid = 3 AND sd.servicedataid_master = 0`;
            const baseImagingFilter = `AND sd.dm_servicegroupid = 4`;

            if (key === 'xn_gui_ngoai') {
                whereClause = `AND sd.servicename LIKE '%[G]%'`;
                groupFilter = baseLabFilter;
            } else if (key === 'xn_bhyt') {
                whereClause = `AND pr.dm_patientobjectid = 1 AND sd.servicename NOT LIKE '%[G]%'`;
                groupFilter = baseLabFilter;
            } else if (key === 'xn_dv_huyet_hoc') {
                whereClause = `AND pr.dm_patientobjectid != 1 AND sd.servicename NOT LIKE '%[G]%' AND sd.dm_servicesubgroupid = 303`;
                groupFilter = baseLabFilter;
            } else if (key === 'xn_dv_sinh_hoa') {
                whereClause = `AND pr.dm_patientobjectid != 1 AND sd.servicename NOT LIKE '%[G]%' AND sd.dm_servicesubgroupid = 301`;
                groupFilter = baseLabFilter;
            } else if (key === 'xn_dv_mien_dich') {
                whereClause = `AND pr.dm_patientobjectid != 1 AND sd.servicename NOT LIKE '%[G]%' AND sd.dm_servicesubgroupid = 318`;
                groupFilter = baseLabFilter;
            } else if (key === 'xn_dv_khac') {
                whereClause = `AND pr.dm_patientobjectid != 1 AND sd.servicename NOT LIKE '%[G]%' AND sd.dm_servicesubgroupid NOT IN (301, 303, 318)`;
                groupFilter = baseLabFilter;
            }
            // Imaging categories - use dm_servicesubgroupid (401=X-quang, 402=Siêu âm, 403=Nội soi, 404=Điện tim)
            else if (key === 'xquang_dv') {
                whereClause = `AND sd.dm_servicesubgroupid = 401 AND pr.dm_patientobjectid != 1`;
                groupFilter = baseImagingFilter;
            } else if (key === 'xquang_bhyt') {
                whereClause = `AND sd.dm_servicesubgroupid = 401 AND pr.dm_patientobjectid = 1`;
                groupFilter = baseImagingFilter;
            } else if (key === 'sieu_am_dv') {
                whereClause = `AND sd.dm_servicesubgroupid = 402 AND pr.dm_patientobjectid != 1`;
                groupFilter = baseImagingFilter;
            } else if (key === 'sieu_am_bhyt') {
                whereClause = `AND sd.dm_servicesubgroupid = 402 AND pr.dm_patientobjectid = 1`;
                groupFilter = baseImagingFilter;
            } else if (key === 'noi_soi') {
                whereClause = `AND sd.dm_servicesubgroupid = 403`;
                groupFilter = baseImagingFilter;
            } else if (key === 'dien_tim') {
                whereClause = `AND sd.dm_servicesubgroupid = 404`;
                groupFilter = baseImagingFilter;
            } else if (key === 'cdha_khac') {
                whereClause = `AND sd.dm_servicesubgroupid NOT IN (401, 402, 403, 404)`;
                groupFilter = baseImagingFilter;
            }
            // Specialist categories - use dm_servicesubgroupid
            // (100000=TMH, 100004=Tại nhà, 501=Thủ thuật DD, 10001=Vắc xin, 100002=Ngoại BS, 100003=Sản)
            const baseSpecialistFilter = `AND sd.dm_servicegroupid = 5`;
            if (key === 'tmh_dv') {
                whereClause = `AND sd.dm_servicesubgroupid = 100000 AND pr.dm_patientobjectid != 1`;
                groupFilter = baseSpecialistFilter;
            } else if (key === 'tmh_bhyt') {
                whereClause = `AND sd.dm_servicesubgroupid = 100000 AND pr.dm_patientobjectid = 1`;
                groupFilter = baseSpecialistFilter;
            } else if (key === 'tai_nha') {
                whereClause = `AND sd.dm_servicesubgroupid = 100004`;
                groupFilter = baseSpecialistFilter;
            } else if (key === 'thu_thuat_dd') {
                whereClause = `AND sd.dm_servicesubgroupid = 501`;
                groupFilter = baseSpecialistFilter;
            } else if (key === 'vac_xin') {
                whereClause = `AND sd.dm_servicesubgroupid = 10001`;
                groupFilter = baseSpecialistFilter;
            } else if (key === 'ngoai_bs') {
                whereClause = `AND sd.dm_servicesubgroupid = 100002`;
                groupFilter = baseSpecialistFilter;
            } else if (key === 'thu_thuat_san') {
                whereClause = `AND sd.dm_servicesubgroupid = 100003`;
                groupFilter = baseSpecialistFilter;
            } else if (key === 'ck_khac') {
                whereClause = `AND sd.dm_servicesubgroupid NOT IN (100000, 100004, 501, 10001, 100002, 100003)`;
                groupFilter = baseSpecialistFilter;
            } else if (!whereClause) {
                return NextResponse.json({ error: 'Unknown category key' }, { status: 404 });
            }
        }

        const sql = `
            SELECT 
                sd.servicedataid,
                p.patientcode,
                p.patientname,
                (p.birthdayday || '/' || p.birthdaymonth || '/' || p.birthdayyear) as dob,
                (EXTRACT(YEAR FROM CURRENT_DATE) - p.birthdayyear) as age,
                CASE WHEN p.dm_gioitinhid = 1 THEN 'Nam' ELSE 'Nữ' END as gender,
                pr.insuranceid,
                CASE 
                    WHEN pr.dm_patientobjectid = 1 THEN 'Bảo hiểm'
                    WHEN pr.dm_patientobjectid = 2 THEN 'Viện phí'
                    WHEN pr.dm_patientobjectid = 3 THEN 'Yêu cầu'
                    WHEN pr.dm_patientobjectid = 5 THEN 'Miễn phí'
                    ELSE 'Không rõ'
                END as doituong,
                sd.servicename,
                TO_CHAR(sd.servicedatausedate, 'DD/MM/YYYY HH24:MI') as time,
                sd.dongia as serviceprice,
                kp.departmentname as room
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
        `;

        const { rows } = await queryHis(sql, params);
        return NextResponse.json(rows);

    } catch (error) {
        console.error('Error details:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
