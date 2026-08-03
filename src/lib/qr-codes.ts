import { supabaseAdmin } from '@/lib/supabase';

export interface QrCodeRecord {
    id: string;
    label: string;
    targetUrl: string;
    scanCount: number;
    createdAt: string;
    updatedAt: string;
    deletedAt: string | null;
    createdBy: string | null;
    updatedBy: string | null;
}

/** Unambiguous alphabet: no 0/O or 1/l/I, since these slugs get read off printed signage. */
const SLUG_ALPHABET = 'abcdefghijkmnpqrstuvwxyz23456789';
const SLUG_LENGTH = 7;

function randomSlug(): string {
    const bytes = crypto.getRandomValues(new Uint8Array(SLUG_LENGTH));
    return Array.from(bytes, (b) => SLUG_ALPHABET[b % SLUG_ALPHABET.length]).join('');
}

/**
 * Generates a slug that isn't already taken. Collisions are vanishingly unlikely at
 * 32^7, but a silent primary-key clash would hand one sign's traffic to another's
 * destination, so check rather than assume.
 */
export async function generateUniqueSlug(): Promise<string> {
    for (let attempt = 0; attempt < 5; attempt++) {
        const candidate = randomSlug();
        const { data } = await supabaseAdmin
            .from('qr_codes')
            .select('id')
            .eq('id', candidate)
            .maybeSingle();
        if (!data) return candidate;
    }
    throw new Error('ไม่สามารถสร้างรหัส QR ที่ไม่ซ้ำได้ กรุณาลองใหม่');
}

/** Resolves the public short-link URL a QR image should encode. */
export function buildShortLink(appUrl: string, id: string): string {
    return `${appUrl.replace(/\/$/, '')}/q/${id}`;
}

export async function listQrCodes(includeDeleted = false): Promise<QrCodeRecord[]> {
    let query = supabaseAdmin
        .from('qr_codes')
        .select('*')
        .order('createdAt', { ascending: false });

    if (!includeDeleted) {
        query = query.is('deletedAt', null);
    }

    const { data, error } = await query;
    if (error) throw new Error(`ไม่สามารถโหลดรายการ QR Code ได้: ${error.message}`);
    return (data || []) as QrCodeRecord[];
}

/**
 * Looks up a code for the public redirect. Returns the row even when soft-deleted so
 * the caller can tell "retired" apart from "never existed" — a field officer scanning
 * an old printed sign deserves an explanation, not a bare 404.
 */
export async function findQrCodeForRedirect(id: string): Promise<QrCodeRecord | null> {
    const { data, error } = await supabaseAdmin
        .from('qr_codes')
        .select('*')
        .eq('id', id)
        .maybeSingle();

    if (error) throw new Error(`ไม่สามารถค้นหา QR Code ได้: ${error.message}`);
    return (data as QrCodeRecord) ?? null;
}

/** Best-effort scan counter — a failed count must never block the redirect itself. */
export async function incrementScanCount(id: string): Promise<void> {
    const { error } = await supabaseAdmin.rpc('increment_qr_scan', { qr_id: id });
    if (error) console.error('ไม่สามารถนับจำนวนการสแกน QR ได้:', error.message);
}
