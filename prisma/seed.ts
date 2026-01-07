// prisma/seed.ts

import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
    console.log('🌱 Seeding database...');

    // Create admin user
    const hashedPassword = await bcrypt.hash('admin1234', 10);

    const admin = await prisma.user.upsert({
        where: { email: 'admin@gmail.com' },
        update: {},
        create: {
            email: 'admin@gmail.com',
            name: 'ผู้ดูแลระบบ',
            password: hashedPassword,
            role: 'ADMIN',
        },
    });
    console.log('✅ Created admin user:', admin.email);

    // Create sample profiles (default system profiles)
    const profiles = [
        {
            name: 'หมอกควัน 1:79',
            description: 'สำหรับเครื่องพ่นหมอกควัน อัตราส่วน 1:79',
            C: 1,
            S: 79,
            RA: 1,
            RA_unit: 'L',
            A0: 1000,
            isDefault: true,
        },
        {
            name: 'ULV 1:4',
            description: 'สำหรับเครื่อง ULV อัตราส่วน 1:4',
            C: 1,
            S: 4,
            RA: 75,
            RA_unit: 'cc',
            A0: 1000,
            isDefault: true,
        },
        {
            name: 'ฉีดพ่น 1:39',
            description: 'สำหรับเครื่องฉีดพ่น อัตราส่วน 1:39',
            C: 1,
            S: 39,
            RA: 2,
            RA_unit: 'L',
            A0: 10000,
            isDefault: true,
        },
    ];

    for (const profile of profiles) {
        const created = await prisma.labelProfile.upsert({
            where: { name: profile.name },
            update: {},
            create: profile,
        });
        console.log('✅ Created profile:', created.name);
    }

    console.log('🎉 Seeding completed!');
}

main()
    .catch((e) => {
        console.error('❌ Seeding failed:', e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
