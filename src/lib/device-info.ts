/**
 * Minimal User-Agent parsing for operational accountability: which device recorded a
 * calculation or edited a formula, paired with the GPS coordinates already captured.
 *
 * Parsed SERVER-SIDE from the request header only — never accepted from a request body.
 * A client-supplied device string would be trivially forgeable, which would make the
 * whole audit trail worthless for the thing it exists to answer.
 *
 * Known limit: Android User-Agents carry the real hardware model (e.g. "SM-G991B"),
 * but Apple reports every handset as plain "iPhone" and every tablet as "iPad". On iOS
 * `deviceModel` is therefore null and only the OS version is available — this is a
 * platform restriction, not a gap in this parser.
 */

export interface DeviceInfo {
    os: string | null;
    browser: string | null;
    deviceModel: string | null;
    /** Pre-composed one-line label for table cells, e.g. "Android 14 · SM-G991B · Chrome". */
    deviceLabel: string | null;
}

const EMPTY: DeviceInfo = { os: null, browser: null, deviceModel: null, deviceLabel: null };

function parseOs(ua: string): string | null {
    let m = ua.match(/Android\s+([\d.]+)/);
    if (m) return `Android ${m[1]}`;
    if (/Android/.test(ua)) return 'Android';

    m = ua.match(/(?:iPhone|CPU) OS ([\d_]+)/);
    if (m) return `iOS ${m[1].replace(/_/g, '.')}`;
    if (/iPhone|iPad|iPod/.test(ua)) return 'iOS';

    m = ua.match(/Windows NT ([\d.]+)/);
    if (m) return m[1] === '10.0' ? 'Windows 10/11' : `Windows NT ${m[1]}`;

    m = ua.match(/Mac OS X ([\d_]+)/);
    if (m) return `macOS ${m[1].replace(/_/g, '.')}`;

    if (/Linux/.test(ua)) return 'Linux';
    return null;
}

function parseBrowser(ua: string): string | null {
    // Order matters: Edge and Opera both advertise Chrome, and Chrome advertises Safari.
    let m = ua.match(/Edg\/([\d.]+)/);
    if (m) return `Edge ${m[1].split('.')[0]}`;
    m = ua.match(/OPR\/([\d.]+)/);
    if (m) return `Opera ${m[1].split('.')[0]}`;
    m = ua.match(/Firefox\/([\d.]+)/);
    if (m) return `Firefox ${m[1].split('.')[0]}`;
    m = ua.match(/Chrome\/([\d.]+)/);
    if (m) return `Chrome ${m[1].split('.')[0]}`;
    m = ua.match(/Version\/([\d.]+).*Safari/);
    if (m) return `Safari ${m[1].split('.')[0]}`;
    if (/Safari/.test(ua)) return 'Safari';
    return null;
}

function parseDeviceModel(ua: string): string | null {
    // Android: "Android 14; SM-G991B Build/..." — the segment after the version is the model.
    const m = ua.match(/Android\s+[\d.]+;\s*([^;)]+?)(?:\s+Build\/|[;)])/);
    if (m) {
        const model = m[1].trim();
        // "wv" marks a WebView, and "K" is the redacted placeholder modern Chrome sends.
        if (model && model !== 'wv' && model !== 'K') return model;
    }
    if (/iPad/.test(ua)) return 'iPad';
    if (/iPhone/.test(ua)) return 'iPhone';
    return null;
}

/** Parses a raw User-Agent string. Returns all-null for missing or unrecognised input. */
export function parseUserAgent(userAgent: string | null | undefined): DeviceInfo {
    if (!userAgent || !userAgent.trim()) return EMPTY;

    const ua = userAgent.slice(0, 512); // bound the work; real UAs are far shorter
    const os = parseOs(ua);
    const browser = parseBrowser(ua);
    const deviceModel = parseDeviceModel(ua);

    const parts = [os, deviceModel, browser].filter(Boolean);
    return { os, browser, deviceModel, deviceLabel: parts.length ? parts.join(' · ') : null };
}

/** Convenience wrapper for route handlers. */
export function deviceInfoFromRequest(request: { headers: { get(name: string): string | null } }): DeviceInfo {
    return parseUserAgent(request.headers.get('user-agent'));
}
