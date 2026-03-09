import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { supabase } from '@/lib/supabase';
import { profileSchema } from '@/lib/validations';

// GET all profiles
export async function GET() {
    try {
        const { data: profiles, error } = await supabase
            .from('label_profiles')
            .select('*')
            .eq('isActive', true)
            .order('name', { ascending: true });

        if (error) throw error;

        return NextResponse.json(profiles);
    } catch (error) {
        return NextResponse.json(
            { error: 'ไม่สามารถดึงข้อมูลได้' },
            { status: 500 }
        );
    }
}

// POST create new profile
export async function POST(request: NextRequest) {
    try {
        const session = await auth();

        if (!session?.user || session.user.role !== 'ADMIN') {
            return NextResponse.json(
                { error: 'ไม่มีสิทธิ์เข้าถึง: เฉพาะผู้ดูแลระบบเท่านั้น' },
                { status: 403 }
            );
        }

        const body = await request.json();
        const validated = profileSchema.parse(body);

        // Check if name already exists
        const { data: existing } = await supabase
            .from('label_profiles')
            .select('id')
            .eq('name', validated.name)
            .eq('isActive', true) // Only check active ones
            .single();

        if (existing) {
            return NextResponse.json(
                { error: 'มีชื่อสูตรนี้อยู่ในระบบแล้ว' },
                { status: 400 }
            );
        }

        const { data: profile, error } = await supabase
            .from('label_profiles')
            .insert({
                ...validated,
                createdById: session.user.id,
                // Note: id and timestamps will be handled by DB defaults after running fix_id_constraint.sql
            })
            .select()
            .single();

        if (error) {
            console.error('Supabase Insert Error:', error);
            return NextResponse.json(
                { error: `ข้อผิดพลาดจากฐานข้อมูล: ${error.message}` },
                { status: 500 }
            );
        }

        return NextResponse.json(profile, { status: 201 });
    } catch (error: any) {
        console.error('Create profile error:', error);
        return NextResponse.json(
            { error: error?.message || 'ไม่สามารถสร้างสูตรได้ กรุณาลองใหม่อีกครั้ง' },
            { status: 500 }
        );
    }
}
