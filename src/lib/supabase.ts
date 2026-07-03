import { createClient } from '@supabase/supabase-js';

const rawUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const isValidUrl = rawUrl.startsWith('http://') || rawUrl.startsWith('https://');
const supabaseUrl = isValidUrl ? rawUrl : '';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

if (!supabaseUrl || !supabaseKey || supabaseKey === 'change-me') {
    console.warn('⚠️ Warning: Missing or invalid Supabase environment variables. Database features will not work.');
}

const finalUrl = supabaseUrl || 'https://placeholder.supabase.co';
const finalKey = (!supabaseKey || supabaseKey === 'change-me') ? 'placeholder' : supabaseKey;

export const supabase = createClient(finalUrl, finalKey);
