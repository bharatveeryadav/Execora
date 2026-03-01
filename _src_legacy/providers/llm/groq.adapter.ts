import OpenAI from 'openai';
import { config } from '../../config';
import { logger } from '../../infrastructure/logger';
import { LLMAdapter, RawLLMResponse, ProviderCapabilities } from '../types';

/**
 * Groq adapter — OpenAI-compatible API backed by LPU hardware.
 * ~200ms from India vs ~1400ms for OpenAI servers.
 * Used exclusively for free-form response generation (llama-3.3-70b-versatile).
 * NOT used for intent extraction — llama cannot reliably follow the complex
 * 21-rule JSON prompt, so extractIntent() throws to force OpenAI fallback.
 */
export class GroqAdapter implements LLMAdapter {
  readonly name = 'groq';
  readonly capabilities: ProviderCapabilities = {
    isLocal:                  false,
    supportsLiveTranscription: false,
    supportsStreaming:          false,
    supportsIntentExtraction:  false, // Groq/llama cannot reliably follow the complex JSON prompt
  };
  private client: OpenAI | null = null;
  private readonly model = 'llama-3.3-70b-versatile';

  constructor() {
    if (config.groq.apiKey) {
      this.client = new OpenAI({
        apiKey: config.groq.apiKey,
        baseURL: 'https://api.groq.com/openai/v1',
      });
      logger.info('Groq LLM adapter initialized — fast response generation enabled');
    } else {
      logger.warn('GROQ_API_KEY not set — response generation will use OpenAI (~1400ms)');
    }
  }

  isAvailable(): boolean {
    return !!config.groq.apiKey && this.client !== null;
  }

  /** Groq does not support the complex JSON intent prompt — always delegate to OpenAI. */
  async extractIntent(_transcript: string, _systemPrompt: string): Promise<RawLLMResponse> {
    throw new Error(
      'GroqAdapter does not support intent extraction — use OpenAIAdapter for this operation',
    );
  }

  async generateResponse(
    systemPrompt: string,
    userPrompt: string,
    maxTokens: number,
    onChunk?: (chunk: string) => void,
  ): Promise<RawLLMResponse> {
    if (!this.client) {
      throw new Error('Groq client not initialised');
    }

    // Groq non-streaming: still fast (~200ms) because LPU processes tokens in parallel.
    // Avoids OpenAI-specific stream_options that Groq doesn't support.
    const response = await this.client.chat.completions.create({
      model: this.model,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      temperature: 0.7,
      max_tokens: maxTokens,
    });

    const text = response.choices[0]?.message?.content?.trim() ?? '';
    if (text) onChunk?.(text); // deliver whole response at once

    return {
      text,
      usage: {
        promptTokens:    response.usage?.prompt_tokens     ?? 0,
        completionTokens: response.usage?.completion_tokens ?? 0,
        totalTokens:     response.usage?.total_tokens      ?? 0,
      },
      model: this.model,
    };
  }
}

export const groqAdapter = new GroqAdapter();
