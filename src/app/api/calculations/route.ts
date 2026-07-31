import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { supabaseAdmin } from '@/lib/supabase';
import { calculationSchema } from '@/lib/validations';
import { calculate } from '@/lib/calculations';

export async function POST(req: NextRequest) {
    try {
        const session = await auth();
        // Allow anonymous (no session) or logged in users
        const userId = session?.user?.id || null;

        const json = await req.json();
        const body = calculationSchema.parse(json);

        // Calculate results on server to ensure integrity
        const result = calculate(body);

        const { data: calculation, error } = await supabaseAdmin
            .from('calculations')
            .insert({
                userId: userId,
                // Inputs
                C: body.C,
                S: body.S,
                RA: body.RA,
                RA_unit: body.RA_unit as 'L' | 'cc',
                A0: body.A0,
                A_house: body.A_house,
                N: body.N,
                // Optional Fields
                location: body.location,
                agency: body.agency,
                chemical: body.chemical,
                lat: body.lat ?? null,
                lng: body.lng ?? null,
                mix_type: body.mix_type ?? 1,
                // Results
                V_per_house: result.V_per_house,
                V_total: result.V_total,
                V_C: result.V_C,
                V_S: result.V_S,
                V_C_1L: result.V_C_1L,
                updatedAt: new Date().toISOString(),
            })
            .select()
            .single();

        if (error) throw error;

        return NextResponse.json(calculation);
    } catch (error: unknown) {
        // Zod validation → 400 (client fault)
        if (error && typeof error === 'object' && 'issues' in error) {
            const issues = (error as { issues: Array<{ message: string }> }).issues;
            return NextResponse.json(
                { error: 'ข้อมูลไม่ถูกต้อง: ' + issues.map((i) => i.message).join(', ') },
                { status: 400 }
            );
        }
        // Supabase / network / programmer errors → 500
        const message =
            (error as { message?: string })?.message ||
            (error instanceof Error ? error.message : 'Internal Server Error');
        return NextResponse.json({ error: message }, { status: 500 });
    }
}

export async function GET(req: NextRequest) {
    try {
        const session = await auth();
        if (!session?.user?.id) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { data: calculations, error } = await supabaseAdmin
            .from('calculations')
            .select('*')
            .eq('userId', session.user.id)
            .order('createdAt', { ascending: false });

        if (error) throw error;

        return NextResponse.json(calculations);
    } catch (error) {
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
