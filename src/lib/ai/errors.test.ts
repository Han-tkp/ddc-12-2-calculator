import { describe, it, expect } from 'vitest';
import { AIProviderError, isRetryableError } from './errors';

describe('AIProviderError.fromHttpStatus', () => {
    it.each([
        [401, 'auth', false],
        [403, 'auth', false],
        [429, 'rate_limit', true],
        [500, 'provider_unavailable', true],
        [503, 'provider_unavailable', true],
        [400, 'invalid_request', false],
        [404, 'invalid_request', false],
        [422, 'invalid_request', false],
    ])('maps %i → %s (retryable: %s)', (status, kind, retryable) => {
        const err = AIProviderError.fromHttpStatus('openrouter', status as number, 'boom');
        expect(err.kind).toBe(kind);
        expect(err.retryable).toBe(retryable);
    });

    it('treats 402 (out of credit) as a retryable quota error so the router falls through', () => {
        // OpenRouter returns 402 "Insufficient credits" once the balance reaches zero.
        // If this were non-retryable the whole chat would fail instead of trying Gemini.
        const err = AIProviderError.fromHttpStatus(
            'openrouter',
            402,
            'Insufficient credits. This account never purchased credits.'
        );
        expect(err.kind).toBe('quota');
        expect(err.retryable).toBe(true);
        expect(isRetryableError(err)).toBe(true);
    });

    it('does not make an unknown status retryable', () => {
        const err = AIProviderError.fromHttpStatus('openai', 418, 'teapot');
        expect(err.kind).toBe('unknown');
        expect(err.retryable).toBe(false);
    });
});
