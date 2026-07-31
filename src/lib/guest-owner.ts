import { randomUUID } from 'crypto';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

const GUEST_OWNER_COOKIE = 'ddc_guest_owner';

export interface GuestOwner {
    token: string;
    isNew: boolean;
}

/**
 * Gives an anonymous visitor a stable, server-controlled owner token.
 * The token is only used to authorize edits to that visitor's own formulas.
 */
export async function getGuestOwner(): Promise<GuestOwner> {
    const cookieStore = await cookies();
    const token = cookieStore.get(GUEST_OWNER_COOKIE)?.value;

    if (token) {
        return { token, isNew: false };
    }

    return { token: randomUUID(), isNew: true };
}

export function setGuestOwnerCookie(response: NextResponse, guestOwner: GuestOwner): NextResponse {
    if (guestOwner.isNew) {
        response.cookies.set(GUEST_OWNER_COOKIE, guestOwner.token, {
            httpOnly: true,
            sameSite: 'lax',
            secure: process.env.NODE_ENV === 'production',
            maxAge: 60 * 60 * 24 * 365,
            path: '/',
        });
    }

    return response;
}
