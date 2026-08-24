'use server';

import { supabaseAdmin } from '@/lib/supabase';
import { decrypt } from '@/lib/encryption';
import { thaiStartOfDay, thaiEndOfDay } from '@/lib/thai-time';
import { fetchAllRows } from '@/lib/fetch-all-rows';

export async function getExportData(fromDateStr?: string, toDateStr?: string) {
    // ดึงทีละหน้าจนหมด — เดิมยิงครั้งเดียวแล้ว PostgREST ตัดที่ 1,000 แถวเงียบ ๆ
    // ไฟล์ที่ได้จึงขาดข้อมูลโดยไม่มีอะไรบอก
    const buildQuery = () => {
        let query = supabaseAdmin
            .from('calculations')
            .select('*, user:users(name, email)')
            .order('createdAt', { ascending: false });

        if (fromDateStr) {
            query = query.gte('createdAt', thaiStartOfDay(fromDateStr).toISOString());
        }
        if (toDateStr) {
            query = query.lte('createdAt', thaiEndOfDay(toDateStr).toISOString());
        }
        return query;
    };

    const { rows: data } = await fetchAllRows<any>(buildQuery);

    // Decrypt names
    const processedData = (data || []).map((calc: any) => ({
        ...calc,
        userName: calc.user ? (decrypt(calc.user.name || '') || calc.user.name || 'ไม่ทราบชื่อ') : 'ไม่ทราบชื่อ'
    }));

    return processedData;
}
