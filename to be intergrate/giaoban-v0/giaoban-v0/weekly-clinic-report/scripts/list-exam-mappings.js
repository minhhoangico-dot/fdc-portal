
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function run() {
    const mappings = await prisma.wcrServiceMapping.findMany({
        where: { display_group: 'kham_benh', is_active: true },
        orderBy: { display_order: 'asc' }
    });
    console.log(JSON.stringify(mappings, null, 2));
}

run()
    .catch(e => console.error(e))
    .finally(async () => await prisma.$disconnect());
