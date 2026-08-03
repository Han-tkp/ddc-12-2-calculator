import { GeminiProvider } from './gemini';
import { AnthropicProvider } from './anthropic';
import { OpenAIProvider, OpenRouterProvider } from './openai';
import { AIProviderRouter } from './router';
import { guardQuota } from './usage';
import type { AIProvider, AIProviderName } from './types';

export { AIProviderRouter, DEFAULT_ORDER } from './router';
export type { RouterOptions, AIProviderOrder } from './router';
export { AIProviderError, isRetryableError } from './errors';
export type { AIErrorKind } from './errors';
export { GeminiProvider } from './gemini';
export { AnthropicProvider } from './anthropic';
export { OpenAIProvider, OpenRouterProvider } from './openai';
export { recordAICall, getRecentAICalls, clearAICalls, guardQuota, resetQuota, getQuotaState, DEFAULT_QUOTA } from './usage';
export type { AICallLog, AICallKind, QuotaLimits } from './usage';
export { normalizeAISettings, DEFAULT_AI_SETTINGS, AI_SETTINGS_KEY } from './settings';
export type { AIClientSettings, AIProviderSetting } from './settings';
export { validateFormulaDraft, formatValidationIssues, FORMULA_LIMITS } from '../formula-validator';
export type { FormulaDraft, FormulaIssue, FormulaValidationResult } from '../formula-validator';
export type {
    AIProvider,
    AIProviderName,
    AIRequest,
    AIResponse,
    AIUsage,
    AIImageInput,
    AITool,
    AIToolParam,
    AIToolCall,
    AIToolResult,
    AIMessage,
    ModelInfo,
} from './types';

/** สร้าง provider ทั้งหมดจาก environment variable ที่มี */
export function createProviders(): Record<AIProviderName, AIProvider> {
    return {
        gemini: new GeminiProvider(),
        anthropic: new AnthropicProvider(),
        openai: new OpenAIProvider(),
        openrouter: new OpenRouterProvider(),
    };
}

export function createRouter(order?: AIProviderName[]): AIProviderRouter {
    const providers = createProviders();
    const map = new Map<AIProviderName, AIProvider>(Object.entries(providers) as [AIProviderName, AIProvider][]);
    // Wire the quota guard so AI_MAX_REQUESTS_PER_MINUTE / _PER_HOUR actually apply.
    return new AIProviderRouter(map, order, { guard: (provider) => guardQuota(provider) });
}

/** ค่าเริ่มต้นสำหรับรัน agent ทั่วระบบ */
export const defaultRouter = createRouter();
