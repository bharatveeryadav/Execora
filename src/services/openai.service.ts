import OpenAI from 'openai';
import { config } from '../config';
import { logger } from '../lib/logger';
import { IntentType, IntentExtraction, ExecutionResult } from '../types';

class OpenAIService {
  private client: OpenAI;

  constructor() {
    this.client = new OpenAI({
      apiKey: config.openai.apiKey,
    });
  }

  /**
   * Extract intent and entities from voice transcript
   */
  async extractIntent(transcript: string, rawText?: string): Promise<IntentExtraction> {
    try {
      const systemPrompt = `You are an intent extraction system for an Indian SME business assistant.
Extract the intent and entities from the Hindi/English mixed voice command.

Available intents:
- CREATE_INVOICE: Creating bill/invoice for customer
- CREATE_REMINDER: Schedule payment reminder
- RECORD_PAYMENT: Customer made a payment
- ADD_CREDIT: Add credit/debt to customer account
- CHECK_BALANCE: Check customer balance
- CHECK_STOCK: Check product stock
- CANCEL_INVOICE: Cancel last invoice
- CANCEL_REMINDER: Cancel a reminder
- LIST_REMINDERS: List pending reminders
- CREATE_CUSTOMER: Add new customer
- MODIFY_REMINDER: Change reminder time
- DAILY_SUMMARY: Get daily sales summary
- START_RECORDING: Start voice recording
- STOP_RECORDING: Stop voice recording
- UNKNOWN: Cannot determine intent

Respond ONLY with valid JSON. No other text.

Example responses:
{"intent":"CREATE_INVOICE","entities":{"customer":"Rahul","items":[{"product":"milk","quantity":2},{"product":"bread","quantity":1}]},"confidence":0.95}
{"intent":"CREATE_REMINDER","entities":{"customer":"Rahul","amount":500,"datetime":"tomorrow 7pm"},"confidence":0.9}
{"intent":"RECORD_PAYMENT","entities":{"customer":"Rahul","amount":200,"mode":"cash"},"confidence":0.92}`;

      const response = await this.client.chat.completions.create({
        model: config.openai.model,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: transcript },
        ],
        response_format: { type: 'json_object' },
        temperature: 0.3,
      });

      const content = response.choices[0].message.content || '{}';
      const parsed = JSON.parse(content);

      return {
        intent: parsed.intent as IntentType,
        entities: parsed.entities || {},
        confidence: parsed.confidence || 0.5,
        originalText: rawText || transcript,
        normalizedText: rawText ? transcript : undefined,
      };
    } catch (error) {
      logger.error({ error }, 'OpenAI intent extraction failed');
      return {
        intent: IntentType.UNKNOWN,
        entities: {},
        confidence: 0,
        originalText: rawText || transcript,
        normalizedText: rawText ? transcript : undefined,
      };
    }
  }

  /**
   * Normalize a raw transcript into clean, context-aware text
   */
  async normalizeTranscript(rawText: string): Promise<string> {
    try {
      const systemPrompt = `You are a transcription normalization assistant for Hindi/English mixed speech.
Clean up filler words, fix obvious ASR errors, and normalize numbers and product names when possible.
Keep the meaning identical and keep the text concise.
Respond with plain text only (no JSON, no quotes).`;

      const response = await this.client.chat.completions.create({
        model: config.openai.model,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: rawText },
        ],
        temperature: 0.2,
        max_tokens: 200,
      });

      return response.choices[0].message.content?.trim() || rawText;
    } catch (error) {
      logger.error({ error }, 'OpenAI transcript normalization failed');
      return rawText;
    }
  }

  /**
   * Generate natural language response from execution result
   */
  async generateResponse(
    executionResult: ExecutionResult,
    originalIntent: string
  ): Promise<string> {
    try {
      const systemPrompt = `You are a friendly Indian business assistant speaking in Hindi/English mix (Hinglish).
Generate a natural, concise voice response based on the execution result.
Keep it conversational and short (1-2 sentences max).
Use common Indian business terms and friendly tone.

Examples:
- "Theek hai. Rahul ke liye ₹500 ka reminder kal shaam 7 baje bhej diya jayega."
- "Bill ban gaya. Total ₹120 hai."
- "Rahul ka balance ₹300 remaining hai."
- "Stock me 10 milk packets hai."`;

      const userPrompt = `Original intent: ${originalIntent}
Result: ${JSON.stringify(executionResult)}

Generate natural Hindi/English response:`;

      const response = await this.client.chat.completions.create({
        model: config.openai.model,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
        temperature: 0.7,
        max_tokens: 150,
      });

      return response.choices[0].message.content?.trim() || 'Theek hai.';
    } catch (error) {
      logger.error({ error }, 'OpenAI response generation failed');
      return 'Theek hai.';
    }
  }

  /**
   * Generate confirmation question
   */
  async generateConfirmation(action: string, details: any): Promise<string> {
    try {
      const prompt = `Generate a Hindi/English confirmation question for: ${action}
Details: ${JSON.stringify(details)}
Keep it very short and natural.`;

      const response = await this.client.chat.completions.create({
        model: config.openai.model,
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.7,
        max_tokens: 100,
      });

      return response.choices[0].message.content?.trim() || 'Confirm karein?';
    } catch (error) {
      logger.error({ error }, 'OpenAI confirmation generation failed');
      return 'Confirm karein?';
    }
  }
}

export const openaiService = new OpenAIService();
