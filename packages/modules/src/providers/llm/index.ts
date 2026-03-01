import crypto from 'crypto';
import { config } from '@execora/infrastructure';
import { logger } from '@execora/infrastructure';
import { llmCache } from '@execora/infrastructure';
import { llmRequestsTotal, llmTokensTotal, llmCostUsdTotal } from '@execora/infrastructure';
import { getRuntimeConfig } from '@execora/infrastructure';
import { IntentType, IntentExtraction, ExecutionResult } from '@execora/types';
import { conversationMemory } from '../../modules/voice/conversation';
import { transliterateDevanagari } from '../../utils/devanagari';
import { LLMAdapter } from '../types';
import { reportProviderAvailability, withProvider } from '../middleware';
import { openaiLLMAdapter } from './openai.adapter';
import { groqAdapter } from './groq.adapter';
import { ollamaAdapter } from './ollama.adapter';
import {
  buildIntentSystemPrompt,
  buildResponseSystemPrompt,
  getLangStyle,
  NORMALIZE_TRANSCRIPT_PROMPT,
  TRANSLITERATE_PROMPT,
} from './prompts';

// ─── Provider priority chains ─────────────────────────────────────────────────
//
// Intent extraction: accuracy matters most → OpenAI → Ollama (NOT Groq: llama
//   can't reliably follow the 21-rule JSON prompt).
// Response generation: speed matters most → Groq (LPU ~200ms) → Ollama (local)
//   → OpenAI (cloud fallback ~1400ms).
// One-shot completions (normalise, transliterate): OpenAI → Ollama.

function firstAvailable(adapters: LLMAdapter[]): LLMAdapter | null {
  return adapters.find((a) => a.isAvailable()) ?? null;
}

const intentAdapter   = () => firstAvailable([openaiLLMAdapter, ollamaAdapter]);
const responseAdapter = () => firstAvailable([groqAdapter, ollamaAdapter, openaiLLMAdapter]);
const utilAdapter     = () => firstAvailable([openaiLLMAdapter, ollamaAdapter]);

// ─── Helpers ─────────────────────────────────────────────────────────────────

const stableStringify = (value: unknown): string => {
  if (value === null || value === undefined) return String(value);
  if (Array.isArray(value)) return `[${(value as unknown[]).map(stableStringify).join(',')}]`;
  if (typeof value === 'object') {
    const keys = Object.keys(value as object).sort();
    return `{${keys.map((k) => `${k}:${stableStringify((value as Record<string, unknown>)[k])}`).join(',')}}`;
  }
  return JSON.stringify(value);
};

const sha256 = (value: string): string =>
  crypto.createHash('sha256').update(value).digest('hex');

type CachePolicy = { ttlSeconds: number; scope: 'conversation' | 'global' };

// ─── LLM Service ─────────────────────────────────────────────────────────────

class LLMService {
  constructor() {
    // Report availability of all LLM adapters to Prometheus at startup
    for (const a of [openaiLLMAdapter, groqAdapter, ollamaAdapter]) {
      reportProviderAvailability(a.name, 'llm', a.isAvailable());
    }

    logger.info({
      intentProvider:   intentAdapter()?.name   ?? 'none',
      responseProvider: responseAdapter()?.name ?? 'none',
    }, 'LLM service initialized');
  }

  // ── Metrics ───────────────────────────────────────────────────────────────

  private recordUsage(
    operation: string,
    intent: string,
    model: string,
    usage: { promptTokens?: number; completionTokens?: number; totalTokens?: number } | undefined,
    cache: 'hit' | 'miss',
  ) {
    llmRequestsTotal.inc({ model, operation, intent, cache });
    if (!usage) return;

    const { promptTokens = 0, completionTokens = 0, totalTokens = promptTokens + completionTokens } = usage;
    llmTokensTotal.inc({ model, operation, intent, type: 'prompt' },     promptTokens);
    llmTokensTotal.inc({ model, operation, intent, type: 'completion' }, completionTokens);
    llmTokensTotal.inc({ model, operation, intent, type: 'total' },      totalTokens);

    const rt   = getRuntimeConfig();
    const cost = (promptTokens / 1000) * rt.llm.cost.inputPer1k +
                 (completionTokens / 1000) * rt.llm.cost.outputPer1k;
    if (cost > 0) llmCostUsdTotal.inc({ model, operation, intent }, cost);
  }

