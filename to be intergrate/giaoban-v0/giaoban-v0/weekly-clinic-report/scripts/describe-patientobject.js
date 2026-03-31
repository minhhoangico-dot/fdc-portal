const { Pool } = require('pg');

const pool = new Pool({
    user: 'n8n',
    host: '192.168.1.253',
    database: 'pkgd',
    password: 'bsgd2022@EHC',
    port: 5642,
});

async function run() {
    try {
        const sql = `
            SELECT sd.servicename, sd.dm_servicegroupid, COUNT(*) as cnt
            FROM tb_servicedata sd
            WHERE sd.servicedatausedate > '2025-01-01'
            AND sd.dm_servicegroupid = 1
            AND (sd.servicename ILIKE '%thuốc%' OR sd.servicename ILIKE '%viên%' OR sd.servicename ILIKE '%ống%' OR sd.servicename ILIKE '%mg%' OR sd.servicename ILIKE '%ml%')
            GROUP BY sd.servicename, sd.dm_servicegroupid
            ORDER BY cnt DESC
            LIMIT 30
        `;
        const res = await pool.query(sql);
        console.log('Rows:', res.rows);
        pool.end();
    } catch (err) {
        console.error('Query Failed:', err.message);
        pool.end();
    }
}

run();
