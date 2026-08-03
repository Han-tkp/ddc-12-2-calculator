import { AIProviderError } from './errors';
import type { AITool, AIImageInput, AIProviderName } from './types';

export const DEFAULT_TIMEOUT_MS = 30000;

export async function fetchWithTimeout(
    url: string,
    options: RequestInit,
    provider: AIProviderName,
    timeoutMs = DEFAULT_TIMEOUT_MS
): Promise<Response> {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    try {
        const res = await fetch(url, {
            ...options,
            signal: controller.signal,
        });
        return res;
    } catch (err: unknown) {
        if (err instanceof DOMException && err.name === 'AbortError') {
            throw new AIProviderError(provider, 'timeout', 'provider request timed out');
        }
        throw new AIProviderError(provider, 'network', `network error: ${err instanceof Error ? err.message : 'unknown'}`);
    } finally {
        clearTimeout(timer);
    }
}

/**
 * แปลง AITool schema ไปเป็น JSON Schema แบบ Object (ใช้กับ Gemini functionDeclarations
 * และ input_schema ของ Anthropic) — providers หลายตัวต้องการ properties ซ้อนใน
 * parameters ที่เป็น object และระบุ required
 */
export function toJsonSchemaObject(tool: AITool): Record<string, unknown> {
    const properties: Record<string, unknown> = {};
    for (const [key, param] of Object.entries(tool.parameters || {})) {
        properties[key] = { type: param.type, description: param.description };
        if (param.enum && param.enum.length > 0) {
            (properties[key] as Record<string, unknown>).enum = param.enum;
        }
    }
    return {
        type: 'object',
        properties,
        ...(tool.required && tool.required.length > 0 ? { required: tool.required } : {}),
    };
}

export function toAnthropicTool(tool: AITool): Record<string, unknown> {
    return {
        name: tool.name,
        description: tool.description,
        input_schema: toJsonSchemaObject(tool),
    };
}

export function toOpenAITool(tool: AITool): Record<string, unknown> {
    return {
        type: 'function',
        function: {
            name: tool.name,
            description: tool.description,
            parameters: toJsonSchemaObject(tool),
        },
    };
}

export function toGeminiTool(tool: AITool): Record<string, unknown> {
    return {
        name: tool.name,
        description: tool.description,
        parameters: toJsonSchemaObject(tool),
    };
}

export function getImageParts(images?: AIImageInput[]): { type: 'image_url'; image_url: { url: string } }[] {
    return (images || []).map((img) => ({
        type: 'image_url',
        image_url: { url: `data:${img.mimeType};base64,${img.data}` },
    }));
}
