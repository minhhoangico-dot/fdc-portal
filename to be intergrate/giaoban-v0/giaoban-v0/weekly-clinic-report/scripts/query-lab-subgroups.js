// Query lab subgroups from HIS database
require('dotenv').config();
const { Pool } = require('pg');

const pool = new Pool({
    connectionString: process.env.HIS_DATABASE_URL
});

async function run() {
    try {
        const sql = `
            SELECT ssg.dm_servicesubgroupid, ssg.dm_servicesubgroupname, COUNT(sd.*) as cnt
            FROM tb_dm_servicesubgroup ssg
            LEFT JOIN tb_servicedata sd ON sd.dm_servicesubgroupid = ssg.dm_servicesubgroupid 
                AND sd.dm_servicegroupid = 3
                AND sd.servicedatausedate > '2025-01-01'
                AND sd.servicedataid_master = 0
            WHERE ssg.dm_servicegroupid = 3
            GROUP BY ssg.dm_servicesubgroupid, ssg.dm_servicesubgroupname
            ORDER BY cnt DESC
        `;
        const res = await pool.query(sql);
        console.log('Lab Subgroups:');
        res.rows.forEach(r => {
            console.log(`${r.dm_servicesubgroupid}: ${r.dm_servicesubgroupname} (${r.cnt})`);
        });
    } catch (e) {
        console.error(e);
    } finally {
        pool.end();
    }
}

run();
