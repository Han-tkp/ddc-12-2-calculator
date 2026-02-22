import { supabase } from './src/lib/supabase';

async function testConnection() {
    try {
        const { data, error } = await supabase.from('users').select('count', { count: 'exact', head: true });
        if (error) {
            console.error('❌ Connection failed:', error.message);
        } else {
            console.log('✅ Connection successful!');
        }
    } catch (err) {
        console.error('❌ Connection error:', err);
    }
}

testConnection();
