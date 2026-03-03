import { createClient } from '@supabase/supabase-js';
import bcrypt from 'bcryptjs';

const url = 'https://qggguodrxmacqpqujkqq.supabase.co';
// Read from env but define explicitly just in case for quick execution
const key = process.env.SUPABASE_SERVICE_ROLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFnZ2d1b2RyeG1hY3FwcXVqa3FxIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NjkzOTYzMCwiZXhwIjoyMDgyNTE1NjMwfQ.IgaRVpmzKEm1tlF91urqs35rQH3E63flCXNuTst4Z-Y';

const supabase = createClient(url, key);

async function createAdmin() {
    console.log('Creating admin user...');
    const passwordHash = await bcrypt.hash('admin123', 10);

    const { data, error } = await supabase
        .from('users')
        .upsert([
            {
                email: 'admin@ddc.gov',
                password: passwordHash,
                name: 'Admin Tester',
                role: 'ADMIN'
            }
        ], { onConflict: 'email' });

    if (error) {
        console.error('Error:', error);
    } else {
        console.log('Success! Admin created with email: admin@ddc.gov | pass: admin123');
    }
}

createAdmin();
