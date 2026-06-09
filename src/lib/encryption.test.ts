import { describe, it, expect } from 'vitest';
import { encrypt, decrypt } from './encryption';

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
