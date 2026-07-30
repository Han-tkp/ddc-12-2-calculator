import { createClient } from '@supabase/supabase-js';

const rawUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const isValidUrl = rawUrl.startsWith('http://') || rawUrl.startsWith('https://');
const supabaseUrl = isValidUrl ? rawUrl : '';
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || anonKey;

if (!supabaseUrl || (!anonKey && !serviceRoleKey)) {
    console.warn('⚠️ Warning: Missing or invalid Supabase environment variables. Database features will not work.');
}

const finalUrl = supabaseUrl || 'https://placeholder.supabase.co';

export const supabase = createClient(finalUrl, anonKey || 'placeholder');
export const supabaseAdmin = createClient(finalUrl, serviceRoleKey || anonKey || 'placeholder');
