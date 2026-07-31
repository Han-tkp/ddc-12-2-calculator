import type { AIProviderName } from './types';

export type { AIProviderName };

/** การตั้งค่า AI ที่ Admin กำหนดผ่านหน้า /admin/ai — เก็บใน localStorage */
export interface AIProviderSetting {
    enabled: boolean;
    model?: string;
}

export interface AIClientSettings {
    order: AIProviderName[];
    providers: Partial<Record<AIProviderName, AIProviderSetting>>;
    temperature?: number;
    maxTokens?: number;
}

export const AI_SETTINGS_KEY = 'ai-provider-settings';

export const DEFAULT_AI_SETTINGS: AIClientSettings = {
    order: ['gemini', 'anthropic', 'openrouter', 'openai'],
    providers: {
        gemini: { enabled: true },
        anthropic: { enabled: true },
        openrouter: { enabled: true },
        openai: { enabled: true },
    },
};

export function normalizeAISettings(value: unknown): AIClientSettings | undefined {
    if (!value || typeof value !== 'object') return undefined;
    const raw = value as Partial<AIClientSettings>;
    const validNames: AIProviderName[] = ['gemini', 'anthropic', 'openrouter', 'openai'];
    const order = Array.isArray(raw.order)
        ? (raw.order as AIProviderName[]).filter(name => validNames.includes(name))
        : DEFAULT_AI_SETTINGS.order;
    const uniqueOrder = [...new Set(order)];
    const providers: Partial<Record<AIProviderName, AIProviderSetting>> = {};
    for (const name of validNames) {
        const p = (raw.providers as any)?.[name];
        providers[name] = {
            enabled: p?.enabled !== false,
            model: typeof p?.model === 'string' && p.model.trim() ? p.model.trim() : undefined,
        };
    }
    return {
        order: uniqueOrder.length > 0 ? uniqueOrder : DEFAULT_AI_SETTINGS.order,
        providers,
        temperature: typeof raw.temperature === 'number' ? raw.temperature : undefined,
        maxTokens: typeof raw.maxTokens === 'number' ? raw.maxTokens : undefined,
    };
}
