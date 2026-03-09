import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { supabase } from '@/lib/supabase';
import { registerSchema } from '@/lib/validations';
import { encrypt } from '@/lib/encryption';

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();

        // Validate input
        const validated = registerSchema.parse(body);

        // Check if email already exists
        const { data: existingUser } = await supabase
            .from('users')
            .select('email')
            .eq('email', validated.email)
            .single();

        if (existingUser) {
            return NextResponse.json(
                { error: 'อีเมลนี้ถูกใช้งานแล้ว' },
                { status: 400 }
            );
        }

        // Hash password
        const hashedPassword = await bcrypt.hash(validated.password, 10);

        // Create user
        const { data: user, error: createError } = await supabase
            .from('users')
            .insert({
                // Note: id and timestamps will be handled by DB defaults after running fix_id_constraint.sql
                name: encrypt(validated.name), // Encrypt name
                email: validated.email,
                password: hashedPassword,
                role: 'USER',
            })
            .select()
            .single();

        if (createError || !user) {
            console.error('Supabase Create User Error:', createError);
            return NextResponse.json(
                { error: `ไม่สามารถลงทะเบียนได้: ${createError?.message || 'เกิดข้อผิดพลาดภายใน'}` },
                { status: 500 }
            );
        }

        return NextResponse.json({
            success: true,
            user: {
                id: user.id,
                name: user.name,
                email: user.email,
            },
        });
    } catch (error: any) {
        console.error('Registration error:', error);
        return NextResponse.json(
            { error: error?.message || 'เกิดข้อผิดพลาดในการลงทะเบียน กรุณาลองใหม่อีกครั้ง' },
            { status: 500 }
        );
    }
}
