import { Pool } from 'pg';

let hisPool: Pool | null = null;

function getPool() {
    if (!hisPool) {
        if (!process.env.HIS_DATABASE_URL) {
            throw new Error('Missing HIS_DATABASE_URL environment variable');
        }
        hisPool = new Pool({
            connectionString: process.env.HIS_DATABASE_URL,
        });
    }
    return hisPool;
}

export const queryHis = async (text: string, params?: any[]) => {
    const pool = getPool();
    const start = Date.now();
    const res = await pool.query(text, params);
    const duration = Date.now() - start;
    // console.log('executed query', { text, duration, rows: res.rowCount });
    return res;
};

export default getPool;
