const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = "https://qggguodrxmacqpqujkqq.supabase.co";
const supabaseKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFnZ2d1b2RyeG1hY3FwcXVqa3FxIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NjkzOTYzMCwiZXhwIjoyMDgyNTE1NjMwfQ.IgaRVpmzKEm1tlF91urqs35rQH3E63flCXNuTst4Z-Y";

const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
    try {
        // 1. Delete all existing defaults
        const { error: delError } = await supabase
            .from('label_profiles')
            .delete()
            .eq('isDefault', true);

        if (delError) throw delError;
        console.log("Deleted old defaults.");

        // 2. Insert new corrected ones as isDefault = false so they can be edited
        const newDefaults = [
            {
                name: 'Deltacide หมอกควัน (1:79)',
                description: 'เดลตาไซด์ 1 ลิตร ผสมน้ำมัน 79 ลิตร',
                C: 1,
                S: 79,
                RA: 1,
                RA_unit: 'L',
                mix_type: 2,
                A0: 1000,
                isActive: true,
                isDefault: false
            },
            {
                name: 'Deltacide ULV (1:4)',
                description: 'เดลตาไซด์ 1 ลิตร ผสมน้ำมัน 4 ลิตร',
                C: 1,
                S: 4,
                RA: 75,
                RA_unit: 'cc',
                mix_type: 2,
                A0: 1000,
                isActive: true,
                isDefault: false
            },
            {
                name: 'Submarine หมอกควัน (1:249)',
                description: 'ซับมาริน 1 ลิตร ผสมน้ำมันดีเซลให้ได้ 250 ลิตร (อัตรา 1:249)',
                C: 1,
                S: 249,
                RA: 1.25,
                RA_unit: 'L',
                mix_type: 1,
                A0: 1000,
                isActive: true,
                isDefault: false
            },
            {
                name: 'Submarine ULV (1:39)',
                description: 'ซับมาริน 1 ลิตร ผสมน้ำให้ได้ 40 ลิตร (อัตรา 1:39)',
                C: 1,
                S: 39,
                RA: 2,
                RA_unit: 'L',
                mix_type: 1,
                A0: 10000,
                isActive: true,
                isDefault: false
            }
        ];

        const { data: inserted, error: insError } = await supabase
            .from('label_profiles')
            .insert(newDefaults)
            .select();

        if (insError) throw insError;
        console.log("Successfully inserted corrected defaults:", inserted.length);

    } catch (err) {
        console.error("Error:", err);
    }
}

run();
