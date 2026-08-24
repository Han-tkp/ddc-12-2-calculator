'use server';

import { supabaseAdmin } from '@/lib/supabase';
import { decrypt } from '@/lib/encryption';
import { fetchAllRows } from '@/lib/fetch-all-rows';
import { applyCalculationFilters, type CalculationFilters } from '@/lib/calculation-filters';

export async function getExportData(filters: CalculationFilters = {}) {
    // ดึงทีละหน้าจนหมด — เดิมยิงครั้งเดียวแล้ว PostgREST ตัดที่ 1,000 แถวเงียบ ๆ
    // ไฟล์ที่ได้จึงขาดข้อมูลโดยไม่มีอะไรบอก
    const buildQuery = () => applyCalculationFilters(
        supabaseAdmin
            .from('calculations')
            .select('*, user:users(name, email)')
            .order('createdAt', { ascending: false }),
        filters,
    );

    const { rows: data } = await fetchAllRows<any>(buildQuery);

    // Decrypt names
    const processedData = (data || []).map((calc: any) => ({
        ...calc,
        userName: calc.user ? (decrypt(calc.user.name || '') || calc.user.name || 'ไม่ทราบชื่อ') : 'ไม่ทราบชื่อ'
    }));

    return processedData;
}