  // ── Cache helpers ─────────────────────────────────────────────────────────

  private buildResponseCacheKey(
    intent: IntentType,
    result: ExecutionResult,
    scope: CachePolicy['scope'],
  ): string {
    const payload = stableStringify({
      intent,
      success: result.success,
      message: result.message,
      data:    result.data ?? null,
    });
    const contextHash = scope === 'global' ? 'global' : 'noctx';
    return `llm:response:${intent}:${contextHash}:${sha256(payload)}`;
  }

  // ── Entity normalisation ──────────────────────────────────────────────────

  private parseSpokenPhone(text: string): string | null {
    if (!text) return null;
    const en: Record<string, string> = {
      zero: '0', one: '1', two: '2', three: '3', four: '4',
      five: '5', six: '6', seven: '7', eight: '8', nine: '9',
    };
    const hi: Record<string, string> = {
      शून्य: '0', 'ज़ीरो': '0', एक: '1', 'वन': '1', दो: '2', 'टु': '2',
      तीन: '3', 'थ्री': '3', चार: '4', 'फोर': '4', पाँच: '5', 'फाइव': '5',
      छः: '6', 'सिक्स': '6', सात: '7', 'सेवन': '7', आठ: '8', 'एट': '8',
      नौ: '9', 'नाइन': '9',
    };
    let result = '';
    for (const word of text.toLowerCase().split(/[\s\-.]+/).filter(Boolean)) {
      if (en[word]) result += en[word];
      else if (hi[word]) result += hi[word];
      else if (/^\d$/.test(word)) result += word;
    }
    return result.length >= 10 && result.length <= 15 && /^\d+$/.test(result) ? result : null;
  }

  /**
   * Devanagari → Roman transliteration.
   * Fast path: local char-map (0ms, covers 99%).
   * Slow path: LLM call, cached 24h.
   */
  private async transliterate(text: string): Promise<string> {
    if (!text || !/[\u0900-\u097F]/.test(text)) return text;

    const local = transliterateDevanagari(text.trim());
    if (!/[\u0900-\u097F]/.test(local)) {
      logger.debug({ original: text, result: local }, 'Devanagari transliterated (local)');
      return local;
    }

    logger.warn({ text, partialResult: local }, 'Local transliteration incomplete — LLM fallback');
    const cacheKey = `translit:${sha256(text)}`;
    const cached   = await llmCache.get(cacheKey);
    if (cached) return cached;

    const adapter = utilAdapter();
    if (!adapter) {
      logger.error('No LLM adapter available for transliteration fallback');
      return local;
    }

    try {
      const { text: result } = await withProvider(
        { provider: adapter.name, providerType: 'llm', operation: 'transliterate_fallback', maxRetries: 1 },
        () => adapter.extractIntent(text, TRANSLITERATE_PROMPT),
      );
      this.recordUsage('transliterate_fallback', 'UNKNOWN', adapter.name, undefined, 'miss');
      const out = result.trim() || local;
      await llmCache.set(cacheKey, out, 86_400);
      return out;
    } catch (err: any) {
      logger.error({ error: err.message }, 'LLM transliteration fallback failed');
      return local;
    }
  }

