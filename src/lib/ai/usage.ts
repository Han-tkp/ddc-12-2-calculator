import { AIProviderError } from './errors';
import type { AIErrorKind } from './errors';
import type { AIProviderName } from './types';

/* =========================================================================
 * AI Usage Log + Quota Guard (runtime)
 *
 * เก็บ log การเรียกใช้ provider/model/latency/error แบบ in-memory (วงรอบ)
 * เพื่อแสดงในหน้า Admin โดยไม่ต้องแตะฐานข้อมูล และ guard โควตา/rate limit
 * ต่อ provider ตามระยะเวลา
 * ========================================================================= */

export type AICallKind = 'text' | 'image' | 'agent';

export interface AICallLog {
    id: string;
    ts: number;
    provider: AIProviderName;
    model: string;
    kind: AICallKind;
    latencyMs: number;
    ok: boolean;
    inputTokens?: number;
    outputTokens?: number;
    error?: { kind: AIErrorKind; message: string };
}

const MAX_LOGS = 200;
const logs: AICallLog[] = [];

let seq = 0;

export function recordAICall(log: Omit<AICallLog, 'id' | 'ts'>): AICallLog {
    const entry: AICallLog = { id: `ai-${++seq}`, ts: Date.now(), ...log };
    logs.unshift(entry);
    if (logs.length > MAX_LOGS) logs.length = MAX_LOGS;
    return entry;
}

export function getRecentAICalls(limit = 100): AICallLog[] {
    return logs.slice(0, limit);
}

export function clearAICalls(): void {
    logs.length = 0;
}

/* ───────────── Quota Guard ───────────── */

export interface QuotaLimits {
    /** จำนวน request สูงสุดต่อ 1 นาที ต่อ provider */
    perMinute: number;
    /** จำนวน request สูงสุดต่อ 1 ชั่วโมง ต่อ provider */
    perHour: number;
}

function envNumber(name: string, fallback: number): number {
    const v = Number(process.env[name]);
    return Number.isFinite(v) && v > 0 ? v : fallback;
}

export const DEFAULT_QUOTA: QuotaLimits = {
    perMinute: envNumber('AI_MAX_REQUESTS_PER_MINUTE', 30),
    perHour: envNumber('AI_MAX_REQUESTS_PER_HOUR', 600),
};

interface ProviderHits {
    minute: number[];
    hour: number[];
}

const hits = new Map<AIProviderName, ProviderHits>();

/** ตรวจว่า provider ยังอยู่ในโควตาไหม — เกินแล้ว throw rate_limit */
export function guardQuota(provider: AIProviderName, limits: QuotaLimits = DEFAULT_QUOTA): void {
    const now = Date.now();
    const minuteMs = 60_000;
    const hourMs = 3_600_000;

    const bucket = hits.get(provider) ?? { minute: [], hour: [] };
    bucket.minute = bucket.minute.filter(t => now - t < minuteMs);
    bucket.hour = bucket.hour.filter(t => now - t < hourMs);

    if (bucket.minute.length >= limits.perMinute) {
        throw new AIProviderError(provider, 'rate_limit', `เกินโควตา ${limits.perMinute} ครั้ง/นาที ของ provider ${provider}`, 429);
    }
    if (bucket.hour.length >= limits.perHour) {
        throw new AIProviderError(provider, 'rate_limit', `เกินโควตา ${limits.perHour} ครั้ง/ชั่วโมง ของ provider ${provider}`, 429);
    }

    bucket.minute.push(now);
    bucket.hour.push(now);
    hits.set(provider, bucket);
}

export function resetQuota(): void {
    hits.clear();
}

export function getQuotaState(): Record<string, { perMinute: number; perHour: number }> {
    const now = Date.now();
    const state: Record<string, { perMinute: number; perHour: number }> = {};
    for (const [name, bucket] of hits) {
        state[name] = {
            perMinute: bucket.minute.filter(t => now - t < 60_000).length,
            perHour: bucket.hour.filter(t => now - t < 3_600_000).length,
        };
    }
    return state;
}
