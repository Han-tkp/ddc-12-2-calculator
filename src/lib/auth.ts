import NextAuth from 'next-auth';
import Credentials from 'next-auth/providers/credentials';
import bcrypt from 'bcryptjs';
import { db } from './db';
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

                    const user = await db.user.findUnique({
                        where: { email: validated.email },
                    });
                    console.log('👤 User found:', user ? 'Yes' : 'No');

                    if (!user || !user.password) {
                        console.log('❌ No user or no password');
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

                    console.log('✅ Login successful for:', user.email);
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
    secret: process.env.AUTH_SECRET, // Explicitly set secret
});
