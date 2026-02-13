const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

function randomInt(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

function pick(arr) {
    return arr[Math.floor(Math.random() * arr.length)];
}

function calculate({ C, S, RA, RA_unit, A0, A_house, N }) {
    const fC = C / (C + S);
    const RA_cc = RA_unit === 'L' ? RA * 1000 : RA;
    const V_per_house = RA_cc * (A_house / A0);
    const V_total = N * V_per_house;
    const V_C = V_total * fC;
    const V_S = V_total * (1 - fC);
    const V_C_1L = 1000 * fC;

    const roundTo = (num, decimals) => {
        const factor = Math.pow(10, decimals);
        return Math.round(num * factor) / factor;
    };

    return {
        V_per_house: roundTo(V_per_house, 2),
        V_total: roundTo(V_total, 2),
        V_C: roundTo(V_C, 2),
        V_S: roundTo(V_S, 2),
        V_C_1L: roundTo(V_C_1L, 2),
    };
}

async function main() {
    console.log('🌱 Seeding database...');

    // Clear existing data for a consistent demo dashboard
    await prisma.calculation.deleteMany({});
    try {
        await prisma.feedback.deleteMany({});
    } catch (e) {
        console.warn('⚠️  Feedback table not available yet, skipping feedback cleanup');
    }

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

    const demoUsers = [
        { email: 'user1@gmail.com', name: 'สมชาย ใจดี', role: 'USER' },
        { email: 'user2@gmail.com', name: 'สมหญิง แสนสุข', role: 'USER' },
        { email: 'user3@gmail.com', name: 'เอกชัย กล้าหาญ', role: 'USER' },
        { email: 'user4@gmail.com', name: 'กัญญา พรชัย', role: 'USER' },
        { email: 'staff@gmail.com', name: 'เจ้าหน้าที่ เขต 1', role: 'ADMIN' },
    ];

    const createdUsers = [admin];
    for (const u of demoUsers) {
        const pw = await bcrypt.hash('user1234', 10);
        const created = await prisma.user.upsert({
            where: { email: u.email },
            update: {
                role: u.role,
            },
            create: {
                email: u.email,
                name: u.name,
                password: pw,
                role: u.role,
            },
        });
        createdUsers.push(created);
    }
    console.log('✅ Created demo users:', createdUsers.length);

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

    const existingProfiles = await prisma.labelProfile.findMany({
        where: { isActive: true },
        select: { id: true, name: true, C: true, S: true, RA: true, RA_unit: true, A0: true },
    });

    const locations = [
        'หมู่ 1 บ้านเหนือ',
        'หมู่ 2 บ้านกลาง',
        'หมู่ 3 บ้านใต้',
        'อบต. ตัวอย่าง',
        'เทศบาลตำบล A',
        'รพ.สต. ตัวอย่าง',
        'ไม่ระบุ',
    ];

    const chemicals = [
        'Deltamethrin',
        'Permethrin',
        'Cypermethrin',
        'Malathion',
        'Temephos',
        'Lambda-cyhalothrin',
        null,
    ];

    const now = new Date();
    const daysBack = 30;
    let createdCalcs = 0;

    for (let d = 0; d <= daysBack; d++) {
        const date = new Date(now);
        date.setDate(now.getDate() - d);

        const perDay = randomInt(1, 6);
        for (let i = 0; i < perDay; i++) {
            const base = new Date(date);
            base.setHours(randomInt(8, 20), randomInt(0, 59), randomInt(0, 59), 0);

            const profile = pick(existingProfiles);
            const input = {
                C: profile ? profile.C : 1,
                S: profile ? profile.S : 39,
                RA: profile ? profile.RA : 2,
                RA_unit: profile ? profile.RA_unit : 'L',
                A0: profile ? profile.A0 : 10000,
                A_house: randomInt(60, 140),
                N: randomInt(5, 60),
            };

            const result = calculate(input);
            const attachUser = Math.random() < 0.75;
            const user = attachUser ? pick(createdUsers) : null;

            await prisma.calculation.create({
                data: {
                    userId: user ? user.id : null,
                    profileId: profile ? profile.id : null,
                    C: input.C,
                    S: input.S,
                    RA: input.RA,
                    RA_unit: input.RA_unit,
                    A0: input.A0,
                    A_house: input.A_house,
                    N: input.N,
                    location: pick(locations),
                    chemical: pick(chemicals),
                    V_per_house: result.V_per_house,
                    V_total: result.V_total,
                    V_C: result.V_C,
                    V_S: result.V_S,
                    V_C_1L: result.V_C_1L,
                    createdAt: base,
                },
            });
            createdCalcs++;
        }
    }

    console.log('✅ Created calculations:', createdCalcs);

    try {
        const feedbacks = [
            {
                type: 'GENERAL',
                organization: 'อบต. ตัวอย่าง',
                reason: 'แนะนำการใช้งาน',
                message: 'หน้าแดชบอร์ดดูดีมาก แต่ขอเพิ่มปุ่ม export รายงานด้วยครับ',
                contact: '0812345678',
            },
            {
                type: 'FORMULA_REQUEST',
                organization: 'เทศบาลตำบล A',
                reason: 'ขอเพิ่มสูตรใหม่',
                message: 'ต้องการสูตรสำหรับพื้นที่หนาแน่น/ชุมชนแออัด',
                contact: '0900000000',
                formulaData: JSON.stringify({ name: 'ULV 1:3', C: 1, S: 3, RA: 80, RA_unit: 'cc', A0: 1000 }),
            },
            {
                type: 'GENERAL',
                organization: 'รพ.สต. ตัวอย่าง',
                reason: 'รายงานปัญหา',
                message: 'บางครั้งคำนวณแล้วค่าปัดเศษดูแปลก ๆ',
                contact: null,
            },
        ];

        for (const f of feedbacks) {
            await prisma.feedback.create({ data: f });
        }
        console.log('✅ Created feedbacks:', feedbacks.length);
    } catch (e) {
        console.warn('⚠️  Feedback table not available yet, skipping feedback seed');
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
