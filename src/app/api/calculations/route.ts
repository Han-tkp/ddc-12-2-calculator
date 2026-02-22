import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { supabase } from '@/lib/supabase';
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

        const { data: calculation, error } = await supabase
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
                chemical: body.chemical,
                lat: body.lat ?? null,
                lng: body.lng ?? null,
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
    } catch (error) {
        if (error instanceof Error) {
            return NextResponse.json({ error: error.message }, { status: 400 });
        }
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}

export async function GET(req: NextRequest) {
    try {
        const session = await auth();
        if (!session?.user?.id) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { data: calculations, error } = await supabase
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
