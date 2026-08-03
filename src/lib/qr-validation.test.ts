import { describe, it, expect } from 'vitest';
import { qrCodeCreateSchema, qrCodeUpdateSchema } from './validations';

/**
 * `/q/<id>` 302s to whatever `targetUrl` holds, so this schema is the only thing
 * standing between a stored string and an arbitrary redirect. These cases guard the
 * boundary, not the happy path.
 */
describe('qrCodeCreateSchema targetUrl', () => {
    it('accepts http and https', () => {
        expect(qrCodeCreateSchema.safeParse({ label: 'ป้าย', targetUrl: 'https://ddc.moph.go.th/x' }).success).toBe(true);
        expect(qrCodeCreateSchema.safeParse({ label: 'ป้าย', targetUrl: 'http://localhost:3000/app' }).success).toBe(true);
    });

    it.each([
        ['javascript:', 'javascript:alert(document.cookie)'],
        ['data:', 'data:text/html;base64,PHNjcmlwdD5hbGVydCgxKTwvc2NyaXB0Pg=='],
        ['file:', 'file:///etc/passwd'],
        ['vbscript:', 'vbscript:msgbox(1)'],
        ['scheme-relative', '//evil.example.com'],
        ['bare path', '/admin/dashboard'],
        ['no scheme', 'evil.example.com'],
    ])('rejects %s URLs', (_name, targetUrl) => {
        const result = qrCodeCreateSchema.safeParse({ label: 'ป้าย', targetUrl });
        expect(result.success).toBe(false);
    });

    it('requires a label', () => {
        expect(qrCodeCreateSchema.safeParse({ label: '   ', targetUrl: 'https://example.com' }).success).toBe(false);
    });

    it('rejects absurdly long URLs', () => {
        const long = `https://example.com/${'a'.repeat(2100)}`;
        expect(qrCodeCreateSchema.safeParse({ label: 'ป้าย', targetUrl: long }).success).toBe(false);
    });
});

describe('qrCodeUpdateSchema', () => {
    it('allows updating one field at a time', () => {
        expect(qrCodeUpdateSchema.safeParse({ label: 'ชื่อใหม่' }).success).toBe(true);
        expect(qrCodeUpdateSchema.safeParse({ targetUrl: 'https://example.com' }).success).toBe(true);
    });

    it('rejects an empty patch', () => {
        expect(qrCodeUpdateSchema.safeParse({}).success).toBe(false);
    });

    it('applies the same scheme restriction on edit as on create', () => {
        // The dangerous path is repointing an existing, already-printed code.
        expect(qrCodeUpdateSchema.safeParse({ targetUrl: 'javascript:alert(1)' }).success).toBe(false);
    });
});
