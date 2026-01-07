import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { db } from '@/lib/db';
import { registerSchema } from '@/lib/validations';

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();

        // Validate input
        const validated = registerSchema.parse(body);

        // Check if email already exists
        const existingUser = await db.user.findUnique({
            where: { email: validated.email },
        });

        if (existingUser) {
            return NextResponse.json(
                { error: 'อีเมลนี้ถูกใช้งานแล้ว' },
                { status: 400 }
            );
        }

        // Hash password
        const hashedPassword = await bcrypt.hash(validated.password, 10);

        // Create user
        const user = await db.user.create({
            data: {
                name: validated.name,
                email: validated.email,
                password: hashedPassword,
                role: 'USER',
            },
        });

        return NextResponse.json({
            success: true,
            user: {
                id: user.id,
                name: user.name,
                email: user.email,
            },
        });
    } catch (error) {
        console.error('Registration error:', error);
        return NextResponse.json(
            { error: 'เกิดข้อผิดพลาดในการสมัครสมาชิก' },
            { status: 500 }
        );
    }
}
