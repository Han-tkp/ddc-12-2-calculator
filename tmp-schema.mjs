import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://qggguodrxmacqpqujkqq.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFnZ2d1b2RyeG1hY3FwcXVqa3FxIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NjkzOTYzMCwiZXhwIjoyMDgyNTE1NjMwfQ.IgaRVpmzKEm1tlF91urqs35rQH3E63flCXNuTst4Z-Y';

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkSchema() {
    console.log('--- USERS TABLE ---');
    let { data: usersData, error: usersErr } = await supabase.from('users').select('*').limit(1);
    console.log('Error:', usersErr?.message || 'None');
    if (usersData?.length) console.log('Columns:', Object.keys(usersData[0]));

    console.log('--- LABEL_PROFILES TABLE ---');
    let { data: profilesData, error: profilesErr } = await supabase.from('label_profiles').select('*').limit(1);
    console.log('Error:', profilesErr?.message || 'None');
    if (profilesData?.length) console.log('Columns:', Object.keys(profilesData[0]));

    console.log('--- CALCULATIONS TABLE ---');
    let { data: calcsData, error: calcsErr } = await supabase.from('calculations').select('*').limit(1);
    console.log('Error:', calcsErr?.message || 'None');
    if (calcsData?.length) console.log('Columns:', Object.keys(calcsData[0]));
}

checkSchema();
