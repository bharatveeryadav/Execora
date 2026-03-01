import OpenAI from 'openai';
import { config } from '../../config';
import { logger } from '../../infrastructure/logger';
import { LLMAdapter, RawLLMResponse, ProviderCapabilities } from '../types';

/**
 * Ollama adapter — local/self-hosted LLM inference.
 *
 * Uses the OpenAI-compatible REST API that Ollama exposes at /v1.
 * Supports any model you have pulled: llama3.2, qwen2.5, mistral, phi4, gemma3, etc.
 *
 * Setup (one-time):
 *   1. Install: https://ollama.com/download
 *   2. Pull a model: `ollama pull llama3.2`
 *   3. Serve (auto-starts on install): `ollama serve`
 *   4. Set env: OLLAMA_BASE_URL=http://localhost:11434
 *
 * Trade-offs vs cloud providers:
 *   - ✅ Fully offline — zero API costs, no data leaves your server
 *   - ✅ Unlimited requests, no rate limits
 *   - ⚠️  Accuracy of intent extraction depends on model quality
 *   - ⚠️  Response latency depends on local hardware (GPU recommended)
 *
 * Recommended models:
 *   - llama3.2     — 3B params, fast on CPU, good intent accuracy
 *   - qwen2.5:7b   — 7B params, better accuracy, needs ~6GB RAM
 *   - phi4         — Microsoft's latest, excellent reasoning
 */
export class OllamaAdapter implements LLMAdapter {
  readonly name = 'ollama';
  readonly capabilities: ProviderCapabilities = {
    isLocal:                  true,
    supportsLiveTranscription: false,
    supportsStreaming:          false, // Ollama streams but we use non-streaming for simplicity
    supportsIntentExtraction:  true,  // accuracy varies by model
  };

  private client: OpenAI | null = null;
  private readonly model: string;

  constructor() {
    this.model = config.ollama.model;
    if (config.ollama.enabled) {
      this.client = new OpenAI({
        apiKey:  'ollama', // Ollama ignores the key but the client requires a non-empty string
        baseURL: `${config.ollama.baseUrl}/v1`,
      });
      logger.info({ model: this.model, baseUrl: config.ollama.baseUrl }, 'Ollama LLM adapter initialized');
    } else {
      logger.debug('Ollama not configured — set OLLAMA_BASE_URL to enable local LLM');
    }
  }

  isAvailable(): boolean {
    return config.ollama.enabled && this.client !== null;
  }

  async extractIntent(transcript: string, systemPrompt: string): Promise<RawLLMResponse> {
    if (!this.client) throw new Error('Ollama client not initialised');

    // Request JSON mode — supported by llama3.1+, qwen2.5, mistral-nemo
    // Falls back gracefully: if the model ignores it, the LLM service will parse the JSON anyway
    const response = await this.client.chat.completions.create({
      model: this.model,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user',   content: transcript },
      ],
      response_format: { type: 'json_object' },
      temperature: 0.2,
      max_tokens:  300,
    });

    return {
      text:  response.choices[0].message.content ?? '{}',
      usage: {
        promptTokens:     response.usage?.prompt_tokens     ?? 0,
        completionTokens: response.usage?.completion_tokens ?? 0,
        totalTokens:      response.usage?.total_tokens      ?? 0,
      },
      model: `ollama/${this.model}`,
    };
  }

  async generateResponse(
    systemPrompt: string,
    userPrompt: string,
    maxTokens: number,
    onChunk?: (chunk: string) => void,
  ): Promise<RawLLMResponse> {
    if (!this.client) throw new Error('Ollama client not initialised');

    const response = await this.client.chat.completions.create({
      model: this.model,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user',   content: userPrompt },
      ],
      temperature: 0.7,
      max_tokens:  maxTokens,
    });

    const text = response.choices[0]?.message?.content?.trim() ?? '';
    if (text) onChunk?.(text);

    return {
      text,
      usage: {
        promptTokens:     response.usage?.prompt_tokens     ?? 0,
        completionTokens: response.usage?.completion_tokens ?? 0,
        totalTokens:      response.usage?.total_tokens      ?? 0,
      },
      model: `ollama/${this.model}`,
    };
  }
}

export const ollamaAdapter = new OllamaAdapter();