  private async normaliseEntities(
    entities: Record<string, unknown>,
    transcript: string,
  ): Promise<Record<string, unknown>> {
    const out   = { ...entities };
    const lower = transcript.toLowerCase();

    if (!out.customer && out.name) out.customer = out.name;
    if (typeof out.customer === 'string') out.customer = await this.transliterate(out.customer);
    if (typeof out.name     === 'string') out.name     = await this.transliterate(out.name);

    const pronouns = [/\buska\b/u, /\biska\b/u, /\bpichla\s+customer\b/u, /\bsame\s+customer\b/u, /\blast\s+customer\b/u, /\busi\b/u, /\busi\s+ko\b/u];
    if (pronouns.some((r) => r.test(lower))) out.customerRef = 'active';

    if (typeof out.amount === 'string') {
      const n = parseFloat((out.amount as string).replace(/[^0-9.]/g, ''));
      if (!Number.isNaN(n)) out.amount = n;
    }
    if (typeof out.phone === 'string') {
      const parsed = this.parseSpokenPhone(out.phone);
      if (parsed) out.phone = parsed;
    }

    return out;
  }

  // ── Public API ────────────────────────────────────────────────────────────

  /** Convert phone digit string to Hindi spoken-number words for TTS. */
  phoneToWords(phone: string): string {
    if (!phone) return '';
    const map: Record<string, string> = {
      '0': 'das', '1': 'ek', '2': 'do', '3': 'teen', '4': 'char',
      '5': 'paanch', '6': 'chhah', '7': 'saat', '8': 'aath', '9': 'nau',
    };
    return phone.toString().trim().split('').map((d) => {
      const w = map[d];
      if (!w) logger.warn({ digit: d }, 'Unknown digit in phone conversion');
      return w ?? d;
    }).join(' ');
  }

