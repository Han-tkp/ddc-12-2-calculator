import { describe, it, expect } from 'vitest';
import { encrypt, decrypt, decryptName } from './encryption';

describe('Encryption Utilities', () => {
    it('should encrypt and decrypt text correctly', () => {
        const plainText = 'John Doe';
        const encrypted = encrypt(plainText);
        expect(encrypted).not.toBe(plainText);
        expect(encrypted).toContain(':');

        const decrypted = decrypt(encrypted);
        expect(decrypted).toBe(plainText);
    });

    it('should handle empty/falsy inputs gracefully', () => {
        expect(encrypt('')).toBe('');
        expect(decrypt('')).toBe('');
    });

    it('should return original text if it is not in the encrypted format', () => {
        const plainText = 'NotEncryptedText';
        expect(decrypt(plainText)).toBe(plainText);
    });
});

describe('decryptName — display-safe wrapper', () => {
    it('returns the plaintext name for a valid value', () => {
        expect(decryptName(encrypt('สมหญิง'))).toBe('สมหญิง');
    });

    it('never leaks ciphertext when the value cannot be decrypted', () => {
        // Exactly what surfaced in the admin calculation log's user column: a stored
        // value this key cannot open. Rendering it raw put a 128-char hex blob where a
        // person's name belongs.
        const foreign =
            '90742fcb6d5a7bdbeaadaf283dee14d9:31adaec7e9c9c7e87bbf6beb96b457b8cc7c19b2c5b7cc2163cbaec93c97ece30052bdb2b1335389fa5857f47cb8e490';
        const shown = decryptName(foreign);
        expect(shown).toBe('ไม่ระบุชื่อ');
        expect(shown).not.toContain('90742fcb');
    });

    it('does not throw on a key mismatch — bare decrypt() does', () => {
        const foreign = 'deadbeefdeadbeefdeadbeefdeadbeef:0011223344556677889900aabbccddee';
        expect(() => decrypt(foreign)).toThrow();
        expect(() => decryptName(foreign)).not.toThrow();
    });

    it('rejects a bare hex blob that has no iv:payload shape', () => {
        // decrypt() hands such input back unchanged; it is still not a name.
        expect(decryptName('a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4')).toBe('ไม่ระบุชื่อ');
    });

    it('falls back for empty, null and undefined', () => {
        expect(decryptName('')).toBe('ไม่ระบุชื่อ');
        expect(decryptName(null)).toBe('ไม่ระบุชื่อ');
        expect(decryptName(undefined)).toBe('ไม่ระบุชื่อ');
    });

    it('honours a custom fallback', () => {
        expect(decryptName(null, 'Guest')).toBe('Guest');
        expect(decryptName('', '?')).toBe('?');
    });
});
