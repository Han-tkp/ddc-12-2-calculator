import type { AIProviderName } from './types';

export type AIErrorKind =
    | 'not_configured'
    | 'auth'
    | 'quota'
    | 'rate_limit'
    | 'invalid_request'
    | 'timeout'
    | 'network'
    | 'provider_unavailable'
    | 'parse'
    | 'unknown';

/**
 * รายการ error ที่ควร fallback ไป provider สำรอง
 *
 * ตามหลักการ: fallback เฉพาะ 429 quota/rate limit, timeout,
 * provider unavailable และ network error ชั่วคราวเท่านั้น
 * ไม่ควร fallback เมื่อ key ผิด (auth), request ผิด หรือ error ที่ไม่ใช่เชิงชั่วคราว
 */
const RETRYABLE_KINDS: ReadonlySet<AIErrorKind> = new Set<AIErrorKind>([
    'quota',
    'rate_limit',
    'timeout',
    'network',
    'provider_unavailable',
]);

export class AIProviderError extends Error {
    readonly provider: AIProviderName;
    readonly kind: AIErrorKind;
    readonly status?: number;
    readonly retryable: boolean;

    constructor(provider: AIProviderName, kind: AIErrorKind, message: string, status?: number) {
        super(message);
        this.name = 'AIProviderError';
        this.provider = provider;
        this.kind = kind;
        this.status = status;
        this.retryable = RETRYABLE_KINDS.has(kind);
    }

    static fromHttpStatus(provider: AIProviderName, status: number, message: string): AIProviderError {
        let kind: AIErrorKind;
        if (status === 401 || status === 403) kind = 'auth';
        else if (status === 429) kind = 'rate_limit';
        // 402 = the account is out of credit (OpenRouter returns this once the balance
        // hits zero). Classifying it as 'quota' makes it retryable, so the router moves
        // on to the next provider instead of failing the whole request — running dry on
        // one paid provider is precisely what the fallback chain exists for.
        else if (status === 402) kind = 'quota';
        else if (status >= 500) kind = 'provider_unavailable';
        else if (status === 400 || status === 404 || status === 422) kind = 'invalid_request';
        else kind = 'unknown';
        return new AIProviderError(provider, kind, message, status);
    }
}

export function isRetryableError(err: unknown): boolean {
    return err instanceof AIProviderError && err.retryable;
}
