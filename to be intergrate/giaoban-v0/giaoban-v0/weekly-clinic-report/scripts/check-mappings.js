
const { Pool } = require('pg');
const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
});

async function run() {
    try {
        const res = await pool.query(`SELECT * FROM wcr_service_mappings WHERE category_key IN ('xn_dich_vu', 'xn_bhyt', 'xn_gui_ngoai')`);
        console.log(res.rows);
    } catch (e) {
        console.error(e);
    } finally {
        pool.end();
    }
}

run();
