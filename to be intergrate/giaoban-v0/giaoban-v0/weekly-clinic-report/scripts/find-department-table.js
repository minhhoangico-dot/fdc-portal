
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
            SELECT table_name 
            FROM information_schema.tables 
            WHERE table_schema = 'public' 
            AND table_name ILIKE '%department%'
        `;
        const res = await pool.query(sql);
        console.log('Tables found:', res.rows.map(r => r.table_name));
        pool.end();
    } catch (err) {
        console.error('Query Failed:', err);
        pool.end();
    }
}

run();
