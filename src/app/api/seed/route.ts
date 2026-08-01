import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { calculate } from '@/lib/calculations';

const LABEL_PROFILES = [
    {
        name: 'Deltacide (หมอกควัน 1:79)',
        description: 'เดลตาไซด์ อัตราส่วน 1:79 สำหรับพ่นหมอกควัน Thermal Fogging กำจัดยุงลาย ยุงรำคาญ',
        C: 1, S: 79, RA: 1, RA_unit: 'L', mix_type: 1, A0: 1000, tankCapacity: 10,
        isActive: true, isDefault: true,
    },
    {
        name: 'Deltacide (ULV 1:4)',
        description: 'เดลตาไซด์ อัตราส่วน 1:4 สำหรับพ่นฝอยละเอียด ULV กำจัดยุงลาย ยุงรำคาญ',
        C: 1, S: 4, RA: 75, RA_unit: 'cc', mix_type: 2, A0: 1000, tankCapacity: 10,
        isActive: true, isDefault: true,
    },
    {
        name: 'Submarine (หมอกควัน 1:249)',
        description: 'ซับมาริน อัตราส่วน 1:249 สำหรับพ่นหมอกควัน Thermal Fogging กำจัดยุงลาย',
        C: 1, S: 249, RA: 1.25, RA_unit: 'L', mix_type: 1, A0: 1000, tankCapacity: 10,
        isActive: true, isDefault: true,
    },
    {
        name: 'Submarine (ULV 1:39)',
        description: 'ซับมาริน อัตราส่วน 1:39 สำหรับพ่นฝอยละเอียด ULV กำจัดยุงลาย',
        C: 1, S: 39, RA: 2, RA_unit: 'L', mix_type: 1, A0: 10000, tankCapacity: 10,
        isActive: true, isDefault: true,
    },
    {
        name: 'Fendona (หมอกควัน 1:99)',
        description: 'เฟนโดนา อัตราส่วน 1:99 สำหรับพ่นหมอกควัน กำจัดแมลงศัตรูพืช',
        C: 1, S: 99, RA: 1, RA_unit: 'L', mix_type: 1, A0: 1000, tankCapacity: 10,
        isActive: true, isDefault: false,
    },
    {
        name: 'K-Othrine (ULV 1:9)',
        description: 'เค-โอทริน อัตราส่วน 1:9 สำหรับพ่นฝอยละเอียด กำจัดยุงลาย ยุงกันปล่อง',
        C: 1, S: 9, RA: 50, RA_unit: 'cc', mix_type: 2, A0: 1000, tankCapacity: 10,
        isActive: true, isDefault: false,
    },
    {
        name: 'Aqua Resigen (ULV 1:4)',
        description: 'อควา เรซิเจน อัตราส่วน 1:4 สำหรับพ่นฝอยละเอียด ULV กำจัดยุงลาย',
        C: 1, S: 4, RA: 60, RA_unit: 'cc', mix_type: 2, A0: 1000, tankCapacity: 10,
        isActive: true, isDefault: false,
    },
];

const LOCATIONS = [
    { name: 'มหาวิทยาลัยราชภัฏสงขลา', lat: 7.1753, lng: 100.6143 },
    { name: 'โรงพยาบาลสงขลา', lat: 7.1897, lng: 100.5947 },
    { name: 'ตลาดสดสงขลา', lat: 7.1881, lng: 100.5934 },
    { name: 'วัดเกาะถ้ำ', lat: 7.1962, lng: 100.5918 },
    { name: 'สวนสาธารณะเขาตังกวน', lat: 7.1808, lng: 100.5872 },
    { name: 'ชุมชนเก้าเส้ง สงขลา', lat: 7.1723, lng: 100.5847 },
    { name: 'เทศบาลนครสงขลา', lat: 7.1896, lng: 100.5951 },
    { name: 'วิทยาลัยอาชีวศึกษาสงขลา', lat: 7.1876, lng: 100.5988 },
    { name: 'โรงเรียนหาดใหญ่วิทยาลัย', lat: 7.0049, lng: 100.4734 },
    { name: 'เซ็นทรัลเฟสติวัล หาดใหญ่', lat: 7.0052, lng: 100.4747 },
    { name: 'มหาวิทยาลัยสงขลานครินทร์', lat: 7.0076, lng: 100.5003 },
    { name: 'สนามบินหาดใหญ่', lat: 6.9333, lng: 100.3930 },
    { name: 'โลตัส หาดใหญ่', lat: 7.0089, lng: 100.4681 },
    { name: 'ตลาดกิมหยง', lat: 7.0036, lng: 100.4714 },
    { name: 'หาดใหญ่ใน ซอย 3', lat: 6.9972, lng: 100.4738 },
    { name: 'โรงพยาบาลหาดใหญ่', lat: 7.0018, lng: 100.4770 },
    { name: 'คลองเตย หาดใหญ่', lat: 6.9941, lng: 100.4652 },
    { name: 'ชุมชนบ้านพรุ หาดใหญ่', lat: 6.9650, lng: 100.4623 },
];

