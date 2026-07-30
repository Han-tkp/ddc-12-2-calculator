import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { supabaseAdmin } from '@/lib/supabase';

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

        // Prevent deleting oneself
        if (id === session.user.id) {
            return NextResponse.json({ error: 'ไม่สามารถลบบัญชีของตัวเองได้' }, { status: 400 });
        }

        const { error } = await supabaseAdmin.from('users').delete().eq('id', id);

        if (error) {
            console.error('Supabase Delete User Error:', error);
            return NextResponse.json({ error: `ไม่สามารถลบผู้ใช้งานได้: ${error.message}` }, { status: 500 });
        }

        return NextResponse.json({ success: true, message: 'ลบผู้ใช้งานเรียบร้อยแล้ว' });
    } catch (error: any) {
        console.error('Delete user error:', error);
        return NextResponse.json({ error: error?.message || 'เกิดข้อผิดพลาดในการลบผู้ใช้งาน' }, { status: 500 });
    }
}

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

        // Update fields: right now only role is mainly what we want to update
        const updateData: any = {
            updatedAt: new Date().toISOString()
        };
        if (body.role) updateData.role = body.role;
        if (body.isActive !== undefined) updateData.isActive = body.isActive;

        const { error } = await supabaseAdmin
            .from('users')
            .update(updateData)
            .eq('id', id);

        if (error) {
            console.error('Supabase Update User Error:', error);
            return NextResponse.json({ error: `ไม่สามารถอัปเดตข้อมูลได้: ${error.message}` }, { status: 500 });
        }

        return NextResponse.json({ success: true, message: 'อัปเดตข้อมูลผู้ใช้งานเรียบร้อยแล้ว' });
    } catch (error: any) {
        console.error('Update user error:', error);
        return NextResponse.json({ error: error?.message || 'เกิดข้อผิดพลาดในการอัปเดตข้อมูล' }, { status: 500 });
    }
}
