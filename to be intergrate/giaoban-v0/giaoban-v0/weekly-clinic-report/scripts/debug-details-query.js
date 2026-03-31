
const { Pool } = require('pg');

// Create minimal pool to simulate queryHis
// Need connection string from env... but I can't read .env easily in script if inconsistent.
// Assuming same env as app. I'll read .env manually or use process.env if available?
// Actually I can require '@/lib/db/his-client' if I use TS or register paths.
// But easier to just use 'pg' directly with hardcoded credentials found in session summary or context.
// Context says:
// Server: 192.168.1.253:5642
// User: n8n
// Pass: bsgd2022@EHC (encoded as bsgd2022%40EHC in env)
// DB: pkgd

const pool = new Pool({
    user: 'n8n',
    host: '192.168.1.253',
    database: 'pkgd',
    password: 'bsgd2022@EHC',
    port: 5642,
});

async function run() {
    try {
        const start = '2024-01-01';
        const end = '2024-01-07';

        let whereClause = `AND (pr.insuranceid IS NOT NULL OR sd.servicename ILIKE '%BHYT%') AND sd.servicename NOT LIKE '%[G]%'`;
        whereClause += ` AND EXISTS (SELECT 1 FROM tb_dm_servicegroup sg WHERE sg.dm_servicegroupid = sd.dm_servicegroupid AND sg.dm_servicegroupname ILIKE '%Xét nghiệm%')`;

        const sql = `
            SELECT 
                sd.servicedataid,
                p.patientname,
                (p.birthdayday || '/' || p.birthdaymonth || '/' || p.birthdayyear) as dob,
                (EXTRACT(YEAR FROM CURRENT_DATE) - p.birthdayyear) as age,
                CASE WHEN p.dm_gioitinhid = 1 THEN 'Nam' ELSE 'Nữ' END as gender,
                pr.insuranceid,
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
            ${whereClause}
            ORDER BY sd.servicedatausedate DESC
            LIMIT 50
        `;

        console.log('Running query...');
        const res = await pool.query(sql, [new Date(start), new Date(end)]);
        console.log(`Success! Rows: ${res.rowCount}`);
        pool.end();
    } catch (err) {
        console.error('Query Failed:', err);
        pool.end();
    }
}

run();
