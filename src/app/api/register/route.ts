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
                id: crypto.randomUUID(),
                name: encrypt(validated.name), // Encrypt name
                email: validated.email,
                password: hashedPassword,
                role: 'USER',
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString(), // Manual timestamp
            })
            .select()
            .single();

        if (createError || !user) {
            throw createError || new Error('Failed to create user');
        }

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
            { error: error instanceof Error ? error.message : JSON.stringify(error) },
            { status: 500 }
        );
    }
}
