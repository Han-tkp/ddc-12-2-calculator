import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { supabase } from '@/lib/supabase';
import { profileSchema } from '@/lib/validations';

// UPDATE profile
export async function PUT(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const session = await auth();

        if (!session?.user || session.user.role !== 'ADMIN') {
            return NextResponse.json({ error: 'ไม่มีสิทธิ์เข้าถึง' }, { status: 403 });
        }

        const resolvedParams = await params;
        const { id } = resolvedParams;
        const body = await request.json();

        // Check if profile exists
        const { data: currentProfile } = await supabase
            .from('label_profiles')
            .select('*')
            .eq('id', id)
            .single();

        if (!currentProfile) {
            return NextResponse.json({ error: 'ไม่พบสูตรนี้' }, { status: 404 });
        }

        const validated = profileSchema.parse(body);

        // Check if new name conflicts with other formulas
        if (validated.name !== currentProfile.name) {
            const { data: existing } = await supabase
                .from('label_profiles')
                .select('id')
                .eq('name', validated.name)
                .neq('id', id)
                .single();

            if (existing) {
                return NextResponse.json({ error: 'ชื่อสูตรนี้มีใช้งานอยู่แล้ว' }, { status: 400 });
            }
        }

        const { data: updatedProfile, error } = await supabase
            .from('label_profiles')
            .update({
                name: validated.name,
                description: validated.description,
                C: validated.C,
                S: validated.S,
                RA: validated.RA,
                RA_unit: validated.RA_unit,
                mix_type: validated.mix_type,
                A0: validated.A0,
                updatedAt: new Date().toISOString()
            })
            .eq('id', id)
            .select()
            .single();

        if (error) throw error;

        return NextResponse.json(updatedProfile);
    } catch (error) {
        console.error('Update profile error:', error);
        return NextResponse.json({ error: 'ไม่สามารถแก้ไขได้' }, { status: 500 });
    }
}

// DELETE profile (soft delete)
export async function DELETE(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const session = await auth();

        if (!session?.user || session.user.role !== 'ADMIN') {
            return NextResponse.json({ error: 'ไม่มีสิทธิ์เข้าถึง' }, { status: 403 });
        }

        const resolvedParams = await params;
        const { id } = resolvedParams;

        // Check if profile exists
        const { data: profile } = await supabase
            .from('label_profiles')
            .select('*')
            .eq('id', id)
            .single();

        if (!profile) {
            return NextResponse.json({ error: 'ไม่พบสูตรนี้' }, { status: 404 });
        }

        // Soft delete
        const { error } = await supabase
            .from('label_profiles')
            .update({ isActive: false })
            .eq('id', id);

        if (error) throw error;

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('Delete profile error:', error);
        return NextResponse.json({ error: 'ไม่สามารถลบได้' }, { status: 500 });
    }
}
