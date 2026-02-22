import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

// POST /api/seed — Insert sample data for Songkhla & Hat Yai
// Delete this file after seeding!
export async function POST() {
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

    const CHEMICALS = [
        { name: 'Deltacide', C: 1, S: 4 },
        { name: 'Fendona', C: 2, S: 8 },
        { name: 'K-Othrine', C: 1, S: 9 },
        { name: 'Aqua Resigen', C: 1, S: 4 },
    ];

    function randomInt(min: number, max: number) {
        return Math.floor(Math.random() * (max - min + 1)) + min;
    }

    function randomFloat(min: number, max: number, decimals = 3) {
        return parseFloat((Math.random() * (max - min) + min).toFixed(decimals));
    }

    try {
        const records = [];

        for (const loc of LOCATIONS) {
            const count = randomInt(1, 4);
            for (let i = 0; i < count; i++) {
                const chem = CHEMICALS[randomInt(0, CHEMICALS.length - 1)];
                const N = randomInt(5, 80);
                const A_house = 100;
                const A0 = 1000;
                const RA = randomFloat(0.005, 0.02);
                const RA_unit = 'L';

                const V_per_house = (RA * 1000) * (A_house / A0);
                const V_total = V_per_house * N;
                const ratio = chem.C + chem.S;
                const V_C = (chem.C / ratio) * V_total;
                const V_S = (chem.S / ratio) * V_total;
                const V_C_1L = (chem.C / ratio) * 1000;

                const daysAgo = randomInt(0, 30);
                const createdAt = new Date();
                createdAt.setDate(createdAt.getDate() - daysAgo);
                createdAt.setHours(randomInt(6, 18), randomInt(0, 59));

                const jitterLat = loc.lat + randomFloat(-0.002, 0.002);
                const jitterLng = loc.lng + randomFloat(-0.002, 0.002);

                records.push({
                    C: chem.C,
                    S: chem.S,
                    RA,
                    RA_unit,
                    A0,
                    A_house,
                    N,
                    V_per_house: parseFloat(V_per_house.toFixed(3)),
                    V_total: parseFloat(V_total.toFixed(3)),
                    V_C: parseFloat(V_C.toFixed(3)),
                    V_S: parseFloat(V_S.toFixed(3)),
                    V_C_1L: parseFloat(V_C_1L.toFixed(3)),
                    location: loc.name,
                    chemical: chem.name,
                    lat: jitterLat,
                    lng: jitterLng,
                    createdAt,
                });
            }
        }

        // Insert all records (Batch insert)
        const { error } = await supabase.from('calculations').insert(records);

        if (error) {
            throw error;
        }

        return NextResponse.json({
            success: true,
            message: `Inserted ${records.length} sample calculations across ${LOCATIONS.length} locations`,
            count: records.length,
        });
    } catch (error: any) {
        console.error('Seed error:', error);
        return NextResponse.json(
            { success: false, message: error.message },
            { status: 500 }
        );
    }
}
