import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db';

// DELETE profile (soft delete)
export async function DELETE(
    request: NextRequest,
    { params }: { params: { id: string } }
) {
    try {
        const session = await auth();

        if (!session?.user || session.user.role !== 'ADMIN') {
            return NextResponse.json(
                { error: 'ไม่มีสิทธิ์เข้าถึง' },
                { status: 403 }
            );
        }

        const { id } = params;

        // Check if profile exists and is not default
        const profile = await db.labelProfile.findUnique({
            where: { id },
        });

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
        await db.labelProfile.update({
            where: { id },
            data: { isActive: false },
        });

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('Delete profile error:', error);
        return NextResponse.json(
            { error: 'ไม่สามารถลบได้' },
            { status: 500 }
        );
    }
}
