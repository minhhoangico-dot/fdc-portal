
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
            SELECT column_name 
            FROM information_schema.columns 
            WHERE table_name = 'tb_servicedata'
        `;
        const res = await pool.query(sql);
        console.log('Columns:', res.rows.map(r => r.column_name));
        pool.end();
    } catch (err) {
        console.error('Query Failed:', err);
        pool.end();
    }
}

run();
