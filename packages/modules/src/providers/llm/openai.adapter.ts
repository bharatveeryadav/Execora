import OpenAI from 'openai';
import { config } from '@execora/infrastructure';
import { logger } from '@execora/infrastructure';
import { LLMAdapter, RawLLMResponse, ProviderCapabilities } from '../types';

/**
 * OpenAI adapter — used for intent extraction (gpt-4o-mini, JSON mode)
 * and as the response-generation fallback when Groq is unavailable.
 */
export class OpenAIAdapter implements LLMAdapter {
  readonly name = 'openai';
  readonly capabilities: ProviderCapabilities = {
    isLocal:                  false,
    supportsLiveTranscription: false,
    supportsStreaming:          true,
    supportsIntentExtraction:  true,
  };
  private client: OpenAI;

  constructor() {
    this.client = new OpenAI({ apiKey: config.openai.apiKey });
    logger.info('OpenAI LLM adapter initialized');
  }

  isAvailable(): boolean {
    return !!config.openai.apiKey;
  }

  async extractIntent(transcript: string, systemPrompt: string): Promise<RawLLMResponse> {
    const response = await this.client.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: transcript },
      ],
      response_format: { type: 'json_object' },
      temperature: 0.3,
      max_tokens: 200,
    });

    return {
      text: response.choices[0].message.content || '{}',
      usage: {
        promptTokens:    response.usage?.prompt_tokens     ?? 0,
        completionTokens: response.usage?.completion_tokens ?? 0,
        totalTokens:     response.usage?.total_tokens      ?? 0,
      },
      model: response.model,
    };
  }

  async generateResponse(
    systemPrompt: string,
    userPrompt: string,
    maxTokens: number,
    onChunk?: (chunk: string) => void,
  ): Promise<RawLLMResponse> {
    const model = 'gpt-4o-mini';
    let finalText = '';
    let rawUsage: any = null;

    // Stream tokens so the client hears first words sooner
    const stream = await this.client.chat.completions.create({
      model,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      temperature: 0.7,
      max_tokens: maxTokens,
      stream: true,
      stream_options: { include_usage: true },
    });

    for await (const chunk of stream) {
      const token = chunk.choices[0]?.delta?.content || '';
      if (token) {
        finalText += token;
        onChunk?.(token);
      }
      if (chunk.usage) rawUsage = chunk.usage;
    }

    return {
      text: finalText.trim(),
      usage: rawUsage ? {
        promptTokens:    rawUsage.prompt_tokens     ?? 0,
        completionTokens: rawUsage.completion_tokens ?? 0,
        totalTokens:     rawUsage.total_tokens      ?? 0,
      } : undefined,
      model,
    };
  }

  /** One-shot LLM call (no streaming) — used for transliteration + normalization */
  async complete(
    systemPrompt: string,
    userContent: string,
    maxTokens: number,
  ): Promise<string> {
    const response = await this.client.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userContent },
      ],
      temperature: 0,
      max_tokens: maxTokens,
    });
    return response.choices[0].message.content?.trim() ?? '';
  }
}

export const openaiLLMAdapter = new OpenAIAdapter();
