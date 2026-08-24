'use server';

import { supabaseAdmin } from '@/lib/supabase';
import { decrypt } from '@/lib/encryption';
import { thaiStartOfDay, thaiEndOfDay } from '@/lib/thai-time';

export async function getExportData(fromDateStr?: string, toDateStr?: string) {
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

    const { data, error } = await query;
    if (error) {
        throw new Error(`Error fetching export data: ${error.message}`);
    }

    // Decrypt names
    const processedData = (data || []).map((calc: any) => ({
        ...calc,
        userName: calc.user ? (decrypt(calc.user.name || '') || calc.user.name || 'ไม่ทราบชื่อ') : 'ไม่ทราบชื่อ'
    }));

    return processedData;
}
