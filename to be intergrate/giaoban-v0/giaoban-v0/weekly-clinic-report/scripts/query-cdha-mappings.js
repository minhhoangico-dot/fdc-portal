// Query CDHA mappings
require('dotenv').config();
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function run() {
    try {
        const mappings = await prisma.wcrServiceMapping.findMany({
            where: { display_group: 'cdha' },
            orderBy: { display_order: 'asc' }
        });
        console.log('CDHA Mappings:');
        mappings.forEach(m => {
            console.log(`${m.category_key}: ${m.category_name_vi} (${m.match_type}: ${m.match_value})`);
        });
    } catch (e) {
        console.error(e);
    } finally {
        await prisma.$disconnect();
    }
}

run();