  /**
   * Extract structured intent + entities from a voice transcript.
   *
   * Provider priority: OpenAI (accurate JSON mode) → Ollama (local fallback).
   * Groq is deliberately excluded — llama cannot reliably follow the 21-rule JSON prompt.
   */
  async extractIntent(
    transcript: string,
    rawText?: string,
    conversationId?: string,
  ): Promise<IntentExtraction> {
    try {
      const ctx    = conversationId ? await conversationMemory.getFormattedContext(conversationId, 6) : '';
      const prompt = buildIntentSystemPrompt(ctx);

      const adapter = intentAdapter();
      if (!adapter) throw new Error('No LLM adapter available for intent extraction');

      const { text, usage, model } = await withProvider(
        { provider: adapter.name, providerType: 'llm', operation: 'extract_intent', maxRetries: 1 },
        () => adapter.extractIntent(transcript, prompt),
      );

      this.recordUsage('extract_intent', 'UNKNOWN', model, usage, 'miss');

      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        logger.warn({ content: text, provider: adapter.name }, 'Intent response contained no JSON object');
        throw new Error('No JSON found in intent response');
      }

      const parsed    = JSON.parse(jsonMatch[0]);
      const rawIntent = (parsed.intent ?? 'UNKNOWN').toString().toUpperCase().replace(/ /g, '_');
      const intent    = Object.values(IntentType).includes(rawIntent as IntentType)
        ? (rawIntent as IntentType)
        : IntentType.UNKNOWN;

      logger.debug({ rawIntent, intent, provider: adapter.name }, 'Intent parsed');

      const entities = await this.normaliseEntities(parsed.entities ?? {}, transcript);

      return {
        intent,
        entities,
        confidence:     parsed.confidence  ?? 0.5,
        originalText:   rawText ?? transcript,
        normalizedText: parsed.normalized  ?? transcript,
      };
    } catch (error) {
      logger.error({ error }, 'Intent extraction failed');
      return {
        intent:         IntentType.UNKNOWN,
        entities:       {},
        confidence:     0,
        originalText:   rawText ?? transcript,
        normalizedText: rawText ? transcript : undefined,
      };
    }
  }

  /**
   * Clean up a raw ASR transcript (filler words, spoken numbers, ASR errors).
   * Provider priority: OpenAI → Ollama.
   */
  async normalizeTranscript(rawText: string): Promise<string> {
    const adapter = utilAdapter();
    if (!adapter) return rawText;

    try {
      const { text } = await withProvider(
        { provider: adapter.name, providerType: 'llm', operation: 'normalize_transcript', maxRetries: 1 },
        () => adapter.extractIntent(rawText, NORMALIZE_TRANSCRIPT_PROMPT),
      );
      this.recordUsage('normalize_transcript', 'UNKNOWN', adapter.name, undefined, 'miss');
      return text.trim() || rawText;
    } catch (error) {
      logger.error({ error }, 'Transcript normalisation failed');
      return rawText;
    }
  }

  /**
   * Generate a natural-language voice response from an execution result.
   *
   * Provider priority: Groq (LPU ~200ms) → Ollama (local, zero cost) → OpenAI (~1400ms).
   * Responses are cached per intent/result pair to avoid redundant calls.
   */
  async generateResponse(
    executionResult: ExecutionResult,
    originalIntent: string,
    _conversationId?: string,
    onChunk?: (chunk: string) => void,
    options?: { userLanguage?: string },
  ): Promise<string> {
    try {
      const rt        = getRuntimeConfig();
      const intentKey = originalIntent as IntentType;
      const policy    = rt.llm.responseCachePolicy[intentKey] as CachePolicy | undefined;
      const cacheKey  = policy ? this.buildResponseCacheKey(intentKey, executionResult, policy.scope) : null;

      const adapter = responseAdapter();
      if (!adapter) {
        logger.error('No LLM adapter available for response generation');
        return 'Theek hai.';
      }

      // Cache hit
      if (cacheKey) {
        const cached = await llmCache.get(cacheKey);
        if (cached) {
          llmRequestsTotal.inc({ model: adapter.name, operation: 'generate_response', intent: intentKey, cache: 'hit' });
          onChunk?.(cached);
          return cached;
        }
      }

      const langStyle  = getLangStyle(options?.userLanguage ?? 'hi');
      const maxTokens  = rt.llm.responseTokenLimits[intentKey] ?? 150;
      const sysPrompt  = buildResponseSystemPrompt(langStyle);
      const userPrompt = `Original intent: ${originalIntent}\nResult: ${JSON.stringify(executionResult)}\n\nGenerate response in ${langStyle} (always use English for names and numbers):`;

      const { text, usage, model } = await withProvider(
        { provider: adapter.name, providerType: 'llm', operation: 'generate_response', maxRetries: 1 },
        () => adapter.generateResponse(sysPrompt, userPrompt, maxTokens, onChunk),
      );

      const finalText = text || 'Theek hai.';
      this.recordUsage('generate_response', intentKey, model, usage, 'miss');

      if (cacheKey && policy && finalText !== 'Theek hai.') {
        await llmCache.set(cacheKey, finalText, policy.ttlSeconds);
      }

      return finalText;
    } catch (error) {
      logger.error({ error }, 'Response generation failed');
      return 'Theek hai.';
    }
  }

  /**
   * Generate a short Hindi/English confirmation question.
   * Provider priority: OpenAI → Ollama.
   */
  async generateConfirmation(action: string, details: unknown): Promise<string> {
    const adapter = utilAdapter();
    if (!adapter) return 'Confirm karein?';

    try {
      const prompt = `Generate a Hindi/English confirmation question for: ${action}\nDetails: ${JSON.stringify(details)}\nKeep it very short and natural.`;
      const { text } = await adapter.generateResponse('', prompt, 100);
      this.recordUsage('generate_confirmation', 'UNKNOWN', adapter.name, undefined, 'miss');
      return text.trim() || 'Confirm karein?';
    } catch (error) {
      logger.error({ error }, 'Confirmation generation failed');
      return 'Confirm karein?';
    }
  }
}

export const llmService = new LLMService();

// Named re-export for backward compat (src/integrations/openai.ts imports openaiService)
export { llmService as openaiService };
