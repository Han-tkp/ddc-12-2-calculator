export type AIProviderName = 'gemini' | 'anthropic' | 'openrouter' | 'openai';

export type AIToolParamType = 'string' | 'number' | 'integer' | 'boolean' | 'object' | 'array';

export interface AIToolParam {
    type: AIToolParamType;
    description?: string;
    enum?: string[];
}

export interface AITool {
    name: string;
    description: string;
    parameters?: Record<string, AIToolParam>;
    required?: string[];
}

export interface AIImageInput {
    mimeType: string;
    data: string;
}

export interface AIToolCall {
    id: string;
    name: string;
    args: Record<string, unknown>;
}

export interface AIToolResult {
    toolCallId: string;
    name: string;
    content: string;
}

export interface AIMessage {
    role: 'user' | 'assistant' | 'tool';
    text?: string;
    images?: AIImageInput[];
    toolCalls?: AIToolCall[];
    toolResults?: AIToolResult[];
}

export interface AIRequest {
    prompt: string;
    systemPrompt?: string;
    model?: string;
    maxTokens?: number;
    temperature?: number;
    tools?: AITool[];
    images?: AIImageInput[];
    /** ประวัติการสนทนาก่อนหน้า (ใช้ใน tool-calling loop) */
    history?: AIMessage[];
}

export interface AIUsage {
    inputTokens?: number;
    outputTokens?: number;
    totalTokens?: number;
}

export interface AIResponse {
    text: string;
    toolCalls?: AIToolCall[];
    usage?: AIUsage;
    model: string;
    provider: AIProviderName;
}

export interface ModelInfo {
    id: string;
    displayName: string;
    supportsVision?: boolean;
    supportsTools?: boolean;
}

export interface AIProvider {
    readonly name: AIProviderName;
    readonly displayName: string;
    readonly defaultModel: string;
    isConfigured(): boolean;
    analyzeText(input: AIRequest): Promise<AIResponse>;
    analyzeImage(input: AIRequest): Promise<AIResponse>;
    getModels(): Promise<ModelInfo[]>;
}
