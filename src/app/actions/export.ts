'use server';

import { supabase } from '@/lib/supabase';
import { decrypt } from '@/lib/encryption';
import { startOfDay, endOfDay, parseISO } from 'date-fns';

export async function getExportData(fromDateStr?: string, toDateStr?: string) {
    let query = supabase
        .from('calculations')
        .select('*, user:users(name, email)')
        .order('createdAt', { ascending: false });

    if (fromDateStr) {
        query = query.gte('createdAt', startOfDay(parseISO(fromDateStr)).toISOString());
    }
    if (toDateStr) {
        query = query.lte('createdAt', endOfDay(parseISO(toDateStr)).toISOString());
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
