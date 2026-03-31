
import { Pool } from 'pg';
import { execSync } from 'child_process';
import path from 'path';
import dotenv from 'dotenv';

// Load .env from project root
dotenv.config({ path: path.resolve(__dirname, '../.env') });

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
});

async function main() {
    console.log('🚀 Generating schema diff...');
    try {
        // Generate SQL directly using prisma command
        const sql = execSync('npx prisma migrate diff --from-empty --to-schema-datamodel prisma/schema.prisma --script', {
            cwd: path.resolve(__dirname, '..'),
            encoding: 'utf-8'
        });

        console.log('🚀 Deploying schema...');
        // Split by semi-colon to run statements individually if needed, but allow valid multi-statements
        // Postgres driver usually handles multi-statement if it's simple SQL text
        await pool.query(sql);
        console.log('✅ Schema deployed successfully');
    } catch (error) {
        console.error('❌ Error deploying schema:', error);
    } finally {
        await pool.end();
    }
}

main();
