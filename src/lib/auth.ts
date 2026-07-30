import NextAuth from 'next-auth';
import Credentials from 'next-auth/providers/credentials';
import bcrypt from 'bcryptjs';
import { supabaseAdmin } from './supabase';
import { loginSchema } from './validations';
import { decrypt } from './encryption';

export const { handlers, signIn, signOut, auth } = NextAuth({
    providers: [
        Credentials({
            name: 'credentials',
            credentials: {
                email: { label: 'อีเมล', type: 'email' },
                password: { label: 'รหัสผ่าน', type: 'password' },
            },
            async authorize(credentials) {
                try {
                    console.log('🔐 Login attempt:', credentials?.email);

                    const validated = loginSchema.parse(credentials);
                    console.log('✅ Validation passed');

                    // Query users table with admin client (bypasses RLS for authentication)
                    const { data: user, error } = await supabaseAdmin
                        .from('users')
                        .select('*')
                        .eq('email', validated.email)
                        .single();

                    if (error || !user) {
                        console.log('👤 User not found or error:', error?.message);
                        return null;
                    }
                    console.log('👤 User found:', user ? 'Yes' : 'No');

                    // Strict Security (CIA Triad): Only ADMIN role is allowed to log in
                    if (user.role !== 'ADMIN') {
                        console.log('⛔ Access Denied: Non-ADMIN role is not permitted to log in');
                        return null;
                    }

                    if (!user.password) {
                        console.log('❌ No password set for user');
                        return null;
                    }

                    const isPasswordValid = await bcrypt.compare(
                        validated.password,
                        user.password
                    );
                    console.log('🔑 Password valid:', isPasswordValid);

                    if (!isPasswordValid) {
                        console.log('❌ Invalid password');
                        return null;
                    }

                    console.log('✅ Admin login successful for:', user.email);
                    return {
                        id: user.id,
                        email: user.email,
                        name: user.name ? decrypt(user.name) : null, // Decrypt name
                        role: user.role,
                    };
                } catch (error) {
                    console.error('❌ Auth error:', error);
                    return null;
                }
            },
        }),
    ],
    callbacks: {
        async jwt({ token, user }) {
            if (user) {
                token.id = user.id;
                token.role = user.role;
            }
            return token;
        },
        async session({ session, token }) {
            if (token) {
                session.user.id = token.id as string;
                session.user.role = token.role as string;
            }
            return session;
        },
    },
    pages: {
        signIn: '/login',
    },
    session: {
        strategy: 'jwt',
    },
    trustHost: true,
    secret: process.env.AUTH_SECRET || 'dev-auth-secret', // Explicitly set secret
});
