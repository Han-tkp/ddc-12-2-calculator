const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function verify() {
    console.log('🔄 Checking database connection (JS)...');
    try {
        const userCount = await prisma.user.count();
        console.log(`✅ Success! Users: ${userCount}`);

        try {
            const analysisCount = await prisma.dropletAnalysis.count();
            console.log(`✅ Success! Droplet Analyses: ${analysisCount}`);
            // Also list one to be sure
            const one = await prisma.dropletAnalysis.findFirst();
            console.log('First record:', one);
        } catch (e) {
            console.log('❌ Droplet Analysis table check failed!');
            console.error(e.message);
        }
    } catch (error) {
        console.error('❌ Database connection failed:', error);
    } finally {
        await prisma.$disconnect();
    }
}

verify();
