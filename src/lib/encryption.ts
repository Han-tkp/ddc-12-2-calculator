import crypto from 'crypto';

// Use a fixed key for development if env is missing (DO NOT USE IN PRODUCTION)
// In production, this must be a 32-byte hex string in .env
const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY || '12345678901234567890123456789012'; // Must be 32 chars
const IV_LENGTH = 16; // For AES, this is always 16

export function encrypt(text: string): string {
    if (!text) return text;

    // Ensure key is 32 bytes
    const key = crypto.createHash('sha256').update(String(ENCRYPTION_KEY)).digest('base64').substring(0, 32);

    const iv = crypto.randomBytes(IV_LENGTH);
    const cipher = crypto.createCipheriv('aes-256-cbc', Buffer.from(key), iv);
    let encrypted = cipher.update(text);
    encrypted = Buffer.concat([encrypted, cipher.final()]);
    return iv.toString('hex') + ':' + encrypted.toString('hex');
}

/**
 * Decrypts a stored name for display, never throwing and never leaking ciphertext.
 *
 * Use this anywhere a `users.name` is rendered. Two failure modes it exists to contain:
 *
 *  - `decrypt()` THROWS on bad padding when ENCRYPTION_KEY doesn't match the key a row
 *    was written with, so calling it bare in a server component takes the whole page down.
 *  - Falling back to the raw value prints the ciphertext into the UI — which is what put
 *    "90742fcb…ece30052" in the admin calculation-log's user column. Ciphertext is not a
 *    name; showing it is a bug, and it scatters encrypted PII into screenshots and exports.
 *
 * On failure the caller gets `fallback` instead.
 */
export function decryptName(value: string | null | undefined, fallback = 'ไม่ระบุชื่อ'): string {
    if (!value) return fallback;
    try {
        const plain = decrypt(value);
        // A value with no "iv:payload" shape comes back unchanged; if that still looks
        // like hex ciphertext, it isn't a name worth showing.
        if (!plain || /^[0-9a-f]{32,}$/i.test(plain)) return fallback;
        return plain;
    } catch {
        return fallback;
    }
}

export function decrypt(text: string): string {
    if (!text) return text;

    const textParts = text.split(':');
    if (textParts.length < 2) return text; // Not encrypted or invalid format

    const key = crypto.createHash('sha256').update(String(ENCRYPTION_KEY)).digest('base64').substring(0, 32);

    const iv = Buffer.from(textParts.shift()!, 'hex');
    const encryptedText = Buffer.from(textParts.join(':'), 'hex');
    const decipher = crypto.createDecipheriv('aes-256-cbc', Buffer.from(key), iv);
    let decrypted = decipher.update(encryptedText);
    decrypted = Buffer.concat([decrypted, decipher.final()]);

    return decrypted.toString();
}