function randomInt(min: number, max: number) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

function randomFloat(min: number, max: number, decimals = 3) {
    return parseFloat((Math.random() * (max - min) + min).toFixed(decimals));
}

export async function POST() {
    try {
        const result: string[] = [];

        // 1) Upsert label_profiles
        for (const profile of LABEL_PROFILES) {
            const { error: upsertError } = await supabaseAdmin
                .from('label_profiles')
                .upsert(profile, { onConflict: 'name', ignoreDuplicates: true });

            if (upsertError) throw upsertError;
        }
        result.push(`Seeded ${LABEL_PROFILES.length} label profiles`);

        // 2) Insert realistic calculations using the seeded profiles
        const records: Record<string, unknown>[] = [];
        for (const loc of LOCATIONS) {
            const count = randomInt(1, 4);
            for (let i = 0; i < count; i++) {
                const profile = LABEL_PROFILES[randomInt(0, LABEL_PROFILES.length - 1)];
                const N = randomInt(5, 80);
                const A_house = 100;

                const calc = calculate({
                    C: profile.C,
                    S: profile.S,
                    RA: profile.RA,
                    RA_unit: profile.RA_unit as 'L' | 'cc',
                    mix_type: profile.mix_type,
                    A0: profile.A0,
                    A_house,
                    N,
                });

                const daysAgo = randomInt(0, 30);
                const createdAt = new Date();
                createdAt.setDate(createdAt.getDate() - daysAgo);
                createdAt.setHours(randomInt(6, 18), randomInt(0, 59));

                const jitterLat = loc.lat + randomFloat(-0.002, 0.002);
                const jitterLng = loc.lng + randomFloat(-0.002, 0.002);

                const agencyNames = [
                    'เจ้าหน้าที่สาธารณสุขอำเภอ',
                    'อาสาสมัครสาธารณสุข (อสม.)',
                    'ทีมควบคุมโรค ตำบล',
                    'ผู้ใช้งานภาคสนาม',
                ];
                const isAdminSeed = i === 0;
                const agency = isAdminSeed ? 'Admin เจ้าหน้าที่ระบบ' : agencyNames[randomInt(0, agencyNames.length - 1)];

                records.push({
                    C: profile.C,
                    S: profile.S,
                    RA: profile.RA,
                    RA_unit: profile.RA_unit,
                    mix_type: profile.mix_type,
                    A0: profile.A0,
                    A_house,
                    N,
                    V_per_house: calc.V_per_house,
                    V_total: calc.V_total,
                    V_C: calc.V_C,
                    V_S: calc.V_S,
                    V_C_1L: calc.V_C_1L,
                    location: loc.name,
                    chemical: profile.name,
                    agency,
                    lat: jitterLat,
                    lng: jitterLng,
                    createdAt,
                });
            }
        }

        const { error: insertError } = await supabaseAdmin
            .from('calculations')
            .insert(records);

        if (insertError) throw insertError;
        result.push(`Inserted ${records.length} sample calculations`);

        return NextResponse.json({ success: true, message: result.join(' | '), count: records.length });
    } catch (error: any) {
        console.error('Seed error:', error);
        return NextResponse.json(
            { success: false, message: error.message },
            { status: 500 }
        );
    }
}
