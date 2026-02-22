import { db } from './src/lib/db';

async function verify() {
    console.log('🔄 Checking database connection...');
    try {
        const userCount = await db.user.count();
        console.log(`✅ Success! Users: ${userCount}`);

        // Check if droplet_analyses table is available by counting
        try {
            const analysisCount = await db.dropletAnalysis.count();
            console.log(`✅ Success! Droplet Analyses: ${analysisCount}`);
        } catch (e) {
            console.log('❌ Droplet Analysis table check failed!');
            console.error(e);
        }
    } catch (error) {
        console.error('❌ Database connection failed:', error);
    } finally {
        await db.$disconnect();
    }
}

verify();
