import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { supabase } from '@/lib/supabase';

// DELETE profile (soft delete)
export async function DELETE(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const session = await auth();

        if (!session?.user || session.user.role !== 'ADMIN') {
            return NextResponse.json(
                { error: 'ไม่มีสิทธิ์เข้าถึง' },
                { status: 403 }
            );
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
            return NextResponse.json(
                { error: 'ไม่พบสูตรนี้' },
                { status: 404 }
            );
        }

        if (profile.isDefault) {
            return NextResponse.json(
                { error: 'ไม่สามารถลบสูตรค่าเริ่มต้นได้' },
                { status: 400 }
            );
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
        return NextResponse.json(
            { error: 'ไม่สามารถลบได้' },
            { status: 500 }
        );
    }
}
