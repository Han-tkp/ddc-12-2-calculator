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
            return NextResponse.json({ error: 'ไม่มีสิทธิ์เข้าถึง: เฉพาะผู้ดูแลระบบเท่านั้น' }, { status: 403 });
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
            return NextResponse.json({ error: 'ไม่พบสูตรที่ต้องการแก้ไข' }, { status: 404 });
        }

        const validated = profileSchema.parse(body);

        // Check if new name conflicts with other formulas
        if (validated.name !== currentProfile.name) {
            const { data: existing } = await supabase
                .from('label_profiles')
                .select('id')
                .eq('name', validated.name)
                .neq('id', id)
                .eq('isActive', true)
                .single();

            if (existing) {
                return NextResponse.json({ error: 'ชื่อสูตรนี้มีใช้งานอยู่ในระบบแล้ว' }, { status: 400 });
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

        if (error) {
            console.error('Supabase Update Error:', error);
            return NextResponse.json({ error: `ไม่สามารถบันทึกการแก้ไขได้: ${error.message}` }, { status: 500 });
        }

        return NextResponse.json(updatedProfile);
    } catch (error: any) {
        console.error('Update profile error:', error);
        return NextResponse.json({ error: error?.message || 'เกิดข้อผิดพลาดในการแก้ไขข้อมูล' }, { status: 500 });
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
            return NextResponse.json({ error: 'ไม่มีสิทธิ์เข้าถึง: เฉพาะผู้ดูแลระบบเท่านั้น' }, { status: 403 });
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
            return NextResponse.json({ error: 'ไม่พบสูตรที่ต้องการลบ' }, { status: 404 });
        }

        // Soft delete
        const { error } = await supabase
            .from('label_profiles')
            .update({
                isActive: false,
                updatedAt: new Date().toISOString()
            })
            .eq('id', id);

        if (error) {
            console.error('Supabase Delete Error:', error);
            return NextResponse.json({ error: `ไม่สามารถลบสูตรได้: ${error.message}` }, { status: 500 });
        }

        return NextResponse.json({ success: true, message: 'ลบสูตรเรียบร้อยแล้ว' });
    } catch (error: any) {
        console.error('Delete profile error:', error);
        return NextResponse.json({ error: error?.message || 'เกิดข้อผิดพลาดในการลบข้อมูล' }, { status: 500 });
    }
}
