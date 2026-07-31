import { OpenAICompatProvider } from './openai-compat';

export class OpenAIProvider extends OpenAICompatProvider {
    constructor(apiKey?: string) {
        super({
            name: 'openai',
            displayName: 'OpenAI',
            apiKey,
            envKey: 'OPENAI_API_KEY',
            baseUrl: 'https://api.openai.com/v1',
            defaultModel: 'gpt-4o-mini',
        });
    }
}

export class OpenRouterProvider extends OpenAICompatProvider {
    constructor(apiKey?: string) {
        super({
            name: 'openrouter',
            displayName: 'OpenRouter',
            apiKey,
            envKey: 'OPENROUTER_API_KEY',
            baseUrl: 'https://openrouter.ai/api/v1',
            defaultModel: 'openai/gpt-4o-mini',
        });
    }
}
