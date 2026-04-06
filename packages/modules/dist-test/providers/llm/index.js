"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.openaiService = exports.llmService = void 0;
const crypto_1 = __importDefault(require("crypto"));
const core_1 = require("@execora/core");
const core_2 = require("@execora/core");
const core_3 = require("@execora/core");
const core_4 = require("@execora/core");
const types_1 = require("@execora/types");
const conversation_1 = require("../../modules/voice/conversation");
const devanagari_1 = require("../../utils/devanagari");
const middleware_1 = require("../middleware");
const openai_adapter_1 = require("./openai.adapter");
const groq_adapter_1 = require("./groq.adapter");
const ollama_adapter_1 = require("./ollama.adapter");
const prompts_1 = require("./prompts");
// ─── Provider priority chains ─────────────────────────────────────────────────
//
// Intent extraction: accuracy matters most → OpenAI → Ollama (NOT Groq: llama
//   can't reliably follow the 21-rule JSON prompt).
// Response generation: speed matters most → Groq (LPU ~200ms) → Ollama (local)
//   → OpenAI (cloud fallback ~1400ms).
// One-shot completions (normalise, transliterate): OpenAI → Ollama.
function firstAvailable(adapters) {
    return adapters.find((a) => a.isAvailable()) ?? null;
}
const intentAdapter = () => firstAvailable([openai_adapter_1.openaiLLMAdapter, ollama_adapter_1.ollamaAdapter]);
const responseAdapter = () => firstAvailable([groq_adapter_1.groqAdapter, ollama_adapter_1.ollamaAdapter, openai_adapter_1.openaiLLMAdapter]);
const utilAdapter = () => firstAvailable([openai_adapter_1.openaiLLMAdapter, ollama_adapter_1.ollamaAdapter]);
// ─── Helpers ─────────────────────────────────────────────────────────────────
const stableStringify = (value) => {
    if (value === null || value === undefined)
        return String(value);
    if (Array.isArray(value))
        return `[${value.map(stableStringify).join(',')}]`;
    if (typeof value === 'object') {
        const keys = Object.keys(value).sort();
        return `{${keys.map((k) => `${k}:${stableStringify(value[k])}`).join(',')}}`;
    }
    return JSON.stringify(value);
};
const sha256 = (value) => crypto_1.default.createHash('sha256').update(value).digest('hex');
// ─── LLM Service ─────────────────────────────────────────────────────────────
class LLMService {
    constructor() {
        // Report availability of all LLM adapters to Prometheus at startup
        for (const a of [openai_adapter_1.openaiLLMAdapter, groq_adapter_1.groqAdapter, ollama_adapter_1.ollamaAdapter]) {
            (0, middleware_1.reportProviderAvailability)(a.name, 'llm', a.isAvailable());
        }
        core_1.logger.info({
            intentProvider: intentAdapter()?.name ?? 'none',
            responseProvider: responseAdapter()?.name ?? 'none',
        }, 'LLM service initialized');
    }
    // ── Metrics ───────────────────────────────────────────────────────────────
    recordUsage(operation, intent, model, usage, cache) {
        core_3.llmRequestsTotal.inc({ model, operation, intent, cache });
        if (!usage)
            return;
        const { promptTokens = 0, completionTokens = 0, totalTokens = promptTokens + completionTokens } = usage;
        core_3.llmTokensTotal.inc({ model, operation, intent, type: 'prompt' }, promptTokens);
        core_3.llmTokensTotal.inc({ model, operation, intent, type: 'completion' }, completionTokens);
        core_3.llmTokensTotal.inc({ model, operation, intent, type: 'total' }, totalTokens);
        const rt = (0, core_4.getRuntimeConfig)();
        const cost = (promptTokens / 1000) * rt.llm.cost.inputPer1k +
            (completionTokens / 1000) * rt.llm.cost.outputPer1k;
        if (cost > 0)
            core_3.llmCostUsdTotal.inc({ model, operation, intent }, cost);
    }
    // ── Cache helpers ─────────────────────────────────────────────────────────
    buildResponseCacheKey(intent, result, scope) {
        const payload = stableStringify({
            intent,
            success: result.success,
            message: result.message,
            data: result.data ?? null,
        });
        const contextHash = scope === 'global' ? 'global' : 'noctx';
        return `llm:response:${intent}:${contextHash}:${sha256(payload)}`;
    }
    // ── Entity normalisation ──────────────────────────────────────────────────
    parseSpokenPhone(text) {
        if (!text)
            return null;
        const en = {
            zero: '0', one: '1', two: '2', three: '3', four: '4',
            five: '5', six: '6', seven: '7', eight: '8', nine: '9',
        };
        const hi = {
            शून्य: '0', 'ज़ीरो': '0', एक: '1', 'वन': '1', दो: '2', 'टु': '2',
            तीन: '3', 'थ्री': '3', चार: '4', 'फोर': '4', पाँच: '5', 'फाइव': '5',
            छः: '6', 'सिक्स': '6', सात: '7', 'सेवन': '7', आठ: '8', 'एट': '8',
            नौ: '9', 'नाइन': '9',
        };
        let result = '';
        for (const word of text.toLowerCase().split(/[\s\-.]+/).filter(Boolean)) {
            if (en[word])
                result += en[word];
            else if (hi[word])
                result += hi[word];
            else if (/^\d$/.test(word))
                result += word;
        }
        return result.length >= 10 && result.length <= 15 && /^\d+$/.test(result) ? result : null;
    }
    /**
     * Devanagari → Roman transliteration.
     * Fast path: local char-map (0ms, covers 99%).
     * Slow path: LLM call, cached 24h.
     */
    async transliterate(text) {
        if (!text || !/[\u0900-\u097F]/.test(text))
            return text;
        const local = (0, devanagari_1.transliterateDevanagari)(text.trim());
        if (!/[\u0900-\u097F]/.test(local)) {
            core_1.logger.debug({ original: text, result: local }, 'Devanagari transliterated (local)');
            return local;
        }
        core_1.logger.warn({ text, partialResult: local }, 'Local transliteration incomplete — LLM fallback');
        const cacheKey = `translit:${sha256(text)}`;
        const cached = await core_2.llmCache.get(cacheKey);
        if (cached)
            return cached;
        const adapter = utilAdapter();
        if (!adapter) {
            core_1.logger.error('No LLM adapter available for transliteration fallback');
            return local;
        }
        try {
            const { text: result } = await (0, middleware_1.withProvider)({ provider: adapter.name, providerType: 'llm', operation: 'transliterate_fallback', maxRetries: 1 }, () => adapter.extractIntent(text, prompts_1.TRANSLITERATE_PROMPT));
            this.recordUsage('transliterate_fallback', 'UNKNOWN', adapter.name, undefined, 'miss');
            const out = result.trim() || local;
            await core_2.llmCache.set(cacheKey, out, 86_400);
            return out;
        }
        catch (err) {
            core_1.logger.error({ error: err.message }, 'LLM transliteration fallback failed');
            return local;
        }
    }
    async normaliseEntities(entities, transcript) {
        const out = { ...entities };
        const lower = transcript.toLowerCase();
        if (!out.customer && out.name)
            out.customer = out.name;
        if (typeof out.customer === 'string')
            out.customer = await this.transliterate(out.customer);
        if (typeof out.name === 'string')
            out.name = await this.transliterate(out.name);
        const pronouns = [/\buska\b/u, /\biska\b/u, /\bpichla\s+customer\b/u, /\bsame\s+customer\b/u, /\blast\s+customer\b/u, /\busi\b/u, /\busi\s+ko\b/u];
        if (pronouns.some((r) => r.test(lower)))
            out.customerRef = 'active';
        if (typeof out.amount === 'string') {
            const n = parseFloat(out.amount.replace(/[^0-9.]/g, ''));
            if (!Number.isNaN(n))
                out.amount = n;
        }
        if (typeof out.phone === 'string') {
            const parsed = this.parseSpokenPhone(out.phone);
            if (parsed)
                out.phone = parsed;
        }
        return out;
    }
    // ── Public API ────────────────────────────────────────────────────────────
    /** Convert phone digit string to Hindi spoken-number words for TTS. */
    phoneToWords(phone) {
        if (!phone)
            return '';
        const map = {
            '0': 'das', '1': 'ek', '2': 'do', '3': 'teen', '4': 'char',
            '5': 'paanch', '6': 'chhah', '7': 'saat', '8': 'aath', '9': 'nau',
        };
        return phone.toString().trim().split('').map((d) => {
            const w = map[d];
            if (!w)
                core_1.logger.warn({ digit: d }, 'Unknown digit in phone conversion');
            return w ?? d;
        }).join(' ');
    }
    /**
     * Extract structured intent + entities from a voice transcript.
     *
     * Provider priority: OpenAI (accurate JSON mode) → Ollama (local fallback).
     * Groq is deliberately excluded — llama cannot reliably follow the 21-rule JSON prompt.
     */
    async extractIntent(transcript, rawText, conversationId) {
        try {
            const ctx = conversationId ? await conversation_1.conversationMemory.getFormattedContext(conversationId, 6) : '';
            const prompt = (0, prompts_1.buildIntentSystemPrompt)(ctx);
            const adapter = intentAdapter();
            if (!adapter)
                throw new Error('No LLM adapter available for intent extraction');
            const { text, usage, model } = await (0, middleware_1.withProvider)({ provider: adapter.name, providerType: 'llm', operation: 'extract_intent', maxRetries: 1 }, () => adapter.extractIntent(transcript, prompt));
            this.recordUsage('extract_intent', 'UNKNOWN', model, usage, 'miss');
            const jsonMatch = text.match(/\{[\s\S]*\}/);
            if (!jsonMatch) {
                core_1.logger.warn({ content: text, provider: adapter.name }, 'Intent response contained no JSON object');
                throw new Error('No JSON found in intent response');
            }
            const parsed = JSON.parse(jsonMatch[0]);
            const rawIntent = (parsed.intent ?? 'UNKNOWN').toString().toUpperCase().replace(/ /g, '_');
            const intent = Object.values(types_1.IntentType).includes(rawIntent)
                ? rawIntent
                : types_1.IntentType.UNKNOWN;
            core_1.logger.debug({ rawIntent, intent, provider: adapter.name }, 'Intent parsed');
            const entities = await this.normaliseEntities(parsed.entities ?? {}, transcript);
            return {
                intent,
                entities,
                confidence: parsed.confidence ?? 0.5,
                originalText: rawText ?? transcript,
                normalizedText: parsed.normalized ?? transcript,
            };
        }
        catch (error) {
            core_1.logger.error({ error }, 'Intent extraction failed');
            return {
                intent: types_1.IntentType.UNKNOWN,
                entities: {},
                confidence: 0,
                originalText: rawText ?? transcript,
                normalizedText: rawText ? transcript : undefined,
            };
        }
    }
    /**
     * Clean up a raw ASR transcript (filler words, spoken numbers, ASR errors).
     * Provider priority: OpenAI → Ollama.
     */
    async normalizeTranscript(rawText) {
        const adapter = utilAdapter();
        if (!adapter)
            return rawText;
        try {
            const { text } = await (0, middleware_1.withProvider)({ provider: adapter.name, providerType: 'llm', operation: 'normalize_transcript', maxRetries: 1 }, () => adapter.extractIntent(rawText, prompts_1.NORMALIZE_TRANSCRIPT_PROMPT));
            this.recordUsage('normalize_transcript', 'UNKNOWN', adapter.name, undefined, 'miss');
            return text.trim() || rawText;
        }
        catch (error) {
            core_1.logger.error({ error }, 'Transcript normalisation failed');
            return rawText;
        }
    }
    /**
     * Generate a natural-language voice response from an execution result.
     *
     * Provider priority: Groq (LPU ~200ms) → Ollama (local, zero cost) → OpenAI (~1400ms).
     * Responses are cached per intent/result pair to avoid redundant calls.
     */
    async generateResponse(executionResult, originalIntent, _conversationId, onChunk, options) {
        try {
            const rt = (0, core_4.getRuntimeConfig)();
            const intentKey = originalIntent;
            const policy = rt.llm.responseCachePolicy[intentKey];
            const cacheKey = policy ? this.buildResponseCacheKey(intentKey, executionResult, policy.scope) : null;
            const adapter = responseAdapter();
            if (!adapter) {
                core_1.logger.error('No LLM adapter available for response generation');
                return 'Theek hai.';
            }
            // Cache hit
            if (cacheKey) {
                const cached = await core_2.llmCache.get(cacheKey);
                if (cached) {
                    core_3.llmRequestsTotal.inc({ model: adapter.name, operation: 'generate_response', intent: intentKey, cache: 'hit' });
                    onChunk?.(cached);
                    return cached;
                }
            }
            const langStyle = (0, prompts_1.getLangStyle)(options?.userLanguage ?? 'hi');
            const maxTokens = rt.llm.responseTokenLimits[intentKey] ?? 150;
            const sysPrompt = (0, prompts_1.buildResponseSystemPrompt)(langStyle);
            const userPrompt = `Original intent: ${originalIntent}\nResult: ${JSON.stringify(executionResult)}\n\nGenerate response in ${langStyle} (always use English for names and numbers):`;
            const { text, usage, model } = await (0, middleware_1.withProvider)({ provider: adapter.name, providerType: 'llm', operation: 'generate_response', maxRetries: 1 }, () => adapter.generateResponse(sysPrompt, userPrompt, maxTokens, onChunk));
            const finalText = text || 'Theek hai.';
            this.recordUsage('generate_response', intentKey, model, usage, 'miss');
            if (cacheKey && policy && finalText !== 'Theek hai.') {
                await core_2.llmCache.set(cacheKey, finalText, policy.ttlSeconds);
            }
            return finalText;
        }
        catch (error) {
            core_1.logger.error({ error }, 'Response generation failed');
            return 'Theek hai.';
        }
    }
    /**
     * Generate a short Hindi/English confirmation question.
     * Provider priority: OpenAI → Ollama.
     */
    async generateConfirmation(action, details) {
        const adapter = utilAdapter();
        if (!adapter)
            return 'Confirm karein?';
        try {
            const prompt = `Generate a Hindi/English confirmation question for: ${action}\nDetails: ${JSON.stringify(details)}\nKeep it very short and natural.`;
            const { text } = await adapter.generateResponse('', prompt, 100);
            this.recordUsage('generate_confirmation', 'UNKNOWN', adapter.name, undefined, 'miss');
            return text.trim() || 'Confirm karein?';
        }
        catch (error) {
            core_1.logger.error({ error }, 'Confirmation generation failed');
            return 'Confirm karein?';
        }
    }
}
exports.llmService = new LLMService();
exports.openaiService = exports.llmService;
//# sourceMappingURL=index.js.map