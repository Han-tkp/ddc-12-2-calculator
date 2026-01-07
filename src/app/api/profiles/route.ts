import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db';
import { profileSchema } from '@/lib/validations';

// GET all profiles
export async function GET() {
    try {
        const profiles = await db.labelProfile.findMany({
            where: { isActive: true },
            orderBy: { name: 'asc' },
        });
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
                { error: 'ไม่มีสิทธิ์เข้าถึง' },
                { status: 403 }
            );
        }

        const body = await request.json();
        const validated = profileSchema.parse(body);

        // Check if name already exists
        const existing = await db.labelProfile.findUnique({
            where: { name: validated.name },
        });

        if (existing) {
            return NextResponse.json(
                { error: 'ชื่อสูตรนี้มีอยู่แล้ว' },
                { status: 400 }
            );
        }

        const profile = await db.labelProfile.create({
            data: {
                ...validated,
                createdById: session.user.id,
            },
        });

        return NextResponse.json(profile, { status: 201 });
    } catch (error) {
        console.error('Create profile error:', error);
        return NextResponse.json(
            { error: 'ไม่สามารถสร้างสูตรได้' },
            { status: 500 }
        );
    }
}
