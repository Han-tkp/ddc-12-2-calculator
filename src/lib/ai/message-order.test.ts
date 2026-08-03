import { describe, it, expect, vi } from 'vitest';
vi.mock('@/lib/auth', () => ({ auth: vi.fn(async () => null) }));

import { OpenRouterProvider } from './openai';
import { GeminiProvider } from './gemini';
import type { AIRequest } from './types';

/**
 * Guards the agent tool-calling loop.
 *
 * The original bug: the current prompt was appended AFTER the replayed history, so every
 * iteration ended with the user's question sitting below the tool result. Models read
 * that as a brand-new request, called the tool again, and the loop ran to maxIterations
 * and threw "tool-calling เกิน N รอบ" — no answer ever reached the officer. The prompt
 * must come first; history is what happened while answering it.
 */
const agentTurn: AIRequest = {
    prompt: 'คำนวณซับมาริน 20 หลัง',
    history: [
        { role: 'assistant', toolCalls: [{ id: 'call_1', name: 'calculate_formula', args: { C: 1, S: 25 } }] },
        { role: 'tool', toolResults: [{ toolCallId: 'call_1', name: 'calculate_formula', content: '{"V_total":260}' }] },
    ],
};

describe('OpenAI-compatible message order', () => {
    const build = (input: AIRequest) =>
        (new OpenRouterProvider() as unknown as { buildMessages(i: AIRequest): Array<{ role: string }> })
            .buildMessages(input);

    it('puts the prompt first and the tool exchange after it', () => {
        const roles = build(agentTurn).map(m => m.role);
        expect(roles).toEqual(['user', 'assistant', 'tool']);
    });

    it('never repeats the question after a tool result', () => {
        const messages = build(agentTurn);
        const lastUserIndex = messages.map(m => m.role).lastIndexOf('user');
        const toolIndex = messages.map(m => m.role).indexOf('tool');
        expect(lastUserIndex).toBeLessThan(toolIndex);
        expect(messages.filter(m => m.role === 'user')).toHaveLength(1);
    });

    it('still emits a single user message when there is no history', () => {
        expect(build({ prompt: 'สวัสดี' }).map(m => m.role)).toEqual(['user']);
    });
});

describe('Gemini contents order', () => {
    const build = (input: AIRequest) =>
        (new GeminiProvider() as unknown as { buildContents(i: AIRequest): Array<{ role: string }> })
            .buildContents(input);

    it('puts the prompt first, then functionCall/functionResponse', () => {
        const contents = build(agentTurn);
        expect(contents.map(c => c.role)).toEqual(['user', 'model', 'user']);
        // The trailing 'user' is the functionResponse, not a repeat of the question.
        const last = contents[2] as unknown as { parts: Array<Record<string, unknown>> };
        expect(last.parts[0]).toHaveProperty('functionResponse');
    });

    it('still emits a single content entry when there is no history', () => {
        expect(build({ prompt: 'สวัสดี' })).toHaveLength(1);
    });
});
