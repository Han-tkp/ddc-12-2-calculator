import { describe, it, expect } from 'vitest';
import { parseUserAgent } from './device-info';

describe('parseUserAgent', () => {
    it('returns all-null for missing input', () => {
        expect(parseUserAgent(null)).toEqual({ os: null, browser: null, deviceModel: null, deviceLabel: null });
        expect(parseUserAgent('   ')).toEqual({ os: null, browser: null, deviceModel: null, deviceLabel: null });
    });

    it('extracts the hardware model from an Android UA', () => {
        const info = parseUserAgent(
            'Mozilla/5.0 (Linux; Android 14; SM-G991B Build/UP1A.231005.007) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.6099.43 Mobile Safari/537.36'
        );
        expect(info.os).toBe('Android 14');
        expect(info.deviceModel).toBe('SM-G991B');
        expect(info.browser).toBe('Chrome 120');
        expect(info.deviceLabel).toBe('Android 14 · SM-G991B · Chrome 120');
    });

    it('ignores the redacted "K" model modern Chrome on Android sends', () => {
        const info = parseUserAgent(
            'Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36'
        );
        expect(info.os).toBe('Android 10');
        expect(info.deviceModel).toBeNull();
    });

    it('records iOS version but cannot recover the handset model (Apple does not expose it)', () => {
        const info = parseUserAgent(
            'Mozilla/5.0 (iPhone; CPU iPhone OS 17_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.1 Mobile/15E148 Safari/604.1'
        );
        expect(info.os).toBe('iOS 17.1');
        expect(info.browser).toBe('Safari 17');
        // Only the device family — every iPhone reports the same string.
        expect(info.deviceModel).toBe('iPhone');
    });

    it('does not mistake Edge or Opera for Chrome', () => {
        expect(
            parseUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36 Edg/120.0.2210.61').browser
        ).toBe('Edge 120');
        expect(
            parseUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Safari/537.36 OPR/105.0.0.0').browser
        ).toBe('Opera 105');
    });

    it('parses desktop platforms', () => {
        expect(parseUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) Firefox/121.0').os).toBe('Windows 10/11');
        expect(
            parseUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 Version/17.0 Safari/605.1.15').os
        ).toBe('macOS 10.15.7');
    });
});
